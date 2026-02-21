/**
 * BatchProcessor v2 — Procesamiento por lotes sin delays artificiales
 * 
 * Cambios vs versión anterior:
 * - SIN delays fijos — solo pausa si la memoria está alta (>80%)
 * - requestIdleCallback real entre lotes para no bloquear UI
 * - Import estático del memoryManager (sin overhead de import dinámico)
 */

import { memoryManager } from '@/lib/managers/memoryManager';

export interface BatchProcessorOptions<T, R> {
  items: T[];
  batchSize?: number;
  delayBetweenBatches?: number; // Ignorado si memoria < 80% — es adaptativo ahora
  processor: (item: T, index: number) => Promise<R>;
  onProgress?: (processed: number, total: number) => void;
  onBatchComplete?: (batchResults: R[], batchIndex: number) => void;
  lowMemoryMode?: boolean;
}

export interface BatchProcessorResult<R> {
  results: R[];
  errors: Array<{ index: number; error: Error }>;
  totalProcessed: number;
  totalErrors: number;
}

/** Cede el hilo al navegador entre lotes — no bloquea UI */
function yieldToUI(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0); // Sin delay — solo cede el hilo
    }
  });
}

/** Calcula delay basado en memoria real — cero si todo está bien */
function getAdaptiveDelay(): number {
  const stats = memoryManager.getMemoryStats();
  if (!stats) return 0;

  if (stats.usagePercentage > 0.90) return 2000; // Memoria crítica — pausa larga
  if (stats.usagePercentage > 0.80) return 500;  // Memoria alta — pausa corta
  if (stats.usagePercentage > 0.70) return 100;  // Memoria moderada — pausa mínima
  return 0; // Memoria normal — SIN delay
}

/**
 * Procesa items en lotes sin delays artificiales.
 * Solo pausa cuando la memoria del dispositivo realmente lo necesita.
 */
export async function processBatch<T, R>(
  options: BatchProcessorOptions<T, R>
): Promise<BatchProcessorResult<R>> {
  const {
    items,
    batchSize = 20,
    processor,
    onProgress,
    onBatchComplete,
    lowMemoryMode = false,
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

  // Debounce de progreso — máximo cada 200ms para no saturar React
  let lastProgressReport = 0;
  const reportProgress = (processed: number) => {
    const now = Date.now();
    if (now - lastProgressReport >= 200 || processed === totalItems) {
      lastProgressReport = now;
      onProgress?.(Math.min(processed, totalItems), totalItems);
    }
  };

  let totalProcessed = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    // Verificar memoria REAL — si está alta, pausar
    const delay = getAdaptiveDelay();
    if (delay > 0) {
      console.warn(`⚠️ Memoria alta, pausando ${delay}ms antes del lote ${batchIndex + 1}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      if (delay > 500) memoryManager.forceGarbageCollection();
    }

    // Procesar lote en paralelo
    const batchResults: R[] = [];
    const batchPromises = batch.map(async (item, indexInBatch) => {
      const globalIndex = batchIndex * batchSize + indexInBatch;
      try {
        const result = await processor(item, globalIndex);
        batchResults.push(result);
        if (!lowMemoryMode) results.push(result);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push({ index: globalIndex, error: err });
        return null;
      }
    });

    await Promise.allSettled(batchPromises);

    totalProcessed += batch.length;
    reportProgress(totalProcessed);
    onBatchComplete?.(batchResults, batchIndex);

    // Ceder hilo al navegador entre lotes — sin delay real
    if (batchIndex < batches.length - 1) {
      await yieldToUI();
    }
  }

  reportProgress(totalItems);
  console.log(`✅ Listo: ${totalItems - errors.length} exitosos, ${errors.length} errores`);

  return {
    results,
    errors,
    totalProcessed: lowMemoryMode ? (totalItems - errors.length) : results.length,
    totalErrors: errors.length,
  };
}

/** Procesa items uno por uno cuando el orden importa */
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
    }
  }

  return { results, errors, totalProcessed: results.length, totalErrors: errors.length };
}
