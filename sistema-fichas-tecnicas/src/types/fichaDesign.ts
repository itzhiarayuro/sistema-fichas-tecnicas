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

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'triangle' | 'text' | 'image' | 'table' | 'group';

export interface GroupElement {
    id: string;
    type: 'group';
    name?: string; // Nombre opcional del grupo
    x: number; // mm - posición del grupo
    y: number; // mm
    width: number; // mm - calculado del bounding box
    height: number; // mm
    zIndex: number;
    pageNumber?: number; // 1-5

    // IDs de los elementos que contiene
    childIds: string[]; // IDs de FieldPlacement o ShapeElement

    // Estado del grupo
    isVisible?: boolean;
    isLocked?: boolean;
    isCollapsed?: boolean; // Si está colapsado en el panel de capas
    repeatOnEveryPage?: boolean;
}

export interface ShapeElement {
    id: string;
    type: ShapeType;
    x: number; // mm
    y: number; // mm
    width: number; // mm
    height: number; // mm
    zIndex: number;
    pageNumber?: number; // 1-5

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
    groupId?: string; // ID del grupo al que pertenece (si está agrupado)
}

export type DesignElement = FieldPlacement | ShapeElement | GroupElement;

export function isFieldPlacement(element: DesignElement): element is FieldPlacement {
    return 'fieldId' in element;
}

export function isShapeElement(element: DesignElement): element is ShapeElement {
    return 'type' in element && ['rectangle', 'circle', 'line', 'triangle', 'text', 'image', 'table'].includes((element as ShapeElement).type);
}

export function isGroupElement(element: DesignElement): element is GroupElement {
    return 'type' in element && (element as GroupElement).type === 'group';
}

export interface FieldPlacement {
    id: string; // ID único de este placement
    fieldId: string; // Referencia al AvailableField
    x: number; // Posición X en mm
    y: number; // Posición Y en mm
    width: number; // Ancho en mm
    height: number; // Alto en mm
    zIndex: number;
    pageNumber?: number; // 1-5

    // Estilos personalizables
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: 'normal' | 'bold';
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
    padding?: number;
    textAlign?: 'left' | 'center' | 'right';
    borderWidth?: number;
    borderColor?: string;

    // Configuración de label
    showLabel: boolean;
    customLabel?: string; // Si quiere cambiar el label por defecto
    labelFontSize?: number;
    labelFontWeight?: 'normal' | 'bold';
    labelColor?: string;
    labelBackgroundColor?: string;
    labelPadding?: number;
    labelWidth?: number; // Ancho fijo opcional para el label en mm
    labelAlign?: 'left' | 'center' | 'right';

    // Para campos repetibles
    repeatIndex?: number; // Ej: foto 1, foto 2, etc.

    // Estado del elemento
    isVisible?: boolean;
    isLocked?: boolean;
    repeatOnEveryPage?: boolean;
    groupId?: string; // ID del grupo al que pertenece (si está agrupado)
}

export interface FichaDesignVersion {
    id: string;
    name: string;
    description?: string;
    createdAt: number;
    updatedAt: number;
    isDefault: boolean;
    numPages: number; // 1-5

    // Configuración de página
    pageSize: 'A4' | 'Letter';
    orientation: 'portrait' | 'landscape';
    unit: 'mm' | 'px';

    // Elementos del diseño (campos + shapes + grupos)
    placements: FieldPlacement[];
    shapes: ShapeElement[];
    groups: GroupElement[];

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

    // Selection State (Global para evitar desincronización)
    selectedPlacementId: string | null;
    selectedShapeId: string | null;

    // Acciones
    createVersion: (name: string, description?: string) => string;
    addVersion: (version: FichaDesignVersion) => void;
    deduplicateVersions: () => void;
    updateVersion: (id: string, updates: Partial<FichaDesignVersion>) => void;
    deleteVersion: (id: string) => void;
    duplicateVersion: (id: string, newName: string) => string;
    setDefaultVersion: (id: string) => void;
    setCurrentVersion: (id: string) => void;

    // Persistencia externa
    importVersion: (versionJson: string) => boolean;
    exportVersion: (id: string) => string | null;

    // Gestión de placements
    addPlacement: (versionId: string, placement: Omit<FieldPlacement, 'id'>) => string;
    updatePlacement: (versionId: string, placementId: string, updates: Partial<FieldPlacement>) => void;
    removePlacement: (versionId: string, placementId: string) => void;

    // Gestión de shapes
    addShape: (versionId: string, shape: Omit<ShapeElement, 'id'>) => string;
    updateShape: (versionId: string, shapeId: string, updates: Partial<ShapeElement>) => void;
    removeShape: (versionId: string, shapeId: string) => void;

    // Gestión de grupos
    createGroup: (versionId: string, elementIds: string[], name?: string) => string;
    updateGroup: (versionId: string, groupId: string, updates: Partial<GroupElement>) => void;
    removeGroup: (versionId: string, groupId: string) => void;
    ungroupElements: (versionId: string, groupId: string) => void;
    addToGroup: (versionId: string, groupId: string, elementIds: string[]) => void;
    removeFromGroup: (versionId: string, groupId: string, elementIds: string[]) => void;

    // Getters
    getCurrentVersion: () => FichaDesignVersion | null;
    getVersionById: (id: string) => FichaDesignVersion | undefined;

    // History
    undo: () => void;
    redo: () => void;

    // Selection Actions
    setSelectedPlacementId: (id: string | null) => void;
    setSelectedShapeId: (id: string | null) => void;
}

// 70 Campos disponibles del sistema
export const AVAILABLE_FIELDS: AvailableField[] = [
    // POZO (47 campos)
    { id: 'pozo_id', label: 'ID Pozo', fieldPath: 'identificacion.idPozo.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_fecha', label: 'Fecha', fieldPath: 'identificacion.fecha.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },
    { id: 'pozo_coordX', label: 'Coordenada X', fieldPath: 'identificacion.coordenadaX.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },
    { id: 'pozo_coordY', label: 'Coordenada Y', fieldPath: 'identificacion.coordenadaY.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },
    { id: 'pozo_latitud', label: 'Latitud', fieldPath: 'identificacion.latitud.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },
    { id: 'pozo_longitud', label: 'Longitud', fieldPath: 'identificacion.longitud.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },
    { id: 'pozo_enlace', label: 'Enlace', fieldPath: 'identificacion.enlace.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_levanto', label: 'Levantó', fieldPath: 'identificacion.levanto.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_estado', label: 'Estado Gral', fieldPath: 'identificacion.estado.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },

    { id: 'pozo_direccion', label: 'Dirección', fieldPath: 'ubicacion.direccion.value', category: 'pozo', isRepeatable: false, defaultWidth: 80, defaultHeight: 10 },
    { id: 'pozo_barrio', label: 'Barrio', fieldPath: 'ubicacion.barrio.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_localidad', label: 'Localidad', fieldPath: 'ubicacion.localidad.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_upz', label: 'UPZ', fieldPath: 'ubicacion.upz.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_profundidad', label: 'Profundidad (m)', fieldPath: 'ubicacion.profundidad.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },

    { id: 'pozo_sistema', label: 'Sistema', fieldPath: 'componentes.sistema.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_tipoCamara', label: 'Tipo de Cámara', fieldPath: 'componentes.tipoCamara.value', category: 'pozo', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'pozo_estructuraPavimento', label: 'Rasante', fieldPath: 'componentes.estructuraPavimento.value', category: 'pozo', isRepeatable: false, defaultWidth: 80, defaultHeight: 10 },
    { id: 'pozo_materialRasante', label: 'Material Rasante', fieldPath: 'componentes.materialRasante.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_estadoRasante', label: 'Estado Rasante', fieldPath: 'componentes.estadoRasante.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_existeTapa', label: 'Existe Tapa', fieldPath: 'componentes.existeTapa.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },
    { id: 'pozo_materialTapa', label: 'Material Tapa', fieldPath: 'componentes.materialTapa.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_estadoTapa', label: 'Estado Tapa', fieldPath: 'componentes.estadoTapa.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_existeCono', label: 'Existe Cono', fieldPath: 'componentes.existeCono.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },
    { id: 'pozo_tipoCono', label: 'Tipo Cono', fieldPath: 'componentes.tipoCono.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_materialCono', label: 'Material Cono', fieldPath: 'componentes.materialCono.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_estadoCono', label: 'Estado Cono', fieldPath: 'componentes.estadoCono.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_existeCilindro', label: 'Existe Cilindro', fieldPath: 'componentes.existeCilindro.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_diametroCilindro', label: 'Ø Cilindro (m)', fieldPath: 'componentes.diametroCilindro.value', category: 'pozo', isRepeatable: false, defaultWidth: 40, defaultHeight: 10 },
    { id: 'pozo_materialCilindro', label: 'Material Cilindro', fieldPath: 'componentes.materialCilindro.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_estadoCilindro', label: 'Estado Cilindro', fieldPath: 'componentes.estadoCilindro.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_existeCanuela', label: 'Existe Cañuela', fieldPath: 'componentes.existeCanuela.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_materialCanuela', label: 'Material Cañuela', fieldPath: 'componentes.materialCanuela.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_estadoCanuela', label: 'Estado Cañuela', fieldPath: 'componentes.estadoCanuela.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_existePeldanos', label: 'Existe Peldaños', fieldPath: 'componentes.existePeldanos.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_materialPeldanos', label: 'Material Peldaños', fieldPath: 'componentes.materialPeldanos.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_numPeldanos', label: 'Número Peldaños', fieldPath: 'componentes.numeroPeldanos.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_estadoPeldanos', label: 'Estado Peldaños', fieldPath: 'componentes.estadoPeldanos.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },

    { id: 'pozo_observaciones', label: 'Observaciones', fieldPath: 'observaciones.observaciones.value', category: 'pozo', isRepeatable: false, defaultWidth: 150, defaultHeight: 20 },

    // TUBERIAS (Hasta 8 slots)
    { id: 'tub_1_diametro', label: 'Tub 1 Ø', fieldPath: 'tuberias.tuberias[0].diametro.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_1_material', label: 'Tub 1 Mat', fieldPath: 'tuberias.tuberias[0].material.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },
    { id: 'tub_1_estado', label: 'Tub 1 Est', fieldPath: 'tuberias.tuberias[0].estado.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },
    { id: 'tub_1_orden', label: 'Tub 1 Ord', fieldPath: 'tuberias.tuberias[0].orden.value', category: 'tuberias', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'tub_1_batea', label: 'Tub 1 Bat', fieldPath: 'tuberias.tuberias[0].batea.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_1_id', label: 'Tub 1 ID', fieldPath: 'tuberias.tuberias[0].idTuberia.value', category: 'tuberias', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },

    { id: 'tub_2_diametro', label: 'Tub 2 Ø', fieldPath: 'tuberias.tuberias[1].diametro.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_2_material', label: 'Tub 2 Mat', fieldPath: 'tuberias.tuberias[1].material.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },
    { id: 'tub_2_estado', label: 'Tub 2 Est', fieldPath: 'tuberias.tuberias[1].estado.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },
    { id: 'tub_2_orden', label: 'Tub 2 Ord', fieldPath: 'tuberias.tuberias[1].orden.value', category: 'tuberias', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'tub_2_batea', label: 'Tub 2 Bat', fieldPath: 'tuberias.tuberias[1].batea.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_2_id', label: 'Tub 2 ID', fieldPath: 'tuberias.tuberias[1].idTuberia.value', category: 'tuberias', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },

    { id: 'tub_3_diametro', label: 'Tub 3 Ø', fieldPath: 'tuberias.tuberias[2].diametro.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_3_material', label: 'Tub 3 Mat', fieldPath: 'tuberias.tuberias[2].material.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },
    { id: 'tub_3_orden', label: 'Tub 3 Ord', fieldPath: 'tuberias.tuberias[2].orden.value', category: 'tuberias', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'tub_3_batea', label: 'Tub 3 Bat', fieldPath: 'tuberias.tuberias[2].batea.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_3_id', label: 'Tub 3 ID', fieldPath: 'tuberias.tuberias[2].idTuberia.value', category: 'tuberias', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },

    { id: 'tub_4_diametro', label: 'Tub 4 Ø', fieldPath: 'tuberias.tuberias[3].diametro.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_4_material', label: 'Tub 4 Mat', fieldPath: 'tuberias.tuberias[3].material.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },
    { id: 'tub_4_orden', label: 'Tub 4 Ord', fieldPath: 'tuberias.tuberias[3].orden.value', category: 'tuberias', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'tub_4_batea', label: 'Tub 4 Bat', fieldPath: 'tuberias.tuberias[3].batea.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_4_id', label: 'Tub 4 ID', fieldPath: 'tuberias.tuberias[3].idTuberia.value', category: 'tuberias', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },

    { id: 'tub_5_diametro', label: 'Tub 5 Ø', fieldPath: 'tuberias.tuberias[4].diametro.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_5_material', label: 'Tub 5 Mat', fieldPath: 'tuberias.tuberias[4].material.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },
    { id: 'tub_5_estado', label: 'Tub 5 Est', fieldPath: 'tuberias.tuberias[4].estado.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },
    { id: 'tub_5_orden', label: 'Tub 5 Ord', fieldPath: 'tuberias.tuberias[4].orden.value', category: 'tuberias', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'tub_5_batea', label: 'Tub 5 Bat', fieldPath: 'tuberias.tuberias[4].batea.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_5_id', label: 'Tub 5 ID', fieldPath: 'tuberias.tuberias[4].idTuberia.value', category: 'tuberias', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },

    { id: 'tub_6_diametro', label: 'Tub 6 Ø', fieldPath: 'tuberias.tuberias[5].diametro.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_6_material', label: 'Tub 6 Mat', fieldPath: 'tuberias.tuberias[5].material.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },
    { id: 'tub_6_estado', label: 'Tub 6 Est', fieldPath: 'tuberias.tuberias[5].estado.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },
    { id: 'tub_6_orden', label: 'Tub 6 Ord', fieldPath: 'tuberias.tuberias[5].orden.value', category: 'tuberias', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'tub_6_batea', label: 'Tub 6 Bat', fieldPath: 'tuberias.tuberias[5].batea.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_6_id', label: 'Tub 6 ID', fieldPath: 'tuberias.tuberias[5].idTuberia.value', category: 'tuberias', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },

    { id: 'tub_7_diametro', label: 'Tub 7 Ø', fieldPath: 'tuberias.tuberias[6].diametro.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_7_material', label: 'Tub 7 Mat', fieldPath: 'tuberias.tuberias[6].material.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },
    { id: 'tub_7_estado', label: 'Tub 7 Est', fieldPath: 'tuberias.tuberias[6].estado.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },
    { id: 'tub_7_orden', label: 'Tub 7 Ord', fieldPath: 'tuberias.tuberias[6].orden.value', category: 'tuberias', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'tub_7_batea', label: 'Tub 7 Bat', fieldPath: 'tuberias.tuberias[6].batea.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_7_id', label: 'Tub 7 ID', fieldPath: 'tuberias.tuberias[6].idTuberia.value', category: 'tuberias', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },

    { id: 'tub_8_diametro', label: 'Tub 8 Ø', fieldPath: 'tuberias.tuberias[7].diametro.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_8_material', label: 'Tub 8 Mat', fieldPath: 'tuberias.tuberias[7].material.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },
    { id: 'tub_8_estado', label: 'Tub 8 Est', fieldPath: 'tuberias.tuberias[7].estado.value', category: 'tuberias', isRepeatable: true, defaultWidth: 45, defaultHeight: 10 },
    { id: 'tub_8_orden', label: 'Tub 8 Ord', fieldPath: 'tuberias.tuberias[7].orden.value', category: 'tuberias', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'tub_8_batea', label: 'Tub 8 Bat', fieldPath: 'tuberias.tuberias[7].batea.value', category: 'tuberias', isRepeatable: true, defaultWidth: 35, defaultHeight: 10 },
    { id: 'tub_8_id', label: 'Tub 8 ID', fieldPath: 'tuberias.tuberias[7].idTuberia.value', category: 'tuberias', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },

    // SUMIDEROS (Hasta 4 slots)
    { id: 'sum_1_tipo', label: 'Sum 1 Tipo', fieldPath: 'sumideros.sumideros[0].tipoSumidero.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },
    { id: 'sum_1_material', label: 'Sum 1 Mat', fieldPath: 'sumideros.sumideros[0].materialTuberia.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },
    { id: 'sum_1_esquema', label: 'Sum 1 Esq', fieldPath: 'sumideros.sumideros[0].numeroEsquema.value', category: 'sumideros', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'sum_1_diametro', label: 'Sum 1 Ø', fieldPath: 'sumideros.sumideros[0].diametro.value', category: 'sumideros', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'sum_1_hSalida', label: 'Sum 1 H Sal', fieldPath: 'sumideros.sumideros[0].alturaSalida.value', category: 'sumideros', isRepeatable: true, defaultWidth: 30, defaultHeight: 10 },
    { id: 'sum_1_hLlegada', label: 'Sum 1 H Lleg', fieldPath: 'sumideros.sumideros[0].alturaLlegada.value', category: 'sumideros', isRepeatable: true, defaultWidth: 30, defaultHeight: 10 },
    { id: 'sum_1_id', label: 'Sum 1 ID', fieldPath: 'sumideros.sumideros[0].idSumidero.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },

    { id: 'sum_2_tipo', label: 'Sum 2 Tipo', fieldPath: 'sumideros.sumideros[1].tipoSumidero.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },
    { id: 'sum_2_material', label: 'Sum 2 Mat', fieldPath: 'sumideros.sumideros[1].materialTuberia.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },
    { id: 'sum_2_esquema', label: 'Sum 2 Esq', fieldPath: 'sumideros.sumideros[1].numeroEsquema.value', category: 'sumideros', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'sum_2_diametro', label: 'Sum 2 Ø', fieldPath: 'sumideros.sumideros[1].diametro.value', category: 'sumideros', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'sum_2_hSalida', label: 'Sum 2 H Sal', fieldPath: 'sumideros.sumideros[1].alturaSalida.value', category: 'sumideros', isRepeatable: true, defaultWidth: 30, defaultHeight: 10 },
    { id: 'sum_2_hLlegada', label: 'Sum 2 H Lleg', fieldPath: 'sumideros.sumideros[1].alturaLlegada.value', category: 'sumideros', isRepeatable: true, defaultWidth: 30, defaultHeight: 10 },
    { id: 'sum_2_id', label: 'Sum 2 ID', fieldPath: 'sumideros.sumideros[1].idSumidero.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },

    { id: 'sum_3_tipo', label: 'Sum 3 Tipo', fieldPath: 'sumideros.sumideros[2].tipoSumidero.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },
    { id: 'sum_3_material', label: 'Sum 3 Mat', fieldPath: 'sumideros.sumideros[2].materialTuberia.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },
    { id: 'sum_3_esquema', label: 'Sum 3 Esq', fieldPath: 'sumideros.sumideros[2].numeroEsquema.value', category: 'sumideros', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'sum_3_diametro', label: 'Sum 3 Ø', fieldPath: 'sumideros.sumideros[2].diametro.value', category: 'sumideros', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'sum_3_hSalida', label: 'Sum 3 H Sal', fieldPath: 'sumideros.sumideros[2].alturaSalida.value', category: 'sumideros', isRepeatable: true, defaultWidth: 30, defaultHeight: 10 },
    { id: 'sum_3_hLlegada', label: 'Sum 3 H Lleg', fieldPath: 'sumideros.sumideros[2].alturaLlegada.value', category: 'sumideros', isRepeatable: true, defaultWidth: 30, defaultHeight: 10 },

    { id: 'sum_4_tipo', label: 'Sum 4 Tipo', fieldPath: 'sumideros.sumideros[3].tipoSumidero.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },
    { id: 'sum_4_material', label: 'Sum 4 Mat', fieldPath: 'sumideros.sumideros[3].materialTuberia.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },
    { id: 'sum_4_esquema', label: 'Sum 4 Esq', fieldPath: 'sumideros.sumideros[3].numeroEsquema.value', category: 'sumideros', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'sum_4_diametro', label: 'Sum 4 Ø', fieldPath: 'sumideros.sumideros[3].diametro.value', category: 'sumideros', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'sum_4_hSalida', label: 'Sum 4 H Sal', fieldPath: 'sumideros.sumideros[3].alturaSalida.value', category: 'sumideros', isRepeatable: true, defaultWidth: 30, defaultHeight: 10 },
    { id: 'sum_4_hLlegada', label: 'Sum 4 H Lleg', fieldPath: 'sumideros.sumideros[3].alturaLlegada.value', category: 'sumideros', isRepeatable: true, defaultWidth: 30, defaultHeight: 10 },

    { id: 'sum_5_tipo', label: 'Sum 5 Tipo', fieldPath: 'sumideros.sumideros[4].tipoSumidero.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },
    { id: 'sum_5_material', label: 'Sum 5 Mat', fieldPath: 'sumideros.sumideros[4].materialTuberia.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },
    { id: 'sum_5_esquema', label: 'Sum 5 Esq', fieldPath: 'sumideros.sumideros[4].numeroEsquema.value', category: 'sumideros', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'sum_5_diametro', label: 'Sum 5 Ø', fieldPath: 'sumideros.sumideros[4].diametro.value', category: 'sumideros', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'sum_5_hSalida', label: 'Sum 5 H Sal', fieldPath: 'sumideros.sumideros[4].alturaSalida.value', category: 'sumideros', isRepeatable: true, defaultWidth: 30, defaultHeight: 10 },
    { id: 'sum_5_hLlegada', label: 'Sum 5 H Lleg', fieldPath: 'sumideros.sumideros[4].alturaLlegada.value', category: 'sumideros', isRepeatable: true, defaultWidth: 30, defaultHeight: 10 },

    { id: 'sum_6_tipo', label: 'Sum 6 Tipo', fieldPath: 'sumideros.sumideros[5].tipoSumidero.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },
    { id: 'sum_6_material', label: 'Sum 6 Mat', fieldPath: 'sumideros.sumideros[5].materialTuberia.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },
    { id: 'sum_6_esquema', label: 'Sum 6 Esq', fieldPath: 'sumideros.sumideros[5].numeroEsquema.value', category: 'sumideros', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'sum_6_diametro', label: 'Sum 6 Ø', fieldPath: 'sumideros.sumideros[5].diametro.value', category: 'sumideros', isRepeatable: true, defaultWidth: 25, defaultHeight: 10 },
    { id: 'sum_6_hSalida', label: 'Sum 6 H Sal', fieldPath: 'sumideros.sumideros[5].alturaSalida.value', category: 'sumideros', isRepeatable: true, defaultWidth: 30, defaultHeight: 10 },
    { id: 'sum_6_hLlegada', label: 'Sum 6 H Lleg', fieldPath: 'sumideros.sumideros[5].alturaLlegada.value', category: 'sumideros', isRepeatable: true, defaultWidth: 30, defaultHeight: 10 },
    { id: 'sum_3_id', label: 'Sum 3 ID', fieldPath: 'sumideros.sumideros[2].idSumidero.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },
    { id: 'sum_4_id', label: 'Sum 4 ID', fieldPath: 'sumideros.sumideros[3].idSumidero.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },
    { id: 'sum_5_id', label: 'Sum 5 ID', fieldPath: 'sumideros.sumideros[4].idSumidero.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },
    { id: 'sum_6_id', label: 'Sum 6 ID', fieldPath: 'sumideros.sumideros[5].idSumidero.value', category: 'sumideros', isRepeatable: true, defaultWidth: 40, defaultHeight: 10 },

    // FOTOS ESPECÍFICAS (Por Nomenclatura)
    { id: 'foto_panoramica', label: 'Foto Panorámica (P)', fieldPath: 'fotos.fotos[P]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_tapa', label: 'Foto Tapa (T)', fieldPath: 'fotos.fotos[T]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_interior', label: 'Foto Interna (I)', fieldPath: 'fotos.fotos[I]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_acceso', label: 'Foto Acceso (A)', fieldPath: 'fotos.fotos[A]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_fondo', label: 'Foto Fondo (F)', fieldPath: 'fotos.fotos[F]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_medicion', label: 'Foto Medición (M)', fieldPath: 'fotos.fotos[M]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_esquema', label: 'Esquema Localización (L)', fieldPath: 'fotos.fotos[L]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },

    // FOTOS DE COMPONENTES (Entradas, Salidas, Sumideros, Descargas 1-6)
    { id: 'foto_entrada_1', label: 'Foto Entrada 1', fieldPath: 'fotos.fotos[E1]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_entrada_2', label: 'Foto Entrada 2', fieldPath: 'fotos.fotos[E2]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_entrada_3', label: 'Foto Entrada 3', fieldPath: 'fotos.fotos[E3]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_entrada_4', label: 'Foto Entrada 4', fieldPath: 'fotos.fotos[E4]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_entrada_5', label: 'Foto Entrada 5', fieldPath: 'fotos.fotos[E5]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_entrada_6', label: 'Foto Entrada 6', fieldPath: 'fotos.fotos[E6]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_entrada_7', label: 'Foto Entrada 7', fieldPath: 'fotos.fotos[E7]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },

    { id: 'foto_salida_1', label: 'Foto Salida 1', fieldPath: 'fotos.fotos[S1]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_salida_2', label: 'Foto Salida 2', fieldPath: 'fotos.fotos[S2]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_salida_3', label: 'Foto Salida 3', fieldPath: 'fotos.fotos[S3]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_salida_4', label: 'Foto Salida 4', fieldPath: 'fotos.fotos[S4]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_salida_5', label: 'Foto Salida 5', fieldPath: 'fotos.fotos[S5]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_salida_6', label: 'Foto Salida 6', fieldPath: 'fotos.fotos[S6]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_salida_7', label: 'Foto Salida 7', fieldPath: 'fotos.fotos[S7]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },

    { id: 'foto_sumidero_1', label: 'Foto Sumidero 1', fieldPath: 'fotos.fotos[SUM1]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_sumidero_2', label: 'Foto Sumidero 2', fieldPath: 'fotos.fotos[SUM2]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_sumidero_3', label: 'Foto Sumidero 3', fieldPath: 'fotos.fotos[SUM3]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_sumidero_4', label: 'Foto Sumidero 4', fieldPath: 'fotos.fotos[SUM4]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_sumidero_5', label: 'Foto Sumidero 5', fieldPath: 'fotos.fotos[SUM5]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_sumidero_6', label: 'Foto Sumidero 6', fieldPath: 'fotos.fotos[SUM6]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_sumidero_7', label: 'Foto Sumidero 7', fieldPath: 'fotos.fotos[SUM7]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },

    { id: 'foto_descarga_1', label: 'Foto Descarga 1', fieldPath: 'fotos.fotos[D1]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_descarga_2', label: 'Foto Descarga 2', fieldPath: 'fotos.fotos[D2]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_descarga_3', label: 'Foto Descarga 3', fieldPath: 'fotos.fotos[D3]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_descarga_4', label: 'Foto Descarga 4', fieldPath: 'fotos.fotos[D4]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_descarga_5', label: 'Foto Descarga 5', fieldPath: 'fotos.fotos[D5]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_descarga_6', label: 'Foto Descarga 6', fieldPath: 'fotos.fotos[D6]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },
    { id: 'foto_descarga_7', label: 'Foto Descarga 7', fieldPath: 'fotos.fotos[D7]', category: 'fotos', isRepeatable: false, defaultWidth: 80, defaultHeight: 60 },

    // FOTOS GENÉRICAS (Hasta 12 slots)
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

    // WIDGETS DINÁMICOS
    { id: 'widget_tuberias', label: 'Widget: Tabla Tuberías', fieldPath: 'tuberias.tuberias', category: 'otros', isRepeatable: false, defaultWidth: 190, defaultHeight: 40 },
];
