/**
 * smartLayoutEngine.ts
 * 
 * Motor de layout inteligente para fichas técnicas de pozos.
 * 
 * RESPONSABILIDAD ÚNICA:
 * Recibe un diseño (FichaDesignVersion) y los datos reales de un pozo,
 * y devuelve una COPIA del diseño con los placements de la página técnica
 * reorganizados dinámicamente según cuántas tuberías/sumideros reales existen.
 * 
 * REGLAS DE ORO:
 * 1. NUNCA muta el diseño original — siempre devuelve una copia profunda.
 * 2. NUNCA toca elementos de página 1 — el "Muro de Berlín" es absoluto.
 * 3. Solo clasifica por PREFIJO ESTRICTO (ent_, sal_, sum_) — sin heurísticas sueltas.
 * 4. El header boundary se detecta dinámicamente por repeatOnEveryPage.
 */

import { FichaDesignVersion, FieldPlacement, ShapeElement, DesignElement, isFieldPlacement } from '@/types/fichaDesign';
import { Pozo, TuberiaInfo } from '@/types/pozo';

// ============================================================================
// CONSTANTES DE LAYOUT (A4 portrait = 210mm x 297mm)
// ============================================================================

const PAGE_WIDTH_MM = 210;
const PAGE_MARGIN_LEFT = 10;   // mm desde el borde izquierdo
const PAGE_MARGIN_RIGHT = 10;  // mm desde el borde derecho
const USABLE_WIDTH = PAGE_WIDTH_MM - PAGE_MARGIN_LEFT - PAGE_MARGIN_RIGHT; // 190mm

// Layout de 3 columnas para página técnica
// Col1 = Entradas, Col2 = Salidas, Col3 = Sumideros
const COL_GAP = 4; // mm entre columnas
const COL_WIDTH = (USABLE_WIDTH - COL_GAP * 2) / 3; // ~60.67mm cada una

const COL1_X = PAGE_MARGIN_LEFT;                          // Entradas
const COL2_X = COL1_X + COL_WIDTH + COL_GAP;             // Salidas
const COL3_X = COL2_X + COL_WIDTH + COL_GAP;             // Sumideros

// Altura de cada "slot" de tubería/sumidero en mm
// Un grupo típico tiene: título + diámetro + material + estado + foto
const GROUP_HEIGHT_MM = 35;
const TITLE_HEIGHT_MM = 7;   // altura del label del grupo (ej: "ENTRADA 1")
const FIELD_HEIGHT_MM = 6;   // altura de cada campo individual
const GROUP_GAP_MM = 4;      // separación entre grupos

// Buffer de seguridad por encima del área técnica (para no chocar con el header)
const HEADER_BUFFER_MM = 5;

// ============================================================================
// TIPOS INTERNOS
// ============================================================================

type TechnicalType = 'entrada' | 'salida' | 'sumidero';

interface TechnicalGroup {
    type: TechnicalType;
    number: number;           // 1, 2, 3...
    placements: FieldPlacement[];
    hasRealData: boolean;     // si el pozo tiene dato real para este slot
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

/**
 * Aplica layout inteligente al diseño para adaptarlo a los datos reales del pozo.
 * Devuelve siempre una copia nueva — nunca muta el diseño original.
 */
export function applySmartLayout(
    design: FichaDesignVersion,
    pozo: Pozo
): FichaDesignVersion {

    // Deep clone para no mutar nunca el original
    const adapted: FichaDesignVersion = JSON.parse(JSON.stringify(design));

    // -------------------------------------------------------------------------
    // PASO 1: Detectar boundary del header (dinámico, basado en repeatOnEveryPage)
    // -------------------------------------------------------------------------
    const headerBoundary = detectHeaderBoundary(adapted);
    const safeStartY = headerBoundary + HEADER_BUFFER_MM;

    console.log(`[SmartLayout] Header boundary detectado: ${headerBoundary}mm → safeStartY: ${safeStartY}mm`);

    // -------------------------------------------------------------------------
    // PASO 2: Separar placements por página
    // EL MURO DE BERLÍN: página 1 no se toca jamás
    // -------------------------------------------------------------------------
    const page1Placements = adapted.placements.filter(p => (p.pageNumber || 1) === 1);
    const page2Placements = adapted.placements.filter(p => (p.pageNumber || 1) === 2);
    const otherPagePlacements = adapted.placements.filter(p => (p.pageNumber || 1) > 2);

    console.log(`[SmartLayout] Placements - Pág1: ${page1Placements.length}, Pág2: ${page2Placements.length}, Otras: ${otherPagePlacements.length}`);

    // -------------------------------------------------------------------------
    // PASO 3: Clasificar los placements de página 2
    // -------------------------------------------------------------------------
    const { technicalPlacements, otherPlacements } = classifyPage2Placements(page2Placements);

    console.log(`[SmartLayout] Página 2 - Técnicos: ${technicalPlacements.length}, Otros: ${otherPlacements.length}`);

    // -------------------------------------------------------------------------
    // PASO 4: Agrupar los placements técnicos en grupos coherentes
    // -------------------------------------------------------------------------
    const groups = buildTechnicalGroups(technicalPlacements, pozo);

    const entradaGroups = groups.filter(g => g.type === 'entrada' && g.hasRealData);
    const salidaGroups  = groups.filter(g => g.type === 'salida'  && g.hasRealData);
    const sumideroGroups = groups.filter(g => g.type === 'sumidero' && g.hasRealData);

    console.log(`[SmartLayout] Grupos con datos reales - Entradas: ${entradaGroups.length}, Salidas: ${salidaGroups.length}, Sumideros: ${sumideroGroups.length}`);

    // -------------------------------------------------------------------------
    // PASO 5: Calcular el startY de la página 2
    // En página 2, safeStartY empieza desde el inicio de la hoja (no hay header fijo)
    // a menos que haya un elemento repeatOnEveryPage que baje el límite
    // -------------------------------------------------------------------------
    const page2StartY = safeStartY;

    // -------------------------------------------------------------------------
    // PASO 6: Redistribuir los grupos en el layout de 3 columnas
    // -------------------------------------------------------------------------
    const repositionedPlacements: FieldPlacement[] = [];

    repositionedPlacements.push(...repositionGroupsInColumn(entradaGroups,  COL1_X, page2StartY, 2));
    repositionedPlacements.push(...repositionGroupsInColumn(salidaGroups,   COL2_X, page2StartY, 2));
    repositionedPlacements.push(...repositionGroupsInColumn(sumideroGroups, COL3_X, page2StartY, 2));

    // -------------------------------------------------------------------------
    // PASO 7: Reconstruir la lista completa de placements
    // Página 1 intacta + página 2 reorganizada + otras páginas intactas
    // -------------------------------------------------------------------------
    adapted.placements = [
        ...page1Placements,       // Sagrados, sin tocar
        ...otherPlacements,       // Otros de página 2 (títulos, logos, etc.) — posición original
        ...repositionedPlacements, // Técnicos reorganizados
        ...otherPagePlacements,   // Páginas 3+ sin tocar
    ];

    console.log(`[SmartLayout] ✅ Layout aplicado. Total placements: ${adapted.placements.length}`);

    return adapted;
}

// ============================================================================
// DETECCIÓN DEL HEADER BOUNDARY
// ============================================================================

/**
 * Encuentra el borde inferior del elemento más bajo marcado como repeatOnEveryPage.
 * Si no hay ninguno, devuelve un valor conservador de 49mm.
 */
function detectHeaderBoundary(design: FichaDesignVersion): number {
    const DEFAULT_BOUNDARY = 49; // mm — valor seguro si no hay header marcado

    let maxY = 0;
    let found = false;

    // Revisar shapes con repeatOnEveryPage
    for (const shape of (design.shapes || [])) {
        if (shape.repeatOnEveryPage) {
            const bottom = (shape.y || 0) + (shape.height || 0);
            if (bottom > maxY) {
                maxY = bottom;
                found = true;
            }
        }
    }

    // Revisar placements con repeatOnEveryPage
    for (const placement of (design.placements || [])) {
        if (placement.repeatOnEveryPage) {
            const bottom = (placement.y || 0) + (placement.height || 0);
            if (bottom > maxY) {
                maxY = bottom;
                found = true;
            }
        }
    }

    if (!found) {
        console.warn(`[SmartLayout] No se encontraron elementos con repeatOnEveryPage. Usando boundary por defecto: ${DEFAULT_BOUNDARY}mm`);
        return DEFAULT_BOUNDARY;
    }

    return maxY;
}

// ============================================================================
// CLASIFICACIÓN DE PLACEMENTS DE PÁGINA 2
// ============================================================================

/**
 * Clasifica los placements de página 2 en:
 * - technicalPlacements: los que tienen prefijo ent_, sal_ o sum_ (o foto_entrada_, foto_salida_, foto_sumidero_)
 * - otherPlacements: todo lo demás (títulos, logos, campos de identificación)
 * 
 * REGLA ESTRICTA: Solo clasificamos por prefijo exacto, nunca por letra suelta.
 * Esto evita el bug de "falso positivo" donde 'FOTOS PAGINA 1' era detectado como entrada.
 */
function classifyPage2Placements(placements: FieldPlacement[]): {
    technicalPlacements: FieldPlacement[];
    otherPlacements: FieldPlacement[];
} {
    const technicalPlacements: FieldPlacement[] = [];
    const otherPlacements: FieldPlacement[] = [];

    for (const p of placements) {
        const fid = p.fieldId;

        const isTechnical =
            fid.startsWith('ent_') ||
            fid.startsWith('sal_') ||
            fid.startsWith('sum_') ||
            fid.startsWith('foto_entrada_') ||
            fid.startsWith('foto_salida_') ||
            fid.startsWith('foto_sumidero_');

        if (isTechnical) {
            technicalPlacements.push(p);
        } else {
            otherPlacements.push(p);
        }
    }

    return { technicalPlacements, otherPlacements };
}

// ============================================================================
// AGRUPACIÓN DE PLACEMENTS TÉCNICOS
// ============================================================================

/**
 * Agrupa los placements técnicos por tipo y número, y verifica si tienen datos reales.
 * 
 * Ejemplo: ent_1_diametro, ent_1_material, foto_entrada_1 → grupo { type:'entrada', number:1 }
 */
function buildTechnicalGroups(placements: FieldPlacement[], pozo: Pozo): TechnicalGroup[] {
    const groupMap = new Map<string, TechnicalGroup>();

    for (const p of placements) {
        const info = parseTechnicalFieldId(p.fieldId);
        if (!info) continue;

        const key = `${info.type}_${info.number}`;

        if (!groupMap.has(key)) {
            groupMap.set(key, {
                type: info.type,
                number: info.number,
                placements: [],
                hasRealData: false,
            });
        }

        groupMap.get(key)!.placements.push(p);
    }

    // Verificar cuáles tienen datos reales en el pozo
    for (const [key, group] of groupMap.entries()) {
        group.hasRealData = checkHasRealData(group, pozo);
    }

    // Ordenar por número dentro de cada tipo
    return Array.from(groupMap.values())
        .sort((a, b) => {
            if (a.type !== b.type) return a.type.localeCompare(b.type);
            return a.number - b.number;
        });
}

/**
 * Extrae tipo y número de un fieldId técnico.
 * ent_1_diametro → { type: 'entrada', number: 1 }
 * foto_sumidero_2 → { type: 'sumidero', number: 2 }
 */
function parseTechnicalFieldId(fieldId: string): { type: TechnicalType; number: number } | null {
    // Patrón: ent_N_... o sal_N_... o sum_N_...
    const shortMatch = fieldId.match(/^(ent|sal|sum)_(\d+)/);
    if (shortMatch) {
        const typeMap: Record<string, TechnicalType> = { ent: 'entrada', sal: 'salida', sum: 'sumidero' };
        return { type: typeMap[shortMatch[1]], number: parseInt(shortMatch[2]) };
    }

    // Patrón: foto_entrada_N o foto_salida_N o foto_sumidero_N
    const fotoMatch = fieldId.match(/^foto_(entrada|salida|sumidero)_(\d+)$/);
    if (fotoMatch) {
        return { type: fotoMatch[1] as TechnicalType, number: parseInt(fotoMatch[2]) };
    }

    return null;
}

/**
 * Comprueba si el pozo tiene un dato real para el grupo dado.
 * Un dato real es una tubería/sumidero en el índice correspondiente (number - 1).
 */
function checkHasRealData(group: TechnicalGroup, pozo: Pozo): boolean {
    const idx = group.number - 1; // número 1 → índice 0

    if (group.type === 'entrada' || group.type === 'salida') {
        const tuberias = pozo.tuberias?.tuberias || [];
        // Filtrar por tipo si el campo tipoTuberia existe
        const filtered = tuberias.filter(t => {
            const tipo = t.tipoTuberia?.value?.toLowerCase() || '';
            if (group.type === 'entrada') return tipo === 'entrada' || tipo === '';
            if (group.type === 'salida') return tipo === 'salida';
            return true;
        });
        return idx < filtered.length && !!filtered[idx];
    }

    if (group.type === 'sumidero') {
        const sumideros = pozo.sumideros?.sumideros || [];
        return idx < sumideros.length && !!sumideros[idx];
    }

    return false;
}

// ============================================================================
// REPOSICIONAMIENTO EN COLUMNA
// ============================================================================

/**
 * Reposiciona los placements de un conjunto de grupos dentro de una columna.
 * Los grupos se apilan verticalmente, empezando en startY.
 * Los placements dentro de cada grupo se redistribuyen verticalmente a partir del Y del grupo.
 */
function repositionGroupsInColumn(
    groups: TechnicalGroup[],
    colX: number,
    startY: number,
    pageNumber: number
): FieldPlacement[] {
    const result: FieldPlacement[] = [];
    let currentY = startY;

    for (const group of groups) {
        // Calcular altura real del grupo (basada en cuántos placements tiene)
        const groupHeight = calculateGroupHeight(group.placements);

        // Reubicar cada placement del grupo
        let fieldY = currentY + TITLE_HEIGHT_MM; // dejar espacio para el título del grupo

        for (const p of group.placements) {
            const isPhoto = p.fieldId.startsWith('foto_');

            result.push({
                ...p,
                x: colX,
                y: isPhoto ? currentY : fieldY,
                width: Math.min(p.width, COL_WIDTH), // no exceder el ancho de columna
                pageNumber,
            });

            if (!isPhoto) {
                fieldY += (p.height || FIELD_HEIGHT_MM) + 1;
            }
        }

        currentY += groupHeight + GROUP_GAP_MM;
    }

    return result;
}

/**
 * Calcula la altura total que ocupará un grupo.
 */
function calculateGroupHeight(placements: FieldPlacement[]): number {
    if (placements.length === 0) return GROUP_HEIGHT_MM;

    // Si hay una foto, tomamos la altura mayor entre los campos y la foto
    const fotoPlacement = placements.find(p => p.fieldId.startsWith('foto_'));
    const textPlacements = placements.filter(p => !p.fieldId.startsWith('foto_'));

    const textHeight = TITLE_HEIGHT_MM + textPlacements.reduce((sum, p) => sum + (p.height || FIELD_HEIGHT_MM) + 1, 0);
    const fotoHeight = fotoPlacement ? (fotoPlacement.height || 20) : 0;

    return Math.max(textHeight, fotoHeight, GROUP_HEIGHT_MM);
}
