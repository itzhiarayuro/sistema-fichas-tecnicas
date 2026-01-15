/**
 * Tipos para el Diseñador Visual de Fichas
 * Sistema completo de diseño con 56 campos mapeados
 */

export type FieldCategory = 'pozo' | 'tuberias' | 'sumideros' | 'fotos' | 'otros';

export interface AvailableField {
    id: string;
    label: string;
    fieldPath: string; // Ruta al dato en el objeto Pozo (ej: "identificacion.idPozo.value")
    category: FieldCategory;
    isRepeatable: boolean; // Para campos como fotos que pueden aparecer múltiples veces
    defaultWidth: number; // en mm
    defaultHeight: number; // en mm
}

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'triangle' | 'text' | 'image';

export interface ShapeElement {
    id: string;
    type: ShapeType;
    x: number; // mm
    y: number; // mm
    width: number; // mm
    height: number; // mm
    zIndex: number;

    // Estilos
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    borderRadius?: number;

    // Para tipo 'text'
    content?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: 'normal' | 'bold';
    color?: string;
    textAlign?: 'left' | 'center' | 'right';

    // Para tipo 'image'
    imageUrl?: string;
    opacity?: number;

    // Estado del elemento
    isVisible?: boolean;
    isLocked?: boolean;
    repeatOnEveryPage?: boolean;
}

export type DesignElement = FieldPlacement | ShapeElement;

export function isFieldPlacement(element: DesignElement): element is FieldPlacement {
    return 'fieldId' in element;
}

export function isShapeElement(element: DesignElement): element is ShapeElement {
    return 'type' in element && ['rectangle', 'circle', 'line', 'triangle', 'text', 'image'].includes((element as ShapeElement).type);
}

export interface FieldPlacement {
    id: string; // ID único de este placement
    fieldId: string; // Referencia al AvailableField
    x: number; // Posición X en mm
    y: number; // Posición Y en mm
    width: number; // Ancho en mm
    height: number; // Alto en mm
    zIndex: number;

    // Estilos personalizables
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: 'normal' | 'bold';
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
    padding?: number;
    textAlign?: 'left' | 'center' | 'right';

    // Configuración de label
    showLabel: boolean;
    customLabel?: string; // Si quiere cambiar el label por defecto

    // Para campos repetibles
    repeatIndex?: number; // Ej: foto 1, foto 2, etc.

    // Estado del elemento
    isVisible?: boolean;
    isLocked?: boolean;
    repeatOnEveryPage?: boolean;
}

export interface FichaDesignVersion {
    id: string;
    name: string;
    description?: string;
    createdAt: number;
    updatedAt: number;
    isDefault: boolean;

    // Configuración de página
    pageSize: 'A4' | 'Letter';
    orientation: 'portrait' | 'landscape';
    unit: 'mm' | 'px';

    // Elementos del diseño (campos + shapes)
    placements: FieldPlacement[];
    shapes: ShapeElement[];

    // Metadata
    version: string;
    author?: string;
}

export interface DesignState {
    versions: FichaDesignVersion[];
    currentVersionId: string | null;

    // History State
    past: Record<string, FichaDesignVersion[]>; // versionId -> history
    future: Record<string, FichaDesignVersion[]>; // versionId -> future

    // Acciones
    createVersion: (name: string, description?: string) => string;
    addVersion: (version: FichaDesignVersion) => void;
    deduplicateVersions: () => void;
    updateVersion: (id: string, updates: Partial<FichaDesignVersion>) => void;
    deleteVersion: (id: string) => void;
    duplicateVersion: (id: string, newName: string) => string;
    setDefaultVersion: (id: string) => void;
    setCurrentVersion: (id: string) => void;

    // Gestión de placements
    addPlacement: (versionId: string, placement: Omit<FieldPlacement, 'id'>) => void;
    updatePlacement: (versionId: string, placementId: string, updates: Partial<FieldPlacement>) => void;
    removePlacement: (versionId: string, placementId: string) => void;

    // Gestión de shapes
    addShape: (versionId: string, shape: Omit<ShapeElement, 'id'>) => void;
    updateShape: (versionId: string, shapeId: string, updates: Partial<ShapeElement>) => void;
    removeShape: (versionId: string, shapeId: string) => void;

    // Getters
    getCurrentVersion: () => FichaDesignVersion | null;
    getVersionById: (id: string) => FichaDesignVersion | undefined;

    // History
    undo: () => void;
    redo: () => void;
}

// 56 Campos disponibles del sistema
export const AVAILABLE_FIELDS: AvailableField[] = [
    // POZO (33 campos)
    { id: 'pozo_id', label: 'ID Pozo', fieldPath: 'identificacion.idPozo.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_fecha', label: 'Fecha', fieldPath: 'identificacion.fecha.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },
    { id: 'pozo_coordX', label: 'Coordenada X', fieldPath: 'identificacion.coordenadaX.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },
    { id: 'pozo_coordY', label: 'Coordenada Y', fieldPath: 'identificacion.coordenadaY.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },
    { id: 'pozo_levanto', label: 'Levantó', fieldPath: 'identificacion.levanto.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_estado', label: 'Estado Gral', fieldPath: 'identificacion.estado.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },

    { id: 'pozo_direccion', label: 'Dirección', fieldPath: 'ubicacion.direccion.value', category: 'pozo', isRepeatable: false, defaultWidth: 80, defaultHeight: 10 },
    { id: 'pozo_barrio', label: 'Barrio', fieldPath: 'ubicacion.barrio.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_localidad', label: 'Localidad', fieldPath: 'ubicacion.localidad.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_upz', label: 'UPZ', fieldPath: 'ubicacion.upz.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_elevacion', label: 'Elevación (m)', fieldPath: 'ubicacion.elevacion.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },
    { id: 'pozo_profundidad', label: 'Profundidad (m)', fieldPath: 'ubicacion.profundidad.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },

    { id: 'pozo_materialTapa', label: 'Mat. Tapa', fieldPath: 'componentes.materialTapa.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_estadoTapa', label: 'Estado Tapa', fieldPath: 'componentes.estadoTapa.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_diametroCilindro', label: 'Ø Cilindro (m)', fieldPath: 'componentes.diametroCilindro.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },
    { id: 'pozo_materialCilindro', label: 'Mat. Cilindro', fieldPath: 'componentes.materialCilindro.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_estadoCilindro', label: 'Estado Cilindro', fieldPath: 'componentes.estadoCilindro.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_numPeldanos', label: 'Nº Peldaños', fieldPath: 'componentes.numeroPeldanos.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },
    { id: 'pozo_materialPeldanos', label: 'Mat. Peldaños', fieldPath: 'componentes.materialPeldanos.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_estadoPeldanos', label: 'Estado Peldaños', fieldPath: 'componentes.estadoPeldanos.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },

    { id: 'pozo_observaciones', label: 'Observaciones', fieldPath: 'observaciones.observaciones.value', category: 'pozo', isRepeatable: false, defaultWidth: 150, defaultHeight: 20 },

    // TUBERIAS (Hasta 8 slots)
    { id: 'tub_1_diametro', label: 'Tub 1 Ø', fieldPath: 'tuberias.tuberias[0].diametro.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_1_material', label: 'Tub 1 Mat', fieldPath: 'tuberias.tuberias[0].material.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },
    { id: 'tub_1_estado', label: 'Tub 1 Est', fieldPath: 'tuberias.tuberias[0].estado.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },

    { id: 'tub_2_diametro', label: 'Tub 2 Ø', fieldPath: 'tuberias.tuberias[1].diametro.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_2_material', label: 'Tub 2 Mat', fieldPath: 'tuberias.tuberias[1].material.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },
    { id: 'tub_2_estado', label: 'Tub 2 Est', fieldPath: 'tuberias.tuberias[1].estado.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },

    { id: 'tub_3_diametro', label: 'Tub 3 Ø', fieldPath: 'tuberias.tuberias[2].diametro.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_3_material', label: 'Tub 3 Mat', fieldPath: 'tuberias.tuberias[2].material.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },

    { id: 'tub_4_diametro', label: 'Tub 4 Ø', fieldPath: 'tuberias.tuberias[3].diametro.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_4_material', label: 'Tub 4 Mat', fieldPath: 'tuberias.tuberias[3].material.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },

    // SUMIDEROS (Hasta 4 slots)
    { id: 'sum_1_tipo', label: 'Sum 1 Tipo', fieldPath: 'sumideros.sumideros[0].tipoSumidero.value', category: 'sumideros', isRepeatable: true, defaultWidth: 50, defaultHeight: 10 },
    { id: 'sum_1_material', label: 'Sum 1 Mat', fieldPath: 'sumideros.sumideros[0].materialTuberia.value', category: 'sumideros', isRepeatable: true, defaultWidth: 50, defaultHeight: 10 },

    { id: 'sum_2_tipo', label: 'Sum 2 Tipo', fieldPath: 'sumideros.sumideros[1].tipoSumidero.value', category: 'sumideros', isRepeatable: true, defaultWidth: 50, defaultHeight: 10 },
    { id: 'sum_2_material', label: 'Sum 2 Mat', fieldPath: 'sumideros.sumideros[1].materialTuberia.value', category: 'sumideros', isRepeatable: true, defaultWidth: 50, defaultHeight: 10 },

    // FOTOS (Hasta 12 slots)
    { id: 'foto_1', label: 'Foto 1', fieldPath: 'fotos.fotos[0].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
    { id: 'foto_2', label: 'Foto 2', fieldPath: 'fotos.fotos[1].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
    { id: 'foto_3', label: 'Foto 3', fieldPath: 'fotos.fotos[2].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
    { id: 'foto_4', label: 'Foto 4', fieldPath: 'fotos.fotos[3].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
    { id: 'foto_5', label: 'Foto 5', fieldPath: 'fotos.fotos[4].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
    { id: 'foto_6', label: 'Foto 6', fieldPath: 'fotos.fotos[5].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
    { id: 'foto_7', label: 'Foto 7', fieldPath: 'fotos.fotos[6].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
    { id: 'foto_8', label: 'Foto 8', fieldPath: 'fotos.fotos[7].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
    { id: 'foto_9', label: 'Foto 9', fieldPath: 'fotos.fotos[8].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
    { id: 'foto_10', label: 'Foto 10', fieldPath: 'fotos.fotos[9].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
    { id: 'foto_11', label: 'Foto 11', fieldPath: 'fotos.fotos[10].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
    { id: 'foto_12', label: 'Foto 12', fieldPath: 'fotos.fotos[11].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
];
