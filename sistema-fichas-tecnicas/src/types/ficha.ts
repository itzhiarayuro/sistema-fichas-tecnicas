/**
 * Tipos para el estado y estructura de Fichas Técnicas
 * Requirements: 5.1-5.5, 16.1
 * 
 * Este módulo define la estructura de datos para las fichas técnicas,
 * incluyendo soporte para trazabilidad de datos (FieldValue con source)
 * y aislamiento completo entre fichas.
 */

export type SectionType =
  | 'identificacion'
  | 'estructura'
  | 'tuberias'
  | 'sumideros'
  | 'fotos'
  | 'observaciones';

/**
 * Fuente de origen de un dato para trazabilidad
 * - excel: Dato importado del archivo Excel
 * - manual: Dato editado manualmente por el usuario
 * - default: Valor por defecto del sistema
 */
export type FieldSource = 'excel' | 'manual' | 'default';

/**
 * Valor de campo con trazabilidad completa
 * Permite conocer el origen de cada dato mostrado en la ficha
 * Requirements: 5.1-5.5
 */
export interface FieldValue {
  /** Valor actual del campo */
  value: string;
  /** Fuente de origen del dato */
  source: FieldSource;
  /** Valor original antes de modificaciones */
  originalValue?: string;
  /** Timestamp de la última modificación */
  modifiedAt?: number;
}

export interface FichaSection {
  id: string;
  type: SectionType;
  order: number;
  visible: boolean;
  locked: boolean;
  content: Record<string, FieldValue>;
}

export interface ColorScheme {
  headerBg: string;
  headerText: string;
  sectionBg: string;
  sectionText: string;
  labelText: string;
  valueText: string;
  borderColor: string;
}

export interface FontScheme {
  titleSize: number;
  labelSize: number;
  valueSize: number;
  fontFamily: string;
}

export interface SpacingScheme {
  sectionGap: number;
  fieldGap: number;
  padding: number;
  margin: number;
}

export interface FichaCustomization {
  colors: ColorScheme;
  fonts: FontScheme;
  spacing: SpacingScheme;
  template: string;
  designId?: string;
  isGlobal: boolean;
}

export type FichaStatus = 'draft' | 'editing' | 'complete' | 'finalized';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  action: string;
  // Almacenamos diffs o estados parciales inmutables
  // Para undo/redo simples, guardamos el estado estructural
  state: string; // JSON serializado del estado estructural (sin blobs)
}

/**
 * Referencia al tipo de error de ficha
 * Definido en error.ts, usado aquí para evitar dependencias circulares
 */
export interface FichaErrorRef {
  id: string;
  fichaId: string;
  type: 'data' | 'user' | 'system';
  severity: 'warning' | 'error';
  message: string;
  userMessage: string;
  field?: string;
  timestamp: number;
  resolved: boolean;
}

/**
 * Estado completo de una ficha técnica
 * Cada ficha es una unidad aislada e independiente (Requirement 16.1)
 */
export interface FichaState {
  /** Identificador único de la ficha */
  id: string;
  /** ID del pozo asociado */
  pozoId: string;
  /** Estado actual de la ficha */
  status: FichaStatus;
  /** Secciones de la ficha */
  sections: FichaSection[];
  /** Personalizaciones de formato */
  customizations: FichaCustomization;
  /** Historial de cambios para undo/redo */
  history: HistoryEntry[];
  /** Errores contenidos en esta ficha */
  errors: FichaErrorRef[];
  /** Timestamp de última modificación */
  lastModified: number;
  /** Versión del estado para control de concurrencia */
  version: number;
  /** Estado de integridad (Requirement integrity) */
  stateStatus?: 'ok' | 'recovered' | 'reset';
  /** Referencia al último estado validado exitosamente (JSON string) */
  lastValidStateRef?: string;
}

/**
 * Snapshot para recuperación ante fallos
 * Requirements: 13.1-13.4
 */
/**
 * Snapshot estructural para recuperación ante fallos
 * Implementa el principio: "Snapshots baratos y restauración instantánea"
 */
export interface Snapshot {
  id: string;
  fichaId: string;
  schemaVersion: string;
  /** Estructura de secciones y orden (IDs) */
  structure: any;
  /** Valores de los campos (map ID -> valor) */
  values: Record<string, any>;
  /** Referencias a recursos externos (blobs, IDs de fotos) */
  references: string[];
  /** Metadatos adicionales */
  metadata: Record<string, any>;
  timestamp: number;
  trigger: 'auto' | 'manual' | 'pre-action';
}

/**
 * Tamaño de imagen para el editor
 */
export interface ImageSize {
  width: number;
  height: number;
}
