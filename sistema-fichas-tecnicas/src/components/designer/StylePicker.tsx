'use client';

import { useState, useCallback } from 'react';
import type { FieldPlacement, ShapeElement } from '@/types/fichaDesign';

interface StylePickerProps {
    version: any;
    onApplyStyle: (style: any) => void;
}

interface CapturedStyle {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    fontWeight?: string;
    textAlign?: string;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    labelFontSize?: number;
    labelColor?: string;
    labelFontWeight?: string;
    customLabel?: string;
    labelBackgroundColor?: string;
    labelPadding?: number;
    labelAlign?: string;
}

import { useDesignStore } from '@/stores/designStore';

export function StylePicker({ version, onApplyStyle }: StylePickerProps) {
    const { selectedPlacementId, selectedShapeId } = useDesignStore();
    const [capturedStyle, setCapturedStyle] = useState<CapturedStyle | null>(null);
    const [copied, setCopied] = useState(false);

    const getElementStyle = useCallback((element: FieldPlacement | ShapeElement): CapturedStyle => {
        if ('fieldId' in element) {
            // Es un FieldPlacement
            const placement = element as FieldPlacement;
            return {
                fontSize: placement.fontSize,
                fontFamily: placement.fontFamily,
                color: placement.color,
                fontWeight: placement.fontWeight,
                textAlign: placement.textAlign,
                backgroundColor: placement.backgroundColor,
                borderColor: placement.borderColor,
                borderWidth: placement.borderWidth,
                borderRadius: placement.borderRadius,
                labelFontSize: placement.labelFontSize,
                labelColor: placement.labelColor,
                labelFontWeight: placement.labelFontWeight,
                customLabel: placement.customLabel,
                labelBackgroundColor: placement.labelBackgroundColor,
                labelPadding: placement.labelPadding,
                labelAlign: placement.labelAlign,
            };
        } else {
            // Es un ShapeElement
            const shape = element as ShapeElement;
            return {
                fontSize: shape.fontSize,
                fontFamily: shape.fontFamily,
                color: shape.color,
                fontWeight: shape.fontWeight,
                textAlign: shape.textAlign,
                fillColor: shape.fillColor,
                strokeColor: shape.strokeColor,
                strokeWidth: shape.strokeWidth,
            };
        }
    }, []);

    const handlePickStyle = useCallback(() => {
        if (!version) return;

        let element: FieldPlacement | ShapeElement | undefined;

        if (selectedPlacementId) {
            element = version.placements.find((p: FieldPlacement) => p.id === selectedPlacementId);
        } else if (selectedShapeId) {
            element = version.shapes?.find((s: ShapeElement) => s.id === selectedShapeId);
        }

        if (element) {
            const style = getElementStyle(element);
            setCapturedStyle(style);
        }
    }, [version, selectedPlacementId, selectedShapeId, getElementStyle]);

    const handleApplyStyle = useCallback(() => {
        if (capturedStyle) {
            onApplyStyle(capturedStyle);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [capturedStyle, onApplyStyle]);

    const handleCopyJson = useCallback(() => {
        if (capturedStyle) {
            navigator.clipboard.writeText(JSON.stringify(capturedStyle, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [capturedStyle]);

    const hasSelection = selectedPlacementId || selectedShapeId;

    return (
        <div className="flex flex-col gap-3 p-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <span className="text-sm font-semibold text-slate-700">Escobilla de Estilos</span>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
                <button
                    onClick={handlePickStyle}
                    disabled={!hasSelection}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-medium rounded transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    Capturar
                </button>
                <button
                    onClick={handleApplyStyle}
                    disabled={!capturedStyle || !hasSelection}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white text-sm font-medium rounded transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Aplicar
                </button>
            </div>

            {/* Estilos capturados */}
            {capturedStyle && (
                <div className="bg-white rounded border border-slate-200 p-3 space-y-2">
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Estilos Capturados</div>

                    {/* Tipografía */}
                    {(capturedStyle.fontSize || capturedStyle.fontFamily || capturedStyle.color) && (
                        <div className="space-y-1">
                            <div className="text-xs font-medium text-slate-600">Tipografía</div>
                            <div className="text-xs text-slate-600 space-y-0.5 ml-2">
                                {capturedStyle.fontSize && (
                                    <div>Tamaño: <span className="font-mono font-semibold">{capturedStyle.fontSize}px</span></div>
                                )}
                                {capturedStyle.fontFamily && (
                                    <div>Fuente: <span className="font-mono font-semibold">{capturedStyle.fontFamily}</span></div>
                                )}
                                {capturedStyle.fontWeight && (
                                    <div>Peso: <span className="font-mono font-semibold">{capturedStyle.fontWeight}</span></div>
                                )}
                                {capturedStyle.color && (
                                    <div className="flex items-center gap-2">
                                        Color:
                                        <div
                                            className="w-4 h-4 rounded border border-slate-300"
                                            style={{ backgroundColor: capturedStyle.color }}
                                        />
                                        <span className="font-mono font-semibold">{capturedStyle.color}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {(capturedStyle.fillColor || capturedStyle.strokeColor || capturedStyle.backgroundColor) && (
                        <div className="space-y-1">
                            <div className="text-xs font-medium text-slate-600">Colores</div>
                            <div className="text-xs text-slate-600 space-y-0.5 ml-2">
                                {capturedStyle.fillColor && (
                                    <div className="flex items-center gap-2">
                                        Relleno:
                                        <div
                                            className="w-4 h-4 rounded border border-slate-300"
                                            style={{ backgroundColor: capturedStyle.fillColor }}
                                        />
                                        <span className="font-mono font-semibold">{capturedStyle.fillColor}</span>
                                    </div>
                                )}
                                {capturedStyle.strokeColor && (
                                    <div className="flex items-center gap-2">
                                        Borde:
                                        <div
                                            className="w-4 h-4 rounded border-2"
                                            style={{ borderColor: capturedStyle.strokeColor }}
                                        />
                                        <span className="font-mono font-semibold">{capturedStyle.strokeColor}</span>
                                    </div>
                                )}
                                {capturedStyle.backgroundColor && (
                                    <div className="flex items-center gap-2">
                                        Fondo:
                                        <div
                                            className="w-4 h-4 rounded border border-slate-300"
                                            style={{ backgroundColor: capturedStyle.backgroundColor }}
                                        />
                                        <span className="font-mono font-semibold">{capturedStyle.backgroundColor}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Bordes */}
                    {(capturedStyle.borderWidth || capturedStyle.borderRadius) && (
                        <div className="space-y-1">
                            <div className="text-xs font-medium text-slate-600">Bordes</div>
                            <div className="text-xs text-slate-600 space-y-0.5 ml-2">
                                {capturedStyle.borderWidth !== undefined && (
                                    <div>Ancho: <span className="font-mono font-semibold">{capturedStyle.borderWidth}px</span></div>
                                )}
                                {capturedStyle.borderRadius !== undefined && (
                                    <div>Radio: <span className="font-mono font-semibold">{capturedStyle.borderRadius}px</span></div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Etiqueta (Label) */}
                    {(capturedStyle.labelFontSize || capturedStyle.labelColor || capturedStyle.labelFontWeight || capturedStyle.customLabel || capturedStyle.labelBackgroundColor) && (
                        <div className="space-y-1 pt-2 border-t border-slate-200">
                            <div className="text-xs font-medium text-slate-600 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                Etiqueta
                            </div>
                            <div className="text-xs text-slate-600 space-y-0.5 ml-2">
                                {capturedStyle.customLabel && (
                                    <div>Texto: <span className="font-mono font-semibold">"{capturedStyle.customLabel}"</span></div>
                                )}
                                {capturedStyle.labelFontSize && (
                                    <div>Tamaño: <span className="font-mono font-semibold">{capturedStyle.labelFontSize}px</span></div>
                                )}
                                {capturedStyle.labelFontWeight && (
                                    <div>Peso: <span className="font-mono font-semibold">{capturedStyle.labelFontWeight}</span></div>
                                )}
                                {capturedStyle.labelColor && (
                                    <div className="flex items-center gap-2">
                                        Color:
                                        <div
                                            className="w-4 h-4 rounded border border-slate-300"
                                            style={{ backgroundColor: capturedStyle.labelColor }}
                                        />
                                        <span className="font-mono font-semibold">{capturedStyle.labelColor}</span>
                                    </div>
                                )}
                                {capturedStyle.labelBackgroundColor && (
                                    <div className="flex items-center gap-2">
                                        Fondo:
                                        <div
                                            className="w-4 h-4 rounded border border-slate-300"
                                            style={{ backgroundColor: capturedStyle.labelBackgroundColor }}
                                        />
                                        <span className="font-mono font-semibold">{capturedStyle.labelBackgroundColor}</span>
                                    </div>
                                )}
                                {capturedStyle.labelAlign && (
                                    <div>Alineación: <span className="font-mono font-semibold">{capturedStyle.labelAlign}</span></div>
                                )}
                                {capturedStyle.labelPadding !== undefined && (
                                    <div>Padding: <span className="font-mono font-semibold">{capturedStyle.labelPadding}px</span></div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Botón para copiar JSON */}
                    <button
                        onClick={handleCopyJson}
                        className="w-full mt-2 flex items-center justify-center gap-2 px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded transition-colors"
                    >
                        {copied ? (
                            <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Copiado
                            </>
                        ) : (
                            <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Copiar JSON
                            </>
                        )}
                    </button>
                </div>
            )}

            {!capturedStyle && (
                <div className="text-xs text-slate-500 text-center py-2 bg-white rounded border border-dashed border-slate-300">
                    Selecciona un elemento y captura sus estilos
                </div>
            )}
        </div>
    );
}
