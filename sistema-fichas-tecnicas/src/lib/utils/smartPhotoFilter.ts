/**
 * smartPhotoFilter.ts
 * 
 * Motor de filtrado inteligente de fotos.
 * 
 * Flujo:
 *  1. Se carga el Excel → buildExpectedPhotoIndex(pozos) crea un índice
 *  2. Usuario arrastra 5.000 fotos
 *  3. filterPhotoFiles() descarta en <1ms las que no corresponden a ningún pozo
 *  4. Solo procesa las fotos que el sistema espera → 10x menos trabajo
 * 
 * No toca BlobStore, workers, ni PDF. Solo filtra antes de procesar.
 */

import type { Pozo } from '@/types';
import { parseNomenclatura } from '@/lib/parsers/nomenclatura';

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Foto que el sistema espera recibir para un pozo */
export interface FotoEsperada {
  pozoId: string;
  categoria: 'PRINCIPAL' | 'ENTRADA' | 'SALIDA' | 'SUMIDERO' | 'DESCARGA';
  subcategoria: string;       // Ej: "P", "E1", "S2", "SUM1"
  descripcion: string;        // Ej: "Panorámica", "Entrada 1", "Salida 2"
  obligatoria: boolean;       // true = foto clave de inspección
}

/** Resultado del filtrado de una tanda de archivos */
export interface FiltradoResult {
  /** Archivos que SÍ corresponden a pozos cargados — para procesar */
  aceptadas: File[];
  /** Archivos descartados porque su pozoId no existe en el Excel */
  descartadasPozoInexistente: File[];
  /** Archivos descartados porque no tienen nomenclatura válida */
  descartadasNomenclaturaInvalida: File[];
  /** Estadísticas del filtrado */
  stats: {
    total: number;
    aceptadas: number;
    descartadas: number;
    tiempoMs: number;
  };
}

/** Índice de fotos esperadas, construido desde los pozos del Excel */
export interface IndiceFotosEsperadas {
  /** Set de pozoIds conocidos — búsqueda O(1) */
  pozoIds: Set<string>;
  /** Fotos esperadas por pozoId */
  porPozo: Map<string, FotoEsperada[]>;
  /** Resolución de IDs de sumidero a su pozo padre y subcategoría técnica */
  sumideroResolution: Map<string, { pozoId: string; subcategoria: string }>;
  /** Total de fotos esperadas en todo el proyecto */
  totalEsperadas: number;
  /** Cuántos pozos tienen el índice */
  totalPozos: number;
}

// ─── Fotos estándar que se esperan de CUALQUIER pozo ─────────────────────────

const FOTOS_PRINCIPALES_SIEMPRE: Array<Omit<FotoEsperada, 'pozoId'>> = [
  { categoria: 'PRINCIPAL', subcategoria: 'P', descripcion: 'Panorámica', obligatoria: true },
  { categoria: 'PRINCIPAL', subcategoria: 'T', descripcion: 'Tapa', obligatoria: true },
  { categoria: 'PRINCIPAL', subcategoria: 'I', descripcion: 'Interior', obligatoria: true },
  { categoria: 'PRINCIPAL', subcategoria: 'A', descripcion: 'Acceso', obligatoria: false },
  { categoria: 'PRINCIPAL', subcategoria: 'F', descripcion: 'Fondo', obligatoria: false },
  { categoria: 'PRINCIPAL', subcategoria: 'M', descripcion: 'Medición', obligatoria: false },
];

// ─── Constructor del índice ───────────────────────────────────────────────────

/**
 * Construye el índice de fotos esperadas a partir de los pozos cargados.
 * 
 * Por cada pozo analiza:
 *  - Fotos principales siempre esperadas (P, T, I, A, F, M)
 *  - Entradas: una foto por cada tubería de entrada (E1, E2, E3...)
 *  - Salidas: una foto por cada tubería de salida (S1, S2, S3...)
 *  - Sumideros: una foto por cada sumidero (SUM1, SUM2...)
 * 
 * @param pozos - Map de pozos cargados desde el Excel
 * @returns Índice listo para filtrar
 */
export function buildExpectedPhotoIndex(pozos: Map<string, Pozo>): IndiceFotosEsperadas {
  const pozoIds = new Set<string>();
  const porPozo = new Map<string, FotoEsperada[]>();
  const sumideroResolution = new Map<string, { pozoId: string; subcategoria: string }>();
  let totalEsperadas = 0;

  for (const [, pozo] of pozos) {
    // Obtener el ID del pozo de forma segura (manejando FieldValue)
    const rawId = pozo.idPozo || pozo.identificacion?.idPozo || pozo.id || '';
    const pozoId = (typeof rawId === 'object' && rawId !== null && 'value' in rawId)
      ? String(rawId.value).trim().toUpperCase()
      : String(rawId).trim().toUpperCase();

    if (!pozoId) continue;

    pozoIds.add(pozoId);
    const fotosDeEstePozo: FotoEsperada[] = [];

    // 1. Fotos principales — siempre esperadas
    for (const f of FOTOS_PRINCIPALES_SIEMPRE) {
      fotosDeEstePozo.push({ pozoId, ...f });
    }

    // 2. Entradas — una foto por cada tubería de entrada
    const tuberias = (pozo.tuberias?.tuberias || []).filter(t => t !== null);
    const entradas = tuberias.filter(
      t => String(t.tipoTuberia?.value || '').toLowerCase().includes('entrada')
    );
    const salidas = tuberias.filter(
      t => String(t.tipoTuberia?.value || '').toLowerCase().includes('salida')
    );

    // Agrupar entradas por orden para asignar E1, E2, E3...
    entradas.forEach((_, i) => {
      const num = i + 1;
      fotosDeEstePozo.push({
        pozoId,
        categoria: 'ENTRADA',
        subcategoria: `E${num}`,
        descripcion: `Entrada ${num} - Tubería`,
        obligatoria: true,
      });
    });

    // Si no hay tuberías en el Excel pero el pozo existe, esperamos al menos E1
    if (entradas.length === 0) {
      fotosDeEstePozo.push({
        pozoId,
        categoria: 'ENTRADA',
        subcategoria: 'E1',
        descripcion: 'Entrada 1 - Tubería',
        obligatoria: false,
      });
    }

    // 3. Salidas — una foto por cada tubería de salida
    salidas.forEach((_, i) => {
      const num = i + 1;
      fotosDeEstePozo.push({
        pozoId,
        categoria: 'SALIDA',
        subcategoria: `S${num}`,
        descripcion: `Salida ${num} - Tubería`,
        obligatoria: true,
      });
    });

    if (salidas.length === 0) {
      fotosDeEstePozo.push({
        pozoId,
        categoria: 'SALIDA',
        subcategoria: 'S1',
        descripcion: 'Salida 1 - Tubería',
        obligatoria: false,
      });
    }

    // 4. Sumideros — una foto por cada sumidero
    const sumideros = (pozo.sumideros?.sumideros || []).filter(s => s !== null);
    sumideros.forEach((sum, i) => {
      const num = i + 1;
      const subcategoria = `SUM${num}`;

      // Añadir también el ID del sumidero al índice global para que no se filtre si el archivo empieza por su ID
      const sumId = sum.idSumidero?.value;
      if (sumId) {
        const normalizedSumId = String(sumId).trim().toUpperCase();
        pozoIds.add(normalizedSumId);
        // Guardamos cómo se debe resolver este ID de sumidero
        sumideroResolution.set(normalizedSumId, { pozoId, subcategoria });
      }

      fotosDeEstePozo.push({
        pozoId,
        categoria: 'SUMIDERO',
        subcategoria,
        descripcion: `Sumidero ${num}`,
        obligatoria: false,
      });
    });

    porPozo.set(pozoId, fotosDeEstePozo);
    totalEsperadas += fotosDeEstePozo.length;
  }

  return { pozoIds, porPozo, sumideroResolution, totalEsperadas, totalPozos: porPozo.size };
}

// ─── Filtro principal ─────────────────────────────────────────────────────────

/**
 * Filtra una lista de archivos de foto.
 * 
 * Solo pasan los archivos cuyo nombre de pozo existe en el índice.
 * El resto se descarta SIN PROCESAR — cero trabajo de worker, cero BlobStore.
 * 
 * @param files     - Archivos arrastrados por el usuario
 * @param indice    - Índice construido con buildExpectedPhotoIndex()
 * @returns Resultado con archivos aceptados y descartados
 */
export function filterPhotoFiles(files: File[], indice: IndiceFotosEsperadas): FiltradoResult {
  const inicio = performance.now();

  const aceptadas: File[] = [];
  const descartadasPozoInexistente: File[] = [];
  const descartadasNomenclaturaInvalida: File[] = [];

  for (const file of files) {
    // Ignorar archivos que no son imágenes
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      // No es imagen — dejar que el sistema normal lo maneje (puede ser Excel)
      aceptadas.push(file);
      continue;
    }

    // Parsear nomenclatura del nombre del archivo
    const nomenclaturas = parseNomenclatura(file.name);
    const primaryNomen = nomenclaturas[0];

    if (!primaryNomen.isValid || !primaryNomen.pozoId) {
      descartadasNomenclaturaInvalida.push(file);
      continue;
    }

    // Buscar en el índice — O(1) con Set
    // Si alguna de las nomenclaturas pertenece a un pozo conocido, lo aceptamos
    const exists = nomenclaturas.some(n => indice.pozoIds.has(n.pozoId));

    if (exists) {
      aceptadas.push(file);
    } else {
      descartadasPozoInexistente.push(file);
    }
  }

  const tiempoMs = Math.round(performance.now() - inicio);

  return {
    aceptadas,
    descartadasPozoInexistente,
    descartadasNomenclaturaInvalida,
    stats: {
      total: files.length,
      aceptadas: aceptadas.length,
      descartadas: descartadasPozoInexistente.length + descartadasNomenclaturaInvalida.length,
      tiempoMs,
    },
  };
}

// ─── Helpers de UI ───────────────────────────────────────────────────────────

/**
 * Genera un resumen legible del filtrado para mostrar al usuario.
 */
export function getFiltradoSummary(result: FiltradoResult, indice: IndiceFotosEsperadas): string {
  const { stats } = result;
  const lines: string[] = [];

  lines.push(`📂 ${stats.total} fotos arrastradas → ${stats.aceptadas} a procesar (${stats.tiempoMs}ms)`);

  if (stats.descartadas > 0) {
    lines.push(`⏭️ ${stats.descartadas} descartadas sin procesar:`);
    if (result.descartadasPozoInexistente.length > 0) {
      lines.push(`   • ${result.descartadasPozoInexistente.length} de pozos no encontrados en el Excel`);
    }
    if (result.descartadasNomenclaturaInvalida.length > 0) {
      lines.push(`   • ${result.descartadasNomenclaturaInvalida.length} con nombre no reconocido`);
    }
  }

  const cobertura = Math.min(100, Math.round((stats.aceptadas / Math.max(indice.totalEsperadas, 1)) * 100));
  lines.push(`✅ Cobertura: ${stats.aceptadas}/${indice.totalEsperadas} fotos esperadas (${cobertura}%)`);

  return lines.join('\n');
}

/**
 * Obtiene las fotos que faltan para un pozo específico.
 * Útil para mostrar al usuario qué fotos aún no se han cargado.
 */
export function getFotosFaltantes(
  pozoId: string,
  fotosYaCargadas: Set<string>, // Set de subcategorias ya cargadas para este pozo
  indice: IndiceFotosEsperadas
): FotoEsperada[] {
  const esperadas = indice.porPozo.get(pozoId.toUpperCase()) || [];
  return esperadas.filter(f => !fotosYaCargadas.has(f.subcategoria));
}
