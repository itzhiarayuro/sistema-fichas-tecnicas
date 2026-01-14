/**
 * Página de Pozos - Lista interactiva con selección y preview
 * Requirements: 2.1-2.6, 14.1-14.4, 18.4, 18.5
 * 
 * Muestra todos los pozos cargados con:
 * - Tabla interactiva con ordenamiento y filtrado
 * - Panel de vista previa del pozo seleccionado
 * - Indicadores de estado de completitud
 * - Navegación al editor
 * - Recomendaciones contextuales del modo guiado
 * - Indicadores de flujo del workflow
 */

'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalStore, useUIStore } from '@/stores';
import { PozosTable, PozoStatusDetail } from '@/components/pozos';
import { RecommendationsPanel } from '@/components/guided';
import { AppShell, NextStepIndicator, ProgressBar } from '@/components/layout';
import { Pozo } from '@/types';

export default function PozosPage() {
  const router = useRouter();

  // Global store
  const pozos = useGlobalStore((state) => state.pozos);
  const setCurrentStep = useGlobalStore((state) => state.setCurrentStep);

  // UI store
  const selectedPozoId = useUIStore((state) => state.selectedPozoId);
  const setSelectedPozoId = useUIStore((state) => state.setSelectedPozoId);

  // Set current workflow step
  useEffect(() => {
    setCurrentStep('review');
  }, [setCurrentStep]);

  // Convert Map to array for table
  const pozosArray = useMemo(() => {
    return Array.from(pozos.values());
  }, [pozos]);

  // Get selected pozo
  const selectedPozo = useMemo(() => {
    if (!selectedPozoId) return null;
    return pozos.get(selectedPozoId) || null;
  }, [pozos, selectedPozoId]);

  // Handle pozo selection
  const handleSelectPozo = (pozoId: string) => {
    setSelectedPozoId(pozoId);
  };

  // Handle double click to open editor
  const handleDoubleClickPozo = (pozoId: string) => {
    router.push(`/editor/${pozoId}`);
  };

  // Handle edit button click
  const handleEditPozo = () => {
    if (selectedPozoId) {
      router.push(`/editor/${selectedPozoId}`);
    }
  };

  // Handle navigation to upload
  const handleGoToUpload = () => {
    router.push('/upload');
  };

  // Handle delete pozo
  const handleDeletePozo = (pozoId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este pozo?')) {
      useGlobalStore.setState((state) => {
        const newPozos = new Map(state.pozos);
        newPozos.delete(pozoId);
        return { pozos: newPozos };
      });
      if (selectedPozoId === pozoId) {
        setSelectedPozoId(null);
      }
    }
  };

  // Handle generate PDF for selected pozo
  const handleGeneratePDF = async () => {
    if (!selectedPozoId) return;

    const pozo = pozos.get(selectedPozoId);
    if (!pozo) return;

    try {
      // Crear una ficha con la estructura correcta
      const ficha = {
        id: `ficha-${selectedPozoId}`,
        pozoId: selectedPozoId,
        status: 'complete' as const,
        sections: [
          {
            id: 'identificacion',
            type: 'identificacion' as const,
            order: 1,
            visible: true,
            locked: false,
            content: {
              codigo: { value: pozo.idPozo?.value || pozo.identificacion.idPozo.value, source: 'excel' as const },
              direccion: { value: pozo.direccion?.value || pozo.ubicacion.direccion.value, source: 'excel' as const },
              barrio: { value: pozo.barrio?.value || pozo.ubicacion.barrio.value, source: 'excel' as const },
              sistema: { value: pozo.sistema?.value || pozo.componentes.sistema.value, source: 'excel' as const },
              estado: { value: pozo.estado?.value || pozo.identificacion.estado.value, source: 'excel' as const },
              fecha: { value: pozo.fecha?.value || pozo.identificacion.fecha.value, source: 'excel' as const },
              observaciones: { value: pozo.observacionesPozo?.value || pozo.observaciones.observaciones.value, source: 'excel' as const },
            },
          },
          {
            id: 'estructura',
            type: 'estructura' as const,
            order: 2,
            visible: true,
            locked: false,
            content: {
              alturaTotal: { value: pozo.profundidad?.value || pozo.ubicacion.profundidad.value, source: 'excel' as const },
              rasante: { value: pozo.elevacion?.value || pozo.ubicacion.elevacion.value, source: 'excel' as const },
              tapaMaterial: { value: pozo.materialTapa?.value || pozo.componentes.materialTapa.value, source: 'excel' as const },
              tapaEstado: { value: pozo.estadoTapa?.value || pozo.componentes.estadoTapa.value, source: 'excel' as const },
              conoTipo: { value: pozo.tipoCono?.value || pozo.componentes.tipoCono.value, source: 'excel' as const },
              conoMaterial: { value: pozo.materialCono?.value || pozo.componentes.materialCono.value, source: 'excel' as const },
              cuerpoDiametro: { value: pozo.diametroCilindro?.value || pozo.componentes.diametroCilindro.value, source: 'excel' as const },
              canuelaMaterial: { value: pozo.materialCanuela?.value || pozo.componentes.materialCanuela.value, source: 'excel' as const },
              peldanosCantidad: { value: pozo.numeroPeldanos?.value || pozo.componentes.numeroPeldanos.value, source: 'excel' as const },
              peldanosMaterial: { value: pozo.materialPeldanos?.value || pozo.componentes.materialPeldanos.value, source: 'excel' as const },
            },
          },
          {
            id: 'fotos',
            type: 'fotos' as const,
            order: 3,
            visible: true,
            locked: false,
            content: {},
          },
        ],
        customizations: {
          colors: {
            headerBg: '#1F4E79',
            headerText: '#FFFFFF',
            sectionBg: '#F5F5F5',
            sectionText: '#333333',
            labelText: '#666666',
            valueText: '#000000',
            borderColor: '#CCCCCC',
          },
          fonts: {
            titleSize: 14,
            labelSize: 9,
            valueSize: 10,
            fontFamily: 'helvetica',
          },
          spacing: {
            sectionGap: 8,
            fieldGap: 4,
            padding: 5,
            margin: 15,
          },
          template: 'default',
          isGlobal: false,
        },
        history: [],
        errors: [],
        lastModified: Date.now(),
        version: 1,
      };

      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ficha, pozo }),
      });

      if (!response.ok) {
        // Intentar leer como JSON primero
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Error al generar PDF';

        if (contentType?.includes('application/json')) {
          try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } catch {
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
        } else {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pozo.idPozo?.value || pozo.identificacion.idPozo.value}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error:', error);
      alert(`Error al generar el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  return (
    <AppShell>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 -mx-6 -mt-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lista de Pozos</h1>
              <p className="text-gray-600 mt-1">
                {pozosArray.length > 0
                  ? `${pozosArray.length} pozos cargados. Selecciona uno para ver detalles.`
                  : 'No hay pozos cargados. Carga un archivo Excel para comenzar.'
                }
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleGoToUpload}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Cargar más archivos
              </button>

              {selectedPozoId && (
                <>
                  <button
                    onClick={handleGeneratePDF}
                    className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2m0 0v-8m0 8H3m6-8h6m0 0V5m0 6h6" />
                    </svg>
                    Generar PDF
                  </button>

                  <button
                    onClick={() => handleDeletePozo(selectedPozoId)}
                    className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </button>

                  <button
                    onClick={handleEditPozo}
                    className="px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar ficha
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Panel de recomendaciones del modo guiado - Requirements 14.1-14.4 */}
          <RecommendationsPanel className="mt-4" maxItems={2} />

          {/* Indicador del siguiente paso y progreso - Requirements 18.4, 18.5 */}
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex-1">
              <ProgressBar showPercentage showStepCount />
            </div>
            {selectedPozoId && (
              <NextStepIndicator variant="inline" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden -mx-6">
          {/* Table panel */}
          <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${selectedPozo ? 'w-2/3' : 'w-full'}`}>
            {pozosArray.length > 0 ? (
              <PozosTable
                pozos={pozosArray}
                selectedPozoId={selectedPozoId}
                onSelectPozo={handleSelectPozo}
                onDoubleClickPozo={handleDoubleClickPozo}
              />
            ) : (
              <EmptyState onUpload={handleGoToUpload} />
            )}
          </div>

          {/* Preview panel */}
          {selectedPozo && (
            <div className="w-1/3 border-l border-gray-200 bg-white overflow-auto">
              <PozoPreviewPanel
                pozo={selectedPozo}
                onEdit={handleEditPozo}
                onClose={() => setSelectedPozoId(null)}
              />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/**
 * Empty state when no pozos are loaded
 */
function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          No hay pozos cargados
        </h2>
        <p className="text-gray-600 mb-6">
          Carga un archivo Excel con los datos de los pozos para comenzar a generar fichas técnicas.
        </p>
        <button
          onClick={onUpload}
          className="px-6 py-3 text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Cargar archivos
        </button>
      </div>
    </div>
  );
}

/**
 * Preview panel for selected pozo
 */
function PozoPreviewPanel({
  pozo,
  onEdit,
  onClose
}: {
  pozo: Pozo;
  onEdit: () => void;
  onClose: () => void;
}) {
  const fotosCount = countFotos(pozo);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Vista previa
        </h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          aria-label="Cerrar vista previa"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Código y estado */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold text-primary">{pozo.idPozo?.value || pozo.identificacion.idPozo?.value || 'Sin ID'}</h3>
            <p className="text-gray-600">{pozo.direccion?.value || pozo.ubicacion.direccion?.value || 'Sin dirección'}</p>
          </div>
        </div>

        {/* Status */}
        <PozoStatusDetail pozo={pozo} />

        {/* Información general */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Información General</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Barrio:</dt>
              <dd className="text-gray-900 font-medium">{pozo.barrio?.value || pozo.ubicacion.barrio?.value || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Sistema:</dt>
              <dd className="text-gray-900 font-medium">{pozo.sistema?.value || pozo.componentes.sistema?.value || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Estado:</dt>
              <dd className="text-gray-900 font-medium">{pozo.estado?.value || pozo.identificacion.estado?.value || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Fecha:</dt>
              <dd className="text-gray-900 font-medium">{pozo.fecha?.value || pozo.identificacion.fecha?.value || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Estructura */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Estructura</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Altura total:</dt>
              <dd className="text-gray-900 font-medium">{pozo.profundidad?.value || pozo.ubicacion.profundidad?.value || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Rasante (Elevación):</dt>
              <dd className="text-gray-900 font-medium">{pozo.elevacion?.value || pozo.ubicacion.elevacion?.value || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Tapa (material):</dt>
              <dd className="text-gray-900 font-medium">{pozo.materialTapa?.value || pozo.componentes.materialTapa?.value || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Tapa (estado):</dt>
              <dd className="text-gray-900 font-medium">{pozo.estadoTapa?.value || pozo.componentes.estadoTapa?.value || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Diámetro cuerpo:</dt>
              <dd className="text-gray-900 font-medium">{pozo.diametroCilindro?.value || pozo.componentes.diametroCilindro?.value || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Fotos */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Fotografías</h4>
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-gray-700">
              {fotosCount > 0
                ? `${fotosCount} foto${fotosCount !== 1 ? 's' : ''} asociada${fotosCount !== 1 ? 's' : ''}`
                : 'Sin fotos asociadas'
              }
            </span>
          </div>

          {fotosCount > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>Total: {fotosCount}</div>
            </div>
          )}
        </div>

        {/* Observaciones */}
        {(pozo.observacionesPozo?.value || pozo.observaciones.observaciones?.value) && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Observaciones</h4>
            <p className="text-sm text-gray-700">{pozo.observacionesPozo?.value || pozo.observaciones.observaciones.value}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onEdit}
          className="w-full px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar ficha técnica
        </button>
      </div>
    </div>
  );
}

// Helper function to count photos
function countFotos(pozo: Pozo): number {
  const { fotos } = pozo;
  return fotos.fotos?.length || 0;
}
