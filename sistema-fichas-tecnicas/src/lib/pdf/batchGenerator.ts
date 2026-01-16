/**
 * BatchGenerator - Generación de PDFs en lote
 * Requirements: 7.3-7.6
 * 
 * Permite generar múltiples PDFs con progreso, cancelación y empaquetado ZIP.
 */

import { PDFGenerator } from './pdfGenerator';
import { PDFGeneratorOptions } from '@/types/pdf';
import type { FichaState } from '@/types/ficha';
import type { Pozo } from '@/types/pozo';

export interface BatchItem {
  ficha: FichaState;
  pozo: Pozo;
}

export interface BatchProgress {
  total: number;
  completed: number;
  current: string;
  percentage: number;
  errors: BatchError[];
}

export interface BatchError {
  pozoId: string;
  codigo: string;
  error: string;
}

export interface BatchResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  errors: BatchError[];
  zipBlob?: Blob;
  zipFilename?: string;
}

export type ProgressCallback = (progress: BatchProgress) => void;

/**
 * Clase para generación de PDFs en lote
 */
export class BatchGenerator {
  private pdfGenerator: PDFGenerator;
  private cancelled: boolean = false;

  constructor() {
    this.pdfGenerator = new PDFGenerator();
  }

  /**
   * Genera PDFs para múltiples fichas
   */
  async generateBatch(
    items: BatchItem[],
    options: PDFGeneratorOptions = {},
    onProgress?: ProgressCallback
  ): Promise<BatchResult> {
    this.cancelled = false;

    // Importación dinámica de JSZip para evitar problemas de SSR
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const errors: BatchError[] = [];
    let successCount = 0;

    const progress: BatchProgress = {
      total: items.length,
      completed: 0,
      current: '',
      percentage: 0,
      errors: [],
    };

    for (let i = 0; i < items.length; i++) {
      // Verificar cancelación
      if (this.cancelled) {
        break;
      }

      const { ficha, pozo } = items[i];
      progress.current = String(pozo.idPozo?.value || pozo.identificacion.idPozo.value || '-');
      progress.percentage = Math.round((i / items.length) * 100);
      onProgress?.(progress);

      try {
        const result = await this.pdfGenerator.generatePDF(ficha, pozo, options);

        if (result.success && result.blob && result.filename) {
          // Agregar al ZIP
          const arrayBuffer = await result.blob.arrayBuffer();
          zip.file(result.filename, arrayBuffer);
          successCount++;
        } else {
          errors.push({
            pozoId: pozo.id,
            codigo: String(pozo.idPozo?.value || pozo.identificacion.idPozo.value || '-'),
            error: result.error || 'Error desconocido',
          });
        }
      } catch (error) {
        errors.push({
          pozoId: pozo.id,
          codigo: String(pozo.idPozo?.value || pozo.identificacion.idPozo.value || '-'),
          error: error instanceof Error ? error.message : 'Error inesperado',
        });
      }

      progress.completed = i + 1;
      progress.errors = errors;
    }

    // Generar ZIP si hay PDFs exitosos
    let zipBlob: Blob | undefined;
    let zipFilename: string | undefined;

    if (successCount > 0 && !this.cancelled) {
      try {
        zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        }) as Blob;
        zipFilename = `fichas_tecnicas_${Date.now()}.zip`;
      } catch (error) {
        console.error('Error al generar ZIP:', error);
      }
    }

    // Progreso final
    progress.completed = items.length;
    progress.percentage = 100;
    progress.current = 'Completado';
    onProgress?.(progress);

    return {
      success: successCount > 0,
      totalProcessed: this.cancelled ? progress.completed : items.length,
      successCount,
      errorCount: errors.length,
      errors,
      zipBlob,
      zipFilename,
    };
  }

  /**
   * Cancela la generación en curso
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Verifica si está cancelado
   */
  isCancelled(): boolean {
    return this.cancelled;
  }
}

// Instancia singleton
export const batchGenerator = new BatchGenerator();

/**
 * Función helper para generar lote de PDFs
 */
export async function generateBatchPDFs(
  items: BatchItem[],
  options?: PDFGeneratorOptions,
  onProgress?: ProgressCallback
): Promise<BatchResult> {
  return batchGenerator.generateBatch(items, options, onProgress);
}

/**
 * Descarga el ZIP generado
 */
export function downloadZip(result: BatchResult): void {
  if (!result.zipBlob || !result.zipFilename) {
    console.error('No se puede descargar: ZIP no generado');
    return;
  }

  const url = URL.createObjectURL(result.zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.zipFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
