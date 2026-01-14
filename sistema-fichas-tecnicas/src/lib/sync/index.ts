/**
 * Sync Module - Exportaciones del motor de sincronización
 * Requirements: 4.1-4.5
 */

export {
  SyncEngine,
  createSyncEngine,
  areStatesEquivalent,
  type SyncChange,
  type SyncChangePayload,
  type SyncListener,
  type ConflictListener,
  type SyncConflict,
  type SyncEngineOptions,
  type ChangeType,
  type ChangeSource,
  type FieldUpdatePayload,
  type SectionReorderPayload,
  type SectionVisibilityPayload,
  type ImageAddPayload,
  type ImageRemovePayload,
  type ImageResizePayload,
  type CustomizationChangePayload,
} from './syncEngine';

export {
  useSyncEngine,
  useSyncContext,
  SyncProvider,
} from './useSyncEngine';
