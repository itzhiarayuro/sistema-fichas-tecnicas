/**
 * DesignRenderer - Renderiza un diseño visual con datos reales para previsualización y PDF
 */

'use client';

import { FichaDesignVersion } from '@/types/fichaDesign';
import { Pozo } from '@/types/pozo';
import { blobStore } from '@/lib/storage/blobStore';

interface DesignRendererProps {
    design: FichaDesignVersion;
    pozo: Pozo;
    zoom?: number;
}

export function DesignRenderer({ design, pozo, zoom = 1 }: DesignRendererProps) {
    // Helper para obtener valor de ruta (maneja anidamiento y arrays)
    const getValueByPath = (obj: any, path: string) => {
        if (!path) return undefined;
        try {
            return path.split('.').reduce((acc, part) => {
                if (!acc) return undefined;
                if (part.includes('[') && part.includes(']')) {
                    const [name, indexStr] = part.split(/[\[\]]/);
                    const index = parseInt(indexStr);
                    return acc[name]?.[index];
                }
                return acc[part];
            }, obj);
        } catch (e) {
            console.error(`Error obteniendo valor en ruta: ${path}`, e);
            return undefined;
        }
    };

    const fieldMapping: Record<string, string> = {
        // POZO - Identificación
        'pozo_id': 'identificacion.idPozo.value',
        'pozo_fecha': 'identificacion.fecha.value',
        'pozo_coordX': 'identificacion.coordenadaX.value',
        'pozo_coordY': 'identificacion.coordenadaY.value',
        'pozo_levanto': 'identificacion.levanto.value',
        'pozo_estado': 'identificacion.estado.value',

        // POZO - Ubicación
        'pozo_direccion': 'ubicacion.direccion.value',
        'pozo_barrio': 'ubicacion.barrio.value',
        'pozo_localidad': 'ubicacion.localidad.value',
        'pozo_upz': 'ubicacion.upz.value',
        'pozo_profundidad': 'ubicacion.profundidad.value',
        'pozo_elevacion': 'ubicacion.elevacion.value',

        // POZO - Componentes
        'pozo_materialTapa': 'componentes.materialTapa.value',
        'pozo_diametroTapa': 'componentes.diametroTapa.value',
        'pozo_estadoTapa': 'componentes.estadoTapa.value',
        'pozo_materialCilindro': 'componentes.materialCilindro.value',
        'pozo_diametroCilindro': 'componentes.diametroCilindro.value',
        'pozo_estadoCilindro': 'componentes.estadoCilindro.value',
        'pozo_materialCono': 'componentes.materialCono.value',
        'pozo_estadoCono': 'componentes.estadoCono.value',
        'pozo_materialCanuela': 'componentes.materialCanuela.value',
        'pozo_estadoCanuela': 'componentes.estadoCanuela.value',
        'pozo_numPeldanos': 'componentes.numeroPeldanos.value',
        'pozo_materialPeldanos': 'componentes.materialPeldanos.value',
        'pozo_estadoPeldanos': 'componentes.estadoPeldanos.value',

        // POZO - Observaciones
        'pozo_observaciones': 'observaciones.observaciones.value',

        // TUBERIAS (Mapeo genérico, idealmente debería ser dinámico)
        'tub_entrada_diametro': 'tuberias.tuberias[0].diametro.value',
        'tub_entrada_material': 'tuberias.tuberias[0].material.value',
        'tub_entrada_estado': 'tuberias.tuberias[0].estado.value',
        'tub_salida_diametro': 'tuberias.tuberias[1].diametro.value',
        'tub_salida_material': 'tuberias.tuberias[1].material.value',
        'tub_salida_estado': 'tuberias.tuberias[1].estado.value',

        // SUMIDEROS
        'sum_tipo': 'sumideros.sumideros[0].tipoSumidero.value',
        'sum_material': 'sumideros.sumideros[0].materialTuberia.value',
        'sum_estado': 'sumideros.sumideros[0].tipoSumidero.value', // SumideroInfo no tiene estado explícito?

        // FOTOS (Usando la estructura fotos.fotos[x])
        'foto_1': 'fotos.fotos[0].blobId',
        'foto_2': 'fotos.fotos[1].blobId',
        'foto_3': 'fotos.fotos[2].blobId',
        'foto_4': 'fotos.fotos[3].blobId',
        'foto_5': 'fotos.fotos[4].blobId',
        'foto_6': 'fotos.fotos[5].blobId',
    };

    // Helper para obtener valor de campo con fallback
    const getFieldValue = (fieldId: string) => {
        // CASO ESPECIAL: Fotos específicas por nomenclatura
        if (fieldId.startsWith('foto_') && !/^\d+$/.test(fieldId.split('_')[1])) {
            const codeMap: Record<string, string> = {
                'panoramica': 'P',
                'tapa': 'T',
                'interior': 'I',
                'acceso': 'A',
                'fondo': 'F',
                'medicion': 'M',
                'entrada_1': 'E1-T',
                'salida_1': 'S-T',
                'sumidero_1': 'SUM1'
            };
            const typeKey = fieldId.replace('foto_', '');
            const targetCode = codeMap[typeKey];

            if (targetCode) {
                const found = pozo.fotos?.fotos?.find(f =>
                    String(f.subcategoria || '').toUpperCase() === targetCode ||
                    String(f.subcategoria || '').toUpperCase() === targetCode.split('-')[0] ||
                    String(f.tipo || '').toUpperCase().includes(typeKey.toUpperCase()) ||
                    String(f.filename || '').toUpperCase().includes(`-${targetCode}`)
                );
                if (found) return found.blobId ? blobStore.getUrl(found.blobId) : (found as any).dataUrl || '-';
            }
        }

        const path = fieldMapping[fieldId];
        if (!path) return '-';

        const value = getValueByPath(pozo, path);
        if (value === undefined || value === null) return '-';
        return value;
    };

    const MM_TO_PX = 3.78 * zoom;
    const isPortrait = design.orientation === 'portrait';
    const canvasWidth = (design.pageSize === 'A4' ? 210 : 215.9) * MM_TO_PX;
    const canvasHeight = (design.pageSize === 'A4' ? 297 : 279.4) * MM_TO_PX;

    // Combinar y ordenar todos los elementos por zIndex para correcto solapamiento
    const allElements = [
        ...(design.shapes || []).map(s => ({ ...s, isShape: true })),
        ...(design.placements || []).map(p => ({ ...p, isShape: false }))
    ].sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0));

    const numPages = design.numPages || 1;
    const pages = Array.from({ length: numPages }, (_, i) => i + 1);

    const renderElement = (el: any, isShape: boolean, currentPage: number) => {
        const isHeader = el.repeatOnEveryPage;
        const elementPage = el.pageNumber || 1;
        if (!isHeader && elementPage !== currentPage) return null;

        const x = el.x * MM_TO_PX;
        const y = el.y * MM_TO_PX;
        const width = el.width * MM_TO_PX;
        const height = el.height * MM_TO_PX;

        if (isShape) {
            const shape = el;
            return (
                <div
                    key={`${shape.id}-${currentPage}`}
                    className="absolute overflow-hidden"
                    style={{
                        left: x,
                        top: y,
                        width,
                        height,
                        zIndex: shape.zIndex || 1,
                        opacity: shape.opacity ?? 1,
                        backgroundColor: shape.type !== 'line' && shape.fillColor ? shape.fillColor : 'transparent',
                        borderColor: shape.strokeColor,
                        borderWidth: shape.strokeWidth ? `${shape.strokeWidth * (zoom > 1 ? zoom : 1)}px` : 0,
                        borderStyle: 'solid',
                        borderRadius: shape.type === 'circle' ? '50%' : (shape.borderRadius ? `${shape.borderRadius * MM_TO_PX / zoom}px` : 0),
                        display: shape.type === 'text' ? 'flex' : 'block',
                        alignItems: shape.type === 'text' ? 'center' : 'stretch'
                    }}
                >
                    {shape.type === 'text' && shape.content && (
                        <div className="p-1 w-full" style={{
                            fontSize: `${(shape.fontSize || 12) * zoom}pt`,
                            fontFamily: shape.fontFamily || 'Inter',
                            color: shape.color || '#000',
                            textAlign: shape.textAlign || 'left'
                        }}>
                            {shape.content}
                        </div>
                    )}
                    {shape.type === 'image' && shape.imageUrl && (
                        <img src={shape.imageUrl} alt="" className="w-full h-full object-contain" />
                    )}
                </div>
            );
        } else {
            const placement = el;
            const value = getFieldValue(placement.fieldId);
            const isPhoto = placement.fieldId.startsWith('foto_');
            const isWidget = placement.fieldId === 'widget_tuberias';

            // Estilos base del contenedor principal
            const containerStyle: React.CSSProperties = {
                left: x,
                top: y,
                width,
                height,
                zIndex: placement.zIndex || 5,
                borderRadius: placement.borderRadius ? `${placement.borderRadius * MM_TO_PX / zoom}px` : 0,
                // Si el usuario define un fondo general para todo el campo (no para el label), se aplicaría aquí
                backgroundColor: placement.backgroundColor || 'transparent',
                // Borde general
                borderWidth: placement.borderWidth ? `${placement.borderWidth}px` : 0,
                borderColor: placement.borderColor || 'transparent',
                borderStyle: 'solid',
                padding: placement.padding ? `${placement.padding * zoom}px` : 0,
                display: 'flex',
                flexDirection: 'column',
            };

            return (
                <div
                    key={`${placement.id}-${currentPage}`}
                    className="absolute overflow-hidden box-border"
                    style={containerStyle}
                >
                    {isPhoto ? (
                        <div className="w-full h-full relative">
                            {(value && value !== '-') && (
                                <img src={typeof value === 'string' && value.startsWith('data:') ? value : blobStore.getUrl(String(value))} alt="" className="w-full h-full object-cover" />
                            )}
                        </div>
                    ) : isWidget ? (
                        <div className="w-full h-full border border-gray-300 rounded overflow-hidden text-[6pt] bg-white">
                            <div className="grid grid-cols-3 bg-gray-100 font-bold border-b border-gray-300 p-1">
                                <span>Ø Diam</span>
                                <span>Material</span>
                                <span>Estado</span>
                            </div>
                            {(pozo.tuberias?.tuberias || []).slice(0, 8).map((t, idx) => (
                                <div key={idx} className="grid grid-cols-3 border-b border-gray-200 p-1 last:border-0 bg-white">
                                    <span>{t.diametro?.value || '-'}</span>
                                    <span>{t.material?.value || '-'}</span>
                                    <span>{t.estado?.value || '-'}</span>
                                </div>
                            ))}
                            {(pozo.tuberias?.tuberias?.length || 0) === 0 && <div className="p-2 text-center text-gray-400 italic">Sin tuberías</div>}
                        </div>
                    ) : (
                        <>
                            {/* SECCIÓN LABEL */}
                            {placement.showLabel && (
                                <div
                                    className="flex-shrink-0 mb-0.5 box-border flex items-center overflow-hidden"
                                    style={{
                                        lineHeight: 1.2,
                                        fontWeight: placement.labelFontWeight || 'bold',
                                        color: placement.labelColor || '#6B7280',
                                        backgroundColor: placement.labelBackgroundColor || 'transparent',
                                        padding: placement.labelPadding ? `${placement.labelPadding * zoom}px` : 0,
                                        width: placement.labelWidth ? `${placement.labelWidth * MM_TO_PX}px` : '100%',
                                        justifyContent: placement.labelAlign === 'center' ? 'center' : (placement.labelAlign === 'right' ? 'flex-end' : 'flex-start'),
                                        alignSelf: placement.labelWidth && placement.labelAlign === 'center' ? 'center' : (placement.labelWidth && placement.labelAlign === 'right' ? 'flex-end' : 'flex-start')
                                    }}
                                >
                                    <span
                                        className="truncate"
                                        style={{
                                            fontSize: `${(placement.labelFontSize || ((placement.fontSize || 10) * 0.8)) * zoom}pt`,
                                            textTransform: 'uppercase'
                                        }}
                                    >
                                        {placement.customLabel || placement.fieldId}
                                    </span>
                                </div>
                            )}

                            {/* SECCIÓN VALOR */}
                            {/* Usamos Flexbox para alinear el contenido horizontalmente (justifyContent) en lugar de textAlign */}
                            <div
                                className="flex-grow w-full flex items-center overflow-hidden min-h-0"
                                style={{
                                    justifyContent: placement.textAlign === 'center' ? 'center' : (placement.textAlign === 'right' ? 'flex-end' : 'flex-start')
                                }}
                            >
                                <span className="block truncate" style={{
                                    fontSize: `${(placement.fontSize || 10) * zoom}pt`,
                                    fontFamily: placement.fontFamily || 'Inter',
                                    fontWeight: placement.fontWeight || 'normal',
                                    color: placement.color || '#000',
                                    // Eliminamos textAlign aquí porque lo maneja el padre flex
                                    lineHeight: 1.2,
                                    maxWidth: '100%'
                                }}>
                                    {String(value || '-')}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            );
        }
    };

    return (
        <div className="flex flex-col gap-4 items-center pb-20 overflow-auto max-h-[85vh]">
            {pages.map(pageNo => (
                <div
                    key={pageNo}
                    id={`design-render-${design.id}-p${pageNo}`}
                    className="relative bg-white shadow-xl flex-shrink-0"
                    style={{
                        width: isPortrait ? canvasWidth : canvasHeight,
                        height: isPortrait ? canvasHeight : canvasWidth,
                    }}
                >
                    {allElements.map(el => renderElement(el, el.isShape, pageNo))}
                </div>
            ))}
        </div>
    );
}
