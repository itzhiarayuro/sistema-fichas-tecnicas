/**
 * BlobStore - Almacenamiento de blobs con evicción LRU + persistencia IndexedDB
 * 
 * Optimizado para manejar miles de fotos sin saturar la RAM.
 * - Solo mantiene MAX_IN_MEMORY blobs en RAM simultáneamente
 * - Persiste todos los blobs en IndexedDB para recuperación
 * - Evicción LRU automática: los menos usados se descargan de RAM
 * - API compatible hacia atrás con el BlobStore original
 */

// ============================================
// Configuración
// ============================================

/** Máximo número de blobs en memoria RAM simultáneamente */
const MAX_IN_MEMORY = 100;

/** Nombre del store en IndexedDB para blobs */
const BLOB_DB_NAME = 'blob-cache';
const BLOB_DB_VERSION = 1;
const BLOB_STORE_NAME = 'blobs';

// ============================================
// Tipos
// ============================================

interface StoredBlob {
    blob: Blob;
    url: string;
    size: number;
    mimeType: string;
    lastAccessed: number;
}

interface BlobStats {
    totalStored: number;
    totalInMemory: number;
    totalInIDB: number;
    totalSizeInMemory: number;
    totalSizeEstimate: number;
}

// ============================================
// IndexedDB para blobs (dedicada, separada de fichas)
// ============================================

let blobDb: IDBDatabase | null = null;

function openBlobDB(): Promise<IDBDatabase> {
    if (blobDb) return Promise.resolve(blobDb);

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(BLOB_DB_NAME, BLOB_DB_VERSION);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            blobDb = request.result;
            resolve(blobDb);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(BLOB_STORE_NAME)) {
                db.createObjectStore(BLOB_STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

async function saveBlobToIDB(id: string, blob: Blob): Promise<void> {
    try {
        const db = await openBlobDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(BLOB_STORE_NAME, 'readwrite');
            const store = tx.objectStore(BLOB_STORE_NAME);
            const request = store.put({ id, blob, size: blob.size, mimeType: blob.type, timestamp: Date.now() });
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.warn(`⚠️ BlobStore: No se pudo persistir blob ${id} en IndexedDB:`, error);
    }
}

async function loadBlobFromIDB(id: string): Promise<Blob | null> {
    try {
        const db = await openBlobDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(BLOB_STORE_NAME, 'readonly');
            const store = tx.objectStore(BLOB_STORE_NAME);
            const request = store.get(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.blob : null);
            };
        });
    } catch (error) {
        console.warn(`⚠️ BlobStore: No se pudo cargar blob ${id} de IndexedDB:`, error);
        return null;
    }
}

async function deleteBlobFromIDB(id: string): Promise<void> {
    try {
        const db = await openBlobDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(BLOB_STORE_NAME, 'readwrite');
            const store = tx.objectStore(BLOB_STORE_NAME);
            const request = store.delete(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.warn(`⚠️ BlobStore: No se pudo eliminar blob ${id} de IndexedDB:`, error);
    }
}

// ============================================
// BlobStore Principal
// ============================================

export class BlobStore {
    private static instance: BlobStore;

    /** Blobs actualmente en memoria RAM */
    private memoryMap: Map<string, StoredBlob> = new Map();

    /** Orden LRU: el último accedido va al final */
    private lruOrder: string[] = [];

    /** Set de TODOS los blobIds conocidos (en memoria o en IDB) */
    private allKnownIds: Set<string> = new Set();

    /** Tamaños de todos los blobs conocidos (para stats) */
    private allSizes: Map<string, number> = new Map();

    private constructor() { }

    static getInstance(): BlobStore {
        if (!BlobStore.instance) {
            BlobStore.instance = new BlobStore();
        }
        return BlobStore.instance;
    }

    // ============================================
    // API Pública (compatible hacia atrás)
    // ============================================

    /**
     * Almacena un archivo/blob y devuelve un identificador único.
     * Persiste en IndexedDB automáticamente y aplica evicción LRU.
     */
    async store(data: File | Blob, customId?: string): Promise<string> {
        const id = customId || this.generateId();
        const blob = data instanceof File ? new Blob([data], { type: data.type }) : data;

        // Si ya existe en memoria, actualizar acceso
        if (this.memoryMap.has(id)) {
            this.touchLRU(id);
            return id;
        }

        // Crear ObjectURL y guardar en memoria
        const url = URL.createObjectURL(blob);
        const entry: StoredBlob = {
            blob,
            url,
            size: blob.size,
            mimeType: blob.type || 'application/octet-stream',
            lastAccessed: Date.now(),
        };

        this.memoryMap.set(id, entry);
        this.allKnownIds.add(id);
        this.allSizes.set(id, blob.size);
        this.pushLRU(id);

        // Persistir en IndexedDB (fire and forget, no bloqueamos)
        saveBlobToIDB(id, blob).catch(() => { });

        // Aplicar evicción LRU si excedemos el límite
        this.evictIfNeeded();

        return id;
    }

    /**
     * Obtiene la URL de un blob para mostrar en <img src={...}>
     * SÍNCRONO: Retorna la URL si está en memoria, o null si fue eviccionado.
     * Para garantizar que esté cargado, usar ensureLoaded() primero.
     */
    getUrl(blobId: string): string {
        const entry = this.memoryMap.get(blobId);
        if (entry) {
            this.touchLRU(blobId);
            return entry.url;
        }

        // Si el blob fue eviccionado, retorna string vacío
        // El consumidor debe usar ensureLoaded() o un placeholder
        if (this.allKnownIds.has(blobId)) {
            // Disparar carga asíncrona en background (no bloquea)
            this.ensureLoaded(blobId).catch(() => { });
            return ''; // Retornar vacío mientras carga
        }

        return '';
    }

    /**
     * Obtiene el Blob directamente (síncrono, solo si está en memoria)
     */
    getBlob(blobId: string): Blob | null {
        const entry = this.memoryMap.get(blobId);
        if (entry) {
            this.touchLRU(blobId);
            return entry.blob;
        }
        return null;
    }

    /**
     * Carga un blob de IndexedDB a memoria si fue eviccionado.
     * Retorna la URL del blob una vez cargado.
     * Esencial llamar antes de usar getUrl() cuando se necesita la imagen.
     */
    async ensureLoaded(blobId: string): Promise<string> {
        // Si ya está en memoria, retornar URL directamente
        const existing = this.memoryMap.get(blobId);
        if (existing) {
            this.touchLRU(blobId);
            return existing.url;
        }

        // Intentar cargar desde IndexedDB
        const blob = await loadBlobFromIDB(blobId);
        if (!blob) {
            console.warn(`⚠️ BlobStore: Blob ${blobId} no encontrado en IndexedDB`);
            return '';
        }

        // Re-crear ObjectURL y guardar en memoria
        const url = URL.createObjectURL(blob);
        const entry: StoredBlob = {
            blob,
            url,
            size: blob.size,
            mimeType: blob.type || 'application/octet-stream',
            lastAccessed: Date.now(),
        };

        this.memoryMap.set(blobId, entry);
        this.pushLRU(blobId);

        // Evicionar si es necesario
        this.evictIfNeeded();

        return url;
    }

    /**
     * Asegura que múltiples blobs estén cargados en memoria.
     * Útil para precargar antes de generar PDF o mostrar grid.
     */
    async ensureMultipleLoaded(blobIds: string[]): Promise<Map<string, string>> {
        const result = new Map<string, string>();

        // Primero recopilar cuáles necesitan carga
        const toLoad: string[] = [];
        for (const id of blobIds) {
            const existing = this.memoryMap.get(id);
            if (existing) {
                this.touchLRU(id);
                result.set(id, existing.url);
            } else if (this.allKnownIds.has(id)) {
                toLoad.push(id);
            }
        }

        // Cargar en paralelo con límite de concurrencia
        const CONCURRENCY = 5;
        for (let i = 0; i < toLoad.length; i += CONCURRENCY) {
            const batch = toLoad.slice(i, i + CONCURRENCY);
            const promises = batch.map(async (id) => {
                const url = await this.ensureLoaded(id);
                if (url) result.set(id, url);
            });
            await Promise.allSettled(promises);
        }

        return result;
    }

    /**
     * Libera un blob completamente (de memoria Y de IndexedDB).
     * Usar cuando el blob ya no se necesita nunca más.
     */
    release(blobId: string): void {
        // Liberar de memoria
        const entry = this.memoryMap.get(blobId);
        if (entry) {
            URL.revokeObjectURL(entry.url);
            this.memoryMap.delete(blobId);
        }

        // Quitar del LRU
        this.removeLRU(blobId);

        // Quitar del tracking
        this.allKnownIds.delete(blobId);
        this.allSizes.delete(blobId);

        // Eliminar de IndexedDB
        deleteBlobFromIDB(blobId).catch(() => { });
    }

    /**
     * Libera todos los blobs (memoria + IndexedDB).
     * Usar con precaución - para reset completo.
     */
    purge(): void {
        // Revocar todas las ObjectURLs
        for (const [, entry] of this.memoryMap) {
            URL.revokeObjectURL(entry.url);
        }

        this.memoryMap.clear();
        this.lruOrder = [];
        this.allKnownIds.clear();
        this.allSizes.clear();

        // Limpiar IndexedDB
        openBlobDB().then(db => {
            const tx = db.transaction(BLOB_STORE_NAME, 'readwrite');
            tx.objectStore(BLOB_STORE_NAME).clear();
        }).catch(() => { });
    }

    /**
     * Verifica si un blob es conocido (en memoria o en IDB)
     */
    has(blobId: string): boolean {
        return this.allKnownIds.has(blobId);
    }

    /**
     * Verifica si un blob está actualmente en memoria RAM
     */
    isInMemory(blobId: string): boolean {
        return this.memoryMap.has(blobId);
    }

    /**
     * Obtiene estadísticas del BlobStore
     */
    getStats(): BlobStats {
        let totalSizeInMemory = 0;
        for (const [, entry] of this.memoryMap) {
            totalSizeInMemory += entry.size;
        }

        let totalSizeEstimate = 0;
        for (const [, size] of this.allSizes) {
            totalSizeEstimate += size;
        }

        return {
            totalStored: this.allKnownIds.size,
            totalInMemory: this.memoryMap.size,
            totalInIDB: this.allKnownIds.size, // Todos están en IDB
            totalSizeInMemory,
            totalSizeEstimate,
        };
    }

    // ============================================
    // LRU (Least Recently Used) Management
    // ============================================

    private pushLRU(id: string): void {
        // Quitar si ya existe y poner al final
        this.removeLRU(id);
        this.lruOrder.push(id);
    }

    private touchLRU(id: string): void {
        // Mover al final (más reciente)
        const idx = this.lruOrder.indexOf(id);
        if (idx !== -1) {
            this.lruOrder.splice(idx, 1);
            this.lruOrder.push(id);
        }
    }

    private removeLRU(id: string): void {
        const idx = this.lruOrder.indexOf(id);
        if (idx !== -1) {
            this.lruOrder.splice(idx, 1);
        }
    }

    /**
     * Eviciona los blobs menos usados si excedemos MAX_IN_MEMORY
     */
    private evictIfNeeded(): void {
        while (this.memoryMap.size > MAX_IN_MEMORY && this.lruOrder.length > 0) {
            // El primero en la lista es el menos reciente
            const oldestId = this.lruOrder.shift();
            if (!oldestId) break;

            const entry = this.memoryMap.get(oldestId);
            if (entry) {
                // Revocar ObjectURL para liberar memoria
                URL.revokeObjectURL(entry.url);
                this.memoryMap.delete(oldestId);

                // NB: NO eliminamos de allKnownIds/allSizes — sigue en IndexedDB
                console.debug(`🔄 BlobStore: Eviccionado blob ${oldestId} de RAM (${(entry.size / 1024).toFixed(0)}KB), ${this.memoryMap.size} en memoria`);
            }
        }
    }

    // ============================================
    // Utilidades
    // ============================================

    private generateId(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `blob-${timestamp}-${random}`;
    }
}

// Instancia singleton
export const blobStore = BlobStore.getInstance();
