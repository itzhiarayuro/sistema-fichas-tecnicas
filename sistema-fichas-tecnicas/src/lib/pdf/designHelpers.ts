/**
 * Design Helpers - Funciones auxiliares para generar elementos complejos en PDFs personalizados
 * Replica la funcionalidad del generador estándar para diseños custom
 */

import { jsPDF } from 'jspdf';
import { Pozo } from '@/types/pozo';

/**
 * Configuración de estilos por defecto
 */
export const DEFAULT_STYLES = {
    headerBg: '#1F4E79',
    headerText: '#FFFFFF',
    sectionBg: '#F5F5F5',
    borderColor: '#CCCCCC',
    textColor: '#333333',
    labelColor: '#666666',
    tableBorderColor: '#DDDDDD',
    tableHeaderBg: '#E8E8E8',
};

/**
 * Dibuja un encabezado de sección con fondo
 */
export function drawSectionHeader(
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number = 8,
    bgColor: string = DEFAULT_STYLES.headerBg,
    textColor: string = DEFAULT_STYLES.headerText
) {
    // Fondo
    doc.setFillColor(bgColor);
    doc.rect(x, y, width, height, 'F');

    // Texto
    doc.setFontSize(10);
    doc.setTextColor(textColor);
    doc.setFont('helvetica', 'bold');
    doc.text(text, x + 2, y + (height / 2) + 1.5);
}

/**
 * Dibuja una tabla de datos con encabezados
 */
export function drawDataTable(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    headers: string[],
    rows: string[][],
    options: {
        headerHeight?: number;
        rowHeight?: number;
        headerBg?: string;
        headerTextColor?: string;
        borderColor?: string;
        fontSize?: number;
        columnWidths?: number[]; // Anchos relativos (deben sumar 1)
    } = {}
) {
    const {
        headerHeight = 6,
        rowHeight = 5,
        headerBg = DEFAULT_STYLES.tableHeaderBg,
        headerTextColor = DEFAULT_STYLES.textColor,
        borderColor = DEFAULT_STYLES.tableBorderColor,
        fontSize = 8,
        columnWidths
    } = options;

    const colCount = headers.length;
    const colWidths = columnWidths || Array(colCount).fill(1 / colCount);
    const actualWidths = colWidths.map(w => w * width);

    let currentY = y;

    // Dibujar encabezados
    doc.setFillColor(headerBg);
    doc.rect(x, currentY, width, headerHeight, 'F');
    
    doc.setDrawColor(borderColor);
    doc.setLineWidth(0.1);
    doc.rect(x, currentY, width, headerHeight, 'S');

    doc.setFontSize(fontSize);
    doc.setTextColor(headerTextColor);
    doc.setFont('helvetica', 'bold');

    let currentX = x;
    headers.forEach((header, i) => {
        // Líneas verticales entre columnas
        if (i > 0) {
            doc.line(currentX, currentY, currentX, currentY + headerHeight);
        }
        
        doc.text(header, currentX + 1, currentY + (headerHeight / 2) + 1);
        currentX += actualWidths[i];
    });

    currentY += headerHeight;

    // Dibujar filas
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize - 0.5);
    doc.setTextColor(DEFAULT_STYLES.textColor);

    rows.forEach((row, rowIndex) => {
        // Fondo alternado opcional
        if (rowIndex % 2 === 0) {
            doc.setFillColor('#FAFAFA');
            doc.rect(x, currentY, width, rowHeight, 'F');
        }

        // Borde de fila
        doc.setDrawColor(borderColor);
        doc.rect(x, currentY, width, rowHeight, 'S');

        currentX = x;
        row.forEach((cell, colIndex) => {
            // Líneas verticales
            if (colIndex > 0) {
                doc.line(currentX, currentY, currentX, currentY + rowHeight);
            }

            // Texto de celda (truncado si es muy largo)
            const maxWidth = actualWidths[colIndex] - 2;
            const cellText = String(cell || '-');
            doc.text(cellText, currentX + 1, currentY + (rowHeight / 2) + 1, {
                maxWidth: maxWidth
            });

            currentX += actualWidths[colIndex];
        });

        currentY += rowHeight;
    });

    return currentY; // Retorna la posición Y final
}

/**
 * Dibuja una tabla de campos clave-valor (2 columnas)
 */
export function drawFieldTable(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    fields: Array<{ label: string; value: string }>,
    options: {
        rowHeight?: number;
        labelWidth?: number; // Proporción del ancho total (0-1)
        fontSize?: number;
        labelColor?: string;
        valueColor?: string;
        borderColor?: string;
    } = {}
) {
    const {
        rowHeight = 6,
        labelWidth = 0.4,
        fontSize = 9,
        labelColor = DEFAULT_STYLES.labelColor,
        valueColor = DEFAULT_STYLES.textColor,
        borderColor = DEFAULT_STYLES.tableBorderColor
    } = options;

    const labelColWidth = width * labelWidth;
    const valueColWidth = width * (1 - labelWidth);

    let currentY = y;

    doc.setFontSize(fontSize);
    doc.setDrawColor(borderColor);
    doc.setLineWidth(0.1);

    fields.forEach((field, index) => {
        // Fondo alternado
        if (index % 2 === 0) {
            doc.setFillColor('#F9F9F9');
            doc.rect(x, currentY, width, rowHeight, 'F');
        }

        // Borde
        doc.rect(x, currentY, width, rowHeight, 'S');
        doc.line(x + labelColWidth, currentY, x + labelColWidth, currentY + rowHeight);

        // Label
        doc.setTextColor(labelColor);
        doc.setFont('helvetica', 'bold');
        doc.text(field.label, x + 1, currentY + (rowHeight / 2) + 1, {
            maxWidth: labelColWidth - 2
        });

        // Value
        doc.setTextColor(valueColor);
        doc.setFont('helvetica', 'normal');
        doc.text(String(field.value || '-'), x + labelColWidth + 1, currentY + (rowHeight / 2) + 1, {
            maxWidth: valueColWidth - 2
        });

        currentY += rowHeight;
    });

    return currentY;
}

/**
 * Dibuja un grid de fotos con etiquetas
 */
export async function drawPhotoGrid(
    doc: jsPDF,
    x: number,
    y: number,
    gridWidth: number,
    photos: Array<{ dataUrl: string; label: string }>,
    options: {
        columns?: number;
        photoWidth?: number;
        photoHeight?: number;
        spacing?: number;
        labelHeight?: number;
        borderColor?: string;
        showLabels?: boolean;
    } = {}
) {
    const {
        columns = 2,
        photoWidth = 80,
        photoHeight = 60,
        spacing = 5,
        labelHeight = 5,
        borderColor = DEFAULT_STYLES.borderColor,
        showLabels = true
    } = options;

    let currentX = x;
    let currentY = y;
    let col = 0;

    for (const photo of photos) {
        try {
            // Cargar imagen para obtener dimensiones
            const img = new Image();
            img.src = photo.dataUrl;
            
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('Failed to load image'));
                setTimeout(() => reject(new Error('Timeout')), 2000);
            });

            // Calcular dimensiones manteniendo aspect ratio
            const imgAspect = img.width / img.height;
            const boxAspect = photoWidth / photoHeight;

            let finalWidth = photoWidth;
            let finalHeight = photoHeight;
            let offsetX = 0;
            let offsetY = 0;

            if (imgAspect > boxAspect) {
                finalHeight = photoWidth / imgAspect;
                offsetY = (photoHeight - finalHeight) / 2;
            } else {
                finalWidth = photoHeight * imgAspect;
                offsetX = (photoWidth - finalWidth) / 2;
            }

            // Dibujar borde
            doc.setDrawColor(borderColor);
            doc.setLineWidth(0.2);
            doc.rect(currentX, currentY, photoWidth, photoHeight, 'S');

            // Dibujar imagen
            doc.addImage(
                photo.dataUrl,
                'JPEG',
                currentX + offsetX,
                currentY + offsetY,
                finalWidth,
                finalHeight,
                undefined,
                'FAST'
            );

            // Dibujar etiqueta
            if (showLabels) {
                doc.setFontSize(8);
                doc.setTextColor(DEFAULT_STYLES.textColor);
                doc.setFont('helvetica', 'bold');
                doc.text(
                    photo.label,
                    currentX + (photoWidth / 2),
                    currentY + photoHeight + 3,
                    { align: 'center' }
                );
            }

        } catch (e) {
            // Placeholder para foto fallida
            doc.setFillColor('#F0F0F0');
            doc.rect(currentX, currentY, photoWidth, photoHeight, 'F');
            doc.setDrawColor(borderColor);
            doc.rect(currentX, currentY, photoWidth, photoHeight, 'S');
            
            doc.setFontSize(7);
            doc.setTextColor('#999999');
            doc.text('Imagen no disponible', currentX + (photoWidth / 2), currentY + (photoHeight / 2), {
                align: 'center'
            });
        }

        // Avanzar posición
        col++;
        if (col >= columns) {
            col = 0;
            currentX = x;
            currentY += photoHeight + (showLabels ? labelHeight : 0) + spacing;
        } else {
            currentX += photoWidth + spacing;
        }
    }

    return currentY + photoHeight + (showLabels ? labelHeight : 0);
}

/**
 * Extrae datos de tuberías del pozo en formato tabla
 */
export function extractTuberiasData(pozo: Pozo): string[][] {
    const tuberias = pozo.tuberias?.tuberias || [];
    return tuberias.map(tub => [
        String(tub.diametro?.value || '-'),
        String(tub.material?.value || '-'),
        String(tub.cota?.value || '-'),
        String(tub.estado?.value || '-'),
        String(tub.emboquillado?.value || '-'),
        String(tub.tipoTuberia?.value || '-')
    ]);
}

/**
 * Extrae datos de sumideros del pozo en formato tabla
 */
export function extractSumiderosData(pozo: Pozo): string[][] {
    const sumideros = pozo.sumideros?.sumideros || [];
    return sumideros.map(sum => [
        String(sum.idSumidero?.value || '-'),
        String(sum.tipoSumidero?.value || '-'),
        String(sum.materialTuberia?.value || '-'),
        String(sum.diametro?.value || '-'),
        String(sum.alturaSalida?.value || '-')
    ]);
}

/**
 * Extrae campos de identificación del pozo
 */
export function extractIdentificacionFields(pozo: Pozo) {
    return [
        { label: 'Código', value: pozo.idPozo?.value || pozo.identificacion?.idPozo?.value || '-' },
        { label: 'Dirección', value: pozo.direccion?.value || pozo.ubicacion?.direccion?.value || '-' },
        { label: 'Barrio', value: pozo.barrio?.value || pozo.ubicacion?.barrio?.value || '-' },
        { label: 'Sistema', value: pozo.sistema?.value || pozo.componentes?.sistema?.value || '-' },
        { label: 'Estado', value: pozo.estado?.value || pozo.identificacion?.estado?.value || '-' },
        { label: 'Fecha', value: pozo.fecha?.value || pozo.identificacion?.fecha?.value || '-' }
    ];
}

/**
 * Extrae campos de estructura del pozo
 */
export function extractEstructuraFields(pozo: Pozo) {
    const comp = pozo.componentes || {};
    return [
        { label: 'Existe Tapa', value: pozo.existeTapa?.value || comp.existeTapa?.value || '-' },
        { label: 'Estado Tapa', value: pozo.estadoTapa?.value || comp.estadoTapa?.value || '-' },
        { label: 'Material Tapa', value: pozo.materialTapa?.value || comp.materialTapa?.value || '-' },
        { label: 'Material Cilindro', value: pozo.materialCilindro?.value || comp.materialCilindro?.value || '-' },
        { label: 'Diámetro Cilindro', value: pozo.diametroCilindro?.value || comp.diametroCilindro?.value || '-' },
        { label: 'Estado Cilindro', value: pozo.estadoCilindro?.value || comp.estadoCilindro?.value || '-' }
    ];
}
