/**
 * DesignRenderer - Renderiza un diseño visual con datos reales para previsualización y PDF
 */

'use client';

import { FichaDesignVersion, AvailableField } from '@/types/fichaDesign';
import { Pozo } from '@/types/pozo';
import { blobStore } from '@/lib/storage/blobStore';
import { FIELD_PATHS } from '@/constants/fieldMapping';

interface DesignRendererProps {
    design: FichaDesignVersion;
    pozo: Pozo;
    availableFields?: AvailableField[];
    zoom?: number;
}

export function DesignRenderer({ design, pozo, availableFields, zoom = 1 }: DesignRendererProps) {
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

    // Helper para verificar si un grupo tiene fotos asignadas
    const checkGroupHasPhotos = (groupId: string) => {
        const groupElements = [
            ...design.placements.filter(p => p.groupId === groupId),
            ...design.shapes.filter(s => s.groupId === groupId)
        ];

        return groupElements.some(el => {
            if (!(el as any).fieldId?.startsWith('foto_')) return false;
            const val = getFieldValue((el as any).fieldId);
            return val && val !== '-';
        });
    };

    // Helper para obtener valor de campo con fallback
    const getFieldValue = (fieldId: string) => {
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
                let found = pozo.fotos?.fotos?.find(f =>
                    String(f.subcategoria || '').toUpperCase() === upperTarget
                );

                if (!found) {
                    found = pozo.fotos?.fotos?.find(f => {
                        const filename = String(f.filename || '').toUpperCase().split('.')[0]; // Sin extensión

                        // REGLA: Omitir si termina en AT o Z
                        if (filename.endsWith('-AT') || filename.endsWith('_AT') ||
                            filename.endsWith('-Z') || filename.endsWith('_Z')) {
                            return false;
                        }

                        // 1. Coincidencia Exacta de la Subcategoría
                        const subcat = String(f.subcategoria || '').toUpperCase();
                        if (subcat === upperTarget) return true;

                        // 2. Lógica por Categoría
                        if (upperTarget === 'P') return filename === 'P' || filename === 'F-P' || filename === 'S-P' || filename.includes('-P');
                        if (upperTarget === 'T') return filename === 'T' || filename === 'F-T' || filename === 'TT' || filename.includes('-T');
                        if (upperTarget === 'I') return filename === 'I' || filename === 'F-I' || filename === 'II' || /^I\d?$/.test(filename) || filename.includes('-I');

                        // ENTRADAS
                        if (upperTarget.startsWith('E')) {
                            const num = upperTarget.replace('E', '');
                            if (num === '1' && (filename === 'E-T' || filename.includes('-E-T'))) return true;
                            const regex = new RegExp(`(^|[\\-_])E${num}([\\-_\\.]|$)`);
                            return regex.test(filename) || filename.includes(`F-E${num}`);
                        }

                        // SALIDAS
                        if (upperTarget.startsWith('S') && !upperTarget.startsWith('SUM')) {
                            const num = upperTarget.replace('S', '');
                            if (num === '1' && (filename === 'S' || filename === 'S-T' || filename === 'S-HS' || filename.includes('-S-T'))) return true;
                            if (filename.includes('-E')) return false;
                            const regex = new RegExp(`(^|[\\-_])S${num}([\\-_\\.]|$)`);
                            return regex.test(filename) || filename.includes(`F-S${num}`);
                        }

                        // SUMIDEROS
                        if (upperTarget.startsWith('SUM')) {
                            const num = upperTarget.replace('SUM', '');
                            const regexSum = new RegExp(`(^|[\\-_])SUM${num}([\\-_\\.]|$)`);
                            return regexSum.test(filename);
                        }

                        if (upperTarget === 'L') return filename.includes('_ARGIS') || filename === 'L';
                        return false;
                    });
                }

                if (found) return found.blobId || (found as any).dataUrl || '-';
            }
        }

        // REGLA ESPECIAL: Campos de Entradas/Salidas/Sumideros específicas
        if (fieldId.startsWith('ent_') || fieldId.startsWith('sal_') || fieldId.startsWith('sum_')) {
            const parts = fieldId.split('_'); 
            const typePrefix = parts[0]; 
            const orderNum = parts[1]; 
            const fieldName = parts.slice(2).join('_'); 

            if (typePrefix === 'ent' || typePrefix === 'sal') {
                const targetType = typePrefix === 'ent' ? 'entrada' : 'salida';
                const pipe = (pozo.tuberias?.tuberias || []).find(t =>
                    t && String(t.tipoTuberia?.value || '').toLowerCase() === targetType &&
                    String(t.orden?.value) === orderNum
                );
                if (!pipe) return '-';

                const pipeFieldMap: Record<string, string> = {
                    'id': 'idTuberia', 'diametro': 'diametro', 'material': 'material',
                    'estado': 'estado', 'batea': 'batea', 'z': 'cota', 'emboquillado': 'emboquillado'
                };
                const targetField = pipeFieldMap[fieldName] || fieldName;
                return (pipe as any)[targetField]?.value || '-';
            } else if (typePrefix === 'sum') {
                const num = parseInt(orderNum);
                const sumidero = (pozo.sumideros?.sumideros || []).find(s => {
                    if (!s) return false;
                    const esquema = String(s.numeroEsquema?.value || '').toUpperCase();
                    if (!esquema) return false;
                    const esquemaNum = esquema.replace(/\D/g, '');
                    return esquemaNum === orderNum || parseInt(esquemaNum) === num;
                }) || (pozo.sumideros?.sumideros?.[num - 1] || undefined);

                if (!sumidero) return '-';

                const sumFieldMap: Record<string, string> = {
                    'id': 'idSumidero', 'tipo': 'tipoSumidero', 'material': 'materialTuberia',
                    'esquema': 'numeroEsquema', 'diametro': 'diametro', 'hSalida': 'alturaSalida', 'hLlegada': 'alturaLlegada'
                };
                const targetField = sumFieldMap[fieldName] || fieldName;
                return (sumidero as any)[targetField]?.value || '-';
            }
        }

        // Caso general por FIELD_PATHS o AvailableField
        const customField = availableFields?.find(f => f.id === fieldId);
        const path = FIELD_PATHS[fieldId] || customField?.fieldPath;
        
        if (path) {
            const val = getValueByPath(pozo, path);
            return val !== undefined && val !== null ? val : '-';
        }

        return '-';
    };

    // Helper para obtener enlace de campo
    const getFieldLink = (fieldId: string) => {
        const customField = availableFields?.find(f => f.id === fieldId);
        const path = FIELD_PATHS[fieldId] || customField?.fieldPath;
        if (!path) return undefined;

        const linkPath = path.replace('.value', '.link');
        let link = getValueByPath(pozo, linkPath);

        // FALLBACK: Si es un campo de coordenadas y no tiene link, generarlo automáticamente si hay lat/long
        if (!link && (fieldId.includes('latitud') || fieldId.includes('longitud') || fieldId.includes('coord') || fieldId.includes('enlace'))) {
            const lat = getValueByPath(pozo, 'identificacion.latitud.value');
            const lon = getValueByPath(pozo, 'identificacion.longitud.value');
            if (lat && lon && lat !== '-' && lon !== '-') {
                link = `https://www.google.com/maps?q=${lat},${lon}`;
            }
        }
        return link;
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

    // Mapa de visibilidad de grupos dinámicos
    const groupVisibilityMap = new Map<string, boolean>();

    if (design.groups) {
        design.groups.forEach(group => {
            const name = (group.name || '').toLowerCase();
            if (!name) return;

            let shouldHide = false;

            // Lógica de ocultación por nombre de grupo
            if (name.includes('entrada') || name.includes('salida')) {
                const match = name.match(/(entrada|salida)\s*(\d+)/);
                if (match) {
                    const type = match[1];
                    const num = match[2];

                    const pipe = (pozo.tuberias?.tuberias || []).find(t =>
                        t && String(t.tipoTuberia?.value || '').toLowerCase() === type &&
                        String(t.orden?.value) === num
                    );

                    const hasTechData = !!pipe;
                    const hasPhotos = checkGroupHasPhotos(group.id);

                    // SUPREME LOGIC: Ambos deben existir (Request)
                    if (!hasTechData || !hasPhotos) {
                        shouldHide = true;
                    }
                }
            } else if (name.includes('sumidero')) {
                const match = name.match(/sumidero\s*(\d+)/);
                if (match) {
                    const num = parseInt(match[1]);
                    const sumidero = (pozo.sumideros?.sumideros || []).find(s => {
                        if (!s) return false;
                        const esquema = String(s.numeroEsquema?.value || '').toUpperCase();
                        if (!esquema) return false;
                        const esquemaNum = esquema.replace(/\D/g, '');
                        return esquemaNum === match[1] || parseInt(esquemaNum) === num;
                    }) || (pozo.sumideros?.sumideros?.[num - 1] || undefined);
                    
                    const hasTechData = !!sumidero;
                    const hasPhotos = checkGroupHasPhotos(group.id);
                    
                    // SUPREME LOGIC: Ambos deben existir (Request)
                    if (!hasTechData || !hasPhotos) {
                        shouldHide = true;
                    }
                }
            }

            groupVisibilityMap.set(group.id, !shouldHide);
        });
    }

    const renderElement = (el: any, isShape: boolean, currentPage: number) => {
        // Verificar si el grupo al que pertenece el elemento está oculto
        if (el.groupId && groupVisibilityMap.has(el.groupId)) {
            if (!groupVisibilityMap.get(el.groupId)) return null;
        }

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
                            textAlign: shape.textAlign || 'left',
                            justifyContent: shape.textAlign === 'center' ? 'center' : (shape.textAlign === 'right' ? 'flex-end' : 'flex-start')
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

            // ADAPTACIÓN DINÁMICA: Si es un slot técnico y no tiene datos, saltar renderizado en preview
            const isTechnicalSlot =
                placement.fieldId.startsWith('foto_entrada_') ||
                placement.fieldId.startsWith('foto_salida_') ||
                placement.fieldId.startsWith('foto_sumidero_') ||
                placement.fieldId.startsWith('foto_descarga_') ||
                placement.fieldId.startsWith('tub_') ||
                placement.fieldId.startsWith('ent_') ||
                placement.fieldId.startsWith('sal_') ||
                placement.fieldId.startsWith('sum_');

            const hasNoData = !value || value === '-' || value === '' || value === 'Sin foto';

            if (isTechnicalSlot && hasNoData) {
                return null;
            }

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
                                <img src={typeof value === 'string' && value.startsWith('data:') ? value : blobStore.getUrl(String(value))} alt="" className="w-full h-full object-contain" />
                            )}
                        </div>
                    ) : isWidget ? (
                        <div className="w-full h-full border border-gray-300 rounded overflow-hidden text-[5.5pt] bg-white">
                            <div className="grid grid-cols-6 bg-gray-100 font-bold border-b border-gray-300 p-1">
                                <span>#</span>
                                <span>Ø (")</span>
                                <span>Material</span>
                                <span>Estado</span>
                                <span>Batea</span>
                                <span>Z</span>
                            </div>
                            {(pozo.tuberias?.tuberias || []).filter(t => t !== null).slice(0, 10).map((t, idx) => (
                                <div key={idx} className="grid grid-cols-6 border-b border-gray-200 p-1 last:border-0 bg-white">
                                    <span>{t.orden?.value || idx + 1}</span>
                                    <span>{t.diametroPulgadas?.value || t.diametro?.value || '-'}</span>
                                    <span>{t.material?.value || '-'}</span>
                                    <span>{t.estado?.value || '-'}</span>
                                    <span>{t.batea?.value || '-'}</span>
                                    <span>{t.cota?.value || t.z?.value || '-'}</span>
                                </div>
                            ))}
                            {(pozo.tuberias?.tuberias || []).filter(t => t !== null).length === 0 && <div className="p-2 text-center text-gray-400 italic">Sin tuberías</div>}
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
                                        {placement.customLabel || availableFields?.find(f => f.id === placement.fieldId)?.label || placement.fieldId}
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
                                <span className={`block truncate ${getFieldLink(placement.fieldId) ? 'text-blue-600 underline cursor-pointer hover:text-blue-800' : ''}`} style={{
                                    fontSize: `${(placement.fontSize || 10) * zoom}pt`,
                                    fontFamily: placement.fontFamily || 'Inter',
                                    fontWeight: placement.fontWeight || 'normal',
                                    color: getFieldLink(placement.fieldId) ? undefined : (placement.color || '#000'),
                                    lineHeight: 1.2,
                                    maxWidth: '100%'
                                }}
                                    onClick={() => {
                                        const link = getFieldLink(placement.fieldId);
                                        if (link) window.open(link, '_blank');
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
