import { jsPDF } from 'jspdf';
import { FichaDesignVersion } from '@/types/fichaDesign';
import { Pozo } from '@/types/pozo';
import { FIELD_PATHS } from '@/constants/fieldMapping';

export async function generatePdfFromDesign(
    design: FichaDesignVersion,
    pozo: Pozo
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
        const doc = new jsPDF({
            orientation: design.orientation,
            unit: design.unit,
            format: design.pageSize.toLowerCase() as any,
        });

        // Helper para obtener valor de ruta (ej: "identificacion.idPozo.value")
        const getValueByPath = (obj: any, path: string) => {
            if (!path) return undefined;
            return path.split('.').reduce((acc, part) => {
                if (part.includes('[') && part.includes(']')) {
                    const [name, index] = part.split(/[\[\]]/);
                    return acc?.[name]?.[parseInt(index)];
                }
                return acc?.[part];
            }, obj);
        };

        const MM_TO_PX = 3.78; // Consistencia con el canvas si fuera necesario, pero doc usa mm

        // 1. Renderizar Shapes
        if (design.shapes) {
            design.shapes.forEach((shape) => {
                if (shape.type === 'rectangle' || shape.type === 'circle') {
                    if (shape.fillColor) {
                        doc.setFillColor(shape.fillColor);
                        doc.rect(shape.x, shape.y, shape.width, shape.height, shape.fillColor !== 'transparent' ? 'F' : 'D');
                    }
                    if (shape.strokeColor) {
                        doc.setDrawColor(shape.strokeColor);
                        doc.setLineWidth(shape.strokeWidth || 0.1);
                        doc.rect(shape.x, shape.y, shape.width, shape.height, 'D');
                    }
                }

                if (shape.type === 'line') {
                    doc.setDrawColor(shape.strokeColor || '#000000');
                    doc.setLineWidth(shape.strokeWidth || 0.5);
                    doc.line(shape.x, shape.y, shape.x + shape.width, shape.y);
                }

                if (shape.type === 'text' && shape.content) {
                    doc.setFontSize(shape.fontSize || 10);
                    doc.setTextColor(shape.color || '#000000');
                    doc.text(shape.content, shape.x, shape.y + (shape.fontSize || 10) * 0.35, {
                        maxWidth: shape.width,
                        align: shape.textAlign || 'left'
                    });
                }
            });
        }

        // 2. Renderizar Placements (Campos)
        if (design.placements) {
            design.placements.forEach((placement) => {
                const fontSize = placement.fontSize || 10;
                const color = placement.color || '#000000';

                doc.setFontSize(fontSize);
                doc.setTextColor(color);

                const path = FIELD_PATHS[placement.fieldId] || '';
                let content = String(getValueByPath(pozo, path) || '-');

                let currentY = placement.y + (fontSize * 0.35);

                if (placement.showLabel) {
                    doc.setFontSize(fontSize * 0.7);
                    doc.setTextColor('#666666');
                    doc.text(`${placement.customLabel || placement.fieldId}:`, placement.x, currentY);
                    currentY += (fontSize * 0.4);
                    doc.setFontSize(fontSize);
                    doc.setTextColor(color);
                }

                doc.text(content, placement.x, currentY, {
                    maxWidth: placement.width,
                    align: placement.textAlign || 'left'
                });
            });
        }

        return { success: true, blob: doc.output('blob') };
    } catch (error) {
        console.error('Error generating design-based PDF:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
}
