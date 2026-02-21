/**
 * Photo Worker v2 — Procesamiento de imágenes SIN perder resolución
 * 
 * Cambios vs versión anterior:
 * - ELIMINADO maxWidth/maxHeight — nunca reduce dimensiones
 * - Solo controla el peso en bytes (calidad JPEG), no los píxeles
 * - Transferibles correctos para zero-copy memory
 * - Calidad 0.92 en lugar de 0.75 — fotos más nítidas
 */

interface PhotoTask {
  id: string;
  buffer?: ArrayBuffer;  // Preferido — transferible zero-copy
  file?: File | Blob;    // Fallback si buffer no disponible
  options: {
    maxSizeMB?: number;    // Solo controla PESO, no dimensiones
    quality?: number;      // 0-1, default 0.92
    generateHash?: boolean;
  };
}

self.onmessage = async (e: MessageEvent<PhotoTask>) => {
  const { id, buffer, file, options } = e.data;

  try {
    self.postMessage({ type: 'PROGRESS', id, progress: 10, message: 'Iniciando...' });

    // Obtener el blob de entrada (desde buffer transferible o desde File)
    let inputBlob: Blob;
    if (buffer) {
      inputBlob = new Blob([buffer], { type: 'image/jpeg' });
    } else if (file) {
      inputBlob = file;
    } else {
      throw new Error('No se recibió imagen');
    }

    let processedBlob = inputBlob;
    let hash: string | undefined;

    // 1. Generar hash si se pide (para deduplicación)
    if (options.generateHash) {
      self.postMessage({ type: 'PROGRESS', id, progress: 25, message: 'Generando hash...' });
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer || await inputBlob.arrayBuffer());
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // 2. Optimización SOLO si la foto pesa más de 2MB
    //    NUNCA cambiamos dimensiones — solo calidad JPEG
    const maxSizeMB = options.maxSizeMB || 2.0;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const quality = options.quality || 0.92; // Alta calidad por defecto

    if (inputBlob.size > maxSizeBytes && typeof OffscreenCanvas !== 'undefined') {
      self.postMessage({ type: 'PROGRESS', id, progress: 50, message: 'Optimizando peso...' });

      try {
        const img = await createImageBitmap(inputBlob);
        
        // *** CLAVE: Usar dimensiones ORIGINALES — no tocar width/height ***
        const originalWidth = img.width;
        const originalHeight = img.height;

        const canvas = new OffscreenCanvas(originalWidth, originalHeight);
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
          
          // Reducir calidad JPEG progresivamente hasta que el peso sea aceptable
          // NUNCA reducimos dimensiones
          let currentQuality = quality;
          let attempt = 0;
          
          processedBlob = await canvas.convertToBlob({
            type: 'image/jpeg',
            quality: currentQuality,
          });

          // Si sigue siendo muy grande, reducir calidad un poco más (máximo 2 intentos)
          while (processedBlob.size > maxSizeBytes && attempt < 2) {
            currentQuality = currentQuality * 0.85; // Reducir calidad 15%
            processedBlob = await canvas.convertToBlob({
              type: 'image/jpeg',
              quality: currentQuality,
            });
            attempt++;
          }

          console.log(
            `✅ ${id}: ${(inputBlob.size / 1024).toFixed(0)}KB → ${(processedBlob.size / 1024).toFixed(0)}KB ` +
            `(${originalWidth}×${originalHeight}px — resolución intacta)`
          );
        }
      } catch (canvasError) {
        console.warn('OffscreenCanvas falló, usando original:', canvasError);
        processedBlob = inputBlob;
      }
    }

    self.postMessage({ type: 'PROGRESS', id, progress: 90, message: 'Finalizando...' });

    // 3. Transferir resultado como ArrayBuffer (zero-copy de vuelta al main thread)
    const resultBuffer = await processedBlob.arrayBuffer();

    self.postMessage(
      {
        type: 'SUCCESS',
        id,
        result: {
          buffer: resultBuffer,      // ArrayBuffer transferible
          blob: processedBlob,       // Blob por compatibilidad
          hash,
          originalSize: inputBlob.size,
          processedSize: processedBlob.size,
        },
      },
      [resultBuffer] // Transferir sin copiar
    );

  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      id,
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
