import { jsPDF } from 'jspdf';
import { FichaDesignVersion, FieldPlacement, ShapeElement } from '@/types/fichaDesign';
import { Pozo } from '@/types/pozo';
import { FIELD_PATHS } from '@/constants/fieldMapping';
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
        const orientation = design.orientation === 'portrait' ? 'p' : 'l';
        const doc = new jsPDF({
            orientation,
            unit: 'mm',
            format: design.pageSize.toLowerCase() as any,
        });

        // Configurar fuente para soporte UTF-8
        configurePDFFont(doc);

        // 1. Combinar y ordenar todos los elementos por zIndex
        const allElements = [
            ...(design.shapes || []).map(s => ({ ...s, isShape: true })),
            ...(design.placements || []).map(p => ({ ...p, isShape: false }))
        ].sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0));

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
                    await renderShape(doc, el as ShapeElement);
                } else {
                    const placement = el as FieldPlacement;

                    // LÓGICA DE RESOLUCIÓN DE VALOR (FOTOS O CAMPOS)
                    let value: any = '-';

                    // Caso foto inteligente (Nomenclatura P, T, I, etc.)
                    if (placement.fieldId.startsWith('foto_') && !/^\d+$/.test(placement.fieldId.split('_')[1])) {
                        const codeMap: Record<string, string> = {
                            'foto_panoramica': 'P', 'foto_tapa': 'T', 'foto_interior': 'I',
                            'foto_acceso': 'A', 'foto_fondo': 'F', 'foto_medicion': 'M',
                            'foto_entrada_1': 'E1', 'foto_salida_1': 'S1', 'foto_sumidero_1': 'SUM1'
                        };
                        const targetCode = codeMap[placement.fieldId];
                        if (targetCode) {
                            const found = pozo.fotos?.fotos?.find(f =>
                                String(f.subcategoria || '').toUpperCase() === targetCode ||
                                String(f.filename || '').toUpperCase().includes(`-${targetCode}`)
                            );
                            if (found) value = found.blobId || (found as any).dataUrl || found.id;
                        }
                    } else {
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
        console.error('Error generating design-based PDF:', error);
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
            doc.setLineWidth(shape.strokeWidth || 0.1);
        }

        if (shape.type === 'circle') {
            const radius = Math.min(shape.width, shape.height) / 2;
            doc.ellipse(shape.x + radius, shape.y + radius, radius, radius, style);
        } else if (shape.type === 'rectangle') {
            doc.rect(shape.x, shape.y, shape.width, shape.height, style);
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
        doc.setLineWidth(shape.strokeWidth || 0.5);
        doc.line(shape.x, shape.y, shape.x + shape.width, shape.y + shape.height);
    }

    if (shape.type === 'text' && shape.content) {
        const fontSize = shape.fontSize || 10;
        doc.setFontSize(fontSize);
        doc.setTextColor(shape.color || '#000000');
        const font = getSafeFont(shape.fontFamily);
        const fontStyle = shape.fontWeight === 'bold' ? 'bold' : 'normal';
        doc.setFont(font, fontStyle);
        doc.text(sanitizeTextForPDF(shape.content), shape.x, shape.y + (fontSize * 0.35), {
            maxWidth: shape.width,
            align: shape.textAlign || 'left'
        });
    }

    if (shape.type === 'image' && shape.imageUrl) {
        try {
            doc.addImage(shape.imageUrl, 'JPEG', shape.x, shape.y, shape.width, shape.height, undefined, 'FAST');
        } catch (e) {
            console.warn('Could not add shape image to PDF', e);
        }
    }
}

async function renderField(doc: jsPDF, placement: FieldPlacement, pozo: Pozo, value: any) {
    const isPhoto = placement.fieldId.startsWith('foto_');
    if (isPhoto && value && value !== '-') {
        try {
            let imageData = String(value);

            // Si es un blobId, intentar resolverlo (esto es para el entorno real)
            if (!imageData.startsWith('data:image')) {
                const { blobStore } = await import('@/lib/storage/blobStore');
                imageData = blobStore.getUrl(imageData) || imageData;
            }

            // Si sigue sin ser data URL, no podemos dibujarla en el PDF del cliente jsPDF con este motor
            if (!imageData.startsWith('data:image') && !imageData.startsWith('blob:')) {
                return;
            }

            // MEJORA: Aplicar padding interno para evitar que las imágenes se toquen
            const padding = 2; // 2mm de padding interno
            const imgX = placement.x + padding;
            const imgY = placement.y + padding;
            const imgWidth = placement.width - (padding * 2);
            const imgHeight = placement.height - (padding * 2);

            // MEJORA: Dibujar borde opcional para delimitar el área de la foto
            if (placement.borderWidth && placement.borderWidth > 0) {
                doc.setDrawColor(placement.borderColor || '#cccccc');
                doc.setLineWidth(placement.borderWidth);
                doc.rect(placement.x, placement.y, placement.width, placement.height, 'S');
            }

            // MEJORA: Dibujar fondo si está configurado
            if (placement.backgroundColor && placement.backgroundColor !== 'transparent') {
                doc.setFillColor(placement.backgroundColor);
                doc.rect(placement.x, placement.y, placement.width, placement.height, 'F');
            }

            // Cargar imagen para obtener dimensiones reales y aplicar fit
            const img = new Image();
            img.src = imageData;
            
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('Failed to load image'));
                // Timeout de 2 segundos
                setTimeout(() => reject(new Error('Image load timeout')), 2000);
            });

            // Calcular dimensiones manteniendo aspect ratio (contain)
            const imgAspect = img.width / img.height;
            const boxAspect = imgWidth / imgHeight;

            let finalWidth = imgWidth;
            let finalHeight = imgHeight;
            let offsetX = 0;
            let offsetY = 0;

            if (imgAspect > boxAspect) {
                // Imagen más ancha - ajustar por ancho
                finalHeight = imgWidth / imgAspect;
                offsetY = (imgHeight - finalHeight) / 2;
            } else {
                // Imagen más alta - ajustar por alto
                finalWidth = imgHeight * imgAspect;
                offsetX = (imgWidth - finalWidth) / 2;
            }

            // Renderizar imagen centrada con aspect ratio correcto
            doc.addImage(
                imageData, 
                'JPEG', 
                imgX + offsetX, 
                imgY + offsetY, 
                finalWidth, 
                finalHeight, 
                undefined, 
                'FAST'
            );

            // MEJORA: Agregar etiqueta opcional debajo de la foto
            if (placement.showLabel && placement.customLabel) {
                const labelFontSize = (placement.fontSize || 10) * 0.7;
                doc.setFontSize(labelFontSize);
                doc.setTextColor('#666666');
                doc.setFont('helvetica', 'normal');
                const labelY = placement.y + placement.height + 3;
                doc.text(
                    sanitizeTextForPDF(placement.customLabel), 
                    placement.x + (placement.width / 2), 
                    labelY,
                    { align: 'center' }
                );
            }

        } catch (e) {
            console.warn(`Could not add photo from field ${placement.fieldId} to PDF (leaving empty)`, e);
            
            // MEJORA: Dibujar placeholder cuando falla la imagen
            doc.setFillColor('#f3f4f6');
            doc.rect(placement.x, placement.y, placement.width, placement.height, 'F');
            doc.setDrawColor('#d1d5db');
            doc.rect(placement.x, placement.y, placement.width, placement.height, 'S');
            
            doc.setFontSize(8);
            doc.setTextColor('#9ca3af');
            doc.text('Imagen no disponible', placement.x + (placement.width / 2), placement.y + (placement.height / 2), {
                align: 'center'
            });
        }
    } else if (!isPhoto) {
        const isWidget = placement.fieldId === 'widget_tuberias';

        if (isWidget) {
            // DIBUJAR TABLA DE TUBERÍAS
            const rowHeight = 5;
            const headerHeight = 6;
            const cols = 3;
            const colWidth = placement.width / cols;

            // Header
            doc.setFillColor('#f3f4f6');
            doc.rect(placement.x, placement.y, placement.width, headerHeight, 'F');
            doc.setDrawColor('#d1d5db');
            doc.rect(placement.x, placement.y, placement.width, headerHeight, 'D');

            doc.setFontSize(7);
            doc.setTextColor('#374151');
            doc.setFont('helvetica', 'bold');
            const headers = ['Ø Diam', 'Material', 'Estado'];
            headers.forEach((h, i) => {
                doc.text(h, placement.x + (i * colWidth) + 2, placement.y + 4);
            });

            // Filas
            const tuberias = (pozo.tuberias?.tuberias || []).slice(0, 8);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);

            tuberias.forEach((t, idx) => {
                const rowY = placement.y + headerHeight + (idx * rowHeight);
                doc.setDrawColor('#e5e7eb');
                doc.rect(placement.x, rowY, placement.width, rowHeight, 'D');

                doc.text(sanitizeTextForPDF(t.diametro?.value || '-'), placement.x + 2, rowY + 3.5);
                doc.text(sanitizeTextForPDF(t.material?.value || '-'), placement.x + colWidth + 2, rowY + 3.5);
                doc.text(sanitizeTextForPDF(t.estado?.value || '-'), placement.x + (colWidth * 2) + 2, rowY + 3.5);
            });

            if (tuberias.length === 0) {
                doc.setTextColor('#9ca3af');
                doc.text('Sin tuberias registradas', placement.x + 5, placement.y + headerHeight + 4);
            }
            return;
        }

        const content = String(value ?? '-');
        const fontSize = placement.fontSize || 10;
        const color = placement.color || '#000000';

        if (placement.backgroundColor && placement.backgroundColor !== 'transparent') {
            doc.setFillColor(placement.backgroundColor);
            doc.rect(placement.x, placement.y, placement.width, placement.height, 'F');
        }

        let currentY = placement.y;
        if (placement.showLabel) {
            doc.setFontSize(fontSize * 0.65);
            doc.setTextColor('#999999');
            doc.setFont('helvetica', 'bold');
            doc.text(sanitizeTextForPDF(placement.customLabel || placement.fieldId), placement.x + 1, currentY + (fontSize * 0.4));
            currentY += (fontSize * 0.5);
        } else {
            currentY += (fontSize * 0.4);
        }

        doc.setFontSize(fontSize);
        doc.setTextColor(color);
        const font = getSafeFont(placement.fontFamily);
        const style = placement.fontWeight === 'bold' ? 'bold' : 'normal';
        doc.setFont(font, style);

        doc.text(sanitizeTextForPDF(content), placement.x + 1, currentY + (fontSize * 0.35), {
            maxWidth: placement.width - 2,
            align: placement.textAlign || 'left'
        });
    }
}
