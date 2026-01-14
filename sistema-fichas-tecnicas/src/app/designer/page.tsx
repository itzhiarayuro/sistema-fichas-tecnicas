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
    ResizeHandle
} from '@/components/designer';
import { useDesignStore } from '@/stores/designStore';
import { useUIStore } from '@/stores';
import type { AvailableField, ShapeType } from '@/types/fichaDesign';

export default function DesignerPage() {
    const [mounted, setMounted] = useState(false);
    const { versions, currentVersionId, setCurrentVersion, createVersion, getCurrentVersion } = useDesignStore();
    const { addToast, designerPanels, setDesignerPanelWidth } = useUIStore();

    const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
    const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(0.75);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [gridSize, setGridSize] = useState(5);
    const [draggedField, setDraggedField] = useState<AvailableField | null>(null);
    const [pendingShape, setPendingShape] = useState<ShapeType | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    // Inicializar con una versión por defecto
    useEffect(() => {
        if (versions.length === 0) {
            const id = createVersion('Diseño Base', 'Plantilla inicial en blanco');
            setCurrentVersion(id);
        } else if (!currentVersionId) {
            setCurrentVersion(versions[0].id);
        }
    }, [versions, currentVersionId, createVersion, setCurrentVersion]);

    const currentVersion = getCurrentVersion();

    const handleVersionSelect = (id: string) => {
        setCurrentVersion(id);
        setSelectedPlacementId(null);
        setSelectedShapeId(null);
    };

    const handleFieldDragStart = (field: AvailableField) => {
        setDraggedField(field);
        setPendingShape(null);
    };

    const handleShapeSelect = (shapeType: ShapeType) => {
        setPendingShape(shapeType);
        setSelectedPlacementId(null);
        setSelectedShapeId(null);
        addToast({ type: 'info', message: `Haz clic en el canvas para agregar ${shapeType}` });
    };

    const handleSelectPlacement = (id: string | null) => {
        setSelectedPlacementId(id);
        setSelectedShapeId(null);
        setPendingShape(null);
    };

    const handleSelectShape = (id: string | null) => {
        setSelectedShapeId(id);
        setSelectedPlacementId(null);
        setPendingShape(null);
    };

    if (!mounted) {
        return (
            <AppShell>
                <div className="flex items-center justify-center h-[calc(100vh-8rem)] -m-6">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-gray-500">Cargando diseñador...</p>
                    </div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="flex flex-col h-[calc(100vh-8rem)] -m-6 bg-gradient-to-br from-gray-50 to-gray-100">
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

                <div className="flex flex-1 overflow-hidden">
                    {/* Panel Izquierdo 1: Versiones */}
                    {designerPanels.showDesigns && (
                        <>
                            <div style={{ width: designerPanels.designsWidth }} className="flex-shrink-0 flex overflow-hidden">
                                <VersionManager
                                    currentVersionId={currentVersionId}
                                    onVersionSelect={handleVersionSelect}
                                />
                            </div>
                            <ResizeHandle
                                direction="right"
                                initialWidth={designerPanels.designsWidth}
                                onResize={(w: number) => setDesignerPanelWidth('designs', w)}
                            />
                        </>
                    )}

                    {/* Panel Izquierdo 2: Campos + Shapes */}
                    {designerPanels.showElements && (
                        <>
                            <div style={{ width: designerPanels.elementsWidth }} className="flex-shrink-0 flex flex-col overflow-hidden">
                                <div className="flex-1 overflow-hidden">
                                    <FieldsPanel onFieldDragStart={handleFieldDragStart} />
                                </div>
                                <div className="border-t border-gray-200">
                                    <ShapesPanel onShapeSelect={handleShapeSelect} />
                                </div>
                            </div>
                            <ResizeHandle
                                direction="right"
                                initialWidth={designerPanels.elementsWidth}
                                onResize={(w: number) => setDesignerPanelWidth('elements', w)}
                            />
                        </>
                    )}

                    {/* Área Central: Canvas */}
                    <main className="flex-1 relative overflow-auto p-8 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        {pendingShape && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg z-10 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                </svg>
                                Haz clic en el canvas para agregar {pendingShape}
                                <button
                                    onClick={() => setPendingShape(null)}
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
                            selectedPlacementId={selectedPlacementId}
                            selectedShapeId={selectedShapeId}
                            onSelectPlacement={handleSelectPlacement}
                            onSelectShape={handleSelectShape}
                            zoom={zoom}
                            snapToGrid={snapToGrid}
                            gridSize={gridSize}
                            pendingShape={pendingShape}
                            onShapeAdded={() => setPendingShape(null)}
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
                            <div style={{ width: designerPanels.propertiesWidth }} className="flex-shrink-0 flex overflow-hidden">
                                <PropertiesPanel
                                    version={currentVersion}
                                    selectedPlacementId={selectedPlacementId}
                                    selectedShapeId={selectedShapeId}
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
