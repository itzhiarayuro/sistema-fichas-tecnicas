/**
 * Parser de nomenclatura de fotos para pozos de inspección
 * Requirements: 10.1-10.4
 * 
 * Patrones soportados:
 * - Principales: P (Panorámica), I (Interna), T (Tubería)
 * - Entradas: E1-T (Tubería entrada 1), E2-T, E3-T, etc.
 * - Salidas: S-T (Tubería salida), S1-T, S2-T, etc.
 * - Sumideros: SUM1, SUM2, etc.
 * 
 * Reglas de nomenclatura:
 * - Si termina en T = Tubería
 * - I = Interna
 * - P = Panorámica
 * - Si contiene E y T = Tubería (entrada)
 * - Si contiene S y T = Tubería (salida)
 * 
 * Formato general: {POZO_ID}-{TIPO}[-{SUBTIPO}]
 * Ejemplo: M680-P.jpg, M680-I.jpg, M680-T.jpg, M680-E1-T.jpg, M680-S-T.jpg, M680-SUM1.jpg
 */

export interface NomenclaturaResult {
  /** ID del pozo extraído del nombre */
  pozoId: string;
  /** Categoría de la foto */
  categoria: 'PRINCIPAL' | 'ENTRADA' | 'SALIDA' | 'SUMIDERO' | 'DESCARGA' | 'OTRO';
  /** Subcategoría específica (ej: E1-T, S-Z, SUM1, D1) */
  subcategoria: string;
  /** Descripción legible del tipo de foto */
  tipo: string;
  /** Si la nomenclatura es válida */
  isValid: boolean;
  /** Mensaje de error si no es válida */
  error?: string;
}

/**
 * Patrones de nomenclatura soportados
 * Cada patrón captura: [1] pozoId, [2] tipo, [3] subtipo (opcional)
 */
const PATTERNS = {
  // Fotos principales: M680-P (Panorámica), M680-I (Interna), M680-T (Tapa), M680-A/AT (Acceso), M680-F (Fondo), M680-M (Medición)
  PRINCIPAL: /^(.+)-([PITAFM]|AT)$/i,
  // Entradas con número: M680-E1, M680-E1-T, M680-E1-Z (Tubería o Zoom)
  ENTRADA: /^(.+)-(E\d+)(?:-[TZ])?$/i,
  // Salidas con número opcional: M680-S, M680-S1, M680-S1-T, etc.
  SALIDA_CON_NUMERO: /^(.+)-(S\d+)(?:-[TZ])?$/i,
  SALIDA_SIN_NUMERO: /^(.+)-(S)(?:-[TZ])?$/i,
  // Sumideros: M680-SUM1, M680-SUM2...
  SUMIDERO: /^(.+)-(SUM\d+)$/i,
  // Descargas: M680-D1, M680-DESC1...
  DESCARGA: /^(.+)-(D\d+|DESC\d*)$/i,
  // Esquema de localización: M680_ARGIS
  ARGIS: /^(.+)_ARGIS$/i,
};

/** Descripciones legibles para tipos de fotos principales */
const TIPO_DESCRIPCION: Record<string, string> = {
  P: 'Panorámica',
  I: 'Interna',
  T: 'Tapa',
  A: 'Acceso',
  F: 'Fondo',
  M: 'Medición',
  L: 'Esquema Localización',
};

/** Descripciones para subtipos de entradas/salidas */
const SUBTIPO_DESCRIPCION: Record<string, string> = {
  T: 'Tubería',
};

/**
 * Parsea el nombre de un archivo de foto según la nomenclatura
 * @param filename - Nombre del archivo (con o sin extensión)
 * @returns Resultado del parsing con información estructurada
 */
export function parseNomenclatura(filename: string): NomenclaturaResult {
  // Remover extensión si existe
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').trim();

  if (!nameWithoutExt) {
    return createInvalidResult(filename, 'Nombre de archivo vacío');
  }

  // Intentar patrón PRINCIPAL
  let match = nameWithoutExt.match(PATTERNS.PRINCIPAL);
  if (match) {
    let tipoCode = match[2].toUpperCase();
    if (tipoCode === 'AT') tipoCode = 'A'; // Normalizar Acceso Tapa -> Acceso
    return {
      pozoId: match[1].toUpperCase(),
      categoria: 'PRINCIPAL',
      subcategoria: tipoCode,
      tipo: TIPO_DESCRIPCION[tipoCode] || tipoCode,
      isValid: true,
    };
  }

  // Intentar patrón ENTRADA
  match = nameWithoutExt.match(PATTERNS.ENTRADA);
  if (match) {
    const entradaNum = match[2].toUpperCase();
    return {
      pozoId: match[1].toUpperCase(),
      categoria: 'ENTRADA',
      subcategoria: entradaNum, // Limpio: E1, E2...
      tipo: `Entrada ${entradaNum.slice(1)} - Tubería`,
      isValid: true,
    };
  }

  // Intentar patrón SALIDA con número
  match = nameWithoutExt.match(PATTERNS.SALIDA_CON_NUMERO);
  if (match) {
    const salidaNum = match[2].toUpperCase();
    return {
      pozoId: match[1].toUpperCase(),
      categoria: 'SALIDA',
      subcategoria: salidaNum, // Limpio: S1, S2...
      tipo: `Salida ${salidaNum.slice(1)} - Tubería`,
      isValid: true,
    };
  }

  // Intentar patrón SALIDA sin número
  match = nameWithoutExt.match(PATTERNS.SALIDA_SIN_NUMERO);
  if (match) {
    return {
      pozoId: match[1].toUpperCase(),
      categoria: 'SALIDA',
      subcategoria: `S1`, // Mapear S -> S1 automáticamente
      tipo: `Salida 1 - Tubería`,
      isValid: true,
    };
  }

  // Intentar patrón SUMIDERO
  match = nameWithoutExt.match(PATTERNS.SUMIDERO);
  if (match) {
    const sumideroId = match[2].toUpperCase();
    const numSumidero = sumideroId.replace('SUM', '');
    return {
      pozoId: match[1].toUpperCase(),
      categoria: 'SUMIDERO',
      subcategoria: sumideroId,
      tipo: `Sumidero ${numSumidero}`,
      isValid: true,
    };
  }

  // Intentar patrón DESCARGA
  match = nameWithoutExt.match(PATTERNS.DESCARGA);
  if (match) {
    const descId = match[2].toUpperCase();
    let subcat = descId;
    if (descId.startsWith('DESC')) {
      const num = descId.replace('DESC', '');
      subcat = num ? `D${num}` : 'D1';
    }
    return {
      pozoId: match[1].toUpperCase(),
      categoria: 'DESCARGA',
      subcategoria: subcat,
      tipo: `Descarga ${subcat.slice(1) || '1'}`,
      isValid: true,
    };
  }

  // Intentar patrón ARGIS
  match = nameWithoutExt.match(PATTERNS.ARGIS);
  if (match) {
    return {
      pozoId: match[1].toUpperCase(),
      categoria: 'PRINCIPAL',
      subcategoria: 'L',
      tipo: TIPO_DESCRIPCION['L'],
      isValid: true,
    };
  }

  // No coincide con ningún patrón
  return createInvalidResult(filename, `Nomenclatura no reconocida: ${filename}`);
}

/**
 * Crea un resultado inválido con valores por defecto
 */
function createInvalidResult(filename: string, error: string): NomenclaturaResult {
  return {
    pozoId: '',
    categoria: 'OTRO',
    subcategoria: '',
    tipo: 'Desconocido',
    isValid: false,
    error,
  };
}

/**
 * Reconstruye el nombre de archivo desde los componentes parseados
 * Usado para validar round-trip (Property 2)
 * @param result - Resultado de parseNomenclatura
 * @returns Nombre reconstruido sin extensión
 */
export function buildNomenclatura(result: NomenclaturaResult): string {
  if (!result.isValid || !result.pozoId) {
    return '';
  }

  switch (result.categoria) {
    case 'PRINCIPAL':
      if (result.subcategoria === 'L') {
        return `${result.pozoId}_ARGIS`;
      }
      return `${result.pozoId}-${result.subcategoria}`;
    case 'ENTRADA':
    case 'SALIDA':
      return `${result.pozoId}-${result.subcategoria}`;
    case 'SUMIDERO':
      return `${result.pozoId}-${result.subcategoria}`;
    case 'DESCARGA':
      return `${result.pozoId}-${result.subcategoria}`;
    default:
      return '';
  }
}

/**
 * Valida si un nombre de archivo sigue la nomenclatura
 * @param filename - Nombre del archivo a validar
 * @returns true si la nomenclatura es válida
 */
export function isValidNomenclatura(filename: string): boolean {
  return parseNomenclatura(filename).isValid;
}

/**
 * Obtiene todos los tipos de fotos principales soportados
 * @returns Array de códigos de tipos principales
 */
export function getTiposPrincipales(): string[] {
  return Object.keys(TIPO_DESCRIPCION);
}

/**
 * Obtiene la descripción de un tipo de foto principal
 * @param codigo - Código del tipo (P, T, I, A, F, M)
 * @returns Descripción legible o el código si no existe
 */
export function getDescripcionTipo(codigo: string): string {
  return TIPO_DESCRIPCION[codigo.toUpperCase()] || codigo;
}
