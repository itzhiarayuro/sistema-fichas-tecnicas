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

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'text';

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
}

export type DesignElement = FieldPlacement | ShapeElement;

export function isFieldPlacement(element: DesignElement): element is FieldPlacement {
    return 'fieldId' in element;
}

export function isShapeElement(element: DesignElement): element is ShapeElement {
    return 'type' in element && ['rectangle', 'circle', 'line', 'text'].includes((element as ShapeElement).type);
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

    // Acciones
    createVersion: (name: string, description?: string) => string;
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
}

// 56 Campos disponibles del sistema
export const AVAILABLE_FIELDS: AvailableField[] = [
    // POZO (33 campos)
    { id: 'pozo_id', label: 'ID Pozo', fieldPath: 'identificacion.idPozo.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_fecha', label: 'Fecha', fieldPath: 'identificacion.fecha.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_coordX', label: 'Coordenada X', fieldPath: 'identificacion.coordenadaX.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_coordY', label: 'Coordenada Y', fieldPath: 'identificacion.coordenadaY.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_direccion', label: 'Dirección', fieldPath: 'ubicacion.direccion.value', category: 'pozo', isRepeatable: false, defaultWidth: 120, defaultHeight: 10 },
    { id: 'pozo_barrio', label: 'Barrio', fieldPath: 'ubicacion.barrio.value', category: 'pozo', isRepeatable: false, defaultWidth: 80, defaultHeight: 10 },
    { id: 'pozo_localidad', label: 'Localidad', fieldPath: 'ubicacion.localidad.value', category: 'pozo', isRepeatable: false, defaultWidth: 80, defaultHeight: 10 },
    { id: 'pozo_upz', label: 'UPZ', fieldPath: 'ubicacion.upz.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_materialTapa', label: 'Material Tapa', fieldPath: 'componentes.materialTapa.value', category: 'pozo', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'pozo_diametroTapa', label: 'Ø Tapa', fieldPath: 'componentes.diametroTapa.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_estadoTapa', label: 'Estado Tapa', fieldPath: 'componentes.estadoTapa.value', category: 'pozo', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'pozo_materialCilindro', label: 'Material Cilindro', fieldPath: 'componentes.materialCilindro.value', category: 'pozo', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'pozo_diametroCilindro', label: 'Ø Cilindro', fieldPath: 'componentes.diametroCilindro.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_estadoCilindro', label: 'Estado Cilindro', fieldPath: 'componentes.estadoCilindro.value', category: 'pozo', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'pozo_profundidadTotal', label: 'Profundidad Total', fieldPath: 'dimensiones.profundidadTotal.value', category: 'pozo', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'pozo_profundidadUtil', label: 'Profundidad Útil', fieldPath: 'dimensiones.profundidadUtil.value', category: 'pozo', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'pozo_nivelAgua', label: 'Nivel Agua', fieldPath: 'dimensiones.nivelAgua.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_materialEscalera', label: 'Material Escalera', fieldPath: 'acceso.materialEscalera.value', category: 'pozo', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'pozo_estadoEscalera', label: 'Estado Escalera', fieldPath: 'acceso.estadoEscalera.value', category: 'pozo', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'pozo_numPeldanos', label: 'Nº Peldaños', fieldPath: 'acceso.numeroPeldanos.value', category: 'pozo', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'pozo_tipoSuelo', label: 'Tipo Suelo', fieldPath: 'entorno.tipoSuelo.value', category: 'pozo', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'pozo_vegetacion', label: 'Vegetación', fieldPath: 'entorno.vegetacion.value', category: 'pozo', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'pozo_proximidadEdificios', label: 'Proximidad Edificios', fieldPath: 'entorno.proximidadEdificios.value', category: 'pozo', isRepeatable: false, defaultWidth: 80, defaultHeight: 10 },
    { id: 'pozo_nivelTrafico', label: 'Nivel Tráfico', fieldPath: 'entorno.nivelTrafico.value', category: 'pozo', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'pozo_olores', label: 'Olores', fieldPath: 'condiciones.olores.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_gases', label: 'Gases', fieldPath: 'condiciones.gases.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_temperatura', label: 'Temperatura', fieldPath: 'condiciones.temperatura.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_humedad', label: 'Humedad', fieldPath: 'condiciones.humedad.value', category: 'pozo', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'pozo_iluminacion', label: 'Iluminación', fieldPath: 'condiciones.iluminacion.value', category: 'pozo', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'pozo_ventilacion', label: 'Ventilación', fieldPath: 'condiciones.ventilacion.value', category: 'pozo', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'pozo_riesgos', label: 'Riesgos', fieldPath: 'seguridad.riesgos.value', category: 'pozo', isRepeatable: false, defaultWidth: 100, defaultHeight: 15 },
    { id: 'pozo_senalizacion', label: 'Señalización', fieldPath: 'seguridad.senalizacion.value', category: 'pozo', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'pozo_observaciones', label: 'Observaciones', fieldPath: 'observaciones.general.value', category: 'pozo', isRepeatable: false, defaultWidth: 180, defaultHeight: 30 },

    // TUBERIAS (9 campos)
    { id: 'tub_entrada_diametro', label: 'Ø Entrada', fieldPath: 'tuberias.entrada.diametro.value', category: 'tuberias', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'tub_entrada_material', label: 'Material Entrada', fieldPath: 'tuberias.entrada.material.value', category: 'tuberias', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'tub_entrada_estado', label: 'Estado Entrada', fieldPath: 'tuberias.entrada.estado.value', category: 'tuberias', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'tub_salida_diametro', label: 'Ø Salida', fieldPath: 'tuberias.salida.diametro.value', category: 'tuberias', isRepeatable: false, defaultWidth: 50, defaultHeight: 10 },
    { id: 'tub_salida_material', label: 'Material Salida', fieldPath: 'tuberias.salida.material.value', category: 'tuberias', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'tub_salida_estado', label: 'Estado Salida', fieldPath: 'tuberias.salida.estado.value', category: 'tuberias', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'tub_conexiones', label: 'Conexiones', fieldPath: 'tuberias.conexiones.value', category: 'tuberias', isRepeatable: false, defaultWidth: 80, defaultHeight: 10 },
    { id: 'tub_sedimentos', label: 'Sedimentos', fieldPath: 'tuberias.sedimentos.value', category: 'tuberias', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'tub_obstrucciones', label: 'Obstrucciones', fieldPath: 'tuberias.obstrucciones.value', category: 'tuberias', isRepeatable: false, defaultWidth: 80, defaultHeight: 10 },

    // SUMIDEROS (8 campos)
    { id: 'sum_tipo', label: 'Tipo Sumidero', fieldPath: 'sumideros.tipo.value', category: 'sumideros', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'sum_material', label: 'Material Sumidero', fieldPath: 'sumideros.material.value', category: 'sumideros', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'sum_estado', label: 'Estado Sumidero', fieldPath: 'sumideros.estado.value', category: 'sumideros', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'sum_rejilla', label: 'Rejilla', fieldPath: 'sumideros.rejilla.value', category: 'sumideros', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'sum_profundidad', label: 'Profundidad Sum.', fieldPath: 'sumideros.profundidad.value', category: 'sumideros', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'sum_limpieza', label: 'Limpieza', fieldPath: 'sumideros.limpieza.value', category: 'sumideros', isRepeatable: false, defaultWidth: 60, defaultHeight: 10 },
    { id: 'sum_conexion', label: 'Conexión', fieldPath: 'sumideros.conexion.value', category: 'sumideros', isRepeatable: false, defaultWidth: 70, defaultHeight: 10 },
    { id: 'sum_observaciones', label: 'Obs. Sumidero', fieldPath: 'sumideros.observaciones.value', category: 'sumideros', isRepeatable: false, defaultWidth: 100, defaultHeight: 15 },

    // FOTOS (6 campos repetibles)
    { id: 'foto_1', label: 'Foto 1', fieldPath: 'fotos[0].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
    { id: 'foto_2', label: 'Foto 2', fieldPath: 'fotos[1].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
    { id: 'foto_3', label: 'Foto 3', fieldPath: 'fotos[2].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
    { id: 'foto_4', label: 'Foto 4', fieldPath: 'fotos[3].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
    { id: 'foto_5', label: 'Foto 5', fieldPath: 'fotos[4].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
    { id: 'foto_6', label: 'Foto 6', fieldPath: 'fotos[5].blobId', category: 'fotos', isRepeatable: true, defaultWidth: 60, defaultHeight: 45 },
];
