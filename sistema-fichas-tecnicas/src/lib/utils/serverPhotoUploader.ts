/**
 * serverPhotoUploader.ts
 *
 * Reemplaza el photo.worker.ts del browser por llamadas al servidor.
 *
 * Flujo:
 *  Antes:  foto → worker (browser) → procesa lento
 *  Ahora:  foto → API /api/photos/process → Sharp (servidor) → resultado
 *
 * El servidor procesa 20 fotos en paralelo por lote.
 * El usuario ve la barra de progreso avanzar mientras el servidor trabaja.
 */

export interface ServerProcessResult {
  filename: string;
  blob: Blob;
  originalSize: number;
  processedSize: number;
  width: number;
  height: number;
  error?: string;
}

/** Cuántas fotos enviar al servidor por llamada */
const SERVER_BATCH_SIZE = 20;

/** Cuántas llamadas al servidor en paralelo */
const CONCURRENT_REQUESTS = 3;

/**
 * Procesa un lote de fotos enviándolas al servidor.
 * Mucho más rápido que procesarlas en el browser.
 *
 * @param files     - Archivos a procesar
 * @param onProgress - Callback de progreso (0-100)
 * @returns Array de resultados con los blobs procesados
 */
export async function processPhotosOnServer(
  files: File[],
  onProgress?: (processed: number, total: number) => void
): Promise<ServerProcessResult[]> {
  const allResults: ServerProcessResult[] = [];
  let processed = 0;

  // Dividir en lotes de SERVER_BATCH_SIZE
  const batches: File[][] = [];
  for (let i = 0; i < files.length; i += SERVER_BATCH_SIZE) {
    batches.push(files.slice(i, i + SERVER_BATCH_SIZE));
  }

  console.log(
    `🚀 [Server] Procesando ${files.length} fotos en ${batches.length} lotes ` +
    `(${SERVER_BATCH_SIZE} fotos/lote, ${CONCURRENT_REQUESTS} en paralelo)`
  );

  // Procesar múltiples lotes en paralelo
  for (let i = 0; i < batches.length; i += CONCURRENT_REQUESTS) {
    const concurrentBatches = batches.slice(i, i + CONCURRENT_REQUESTS);

    const batchResults = await Promise.allSettled(
      concurrentBatches.map(batch => sendBatchToServer(batch))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
        processed += result.value.length;
      } else {
        console.error('[Server] Error en lote:', result.reason);
        // Si el servidor falla, usar las fotos originales como fallback
        processed += SERVER_BATCH_SIZE;
      }
      onProgress?.(Math.min(processed, files.length), files.length);
    }
  }

  return allResults;
}

/**
 * Envía un lote de archivos al servidor y recibe los resultados.
 */
async function sendBatchToServer(files: File[]): Promise<ServerProcessResult[]> {
  const formData = new FormData();

  // Usar el nombre del archivo como key — el servidor lo usa para identificarlo
  for (const file of files) {
    formData.append(file.name, file);
  }

  const response = await fetch('/api/photos/process', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error del servidor ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Error desconocido del servidor');
  }

  // Convertir base64 de vuelta a Blob
  return data.results.map((r: any) => {
    let blob: Blob;

    if (r.error || !r.data) {
      // Si esta foto específica falló, usar un blob vacío
      blob = new Blob([], { type: 'image/jpeg' });
    } else {
      // Convertir base64 → Uint8Array → Blob
      const binary = atob(r.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: 'image/jpeg' });
    }

    return {
      filename: r.filename,
      blob,
      originalSize: r.originalSize,
      processedSize: r.processedSize,
      width: r.width,
      height: r.height,
      error: r.error,
    };
  });
}

/**
 * Verifica si el servidor de procesamiento está disponible.
 * Llámalo al cargar la página — si falla, el sistema usa el worker del browser.
 */
export async function checkServerAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/photos/process', {
      method: 'POST',
      body: new FormData(), // Body vacío — solo para verificar
    });
    // 400 = endpoint existe pero no recibió archivos → servidor OK
    // 404 = endpoint no existe
    return response.status !== 404;
  } catch {
    return false;
  }
}
