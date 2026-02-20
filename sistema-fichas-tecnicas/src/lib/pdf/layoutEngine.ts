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
    const path = FIELD_PATHS[placement.fieldId];
    if (!path) return false;

    // Lógica para fotos (vistas por código)
    if (placement.fieldId.startsWith('foto_')) {
        // Esta es una simplificación, en el generador es más complejo pero aquí 
        // solo necesitamos saber si "existe el concepto" de esta foto para este pozo.
        // Por ahora, si es un slot técnico, comprobaremos si hay alguna foto con esa subcategoría.
        const targetId = placement.fieldId.replace('foto_', '').toUpperCase();
        const found = pozo.fotos?.fotos?.some(f =>
            String(f.subcategoria || '').toUpperCase() === targetId ||
            String(f.filename || '').toUpperCase().includes(targetId)
        );
        return !!found;
    }

    // Lógica para campos de texto
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
    options = {
        columns: 3,
        marginX: 10,
        marginY: 10,
        spacingX: 5,
        spacingY: 10,
        startAtY: 90 // Y=340px en canvas ÷ 3.78 (MM_TO_PX) ≈ 90mm
    }
): FichaDesignVersion {
    const newDesign: FichaDesignVersion = JSON.parse(JSON.stringify(design));

    const flowUnits: { id: string; type: 'group' | 'placement' | 'shape'; elements: any[]; initialBbox: BoundingBox; isTechnical: boolean }[] = [];
    const processedElementIds = new Set<string>();

    // 1. Identificar todo lo que debe fluir (Grupos, Placements y Shapes) que estén en la zona dinámica

    // Grupos
    newDesign.groups.forEach(g => {
        if (g.y < options.startAtY) return;

        const children = [
            ...newDesign.placements.filter(p => p.groupId === g.id),
            ...newDesign.shapes.filter(s => s.groupId === g.id)
        ] as (FieldPlacement | ShapeElement)[];

        const isTechnical = children.some(c =>
            isFieldPlacement(c) && (
                c.fieldId.startsWith('foto_') ||
                c.fieldId.startsWith('tub_') ||
                c.fieldId.startsWith('sum_') ||
                c.fieldId.startsWith('foto_descarga_')
            )
        );

        if (isTechnical) {
            const hasVisibleData = children.some(c => isFieldPlacement(c) && hasData(c, pozo));
            if (!hasVisibleData) {
                // Si es técnico y no tiene datos, lo ocultamos y no lo añadimos al flujo
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
        if (processedElementIds.has(p.id) || p.y < options.startAtY) return;

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
        if (processedElementIds.has(s.id) || s.y < options.startAtY) return;

        flowUnits.push({
            id: s.id,
            type: 'shape',
            elements: [s],
            initialBbox: { x: s.x, y: s.y, width: s.width, height: s.height },
            isTechnical: false
        });
        processedElementIds.add(s.id);
    });

    // 2. Reorganizar Unidades en un Grid
    let currentX = options.marginX;
    let currentY = options.startAtY;
    let maxRowHeight = 0;
    let colIndex = 0;

    // Ordenar por su posición original para mantener la jerarquía (Arriba -> Abajo, Izquierda -> Derecha)
    flowUnits.sort((a, b) => {
        if (Math.abs(a.initialBbox.y - b.initialBbox.y) > 5) return a.initialBbox.y - b.initialBbox.y;
        return a.initialBbox.x - b.initialBbox.x;
    }).forEach((unit) => {
        const bbox = unit.initialBbox;

        // REGLA ESPECIAL: Si el elemento es muy ancho (> 140mm), forzamos que sea un separador de fila completa
        const isFullWidthHeader = bbox.width > 140;

        if (isFullWidthHeader && colIndex > 0) {
            // Si veníamos de una fila con elementos, saltamos a la siguiente para el header
            currentX = options.marginX;
            currentY += maxRowHeight + options.spacingY;
            maxRowHeight = 0;
            colIndex = 0;
        }

        // Cambio de fila estándar por columnas o ancho
        if (colIndex >= options.columns || (currentX + bbox.width > 205)) {
            currentX = options.marginX;
            currentY += maxRowHeight + options.spacingY;
            maxRowHeight = 0;
            colIndex = 0;
        }

        const offsetX = currentX - bbox.x;
        const offsetY = currentY - bbox.y;

        unit.elements.forEach(el => {
            el.x += offsetX;
            el.y += offsetY;
        });

        if (unit.type === 'group') {
            const g = newDesign.groups.find(group => group.id === unit.id);
            if (g) {
                g.x = currentX;
                g.y = currentY;
            }
        }

        // Si es un header de ancho completo, preparamos la siguiente fila inmediatamente
        if (isFullWidthHeader) {
            maxRowHeight = bbox.height;
            currentX = options.marginX;
            currentY += maxRowHeight + options.spacingY;
            maxRowHeight = 0;
            colIndex = 0;
        } else {
            currentX += bbox.width + options.spacingX;
            maxRowHeight = Math.max(maxRowHeight, bbox.height);
            colIndex++;
        }
    });

    return newDesign;
}
