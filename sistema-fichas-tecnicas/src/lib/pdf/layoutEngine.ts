import { FichaDesignVersion, FieldPlacement, ShapeElement, GroupElement, isFieldPlacement } from '@/types/fichaDesign';
import { Pozo } from '@/types/pozo';
import { FIELD_PATHS } from '@/constants/fieldMapping';

interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

const getValueByPath = (obj: any, path: string): any => {
    if (!path) return undefined;
    try {
        return path.split('.').reduce((acc, part) => {
            if (acc == null) return undefined;
            if (part.includes('[') && part.includes(']')) {
                const [name, indexStr] = part.split(/[\[\]]/);
                return acc[name]?.[parseInt(indexStr)];
            }
            return acc[part];
        }, obj);
    } catch {
        return undefined;
    }
};

/**
 * Determina si un placement tiene datos reales en el pozo
 */
function hasData(placement: FieldPlacement, pozo: Pozo): boolean {
    const path = FIELD_PATHS[placement.fieldId];
    if (!path) return false;

    if (placement.fieldId.startsWith('foto_')) {
        const targetId = placement.fieldId.replace('foto_', '').toUpperCase();
        return !!(pozo.fotos?.fotos?.some(f =>
            String(f.subcategoria || '').toUpperCase() === targetId ||
            String(f.filename || '').toUpperCase().includes(targetId)
        ));
    }

    const basePath = path.endsWith('.value') ? path.slice(0, -6) : path;
    const fieldObj = getValueByPath(pozo, basePath);
    const value = fieldObj && typeof fieldObj === 'object' ? fieldObj.value : fieldObj;
    return value !== undefined && value !== null && value !== '-' && value !== '';
}

/**
 * Calcula el Bounding Box real de un grupo basado en sus elementos hijos.
 * Si los hijos existen, usa sus coordenadas; si no, usa las del grupo.
 */
function calculateGroupBoundingBox(group: GroupElement, elements: (FieldPlacement | ShapeElement)[]): BoundingBox {
    if (elements.length === 0) {
        return { x: group.x, y: group.y, width: group.width, height: group.height };
    }
    const minX = Math.min(...elements.map(e => e.x));
    const minY = Math.min(...elements.map(e => e.y));
    const maxX = Math.max(...elements.map(e => e.x + (e.width || 0)));
    const maxY = Math.max(...elements.map(e => e.y + (e.height || 0)));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Detecta si un grupo es "técnico" (Entrada, Salida o Sumidero) basándose
 * en el nombre del grupo y los fieldIds de sus hijos.
 */
function getTechnicalType(
    groupName: string,
    childFieldIds: string[]
): { type: 'entrada' | 'salida' | 'sumidero' | 'none'; num: number } {
    const name = (groupName || '').toLowerCase();

    let type: 'entrada' | 'salida' | 'sumidero' | 'none' = 'none';
    let num = 999;

    // 1. Detectar por nombre del grupo (máxima prioridad)
    if (/entrada/i.test(name)) type = 'entrada';
    else if (/salida/i.test(name)) type = 'salida';
    else if (/sumidero/i.test(name)) type = 'sumidero';
    else {
        // 2. Detectar por prefijos de fieldId de los hijos
        for (const fid of childFieldIds) {
            if (fid.startsWith('foto_entrada_') || fid.startsWith('ent_')) { type = 'entrada'; break; }
            if (fid.startsWith('foto_salida_') || fid.startsWith('sal_')) { type = 'salida'; break; }
            if (fid.startsWith('foto_sumidero_') || fid.startsWith('sum_')) { type = 'sumidero'; break; }
        }
    }

    if (type === 'none') return { type: 'none', num };

    // 3. Extraer número de orden del nombre o de los fieldIds
    const nameMatch = name.match(/(\d+)/);
    if (nameMatch) {
        num = parseInt(nameMatch[1]);
    } else {
        for (const fid of childFieldIds) {
            const m = fid.match(/(\d+)/);
            if (m) { num = parseInt(m[1]); break; }
        }
    }

    return { type, num };
}

// ============================================================================
// MOTOR DE LAYOUT v3 — DETECCIÓN DINÁMICA DE COLUMNAS + CARRILES 2+1
// ============================================================================

export function applyFlexibleGrid(
    design: FichaDesignVersion,
    pozo: Pozo,
    options: {
        spacingY?: number;
        startAtY?: number;
    } = {}
): FichaDesignVersion {
    const {
        spacingY = 3,
        startAtY = 46
    } = options;

    const newDesign: FichaDesignVersion = JSON.parse(JSON.stringify(design));

    // ─────────────────────────────────────────────────────────────
    // PASO 0: Detectar límite del encabezado (elementos repetibles)
    // ─────────────────────────────────────────────────────────────
    let dynamicStartAtY = startAtY;
    const headerEls = [
        ...(design.shapes || []).filter(s => (s as any).repeatOnEveryPage),
        ...(design.placements || []).filter(p => (p as any).repeatOnEveryPage),
    ];
    if (headerEls.length > 0) {
        const maxHeaderY = Math.max(...headerEls.map(el => el.y + ((el as any).height || 0)));
        dynamicStartAtY = Math.max(maxHeaderY + 2, dynamicStartAtY);
    }
    console.log(`📏 Límite de encabezado detectado dinámicamente en: ${dynamicStartAtY}mm`);

    // ─────────────────────────────────────────────────────────────
    // PASO 1: Recopilar grupos técnicos y clasificarlos
    // ─────────────────────────────────────────────────────────────
    type TechUnit = {
        groupId: string;
        type: 'entrada' | 'salida' | 'sumidero';
        num: number;
        bbox: BoundingBox; // Bounding box ORIGINAL del diseño
        elements: (FieldPlacement | ShapeElement)[];
        hasData: boolean;
    };

    const techUnits: TechUnit[] = [];
    const processedIds = new Set<string>();

    newDesign.groups.forEach(g => {
        const children = [
            ...newDesign.placements.filter(p => p.groupId === g.id),
            ...newDesign.shapes.filter(s => s.groupId === g.id),
        ] as (FieldPlacement | ShapeElement)[];

        const childFieldIds = children.filter(c => isFieldPlacement(c)).map(c => (c as FieldPlacement).fieldId);
        const { type, num } = getTechnicalType(g.name || '', childFieldIds);

        // Solo procesamos técnicos
        if (type === 'none') {
            // Los no-técnicos: marcar como procesados y NO mover
            children.forEach(c => processedIds.add(c.id));
            return;
        }

        const bbox = calculateGroupBoundingBox(g, children);

        // Verificar si este grupo tiene datos reales
        const groupHasData = children.some(c =>
            isFieldPlacement(c) && hasData(c as FieldPlacement, pozo)
        );

        // Si no tiene datos, ocultarlo
        if (!groupHasData) {
            g.isVisible = false;
            children.forEach(c => { c.isVisible = false; processedIds.add(c.id); });
            return;
        }

        techUnits.push({ groupId: g.id, type, num, bbox, elements: children, hasData: true });
        children.forEach(c => processedIds.add(c.id));
    });

    // ─────────────────────────────────────────────────────────────
    // PASO 2: Detectar dinámicamente las posiciones X de cada carril
    //         leyendo las coordenadas reales del diseño
    // ─────────────────────────────────────────────────────────────
    const entradas = techUnits.filter(u => u.type === 'entrada').sort((a, b) => a.num - b.num);
    const salidas = techUnits.filter(u => u.type === 'salida').sort((a, b) => a.num - b.num);
    const sumideros = techUnits.filter(u => u.type === 'sumidero').sort((a, b) => a.num - b.num);

    console.log(`🚦 Motor Layout — Tracks detectados: Main=${entradas.length + salidas.length} (E/S), Right=${sumideros.length} (Sum)`);
    console.log(`📋 Clasificación Main Track:`);
    [...entradas, ...salidas].forEach(u => {
        const g = newDesign.groups.find(g => g.id === u.groupId);
        console.log(`  - ${g?.name || u.groupId}: tipo=${u.type}, num=${u.num}`);
    });

    // Detectar X de columna 1 (Entradas impares / col izquierda)
    // Usando la X del primer grupo de Entradas o Salidas con num impar
    const mainUnits = [...entradas, ...salidas];
    const col1Xs = mainUnits
        .filter(u => u.num % 2 !== 0)  // impares van a columna 1
        .map(u => u.bbox.x);
    const col2Xs = mainUnits
        .filter(u => u.num % 2 === 0)  // pares van a columna 2
        .map(u => u.bbox.x);
    const col3Xs = sumideros.map(u => u.bbox.x);

    // Usar la mediana de las X detectadas para mayor robustez
    const median = (arr: number[]) => {
        if (arr.length === 0) return null;
        const sorted = [...arr].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
    };

    // Posiciones X reales (detectadas del diseño, con fallbacks)
    const COL1_X = median(col1Xs) ?? 5;
    const COL2_X = median(col2Xs) ?? 73;
    const COL3_X = median(col3Xs) ?? 142;

    // Y de inicio: el grupo técnico más alto (menor Y) del diseño
    const allTechY = techUnits.map(u => u.bbox.y);
    const TECH_START_Y = allTechY.length > 0
        ? Math.max(Math.min(...allTechY), dynamicStartAtY)
        : dynamicStartAtY;

    console.log(`� Columnas detectadas: Col1.x=${COL1_X}, Col2.x=${COL2_X}, Col3.x=${COL3_X}, StartY=${TECH_START_Y}`);

    // ─────────────────────────────────────────────────────────────
    // PASO 3: Mover elementos al flujo de 2+1 columnas
    //
    // Lógica de distribución Main Track:
    //   Entrada 1 → Col1, Entrada 2 → Col2, Entrada 3 → Col1, ...
    //   Salida 1  → Col1 (después de todas las entradas de col1)
    //   Salida 2  → Col2 (después de todas las entradas de col2)
    //
    // Cada columna tiene su propio cursor Y independiente
    // ─────────────────────────────────────────────────────────────

    let yCol1 = TECH_START_Y;
    let yCol2 = TECH_START_Y;
    let yCol3 = TECH_START_Y;

    function moveUnit(unit: TechUnit, targetX: number, targetY: number) {
        const bbox = unit.bbox;
        const dx = targetX - bbox.x;
        const dy = targetY - bbox.y;

        unit.elements.forEach((el: any) => {
            el.x += dx;
            el.y += dy;
        });

        const g = newDesign.groups.find(g => g.id === unit.groupId);
        if (g) {
            g.x = targetX;
            g.y = targetY;
        }
    }

    // Distribuir entradas en 2 columnas alternadas (1→Col1, 2→Col2, 3→Col1...)
    entradas.forEach(unit => {
        const goToCol1 = unit.num % 2 !== 0; // impares → Col1, pares → Col2
        if (goToCol1) {
            moveUnit(unit, COL1_X, yCol1);
            yCol1 += unit.bbox.height + spacingY;
        } else {
            moveUnit(unit, COL2_X, yCol2);
            yCol2 += unit.bbox.height + spacingY;
        }
    });

    // Distribuir salidas en 2 columnas, continuando desde donde quedaron las entradas
    salidas.forEach(unit => {
        const goToCol1 = unit.num % 2 !== 0;
        if (goToCol1) {
            moveUnit(unit, COL1_X, yCol1);
            yCol1 += unit.bbox.height + spacingY;
        } else {
            moveUnit(unit, COL2_X, yCol2);
            yCol2 += unit.bbox.height + spacingY;
        }
    });

    // Distribuir sumideros en columna 3, todos seguidos
    sumideros.forEach(unit => {
        moveUnit(unit, COL3_X, yCol3);
        yCol3 += unit.bbox.height + spacingY;
    });

    console.log(`✅ Layout finalizado: Y final Col1=${yCol1}mm, Col2=${yCol2}mm, Col3=${yCol3}mm`);

    return newDesign;
}
