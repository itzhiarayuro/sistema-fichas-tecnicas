/**
 * UI Store - Estado transiente de la interfaz
 * Requirements: 8.6, 18.1
 * 
 * Este store maneja el estado de la UI que no necesita persistirse:
 * - Selección actual
 * - Modo del editor
 * - Notificaciones toast
 * - Diálogos de confirmación
 */

import { create } from 'zustand';

export type EditorMode = 'edit' | 'preview' | 'split';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  requireDoubleConfirm?: boolean;
  destructive?: boolean;
  actionType?: 'delete-section' | 'delete-image' | 'reset-format' | 'clear-data' | 'discard-changes' | 'generic';
}

interface UIState {
  // Selection state
  selectedPozoId: string | null;
  selectedFichaId: string | null;

  // Editor state
  editorMode: EditorMode;
  activeSection: string | null;
  isPreviewLoading: boolean;

  // Layout state
  sidebarCollapsed: boolean;

  // Modal state
  confirmDialog: ConfirmDialogState | null;

  // Notifications
  toasts: Toast[];

  // Loading states
  isGlobalLoading: boolean;
  loadingMessage: string | null;

  // Resource states
  degradedMode: boolean;

  // Actions - Selection
  setSelectedPozoId: (id: string | null) => void;
  setSelectedFichaId: (id: string | null) => void;
  clearSelection: () => void;

  // Actions - Editor
  setEditorMode: (mode: EditorMode) => void;
  setActiveSection: (sectionId: string | null) => void;
  setPreviewLoading: (loading: boolean) => void;

  // Actions - Layout
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Actions - Dialog
  showConfirmDialog: (dialog: Omit<ConfirmDialogState, 'isOpen'>) => void;
  hideConfirmDialog: () => void;

  // Actions - Toast
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Actions - Loading
  setGlobalLoading: (loading: boolean, message?: string) => void;

  // Convenience methods for common toasts
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;

  // Degraded mode
  setDegradedMode: (enabled: boolean) => void;

  // Designer Panels state
  designerPanels: {
    showDesigns: boolean;
    showElements: boolean;
    showProperties: boolean;
    showLayers: boolean;
    designsWidth: number;
    elementsWidth: number;
    propertiesWidth: number;
    layersWidth: number;
  };
  toggleDesignerPanel: (panel: 'designs' | 'elements' | 'properties' | 'layers') => void;
  setDesignerPanelWidth: (panel: 'designs' | 'elements' | 'properties' | 'layers', width: number) => void;

  // Mobile Menu
  mobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
}

// Default toast duration in milliseconds
const DEFAULT_TOAST_DURATION = 5000;

// Helper to generate unique IDs
function generateId(): string {
  return crypto.randomUUID();
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  selectedPozoId: null,
  selectedFichaId: null,
  editorMode: 'split',
  activeSection: null,
  isPreviewLoading: false,
  sidebarCollapsed: false,
  confirmDialog: null,
  toasts: [],
  isGlobalLoading: false,
  loadingMessage: null,
  degradedMode: false,
  designerPanels: {
    showDesigns: true,
    showElements: true,
    showProperties: true,
    showLayers: false,
    designsWidth: 260,
    elementsWidth: 280,
    propertiesWidth: 320,
    layersWidth: 220,
  },
  mobileMenuOpen: false,

  // Selection actions
  setSelectedPozoId: (id) => set({ selectedPozoId: id }),
  setSelectedFichaId: (id) => set({ selectedFichaId: id }),
  clearSelection: () => set({ selectedPozoId: null, selectedFichaId: null }),

  // Editor actions
  setEditorMode: (mode) => set({ editorMode: mode }),
  setActiveSection: (sectionId) => set({ activeSection: sectionId }),
  setPreviewLoading: (loading) => set({ isPreviewLoading: loading }),

  // Layout actions
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // Dialog actions
  showConfirmDialog: (dialog) => set({
    confirmDialog: { ...dialog, isOpen: true },
  }),

  hideConfirmDialog: () => set({ confirmDialog: null }),

  // Toast actions
  addToast: (toast) => {
    const id = generateId();
    const duration = toast.duration ?? DEFAULT_TOAST_DURATION;

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    // Auto-remove toast after duration (unless duration is 0 for persistent toasts)
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),

  clearToasts: () => set({ toasts: [] }),

  // Loading actions
  setGlobalLoading: (loading, message) => set({
    isGlobalLoading: loading,
    loadingMessage: loading ? (message ?? null) : null,
  }),

  // Convenience toast methods
  showSuccess: (message, title) => {
    get().addToast({
      type: 'success',
      message,
      title: title ?? 'Éxito',
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  showError: (message, title) => {
    get().addToast({
      type: 'error',
      message,
      title: title ?? 'Error',
      duration: DEFAULT_TOAST_DURATION * 1.5, // Errors stay longer
    });
  },

  showWarning: (message, title) => {
    get().addToast({
      type: 'warning',
      message,
      title: title ?? 'Advertencia',
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  showInfo: (message, title) => {
    get().addToast({
      type: 'info',
      message,
      title: title ?? 'Información',
      duration: DEFAULT_TOAST_DURATION,
    });
  },

  setDegradedMode: (enabled) => set({ degradedMode: enabled }),

  toggleDesignerPanel: (panel) => set((state) => {
    const showKey = panel === 'designs' ? 'showDesigns' :
      panel === 'elements' ? 'showElements' :
        panel === 'properties' ? 'showProperties' : 'showLayers';

    const isShowing = !state.designerPanels[showKey];
    const widthKey = panel === 'designs' ? 'designsWidth' :
      panel === 'elements' ? 'elementsWidth' :
        panel === 'properties' ? 'propertiesWidth' : 'layersWidth';

    // Default widths if becoming visible and width was 0
    const defaultWidths = {
      designs: 260,
      elements: 280,
      properties: 320,
      layers: 220
    };

    return {
      designerPanels: {
        ...state.designerPanels,
        [showKey]: isShowing,
        // If showing and current width is 0, restore default
        [widthKey]: (isShowing && state.designerPanels[widthKey] === 0) ? defaultWidths[panel] : state.designerPanels[widthKey]
      }
    };
  }),

  setDesignerPanelWidth: (panel, width) => set((state) => {
    const showKey = panel === 'designs' ? 'showDesigns' :
      panel === 'elements' ? 'showElements' :
        panel === 'properties' ? 'showProperties' : 'showLayers';
    const widthKey = panel === 'designs' ? 'designsWidth' :
      panel === 'elements' ? 'elementsWidth' :
        panel === 'properties' ? 'propertiesWidth' : 'layersWidth';

    return {
      designerPanels: {
        ...state.designerPanels,
        [widthKey]: width,
        [showKey]: width > 0
      }
    };
  }),

  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
}));
