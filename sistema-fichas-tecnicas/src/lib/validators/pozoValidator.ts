/**
 * Pozo Validator - Validación de reglas de negocio para pozos
 * Requirements: 1.8, 1.9, 5.1-5.5, 11.1-11.5
 * 
 * Principios de diseño:
 * - Fail-safe: Nunca bloquea el flujo, solo reporta problemas
 * - Informativo: Mensajes claros y accionables
 * - Completo: Valida todas las reglas de negocio del diccionario
 * - No destructivo: Nunca modifica los datos, solo reporta
 */

import { Pozo, TuberiaInfo, SumideroInfo, FotoInfo, TipoTuberia, TipoSumidero, TipoFoto } from '@/types/pozo';
import { FieldValue } from '@/types/ficha';
import { ErrorType, ErrorSeverity } from '@/lib/errors/errorTypes';

/**
 * Resultado de validación de un pozo
 */
export interface PozoValidationResult {
  /** Si el pozo es válido */
  isValid: boolean;
  /** Errores encontrados */
  errors: ValidationError[];
  /** Advertencias (no bloquean) */
  warnings: ValidationWarning[];
  /** Campos que requieren atención */
  fieldsWithIssues: string[];
}

export interface ValidationError {
  code: string;
  message: string;
  userMessage: string;
  type: ErrorType;
  severity: ErrorSeverity;
  field?: string;
  value?: any;
}

export interface ValidationWarning {
  code: string;
  message: string;
  userMessage: string;
  field?: string;
}

/**
 * Rango geográfico válido para Colombia (aproximado)
 */
const GEOGRAPHIC_BOUNDS = {
  minLat: -4.23,  // Sur
  maxLat: 12.46,  // Norte
  minLon: -81.83, // Oeste
  maxLon: -66.87, // Este
};

/**
 * Extrae el valor de un FieldValue
 */
function extractValue(field: FieldValue | undefined): any {
  if (!field) return undefined;
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && 'value' in field) return field.value;
  return field;
}

/**
 * Verifica si un valor está vacío
 */
function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

/**
 * Verifica si un valor es "Sí" (case-insensitive)
 */
function isYes(value: any): boolean {
  if (typeof value !== 'string') return false;
  return value.toLowerCase() === 'sí' || value.toLowerCase() === 'si';
}

/**
 * Verifica si un valor es "No" (case-insensitive)
 */
function isNo(value: any): boolean {
  if (typeof value !== 'string') return false;
  return value.toLowerCase() === 'no';
}

/**
 * Convierte un valor a número de forma segura
 */
function toNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Valida que un valor sea un número positivo
 */
function isPositiveNumber(value: any): boolean {
  const num = toNumber(value);
  return num !== null && num > 0;
}

/**
 * Valida que un valor sea un número no negativo
 */
function isNonNegativeNumber(value: any): boolean {
  const num = toNumber(value);
  return num !== null && num >= 0;
}

/**
 * Valida formato de fecha YYYY-MM-DD
 */
function isValidDateFormat(value: any): boolean {
  if (typeof value !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(value)) return false;

  // Validar que sea una fecha válida
  const date = new Date(value);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Valida que las coordenadas estén en rango geográfico válido
 */
function isValidCoordinate(lat: any, lon: any): boolean {
  const latNum = toNumber(lat);
  const lonNum = toNumber(lon);

  if (latNum === null || lonNum === null) return false;

  return (
    latNum >= GEOGRAPHIC_BOUNDS.minLat &&
    latNum <= GEOGRAPHIC_BOUNDS.maxLat &&
    lonNum >= GEOGRAPHIC_BOUNDS.minLon &&
    lonNum <= GEOGRAPHIC_BOUNDS.maxLon
  );
}

/**
 * Valida que un valor corresponda a un enum
 */
function isValidEnum(value: any, enumObj: object): boolean {
  if (value === null || value === undefined || value === '') return false;
  const strVal = String(value).toLowerCase();
  return Object.values(enumObj).some(v => String(v).toLowerCase() === strVal);
}

/**
 * Valida que un ID de pozo exista en la lista de pozos
 */
function pozoExists(pozoId: string, allPozos: Map<string, Pozo>): boolean {
  return allPozos.has(pozoId);
}


/**
 * Valida la sección de identificación del pozo
 */
function validateIdentificacion(pozo: Pozo, result: PozoValidationResult): void {
  const { identificacion } = pozo;

  // Validar ID del pozo
  if (isEmpty(extractValue(pozo.idPozo || identificacion.idPozo))) {
    result.errors.push({
      code: 'POZO_ID_REQUIRED',
      message: 'Pozo ID is required',
      userMessage: 'El ID del pozo es obligatorio',
      type: ErrorType.DATA,
      severity: ErrorSeverity.ERROR,
      field: 'idPozo',
    });
    result.fieldsWithIssues.push('idPozo');
  }

  // Validar fecha
  const fecha = extractValue(pozo.fecha || identificacion.fecha);
  if (isEmpty(fecha)) {
    result.errors.push({
      code: 'FECHA_REQUIRED',
      message: 'Inspection date is required',
      userMessage: 'La fecha de inspección es obligatoria',
      type: ErrorType.DATA,
      severity: ErrorSeverity.ERROR,
      field: 'fecha',
    });
    result.fieldsWithIssues.push('fecha');
  } else if (!isValidDateFormat(fecha)) {
    result.errors.push({
      code: 'FECHA_INVALID_FORMAT',
      message: `Date format invalid: ${fecha}. Expected YYYY-MM-DD`,
      userMessage: 'La fecha debe estar en formato YYYY-MM-DD',
      type: ErrorType.DATA,
      severity: ErrorSeverity.ERROR,
      field: 'fecha',
      value: fecha,
    });
    result.fieldsWithIssues.push('fecha');
  }

  // Validar levanto (inspector)
  if (isEmpty(extractValue(pozo.levanto || identificacion.levanto))) {
    result.warnings.push({
      code: 'LEVANTO_EMPTY',
      message: 'Inspector name is empty',
      userMessage: 'Se recomienda indicar quién realizó el levantamiento',
      field: 'levanto',
    });
  }

  // Validar estado
  if (isEmpty(extractValue(pozo.estado || identificacion.estado))) {
    result.warnings.push({
      code: 'ESTADO_EMPTY',
      message: 'Pozo state is empty',
      userMessage: 'Se recomienda indicar el estado general del pozo',
      field: 'estado',
    });
  }
}

/**
 * Valida la sección de ubicación del pozo
 */
function validateUbicacion(pozo: Pozo, result: PozoValidationResult): void {
  const { ubicacion } = pozo;

  // Validar profundidad
  const profundidad = extractValue(pozo.profundidad || ubicacion.profundidad);
  if (!isEmpty(profundidad)) {
    if (!isPositiveNumber(profundidad)) {
      result.errors.push({
        code: 'PROFUNDIDAD_INVALID',
        message: `Profundidad must be > 0, got: ${profundidad}`,
        userMessage: 'La profundidad debe ser un número mayor a 0',
        type: ErrorType.DATA,
        severity: ErrorSeverity.ERROR,
        field: 'profundidad',
        value: profundidad,
      });
      result.fieldsWithIssues.push('profundidad');
    }
  }

  // Validar coordenadas
  const coordX = extractValue(pozo.coordenadaX || pozo.identificacion.coordenadaX);
  const coordY = extractValue(pozo.coordenadaY || pozo.identificacion.coordenadaY);

  // Si se proporcionan coordenadas, deben ser válidas
  if (!isEmpty(coordX) || !isEmpty(coordY)) {
    if (isEmpty(coordX) || isEmpty(coordY)) {
      result.warnings.push({
        code: 'COORDENADAS_INCOMPLETE',
        message: 'Only one coordinate provided',
        userMessage: 'Se proporcionó solo una coordenada. Se requieren ambas (X e Y)',
        field: 'coordenadas',
      });
    } else if (!isValidCoordinate(coordY, coordX)) {
      result.errors.push({
        code: 'COORDENADAS_OUT_OF_RANGE',
        message: `Coordinates out of valid geographic range: X=${coordX}, Y=${coordY}`,
        userMessage: 'Las coordenadas están fuera del rango geográfico válido para Colombia',
        type: ErrorType.DATA,
        severity: ErrorSeverity.ERROR,
        field: 'coordenadas',
        value: { x: coordX, y: coordY },
      });
      result.fieldsWithIssues.push('coordenadas');
    }
  }
}

/**
 * Valida la sección de componentes del pozo
 */
function validateComponentes(pozo: Pozo, result: PozoValidationResult): void {
  const { componentes } = pozo;

  // Validar tapa: Si existe_tapa = Sí → estado_tapa debe estar lleno
  const existeTapa = extractValue(pozo.existeTapa || componentes.existeTapa);
  if (isYes(existeTapa)) {
    const estadoTapa = extractValue(pozo.estadoTapa || componentes.estadoTapa);
    if (isEmpty(estadoTapa)) {
      result.errors.push({
        code: 'ESTADO_TAPA_REQUIRED',
        message: 'If existeTapa = Sí, estadoTapa is required',
        userMessage: 'Si el pozo tiene tapa, debe indicar el estado de la tapa',
        type: ErrorType.DATA,
        severity: ErrorSeverity.ERROR,
        field: 'estadoTapa',
      });
      result.fieldsWithIssues.push('estadoTapa');
    }
  }

  // Validar cilindro: Si existe_cilindro = Sí → diametro_cilindro debe estar lleno y > 0
  const existeCilindro = extractValue(pozo.existeCilindro || componentes.existeCilindro);
  if (isYes(existeCilindro)) {
    const diametroCilindro = extractValue(pozo.diametroCilindro || componentes.diametroCilindro);
    if (isEmpty(diametroCilindro)) {
      result.errors.push({
        code: 'DIAMETRO_CILINDRO_REQUIRED',
        message: 'If existeCilindro = Sí, diametroCilindro is required',
        userMessage: 'Si el pozo tiene cilindro, debe indicar el diámetro del cilindro',
        type: ErrorType.DATA,
        severity: ErrorSeverity.ERROR,
        field: 'diametroCilindro',
      });
      result.fieldsWithIssues.push('diametroCilindro');
    } else if (!isPositiveNumber(diametroCilindro)) {
      result.errors.push({
        code: 'DIAMETRO_CILINDRO_INVALID',
        message: `Diámetro cilindro must be > 0, got: ${diametroCilindro}`,
        userMessage: 'El diámetro del cilindro debe ser un número mayor a 0',
        type: ErrorType.DATA,
        severity: ErrorSeverity.ERROR,
        field: 'diametroCilindro',
        value: diametroCilindro,
      });
      result.fieldsWithIssues.push('diametroCilindro');
    }
  }

  // Validar peldaños: Si existe_peldaños = Sí → numero_peldaños debe ser > 0
  const existePeldanos = extractValue(pozo.existePeldanos || componentes.existePeldanos);
  if (isYes(existePeldanos)) {
    const numeroPeldanos = extractValue(pozo.numeroPeldanos || componentes.numeroPeldanos);
    if (isEmpty(numeroPeldanos)) {
      result.errors.push({
        code: 'NUMERO_PELDANOS_REQUIRED',
        message: 'If existePeldanos = Sí, numeroPeldanos is required',
        userMessage: 'Si el pozo tiene peldaños, debe indicar la cantidad de peldaños',
        type: ErrorType.DATA,
        severity: ErrorSeverity.ERROR,
        field: 'numeroPeldanos',
      });
      result.fieldsWithIssues.push('numeroPeldanos');
    } else if (!isPositiveNumber(numeroPeldanos)) {
      result.errors.push({
        code: 'NUMERO_PELDANOS_INVALID',
        message: `Número peldaños must be > 0, got: ${numeroPeldanos}`,
        userMessage: 'La cantidad de peldaños debe ser un número mayor a 0',
        type: ErrorType.DATA,
        severity: ErrorSeverity.ERROR,
        field: 'numeroPeldanos',
        value: numeroPeldanos,
      });
      result.fieldsWithIssues.push('numeroPeldanos');
    }
  }
}


/**
 * Valida la sección de tuberías
 */
function validateTuberias(pozo: Pozo, allPozos: Map<string, Pozo>, result: PozoValidationResult): void {
  const { tuberias } = pozo;

  if (!tuberias || !tuberias.tuberias || tuberias.tuberias.length === 0) {
    return; // Tuberías son opcionales
  }

  tuberias.tuberias.forEach((tuberia, index) => {
    const fieldPrefix = `tuberias[${index}]`;

    // Validar ID de tubería
    const idTuberia = extractValue(tuberia.idTuberia);
    if (isEmpty(idTuberia)) {
      result.warnings.push({
        code: 'TUBERIA_ID_EMPTY',
        message: `Tubería ${index} has no ID`,
        userMessage: `La tubería ${index + 1} no tiene ID`,
        field: `${fieldPrefix}.idTuberia`,
      });
    }

    // Validar integridad referencial: ID del pozo debe existir
    const idPozoTuberia = extractValue(tuberia.idPozo);
    if (!isEmpty(idPozoTuberia) && !pozoExists(idPozoTuberia, allPozos)) {
      result.errors.push({
        code: 'TUBERIA_POZO_NOT_FOUND',
        message: `Tubería ${index} references non-existent pozo: ${idPozoTuberia}`,
        userMessage: `La tubería ${index + 1} hace referencia a un pozo que no existe`,
        type: ErrorType.DATA,
        severity: ErrorSeverity.ERROR,
        field: `${fieldPrefix}.idPozo`,
        value: idPozoTuberia,
      });
      result.fieldsWithIssues.push(`${fieldPrefix}.idPozo`);
    }

    // Validar diámetro
    const diametro = extractValue(tuberia.diametro);
    if (!isEmpty(diametro) && !isPositiveNumber(diametro)) {
      result.errors.push({
        code: 'TUBERIA_DIAMETRO_INVALID',
        message: `Tubería ${index} diámetro must be > 0, got: ${diametro}`,
        userMessage: `La tubería ${index + 1} debe tener un diámetro mayor a 0`,
        type: ErrorType.DATA,
        severity: ErrorSeverity.ERROR,
        field: `${fieldPrefix}.diametro`,
        value: diametro,
      });
      result.fieldsWithIssues.push(`${fieldPrefix}.diametro`);
    }

    // Validar Tipo Tubería
    const tipo = extractValue(tuberia.tipoTuberia);
    if (!isEmpty(tipo) && !isValidEnum(tipo, TipoTuberia)) {
      result.warnings.push({
        code: 'TUBERIA_TIPO_INVALID',
        message: `Tubería ${index} tipo invalid: ${tipo}`,
        userMessage: `La tubería ${index + 1} tiene un tipo no reconocido (esperado: Entrada/Salida)`,
        field: `${fieldPrefix}.tipoTuberia`,
      });
    }

    // Validar longitud (si se proporciona)
    const longitud = extractValue(tuberia.longitud);
    if (!isEmpty(longitud) && !isPositiveNumber(longitud)) {
      result.errors.push({
        code: 'TUBERIA_LONGITUD_INVALID',
        message: `Tubería ${index} longitud must be > 0, got: ${longitud}`,
        userMessage: `La tubería ${index + 1} debe tener una longitud mayor a 0`,
        type: ErrorType.DATA,
        severity: ErrorSeverity.ERROR,
        field: `${fieldPrefix}.longitud`,
        value: longitud,
      });
      result.fieldsWithIssues.push(`${fieldPrefix}.longitud`);
    }
  });
}

/**
 * Valida la sección de sumideros
 */
function validateSumideros(pozo: Pozo, allPozos: Map<string, Pozo>, result: PozoValidationResult): void {
  const { sumideros } = pozo;

  if (!sumideros || !sumideros.sumideros || sumideros.sumideros.length === 0) {
    return; // Sumideros son opcionales
  }

  sumideros.sumideros.forEach((sumidero, index) => {
    const fieldPrefix = `sumideros[${index}]`;

    // Validar ID de sumidero
    const idSumidero = extractValue(sumidero.idSumidero);
    if (isEmpty(idSumidero)) {
      result.warnings.push({
        code: 'SUMIDERO_ID_EMPTY',
        message: `Sumidero ${index} has no ID`,
        userMessage: `El sumidero ${index + 1} no tiene ID`,
        field: `${fieldPrefix}.idSumidero`,
      });
    }

    // Validar Tipo Sumidero
    const tipo = extractValue(sumidero.tipoSumidero);
    if (!isEmpty(tipo) && !isValidEnum(tipo, TipoSumidero)) {
      result.warnings.push({
        code: 'SUMIDERO_TIPO_INVALID',
        message: `Sumidero ${index} tipo invalid: ${tipo}`,
        userMessage: `El sumidero ${index + 1} tiene un tipo no reconocido`,
        field: `${fieldPrefix}.tipoSumidero`,
      });
    }

    // Validar integridad referencial: ID del pozo debe existir
    const idPozoSumidero = extractValue(sumidero.idPozo);
    if (!isEmpty(idPozoSumidero) && !pozoExists(idPozoSumidero, allPozos)) {
      result.errors.push({
        code: 'SUMIDERO_POZO_NOT_FOUND',
        message: `Sumidero ${index} references non-existent pozo: ${idPozoSumidero}`,
        userMessage: `El sumidero ${index + 1} hace referencia a un pozo que no existe`,
        type: ErrorType.DATA,
        severity: ErrorSeverity.ERROR,
        field: `${fieldPrefix}.idPozo`,
        value: idPozoSumidero,
      });
      result.fieldsWithIssues.push(`${fieldPrefix}.idPozo`);
    }

    // Validar diámetro (si se proporciona)
    const diametro = extractValue(sumidero.diametro);
    if (!isEmpty(diametro) && !isPositiveNumber(diametro)) {
      result.errors.push({
        code: 'SUMIDERO_DIAMETRO_INVALID',
        message: `Sumidero ${index} diámetro must be > 0, got: ${diametro}`,
        userMessage: `El sumidero ${index + 1} debe tener un diámetro mayor a 0`,
        type: ErrorType.DATA,
        severity: ErrorSeverity.ERROR,
        field: `${fieldPrefix}.diametro`,
        value: diametro,
      });
      result.fieldsWithIssues.push(`${fieldPrefix}.diametro`);
    }

    // Validar altura de salida (si se proporciona)
    const alturaSalida = extractValue(sumidero.alturaSalida);
    if (!isEmpty(alturaSalida) && !isNonNegativeNumber(alturaSalida)) {
      result.errors.push({
        code: 'SUMIDERO_ALTURA_SALIDA_INVALID',
        message: `Sumidero ${index} alturaSalida must be >= 0, got: ${alturaSalida}`,
        userMessage: `El sumidero ${index + 1} debe tener una altura de salida válida`,
        type: ErrorType.DATA,
        severity: ErrorSeverity.ERROR,
        field: `${fieldPrefix}.alturaSalida`,
        value: alturaSalida,
      });
      result.fieldsWithIssues.push(`${fieldPrefix}.alturaSalida`);
    }

    // Validar altura de llegada (si se proporciona)
    const alturaLlegada = extractValue(sumidero.alturaLlegada);
    if (!isEmpty(alturaLlegada) && !isNonNegativeNumber(alturaLlegada)) {
      result.errors.push({
        code: 'SUMIDERO_ALTURA_LLEGADA_INVALID',
        message: `Sumidero ${index} alturaLlegada must be >= 0, got: ${alturaLlegada}`,
        userMessage: `El sumidero ${index + 1} debe tener una altura de llegada válida`,
        type: ErrorType.DATA,
        severity: ErrorSeverity.ERROR,
        field: `${fieldPrefix}.alturaLlegada`,
        value: alturaLlegada,
      });
      result.fieldsWithIssues.push(`${fieldPrefix}.alturaLlegada`);
    }
  });
}

/**
 * Valida la sección de fotos
 */
function validateFotos(pozo: Pozo, allPozos: Map<string, Pozo>, result: PozoValidationResult): void {
  const { fotos } = pozo;

  if (!fotos || !fotos.fotos || fotos.fotos.length === 0) {
    return; // Fotos son opcionales
  }

  fotos.fotos.forEach((foto, index) => {
    const fieldPrefix = `fotos[${index}]`;

    // Validar ID de foto
    if (isEmpty(foto.id)) {
      result.warnings.push({
        code: 'FOTO_ID_EMPTY',
        message: `Foto ${index} has no ID`,
        userMessage: `La foto ${index + 1} no tiene ID`,
        field: `${fieldPrefix}.id`,
      });
    }

    // Validar integridad referencial: ID del pozo debe existir
    if (!isEmpty(foto.idPozo) && !pozoExists(foto.idPozo, allPozos)) {
      result.errors.push({
        code: 'FOTO_POZO_NOT_FOUND',
        message: `Foto ${index} references non-existent pozo: ${foto.idPozo}`,
        userMessage: `La foto ${index + 1} hace referencia a un pozo que no existe`,
        type: ErrorType.DATA,
        severity: ErrorSeverity.ERROR,
        field: `${fieldPrefix}.idPozo`,
        value: foto.idPozo,
      });
      result.fieldsWithIssues.push(`${fieldPrefix}.idPozo`);
    }

    // Validar Tipo Foto
    if (!isEmpty(foto.tipo) && !isValidEnum(foto.tipo, TipoFoto)) {
      result.warnings.push({
        code: 'FOTO_TIPO_INVALID',
        message: `Foto ${index} tipo invalid: ${foto.tipo}`,
        userMessage: `La foto ${index + 1} tiene un tipo no reconocido`,
        field: `${fieldPrefix}.tipo`,
      });
    }

    // Validar blobId (referencia al recurso)
    if (isEmpty(foto.blobId)) {
      result.warnings.push({
        code: 'FOTO_BLOB_EMPTY',
        message: `Foto ${index} has no resource reference (blobId)`,
        userMessage: `La foto ${index + 1} no tiene referencia al recurso de imagen`,
        field: `${fieldPrefix}.blobId`,
      });
    }

    // Validar fecha de captura (si se proporciona)
    if (foto.fechaCaptura) {
      if (typeof foto.fechaCaptura !== 'number') {
        result.errors.push({
          code: 'FOTO_FECHA_INVALID',
          message: `Foto ${index} fechaCaptura must be a timestamp`,
          userMessage: `La foto ${index + 1} tiene un formato de fecha inválido`,
          type: ErrorType.DATA,
          severity: ErrorSeverity.ERROR,
          field: `${fieldPrefix}.fechaCaptura`,
          value: foto.fechaCaptura,
        });
      }
    }
  });
}


/**
 * Valida un pozo completo contra todas las reglas de negocio
 * 
 * @param pozo - Pozo a validar
 * @param allPozos - Mapa de todos los pozos (para validar integridad referencial)
 * @returns Resultado de la validación
 */
export function validatePozo(pozo: Pozo, allPozos?: Map<string, Pozo>): PozoValidationResult {
  const result: PozoValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fieldsWithIssues: [],
  };

  // Crear mapa vacío si no se proporciona
  if (!allPozos) {
    allPozos = new Map();
    allPozos.set(pozo.id, pozo);
  }

  // Validar cada sección
  validateIdentificacion(pozo, result);
  validateUbicacion(pozo, result);
  validateComponentes(pozo, result);
  validateTuberias(pozo, allPozos, result);
  validateSumideros(pozo, allPozos, result);
  validateFotos(pozo, allPozos, result);

  // Determinar si el pozo es válido
  result.isValid = result.errors.length === 0;

  return result;
}

/**
 * Valida múltiples pozos
 * 
 * @param pozos - Array de pozos a validar
 * @returns Mapa de resultados de validación por ID de pozo
 */
export function validatePozos(pozos: Pozo[]): Map<string, PozoValidationResult> {
  const results = new Map<string, PozoValidationResult>();

  // Crear mapa de todos los pozos para validar integridad referencial
  const allPozos = new Map<string, Pozo>();
  pozos.forEach(pozo => allPozos.set(pozo.id, pozo));

  // Validar cada pozo
  pozos.forEach(pozo => {
    const result = validatePozo(pozo, allPozos);
    results.set(pozo.id, result);
  });

  return results;
}

/**
 * Obtiene un resumen de validación para múltiples pozos
 */
export function getValidationSummary(results: Map<string, PozoValidationResult>): {
  totalPozos: number;
  validPozos: number;
  invalidPozos: number;
  totalErrors: number;
  totalWarnings: number;
  errorsByType: Record<string, number>;
} {
  let validPozos = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  const errorsByType: Record<string, number> = {};

  results.forEach(result => {
    if (result.isValid) {
      validPozos++;
    }

    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;

    result.errors.forEach(error => {
      errorsByType[error.code] = (errorsByType[error.code] || 0) + 1;
    });
  });

  return {
    totalPozos: results.size,
    validPozos,
    invalidPozos: results.size - validPozos,
    totalErrors,
    totalWarnings,
    errorsByType,
  };
}

/**
 * Valida un campo específico de un pozo
 * Útil para validación en tiempo real mientras el usuario edita
 * 
 * @param pozo - Pozo a validar
 * @param fieldPath - Ruta del campo (ej: "componentes.existeTapa")
 * @param allPozos - Mapa de todos los pozos (opcional)
 * @returns Errores específicos del campo
 */
export function validateField(
  pozo: Pozo,
  fieldPath: string,
  allPozos?: Map<string, Pozo>
): ValidationError[] {
  const result = validatePozo(pozo, allPozos);
  return result.errors.filter(error => error.field?.startsWith(fieldPath));
}

/**
 * Obtiene todos los campos con problemas de un pozo
 */
export function getFieldsWithIssues(result: PozoValidationResult): string[] {
  return [...new Set(result.fieldsWithIssues)];
}

/**
 * Formatea un resultado de validación para mostrar al usuario
 */
export function formatValidationResult(result: PozoValidationResult): {
  summary: string;
  errors: string[];
  warnings: string[];
} {
  const errors = result.errors.map(e => e.userMessage);
  const warnings = result.warnings.map(w => w.userMessage);

  let summary = '';
  if (result.isValid) {
    summary = 'El pozo es válido ✓';
  } else {
    summary = `El pozo tiene ${result.errors.length} error(es) y ${result.warnings.length} advertencia(s)`;
  }

  return { summary, errors, warnings };
}

/**
 * Exporta las constantes de validación
 */
export const VALIDATION_RULES = {
  tapaRequiereEstado: 'Si existe_tapa = Sí, estado_tapa es obligatorio',
  cilindroRequiereDiametro: 'Si existe_cilindro = Sí, diametro_cilindro es obligatorio y > 0',
  peldanosRequiereNumero: 'Si existe_peldaños = Sí, numero_peldaños es obligatorio y > 0',
  profundidadPositiva: 'Profundidad debe ser > 0',
  diametrosPositivos: 'Todos los diámetros deben ser > 0',
  coordenadasValidas: 'Coordenadas deben estar en rangos geográficos válidos',
  fechaFormato: 'Fechas deben estar en formato YYYY-MM-DD',
  integridadReferencial: 'Tuberías y sumideros deben tener id_pozo válido',
} as const;

export const GEOGRAPHIC_BOUNDS_EXPORT = GEOGRAPHIC_BOUNDS;
