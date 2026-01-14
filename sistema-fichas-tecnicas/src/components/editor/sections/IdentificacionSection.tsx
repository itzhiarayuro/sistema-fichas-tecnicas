/**
 * IdentificacionSection - Sección de identificación del pozo
 * Requirements: 3.1, 3.2, 5.1-5.4
 * 
 * Muestra y permite editar los datos de identificación:
 * - ID del pozo (🔴 Obligatorio)
 * - Coordenadas X, Y (🔴 Obligatorio)
 * - Fecha de inspección (🔴 Obligatorio)
 * - Inspector (🔴 Obligatorio)
 * - Estado general (🔴 Obligatorio)
 * - Dirección (🟠 Importante)
 * - Barrio (🟠 Importante)
 * - Elevación (🟠 Importante)
 * - Profundidad (🟠 Importante)
 * 
 * Utiliza TextEditor para edición inline con trazabilidad completa.
 */

'use client';

import { FichaSection } from './FichaSection';
import { TextEditor } from '../TextEditor';
import { FieldIndicator } from '../FieldIndicator';
import type { FieldValue } from '@/types/ficha';

interface IdentificacionData {
  // 🔴 Obligatorio
  idPozo: FieldValue;
  coordenadaX: FieldValue;
  coordenadaY: FieldValue;
  fecha: FieldValue;
  levanto: FieldValue;
  estado: FieldValue;
  
  // 🟠 Importante
  direccion: FieldValue;
  barrio: FieldValue;
  elevacion: FieldValue;
  profundidad: FieldValue;
}

interface IdentificacionSectionProps {
  /** ID de la sección */
  id: string;
  /** Datos de identificación */
  data: IdentificacionData;
  /** Si la sección está bloqueada */
  locked?: boolean;
  /** Si la sección está visible */
  visible?: boolean;
  /** Callback para actualizar un campo */
  onFieldChange?: (field: keyof IdentificacionData, value: string) => void;
  /** Callback para toggle de visibilidad */
  onToggleVisibility?: () => void;
  /** Props para drag handle */
  dragHandleProps?: Record<string, unknown>;
  /** Si está siendo arrastrada */
  isDragging?: boolean;
}

/**
 * Campo con unidad de medida
 */
function FieldWithUnit({
  label,
  fieldValue,
  unit,
  editable,
  onCommit,
  required = false,
  important = false,
}: {
  label: string;
  fieldValue: FieldValue;
  unit: string;
  editable: boolean;
  onCommit: (value: string) => void;
  required?: boolean;
  important?: boolean;
}) {
  return (
    <div className="group">
      <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
        {label}
        <FieldIndicator required={required} important={important} />
      </label>
      <div className="flex">
        <div className="flex-1">
          <TextEditor
            fieldValue={fieldValue}
            editable={editable}
            onCommit={onCommit}
            placeholder="Sin datos"
            showSource={true}
            className="[&>div]:rounded-r-none"
          />
        </div>
        <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-200 rounded-r-md text-sm text-gray-500 flex items-center">
          {unit}
        </span>
      </div>
    </div>
  );
}

export function IdentificacionSection({
  id,
  data,
  locked = true, // Identificación es obligatoria por defecto
  visible = true,
  onFieldChange,
  onToggleVisibility,
  dragHandleProps,
  isDragging,
}: IdentificacionSectionProps) {
  const handleFieldCommit = (field: keyof IdentificacionData) => (value: string) => {
    onFieldChange?.(field, value);
  };

  const icon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
    </svg>
  );

  return (
    <FichaSection
      id={id}
      type="identificacion"
      title="Identificación del Pozo"
      icon={icon}
      locked={locked}
      visible={visible}
      isDragging={isDragging}
      draggable={!locked}
      onToggleVisibility={onToggleVisibility}
      dragHandleProps={dragHandleProps}
    >
      <div className="space-y-6">
        {/* Campos obligatorios */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            Información Obligatoria
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                ID del Pozo
                <FieldIndicator required={true} />
              </label>
              <TextEditor
                fieldValue={data.idPozo}
                editable={!locked}
                onCommit={handleFieldCommit('idPozo')}
                placeholder="Ej: PZ1666"
                showSource={true}
              />
            </div>
            
            <FieldWithUnit
              label="Coordenada X (Longitud)"
              fieldValue={data.coordenadaX}
              unit="°"
              editable={!locked}
              onCommit={handleFieldCommit('coordenadaX')}
              required={true}
            />
            
            <FieldWithUnit
              label="Coordenada Y (Latitud)"
              fieldValue={data.coordenadaY}
              unit="°"
              editable={!locked}
              onCommit={handleFieldCommit('coordenadaY')}
              required={true}
            />
            
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                Fecha de Inspección
                <FieldIndicator required={true} />
              </label>
              <TextEditor
                fieldValue={data.fecha}
                editable={!locked}
                onCommit={handleFieldCommit('fecha')}
                placeholder="YYYY-MM-DD"
                showSource={true}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                Inspector
                <FieldIndicator required={true} />
              </label>
              <TextEditor
                fieldValue={data.levanto}
                editable={!locked}
                onCommit={handleFieldCommit('levanto')}
                placeholder="Nombre del inspector"
                showSource={true}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                Estado General
                <FieldIndicator required={true} />
              </label>
              <TextEditor
                fieldValue={data.estado}
                editable={!locked}
                onCommit={handleFieldCommit('estado')}
                placeholder="Bueno/Regular/Malo/Muy Malo"
                showSource={true}
              />
            </div>
          </div>
        </div>

        {/* Campos importantes */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
            Ubicación y Profundidad
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                Dirección
                <FieldIndicator important={true} />
              </label>
              <TextEditor
                fieldValue={data.direccion}
                editable={!locked}
                onCommit={handleFieldCommit('direccion')}
                placeholder="Dirección física"
                showSource={true}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                Barrio
                <FieldIndicator important={true} />
              </label>
              <TextEditor
                fieldValue={data.barrio}
                editable={!locked}
                onCommit={handleFieldCommit('barrio')}
                placeholder="Barrio o sector"
                showSource={true}
              />
            </div>
            
            <FieldWithUnit
              label="Elevación"
              fieldValue={data.elevacion}
              unit="m"
              editable={!locked}
              onCommit={handleFieldCommit('elevacion')}
              important={true}
            />
            
            <FieldWithUnit
              label="Profundidad"
              fieldValue={data.profundidad}
              unit="m"
              editable={!locked}
              onCommit={handleFieldCommit('profundidad')}
              important={true}
            />
          </div>
        </div>
      </div>
    </FichaSection>
  );
}
