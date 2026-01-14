/**
 * Clase de error para fichas
 * Requirements: 17.3, 17.4
 */

import { ErrorType, ErrorSeverity } from './errorTypes';
import type { FichaError as FichaErrorType, ErrorContext } from '@/types';

export function createFichaError(
  fichaId: string,
  type: ErrorType,
  severity: ErrorSeverity,
  message: string,
  userMessage: string,
  context?: ErrorContext
): FichaErrorType {
  return {
    id: crypto.randomUUID(),
    fichaId,
    type,
    severity,
    message,
    userMessage,
    field: context?.field,
    timestamp: Date.now(),
    resolved: false,
  };
}

export function createDataError(
  fichaId: string,
  message: string,
  userMessage: string,
  field?: string
): FichaErrorType {
  return createFichaError(
    fichaId,
    ErrorType.DATA,
    ErrorSeverity.WARNING,
    message,
    userMessage,
    { field }
  );
}

export function createUserError(
  fichaId: string,
  message: string,
  userMessage: string
): FichaErrorType {
  return createFichaError(
    fichaId,
    ErrorType.USER,
    ErrorSeverity.WARNING,
    message,
    userMessage
  );
}

export function createSystemError(
  fichaId: string,
  message: string,
  userMessage: string
): FichaErrorType {
  return createFichaError(
    fichaId,
    ErrorType.SYSTEM,
    ErrorSeverity.ERROR,
    message,
    userMessage
  );
}
