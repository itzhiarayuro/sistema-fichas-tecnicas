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
        const subId = placement.fieldId.replace('foto_', '').toLowerCase();
        const subIdArr = subId.split('_');
        let code = subId.toUpperCase(); // default e.g. 'PANORAMICA'
        
        if (subId.startsWith('entrada_')) code = 'E' + subIdArr[subIdArr.length - 1];
        if (subId.startsWith('salida_')) code = 'S' + subIdArr[subIdArr.length - 1];
        if (subId.startsWith('sumidero_')) code = 'SUM' + subIdArr[subIdArr.length - 1];
        if (subId === 'panoramica') code = 'P';
        if (subId === 'tapa') code = 'T';
        if (subId === 'interior') code = 'I';

        return !!(pozo.fotos?.fotos?.some(f => {
            if (!f) return false;
            const sc = String(f.subcategoria || '').toUpperCase();
            const fn = String(f.filename || '').toUpperCase();
            return sc === code || 
                   fn.includes(`-${code}`) || 
                   fn.startsWith(`${code}-`) ||
                   fn.includes(`_${code}`) ||
                   sc.startsWith(code);
        }));
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

    // PASO 1: Descubrir los bloques ancla (La cuadrícula visual)
    type BlockBound = {
        type: 'entrada' | 'salida' | 'sumidero';
        num: number;
        col: 1 | 2 | 3;
        minY: number;
        maxY: number;
        hasData: boolean;
        elements: (FieldPlacement | ShapeElement)[];
    };

    const blocks: BlockBound[] = [];
    const page2Elements = [
        ...newDesign.placements.filter(p => !p.repeatOnEveryPage && (p as any).pageNumber === 2),
        ...newDesign.shapes.filter(s => !s.repeatOnEveryPage && (s as any).pageNumber === 2)
    ];

    // Primero, encontramos los límites Y de cada bloque definidos por los grupos explícitos.
    // Asumismos que al menos un recuadro o texto que define el tamaño está agrupado.
    newDesign.groups.forEach(g => {
        const children = [
            ...newDesign.placements.filter(p => p.groupId === g.id),
            ...newDesign.shapes.filter(s => s.groupId === g.id),
        ] as (FieldPlacement | ShapeElement)[];

        const { type, num } = getTechnicalType(g.name || '', []);
        if (type === 'none' || num === 0 || children.length === 0) return;

        const bbox = calculateGroupBoundingBox(g, children);
        
        // Determinar columna visual
        const cx = bbox.x + bbox.width / 2;
        let col: 1 | 2 | 3 = 1;
        if (cx > 135) col = 3;
        else if (cx > 65) col = 2;

        let hasRealData = false;
        if (num >= 1 && num <= 8) {
            const index = num - 1;
            if (type === 'entrada') {
                hasRealData = !!(pozo.tuberias?.tuberias?.[index]?.idTuberia?.value);
            } else if (type === 'salida') {
                hasRealData = !!(pozo.tuberias?.tuberias?.[index + 8]?.idTuberia?.value);
            } else if (type === 'sumidero') {
                hasRealData = !!(pozo.sumideros?.sumideros?.[index]?.idSumidero?.value);
            }
        }

        let photoCode = '';
        if (type === 'entrada') photoCode = 'E' + num;
        if (type === 'salida') photoCode = 'S' + num;
        if (type === 'sumidero') photoCode = 'SUM' + num;

        if (photoCode && pozo.fotos?.fotos) {
            const hasPhoto = pozo.fotos.fotos.some(f => {
                if (!f) return false;
                const sc = String(f.subcategoria || '').toUpperCase();
                const fn = String(f.filename || '').toUpperCase();
                return sc === photoCode || 
                       fn.includes(`-${photoCode}`) || 
                       fn.startsWith(`${photoCode}-`) ||
                       fn.includes(`_${photoCode}`) ||
                       sc.startsWith(photoCode);
            });
            hasRealData = hasRealData || hasPhoto;
        }

        blocks.push({
            type, num, col,
            minY: bbox.y - 2, // Margen de tolerancia visual
            maxY: bbox.y + bbox.height + 2,
            hasData: hasRealData,
            elements: []
        });
    });

    // Expandimos los maxY para llenar los huecos y no perder nada. (El maxY de uno llega hasta el minY del siguiente)
    [1, 2, 3].forEach(c => {
        const colBlocks = blocks.filter(b => b.col === c).sort((a, b) => a.minY - b.minY);
        for (let i = 0; i < colBlocks.length - 1; i++) {
            colBlocks[i].maxY = colBlocks[i + 1].minY; // Que abarque hasta que empiece el siguiente
        }
        if (colBlocks.length > 0) {
            colBlocks[colBlocks.length - 1].maxY = 290; // El último abarca hasta el final de la página
        }
    });

    // PASO 2: ASIGNACIÓN 100% ESPACIAL
    // TODO elemento de la página 2 pertenece al bloque en cuya columna y rango Y se encuentra.
    page2Elements.forEach(el => {
        if (el.y < dynamicStartAtY - 5) return; // Ignorar encabezados
        
        const cx = el.x + (el.width || 0) / 2;
        const cy = el.y + (el.height || 0) / 2;
        
        let elCol: 1 | 2 | 3 = 1;
        if (cx > 135) elCol = 3;
        else if (cx > 65) elCol = 2;

        const targetBlock = blocks.find(b => b.col === elCol && cy >= b.minY && cy < b.maxY);
        
        if (targetBlock) {
            targetBlock.elements.push(el);
            if (!targetBlock.hasData) {
                el.isVisible = false; // Se oculta porque pertenece a un bloque sin datos
            }
        } else {
            // Huérfano que no cayó en ningún bloque lógico de la grilla -> se oculta.
            el.isVisible = false;
        }
    });

    // PASO 3: POSICIONAMIENTO Y TETRIS
    let yCols = { 1: dynamicStartAtY, 2: dynamicStartAtY, 3: dynamicStartAtY };
    const fixedX = { 1: 5, 2: 73, 3: 142 };

    const activeBlocks = blocks.filter(b => b.hasData);

    // Separamos en arrays para iterar en el orden correcto
    const entradas = activeBlocks.filter(b => b.type === 'entrada').sort((a,b) => a.num - b.num);
    const salidas = activeBlocks.filter(b => b.type === 'salida').sort((a,b) => a.num - b.num);
    const sumideros = activeBlocks.filter(b => b.type === 'sumidero').sort((a,b) => a.num - b.num);

    function placeBlock(b: BlockBound, targetCol: 1 | 2 | 3) {
        if (b.elements.length === 0) return;
        
        const minX = Math.min(...b.elements.map(e => e.x));
        const minY = Math.min(...b.elements.map(e => e.y));
        const height = Math.max(...b.elements.map(e => e.y + (e.height || 0))) - minY;

        const targetX = fixedX[targetCol];
        const targetY = yCols[targetCol];

        const dx = targetX - minX;
        const dy = targetY - minY;

        b.elements.forEach((el: any) => { 
            el.x += dx; 
            el.y += dy; 
        });

        yCols[targetCol] += height + spacingY;
    }

    // Tuberías en columnas 1 y 2
    entradas.forEach(b => {
        const col = b.num % 2 !== 0 ? 1 : 2;
        placeBlock(b, col);
    });

    salidas.forEach(b => {
        const col = b.num % 2 !== 0 ? 1 : 2;
        placeBlock(b, col);
    });

    // Sumideros en columna 3
    sumideros.forEach(b => {
        placeBlock(b, 3);
    });

    return newDesign;
}
