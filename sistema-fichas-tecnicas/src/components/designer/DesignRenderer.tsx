/**
 * DesignRenderer - Renderiza un diseño visual con datos reales para previsualización y PDF
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

    return (
        <div
            id={`design-render-${design.id}`}
            className="relative bg-white shadow-lg mx-auto overflow-hidden print:shadow-none"
            style={{
                width: isPortrait ? canvasWidth : canvasHeight,
                height: isPortrait ? canvasHeight : canvasWidth,
                minWidth: isPortrait ? canvasWidth : canvasHeight,
                minHeight: isPortrait ? canvasHeight : canvasWidth,
            }}
        >
            {allElements.map((el: any) => {
                const x = el.x * MM_TO_PX;
                const y = el.y * MM_TO_PX;
                const width = el.width * MM_TO_PX;
                const height = el.height * MM_TO_PX;

                if (el.isShape) {
                    const shape = el;
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
                                <div
                                    className="p-1 w-full"
                                    style={{
                                        fontSize: `${(shape.fontSize || 12) * zoom}pt`,
                                        fontFamily: shape.fontFamily || 'Inter',
                                        fontWeight: shape.fontWeight || 'normal',
                                        color: shape.color || '#000000',
                                        textAlign: (shape.textAlign as any) || 'left'
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
                            {shape.type === 'image' && shape.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={shape.imageUrl}
                                    alt="Shape"
                                    className="w-full h-full object-contain"
                                />
                            )}
                            {shape.repeatOnEveryPage && (
                                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[6px] px-1 py-0.5 rounded-bl opacity-70 pointer-events-none uppercase font-bold z-50">
                                    Encabezado
                                </div>
                            )}
                        </div>
                    );
                } else {
                    const placement = el;
                    const value = getFieldValue(placement.fieldId);
                    const isPhoto = placement.fieldId.startsWith('foto_');

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
                                backgroundColor: placement.backgroundColor || 'transparent',
                                borderRadius: placement.borderRadius ? `${placement.borderRadius * MM_TO_PX / zoom}px` : 0,
                                padding: placement.padding ? `${placement.padding}px` : 0,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}
                        >
                            {isPhoto ? (
                                <div className="w-full h-full relative">
                                    {value && value !== '-' ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={value as string}
                                            alt={placement.fieldId}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-[8pt] text-gray-300">
                                            Sin foto
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-1">
                                    {placement.showLabel && (
                                        <span
                                            className="block truncate text-gray-400 uppercase font-bold"
                                            style={{ fontSize: `${(placement.fontSize || 10) * 0.65 * zoom}pt`, marginBottom: '1px' }}
                                        >
                                            {placement.customLabel || placement.fieldId}
                                        </span>
                                    )}
                                    <span
                                        className="block truncate"
                                        style={{
                                            fontSize: `${(placement.fontSize || 10) * zoom}pt`,
                                            fontFamily: placement.fontFamily || 'Inter',
                                            fontWeight: placement.fontWeight || 'normal',
                                            color: placement.color || '#000000',
                                            textAlign: (placement.textAlign as any) || 'left'
                                        }}
                                    >
                                        {String(value || '-')}
                                    </span>
                                </div>
                            )}
                            {placement.repeatOnEveryPage && (
                                <div className="absolute top-0 right-0 bg-primary text-white text-[6px] px-1 py-0.5 rounded-bl opacity-70 pointer-events-none uppercase font-bold z-50">
                                    Encabezado
                                </div>
                            )}
                        </div>
                    );
                }
            })}
        </div>
    );
}
