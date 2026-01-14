/**
 * GuidedMode - Modo Guiado para usuarios no técnicos
 * Requirements: 14.1-14.4
 * 
 * Componente que proporciona:
 * - Modo guiado opcional que simplifica la interfaz
 * - Deshabilitación de acciones avanzadas peligrosas
 * - Recomendaciones contextuales basadas en el paso actual
 * - Explicación de errores en lenguaje no técnico
 */

'use client';

import { ReactNode, createContext, useContext, useMemo, useCallback } from 'react';
import { useGlobalStore, WorkflowStep } from '@/stores';

// Tipos de acciones que pueden ser restringidas en modo guiado
export type GuidedActionType = 
  | 'delete-section'
  | 'delete-image'
  | 'reset-format'
  | 'clear-data'
  | 'advanced-customization'
  | 'batch-operations'
  | 'export-raw'
  | 'manual-photo-association';

// Configuración de acciones restringidas
const RESTRICTED_ACTIONS: Record<GuidedActionType, {
  label: string;
  reason: string;
  alternative?: string;
}> = {
  'delete-section': {
    label: 'Eliminar sección',
    reason: 'Esta acción puede afectar la estructura de la ficha',
    alternative: 'Puedes ocultar la sección en lugar de eliminarla',
  },
  'delete-image': {
    label: 'Eliminar imagen',
    reason: 'Las imágenes eliminadas no se pueden recuperar fácilmente',
    alternative: 'Considera reemplazar la imagen en lugar de eliminarla',
  },
  'reset-format': {
    label: 'Resetear formato',
    reason: 'Perderás todas las personalizaciones de esta ficha',
    alternative: 'Puedes ajustar colores y fuentes individualmente',
  },
  'clear-data': {
    label: 'Limpiar datos',
    reason: 'Esta acción eliminará todos los datos cargados',
    alternative: 'Considera exportar los datos antes de limpiar',
  },
  'advanced-customization': {
    label: 'Personalización avanzada',
    reason: 'Las opciones avanzadas pueden producir resultados inesperados',
    alternative: 'Usa las plantillas predefinidas para cambios seguros',
  },
  'batch-operations': {
    label: 'Operaciones en lote',
    reason: 'Los cambios en lote afectan múltiples fichas a la vez',
    alternative: 'Edita las fichas una por una para mayor control',
  },
  'export-raw': {
    label: 'Exportar datos crudos',
    reason: 'Los datos crudos pueden contener información sensible',
    alternative: 'Usa la exportación PDF estándar',
  },
  'manual-photo-association': {
    label: 'Asociación manual de fotos',
    reason: 'La asociación manual puede causar inconsistencias',
    alternative: 'Renombra las fotos siguiendo la nomenclatura estándar',
  },
};

// Recomendaciones contextuales por paso del workflow
interface ContextualRecommendation {
  title: string;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  priority: 'high' | 'medium' | 'low';
  icon: 'info' | 'tip' | 'warning' | 'success';
}

const WORKFLOW_RECOMMENDATIONS: Record<WorkflowStep, ContextualRecommendation[]> = {
  upload: [
    {
      title: 'Prepara tus archivos',
      message: 'Asegúrate de que el archivo Excel tenga las columnas correctas y las fotos sigan la nomenclatura estándar (ej: M680-P.jpg)',
      priority: 'high',
      icon: 'tip',
    },
    {
      title: 'Formatos soportados',
      message: 'Puedes cargar archivos Excel (.xlsx) y fotos en formato JPG o PNG',
      priority: 'medium',
      icon: 'info',
    },
  ],
  review: [
    {
      title: 'Revisa los datos',
      message: 'Verifica que todos los pozos se hayan cargado correctamente y que las fotos estén asociadas',
      priority: 'high',
      icon: 'tip',
    },
    {
      title: 'Datos incompletos',
      message: 'Los pozos con datos faltantes se marcan con un indicador amarillo. Puedes completarlos en el editor',
      priority: 'medium',
      icon: 'info',
    },
  ],
  edit: [
    {
      title: 'Edición en tiempo real',
      message: 'Los cambios se reflejan automáticamente en la vista previa. No necesitas guardar manualmente',
      priority: 'high',
      icon: 'tip',
    },
    {
      title: 'Deshacer cambios',
      message: 'Usa los botones de deshacer/rehacer si cometes un error. También puedes restaurar versiones anteriores',
      priority: 'medium',
      icon: 'info',
    },
  ],
  preview: [
    {
      title: 'Revisa el resultado',
      message: 'Verifica que la ficha se vea correctamente antes de generar el PDF',
      priority: 'high',
      icon: 'tip',
    },
    {
      title: 'Ajustes finales',
      message: 'Puedes volver al editor para hacer ajustes si algo no se ve bien',
      priority: 'medium',
      icon: 'info',
    },
  ],
  export: [
    {
      title: 'Generación de PDF',
      message: 'Puedes generar PDFs individuales o en lote. Los archivos se descargarán automáticamente',
      priority: 'high',
      icon: 'tip',
    },
    {
      title: 'Calidad de impresión',
      message: 'Los PDFs se generan con calidad de impresión (300 DPI) para las imágenes',
      priority: 'medium',
      icon: 'info',
    },
  ],
};

// Contexto del modo guiado
interface GuidedModeContextValue {
  isGuidedMode: boolean;
  isActionAllowed: (action: GuidedActionType) => boolean;
  getActionRestriction: (action: GuidedActionType) => typeof RESTRICTED_ACTIONS[GuidedActionType] | null;
  recommendations: ContextualRecommendation[];
  currentStep: WorkflowStep;
  translateError: (technicalError: string) => string;
}

const GuidedModeContext = createContext<GuidedModeContextValue | null>(null);

// Hook para usar el contexto del modo guiado
export function useGuidedMode() {
  const context = useContext(GuidedModeContext);
  if (!context) {
    throw new Error('useGuidedMode must be used within a GuidedModeProvider');
  }
  return context;
}

// Mapeo de errores técnicos a mensajes amigables
const ERROR_TRANSLATIONS: Record<string, string> = {
  'NETWORK_ERROR': 'No se pudo conectar. Verifica tu conexión a internet.',
  'FILE_TOO_LARGE': 'El archivo es demasiado grande. Intenta con un archivo más pequeño.',
  'INVALID_FORMAT': 'El formato del archivo no es válido. Usa archivos Excel (.xlsx) o imágenes (JPG, PNG).',
  'PARSE_ERROR': 'No se pudo leer el archivo. Verifica que no esté dañado.',
  'STORAGE_FULL': 'No hay espacio suficiente. Elimina algunos datos antiguos.',
  'PERMISSION_DENIED': 'No tienes permiso para realizar esta acción.',
  'NOT_FOUND': 'No se encontró el elemento solicitado.',
  'VALIDATION_ERROR': 'Algunos datos no son válidos. Revisa los campos marcados.',
  'SYNC_ERROR': 'Error de sincronización. Los cambios se guardarán cuando se restablezca la conexión.',
  'PDF_GENERATION_ERROR': 'No se pudo generar el PDF. Intenta de nuevo.',
  'IMAGE_CORRUPT': 'La imagen está dañada y no se puede mostrar.',
  'EXCEL_PARSE_ERROR': 'No se pudo leer el archivo Excel. Verifica el formato.',
};

function translateError(technicalError: string): string {
  // Buscar coincidencia exacta
  if (ERROR_TRANSLATIONS[technicalError]) {
    return ERROR_TRANSLATIONS[technicalError];
  }
  
  // Buscar coincidencia parcial
  for (const [key, translation] of Object.entries(ERROR_TRANSLATIONS)) {
    if (technicalError.toLowerCase().includes(key.toLowerCase())) {
      return translation;
    }
  }
  
  // Mensaje genérico si no hay traducción
  return 'Ocurrió un problema. Por favor, intenta de nuevo o contacta soporte si el problema persiste.';
}

// Provider del modo guiado
interface GuidedModeProviderProps {
  children: ReactNode;
}

export function GuidedModeProvider({ children }: GuidedModeProviderProps) {
  const isGuidedMode = useGlobalStore((state) => state.guidedMode);
  const currentStep = useGlobalStore((state) => state.currentStep);
  
  const isActionAllowed = useCallback((action: GuidedActionType): boolean => {
    if (!isGuidedMode) return true;
    return !RESTRICTED_ACTIONS[action];
  }, [isGuidedMode]);
  
  const getActionRestriction = useCallback((action: GuidedActionType) => {
    if (!isGuidedMode) return null;
    return RESTRICTED_ACTIONS[action] || null;
  }, [isGuidedMode]);
  
  const recommendations = useMemo(() => {
    return WORKFLOW_RECOMMENDATIONS[currentStep] || [];
  }, [currentStep]);
  
  const value = useMemo(() => ({
    isGuidedMode,
    isActionAllowed,
    getActionRestriction,
    recommendations,
    currentStep,
    translateError,
  }), [isGuidedMode, isActionAllowed, getActionRestriction, recommendations, currentStep]);
  
  return (
    <GuidedModeContext.Provider value={value}>
      {children}
    </GuidedModeContext.Provider>
  );
}


// Componente para mostrar recomendaciones contextuales
interface RecommendationsPanelProps {
  className?: string;
  maxItems?: number;
  showAll?: boolean;
}

export function RecommendationsPanel({ 
  className = '', 
  maxItems = 2,
  showAll = false,
}: RecommendationsPanelProps) {
  const { isGuidedMode, recommendations } = useGuidedMode();
  
  if (!isGuidedMode || recommendations.length === 0) {
    return null;
  }
  
  const displayedRecommendations = showAll 
    ? recommendations 
    : recommendations.slice(0, maxItems);
  
  const iconMap = {
    info: (
      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    tip: (
      <svg className="w-5 h-5 text-environmental" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };
  
  return (
    <div className={`bg-gradient-to-r from-environmental-50 to-blue-50 rounded-lg border border-environmental-200 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-environmental" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <h3 className="font-medium text-gray-800">Recomendaciones</h3>
      </div>
      
      <div className="space-y-3">
        {displayedRecommendations.map((rec, index) => (
          <div 
            key={index}
            className="flex gap-3 bg-white/60 rounded-lg p-3"
          >
            <div className="flex-shrink-0 mt-0.5">
              {iconMap[rec.icon]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm">{rec.title}</p>
              <p className="text-gray-600 text-sm mt-0.5">{rec.message}</p>
              {rec.action && (
                <button
                  onClick={rec.action.onClick}
                  className="mt-2 text-sm text-environmental hover:text-environmental-600 font-medium"
                >
                  {rec.action.label} →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {!showAll && recommendations.length > maxItems && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          +{recommendations.length - maxItems} más recomendaciones
        </p>
      )}
    </div>
  );
}

// Componente wrapper para acciones restringidas
interface RestrictedActionProps {
  action: GuidedActionType;
  children: ReactNode;
  onAttempt?: () => void;
  fallback?: ReactNode;
  showTooltip?: boolean;
}

export function RestrictedAction({
  action,
  children,
  onAttempt,
  fallback,
  showTooltip = true,
}: RestrictedActionProps) {
  const { isGuidedMode, isActionAllowed, getActionRestriction } = useGuidedMode();
  
  const restriction = getActionRestriction(action);
  const allowed = isActionAllowed(action);
  
  if (allowed) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // Renderizar versión deshabilitada con tooltip
  return (
    <div className="relative group">
      <div 
        className="opacity-50 cursor-not-allowed pointer-events-none"
        aria-disabled="true"
      >
        {children}
      </div>
      
      {showTooltip && restriction && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 max-w-xs shadow-lg">
            <p className="font-medium mb-1">{restriction.label} deshabilitado</p>
            <p className="text-gray-300">{restriction.reason}</p>
            {restriction.alternative && (
              <p className="text-environmental-300 mt-1">
                💡 {restriction.alternative}
              </p>
            )}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente para mostrar el badge de modo guiado
interface GuidedModeBadgeProps {
  className?: string;
  showLabel?: boolean;
}

export function GuidedModeBadge({ className = '', showLabel = true }: GuidedModeBadgeProps) {
  const { isGuidedMode } = useGuidedMode();
  
  if (!isGuidedMode) {
    return null;
  }
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-environmental-100 text-environmental-700 rounded-full text-xs font-medium ${className}`}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      {showLabel && <span>Modo Guiado</span>}
    </div>
  );
}

// Componente para mostrar errores de forma amigable
interface FriendlyErrorProps {
  error: string | Error;
  className?: string;
  onDismiss?: () => void;
  showTechnicalDetails?: boolean;
}

export function FriendlyError({
  error,
  className = '',
  onDismiss,
  showTechnicalDetails = false,
}: FriendlyErrorProps) {
  const { translateError: translate } = useGuidedMode();
  
  const errorMessage = error instanceof Error ? error.message : error;
  const friendlyMessage = translate(errorMessage);
  
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-red-800 font-medium">Algo salió mal</p>
          <p className="text-red-700 text-sm mt-1">{friendlyMessage}</p>
          
          {showTechnicalDetails && errorMessage !== friendlyMessage && (
            <details className="mt-2">
              <summary className="text-xs text-red-500 cursor-pointer hover:text-red-600">
                Detalles técnicos
              </summary>
              <pre className="mt-1 text-xs text-red-600 bg-red-100 p-2 rounded overflow-x-auto">
                {errorMessage}
              </pre>
            </details>
          )}
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-red-400 hover:text-red-600"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Componente de sugerencia de corrección automática
interface AutoCorrectionSuggestionProps {
  issue: string;
  suggestion: string;
  onAccept: () => void;
  onDismiss: () => void;
  className?: string;
}

export function AutoCorrectionSuggestion({
  issue,
  suggestion,
  onAccept,
  onDismiss,
  className = '',
}: AutoCorrectionSuggestionProps) {
  const { isGuidedMode } = useGuidedMode();
  
  if (!isGuidedMode) {
    return null;
  }
  
  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-amber-800 font-medium">Sugerencia de corrección</p>
          <p className="text-amber-700 text-sm mt-1">
            <span className="font-medium">Problema detectado:</span> {issue}
          </p>
          <p className="text-amber-700 text-sm mt-1">
            <span className="font-medium">Sugerencia:</span> {suggestion}
          </p>
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={onAccept}
              className="px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-colors"
            >
              Aplicar corrección
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-amber-700 text-sm hover:bg-amber-100 rounded-lg transition-colors"
            >
              Ignorar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
