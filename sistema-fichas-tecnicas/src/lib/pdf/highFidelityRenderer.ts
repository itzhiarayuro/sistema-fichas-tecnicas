/**
 * High Fidelity PDF Renderer - Sistema de Renderizado por Capas
 * 
 * Renderiza diseños personalizados con precisión milimétrica (100% fidelidad)
 * Basado en el modelo de "Celda Atómica" con 4 capas de renderizado
 */

import { jsPDF } from 'jspdf';
import { FichaDesignVersion, FieldPlacement, ShapeElement } from '@/types/fichaDesign';
import { Pozo } from '@/types/pozo';
import { FIELD_PATHS } from '@/constants/fieldMapping';

// ============================================================================
// CONSTANTES DE CALIBRACIÓN
// ============================================================================

/**
 * Calibración píxel → milímetro para A4
 * A4 = 210mm x 297mm
 * Resolución estándar: 72 DPI
 */
const CALIBRATION = {
    DPI: 72,
    MM_PER_INCH: 25.4,
    PIXELS_PER_MM: 72 / 25.4, // ~2.83 px/mm
    
    // Ajuste de baseline para texto (compensación vertical)
    TEXT_BASELINE_OFFSET: 0.35, // Factor multiplicador del fontSize
    
    // Bordes hairline (línea fina profesional)
    HAIRLINE_WIDTH: 0.1, // 0.1mm = línea ultra fina
    STANDARD_BORDER: 0.2, // 0.2mm = línea fina
    THICK_BORDER: 0.5, // 0.5mm = línea gruesa
};

/**
 * Configuración de fuentes seguras para jsPDF
 */
const SAFE_FONTS = {
    helvetica: 'helvetica',
    times: 'times',
    courier: 'courier'
};

// ============================================================================
// TIPOS Y INTERFACES
// ============================================================================

interface RenderContext {
    doc: jsPDF;
    pozo: Pozo;
    design: FichaDesignVersion;
    blobStore: any;
}

interface CellBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface LayeredCell {
    box: CellBox;
    background?: string;
    border?: {
        color: string;
        width: number;
    };
    label?: {
        text: string;
        fontSize: number;
        color: string;
    };
    value: {
        text: string;
        fontSize: number;
        color: string;
        align: 'left' | 'center' | 'right';
        fontWeight?: 'normal' | 'bold';
    };
}

// ============================================================================
// UTILIDADES DE TEXTO
// ============================================================================

/**
 * Sanitiza texto para PDF (elimina caracteres problemáticos)
 */
function sanitizeText(text: string): string {
    if (!text) return '';
    
    const translitMap: Record<string, string> = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
        'ñ': 'n', 'Ñ': 'N', 'ü': 'u', 'Ü': 'U'
    };
    
    try {
        let result = String(text).normalize('NFC');
        return result.replace(/[áéíóúÁÉÍÓÚñÑüÜ]/g, (char) => translitMap[char] || char);
    } catch (e) {
        return String(text);
    }
}

/**
 * Calcula el tamaño de fuente óptimo para que el texto quepa en el espacio
 */
function calculateOptimalFontSize(
    doc: jsPDF,
    text: string,
    maxWidth: number,
    maxHeight: number,
    initialFontSize: number
): number {
    let fontSize = initialFontSize;
    const minFontSize = 6; // Tamaño mínimo legible
    
    doc.setFontSize(fontSize);
    let textWidth = doc.getTextWidth(text);
    let textHeight = fontSize * 0.35; // Altura aproximada
    
    // Reducir tamaño hasta que quepa
    while ((textWidth > maxWidth || textHeight > maxHeight) && fontSize > minFontSize) {
        fontSize -= 0.5;
        doc.setFontSize(fontSize);
        textWidth = doc.getTextWidth(text);
        textHeight = fontSize * 0.35;
    }
    
    return fontSize;
}

// ============================================================================
// RENDERIZADO POR CAPAS (CELDA ATÓMICA)
// ============================================================================

/**
 * Renderiza una celda completa con las 4 capas
 * 
 * Capa 0: Fondo
 * Capa 1: Bordes
 * Capa 2: Label (subtítulo)
 * Capa 3: Valor (contenido principal)
 */
function renderAtomicCell(doc: jsPDF, cell: LayeredCell): void {
    const { box, background, border, label, value } = cell;
    
    // CAPA 0: FONDO
    if (background && background !== 'transparent') {
        doc.setFillColor(background);
        doc.rect(box.x, box.y, box.width, box.height, 'F');
    }
    
    // CAPA 1: BORDES (Hairline para look profesional)
    if (border) {
        doc.setDrawColor(border.color);
        doc.setLineWidth(border.width);
        doc.rect(box.x, box.y, box.width, box.height, 'S');
    }
    
    // Calcular espacio disponible para contenido
    const padding = 1; // 1mm de padding interno
    const contentX = box.x + padding;
    const contentWidth = box.width - (padding * 2);
    let contentY = box.y + padding;
    const contentHeight = box.height - (padding * 2);
    
    // CAPA 2: LABEL (si existe)
    if (label) {
        const labelFontSize = label.fontSize * 0.6; // 60% del tamaño principal
        doc.setFontSize(labelFontSize);
        doc.setTextColor(label.color);
        doc.setFont('helvetica', 'bold');
        
        const labelY = contentY + (labelFontSize * CALIBRATION.TEXT_BASELINE_OFFSET);
        doc.text(sanitizeText(label.text), contentX, labelY, {
            maxWidth: contentWidth
        });
        
        // Ajustar espacio para el valor
        contentY += labelFontSize * 0.8;
    }
    
    // CAPA 3: VALOR
    const availableHeight = box.y + box.height - contentY - padding;
    
    // Calcular tamaño óptimo de fuente
    const optimalFontSize = calculateOptimalFontSize(
        doc,
        value.text,
        contentWidth,
        availableHeight,
        value.fontSize
    );
    
    doc.setFontSize(optimalFontSize);
    doc.setTextColor(value.color);
    doc.setFont('helvetica', value.fontWeight || 'normal');
    
    // Centrar verticalmente el valor en el espacio restante
    const textHeight = optimalFontSize * CALIBRATION.TEXT_BASELINE_OFFSET;
    const valueY = contentY + (availableHeight / 2) + (textHeight / 2);
    
    // Renderizar texto con alineación
    const textX = value.align === 'center' ? contentX + (contentWidth / 2) :
                  value.align === 'right' ? contentX + contentWidth :
                  contentX;
    
    doc.text(sanitizeText(value.text), textX, valueY, {
        maxWidth: contentWidth,
        align: value.align
    });
}

/**
 * Renderiza una foto con precisión milimétrica
 */
async function renderPhotoCell(
    doc: jsPDF,
    box: CellBox,
    imageData: string,
    options: {
        border?: { color: string; width: number };
        label?: string;
        labelFontSize?: number;
        objectFit?: 'contain' | 'cover' | 'fill';
    } = {}
): Promise<void> {
    const { border, label, labelFontSize = 8, objectFit = 'contain' } = options;
    
    // Dibujar borde si existe
    if (border) {
        doc.setDrawColor(border.color);
        doc.setLineWidth(border.width);
        doc.rect(box.x, box.y, box.width, box.height, 'S');
    }
    
    try {
        // Cargar imagen para obtener dimensiones reales
        const img = new Image();
        img.src = imageData;
        
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load image'));
            setTimeout(() => reject(new Error('Timeout')), 3000);
        });
        
        // Calcular dimensiones según objectFit
        const imgAspect = img.width / img.height;
        const boxAspect = box.width / box.height;
        
        let finalWidth = box.width;
        let finalHeight = box.height;
        let offsetX = 0;
        let offsetY = 0;
        
        if (objectFit === 'contain') {
            if (imgAspect > boxAspect) {
                finalHeight = box.width / imgAspect;
                offsetY = (box.height - finalHeight) / 2;
            } else {
                finalWidth = box.height * imgAspect;
                offsetX = (box.width - finalWidth) / 2;
            }
        } else if (objectFit === 'cover') {
            if (imgAspect > boxAspect) {
                finalWidth = box.height * imgAspect;
                offsetX = -(finalWidth - box.width) / 2;
            } else {
                finalHeight = box.width / imgAspect;
                offsetY = -(finalHeight - box.height) / 2;
            }
        }
        
        // Renderizar imagen
        doc.addImage(
            imageData,
            'JPEG',
            box.x + offsetX,
            box.y + offsetY,
            finalWidth,
            finalHeight,
            undefined,
            'FAST'
        );
        
        // Renderizar etiqueta si existe
        if (label) {
            const labelY = box.y + box.height + 3;
            doc.setFontSize(labelFontSize);
            doc.setTextColor('#333333');
            doc.setFont('helvetica', 'bold');
            doc.text(
                sanitizeText(label),
                box.x + (box.width / 2),
                labelY,
                { align: 'center', maxWidth: box.width }
            );
        }
        
    } catch (error) {
        // Placeholder para error
        doc.setFillColor('#f3f4f6');
        doc.rect(box.x, box.y, box.width, box.height, 'F');
        
        if (border) {
            doc.setDrawColor(border.color);
            doc.setLineWidth(border.width);
            doc.rect(box.x, box.y, box.width, box.height, 'S');
        }
        
        doc.setFontSize(7);
        doc.setTextColor('#9ca3af');
        doc.text(
            'Imagen no disponible',
            box.x + (box.width / 2),
            box.y + (box.height / 2),
            { align: 'center' }
        );
    }
}

// ============================================================================
// EXPORTACIÓN
// ============================================================================

export {
    renderAtomicCell,
    renderPhotoCell,
    sanitizeText,
    calculateOptimalFontSize,
    CALIBRATION,
    SAFE_FONTS,
    type RenderContext,
    type CellBox,
    type LayeredCell
};
