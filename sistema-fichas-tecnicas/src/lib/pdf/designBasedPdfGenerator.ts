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

        // 1. Combinar y ordenar todos los elementos por zIndex
        const allElements = [
            ...(design.shapes || []).map(s => ({ ...s, isShape: true })),
            ...(design.placements || []).map(p => ({ ...p, isShape: false }))
        ].sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0));

        console.log('📋 Total de elementos a renderizar:', allElements.length);

        // DEBUG: Ver todas las fotos disponibles
        console.log('📸 Fotos disponibles en el pozo:', pozo.fotos?.fotos?.map(f => ({
            filename: f.filename,
            subcategoria: f.subcategoria,
            tipo: f.tipo,
            descripcion: f.descripcion,
            blobId: f.blobId
        })));

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
                            'foto_entrada_1': 'E1', 'foto_salida_1': 'S1', 'foto_sumidero_1': 'SUM1'
                        };
                        const targetCode = codeMap[placement.fieldId];
                        if (targetCode) {
                            // Buscar foto con múltiples criterios
                            const found = pozo.fotos?.fotos?.find(f => {
                                const subcat = String(f.subcategoria || '').toUpperCase();
                                const filename = String(f.filename || '').toUpperCase();
                                const tipo = String(f.tipo || '').toUpperCase();
                                const desc = String(f.descripcion || '').toUpperCase();

                                // Criterios de búsqueda
                                return (
                                    subcat === targetCode ||
                                    subcat.includes(targetCode) ||
                                    filename.includes(`-${targetCode}.`) ||
                                    filename.includes(`-${targetCode}-`) ||
                                    filename.endsWith(`-${targetCode}`) ||
                                    tipo === targetCode ||
                                    desc.includes(targetCode)
                                );
                            });

                            if (found) {
                                console.log(`✅ Foto encontrada para ${placement.fieldId} (código ${targetCode}):`, {
                                    filename: found.filename,
                                    blobId: found.blobId,
                                    subcategoria: found.subcategoria,
                                    tipo: found.tipo
                                });
                                // Resolver blobId a dataUrl usando el blobStore importado
                                if (found.blobId) {
                                    value = blobStore.getUrl(found.blobId);
                                    console.log(`🔗 URL generada:`, value?.substring(0, 50) + '...');
                                } else if ((found as any).dataUrl) {
                                    value = (found as any).dataUrl;
                                } else {
                                    value = found.id;
                                }
                            } else {
                                console.warn(`❌ No se encontró foto para ${placement.fieldId} con código ${targetCode}`);
                            }
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
        console.error('❌ Error generating design-based PDF:', error);
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
            doc.setDrawColor(placement.borderColor || '#000000'); // Borde negro por defecto para grid
            doc.setLineWidth(placement.borderWidth); // 0.1 o lo que venga del diseño
        }

        // Solo dibujar rectángulo si hay estilo definido (evita bordes por defecto si no se quieren)
        if (style !== 'S' || (placement.borderWidth && placement.borderWidth > 0)) {
            doc.rect(placement.x, placement.y, placement.width, placement.height, style);
        }
    }

    // 2. RENDERIZAR FOTOS
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

            // Lógica Object-Fit: Contain (Centrado perfecto)
            const imgAspect = img.width / img.height;
            const boxAspect = placement.width / placement.height;

            let drawW = placement.width;
            let drawH = placement.height;
            let drawX = placement.x;
            let drawY = placement.y;

            // Ajuste geométrico exacto
            if (imgAspect > boxAspect) {
                // Imagen más ancha que la caja
                drawH = placement.width / imgAspect;
                drawY = placement.y + (placement.height - drawH) / 2;
            } else {
                // Imagen más alta que la caja
                drawW = placement.height * imgAspect;
                drawX = placement.x + (placement.width - drawW) / 2;
            }

            // Margen interno de seguridad (padding)
            const padding = 0.5;
            if (drawW > placement.width - padding) {
                const scale = (placement.width - padding) / drawW;
                drawW *= scale;
                drawH *= scale;
                drawX = placement.x + (placement.width - drawW) / 2;
                drawY = placement.y + (placement.height - drawH) / 2;
            }

            doc.addImage(imageData, 'JPEG', drawX, drawY, drawW, drawH, undefined, 'FAST');

        } catch (e) {
            console.warn(`Error foto ${placement.fieldId}`, e);
        }
        return;
    }

    // 3. RENDERIZAR WIDGETS
    if (isWidget) {
        if (placement.fieldId === 'widget_tuberias') {
            // Renderizar tabla ocupando TODO el espacio de la caja diseñada
            const tuberias = (pozo.tuberias?.tuberias || []).slice(0, 10);
            const headers = ['Ø (mm)', 'Material', 'Estado'];
            const headerH = 5;
            const rowH = (placement.height - headerH) / Math.max(tuberias.length, 1);

            // Header
            doc.setFillColor('#e5e7eb');
            doc.rect(placement.x, placement.y, placement.width, headerH, 'F');
            doc.line(placement.x, placement.y + headerH, placement.x + placement.width, placement.y + headerH);

            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#000000');

            const colW = placement.width / 3;
            headers.forEach((h, i) => {
                doc.text(h, placement.x + (i * colW) + 2, placement.y + 3.5);
            });

            // Rows
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            tuberias.forEach((t, i) => {
                const y = placement.y + headerH + (i * rowH);
                doc.text(sanitizeTextForPDF(t.diametro?.value || '-'), placement.x + 2, y + (rowH / 2) + 1);
                doc.text(sanitizeTextForPDF(t.material?.value || '-'), placement.x + colW + 2, y + (rowH / 2) + 1);
                doc.text(sanitizeTextForPDF(t.estado?.value || '-'), placement.x + (colW * 2) + 2, y + (rowH / 2) + 1);
                // Línea divisoria
                doc.setDrawColor('#eeeeee');
                doc.line(placement.x, y + rowH, placement.x + placement.width, y + rowH);
            });
        }
        return;
    }

    // 4. RENDERIZAR CAMPOS DE TEXTO (Modo Grid)
    const content = String(value ?? '');
    const fontSize = placement.fontSize || 10;

    // Configurar fuente
    const font = getSafeFont(placement.fontFamily);
    const style = placement.fontWeight === 'bold' ? 'bold' : 'normal';
    doc.setFont(font, style);
    doc.setTextColor(placement.color || '#000000');

    // A. DIBUJAR LABEL (SI EXISTE) - Estilo "Input Label" pequeño arriba
    let valueY = placement.y + (placement.height / 2) + (fontSize * 0.35 / 2); // Centrado vertical por defecto

    if (placement.showLabel && placement.customLabel) {
        const labelSize = 6; // Tamaño fijo pequeño para labels
        doc.setFontSize(labelSize);
        doc.setTextColor('#666666'); // Label gris
        doc.text(
            sanitizeTextForPDF(placement.customLabel),
            placement.x + 1,
            placement.y + 3 // Label pegado arriba
        );

        // Si hay label, bajamos un poco el valor para que no choque
        valueY = placement.y + (placement.height) - 2;

        // Restaurar color y fuente para el valor
        doc.setTextColor(placement.color || '#000000');
        doc.setFont(font, style);
    }

    // B. DIBUJAR VALOR
    doc.setFontSize(fontSize);

    // Alineación
    const align = placement.textAlign || 'left';
    let textX = placement.x + 1; // Padding izquierdo default
    if (align === 'center') textX = placement.x + (placement.width / 2);
    if (align === 'right') textX = placement.x + placement.width - 1;

    doc.text(
        sanitizeTextForPDF(content),
        textX,
        valueY,
        {
            maxWidth: placement.width - 2,
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
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor('#999999');
        doc.text(
            `Página ${i} de ${pageCount}`,
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
