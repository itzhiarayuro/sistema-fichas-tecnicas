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
 * Calcula el Bounding Box real de un grupo basado en sus elementos hijos
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
 * Detecta si un grupo es técnico y qué NÚMERO DE ORDEN representa.
 * Esto es vital porque el usuario quiere que "Orden 3" vaya al cuadro "3".
 */
function getTechnicalType(
    groupName: string,
    childFieldIds: string[]
): { type: 'entrada' | 'salida' | 'sumidero' | 'none', num: number } {
    const name = (groupName || '').toLowerCase();
    let type: 'entrada' | 'salida' | 'sumidero' | 'none' = 'none';
    let num = 0;

    // Detectar tipo
    if (/entrada/i.test(name)) type = 'entrada';
    else if (/salida/i.test(name)) type = 'salida';
    else if (/sumidero/i.test(name)) type = 'sumidero';
    else {
        for (const fid of childFieldIds) {
            if (fid.startsWith('foto_entrada_') || fid.startsWith('ent_')) { type = 'entrada'; break; }
            if (fid.startsWith('foto_salida_') || fid.startsWith('sal_')) { type = 'salida'; break; }
            if (fid.startsWith('foto_sumidero_') || fid.startsWith('sum_')) { type = 'sumidero'; break; }
        }
    }

    if (type === 'none') return { type: 'none', num: 0 };

    // Extraer número (de "Entrada 3" o de "ent_3_id")
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
// MOTOR DE LAYOUT v5 — SINCRONIZACIÓN TOTAL CON COLUMNA "ORDEN"
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

    // PASO 0: Encabezado
    let dynamicStartAtY = startAtY;
    const headerEls = [
        ...(design.shapes || []).filter(s => (s as any).repeatOnEveryPage),
        ...(design.placements || []).filter(p => (p as any).repeatOnEveryPage),
    ];
    if (headerEls.length > 0) {
        const maxHeaderY = Math.max(...headerEls.map(el => el.y + ((el as any).height || 0)));
        dynamicStartAtY = Math.max(maxHeaderY + 2, dynamicStartAtY);
    }

    // PASO 1: Recopilar grupos y validar contra el ORDEN real del pozo
    type TechUnit = {
        groupId: string;
        type: 'entrada' | 'salida' | 'sumidero';
        num: number; // Su número de identidad (Orden)
        bbox: BoundingBox;
        elements: (FieldPlacement | ShapeElement)[];
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

        if (type === 'none') {
            children.forEach(c => processedIds.add(c.id));
            return;
        }

        const bbox = calculateGroupBoundingBox(g, children);

        // VALIDACIÓN CONTRA EL EXCEL:
        // Buscamos si el pozo tiene datos en el slot correspondiente al número de orden
        let hasRealData = false;
        if (num >= 1 && num <= 8) {
            const index = num - 1;
            if (type === 'entrada') {
                const entries = pozo.tuberias.tuberias.slice(0, 8);
                hasRealData = !!(entries[index]?.idTuberia?.value);
            } else if (type === 'salida') {
                const exits = pozo.tuberias.tuberias.slice(8, 16);
                hasRealData = !!(exits[index]?.idTuberia?.value);
            } else if (type === 'sumidero') {
                hasRealData = !!(pozo.sumideros.sumideros[index]?.idSumidero?.value);
            }
        }

        if (!hasRealData) {
            g.isVisible = false;
            children.forEach(c => { c.isVisible = false; processedIds.add(c.id); });
            return;
        }

        techUnits.push({ groupId: g.id, type, num, bbox, elements: children });
        children.forEach(c => processedIds.add(c.id));
    });

    // PASO 2: Coordenadas fijas de columnas
    const COL1_X = 5;
    const COL2_X = 73;
    const COL3_X = 142;

    // Ordenamos las unidades por su número de orden real para que fluyan 1, 2, 3...
    const entradas = techUnits.filter(u => u.type === 'entrada').sort((a, b) => a.num - b.num);
    const salidas = techUnits.filter(u => u.type === 'salida').sort((a, b) => a.num - b.num);
    const sumideros = techUnits.filter(u => u.type === 'sumidero').sort((a, b) => a.num - b.num);

    // PASO 3: Posicionar
    let yCol1 = dynamicStartAtY;
    let yCol2 = dynamicStartAtY;
    let yCol3 = dynamicStartAtY;

    function moveUnit(unit: TechUnit, targetX: number, targetY: number) {
        const dx = targetX - unit.bbox.x;
        const dy = targetY - unit.bbox.y;
        unit.elements.forEach((el: any) => { el.x += dx; el.y += dy; });
        const g = newDesign.groups.find(g => g.id === unit.groupId);
        if (g) { g.x = targetX; g.y = targetY; }
    }

    // Entradas: respetamos su orden numérico para la alternancia de columnas
    entradas.forEach(unit => {
        if (unit.num % 2 !== 0) { // 1, 3, 5, 7 -> Col 1
            moveUnit(unit, COL1_X, yCol1);
            yCol1 += unit.bbox.height + spacingY;
        } else { // 2, 4, 6, 8 -> Col 2
            moveUnit(unit, COL2_X, yCol2);
            yCol2 += unit.bbox.height + spacingY;
        }
    });

    // Salidas: continúan en el flujo
    salidas.forEach(unit => {
        if (unit.num % 2 !== 0) {
            moveUnit(unit, COL1_X, yCol1);
            yCol1 += unit.bbox.height + spacingY;
        } else {
            moveUnit(unit, COL2_X, yCol2);
            yCol2 += unit.bbox.height + spacingY;
        }
    });

    // Sumideros: columna 3
    sumideros.forEach(unit => {
        moveUnit(unit, COL3_X, yCol3);
        yCol3 += unit.bbox.height + spacingY;
    });

    return newDesign;
}
