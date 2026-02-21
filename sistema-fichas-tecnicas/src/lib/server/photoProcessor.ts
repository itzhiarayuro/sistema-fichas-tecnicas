/**
 * photoProcessor.ts — Motor de procesamiento de fotos con Sharp
 *
 * Sharp usa libvips (C puro) — opera a velocidad nativa del sistema operativo.
 * Es la misma librería que usa Instagram, Cloudinary y Vercel internamente.
 *
 * Por qué es 10-20x más rápido que el browser:
 *  - No hay JavaScript → operaciones directamente en CPU/memoria nativa
 *  - Paralelismo real de hilos (no el "paralelo" falso del browser)
 *  - Acceso directo a disco sin pasar por V8
 *  - Sin límites de memoria del tab del navegador
 *
 * IMPORTANTE: Sharp solo corre en el servidor (Node.js).
 * No importes este archivo desde componentes de React.
 */

// Sharp se instala con: npm install sharp
// Tipos: npm install --save-dev @types/sharp
let sharp: any = null;

async function getSharp() {
  if (sharp) return sharp;
  try {
    // Importación dinámica — solo se carga en el servidor
    sharp = (await import('sharp')).default;
    return sharp;
  } catch {
    throw new Error(
      'Sharp no está instalado. Ejecuta: npm install sharp'
    );
  }
}

export interface ProcessResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

/**
 * Procesa una foto en el servidor.
 *
 * Qué hace:
 *  1. Detecta dimensiones originales (sin redimensionar)
 *  2. Convierte a JPEG optimizado con MozJPEG
 *  3. Aplica compresión inteligente por calidad, NO por dimensión
 *  4. Preserva resolución 100% — solo reduce peso en bytes
 *
 * @param inputBuffer - Buffer de la foto original
 * @param filename    - Nombre del archivo (para logging)
 * @returns Buffer procesado + metadatos
 */
export async function processPhotoServer(
  inputBuffer: Buffer,
  filename: string
): Promise<ProcessResult> {
  const sh = await getSharp();

  // Leer metadatos sin decodificar la imagen (ultra rápido)
  const metadata = await sh(inputBuffer).metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;
  const originalSize = inputBuffer.length;

  // Configuración de compresión:
  // - NUNCA tocamos width/height → resolución 100% intacta
  // - mozjpeg: algoritmo más eficiente que JPEG estándar
  // - quality 88: visualmente idéntico a 100, 30-40% menos bytes
  const result = await sh(inputBuffer)
    .jpeg({
      quality: 88,
      mozjpeg: true,        // Mejor compresión sin perder calidad visual
      chromaSubsampling: '4:4:4', // Mejor para fotos con texto/detalles
    })
    .toBuffer({ resolveWithObject: true });

  const processedSize = result.data.length;
  const savings = (((originalSize - processedSize) / originalSize) * 100).toFixed(1);

  console.log(
    `✅ [Sharp] ${filename}: ${(originalSize / 1024).toFixed(0)}KB → ` +
    `${(processedSize / 1024).toFixed(0)}KB (-${savings}%) | ` +
    `${originalWidth}×${originalHeight}px (resolución intacta)`
  );

  return {
    buffer: result.data,
    width: originalWidth,
    height: originalHeight,
    format: 'jpeg',
  };
}

/**
 * Procesa múltiples fotos en paralelo usando Sharp.
 * El servidor maneja la concurrencia — el usuario no siente nada.
 *
 * @param files - Array de { buffer, filename }
 * @returns Array de resultados en el mismo orden
 */
export async function processPhotosBatch(
  files: Array<{ buffer: Buffer; filename: string }>
): Promise<Array<ProcessResult & { filename: string; error?: string }>> {
  const results = await Promise.allSettled(
    files.map(async ({ buffer, filename }) => {
      const result = await processPhotoServer(buffer, filename);
      return { ...result, filename };
    })
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      buffer: Buffer.alloc(0),
      width: 0,
      height: 0,
      format: 'jpeg',
      filename: files[i].filename,
      error: r.reason?.message || 'Error desconocido',
    };
  });
}
