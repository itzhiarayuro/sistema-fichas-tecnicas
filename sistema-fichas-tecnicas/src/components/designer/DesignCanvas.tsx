/**
 * DesignCanvas - Canvas profesional con shapes, snap-to-grid, zoom y drag & drop
 * Soporta posicionamiento preciso de 56 campos + figuras geométricas
 */

'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { FichaDesignVersion, FieldPlacement, AvailableField, ShapeElement, ShapeType } from '@/types/fichaDesign';
import { useDesignStore } from '@/stores/designStore';

interface DesignCanvasProps {
    version: FichaDesignVersion | null;
    selectedPlacementId: string | null;
    selectedShapeId: string | null;
    onSelectPlacement: (id: string | null) => void;
    onSelectShape: (id: string | null) => void;
    zoom: number;
    snapToGrid: boolean;
    gridSize: number;
    pendingShape: ShapeType | null;
    onShapeAdded?: () => void;
}

export function DesignCanvas({
    version,
    selectedPlacementId,
    selectedShapeId,
    onSelectPlacement,
    onSelectShape,
    zoom,
    snapToGrid,
    gridSize,
    pendingShape,
    onShapeAdded
}: DesignCanvasProps) {
    const { updatePlacement, addPlacement, updateShape, addShape } = useDesignStore();
    const canvasRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialX: 0, initialY: 0 });
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, initialW: 0, initialH: 0 });

    const MM_TO_PX = 3.78;

    const canvasWidth = version ? (version.pageSize === 'A4' ? 210 : 215.9) * MM_TO_PX * zoom : 0;
    const canvasHeight = version ? (version.pageSize === 'A4' ? 297 : 279.4) * MM_TO_PX * zoom : 0;

    const snapValue = useCallback((value: number) => {
        if (!snapToGrid) return value;
        return Math.round(value / gridSize) * gridSize;
    }, [snapToGrid, gridSize]);

    // Drag & Drop desde FieldsPanel
    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!canvasRef.current || !version) return;

        try {
            const fieldData: AvailableField = JSON.parse(e.dataTransfer.getData('application/json'));
            const rect = canvasRef.current.getBoundingClientRect();

            const x = snapValue((e.clientX - rect.left) / (MM_TO_PX * zoom));
            const y = snapValue((e.clientY - rect.top) / (MM_TO_PX * zoom));

            const newPlacement: Omit<FieldPlacement, 'id'> = {
                fieldId: fieldData.id,
                x,
                y,
                width: fieldData.defaultWidth,
                height: fieldData.defaultHeight,
                zIndex: version.placements.length + (version.shapes?.length || 0) + 1,
                showLabel: true,
                fontSize: 10,
                fontFamily: 'Inter',
                color: '#000000',
                textAlign: 'left'
            };

            addPlacement(version.id, newPlacement);
        } catch (error) {
            console.error('Error al agregar campo:', error);
        }
    }, [version, zoom, snapValue, addPlacement]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    // Click en canvas para agregar shape
    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!pendingShape || !canvasRef.current || !version) return;

        // Solo procesar si el click es directamente en el canvas
        if (e.target !== e.currentTarget) return;

        e.stopPropagation();
        const rect = canvasRef.current.getBoundingClientRect();
        const x = snapValue((e.clientX - rect.left) / (MM_TO_PX * zoom));
        const y = snapValue((e.clientY - rect.top) / (MM_TO_PX * zoom));

        const defaultSizes: Record<ShapeType, { width: number; height: number }> = {
            rectangle: { width: 50, height: 30 },
            circle: { width: 40, height: 40 },
            line: { width: 80, height: 2 },
            text: { width: 100, height: 15 }
        };

        const size = defaultSizes[pendingShape];

        const newShape: Omit<ShapeElement, 'id'> = {
            type: pendingShape,
            x,
            y,
            width: size.width,
            height: size.height,
            zIndex: version.placements.length + (version.shapes?.length || 0) + 1,
            fillColor: pendingShape === 'text' ? 'transparent' : '#E5E7EB',
            strokeColor: '#374151',
            strokeWidth: 1,
            content: pendingShape === 'text' ? 'Texto' : undefined,
            fontSize: pendingShape === 'text' ? 12 : undefined,
            fontFamily: pendingShape === 'text' ? 'Inter' : undefined,
            color: pendingShape === 'text' ? '#000000' : undefined
        };

        addShape(version.id, newShape);
        onShapeAdded?.();
    }, [pendingShape, version, zoom, snapValue, addShape, onShapeAdded]);

    // Drag de placements existentes
    const handlePlacementMouseDown = useCallback((e: React.MouseEvent, placement: FieldPlacement) => {
        e.stopPropagation();
        onSelectPlacement(placement.id);
        onSelectShape(null);
        setIsDragging(true);
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            initialX: placement.x,
            initialY: placement.y,
        });
    }, [onSelectPlacement, onSelectShape]);

    // Drag de shapes existentes
    const handleShapeMouseDown = useCallback((e: React.MouseEvent, shape: ShapeElement) => {
        e.stopPropagation();
        onSelectShape(shape.id);
        onSelectPlacement(null);
        setIsDragging(true);
        setDragStart({
            x: e.clientX,
            y: e.clientY,
            initialX: shape.x,
            initialY: shape.y,
        });
    }, [onSelectShape, onSelectPlacement]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !version) return;

        const dx = (e.clientX - dragStart.x) / (MM_TO_PX * zoom);
        const dy = (e.clientY - dragStart.y) / (MM_TO_PX * zoom);

        const newX = snapValue(dragStart.initialX + dx);
        const newY = snapValue(dragStart.initialY + dy);

        if (selectedPlacementId) {
            updatePlacement(version.id, selectedPlacementId, { x: newX, y: newY });
        } else if (selectedShapeId) {
            updateShape(version.id, selectedShapeId, { x: newX, y: newY });
        }
    }, [isDragging, selectedPlacementId, selectedShapeId, version, dragStart, zoom, snapValue, updatePlacement, updateShape]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
    }, []);

    // Resize handles
    const handleResizeMouseDown = useCallback((e: React.MouseEvent, item: FieldPlacement | ShapeElement) => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            initialW: item.width,
            initialH: item.height,
        });
    }, []);

    const handleResizeMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing || (!selectedPlacementId && !selectedShapeId) || !version) return;

        const dw = (e.clientX - resizeStart.x) / (MM_TO_PX * zoom);
        const dh = (e.clientY - resizeStart.y) / (MM_TO_PX * zoom);

        const newW = Math.max(10, snapValue(resizeStart.initialW + dw));
        const newH = Math.max(5, snapValue(resizeStart.initialH + dh));

        if (selectedPlacementId) {
            updatePlacement(version.id, selectedPlacementId, { width: newW, height: newH });
        } else if (selectedShapeId) {
            updateShape(version.id, selectedShapeId, { width: newW, height: newH });
        }
    }, [isResizing, selectedPlacementId, selectedShapeId, version, resizeStart, zoom, snapValue, updatePlacement, updateShape]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleResizeMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleResizeMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isResizing, handleResizeMouseMove, handleMouseUp]);

    if (!version) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-100">
                <div className="text-center text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm">Selecciona una versión para comenzar</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={canvasRef}
            className={`relative bg-white shadow-2xl mx-auto ${pendingShape ? 'cursor-crosshair' : ''}`}
            style={{
                width: version.orientation === 'portrait' ? canvasWidth : canvasHeight,
                height: version.orientation === 'portrait' ? canvasHeight : canvasWidth,
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={handleCanvasClick}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    onSelectPlacement(null);
                    onSelectShape(null);
                }
            }}
        >
            {/* Grid */}
            {snapToGrid && (
                <div
                    className="absolute inset-0 pointer-events-none opacity-10"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, #cbd5e1 1px, transparent 1px),
                            linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)
                        `,
                        backgroundSize: `${gridSize * MM_TO_PX * zoom}px ${gridSize * MM_TO_PX * zoom}px`
                    }}
                />
            )}

            {/* Shapes */}
            {version.shapes?.map((shape) => {
                const isSelected = selectedShapeId === shape.id;

                if (shape.type === 'rectangle') {
                    return (
                        <div
                            key={shape.id}
                            onMouseDown={(e) => handleShapeMouseDown(e, shape)}
                            className={`absolute cursor-move select-none transition-shadow ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2 z-50' : 'hover:ring-1 hover:ring-gray-300'
                                }`}
                            style={{
                                left: `${shape.x * MM_TO_PX * zoom}px`,
                                top: `${shape.y * MM_TO_PX * zoom}px`,
                                width: `${shape.width * MM_TO_PX * zoom}px`,
                                height: `${shape.height * MM_TO_PX * zoom}px`,
                                backgroundColor: shape.fillColor || 'transparent',
                                border: shape.strokeColor ? `${shape.strokeWidth || 1}px solid ${shape.strokeColor}` : 'none',
                                borderRadius: shape.borderRadius ? `${shape.borderRadius}px` : 0,
                                zIndex: shape.zIndex
                            }}
                        >
                            {isSelected && (
                                <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, shape)}
                                    className="absolute bottom-0 right-0 w-3 h-3 bg-purple-500 rounded-tl cursor-nwse-resize"
                                />
                            )}
                        </div>
                    );
                }

                if (shape.type === 'circle') {
                    return (
                        <div
                            key={shape.id}
                            onMouseDown={(e) => handleShapeMouseDown(e, shape)}
                            className={`absolute rounded-full cursor-move select-none transition-shadow ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2 z-50' : 'hover:ring-1 hover:ring-gray-300'
                                }`}
                            style={{
                                left: `${shape.x * MM_TO_PX * zoom}px`,
                                top: `${shape.y * MM_TO_PX * zoom}px`,
                                width: `${shape.width * MM_TO_PX * zoom}px`,
                                height: `${shape.height * MM_TO_PX * zoom}px`,
                                backgroundColor: shape.fillColor || 'transparent',
                                border: shape.strokeColor ? `${shape.strokeWidth || 1}px solid ${shape.strokeColor}` : 'none',
                                zIndex: shape.zIndex
                            }}
                        >
                            {isSelected && (
                                <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, shape)}
                                    className="absolute bottom-0 right-0 w-3 h-3 bg-purple-500 rounded-tl cursor-nwse-resize"
                                />
                            )}
                        </div>
                    );
                }

                if (shape.type === 'line') {
                    return (
                        <div
                            key={shape.id}
                            onMouseDown={(e) => handleShapeMouseDown(e, shape)}
                            className={`absolute cursor-move select-none transition-shadow ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2 z-50' : 'hover:ring-1 hover:ring-gray-300'
                                }`}
                            style={{
                                left: `${shape.x * MM_TO_PX * zoom}px`,
                                top: `${shape.y * MM_TO_PX * zoom}px`,
                                width: `${shape.width * MM_TO_PX * zoom}px`,
                                height: `${(shape.strokeWidth || 1) * zoom}px`,
                                backgroundColor: shape.strokeColor || '#000000',
                                zIndex: shape.zIndex
                            }}
                        >
                            {isSelected && (
                                <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, shape)}
                                    className="absolute bottom-0 right-0 w-3 h-3 bg-purple-500 rounded-tl cursor-nwse-resize"
                                />
                            )}
                        </div>
                    );
                }

                if (shape.type === 'text') {
                    return (
                        <div
                            key={shape.id}
                            onMouseDown={(e) => handleShapeMouseDown(e, shape)}
                            className={`absolute cursor-move select-none transition-shadow flex items-center ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2 z-50' : 'hover:ring-1 hover:ring-gray-300'
                                }`}
                            style={{
                                left: `${shape.x * MM_TO_PX * zoom}px`,
                                top: `${shape.y * MM_TO_PX * zoom}px`,
                                width: `${shape.width * MM_TO_PX * zoom}px`,
                                height: `${shape.height * MM_TO_PX * zoom}px`,
                                fontSize: `${(shape.fontSize || 12) * zoom}px`,
                                fontFamily: shape.fontFamily || 'Inter',
                                fontWeight: shape.fontWeight || 'normal',
                                color: shape.color || '#000000',
                                textAlign: shape.textAlign || 'left',
                                zIndex: shape.zIndex
                            }}
                        >
                            {shape.content || 'Texto'}
                            {isSelected && (
                                <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, shape)}
                                    className="absolute bottom-0 right-0 w-3 h-3 bg-purple-500 rounded-tl cursor-nwse-resize"
                                />
                            )}
                        </div>
                    );
                }

                return null;
            })}

            {/* Placements */}
            {version.placements.map((placement) => (
                <div
                    key={placement.id}
                    onMouseDown={(e) => handlePlacementMouseDown(e, placement)}
                    className={`absolute cursor-move select-none transition-shadow ${selectedPlacementId === placement.id
                        ? 'ring-2 ring-primary ring-offset-2 z-50'
                        : 'hover:ring-1 hover:ring-gray-300'
                        }`}
                    style={{
                        left: `${placement.x * MM_TO_PX * zoom}px`,
                        top: `${placement.y * MM_TO_PX * zoom}px`,
                        width: `${placement.width * MM_TO_PX * zoom}px`,
                        height: `${placement.height * MM_TO_PX * zoom}px`,
                        zIndex: placement.zIndex,
                        backgroundColor: placement.backgroundColor || 'rgba(255,255,255,0.9)',
                        borderRadius: placement.borderRadius ? `${placement.borderRadius}px` : 0,
                        padding: placement.padding ? `${placement.padding}px` : '4px',
                        border: '1px solid #e5e7eb'
                    }}
                >
                    {placement.showLabel && (
                        <div className="text-[8px] text-gray-400 font-medium mb-1 truncate">
                            {placement.customLabel || `Campo ${placement.fieldId}`}
                        </div>
                    )}

                    <div
                        className="font-medium truncate"
                        style={{
                            fontSize: `${(placement.fontSize || 10) * zoom}px`,
                            fontFamily: placement.fontFamily || 'Inter',
                            fontWeight: placement.fontWeight || 'normal',
                            color: placement.color || '#000000',
                            textAlign: placement.textAlign || 'left'
                        }}
                    >
                        {`{{${placement.fieldId}}}`}
                    </div>

                    {selectedPlacementId === placement.id && (
                        <div
                            onMouseDown={(e) => handleResizeMouseDown(e, placement)}
                            className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-tl cursor-nwse-resize"
                        />
                    )}
                </div>
            ))}

            {/* Drop Zone Indicator */}
            {version.placements.length === 0 && (!version.shapes || version.shapes.length === 0) && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="text-center text-gray-300">
                        <svg className="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm font-medium">Arrastra campos o haz clic en figuras</p>
                    </div>
                </div>
            )}
        </div>
    );
}
