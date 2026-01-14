/**
 * Guided Mode Components
 * Requirements: 14.1-14.4
 * 
 * Exporta todos los componentes relacionados con el modo guiado:
 * - GuidedModeProvider: Contexto para el modo guiado
 * - useGuidedMode: Hook para acceder al contexto
 * - RecommendationsPanel: Panel de recomendaciones contextuales
 * - RestrictedAction: Wrapper para acciones restringidas
 * - GuidedModeBadge: Badge indicador de modo guiado
 * - FriendlyError: Componente para mostrar errores amigables
 * - AutoCorrectionSuggestion: Sugerencias de corrección automática
 */

export {
  GuidedModeProvider,
  useGuidedMode,
  RecommendationsPanel,
  RestrictedAction,
  GuidedModeBadge,
  FriendlyError,
  AutoCorrectionSuggestion,
  type GuidedActionType,
} from './GuidedMode';
