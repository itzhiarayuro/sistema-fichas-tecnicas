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
 * 
 * IMPORTANTE: El layoutEngine ya hace TODO el trabajo de:
 *   - Detectar qué grupos tienen datos
 *   - Ocultar los que no tienen
 *   - Reubicar los visibles en posiciones compactadas
 * 
 * Por eso, al llamar al generador estándar, le pasamos
 * skipGroupVisibility: true para que NO aplique su propia
 * lógica de acordeón/ocultamiento encima.
 */
export async function generateFlexiblePdf(
    design: FichaDesignVersion,
    pozo: Pozo
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
        console.log('🚀 Iniciando Generación Flexible (Beta)...');

        // 1. Aplicar la lógica de reorganización dinámica
        // El layoutEngine detecta automáticamente dónde termina el encabezado,
        // oculta grupos técnicos sin datos, y compacta los que sí tienen datos.
        const optimizedDesign = applyFlexibleGrid(design, pozo, {
            columns: 3,
            marginX: 10,
            marginY: 10,
            spacingX: 4,
            spacingY: 6
        });

        // 2. Usar el generador estándar con el diseño ya reorganizado.
        // skipGroupVisibility: true → el generador NO vuelve a evaluar qué grupos
        // ocultar, porque el layoutEngine ya lo hizo. Esto evita doble procesamiento.
        return await originalGenerator(optimizedDesign, pozo, { skipGroupVisibility: true });

    } catch (error) {
        console.error('❌ Error en el generador flexible:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error en layout dinámico'
        };
    }
}
