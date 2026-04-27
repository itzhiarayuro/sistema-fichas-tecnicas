/**
 * photoCache.ts — caché persistente con IndexedDB que complementa blobStore.
 *
 * Resuelve dos problemas:
 *   1. El blobStore OPFS guarda fotos pero cada sesión empieza con memoryMap
 *      vacío, entonces getBlob(filename) falla y se vuelve a descargar todo.
 *      photoCache mantiene en IndexedDB un ÍNDICE persistente filename ↔ exists.
 *   2. Las fotos marcadas como "no existe en Drive" se volvían a pedir en cada
 *      generación de PDF. photoCache tiene un set persistente de filenames/driveIds
 *      que nunca se deben volver a solicitar.
 *
 * NO almacena binarios — esos siguen en blobStore (OPFS). Esta clase solo lleva
 * el índice de "qué existe dónde" y "qué no existe nunca".
 */

import { perf } from '@/lib/utils/perfLogger';

const DB_NAME = 'photoCache';
const DB_VERSION = 1;
const STORE_INDEX = 'photoIndex';     // filename -> {blobId, driveId, size, ts}
const STORE_MISSING = 'photoMissing'; // filename|driveId -> {ts}

interface PhotoIndexEntry {
    filename: string;
    blobId?: string;       // id usado en blobStore (suele ser el mismo filename)
    driveId?: string;
    size?: number;
    mimeType?: string;
    ts: number;            // timestamp último update
}

interface MissingEntry {
    key: string;           // filename o driveId
    reason: string;
    ts: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_INDEX)) {
                db.createObjectStore(STORE_INDEX, { keyPath: 'filename' });
            }
            if (!db.objectStoreNames.contains(STORE_MISSING)) {
                db.createObjectStore(STORE_MISSING, { keyPath: 'key' });
            }
        };
    });
    return dbPromise;
}

/** Normaliza un filename a una clave canónica (para comparación insensitive a case/espacios) */
function normKey(s: string): string {
    return String(s || '').trim().toUpperCase();
}

// ─────────────────────────────────────────────────────────────────
// Caché en memoria de apoyo (no necesita ir a IDB en cada consulta)
// ─────────────────────────────────────────────────────────────────
const memIndex = new Map<string, PhotoIndexEntry>();
const memMissing = new Set<string>();
let hydrated = false;

async function hydrateIfNeeded(): Promise<void> {
    if (hydrated) return;
    const done = perf.start('photoCache.hydrate');
    try {
        const db = await openDb();
        await new Promise<void>((resolve) => {
            const tx = db.transaction([STORE_INDEX, STORE_MISSING], 'readonly');
            const ixReq = tx.objectStore(STORE_INDEX).openCursor();
            ixReq.onsuccess = () => {
                const cursor = ixReq.result;
                if (cursor) {
                    const v = cursor.value as PhotoIndexEntry;
                    memIndex.set(normKey(v.filename), v);
                    cursor.continue();
                }
            };
            const misReq = tx.objectStore(STORE_MISSING).openCursor();
            misReq.onsuccess = () => {
                const cursor = misReq.result;
                if (cursor) {
                    memMissing.add(normKey((cursor.value as MissingEntry).key));
                    cursor.continue();
                }
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve(); // no bloqueamos
        });
        hydrated = true;
        done({ index: memIndex.size, missing: memMissing.size });
    } catch {
        hydrated = true; // no seguir reintentando
        done({ error: 'hydrate_failed' });
    }
}

// ─────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────

export const photoCache = {
    /** Inicializa leyendo IndexedDB — llámalo al arrancar la app o primera operación */
    async init(): Promise<void> {
        await hydrateIfNeeded();
    },

    /** ¿Este filename/driveId está marcado como inexistente? Consulta sincrónica. */
    isMissing(filenameOrId: string): boolean {
        return memMissing.has(normKey(filenameOrId));
    },

    /** Marca un filename/driveId como inexistente — persiste en IDB. */
    async markMissing(filenameOrId: string, reason = 'not_found_in_drive'): Promise<void> {
        const key = normKey(filenameOrId);
        if (memMissing.has(key)) return; // ya marcado
        memMissing.add(key);
        perf.missing(filenameOrId, reason);
        try {
            const db = await openDb();
            const tx = db.transaction(STORE_MISSING, 'readwrite');
            tx.objectStore(STORE_MISSING).put({ key, reason, ts: Date.now() });
        } catch { /* silencioso */ }
    },

    /** Desmarca (si alguna vez se quiere reintentar manualmente) */
    async unmarkMissing(filenameOrId: string): Promise<void> {
        const key = normKey(filenameOrId);
        memMissing.delete(key);
        try {
            const db = await openDb();
            const tx = db.transaction(STORE_MISSING, 'readwrite');
            tx.objectStore(STORE_MISSING).delete(key);
        } catch {}
    },

    /** Registra que un filename tiene una copia en blobStore (por si se recarga sesión) */
    async recordAvailable(filename: string, info: Partial<PhotoIndexEntry> = {}): Promise<void> {
        const key = normKey(filename);
        const entry: PhotoIndexEntry = {
            filename,
            ts: Date.now(),
            ...info,
            blobId: info.blobId || filename,
        };
        memIndex.set(key, entry);
        try {
            const db = await openDb();
            const tx = db.transaction(STORE_INDEX, 'readwrite');
            tx.objectStore(STORE_INDEX).put(entry);
        } catch {}
    },

    /** Devuelve la entrada del índice si existe */
    getIndex(filename: string): PhotoIndexEntry | undefined {
        return memIndex.get(normKey(filename));
    },

    /** Estadísticas del caché */
    stats() {
        return {
            indexed: memIndex.size,
            missing: memMissing.size,
            hydrated,
        };
    },

    /** Limpieza completa — usarla solo si el usuario pide "reset cache" */
    async clearAll(): Promise<void> {
        memIndex.clear();
        memMissing.clear();
        try {
            const db = await openDb();
            const tx = db.transaction([STORE_INDEX, STORE_MISSING], 'readwrite');
            tx.objectStore(STORE_INDEX).clear();
            tx.objectStore(STORE_MISSING).clear();
        } catch {}
    },
};
