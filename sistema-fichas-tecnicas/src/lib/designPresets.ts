
import { FichaDesignVersion, FieldPlacement, ShapeElement } from '@/types/fichaDesign';

const generateId = () => Math.random().toString(36).substring(2, 9);

// Helper para crear placements rápidamente
const createField = (
    fieldId: string,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: string = '#000000',
    bgColor: string = 'transparent',
    fontSize: number = 10
): FieldPlacement => ({
    id: generateId(),
    fieldId,
    x,
    y,
    width,
    height,
    zIndex: 10,
    showLabel: true,
    customLabel: label,
    color,
    backgroundColor: bgColor,
    fontSize,
    fontFamily: 'Inter',
    textAlign: 'left',
    fontWeight: 'normal'
});

const createShape = (
    type: 'rectangle' | 'line' | 'text' | 'circle',
    x: number,
    y: number,
    width: number,
    height: number,
    styles: Partial<ShapeElement>
): ShapeElement => ({
    id: generateId(),
    type,
    x,
    y,
    width,
    height,
    zIndex: 5,
    ...styles
} as ShapeElement);

export const createStandardDesign = (): FichaDesignVersion => {
    const now = Date.now();
    const primaryColor = '#1F4E79';

    return {
        id: 'preset_standard',
        name: 'Diseño Estándar',
        description: 'Plantilla oficial idéntica al formato estándar',
        isDefault: true,
        pageSize: 'A4',
        orientation: 'portrait',
        unit: 'mm',
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
        shapes: [
            // Header Background
            createShape('rectangle', 10, 10, 190, 25, { fillColor: primaryColor, strokeColor: 'transparent', borderRadius: 4 }),
            // Title
            createShape('text', 20, 15, 100, 10, { content: 'FICHA TÉCNICA DE POZO', fontSize: 16, color: '#FFFFFF', fontWeight: 'bold' }),
            // Section: Identificación
            createShape('rectangle', 10, 40, 190, 8, { fillColor: '#E5E7EB', strokeColor: 'transparent' }),
            createShape('text', 12, 41, 50, 6, { content: '1. IDENTIFICACIÓN', fontSize: 11, fontWeight: 'bold' }),
            // Section: Ubicación
            createShape('rectangle', 10, 70, 190, 8, { fillColor: '#E5E7EB', strokeColor: 'transparent' }),
            createShape('text', 12, 71, 50, 6, { content: '2. UBICACIÓN', fontSize: 11, fontWeight: 'bold' }),
        ],
        placements: [
            // Header Image Placeholder
            // Identificación
            createField('pozo_id', 15, 52, 40, 12, 'Código Pozo', '#000000', '#F9FAFB', 12),
            createField('pozo_coordX', 65, 52, 40, 12, 'Este (X)', '#000000', '#F9FAFB'),
            createField('pozo_coordY', 115, 52, 40, 12, 'Norte (Y)', '#000000', '#F9FAFB'),
            createField('pozo_fecha', 165, 52, 30, 12, 'Fecha', '#000000', '#F9FAFB'),

            // Ubicación
            createField('pozo_direccion', 15, 82, 90, 12, 'Dirección', '#000000', '#F9FAFB'),
            createField('pozo_barrio', 115, 82, 40, 12, 'Barrio', '#000000', '#F9FAFB'),
            createField('pozo_localidad', 165, 82, 30, 12, 'Localidad', '#000000', '#F9FAFB'),
        ]
    };
};

export const createCompactDesign = (): FichaDesignVersion => {
    const now = Date.now();
    const primaryColor = '#374151'; // Dark Grey for compact

    return {
        id: 'preset_compact',
        name: 'Diseño Compacto',
        description: 'Versión condensada para ahorrar espacio',
        isDefault: false,
        pageSize: 'A4',
        orientation: 'portrait',
        unit: 'mm',
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
        shapes: [
            createShape('rectangle', 10, 10, 190, 15, { fillColor: primaryColor, strokeColor: 'transparent' }),
            createShape('text', 15, 12, 100, 8, { content: 'FICHA TÉCNICA (COMPACTA)', fontSize: 12, color: '#FFFFFF', fontWeight: 'bold' }),
        ],
        placements: [
            createField('pozo_id', 10, 30, 30, 10, 'ID', '#000000', '#F3F4F6', 9),
            createField('pozo_coordX', 45, 30, 30, 10, 'X', '#000000', '#F3F4F6', 9),
            createField('pozo_coordY', 80, 30, 30, 10, 'Y', '#000000', '#F3F4F6', 9),
            createField('pozo_fecha', 115, 30, 25, 10, 'Fecha', '#000000', '#F3F4F6', 9),
            createField('pozo_direccion', 10, 45, 100, 10, 'Dir', '#000000', '#F3F4F6', 9),
        ]
    };
};

export const createEnvironmentalDesign = (): FichaDesignVersion => {
    const now = Date.now();
    const primaryColor = '#2E7D32'; // Green
    const secondaryColor = '#E8F5E9'; // Light Green

    return {
        id: 'preset_environmental',
        name: 'Diseño Ambiental',
        description: 'Estilo ecológico/ambiental',
        isDefault: false,
        pageSize: 'A4',
        orientation: 'portrait',
        unit: 'mm',
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
        shapes: [
            createShape('rectangle', 0, 0, 210, 297, { fillColor: '#F1F8E9', strokeColor: 'transparent', zIndex: 0 }), // Background tint
            createShape('rectangle', 10, 10, 190, 25, { fillColor: primaryColor, strokeColor: 'transparent', borderRadius: 8, zIndex: 1 }),
            createShape('text', 20, 15, 100, 10, { content: 'INVENTARIO AMBIENTAL', fontSize: 16, color: '#FFFFFF', fontWeight: 'bold', zIndex: 2 }),
        ],
        placements: [
            createField('pozo_id', 15, 45, 40, 12, 'ID Pozo', '#1B5E20', '#FFFFFF', 11),
            createField('pozo_vegetacion', 65, 45, 80, 12, 'Vegetación Circundante', '#1B5E20', '#FFFFFF'),
            createField('pozo_tipoSuelo', 155, 45, 45, 12, 'Tipo Suelo', '#1B5E20', '#FFFFFF'),
        ]
    };
};

export const getPresetDesigns = () => [
    createStandardDesign(),
    createCompactDesign(),
    createEnvironmentalDesign()
];
