/**
 * SectionErrorFallback - Fallback UI para secciones con errores
 * Requirements: 17.1, 17.2
 * 
 * Muestra un mensaje amigable cuando una sección falla,
 * permitiendo al usuario continuar trabajando en otras secciones.
 */

'use client';

import { ReactNode } from 'react';

interface SectionErrorFallbackProps {
  /** Nombre de la sección que falló */
  sectionName?: string;
  /** Mensaje de error para el usuario */
  errorMessage?: string;
  /** Callback para reintentar */
  onRetry?: () => void;
  /** Callback para reportar el error */
  onReport?: () => void;
  /** Contenido adicional */
  children?: ReactNode;
}

export function SectionErrorFallback({
  sectionName = 'Esta sección',
  errorMessage = 'Ocurrió un problema inesperado.',
  onRetry,
  onReport,
  children,
}: SectionErrorFallbackProps) {
  return (
    <div 
      className="p-4 bg-amber-50 border border-amber-200 rounded-lg"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* Icono de advertencia */}
        <div className="flex-shrink-0">
          <svg 
            className="w-5 h-5 text-amber-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        
        <div className="flex-1">
          <h3 className="text-amber-800 font-medium text-sm">
            {sectionName} no se pudo cargar
          </h3>
          <p className="text-amber-700 text-sm mt-1">
            {errorMessage}
          </p>
          <p className="text-amber-600 text-xs mt-2">
            El resto de la aplicación sigue funcionando normalmente.
          </p>
          
          {children}
          
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                Intentar de nuevo
              </button>
            )}
            {onReport && (
              <button
                onClick={onReport}
                className="px-3 py-1.5 text-sm text-amber-700 border border-amber-300 rounded hover:bg-amber-100 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                Reportar problema
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Variante compacta para secciones pequeñas
 */
export function SectionErrorFallbackCompact({
  sectionName = 'Sección',
  onRetry,
}: Pick<SectionErrorFallbackProps, 'sectionName' | 'onRetry'>) {
  return (
    <div 
      className="p-3 bg-amber-50 border border-amber-200 rounded flex items-center justify-between gap-2"
      role="alert"
    >
      <span className="text-amber-700 text-sm">
        {sectionName} no disponible
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-amber-600 hover:text-amber-800 underline focus:outline-none"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
