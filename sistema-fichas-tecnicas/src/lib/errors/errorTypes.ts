/**
 * Tipos y clasificación de errores
 * Requirements: 17.3, 17.4
 */

export enum ErrorType {
  DATA = 'data',       // Datos inválidos o faltantes
  USER = 'user',       // Acción inválida del usuario
  SYSTEM = 'system',   // Error interno del sistema
}

export enum ErrorSeverity {
  WARNING = 'warning', // No bloquea, solo informa
  ERROR = 'error',     // Requiere atención pero no bloquea
}

// Nunca hay errores "fatales" - siempre hay recuperación
