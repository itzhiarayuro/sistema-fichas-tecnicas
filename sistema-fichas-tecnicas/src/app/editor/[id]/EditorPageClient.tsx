/**
 * Editor Page - Página de edición de ficha técnica
 * Reconstructed version 7 - Final fix for PreviewPanel props
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  EditorLayout,
  PreviewPanel,
  IdentificacionSection,
  EstructuraSection,
  TuberiasSection,
  SumiderosSection,
  FotosSection,
  ObservacionesSection,
  CustomizationPanel,
  TemplateSelector,
  templateToCustomization,
  ScopeIndicator,
  ToolBar,
  SortableSections,
} from '@/components/editor';
import { useConfirmDialog } from '@/components/ui';
import {
  RecommendationsPanel,
  RestrictedAction,
  GuidedModeBadge,
} from '@/components/guided';
import { AppShell, WorkflowBreadcrumbs, NextStepIndicator } from '@/components/layout';
import { useGlobalStore, useUIStore, type Template } from '@/stores';
import { createFichaStore, getFichaStore, type FichaStore } from '@/stores/fichaStore';
import { useSyncEngine, type SyncConflict } from '@/lib/sync';
import { logger } from '@/lib/logger';
import { lifecycleManager } from '@/lib/managers/lifecycleManager';
import { resourceManager } from '@/lib/managers/resourceManager';
import { recoverState } from '@/lib/state/integrity';
import { StateGuard } from '@/components/editor/StateGuard';
import type { FieldValue, FichaState, FichaCustomization } from '@/types/ficha';
import { useFieldsStore } from '@/stores/fieldsStore';
import { useMounted } from '@/hooks/useMounted';

// Helper para crear FieldValue desde string
function createFieldValue(value: string, source: FieldValue['source'] = 'excel'): FieldValue {
  return { value: value || '', source };
}

// Helper para crear estado inicial de ficha desde pozo
function createInitialFichaState(pozoId: string): FichaState {
  return {
    id: `ficha-${pozoId}`,
    pozoId,
    status: 'editing',
    sections: [
      { id: 'identificacion', type: 'identificacion', order: 0, visible: true, locked: false, content: {} },
      { id: 'estructura', type: 'estructura', order: 1, visible: true, locked: false, content: {} },
      { id: 'tuberias', type: 'tuberias', order: 2, visible: true, locked: false, content: {} },
      { id: 'sumideros', type: 'sumideros', order: 3, visible: true, locked: false, content: {} },
      { id: 'fotos', type: 'fotos', order: 4, visible: true, locked: false, content: {} },
      { id: 'observaciones', type: 'observaciones', order: 5, visible: true, locked: false, content: {} },
    ],
    customizations: {
      colors: {
        headerBg: '#1F4E79',
        headerText: '#FFFFFF',
        sectionBg: '#FFFFFF',
        sectionText: '#333333',
        labelText: '#666666',
        valueText: '#000000',
        borderColor: '#E5E7EB',
      },
      fonts: { titleSize: 16, labelSize: 12, valueSize: 12, fontFamily: 'Arial' },
      spacing: { sectionGap: 16, fieldGap: 8, padding: 16, margin: 24 },
      template: 'standard',
      isGlobal: false,
    },
    history: [],
    errors: [],
    lastModified: Date.now(),
    version: 1,
  };
}

export default function EditorPageClient() {
  const params = useParams();
  const router = useRouter();
  const pozoId = params.id as string;
  const isMounted = useMounted();

  const pozo = useGlobalStore((state) => state.getPozoById(pozoId));
  const setCurrentStep = useGlobalStore((state) => state.setCurrentStep);
  const addToast = useUIStore((state) => state.addToast);
  const { confirmResetFormat } = useConfirmDialog();

  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [showCustomization, setShowCustomization] = useState(false);

  useEffect(() => {
    setCurrentStep('edit');
  }, [setCurrentStep]);

  const fichaId = `ficha-${pozoId}`;
  
  useEffect(() => {
    if (!pozoId) return;
    lifecycleManager.mount(fichaId);
    resourceManager.registerFicha(fichaId);
    return () => {
      resourceManager.unregisterFicha(fichaId);
      lifecycleManager.destroy(fichaId);
    };
  }, [pozoId, fichaId]);

  const initialFichaState = useMemo(() => {
    if (!pozo) return null;
    return createInitialFichaState(pozoId);
  }, [pozoId, pozo]);

  const handleConflict = useCallback((conflict: SyncConflict) => {
    addToast({ type: 'warning', message: conflict.message, duration: 5000 });
  }, [addToast]);

  const {
    syncedState,
    updateField,
    reorderSections,
    toggleSectionVisibility,
    updateCustomization,
  } = useSyncEngine({
    initialState: initialFichaState,
    onConflict: handleConflict,
  });

  const fichaStore = useMemo(() => {
      if (!isMounted) return null;
      let storeApi = getFichaStore(fichaId);
      if (!storeApi && pozoId) {
          storeApi = createFichaStore(initialFichaState || createInitialFichaState(pozoId));
      }
      return storeApi;
  }, [isMounted, pozoId, fichaId, initialFichaState]);

  const mergeFieldEdits = useCallback((sectionId: string, field: string, baseValue: FieldValue): FieldValue => {
    const section = syncedState?.sections.find(s => s.id === sectionId);
    if (!section || !section.content || !section.content[field]) return baseValue;
    return section.content[field];
  }, [syncedState]);

  const identificacionData = useMemo(() => {
    if (!pozo) return null;
    const base = {
      idPozo: createFieldValue(String(pozo.identificacion.idPozo?.value || pozo.idPozo?.value || pozo.pozo_id?.value || '')),
      coordenadaX: createFieldValue(String(pozo.identificacion.coordenadaX?.value || pozo.pozo_coordX?.value || '')),
      coordenadaY: createFieldValue(String(pozo.identificacion.coordenadaY?.value || pozo.pozo_coordY?.value || '')),
      fecha: createFieldValue(String(pozo.identificacion.fecha?.value || pozo.pozo_fecha?.value || '')),
      levanto: createFieldValue(String(pozo.identificacion.levanto?.value || '')),
      estado: createFieldValue(String(pozo.identificacion.estado?.value || '')),
      direccion: createFieldValue(String(pozo.ubicacion.direccion?.value || pozo.direccion?.value || '')),
      barrio: createFieldValue(String(pozo.ubicacion.barrio?.value || pozo.barrio?.value || '')),
      elevacion: createFieldValue(String(pozo.ubicacion.elevacion?.value || pozo.elevacion?.value || '')),
      profundidad: createFieldValue(String(pozo.ubicacion.profundidad?.value || pozo.profundidad?.value || '')),
    };

    const merged: any = {};
    Object.keys(base).forEach(key => {
      merged[key] = mergeFieldEdits('identificacion', key, (base as any)[key]);
    });
    return merged as any;
  }, [pozo, mergeFieldEdits]);

  const estructuraData = useMemo(() => {
    if (!pozo) return null;
    const base = {
      sistema: createFieldValue(String(pozo.componentes.sistema?.value || pozo.sistema?.value || '')),
      anoInstalacion: createFieldValue(String(pozo.componentes.anoInstalacion?.value || pozo.anoInstalacion?.value || '')),
      tipoCamara: createFieldValue(String(pozo.componentes.tipoCamara?.value || pozo.tipoCamara?.value || '')),
      estructuraPavimento: createFieldValue(String(pozo.componentes.estructuraPavimento?.value || pozo.estructuraPavimento?.value || '')),
      existeTapa: createFieldValue(String(pozo.componentes.existeTapa?.value || pozo.existeTapa?.value || '')),
      estadoTapa: createFieldValue(String(pozo.componentes.estadoTapa?.value || pozo.estadoTapa?.value || '')),
      materialTapa: createFieldValue(String(pozo.componentes.materialTapa?.value || pozo.materialTapa?.value || '')),
      existeCono: createFieldValue(String(pozo.componentes.existeCono?.value || pozo.existeCono?.value || '')),
      tipoCono: createFieldValue(String(pozo.componentes.tipoCono?.value || pozo.tipoCono?.value || '')),
      materialCono: createFieldValue(String(pozo.componentes.materialCono?.value || pozo.materialCono?.value || '')),
      estadoCono: createFieldValue(String(pozo.componentes.estadoCono?.value || pozo.estadoCono?.value || '')),
      existeCilindro: createFieldValue(String(pozo.componentes.existeCilindro?.value || pozo.existeCilindro?.value || '')),
      diametroCilindro: createFieldValue(String(pozo.componentes.diametroCilindro?.value || pozo.diametroCilindro?.value || '')),
      materialCilindro: createFieldValue(String(pozo.componentes.materialCilindro?.value || pozo.materialCilindro?.value || '')),
      estadoCilindro: createFieldValue(String(pozo.componentes.estadoCilindro?.value || pozo.estadoCilindro?.value || '')),
      existeCanuela: createFieldValue(String(pozo.componentes.existeCanuela?.value || pozo.existeCanuela?.value || '')),
      materialCanuela: createFieldValue(String(pozo.componentes.materialCanuela?.value || pozo.materialCanuela?.value || '')),
      estadoCanuela: createFieldValue(String(pozo.componentes.estadoCanuela?.value || pozo.estadoCanuela?.value || pozo.estadoCaniuela?.value || '')),
      existePeldanos: createFieldValue(String(pozo.componentes.existePeldanos?.value || pozo.existePeldanos?.value || '')),
      numeroPeldanos: createFieldValue(String(pozo.componentes.numeroPeldanos?.value || pozo.numeroPeldanos?.value || '')),
      materialPeldanos: createFieldValue(String(pozo.componentes.materialPeldanos?.value || pozo.materialPeldanos?.value || '')),
      estadoPeldanos: createFieldValue(String(pozo.componentes.estadoPeldanos?.value || pozo.estadoPeldanos?.value || '')),
    };

    const merged: any = {};
    Object.keys(base).forEach(key => {
      merged[key] = mergeFieldEdits('estructura', key, (base as any)[key]);
    });
    return merged as any;
  }, [pozo, mergeFieldEdits]);

  const tuberiasData = useMemo(() => {
    if (!pozo) return { entradas: [], salidas: [] };
    const tuberias = pozo.tuberias.tuberias || [];
    const buildTuberiaData = (t: any, tipo: 'ent' | 'sal', index: number) => {
      const order = t.orden?.value || (index + 1);
      const prefix = `${tipo}_${order}`;
      return {
        id: String(t.idTuberia?.value || `${prefix}_${index}`),
        idTuberia: mergeFieldEdits('tuberias', `${prefix}_id`, createFieldValue(String(t.idTuberia?.value || ''))),
        idPozo: createFieldValue(pozoId),
        tipoTuberia: createFieldValue(tipo === 'ent' ? 'entrada' : 'salida'),
        diametro: mergeFieldEdits('tuberias', `${prefix}_diametro`, createFieldValue(String(t.diametro?.value || ''))),
        material: mergeFieldEdits('tuberias', `${prefix}_material`, createFieldValue(String(t.material?.value || ''))),
        orden: createFieldValue(String(order)),
        cota: mergeFieldEdits('tuberias', `${prefix}_z`, createFieldValue(String(t.cota?.value || t.z?.value || ''))),
        estado: createFieldValue(''),
        batea: createFieldValue('')
      };
    };
    return {
      entradas: tuberias.filter(t => String(t.tipoTuberia?.value).toLowerCase() === 'entrada').map((t, i) => buildTuberiaData(t, 'ent', i)),
      salidas: tuberias.filter(t => String(t.tipoTuberia?.value).toLowerCase() === 'salida').map((t, i) => buildTuberiaData(t, 'sal', i)),
    };
  }, [pozo, pozoId, mergeFieldEdits]);

  const getPhotosByPozoId = useGlobalStore((state) => state.getPhotosByPozoId);
  const fotosData = useMemo(() => {
    if (!pozo) return { principal: [], entradas: [], salidas: [], sumideros: [], otras: [] };
    const todasLasFotos = [...(pozo.fotos?.fotos || []), ...getPhotosByPozoId(pozoId)];
    const uniqueFotos = Array.from(new Map(todasLasFotos.map(f => [f.id, f])).values());
    return {
      principal: uniqueFotos.filter(f => f.categoria === 'PRINCIPAL'),
      entradas: uniqueFotos.filter(f => f.categoria === 'ENTRADA'),
      salidas: uniqueFotos.filter(f => f.categoria === 'SALIDA'),
      sumideros: uniqueFotos.filter(f => f.categoria === 'SUMIDERO'),
      otras: uniqueFotos.filter(f => f.categoria === 'OTRO' || !f.categoria),
    };
  }, [pozo, pozoId, getPhotosByPozoId]);

  const sumiderosData = useMemo(() => {
    if (!pozo) return [];
    return (pozo.sumideros?.sumideros || []).map((s, i) => {
      const order = s.numeroEsquema?.value || (i + 1);
      const prefix = `sum_${order}`;
      return {
        id: String(s.idSumidero?.value || `${prefix}_${i}`),
        idSumidero: mergeFieldEdits('sumideros', `${prefix}_id`, createFieldValue(String(s.idSumidero?.value || ''))),
        idPozo: createFieldValue(pozoId),
        tipoSumidero: mergeFieldEdits('sumideros', `${prefix}_tipo`, createFieldValue(String(s.tipoSumidero?.value || ''))),
        numeroEsquema: mergeFieldEdits('sumideros', `${prefix}_n`, createFieldValue(String(order))),
        diametro: mergeFieldEdits('sumideros', `${prefix}_diametro`, createFieldValue(String(s.diametro?.value || ''))),
        materialTuberia: createFieldValue(''),
        alturaSalida: createFieldValue(''),
        alturaLlegada: createFieldValue('')
      };
    });
  }, [pozo, pozoId, mergeFieldEdits]);

  const observacionesData = useMemo(() => {
    if (!pozo) return createFieldValue('', 'excel');
    const base = createFieldValue(String(pozo.observaciones.observaciones?.value || pozo.pozo_observaciones?.value || ''), 'excel');
    return mergeFieldEdits('observaciones', 'texto', base);
  }, [pozo, mergeFieldEdits]);

  const handleFieldChange = useCallback((sectionId: string, field: string, value: string) => {
    updateField(sectionId, field, value, 'editor');
  }, [updateField]);

  const handleTuberiaFieldChange = useCallback((tipo: 'entrada' | 'salida', tuberiaId: string, field: string, value: string) => {
    updateField('tuberias', `${tuberiaId}_${field}`, value, 'editor');
  }, [updateField]);

  const handleSumideroFieldChange = useCallback((sumideroId: string, field: string, value: string) => {
    updateField('sumideros', `${sumideroId}_${field}`, value, 'editor');
  }, [updateField]);

  const handleBack = useCallback(() => router.push('/pozos'), [router]);

  const renderSection = useCallback((section: any, dragHandleProps: any) => {
    switch (section.type) {
      case 'identificacion': return <IdentificacionSection id={section.id} data={identificacionData!} visible={section.visible} onFieldChange={(f, v) => handleFieldChange(section.id, f as string, v)} onToggleVisibility={() => toggleSectionVisibility(section.id, !section.visible)} dragHandleProps={dragHandleProps} />;
      case 'estructura': return <EstructuraSection id={section.id} data={estructuraData!} visible={section.visible} onFieldChange={(f, v) => handleFieldChange(section.id, f as string, v)} onToggleVisibility={() => toggleSectionVisibility(section.id, !section.visible)} dragHandleProps={dragHandleProps} />;
      case 'tuberias': return <TuberiasSection id={section.id} entradas={tuberiasData.entradas as any} salidas={tuberiasData.salidas as any} visible={section.visible} onTuberiaFieldChange={handleTuberiaFieldChange} onToggleVisibility={() => toggleSectionVisibility(section.id, !section.visible)} dragHandleProps={dragHandleProps} />;
      case 'sumideros': return <SumiderosSection id={section.id} sumideros={sumiderosData as any} visible={section.visible} onSumideroFieldChange={handleSumideroFieldChange} onToggleVisibility={() => toggleSectionVisibility(section.id, !section.visible)} dragHandleProps={dragHandleProps} />;
      case 'fotos': return <FotosSection id={section.id} principal={fotosData.principal} entradas={fotosData.entradas} salidas={fotosData.salidas} sumideros={fotosData.sumideros} otras={fotosData.otras} visible={section.visible} onToggleVisibility={() => toggleSectionVisibility(section.id, !section.visible)} dragHandleProps={dragHandleProps} />;
      case 'observaciones': return <ObservacionesSection id={section.id} observaciones={observacionesData} visible={section.visible} onObservacionesChange={(v) => handleFieldChange(section.id, 'texto', v)} onToggleVisibility={() => toggleSectionVisibility(section.id, !section.visible)} dragHandleProps={dragHandleProps} />;
      default: return null;
    }
  }, [identificacionData, estructuraData, tuberiasData, sumiderosData, fotosData, observacionesData, handleFieldChange, handleTuberiaFieldChange, handleSumideroFieldChange, toggleSectionVisibility]);

  if (!isMounted) return <div className="p-10 text-center">Iniciando editor...</div>;
  if (!pozo && pozoId !== 'local') return <div className="p-10 text-center">Pozo no encontrado <button onClick={handleBack} className="text-primary underline">Volver</button></div>;

  const currentCustomization = syncedState?.customizations || initialFichaState?.customizations!;

  return (
    <AppShell noPadding>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {fichaStore && pozo ? (
          <ToolBar 
            pozo={pozo}
            fichaStore={fichaStore.getState()}
            onBack={handleBack}
            onCustomizeClick={() => setShowCustomization(!showCustomization)}
            showCustomization={showCustomization}
            version={syncedState?.version}
            BreadcrumbsComponent={WorkflowBreadcrumbs}
            NextStepComponent={NextStepIndicator}
          />
        ) : (
          <div className="h-14 bg-gray-50 border-b flex items-center px-4 animate-pulse">
            <div className="h-6 w-48 bg-gray-200 rounded" />
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          <EditorLayout
            mode={viewMode}
            onModeChange={setViewMode}
            editorContent={
              <div className="pb-20">
                {showCustomization && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 shadow-inner">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-sm text-gray-700">Diseño y Formato</h3>
                            <button onClick={() => setShowCustomization(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <CustomizationPanel 
                          customizations={currentCustomization} 
                          onCustomizationsChange={(changes) => {
                            Object.entries(changes).forEach(([key, value]) => {
                                updateCustomization([key], value);
                            });
                          }} 
                        />
                        <div className="mt-4 pt-4 border-t border-gray-200">
                             <TemplateSelector 
                               currentTemplate={currentCustomization.template || 'standard'} 
                               onTemplateSelect={(t: Template) => {
                                 const customizations = templateToCustomization(t);
                                 Object.entries(customizations).forEach(([key, value]) => {
                                    updateCustomization([key], value);
                                 });
                               }} 
                             />
                        </div>
                    </div>
                )}
                <SortableSections sections={syncedState?.sections || []} onReorder={reorderSections} renderSection={renderSection} />
              </div>
            }
            previewContent={<PreviewPanel pozo={pozo!} fichaState={syncedState} />}
          />
        </div>
      </div>
      <RecommendationsPanel className="mt-4" />
    </AppShell>
  );
}
