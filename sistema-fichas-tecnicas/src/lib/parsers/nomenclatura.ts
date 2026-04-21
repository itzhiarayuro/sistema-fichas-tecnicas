/**
 * Parser de nomenclatura de fotos para pozos de inspección
 * Rules updated based on user request (Feb 2024)
 */

export interface NomenclaturaResult {
  pozoId: string;
  categoria: 'PRINCIPAL' | 'ENTRADA' | 'SALIDA' | 'SUMIDERO' | 'DESCARGA' | 'OTRO';
  subcategoria: string;
  tipo: string;
  isValid: boolean;
  error?: string;
}

const TIPO_DESCRIPCION: Record<string, string> = {
  P: 'Panorámica',
  I: 'Interna',
  T: 'Tapa',
  A: 'Acceso',
  F: 'Fondo',
  M: 'Medición',
  L: 'Esquema Localización',
};

export function parseNomenclatura(filename: string): NomenclaturaResult[] {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').trim();

  if (!nameWithoutExt) {
    return [createInvalidResult(filename, 'Nombre de archivo vacío')];
  }

  // 1. Caso especial ARGIS
  if (nameWithoutExt.toUpperCase().endsWith('_ARGIS')) {
    const pId = nameWithoutExt.toUpperCase().replace('_ARGIS', '');
    return [{
      pozoId: pId,
      categoria: 'PRINCIPAL',
      subcategoria: 'L',
      tipo: TIPO_DESCRIPCION['L'],
      isValid: true,
    }];
  }

  const sections = nameWithoutExt.split('-');
  const rawFirst = sections[0].toUpperCase();
  const restParts = sections.slice(1).map(p => p.toUpperCase().trim());

  // --- OMISIÓN (Caso Omiso) ---
  const omitKeywords = ['AT', 'DESCOLE', 'II', 'TT'];
  if (omitKeywords.includes(rawFirst) || restParts.some(p => omitKeywords.includes(p))) {
    return [createInvalidResult(filename, 'Caso omiso (Keywords)')];
  }

  // --- ANALIZAR POZO ID Y COMPONENTES ---
  let pozoId = rawFirst;
  let entradaNum: string | null = null;
  let salidaNum: string | null = null;
  let sumideroNum: string | null = null;
  let isTapa = false;
  let isInterior = false;
  let isPanoramica = false;

  // Si el primer bloque es un código técnico (ej: P.jpg, E1-T.jpg, S-T.jpg)
  // lo tratamos como componente si no hay más secciones
  const handleTechnicalPart = (part: string, isFirst: boolean) => {
    // Especial: S-P -> Panoramica
    if (isFirst && part === 'S' && restParts.includes('P')) {
      isPanoramica = true;
      return true;
    }

    const eMatch = part.match(/^E(\d*)$/);
    if (eMatch) {
      entradaNum = eMatch[1] || '1';
      return true;
    }

    const sMatch = part.match(/^S(\d*)$/);
    if (sMatch) {
      // Si empieza por S y tiene 3+ dígitos, es un PozoId de Sumidero (ej: S510)
      if (isFirst && part.length >= 4) {
        // No lo tratamos como Salida, se queda como PozoId
        return false;
      }
      salidaNum = sMatch[1] || '1';
      return true;
    }

    const sumMatch = part.match(/^SUM(\d*)$/);
    if (sumMatch) {
      sumideroNum = sumMatch[1] || '1';
      return true;
    }

    if (part === 'P') { isPanoramica = true; return true; }
    if (part === 'I') { isInterior = true; return true; }
    if (part === 'T') { isTapa = true; return true; }

    return false;
  };

  // Si el nombre tiene pocos bloques o detectamos códigos técnicos al inicio
  // Ejemplo: "E1-T" -> pozoId se vuelve vacío o queda para ser asignado luego
  // Pero según el sistema, la primera parte SIEMPRE es el PozoId.
  // Si el usuario sube "M680-E1-T", pozoId = "M680".
  // Si sube "E1-T", pozoId = "E1". Esto es un problema porque "E1" no existe como pozo.
  // Asumiremos que si el primer bloque es puramente técnico y restParts está vacío o tiene 'T',
  // el usuario podría estar subiendo archivos sin prefijo de pozo.
  // Sin embargo, el SmartFilter filtraría esto.

  // Procesar todas las partes del resto
  restParts.forEach(p => handleTechnicalPart(p, false));

  // --- REGLA SUMIDERO DIRECTO (S510-T) ---
  // Si el PozoID empieza por S (sumidero identificado en Excel) y tiene T, es la foto de ese sumidero.
  // Usamos SUM1 como subcategoría para que el sistema lo asocie al primer slot técnico disponible
  if (pozoId.startsWith('S') && pozoId.length >= 4 && (isTapa || restParts.includes('T')) && !entradaNum) {
    return [{
      pozoId,
      categoria: 'SUMIDERO',
      subcategoria: 'SUM1',
      tipo: 'Sumidero - Foto',
      isValid: true,
    }];
  }

  const results: NomenclaturaResult[] = [];

  // PRIORIDADES (Reglas de la tabla)
  if (entradaNum) {
    results.push({
      pozoId,
      categoria: 'ENTRADA',
      subcategoria: `E${entradaNum}`,
      tipo: `Entrada ${entradaNum} - Tubería`,
      isValid: true,
    });
  }

  if (salidaNum) {
    // Si la parte es S-P, ya se marcó isPanoramica al inicio del handleTechnicalPart
    if (!isPanoramica) {
      results.push({
        pozoId,
        categoria: 'SALIDA',
        subcategoria: `S${salidaNum}`,
        tipo: `Salida ${salidaNum} - Tubería`,
        isValid: true,
      });
    }
  }

  if (sumideroNum) {
    results.push({
      pozoId,
      categoria: 'SUMIDERO',
      subcategoria: `SUM${sumideroNum}`,
      tipo: `Sumidero ${sumideroNum}`,
      isValid: true,
    });
  }

  if (isPanoramica) {
    results.push({
      pozoId,
      categoria: 'PRINCIPAL',
      subcategoria: 'P',
      tipo: TIPO_DESCRIPCION['P'],
      isValid: true,
    });
  }

  if (isInterior) {
    results.push({
      pozoId,
      categoria: 'PRINCIPAL',
      subcategoria: 'I',
      tipo: TIPO_DESCRIPCION['I'],
      isValid: true,
    });
  }

  if (isTapa && results.length === 0) {
    results.push({
      pozoId,
      categoria: 'PRINCIPAL',
      subcategoria: 'T',
      tipo: TIPO_DESCRIPCION['T'],
      isValid: true,
    });
  }

  if (results.length > 0) return results;

  return [createInvalidResult(filename, `Nomenclatura no reconocida: ${filename}`)];
}

function createInvalidResult(filename: string, error: string): NomenclaturaResult {
  return { pozoId: '', categoria: 'OTRO', subcategoria: '', tipo: 'Desconocido', isValid: false, error };
}

export function buildNomenclatura(result: NomenclaturaResult): string {
  if (!result || !result.isValid || !result.pozoId) return '';
  if (result.categoria === 'PRINCIPAL' && result.subcategoria === 'L') return `${result.pozoId}_ARGIS`;
  return `${result.pozoId}-${result.subcategoria}`;
}

export function isValidNomenclatura(filename: string): boolean {
  return parseNomenclatura(filename).some(r => r.isValid);
}

export function getTiposPrincipales(): string[] { return Object.keys(TIPO_DESCRIPCION); }
export function getDescripcionTipo(codigo: string): string { return TIPO_DESCRIPCION[codigo.toUpperCase()] || codigo; }
