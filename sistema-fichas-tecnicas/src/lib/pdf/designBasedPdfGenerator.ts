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
// Eliminadas dependencias externas de pdfFontUtils para evitar errores de compilación
// Se incluyeron versiones simplificadas locales para mantener robustez

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

// Constantes de diseño para asegurar fidelidad visual
const MM_TO_PX = 3.78; // 1mm = 3.78px (96 DPI)
const PX_TO_MM = 1 / MM_TO_PX; // 1px = 0.264mm
const DEFAULT_FONT_SIZE = 10;

// Helper para obtener valor de ruta (ej: "identificacion.idPozo.value")
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
            shapes: design.shapes?.length || 0,
            pageSize: design.pageSize,
            orientation: design.orientation
        });

        const orientation = design.orientation === 'portrait' ? 'p' : 'l';
        const doc = new jsPDF({
            orientation,
            unit: 'mm',
            format: design.pageSize.toLowerCase() as any,
        });

        // Configurar fuente para soporte UTF-8
        configurePDFFont(doc);

        // Importar blobStore una sola vez al inicio
        const { blobStore } = await import('@/lib/storage/blobStore');

        // 1. PRE-CARGA DE BLOBS (Paso Crítico para evitar imágenes en blanco)
        // Recopilamos todos los IDs de fotos que vamos a necesitar
        const neededBlobIds = new Set<string>();

        // Recopilar de Placements (Fotos inteligentes)
        const photoFields = design.placements.filter(p =>
            p.fieldId.startsWith('foto_') && !/^\d+$/.test(p.fieldId.split('_')[1])
        );

        const codeMap: Record<string, string> = {
            'foto_panoramica': 'P', 'foto_tapa': 'T', 'foto_interior': 'I',
            'foto_acceso': 'A', 'foto_fondo': 'F', 'foto_medicion': 'M',
            'foto_entrada_1': 'E1', 'foto_salida_1': 'S1', 'foto_sumidero_1': 'SUM1',
            'foto_esquema': 'L', 'foto_shape': 'L' // mapear ambos a Localización
        };

        photoFields.forEach(p => {
            const targetCode = codeMap[p.fieldId];
            if (targetCode) {
                const upperTarget = targetCode.toUpperCase();
                const found = pozo.fotos?.fotos?.find(f =>
                    String(f.subcategoria || '').toUpperCase() === upperTarget ||
                    String(f.filename || '').toUpperCase().includes(`-${upperTarget}.`) ||
                    String(f.filename || '').toUpperCase().includes(`_${upperTarget}.`) ||
                    (upperTarget === 'L' && String(f.filename || '').toUpperCase().includes('_ARGIS.'))
                );
                if (found?.blobId) neededBlobIds.add(found.blobId);
            }
        });

        // Recopilar de Shapes (Logos, imágenes libres)
        design.shapes?.filter(s => s.type === 'image' && s.imageUrl?.startsWith('blob:'))
            .forEach(s => {
                const id = s.imageUrl!.split('/').pop();
                if (id) neededBlobIds.add(id);
            });

        // Asegurar que todos estén en RAM antes de empezar
        if (neededBlobIds.size > 0) {
            console.log(`📦 Pre-cargando ${neededBlobIds.size} imágenes en RAM...`);
            await blobStore.ensureMultipleLoaded(Array.from(neededBlobIds));
        }

        // 1. Combinar y ordenar todos los elementos por zIndex
        const allElements = [
            ...(design.shapes || []).map(s => ({ ...s, isShape: true })),
            ...(design.placements || []).map(p => ({ ...p, isShape: false }))
        ].sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0));

        console.log('📋 Total de elementos a renderizar:', allElements.length);

        // 2. Determinar cuántas páginas necesitamos
        // Calculamos basándonos en la categoría que tenga más elementos pendientes vs el diseño
        const getPageCount = () => {
            const counts = {
                foto: { onDesign: 0, inData: pozo.fotos?.fotos?.length || 0 },
                tub: { onDesign: 0, inData: pozo.tuberias?.tuberias?.length || 0 },
                sum: { onDesign: 0, inData: pozo.sumideros?.sumideros?.length || 0 }
            };

            // Encontrar cuántos "slots" hay en el diseño para cada categoría
            design.placements.forEach(p => {
                if (p.fieldId.startsWith('foto_')) counts.foto.onDesign++;
                if (p.fieldId.startsWith('tub_')) counts.tub.onDesign++;
                if (p.fieldId.startsWith('sum_')) counts.sum.onDesign++;
            });

            const pagesNeeded = [
                counts.foto.onDesign > 0 ? Math.ceil(counts.foto.inData / counts.foto.onDesign) : 1,
                counts.tub.onDesign > 0 ? Math.ceil(counts.tub.inData / counts.tub.onDesign) : 1,
                counts.sum.onDesign > 0 ? Math.ceil(counts.sum.inData / counts.sum.onDesign) : 1
            ];

            return Math.max(1, ...pagesNeeded);
        };

        const pageCount = getPageCount();

        // Determinar "slots por categoría" para el desplazamiento de índices
        const slots = {
            foto: design.placements.filter(p => p.fieldId.startsWith('foto_')).length,
            tub: design.placements.filter(p => p.fieldId.startsWith('tub_')).length,
            sum: design.placements.filter(p => p.fieldId.startsWith('sum_')).length
        };

        const numPages = design.numPages || 1;

        // 3. Renderizar cada página
        for (let pIdx = 1; pIdx <= numPages; pIdx++) {
            if (pIdx > 1) doc.addPage();

            for (const el of allElements) {
                if (el.isVisible === false) continue;

                const isHeader = (el as any).repeatOnEveryPage;
                const elementPage = (el as any).pageNumber || 1;

                // Solo renderizar si es header (en cualquier pág) o si el número coincide
                if (!isHeader && elementPage !== pIdx) continue;

                // Manejar opacidad
                const opacity = (el as any).opacity ?? 1;
                if (opacity < 1) {
                    doc.setGState(new (doc as any).GState({ opacity: opacity }));
                } else {
                    doc.setGState(new (doc as any).GState({ opacity: 1 }));
                }

                if (el.isShape) {
                    console.log('🔷 Renderizando shape:', (el as ShapeElement).type);
                    await renderShape(doc, el as ShapeElement);
                } else {
                    const placement = el as FieldPlacement;
                    console.log('📍 Renderizando placement:', placement.fieldId);

                    // LÓGICA DE RESOLUCIÓN DE VALOR (FOTOS O CAMPOS)
                    let value: any = '-';

                    // Caso foto inteligente (Nomenclatura P, T, I, etc.)
                    if (placement.fieldId.startsWith('foto_') && !/^\d+$/.test(placement.fieldId.split('_')[1])) {
                        const codeMap: Record<string, string> = {
                            'foto_panoramica': 'P', 'foto_tapa': 'T', 'foto_interior': 'I',
                            'foto_acceso': 'A', 'foto_fondo': 'F', 'foto_medicion': 'M',
                            'foto_entrada_1': 'E1', 'foto_salida_1': 'S1', 'foto_sumidero_1': 'SUM1',
                            'foto_esquema': 'L', 'foto_shape': 'L'
                        };
                        const targetCode = codeMap[placement.fieldId];
                        const typeKey = placement.fieldId.replace('foto_', '');
                        if (targetCode) {
                            const upperTarget = targetCode.toUpperCase();
                            // Buscar foto con múltiples criterios (Lógica robusta por prioridades)
                            // 1. Prioridad: Subcategoría exacta (La fuente de verdad más fiable)
                            let found = pozo.fotos?.fotos?.find(f =>
                                String(f.subcategoria || '').toUpperCase() === upperTarget
                            );

                            // 2. Prioridad: Nombre de archivo con delimitadores exactos
                            if (!found) {
                                found = pozo.fotos?.fotos?.find(f => {
                                    const filename = String(f.filename || '').toUpperCase();
                                    const matchSimple = filename.includes(`-${upperTarget}.`) ||
                                        filename.includes(`_${upperTarget}.`) ||
                                        filename.endsWith(`-${upperTarget}`) ||
                                        filename.endsWith(`_${upperTarget}`);

                                    // Caso especial: ARGIS mapea a L
                                    if (upperTarget === 'L') {
                                        return matchSimple || filename.includes('_ARGIS');
                                    }
                                    return matchSimple;
                                });
                            }

                            // 3. Prioridad: Fallback por tipo o inclusión de código
                            if (!found) {
                                found = pozo.fotos?.fotos?.find(f =>
                                    String(f.tipo || '').toUpperCase() === typeKey.toUpperCase() ||
                                    (f.subcategoria && String(f.subcategoria).toUpperCase().includes(upperTarget))
                                );
                            }

                            if (found) {
                                console.log(`✅ Foto encontrada para ${placement.fieldId}:`, found.filename);
                                if (found.blobId) {
                                    value = blobStore.getUrl(found.blobId);
                                } else if ((found as any).dataUrl) {
                                    value = (found as any).dataUrl;
                                }
                            } else {
                                console.warn(`❌ No se encontró foto para ${placement.fieldId} con código ${targetCode}`);
                            }
                        }
                    }
                    else {
                        // Campo normal
                        const path = FIELD_PATHS[placement.fieldId];
                        value = path ? getValueByPath(pozo, path) : '-';
                    }

                    await renderField(doc, placement, pozo, value);
                }
            }
        }

        return { success: true, blob: doc.output('blob') };
    } catch (error) {
        console.error('❌ Error generating design-based PDF:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
}

/**
 * Renderiza elementos gráficos (rectángulos, círculos, líneas, imágenes y texto libre)
 * NOTA: El centrado de texto y el manejo de Object-Fit en imágenes son críticos para WYSIWYG.
 */
async function renderShape(doc: jsPDF, shape: ShapeElement) {
    if (shape.type === 'rectangle' || shape.type === 'circle' || shape.type === 'triangle') {
        const style = (shape.fillColor && shape.fillColor !== 'transparent' && shape.strokeColor && shape.strokeColor !== 'transparent') ? 'FD' :
            (shape.fillColor && shape.fillColor !== 'transparent') ? 'F' : 'D';

        if (shape.fillColor && shape.fillColor !== 'transparent') doc.setFillColor(shape.fillColor);
        if (shape.strokeColor && shape.strokeColor !== 'transparent') {
            doc.setDrawColor(shape.strokeColor);
            // Aplicar factor de escala para que 1px en pantalla sea ~0.26mm en PDF
            const thickness = (shape.strokeWidth || 0.1) * PX_TO_MM;
            doc.setLineWidth(thickness);
        }

        if (shape.type === 'circle') {
            const radius = Math.min(shape.width, shape.height) / 2;
            doc.ellipse(shape.x + radius, shape.y + radius, radius, radius, style);
        } else if (shape.type === 'rectangle') {
            if (shape.borderRadius && shape.borderRadius > 0) {
                const r = shape.borderRadius / 3.78; // px to mm approx
                (doc as any).roundedRect(shape.x, shape.y, shape.width, shape.height, r, r, style);
            } else {
                doc.rect(shape.x, shape.y, shape.width, shape.height, style);
            }
        } else if (shape.type === 'triangle') {
            doc.triangle(
                shape.x + shape.width / 2, shape.y,
                shape.x + shape.width, shape.y + shape.height,
                shape.x, shape.y + shape.height,
                style
            );
        }
    }

    if (shape.type === 'line') {
        doc.setDrawColor(shape.strokeColor || '#000000');
        const thickness = (shape.strokeWidth || 0.5) * PX_TO_MM;
        doc.setLineWidth(thickness);
        doc.line(shape.x, shape.y, shape.x + shape.width, shape.y + shape.height);
    }

    if (shape.type === 'text' && shape.content) {
        const fontSize = shape.fontSize || 10;
        doc.setFontSize(fontSize);
        doc.setTextColor(shape.color || '#000000');
        const font = getSafeFont(shape.fontFamily);
        const fontStyle = (shape.fontWeight === 'bold') ? 'bold' : 'normal';
        doc.setFont(font, fontStyle);

        const align = shape.textAlign || 'left';
        let x = shape.x;
        if (align === 'center') x = shape.x + (shape.width / 2);
        if (align === 'right') x = shape.x + shape.width;

        // Centrado vertical exacto
        const textHeightMM = fontSize * 0.3527;
        const y = shape.y + (shape.height / 2) + (textHeightMM / 2.5); // 2.5 para centrado visual baseline

        doc.text(sanitizeTextForPDF(shape.content), x, y, {
            maxWidth: shape.width,
            align: align
        });
    }

    if (shape.type === 'image' && shape.imageUrl) {
        try {
            // Cargar imagen para obtener dimensiones y hacer Object-Fit: contain
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
                let drawW = shape.width;
                let drawH = shape.height;
                let drawX = shape.x;
                let drawY = shape.y;

                if (imgAspect > boxAspect) {
                    drawH = shape.width / imgAspect;
                    drawY = shape.y + (shape.height - drawH) / 2;
                } else {
                    drawW = shape.height * imgAspect;
                    drawX = shape.x + (shape.width - drawW) / 2;
                }
                // Detectar formato automáticamente
                const format = shape.imageUrl.toLowerCase().includes('png') || shape.imageUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                doc.addImage(shape.imageUrl, format, drawX, drawY, drawW, drawH, undefined, 'FAST');
            } else {
                const format = shape.imageUrl.toLowerCase().includes('png') || shape.imageUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                doc.addImage(shape.imageUrl, format, shape.x, shape.y, shape.width, shape.height, undefined, 'FAST');
            }
        } catch (e) {
            console.warn('Could not add shape image to PDF', e);
        }
    }
}

/**
 * Renderiza campos de datos (Placements) con soporte para labels complejos y widgets.
 * Proceso: 1. Caja contenedora -> 2. Label (si existe) -> 3. Valor (centrado en espacio restante)
 */
async function renderField(doc: jsPDF, placement: FieldPlacement, pozo: Pozo, value: any) {
    const isPhoto = placement.fieldId.startsWith('foto_');
    const isWidget = placement.fieldId.startsWith('widget_');

    // 1. DIBUJAR CAJA CONTENEDORA (Grid System)
    // Esto asegura que se vea la "rejilla" tal cual se diseñó
    if (placement.borderWidth || placement.backgroundColor) {
        const style = (placement.backgroundColor && placement.backgroundColor !== 'transparent' && placement.borderWidth && placement.borderWidth > 0) ? 'FD' :
            (placement.backgroundColor && placement.backgroundColor !== 'transparent') ? 'F' : 'S';

        if (placement.backgroundColor && placement.backgroundColor !== 'transparent') {
            doc.setFillColor(placement.backgroundColor);
        }

        if (placement.borderWidth && placement.borderWidth > 0) {
            doc.setDrawColor(placement.borderColor || '#000000');
            // Aplicar factor de escala para bordes de campos
            const thickness = placement.borderWidth * PX_TO_MM;
            doc.setLineWidth(thickness);
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

    // 2. LOGICA DE LABEL (GENÉRICA) - Aplica a todos los tipos de campo
    const fontSize = placement.fontSize || 10;
    const font = getSafeFont(placement.fontFamily);
    let labelAreaHeight = 0;
    let availableContentHeight = placement.height;

    if (placement.showLabel && (placement.customLabel || placement.fieldId)) {
        const labelText = sanitizeTextForPDF(placement.customLabel || placement.fieldId);
        const labelFontSize = placement.labelFontSize || (fontSize * 0.8);
        const labelPadding = placement.labelPadding || 0.5;
        const labelAlign = placement.labelAlign || 'left';

        // Área del label: Altura estimada basada en fuente + padding
        labelAreaHeight = (labelFontSize * 0.4) + (labelPadding * 2);

        // Ancho del label: Si no hay labelWidth, usa el ancho total del placement (100%)
        const labelWidthMM = placement.labelWidth || placement.width;

        // Fondo del label (respeta labelWidth)
        if (placement.labelBackgroundColor && placement.labelBackgroundColor !== 'transparent') {
            doc.setFillColor(placement.labelBackgroundColor);
            doc.rect(placement.x, placement.y, labelWidthMM, labelAreaHeight, 'F');
        }

        doc.setFontSize(labelFontSize);
        doc.setFont(font, (placement.labelFontWeight === 'bold') ? 'bold' : 'normal');
        doc.setTextColor(placement.labelColor || '#6B7280');

        let labelX = placement.x + labelPadding;
        if (labelAlign === 'center') labelX = placement.x + (labelWidthMM / 2);
        if (labelAlign === 'right') labelX = placement.x + labelWidthMM - labelPadding;

        doc.text(labelText, labelX, placement.y + labelPadding + (labelFontSize * 0.3), {
            align: labelAlign,
            maxWidth: labelWidthMM - (labelPadding * 2)
        });

        availableContentHeight -= labelAreaHeight;
    }

    // 3. RENDERIZAR FOTOS
    if (isPhoto && value && value !== '-') {
        try {
            let imageData = String(value);

            // Resolver blobId
            if (!imageData.startsWith('data:image')) {
                const { blobStore } = await import('@/lib/storage/blobStore');
                imageData = blobStore.getUrl(imageData) || imageData;
            }

            if (!imageData.startsWith('data:image') && !imageData.startsWith('blob:')) return;

            // Cargar imagen
            const img = new Image();
            img.src = imageData;
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => resolve(); // No fallar todo el PDF por una foto
                setTimeout(() => resolve(), 2000);
            });

            // Lógica Object-Fit: Contain (Centrado perfecto en el espacio restante)
            const imgAspect = img.width / img.height;
            const contentAreaY = placement.y + labelAreaHeight;
            const boxAspect = placement.width / availableContentHeight;

            let drawW = placement.width;
            let drawH = availableContentHeight;
            let drawX = placement.x;
            let drawY = contentAreaY;

            // Ajuste geométrico exacto
            if (imgAspect > boxAspect) {
                // Imagen más ancha que la caja
                drawH = placement.width / imgAspect;
                drawY = contentAreaY + (availableContentHeight - drawH) / 2;
            } else {
                // Imagen más alta que la caja
                drawW = availableContentHeight * imgAspect;
                drawX = placement.x + (placement.width - drawW) / 2;
            }

            // Margen interno de seguridad (padding)
            const padding = 0.5;
            if (drawW > placement.width - padding) {
                const scale = (placement.width - padding) / drawW;
                drawW *= scale;
                drawH *= scale;
                drawX = placement.x + (placement.width - drawW) / 2;
                drawY = contentAreaY + (availableContentHeight - drawH) / 2;
            }

            // Detectar formato automáticamente para fotos de pozos
            const format = imageData.toLowerCase().includes('png') || imageData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            doc.addImage(imageData, format, drawX, drawY, drawW, drawH, undefined, 'FAST');

        } catch (e) {
            console.warn(`Error foto ${placement.fieldId}`, e);
        }
        return;
    }

    // 4. RENDERIZAR WIDGETS
    if (isWidget) {
        if (placement.fieldId === 'widget_tuberias') {
            // Renderizar tabla ocupando TODO el espacio de la caja diseñada
            const tuberias = (pozo.tuberias?.tuberias || []).slice(0, 10);
            const headers = ['#', 'Ø (")', 'Material', 'Estado', 'Batea'];
            const headerH = 5;
            const contentAreaY = placement.y + labelAreaHeight;
            const rowH = (availableContentHeight - headerH) / Math.max(tuberias.length, 1);

            // Header
            doc.setFillColor('#e5e7eb');
            doc.rect(placement.x, contentAreaY, placement.width, headerH, 'F');
            doc.setDrawColor('#cccccc');
            doc.setLineWidth(0.1);
            doc.line(placement.x, contentAreaY + headerH, placement.x + placement.width, contentAreaY + headerH);

            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#000000');

            // Anchos proporcionales para 5 columnas
            const colWidths = [0.1, 0.15, 0.35, 0.2, 0.2].map(w => w * placement.width);
            let currentX = placement.x;

            headers.forEach((h, i) => {
                doc.text(h, currentX + 1, contentAreaY + 3.5);
                currentX += colWidths[i];
            });

            // Rows
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.5);
            tuberias.forEach((t, i) => {
                const y = contentAreaY + headerH + (i * rowH);
                let curX = placement.x;

                const rowData = [
                    String(t.orden?.value || i + 1),
                    String(t.diametroPulgadas?.value || t.diametro?.value || '-'),
                    String(t.material?.value || '-'),
                    String(t.estado?.value || '-'),
                    String(t.batea?.value || '-')
                ];

                rowData.forEach((val, colIdx) => {
                    doc.text(sanitizeTextForPDF(val), curX + 1, y + (rowH / 2) + 1, {
                        maxWidth: colWidths[colIdx] - 1
                    });
                    curX += colWidths[colIdx];
                });

                // Línea divisoria
                doc.setDrawColor('#eeeeee');
                doc.setLineWidth(0.05);
                doc.line(placement.x, y + rowH, placement.x + placement.width, y + rowH);
            });
        }
        return;
    }

    // 5. RENDERIZAR CAMPOS DE TEXTO (Modo Grid Avanzado)
    const content = String(value ?? '');
    const valueStyle = (placement.fontWeight === 'bold') ? 'bold' : 'normal';

    doc.setFontSize(fontSize);
    doc.setFont(font, valueStyle);
    doc.setTextColor(placement.color || '#000000');

    const padding = placement.padding || 1;
    const align = placement.textAlign || 'left';

    let textX = placement.x + padding;
    if (align === 'center') textX = placement.x + (placement.width / 2);
    if (align === 'right') textX = placement.x + placement.width - padding;

    // Calcular Y para centrado vertical en el área restante
    const textY = placement.y + labelAreaHeight + (availableContentHeight / 2) + (fontSize * 0.15);

    doc.text(
        sanitizeTextForPDF(content),
        textX,
        textY,
        {
            maxWidth: placement.width - (padding * 2),
            align: align
        }
    );
}



/**
 * Genera un PDF con layout automático estándar (similar al generador pdfMake)
 * Se usa cuando el diseño personalizado tiene pocos o ningún placement definido
 */
async function generateStandardLayout(doc: jsPDF, pozo: Pozo, design: FichaDesignVersion) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    let currentY = margin;

    // 1. ENCABEZADO CON LOGOS (si están en shapes)
    const logoShapes = (design.shapes || []).filter(s => s.type === 'image');
    if (logoShapes.length > 0) {
        for (const logo of logoShapes) {
            if (logo.imageUrl) {
                try {
                    doc.addImage(logo.imageUrl, 'PNG', logo.x, logo.y, logo.width, logo.height);
                } catch (e) {
                    console.warn('No se pudo cargar logo', e);
                }
            }
        }
        currentY = Math.max(...logoShapes.map(l => l.y + l.height)) + 5;
    }

    // 2. TÍTULO PRINCIPAL
    drawSectionHeader(doc, 'FICHA TÉCNICA DE POZO DE INSPECCIÓN', margin, currentY, contentWidth, 10);
    currentY += 12;

    // Subtítulo con código del pozo
    doc.setFontSize(12);
    doc.setTextColor(DEFAULT_STYLES.textColor);
    doc.setFont('helvetica', 'bold');
    const codigoPozo = pozo.idPozo?.value || pozo.identificacion?.idPozo?.value || 'SIN CÓDIGO';
    doc.text(`Pozo: ${codigoPozo}`, margin, currentY);
    currentY += 8;

    // 3. SECCIÓN: IDENTIFICACIÓN Y UBICACIÓN
    drawSectionHeader(doc, 'IDENTIFICACIÓN Y UBICACIÓN', margin, currentY, contentWidth, 8);
    currentY += 10;

    const identFields = extractIdentificacionFields(pozo);
    currentY = drawFieldTable(doc, margin, currentY, contentWidth, identFields, {
        rowHeight: 6,
        labelWidth: 0.3
    });
    currentY += 8;

    // 4. SECCIÓN: REGISTRO FOTOGRÁFICO
    drawSectionHeader(doc, 'REGISTRO FOTOGRÁFICO', margin, currentY, contentWidth, 8);
    currentY += 10;

    // Obtener fotos del pozo
    const allPhotos = pozo.fotos?.fotos || [];
    if (allPhotos.length > 0) {
        // Preparar fotos con etiquetas
        const photosWithLabels: Array<{ dataUrl: string; label: string }> = [];

        for (const foto of allPhotos.slice(0, 6)) { // Máximo 6 fotos en primera página
            try {
                let imageData = foto.blobId || (foto as any).dataUrl || foto.id;

                // Resolver blobId si es necesario
                if (!imageData.startsWith('data:image')) {
                    const { blobStore } = await import('@/lib/storage/blobStore');
                    imageData = blobStore.getUrl(imageData) || imageData;
                }

                if (imageData.startsWith('data:image') || imageData.startsWith('blob:')) {
                    photosWithLabels.push({
                        dataUrl: imageData,
                        label: foto.descripcion || foto.tipo || foto.subcategoria || 'Foto'
                    });
                }
            } catch (e) {
                console.warn('Error procesando foto', e);
            }
        }

        if (photosWithLabels.length > 0) {
            currentY = await drawPhotoGrid(doc, margin, currentY, contentWidth, photosWithLabels, {
                columns: 2,
                photoWidth: (contentWidth - 5) / 2,
                photoHeight: 60,
                spacing: 5,
                showLabels: true
            });
        } else {
            doc.setFontSize(9);
            doc.setTextColor('#999999');
            doc.text('Sin fotografías disponibles', margin, currentY);
            currentY += 10;
        }
    } else {
        doc.setFontSize(9);
        doc.setTextColor('#999999');
        doc.text('Sin fotografías registradas', margin, currentY);
        currentY += 10;
    }

    currentY += 5;

    // Verificar si necesitamos nueva página
    if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = margin;
    }

    // 5. SECCIÓN: CARACTERÍSTICAS DE LA ESTRUCTURA
    drawSectionHeader(doc, 'CARACTERÍSTICAS DEL POZO DE INSPECCIÓN', margin, currentY, contentWidth, 8);
    currentY += 10;

    const estructuraFields = extractEstructuraFields(pozo);
    currentY = drawFieldTable(doc, margin, currentY, contentWidth, estructuraFields, {
        rowHeight: 6,
        labelWidth: 0.4
    });
    currentY += 8;

    // 6. SECCIÓN: TUBERÍAS
    const tuberiasData = extractTuberiasData(pozo);
    if (tuberiasData.length > 0) {
        // Verificar espacio
        if (currentY > pageHeight - 50) {
            doc.addPage();
            currentY = margin;
        }

        drawSectionHeader(doc, 'TUBERÍAS (ENTRADAS Y SALIDAS)', margin, currentY, contentWidth, 8);
        currentY += 10;

        currentY = drawDataTable(
            doc,
            margin,
            currentY,
            contentWidth,
            ['Ø (mm)', 'Material', 'Cota', 'Estado', 'Emboq.', 'Tipo'],
            tuberiasData,
            {
                headerHeight: 6,
                rowHeight: 5,
                fontSize: 8,
                columnWidths: [0.12, 0.20, 0.12, 0.18, 0.18, 0.20]
            }
        );
        currentY += 8;
    }

    // 7. SECCIÓN: SUMIDEROS
    const sumiderosData = extractSumiderosData(pozo);
    if (sumiderosData.length > 0) {
        // Verificar espacio
        if (currentY > pageHeight - 40) {
            doc.addPage();
            currentY = margin;
        }

        drawSectionHeader(doc, 'SUMIDEROS', margin, currentY, contentWidth, 8);
        currentY += 10;

        currentY = drawDataTable(
            doc,
            margin,
            currentY,
            contentWidth,
            ['ID', 'Tipo', 'Material', 'Ø (mm)', 'H Salida'],
            sumiderosData,
            {
                headerHeight: 6,
                rowHeight: 5,
                fontSize: 8,
                columnWidths: [0.15, 0.25, 0.25, 0.15, 0.20]
            }
        );
        currentY += 8;
    }

    // 8. PIE DE PÁGINA (opcional)
    const pageCountStandard = doc.getNumberOfPages();
    for (let i = 1; i <= pageCountStandard; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor('#999999');
        doc.text(
            `Página ${i} de ${pageCountStandard}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
        doc.text(
            `Generado: ${new Date().toLocaleDateString('es-ES')}`,
            pageWidth - margin,
            pageHeight - 10,
            { align: 'right' }
        );
    }
}
