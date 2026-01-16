/**
 * Tipos compartidos para la generación de PDFs
 */

export interface PDFGeneratorOptions {
    pageNumbers?: boolean;
    includeDate?: boolean;
    compress?: boolean;
    includePhotos?: boolean;
    watermark?: string;
    imageQuality?: number;
}

export interface PDFGenerationResult {
    success: boolean;
    blob?: Blob;
    filename?: string;
    error?: string;
    pageCount?: number;
}
