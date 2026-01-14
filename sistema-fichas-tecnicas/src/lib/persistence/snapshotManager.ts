/**
 * SnapshotManager - Auto-save y recuperación ante fallos
 * Requirements: 13.1-13.4
 * 
 * Implementa:
 * - Auto-save cada 30 segundos
 * - Mantiene últimos 10 snapshots por ficha
 * - Recuperación tras crash
 * - Restauración manual de versiones anteriores
 */

import type { FichaState } from '@/types';
import { initDB, STORES } from './indexedDB';

export interface Snapshot {
  id: string;
  fichaId: string;
  state: FichaState;
  timestamp: number;
  trigger: 'auto' | 'manual' | 'pre-action';
  /** Descripción opcional del snapshot */
  description?: string;
}

const MAX_SNAPSHOTS = 10;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

/**
 * Genera un ID único para snapshots
 */
function generateSnapshotId(): string {
  // Usar crypto.randomUUID si está disponible, sino fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para entornos sin crypto.randomUUID
  return `snapshot-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export class SnapshotManager {
  private autoSaveTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private lastSavedStates: Map<string, string> = new Map(); // Hash del último estado guardado
  
  /**
   * Crea un snapshot del estado actual de una ficha
   * @param fichaId ID de la ficha
   * @param state Estado actual de la ficha
   * @param trigger Qué causó el snapshot
   * @param description Descripción opcional
   */
  async createSnapshot(
    fichaId: string,
    state: FichaState,
    trigger: Snapshot['trigger'],
    description?: string
  ): Promise<Snapshot> {
    const snapshot: Snapshot = {
      id: generateSnapshotId(),
      fichaId,
      state: structuredClone(state),
      timestamp: Date.now(),
      trigger,
      description,
    };
    
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.snapshots, 'readwrite');
      const store = transaction.objectStore(STORES.snapshots);
      const request = store.put(snapshot);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        // Actualizar hash del último estado guardado
        this.lastSavedStates.set(fichaId, this.hashState(state));
        
        // Limpiar snapshots antiguos
        try {
          await this.pruneOldSnapshots(fichaId);
        } catch (error) {
          // No fallar si la limpieza falla
          console.warn('Failed to prune old snapshots:', error);
        }
        
        resolve(snapshot);
      };
    });
  }
  
  /**
   * Obtiene todos los snapshots de una ficha, ordenados por timestamp descendente
   * @param fichaId ID de la ficha
   */
  async getSnapshots(fichaId: string): Promise<Snapshot[]> {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.snapshots, 'readonly');
      const store = transaction.objectStore(STORES.snapshots);
      const index = store.index('fichaId');
      const request = index.getAll(fichaId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const snapshots = request.result || [];
        // Ordenar por timestamp descendente (más reciente primero)
        snapshots.sort((a, b) => b.timestamp - a.timestamp);
        resolve(snapshots);
      };
    });
  }
  
  /**
   * Restaura el snapshot más reciente de una ficha
   * @param fichaId ID de la ficha
   * @returns Estado restaurado o null si no hay snapshots
   */
  async restoreLatest(fichaId: string): Promise<FichaState | null> {
    const snapshots = await this.getSnapshots(fichaId);
    return snapshots.length > 0 ? structuredClone(snapshots[0].state) : null;
  }
  
  /**
   * Restaura un snapshot específico por su ID
   * @param snapshotId ID del snapshot
   * @returns Estado restaurado o null si no existe
   */
  async restoreSnapshot(snapshotId: string): Promise<FichaState | null> {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.snapshots, 'readonly');
      const store = transaction.objectStore(STORES.snapshots);
      const request = store.get(snapshotId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const snapshot = request.result as Snapshot | undefined;
        resolve(snapshot ? structuredClone(snapshot.state) : null);
      };
    });
  }
  
  /**
   * Elimina snapshots antiguos, manteniendo solo los últimos MAX_SNAPSHOTS
   * @param fichaId ID de la ficha
   */
  async pruneOldSnapshots(fichaId: string): Promise<void> {
    const snapshots = await this.getSnapshots(fichaId);
    
    if (snapshots.length <= MAX_SNAPSHOTS) return;
    
    const toDelete = snapshots.slice(MAX_SNAPSHOTS);
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.snapshots, 'readwrite');
      const store = transaction.objectStore(STORES.snapshots);
      
      let completed = 0;
      let hasError = false;
      
      for (const snapshot of toDelete) {
        const request = store.delete(snapshot.id);
        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(request.error);
          }
        };
        request.onsuccess = () => {
          completed++;
          if (completed === toDelete.length && !hasError) {
            resolve();
          }
        };
      }
      
      // Si no hay nada que eliminar
      if (toDelete.length === 0) {
        resolve();
      }
    });
  }
  
  /**
   * Elimina un snapshot específico
   * @param snapshotId ID del snapshot a eliminar
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.snapshots, 'readwrite');
      const store = transaction.objectStore(STORES.snapshots);
      const request = store.delete(snapshotId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  /**
   * Inicia el auto-save para una ficha
   * @param fichaId ID de la ficha
   * @param getState Función que retorna el estado actual
   */
  startAutoSave(fichaId: string, getState: () => FichaState): void {
    // Detener auto-save existente si hay uno
    this.stopAutoSave(fichaId);
    
    // Guardar estado inicial
    const initialState = getState();
    this.lastSavedStates.set(fichaId, this.hashState(initialState));
    
    const timer = setInterval(async () => {
      try {
        const state = getState();
        const currentHash = this.hashState(state);
        const lastHash = this.lastSavedStates.get(fichaId);
        
        // Solo guardar si el estado cambió
        if (currentHash !== lastHash) {
          await this.createSnapshot(fichaId, state, 'auto');
        }
      } catch (error) {
        // Fail-safe: no romper el flujo si falla el auto-save
        console.error('Auto-save failed for ficha:', fichaId, error);
      }
    }, AUTO_SAVE_INTERVAL);
    
    this.autoSaveTimers.set(fichaId, timer);
  }
  
  /**
   * Detiene el auto-save para una ficha
   * @param fichaId ID de la ficha
   */
  stopAutoSave(fichaId: string): void {
    const timer = this.autoSaveTimers.get(fichaId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(fichaId);
    }
    this.lastSavedStates.delete(fichaId);
  }
  
  /**
   * Detiene todos los auto-saves activos
   */
  stopAllAutoSave(): void {
    const fichaIds = Array.from(this.autoSaveTimers.keys());
    for (const fichaId of fichaIds) {
      this.stopAutoSave(fichaId);
    }
  }
  
  /**
   * Verifica si hay auto-save activo para una ficha
   * @param fichaId ID de la ficha
   */
  isAutoSaveActive(fichaId: string): boolean {
    return this.autoSaveTimers.has(fichaId);
  }
  
  /**
   * Obtiene el número de snapshots de una ficha
   * @param fichaId ID de la ficha
   */
  async getSnapshotCount(fichaId: string): Promise<number> {
    const snapshots = await this.getSnapshots(fichaId);
    return snapshots.length;
  }
  
  /**
   * Crea un hash simple del estado para detectar cambios
   * @param state Estado de la ficha
   */
  private hashState(state: FichaState): string {
    // Hash simple basado en JSON stringify
    // Excluir campos que cambian frecuentemente pero no son relevantes
    const relevantState = {
      sections: state.sections,
      customizations: state.customizations,
      status: state.status,
    };
    return JSON.stringify(relevantState);
  }
  
  /**
   * Fuerza un guardado inmediato del estado actual
   * @param fichaId ID de la ficha
   * @param state Estado actual
   * @param description Descripción del snapshot
   */
  async forceSave(
    fichaId: string,
    state: FichaState,
    description?: string
  ): Promise<Snapshot> {
    return this.createSnapshot(fichaId, state, 'manual', description);
  }
  
  /**
   * Crea un snapshot antes de una acción destructiva
   * @param fichaId ID de la ficha
   * @param state Estado actual
   * @param actionDescription Descripción de la acción
   */
  async createPreActionSnapshot(
    fichaId: string,
    state: FichaState,
    actionDescription: string
  ): Promise<Snapshot> {
    return this.createSnapshot(
      fichaId,
      state,
      'pre-action',
      `Before: ${actionDescription}`
    );
  }
}

// Singleton instance
export const snapshotManager = new SnapshotManager();

// Export constants for testing
export { MAX_SNAPSHOTS, AUTO_SAVE_INTERVAL };
