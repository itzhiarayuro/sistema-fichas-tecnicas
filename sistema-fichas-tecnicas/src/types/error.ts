/**
 * Tipos para el sistema de manejo de errores
 * Requirements: 17.3, 17.4
 * 
 * El sistema clasifica errores en tres tipos:
 * - data: Datos inválidos o faltantes
 * - user: Acción inválida del usuario
 * - system: Error interno del sistema
 * 
 * Nunca hay errores "fatales" - siempre hay recuperación
 */

/**
 * Tipo de error para clasificación
 */
export type ErrorType = 'data' | 'user' | 'system';

/**
 * Severidad del error
 * - warning: No bloquea, solo informa
 * - error: Requiere atención pero no bloquea
 */
export type ErrorSeverity = 'warning' | 'error';

/**
 * Error contenido dentro del contexto de una ficha
 * Los errores nunca se propagan fuera de su ficha (Requirement 17.1-17.6)
 */
export interface FichaError {
  /** Identificador único del error */
  id: string;
  /** ID de la ficha donde ocurrió el error */
  fichaId: string;
  /** Tipo de error para clasificación */
  type: ErrorType;
  /** Severidad del error */
  severity: ErrorSeverity;
  /** Mensaje técnico para logging */
  message: string;
  /** Mensaje comprensible para el usuario */
  userMessage: string;
  /** Campo afectado (si aplica) */
  field?: string;
  /** Timestamp de ocurrencia */
  timestamp: number;
  /** Si el error ha sido resuelto */
  resolved: boolean;
}

export interface ErrorContext {
  fichaId?: string;
  operation?: string;
  field?: string;
  originalValue?: unknown;
  attemptedValue?: unknown;
}

export interface ErrorRecoveryAction {
  type: 'use_default' | 'restore_snapshot' | 'skip' | 'retry';
  payload?: unknown;
}
