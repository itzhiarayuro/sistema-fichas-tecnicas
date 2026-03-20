import { jsPDF } from 'jspdf';
import { FichaDesignVersion, FieldPlacement, ShapeElement } from '@/types/fichaDesign';
import { AvailableField } from '@/types/fichaDesign';
import { Pozo } from '@/types/pozo';
import { generatePdfFromDesign as originalGenerator } from './designBasedPdfGenerator';
import { applyFlexibleGrid } from './layoutEngine';

/**
 * Generador Experimental con Layout Flexible
 * 
 * Esta es una versión que utiliza el LayoutEngine para reorganizar los elementos
 * antes de pasarlos al generador estándar.
 */
export async function generateFlexiblePdf(
    design: FichaDesignVersion,
    pozo: Pozo,
    availableFields?: AvailableField[]
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
        console.log('🚀 Iniciando Generación Flexible (Beta)...');

        // 1. Aplicar la lógica de reorganización dinámica
        // Solo afectará a grupos técnicos (entradas, salidas, etc.)
        const optimizedDesign = applyFlexibleGrid(design, pozo, {
            spacingY: 3,
            startAtY: 49 // Espacio de 3mm debajo del encabezado (Header termina en 46)
        });

        // 2. Usar el generador estándar pero con el diseño ya "movido"
        // Forzamos que el generador respete las nuevas posiciones.
        return await originalGenerator(optimizedDesign, pozo, availableFields);

    } catch (error) {
        console.error('❌ Error en el generador flexible:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error en layout dinámico'
        };
    }
}
