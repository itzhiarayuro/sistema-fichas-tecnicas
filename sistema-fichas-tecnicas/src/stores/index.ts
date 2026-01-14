/**
 * Barrel export for all stores
 */

export { useGlobalStore } from './globalStore';
export {
  createFichaStore,
  getFichaStore,
  removeFichaStore,
  clearAllFichaStores,
  getRegisteredFichaIds
} from './fichaStore';
export { useUIStore } from './uiStore';
export { useDesignStore } from './designStore';

export type { GlobalConfig, WorkflowStep, Template } from './globalStore';
export type { FichaStore } from './fichaStore';
export type { EditorMode, Toast, ConfirmDialogState } from './uiStore';
