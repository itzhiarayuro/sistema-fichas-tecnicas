/**
 * DesignPreview - Preview funcional del diseño con datos reales de un pozo
 * Muestra cómo se verá la ficha impresa con datos reales
 */

'use client';

import { useState, useEffect } from 'react';
import type { FichaDesignVersion } from '@/types/fichaDesign';
import { AVAILABLE_FIELDS } from '@/types/fichaDesign';
import { useGlobalStore } from '@/stores';

interface DesignPreviewProps {
    version: FichaDesignVersion;
    isOpen: boolean;
    onClose: () => void;
}

export function DesignPreview({ version, isOpen, onClose }: DesignPreviewProps) {
    const pozos = useGlobalStore((state) => state.pozos);
    const [selectedPozoId, setSelectedPozoId] = useState<string | null>(null);

    const MM_TO_PX = 3.78;

    useEffect(() => {
        if (isOpen && pozos.size > 0 && !selectedPozoId) {
            const firstPozo = Array.from(pozos.keys())[0];
            setSelectedPozoId(firstPozo);
        }
    }, [isOpen, pozos, selectedPozoId]);

    if (!isOpen) return null;

    const selectedPozo = selectedPozoId ? pozos.get(selectedPozoId) : null;
    const canvasWidth = (version.pageSize === 'A4' ? 210 : 215.9) * MM_TO_PX;
    const canvasHeight = (version.pageSize === 'A4' ? 297 : 279.4) * MM_TO_PX;

    // Helper para obtener valor de un campo
    const getFieldValue = (fieldPath: string): string => {
        if (!selectedPozo) return '[Sin datos]';

        try {
            const parts = fieldPath.split('.');
            let value: any = selectedPozo;

            for (const part of parts) {
                if (value === undefined || value === null) return '[N/A]';
                value = value[part];
            }

            return value?.toString() || '[Vacío]';
        } catch {
            return '[Error]';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Preview: {version.name}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Vista previa con datos reales</p>
                    </div>

                    {/* Selector de Pozo */}
                    {pozos.size > 0 && (
                        <select
                            value={selectedPozoId || ''}
                            onChange={(e) => setSelectedPozoId(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        >
                            {Array.from(pozos.entries()).map(([id, pozo]) => (
                                <option key={id} value={id}>
                                    {pozo.identificacion?.idPozo?.value || id}
                                </option>
                            ))}
                        </select>
                    )}

                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-auto p-8 bg-gray-100">
                    {pozos.size === 0 ? (
                        <div className="text-center py-16">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-gray-500 font-medium">No hay pozos cargados</p>
                            <p className="text-sm text-gray-400 mt-1">Importa datos desde Excel para ver el preview</p>
                        </div>
                    ) : (
                        <div
                            className="bg-white shadow-2xl mx-auto relative"
                            style={{
                                width: version.orientation === 'portrait' ? canvasWidth : canvasHeight,
                                height: version.orientation === 'portrait' ? canvasHeight : canvasWidth,
                            }}
                        >
                            {/* Render Shapes */}
                            {version.shapes?.map((shape) => {
                                if (shape.isVisible === false) return null;

                                if (shape.type === 'rectangle') {
                                    return (
                                        <div
                                            key={shape.id}
                                            className="absolute"
                                            style={{
                                                left: `${shape.x}mm`,
                                                top: `${shape.y}mm`,
                                                width: `${shape.width}mm`,
                                                height: `${shape.height}mm`,
                                                backgroundColor: shape.fillColor || 'transparent',
                                                border: shape.strokeColor ? `${shape.strokeWidth || 1}px solid ${shape.strokeColor}` : 'none',
                                                borderRadius: shape.borderRadius ? `${shape.borderRadius}px` : 0,
                                                opacity: shape.opacity ?? 1,
                                                zIndex: shape.zIndex
                                            }}
                                        />
                                    );
                                }

                                if (shape.type === 'circle') {
                                    return (
                                        <div
                                            key={shape.id}
                                            className="absolute rounded-full"
                                            style={{
                                                left: `${shape.x}mm`,
                                                top: `${shape.y}mm`,
                                                width: `${shape.width}mm`,
                                                height: `${shape.height}mm`,
                                                backgroundColor: shape.fillColor || 'transparent',
                                                border: shape.strokeColor ? `${shape.strokeWidth || 1}px solid ${shape.strokeColor}` : 'none',
                                                opacity: shape.opacity ?? 1,
                                                zIndex: shape.zIndex
                                            }}
                                        />
                                    );
                                }

                                if (shape.type === 'line') {
                                    return (
                                        <div
                                            key={shape.id}
                                            className="absolute"
                                            style={{
                                                left: `${shape.x}mm`,
                                                top: `${shape.y}mm`,
                                                width: `${shape.width}mm`,
                                                height: `${(shape.strokeWidth || 1) / MM_TO_PX}mm`,
                                                backgroundColor: shape.strokeColor || '#000000',
                                                opacity: shape.opacity ?? 1,
                                                zIndex: shape.zIndex
                                            }}
                                        />
                                    );
                                }

                                if (shape.type === 'triangle') {
                                    return (
                                        <div
                                            key={shape.id}
                                            className="absolute"
                                            style={{
                                                left: `${shape.x}mm`,
                                                top: `${shape.y}mm`,
                                                width: `${shape.width}mm`,
                                                height: `${shape.height}mm`,
                                                opacity: shape.opacity ?? 1,
                                                zIndex: shape.zIndex
                                            }}
                                        >
                                            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                <polygon
                                                    points="50,0 100,100 0,100"
                                                    fill={shape.fillColor || 'transparent'}
                                                    stroke={shape.strokeColor || '#374151'}
                                                    strokeWidth={shape.strokeWidth ? (shape.strokeWidth * (100 / (shape.width * MM_TO_PX))) : 1}
                                                />
                                            </svg>
                                        </div>
                                    );
                                }

                                if (shape.type === 'text') {
                                    return (
                                        <div
                                            key={shape.id}
                                            className="absolute"
                                            style={{
                                                left: `${shape.x}mm`,
                                                top: `${shape.y}mm`,
                                                width: `${shape.width}mm`,
                                                height: `${shape.height}mm`,
                                                fontSize: `${shape.fontSize || 12}pt`,
                                                fontFamily: shape.fontFamily || 'Inter',
                                                fontWeight: shape.fontWeight || 'normal',
                                                color: shape.color || '#000000',
                                                textAlign: shape.textAlign || 'left',
                                                opacity: shape.opacity ?? 1,
                                                zIndex: shape.zIndex,
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                        >
                                            {shape.content || 'Texto'}
                                        </div>
                                    );
                                }

                                if (shape.type === 'image') {
                                    return (
                                        <div
                                            key={shape.id}
                                            className="absolute"
                                            style={{
                                                left: `${shape.x}mm`,
                                                top: `${shape.y}mm`,
                                                width: `${shape.width}mm`,
                                                height: `${shape.height}mm`,
                                                zIndex: shape.zIndex,
                                                opacity: shape.opacity ?? 1
                                            }}
                                        >
                                            {shape.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={shape.imageUrl}
                                                    alt="Asset"
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                                                    Imagen
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                return null;
                            })}

                            {/* Render Field Placements */}
                            {version.placements.map((placement) => {
                                const field = AVAILABLE_FIELDS.find(f => f.id === placement.fieldId);
                                const value = field ? getFieldValue(field.fieldPath) : '[Campo no encontrado]';

                                return (
                                    <div
                                        key={placement.id}
                                        className="absolute"
                                        style={{
                                            left: `${placement.x}mm`,
                                            top: `${placement.y}mm`,
                                            width: `${placement.width}mm`,
                                            height: `${placement.height}mm`,
                                            zIndex: placement.zIndex,
                                            backgroundColor: placement.backgroundColor || 'transparent',
                                            borderRadius: placement.borderRadius ? `${placement.borderRadius}px` : 0,
                                            padding: placement.padding ? `${placement.padding}px` : '2px'
                                        }}
                                    >
                                        {placement.showLabel && (
                                            <div className="text-[7px] text-gray-400 font-medium mb-0.5 truncate">
                                                {placement.customLabel || field?.label}
                                            </div>
                                        )}
                                        <div
                                            className="font-medium truncate"
                                            style={{
                                                fontSize: `${placement.fontSize || 10}pt`,
                                                fontFamily: placement.fontFamily || 'Inter',
                                                fontWeight: placement.fontWeight || 'normal',
                                                color: placement.color || '#000000',
                                                textAlign: placement.textAlign || 'left'
                                            }}
                                        >
                                            {value}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                        {version.placements.length} campos • {version.shapes?.length || 0} figuras
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        >
                            Cerrar
                        </button>
                        <button
                            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
                            title="Generar PDF"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Generar PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
