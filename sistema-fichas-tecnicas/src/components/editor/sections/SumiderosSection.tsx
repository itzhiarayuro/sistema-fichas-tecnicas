/**
 * SumiderosSection - Sección de sumideros del pozo
 * Requirements: 3.1, 3.2, 5.1-5.4
 * 
 * Muestra y permite editar los datos de sumideros:
 * - Tipo de sumidero (Rejilla/Buzón/Combinado/Lateral)
 * - Número en esquema
 * - Diámetro
 * - Material de tubería
 * - Altura de salida y llegada
 * 
 * Utiliza TextEditor para edición inline con trazabilidad.
 */

'use client';

import { FichaSection } from './FichaSection';
import { TextEditor } from '../TextEditor';
import type { FieldValue } from '@/types/ficha';

import type { SumideroInfo } from '@/types/pozo';

interface SumideroUIProps extends SumideroInfo {
  id: string;
}

interface SumiderosSectionProps {
  /** ID de la sección */
  id: string;
  /** Datos de sumideros */
  sumideros: SumideroUIProps[];
  /** Si la sección está bloqueada */
  locked?: boolean;
  /** Si la sección está visible */
  visible?: boolean;
  /** Callback para actualizar un campo de sumidero */
  onSumideroFieldChange?: (
    sumideroId: string,
    field: keyof SumideroInfo,
    value: string
  ) => void;
  /** Callback para agregar sumidero */
  onAddSumidero?: () => void;
  /** Callback para eliminar sumidero */
  onRemoveSumidero?: (sumideroId: string) => void;
  /** Callback para toggle de visibilidad */
  onToggleVisibility?: () => void;
  /** Props para drag handle */
  dragHandleProps?: Record<string, unknown>;
  /** Si está siendo arrastrada */
  isDragging?: boolean;
}

/**
 * Campo con unidad de medida para sumideros
 */
function SumideroFieldWithUnit({
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

function SumideroCard({
  sumidero,
  index,
  locked,
  onFieldChange,
  onRemove,
}: {
  sumidero: SumideroUIProps;
  index: number;
  locked: boolean;
  onFieldChange?: (field: keyof SumideroInfo, value: string) => void;
  onRemove?: () => void;
}) {
  const handleFieldCommit = (field: keyof SumideroInfo) => (value: string) => {
    onFieldChange?.(field, value);
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">
          Sumidero {index + 1}
        </span>
        {!locked && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Eliminar sumidero"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">ID Sumidero</label>
          <TextEditor
            fieldValue={sumidero.idSumidero}
            editable={!locked}
            onCommit={handleFieldCommit('idSumidero')}
            placeholder="-"
            size="sm"
            showSource={false}
            showTraceability={true}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo</label>
          <TextEditor
            fieldValue={sumidero.tipoSumidero}
            editable={!locked}
            onCommit={handleFieldCommit('tipoSumidero')}
            placeholder="Rejilla/Buzón/Combinado"
            size="sm"
            showSource={false}
            showTraceability={true}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Número en Esquema</label>
          <TextEditor
            fieldValue={sumidero.numeroEsquema}
            editable={!locked}
            onCommit={handleFieldCommit('numeroEsquema')}
            placeholder="-"
            size="sm"
            showSource={false}
            showTraceability={true}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Diámetro</label>
          <SumideroFieldWithUnit
            fieldValue={sumidero.diametro}
            unit="mm"
            editable={!locked}
            onCommit={handleFieldCommit('diametro')}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Material de Tubería</label>
          <TextEditor
            fieldValue={sumidero.materialTuberia}
            editable={!locked}
            onCommit={handleFieldCommit('materialTuberia')}
            placeholder="-"
            size="sm"
            showSource={false}
            showTraceability={true}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Altura de Salida</label>
          <SumideroFieldWithUnit
            fieldValue={sumidero.alturaSalida}
            unit="m"
            editable={!locked}
            onCommit={handleFieldCommit('alturaSalida')}
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Altura de Llegada</label>
          <SumideroFieldWithUnit
            fieldValue={sumidero.alturaLlegada}
            unit="m"
            editable={!locked}
            onCommit={handleFieldCommit('alturaLlegada')}
          />
        </div>
      </div>
    </div>
  );
}

export function SumiderosSection({
  id,
  sumideros,
  locked = false,
  visible = true,
  onSumideroFieldChange,
  onAddSumidero,
  onRemoveSumidero,
  onToggleVisibility,
  dragHandleProps,
  isDragging,
}: SumiderosSectionProps) {
  const icon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  );

  return (
    <FichaSection
      id={id}
      type="sumideros"
      title={`Sumideros (${sumideros.length})`}
      icon={icon}
      locked={locked}
      visible={visible}
      isDragging={isDragging}
      draggable={!locked}
      onToggleVisibility={onToggleVisibility}
      dragHandleProps={dragHandleProps}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {sumideros.length === 0
              ? 'No hay sumideros registrados'
              : `${sumideros.length} sumidero${sumideros.length !== 1 ? 's' : ''} registrado${sumideros.length !== 1 ? 's' : ''}`}
          </p>
          {!locked && onAddSumidero && (
            <button
              onClick={onAddSumidero}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary-600 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar Sumidero
            </button>
          )}
        </div>

        {sumideros.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {sumideros.map((sumidero, index) => (
              <SumideroCard
                key={sumidero.id}
                sumidero={sumidero}
                index={index}
                locked={locked}
                onFieldChange={(field, value) =>
                  onSumideroFieldChange?.(sumidero.id, field, value)
                }
                onRemove={() => onRemoveSumidero?.(sumidero.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            No hay sumideros registrados
          </div>
        )}
      </div>
    </FichaSection>
  );
}
