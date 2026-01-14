/**
 * FichaSection - Componente base para secciones de ficha
 * Requirements: 3.1, 12.1, 12.2
 * 
 * Proporciona la estructura común para todas las secciones:
 * - Encabezado con título y controles
 * - Indicador de estado (editable/bloqueado)
 * - Soporte para drag & drop
 * - Contenedor de contenido
 * - Confirmación doble para ocultar secciones
 */

'use client';

import { ReactNode, useCallback } from 'react';
import { useConfirmDialog } from '@/components/ui';
import type { SectionType } from '@/types/ficha';

interface FichaSectionProps {
  /** ID único de la sección */
  id: string;
  /** Tipo de sección */
  type: SectionType;
  /** Título de la sección */
  title: string;
  /** Icono de la sección (opcional) */
  icon?: ReactNode;
  /** Si la sección está bloqueada (no editable) */
  locked?: boolean;
  /** Si la sección está visible */
  visible?: boolean;
  /** Si la sección está siendo arrastrada */
  isDragging?: boolean;
  /** Si la sección puede ser reordenada */
  draggable?: boolean;
  /** Contenido de la sección */
  children: ReactNode;
  /** Callback para toggle de visibilidad */
  onToggleVisibility?: () => void;
  /** Props para drag handle */
  dragHandleProps?: Record<string, unknown>;
  /** Clase CSS adicional */
  className?: string;
}

export function FichaSection({
  id,
  type,
  title,
  icon,
  locked = false,
  visible = true,
  isDragging = false,
  draggable = true,
  children,
  onToggleVisibility,
  dragHandleProps,
  className = '',
}: FichaSectionProps) {
  const { confirmDeleteSection } = useConfirmDialog();
  
  // Handle hide section with confirmation
  const handleHideSection = useCallback(async () => {
    const confirmed = await confirmDeleteSection(title);
    if (confirmed) {
      onToggleVisibility?.();
    }
  }, [confirmDeleteSection, title, onToggleVisibility]);
  
  // Handle show section (no confirmation needed)
  const handleShowSection = useCallback(() => {
    onToggleVisibility?.();
  }, [onToggleVisibility]);

  if (!visible) {
    return (
      <div className="bg-gray-100 border border-dashed border-gray-300 rounded-lg p-4 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500">
            {icon}
            <span className="font-medium">{title}</span>
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">Oculta</span>
          </div>
          {onToggleVisibility && !locked && (
            <button
              onClick={handleShowSection}
              className="text-sm text-primary hover:text-primary-600 font-medium"
            >
              Mostrar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      data-section-id={id}
      data-section-type={type}
      className={`bg-white border border-gray-200 rounded-lg shadow-sm transition-all ${
        isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''
      } ${locked ? 'border-l-4 border-l-primary' : ''} ${className}`}
    >
      {/* Encabezado de sección */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center gap-3">
          {/* Drag handle */}
          {draggable && !locked && (
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
              title="Arrastrar para reordenar"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
              </svg>
            </div>
          )}

          {/* Icono y título */}
          <div className="flex items-center gap-2">
            {icon && <span className="text-primary">{icon}</span>}
            <h3 className="font-semibold text-gray-800">{title}</h3>
          </div>

          {/* Indicadores de estado */}
          {locked && (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Obligatoria
            </span>
          )}
        </div>

        {/* Controles de sección */}
        <div className="flex items-center gap-2">
          {onToggleVisibility && !locked && (
            <button
              onClick={handleHideSection}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="Ocultar sección (requiere confirmación)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Contenido de la sección */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
