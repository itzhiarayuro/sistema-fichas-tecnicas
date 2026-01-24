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

        // 3. Renderizar cada página
        for (let pIdx = 0; pIdx < pageCount; pIdx++) {
            if (pIdx > 0) doc.addPage();

            for (const el of allElements) {
                // Saltarnos si no es visible
                if (el.isVisible === false) continue;

                // Si no es la primera página, solo renderizar :
                // a) Elementos marcados como repeatOnEveryPage
                // b) Elementos de campos indexados (fotos, tuberías) que vamos a desplazar
                const isRepeatable = (el as any).repeatOnEveryPage;
                const fieldId = el.isShape ? undefined : (el as any).fieldId;
                const isIndexedField = fieldId && (fieldId.startsWith('foto_') || fieldId.startsWith('tub_') || fieldId.startsWith('sum_'));

                if (pIdx > 0 && !isRepeatable && !isIndexedField) {
                    continue;
                }

                // Manejar opacidad global para el elemento
                const opacity = (el as any).opacity ?? 1;
                if (opacity < 1) {
                    doc.setGState(new (doc as any).GState({ opacity: opacity }));
                } else {
                    doc.setGState(new (doc as any).GState({ opacity: 1 }));
                }

                if (el.isShape) {
                    const shape = el as ShapeElement;
                    await renderShape(doc, shape);
                } else {
                    const placement = el as FieldPlacement;

                    let path = FIELD_PATHS[placement.fieldId] || '';
                    if (isIndexedField && pIdx > 0) {
                        let offset = 0;
                        if (placement.fieldId.startsWith('foto_')) offset = pIdx * slots.foto;
                        else if (placement.fieldId.startsWith('tub_')) offset = pIdx * slots.tub;
                        else if (placement.fieldId.startsWith('sum_')) offset = pIdx * slots.sum;

                        path = path.replace(/\[(\d+)\]/, (_, index) => `[${parseInt(index) + offset}]`);
                    }

                    await renderField(doc, placement, pozo, path);
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

async function renderField(doc: jsPDF, placement: FieldPlacement, pozo: Pozo, path: string) {
    const value = getValueByPath(pozo, path);
    const isPhoto = placement.fieldId.startsWith('foto_');

    if (isPhoto && value && typeof value === 'string' && value.startsWith('data:image')) {
        try {
            doc.addImage(value, 'JPEG', placement.x, placement.y, placement.width, placement.height, undefined, 'FAST');
        } catch (e) {
            console.warn(`Could not add photo from path ${path} to PDF`, e);
            doc.setDrawColor('#cccccc');
            doc.rect(placement.x, placement.y, placement.width, placement.height, 'D');
        }
    } else if (!isPhoto) {
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
