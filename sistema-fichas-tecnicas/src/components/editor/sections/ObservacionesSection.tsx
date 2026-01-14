/**
 * ObservacionesSection - Sección de observaciones del pozo
 * Requirements: 3.1, 3.2, 5.1-5.4
 * 
 * Muestra y permite editar las observaciones generales del pozo.
 * Utiliza TextEditor con soporte multiline para edición con trazabilidad.
 */

'use client';

import { FichaSection } from './FichaSection';
import { TextEditor } from '../TextEditor';
import type { FieldValue } from '@/types/ficha';

interface ObservacionesSectionProps {
  /** ID de la sección */
  id: string;
  /** Datos de observaciones */
  observaciones: FieldValue;
  /** Si la sección está bloqueada */
  locked?: boolean;
  /** Si la sección está visible */
  visible?: boolean;
  /** Callback para actualizar observaciones */
  onObservacionesChange?: (value: string) => void;
  /** Callback para toggle de visibilidad */
  onToggleVisibility?: () => void;
  /** Props para drag handle */
  dragHandleProps?: Record<string, unknown>;
  /** Si está siendo arrastrada */
  isDragging?: boolean;
}

export function ObservacionesSection({
  id,
  observaciones,
  locked = false,
  visible = true,
  onObservacionesChange,
  onToggleVisibility,
  dragHandleProps,
  isDragging,
}: ObservacionesSectionProps) {
  const icon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  return (
    <FichaSection
      id={id}
      type="observaciones"
      title="Observaciones"
      icon={icon}
      locked={locked}
      visible={visible}
      isDragging={isDragging}
      draggable={!locked}
      onToggleVisibility={onToggleVisibility}
      dragHandleProps={dragHandleProps}
    >
      <div>
        <TextEditor
          fieldValue={observaciones}
          editable={!locked}
          multiline
          rows={4}
          placeholder="Ingrese observaciones sobre el pozo..."
          onCommit={onObservacionesChange}
          showSource={true}
          showTraceability={true}
          size="md"
        />

        {/* Contador de caracteres */}
        {!locked && (
          <div className="mt-2 text-xs text-gray-400 text-right">
            {observaciones.value.length} caracteres
          </div>
        )}
      </div>
    </FichaSection>
  );
}
