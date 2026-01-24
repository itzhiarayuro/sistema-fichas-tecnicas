/**
 * Editor Page - Página de edición de ficha técnica
 * Requirements: 3.1, 4.1-4.5, 6.1-6.4, 12.1, 12.2, 12.4, 14.1-14.4, 16.8, 16.9, 18.2, 18.4, 18.5
 * 
 * Integra el EditorLayout con las secciones de ficha para
 * proporcionar una experiencia de edición visual completa
 * con sincronización bidireccional en tiempo real.
 * 
 * Incluye:
 * - Panel de personalización de formato (colores, fuentes, espaciado)
 * - Selector de plantillas predefinidas
 * - Indicador de scope (local vs global)
 * - Confirmación doble para acciones destructivas
 * - Modo guiado con recomendaciones contextuales (Requirements 14.1-14.4)
 * - Indicadores de flujo del workflow (Requirements 18.4, 18.5)
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
// import { generateFichaPDF, downloadPDF } from '@/lib/pdf/pdfGenerator'; // Removed as per cleanup request
import { lifecycleManager } from '@/lib/managers/lifecycleManager';
import { resourceManager } from '@/lib/managers/resourceManager';
import { recoverState } from '@/lib/state/integrity';
import { StateGuard } from '@/components/editor/StateGuard';
import type { FieldValue, FichaState, FichaCustomization } from '@/types/ficha';

// Helper para crear FieldValue desde string
function createFieldValue(value: string, source: FieldValue['source'] = 'excel'): FieldValue {
  return { value, source };
}

// Helper para crear estado inicial de ficha desde pozo
function createInitialFichaState(pozoId: string): FichaState {
  return {
    id: `ficha-${pozoId}`,
    pozoId,
    status: 'editing',
    sections: [
      {
        id: 'identificacion',
        type: 'identificacion',
        order: 0,
        visible: true,
        locked: false,
        content: {},
      },
      {
        id: 'estructura',
        type: 'estructura',
        order: 1,
        visible: true,
        locked: false,
        content: {},
      },
      {
        id: 'tuberias',
        type: 'tuberias',
        order: 2,
        visible: true,
        locked: false,
        content: {},
      },
      {
        id: 'fotos',
        type: 'fotos',
        order: 3,
        visible: true,
        locked: false,
        content: {},
      },
      {
        id: 'observaciones',
        type: 'observaciones',
        order: 4,
        visible: true,
        locked: false,
        content: {},
      },
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
      fonts: {
        titleSize: 16,
        labelSize: 12,
        valueSize: 12,
        fontFamily: 'Inter',
      },
      spacing: {
        sectionGap: 16,
        fieldGap: 8,
        padding: 16,
        margin: 24,
      },
      template: 'standard',
      isGlobal: false,
    },
    history: [],
    errors: [],
    lastModified: Date.now(),
    version: 1,
  };
}

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const pozoId = params.id as string;

  const pozo = useGlobalStore((state) => state.getPozoById(pozoId));
  const setCurrentStep = useGlobalStore((state) => state.setCurrentStep);
  const addToast = useUIStore((state) => state.addToast);
  const { confirmResetFormat, confirmDiscardChanges } = useConfirmDialog();

  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [showCustomization, setShowCustomization] = useState(false);
  const [fichaStore, setFichaStore] = useState<FichaStore | null>(null);

  // Set current workflow step
  useEffect(() => {
    setCurrentStep('edit');
  }, [setCurrentStep]);

  // Initialize ficha store and lifecycle
  useEffect(() => {
    if (!pozoId) return;

    // Registrar en managers
    const fichaId = `ficha-${pozoId}`;
    lifecycleManager.mount(fichaId);
    resourceManager.registerFicha(fichaId);

    // Pipeline centralizado de recuperación (Requirement Integrity)
    const initialState = recoverState(fichaId, pozoId);

    // Si el estado es nuevo (reset), inicializarlo con datos del pozo si existen
    if (initialState.stateStatus === 'reset' && pozo) {
      const baseState = createInitialFichaState(pozoId);
      Object.assign(initialState, baseState);
    }

    const store = createFichaStore(initialState);
    setFichaStore(store.getState());

    return () => {
      resourceManager.unregisterFicha(fichaId);
      lifecycleManager.destroy(fichaId);
    };
  }, [pozoId]);

  // Estado de personalización local
  const [customizations, setCustomizations] = useState<FichaCustomization>({
    colors: {
      headerBg: '#1F4E79',
      headerText: '#FFFFFF',
      sectionBg: '#FFFFFF',
      sectionText: '#333333',
      labelText: '#666666',
      valueText: '#000000',
      borderColor: '#E5E7EB',
    },
    fonts: {
      titleSize: 16,
      labelSize: 12,
      valueSize: 12,
      fontFamily: 'Inter',
    },
    spacing: {
      sectionGap: 16,
      fieldGap: 8,
      padding: 16,
      margin: 24,
    },
    template: 'standard',
    isGlobal: false,
  });

  // Estado inicial de la ficha
  const initialFichaState = useMemo(() => {
    if (!pozo) return null;
    return createInitialFichaState(pozoId);
  }, [pozoId, pozo]);

  // Callback para manejar conflictos de sincronización
  const handleConflict = useCallback((conflict: SyncConflict) => {
    addToast({
      type: 'warning',
      message: conflict.message,
      duration: 5000,
    });
  }, [addToast]);

  // Hook de sincronización
  const {
    syncedState,
    version,
    isPending,
    updateField,
    reorderSections,
    toggleSectionVisibility,
    updateCustomization,
    reinitialize,
    flush,
  } = useSyncEngine({
    initialState: initialFichaState,
    onConflict: handleConflict,
    debug: process.env.NODE_ENV === 'development',
  });

  // Datos de identificación
  const identificacionData = useMemo(() => {
    if (!pozo) {
      return {
        idPozo: createFieldValue('', 'default'),
        coordenadaX: createFieldValue('', 'default'),
        coordenadaY: createFieldValue('', 'default'),
        fecha: createFieldValue('', 'default'),
        levanto: createFieldValue('', 'default'),
        estado: createFieldValue('', 'default'),
        codigo: createFieldValue('', 'default'),
        direccion: createFieldValue('', 'default'),
        barrio: createFieldValue('', 'default'),
        sistema: createFieldValue('', 'default'),
        elevacion: createFieldValue('', 'default'),
        profundidad: createFieldValue('', 'default'),
      };
    }
    return {
      // IdentificacionPozo
      idPozo: createFieldValue(String(pozo.identificacion.idPozo?.value || '')),
      coordenadaX: createFieldValue(String(pozo.identificacion.coordenadaX?.value || '')),
      coordenadaY: createFieldValue(String(pozo.identificacion.coordenadaY?.value || '')),
      fecha: createFieldValue(String(pozo.identificacion.fecha?.value || '')),
      levanto: createFieldValue(String(pozo.identificacion.levanto?.value || '')),
      estado: createFieldValue(String(pozo.identificacion.estado?.value || '')),
      // Legacy UI mapping (allows 'codigo' to work if component uses it)
      codigo: createFieldValue(String(pozo.identificacion.idPozo?.value || '')),
      // Ubicacion fields required by IdentificacionData
      direccion: createFieldValue(String(pozo.ubicacion.direccion?.value || '')),
      barrio: createFieldValue(String(pozo.ubicacion.barrio?.value || '')),
      sistema: createFieldValue(String(pozo.componentes.sistema?.value || '')),
      elevacion: createFieldValue(String(pozo.ubicacion.elevacion?.value || '')),
      profundidad: createFieldValue(String(pozo.ubicacion.profundidad?.value || '')),
    };
  }, [pozo]);

  // Datos de estructura
  const estructuraData = useMemo(() => {
    if (!pozo) {
      return {
        existeTapa: createFieldValue('', 'default'),
        estadoTapa: createFieldValue('', 'default'),
        existeCilindro: createFieldValue('', 'default'),
        diametroCilindro: createFieldValue('', 'default'),
        sistema: createFieldValue('', 'default'),
        anoInstalacion: createFieldValue('', 'default'),
        tipoCamara: createFieldValue('', 'default'),
        estructuraPavimento: createFieldValue('', 'default'),
        materialTapa: createFieldValue('', 'default'),
        existeCono: createFieldValue('', 'default'),
        tipoCono: createFieldValue('', 'default'),
        materialCono: createFieldValue('', 'default'),
        estadoCono: createFieldValue('', 'default'),
        materialCilindro: createFieldValue('', 'default'),
        estadoCilindro: createFieldValue('', 'default'),
        existeCanuela: createFieldValue('', 'default'),
        materialCanuela: createFieldValue('', 'default'),
        estadoCanuela: createFieldValue('', 'default'),
        existePeldanos: createFieldValue('', 'default'),
        materialPeldanos: createFieldValue('', 'default'),
        numeroPeldanos: createFieldValue('', 'default'),
        estadoPeldanos: createFieldValue('', 'default'),
        alturaTotal: createFieldValue('', 'default'),
        rasante: createFieldValue('', 'default'),
        tapaMaterial: createFieldValue('', 'default'),
        tapaEstado: createFieldValue('', 'default'),
        conoTipo: createFieldValue('', 'default'),
        conoMaterial: createFieldValue('', 'default'),
        cuerpoDiametro: createFieldValue('', 'default'),
        canuelaMaterial: createFieldValue('', 'default'),
        peldanosCantidad: createFieldValue('', 'default'),
        peldanosMaterial: createFieldValue('', 'default'),
      };
    }
    return {
      // ComponentesPozo
      existeTapa: createFieldValue(String(pozo.componentes.existeTapa?.value || '')),
      estadoTapa: createFieldValue(String(pozo.componentes.estadoTapa?.value || '')),
      existeCilindro: createFieldValue(String(pozo.componentes.existeCilindro?.value || '')),
      diametroCilindro: createFieldValue(String(pozo.componentes.diametroCilindro?.value || '')),
      sistema: createFieldValue(String(pozo.componentes.sistema?.value || '')),
      anoInstalacion: createFieldValue(String(pozo.componentes.anoInstalacion?.value || '')),
      tipoCamara: createFieldValue(String(pozo.componentes.tipoCamara?.value || '')),
      estructuraPavimento: createFieldValue(String(pozo.componentes.estructuraPavimento?.value || '')),
      materialTapa: createFieldValue(String(pozo.componentes.materialTapa?.value || '')),
      existeCono: createFieldValue(String(pozo.componentes.existeCono?.value || '')),
      tipoCono: createFieldValue(String(pozo.componentes.tipoCono?.value || '')),
      materialCono: createFieldValue(String(pozo.componentes.materialCono?.value || '')),
      estadoCono: createFieldValue(String(pozo.componentes.estadoCono?.value || '')),
      materialCilindro: createFieldValue(String(pozo.componentes.materialCilindro?.value || '')),
      estadoCilindro: createFieldValue(String(pozo.componentes.estadoCilindro?.value || '')),
      existeCanuela: createFieldValue(String(pozo.componentes.existeCanuela?.value || '')),
      materialCanuela: createFieldValue(String(pozo.componentes.materialCanuela?.value || '')),
      estadoCanuela: createFieldValue(String(pozo.componentes.estadoCanuela?.value || '')),
      existePeldanos: createFieldValue(String(pozo.componentes.existePeldanos?.value || '')),
      materialPeldanos: createFieldValue(String(pozo.componentes.materialPeldanos?.value || '')),
      numeroPeldanos: createFieldValue(String(pozo.componentes.numeroPeldanos?.value || '')),
      estadoPeldanos: createFieldValue(String(pozo.componentes.estadoPeldanos?.value || '')),

      // Ubicacion fields often displayed in structure section or header
      alturaTotal: createFieldValue(String(pozo.ubicacion.profundidad?.value || '')), // Mapped to profundidad
      rasante: createFieldValue(String(pozo.ubicacion.elevacion?.value || '')), // Mapped to elevacion

      // Legacy or internal fields mapping
      tapaMaterial: createFieldValue(String(pozo.componentes.materialTapa?.value || '')),
      tapaEstado: createFieldValue(String(pozo.componentes.estadoTapa?.value || '')),
      conoTipo: createFieldValue(String(pozo.componentes.tipoCono?.value || '')),
      conoMaterial: createFieldValue(String(pozo.componentes.materialCono?.value || '')),
      cuerpoDiametro: createFieldValue(String(pozo.componentes.diametroCilindro?.value || '')),
      canuelaMaterial: createFieldValue(String(pozo.componentes.materialCanuela?.value || '')),
      peldanosCantidad: createFieldValue(String(pozo.componentes.numeroPeldanos?.value || '')),
      peldanosMaterial: createFieldValue(String(pozo.componentes.materialPeldanos?.value || '')),
    };
  }, [pozo]);

  // Datos de tuberías
  const tuberiasData = useMemo(() => {
    if (!pozo) {
      return { entradas: [], salidas: [] };
    }
    const tuberias = pozo.tuberias.tuberias || [];
    return {
      entradas: tuberias.filter(t => String(t.tipoTuberia?.value).toLowerCase() === 'entrada').map((t) => ({
        id: String(t.idTuberia?.value || ''),
        idTuberia: createFieldValue(String(t.idTuberia?.value || '')),
        idPozo: createFieldValue(String(t.idPozo?.value || '')),
        tipoTuberia: createFieldValue(String(t.tipoTuberia?.value || '')),
        diametro: createFieldValue(String(t.diametro?.value || '')),
        material: createFieldValue(String(t.material?.value || '')),
        cota: createFieldValue(String(t.cota?.value || '')),
        estado: createFieldValue(String(t.estado?.value || '')),
        emboquillado: createFieldValue(String(t.emboquillado?.value || '')),
        longitud: createFieldValue(String(t.longitud?.value || '')),
      })),
      salidas: tuberias.filter(t => String(t.tipoTuberia?.value).toLowerCase() === 'salida').map((t) => ({
        id: String(t.idTuberia?.value || ''),
        idTuberia: createFieldValue(String(t.idTuberia?.value || '')),
        idPozo: createFieldValue(String(t.idPozo?.value || '')),
        tipoTuberia: createFieldValue(String(t.tipoTuberia?.value || '')),
        diametro: createFieldValue(String(t.diametro?.value || '')),
        material: createFieldValue(String(t.material?.value || '')),
        cota: createFieldValue(String(t.cota?.value || '')),
        estado: createFieldValue(String(t.estado?.value || '')),
        emboquillado: createFieldValue(String(t.emboquillado?.value || '')),
        longitud: createFieldValue(String(t.longitud?.value || '')),
      })),
    };
  }, [pozo]);

  // Datos de fotos organizadas por categoría
  const getPhotosByPozoId = useGlobalStore((state) => state.getPhotosByPozoId);
  const fotosData = useMemo(() => {
    if (!pozo) {
      return {
        principal: [],
        entradas: [],
        salidas: [],
        sumideros: [],
        otras: [],
      };
    }

    // Obtener fotos incrustadas en el pozo + fotos asociadas globalmente por nomenclatura
    const fotosIncrustadas = pozo.fotos?.fotos || [];
    const fotosGlobales = getPhotosByPozoId(pozoId);

    // Unificar eliminando duplicados por ID
    const fotosIds = new Set(fotosIncrustadas.map(f => f.id));
    const todasLasFotos = [...fotosIncrustadas];

    fotosGlobales.forEach(f => {
      if (!fotosIds.has(f.id)) {
        todasLasFotos.push(f);
        fotosIds.add(f.id);
      }
    });

    return {
      principal: todasLasFotos.filter(f => f.categoria === 'PRINCIPAL'),
      entradas: todasLasFotos.filter(f => f.categoria === 'ENTRADA'),
      salidas: todasLasFotos.filter(f => f.categoria === 'SALIDA'),
      sumideros: todasLasFotos.filter(f => f.categoria === 'SUMIDERO'),
      otras: todasLasFotos.filter(f => f.categoria === 'OTRO' || !f.categoria),
    };
  }, [pozo, pozoId, getPhotosByPozoId]);

  // Observaciones
  const observacionesData = useMemo(() => {
    if (!pozo) {
      return createFieldValue('', 'default');
    }
    return createFieldValue(String(pozo.observaciones.observaciones?.value || ''), 'excel');
  }, [pozo]);

  // Handlers para cambios de campo (sincronizados)
  const handleFieldChange = useCallback((sectionId: string, field: string, value: string) => {
    updateField(sectionId, field, value, 'editor');
  }, [updateField]);

  // Handler para resetear formato con confirmación doble
  const handleResetFormat = useCallback(async () => {
    const confirmed = await confirmResetFormat();
    if (confirmed) {
      // Reset customizations to default
      setCustomizations({
        colors: {
          headerBg: '#1F4E79',
          headerText: '#FFFFFF',
          sectionBg: '#FFFFFF',
          sectionText: '#333333',
          labelText: '#666666',
          valueText: '#000000',
          borderColor: '#E5E7EB',
        },
        fonts: {
          titleSize: 16,
          labelSize: 12,
          valueSize: 12,
          fontFamily: 'Inter',
        },
        spacing: {
          sectionGap: 16,
          fieldGap: 8,
          padding: 16,
          margin: 24,
        },
        template: 'standard',
        isGlobal: false,
      });
      addToast({
        type: 'success',
        message: 'Formato restaurado a valores predeterminados',
      });
    }
  }, [confirmResetFormat, addToast]);

  // Handler para cambios de personalización
  const handleCustomizationsChange = useCallback((changes: Partial<FichaCustomization>) => {
    setCustomizations((prev) => {
      const next = {
        ...prev,
        ...changes,
        colors: changes.colors ? { ...prev.colors, ...changes.colors } : prev.colors,
        fonts: changes.fonts ? { ...prev.fonts, ...changes.fonts } : prev.fonts,
        spacing: changes.spacing ? { ...prev.spacing, ...changes.spacing } : prev.spacing,
      };

      // Sincronizar con el engine para que se refleje en la vista previa y se persista
      if (changes.colors) updateCustomization(['colors'], next.colors);
      if (changes.fonts) updateCustomization(['fonts'], next.fonts);
      if (changes.spacing) updateCustomization(['spacing'], next.spacing);
      if (changes.template) updateCustomization(['template'], next.template);
      if (changes.designId !== undefined) updateCustomization(['designId'], next.designId);
      if (changes.isGlobal !== undefined) updateCustomization(['isGlobal'], next.isGlobal);

      return next;
    });
  }, [updateCustomization]);

  // Handler para selección de plantilla
  const handleTemplateSelect = useCallback((template: Template) => {
    const newCustomizations = templateToCustomization(template);

    setCustomizations((prev) => {
      const next = {
        ...prev,
        ...newCustomizations,
        colors: { ...prev.colors, ...newCustomizations.colors },
        fonts: { ...prev.fonts, ...newCustomizations.fonts },
      };

      // Sincronizar con el engine
      if (newCustomizations.colors) updateCustomization(['colors'], next.colors);
      if (newCustomizations.fonts) updateCustomization(['fonts'], next.fonts);
      if (newCustomizations.template) updateCustomization(['template'], next.template);
      if (newCustomizations.designId !== undefined) updateCustomization(['designId'], next.designId);

      return next;
    });

    addToast({
      type: 'success',
      message: `Plantilla "${template.name}" aplicada`,
    });
  }, [addToast, updateCustomization]);

  // Handler para cambio de scope
  const handleScopeChange = useCallback((isGlobal: boolean) => {
    setCustomizations((prev) => ({ ...prev, isGlobal }));
    updateCustomization(['isGlobal'], isGlobal);
    addToast({
      type: 'info',
      message: isGlobal
        ? 'Los cambios se aplicarán a futuras fichas'
        : 'Los cambios solo afectan esta ficha',
    });
  }, [addToast, updateCustomization]);

  // Handler para volver con confirmación si hay cambios sin guardar
  const handleBack = useCallback(async () => {
    // TODO: Verificar si hay cambios sin guardar
    const hasUnsavedChanges = false; // Placeholder - implementar detección de cambios

    if (hasUnsavedChanges) {
      const confirmed = await confirmDiscardChanges();
      if (!confirmed) return;
    }

    router.push('/pozos');
  }, [confirmDiscardChanges, router]);

  // Handler para reordenar secciones
  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    reorderSections(fromIndex, toIndex);
  }, [reorderSections]);

  // Función para renderizar secciones dinámicamente
  const renderSection = useCallback((section: any, dragHandleProps: Record<string, unknown>) => {
    switch (section.type) {
      case 'identificacion':
        return (
          <IdentificacionSection
            id={section.id}
            data={identificacionData}
            locked={section.locked}
            visible={section.visible}
            onFieldChange={(field, value) => handleFieldChange(section.id, field as string, value)}
            onToggleVisibility={() => toggleSectionVisibility(section.id, !section.visible)}
            dragHandleProps={dragHandleProps}
          />
        );
      case 'estructura':
        return (
          <EstructuraSection
            id={section.id}
            data={estructuraData}
            locked={section.locked}
            visible={section.visible}
            onFieldChange={(field, value) => handleFieldChange(section.id, field as string, value)}
            onToggleVisibility={() => toggleSectionVisibility(section.id, !section.visible)}
            dragHandleProps={dragHandleProps}
          />
        );
      case 'tuberias':
        return (
          <TuberiasSection
            id={section.id}
            entradas={tuberiasData.entradas}
            salidas={tuberiasData.salidas}
            locked={section.locked}
            visible={section.visible}
            onToggleVisibility={() => toggleSectionVisibility(section.id, !section.visible)}
            dragHandleProps={dragHandleProps}
          />
        );
      case 'fotos':
        return (
          <FotosSection
            id={section.id}
            principal={fotosData.principal}
            entradas={fotosData.entradas}
            salidas={fotosData.salidas}
            sumideros={fotosData.sumideros}
            otras={fotosData.otras}
            locked={section.locked}
            visible={section.visible}
            onToggleVisibility={() => toggleSectionVisibility(section.id, !section.visible)}
            dragHandleProps={dragHandleProps}
          />
        );
      case 'observaciones':
        return (
          <ObservacionesSection
            id={section.id}
            observaciones={observacionesData}
            locked={section.locked}
            visible={section.visible}
            onObservacionesChange={(value: string) => handleFieldChange(section.id, 'texto', value)}
            onToggleVisibility={() => toggleSectionVisibility(section.id, !section.visible)}
            dragHandleProps={dragHandleProps}
          />
        );
      default:
        return null;
    }
  }, [identificacionData, estructuraData, tuberiasData, fotosData, observacionesData, handleFieldChange, toggleSectionVisibility]);

  const handleFichaReset = useCallback(() => {
    const store = getFichaStore(`ficha-${pozoId}`);
    if (store) {
      store.getState().reset();
      reinitialize(store.getState());
      addToast({ type: 'success', message: 'Ficha restablecida con seguridad (Snapshot guardado).' });
    }
  }, [pozoId, reinitialize, addToast]);

  // Si no hay pozo, mostrar mensaje
  if (!pozo) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Pozo no encontrado</h2>
            <p className="text-gray-500 mb-4">
              No se encontró el pozo con ID: {pozoId}
            </p>
            <button
              onClick={() => router.push('/pozos')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Volver a la lista de pozos
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  // Contenido del editor
  const editorContent = (
    <div className="space-y-4">
      {/* Panel de recomendaciones del modo guiado - Requirements 14.1-14.4 */}
      <RecommendationsPanel className="mb-4" maxItems={2} />

      {/* Panel de personalización colapsable */}
      {showCustomization && (
        <div className="space-y-4">
          <TemplateSelector
            currentTemplate={customizations.template}
            onTemplateSelect={handleTemplateSelect}
            variant="dropdown"
          />
          <RestrictedAction action="advanced-customization">
            <CustomizationPanel
              customizations={customizations}
              onCustomizationsChange={handleCustomizationsChange}
              onToggleCollapse={() => setShowCustomization(false)}
            />
          </RestrictedAction>
        </div>
      )}

      {/* Secciones con Drag & Drop */}
      <SortableSections
        sections={syncedState?.sections || []}
        onReorder={handleReorder}
        renderSection={renderSection}
      />
    </div>
  );

  // Contenido de la vista previa (usando PreviewPanel con sincronización)
  const previewContent = (
    <PreviewPanel
      fichaState={syncedState}
      pozo={pozo}
      customizations={customizations}
      showEditIndicators={true}
    />
  );

  // Toolbar
  const toolbar = fichaStore ? (
    <ToolBar
      fichaStore={fichaStore}
      pozo={pozo}
      onBack={handleBack}
      onCustomizeClick={() => setShowCustomization(!showCustomization)}
      onResetFormat={handleResetFormat}
      onGeneratePDF={async () => {
        if (!syncedState || !pozo) return;

        logger.info('Solicitud de generación de PDF (Editor)', { pozoId: pozoId }, 'EditorPage');

        // Obtener fotos asociadas globalmente + incrustadas
        const fotosGlobales = getPhotosByPozoId(pozoId);
        const fotosIncrustadas = pozo.fotos?.fotos || [];

        // Unificar eliminando duplicados por ID
        const fotosIds = new Set(fotosIncrustadas.map(f => f.id));
        const todasLasFotos = [...fotosIncrustadas];
        fotosGlobales.forEach(f => {
          if (!fotosIds.has(f.id)) todasLasFotos.push(f);
        });

        // Validación de fotos - Mostrar advertencia pero permitir generar (Requirement 7.2)
        if (todasLasFotos.length === 0) {
          logger.warn('Generando PDF sin fotos', { pozoId: pozoId }, 'EditorPage');
          addToast({
            type: 'warning',
            message: 'Se generará el PDF sin registro fotográfico.',
            duration: 3000,
          });
        }

        addToast({
          type: 'info',
          message: 'Generando PDF...',
        });

        // Crear objeto pozo enriquecido con todas las fotos para la API
        const enrichedPozo = {
          ...pozo,
          fotos: {
            ...pozo.fotos,
            fotos: todasLasFotos
          }
        };

        logger.debug('Pozo enriquecido con fotos para PDF', { totalFotos: todasLasFotos.length }, 'EditorPage');

        // Forzar sincronización inmediata para asegurar que el PDF tenga los últimos cambios
        flush();

        // Generar PDF usando pdfMakeGenerator directamente en el cliente
        // Esto es mucho más robusto para manejar las imágenes locales (blobs)
        try {
          const { pdfMakeGenerator } = await import('@/lib/pdf/pdfMakeGenerator');

          // Obtener el diseño personalizado si existe
          const { useDesignStore } = await import('@/stores/designStore');
          const designStore = useDesignStore.getState();
          const customDesign = customizations.designId
            ? designStore.getVersionById(customizations.designId)
            : designStore.versions.find(v => v.id === customizations.template);

          logger.info('Iniciando generación de PDF con diseño', {
            template: customizations.template,
            hasCustomDesign: !!customDesign,
            designName: customDesign?.name
          }, 'EditorPage');

          const result = await pdfMakeGenerator.generatePDF(syncedState || initialFichaState!, enrichedPozo, {
            pageNumbers: true,
            includeDate: true,
            includePhotos: true
          }, customDesign);

          if (!result.success || !result.blob) {
            throw new Error(result.error || 'Error al generar el PDF con pdfMake');
          }

          const filename = `ficha_${pozo.idPozo?.value || pozo.identificacion.idPozo.value}_${Date.now()}.pdf`;

          // Usar helper de descarga
          const url = URL.createObjectURL(result.blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          addToast({
            type: 'success',
            message: 'PDF generado correctamente',
          });
        } catch (error) {
          logger.error('Error en el manejador de generación de PDF', error, 'EditorPage');
          console.error('Error:', error);
          addToast({
            type: 'error',
            message: error instanceof Error ? error.message : 'Error al generar PDF',
          });
        }
      }}
      showCustomization={showCustomization}
      isPending={isPending}
      version={version}
      isGlobalScope={customizations.isGlobal}
      onScopeChange={handleScopeChange}
      showWorkflowIndicators={true}
    />
  ) : null;

  return (
    <AppShell>
      <StateGuard state={syncedState} onReset={handleFichaReset}>
        <div className="h-[calc(100vh-8rem)] -m-6">
          <EditorLayout
            editorContent={editorContent}
            previewContent={previewContent}
            toolbar={toolbar}
            mode={viewMode}
            onModeChange={setViewMode}
          />
        </div>
      </StateGuard>
    </AppShell>
  );
}

