/**
 * Generador de lotes de PDFs comprimidos
 * Permite generar múltiples PDFs y descargarlos en un archivo ZIP
 */

import JSZip from 'jszip';
import { Pozo } from '@/types';

export interface BatchPdfResult {
  success: boolean;
  message: string;
  blob?: Blob;
}

/**
 * Genera un archivo ZIP con múltiples PDFs
 * @param pdfs Array de objetos con nombre y blob del PDF
 * @param zipName Nombre del archivo ZIP a descargar
 */
export async function generateBatchPdfZip(
  pdfs: Array<{ name: string; blob: Blob }>,
  zipName: string = 'fichas_tecnicas.zip'
): Promise<BatchPdfResult> {
  try {
    if (pdfs.length === 0) {
      return {
        success: false,
        message: 'No hay PDFs para comprimir'
      };
    }

    const zip = new JSZip();
    const folder = zip.folder('fichas_tecnicas');

    if (!folder) {
      return {
        success: false,
        message: 'Error al crear carpeta en ZIP'
      };
    }

    // Agregar cada PDF al ZIP
    for (const pdf of pdfs) {
      folder.file(`${pdf.name}.pdf`, pdf.blob);
    }

    // Generar el archivo ZIP
    const blob = await zip.generateAsync({ type: 'blob' });

    return {
      success: true,
      message: `${pdfs.length} PDFs comprimidos exitosamente`,
      blob
    };
  } catch (error) {
    console.error('Error generando ZIP:', error);
    return {
      success: false,
      message: `Error al generar ZIP: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

/**
 * Descarga un archivo ZIP
 * @param blob Blob del archivo ZIP
 * @param filename Nombre del archivo a descargar
 */
export function downloadZip(blob: Blob, filename: string = 'fichas_tecnicas.zip'): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Genera múltiples PDFs y los descarga en un ZIP
 * @param pdfGenerators Array de funciones que generan PDFs
 * @param zipName Nombre del archivo ZIP
 */
export async function generateAndDownloadBatchPdfs(
  pdfGenerators: Array<() => Promise<{ name: string; blob: Blob | null }>>,
  zipName: string = 'fichas_tecnicas.zip'
): Promise<BatchPdfResult> {
  try {
    const pdfs: Array<{ name: string; blob: Blob }> = [];

    // Generar todos los PDFs
    for (const generator of pdfGenerators) {
      const result = await generator();
      if (result.blob) {
        pdfs.push({ name: result.name, blob: result.blob });
      }
    }

    if (pdfs.length === 0) {
      return {
        success: false,
        message: 'No se pudieron generar los PDFs'
      };
    }

    // Generar ZIP
    const zipResult = await generateBatchPdfZip(pdfs, zipName);

    if (zipResult.success && zipResult.blob) {
      downloadZip(zipResult.blob, zipName);
    }

    return zipResult;
  } catch (error) {
    console.error('Error en generación por lotes:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}
