/**
 * Módulo de generación de PDF
 * Requirements: 7.1-7.6
 */

export {
  PDFGenerator,
  pdfGenerator,
  generateFichaPDF,
  downloadPDF,
  type PDFGeneratorOptions,
  type PDFGenerationResult,
} from './pdfGenerator';

export {
  BatchGenerator,
  batchGenerator,
  generateBatchPDFs,
  downloadZip,
  type BatchItem,
  type BatchProgress,
  type BatchError,
  type BatchResult,
  type ProgressCallback,
} from './batchGenerator';
