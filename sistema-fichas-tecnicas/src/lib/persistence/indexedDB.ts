/**
 * IndexedDB para persistencia de fichas
 * Requirements: 9.1, 16.10
 * 
 * Implementa persistencia fail-safe con namespace por ficha.
 * Cada ficha se almacena de forma aislada para garantizar
 * que errores en una ficha no afecten a otras.
 */

import type { FichaState } from '@/types';

const DB_NAME = 'fichas-tecnicas';
const DB_VERSION = 1;

const STORES = {
  fichas: 'fichas',
  snapshots: 'snapshots',
  photos: 'photos',
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

/**
 * Foto almacenada con su data URL
 */
export interface StoredPhoto {
  id: string;
  fichaId: string;
  filename: string;
  dataUrl: string;
  timestamp: number;
}

let db: IDBDatabase | null = null;

/**
 * Inicializa la base de datos IndexedDB
 * Crea los stores necesarios si no existen
 */
export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // Fichas store - cada ficha con su propio ID como namespace
      if (!database.objectStoreNames.contains(STORES.fichas)) {
        const fichaStore = database.createObjectStore(STORES.fichas, { keyPath: 'id' });
        fichaStore.createIndex('pozoId', 'pozoId', { unique: false });
        fichaStore.createIndex('status', 'status', { unique: false });
        fichaStore.createIndex('lastModified', 'lastModified', { unique: false });
      }
      
      // Snapshots store - indexado por fichaId para aislamiento
      if (!database.objectStoreNames.contains(STORES.snapshots)) {
        const snapshotStore = database.createObjectStore(STORES.snapshots, { keyPath: 'id' });
        snapshotStore.createIndex('fichaId', 'fichaId', { unique: false });
        snapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Photos store - indexado por fichaId para namespace
      if (!database.objectStoreNames.contains(STORES.photos)) {
        const photoStore = database.createObjectStore(STORES.photos, { keyPath: 'id' });
        photoStore.createIndex('fichaId', 'fichaId', { unique: false });
      }
    };
  });
}

/**
 * Cierra la conexión a la base de datos
 * Útil para testing y cleanup
 */
export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Guarda una ficha en IndexedDB
 * Fail-safe: si falla, no afecta otras fichas
 * @param ficha Estado de la ficha a guardar
 */
export async function saveFicha(ficha: FichaState): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.fichas, 'readwrite');
    const store = transaction.objectStore(STORES.fichas);
    
    // Actualizar timestamp de modificación
    const fichaToSave = {
      ...ficha,
      lastModified: Date.now(),
    };
    
    const request = store.put(fichaToSave);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Carga una ficha desde IndexedDB
 * @param fichaId ID único de la ficha
 * @returns Estado de la ficha o null si no existe
 */
export async function loadFicha(fichaId: string): Promise<FichaState | null> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.fichas, 'readonly');
    const store = transaction.objectStore(STORES.fichas);
    const request = store.get(fichaId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Elimina una ficha de IndexedDB
 * También elimina snapshots y fotos asociadas (namespace cleanup)
 * @param fichaId ID único de la ficha
 */
export async function deleteFicha(fichaId: string): Promise<void> {
  const database = await initDB();
  
  // Eliminar ficha
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORES.fichas, 'readwrite');
    const store = transaction.objectStore(STORES.fichas);
    const request = store.delete(fichaId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
  
  // Eliminar snapshots asociados (cleanup de namespace)
  await deleteSnapshotsByFichaId(fichaId);
  
  // Eliminar fotos asociadas (cleanup de namespace)
  await deletePhotosByFichaId(fichaId);
}

/**
 * Obtiene todas las fichas almacenadas
 * @returns Array de todas las fichas
 */
export async function getAllFichas(): Promise<FichaState[]> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.fichas, 'readonly');
    const store = transaction.objectStore(STORES.fichas);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Busca fichas por ID de pozo
 * @param pozoId ID del pozo
 * @returns Fichas asociadas al pozo
 */
export async function getFichasByPozoId(pozoId: string): Promise<FichaState[]> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.fichas, 'readonly');
    const store = transaction.objectStore(STORES.fichas);
    const index = store.index('pozoId');
    const request = index.getAll(pozoId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

// ============================================
// Photo Storage Operations
// ============================================

/**
 * Guarda una foto asociada a una ficha
 * @param photo Foto a guardar con su dataUrl
 */
export async function savePhoto(photo: StoredPhoto): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.photos, 'readwrite');
    const store = transaction.objectStore(STORES.photos);
    const request = store.put(photo);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Carga una foto por su ID
 * @param photoId ID de la foto
 * @returns Foto o null si no existe
 */
export async function loadPhoto(photoId: string): Promise<StoredPhoto | null> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.photos, 'readonly');
    const store = transaction.objectStore(STORES.photos);
    const request = store.get(photoId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Obtiene todas las fotos de una ficha
 * @param fichaId ID de la ficha
 * @returns Fotos asociadas a la ficha
 */
export async function getPhotosByFichaId(fichaId: string): Promise<StoredPhoto[]> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.photos, 'readonly');
    const store = transaction.objectStore(STORES.photos);
    const index = store.index('fichaId');
    const request = index.getAll(fichaId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Elimina una foto por su ID
 * @param photoId ID de la foto
 */
export async function deletePhoto(photoId: string): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.photos, 'readwrite');
    const store = transaction.objectStore(STORES.photos);
    const request = store.delete(photoId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Elimina todas las fotos de una ficha (namespace cleanup)
 * @param fichaId ID de la ficha
 */
export async function deletePhotosByFichaId(fichaId: string): Promise<void> {
  const photos = await getPhotosByFichaId(fichaId);
  const database = await initDB();
  
  if (photos.length === 0) return;
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.photos, 'readwrite');
    const store = transaction.objectStore(STORES.photos);
    
    let completed = 0;
    let hasError = false;
    
    for (const photo of photos) {
      const request = store.delete(photo.id);
      request.onerror = () => {
        if (!hasError) {
          hasError = true;
          reject(request.error);
        }
      };
      request.onsuccess = () => {
        completed++;
        if (completed === photos.length && !hasError) {
          resolve();
        }
      };
    }
  });
}

// ============================================
// Snapshot Operations (used by SnapshotManager)
// ============================================

/**
 * Elimina todos los snapshots de una ficha (namespace cleanup)
 * @param fichaId ID de la ficha
 */
export async function deleteSnapshotsByFichaId(fichaId: string): Promise<void> {
  const database = await initDB();
  
  // Primero obtener todos los snapshots de la ficha
  const snapshots = await new Promise<Array<{ id: string }>>((resolve, reject) => {
    const transaction = database.transaction(STORES.snapshots, 'readonly');
    const store = transaction.objectStore(STORES.snapshots);
    const index = store.index('fichaId');
    const request = index.getAll(fichaId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
  
  if (snapshots.length === 0) return;
  
  // Luego eliminarlos
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.snapshots, 'readwrite');
    const store = transaction.objectStore(STORES.snapshots);
    
    let completed = 0;
    let hasError = false;
    
    for (const snapshot of snapshots) {
      const request = store.delete(snapshot.id);
      request.onerror = () => {
        if (!hasError) {
          hasError = true;
          reject(request.error);
        }
      };
      request.onsuccess = () => {
        completed++;
        if (completed === snapshots.length && !hasError) {
          resolve();
        }
      };
    }
  });
}

// ============================================
// Utility Operations
// ============================================

/**
 * Verifica si existe una ficha
 * @param fichaId ID de la ficha
 * @returns true si existe
 */
export async function fichaExists(fichaId: string): Promise<boolean> {
  const ficha = await loadFicha(fichaId);
  return ficha !== null;
}

/**
 * Cuenta el total de fichas almacenadas
 * @returns Número de fichas
 */
export async function countFichas(): Promise<number> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.fichas, 'readonly');
    const store = transaction.objectStore(STORES.fichas);
    const request = store.count();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Limpia todos los datos de la base de datos
 * PRECAUCIÓN: Elimina todas las fichas, snapshots y fotos
 * Útil para testing y reset completo
 */
export async function clearAllData(): Promise<void> {
  const database = await initDB();
  
  const storeNames = [STORES.fichas, STORES.snapshots, STORES.photos];
  
  for (const storeName of storeNames) {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export { STORES, DB_NAME };
