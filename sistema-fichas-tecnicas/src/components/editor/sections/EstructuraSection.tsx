/**
 * EstructuraSection - Sección de estructura del pozo
 * Requirements: 3.1, 3.2, 5.1-5.4
 * 
 * Muestra y permite editar los datos estructurales (23 campos):
 * - Sistema (🟢 Opcional)
 * - Año de instalación (🟢 Opcional)
 * - Tipo de cámara (🟢 Opcional)
 * - Estructura de pavimento (🟢 Opcional)
 * - Tapa (material, estado, existencia) (🟠 Importante)
 * - Cono (tipo, material, estado, existencia) (🟢 Opcional)
 * - Cuerpo (diámetro, material, estado, existencia) (🟠 Importante)
 * - Canuela (material, estado, existencia) (🟢 Opcional)
 * - Peldaños (cantidad, material, estado, existencia) (🟢 Opcional)
 * 
 * Utiliza TextEditor para edición inline con trazabilidad completa.
 */

'use client';

import { FichaSection } from './FichaSection';
import { TextEditor } from '../TextEditor';
import { FieldIndicator } from '../FieldIndicator';
import type { FieldValue } from '@/types/ficha';

interface EstructuraData {
  // 🟢 Opcional
  sistema: FieldValue;
  anoInstalacion: FieldValue;
  tipoCamara: FieldValue;
  estructuraPavimento: FieldValue;
  
  // 🟠 Importante
  existeTapa: FieldValue;
  estadoTapa: FieldValue;
  materialTapa: FieldValue;
  
  // 🟢 Opcional
  existeCono: FieldValue;
  tipoCono: FieldValue;
  materialCono: FieldValue;
  estadoCono: FieldValue;
  
  // 🟠 Importante
  existeCilindro: FieldValue;
  diametroCilindro: FieldValue;
  materialCilindro: FieldValue;
  estadoCilindro: FieldValue;
  
  // 🟢 Opcional
  existeCanuela: FieldValue;
  materialCanuela: FieldValue;
  estadoCanuela: FieldValue;
  
  // 🟢 Opcional
  existePeldanos: FieldValue;
  numeroPeldanos: FieldValue;
  materialPeldanos: FieldValue;
  estadoPeldanos: FieldValue;
}

interface EstructuraSectionProps {
  /** ID de la sección */
  id: string;
  /** Datos de estructura */
  data: EstructuraData;
  /** Si la sección está bloqueada */
  locked?: boolean;
  /** Si la sección está visible */
  visible?: boolean;
  /** Callback para actualizar un campo */
  onFieldChange?: (field: keyof EstructuraData, value: string) => void;
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
  important = false,
}: {
  label: string;
  fieldValue: FieldValue;
  unit: string;
  editable: boolean;
  onCommit: (value: string) => void;
  important?: boolean;
}) {
  return (
    <div className="group">
      <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
        {label}
        <FieldIndicator important={important} />
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

/**
 * Campo booleano (Sí/No)
 */
function BooleanField({
  label,
  fieldValue,
  editable,
  onCommit,
  important = false,
}: {
  label: string;
  fieldValue: FieldValue;
  editable: boolean;
  onCommit: (value: string) => void;
  important?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
        {label}
        <FieldIndicator important={important} />
      </label>
      <TextEditor
        fieldValue={fieldValue}
        editable={editable}
        onCommit={onCommit}
        placeholder="Sí/No"
        showSource={true}
      />
    </div>
  );
}

export function EstructuraSection({
  id,
  data,
  locked = false,
  visible = true,
  onFieldChange,
  onToggleVisibility,
  dragHandleProps,
  isDragging,
}: EstructuraSectionProps) {
  const handleFieldCommit = (field: keyof EstructuraData) => (value: string) => {
    onFieldChange?.(field, value);
  };

  const icon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );

  return (
    <FichaSection
      id={id}
      type="estructura"
      title="Estructura del Pozo"
      icon={icon}
      locked={locked}
      visible={visible}
      isDragging={isDragging}
      draggable={!locked}
      onToggleVisibility={onToggleVisibility}
      dragHandleProps={dragHandleProps}
    >
      <div className="space-y-6">
        {/* Información general */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
            Información General
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <TextEditor
              label="Sistema"
              fieldValue={data.sistema}
              editable={!locked}
              onCommit={handleFieldCommit('sistema')}
              placeholder="Sin datos"
              showSource={true}
            />
            <TextEditor
              label="Año de Instalación"
              fieldValue={data.anoInstalacion}
              editable={!locked}
              onCommit={handleFieldCommit('anoInstalacion')}
              placeholder="YYYY"
              showSource={true}
            />
            <TextEditor
              label="Tipo de Cámara"
              fieldValue={data.tipoCamara}
              editable={!locked}
              onCommit={handleFieldCommit('tipoCamara')}
              placeholder="Circular/Rectangular/Cuadrada"
              showSource={true}
            />
            <TextEditor
              label="Estructura de Pavimento"
              fieldValue={data.estructuraPavimento}
              editable={!locked}
              onCommit={handleFieldCommit('estructuraPavimento')}
              placeholder="Sin datos"
              showSource={true}
            />
          </div>
        </div>

        {/* Tapa */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
            Tapa
            <FieldIndicator important={true} />
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <BooleanField
              label="¿Existe Tapa?"
              fieldValue={data.existeTapa}
              editable={!locked}
              onCommit={handleFieldCommit('existeTapa')}
              important={true}
            />
            <TextEditor
              label="Material"
              fieldValue={data.materialTapa}
              editable={!locked}
              onCommit={handleFieldCommit('materialTapa')}
              placeholder="Sin datos"
              showSource={true}
            />
            <TextEditor
              label="Estado"
              fieldValue={data.estadoTapa}
              editable={!locked}
              onCommit={handleFieldCommit('estadoTapa')}
              placeholder="Bueno/Regular/Malo"
              showSource={true}
            />
          </div>
        </div>

        {/* Cono */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
            Cono
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <BooleanField
              label="¿Existe Cono?"
              fieldValue={data.existeCono}
              editable={!locked}
              onCommit={handleFieldCommit('existeCono')}
            />
            <TextEditor
              label="Tipo"
              fieldValue={data.tipoCono}
              editable={!locked}
              onCommit={handleFieldCommit('tipoCono')}
              placeholder="Sin datos"
              showSource={true}
            />
            <TextEditor
              label="Material"
              fieldValue={data.materialCono}
              editable={!locked}
              onCommit={handleFieldCommit('materialCono')}
              placeholder="Sin datos"
              showSource={true}
            />
            <TextEditor
              label="Estado"
              fieldValue={data.estadoCono}
              editable={!locked}
              onCommit={handleFieldCommit('estadoCono')}
              placeholder="Bueno/Regular/Malo"
              showSource={true}
            />
          </div>
        </div>

        {/* Cilindro (Cuerpo) */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
            Cilindro (Cuerpo)
            <FieldIndicator important={true} />
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <BooleanField
              label="¿Existe Cilindro?"
              fieldValue={data.existeCilindro}
              editable={!locked}
              onCommit={handleFieldCommit('existeCilindro')}
              important={true}
            />
            <FieldWithUnit
              label="Diámetro"
              fieldValue={data.diametroCilindro}
              unit="m"
              editable={!locked}
              onCommit={handleFieldCommit('diametroCilindro')}
              important={true}
            />
            <TextEditor
              label="Material"
              fieldValue={data.materialCilindro}
              editable={!locked}
              onCommit={handleFieldCommit('materialCilindro')}
              placeholder="Concreto/Hierro/Ladrillo"
              showSource={true}
            />
            <TextEditor
              label="Estado"
              fieldValue={data.estadoCilindro}
              editable={!locked}
              onCommit={handleFieldCommit('estadoCilindro')}
              placeholder="Bueno/Regular/Malo"
              showSource={true}
            />
          </div>
        </div>

        {/* Canuela */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
            Cañuela
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <BooleanField
              label="¿Existe Cañuela?"
              fieldValue={data.existeCanuela}
              editable={!locked}
              onCommit={handleFieldCommit('existeCanuela')}
            />
            <TextEditor
              label="Material"
              fieldValue={data.materialCanuela}
              editable={!locked}
              onCommit={handleFieldCommit('materialCanuela')}
              placeholder="Sin datos"
              showSource={true}
            />
            <TextEditor
              label="Estado"
              fieldValue={data.estadoCanuela}
              editable={!locked}
              onCommit={handleFieldCommit('estadoCanuela')}
              placeholder="Bueno/Regular/Malo"
              showSource={true}
            />
          </div>
        </div>

        {/* Peldaños */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
            Peldaños
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <BooleanField
              label="¿Existen Peldaños?"
              fieldValue={data.existePeldanos}
              editable={!locked}
              onCommit={handleFieldCommit('existePeldanos')}
            />
            <TextEditor
              label="Cantidad"
              fieldValue={data.numeroPeldanos}
              editable={!locked}
              onCommit={handleFieldCommit('numeroPeldanos')}
              placeholder="Número"
              showSource={true}
            />
            <TextEditor
              label="Material"
              fieldValue={data.materialPeldanos}
              editable={!locked}
              onCommit={handleFieldCommit('materialPeldanos')}
              placeholder="Sin datos"
              showSource={true}
            />
            <TextEditor
              label="Estado"
              fieldValue={data.estadoPeldanos}
              editable={!locked}
              onCommit={handleFieldCommit('estadoPeldanos')}
              placeholder="Bueno/Regular/Malo"
              showSource={true}
            />
          </div>
        </div>
      </div>
    </FichaSection>
  );
}
