import { jsPDF } from 'jspdf';
import { FichaDesignVersion, FieldPlacement, ShapeElement, AvailableField } from '@/types/fichaDesign';
import { Pozo } from '@/types/pozo';
import { FIELD_PATHS } from '@/constants/fieldMapping';
import { blobStore } from '@/lib/storage/blobStore';

const TRANSLIT_MAP: Record<string, string> = {
    '\u00E1': 'a', '\u00E9': 'e', '\u00ED': 'i', '\u00F3': 'o', '\u00FA': 'u',
    '\u00C1': 'A', '\u00C9': 'E', '\u00CD': 'I', '\u00D3': 'O', '\u00DA': 'U',
    '\u00F1': 'n', '\u00D1': 'N', '\u00FC': 'u', '\u00DC': 'U'
};

function sanitizeTextForPDF(text: string): string {
    if (!text) return '';
    try {
        let result = String(text).normalize('NFC');
        return result.replace(/[\u00E1\u00E9\u00ED\u00F3\u00FA\u00C1\u00C9\u00CD\u00D3\u00DA\u00F1\u00D1\u00FC\u00DC]/g, (char) => {
            return TRANSLIT_MAP[char] || char;
        });
    } catch (e) {
        return String(text);
    }
}

function configurePDFFont(doc: jsPDF): void {
    try {
        doc.setLanguage('es-ES');
        if (typeof (doc as any).setCharSpace === 'function') {
            (doc as any).setCharSpace(0);
        }
    } catch (e) {
        console.warn('Error configurando fuente jsPDF:', e);
    }
}

function getSafeFont(fontFamily?: string): string {
    return 'helvetica';
}

const MM_TO_PX = 3.78;
const PX_TO_MM = 1 / MM_TO_PX;

/**
 * Helper para obtener valor de ruta (maneja anidamiento y arrays)
 */
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
        return undefined;
    }
};

/**
 * Obtiene las dimensiones de una imagen de forma asíncrona
 */
function getImageDimensions(url: string): Promise<{ width: number, height: number }> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !url || url === '-') {
            resolve({ width: 0, height: 0 });
            return;
        }
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => resolve({ width: 0, height: 0 });
        img.src = url;
    });
}

/**
 * Mapa de códigos para fotos basado en el ID del campo del diseño
 */
const PHOTO_CODE_MAP: Record<string, string> = {
    'foto_panoramica': 'P', 'foto_tapa': 'T', 'foto_interior': 'I',
    'foto_acceso': 'A', 'foto_fondo': 'F', 'foto_medicion': 'M',
    'foto_entrada_1': 'E1', 'foto_entrada_2': 'E2', 'foto_entrada_3': 'E3', 'foto_entrada_4': 'E4', 'foto_entrada_5': 'E5', 'foto_entrada_6': 'E6', 'foto_entrada_7': 'E7',
    'foto_salida_1': 'S1', 'foto_salida_2': 'S2', 'foto_salida_3': 'S3', 'foto_salida_4': 'S4', 'foto_salida_5': 'S5', 'foto_salida_6': 'S6', 'foto_salida_7': 'S7',
    'foto_sumidero_1': 'SUM1', 'foto_sumidero_2': 'SUM2', 'foto_sumidero_3': 'SUM3', 'foto_sumidero_4': 'SUM4', 'foto_sumidero_5': 'SUM5', 'foto_sumidero_6': 'SUM6', 'foto_sumidero_7': 'SUM7',
    'foto_descarga_1': 'D1', 'foto_descarga_2': 'D2', 'foto_descarga_3': 'D3', 'foto_descarga_4': 'D4', 'foto_descarga_5': 'D5', 'foto_descarga_6': 'D6', 'foto_descarga_7': 'D7',
    'foto_esquema': 'L', 'foto_shape': 'L'
};

/**
 * Busca una foto en el pozo que coincida con un código objetivo (P, I, E1, SUM1, etc.)
 */
function findPhotoByCode(pozo: Pozo, targetCode: string) {
    if (!pozo.fotos?.fotos) return null;
    const upperTarget = targetCode.toUpperCase();
    const pozoId = String(pozo.idPozo?.value || pozo.identificacion?.idPozo?.value || '').toUpperCase();
    const cleanPozoId = pozoId.split('_').pop() || '';

    // Función de match: ¿esta foto corresponde al código buscado?
    const matches = (f: any): boolean => {
        if (!f) return false;
        const fname = String(f.filename || f.name || f.id || '').toUpperCase();
        const sub = String(f.subcategoria || '').toUpperCase();
        
        if (sub === upperTarget) return true;

        if (upperTarget === 'L') {
            return fname.includes('MAPA') || fname.includes('LOCALIZACION') || fname.includes('ESQUEMA') || fname.includes('-L.') || fname.includes('_L.');
        }

        const hasPozo = fname.includes(cleanPozoId) || fname.includes(pozoId);
        const hasCode = fname.includes(`-${upperTarget}.`) || fname.includes(`_${upperTarget}.`) 
                     || fname.includes(`-${upperTarget}-`) || fname.includes(`_${upperTarget}-`);
        const isExactCode = fname.startsWith(`${upperTarget}.`);

        return (hasPozo && hasCode) || isExactCode;
    };

    // ★ CLAVE: Buscar PRIMERO fotos con blobId válido (locales),
    //   DESPUÉS las que tienen blobId vacío o remoto (Firestore)
    const allMatches = pozo.fotos.fotos.filter(f => matches(f));
    
    if (allMatches.length === 0) return null;
    if (allMatches.length === 1) return allMatches[0];

    // Priorizar: fotos con blobId real > fotos con blobId vacío/remoto
    const withValidBlob = allMatches.find(f => {
        const bid = f.blobId || '';
        return bid.length > 0 && !bid.startsWith('/api/') && !bid.startsWith('http');
    });
    
    return withValidBlob || allMatches[0];
}

/**
 * Resuelve el valor de un campo, manejando casos especiales de tuberías y fotos
 */
async function resolveFieldValue(
    pozo: Pozo, 
    fieldId: string, 
    codeMap: Record<string, string>,
    availableFields?: AvailableField[]
): Promise<{ value: any, link?: string }> {
    const logPrefix = `⚠️ [PDF] Resolviendo [${fieldId}]...`;
    
    // CASO ESPECIAL: Fotos específicas por nomenclatura
    if (fieldId.startsWith('foto_') && !/^\d+$/.test(fieldId.split('_')[1])) {
        const targetCode = codeMap[fieldId];
        if (targetCode) {
            const photo = findPhotoByCode(pozo, targetCode);
            if (photo) {
                const bId = photo.blobId || '';
                // SI YA ES UNA DATA URL O BLOB URL: Usar directamente
                if (bId.startsWith('data:') || bId.startsWith('blob:')) {
                    console.log(`${logPrefix} Foto encontrada [${targetCode}]`);
                    return { value: bId };
                }
                
                // ASEGURAR CARGA
                const url = await blobStore.ensureLoaded(bId);
                if (url) {
                    console.log(`${logPrefix} Foto cargada [${targetCode}]`);
                    return { value: url };
                }
            }
        }
        
        // Búsqueda de respaldo por nombre de campo si el código falla
        const fallbackId = fieldId.replace('foto_', '').toUpperCase();
        const fallbackPhoto = findPhotoByCode(pozo, fallbackId);
        if (fallbackPhoto) {
            const url = await blobStore.ensureLoaded(fallbackPhoto.blobId || '');
            if (url) return { value: url };
        }

        console.warn(`${logPrefix} Foto NO encontrada para código: ${targetCode || 'N/A'}`);
        return { value: '-' };
    }

    // CASO ESPECIAL: Campos de tuberías con prefijos ent_/sal_/sum_ (Sincronizado con DesignRenderer)
    if (fieldId.startsWith('ent_') || fieldId.startsWith('sal_') || fieldId.startsWith('sum_')) {
        const parts = fieldId.split('_'); // [ent, 1, diametro]
        const typePrefix = parts[0];
        const orderNum = parts[1];
        const fieldName = parts.slice(2).join('_');

        if (typePrefix === 'ent' || typePrefix === 'sal') {
            const targetType = typePrefix === 'ent' ? 'entrada' : 'salida';
            const pipe = (pozo.tuberias?.tuberias || []).find(t =>
                t && String(t.tipoTuberia?.value || '').toLowerCase() === targetType &&
                String(t.orden?.value) === orderNum
            );
            if (pipe) {
                const pipeFieldMap: Record<string, string> = {
                    'id': 'idTuberia', 'diametro': 'diametro', 'material': 'material',
                    'estado': 'estado', 'batea': 'batea', 'z': 'cota', 'emboquillado': 'emboquillado'
                };
                const targetField = pipeFieldMap[fieldName] || fieldName;
                const fieldVal = (pipe as any)[targetField];
                console.log(`${logPrefix} Tubería [${targetType} ${orderNum}] -> ${fieldName}: ${fieldVal?.value || '-'}`);
                return { value: fieldVal?.value || '-' };
            }
        } else if (typePrefix === 'sum') {
            const num = parseInt(orderNum);
            const sumidero = (pozo.sumideros?.sumideros || []).find(s => {
                if (!s) return false;
                const esquema = String(s.numeroEsquema?.value || '').toUpperCase();
                if (!esquema) return false;
                const esquemaNum = esquema.replace(/\D/g, ''); // "S1" -> "1"
                return esquemaNum === orderNum || parseInt(esquemaNum) === num;
            }) || (pozo.sumideros?.sumideros?.[num - 1] || undefined);

            if (sumidero) {
                const sumFieldMap: Record<string, string> = {
                    'id': 'idSumidero', 'tipo': 'tipoSumidero', 'material': 'materialTuberia',
                    'esquema': 'numeroEsquema', 'diametro': 'diametro', 'hSalida': 'alturaSalida', 'hLlegada': 'alturaLlegada'
                };
                const targetField = sumFieldMap[fieldName] || fieldName;
                const fieldVal = (sumidero as any)[targetField];
                console.log(`${logPrefix} Sumidero [Orden ${orderNum}] -> ${fieldName}: ${fieldVal?.value || '-'}`);
                return { value: fieldVal?.value || '-' };
            }
        }
        console.warn(`${logPrefix} Elemento técnico NO encontrado o vacío.`);
        return { value: '-' };
    }

    // Caso general por FIELD_PATHS o AvailableField
    const customField = availableFields?.find(f => f.id === fieldId);
    const path = FIELD_PATHS[fieldId] || customField?.fieldPath;
    
    if (path) {
        const basePath = path.endsWith('.value') ? path.substring(0, path.length - 6) : path;
        const fieldObj = getValueByPath(pozo, basePath);

        let value: any = '-';
        let link: string | undefined = undefined;

        if (fieldObj && typeof fieldObj === 'object') {
            value = fieldObj.value ?? '-';
            link = fieldObj.link;
        } else {
            value = fieldObj ?? '-';
        }

        // Fallback para links de ubicación
        if (!link && (fieldId.includes('latitud') || fieldId.includes('longitud') || fieldId.includes('coord') || fieldId.includes('enlace'))) {
            const lat = getValueByPath(pozo, 'identificacion.latitud.value');
            const lon = getValueByPath(pozo, 'identificacion.longitud.value');
            if (lat && lon && lat !== '-' && lon !== '-') {
                link = `https://www.google.com/maps?q=${lat},${lon}`;
            }
        }
        console.log(`${logPrefix} Ruta [${path}] -> ${value}`);
        return { value, link };
    }

    console.warn(`${logPrefix} No hay ruta definida para este campo.`);
    return { value: '-' };
}

export async function generatePdfFromDesign(
    design: FichaDesignVersion,
    pozo: Pozo,
    availableFields?: AvailableField[]
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
        console.log('🎨 Generando PDF con diseño optimizado:', design.name);

        const orientation = design.orientation === 'portrait' ? 'p' : 'l';
        const doc = new jsPDF({
            orientation,
            unit: 'mm',
            format: design.pageSize.toLowerCase() as any,
        });

        configurePDFFont(doc);

        // 1. PRE-CARGAR TODAS LAS FOTOS NECESARIAS
        const neededBlobIds = new Set<string>();
        for (const p of design.placements) {
            if (p.fieldId.startsWith('foto_') && !/^\d+$/.test(p.fieldId.split('_')[1])) {
                const targetCode = PHOTO_CODE_MAP[p.fieldId];
                if (targetCode) {
                    const photo = findPhotoByCode(pozo, targetCode);
                    if (photo?.blobId && !photo.blobId.startsWith('data:') && !photo.blobId.startsWith('blob:')) {
                        neededBlobIds.add(photo.blobId);
                    }
                }
            }
        }
        if (neededBlobIds.size > 0) {
            await blobStore.ensureMultipleLoaded(Array.from(neededBlobIds));
        }

        // 2. PROCESAR ELEMENTOS
        const allElements = [
            ...(design.shapes || []).map(s => ({ ...s, isShape: true })),
            ...(design.placements || []).map(p => ({ ...p, isShape: false }))
        ].sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0));

        // 3. MAPA DE VISIBILIDAD DE GRUPOS (Sincronizado con DesignRenderer)
        const groupVisibilityMap = new Map<string, boolean>();
        // Solo re-evaluamos visibilidad si NO es un layout ya optimizado por el motor flexible
        if (design.groups && !(design as any)._isFlexed) {
            design.groups.forEach(group => {
                const name = (group.name || '').toLowerCase();
                if (!name) return;
                let shouldHide = false;
                
                // DETECCIÓN TÉCNICA (Entradas, Salidas, Sumideros)
                if (name.includes('entrada') || name.includes('salida') || name.includes('sumidero')) {
                    const match = name.match(/(entrada|salida|sumidero)\s*(\d+)/);
                    if (match) {
                        const type = match[1];
                        const num = parseInt(match[2]);
                        
                        // Verificar si hay datos técnicos (tuberías/sumideros)
                        let hasTechData = false;
                        if (type === 'entrada' || type === 'salida') {
                            hasTechData = !!(pozo.tuberias?.tuberias || []).some(t =>
                                t && String(t.tipoTuberia?.value || '').toLowerCase() === type &&
                                String(t.orden?.value) === String(num)
                            );
                        } else {
                            hasTechData = !!(pozo.sumideros?.sumideros?.[num - 1] || pozo.sumideros?.sumideros?.some(s => {
                                if (!s) return false;
                                const esquema = String(s.numeroEsquema?.value || '').toUpperCase().replace(/\D/g, '');
                                return esquema === String(num);
                            }));
                        }

                        // Verificar si hay alguna foto para este slot (Refuerzo)
                        const children = [
                            ...design.placements.filter(p => p.groupId === group.id),
                            ...design.shapes.filter(s => s.groupId === group.id)
                        ] as any[];
                        
                        const hasPhotos = children.some(c => {
                            if (!c.fieldId?.startsWith('foto_')) return false;
                            const target = PHOTO_CODE_MAP[c.fieldId];
                            return !!(target && findPhotoByCode(pozo, target));
                        });

                        // SUPREME LOGIC: Ocultar solo si NO hay ni información NI foto (Request)
                        if (!hasTechData && !hasPhotos) {
                            shouldHide = true;
                        }
                    }
                }
                groupVisibilityMap.set(group.id, !shouldHide);
            });
        }

        const numPages = design.numPages || 1;
        for (let pIdx = 1; pIdx <= numPages; pIdx++) {
            if (pIdx > 1) doc.addPage();

            for (const el of allElements) {
                if (el.isVisible === false) continue;

                // Verificar visibilidad de grupo
                const elAsObj = el as any;
                if (elAsObj.groupId && groupVisibilityMap.has(elAsObj.groupId)) {
                    if (!groupVisibilityMap.get(elAsObj.groupId)) continue;
                }

                const isHeader = (el as any).repeatOnEveryPage;
                const elementPage = (el as any).pageNumber || 1;
                if (!isHeader && elementPage !== pIdx) continue;

                // APLICAR AJUSTE DE ALINEACIÓN (Requirement: mover unos pixeles a la izquierda)
                let xOffset = 0;
                const fieldId = (el as any).fieldId || '';
                const groupId = (el as any).groupId || '';
                
                if (fieldId.startsWith('ent_') || fieldId.startsWith('sal_') || fieldId.startsWith('sum_') || 
                    fieldId.startsWith('foto_ent') || fieldId.startsWith('foto_sal') || fieldId.startsWith('foto_sum') ||
                    groupId.toLowerCase().includes('entrada') || groupId.toLowerCase().includes('salida') || groupId.toLowerCase().includes('sumidero')) {
                    xOffset = -1.2; 
                }

                // Opacidad
                const opacity = (el as any).opacity ?? 1;
                doc.setGState(new (doc as any).GState({ opacity }));

                if (el.isShape) {
                    const shape = { ...el as ShapeElement };
                    shape.x += xOffset;
                    await renderShape(doc, shape);
                } else {
                    const placement = { ...el as FieldPlacement };
                    placement.x += xOffset;
                    const { value, link } = await resolveFieldValue(pozo, placement.fieldId, PHOTO_CODE_MAP, availableFields);

                    // ADAPTACIÓN DINÁMICA: Ocultar si es slot técnico vacío (Requirement synchronization)
                    const isTechnicalSlot =
                        placement.fieldId.startsWith('foto_') ||
                        placement.fieldId.startsWith('tub_') ||
                        placement.fieldId.startsWith('ent_') ||
                        placement.fieldId.startsWith('sal_') ||
                        placement.fieldId.startsWith('sum_');

                    const hasNoData = !value || value === '-' || value === '' || value === 'Sin foto';

                    if (!(isTechnicalSlot && hasNoData)) {
                        await renderField(doc, placement, pozo, value, link);
                    }
                }
            }
        }

        return { success: true, blob: doc.output('blob') };
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
}

async function renderShape(doc: jsPDF, shape: ShapeElement) {
    if (shape.type === 'rectangle' || shape.type === 'circle' || shape.type === 'triangle') {
        const style = (shape.fillColor && shape.fillColor !== 'transparent' && shape.strokeColor && shape.strokeColor !== 'transparent') ? 'FD' :
            (shape.fillColor && shape.fillColor !== 'transparent') ? 'F' : 'D';

        if (shape.fillColor && shape.fillColor !== 'transparent') doc.setFillColor(shape.fillColor);
        if (shape.strokeColor && shape.strokeColor !== 'transparent') {
            doc.setDrawColor(shape.strokeColor);
            doc.setLineWidth((shape.strokeWidth || 0.1) * PX_TO_MM);
        }

        if (shape.type === 'circle') {
            const radius = Math.min(shape.width, shape.height) / 2;
            doc.ellipse(shape.x + radius, shape.y + radius, radius, radius, style);
        } else if (shape.type === 'rectangle') {
            if (shape.borderRadius && shape.borderRadius > 0) {
                const r = shape.borderRadius / 3.78;
                (doc as any).roundedRect(shape.x, shape.y, shape.width, shape.height, r, r, style);
            } else {
                doc.rect(shape.x, shape.y, shape.width, shape.height, style);
            }
        } else if (shape.type === 'triangle') {
            doc.triangle(shape.x + shape.width / 2, shape.y, shape.x + shape.width, shape.y + shape.height, shape.x, shape.y + shape.height, style);
        }
    }

    if (shape.type === 'line') {
        doc.setDrawColor(shape.strokeColor || '#000000');
        doc.setLineWidth((shape.strokeWidth || 0.5) * PX_TO_MM);
        doc.line(shape.x, shape.y, shape.x + shape.width, shape.y + shape.height);
    }

    if (shape.type === 'text' && shape.content) {
        const fontSize = shape.fontSize || 10;
        doc.setFontSize(fontSize);
        doc.setTextColor(shape.color || '#000000');
        doc.setFont(getSafeFont(shape.fontFamily), (shape.fontWeight === 'bold') ? 'bold' : 'normal');
        const align = shape.textAlign || 'left';
        let x = shape.x;
        if (align === 'center') x = shape.x + (shape.width / 2);
        if (align === 'right') x = shape.x + shape.width;
        const lineHeight = fontSize * 0.3527;
        const y = shape.y + (shape.height / 2) + (lineHeight / 2) - 0.2;
        doc.text(sanitizeTextForPDF(shape.content), x, y, { maxWidth: shape.width, align: align });
    }

    if (shape.type === 'image' && shape.imageUrl) {
        try {
            const format = shape.imageUrl.toLowerCase().includes('png') ? 'PNG' : 'JPEG';
            const dims = await getImageDimensions(shape.imageUrl);

            let drawX = shape.x;
            let drawY = shape.y;
            let drawW = shape.width;
            let drawH = shape.height;

            if (dims.width > 0 && dims.height > 0) {
                const imgRatio = dims.width / dims.height;
                const containerRatio = shape.width / shape.height;

                if (imgRatio > containerRatio) {
                    drawW = shape.width;
                    drawH = shape.width / imgRatio;
                    drawY += (shape.height - drawH) / 2;
                } else {
                    drawH = shape.height;
                    drawW = shape.height * imgRatio;
                    drawX += (shape.width - drawW) / 2;
                }
            }

            doc.addImage(shape.imageUrl, format, drawX, drawY, drawW, drawH, undefined, 'FAST');
        } catch (e) { console.warn('No se pudo añadir imagen al PDF', e); }
    }
}

async function renderField(doc: jsPDF, placement: FieldPlacement, pozo: Pozo, value: any, link?: string) {
    const isPhoto = placement.fieldId.startsWith('foto_');
    const isWidget = placement.fieldId === 'widget_tuberias';

    if (placement.borderWidth || placement.backgroundColor) {
        const style = (placement.backgroundColor && placement.backgroundColor !== 'transparent' && placement.borderWidth && placement.borderWidth > 0) ? 'FD' :
            (placement.backgroundColor && placement.backgroundColor !== 'transparent') ? 'F' : 'S';
        if (placement.backgroundColor && placement.backgroundColor !== 'transparent') doc.setFillColor(placement.backgroundColor);
        if (placement.borderWidth && placement.borderWidth > 0) {
            doc.setDrawColor(placement.borderColor || '#000000');
            doc.setLineWidth(placement.borderWidth * PX_TO_MM);
        }
        if (style !== 'S' || (placement.borderWidth && placement.borderWidth > 0)) {
            if (placement.borderRadius && placement.borderRadius > 0) {
                const r = placement.borderRadius / 3.78;
                (doc as any).roundedRect(placement.x, placement.y, placement.width, placement.height, r, r, style);
            } else {
                doc.rect(placement.x, placement.y, placement.width, placement.height, style);
            }
        }
    }

    const fontSize = placement.fontSize || 10;
    const font = getSafeFont(placement.fontFamily);
    let labelAreaHeight = 0;
    let availableContentHeight = placement.height;

    if (placement.showLabel) {
        const labelText = sanitizeTextForPDF(placement.customLabel || placement.fieldId);
        const labelFontSize = placement.labelFontSize || (fontSize * 0.8);
        const labelPadding = placement.labelPadding || 0.5;
        labelAreaHeight = (labelFontSize * 0.4) + (labelPadding * 2);
        const labelWidthMM = placement.labelWidth || placement.width;
        if (placement.labelBackgroundColor && placement.labelBackgroundColor !== 'transparent') {
            doc.setFillColor(placement.labelBackgroundColor);
            doc.rect(placement.x, placement.y, labelWidthMM, labelAreaHeight, 'F');
        }
        doc.setFontSize(labelFontSize);
        doc.setFont(font, (placement.labelFontWeight === 'bold') ? 'bold' : 'normal');
        doc.setTextColor(placement.labelColor || '#6B7280');
        const labelAlign = placement.labelAlign || 'left';
        let labelX = placement.x + labelPadding;
        if (labelAlign === 'center') labelX = placement.x + (labelWidthMM / 2);
        if (labelAlign === 'right') labelX = placement.x + labelWidthMM - labelPadding;
        
        const isTechnicalField = placement.fieldId.startsWith('ent_') || placement.fieldId.startsWith('sal_') || placement.fieldId.startsWith('sum_');
        const textOptions: any = { align: labelAlign };
        if (!isTechnicalField) {
            textOptions.maxWidth = Math.max(0, labelWidthMM - (labelPadding * 2));
        }
        
        doc.text(labelText, labelX, placement.y + labelPadding + (labelFontSize * 0.28), textOptions);
        availableContentHeight -= labelAreaHeight;
    }

    if (isPhoto && value && value !== '-' && value !== '') {
        try {
            // Detección de formato más robusta
            const valueStr = String(value);
            const format = valueStr.includes('image/png') || valueStr.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';
            
            const dims = await getImageDimensions(value);

            let finalX = placement.x;
            let finalY = placement.y + labelAreaHeight;
            let finalW = placement.width;
            let finalH = availableContentHeight;

            if (dims.width > 0 && dims.height > 0) {
                const imgRatio = dims.width / dims.height;
                const containerRatio = placement.width / availableContentHeight;

                if (imgRatio > containerRatio) {
                    finalW = placement.width;
                    finalH = placement.width / imgRatio;
                    finalY += (availableContentHeight - finalH) / 2;
                } else {
                    finalH = availableContentHeight;
                    finalW = availableContentHeight * imgRatio;
                    finalX += (placement.width - finalW) / 2;
                }
            }

            console.group(`📸 [PDF] Renderizando Foto: ${placement.fieldId}`);
            console.log(`📏 Área: ${placement.width.toFixed(1)}x${availableContentHeight.toFixed(1)}mm`);
            console.log(`📐 Dibujo: ${finalW.toFixed(1)}x${finalH.toFixed(1)}mm`);
            console.log(`🖼️ Formato: ${format}`);
            console.groupEnd();

            // EJECUCIÓN DEL DIBUJO
            doc.addImage(value, format, finalX, finalY, finalW, finalH, undefined, 'FAST');
            console.log(`✅ [PDF] Foto ${placement.fieldId} dibujada con éxito.`);
        } catch (e) {
            console.warn(`Error dibujando foto ${placement.fieldId}:`, e);
        }
        return;
    }

    if (isWidget && placement.fieldId === 'widget_tuberias') {
        const tuberias = (pozo.tuberias?.tuberias || []).slice(0, 10);
        const headers = ['#', 'Ø (")', 'Material', 'Estado', 'Batea', 'Z'];
        const headerH = 5;
        doc.setFillColor('#e5e7eb');
        doc.rect(placement.x, placement.y + labelAreaHeight, placement.width, headerH, 'F');
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor('#000000');
        const colWidths = [0.1, 0.15, 0.25, 0.2, 0.2, 0.1].map(w => w * placement.width);
        let cx = placement.x;
        headers.forEach((h, i) => { doc.text(h, cx + 1, placement.y + labelAreaHeight + 3.5); cx += colWidths[i]; });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5);
        const rowH = (availableContentHeight - headerH) / Math.max(tuberias.length, 1);
        tuberias.forEach((t, i) => {
            const ry = placement.y + labelAreaHeight + headerH + (i * rowH);
            let curX = placement.x;
            const vals = [String(t.orden?.value || i + 1), String(t.diametroPulgadas?.value || t.diametro?.value || '-'), t.material?.value, t.estado?.value, t.batea?.value, t.cota?.value || t.z?.value || '-'];
            vals.forEach((v, ci) => {
                doc.text(sanitizeTextForPDF(String(v || '-')), curX + 1, ry + (rowH / 2) + 1, { maxWidth: colWidths[ci] - 1 });
                curX += colWidths[ci];
            });
        });
        return;
    }

    const content = String(value ?? '');
    let currentFontSize = fontSize;
    doc.setFontSize(currentFontSize);
    doc.setFont(font, (placement.fontWeight === 'bold') ? 'bold' : 'normal');
    if (link) { doc.setTextColor('#0000FF'); } else { doc.setTextColor(placement.color || '#000000'); }
    
    const padding = placement.padding || 1;
    const align = placement.textAlign || 'left';
    let tx = placement.x + padding;
    if (align === 'center') tx = placement.x + (placement.width / 2);
    if (align === 'right') tx = placement.x + placement.width - padding;
    
    let textContent = sanitizeTextForPDF(content);
    const maxW = placement.width - (padding * 2);
    const fontHeightMM = currentFontSize * 0.3527;
    const isSingleLine = availableContentHeight <= (fontHeightMM * 1.8);

    if (isSingleLine && maxW > 0) {
        const originalText = textContent;
        let shrunk = false;
        
        while (doc.getTextWidth(textContent) > maxW && currentFontSize > 5) {
            currentFontSize -= 0.5;
            doc.setFontSize(currentFontSize);
            shrunk = true;
        }
        
        if (doc.getTextWidth(textContent) > maxW) {
            let truncated = textContent;
            while (truncated.length > 3 && doc.getTextWidth(truncated + '...') > maxW) {
                truncated = truncated.slice(0, -1);
            }
            textContent = truncated + '...';
            console.warn(`📏 [PDF Layout] Texto truncado para evitar desbordamiento: "${originalText}" -> "${textContent}"`);
        } else if (shrunk) {
            console.info(`📏 [PDF Layout] Fuente reducida a ${currentFontSize}pt para encajar texto: "${originalText}"`);
        }
    }

    const lh = currentFontSize * 0.3527;
    let ty = placement.y + labelAreaHeight + (availableContentHeight / 2) + (lh / 2.5);
    
    if (isSingleLine) {
        doc.text(textContent, tx, ty, { align: align });
    } else {
        // En cajas multiline, doc.text desde la parte superior
        ty = placement.y + labelAreaHeight + padding + lh; 
        doc.text(textContent, tx, ty, { maxWidth: maxW, align: align });
    }

    if (link && content && content !== '-') {
        const tw = doc.getTextWidth(textContent);
        let lx = tx;
        if (align === 'center') lx = tx - (tw / 2);
        if (align === 'right') lx = tx - tw;
        doc.link(lx, ty - (currentFontSize * 0.4), tw, currentFontSize * 0.4, { url: link });
    }
}
