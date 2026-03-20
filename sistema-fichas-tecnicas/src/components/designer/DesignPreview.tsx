/**
 * DesignPreview - Preview WYSIWYG del diseño
 * Muestra exactamente lo que se está diseñando en el canvas, pixel por pixel
 */

'use client';

import { useState, useEffect } from 'react';
import type { FichaDesignVersion } from '@/types/fichaDesign';
import { useGlobalStore } from '@/stores';
import { useFieldsStore } from '@/stores/fieldsStore';
import { blobStore } from '@/lib/storage/blobStore';

interface DesignPreviewProps {
    version: FichaDesignVersion;
    isOpen: boolean;
    onClose: () => void;
}

type PreviewMode = 'design' | 'data';

export function DesignPreview({ version, isOpen, onClose }: DesignPreviewProps) {
    const { getAllFields } = useFieldsStore();
    const allFields = getAllFields();
    const pozos = useGlobalStore((state) => state.pozos);
    const [selectedPozoId, setSelectedPozoId] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<PreviewMode>('design');

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
    const getFieldValue = (fieldId: string, fieldPath: string): string => {
        if (!selectedPozo) return '[Sin datos]';

        // CASO ESPECIAL: Fotos específicas por nomenclatura
        if (fieldId.startsWith('foto_') && !/^\d+/.test(fieldId.split('_')[1])) {
            const codeMap: Record<string, string> = {
                'foto_panoramica': 'P', 'foto_tapa': 'T', 'foto_interior': 'I',
                'foto_acceso': 'A', 'foto_fondo': 'F', 'foto_medicion': 'M',
                'foto_entrada_1': 'E1', 'foto_entrada_2': 'E2', 'foto_entrada_3': 'E3', 'foto_entrada_4': 'E4', 'foto_entrada_5': 'E5', 'foto_entrada_6': 'E6', 'foto_entrada_7': 'E7',
                'foto_salida_1': 'S1', 'foto_salida_2': 'S2', 'foto_salida_3': 'S3', 'foto_salida_4': 'S4', 'foto_salida_5': 'S5', 'foto_salida_6': 'S6', 'foto_salida_7': 'S7',
                'foto_sumidero_1': 'SUM1', 'foto_sumidero_2': 'SUM2', 'foto_sumidero_3': 'SUM3', 'foto_sumidero_4': 'SUM4', 'foto_sumidero_5': 'SUM5', 'foto_sumidero_6': 'SUM6', 'foto_sumidero_7': 'SUM7',
                'foto_descarga_1': 'D1', 'foto_descarga_2': 'D2', 'foto_descarga_3': 'D3', 'foto_descarga_4': 'D4', 'foto_descarga_5': 'D5', 'foto_descarga_6': 'D6', 'foto_descarga_7': 'D7',
                'foto_esquema': 'L', 'foto_shape': 'L'
            };
            const targetCode = codeMap[fieldId];

            if (targetCode) {
                const upperTarget = targetCode.toUpperCase();
                let found = selectedPozo.fotos?.fotos?.find(f =>
                    String(f.subcategoria || '').toUpperCase() === upperTarget
                );

                if (!found) {
                    found = selectedPozo.fotos?.fotos?.find(f => {
                        const filename = String(f.filename || '').toUpperCase().split('.')[0];

                        // REGLA: Omitir si termina en AT o Z (Seguimos respetando esto)
                        if (filename.endsWith('-AT') || filename.endsWith('_AT') ||
                            filename.endsWith('-Z') || filename.endsWith('_Z')) {
                            return false;
                        }

                        // 1. Coincidencia Exacta de la Subcategoría
                        const subcat = String(f.subcategoria || '').toUpperCase();
                        if (subcat === upperTarget) return true;

                        // 2. Lógica por Categoría (Casos Especiales del listado)

                        // PANORÁMICAS
                        if (upperTarget === 'P') {
                            return filename === 'P' || filename === 'F-P' || filename === 'S-P' || filename.includes('-P');
                        }

                        // TAPAS
                        if (upperTarget === 'T') {
                            return filename === 'T' || filename === 'F-T' || filename === 'TT' || filename.includes('-T');
                        }

                        // INTERNAS
                        if (upperTarget === 'I') {
                            return filename === 'I' || filename === 'F-I' || filename === 'II' ||
                                /^I\d?$/.test(filename) || /^I\(\d+\)$/.test(filename) || filename.includes('-I');
                        }

                        // ENTRADAS
                        if (upperTarget.startsWith('E')) {
                            const num = upperTarget.replace('E', '');
                            if (num === '1' && (filename === 'E-T' || filename.includes('-E-T'))) return true;
                            // Busca "E1" o "E-1" o "E1-T" o "F-E1-T"
                            const regex = new RegExp(`(^|[\\-_])E${num}([\\-_\\.]|$)`);
                            return regex.test(filename) || filename.includes(`F-E${num}`);
                        }

                        // SALIDAS
                        if (upperTarget.startsWith('S') && !upperTarget.startsWith('SUM')) {
                            const num = upperTarget.replace('S', '');
                            if (num === '1') {
                                if (filename === 'S' || filename === 'S-T' || filename === 'S-HS' || filename === 'F-S-T' || filename.includes('-S-T') || filename.includes('-S-HS') || new RegExp('(^|[\\-_])S([\\-_\\.]|$)').test(filename)) return true;
                            }

                            // Solo coincide si NO es un tag secundario de un Sumidero (ej: evitar que S1 en E2-T-S1 sea tomado como Salida 1)
                            if (filename.includes('-E')) {
                                return false;
                            }

                            const regex = new RegExp(`(^|[\\-_])S${num}([\\-_\\.]|$)`);
                            return regex.test(filename) || regex.test(filename.replace(/-/g, '')) || filename.includes(`F-S${num}`);
                        }

                        // SUMIDEROS
                        if (upperTarget.startsWith('SUM')) {
                            const num = upperTarget.replace('SUM', '');
                            const regexSum = new RegExp(`(^|[\\-_])SUM${num}([\\-_\\.]|$)`);
                            const regexS = new RegExp(`(^|[\\-_])S${num}([\\-_\\.]|$)`);
                            return regexSum.test(filename) || regexS.test(filename);
                        }

                        // ESQUEMAS / ARGIS
                        if (upperTarget === 'L') {
                            return filename.includes('_ARGIS') || filename === 'L';
                        }

                        return false;
                    });
                }

                if (found) return found.blobId || (found as any).dataUrl || '[Vacío]';
            }
        }

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
                        <p className="text-sm text-gray-500 mt-1">
                            {previewMode === 'design' ? 'Vista del diseño (WYSIWYG)' : 'Vista con datos reales'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Toggle de modo */}
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setPreviewMode('design')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${previewMode === 'design'
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                Diseño
                            </button>
                            <button
                                onClick={() => setPreviewMode('data')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${previewMode === 'data'
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                                    }`}
                                disabled={pozos.size === 0}
                            >
                                Con Datos
                            </button>
                        </div>

                        {/* Selector de Pozo (solo en modo data) */}
                        {previewMode === 'data' && pozos.size > 0 && (
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
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-auto p-8 bg-gray-100">
                    {previewMode === 'data' && pozos.size === 0 ? (
                        <div className="text-center py-16">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-gray-500 font-medium">No hay pozos cargados</p>
                            <p className="text-sm text-gray-400 mt-1">Importa datos desde Excel para ver el preview con datos</p>
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
                                                alignItems: 'center',
                                                justifyContent: shape.textAlign === 'center' ? 'center' : (shape.textAlign === 'right' ? 'flex-end' : 'flex-start')
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
                                 const field = allFields.find(f => f.id === placement.fieldId);
                                const isPhoto = placement.fieldId.startsWith('foto_');

                                // En modo diseño, mostrar el nombre del campo o placeholder
                                // En modo data, mostrar el valor real
                                const displayValue = previewMode === 'design'
                                    ? (placement.customLabel || field?.label || placement.fieldId)
                                    : (field ? getFieldValue(placement.fieldId, field.fieldPath) : '[Campo no encontrado]');

                                const isRealImage = isPhoto && previewMode === 'data' && displayValue && displayValue !== '[Sin datos]' && displayValue !== '[Vacío]' && displayValue !== '[N/A]' && displayValue !== '[Error]';

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
                                            backgroundColor: placement.backgroundColor || (isPhoto && previewMode === 'design' ? '#f9fafb' : 'transparent'),
                                            borderRadius: placement.borderRadius ? `${placement.borderRadius}px` : 0,
                                            padding: placement.padding ? `${placement.padding}px` : '2px',
                                            border: placement.borderWidth
                                                ? `${placement.borderWidth}px solid ${placement.borderColor || '#000'}`
                                                : (previewMode === 'design' ? '1px dashed rgba(99, 102, 241, 0.3)' : 'none'),
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {placement.showLabel && !isRealImage && (
                                            <div
                                                className="flex-shrink-0 mb-0.5 flex items-center overflow-hidden"
                                                style={{
                                                    fontWeight: placement.labelFontWeight || 'bold',
                                                    color: placement.labelColor || '#6B7280',
                                                    backgroundColor: placement.labelBackgroundColor || 'transparent',
                                                    padding: placement.labelPadding ? `${placement.labelPadding}px` : 0,
                                                    width: placement.labelWidth ? `${placement.labelWidth}mm` : '100%',
                                                    justifyContent: placement.labelAlign === 'center' ? 'center' : (placement.labelAlign === 'right' ? 'flex-end' : 'flex-start'),
                                                    alignSelf: placement.labelWidth && placement.labelAlign === 'center' ? 'center' : (placement.labelWidth && placement.labelAlign === 'right' ? 'flex-end' : 'flex-start')
                                                }}
                                            >
                                                <span className="truncate uppercase" style={{
                                                    fontSize: `${placement.labelFontSize || ((placement.fontSize || 10) * 0.8)}pt`,
                                                }}>
                                                    {placement.customLabel || field?.label || placement.fieldId}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex-grow w-full flex items-center justify-center overflow-hidden"
                                            style={{
                                                justifyContent: placement.textAlign === 'center' ? 'center' : (placement.textAlign === 'right' ? 'flex-end' : 'flex-start')
                                            }}
                                        >
                                            {isRealImage ? (
                                                <img
                                                    src={displayValue.startsWith('data:') ? displayValue : blobStore.getUrl(displayValue)}
                                                    alt=""
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                    }}
                                                />
                                            ) : isPhoto && previewMode === 'design' ? (
                                                <div className="flex flex-col items-center justify-center text-gray-400 opacity-40">
                                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="text-[8px] font-bold uppercase mt-1">FOTO</span>
                                                </div>
                                            ) : (
                                                <span
                                                    className="truncate"
                                                    style={{
                                                        fontSize: `${placement.fontSize || 10}pt`,
                                                        fontFamily: placement.fontFamily || 'Inter',
                                                        fontWeight: placement.fontWeight || 'normal',
                                                        color: placement.color || '#000000',
                                                        lineHeight: 1.2
                                                    }}
                                                >
                                                    {displayValue}
                                                </span>
                                            )}
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
                        {previewMode === 'design' && (
                            <span className="ml-2 text-primary font-medium">• Vista WYSIWYG</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        >
                            Cerrar
                        </button>
                        {previewMode === 'data' && selectedPozo && (
                            <button
                                onClick={async () => {
                                    if (!version || !selectedPozo) return;
                                    try {
                                        const { generatePdfFromDesign } = await import('@/lib/pdf/designBasedPdfGenerator');
                                        const result = await generatePdfFromDesign(version, selectedPozo, allFields);
                                        if (result.success && result.blob) {
                                            const url = URL.createObjectURL(result.blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = `ficha_${selectedPozo.idPozo?.value || selectedPozo.identificacion.idPozo.value}_${version.name}.pdf`;
                                            link.click();
                                            URL.revokeObjectURL(url);
                                        } else {
                                            alert('Error al generar PDF: ' + result.error);
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        alert('Error inesperado al generar PDF');
                                    }
                                }}
                                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
                                title="Generar PDF"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Generar PDF
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
