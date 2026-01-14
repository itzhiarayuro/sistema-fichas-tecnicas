/**
 * Tipos para la estructura de datos de Pozos
 * Requirements: 5.1-5.5, 16.1
 * 
 * Diccionario de Datos Completo - 33 campos del pozo
 * Marcado con: 🔴 Obligatorio, 🟠 Importante, 🟢 Opcional
 */

import { FieldValue } from './ficha';

// ============================================================================
// VALORES PREDEFINIDOS (ENUMS)
// ============================================================================

export enum EstadoPozo {
  BUENO = 'Bueno',
  REGULAR = 'Regular',
  MALO = 'Malo',
  MUY_MALO = 'Muy Malo',
  NO_APLICA = 'No Aplica',
}

export enum MaterialTuberia {
  PVC = 'PVC',
  GRES = 'GRES',
  CONCRETO = 'Concreto',
  HIERRO_FUNDIDO = 'Hierro Fundido',
  POLIETILENO = 'Polietileno',
}

export enum MaterialComponente {
  CONCRETO = 'Concreto',
  HIERRO = 'Hierro',
  HIERRO_FUNDIDO = 'Hierro Fundido',
  LADRILLO = 'Ladrillo',
  MIXTO = 'Mixto',
}

export enum TipoCamara {
  CIRCULAR = 'Circular',
  RECTANGULAR = 'Rectangular',
  CUADRADA = 'Cuadrada',
}

export enum TipoTuberia {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
}

export enum TipoSumidero {
  REJILLA = 'Rejilla',
  BUZON = 'Buzón',
  COMBINADO = 'Combinado',
  LATERAL = 'Lateral',
}

export enum TipoFoto {
  TAPA = 'tapa',
  INTERIOR = 'interior',
  GENERAL = 'general',
  ENTRADA = 'entrada',
  SALIDA = 'salida',
  SUMIDERO = 'sumidero',
  MEDICION = 'medicion',
  OTRO = 'otro',
}

// ============================================================================
// TABLA: POZOS (33 CAMPOS)
// ============================================================================

/**
 * Identificación del Pozo - Campos Obligatorios 🔴
 */
export interface IdentificacionPozo {
  // 🔴 Obligatorio
  idPozo: FieldValue; // Identificador único (ej: PZ1666) -> Código

  // 🔴 Obligatorio
  coordenadaX: FieldValue; // Longitud o Coordenada X (ej: -74.123456)

  // 🔴 Obligatorio
  coordenadaY: FieldValue; // Latitud o Coordenada Y (ej: 4.678901)

  // 🔴 Obligatorio
  fecha: FieldValue; // Fecha de inspección (YYYY-MM-DD)

  // 🔴 Obligatorio
  levanto: FieldValue; // Inspector o Líder que realizó levantamiento

  // 🔴 Obligatorio
  estado: FieldValue; // Estado general (Bueno/Regular/Malo/Muy Malo/No Aplica)
}

/**
 * Ubicación del Pozo - Campos Importantes 🟠
 */
export interface UbicacionPozo {
  // 🟠 Importante
  direccion: FieldValue; // Dirección física

  // 🟠 Importante
  barrio: FieldValue; // Barrio o sector

  // 🟠 Importante
  elevacion: FieldValue; // Elevación sobre nivel del mar (m)

  // 🟠 Importante
  profundidad: FieldValue; // Profundidad del pozo (m), debe ser > 0
}

/**
 * Componentes del Pozo - Campos Importantes y Opcionales
 */
export interface ComponentesPozo {
  // 🟠 Importante
  existeTapa: FieldValue; // ¿Tiene tapa? (Sí/No)

  // 🟠 Importante - Requerido si existeTapa = Sí
  estadoTapa: FieldValue; // Estado de la tapa

  // 🟠 Importante
  existeCilindro: FieldValue; // ¿Tiene cilindro? (Sí/No)

  // 🟠 Importante - Requerido si existeCilindro = Sí, debe ser > 0
  diametroCilindro: FieldValue; // Diámetro del cilindro (m)

  // 🟢 Opcional
  sistema: FieldValue; // Sistema al que pertenece

  // 🟢 Opcional
  anoInstalacion: FieldValue; // Año de instalación

  // 🟢 Opcional
  tipoCamara: FieldValue; // Tipo de cámara (Circular/Rectangular/Cuadrada)

  // 🟢 Opcional
  estructuraPavimento: FieldValue; // Tipo de pavimento superficial

  // 🟢 Opcional
  materialTapa: FieldValue; // Material de la tapa

  // 🟢 Opcional
  existeCono: FieldValue; // ¿Tiene cono? (Sí/No)

  // 🟢 Opcional
  tipoCono: FieldValue; // Tipo de cono

  // 🟢 Opcional
  materialCono: FieldValue; // Material del cono

  // 🟢 Opcional
  estadoCono: FieldValue; // Estado del cono

  // 🟢 Opcional
  materialCilindro: FieldValue; // Material del cilindro

  // 🟢 Opcional
  estadoCilindro: FieldValue; // Estado del cilindro

  // 🟢 Opcional
  existeCanuela: FieldValue; // ¿Tiene cañuela? (Sí/No)

  // 🟢 Opcional
  materialCanuela: FieldValue; // Material de la cañuela

  // 🟢 Opcional
  estadoCanuela: FieldValue; // Estado de la cañuela

  // 🟢 Opcional
  existePeldanos: FieldValue; // ¿Tiene peldaños? (Sí/No)

  // 🟢 Opcional
  materialPeldanos: FieldValue; // Material de los peldaños

  // 🟢 Opcional - Requerido si existePeldanos = Sí, debe ser > 0
  numeroPeldanos: FieldValue; // Cantidad de peldaños

  // 🟢 Opcional
  estadoPeldanos: FieldValue; // Estado de los peldaños
}

/**
 * Observaciones - Campo Opcional
 */
export interface ObservacionesPozo {
  // 🟢 Opcional
  observaciones: FieldValue; // Observaciones adicionales
}

/**
 * Estructura completa del Pozo (33 campos)
 */
export interface EstructuraPozo extends IdentificacionPozo, UbicacionPozo, ComponentesPozo, ObservacionesPozo { }

// ============================================================================
// TABLA: TUBERÍAS (UNIFICADA)
// ============================================================================

/**
 * Información de una tubería (entrada o salida)
 * 9 campos: 5 obligatorios, 2 importantes, 2 opcionales
 */
export interface TuberiaInfo {
  // 🔴 Obligatorio
  idTuberia: FieldValue; // Identificador único

  // 🔴 Obligatorio - Debe existir en POZOS
  idPozo: FieldValue; // Pozo al que conecta

  // 🔴 Obligatorio
  tipoTuberia: FieldValue; // Tipo: entrada o salida

  // 🔴 Obligatorio - Debe ser > 0
  diametro: FieldValue; // Diámetro en milímetros (mm)
  diametroMm?: FieldValue; // Alias para alineación exacta con Excel 'ø (mm)'

  // 🔴 Obligatorio
  material: FieldValue; // Material de la tubería

  // 🟠 Importante
  cota: FieldValue; // Cota o profundidad (Z)
  z?: FieldValue; // Alias para alineación exacta con Excel 'Z'

  // 🟠 Importante
  estado: FieldValue; // Estado de la tubería

  // 🟢 Opcional
  emboquillado: FieldValue; // ¿Tiene emboquillado? (Sí/No)

  // 🟢 Opcional - Debe ser > 0 si se proporciona
  longitud: FieldValue; // Longitud en metros
}

/**
 * Contenedor de tuberías unificadas (entrada y salida en una sola tabla)
 */
export interface TuberiasPozo {
  tuberias: TuberiaInfo[];
}

// ============================================================================
// TABLA: SUMIDEROS
// ============================================================================

/**
 * Información de un sumidero
 * 8 campos: 2 obligatorios, 1 importante, 5 opcionales
 */
export interface SumideroInfo {
  // 🔴 Obligatorio
  idSumidero: FieldValue; // Identificador único (ej: S1667-1)

  // 🔴 Obligatorio - Debe existir en POZOS
  idPozo: FieldValue; // Pozo al que conecta

  // 🟠 Importante
  tipoSumidero: FieldValue; // Tipo de sumidero (Rejilla/Buzón/Combinado/Lateral)

  // 🟢 Opcional
  numeroEsquema: FieldValue; // Número en esquema/plano

  // 🟢 Opcional - Debe ser > 0 si se proporciona
  diametro: FieldValue; // Diámetro en milímetros (mm)
  diametroMm?: FieldValue; // Alias para ø (mm)

  // 🟢 Opcional
  materialTuberia: FieldValue; // Material de la tubería

  // 🟢 Opcional
  alturaSalida: FieldValue; // Altura de salida (m)
  alturasSalida?: FieldValue; // Alias para 'H salida (m)'

  // 🟢 Opcional
  alturaLlegada: FieldValue; // Altura de llegada (m)
}

/**
 * Contenedor de sumideros
 */
export interface SumiderosPozo {
  sumideros: SumideroInfo[];
}

// ============================================================================
// TABLA: FOTOS (NUEVA - SUGERIDA)
// ============================================================================

/**
 * Información de una fotografía
 * Implementa el principio: "Solo referencias inmutables en el estado"
 */
export interface FotoInfo {
  // 🔴 Obligatorio - Identificador único de la foto
  id: string;

  // 🔴 Obligatorio - Referencia al pozo
  idPozo: string;

  // 🔴 Obligatorio - Tipo (tapa, interior, etc.)
  tipo: TipoFoto | string;

  // 🟠 Importante - Categoría para gestión UI
  categoria: 'PRINCIPAL' | 'ENTRADA' | 'SALIDA' | 'SUMIDERO' | 'OTRO';

  // 🟠 Importante - Subcategoría (ej: E1, S2)
  subcategoria?: string;

  // 🟢 Opcional - Descripción
  descripcion?: string;

  // 🔴 Obligatorio - Referencia al BlobStore (NUNCA el objeto Blob ni dataUrl)
  blobId: string;

  // 🟢 Opcional - Nombre del archivo original
  filename: string;

  // 🟢 Opcional - Fecha de captura
  fechaCaptura?: number;
}

/**
 * Contenedor de fotos organizadas por categoría
 */
export interface FotosPozo {
  fotos: FotoInfo[];
}

// ============================================================================
// METADATOS Y CONTENEDOR PRINCIPAL
// ============================================================================

export interface PozoMetadata {
  createdAt: number;
  updatedAt: number;
  source: 'excel' | 'manual';
  version: number;
}

/**
 * Pozo completo con todos los datos
 * Estructura aislada e independiente (Requirement 16.1)
 * SOPORTA ALINEACIÓN CONTROLADA: Campos planos en paralelo con jerárquicos.
 */
export interface Pozo {
  // Identificador único
  id: string;

  // --- CAPA DE ALINEACIÓN PLANA (Aliases para facilitar acceso y reducir errores TS) ---
  idPozo?: FieldValue;
  coordenadaX?: FieldValue;
  coordenadaY?: FieldValue;
  fecha?: FieldValue;
  levanto?: FieldValue;
  estado?: FieldValue;
  direccion?: FieldValue;
  barrio?: FieldValue;
  elevacion?: FieldValue;
  profundidad?: FieldValue;
  sistema?: FieldValue;
  anoInstalacion?: FieldValue;
  tipoCamara?: FieldValue;
  estructuraPavimento?: FieldValue;
  existeTapa?: FieldValue;
  materialTapa?: FieldValue;
  estadoTapa?: FieldValue;
  existeCono?: FieldValue;
  tipoCono?: FieldValue;
  materialCono?: FieldValue;
  estadoCono?: FieldValue;
  existeCilindro?: FieldValue;
  diametroCilindro?: FieldValue;
  materialCilindro?: FieldValue;
  estadoCilindro?: FieldValue;
  existeCanuela?: FieldValue;
  materialCanuela?: FieldValue;
  estadoCaniuela?: FieldValue;
  estadoCanuela?: FieldValue; // Redundant but safe
  existePeldanos?: FieldValue;
  materialPeldanos?: FieldValue;
  numeroPeldanos?: FieldValue;
  estadoPeldanos?: FieldValue;
  observacionesPozo?: FieldValue; // Alias para evitar conflicto con seccion 'observaciones'

  // --- ESTRUCTURA JERÁRQUICA (Fuente de verdad para persistencia) ---
  identificacion: IdentificacionPozo;
  ubicacion: UbicacionPozo;
  componentes: ComponentesPozo;
  observaciones: ObservacionesPozo; // Restaurado nombre original

  // Relaciones
  tuberias: TuberiasPozo;
  sumideros: SumiderosPozo;
  fotos: FotosPozo;

  // Metadatos
  metadata: PozoMetadata;
}

// ============================================================================
// VALIDACIONES DE NEGOCIO
// ============================================================================

/**
 * Reglas de validación para pozos
 * Estas reglas se implementan en lib/validators/pozoValidator.ts
 */
export const VALIDACION_REGLAS = {
  // Si existe_tapa = Sí → estado_tapa debe estar lleno
  tapaRequiereEstado: 'Si existe_tapa = Sí, estado_tapa es obligatorio',

  // Si existe_cilindro = Sí → diametro_cilindro debe estar lleno
  cilindroRequiereDiametro: 'Si existe_cilindro = Sí, diametro_cilindro es obligatorio y > 0',

  // Si existe_peldaños = Sí → numero_peldaños debe ser > 0
  peldanosRequiereNumero: 'Si existe_peldaños = Sí, numero_peldaños es obligatorio y > 0',

  // Profundidad debe ser > 0
  profundidadPositiva: 'Profundidad debe ser > 0',

  // Diámetros deben ser > 0
  diametrosPositivos: 'Todos los diámetros deben ser > 0',

  // Coordenadas en rangos geográficos válidos
  coordenadasValidas: 'Coordenadas deben estar en rangos geográficos válidos',

  // Fechas en formato YYYY-MM-DD
  fechaFormato: 'Fechas deben estar en formato YYYY-MM-DD',

  // Integridad referencial
  integridadReferencial: 'Tuberías y sumideros deben tener id_pozo válido',
} as const;
