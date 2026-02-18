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

    // Refs para scroll automático
    const selectedElementRef = useRef<HTMLDivElement>(null);

    // Scroll automático cuando se selecciona un elemento desde el panel de capas
    useEffect(() => {
        if (selectedElementRef.current) {
            selectedElementRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
        }
    }, [selectedPlacementId, selectedShapeId]);

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
        pageNumber: number;
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
        if (!version) return;

        try {
            const fieldData: AvailableField = JSON.parse(e.dataTransfer.getData('application/json'));
            const rect = e.currentTarget.getBoundingClientRect();

            const x = snapValue((e.clientX - rect.left) / (MM_TO_PX * zoom));
            const y = snapValue((e.clientY - rect.top) / (MM_TO_PX * zoom));
            const pageNo = (e as any)._pageNumber || 1;

            const newPlacement: Omit<FieldPlacement, 'id'> = {
                fieldId: fieldData.id,
                x,
                y,
                width: fieldData.defaultWidth,
                height: fieldData.defaultHeight,
                zIndex: version.placements.length + (version.shapes?.length || 0) + 1,
                showLabel: true,
                fontSize: 10,
                fontFamily: 'Arial',
                color: '#000000',
                textAlign: 'left',
                pageNumber: pageNo
            };

            addPlacement(version.id, newPlacement);
        } catch (error) {
            console.error('Error al agregar campo:', error);
        }
    }, [version, zoom, snapValue, addPlacement, MM_TO_PX]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    // Finalizar creación de elemento (al soltar el mouse)
    const finalizeCreation = useCallback((x1: number, y1: number, x2: number, y2: number) => {
        if (!version) return;

        const x = Math.min(x1, x2);
        const y = Math.min(y1, y2);
        let width = Math.max(2, Math.abs(x2 - x1));
        let height = Math.max(2, Math.abs(y2 - y1));

        // Si es un clic simple (área muy pequeña), usar tamaño por defecto
        if (width < 3 && height < 3) {
            if (pendingField) {
                width = pendingField.defaultWidth || 40;
                height = pendingField.defaultHeight || 10;
            } else if (pendingShape === 'image') {
                width = 100; // 10cm - tamaño bueno para encabezados como el del usuario
                height = 25;  // 2.5cm
            } else if (pendingShape === 'text') {
                width = 50;
                height = 10;
            } else if (pendingShape === 'line') {
                width = 40;
                height = 2;
            } else {
                width = 30;
                height = 30;
            }
        }

        const pageNo = drawingState?.pageNumber || 1;

        if (pendingField) {
            const newPlacement: Omit<FieldPlacement, 'id'> = {
                fieldId: pendingField.id,
                x,
                y,
                width,
                height,
                zIndex: version.placements.length + (version.shapes?.length || 0) + 1,
                showLabel: true,
                fontSize: 10,
                fontFamily: 'Arial',
                color: '#000000',
                textAlign: 'left',
                pageNumber: pageNo
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
                // CAMBIO: Reducir strokeWidth de 1 a 0.5 para que el borde sea más delgado
                // Antes: strokeWidth: 1,
                strokeWidth: 0.5,
                content: pendingShape === 'text' ? 'Texto' : undefined,
                fontSize: pendingShape === 'text' ? 12 : undefined,
                fontFamily: pendingShape === 'text' ? 'Arial' : undefined,
                color: pendingShape === 'text' ? '#000000' : undefined,
                imageUrl: pendingShape === 'image' ? (pendingImageData || undefined) : undefined,
                opacity: 1,
                pageNumber: pageNo
            };
            addShape(version.id, newShape);
            onShapeAdded?.();
        }
    }, [version, pendingField, pendingShape, pendingImageData, addPlacement, addShape, onShapeAdded, drawingState]);

    // Evento MouseDown en el CANVAS (para dibujo y deselección)
    const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Solo actuar si es clic directo en el canvas (no en un elemento)
        if (e.target !== e.currentTarget) {
            return;
        }

        if (pendingShape || pendingField) {
            if (!version) return;

            const rect = e.currentTarget.getBoundingClientRect();
            const x = snapValue((e.clientX - rect.left) / (MM_TO_PX * zoom));
            const y = snapValue((e.clientY - rect.top) / (MM_TO_PX * zoom));
            const pageNo = (e as any)._pageNumber || 1;

            setDrawingState({
                active: true,
                startX: x,
                startY: y,
                currX: x,
                currY: y,
                pageNumber: pageNo
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
        console.log('🟡 handlePlacementMouseDown - placement:', placement.id);
        if (placement.isLocked) return;

        // Seleccionar SIEMPRE cuando se hace clic
        onSelectPlacement(placement.id);
        onSelectShape(null);

        // Preparar para drag (pero no iniciar aún)
        dragElementTypeRef.current = 'placement';
        dragElementIdRef.current = placement.id;
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            initialX: placement.x,
            initialY: placement.y,
        };
        console.log('🟡 Drag preparado - dragStartRef:', dragStartRef.current);
    }, [onSelectPlacement, onSelectShape]);

    // Drag de shapes existentes
    const handleShapeMouseDown = useCallback((e: React.MouseEvent, shape: ShapeElement) => {
        e.stopPropagation();
        if (shape.isLocked) return;

        // Seleccionar SIEMPRE cuando se hace clic
        onSelectShape(shape.id);
        onSelectPlacement(null);

        // Preparar para drag (pero no iniciar aún)
        dragElementTypeRef.current = 'shape';
        dragElementIdRef.current = shape.id;
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            initialX: shape.x,
            initialY: shape.y,
        };
    }, [onSelectShape, onSelectPlacement]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!version) return;

        // Caso 1: Dibujando nuevo elemento
        if (drawingState?.active) {
            // Encontrar el contenedor de la página actual para el rect
            const pageElement = document.getElementById(`page-container-${drawingState.pageNumber}`);
            const rect = pageElement?.getBoundingClientRect();
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

        // Caso 3: Moviendo existente - SOLO si hay movimiento real
        if (dragElementIdRef.current && dragElementTypeRef.current) {
            const dx = (e.clientX - dragStartRef.current.x) / (MM_TO_PX * zoom);
            const dy = (e.clientY - dragStartRef.current.y) / (MM_TO_PX * zoom);

            // Threshold: solo iniciar drag si se movió más de 2 píxeles
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 2) {
                if (!isDraggingRef.current) {
                    console.log('🟡 Iniciando drag - distance:', distance);
                    isDraggingRef.current = true;
                    setIsDragging(true);
                    document.body.style.cursor = 'grabbing';
                }

                const newX = snapValue(dragStartRef.current.initialX + dx);
                const newY = snapValue(dragStartRef.current.initialY + dy);

                if (dragElementTypeRef.current === 'placement' && dragElementIdRef.current) {
                    updatePlacement(version.id, dragElementIdRef.current, { x: newX, y: newY });
                } else if (dragElementTypeRef.current === 'shape' && dragElementIdRef.current) {
                    updateShape(version.id, dragElementIdRef.current, { x: newX, y: newY });
                }
            }
        }
    }, [version, drawingState, zoom, snapValue, selectedPlacementId, selectedShapeId, updatePlacement, updateShape]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        if (drawingState?.active) {
            finalizeCreation(drawingState.startX, drawingState.startY, drawingState.currX, drawingState.currY);
            setDrawingState(null);
        }

        // Limpiar estado de drag
        isDraggingRef.current = false;
        isResizingRef.current = false;
        dragElementIdRef.current = null;
        dragElementTypeRef.current = null;
        setIsDragging(false);
        setIsResizing(false);

        // Restaurar cursor
        document.body.style.cursor = '';
    }, [drawingState, finalizeCreation]);

    // Resize handles
    const handleResizeMouseDown = useCallback((e: React.MouseEvent, item: FieldPlacement | ShapeElement) => {
        e.stopPropagation();
        if (item.isLocked) return;

        // Asegurar que el elemento está seleccionado
        if ('fieldId' in item) {
            onSelectPlacement(item.id);
        } else {
            onSelectShape(item.id);
        }

        isResizingRef.current = true;
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            initialW: item.width,
            initialH: item.height,
        };
        setIsResizing(true);
    }, [onSelectPlacement, onSelectShape]);

    useEffect(() => {
        // Agregar listeners SIEMPRE para que funcione el drag
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    if (!version) return null;

    const numPages = version.numPages || 1;
    const pages = Array.from({ length: numPages }, (_, i) => i + 1);

    const renderElement = (el: any, isShape: boolean, currentPage: number) => {
        const isSelected = isShape ? selectedShapeId === el.id : selectedPlacementId === el.id;
        const isHidden = el.isVisible === false;

        // Regla de Visibilidad por Página
        // 1. Si es Header (repeatOnEveryPage), se renderiza en todas
        // 2. Si no, solo se renderiza si su pageNumber coincide (default a pagina 1)
        const isHeader = el.repeatOnEveryPage;
        const elementPage = el.pageNumber || 1;

        if (isHidden) return null;
        if (!isHeader && elementPage !== currentPage) return null;

        const x = el.x * MM_TO_PX * zoom;
        const y = el.y * MM_TO_PX * zoom;
        const width = el.width * MM_TO_PX * zoom;
        const height = el.height * MM_TO_PX * zoom;

        if (isShape) {
            const shape = el as ShapeElement;
            return (
                <div
                    key={`${shape.id}-${currentPage}`}
                    data-shape-id={shape.id}
                    ref={isSelected && elementPage === currentPage ? selectedElementRef : null}
                    onMouseDown={(e) => handleShapeMouseDown(e, shape)}
                    className={`absolute select-none transition-all duration-200 group ${shape.isLocked
                        ? 'cursor-not-allowed opacity-60'
                        : isDragging && selectedShapeId === shape.id
                            ? 'cursor-grabbing scale-105'
                            : 'cursor-grab hover:scale-[1.02]'
                        } ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2 z-50 shadow-xl' : 'hover:ring-1 hover:ring-emerald-300'}`}
                    style={{
                        left: x,
                        top: y,
                        width,
                        height,
                        backgroundColor: shape.fillColor || 'transparent',
                        // CAMBIO: Bordes transparentes para textos
                        border: shape.type === 'text' ? 'none' : (shape.strokeColor ? `${shape.strokeWidth || 0.5}px solid ${shape.strokeColor}` : 'none'),
                        borderRadius: shape.type === 'circle' ? '50%' : (shape.borderRadius ? `${shape.borderRadius}px` : 0),
                        opacity: shape.opacity ?? 1,
                        zIndex: shape.zIndex,
                        pointerEvents: (shape.isLocked || (isHeader && currentPage !== elementPage)) ? 'none' : 'auto'
                    }}
                >
                    {shape.type === 'text' && (
                        <div className="w-full h-full flex items-center p-1" style={{
                            fontSize: `${(shape.fontSize || 12) * zoom}px`,
                            fontFamily: shape.fontFamily || 'Arial',
                            color: shape.color || '#000',
                            textAlign: shape.textAlign || 'left'
                        }}>
                            {shape.content}
                        </div>
                    )}
                    {shape.type === 'image' && shape.imageUrl && (
                        <img src={shape.imageUrl} alt="" className="w-full h-full object-contain" />
                    )}
                    {isHeader && (
                        <div className="absolute -top-4 left-0 bg-blue-500 text-white text-[8px] px-1 rounded uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60]">
                            Encabezado
                        </div>
                    )}
                    {isSelected && !shape.isLocked && elementPage === currentPage && (
                        <div onMouseDown={(e) => handleResizeMouseDown(e, shape)} className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-tl cursor-nwse-resize" />
                    )}
                </div>
            );
        } else {
            const placement = el as FieldPlacement;
            return (
                <div
                    key={`${placement.id}-${currentPage}`}
                    data-placement-id={placement.id}
                    ref={isSelected && elementPage === currentPage ? selectedElementRef : null}
                    onMouseDown={(e) => handlePlacementMouseDown(e, placement)}
                    className={`absolute select-none transition-all duration-200 group ${placement.isLocked
                        ? 'cursor-not-allowed opacity-60'
                        : isDragging && selectedPlacementId === placement.id
                            ? 'cursor-grabbing scale-105'
                            : 'cursor-grab hover:scale-[1.02]'
                        } ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2 z-50 shadow-xl' : 'hover:ring-1 hover:ring-emerald-300'}`}
                    style={{
                        left: x,
                        top: y,
                        width,
                        height,
                        zIndex: placement.zIndex,
                        backgroundColor: placement.backgroundColor || 'rgba(255,255,255,0.9)',
                        borderRadius: placement.borderRadius ? `${placement.borderRadius}px` : 0,
                        padding: placement.padding ? `${placement.padding}px` : '4px',
                        // CAMBIO: Remover multiplicación por zoom para que el borde sea consistente
                        // Antes: border: placement.borderWidth ? `${placement.borderWidth * zoom}px solid ${placement.borderColor || '#e5e7eb'}` : '1px solid #e5e7eb',
                        border: placement.borderWidth
                            ? `${placement.borderWidth}px solid ${placement.borderColor || '#e5e7eb'}`
                            : '1px solid #e5e7eb',
                        pointerEvents: (placement.isLocked || (isHeader && currentPage !== elementPage)) ? 'none' : 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {placement.showLabel && (
                        <div
                            className="flex-shrink-0 mb-0.5 flex items-center overflow-hidden"
                            style={{
                                fontWeight: placement.labelFontWeight || 'bold',
                                color: placement.labelColor || '#6B7280',
                                backgroundColor: placement.labelBackgroundColor || 'transparent',
                                padding: placement.labelPadding ? `${placement.labelPadding}px` : 0,
                                width: placement.labelWidth ? `${placement.labelWidth * MM_TO_PX * zoom}px` : '100%',
                                justifyContent: placement.labelAlign === 'center' ? 'center' : (placement.labelAlign === 'right' ? 'flex-end' : 'flex-start'),
                                alignSelf: placement.labelWidth && placement.labelAlign === 'center' ? 'center' : (placement.labelWidth && placement.labelAlign === 'right' ? 'flex-end' : 'flex-start')
                            }}
                        >
                            <span className="truncate uppercase" style={{
                                fontSize: `${(placement.labelFontSize || ((placement.fontSize || 10) * 0.8)) * zoom}px`,
                            }}>
                                {placement.customLabel || placement.fieldId}
                            </span>
                        </div>
                    )}
                    <div className="flex-grow w-full flex items-center overflow-hidden"
                        style={{
                            justifyContent: placement.textAlign === 'center' ? 'center' : (placement.textAlign === 'right' ? 'flex-end' : 'flex-start')
                        }}
                    >
                        <span className="truncate" style={{
                            fontSize: `${(placement.fontSize || 10) * zoom}px`,
                            fontFamily: placement.fontFamily || 'Arial',
                            fontWeight: placement.fontWeight || 'normal',
                            color: placement.color || '#000',
                            lineHeight: 1.2
                        }}>
                            {`{{${placement.fieldId}}}`}
                        </span>
                    </div>
                    {isHeader && (
                        <div className="absolute -top-4 left-0 bg-primary text-white text-[8px] px-1 rounded uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60]">
                            Encabezado
                        </div>
                    )}
                    {isSelected && !placement.isLocked && elementPage === currentPage && (
                        <div onMouseDown={(e) => handleResizeMouseDown(e, placement)} className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-tl cursor-nwse-resize" />
                    )}
                </div>
            );
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-32 items-center">
            {pages.map(pageNo => (
                <div key={pageNo} className="flex flex-col items-center gap-2">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Página {pageNo}</div>
                    <div
                        id={`page-container-${pageNo}`}
                        className={`relative bg-white shadow-2xl ${(pendingShape || pendingField) ? 'cursor-crosshair' : ''}`}
                        style={{
                            width: version.orientation === 'portrait' ? canvasWidth : canvasHeight,
                            height: version.orientation === 'portrait' ? canvasHeight : canvasWidth,
                        }}
                        onDrop={(e) => {
                            // Inyectar el número de página en el evento de drop
                            (e as any)._pageNumber = pageNo;
                            handleDrop(e);
                        }}
                        onDragOver={handleDragOver}
                        onMouseDown={(e) => {
                            (e as any)._pageNumber = pageNo;
                            handleCanvasMouseDown(e);
                        }}
                    >
                        {/* Grid */}
                        {snapToGrid && (
                            <div className="absolute inset-0 pointer-events-none opacity-10" style={{
                                backgroundImage: `linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)`,
                                backgroundSize: `${gridSize * MM_TO_PX * zoom}px ${gridSize * MM_TO_PX * zoom}px`
                            }} />
                        )}

                        {/* Elementos de esta página */}
                        {version.shapes?.map(s => renderElement(s, true, pageNo))}
                        {version.placements.map(p => renderElement(p, false, pageNo))}

                        {/* Ghost element while drawing */}
                        {drawingState?.active && drawingState.pageNumber === pageNo && (
                            <div className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-[100]" style={{
                                left: Math.min(drawingState.startX, drawingState.currX) * MM_TO_PX * zoom,
                                top: Math.min(drawingState.startY, drawingState.currY) * MM_TO_PX * zoom,
                                width: Math.abs(drawingState.currX - drawingState.startX) * MM_TO_PX * zoom,
                                height: Math.abs(drawingState.currY - drawingState.startY) * MM_TO_PX * zoom,
                                borderRadius: pendingShape === 'circle' ? '50%' : '0px'
                            }} />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
