import { FichaDesignVersion, DesignElement, FieldPlacement, ShapeElement, GroupElement, isFieldPlacement, isShapeElement } from '@/types/fichaDesign';
import { Pozo } from '@/types/pozo';
import { FIELD_PATHS } from '@/constants/fieldMapping';

interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

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

/**
 * Determina si un placement tiene datos reales en el pozo
 */
function hasData(placement: FieldPlacement, pozo: Pozo): boolean {
    const fieldId = placement.fieldId;

    // 1. Lógica para fotos técnicas (E1, S1, SUM1, P, T, etc.)
    if (fieldId.startsWith('foto_')) {
        const codeMap: Record<string, string> = {
            'foto_panoramica': 'P', 'foto_tapa': 'T', 'foto_interior': 'I',
            'foto_acceso': 'A', 'foto_fondo': 'F', 'foto_medicion': 'M',
            'foto_entrada_1': 'E1', 'foto_entrada_2': 'E2', 'foto_entrada_3': 'E3', 'foto_entrada_4': 'E4', 'foto_entrada_5': 'E5', 'foto_entrada_6': 'E6',
            'foto_salida_1': 'S1', 'foto_salida_2': 'S2', 'foto_salida_3': 'S3', 'foto_salida_4': 'S4', 'foto_salida_5': 'S5', 'foto_salida_6': 'S6',
            'foto_sumidero_1': 'SUM1', 'foto_sumidero_2': 'SUM2', 'foto_sumidero_3': 'SUM3', 'foto_sumidero_4': 'SUM4',
            'foto_descarga_1': 'D1', 'foto_descarga_2': 'D2'
        };

        const targetCode = codeMap[fieldId] || fieldId.replace('foto_', '').toUpperCase();

        return !!pozo.fotos?.fotos?.some(f => {
            const subcat = String(f.subcategoria || '').toUpperCase();
            const filename = String(f.filename || '').toUpperCase();
            return subcat === targetCode || filename.includes(`-${targetCode}`) || filename.startsWith(`${targetCode}-`);
        });
    }

    // 2. Lógica para Tuberías/Sumideros (ent_1_*, sal_1_*, sum_1_*)
    if (fieldId.startsWith('ent_') || fieldId.startsWith('sal_') || fieldId.startsWith('sum_')) {
        const parts = fieldId.split('_');
        const type = parts[0] === 'ent' ? 'entrada' : parts[0] === 'sal' ? 'salida' : 'sumidero';
        const order = parts[1];

        if (type === 'sumidero') {
            const sum = pozo.sumideros?.sumideros?.[parseInt(order) - 1];
            return !!sum && !!sum.idSumidero?.value;
        } else {
            const pipe = pozo.tuberias?.tuberias?.find(t =>
                String(t.tipoTuberia?.value || '').toLowerCase() === type &&
                String(t.orden?.value) === order
            );
            return !!pipe;
        }
    }

    // 3. Lógica para campos estándar
    const path = FIELD_PATHS[fieldId as keyof typeof FIELD_PATHS];
    if (!path) return false;
    const basePath = path.endsWith('.value') ? path.substring(0, path.length - 6) : path;
    const fieldObj = getValueByPath(pozo, basePath);
    const value = fieldObj && typeof fieldObj === 'object' ? fieldObj.value : fieldObj;

    return value !== undefined && value !== null && value !== '-' && value !== '';
}

/**
 * Calcula el Bounding Box real de un grupo basado en sus elementos hijos
 */
function calculateGroupBoundingBox(group: GroupElement, elements: (FieldPlacement | ShapeElement)[]): BoundingBox {
    if (elements.length === 0) return { x: group.x, y: group.y, width: group.width, height: group.height };

    const minX = Math.min(...elements.map(e => e.x));
    const minY = Math.min(...elements.map(e => e.y));
    const maxX = Math.max(...elements.map(e => e.x + (e.width || 0)));
    const maxY = Math.max(...elements.map(e => e.y + (e.height || 0)));

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}

/**
 * Motor de Reorganización Flexible (Grid-Based)
 */
export function applyFlexibleGrid(
    design: FichaDesignVersion,
    pozo: Pozo,
    options?: {
        columns?: number;
        marginX?: number;
        marginY?: number;
        spacingX?: number;
        spacingY?: number;
        startAtY?: number;
    }
): FichaDesignVersion {
    const newDesign: FichaDesignVersion = JSON.parse(JSON.stringify(design));

    // --- DETECCIÓN DINÁMICA DEL ENCABEZADO ---
    // En lugar de un valor fijo, buscamos el elemento de encabezado que esté más abajo
    let dynamicStartAtY = options?.startAtY ?? 0;

    // Si no se pasó un valor fijo, lo calculamos buscando el límite de la cabecera
    if (!options?.startAtY) {
        const headerElements = [
            ...(design.shapes || []).filter(s => (s as any).repeatOnEveryPage),
            ...(design.placements || []).filter(p => (p as any).repeatOnEveryPage)
        ];

        if (headerElements.length > 0) {
            const maxY = Math.max(...headerElements.map(el => el.y + ((el as any).height || 0)));
            dynamicStartAtY = Math.max(maxY + (options?.marginY || 2), 49); // Respetamos el cálculo del usuario (39+8+2)
            console.log(`📏 Límite de encabezado detectado dinámicamente en: ${dynamicStartAtY}mm`);
        } else {
            dynamicStartAtY = 49; // Fallback basado en zona de títulos (39mm + 8mm + 2mm)
        }
    }

    const flowUnits: { id: string; type: 'group' | 'placement' | 'shape'; elements: any[]; initialBbox: BoundingBox; isTechnical: boolean }[] = [];
    const processedElementIds = new Set<string>();

    const marginX = options?.marginX ?? 10;
    const spacingX = options?.spacingX ?? 5;
    const spacingY = options?.spacingY ?? 10;
    const columns = options?.columns ?? 3;

    // 1. Identificar todo lo que debe fluir que esté debajo del encabezado detectado
    // Grupos
    newDesign.groups.forEach(g => {
        const children = [
            ...newDesign.placements.filter(p => p.groupId === g.id),
            ...newDesign.shapes.filter(s => s.groupId === g.id)
        ] as (FieldPlacement | ShapeElement)[];

        const isTechnical = children.some(c =>
            isFieldPlacement(c) && (
                c.fieldId.startsWith('foto_') ||
                c.fieldId.startsWith('ent_') ||
                c.fieldId.startsWith('sal_') ||
                c.fieldId.startsWith('sum_') ||
                c.fieldId.startsWith('tub_') ||
                c.fieldId.startsWith('foto_descarga_')
            )
        );

        // Solo aplicar filtro de Y a grupos NO técnicos (decorativos/títulos).
        // Los técnicos SIEMPRE entran al flujo para ser reorganizados.
        if (!isTechnical && g.y < dynamicStartAtY) return;

        if (isTechnical) {
            const hasVisibleData = children.some(c => isFieldPlacement(c) && hasData(c, pozo));
            if (!hasVisibleData) {
                g.isVisible = false;
                children.forEach(c => c.isVisible = false);
                children.forEach(c => processedElementIds.add(c.id));
                return;
            }
        }

        flowUnits.push({
            id: g.id,
            type: 'group',
            elements: children,
            initialBbox: calculateGroupBoundingBox(g, children),
            isTechnical
        });
        children.forEach(c => processedElementIds.add(c.id));
    });

    // Placements aislados
    newDesign.placements.forEach(p => {
        if (processedElementIds.has(p.id) || p.y < dynamicStartAtY) return;

        const isTechnical = p.fieldId.startsWith('foto_') || p.fieldId.startsWith('tub_') || p.fieldId.startsWith('sum_');
        if (isTechnical && !hasData(p, pozo)) {
            p.isVisible = false;
            return;
        }

        flowUnits.push({
            id: p.id,
            type: 'placement',
            elements: [p],
            initialBbox: { x: p.x, y: p.y, width: p.width, height: p.height },
            isTechnical
        });
        processedElementIds.add(p.id);
    });

    // Shapes aislados (Rectángulos de título, líneas, etc.)
    newDesign.shapes.forEach(s => {
        if (processedElementIds.has(s.id) || s.y < dynamicStartAtY) return;

        flowUnits.push({
            id: s.id,
            type: 'shape',
            elements: [s],
            initialBbox: { x: s.x, y: s.y, width: s.width, height: s.height },
            isTechnical: false
        });
        processedElementIds.add(s.id);
    });

    // 2. SEPARAR POR CARRIL usando fieldIds (NO posición X, que puede variar por diseño)
    // mainTrack = Entradas + Salidas | rightTrack = Sumideros
    const getUnitInfo = (unit: typeof flowUnits[0]) => {
        const group = newDesign.groups.find(g => g.id === unit.id);
        const name = (group?.name || '').toLowerCase();

        let type: 'entrada' | 'salida' | 'sumidero' | 'other' = 'other';
        let num = 999;

        // 1. Detectar tipo (Prioridad por nombre o por hijos técnicos como fotos o campos)
        if (name.includes('entrada')) type = 'entrada';
        else if (name.includes('salida')) type = 'salida';
        else if (name.includes('sumidero')) type = 'sumidero';
        else {
            for (const el of unit.elements) {
                const fid = ((el as any).fieldId || '').toLowerCase();
                if (fid.includes('entrada') || fid.startsWith('ent_')) { type = 'entrada'; break; }
                if (fid.includes('salida') || fid.startsWith('sal_')) { type = 'salida'; break; }
                if (fid.includes('sumidero') || fid.startsWith('sum_')) { type = 'sumidero'; break; }
            }
        }

        // 2. Detectar número de orden (ej: "foto_salida_1" -> 1)
        const allText = name + " " + unit.elements.map(el => (el as any).fieldId || '').join(' ');
        const numMatch = allText.match(/(\d+)/);
        if (numMatch) num = parseInt(numMatch[0]);

        // Debug detallado
        const fieldIds = unit.elements.map(e => (e as any).fieldId).filter(Boolean).join(', ');
        console.log(`🔍 Grupo: "${group?.name || 'Sin nombre'}" → tipo=${type}, num=${num}, fieldIds=[${fieldIds}]`);

        return { type, num };
    };

    const mainTrack = flowUnits.filter(u => {
        const info = getUnitInfo(u);
        return info.type === 'entrada' || info.type === 'salida' || info.type === 'other';
    });
    const rightTrack = flowUnits.filter(u => getUnitInfo(u).type === 'sumidero');

    console.log(`🚦 Tracks — Main: ${mainTrack.length} (ent/sal), Right: ${rightTrack.length} (sum)`);

    // Debug: Mostrar clasificación de cada unidad
    if (mainTrack.length > 0) {
        console.log('📋 Clasificación Main Track:');
        mainTrack.forEach(u => {
            const info = getUnitInfo(u);
            const group = newDesign.groups.find(g => g.id === u.id);
            console.log(`  - ${group?.name || 'Sin nombre'}: tipo=${info.type}, num=${info.num}`);
        });
    }

    /**
     * Función interna para organizar un carril de forma compacta
     */
    const organizeTrack = (units: typeof flowUnits, trackColumns: number, startX: number, colWidth: number) => {
        let currentX = startX;
        let currentY = dynamicStartAtY;
        let maxRowHeight = 0;
        let colIndex = 0;

        // Ordenar: Entrada=Prio1, Salida=Prio2, Otros=Prio9
        units.sort((a, b) => {
            const infoA = getUnitInfo(a);
            const infoB = getUnitInfo(b);

            const prioA = infoA.type === 'entrada' ? 1 : infoA.type === 'salida' ? 2 : 9;
            const prioB = infoB.type === 'entrada' ? 1 : infoB.type === 'salida' ? 2 : 9;

            if (prioA !== prioB) return prioA - prioB;
            return infoA.num - infoB.num;
        }).forEach((unit) => {
            const bbox = unit.initialBbox;

            // Cambio de fila si excede columnas
            if (colIndex >= trackColumns) {
                currentX = startX;
                currentY += maxRowHeight + spacingY;
                maxRowHeight = 0;
                colIndex = 0;
            }

            // ASEGURAR QUE NADA Dinámico suba de los 49mm del encabezado
            const targetY = Math.max(currentY, 49);
            const offsetX = currentX - bbox.x;
            const offsetY = targetY - bbox.y;

            unit.elements.forEach(el => {
                el.x += offsetX;
                el.y += offsetY;
            });

            if (unit.type === 'group') {
                const g = newDesign.groups.find(group => group.id === unit.id);
                if (g) {
                    g.x = currentX;
                    g.y = targetY;
                }
            }

            // Avanzar posición
            currentX += colWidth + spacingX;
            maxRowHeight = Math.max(maxRowHeight, bbox.height);
            colIndex++;
        });
    };

    // Organizar Carril de Tuberías (Entradas primero, luego Salidas — 2 columnas)
    organizeTrack(mainTrack, 2, marginX, 65);

    // Organizar Carril de Sumideros (1 columna, empieza en ~140mm)
    organizeTrack(rightTrack, 1, 140, 60);

    // 3. LIMPIEZA AUTOMÁTICA DE PÁGINAS
    // Si la página 2 quedó vacía (sin tuberías ni sumideros), bajamos el contador a 1 página
    const hasVisibleContentOnPage2 = [
        ...newDesign.placements.filter(p => !p.repeatOnEveryPage && (p.pageNumber || 1) === 2 && p.isVisible !== false),
        ...newDesign.shapes.filter(s => !s.repeatOnEveryPage && (s.pageNumber || 1) === 2 && s.isVisible !== false)
    ].length > 0;

    if (!hasVisibleContentOnPage2 && newDesign.numPages > 1) {
        console.log('📄 Página 2 detectada como vacía. Reduciendo PDF a 1 página.');
        newDesign.numPages = 1;
    }

    return newDesign;
}
