/**
 * BatchProcessor - Procesamiento por lotes para evitar saturación
 * 
 * Procesa grandes cantidades de archivos en lotes pequeños
 * para evitar bloquear el navegador y saturar la memoria.
 * 
 * Optimizaciones v2:
 * - Usa requestIdleCallback entre lotes para no bloquear UI
 * - Libera referencias intermedias después de cada lote
 * - Reporta progreso con debounce para evitar re-renders excesivos
 */

export interface BatchProcessorOptions<T, R> {
  items: T[];
  batchSize?: number; // Tamaño del lote (default: 10)
  delayBetweenBatches?: number; // Delay en ms entre lotes (default: 100ms)
  processor: (item: T, index: number) => Promise<R>;
  onProgress?: (processed: number, total: number) => void;
  onBatchComplete?: (batchResults: R[], batchIndex: number) => void;
  /** Si true, no acumula todos los resultados (ahorra memoria para miles de items) */
  lowMemoryMode?: boolean;
}

export interface BatchProcessorResult<R> {
  results: R[];
  errors: Array<{ index: number; error: Error }>;
  totalProcessed: number;
  totalErrors: number;
}

/**
 * Espera a que el navegador esté idle usando requestIdleCallback
 * Fallback a setTimeout si no está disponible
 */
function waitForIdle(timeoutMs: number = 100): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: timeoutMs });
    } else {
      setTimeout(resolve, timeoutMs);
    }
  });
}

/**
 * Procesa items en lotes para evitar saturación
 */
export async function processBatch<T, R>(
  options: BatchProcessorOptions<T, R>
): Promise<BatchProcessorResult<R>> {
  const {
    items,
    batchSize = 10,
    delayBetweenBatches = 100,
    processor,
    onProgress,
    onBatchComplete,
    lowMemoryMode = false,
  } = options;

  // Importar memoryManager dinámicamente para evitar dependencias circulares
  const { memoryManager } = await import('@/lib/managers/memoryManager');

  const results: R[] = [];
  const errors: Array<{ index: number; error: Error }> = [];
  const totalItems = items.length;

  // Dividir en lotes
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  console.log(`📦 Procesando ${totalItems} items en ${batches.length} lotes de ${batchSize}${lowMemoryMode ? ' (modo bajo memoria)' : ''}`);

  // Variables para debounce de progreso (evitar re-renders excesivos)
  let lastProgressReport = 0;
  const PROGRESS_DEBOUNCE_MS = 250; // Reportar máximo cada 250ms

  const reportProgress = (processed: number) => {
    const now = Date.now();
    if (now - lastProgressReport >= PROGRESS_DEBOUNCE_MS || processed === totalItems) {
      lastProgressReport = now;
      onProgress?.(Math.min(processed, totalItems), totalItems);
    }
  };

  // Procesar cada lote
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    // Verificar memoria antes de procesar el lote
    if (!memoryManager.isSafeToProcess()) {
      console.warn(`⚠️ Memoria alta detectada. Pausando 2 segundos antes del lote ${batchIndex + 1}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Forzar garbage collection si es posible
      memoryManager.forceGarbageCollection();
    }

    // Ajustar parámetros dinámicamente según memoria
    const adjustedBatchSize = memoryManager.getRecommendedBatchSize(batchSize);
    const adjustedDelay = memoryManager.getRecommendedDelay(delayBetweenBatches);

    if (adjustedBatchSize !== batchSize) {
      const stats = memoryManager.getMemoryStats();
      console.log(`🔧 Ajustando tamaño de lote: ${batchSize} → ${adjustedBatchSize} (memoria: ${((stats?.usagePercentage || 0) * 100).toFixed(1)}%)`);
    }

    // Procesar items del lote en paralelo
    const batchResults: R[] = [];
    const batchPromises = batch.map(async (item, indexInBatch) => {
      const globalIndex = batchIndex * batchSize + indexInBatch;
      try {
        const result = await processor(item, globalIndex);
        batchResults.push(result);
        if (!lowMemoryMode) {
          results.push(result);
        }
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push({ index: globalIndex, error: err });
        console.error(`❌ Error procesando item ${globalIndex}:`, err);
        throw err;
      }
    });

    // Esperar a que termine el lote
    await Promise.allSettled(batchPromises);

    // Reportar progreso (con debounce)
    const processed = (batchIndex + 1) * batchSize;
    reportProgress(processed);
    onBatchComplete?.(batchResults, batchIndex);

    // Delay entre lotes usando idle callback para no bloquear UI
    if (batchIndex < batches.length - 1) {
      await waitForIdle(adjustedDelay);
    }
  }

  // Reporte final de progreso
  reportProgress(totalItems);

  console.log(`✅ Procesamiento completo: ${lowMemoryMode ? '(low memory mode)' : results.length + ' exitosos'}, ${errors.length} errores`);

  return {
    results,
    errors,
    totalProcessed: lowMemoryMode ? (totalItems - errors.length) : results.length,
    totalErrors: errors.length,
  };
}

/**
 * Procesa items secuencialmente (uno por uno)
 * Útil cuando el orden importa o hay dependencias
 */
export async function processSequential<T, R>(
  options: Omit<BatchProcessorOptions<T, R>, 'batchSize'>
): Promise<BatchProcessorResult<R>> {
  const { items, processor, onProgress } = options;

  const results: R[] = [];
  const errors: Array<{ index: number; error: Error }> = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const result = await processor(items[i], i);
      results.push(result);
      onProgress?.(i + 1, items.length);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push({ index: i, error: err });
      console.error(`❌ Error procesando item ${i}:`, err);
    }
  }

  return {
    results,
    errors,
    totalProcessed: results.length,
    totalErrors: errors.length,
  };
}
