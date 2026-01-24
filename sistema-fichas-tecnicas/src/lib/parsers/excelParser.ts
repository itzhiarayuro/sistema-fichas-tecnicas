/**
 * Parser de archivos Excel robusto
 * Requirements: 1.4, 1.8, 1.9
 * 
 * Principios de diseño:
 * - Fail-safe: Nunca lanza excepciones, siempre retorna resultado válido
 * - Flexible: Mapeo de columnas tolerante a variaciones
 * - Informativo: Reporta warnings sin bloquear el flujo
 */

import type { Pozo, FieldValue } from '@/types';
import { ErrorType, ErrorSeverity } from '@/lib/errors/errorTypes';

/**
 * Error estructurado del parser
 */
export interface ParseError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  row?: number;
  column?: string;
  field?: string;
  value?: unknown;
}

/**
 * Resultado del parsing de Excel
 */
export interface ExcelParseResult {
  pozos: Pozo[];
  warnings: string[];
  errors: string[];
  parseErrors: ParseError[];
  stats: {
    totalRows: number;
    validRows: number;
    skippedRows: number;
    columnsFound: string[];
    columnsMissing: string[];
    columnsIgnored: string[];
    fieldsWithDefaults: string[];
  };
}

/**
 * Mapeo extensivo de columnas esperadas
 * Soporta múltiples variaciones de nombres para cada campo
 * Incluye todos los 33 campos del diccionario de datos
 */
const COLUMN_MAPPING: Record<string, string> = {
  // IDENTIFICACIÓN
  'id_pozo': 'idPozo',
  'codigo': 'idPozo',
  'pozo': 'idPozo',
  'coordenada_x': 'coordenadaX',
  'x': 'coordenadaX',
  'longitud': 'coordenadaX',
  'coordenada_y': 'coordenadaY',
  'y': 'coordenadaY',
  'latitud': 'coordenadaY',
  'fecha': 'fecha',
  'fecha_inspeccion': 'fecha',
  'levanto': 'levanto',
  'inspector': 'levanto',
  'estado': 'estado',
  'condicion': 'estado',

  // UBICACIÓN
  'direccion': 'direccion',
  'barrio': 'barrio',
  'sector': 'barrio',
  'elevacion': 'elevacion',
  'msnm': 'elevacion',
  'profundidad': 'profundidad',
  'prof': 'profundidad',

  // COMPONENTES
  'sistema': 'sistema',
  'ano_instalacion': 'anoInstalacion',
  'tipo_camara': 'tipoCamara',
  'estructura_pavimento': 'estructuraPavimento',
  'existe_tapa': 'existeTapa',
  'tapa': 'existeTapa',
  'material_tapa': 'materialTapa',
  'estado_tapa': 'estadoTapa',
  'existe_cono': 'existeCono',
  'cono': 'existeCono',
  'tipo_cono': 'tipoCono',
  'material_cono': 'materialCono',
  'estado_cono': 'estadoCono',
  'existe_cilindro': 'existeCilindro',
  'cilindro': 'existeCilindro',
  'diametro_cilindro': 'diametroCilindro',
  'material_cilindro': 'materialCilindro',
  'estado_cilindro': 'estadoCilindro',
  'existe_canuela': 'existeCanuela',
  'canuela': 'existeCanuela',
  'material_canuela': 'materialCanuela',
  'estado_canuela': 'estadoCanuela',
  'existe_peldanos': 'existePeldanos',
  'peldanos': 'existePeldanos',
  'material_peldanos': 'materialPeldanos',
  'numero_peldanos': 'numeroPeldanos',
  'estado_peldanos': 'estadoPeldanos',

  // OBSERVACIONES
  'observaciones': 'observaciones',
  'notas': 'observaciones',
  'comentarios': 'observaciones',
};

/**
 * Mapeo para Tuberías (Hoja TUBERIAS)
 */
const TUBERIA_MAPPING: Record<string, string> = {
  'id_pozo': 'idPozo',
  'pozo': 'idPozo',
  'id_tuberia': 'idTuberia',
  'tuberia': 'idTuberia',
  'tipo': 'tipoTuberia',
  'tipo_tuberia': 'tipoTuberia',
  'diametro': 'diametro',
  'material': 'material',
  'cota': 'cota',
  'z': 'cota',
  'estado': 'estado',
  'emboquillado': 'emboquillado',
  'longitud': 'longitud',
};

const SUMIDERO_MAPPING: Record<string, string> = {
  'id_pozo': 'idPozo',
  'pozo': 'idPozo',
  'id_sumidero': 'idSumidero',
  'sumidero': 'idSumidero',
  'tipo': 'tipoSumidero',
  'tipo_sumidero': 'tipoSumidero',
  'numero_esquema': 'numeroEsquema',
  'diametro': 'diametro',
  'material_tuberia': 'materialTuberia',
  'altura_salida': 'alturaSalida',
  'altura_llegada': 'alturaLlegada',
};

const FOTO_MAPPING: Record<string, string> = {
  'id_pozo': 'idPozo',
  'pozo': 'idPozo',
  'id_foto': 'idFoto',
  'foto': 'idFoto',
  'tipo': 'tipoFoto',
  'tipo_foto': 'tipoFoto',
  'ruta_archivo': 'rutaArchivo',
  'archivo': 'rutaArchivo',
  'fecha_captura': 'fechaCaptura',
  'descripcion': 'descripcion',
};

/**
 * Columnas requeridas para crear un pozo válido
 * Según diccionario: 6 campos obligatorios
 */
const REQUIRED_COLUMNS = ['idPozo', 'coordenadaX', 'coordenadaY', 'fecha', 'levanto', 'estado'];

/**
 * Campos esperados para estadísticas (todos los 33 campos del diccionario)
 */
const EXPECTED_FIELDS = [
  // Identificación (6)
  'idPozo', 'coordenadaX', 'coordenadaY', 'fecha', 'levanto', 'estado',
  // Ubicación (4)
  'direccion', 'barrio', 'elevacion', 'profundidad',
  // Componentes (23)
  'sistema', 'anoInstalacion', 'tipoCamara', 'estructuraPavimento',
  'existeTapa', 'materialTapa', 'estadoTapa',
  'existeCono', 'tipoCono', 'materialCono', 'estadoCono',
  'existeCilindro', 'diametroCilindro', 'materialCilindro', 'estadoCilindro',
  'existeCanuela', 'materialCanuela', 'estadoCanuela',
  'existePeldanos', 'materialPeldanos', 'numeroPeldanos', 'estadoPeldanos',
  // Observaciones (1)
  'observaciones'
];

/**
 * Normaliza el nombre de una columna para comparación
 * Elimina espacios, acentos y convierte a minúsculas
 */
function normalizeColumnName(name: string): string {
  if (!name || typeof name !== 'string') return '';

  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Crea metadata con valores por defecto
 */
function createDefaultMetadata() {
  return {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: 'excel' as const,
    version: 1,
  };
}

/**
 * Crea un resultado vacío pero válido
 * Usado como fallback en caso de errores
 */
function createEmptyResult(): ExcelParseResult {
  return {
    pozos: [],
    warnings: [],
    errors: [],
    parseErrors: [],
    stats: {
      totalRows: 0,
      validRows: 0,
      skippedRows: 0,
      columnsFound: [],
      columnsMissing: [],
      columnsIgnored: [],
      fieldsWithDefaults: [],
    },
  };
}

/**
 * Valida que una coordenada sea un número válido en rango geográfico
 * Coordenadas opcionales pero si se proporcionan deben ser válidas
 * Requirements: 1.4, 1.8, 1.9
 */
function isValidCoordinate(value: string, isLatitude: boolean = false): boolean {
  if (!value || value.trim() === '') {
    // Coordenadas son opcionales
    return true;
  }

  const num = parseFloat(value);

  if (isNaN(num)) {
    return false;
  }

  // Validar rangos geográficos
  if (isLatitude) {
    // Latitud: -90 a 90
    return num >= -90 && num <= 90;
  } else {
    // Longitud: -180 a 180
    return num >= -180 && num <= 180;
  }
}

/**
 * Valida que un valor sea un número positivo
 * Usado para profundidad, diámetros, etc.
 */
function isPositiveNumber(value: string): boolean {
  if (!value || value.trim() === '') {
    return true; // Opcional
  }

  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
}

/**
 * Valida que una fecha esté en formato YYYY-MM-DD
 */
function isValidDate(value: string): boolean {
  if (!value || value.trim() === '') {
    return false; // Fecha es obligatoria
  }

  // Intentar parsear como fecha
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    return false;
  }

  const date = new Date(value);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Normaliza una fecha a formato YYYY-MM-DD
 */
function normalizeDateValue(value: string): string {
  if (!value || value.trim() === '') {
    return '';
  }

  // Si ya está en formato YYYY-MM-DD, retornar
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // Intentar parsear como fecha
  try {
    const date = new Date(value);
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Ignorar errores
  }

  return value;
}

/**
 * Valida valores predefinidos
 */
function isValidPredefinedValue(value: string, allowedValues: string[]): boolean {
  if (!value || value.trim() === '') {
    return true; // Opcional
  }

  return allowedValues.some(v => v.toLowerCase() === value.toLowerCase());
}

/**
 * Valores predefinidos válidos según diccionario
 */
const PREDEFINED_VALUES = {
  estado: ['Bueno', 'Regular', 'Malo', 'Muy Malo', 'No Aplica'],
  materialTuberia: ['PVC', 'GRES', 'Concreto', 'Hierro Fundido', 'Polietileno'],
  materialComponente: ['Concreto', 'Hierro', 'Hierro Fundido', 'Ladrillo', 'Mixto'],
  tipoCamara: [
    'TÍPICA DE FONDO',
    'DE CAÍDA',
    'CON COLCHÓN',
    'CON ALIVIADERO VERTEDERO SIMPLE',
    'CON ALIVIADERO VERTEDERO DOBLE',
    'CON ALIVIADERO DE SALTO',
    'CON ALIVIADERO DE BARRERA',
    'CON ALIVIADERO LATERAL DOBLE',
    'CON ALIVIADERO LATERAL SENCILLO',
    'CON ALIVIADERO ORIFICIO'
  ],
  tipoTuberia: ['entrada', 'salida'],
  tipoSumidero: ['Rejilla', 'Buzón', 'Combinado', 'Lateral'],
  booleano: ['Sí', 'No', 'Si', 'No', 'Yes', 'No', 'true', 'false', '1', '0'],
};

/**
 * Intenta normalizar un valor a string de forma segura
 */
function safeStringValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }
  return String(value ?? '').trim();
}

/**
 * Detecta y mapea las columnas disponibles en los datos
 */
function detectColumns(data: Record<string, unknown>[], result: ExcelParseResult): Record<string, string> {
  const normalizedColumns: Record<string, string> = {};
  const allColumns = new Set<string>();

  // Recopilar todas las columnas posibles (escaneamos primeras 10 filas o todas)
  const rowsToScan = Math.min(data.length, 50);
  for (let i = 0; i < rowsToScan; i++) {
    const row = data[i];
    if (row && typeof row === 'object') {
      Object.keys(row).forEach(col => allColumns.add(col));
    }
  }

  // Intentar mapear cada columna encontrada
  Array.from(allColumns).forEach(col => {
    const normalized = normalizeColumnName(col);
    const mapped = COLUMN_MAPPING[normalized];

    if (mapped) {
      normalizedColumns[col] = mapped;
      if (!result.stats.columnsFound.includes(mapped)) {
        result.stats.columnsFound.push(mapped);
      }
    } else {
      if (!result.stats.columnsIgnored.includes(col)) {
        result.stats.columnsIgnored.push(col);
      }
    }
  });

  // Verificar columnas requeridas faltantes
  REQUIRED_COLUMNS.forEach(req => {
    if (!result.stats.columnsFound.includes(req)) {
      result.stats.columnsMissing.push(req);
    }
  });

  return normalizedColumns;
}

/**
 * Busca la fila de cabeceras si la primera no parece serlo
 * Algunas hojas tienen títulos o filas vacías al inicio.
 */
function findHeaderRow(data: any[]): number {
  if (!data || data.length === 0) return 0;

  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i];
    if (!row || typeof row !== 'object') continue;

    // Buscamos en los VALORES de la fila, ya que si la cabecera no se detectó,
    // estará como una fila de datos.
    const values = Object.values(row);
    let matches = 0;

    for (const val of values) {
      const normalized = normalizeColumnName(safeStringValue(val));
      if (COLUMN_MAPPING[normalized]) {
        matches++;
      }
    }

    // Si encontramos al menos 2 columnas conocidas, esta fila es la cabecera real
    // Retornamos i + 1 porque pozosData[0] es la fila 1 de la hoja (siendo fila 0 la cabecera detectada)
    if (matches >= 2) return i + 1;
  }

  return 0;
}

/**
 * Helper genérico para obtener valor mapped
 */
function getMappedValue(
  row: Record<string, unknown>,
  field: string,
  mapping: Record<string, string>,
  columnMap: Record<string, string> // Map colNameInRow -> mappedField
): string {
  // Buscar qué columna del row corresponde al field deseado
  // columnMap tiene: "Nombre Columna Excel" -> "idPozo"
  // Pero necesitamos ir al revés o buscar.

  // Estrategia: Iterar las keys del row. Si columnMap[key] == field, return value.
  for (const [colName, mappedField] of Object.entries(columnMap)) {
    if (mappedField === field) {
      const val = safeStringValue(row[colName]);
      if (val && val !== '') {
        return val;
      }
    }
  }
  return '';
}

/**
 * Procesa datos genéricos de una hoja (Tuberias, Sumideros, Fotos)
 */
function parseChildSheet<T>(
  data: Record<string, unknown>[],
  mapping: Record<string, string>,
  parser: (row: Record<string, unknown>, columnMap: Record<string, string>, index: number, result: ExcelParseResult) => T | null,
  result: ExcelParseResult,
  sheetName: string
): T[] {
  const items: T[] = [];

  // Detect columns for this specific sheet/mapping
  const columnMap: Record<string, string> = {};
  const allColumns = new Set<string>();
  data.forEach(row => {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach(col => allColumns.add(col));
    }
  });

  Array.from(allColumns).forEach(col => {
    const normalized = normalizeColumnName(col);
    const mapped = mapping[normalized];
    if (mapped) {
      columnMap[col] = mapped;
      if (!result.stats.columnsFound.includes(mapped + ` (${sheetName})`)) {
        // Marcamos que encontramos esta columna (con sufijo para distinguir)
        // result.stats.columnsFound.push(mapped + ` (${sheetName})`);
      }
    }
  });

  data.forEach((row, index) => {
    try {
      const item = parser(row, columnMap, index, result);
      if (item) {
        items.push(item);
      }
    } catch (error) {
      // Silent fail or log?
      // result.warnings.push(`Error parsing ${sheetName} row ${index}: ${error}`);
    }
  });

  return items;
}

/**
 * Parsea datos de Excel (ya convertidos a JSON por xlsx)
 * 
 * Diseño fail-safe:
 * - Nunca lanza excepciones
 * - Siempre retorna un resultado válido
 * - Ignora columnas desconocidas (Req 1.8)
 * - Usa valores por defecto para campos faltantes (Req 1.9)
 */
export function parseExcelData(data: unknown): ExcelParseResult {
  const result = createEmptyResult();

  // Validación de entrada - fail-safe
  if (!data) {
    result.errors.push('No se proporcionaron datos para procesar');
    result.parseErrors.push({
      type: ErrorType.DATA,
      severity: ErrorSeverity.ERROR,
      message: 'Input data is null or undefined',
      userMessage: 'No se proporcionaron datos para procesar',
    });
    return result;
  }

  if (!Array.isArray(data)) {
    result.errors.push('El formato de datos no es válido (se esperaba un array)');
    result.parseErrors.push({
      type: ErrorType.DATA,
      severity: ErrorSeverity.ERROR,
      message: 'Input data is not an array',
      userMessage: 'El formato de datos no es válido',
    });
    return result;
  }

  if (data.length === 0) {
    result.warnings.push('El archivo no contiene datos');
    result.parseErrors.push({
      type: ErrorType.DATA,
      severity: ErrorSeverity.WARNING,
      message: 'Empty data array',
      userMessage: 'El archivo no contiene datos',
    });
    return result;
  }

  result.stats.totalRows = data.length;

  // Detectar y mapear columnas
  const columnMapping = detectColumns(data as Record<string, unknown>[], result);

  // Advertir sobre columnas faltantes (Requirement 1.9)
  if (result.stats.columnsMissing.length > 0) {
    const msg = `Columnas requeridas faltantes: ${result.stats.columnsMissing.join(', ')}. Se usarán valores por defecto.`;
    result.warnings.push(msg);
    result.parseErrors.push({
      type: ErrorType.DATA,
      severity: ErrorSeverity.WARNING,
      message: `Missing required columns: ${result.stats.columnsMissing.join(', ')}`,
      userMessage: msg,
    });
  }

  // Informar sobre columnas ignoradas (Requirement 1.8)
  if (result.stats.columnsIgnored.length > 0) {
    const msg = `Columnas no reconocidas (ignoradas): ${result.stats.columnsIgnored.join(', ')}`;
    result.warnings.push(msg);
  }

  // Procesar cada fila
  (data as Record<string, unknown>[]).forEach((row, index) => {
    try {
      const pozo = parseRow(row, columnMapping, index, result);
      if (pozo) {
        result.pozos.push(pozo);
        result.stats.validRows++;
      } else {
        result.stats.skippedRows++;
      }
    } catch (error) {
      // Capturar cualquier error inesperado - fail-safe
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      result.warnings.push(`Fila ${index + 2}: Error al procesar - ${errorMsg}`);
      result.parseErrors.push({
        type: ErrorType.SYSTEM,
        severity: ErrorSeverity.WARNING,
        message: `Row ${index + 2} parsing error: ${errorMsg}`,
        userMessage: `Error al procesar fila ${index + 2}`,
        row: index + 2,
      });
      result.stats.skippedRows++;
    }
  });

  // Resumen final
  if (result.stats.validRows === 0 && result.stats.totalRows > 0) {
    result.errors.push('No se pudo extraer ningún pozo válido de los datos');
    result.parseErrors.push({
      type: ErrorType.DATA,
      severity: ErrorSeverity.ERROR,
      message: 'No valid pozos extracted',
      userMessage: 'No se encontraron pozos válidos en el archivo',
    });
  }

  return result;
}

/**
 * Parsea una fila individual de datos
 * Valida campos obligatorios, coordenadas, y valores predefinidos
 */
function parseRow(
  row: Record<string, unknown>,
  columnMapping: Record<string, string>,
  index: number,
  result: ExcelParseResult
): Pozo | null {
  if (!row || typeof row !== 'object') {
    return null;
  }

  /**
   * Obtiene el valor de un campo con fallback a string vacío
   */
  const getValue = (field: string): string => {
    for (const [col, mapped] of Object.entries(columnMapping)) {
      if (mapped === field) {
        const rawValue = row[col];
        return safeStringValue(rawValue);
      }
    }
    return '';
  };

  // ============================================================================
  // VALIDACIÓN DE CAMPOS OBLIGATORIOS
  // ============================================================================

  const idPozo = getValue('idPozo');
  if (!idPozo) {
    result.parseErrors.push({
      type: ErrorType.DATA,
      severity: ErrorSeverity.WARNING,
      message: `Row ${index + 2}: Missing required field idPozo`,
      userMessage: `Fila ${index + 2}: Falta el ID del pozo`,
      row: index + 2,
    });
    return null;
  }

  let fecha = getValue('fecha');
  let fechaNormalizada = normalizeDateValue(fecha);
  if (!isValidDate(fechaNormalizada)) {
    result.warnings.push(`Fila ${index + 2}: Fecha inválida o faltante - se usará la fecha actual`);
    fechaNormalizada = new Date().toISOString().split('T')[0];
  }

  let levanto = getValue('levanto');
  if (!levanto) {
    result.warnings.push(`Fila ${index + 2}: Falta el inspector (levantó) - se usará por defecto`);
    levanto = 'No indicado';
  }

  let estado = getValue('estado');
  if (!estado) {
    result.warnings.push(`Fila ${index + 2}: Falta el estado del pozo - se usará por defecto`);
    estado = 'No indicado';
  }

  // ============================================================================
  // VALIDACIÓN DE COORDENADAS (OPCIONALES PERO SI SE PROPORCIONAN DEBEN SER VÁLIDAS)
  // ============================================================================

  const coordenadaX = getValue('coordenadaX');
  if (!isValidCoordinate(coordenadaX, false)) {
    result.parseErrors.push({
      type: ErrorType.DATA,
      severity: ErrorSeverity.WARNING,
      message: `Row ${index + 2}: Invalid coordinate X (longitude)`,
      userMessage: `Fila ${index + 2}: Coordenada X inválida (debe estar entre -180 y 180)`,
      row: index + 2,
      field: 'coordenadaX',
      value: coordenadaX,
    });
    // No retornar null, solo advertir - las coordenadas son opcionales
  }

  const coordenadaY = getValue('coordenadaY');
  if (!isValidCoordinate(coordenadaY, true)) {
    result.parseErrors.push({
      type: ErrorType.DATA,
      severity: ErrorSeverity.WARNING,
      message: `Row ${index + 2}: Invalid coordinate Y (latitude)`,
      userMessage: `Fila ${index + 2}: Coordenada Y inválida (debe estar entre -90 y 90)`,
      row: index + 2,
      field: 'coordenadaY',
      value: coordenadaY,
    });
    // No retornar null, solo advertir - las coordenadas son opcionales
  }

  // ============================================================================
  // VALIDACIÓN DE CAMPOS NUMÉRICOS POSITIVOS
  // ============================================================================

  const profundidad = getValue('profundidad');
  if (!isPositiveNumber(profundidad) && profundidad) {
    result.parseErrors.push({
      type: ErrorType.DATA,
      severity: ErrorSeverity.WARNING,
      message: `Row ${index + 2}: Invalid profundidad (must be > 0)`,
      userMessage: `Fila ${index + 2}: Profundidad debe ser un número positivo`,
      row: index + 2,
      field: 'profundidad',
      value: profundidad,
    });
  }

  const diametroCilindro = getValue('diametroCilindro');
  if (!isPositiveNumber(diametroCilindro) && diametroCilindro) {
    result.parseErrors.push({
      type: ErrorType.DATA,
      severity: ErrorSeverity.WARNING,
      message: `Row ${index + 2}: Invalid diametroCilindro (must be > 0)`,
      userMessage: `Fila ${index + 2}: Diámetro del cilindro debe ser un número positivo`,
      row: index + 2,
      field: 'diametroCilindro',
      value: diametroCilindro,
    });
  }

  const numeroPeldanos = getValue('numeroPeldanos');
  if (!isPositiveNumber(numeroPeldanos) && numeroPeldanos) {
    result.parseErrors.push({
      type: ErrorType.DATA,
      severity: ErrorSeverity.WARNING,
      message: `Row ${index + 2}: Invalid numeroPeldanos (must be > 0)`,
      userMessage: `Fila ${index + 2}: Número de peldaños debe ser un número positivo`,
      row: index + 2,
      field: 'numeroPeldanos',
      value: numeroPeldanos,
    });
  }

  const elevacion = getValue('elevacion');
  if (elevacion && isNaN(parseFloat(elevacion))) {
    result.parseErrors.push({
      type: ErrorType.DATA,
      severity: ErrorSeverity.WARNING,
      message: `Row ${index + 2}: Invalid elevacion (must be a number)`,
      userMessage: `Fila ${index + 2}: Elevación debe ser un número`,
      row: index + 2,
      field: 'elevacion',
      value: elevacion,
    });
  }

  // ============================================================================
  // VALIDACIÓN DE VALORES PREDEFINIDOS
  // ============================================================================

  if (estado && !isValidPredefinedValue(estado, PREDEFINED_VALUES.estado)) {
    result.parseErrors.push({
      type: ErrorType.DATA,
      severity: ErrorSeverity.WARNING,
      message: `Row ${index + 2}: Invalid estado value`,
      userMessage: `Fila ${index + 2}: Estado debe ser uno de: ${PREDEFINED_VALUES.estado.join(', ')}`,
      row: index + 2,
      field: 'estado',
      value: estado,
    });
  }

  // ============================================================================
  // VALIDACIONES DE NEGOCIO (CONDICIONALES)
  // ============================================================================

  const existeTapa = getValue('existeTapa');
  const estadoTapa = getValue('estadoTapa');
  if (existeTapa && existeTapa.toLowerCase() === 'sí' && !estadoTapa) {
    result.parseErrors.push({
      type: ErrorType.DATA,
      severity: ErrorSeverity.WARNING,
      message: `Row ${index + 2}: If existe_tapa=Sí, estado_tapa is required`,
      userMessage: `Fila ${index + 2}: Si existe tapa, el estado de la tapa es obligatorio`,
      row: index + 2,
      field: 'estadoTapa',
    });
  }

  const existeCilindro = getValue('existeCilindro');
  if (existeCilindro && existeCilindro.toLowerCase() === 'sí' && !diametroCilindro) {
    result.parseErrors.push({
      type: ErrorType.DATA,
      severity: ErrorSeverity.WARNING,
      message: `Row ${index + 2}: If existe_cilindro=Sí, diametro_cilindro is required`,
      userMessage: `Fila ${index + 2}: Si existe cilindro, el diámetro es obligatorio`,
      row: index + 2,
      field: 'diametroCilindro',
    });
  }

  const existePeldanos = getValue('existePeldanos');
  if (existePeldanos && existePeldanos.toLowerCase() === 'sí' && !numeroPeldanos) {
    result.parseErrors.push({
      type: ErrorType.DATA,
      severity: ErrorSeverity.WARNING,
      message: `Row ${index + 2}: If existe_peldanos=Sí, numero_peldanos is required`,
      userMessage: `Fila ${index + 2}: Si existen peldaños, la cantidad es obligatoria`,
      row: index + 2,
      field: 'numeroPeldanos',
    });
  }

  // ============================================================================
  // CONSTRUCCIÓN DEL OBJETO POZO CON TODOS LOS 33 CAMPOS
  // ============================================================================

  // Generar ID único para el pozo
  const uniqueId = `pozo-${idPozo}-${Date.now()}-${index}`;

  const pozo: Pozo = {
    id: uniqueId,
    // --- CAPA PLANA (Poblada directamente) ---
    idPozo: { value: idPozo, source: 'excel' },
    coordenadaX: { value: coordenadaX, source: 'excel' },
    coordenadaY: { value: coordenadaY, source: 'excel' },
    fecha: { value: fechaNormalizada, source: 'excel' },
    levanto: { value: levanto, source: 'excel' },
    estado: { value: estado, source: 'excel' },
    direccion: { value: getValue('direccion'), source: 'excel' },
    barrio: { value: getValue('barrio'), source: 'excel' },
    elevacion: { value: elevacion, source: 'excel' },
    profundidad: { value: profundidad, source: 'excel' },
    sistema: { value: getValue('sistema'), source: 'excel' },
    anoInstalacion: { value: getValue('anoInstalacion'), source: 'excel' },
    tipoCamara: { value: getValue('tipoCamara'), source: 'excel' },
    estructuraPavimento: { value: getValue('estructuraPavimento'), source: 'excel' },
    existeTapa: { value: existeTapa, source: 'excel' },
    materialTapa: { value: getValue('materialTapa'), source: 'excel' },
    estadoTapa: { value: estadoTapa, source: 'excel' },
    existeCono: { value: getValue('existeCono'), source: 'excel' },
    tipoCono: { value: getValue('tipoCono'), source: 'excel' },
    materialCono: { value: getValue('materialCono'), source: 'excel' },
    estadoCono: { value: getValue('estadoCono'), source: 'excel' },
    existeCilindro: { value: existeCilindro, source: 'excel' },
    diametroCilindro: { value: diametroCilindro, source: 'excel' },
    materialCilindro: { value: getValue('materialCilindro'), source: 'excel' },
    estadoCilindro: { value: getValue('estadoCilindro'), source: 'excel' },
    existeCanuela: { value: getValue('existeCanuela'), source: 'excel' },
    materialCanuela: { value: getValue('materialCanuela'), source: 'excel' },
    estadoCanuela: { value: getValue('estadoCanuela'), source: 'excel' },
    estadoCaniuela: { value: getValue('estadoCanuela'), source: 'excel' }, // Duplicado para alias
    existePeldanos: { value: existePeldanos, source: 'excel' },
    materialPeldanos: { value: getValue('materialPeldanos'), source: 'excel' },
    numeroPeldanos: { value: numeroPeldanos, source: 'excel' },
    estadoPeldanos: { value: getValue('estadoPeldanos'), source: 'excel' },
    observacionesPozo: { value: getValue('observaciones'), source: 'excel' },

    // --- CAPA JERÁRQUICA (Mantener para compatibilidad) ---
    identificacion: {
      idPozo: { value: idPozo, source: 'excel' },
      coordenadaX: { value: coordenadaX, source: 'excel' },
      coordenadaY: { value: coordenadaY, source: 'excel' },
      fecha: { value: fechaNormalizada, source: 'excel' },
      levanto: { value: levanto, source: 'excel' },
      estado: { value: estado, source: 'excel' },
    },
    ubicacion: {
      direccion: { value: getValue('direccion'), source: 'excel' },
      barrio: { value: getValue('barrio'), source: 'excel' },
      elevacion: { value: elevacion, source: 'excel' },
      profundidad: { value: profundidad, source: 'excel' },
    },
    componentes: {
      existeTapa: { value: existeTapa, source: 'excel' },
      estadoTapa: { value: estadoTapa, source: 'excel' },
      existeCilindro: { value: existeCilindro, source: 'excel' },
      diametroCilindro: { value: diametroCilindro, source: 'excel' },
      sistema: { value: getValue('sistema'), source: 'excel' },
      anoInstalacion: { value: getValue('anoInstalacion'), source: 'excel' },
      tipoCamara: { value: getValue('tipoCamara'), source: 'excel' },
      estructuraPavimento: { value: getValue('estructuraPavimento'), source: 'excel' },
      materialTapa: { value: getValue('materialTapa'), source: 'excel' },
      existeCono: { value: getValue('existeCono'), source: 'excel' },
      tipoCono: { value: getValue('tipoCono'), source: 'excel' },
      materialCono: { value: getValue('materialCono'), source: 'excel' },
      estadoCono: { value: getValue('estadoCono'), source: 'excel' },
      materialCilindro: { value: getValue('materialCilindro'), source: 'excel' },
      estadoCilindro: { value: getValue('estadoCilindro'), source: 'excel' },
      existeCanuela: { value: getValue('existeCanuela'), source: 'excel' },
      materialCanuela: { value: getValue('materialCanuela'), source: 'excel' },
      estadoCanuela: { value: getValue('estadoCanuela'), source: 'excel' },
      existePeldanos: { value: existePeldanos, source: 'excel' },
      materialPeldanos: { value: getValue('materialPeldanos'), source: 'excel' },
      numeroPeldanos: { value: numeroPeldanos, source: 'excel' },
      estadoPeldanos: { value: getValue('estadoPeldanos'), source: 'excel' },
    },
    observaciones: {
      observaciones: { value: getValue('observaciones'), source: 'excel' },
    },
    tuberias: { tuberias: [] },
    sumideros: { sumideros: [] },
    fotos: { fotos: [] },
    metadata: createDefaultMetadata(),
  };

  return pozo;
}

/**
 * Parsea un archivo Excel desde un ArrayBuffer
 * Wrapper de alto nivel que maneja la conversión xlsx -> JSON -> Pozo[]
 */
export async function parseExcelFile(buffer: ArrayBuffer): Promise<ExcelParseResult> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array' });
  return parseExcelFileContent(workbook);
}

/**
 * Parsea el contenido de un libro de Excel ya cargado
 * Útil para ejecutar dentro de un Web Worker
 */
export async function parseExcelFileContent(workbook: any): Promise<ExcelParseResult> {
  const XLSX = await import('xlsx');
  const result = createEmptyResult();

  try {
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      result.errors.push('El archivo Excel no contiene hojas de datos');
      return result;
    }

    // 1. Identificar hojas
    const sheetNames = workbook.SheetNames.map((s: string) => s.toLowerCase());

    const findSheet = (keywords: string[]) =>
      workbook.SheetNames.find((name: string) => keywords.some(k => name.toLowerCase().includes(k)));

    const pozosSheetName = findSheet(['pozo', 'fichas', 'general']) || workbook.SheetNames[0];
    const tuberiasSheetName = findSheet(['tuberia', 'tubería', 'conducto']);
    const sumiderosSheetName = findSheet(['sumidero', 'sifón', 'sifon']);
    const fotosSheetName = findSheet(['foto', 'imagen', 'img']);

    // 2. Parsear POZOS (Main)
    const pozosWorksheet = workbook.Sheets[pozosSheetName];
    if (!pozosWorksheet) {
      result.errors.push('No se encontró la hoja de POZOS');
      return result;
    }

    let pozosData = XLSX.utils.sheet_to_json(pozosWorksheet, { defval: '', raw: false }) as any[];

    // Robustez: Si la primera fila no parece tener las columnas correctas,
    // buscamos en las primeras 10 filas cuál contiene las cabeceras.
    const headerRowOffset = findHeaderRow(pozosData);
    if (headerRowOffset > 0) {
      pozosData = XLSX.utils.sheet_to_json(pozosWorksheet, { range: headerRowOffset, defval: '', raw: false });
    }

    const partialResult = parseExcelData(pozosData);

    // Merge results
    result.pozos = partialResult.pozos;
    result.warnings.push(...partialResult.warnings);
    result.errors.push(...partialResult.errors);
    result.parseErrors.push(...partialResult.parseErrors);
    result.stats = partialResult.stats;

    const pozosMap = new Map<string, Pozo>();
    result.pozos.forEach(p => pozosMap.set(p.identificacion.idPozo.value, p));

    // 3. Parsear TUBERIAS (Soporta múltiples hojas como Tuberias_entrada, Tuberias_salida)
    const tuberiasSheetNames = workbook.SheetNames.filter((name: string) =>
      ['tuberia', 'tubería', 'conducto'].some(k => name.toLowerCase().includes(k))
    );

    tuberiasSheetNames.forEach((tbSheetName: string) => {
      const tbData = XLSX.utils.sheet_to_json(workbook.Sheets[tbSheetName], { defval: '', raw: false }) as Record<string, unknown>[];
      const tuberias = parseChildSheet(tbData, TUBERIA_MAPPING, parseTuberiaRow, result, tbSheetName);

      tuberias.forEach(tub => {
        const pId = tub.idPozo?.value;
        const pozo = pozosMap.get(pId);
        if (pozo) {
          pozo.tuberias.tuberias.push(tub);
        } else if (pId) {
          result.warnings.push(`Tubería ${tub.idTuberia.value} huérfana en hoja ${tbSheetName} (Pozo ${pId} no encontrado)`);
        }
      });
    });

    // 4. Parsear SUMIDEROS
    if (sumiderosSheetName && workbook.Sheets[sumiderosSheetName]) {
      const smData = XLSX.utils.sheet_to_json(workbook.Sheets[sumiderosSheetName], { defval: '', raw: false }) as Record<string, unknown>[];
      const sumideros = parseChildSheet(smData, SUMIDERO_MAPPING, parseSumideroRow, result, 'SUMIDEROS');

      sumideros.forEach(sum => {
        const pId = sum.idPozo?.value;
        const pozo = pozosMap.get(pId);
        if (pozo) {
          pozo.sumideros.sumideros.push(sum);
        } else {
          result.warnings.push(`Sumidero ${sum.idSumidero.value} huérfano (Pozo ${pId} no encontrado)`);
        }
      });
    }

    // 5. Parsear FOTOS
    if (fotosSheetName && workbook.Sheets[fotosSheetName]) {
      const ftData = XLSX.utils.sheet_to_json(workbook.Sheets[fotosSheetName], { defval: '', raw: false }) as Record<string, unknown>[];
      const fotos = parseChildSheet(ftData, FOTO_MAPPING, parseFotoRow, result, 'FOTOS');

      fotos.forEach(foto => {
        const pId = foto.idPozo;
        const pozo = pozosMap.get(pId);
        if (pozo) {
          pozo.fotos.fotos.push(foto);
        } else {
          result.warnings.push(`Foto ${foto.id} huérfana (Pozo ${pId} no encontrado)`);
        }
      });
    }

    return result;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    result.errors.push(`Error crítico al procesar Excel: ${errorMsg}`);
    return result;
  }
}

// ---- Parsers de filas individuales de hijos ----

import { TuberiaInfo, SumideroInfo, FotoInfo } from '@/types/pozo';

export function parseTuberiaRow(row: Record<string, unknown>, map: Record<string, string>, index: number, result: ExcelParseResult): TuberiaInfo | null {
  const getValue = (f: string) => getMappedValue(row, f, TUBERIA_MAPPING, map);

  const idPozo = getValue('idPozo');
  if (!idPozo) return null; // Orphan or generic row

  return {
    idTuberia: { value: getValue('idTuberia') || `TUB-${index}`, source: 'excel' },
    idPozo: { value: idPozo, source: 'excel' },
    tipoTuberia: { value: getValue('tipoTuberia'), source: 'excel' },
    diametro: { value: getValue('diametro'), source: 'excel' },
    material: { value: getValue('material'), source: 'excel' },
    cota: { value: getValue('cota'), source: 'excel' },
    estado: { value: getValue('estado'), source: 'excel' },
    emboquillado: { value: getValue('emboquillado'), source: 'excel' },
    longitud: { value: getValue('longitud'), source: 'excel' },
  };
}

export function parseSumideroRow(row: Record<string, unknown>, map: Record<string, string>, index: number, result: ExcelParseResult): SumideroInfo | null {
  const getValue = (f: string) => getMappedValue(row, f, SUMIDERO_MAPPING, map);

  const idPozo = getValue('idPozo');
  if (!idPozo) return null;

  return {
    idSumidero: { value: getValue('idSumidero') || `SUM-${index}`, source: 'excel' },
    idPozo: { value: idPozo, source: 'excel' },
    tipoSumidero: { value: getValue('tipoSumidero'), source: 'excel' },
    numeroEsquema: { value: getValue('numeroEsquema'), source: 'excel' },
    diametro: { value: getValue('diametro'), source: 'excel' },
    materialTuberia: { value: getValue('materialTuberia'), source: 'excel' },
    alturaSalida: { value: getValue('alturaSalida'), source: 'excel' },
    alturaLlegada: { value: getValue('alturaLlegada'), source: 'excel' },
  };
}

export function parseFotoRow(row: Record<string, unknown>, map: Record<string, string>, index: number, result: ExcelParseResult): FotoInfo | null {
  const getValue = (f: string) => getMappedValue(row, f, FOTO_MAPPING, map);

  const idPozoValue = getValue('idPozo');
  if (!idPozoValue) return null;

  return {
    id: getValue('idFoto') || `FOTO-${index}`,
    idPozo: idPozoValue,
    tipo: getValue('tipoFoto') || 'otro',
    categoria: 'OTRO', // Se mapeará después por nomenclatura si es necesario
    blobId: '', // No hay blob todavía en esta fase
    filename: getValue('rutaArchivo') || '',
    descripcion: getValue('descripcion') || '',
  } as any; // Cast temporal mientras normalizamos
}

/**
 * Valida si un archivo es un Excel válido por su extensión
 */
export function isValidExcelFile(filename: string): boolean {
  if (!filename || typeof filename !== 'string') return false;
  const ext = filename.toLowerCase().split('.').pop();
  return ext === 'xlsx' || ext === 'xls' || ext === 'xlsm';
}

/**
 * Obtiene estadísticas resumidas del resultado del parsing
 */
export function getParseResultSummary(result: ExcelParseResult): string {
  const { stats } = result;
  const parts: string[] = [];

  parts.push(`${stats.validRows} pozos válidos de ${stats.totalRows} filas`);

  if (stats.skippedRows > 0) {
    parts.push(`${stats.skippedRows} filas omitidas`);
  }

  if (stats.columnsIgnored.length > 0) {
    parts.push(`${stats.columnsIgnored.length} columnas ignoradas`);
  }

  if (stats.fieldsWithDefaults.length > 0) {
    parts.push(`${stats.fieldsWithDefaults.length} campos con valores por defecto`);
  }

  return parts.join(', ');
}

export {
  createDefaultMetadata,
  createEmptyResult,
  normalizeColumnName,
  safeStringValue,
  isValidCoordinate,
  isPositiveNumber,
  isValidDate,
  normalizeDateValue,
  isValidPredefinedValue,
  COLUMN_MAPPING,
  REQUIRED_COLUMNS,
  EXPECTED_FIELDS,
  PREDEFINED_VALUES,
  TUBERIA_MAPPING,
  SUMIDERO_MAPPING,
  FOTO_MAPPING,
};
