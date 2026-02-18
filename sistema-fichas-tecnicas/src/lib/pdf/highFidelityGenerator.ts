/**
 * High Fidelity PDF Generator
 * 
 * Generador que respeta al 100% el diseño del diseñador visual
 * Sin ajustes automáticos, sin offsets, sin sorpresas
 */

import { jsPDF } from 'jspdf';
import { FichaDesignVersion, FieldPlacement, ShapeElement } from '@/types/fichaDesign';
import { Pozo } from '@/types/pozo';
import { FIELD_PATHS } from '@/constants/fieldMapping';
import {
    renderAtomicCell,
    renderPhotoCell,
    sanitizeText,
    CALIBRATION,
    type CellBox,
    type LayeredCell
} from './highFidelityRenderer';

/**
 * Obtiene valor de un campo del pozo usando path notation
 */
function getValueByPath(obj: any, path: string): any {
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
}

/**
 * Resuelve el valor de una foto por nomenclatura
 * Incluye tracking para evitar duplicados
 */
async function resolvePhotoValue(
    fieldId: string,
    pozo: Pozo,
    blobStore: any,
    usedPhotoIds: Set<string>
): Promise<string | null> {
    const codeMap: Record<string, string> = {
        'foto_panoramica': 'P',
        'foto_tapa': 'T',
        'foto_interior': 'I',
        'foto_acceso': 'A',
        'foto_fondo': 'F',
        'foto_medicion': 'M',
        'foto_entrada_1': 'E1',
        'foto_entrada_2': 'E2',
        'foto_salida_1': 'S1',
        'foto_salida_2': 'S2',
        'foto_sumidero_1': 'SUM1',
        'foto_sumidero_2': 'SUM2',
        'foto_esquema': 'L'
    };

    const targetCode = codeMap[fieldId];
    if (!targetCode) return null;

    // Buscar foto con criterios flexibles, excluyendo las ya usadas
    const found = pozo.fotos?.fotos?.find(f => {
        // Saltar si ya fue usada
        if (usedPhotoIds.has(f.id)) return false;

        const subcat = String(f.subcategoria || '').toUpperCase();
        const filename = String(f.filename || '').toUpperCase();
        const tipo = String(f.tipo || '').toUpperCase();

        return (
            subcat === targetCode ||
            subcat.includes(targetCode) ||
            filename.includes(`-${targetCode}.`) ||
            filename.includes(`-${targetCode}-`) ||
            filename.endsWith(`-${targetCode}`) ||
            tipo === targetCode
        );
    });

    if (!found) return null;

    // Marcar como usada
    usedPhotoIds.add(found.id);

    // Resolver blobId a dataUrl
    if (found.blobId) {
        return blobStore.getUrl(found.blobId);
    } else if ((found as any).dataUrl) {
        return (found as any).dataUrl;
    }

    return null;
}

/**
 * Renderiza un shape (rectángulo, círculo, línea, texto, imagen)
 */
async function renderShape(doc: jsPDF, shape: ShapeElement): Promise<void> {
    // Formas geométricas
    if (shape.type === 'rectangle' || shape.type === 'circle' || shape.type === 'triangle') {
        const hasFill = shape.fillColor && shape.fillColor !== 'transparent';
        const hasStroke = shape.strokeColor && shape.strokeColor !== 'transparent';
        const style = (hasFill && hasStroke) ? 'FD' : hasFill ? 'F' : 'S';

        if (hasFill) doc.setFillColor(shape.fillColor!);
        if (hasStroke) {
            doc.setDrawColor(shape.strokeColor!);
            doc.setLineWidth(shape.strokeWidth || CALIBRATION.HAIRLINE_WIDTH);
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

    // Líneas
    if (shape.type === 'line') {
        doc.setDrawColor(shape.strokeColor || '#000000');
        doc.setLineWidth(shape.strokeWidth || CALIBRATION.STANDARD_BORDER);
        doc.line(shape.x, shape.y, shape.x + shape.width, shape.y + shape.height);
    }

    // Texto
    if (shape.type === 'text' && shape.content) {
        const fontSize = shape.fontSize || 10;
        doc.setFontSize(fontSize);
        doc.setTextColor(shape.color || '#000000');
        doc.setFont('helvetica', shape.fontWeight === 'bold' ? 'bold' : 'normal');

        const textY = shape.y + (fontSize * CALIBRATION.TEXT_BASELINE_OFFSET);
        doc.text(sanitizeText(shape.content), shape.x, textY, {
            maxWidth: shape.width,
            align: shape.textAlign || 'left'
        });
    }

    // Imagen
    if (shape.type === 'image' && shape.imageUrl) {
        try {
            doc.addImage(
                shape.imageUrl,
                'JPEG',
                shape.x,
                shape.y,
                shape.width,
                shape.height,
                undefined,
                'FAST'
            );
        } catch (e) {
            console.warn('No se pudo cargar imagen del shape', e);
        }
    }
}

/**
 * Renderiza un placement (campo de datos o foto)
 */
async function renderPlacement(
    doc: jsPDF,
    placement: FieldPlacement,
    pozo: Pozo,
    blobStore: any,
    usedPhotoIds: Set<string>
): Promise<void> {
    const isPhoto = placement.fieldId.startsWith('foto_');

    if (isPhoto) {
        // RENDERIZAR FOTO
        const imageData = await resolvePhotoValue(placement.fieldId, pozo, blobStore, usedPhotoIds);

        if (imageData) {
            await renderPhotoCell(doc, {
                x: placement.x,
                y: placement.y,
                width: placement.width,
                height: placement.height
            }, imageData, {
                border: (placement as any).borderWidth ? {
                    color: (placement as any).borderColor || '#000000',
                    width: (placement as any).borderWidth
                } : undefined,
                label: placement.showLabel ? placement.customLabel : undefined,
                labelFontSize: (placement.fontSize || 10) * 0.7,
                objectFit: (placement as any).objectFit || 'contain'
            });
        } else {
            // Placeholder para foto no encontrada
            doc.setFillColor('#f9fafb');
            doc.rect(placement.x, placement.y, placement.width, placement.height, 'F');

            if ((placement as any).borderWidth) {
                doc.setDrawColor((placement as any).borderColor || '#d1d5db');
                doc.setLineWidth((placement as any).borderWidth);
                doc.rect(placement.x, placement.y, placement.width, placement.height, 'S');
            }

            doc.setFontSize(8);
            doc.setTextColor('#9ca3af');
            doc.text(
                'Sin foto',
                placement.x + (placement.width / 2),
                placement.y + (placement.height / 2),
                { align: 'center' }
            );
        }
    } else {
        // RENDERIZAR CAMPO DE TEXTO
        const path = FIELD_PATHS[placement.fieldId];
        const rawValue = path ? getValueByPath(pozo, path) : undefined;
        const displayValue = String(rawValue ?? '-');

        const cell: LayeredCell = {
            box: {
                x: placement.x,
                y: placement.y,
                width: placement.width,
                height: placement.height
            },
            background: placement.backgroundColor,
            border: (placement as any).borderWidth ? {
                color: (placement as any).borderColor || '#cccccc',
                width: (placement as any).borderWidth
            } : undefined,
            label: placement.showLabel ? {
                text: placement.customLabel || placement.fieldId,
                fontSize: placement.fontSize || 10,
                color: '#666666'
            } : undefined,
            value: {
                text: displayValue,
                fontSize: placement.fontSize || 10,
                color: placement.color || '#000000',
                align: placement.textAlign || 'left',
                fontWeight: placement.fontWeight
            }
        };

        renderAtomicCell(doc, cell);
    }
}

/**
 * Genera PDF con alta fidelidad al diseño
 */
export async function generateHighFidelityPDF(
    design: FichaDesignVersion,
    pozo: Pozo
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
        console.log('🎨 [HIGH FIDELITY] Generando PDF:', {
            diseño: design.name,
            placements: design.placements?.length || 0,
            shapes: design.shapes?.length || 0
        });

        // Configurar documento
        const orientation = design.orientation === 'portrait' ? 'p' : 'l';
        const doc = new jsPDF({
            orientation,
            unit: 'mm',
            format: design.pageSize.toLowerCase() as any,
        });

        // Importar blobStore
        const { blobStore } = await import('@/lib/storage/blobStore');

        // Combinar y ordenar elementos por zIndex
        const allElements = [
            ...(design.shapes || []).map(s => ({ ...s, isShape: true })),
            ...(design.placements || []).map(p => ({ ...p, isShape: false }))
        ].sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0));

        console.log('📐 [HIGH FIDELITY] Elementos a renderizar:', allElements.length);

        // TRACKING: Evitar que la misma foto se use múltiples veces
        const usedPhotoIds = new Set<string>();

        // Renderizar cada página
        const numPages = design.numPages || 1;

        for (let pageIdx = 1; pageIdx <= numPages; pageIdx++) {
            if (pageIdx > 1) doc.addPage();

            for (const el of allElements) {
                if (el.isVisible === false) continue;

                const isHeader = (el as any).repeatOnEveryPage;
                const elementPage = (el as any).pageNumber || 1;

                // Solo renderizar si es header o si la página coincide
                if (!isHeader && elementPage !== pageIdx) continue;

                // Manejar opacidad
                const opacity = (el as any).opacity ?? 1;
                if (opacity < 1) {
                    doc.setGState(new (doc as any).GState({ opacity }));
                } else {
                    doc.setGState(new (doc as any).GState({ opacity: 1 }));
                }

                if (el.isShape) {
                    await renderShape(doc, el as ShapeElement);
                } else {
                    await renderPlacement(doc, el as FieldPlacement, pozo, blobStore, usedPhotoIds);
                }
            }
        }

        console.log('✅ [HIGH FIDELITY] PDF generado exitosamente');
        return { success: true, blob: doc.output('blob') };

    } catch (error) {
        console.error('❌ [HIGH FIDELITY] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
        };
    }
}
