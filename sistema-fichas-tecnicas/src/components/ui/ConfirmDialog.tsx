/**
 * ConfirmDialog - Diálogo de confirmación doble para acciones destructivas
 * Requirements: 12.1, 12.2
 * 
 * Proporciona:
 * - Confirmación simple para acciones normales
 * - Confirmación doble para acciones destructivas
 * - Iconos visuales según el tipo de acción
 * - Animaciones suaves de entrada/salida
 * - Accesibilidad con focus trap y escape key
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUIStore } from '@/stores';

/** Tipos de acción destructiva */
export type DestructiveActionType = 
  | 'delete-section'
  | 'delete-image'
  | 'reset-format'
  | 'clear-data'
  | 'discard-changes'
  | 'generic';

/** Props para el icono según tipo de acción */
const ACTION_ICONS: Record<DestructiveActionType, React.ReactNode> = {
  'delete-section': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  'delete-image': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  'reset-format': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  'clear-data': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  'discard-changes': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  'generic': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

export function ConfirmDialog() {
  const dialog = useUIStore((state) => state.confirmDialog);
  const hideDialog = useUIStore((state) => state.hideConfirmDialog);
  const [confirmCount, setConfirmCount] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  
  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!dialog?.isOpen) {
      setConfirmCount(0);
      setIsClosing(false);
    } else {
      // Focus the cancel button when dialog opens for safety
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);
    }
  }, [dialog?.isOpen]);
  
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      hideDialog();
    }, 150);
  }, [hideDialog]);
  
  const handleCancel = useCallback(() => {
    if (!dialog) return;
    dialog.onCancel?.();
    handleClose();
  }, [dialog, handleClose]);
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dialog?.isOpen) {
        handleCancel();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [dialog?.isOpen, handleCancel]);
  
  const handleConfirm = useCallback(() => {
    if (!dialog) return;
    
    const requiresDoubleConfirm = dialog.requireDoubleConfirm ?? false;
    const needsSecondConfirm = requiresDoubleConfirm && confirmCount === 0;
    
    if (needsSecondConfirm) {
      setConfirmCount(1);
    } else {
      dialog.onConfirm();
      handleClose();
    }
  }, [dialog, confirmCount, handleClose]);
  
  if (!dialog?.isOpen) return null;
  
  const requiresDoubleConfirm = dialog.requireDoubleConfirm ?? false;
  const needsSecondConfirm = requiresDoubleConfirm && confirmCount === 0;
  const isDestructive = dialog.destructive ?? false;
  const actionType = (dialog as { actionType?: DestructiveActionType }).actionType ?? 'generic';
  const icon = ACTION_ICONS[actionType];
  
  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-150 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-150 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleCancel}
        aria-hidden="true"
      />
      
      {/* Dialog */}
      <div 
        ref={dialogRef}
        className={`relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all duration-150 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Header with icon */}
        <div className={`px-6 pt-6 pb-4 ${isDestructive ? 'bg-red-50' : 'bg-gray-50'}`}>
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 p-3 rounded-full ${
              isDestructive ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
            }`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <h2 
                id="confirm-dialog-title"
                className="text-lg font-bold text-gray-900"
              >
                {dialog.title}
              </h2>
              <p 
                id="confirm-dialog-description"
                className="mt-1 text-sm text-gray-600"
              >
                {needsSecondConfirm
                  ? '¿Estás seguro? Esta acción no se puede deshacer.'
                  : dialog.message}
              </p>
            </div>
          </div>
        </div>
        
        {/* Double confirmation warning */}
        {needsSecondConfirm && (
          <div className="px-6 py-3 bg-yellow-50 border-y border-yellow-100">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-yellow-800 font-medium">
                Confirmación requerida: haz clic en &quot;{dialog.confirmLabel}&quot; de nuevo para continuar.
              </p>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="px-6 py-4 bg-white flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            {dialog.cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={handleConfirm}
            className={`px-4 py-2.5 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${
              needsSecondConfirm
                ? 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500 animate-pulse'
                : isDestructive
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-primary hover:bg-primary-600 focus:ring-primary'
            }`}
          >
            {needsSecondConfirm ? `Confirmar: ${dialog.confirmLabel}` : dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook para mostrar diálogos de confirmación de forma imperativa
 * Facilita la integración con acciones destructivas
 */
export function useConfirmDialog() {
  const showConfirmDialog = useUIStore((state) => state.showConfirmDialog);
  const hideConfirmDialog = useUIStore((state) => state.hideConfirmDialog);
  
  /**
   * Muestra un diálogo de confirmación y retorna una promesa
   * que se resuelve con true si el usuario confirma, false si cancela
   */
  const confirm = useCallback((options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    requireDoubleConfirm?: boolean;
    actionType?: DestructiveActionType;
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      showConfirmDialog({
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirmar',
        cancelLabel: options.cancelLabel ?? 'Cancelar',
        destructive: options.destructive ?? false,
        requireDoubleConfirm: options.requireDoubleConfirm ?? false,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }, [showConfirmDialog]);
  
  /**
   * Confirmar eliminación de sección
   */
  const confirmDeleteSection = useCallback((sectionName: string): Promise<boolean> => {
    return confirm({
      title: 'Eliminar sección',
      message: `¿Deseas eliminar la sección "${sectionName}"? Esta acción ocultará la sección de la ficha.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true,
      requireDoubleConfirm: true,
      actionType: 'delete-section',
    });
  }, [confirm]);
  
  /**
   * Confirmar eliminación de imagen
   */
  const confirmDeleteImage = useCallback((imageName?: string): Promise<boolean> => {
    return confirm({
      title: 'Eliminar imagen',
      message: imageName 
        ? `¿Deseas eliminar la imagen "${imageName}"?`
        : '¿Deseas eliminar esta imagen?',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true,
      requireDoubleConfirm: true,
      actionType: 'delete-image',
    });
  }, [confirm]);
  
  /**
   * Confirmar reseteo de formato
   */
  const confirmResetFormat = useCallback((): Promise<boolean> => {
    return confirm({
      title: 'Resetear formato',
      message: '¿Deseas restaurar el formato predeterminado? Se perderán todas las personalizaciones de esta ficha.',
      confirmLabel: 'Resetear',
      cancelLabel: 'Cancelar',
      destructive: true,
      requireDoubleConfirm: true,
      actionType: 'reset-format',
    });
  }, [confirm]);
  
  /**
   * Confirmar descarte de cambios
   */
  const confirmDiscardChanges = useCallback((): Promise<boolean> => {
    return confirm({
      title: 'Descartar cambios',
      message: 'Tienes cambios sin guardar. ¿Deseas descartarlos?',
      confirmLabel: 'Descartar',
      cancelLabel: 'Volver',
      destructive: true,
      requireDoubleConfirm: false,
      actionType: 'discard-changes',
    });
  }, [confirm]);
  
  return {
    confirm,
    confirmDeleteSection,
    confirmDeleteImage,
    confirmResetFormat,
    confirmDiscardChanges,
    hideConfirmDialog,
  };
}
