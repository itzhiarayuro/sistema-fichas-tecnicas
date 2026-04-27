/**
 * BlobStore v2 — OPFS (Origin Private File System)
 * 
 * REEMPLAZA IndexedDB por OPFS que es 3-4x más rápido para archivos de imagen.
 * OPFS usa el disco real del usuario en vez de una base de datos.
 * 
 * Compatible 100% con el resto del sistema — misma API, mejor rendimiento.
 */

// ============================================
// Configuración
// ============================================

/** Máximo blobs en RAM simultáneamente */
const MAX_IN_MEMORY = 800;

/** Carpeta dentro de OPFS donde guardamos las fotos */
const OPFS_FOLDER = 'fotos-sistema';

// ============================================
// Tipos
// ============================================

interface StoredBlob {
  blob: Blob;
  url: string;
  size: number;
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
// OPFS — Sistema de Archivos Real del Navegador
// ============================================

let opfsRoot: FileSystemDirectoryHandle | null = null;
let opfsFotos: FileSystemDirectoryHandle | null = null;

/** Registro LRU de archivos en OPFS: safeId → timestamp de escritura */
const opfsRegistry: Map<string, number> = new Map();

/** Inicializa OPFS (solo una vez) */
async function getOpfsFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (opfsFotos) return opfsFotos;
  try {
    opfsRoot = await navigator.storage.getDirectory();
    opfsFotos = await opfsRoot.getDirectoryHandle(OPFS_FOLDER, { create: true });
    return opfsFotos;
  } catch {
    console.warn('⚠️ OPFS no disponible, usando IndexedDB como fallback');
    return null;
  }
}

/**
 * Evicta los N archivos más antiguos del OPFS para liberar espacio.
 * Llama solo cuando QuotaExceededError — no en operación normal.
 */
async function evictOldestFromOPFS(folder: FileSystemDirectoryHandle, n = 50): Promise<void> {
  try {
    // Obtener lista actual si el registro en memoria está vacío
    if (opfsRegistry.size === 0) {
      // @ts-ignore
      for await (const [name] of folder.entries()) {
        if (!opfsRegistry.has(name)) opfsRegistry.set(name, 0);
      }
    }
    const sorted = Array.from(opfsRegistry.entries())
      .sort((a, b) => a[1] - b[1]) // más antiguos primero (timestamp menor)
      .slice(0, n)
      .map(([id]) => id);
    await Promise.allSettled(
      sorted.map(id => folder.removeEntry(id).then(() => opfsRegistry.delete(id)).catch(() => {}))
    );
  } catch { /* silencioso */ }
}

/** Guarda un blob en OPFS con evicción automática si la cuota se agota. */
async function saveToOPFS(id: string, blob: Blob): Promise<void> {
  const safeId = id.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const folder = await getOpfsFolder();
  if (!folder) { await saveBlobToIDB(id, blob); return; }

  const doWrite = async () => {
    const fileHandle = await folder.getFileHandle(safeId, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    // Verificación post-escritura: confirmar que los bytes llegaron al disco.
    // Algunos navegadores resuelven close() antes de que el OS flushee.
    if (blob.size > 0) {
      const verify = await folder.getFileHandle(safeId);
      const vf = await verify.getFile();
      if (vf.size === 0) {
        throw new Error(`OPFS write vacío para ${safeId}: esperaba ${blob.size}B`);
      }
    }
    opfsRegistry.set(safeId, Date.now());
  };

  try {
    await doWrite();
  } catch (error: any) {
    const isQuota = error?.name === 'QuotaExceededError' ||
                    String(error).includes('QuotaExceeded') ||
                    String(error?.message).includes('quota');
    if (isQuota) {
      // Evictar los 50 archivos más antiguos y reintentar una vez
      await evictOldestFromOPFS(folder, 50);
      try {
        await doWrite();
        return; // Éxito en el reintento
      } catch (retryError) {
        console.warn(`⚠️ OPFS quota llena y falló evicción para ${id}:`, retryError);
        await saveBlobToIDB(id, blob);
      }
    } else {
      // Escritura fallida (permisos, lock del OS, verificación fallida, etc.)
      console.warn(`⚠️ OPFS falló al escribir ${id}, cayendo a IndexedDB:`, error);
      await saveBlobToIDB(id, blob);
    }
  }
}

/** Carga un blob desde OPFS */
async function loadFromOPFS(id: string): Promise<Blob | null> {
  const safeId = id.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  try {
    const folder = await getOpfsFolder();
    if (!folder) return loadBlobFromIDB(id);

    const fileHandle = await folder.getFileHandle(safeId);
    const file = await fileHandle.getFile();
    return file; // File extiende Blob — compatible directo
  } catch {
    // No existe en OPFS, intentar IDB como fallback
    return loadBlobFromIDB(id);
  }
}

/** Elimina un blob de OPFS */
async function deleteFromOPFS(id: string): Promise<void> {
  const safeId = id.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  try {
    const folder = await getOpfsFolder();
    if (!folder) { deleteBlobFromIDB(id); return; }
    await folder.removeEntry(safeId);
  } catch {
    deleteBlobFromIDB(id);
  }
}

// ============================================
// IndexedDB — Fallback si OPFS no disponible
// ============================================

const BLOB_DB_NAME = 'blob-cache';
const BLOB_DB_VERSION = 1;
const BLOB_STORE_NAME = 'blobs';
let blobDb: IDBDatabase | null = null;

function openBlobDB(): Promise<IDBDatabase> {
  if (blobDb) return Promise.resolve(blobDb);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BLOB_DB_NAME, BLOB_DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { blobDb = request.result; resolve(blobDb); };
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
      store.put({ id, blob, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn(`⚠️ Error IDB save (${id}):`, error);
  }
}

async function loadBlobFromIDB(id: string): Promise<Blob | null> {
  try {
    const db = await openBlobDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE_NAME, 'readonly');
      const request = tx.objectStore(BLOB_STORE_NAME).get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ? request.result.blob : null);
    });
  } catch { return null; }
}

async function deleteBlobFromIDB(id: string): Promise<void> {
  try {
    const db = await openBlobDB();
    return new Promise((resolve) => {
      const tx = db.transaction(BLOB_STORE_NAME, 'readwrite');
      tx.objectStore(BLOB_STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
    });
  } catch { /* silencioso */ }
}

// ============================================
// BATCH SAVE — Guarda múltiples blobs en UNA SOLA operación
// Reduce 10.000 transacciones a ~100 operaciones agrupadas
// ============================================

/**
 * Guarda múltiples blobs de golpe — mucho más rápido que uno por uno.
 * Úsalo cuando proceses lotes de fotos.
 */
export async function saveBlobsBatch(items: Array<{ id: string; blob: Blob }>): Promise<void> {
  const folder = await getOpfsFolder();

  if (folder) {
    // OPFS: operaciones paralelas (hasta 8 a la vez)
    const CONCURRENCY = 8;
    let failedCount = 0;
    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const batch = items.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(({ id, blob }) => saveToOPFS(id, blob))
      );
      // saveToOPFS tiene su propio fallback a IDB; una rejection aquí
      // significa que AMBOS fallaron — loggear para diagnóstico.
      for (const r of results) {
        if (r.status === 'rejected') {
          failedCount++;
          console.error('[BlobStore] Fallo total (OPFS+IDB) al guardar blob:', r.reason);
        }
      }
    }
    if (failedCount > 0) {
      console.warn(`[BlobStore] ${failedCount}/${items.length} blobs no pudieron persistirse`);
    }
  } else {
    // IDB fallback: UNA sola transacción para todos
    try {
      const db = await openBlobDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(BLOB_STORE_NAME, 'readwrite');
        const store = tx.objectStore(BLOB_STORE_NAME);
        items.forEach(({ id, blob }) => store.put({ id, blob, timestamp: Date.now() }));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error('Error en batch IDB save:', error);
    }
  }
}

// ============================================
// BlobStore Principal
// ============================================

export class BlobStore {
  private static instance: BlobStore;

  /** Blobs en memoria RAM (LRU) */
  private memoryMap: Map<string, StoredBlob> = new Map();

  /** Orden LRU: último accedido al final */
  private lruOrder: string[] = [];

  /** Todos los IDs conocidos */
  private allKnownIds: Set<string> = new Set();

  /** Tamaños para estadísticas */
  private allSizes: Map<string, number> = new Map();

  /** Buffer para batch saves pendientes */
  private pendingSaves: Array<{ id: string; blob: Blob }> = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  /** Promise del flush en curso (para que flushPending() pueda esperar) */
  private activeFlush: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): BlobStore {
    if (!BlobStore.instance) {
      BlobStore.instance = new BlobStore();
    }
    return BlobStore.instance;
  }

  // ============================================
  // API Pública — igual que antes, sin cambios
  // ============================================

  /**
   * Guarda un archivo/blob y retorna su ID.
   * Ahora usa OPFS en vez de IndexedDB — 3-4x más rápido.
   */
  async store(data: File | Blob, customId?: string): Promise<string> {
    const id = customId || this.generateId();
    const blob = data instanceof File ? new Blob([data], { type: data.type }) : data;

    // Si ya está en RAM, solo actualizar LRU
    if (this.memoryMap.has(id)) {
      this.touchLRU(id);
      return id;
    }

    // Guardar en RAM con ObjectURL
    const url = URL.createObjectURL(blob);
    this.memoryMap.set(id, {
      blob,
      url,
      size: blob.size,
      lastAccessed: Date.now(),
    });
    this.allKnownIds.add(id);
    this.allSizes.set(id, blob.size);
    this.pushLRU(id);

    // Acumular para batch save (más eficiente que guardar uno por uno)
    this.pendingSaves.push({ id, blob });
    this.scheduleBatchFlush();

    // Evictar si excedemos RAM
    this.evictIfNeeded();

    return id;
  }

  /** Ejecuta la escritura inmediata del buffer pendiente. */
  private async _runFlush(): Promise<void> {
    if (this.pendingSaves.length === 0) return;
    const toSave = [...this.pendingSaves];
    this.pendingSaves = [];
    await saveBlobsBatch(toSave);
  }

  /**
   * Acumula saves y los escribe en batch cada 300ms.
   * Reduce drásticamente las operaciones de disco.
   */
  private scheduleBatchFlush(): void {
    // No programar si ya hay un timer o un flush activo
    if (this.flushTimer !== null || this.activeFlush !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.activeFlush = this._runFlush().finally(() => {
        this.activeFlush = null;
        // Si llegaron nuevos blobs durante el flush, procesarlos
        if (this.pendingSaves.length > 0) {
          this.scheduleBatchFlush();
        }
      });
    }, 300);
  }

  /**
   * Espera a que todos los blobs pendientes se persistan en disco.
   * DEBE llamarse antes de generar PDFs o navegar fuera de la página.
   */
  async flushPending(): Promise<void> {
    // Cancelar timer pendiente y forzar ejecución inmediata
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    // Esperar el flush que ya está corriendo
    if (this.activeFlush) {
      await this.activeFlush;
    }
    // Persistir cualquier remanente (puede haber llegado durante activeFlush)
    while (this.pendingSaves.length > 0) {
      await this._runFlush();
    }
  }

  /** Obtiene la URL de un blob para <img src={...}> */
  getUrl(blobId: string): string {
    if (!blobId || blobId.includes('url=undefined')) return '';

    const entry = this.memoryMap.get(blobId);
    if (entry) {
      this.touchLRU(blobId);
      return entry.url;
    }

    if (this.allKnownIds.has(blobId)) {
      this.ensureLoaded(blobId).catch(() => {});
      return '';
    }

    return '';
  }

  /** Obtiene el Blob directamente si está en RAM (no consulta disco) */
  getBlob(blobId: string): Blob | null {
    const entry = this.memoryMap.get(blobId);
    if (entry) {
      this.touchLRU(blobId);
      return entry.blob;
    }
    return null;
  }

  /**
   * Obtiene el Blob buscando primero RAM, luego OPFS (persistente).
   * Esto es lo que hay que usar para caché entre sesiones — getBlob() solo ve RAM.
   */
  async getBlobAsync(blobId: string): Promise<Blob | null> {
    const ram = this.getBlob(blobId);
    if (ram) return ram;

    // Consultar OPFS directamente — no pasa por ensureLoaded para evitar el path URL
    const blob = await loadFromOPFS(blobId);
    if (blob && blob.size > 100) {
      // Cargarlo en RAM para próximas consultas
      const url = URL.createObjectURL(blob);
      this.memoryMap.set(blobId, {
        blob, url, size: blob.size, lastAccessed: Date.now(),
      });
      this.allKnownIds.add(blobId);
      this.allSizes.set(blobId, blob.size);
      this.pushLRU(blobId);
      this.evictIfNeeded();
      return blob;
    }
    return null;
  }

  /** Carga un blob de disco a RAM si fue eviccionado, o lo descarga si es una URL */
  async ensureLoaded(blobId: string): Promise<string> {
    if (!blobId || blobId.includes('url=undefined')) return '';

    const existing = this.memoryMap.get(blobId);
    if (existing) {
      this.touchLRU(blobId);
      return existing.url;
    }

    // SI ES UNA URL DE PROXY/REMOTA: Descargar y guardar localmente
    if (blobId.startsWith('/') || blobId.startsWith('http')) {
      try {
        const response = await fetch(blobId);
        if (response.ok) {
          const blob = await response.blob();
          // Validar que sea una imagen real
          if (blob.size > 100 && blob.type.startsWith('image/')) {
            await this.store(blob, blobId);
            return this.getUrl(blobId);
          }
        }
      } catch (error) {
        // silencioso - intentamos el fallback abajo
      }

      // FALLBACK: Si es una URL de proxy-image y falló, intentar GAS directo desde el cliente
      if (blobId.includes('proxy-image')) {
        try {
          const url = new URL(blobId, window.location.origin);
          const filename = url.searchParams.get('filename');
          if (filename) {
            const gasUrl = (window as any).__NEXT_DATA__?.props?.pageProps?.gasUrl 
              || process.env.NEXT_PUBLIC_GAS_URL 
              || '';
            const token = (window as any).__NEXT_DATA__?.props?.pageProps?.gasToken
              || process.env.NEXT_PUBLIC_SECRET_TOKEN
              || '';
            
            if (gasUrl) {
              console.log(`🔄 BlobStore: Intentando GAS directo para ${filename}...`);
              const gasResponse = await fetch(gasUrl, {
                method: 'POST',
                mode: 'cors',
                body: JSON.stringify({ token, action: 'download', filename })
              });
              if (gasResponse.ok) {
                const result = await gasResponse.json();
                if (result.success && result.base64) {
                  let b64 = result.base64;
                  const mime = result.mimeType || 'image/jpeg';
                  if (!b64.startsWith('data:')) {
                    b64 = `data:${mime};base64,${b64}`;
                  }
                  // Convertir data URL a Blob y almacenar
                  const fetchBlob = await fetch(b64);
                  const blob = await fetchBlob.blob();
                  await this.store(blob, blobId);
                  console.log(`✅ BlobStore: GAS directo exitoso para ${filename}`);
                  return this.getUrl(blobId);
                }
              }
            }
          }
        } catch (gasError) {
          console.warn(`⚠️ BlobStore: GAS directo falló para ${blobId}`);
        }
      }

      console.warn(`⚠️ BlobStore: No se encontró ${blobId}`);
      return '';
    }

    // Cargar desde OPFS (o IDB fallback)
    const blob = await loadFromOPFS(blobId);
    if (!blob) {
      console.warn(`⚠️ BlobStore: No se encontró ${blobId}`);
      return '';
    }

    const url = URL.createObjectURL(blob);
    this.memoryMap.set(blobId, {
      blob,
      url,
      size: blob.size,
      lastAccessed: Date.now(),
    });
    this.pushLRU(blobId);
    this.evictIfNeeded();

    return url;
  }

  /** Carga múltiples blobs en paralelo */
  async ensureMultipleLoaded(blobIds: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
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
    const CONCURRENCY = 8;
    for (let i = 0; i < toLoad.length; i += CONCURRENCY) {
      const batch = toLoad.slice(i, i + CONCURRENCY);
      await Promise.allSettled(
        batch.map(async (id) => {
          const url = await this.ensureLoaded(id);
          if (url) result.set(id, url);
        })
      );
    }

    return result;
  }

  /** Libera un blob completamente */
  release(blobId: string): void {
    const entry = this.memoryMap.get(blobId);
    if (entry) {
      URL.revokeObjectURL(entry.url);
      this.memoryMap.delete(blobId);
    }
    this.removeLRU(blobId);
    this.allKnownIds.delete(blobId);
    this.allSizes.delete(blobId);
    deleteFromOPFS(blobId).catch(() => {});
  }

  /** Borra todo (RAM + disco) */
  purge(): void {
    for (const [, entry] of this.memoryMap) {
      URL.revokeObjectURL(entry.url);
    }
    this.memoryMap.clear();
    this.lruOrder = [];
    this.allKnownIds.clear();
    this.allSizes.clear();

    // Limpiar OPFS
    getOpfsFolder().then(async folder => {
      if (!folder) return;
      // Listar y borrar todos los archivos
      try {
        const entries = [];
        // @ts-ignore
        for await (const [name] of folder.entries()) {
          entries.push(name);
        }
        await Promise.all(entries.map(name => folder.removeEntry(name).catch(() => {})));
      } catch (e) {
        console.warn('Error clearing OPFS:', e);
      }
    }).catch(() => {});
  }

  has(blobId: string): boolean {
    return this.allKnownIds.has(blobId);
  }

  isInMemory(blobId: string): boolean {
    return this.memoryMap.has(blobId);
  }

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
      totalInIDB: this.allKnownIds.size,
      totalSizeInMemory,
      totalSizeEstimate,
    };
  }

  // ============================================
  // LRU interno
  // ============================================

  private pushLRU(id: string): void {
    this.removeLRU(id);
    this.lruOrder.push(id);
  }

  private touchLRU(id: string): void {
    const idx = this.lruOrder.indexOf(id);
    if (idx !== -1) {
      this.lruOrder.splice(idx, 1);
      this.lruOrder.push(id);
    }
  }

  private removeLRU(id: string): void {
    const idx = this.lruOrder.indexOf(id);
    if (idx !== -1) this.lruOrder.splice(idx, 1);
  }

  private evictIfNeeded(): void {
    while (this.memoryMap.size > MAX_IN_MEMORY && this.lruOrder.length > 0) {
      const oldestId = this.lruOrder.shift();
      if (!oldestId) break;
      const entry = this.memoryMap.get(oldestId);
      if (entry) {
        URL.revokeObjectURL(entry.url);
        this.memoryMap.delete(oldestId);
      }
    }
  }

  private generateId(): string {
    return `blob-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export const blobStore = BlobStore.getInstance();
