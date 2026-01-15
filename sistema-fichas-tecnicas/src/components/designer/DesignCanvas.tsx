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
    pendingField: AvailableField | null;
    pendingImageData?: string | null;
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
    pendingField,
    pendingImageData,
    onShapeAdded
}: DesignCanvasProps) {
    const { updatePlacement, addPlacement, removePlacement, updateShape, addShape, removeShape } = useDesignStore();
    const canvasRef = useRef<HTMLDivElement>(null);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // No actuar si está escribiendo en un input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (!version) return;

            // ELIMINAR con Delete o Backspace
            if (e.key === 'Delete') {
                if (selectedPlacementId) {
                    removePlacement(version.id, selectedPlacementId);
                    onSelectPlacement(null);
                } else if (selectedShapeId) {
                    removeShape(version.id, selectedShapeId);
                    onSelectShape(null);
                }
            }

            // MOVER con flechas
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                const step = e.shiftKey ? 5 : 1;
                const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
                const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

                if (dx === 0 && dy === 0) return;
                e.preventDefault();

                if (selectedPlacementId) {
                    const p = version.placements.find(item => item.id === selectedPlacementId);
                    if (p) updatePlacement(version.id, selectedPlacementId, { x: p.x + dx, y: p.y + dy });
                } else if (selectedShapeId) {
                    const s = version.shapes.find(item => item.id === selectedShapeId);
                    if (s) updateShape(version.id, selectedShapeId, { x: s.x + dx, y: s.y + dy });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [version, selectedPlacementId, selectedShapeId, removePlacement, removeShape, onSelectPlacement, onSelectShape, updatePlacement, updateShape]);


    // Refs para evitar lag de re-renderizado durante drag
    const isDraggingRef = useRef(false);
    const dragElementIdRef = useRef<string | null>(null);
    const dragElementTypeRef = useRef<'placement' | 'shape' | null>(null);
    const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

    const isResizingRef = useRef(false);
    const resizeStartRef = useRef({ x: 0, y: 0, initialW: 0, initialH: 0 });

    // Estado para "dibujo interactivo" (drag to create)
    const [drawingState, setDrawingState] = useState<{
        active: boolean;
        startX: number;
        startY: number;
        currX: number;
        currY: number;
    } | null>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

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

    // Finalizar creación de elemento (al soltar el mouse)
    const finalizeCreation = useCallback((x1: number, y1: number, x2: number, y2: number) => {
        if (!version) return;

        const x = Math.min(x1, x2);
        const y = Math.min(y1, y2);
        const width = Math.max(2, Math.abs(x2 - x1));
        const height = Math.max(2, Math.abs(y2 - y1));

        if (pendingField) {
            const newPlacement: Omit<FieldPlacement, 'id'> = {
                fieldId: pendingField.id,
                x,
                y,
                width: pendingField.defaultWidth,
                height: pendingField.defaultHeight,
                zIndex: version.placements.length + (version.shapes?.length || 0) + 1,
                showLabel: true,
                fontSize: 10,
                fontFamily: 'Inter',
                color: '#000000',
                textAlign: 'left'
            };
            addPlacement(version.id, newPlacement);
            onShapeAdded?.();
        } else if (pendingShape) {
            const newShape: Omit<ShapeElement, 'id'> = {
                type: pendingShape,
                x,
                y,
                width: pendingShape === 'line' ? Math.max(width, height) : width,
                height: pendingShape === 'line' ? 2 : height,
                zIndex: version.placements.length + (version.shapes?.length || 0) + 1,
                fillColor: pendingShape === 'text' ? 'transparent' : '#E5E7EB',
                strokeColor: '#374151',
                strokeWidth: 1,
                content: pendingShape === 'text' ? 'Texto' : undefined,
                fontSize: pendingShape === 'text' ? 12 : undefined,
                fontFamily: pendingShape === 'text' ? 'Inter' : undefined,
                color: pendingShape === 'text' ? '#000000' : undefined,
                imageUrl: pendingShape === 'image' ? (pendingImageData || undefined) : undefined,
                opacity: 1
            };
            addShape(version.id, newShape);
            onShapeAdded?.();
        }
    }, [version, pendingField, pendingShape, pendingImageData, addPlacement, addShape, onShapeAdded]);

    // Evento MouseDown en el CANVAS (para dibujo y deselección)
    const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Solo actuar si es clic directo en el canvas o la grid
        if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('pointer-events-none')) {
            return;
        }

        if (pendingShape || pendingField) {
            if (!canvasRef.current || !version) return;

            const rect = canvasRef.current.getBoundingClientRect();
            const x = snapValue((e.clientX - rect.left) / (MM_TO_PX * zoom));
            const y = snapValue((e.clientY - rect.top) / (MM_TO_PX * zoom));

            setDrawingState({
                active: true,
                startX: x,
                startY: y,
                currX: x,
                currY: y
            });
            return;
        }

        // Si no hay nada pendiente, deseleccionar
        onSelectPlacement(null);
        onSelectShape(null);
    }, [pendingShape, pendingField, version, zoom, snapValue, onSelectPlacement, onSelectShape]);


    // Drag de placements existentes
    const handlePlacementMouseDown = useCallback((e: React.MouseEvent, placement: FieldPlacement) => {
        e.stopPropagation();
        if (placement.isLocked) return;

        onSelectPlacement(placement.id);
        onSelectShape(null);

        isDraggingRef.current = true;
        dragElementTypeRef.current = 'placement';
        dragElementIdRef.current = placement.id;
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            initialX: placement.x,
            initialY: placement.y,
        };
        setIsDragging(true);
    }, [onSelectPlacement, onSelectShape]);

    // Drag de shapes existentes
    const handleShapeMouseDown = useCallback((e: React.MouseEvent, shape: ShapeElement) => {
        e.stopPropagation();
        if (shape.isLocked) return;

        onSelectShape(shape.id);
        onSelectPlacement(null);

        isDraggingRef.current = true;
        dragElementTypeRef.current = 'shape';
        dragElementIdRef.current = shape.id;
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            initialX: shape.x,
            initialY: shape.y,
        };
        setIsDragging(true);
    }, [onSelectShape, onSelectPlacement]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!version) return;

        // Caso 1: Dibujando nuevo elemento
        if (drawingState?.active) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            const x = snapValue((e.clientX - rect.left) / (MM_TO_PX * zoom));
            const y = snapValue((e.clientY - rect.top) / (MM_TO_PX * zoom));

            setDrawingState(prev => prev ? { ...prev, currX: x, currY: y } : null);
            return;
        }

        // Caso 2: Redimensionando existente
        if (isResizingRef.current) {
            const dw = (e.clientX - resizeStartRef.current.x) / (MM_TO_PX * zoom);
            const dh = (e.clientY - resizeStartRef.current.y) / (MM_TO_PX * zoom);

            const newW = Math.max(2, snapValue(resizeStartRef.current.initialW + dw));
            const newH = Math.max(2, snapValue(resizeStartRef.current.initialH + dh));

            if (selectedPlacementId) {
                updatePlacement(version.id, selectedPlacementId, { width: newW, height: newH });
            } else if (selectedShapeId) {
                updateShape(version.id, selectedShapeId, { width: newW, height: newH });
            }
            return;
        }

        // Caso 3: Moviendo existente
        if (isDraggingRef.current) {
            const dx = (e.clientX - dragStartRef.current.x) / (MM_TO_PX * zoom);
            const dy = (e.clientY - dragStartRef.current.y) / (MM_TO_PX * zoom);

            const newX = snapValue(dragStartRef.current.initialX + dx);
            const newY = snapValue(dragStartRef.current.initialY + dy);

            if (dragElementTypeRef.current === 'placement' && dragElementIdRef.current) {
                updatePlacement(version.id, dragElementIdRef.current, { x: newX, y: newY });
            } else if (dragElementTypeRef.current === 'shape' && dragElementIdRef.current) {
                updateShape(version.id, dragElementIdRef.current, { x: newX, y: newY });
            }
        }
    }, [version, drawingState, zoom, snapValue, selectedPlacementId, selectedShapeId, updatePlacement, updateShape]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        if (drawingState?.active) {
            finalizeCreation(drawingState.startX, drawingState.startY, drawingState.currX, drawingState.currY);
            setDrawingState(null);
        }

        isDraggingRef.current = false;
        isResizingRef.current = false;
        dragElementIdRef.current = null;
        dragElementTypeRef.current = null;
        setIsDragging(false);
        setIsResizing(false);
    }, [drawingState, finalizeCreation]);

    // Resize handles
    const handleResizeMouseDown = useCallback((e: React.MouseEvent, item: FieldPlacement | ShapeElement) => {
        e.stopPropagation();
        if (item.isLocked) return;

        isResizingRef.current = true;
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            initialW: item.width,
            initialH: item.height,
        };
        setIsResizing(true);
    }, []);

    useEffect(() => {
        if (isDragging || isResizing || drawingState?.active) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, drawingState?.active, handleMouseMove, handleMouseUp]);

    if (!version) return null;

    return (
        <div
            ref={canvasRef}
            className={`relative bg-white shadow-2xl mx-auto ${(pendingShape || pendingField) ? 'cursor-crosshair' : ''}`}
            style={{
                width: version.orientation === 'portrait' ? canvasWidth : canvasHeight,
                height: version.orientation === 'portrait' ? canvasHeight : canvasWidth,
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onMouseDown={handleCanvasMouseDown}
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
                const isHidden = shape.isVisible === false;

                if (isHidden) return null;

                if (shape.type === 'rectangle') {
                    return (
                        <div
                            key={shape.id}
                            onMouseDown={(e) => handleShapeMouseDown(e, shape)}
                            className={`absolute cursor-move select-none transition-shadow ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 z-50' : 'hover:ring-1 hover:ring-gray-300'}`}
                            style={{
                                left: `${shape.x * MM_TO_PX * zoom}px`,
                                top: `${shape.y * MM_TO_PX * zoom}px`,
                                width: `${shape.width * MM_TO_PX * zoom}px`,
                                height: `${shape.height * MM_TO_PX * zoom}px`,
                                backgroundColor: shape.fillColor || 'transparent',
                                border: shape.strokeColor ? `${shape.strokeWidth || 1}px solid ${shape.strokeColor}` : 'none',
                                borderRadius: shape.borderRadius ? `${shape.borderRadius}px` : 0,
                                opacity: shape.opacity ?? 1,
                                zIndex: shape.zIndex,
                                pointerEvents: shape.isLocked ? 'none' : 'auto'
                            }}
                        >
                            {isSelected && !shape.isLocked && (
                                <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, shape)}
                                    className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-tl cursor-nwse-resize"
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
                            className={`absolute rounded-full cursor-move select-none transition-shadow ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 z-50' : 'hover:ring-1 hover:ring-gray-300'}`}
                            style={{
                                left: `${shape.x * MM_TO_PX * zoom}px`,
                                top: `${shape.y * MM_TO_PX * zoom}px`,
                                width: `${shape.width * MM_TO_PX * zoom}px`,
                                height: `${shape.height * MM_TO_PX * zoom}px`,
                                backgroundColor: shape.fillColor || 'transparent',
                                border: shape.strokeColor ? `${shape.strokeWidth || 1}px solid ${shape.strokeColor}` : 'none',
                                opacity: shape.opacity ?? 1,
                                zIndex: shape.zIndex,
                                pointerEvents: shape.isLocked ? 'none' : 'auto'
                            }}
                        >
                            {isSelected && !shape.isLocked && (
                                <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, shape)}
                                    className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-tl cursor-nwse-resize"
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
                            className={`absolute cursor-move select-none transition-shadow ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 z-50' : 'hover:ring-1 hover:ring-gray-300'}`}
                            style={{
                                left: `${shape.x * MM_TO_PX * zoom}px`,
                                top: `${shape.y * MM_TO_PX * zoom}px`,
                                width: `${shape.width * MM_TO_PX * zoom}px`,
                                height: `${(shape.strokeWidth || 1) * zoom}px`,
                                backgroundColor: shape.strokeColor || '#000000',
                                opacity: shape.opacity ?? 1,
                                zIndex: shape.zIndex,
                                pointerEvents: shape.isLocked ? 'none' : 'auto'
                            }}
                        >
                            {isSelected && !shape.isLocked && (
                                <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, shape)}
                                    className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-tl cursor-nwse-resize"
                                />
                            )}
                        </div>
                    );
                }

                if (shape.type === 'triangle') {
                    return (
                        <div
                            key={shape.id}
                            onMouseDown={(e) => handleShapeMouseDown(e, shape)}
                            className={`absolute cursor-move select-none transition-shadow ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 z-50' : 'hover:ring-1 hover:ring-gray-300'}`}
                            style={{
                                left: `${shape.x * MM_TO_PX * zoom}px`,
                                top: `${shape.y * MM_TO_PX * zoom}px`,
                                width: `${shape.width * MM_TO_PX * zoom}px`,
                                height: `${shape.height * MM_TO_PX * zoom}px`,
                                opacity: shape.opacity ?? 1,
                                zIndex: shape.zIndex,
                                pointerEvents: shape.isLocked ? 'none' : 'auto'
                            }}
                        >
                            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <polygon
                                    points="50,0 100,100 0,100"
                                    fill={shape.fillColor || 'transparent'}
                                    stroke={shape.strokeColor || '#374151'}
                                    strokeWidth={shape.strokeWidth ? (shape.strokeWidth * (100 / (shape.width * MM_TO_PX * zoom))) : 1}
                                />
                            </svg>
                            {isSelected && !shape.isLocked && (
                                <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, shape)}
                                    className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-tl cursor-nwse-resize"
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
                            className={`absolute cursor-move select-none transition-shadow flex items-center ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 z-50' : 'hover:ring-1 hover:ring-gray-300'}`}
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
                                opacity: shape.opacity ?? 1,
                                zIndex: shape.zIndex,
                                pointerEvents: shape.isLocked ? 'none' : 'auto'
                            }}
                        >
                            {shape.content || 'Texto'}
                            {isSelected && !shape.isLocked && (
                                <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, shape)}
                                    className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-tl cursor-nwse-resize"
                                />
                            )}
                        </div>
                    );
                }

                if (shape.type === 'image') {
                    return (
                        <div
                            key={shape.id}
                            onMouseDown={(e) => handleShapeMouseDown(e, shape)}
                            className={`absolute cursor-move select-none transition-shadow ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 z-50' : 'hover:ring-1 hover:ring-gray-300'}`}
                            style={{
                                left: `${shape.x * MM_TO_PX * zoom}px`,
                                top: `${shape.y * MM_TO_PX * zoom}px`,
                                width: `${shape.width * MM_TO_PX * zoom}px`,
                                height: `${shape.height * MM_TO_PX * zoom}px`,
                                opacity: shape.opacity ?? 1,
                                zIndex: shape.zIndex,
                                pointerEvents: shape.isLocked ? 'none' : 'auto'
                            }}
                        >
                            {shape.imageUrl ? (
                                <img
                                    src={shape.imageUrl}
                                    alt="User asset"
                                    className="w-full h-full object-contain pointer-events-none"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            )}
                            {isSelected && !shape.isLocked && (
                                <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, shape)}
                                    className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-tl cursor-nwse-resize"
                                />
                            )}
                        </div>
                    );
                }

                return null;
            })}

            {/* Placements */}
            {version.placements.map((placement) => {
                if (placement.isVisible === false) return null;

                return (
                    <div
                        key={placement.id}
                        onMouseDown={(e) => handlePlacementMouseDown(e, placement)}
                        className={`absolute cursor-move select-none transition-shadow ${selectedPlacementId === placement.id
                            ? 'ring-2 ring-blue-500 ring-offset-2 z-50 shadow-lg'
                            : 'hover:ring-1 hover:ring-blue-300'
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
                            border: '1px solid #e5e7eb',
                            pointerEvents: placement.isLocked ? 'none' : 'auto',
                            opacity: placement.isLocked ? 0.8 : 1
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

                        {selectedPlacementId === placement.id && !placement.isLocked && (
                            <div
                                onMouseDown={(e) => handleResizeMouseDown(e, placement)}
                                className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-tl cursor-nwse-resize shadow-sm"
                            />
                        )}
                    </div>
                );
            })}

            {/* Ghost drawing element */}
            {drawingState?.active && (
                <div
                    className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-[100]"
                    style={{
                        left: `${Math.min(drawingState.startX, drawingState.currX) * MM_TO_PX * zoom}px`,
                        top: `${Math.min(drawingState.startY, drawingState.currY) * MM_TO_PX * zoom}px`,
                        width: `${Math.abs(drawingState.currX - drawingState.startX) * MM_TO_PX * zoom}px`,
                        height: `${Math.abs(drawingState.currY - drawingState.startY) * MM_TO_PX * zoom}px`,
                        borderRadius: pendingShape === 'circle' ? '50%' : '0px'
                    }}
                />
            )}

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
