import { jsPDF } from 'jspdf';
import { FichaDesignVersion, FieldPlacement, ShapeElement } from '@/types/fichaDesign';
import { Pozo } from '@/types/pozo';
import { FIELD_PATHS } from '@/constants/fieldMapping';
import {
    drawSectionHeader,
    drawDataTable,
    drawFieldTable,
    drawPhotoGrid,
    extractTuberiasData,
    extractSumiderosData,
    extractIdentificacionFields,
    extractEstructuraFields,
    DEFAULT_STYLES
} from './designHelpers';

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
const DEFAULT_FONT_SIZE = 10;

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

export async function generatePdfFromDesign(
    design: FichaDesignVersion,
    pozo: Pozo
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
        console.log('🎨 Generando PDF con diseño personalizado:', {
            nombre: design.name,
            placements: design.placements?.length || 0,
            pageSize: design.pageSize
        });

        const orientation = design.orientation === 'portrait' ? 'p' : 'l';
        const doc = new jsPDF({
            orientation,
            unit: 'mm',
            format: design.pageSize.toLowerCase() as any,
        });

        configurePDFFont(doc);
        const { blobStore } = await import('@/lib/storage/blobStore');

        // MAPEO DE CÓDIGOS PARA FOTOS
        const codeMap: Record<string, string> = {
            'foto_panoramica': 'P', 'foto_tapa': 'T', 'foto_interior': 'I',
            'foto_acceso': 'A', 'foto_fondo': 'F', 'foto_medicion': 'M',
            'foto_entrada_1': 'E1', 'foto_entrada_2': 'E2', 'foto_entrada_3': 'E3', 'foto_entrada_4': 'E4', 'foto_entrada_5': 'E5', 'foto_entrada_6': 'E6', 'foto_entrada_7': 'E7',
            'foto_salida_1': 'S1', 'foto_salida_2': 'S2', 'foto_salida_3': 'S3', 'foto_salida_4': 'S4', 'foto_salida_5': 'S5', 'foto_salida_6': 'S6', 'foto_salida_7': 'S7',
            'foto_sumidero_1': 'SUM1', 'foto_sumidero_2': 'SUM2', 'foto_sumidero_3': 'SUM3', 'foto_sumidero_4': 'SUM4', 'foto_sumidero_5': 'SUM5', 'foto_sumidero_6': 'SUM6', 'foto_sumidero_7': 'SUM7',
            'foto_descarga_1': 'D1', 'foto_descarga_2': 'D2', 'foto_descarga_3': 'D3', 'foto_descarga_4': 'D4', 'foto_descarga_5': 'D5', 'foto_descarga_6': 'D6', 'foto_descarga_7': 'D7',
            'foto_esquema': 'L', 'foto_shape': 'L'
        };

        // 1. PRE-CARGA DE BLOBS
        const neededBlobIds = new Set<string>();
        design.placements.filter(p => p.fieldId.startsWith('foto_') && !/^\d+$/.test(p.fieldId.split('_')[1])).forEach(p => {
            const targetCode = codeMap[p.fieldId];
            if (targetCode) {
                const upperTarget = targetCode.toUpperCase();
                const f = pozo.fotos?.fotos?.find(f => {
                    const filename = String(f.filename || '').toUpperCase().split('.')[0];
                    if (filename.endsWith('-AT') || filename.endsWith('_AT') || filename.endsWith('-Z') || filename.endsWith('_Z')) return false;

                    const subcat = String(f.subcategoria || '').toUpperCase();
                    if (subcat === upperTarget) return true;

                    if (upperTarget === 'P') return filename === 'P' || filename === 'F-P' || filename === 'S-P' || filename.includes('-P');
                    if (upperTarget === 'T') return filename === 'T' || filename === 'F-T' || filename === 'TT' || filename.includes('-T');
                    if (upperTarget === 'I') return filename === 'I' || filename === 'F-I' || filename === 'II' || /^I\d?$/.test(filename) || /^I\(\d+\)$/.test(filename);
                    if (upperTarget.startsWith('E')) {
                        const num = upperTarget.replace('E', '');
                        if (num === '1' && (filename === 'E-T' || filename.includes('-E-T'))) return true;
                        return new RegExp(`(^|[\\-_])E${num}([\\-_\\.]|$)`).test(filename) || filename.includes(`F-E${num}`);
                    }
                    if (upperTarget.startsWith('S') && !upperTarget.startsWith('SUM')) {
                        const num = upperTarget.replace('S', '');
                        if (num === '1' && (filename === 'S' || filename === 'S-T' || filename === 'S-HS' || filename === 'F-S-T')) return true;
                        return new RegExp(`(^|[\\-_])S${num}([\\-_\\.]|$)`).test(filename) || new RegExp(`(^|[\\-_])S${num}([\\-_\\.]|$)`).test(filename.replace(/-/g, '')) || filename.includes(`F-S${num}`);
                    }
                    if (upperTarget.startsWith('SUM')) {
                        const num = upperTarget.replace('SUM', '');
                        return new RegExp(`(^|[\\-_])SUM${num}([\\-_\\.]|$)`).test(filename) || new RegExp(`(^|[\\-_])S${num}([\\-_\\.]|$)`).test(filename);
                    }
                    if (upperTarget === 'L') return filename.includes('_ARGIS') || filename === 'L';
                    return false;
                });
                if (f?.blobId) neededBlobIds.add(f.blobId);
            }
        });
        if (neededBlobIds.size > 0) await blobStore.ensureMultipleLoaded(Array.from(neededBlobIds));

        // 2. ORDENACIÓN Y RENDERIZADO
        const allElements = [
            ...(design.shapes || []).map(s => ({ ...s, isShape: true })),
            ...(design.placements || []).map(p => ({ ...p, isShape: false }))
        ].sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0));

        const numPages = design.numPages || 1;
        for (let pIdx = 1; pIdx <= numPages; pIdx++) {
            if (pIdx > 1) doc.addPage();

            for (const el of allElements) {
                if (el.isVisible === false) continue;
                const isHeader = (el as any).repeatOnEveryPage;
                const elementPage = (el as any).pageNumber || 1;
                if (!isHeader && elementPage !== pIdx) continue;

                // Opacidad
                const opacity = (el as any).opacity ?? 1;
                doc.setGState(new (doc as any).GState({ opacity }));

                if (el.isShape) {
                    await renderShape(doc, el as ShapeElement);
                } else {
                    const placement = el as FieldPlacement;
                    let value: any = '-';
                    let link: string | undefined = undefined;

                    // RESOLUCIÓN DE VALOR
                    if (placement.fieldId.startsWith('foto_') && !/^\d+$/.test(placement.fieldId.split('_')[1])) {
                        let targetCode = codeMap[placement.fieldId];

                        // Fallback: Deducir código de FIELD_PATHS si no está en codeMap (ej: fotos.fotos[E1] -> E1)
                        if (!targetCode) {
                            const path = FIELD_PATHS[placement.fieldId];
                            if (path && path.includes('[') && path.includes(']')) {
                                targetCode = path.split('[').pop()?.split(']').shift() || '';
                            }
                        }

                        const typeKey = placement.fieldId.replace('foto_', '');
                        if (targetCode) {
                            const upperTarget = targetCode.toUpperCase();

                            // Búsqueda inteligente
                            let found = pozo.fotos?.fotos?.find(f => {
                                const filename = String(f.filename || '').toUpperCase().split('.')[0];
                                if (filename.endsWith('-AT') || filename.endsWith('_AT') || filename.endsWith('-Z') || filename.endsWith('_Z')) return false;

                                const subcat = String(f.subcategoria || '').toUpperCase();
                                if (subcat === upperTarget) return true;

                                if (upperTarget === 'P') return filename === 'P' || filename === 'F-P' || filename === 'S-P' || filename.includes('-P');
                                if (upperTarget === 'T') return filename === 'T' || filename === 'F-T' || filename === 'TT' || filename.includes('-T');
                                if (upperTarget === 'I') return filename === 'I' || filename === 'F-I' || filename === 'II' || /^I\d?$/.test(filename) || /^I\(\d+\)$/.test(filename);
                                if (upperTarget.startsWith('E')) {
                                    const num = upperTarget.replace('E', '');
                                    if (num === '1' && (filename === 'E-T' || filename.includes('-E-T'))) return true;
                                    return new RegExp(`(^|[\\-_])E${num}([\\-_\\.]|$)`).test(filename) || filename.includes(`F-E${num}`);
                                }
                                if (upperTarget.startsWith('S') && !upperTarget.startsWith('SUM')) {
                                    const num = upperTarget.replace('S', '');
                                    if (num === '1' && (filename === 'S' || filename === 'S-T' || filename === 'S-HS' || filename === 'F-S-T')) return true;
                                    return new RegExp(`(^|[\\-_])S${num}([\\-_\\.]|$)`).test(filename) || new RegExp(`(^|[\\-_])S${num}([\\-_\\.]|$)`).test(filename.replace(/-/g, '')) || filename.includes(`F-S${num}`);
                                }
                                if (upperTarget.startsWith('SUM')) {
                                    const num = upperTarget.replace('SUM', '');
                                    return new RegExp(`(^|[\\-_])SUM${num}([\\-_\\.]|$)`).test(filename) || new RegExp(`(^|[\\-_])S${num}([\\-_\\.]|$)`).test(filename);
                                }
                                if (upperTarget === 'L') return filename.includes('_ARGIS') || filename === 'L';
                                return false;
                            });

                            if (!found) {
                                found = pozo.fotos?.fotos?.find(f =>
                                    String(f.tipo || '').toUpperCase() === typeKey.toUpperCase() ||
                                    (f.subcategoria && String(f.subcategoria).toUpperCase().includes(upperTarget))
                                );
                            }

                            if (found) value = found.blobId ? blobStore.getUrl(found.blobId) : ((found as any).dataUrl || '-');
                        }
                    } else {
                        // Campos de datos
                        const path = FIELD_PATHS[placement.fieldId];
                        if (path) {
                            const basePath = path.endsWith('.value') ? path.substring(0, path.length - 6) : path;
                            const fieldObj = getValueByPath(pozo, basePath);
                            if (fieldObj && typeof fieldObj === 'object') {
                                value = fieldObj.value ?? '-';
                                link = fieldObj.link;
                            } else {
                                value = fieldObj ?? '-';
                            }
                            if (!link && (placement.fieldId.includes('latitud') || placement.fieldId.includes('longitud'))) {
                                const lat = getValueByPath(pozo, 'identificacion.latitud.value');
                                const lon = getValueByPath(pozo, 'identificacion.longitud.value');
                                if (lat && lon && lat !== '-' && lon !== '-') link = `https://www.google.com/maps?q=${lat},${lon}`;
                            }
                        }
                    }

                    // ADAPTACIÓN DINÁMICA
                    const isTechnicalSlot = placement.fieldId.startsWith('foto_entrada_') || placement.fieldId.startsWith('foto_salida_') ||
                        placement.fieldId.startsWith('foto_sumidero_') || placement.fieldId.startsWith('foto_descarga_') ||
                        placement.fieldId.startsWith('tub_') || placement.fieldId.startsWith('sum_');

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
            const img = new Image();
            img.src = shape.imageUrl;
            await new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
                setTimeout(() => resolve(), 1000);
            });
            if (img.width > 0) {
                const imgAspect = img.width / img.height;
                const boxAspect = shape.width / shape.height;
                let drawW = shape.width, drawH = shape.height, drawX = shape.x, drawY = shape.y;
                if (imgAspect > boxAspect) {
                    drawH = shape.width / imgAspect;
                    drawY = shape.y + (shape.height - drawH) / 2;
                } else {
                    drawW = shape.height * imgAspect;
                    drawX = shape.x + (shape.width - drawW) / 2;
                }
                const format = shape.imageUrl.toLowerCase().includes('png') ? 'PNG' : 'JPEG';
                doc.addImage(shape.imageUrl, format, drawX, drawY, drawW, drawH, undefined, 'FAST');
            }
        } catch (e) { console.warn('No se pudo añadir imagen al PDF', e); }
    }
}

async function renderField(doc: jsPDF, placement: FieldPlacement, pozo: Pozo, value: any, link?: string) {
    const isPhoto = placement.fieldId.startsWith('foto_');
    const isWidget = placement.fieldId.startsWith('widget_');

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
        doc.text(labelText, labelX, placement.y + labelPadding + (labelFontSize * 0.28), { align: labelAlign, maxWidth: labelWidthMM - (labelPadding * 2) });
        availableContentHeight -= labelAreaHeight;
    }

    if (isPhoto && value && value !== '-') {
        try {
            const img = new Image();
            img.src = value;
            await new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
                setTimeout(() => resolve(), 2000);
            });
            const imgAspect = img.width / img.height;
            const contentAreaY = placement.y + labelAreaHeight;
            const boxAspect = placement.width / availableContentHeight;
            let drawW = placement.width, drawH = availableContentHeight, drawX = placement.x, drawY = contentAreaY;
            if (imgAspect > boxAspect) {
                drawH = placement.width / imgAspect;
                drawY = contentAreaY + (availableContentHeight - drawH) / 2;
            } else {
                drawW = availableContentHeight * imgAspect;
                drawX = placement.x + (placement.width - drawW) / 2;
            }
            const format = String(value).toLowerCase().includes('png') ? 'PNG' : 'JPEG';
            doc.addImage(value, format, drawX, drawY, drawW, drawH, undefined, 'FAST');
        } catch (e) { console.warn(`Error foto ${placement.fieldId}`, e); }
        return;
    }

    if (isWidget && placement.fieldId === 'widget_tuberias') {
        const tuberias = (pozo.tuberias?.tuberias || []).slice(0, 10);
        const headers = ['#', 'Ø (")', 'Material', 'Estado', 'Batea'];
        const headerH = 5;
        const contentAreaY = placement.y + labelAreaHeight;
        const rowH = (availableContentHeight - headerH) / Math.max(tuberias.length, 1);
        doc.setFillColor('#e5e7eb');
        doc.rect(placement.x, contentAreaY, placement.width, headerH, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#000000');
        const colWidths = [0.1, 0.15, 0.35, 0.2, 0.2].map(w => w * placement.width);
        let curX = placement.x;
        headers.forEach((h, i) => { doc.text(h, curX + 1, contentAreaY + 3.5); curX += colWidths[i]; });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        tuberias.forEach((t, i) => {
            const ry = contentAreaY + headerH + (i * rowH);
            let cx = placement.x;
            [String(t.orden?.value || i + 1), String(t.diametroPulgadas?.value || t.diametro?.value || '-'), String(t.material?.value || '-'), String(t.estado?.value || '-'), String(t.batea?.value || '-')].forEach((val, ci) => {
                doc.text(sanitizeTextForPDF(val), cx + 1, ry + (rowH / 2) + 1, { maxWidth: colWidths[ci] - 1 });
                cx += colWidths[ci];
            });
        });
        return;
    }

    const content = String(value ?? '');
    doc.setFontSize(fontSize);
    doc.setFont(font, (placement.fontWeight === 'bold') ? 'bold' : 'normal');
    if (link) { doc.setTextColor('#0000FF'); } else { doc.setTextColor(placement.color || '#000000'); }
    const padding = placement.padding || 1;
    const align = placement.textAlign || 'left';
    let tx = placement.x + padding;
    if (align === 'center') tx = placement.x + (placement.width / 2);
    if (align === 'right') tx = placement.x + placement.width - padding;
    const lh = fontSize * 0.3527;
    const ty = placement.y + labelAreaHeight + (availableContentHeight / 2) + (lh / 2.5);
    const textContent = sanitizeTextForPDF(content);
    doc.text(textContent, tx, ty, { maxWidth: placement.width - (padding * 2), align: align });
    if (link && content && content !== '-') {
        const tw = doc.getTextWidth(textContent);
        let lx = tx;
        if (align === 'center') lx = tx - (tw / 2);
        if (align === 'right') lx = tx - tw;
        doc.link(lx, ty - (fontSize * 0.4), tw, fontSize * 0.4, { url: link });
        doc.setDrawColor('#0000FF'); doc.setLineWidth(0.1); doc.line(lx, ty + 0.5, lx + tw, ty + 0.5);
    }
}
