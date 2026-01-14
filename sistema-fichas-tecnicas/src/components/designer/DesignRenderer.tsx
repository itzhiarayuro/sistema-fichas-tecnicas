/**
 * DesignRenderer - Renderiza un diseño visual con datos reales
 */

'use client';

import { FichaDesignVersion } from '@/types/fichaDesign';
import { Pozo } from '@/types/pozo';

interface DesignRendererProps {
    design: FichaDesignVersion;
    pozo: Pozo;
    zoom?: number;
}

export function DesignRenderer({ design, pozo, zoom = 1 }: DesignRendererProps) {
    // Helper para obtener valor de ruta
    const getValueByPath = (obj: any, path: string) => {
        if (!path) return undefined;
        return path.split('.').reduce((acc, part) => {
            if (part.includes('[') && part.includes(']')) {
                const [name, index] = part.split(/[\[\]]/);
                return acc?.[name]?.[parseInt(index)];
            }
            return acc?.[part];
        }, obj);
    };

    const MM_TO_PX = 3.78 * zoom;
    const canvasWidth = (design.pageSize === 'A4' ? 210 : 215.9) * MM_TO_PX;
    const canvasHeight = (design.pageSize === 'A4' ? 297 : 279.4) * MM_TO_PX;

    const fieldMapping: Record<string, string> = {
        'pozo_id': 'identificacion.idPozo.value',
        'pozo_fecha': 'identificacion.fecha.value',
        'pozo_coordX': 'identificacion.coordenadaX.value',
        'pozo_coordY': 'identificacion.coordenadaY.value',
        'pozo_direccion': 'ubicacion.direccion.value',
        'pozo_barrio': 'ubicacion.barrio.value',
        // ... otros mapeos ...
    };

    return (
        <div
            className="relative bg-white shadow-lg mx-auto"
            style={{
                width: design.orientation === 'portrait' ? canvasWidth : canvasHeight,
                height: design.orientation === 'portrait' ? canvasHeight : canvasWidth,
            }}
        >
            {/* 1. Renderizar Shapes */}
            {(design.shapes || []).map((shape) => {
                const x = shape.x * MM_TO_PX;
                const y = shape.y * MM_TO_PX;
                const width = shape.width * MM_TO_PX;
                const height = shape.height * MM_TO_PX;

                return (
                    <div
                        key={shape.id}
                        className="absolute overflow-hidden"
                        style={{
                            left: x,
                            top: y,
                            width,
                            height,
                            zIndex: shape.zIndex || 1,
                            backgroundColor: shape.type !== 'line' && shape.fillColor ? shape.fillColor : 'transparent',
                            borderColor: shape.strokeColor,
                            borderWidth: shape.strokeWidth ? `${shape.strokeWidth * zoom}px` : 0,
                            borderStyle: 'solid',
                            borderRadius: shape.type === 'circle' ? '50%' : 0
                        }}
                    >
                        {shape.type === 'text' && shape.content && (
                            <div
                                className="p-1 h-full flex items-center"
                                style={{
                                    fontSize: `${(shape.fontSize || 12) * zoom}pt`,
                                    fontFamily: shape.fontFamily,
                                    color: shape.color,
                                    textAlign: shape.textAlign as any
                                }}
                            >
                                {shape.content}
                            </div>
                        )}
                        {shape.type === 'line' && (
                            <div
                                className="w-full h-full"
                                style={{
                                    backgroundColor: shape.strokeColor || '#000',
                                    height: `${(shape.strokeWidth || 1) * zoom}px`
                                }}
                            />
                        )}
                    </div>
                );
            })}

            {/* 2. Renderizar Placements */}
            {(design.placements || []).map((placement) => {
                const x = placement.x * MM_TO_PX;
                const y = placement.y * MM_TO_PX;
                const width = placement.width * MM_TO_PX;
                const height = placement.height * MM_TO_PX;
                const path = fieldMapping[placement.fieldId] || '';

                return (
                    <div
                        key={placement.id}
                        className="absolute overflow-hidden"
                        style={{
                            left: x,
                            top: y,
                            width,
                            height,
                            zIndex: placement.zIndex || 5,
                        }}
                    >
                        <div className="p-1 h-full flex flex-col justify-center">
                            {placement.showLabel && (
                                <span className="block truncate text-gray-400" style={{ fontSize: `${(placement.fontSize || 10) * 0.7 * zoom}pt` }}>
                                    {placement.customLabel || placement.fieldId}
                                </span>
                            )}
                            <span
                                className="font-medium truncate"
                                style={{
                                    fontSize: `${(placement.fontSize || 10) * zoom}pt`,
                                    fontFamily: placement.fontFamily,
                                    color: placement.color,
                                    textAlign: placement.textAlign as any
                                }}
                            >
                                {String(getValueByPath(pozo, path) || '-')}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
