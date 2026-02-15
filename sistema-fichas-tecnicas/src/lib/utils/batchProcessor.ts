/**
 * BatchProcessor - Procesamiento por lotes para evitar saturación
 * 
 * Procesa grandes cantidades de archivos en lotes pequeños
 * para evitar bloquear el navegador y saturar la memoria.
 */

export interface BatchProcessorOptions<T, R> {
  items: T[];
  batchSize?: number; // Tamaño del lote (default: 10)
  delayBetweenBatches?: number; // Delay en ms entre lotes (default: 100ms)
  processor: (item: T, index: number) => Promise<R>;
  onProgress?: (processed: number, total: number) => void;
  onBatchComplete?: (batchResults: R[], batchIndex: number) => void;
}

export interface BatchProcessorResult<R> {
  results: R[];
  errors: Array<{ index: number; error: Error }>;
  totalProcessed: number;
  totalErrors: number;
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
  } = options;

  const results: R[] = [];
  const errors: Array<{ index: number; error: Error }> = [];
  const totalItems = items.length;

  // Dividir en lotes
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  console.log(`📦 Procesando ${totalItems} items en ${batches.length} lotes de ${batchSize}`);

  // Procesar cada lote
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const batchResults: R[] = [];

    // Procesar items del lote en paralelo
    const batchPromises = batch.map(async (item, indexInBatch) => {
      const globalIndex = batchIndex * batchSize + indexInBatch;
      try {
        const result = await processor(item, globalIndex);
        batchResults.push(result);
        results.push(result);
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

    // Notificar progreso
    const processed = (batchIndex + 1) * batchSize;
    onProgress?.(Math.min(processed, totalItems), totalItems);
    onBatchComplete?.(batchResults, batchIndex);

    // Delay entre lotes para no saturar
    if (batchIndex < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  console.log(`✅ Procesamiento completo: ${results.length} exitosos, ${errors.length} errores`);

  return {
    results,
    errors,
    totalProcessed: results.length,
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
