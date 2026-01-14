/**
 * Validators - Módulo de validación
 * Requirements: 1.3, 1.10, 11.1-11.5
 */

export {
  validateFile,
  validateFiles,
  filterValidFiles,
  isExcelFile,
  isImageFile,
  getSizeLimit,
  formatFileSize,
  getFileExtension,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  SIZE_LIMITS,
} from './fileValidator';

export type {
  FileValidationResult,
  ValidationError,
  ValidationWarning,
  FileMetadata,
} from './fileValidator';

export {
  validatePozo,
  validatePozos,
  getValidationSummary,
  validateField,
  getFieldsWithIssues,
  formatValidationResult,
  VALIDATION_RULES,
  GEOGRAPHIC_BOUNDS_EXPORT,
} from './pozoValidator';

export type {
  PozoValidationResult,
} from './pozoValidator';
