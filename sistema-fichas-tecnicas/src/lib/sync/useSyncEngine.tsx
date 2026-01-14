/**
 * useSyncEngine - Hook de React para sincronización bidireccional
 * Requirements: 4.1-4.5
 * 
 * Proporciona una interfaz React para el SyncEngine, manejando
 * el ciclo de vida y la integración con el estado de la ficha.
 */

'use client';

import { useEffect, useRef, useCallback, useState, useMemo, createContext, useContext, type ReactNode } from 'react';
import { SyncEngine, createSyncEngine, type SyncChange, type SyncConflict, type ChangeSource } from './syncEngine';
import type { FichaState } from '@/types/ficha';

interface UseSyncEngineOptions {
  /** Estado inicial de la ficha */
  initialState: FichaState | null;
  /** Callback cuando el estado cambia */
  onStateChange?: (state: FichaState) => void;
  /** Callback cuando hay un conflicto */
  onConflict?: (conflict: SyncConflict) => void;
  /** Habilitar modo debug */
  debug?: boolean;
}

interface UseSyncEngineReturn {
  /** Estado sincronizado actual */
  syncedState: FichaState | null;
  /** Versión actual del estado */
  version: number;
  /** Si hay cambios pendientes de sincronizar */
  isPending: boolean;
  /** Último conflicto detectado */
  lastConflict: SyncConflict | null;
  /** Actualizar un campo */
  updateField: (sectionId: string, field: string, value: string, source?: ChangeSource) => void;
  /** Reordenar secciones */
  reorderSections: (fromIndex: number, toIndex: number, source?: ChangeSource) => void;
  /** Toggle visibilidad de sección */
  toggleSectionVisibility: (sectionId: string, visible: boolean, source?: ChangeSource) => void;
  /** Forzar sincronización inmediata */
  flush: () => void;
  /** Reinicializar con nuevo estado */
  reinitialize: (state: FichaState) => void;
}

/**
 * Hook para usar el motor de sincronización en componentes React
 */
export function useSyncEngine({
  initialState,
  onStateChange,
  onConflict,
  debug = false,
}: UseSyncEngineOptions): UseSyncEngineReturn {
  const engineRef = useRef<SyncEngine | null>(null);
  const [syncedState, setSyncedState] = useState<FichaState | null>(initialState);
  const [version, setVersion] = useState(initialState?.version ?? 0);
  const [isPending, setIsPending] = useState(false);
  const [lastConflict, setLastConflict] = useState<SyncConflict | null>(null);


  // Crear el engine una sola vez
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = createSyncEngine({ debug });
    }

    const engine = engineRef.current;

    // Suscribirse a cambios
    const unsubscribeChanges = engine.subscribe((change: SyncChange, state: FichaState) => {
      setSyncedState(state);
      setVersion(change.version);
      setIsPending(false);
      onStateChange?.(state);
    });

    // Suscribirse a conflictos
    const unsubscribeConflicts = engine.onConflict((conflict: SyncConflict) => {
      setLastConflict(conflict);
      onConflict?.(conflict);
    });

    return () => {
      unsubscribeChanges();
      unsubscribeConflicts();
    };
  }, [debug, onStateChange, onConflict]);

  // Inicializar con el estado inicial
  useEffect(() => {
    if (initialState && engineRef.current) {
      engineRef.current.initialize(initialState);
      setSyncedState(initialState);
      setVersion(initialState.version);
    }
  }, [initialState]);

  // Actualizar un campo
  const updateField = useCallback((
    sectionId: string,
    field: string,
    value: string,
    source: ChangeSource = 'editor'
  ) => {
    if (!engineRef.current) return;
    setIsPending(true);
    engineRef.current.updateField(sectionId, field, value, source);
  }, []);

  // Reordenar secciones
  const reorderSections = useCallback((
    fromIndex: number,
    toIndex: number,
    source: ChangeSource = 'editor'
  ) => {
    if (!engineRef.current) return;
    setIsPending(true);
    engineRef.current.reorderSections(fromIndex, toIndex, source);
  }, []);

  // Toggle visibilidad
  const toggleSectionVisibility = useCallback((
    sectionId: string,
    visible: boolean,
    source: ChangeSource = 'editor'
  ) => {
    if (!engineRef.current) return;
    setIsPending(true);
    engineRef.current.toggleSectionVisibility(sectionId, visible, source);
  }, []);

  // Forzar flush
  const flush = useCallback(() => {
    engineRef.current?.flush();
  }, []);

  // Reinicializar
  const reinitialize = useCallback((state: FichaState) => {
    if (engineRef.current) {
      engineRef.current.initialize(state);
      setSyncedState(state);
      setVersion(state.version);
      setLastConflict(null);
    }
  }, []);

  return useMemo(() => ({
    syncedState,
    version,
    isPending,
    lastConflict,
    updateField,
    reorderSections,
    toggleSectionVisibility,
    flush,
    reinitialize,
  }), [
    syncedState,
    version,
    isPending,
    lastConflict,
    updateField,
    reorderSections,
    toggleSectionVisibility,
    flush,
    reinitialize,
  ]);
}

/**
 * Context para compartir el SyncEngine entre componentes
 */
interface SyncContextValue extends UseSyncEngineReturn {
  fichaId: string | null;
}

const SyncContext = createContext<SyncContextValue | null>(null);

interface SyncProviderProps {
  children: ReactNode;
  fichaId: string;
  initialState: FichaState | null;
  onStateChange?: (state: FichaState) => void;
  onConflict?: (conflict: SyncConflict) => void;
  debug?: boolean;
}

/**
 * Provider para compartir el estado de sincronización
 */
export function SyncProvider({
  children,
  fichaId,
  initialState,
  onStateChange,
  onConflict,
  debug,
}: SyncProviderProps) {
  const syncEngine = useSyncEngine({
    initialState,
    onStateChange,
    onConflict,
    debug,
  });

  const value = useMemo(() => ({
    ...syncEngine,
    fichaId,
  }), [syncEngine, fichaId]);

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de sincronización
 */
export function useSyncContext(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
}
