/**
 * TuberiasSection - Sección de tuberías del pozo
 * Requirements: 3.1, 3.2, 5.1-5.4
 * 
 * Muestra y permite editar los datos de tuberías:
 * - Entradas (diámetro, material, cota, dirección)
 * - Salidas (diámetro, material, cota, dirección)
 * 
 * Utiliza TextEditor para edición inline con trazabilidad.
 */

'use client';

import { FichaSection } from './FichaSection';
import { TextEditor } from '../TextEditor';
import type { FieldValue } from '@/types/ficha';

import type { TuberiaInfo } from '@/types/pozo';

// Mapping local interface to match expected props structure if needed, or just use TuberiaInfo
// Since TuberiaInfo uses FieldValue for all fields, we can use it directly but need to handle 'id' property vs 'idTuberia'
// The component expects 'id'string for keys.
// We'll define a prop type that extends TuberiaInfo but ensures id is accessible.

interface TuberiaUIProps extends TuberiaInfo {
  id: string; // Helper for React key
}

interface TuberiasSectionProps {
  /** ID de la sección */
  id: string;
  /** Datos de tuberías de entrada */
  entradas: TuberiaUIProps[];
  /** Datos de tuberías de salida */
  salidas: TuberiaUIProps[];
  /** Si la sección está bloqueada */
  locked?: boolean;
  /** Si la sección está visible */
  visible?: boolean;
  /** Callback para actualizar un campo de tubería */
  onTuberiaFieldChange?: (
    tipo: 'entrada' | 'salida',
    tuberiaId: string,
    field: keyof TuberiaInfo,
    value: string
  ) => void;
  /** Callback para agregar tubería */
  onAddTuberia?: (tipo: 'entrada' | 'salida') => void;
  /** Callback para eliminar tubería */
  onRemoveTuberia?: (tipo: 'entrada' | 'salida', tuberiaId: string) => void;
  /** Callback para toggle de visibilidad */
  onToggleVisibility?: () => void;
  /** Props para drag handle */
  dragHandleProps?: Record<string, unknown>;
  /** Si está siendo arrastrada */
  isDragging?: boolean;
}

/**
 * Campo con unidad de medida para tuberías
 */
function TuberiaFieldWithUnit({
  fieldValue,
  unit,
  editable,
  onCommit,
}: {
  fieldValue: FieldValue;
  unit: string;
  editable: boolean;
  onCommit: (value: string) => void;
}) {
  return (
    <div className="flex">
      <div className="flex-1">
        <TextEditor
          fieldValue={fieldValue}
          editable={editable}
          onCommit={onCommit}
          placeholder="-"
          size="sm"
          showSource={false}
          showTraceability={true}
          className="[&>div]:rounded-r-none"
        />
      </div>
      <span className="px-2 py-1.5 bg-gray-100 border border-l-0 border-gray-200 rounded-r-md text-xs text-gray-500 flex items-center">
        {unit}
      </span>
    </div>
  );
}

function TuberiaCard({
  tuberia,
  tipo,
  index,
  locked,
  onFieldChange,
  onRemove,
}: {
  tuberia: TuberiaUIProps;
  tipo: 'entrada' | 'salida';
  index: number;
  locked: boolean;
  onFieldChange?: (field: keyof TuberiaInfo, value: string) => void;
  onRemove?: () => void;
}) {
  const handleFieldCommit = (field: keyof TuberiaInfo) => (value: string) => {
    onFieldChange?.(field, value);
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">
          {tipo === 'entrada' ? 'Entrada' : 'Salida'} {index + 1}
        </span>
        {!locked && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Eliminar tubería"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Diámetro</label>
          <TuberiaFieldWithUnit
            fieldValue={tuberia.diametro}
            unit="mm"
            editable={!locked}
            onCommit={handleFieldCommit('diametro')}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Material</label>
          <TextEditor
            fieldValue={tuberia.material}
            editable={!locked}
            onCommit={handleFieldCommit('material')}
            placeholder="-"
            size="sm"
            showSource={false}
            showTraceability={true}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Cota</label>
          <TuberiaFieldWithUnit
            fieldValue={tuberia.cota}
            unit="m"
            editable={!locked}
            onCommit={handleFieldCommit('cota')}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Estado</label>
          <TextEditor
            fieldValue={tuberia.estado}
            editable={!locked}
            onCommit={handleFieldCommit('estado')}
            placeholder="-"
            size="sm"
            showSource={false}
            showTraceability={true}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Emboq.</label>
          <TextEditor
            fieldValue={tuberia.emboquillado}
            editable={!locked}
            onCommit={handleFieldCommit('emboquillado')}
            placeholder="-"
            size="sm"
            showSource={false}
            showTraceability={true}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Longitud</label>
          <TuberiaFieldWithUnit
            fieldValue={tuberia.longitud}
            unit="m"
            editable={!locked}
            onCommit={handleFieldCommit('longitud')}
          />
        </div>
      </div>
    </div>
  );
}

export function TuberiasSection({
  id,
  entradas,
  salidas,
  locked = false,
  visible = true,
  onTuberiaFieldChange,
  onAddTuberia,
  onRemoveTuberia,
  onToggleVisibility,
  dragHandleProps,
  isDragging,
}: TuberiasSectionProps) {
  const icon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );

  return (
    <FichaSection
      id={id}
      type="tuberias"
      title="Tuberías"
      icon={icon}
      locked={locked}
      visible={visible}
      isDragging={isDragging}
      draggable={!locked}
      onToggleVisibility={onToggleVisibility}
      dragHandleProps={dragHandleProps}
    >
      <div className="space-y-6">
        {/* Entradas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-environmental" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              Entradas ({entradas.length})
            </h4>
            {!locked && onAddTuberia && (
              <button
                onClick={() => onAddTuberia('entrada')}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary-600 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar
              </button>
            )}
          </div>

          {entradas.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {entradas.map((tuberia, index) => (
                <TuberiaCard
                  key={tuberia.id}
                  tuberia={tuberia}
                  tipo="entrada"
                  index={index}
                  locked={locked}
                  onFieldChange={(field, value) =>
                    onTuberiaFieldChange?.('entrada', tuberia.id, field, value)
                  }
                  onRemove={() => onRemoveTuberia?.('entrada', tuberia.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
              No hay tuberías de entrada registradas
            </div>
          )}
        </div>

        {/* Salidas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              Salidas ({salidas.length})
            </h4>
            {!locked && onAddTuberia && (
              <button
                onClick={() => onAddTuberia('salida')}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary-600 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar
              </button>
            )}
          </div>

          {salidas.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {salidas.map((tuberia, index) => (
                <TuberiaCard
                  key={tuberia.id}
                  tuberia={tuberia}
                  tipo="salida"
                  index={index}
                  locked={locked}
                  onFieldChange={(field, value) =>
                    onTuberiaFieldChange?.('salida', tuberia.id, field, value)
                  }
                  onRemove={() => onRemoveTuberia?.('salida', tuberia.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
              No hay tuberías de salida registradas
            </div>
          )}
        </div>
      </div>
    </FichaSection>
  );
}
