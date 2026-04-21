import { blobStore } from '@/lib/storage/blobStore';
import { logger } from '@/lib/logger';

/**
 * Convierte un Data URL (base64) a un objeto Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Descarga una foto usando el Google Apps Script proxy y retorna un Data URL.
 * Soporta búsqueda por 'filename' o 'driveId'.
 */
export async function downloadPhotoFromGAS(filename: string, driveId?: string): Promise<string | null> {
  const gasUrl = process.env.NEXT_PUBLIC_GAS_URL;
  const token = process.env.NEXT_PUBLIC_SECRET_TOKEN;

  if (!gasUrl || !token) {
    logger.error('Faltan credenciales NEXT_PUBLIC_GAS_URL o NEXT_PUBLIC_SECRET_TOKEN', {}, 'DrivePhotoDownloader');
    return null;
  }

  try {
    const payload: any = { 
      token,
      action: 'download',
      filename 
    };
    
    if (driveId) {
      payload.fileId = driveId;
    }

    // LLAMADA DIRECTA A GAS (ya no hay proxy local en export estático)
    // Usamos POST simple para evitar problemas complejos de CORS si el script lo soporta
    const response = await fetch(gasUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      // No mandamos Content-Type para evitar el preflight de CORS en navegadores
      // GAS recibirá el body igualmente en e.postData.contents
    });

    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.base64) {
      let base64 = data.base64;
      const idx = base64.indexOf('base64,');
      if (idx !== -1) {
          base64 = base64.substring(idx + 7);
      }
      return `data:${data.mimeType || 'image/jpeg'};base64,${base64}`;
    } else {
        logger.warn(`GAS retornó success: false para ${filename}`, { error: data.error }, 'DrivePhotoDownloader');
    }

    return null;
  } catch (error) {
    logger.error(`Error al descargar ${filename} desde GAS`, error, 'DrivePhotoDownloader');
    return null;
  }
}
