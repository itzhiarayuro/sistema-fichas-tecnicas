/**
 * Toast - Notificaciones no intrusivas
 * Requirements: 8.6, 18.7-18.9
 * 
 * Sistema de notificaciones que:
 * - Corrige automáticamente cuando es seguro sin notificar si no es necesario
 * - Muestra advertencias solo cuando afectan el resultado final
 * - Mensajes informativos discretos que no bloquean la interacción
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUIStore, Toast as ToastType } from '@/stores';

const TOAST_ICONS: Record<ToastType['type'], React.ReactNode> = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const TOAST_STYLES: Record<ToastType['type'], { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'bg-environmental-50',
    border: 'border-environmental-200',
    icon: 'text-environmental-600',
    text: 'text-environmental-800',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    text: 'text-red-800',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-600',
    text: 'text-yellow-800',
  },
  info: {
    bg: 'bg-primary-50',
    border: 'border-primary-200',
    icon: 'text-primary-600',
    text: 'text-primary-800',
  },
};

interface ToastItemProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);
  const styles = TOAST_STYLES[toast.type];
  
  const handleRemove = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 200);
  }, [onRemove, toast.id]);
  
  useEffect(() => {
    // Don't auto-remove if duration is 0 (persistent toast)
    if (toast.duration === 0) return;
    
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      handleRemove();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, handleRemove]);
  
  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border
        ${styles.bg} ${styles.border}
        ${isExiting ? 'animate-slide-out' : 'animate-slide-in'}
        max-w-sm w-full
      `}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${styles.icon}`}>
        {TOAST_ICONS[toast.type]}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={`font-medium text-sm ${styles.text}`}>
            {toast.title}
          </p>
        )}
        <p className={`text-sm ${toast.title ? 'mt-0.5 opacity-90' : ''} ${styles.text}`}>
          {toast.message}
        </p>
        
        {/* Action button */}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              handleRemove();
            }}
            className={`mt-2 text-sm font-medium underline hover:no-underline ${styles.icon}`}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      
      {/* Close button */}
      <button
        onClick={handleRemove}
        className={`flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors ${styles.icon}`}
        aria-label="Cerrar notificación"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useUIStore((state) => state.toasts);
  const removeToast = useUIStore((state) => state.removeToast);
  
  if (toasts.length === 0) return null;
  
  return (
    <div 
      className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2"
      aria-label="Notificaciones"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

export { ToastItem };
