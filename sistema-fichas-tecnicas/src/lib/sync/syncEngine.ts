/**
 * SyncEngine - Motor de sincronización bidireccional
 * Requirements: 4.1-4.5
 * 
 * Proporciona sincronización en tiempo real entre el Editor_Visual
 * y la Vista_Previa, garantizando que los cambios se reflejen
 * instantáneamente en ambas direcciones.
 * 
 * Principios:
 * - Sincronización optimista con reconciliación
 * - Latencia < 100ms para actualizaciones
 * - Manejo de conflictos priorizando el último cambio
 * - Notificación al usuario en caso de conflictos
 */

import type { FichaState, FichaSection, FieldValue } from '@/types/ficha';
import { safePersist } from '@/lib/state/integrity';

/**
 * Tipo de cambio que puede ocurrir en el sistema
 */
export type ChangeType =
  | 'field_update'
  | 'section_reorder'
  | 'section_visibility'
  | 'image_add'
  | 'image_remove'
  | 'image_resize'
  | 'customization_change';

/**
 * Origen del cambio para trazabilidad
 */
export type ChangeSource = 'editor' | 'preview';

/**
 * Representa un cambio en el sistema
 */
export interface SyncChange {
  id: string;
  type: ChangeType;
  source: ChangeSource;
  timestamp: number;
  payload: SyncChangePayload;
  version: number;
}

/**
 * Payload específico para cada tipo de cambio
 */
export type SyncChangePayload =
  | FieldUpdatePayload
  | SectionReorderPayload
  | SectionVisibilityPayload
  | ImageAddPayload
  | ImageRemovePayload
  | ImageResizePayload
  | CustomizationChangePayload;

export interface FieldUpdatePayload {
  type: 'field_update';
  sectionId: string;
  field: string;
  value: string;
  previousValue?: string;
}

export interface SectionReorderPayload {
  type: 'section_reorder';
  fromIndex: number;
  toIndex: number;
}

export interface SectionVisibilityPayload {
  type: 'section_visibility';
  sectionId: string;
  visible: boolean;
}

export interface ImageAddPayload {
  type: 'image_add';
  sectionId: string;
  imageId: string;
  imageData: unknown;
}

export interface ImageRemovePayload {
  type: 'image_remove';
  sectionId: string;
  imageId: string;
}

export interface ImageResizePayload {
  type: 'image_resize';
  imageId: string;
  width: number;
  height: number;
}

export interface CustomizationChangePayload {
  type: 'customization_change';
  path: string[];
  value: unknown;
}

/**
 * Listener para cambios sincronizados
 */
export type SyncListener = (change: SyncChange, state: FichaState) => void;

/**
 * Listener para conflictos
 */
export type ConflictListener = (conflict: SyncConflict) => void;

/**
 * Representa un conflicto de sincronización
 */
export interface SyncConflict {
  id: string;
  timestamp: number;
  localChange: SyncChange;
  remoteChange: SyncChange;
  resolution: 'local_wins' | 'remote_wins';
  message: string;
}

/**
 * Opciones de configuración del SyncEngine
 */
export interface SyncEngineOptions {
  /** Intervalo de debounce para cambios rápidos (ms) */
  debounceMs?: number;
  /** Máximo de cambios en el buffer antes de flush */
  maxBufferSize?: number;
  /** Habilitar logging de debug */
  debug?: boolean;
}

const DEFAULT_OPTIONS: Required<SyncEngineOptions> = {
  debounceMs: 50,
  maxBufferSize: 100,
  debug: false,
};

/**
 * Motor de sincronización bidireccional
 * 
 * Garantiza que los cambios en el editor se reflejen en la vista previa
 * y viceversa, manteniendo consistencia en todo momento.
 */
export class SyncEngine {
  private state: FichaState | null = null;
  private listeners: Set<SyncListener> = new Set();
  private conflictListeners: Set<ConflictListener> = new Set();
  private changeBuffer: SyncChange[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private options: Required<SyncEngineOptions>;
  private version: number = 0;
  private lastChangeTimestamp: number = 0;

  constructor(options: SyncEngineOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Inicializa el engine con un estado inicial
   */
  initialize(initialState: FichaState): void {
    this.state = this.cloneState(initialState);
    this.version = initialState.version;
    this.log('SyncEngine initialized', { fichaId: initialState.id, version: this.version });
  }

  /**
   * Obtiene el estado actual sincronizado
   */
  getState(): FichaState | null {
    return this.state ? this.cloneState(this.state) : null;
  }

  /**
   * Obtiene la versión actual del estado
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Aplica un cambio desde el editor o preview
   * Requirements: 4.1, 4.2
   */
  applyChange(change: Omit<SyncChange, 'id' | 'timestamp' | 'version'>): SyncChange | null {
    if (!this.state) {
      this.log('Cannot apply change: no state initialized');
      return null;
    }

    const fullChange: SyncChange = {
      ...change,
      id: this.generateId(),
      timestamp: Date.now(),
      version: ++this.version,
    };

    // Detectar conflictos potenciales
    const conflict = this.detectConflict(fullChange);
    if (conflict) {
      this.handleConflict(conflict);
    }

    // Aplicar el cambio al estado
    this.state = this.applyChangeToState(this.state, fullChange);
    this.lastChangeTimestamp = fullChange.timestamp;

    // Persistencia segura inmediata
    safePersist(this.state);

    // Buffer el cambio para notificación
    this.bufferChange(fullChange);

    this.log('Change applied', { changeId: fullChange.id, type: fullChange.type });

    return fullChange;
  }

  /**
   * Actualiza un campo específico
   * Convenience method para actualizaciones de campo
   */
  updateField(
    sectionId: string,
    field: string,
    value: string,
    source: ChangeSource
  ): SyncChange | null {
    return this.applyChange({
      type: 'field_update',
      source,
      payload: {
        type: 'field_update',
        sectionId,
        field,
        value,
        previousValue: this.getFieldValue(sectionId, field),
      },
    });
  }

  /**
   * Reordena secciones
   */
  reorderSections(
    fromIndex: number,
    toIndex: number,
    source: ChangeSource
  ): SyncChange | null {
    return this.applyChange({
      type: 'section_reorder',
      source,
      payload: {
        type: 'section_reorder',
        fromIndex,
        toIndex,
      },
    });
  }

  /**
   * Cambia visibilidad de una sección
   */
  toggleSectionVisibility(
    sectionId: string,
    visible: boolean,
    source: ChangeSource
  ): SyncChange | null {
    return this.applyChange({
      type: 'section_visibility',
      source,
      payload: {
        type: 'section_visibility',
        sectionId,
        visible,
      },
    });
  }

  /**
   * Actualiza una personalización
   */
  updateCustomization(
    path: string[],
    value: unknown,
    source: ChangeSource
  ): SyncChange | null {
    return this.applyChange({
      type: 'customization_change',
      source,
      payload: {
        type: 'customization_change',
        path,
        value,
      },
    });
  }

  /**
   * Suscribe un listener para cambios sincronizados
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Suscribe un listener para conflictos
   */
  onConflict(listener: ConflictListener): () => void {
    this.conflictListeners.add(listener);
    return () => this.conflictListeners.delete(listener);
  }

  /**
   * Fuerza la sincronización inmediata de cambios pendientes
   */
  flush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.notifyListeners();
  }

  /**
   * Destruye el engine y limpia recursos
   */
  destroy(): void {
    this.flush();
    this.listeners.clear();
    this.conflictListeners.clear();
    this.changeBuffer = [];
    this.state = null;
    this.log('SyncEngine destroyed');
  }

  // --- Métodos privados ---

  private applyChangeToState(state: FichaState, change: SyncChange): FichaState {
    const newState = this.cloneState(state);
    newState.version = change.version;
    newState.lastModified = change.timestamp;

    switch (change.payload.type) {
      case 'field_update':
        return this.applyFieldUpdate(newState, change.payload);
      case 'section_reorder':
        return this.applySectionReorder(newState, change.payload);
      case 'section_visibility':
        return this.applySectionVisibility(newState, change.payload);
      case 'image_add':
      case 'image_remove':
      case 'image_resize':
        // Estos se manejan en el store directamente
        return newState;
      case 'customization_change':
        return this.applyCustomizationChange(newState, change.payload);
      default:
        return newState;
    }
  }

  private applyFieldUpdate(state: FichaState, payload: FieldUpdatePayload): FichaState {
    state.sections = state.sections.map((section) => {
      if (section.id === payload.sectionId) {
        return {
          ...section,
          content: {
            ...section.content,
            [payload.field]: {
              value: payload.value,
              source: 'manual' as const,
              originalValue: payload.previousValue,
              modifiedAt: Date.now(),
            },
          },
        };
      }
      return section;
    });
    return state;
  }

  private applySectionReorder(state: FichaState, payload: SectionReorderPayload): FichaState {
    const sections = [...state.sections];
    const [removed] = sections.splice(payload.fromIndex, 1);
    sections.splice(payload.toIndex, 0, removed);

    state.sections = sections.map((section, index) => ({
      ...section,
      order: index,
    }));

    return state;
  }

  private applySectionVisibility(state: FichaState, payload: SectionVisibilityPayload): FichaState {
    state.sections = state.sections.map((section) => {
      if (section.id === payload.sectionId) {
        return { ...section, visible: payload.visible };
      }
      return section;
    });
    return state;
  }

  private applyCustomizationChange(state: FichaState, payload: CustomizationChangePayload): FichaState {
    // Navegar al path y actualizar el valor
    let target: Record<string, unknown> = state.customizations as unknown as Record<string, unknown>;
    const path = [...payload.path];
    const lastKey = path.pop();

    if (!lastKey) return state;

    for (const key of path) {
      if (typeof target[key] === 'object' && target[key] !== null) {
        target = target[key] as Record<string, unknown>;
      }
    }

    target[lastKey] = payload.value;
    return state;
  }

  private getFieldValue(sectionId: string, field: string): string | undefined {
    if (!this.state) return undefined;
    const section = this.state.sections.find((s) => s.id === sectionId);
    return section?.content[field]?.value;
  }

  private detectConflict(change: SyncChange): SyncConflict | null {
    // Detectar si hay un cambio reciente del otro origen
    const recentThreshold = 100; // 100ms
    const timeSinceLastChange = change.timestamp - this.lastChangeTimestamp;

    if (timeSinceLastChange < recentThreshold && this.changeBuffer.length > 0) {
      const lastChange = this.changeBuffer[this.changeBuffer.length - 1];

      // Solo es conflicto si afectan al mismo campo/sección
      if (this.changesOverlap(lastChange, change) && lastChange.source !== change.source) {
        return {
          id: this.generateId(),
          timestamp: Date.now(),
          localChange: lastChange,
          remoteChange: change,
          resolution: 'remote_wins', // Último cambio gana (Requirement 4.4)
          message: 'Se detectó un cambio simultáneo. Se aplicó el cambio más reciente.',
        };
      }
    }

    return null;
  }

  private changesOverlap(a: SyncChange, b: SyncChange): boolean {
    if (a.type !== b.type) return false;

    if (a.payload.type === 'field_update' && b.payload.type === 'field_update') {
      return a.payload.sectionId === b.payload.sectionId &&
        a.payload.field === b.payload.field;
    }

    if (a.payload.type === 'section_visibility' && b.payload.type === 'section_visibility') {
      return a.payload.sectionId === b.payload.sectionId;
    }

    return false;
  }

  private handleConflict(conflict: SyncConflict): void {
    this.log('Conflict detected', conflict);

    // Notificar a los listeners de conflicto
    for (const listener of this.conflictListeners) {
      try {
        listener(conflict);
      } catch (error) {
        this.log('Error in conflict listener', error);
      }
    }
  }

  private bufferChange(change: SyncChange): void {
    this.changeBuffer.push(change);

    // Flush si el buffer está lleno
    if (this.changeBuffer.length >= this.options.maxBufferSize) {
      this.flush();
      return;
    }

    // Debounce para agrupar cambios rápidos
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.notifyListeners();
    }, this.options.debounceMs);
  }

  private notifyListeners(): void {
    if (!this.state || this.changeBuffer.length === 0) return;

    const changes = [...this.changeBuffer];
    this.changeBuffer = [];

    const stateCopy = this.cloneState(this.state);

    for (const change of changes) {
      for (const listener of this.listeners) {
        try {
          listener(change, stateCopy);
        } catch (error) {
          this.log('Error in sync listener', error);
        }
      }
    }
  }

  private cloneState(state: FichaState): FichaState {
    return JSON.parse(JSON.stringify(state));
  }

  private generateId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(message: string, data?: unknown): void {
    if (this.options.debug) {
      console.log(`[SyncEngine] ${message}`, data ?? '');
    }
  }
}

/**
 * Hook para crear y gestionar una instancia de SyncEngine
 */
export function createSyncEngine(options?: SyncEngineOptions): SyncEngine {
  return new SyncEngine(options);
}

/**
 * Utilidad para comparar dos estados y determinar si son equivalentes
 * Requirements: 4.5
 */
export function areStatesEquivalent(a: FichaState | null, b: FichaState | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;

  // Comparar secciones
  if (a.sections.length !== b.sections.length) return false;

  for (let i = 0; i < a.sections.length; i++) {
    const sectionA = a.sections[i];
    const sectionB = b.sections[i];

    if (sectionA.id !== sectionB.id) return false;
    if (sectionA.visible !== sectionB.visible) return false;
    if (sectionA.order !== sectionB.order) return false;

    // Comparar contenido
    const keysA = Object.keys(sectionA.content);
    const keysB = Object.keys(sectionB.content);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (sectionA.content[key]?.value !== sectionB.content[key]?.value) {
        return false;
      }
    }
  }

  return true;
}
