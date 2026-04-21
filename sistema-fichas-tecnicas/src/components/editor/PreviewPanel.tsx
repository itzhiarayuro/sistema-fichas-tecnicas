/**
 * PreviewPanel - Panel de vista previa en tiempo real
 * Requirements: 4.1
 * 
 * Renderiza la ficha técnica en formato de vista previa,
 * sincronizada en tiempo real con el editor.
 * 
 * Características:
 * - Renderizado en tiempo real de cambios
 * - Formato similar al PDF final
 * - Soporte para personalización de estilos
 * - Indicadores de campos editados
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import type { FichaState, FichaSection, FieldValue, FichaCustomization } from '@/types/ficha';
import type { Pozo, FotoInfo } from '@/types/pozo';
import { useGlobalStore, useDesignStore, useUIStore } from '@/stores';
import { useFieldsStore } from '@/stores/fieldsStore';
import { DesignRenderer } from '@/components/designer';
import { blobStore } from '@/lib/storage/blobStore';

interface PreviewPanelProps {
  /** Estado de la ficha (sincronizado) */
  fichaState?: FichaState | null;
  /** Datos del pozo (fallback si no hay fichaState) */
  pozo: Pozo;
  /** Personalizaciones de formato */
  customizations?: FichaCustomization;
  /** Mostrar indicadores de campos editados */
  showEditIndicators?: boolean;
  /** Escala de zoom (1 = 100%) */
  zoom?: number;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Obtiene el valor de un campo desde el estado de la ficha o el pozo
 */
function getFieldValue(
  fichaState: FichaState | null | undefined,
  sectionType: string,
  field: string,
  fallback: string
): { value: string; source: FieldValue['source']; isEdited: boolean } {
  if (!fichaState) {
    return { value: fallback, source: 'excel', isEdited: false };
  }

  const section = fichaState.sections.find((s) => s.type === sectionType);
  if (!section || !section.content[field]) {
    return { value: fallback, source: 'default', isEdited: false };
  }

  const fieldValue = section.content[field];
  return {
    value: fieldValue.value || fallback,
    source: fieldValue.source,
    isEdited: fieldValue.source === 'manual',
  };
}

/**
 * Componente para mostrar un campo con indicador de edición
 */
function FieldDisplay({
  label,
  value,
  isEdited,
  showIndicator,
  suffix,
}: {
  label: string;
  value: string;
  isEdited: boolean;
  showIndicator: boolean;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <span className="text-gray-500">{label}:</span>
      <span className={`ml-2 font-medium ${isEdited && showIndicator ? 'text-amber-700' : ''}`}>
        {value || <span className="text-gray-400 italic">Sin datos</span>}
        {suffix && value && ` ${suffix}`}
      </span>
      {isEdited && showIndicator && (
        <span className="ml-1 inline-block w-1.5 h-1.5 bg-amber-500 rounded-full" title="Campo editado" />
      )}
    </div>
  );
}

/**
 * Componente para cargar fotos de forma lazy (soporta blobs eviccionados de RAM)
 */
function LazyPhoto({ foto }: { foto: FotoInfo }) {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!foto.blobId) return;

    // Intentar URL síncrona primero
    const syncUrl = blobStore.getUrl(foto.blobId);
    if (syncUrl) {
      setUrl(syncUrl);
      return;
    }

    // Cargar desde IDB
    setLoading(true);
    blobStore.ensureLoaded(foto.blobId)
      .then(loadedUrl => setUrl(loadedUrl))
      .catch(() => setUrl(''))
      .finally(() => setLoading(false));
  }, [foto.blobId]);

  const dataUrl = (foto as any).dataUrl;
  const alt = foto.descripcion || (foto as any).descripcion?.value || foto.filename;

  return (
    <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden relative group">
      {url ? (
        <img src={url} alt={alt} className="w-full h-full object-cover" />
      ) : dataUrl ? (
        <img src={dataUrl} alt={alt} className="w-full h-full object-cover" />
      ) : loading ? (
        <div className="w-full h-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      {/* Overlay con descripción */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-xs truncate">{alt}</p>
      </div>
    </div>
  );
}

// Pozo de ejemplo "Mock" para previsualización sin datos
const MOCK_POZO: Partial<Pozo> = {
  id: 'mock-001',
  identificacion: {
    idPozo: { value: 'PZ-MOCK-001', source: 'manual' },
    coordenadaX: { value: '-74.000', source: 'manual' },
    coordenadaY: { value: '4.600', source: 'manual' },
    latitud: { value: '4.600', source: 'manual' },
    longitud: { value: '-74.000', source: 'manual' },
    fecha: { value: '2024-01-15', source: 'manual' },
    levanto: { value: 'Inspector Mock', source: 'manual' },
    estado: { value: 'Bueno', source: 'manual' },
    municipio: { value: 'Municipio Mock', source: 'manual' },
    enlace: { value: '', source: 'manual' }
  },
  ubicacion: {
    direccion: { value: 'Calle 10 # 5-20', source: 'manual' },
    barrio: { value: 'Centro Histórico', source: 'manual' },
    municipio: { value: 'Municio Mock', source: 'manual' },
    elevacion: { value: '1500.2', source: 'manual' },
    profundidad: { value: '2.5', source: 'manual' }
  },
  componentes: {
    existeTapa: { value: 'Sí', source: 'manual' },
    estadoTapa: { value: 'Bueno', source: 'manual' },
    existeCilindro: { value: 'Sí', source: 'manual' },
    diametroCilindro: { value: '1.20', source: 'manual' },
    sistema: { value: 'Sanitario', source: 'manual' },
    anoInstalacion: { value: '2020', source: 'manual' },
    tipoCamara: { value: 'Circular', source: 'manual' },
    estructuraPavimento: { value: 'Asfalto', source: 'manual' },
    materialRasante: { value: 'Concreto', source: 'manual' },
    estadoRasante: { value: 'Bueno', source: 'manual' },
    materialTapa: { value: 'Concreto', source: 'manual' },
    existeCono: { value: 'Sí', source: 'manual' },
    tipoCono: { value: 'Concéntrico', source: 'manual' },
    materialCono: { value: 'Ladrillo', source: 'manual' },
    estadoCono: { value: 'Bueno', source: 'manual' },
    materialCilindro: { value: 'Ladrillo', source: 'manual' },
    estadoCilindro: { value: 'Bueno', source: 'manual' },
    existeCanuela: { value: 'Sí', source: 'manual' },
    materialCanuela: { value: 'Concreto', source: 'manual' },
    estadoCanuela: { value: 'Bueno', source: 'manual' },
    existePeldanos: { value: 'Sí', source: 'manual' },
    materialPeldanos: { value: 'Hierro', source: 'manual' },
    numeroPeldanos: { value: '5', source: 'manual' },
    estadoPeldanos: { value: 'Bueno', source: 'manual' }
  },
  tuberias: {
    tuberias: [
      {
        idPozo: { value: 'PZ-MOCK-001', source: 'manual' },
        idTuberia: { value: 'TB-1', source: 'manual' },
        tipoTuberia: { value: 'Entrada', source: 'manual' },
        diametro: { value: '8', source: 'manual' },
        material: { value: 'PVC', source: 'manual' },
        cota: { value: '1498.0', source: 'manual' },
        estado: { value: 'Bueno', source: 'manual' },
        emboquillado: { value: 'Bien', source: 'manual' },
        longitud: { value: '45.0', source: 'manual' },
        orden: { value: '1', source: 'manual' },
        batea: { value: '0.5', source: 'manual' }
      },
      {
        idPozo: { value: 'PZ-MOCK-001', source: 'manual' },
        idTuberia: { value: 'TB-2', source: 'manual' },
        tipoTuberia: { value: 'Salida', source: 'manual' },
        diametro: { value: '10', source: 'manual' },
        material: { value: 'Concreto', source: 'manual' },
        cota: { value: '1497.8', source: 'manual' },
        estado: { value: 'Regular', source: 'manual' },
        emboquillado: { value: 'Regular', source: 'manual' },
        longitud: { value: '12.5', source: 'manual' },
        orden: { value: '1', source: 'manual' },
        batea: { value: '0.4', source: 'manual' }
      }
    ]
  },
  observaciones: {
    observaciones: { value: 'Pozo en buen estado general. Se recomienda limpieza preventiva.', source: 'manual' }
  },
  fotos: {
    fotos: []
  }
};

export function PreviewPanel({
  fichaState,
  pozo: propsPozo,
  customizations,
  showEditIndicators = true,
  zoom = 1,
  className = '',
}: PreviewPanelProps) {
  const { getVersionById, getCurrentVersion } = useDesignStore();
  const degradedMode = useUIStore(s => s.degradedMode);
  const [useCustomDesign, setUseCustomDesign] = useState(!!fichaState?.customizations?.designId);

  // Usar pozo real o fallback a MOCK_POZO
  const pozo = (propsPozo || MOCK_POZO) as Pozo;

  // Determinar el diseño activo
  const activeDesign = useMemo(() => {
    if (!useCustomDesign) return null;

    // 1. Prioridad: Diseño específico guardado en la ficha
    if (fichaState?.customizations?.designId) {
      return getVersionById(fichaState.customizations.designId);
    }

    // 2. Fallback: Diseño marcado como actual en el Diseñador
    return getCurrentVersion();
  }, [useCustomDesign, fichaState?.customizations?.designId, getVersionById, getCurrentVersion]);

  // Sincronizar modo visual si cambia el diseño en la ficha
  useEffect(() => {
    if (fichaState?.customizations?.designId) {
      setUseCustomDesign(true);
    }
  }, [fichaState?.customizations?.designId]);

  // Estilos personalizados para el modo estándar
  const styles = useMemo(() => {
    // Prioridad: 1. Props personalizadas, 2. Estado de la ficha, 3. Valores por defecto
    const custom = customizations || fichaState?.customizations;

    const colors = custom?.colors ?? {
      headerBg: '#1F4E79',
      headerText: '#FFFFFF',
      sectionBg: '#FFFFFF',
      sectionText: '#333333',
      labelText: '#666666',
      valueText: '#000000',
      borderColor: '#E5E7EB',
    };

    const fonts = custom?.fonts ?? {
      titleSize: 16,
      labelSize: 12,
      valueSize: 12,
      fontFamily: 'Arial',
    };

    const spacing = custom?.spacing ?? {
      sectionGap: 16,
      fieldGap: 8,
      padding: 16,
      margin: 24,
    };

    return { colors, fonts, spacing };
  }, [customizations, fichaState?.customizations]);

  // Obtener valores de campos con trazabilidad
  const identificacion = useMemo(() => ({
    codigo: getFieldValue(fichaState, 'identificacion', 'codigo', String(pozo.idPozo?.value || '')),
    direccion: getFieldValue(fichaState, 'identificacion', 'direccion', String(pozo.direccion?.value || '')),
    barrio: getFieldValue(fichaState, 'identificacion', 'barrio', String(pozo.barrio?.value || '')),
    municipio: getFieldValue(fichaState, 'identificacion', 'municipio', String(pozo.municipio?.value || '')),
    sistema: getFieldValue(fichaState, 'identificacion', 'sistema', String(pozo.sistema?.value || '')),
    estado: getFieldValue(fichaState, 'identificacion', 'estado', String(pozo.estado?.value || '')),
    fecha: getFieldValue(fichaState, 'identificacion', 'fecha', String(pozo.fecha?.value || '')),
  }), [fichaState, pozo]);

  const estructura = useMemo(() => ({
    alturaTotal: getFieldValue(fichaState, 'estructura', 'alturaTotal', String(pozo.profundidad?.value || '')),
    rasante: getFieldValue(fichaState, 'estructura', 'rasante', String(pozo.elevacion?.value || '')),
    tapaMaterial: getFieldValue(fichaState, 'estructura', 'tapaMaterial', String(pozo.materialTapa?.value || '')),
    tapaEstado: getFieldValue(fichaState, 'estructura', 'tapaEstado', String(pozo.estadoTapa?.value || '')),
    conoTipo: getFieldValue(fichaState, 'estructura', 'conoTipo', String(pozo.tipoCono?.value || '')),
    conoMaterial: getFieldValue(fichaState, 'estructura', 'conoMaterial', String(pozo.materialCono?.value || '')),
    cuerpoDiametro: getFieldValue(fichaState, 'estructura', 'cuerpoDiametro', String(pozo.diametroCilindro?.value || '')),
    canuelaMaterial: getFieldValue(fichaState, 'estructura', 'canuelaMaterial', String(pozo.materialCanuela?.value || '')),
    peldanosCantidad: getFieldValue(fichaState, 'estructura', 'peldanosCantidad', String(pozo.numeroPeldanos?.value || '')),
    peldanosMaterial: getFieldValue(fichaState, 'estructura', 'peldanosMaterial', String(pozo.materialPeldanos?.value || '')),
  }), [fichaState, pozo]);

  const observaciones = useMemo(() =>
    getFieldValue(fichaState, 'observaciones', 'texto', String(pozo.observacionesPozo?.value || '')),
    [fichaState, pozo]);

  // Obtener fotos (pueden venir del estado de la ficha o del pozo)
  const getPhotosByPozoId = useGlobalStore((state) => state.getPhotosByPozoId);
  const fotos = useMemo(() => {
    // Obtener fotos incrustadas + fotos globales asociadas por nomenclatura
    const fotosIncrustadas = (pozo?.fotos?.fotos || []) as FotoInfo[];
    const fotosGlobales = getPhotosByPozoId(pozo?.id || '');

    // Unificar eliminando duplicados por ID
    const fotosIds = new Set(fotosIncrustadas.map((f: FotoInfo) => f.id));
    const todosResultados = [...fotosIncrustadas];

    fotosGlobales.forEach((f: FotoInfo) => {
      if (!fotosIds.has(f.id)) {
        todosResultados.push(f);
        fotosIds.add(f.id);
      }
    });

    return {
      principal: todosResultados.filter((f: FotoInfo) => (f.categoria === 'PRINCIPAL' || ['general', 'tapa', 'principal'].includes(String(f.tipo || '').toLowerCase())) && !['entrada', 'salida', 'sumidero'].some(k => (f.categoria || '').includes(k.toUpperCase()) || String(f.tipo || '').toLowerCase().includes(k))),
      entradas: todosResultados.filter((f: FotoInfo) => f.categoria === 'ENTRADA' || String(f.tipo || '').toLowerCase().includes('entrada')),
      salidas: todosResultados.filter((f: FotoInfo) => f.categoria === 'SALIDA' || String(f.tipo || '').toLowerCase().includes('salida')),
      sumideros: todosResultados.filter((f: FotoInfo) => f.categoria === 'SUMIDERO' || String(f.tipo || '').toLowerCase().includes('sumidero')),
      otras: todosResultados.filter((f: FotoInfo) => f.categoria === 'OTRO' || (!f.categoria && !['general', 'tapa', 'principal', 'entrada', 'salida', 'sumidero'].some(k => String(f.tipo || '').toLowerCase().includes(k)))),
    };
  }, [pozo, getPhotosByPozoId]);

  // Todas las fotos para el grid
  const allPhotos = useMemo(() => [
    ...fotos.principal,
    ...fotos.entradas,
    ...fotos.salidas,
    ...fotos.sumideros,
    ...fotos.otras,
  ].slice(0, 6), [fotos]);

  const { getAllFields } = useFieldsStore();
  const allFields = getAllFields();

  return (
    <div className="space-y-4">
      {/* Selector de Modo de Vista Previa */}
      <div className="flex bg-gray-100 p-1 rounded-lg w-fit mx-auto shadow-sm border border-gray-200">
        <button
          onClick={() => setUseCustomDesign(false)}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${!useCustomDesign ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2zm0-5V7a2 2 0 012-2h2a2 2 0 012 2v5a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Diseño Estándar
        </button>
        <button
          onClick={() => setUseCustomDesign(true)}
          disabled={!activeDesign || degradedMode}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${useCustomDesign ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'} ${(!activeDesign || degradedMode) ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={degradedMode ? "No disponible en modo ahorro de recursos" : ""}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
          </svg>
          Diseño Visual {degradedMode ? "(DESACTIVADO)" : "(BETA)"}
        </button>
      </div>

      {degradedMode && (
        <div className="bg-amber-50 border border-amber-200 p-2 rounded text-amber-800 text-xs text-center font-medium">
          ⚠️ Modo Degradado: Vista previa simplificada para ahorrar memoria.
        </div>
      )}

      {useCustomDesign && activeDesign ? (
        <div
          className="bg-gray-200 p-8 rounded-xl overflow-auto flex justify-center border-2 border-dashed border-gray-300 min-h-[600px] shadow-inner"
          style={{ zoom }}
        >
          <div id="preview-print-container" className="bg-white shadow-lg mx-auto">
            <DesignRenderer design={activeDesign} pozo={pozo} availableFields={allFields} zoom={1} />
          </div>
        </div>
      ) : (
        <div
          className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            fontFamily: styles.fonts.fontFamily,
          }}
        >
          {/* Contenedor con padding */}
          <div style={{ padding: styles.spacing.margin }}>
            {/* Header de la ficha */}
            <div
              className="pb-4 mb-6"
              style={{ borderBottom: `2px solid ${styles.colors.headerBg}` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1
                    className="font-bold"
                    style={{
                      fontSize: styles.fonts.titleSize + 8,
                      color: styles.colors.headerBg,
                    }}
                  >
                    FICHA TÉCNICA DE POZO
                  </h1>
                  <p style={{ color: styles.colors.labelText }}>
                    Sistema de Alcantarillado
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="font-semibold"
                    style={{
                      fontSize: styles.fonts.titleSize,
                      color: styles.colors.sectionText,
                    }}
                  >
                    {identificacion.codigo.value}
                    {identificacion.codigo.isEdited && showEditIndicators && (
                      <span className="ml-1 inline-block w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    )}
                  </p>
                  <p style={{ fontSize: styles.fonts.labelSize, color: styles.colors.labelText }}>
                    {identificacion.fecha.value}
                  </p>
                </div>
              </div>
            </div>

            {/* Sección de identificación */}
            <div style={{ marginBottom: styles.spacing.sectionGap }}>
              <h2
                className="font-semibold pb-2 mb-3"
                style={{
                  fontSize: styles.fonts.titleSize,
                  color: styles.colors.headerBg,
                  borderBottom: `1px solid ${styles.colors.borderColor}`,
                }}
              >
                1. IDENTIFICACIÓN
              </h2>
              <div
                className="grid grid-cols-2 gap-4"
                style={{ fontSize: styles.fonts.valueSize }}
              >
                <FieldDisplay
                  label="Código"
                  value={identificacion.codigo.value}
                  isEdited={identificacion.codigo.isEdited}
                  showIndicator={showEditIndicators}
                />
                <FieldDisplay
                  label="Sistema"
                  value={identificacion.sistema.value}
                  isEdited={identificacion.sistema.isEdited}
                  showIndicator={showEditIndicators}
                />
                <FieldDisplay
                  label="Dirección"
                  value={identificacion.direccion.value}
                  isEdited={identificacion.direccion.isEdited}
                  showIndicator={showEditIndicators}
                />
                <FieldDisplay
                  label="Barrio"
                  value={identificacion.barrio.value}
                  isEdited={identificacion.barrio.isEdited}
                  showIndicator={showEditIndicators}
                />
                <FieldDisplay
                  label="Municipio"
                  value={identificacion.municipio.value}
                  isEdited={identificacion.municipio.isEdited}
                  showIndicator={showEditIndicators}
                />
                <FieldDisplay
                  label="Estado"
                  value={identificacion.estado.value}
                  isEdited={identificacion.estado.isEdited}
                  showIndicator={showEditIndicators}
                />
                <FieldDisplay
                  label="Fecha"
                  value={identificacion.fecha.value}
                  isEdited={identificacion.fecha.isEdited}
                  showIndicator={showEditIndicators}
                />
              </div>
            </div>

            {/* Sección de estructura */}
            <div style={{ marginBottom: styles.spacing.sectionGap }}>
              <h2
                className="font-semibold pb-2 mb-3"
                style={{
                  fontSize: styles.fonts.titleSize,
                  color: styles.colors.headerBg,
                  borderBottom: `1px solid ${styles.colors.borderColor}`,
                }}
              >
                2. ESTRUCTURA
              </h2>
              <div
                className="grid grid-cols-2 gap-4"
                style={{ fontSize: styles.fonts.valueSize }}
              >
                <FieldDisplay
                  label="Altura Total"
                  value={estructura.alturaTotal.value}
                  isEdited={estructura.alturaTotal.isEdited}
                  showIndicator={showEditIndicators}
                  suffix="m"
                />
                <FieldDisplay
                  label="Rasante"
                  value={estructura.rasante.value}
                  isEdited={estructura.rasante.isEdited}
                  showIndicator={showEditIndicators}
                  suffix="m"
                />
                <FieldDisplay
                  label="Tapa Material"
                  value={estructura.tapaMaterial.value}
                  isEdited={estructura.tapaMaterial.isEdited}
                  showIndicator={showEditIndicators}
                />
                <FieldDisplay
                  label="Tapa Estado"
                  value={estructura.tapaEstado.value}
                  isEdited={estructura.tapaEstado.isEdited}
                  showIndicator={showEditIndicators}
                />
                <FieldDisplay
                  label="Cono Tipo"
                  value={estructura.conoTipo.value}
                  isEdited={estructura.conoTipo.isEdited}
                  showIndicator={showEditIndicators}
                />
                <FieldDisplay
                  label="Cono Material"
                  value={estructura.conoMaterial.value}
                  isEdited={estructura.conoMaterial.isEdited}
                  showIndicator={showEditIndicators}
                />
                <FieldDisplay
                  label="Diámetro Cuerpo"
                  value={estructura.cuerpoDiametro.value}
                  isEdited={estructura.cuerpoDiametro.isEdited}
                  showIndicator={showEditIndicators}
                  suffix="m"
                />
                <FieldDisplay
                  label="Canuela Material"
                  value={estructura.canuelaMaterial.value}
                  isEdited={estructura.canuelaMaterial.isEdited}
                  showIndicator={showEditIndicators}
                />
                <div className="col-span-2">
                  <span className="text-gray-500">Peldaños:</span>
                  <span className={`ml-2 font-medium ${estructura.peldanosCantidad.isEdited && showEditIndicators ? 'text-amber-700' : ''}`}>
                    {estructura.peldanosCantidad.value || '0'} ({estructura.peldanosMaterial.value || 'N/A'})
                  </span>
                  {(estructura.peldanosCantidad.isEdited || estructura.peldanosMaterial.isEdited) && showEditIndicators && (
                    <span className="ml-1 inline-block w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  )}
                </div>
              </div>
            </div>

            {/* Sección de tuberías */}
            <div style={{ marginBottom: styles.spacing.sectionGap }}>
              <h2
                className="font-semibold pb-2 mb-3"
                style={{
                  fontSize: styles.fonts.titleSize,
                  color: styles.colors.headerBg,
                  borderBottom: `1px solid ${styles.colors.borderColor}`,
                }}
              >
                3. TUBERÍAS
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">
                    Entradas ({pozo?.tuberias?.tuberias?.filter(t => String(t?.tipoTuberia?.value || '').toLowerCase() === 'entrada').length || 0})
                  </h3>
                  {(pozo?.tuberias?.tuberias?.filter(t => String(t?.tipoTuberia?.value || '').toLowerCase() === 'entrada').length || 0) > 0 ? (
                    <div className="space-y-2">
                      {pozo?.tuberias?.tuberias?.filter(t => String(t?.tipoTuberia?.value || '').toLowerCase() === 'entrada').map((t, i) => (
                        <div
                          key={String(t?.idTuberia?.value || i)}
                          className="bg-gray-50 p-2 rounded"
                          style={{ fontSize: styles.fonts.valueSize }}
                        >
                          <span className="font-medium">E{i + 1}:</span> Ø{String(t.diametro?.value || '')}mm, {String(t.material?.value || '')}, Cota: {String(t.cota?.value || '')}m
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic" style={{ fontSize: styles.fonts.valueSize }}>
                      Sin entradas
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">
                    Salidas ({pozo?.tuberias?.tuberias?.filter(t => String(t?.tipoTuberia?.value || '').toLowerCase() === 'salida').length || 0})
                  </h3>
                  {(pozo?.tuberias?.tuberias?.filter(t => String(t?.tipoTuberia?.value || '').toLowerCase() === 'salida').length || 0) > 0 ? (
                    <div className="space-y-2">
                      {pozo?.tuberias?.tuberias?.filter(t => String(t?.tipoTuberia?.value || '').toLowerCase() === 'salida').map((t, i) => (
                        <div
                          key={String(t?.idTuberia?.value || i)}
                          className="bg-gray-50 p-2 rounded"
                          style={{ fontSize: styles.fonts.valueSize }}
                        >
                          <span className="font-medium">S{i + 1}:</span> Ø{String(t.diametro?.value || '')}mm, {String(t.material?.value || '')}, Cota: {String(t.cota?.value || '')}m
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic" style={{ fontSize: styles.fonts.valueSize }}>
                      Sin salidas
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sección de observaciones */}
            <div style={{ marginBottom: styles.spacing.sectionGap }}>
              <h2
                className="font-semibold pb-2 mb-3"
                style={{
                  fontSize: styles.fonts.titleSize,
                  color: styles.colors.headerBg,
                  borderBottom: `1px solid ${styles.colors.borderColor}`,
                }}
              >
                4. OBSERVACIONES
              </h2>
              <p
                className={observaciones.isEdited && showEditIndicators ? 'text-amber-700' : 'text-gray-700'}
                style={{ fontSize: styles.fonts.valueSize }}
              >
                {observaciones.value || <span className="text-gray-400 italic">Sin observaciones</span>}
                {observaciones.isEdited && showEditIndicators && (
                  <span className="ml-1 inline-block w-1.5 h-1.5 bg-amber-500 rounded-full" />
                )}
              </p>
            </div>

            {/* Sección de fotos */}
            <div>
              <h2
                className="font-semibold pb-2 mb-3"
                style={{
                  fontSize: styles.fonts.titleSize,
                  color: styles.colors.headerBg,
                  borderBottom: `1px solid ${styles.colors.borderColor}`,
                }}
              >
                5. REGISTRO FOTOGRÁFICO
              </h2>
              {allPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {allPhotos.map((foto, index) => (
                    <LazyPhoto key={foto.filename || index} foto={foto} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 italic text-center py-8" style={{ fontSize: styles.fonts.valueSize }}>
                  No hay fotografías disponibles
                </p>
              )}
            </div>

            {/* Indicador de campos editados (leyenda) */}
            {showEditIndicators && (
              <div className="mt-6 pt-4 border-t border-gray-200 flex items-center gap-2 text-xs text-gray-500">
                <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full" />
                <span>Campo editado manualmente</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
