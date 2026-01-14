/**
 * File Validator - Validación robusta de archivos
 * Requirements: 1.3, 1.10
 * 
 * Principios de diseño:
 * - Fail-safe: Nunca bloquea el flujo, solo reporta problemas
 * - Informativo: Mensajes claros y accionables
 * - Extensible: Fácil agregar nuevos tipos de validación
 */

import { ErrorType, ErrorSeverity } from '@/lib/errors/errorTypes';

/**
 * Resultado de validación de un archivo
 */
export interface FileValidationResult {
  /** Si el archivo es válido */
  isValid: boolean;
  /** Tipo de archivo detectado */
  fileType: 'excel' | 'image' | 'unknown';
  /** Errores encontrados */
  errors: ValidationError[];
  /** Advertencias (no bloquean) */
  warnings: ValidationWarning[];
  /** Metadata extraída del archivo */
  metadata?: FileMetadata;
}

export interface ValidationError {
  code: string;
  message: string;
  userMessage: string;
  type: ErrorType;
  severity: ErrorSeverity;
}

export interface ValidationWarning {
  code: string;
  message: string;
  userMessage: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  extension: string;
  lastModified: number;
  /** Para imágenes: dimensiones */
  dimensions?: { width: number; height: number };
  /** Para Excel: número de hojas */
  sheetCount?: number;
}

/**
 * Extensiones de archivo permitidas
 */
const ALLOWED_EXTENSIONS = {
  excel: ['.xlsx', '.xls', '.xlsm'],
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
};

/**
 * MIME types permitidos
 */
const ALLOWED_MIME_TYPES = {
  excel: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
  ],
  image: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
};

/**
 * Límites de tamaño de archivo (en bytes)
 */
const SIZE_LIMITS = {
  excel: 50 * 1024 * 1024, // 50MB
  image: 20 * 1024 * 1024, // 20MB
  default: 50 * 1024 * 1024, // 50MB
};

/**
 * Tamaño mínimo para considerar un archivo válido
 */
const MIN_FILE_SIZE = 100; // 100 bytes

/**
 * Magic bytes para detección de tipo de archivo
 */
const MAGIC_BYTES = {
  // Excel XLSX (ZIP format)
  xlsx: [0x50, 0x4B, 0x03, 0x04],
  // Excel XLS (OLE format)
  xls: [0xD0, 0xCF, 0x11, 0xE0],
  // JPEG
  jpeg: [0xFF, 0xD8, 0xFF],
  // PNG
  png: [0x89, 0x50, 0x4E, 0x47],
  // GIF
  gif: [0x47, 0x49, 0x46],
  // WebP
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF header
};

/**
 * Obtiene la extensión de un archivo
 */
function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? `.${parts.pop()}` : '';
}

/**
 * Detecta el tipo de archivo por extensión
 */
function detectFileTypeByExtension(filename: string): 'excel' | 'image' | 'unknown' {
  const ext = getFileExtension(filename);
  
  if (ALLOWED_EXTENSIONS.excel.includes(ext)) return 'excel';
  if (ALLOWED_EXTENSIONS.image.includes(ext)) return 'image';
  
  return 'unknown';
}

/**
 * Detecta el tipo de archivo por MIME type
 */
function detectFileTypeByMime(mimeType: string): 'excel' | 'image' | 'unknown' {
  if (ALLOWED_MIME_TYPES.excel.includes(mimeType)) return 'excel';
  if (ALLOWED_MIME_TYPES.image.includes(mimeType)) return 'image';
  
  return 'unknown';
}

/**
 * Verifica los magic bytes de un archivo
 */
async function checkMagicBytes(file: File): Promise<string | null> {
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Verificar XLSX/ZIP
    if (matchBytes(bytes, MAGIC_BYTES.xlsx)) return 'xlsx';
    
    // Verificar XLS
    if (matchBytes(bytes, MAGIC_BYTES.xls)) return 'xls';
    
    // Verificar JPEG
    if (matchBytes(bytes, MAGIC_BYTES.jpeg)) return 'jpeg';
    
    // Verificar PNG
    if (matchBytes(bytes, MAGIC_BYTES.png)) return 'png';
    
    // Verificar GIF
    if (matchBytes(bytes, MAGIC_BYTES.gif)) return 'gif';
    
    // Verificar WebP (RIFF + WEBP)
    if (matchBytes(bytes, MAGIC_BYTES.webp)) {
      // Verificar que sea WEBP específicamente
      if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
        return 'webp';
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Compara bytes con un patrón
 */
function matchBytes(bytes: Uint8Array, pattern: number[]): boolean {
  if (bytes.length < pattern.length) return false;
  return pattern.every((byte, index) => bytes[index] === byte);
}

/**
 * Verifica si una imagen está corrupta intentando cargarla
 */
async function verifyImageIntegrity(file: File): Promise<{ valid: boolean; dimensions?: { width: number; height: number } }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    const cleanup = () => {
      URL.revokeObjectURL(url);
    };
    
    img.onload = () => {
      cleanup();
      resolve({
        valid: true,
        dimensions: { width: img.naturalWidth, height: img.naturalHeight },
      });
    };
    
    img.onerror = () => {
      cleanup();
      resolve({ valid: false });
    };
    
    // Timeout para imágenes muy grandes
    setTimeout(() => {
      cleanup();
      resolve({ valid: false });
    }, 10000);
    
    img.src = url;
  });
}

/**
 * Formatea el tamaño de archivo para mostrar
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Valida un archivo de forma completa
 * 
 * @param file - Archivo a validar
 * @returns Resultado de la validación
 */
export async function validateFile(file: File): Promise<FileValidationResult> {
  const result: FileValidationResult = {
    isValid: true,
    fileType: 'unknown',
    errors: [],
    warnings: [],
    metadata: {
      name: file.name,
      size: file.size,
      type: file.type,
      extension: getFileExtension(file.name),
      lastModified: file.lastModified,
    },
  };
  
  // 1. Validar que el archivo no esté vacío
  if (file.size < MIN_FILE_SIZE) {
    result.isValid = false;
    result.errors.push({
      code: 'FILE_TOO_SMALL',
      message: `File size ${file.size} bytes is below minimum ${MIN_FILE_SIZE} bytes`,
      userMessage: 'El archivo parece estar vacío o corrupto',
      type: ErrorType.DATA,
      severity: ErrorSeverity.ERROR,
    });
    return result;
  }
  
  // 2. Detectar tipo de archivo
  const typeByExt = detectFileTypeByExtension(file.name);
  const typeByMime = detectFileTypeByMime(file.type);
  
  // Preferir detección por extensión, pero advertir si hay discrepancia
  result.fileType = typeByExt !== 'unknown' ? typeByExt : typeByMime;
  
  if (typeByExt !== 'unknown' && typeByMime !== 'unknown' && typeByExt !== typeByMime) {
    result.warnings.push({
      code: 'TYPE_MISMATCH',
      message: `Extension suggests ${typeByExt} but MIME type suggests ${typeByMime}`,
      userMessage: `La extensión del archivo no coincide con su contenido`,
    });
  }
  
  // 3. Validar extensión permitida
  if (result.fileType === 'unknown') {
    result.isValid = false;
    result.errors.push({
      code: 'INVALID_EXTENSION',
      message: `File extension ${getFileExtension(file.name)} is not allowed`,
      userMessage: `Tipo de archivo no soportado. Use archivos Excel (.xlsx, .xls) o imágenes (.jpg, .png)`,
      type: ErrorType.USER,
      severity: ErrorSeverity.ERROR,
    });
    return result;
  }
  
  // 4. Validar tamaño máximo
  const maxSize = SIZE_LIMITS[result.fileType] || SIZE_LIMITS.default;
  if (file.size > maxSize) {
    result.isValid = false;
    result.errors.push({
      code: 'FILE_TOO_LARGE',
      message: `File size ${file.size} exceeds maximum ${maxSize}`,
      userMessage: `El archivo es muy grande (máx. ${formatFileSize(maxSize)})`,
      type: ErrorType.USER,
      severity: ErrorSeverity.ERROR,
    });
    return result;
  }
  
  // 5. Verificar magic bytes (integridad básica)
  const detectedType = await checkMagicBytes(file);
  
  if (detectedType === null) {
    // No se pudo detectar el tipo por magic bytes
    result.warnings.push({
      code: 'MAGIC_BYTES_UNKNOWN',
      message: 'Could not verify file type by magic bytes',
      userMessage: 'No se pudo verificar el tipo de archivo',
    });
  } else {
    // Verificar consistencia
    const isExcelMagic = detectedType === 'xlsx' || detectedType === 'xls';
    const isImageMagic = ['jpeg', 'png', 'gif', 'webp'].includes(detectedType);
    
    if (result.fileType === 'excel' && !isExcelMagic) {
      result.warnings.push({
        code: 'CONTENT_MISMATCH',
        message: `File claims to be Excel but magic bytes suggest ${detectedType}`,
        userMessage: 'El contenido del archivo no parece ser un Excel válido',
      });
    }
    
    if (result.fileType === 'image' && !isImageMagic) {
      result.warnings.push({
        code: 'CONTENT_MISMATCH',
        message: `File claims to be image but magic bytes suggest ${detectedType}`,
        userMessage: 'El contenido del archivo no parece ser una imagen válida',
      });
    }
  }
  
  // 6. Validación específica para imágenes
  if (result.fileType === 'image') {
    const imageCheck = await verifyImageIntegrity(file);
    
    if (!imageCheck.valid) {
      // Imagen corrupta - Requirement 1.10: omitir y permitir reemplazo
      result.isValid = false;
      result.errors.push({
        code: 'IMAGE_CORRUPT',
        message: 'Image file appears to be corrupt or unreadable',
        userMessage: 'La imagen parece estar corrupta. Puede reemplazarla manualmente.',
        type: ErrorType.DATA,
        severity: ErrorSeverity.ERROR,
      });
    } else if (imageCheck.dimensions) {
      result.metadata!.dimensions = imageCheck.dimensions;
      
      // Advertir sobre imágenes muy pequeñas
      if (imageCheck.dimensions.width < 100 || imageCheck.dimensions.height < 100) {
        result.warnings.push({
          code: 'IMAGE_TOO_SMALL',
          message: `Image dimensions ${imageCheck.dimensions.width}x${imageCheck.dimensions.height} are very small`,
          userMessage: 'La imagen es muy pequeña y puede verse pixelada en el PDF',
        });
      }
      
      // Advertir sobre imágenes muy grandes
      if (imageCheck.dimensions.width > 4000 || imageCheck.dimensions.height > 4000) {
        result.warnings.push({
          code: 'IMAGE_VERY_LARGE',
          message: `Image dimensions ${imageCheck.dimensions.width}x${imageCheck.dimensions.height} are very large`,
          userMessage: 'La imagen es muy grande y será redimensionada para el PDF',
        });
      }
    }
  }
  
  return result;
}

/**
 * Valida múltiples archivos
 */
export async function validateFiles(files: File[]): Promise<Map<string, FileValidationResult>> {
  const results = new Map<string, FileValidationResult>();
  
  await Promise.all(
    files.map(async (file) => {
      const result = await validateFile(file);
      results.set(file.name, result);
    })
  );
  
  return results;
}

/**
 * Filtra archivos válidos de una lista
 */
export async function filterValidFiles(files: File[]): Promise<{
  valid: File[];
  invalid: Array<{ file: File; result: FileValidationResult }>;
}> {
  const results = await validateFiles(files);
  const valid: File[] = [];
  const invalid: Array<{ file: File; result: FileValidationResult }> = [];
  
  files.forEach((file) => {
    const result = results.get(file.name);
    if (result?.isValid) {
      valid.push(file);
    } else if (result) {
      invalid.push({ file, result });
    }
  });
  
  return { valid, invalid };
}

/**
 * Verifica si un archivo es un Excel válido por extensión
 */
export function isExcelFile(filename: string): boolean {
  return detectFileTypeByExtension(filename) === 'excel';
}

/**
 * Verifica si un archivo es una imagen válida por extensión
 */
export function isImageFile(filename: string): boolean {
  return detectFileTypeByExtension(filename) === 'image';
}

/**
 * Obtiene el límite de tamaño para un tipo de archivo
 */
export function getSizeLimit(fileType: 'excel' | 'image' | 'unknown'): number {
  if (fileType === 'excel') return SIZE_LIMITS.excel;
  if (fileType === 'image') return SIZE_LIMITS.image;
  return SIZE_LIMITS.default;
}

export {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  SIZE_LIMITS,
  formatFileSize,
  getFileExtension,
};
