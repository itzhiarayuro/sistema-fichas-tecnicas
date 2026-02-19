/**
 * DesignerPage - Diseñador Visual Profesional COMPLETO
 * Con 56 campos, figuras geométricas, preview funcional y todas las características
 */

'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout';
import {
    DesignToolbar,
    FieldsPanel,
    ShapesPanel,
    DesignCanvas,
    PropertiesPanel,
    VersionManager,
    DesignPreview,
    ResizeHandle,
    ImagesPanel,
    LayersPanel
} from '@/components/designer';
import { getPresetDesigns } from '@/lib/designPresets';
import { useDesignStore } from '@/stores/designStore';
import { useUIStore } from '@/stores';
import type { AvailableField, ShapeType } from '@/types/fichaDesign';

export default function DesignerPage() {
    const [mounted, setMounted] = useState(false);
    const {
        versions,
        currentVersionId,
        setCurrentVersion,
        addVersion,
        getCurrentVersion,
        selectedPlacementId,
        selectedShapeId,
        setSelectedPlacementId,
        setSelectedShapeId
    } = useDesignStore();
    const { addToast, designerPanels, setDesignerPanelWidth, toggleDesignerPanel } = useUIStore();

    const [zoom, setZoom] = useState(0.6);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [gridSize, setGridSize] = useState(5);
    const [draggedField, setDraggedField] = useState<AvailableField | null>(null);
    const [pendingShape, setPendingShape] = useState<ShapeType | null>(null);
    const [pendingField, setPendingField] = useState<AvailableField | null>(null);
    const [pendingImageData, setPendingImageData] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
        // Colapsar sidebar al entrar al diseñador para maximizar espacio
        useUIStore.getState().setSidebarCollapsed(true);
    }, []);

    // Inicializar con versiones predefinidas si está vacío
    useEffect(() => {
        // Solo agregar presets si no existen ya
        const presets = getPresetDesigns();
        let addedCount = 0;

        presets.forEach(p => {
            // Verificar si ya existe por ID o por nombre
            const exists = versions.some(v => v.id === p.id || v.name === p.name);
            if (!exists) {
                addVersion(p);
                addedCount++;
            }
        });

        // Si se agregaron cosas o estaba vacío y ya no, seleccionar uno
        if (addedCount > 0 && !currentVersionId && versions.length === 0) {
            setCurrentVersion(presets[0].id);
        } else if (!currentVersionId && versions.length > 0) {
            setCurrentVersion(versions[0].id);
        }
    }, [versions, currentVersionId, addVersion, setCurrentVersion]);

    // Limpieza de duplicados al montar
    useEffect(() => {
        const { deduplicateVersions } = useDesignStore.getState();
        deduplicateVersions();
    }, []);

    const currentVersion = getCurrentVersion();

    const handleVersionSelect = (id: string) => {
        setCurrentVersion(id);
    };

    const handleFieldDragStart = (field: AvailableField) => {
        setDraggedField(field);
        setPendingShape(null);
        setPendingField(null);
    };

    const handleFieldSelect = (field: AvailableField) => {
        setPendingField(field);
        setPendingShape(null);
        setSelectedPlacementId(null);
        setSelectedShapeId(null);
        addToast({ type: 'info', message: `Haz clic en el canvas para agregar el campo: ${field.label}` });
    };

    const handleShapeSelect = (shapeType: ShapeType) => {
        setPendingShape(shapeType);
        setPendingField(null);
        setPendingImageData(null);
        setSelectedPlacementId(null);
        setSelectedShapeId(null);
        addToast({ type: 'info', message: `Haz clic en el canvas para agregar ${shapeType}` });
    };

    const handleImageSelect = (imageData: string) => {
        setPendingShape('image');
        setPendingField(null);
        setPendingImageData(imageData);
        addToast({ type: 'info', message: 'Haz clic en el canvas para agregar la imagen' });
    };

    // Handlers para selección
    const handleSelectPlacementFromLayers = (id: string | null) => {
        setSelectedPlacementId(id);

        // Scroll al elemento en el canvas si existe
        if (id) {
            setTimeout(() => {
                const element = document.querySelector(`[data-placement-id="${id}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }
            }, 100);
        }
    };

    const handleSelectShapeFromLayers = (id: string | null) => {
        setSelectedShapeId(id);

        // Scroll al elemento en el canvas si existe
        if (id) {
            setTimeout(() => {
                const element = document.querySelector(`[data-shape-id="${id}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }
            }, 100);
        }
    };

    // useEffect para abrir propiedades cuando hay selección
    useEffect(() => {
        if ((selectedPlacementId || selectedShapeId) && !designerPanels.showProperties) {
            console.log('🟣 useEffect: Abriendo panel de propiedades...');
            toggleDesignerPanel('properties');
        }
    }, [selectedPlacementId, selectedShapeId, designerPanels.showProperties, toggleDesignerPanel]);

    // Keyboard Shortcuts for Undo/Redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    useDesignStore.getState().undo();
                } else if (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')) {
                    e.preventDefault();
                    useDesignStore.getState().redo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!mounted) {
        return (
            <AppShell noPadding>
                <div className="flex items-center justify-center h-[calc(100vh-4rem)] w-full">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-gray-500">Cargando diseñador...</p>
                    </div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell noPadding>
            <div className="flex flex-col h-[calc(100vh-4rem)] w-full max-w-full bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                {/* Toolbar Superior */}
                <DesignToolbar
                    version={currentVersion}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    snapToGrid={snapToGrid}
                    onSnapToGridChange={setSnapToGrid}
                    gridSize={gridSize}
                    onGridSizeChange={setGridSize}
                    onPreview={() => setShowPreview(true)}
                />

                <div className="flex flex-1 overflow-hidden relative w-full max-w-full">
                    {/* Panel Toggles (Visible on Mobile and Desktop for easy access) */}
                    <div className="absolute top-2 left-2 z-20 flex gap-1">
                        <button
                            onClick={() => toggleDesignerPanel('designs')}
                            className={`p-2 rounded-lg shadow-md transition-all ${designerPanels.showDesigns ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                            title="Versiones"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </button>
                        <button
                            onClick={() => toggleDesignerPanel('elements')}
                            className={`p-2 rounded-lg shadow-md transition-all ${designerPanels.showElements ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                            title="Campos"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                        </button>
                        <button
                            onClick={() => toggleDesignerPanel('layers')}
                            className={`p-2 rounded-lg shadow-md transition-all ${designerPanels.showLayers ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                            title="Capas"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                            </svg>
                        </button>
                    </div>

                    {/* Panel Toggle Derecho: Propiedades */}
                    <div className="absolute top-2 right-2 z-20">
                        <button
                            onClick={() => toggleDesignerPanel('properties')}
                            className={`p-2 rounded-lg shadow-md transition-all ${designerPanels.showProperties ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                            title="Propiedades"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                        </button>
                    </div>

                    {/* Panel Izquierdo 1: Versiones - Oculto en móvil por defecto */}
                    {designerPanels.showDesigns && (
                        <>
                            <div
                                style={{ width: designerPanels.designsWidth }}
                                className="hidden md:flex flex-shrink-0 overflow-hidden"
                            >
                                <VersionManager
                                    currentVersionId={currentVersionId}
                                    onVersionSelect={handleVersionSelect}
                                />
                            </div>
                            {/* Mobile drawer for versions */}
                            <div className={`md:hidden fixed top-0 left-0 h-screen z-30 w-72 max-w-[85vw] bg-white shadow-xl transform transition-transform ${designerPanels.showDesigns ? 'translate-x-0' : '-translate-x-full'}`}>
                                <div className="flex items-center justify-between p-3 border-b bg-indigo-50 flex-shrink-0">
                                    <span className="font-bold text-sm text-indigo-800">Versiones</span>
                                    <button onClick={() => setDesignerPanelWidth('designs', 0)} className="p-1 hover:bg-indigo-100 rounded">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ height: 'calc(100% - 52px)' }}>
                                    <VersionManager
                                        currentVersionId={currentVersionId}
                                        onVersionSelect={(id) => { handleVersionSelect(id); setDesignerPanelWidth('designs', 0); }}
                                    />
                                </div>
                            </div>
                            <ResizeHandle
                                direction="right"
                                initialWidth={designerPanels.designsWidth}
                                onResize={(w: number) => setDesignerPanelWidth('designs', w)}
                            />
                        </>
                    )}

                    {/* Panel Izquierdo 2: Campos + Shapes - Oculto en móvil por defecto */}
                    {designerPanels.showElements && (
                        <>
                            <div
                                style={{ width: designerPanels.elementsWidth }}
                                className="hidden md:flex flex-shrink-0 flex-col overflow-hidden"
                            >
                                <div className="flex-1 overflow-hidden">
                                    <FieldsPanel onFieldDragStart={handleFieldDragStart} onFieldSelect={handleFieldSelect} />
                                </div>
                                <div className="h-1/4 min-h-[120px] border-t border-gray-200">
                                    <ShapesPanel onShapeSelect={handleShapeSelect} />
                                </div>
                                <div className="h-1/4 min-h-[120px] border-t border-gray-200">
                                    <ImagesPanel onImageSelect={handleImageSelect} />
                                </div>
                            </div>
                            {/* Mobile drawer for elements */}
                            <div className={`md:hidden fixed top-0 left-0 h-screen z-30 w-80 max-w-[90vw] bg-white shadow-xl transform transition-transform ${designerPanels.showElements ? 'translate-x-0' : '-translate-x-full'}`}>
                                <div className="flex items-center justify-between p-3 border-b bg-primary/10 flex-shrink-0">
                                    <span className="font-bold text-sm text-primary">Campos y Elementos</span>
                                    <button onClick={() => setDesignerPanelWidth('elements', 0)} className="p-1 hover:bg-primary/20 rounded">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col" style={{ height: 'calc(100% - 52px)' }}>
                                    <div className="flex-1 min-h-[200px]">
                                        <FieldsPanel onFieldDragStart={handleFieldDragStart} onFieldSelect={handleFieldSelect} />
                                    </div>
                                    <div className="border-t flex-shrink-0">
                                        <ShapesPanel onShapeSelect={handleShapeSelect} />
                                    </div>
                                    <div className="border-t flex-shrink-0">
                                        <ImagesPanel onImageSelect={handleImageSelect} />
                                    </div>
                                </div>
                            </div>
                            <ResizeHandle
                                direction="right"
                                initialWidth={designerPanels.elementsWidth}
                                onResize={(w: number) => setDesignerPanelWidth('elements', w)}
                            />
                        </>
                    )}

                    {/* Panel Izquierdo 3: Capas */}
                    {designerPanels.showLayers && (
                        <>
                            <div
                                style={{ width: designerPanels.layersWidth }}
                                className="hidden md:flex flex-shrink-0 overflow-hidden border-r border-gray-200"
                            >
                                <LayersPanel
                                    version={currentVersion}
                                />
                            </div>
                            {/* Mobile drawer for layers */}
                            <div className={`md:hidden fixed top-0 left-0 h-screen z-30 w-72 max-w-[85vw] bg-white shadow-xl transform transition-transform ${designerPanels.showLayers ? 'translate-x-0' : '-translate-x-full'}`}>
                                <div className="flex items-center justify-between p-3 border-b bg-emerald-50 flex-shrink-0">
                                    <span className="font-bold text-sm text-emerald-800">Capas</span>
                                    <button onClick={() => setDesignerPanelWidth('layers', 0)} className="p-1 hover:bg-emerald-100 rounded">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ height: 'calc(100% - 52px)' }}>
                                    <LayersPanel
                                        version={currentVersion}
                                    />
                                </div>
                            </div>
                            <ResizeHandle
                                direction="right"
                                initialWidth={designerPanels.layersWidth}
                                onResize={(w: number) => setDesignerPanelWidth('layers', w)}
                            />
                        </>
                    )}

                    {/* Área Central: Canvas */}
                    <main className="flex-1 relative overflow-auto p-4 md:p-8 bg-gradient-to-br from-gray-100 to-gray-200 min-w-0">
                        {/* Indicador de elemento seleccionado desde canvas */}
                        {(selectedPlacementId || selectedShapeId) && currentVersion && (
                            <div className="absolute top-4 right-4 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 text-emerald-900 px-4 py-3 rounded-lg shadow-xl z-10 max-w-sm">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <svg className="w-5 h-5 text-emerald-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-emerald-700 mb-2 uppercase tracking-wide">Seleccionado</p>

                                        {/* Nombre del elemento */}
                                        <div className="bg-white rounded-md p-2 mb-2 border border-emerald-200">
                                            <p className="text-sm font-bold text-emerald-900 truncate">
                                                {selectedPlacementId
                                                    ? (currentVersion.placements.find(p => p.id === selectedPlacementId)?.customLabel ||
                                                        `Campo ${currentVersion.placements.find(p => p.id === selectedPlacementId)?.fieldId}`)
                                                    : selectedShapeId
                                                        ? (() => {
                                                            const shape = currentVersion.shapes?.find(s => s.id === selectedShapeId);
                                                            return shape?.type === 'text' && shape.content
                                                                ? `Texto: ${shape.content.substring(0, 20)}${shape.content.length > 20 ? '...' : ''}`
                                                                : shape?.type === 'image'
                                                                    ? 'Imagen'
                                                                    : shape?.type ? shape.type.charAt(0).toUpperCase() + shape.type.slice(1) : 'Elemento';
                                                        })()
                                                        : 'Elemento'
                                                }
                                            </p>
                                        </div>

                                        {/* Instrucción */}
                                        <p className="text-[10px] text-emerald-700 flex items-center gap-1 font-medium">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                            Haz clic en capas para editar propiedades
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(pendingShape || pendingField) && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg z-10 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                </svg>
                                Haz clic en el canvas para agregar {pendingField ? `el campo ${pendingField.label}` : pendingShape}
                                <button
                                    onClick={() => { setPendingShape(null); setPendingField(null); }}
                                    className="ml-2 p-1 hover:bg-purple-700 rounded"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        <DesignCanvas
                            version={currentVersion}
                            zoom={zoom}
                            snapToGrid={snapToGrid}
                            gridSize={gridSize}
                            pendingShape={pendingShape}
                            pendingField={pendingField}
                            pendingImageData={pendingImageData}
                            onShapeAdded={() => { setPendingShape(null); setPendingField(null); setPendingImageData(null); }}
                        />
                    </main>

                    {/* Panel Derecho: Propiedades */}
                    {designerPanels.showProperties && (
                        <>
                            <ResizeHandle
                                direction="left"
                                initialWidth={designerPanels.propertiesWidth}
                                onResize={(w: number) => setDesignerPanelWidth('properties', w)}
                            />
                            <div style={{ width: designerPanels.propertiesWidth }} className="flex-shrink-0 flex overflow-hidden border-l border-gray-200">
                                <PropertiesPanel
                                    version={currentVersion}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Preview Modal */}
            {currentVersion && (
                <DesignPreview
                    version={currentVersion}
                    isOpen={showPreview}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </AppShell>
    );
}
