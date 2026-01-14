/**
 * Barrel export for all types
 * Sistema de Fichas Técnicas de Pozos
 */

export * from './pozo';
export * from './ficha';
export * from './error';

// Re-export tipos más usados para conveniencia
export type {
  Pozo,
  FotoInfo,
  EstructuraPozo,
  TuberiasPozo,
  FotosPozo,
} from './pozo';

export type {
  FichaState,
  FichaSection,
  FieldValue,
  FieldSource,
  FichaCustomization,
  Snapshot,
  ImageSize,
  FichaErrorRef,
} from './ficha';

export type {
  FichaError,
  ErrorType,
  ErrorSeverity,
  ErrorContext,
} from './error';
