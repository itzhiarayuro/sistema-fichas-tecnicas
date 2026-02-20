import { jsPDF } from 'jspdf';
import { FichaDesignVersion, FieldPlacement, ShapeElement } from '@/types/fichaDesign';
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
    pozo: Pozo
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
        console.log('🚀 Iniciando Generación Flexible (Beta)...');

        // 1. Aplicar la lógica de reorganización dinámica
        // Solo afectará a grupos técnicos (entradas, salidas, etc.)
        const optimizedDesign = applyFlexibleGrid(design, pozo, {
            columns: 3,
            marginX: 10,
            marginY: 10,
            spacingX: 4,
            spacingY: 6,
            startAtY: 90 // Y=340px en canvas ÷ 3.78 (MM_TO_PX) ≈ 90mm — empieza después del encabezado completo
        });

        // 2. Usar el generador estándar pero con el diseño ya "movido"
        // Forzamos que el generador respete las nuevas posiciones.
        return await originalGenerator(optimizedDesign, pozo);

    } catch (error) {
        console.error('❌ Error en el generador flexible:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error en layout dinámico'
        };
    }
}
