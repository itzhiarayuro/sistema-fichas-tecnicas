/**
 * FlowIndicators - Indicadores de flujo del workflow
 * Requirements: 18.4, 18.5
 * 
 * Componentes para mostrar:
 * - Breadcrumbs de progreso del workflow
 * - Indicador del siguiente paso recomendado
 * - Barra de progreso visual
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGlobalStore, WorkflowStep } from '@/stores';

// Configuración de los pasos del workflow
interface WorkflowStepConfig {
  step: WorkflowStep;
  label: string;
  shortLabel: string;
  href: string;
  icon: React.ReactNode;
  description: string;
}

const WORKFLOW_STEPS: WorkflowStepConfig[] = [
  {
    step: 'upload',
    label: 'Cargar Archivos',
    shortLabel: 'Cargar',
    href: '/upload',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    description: 'Carga archivos Excel y fotografías',
  },
  {
    step: 'review',
    label: 'Revisar Pozos',
    shortLabel: 'Revisar',
    href: '/pozos',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    description: 'Revisa los datos cargados',
  },
  {
    step: 'edit',
    label: 'Editar Ficha',
    shortLabel: 'Editar',
    href: '/editor',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    description: 'Edita la ficha técnica',
  },
  {
    step: 'preview',
    label: 'Vista Previa',
    shortLabel: 'Preview',
    href: '/editor',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    description: 'Revisa el resultado final',
  },
  {
    step: 'export',
    label: 'Exportar PDF',
    shortLabel: 'Exportar',
    href: '/editor',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    description: 'Genera el PDF final',
  },
];

// Obtener el índice del paso actual
function getStepIndex(step: WorkflowStep): number {
  return WORKFLOW_STEPS.findIndex((s) => s.step === step);
}

// Obtener el siguiente paso
function getNextStep(currentStep: WorkflowStep): WorkflowStepConfig | null {
  const currentIndex = getStepIndex(currentStep);
  if (currentIndex === -1 || currentIndex >= WORKFLOW_STEPS.length - 1) {
    return null;
  }
  return WORKFLOW_STEPS[currentIndex + 1];
}

// Determinar el estado de un paso
type StepStatus = 'completed' | 'current' | 'upcoming' | 'next';

function getStepStatus(stepIndex: number, currentIndex: number, isGuidedMode: boolean): StepStatus {
  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'current';
  if (isGuidedMode && stepIndex === currentIndex + 1) return 'next';
  return 'upcoming';
}

/**
 * WorkflowBreadcrumbs - Breadcrumbs de progreso del workflow
 * Muestra todos los pasos del workflow con indicadores visuales de progreso
 */
interface WorkflowBreadcrumbsProps {
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}

export function WorkflowBreadcrumbs({ 
  className = '', 
  showLabels = true,
  compact = false,
}: WorkflowBreadcrumbsProps) {
  const currentStep = useGlobalStore((state) => state.currentStep);
  const guidedMode = useGlobalStore((state) => state.config.guidedMode);
  const currentIndex = getStepIndex(currentStep);
  
  return (
    <nav 
      className={`flex items-center ${className}`}
      aria-label="Progreso del workflow"
    >
      <ol className={`flex items-center ${compact ? 'gap-1' : 'gap-2'}`}>
        {WORKFLOW_STEPS.map((stepConfig, index) => {
          const status = getStepStatus(index, currentIndex, guidedMode);
          const isLast = index === WORKFLOW_STEPS.length - 1;
          
          return (
            <li key={stepConfig.step} className="flex items-center">
              <BreadcrumbStep
                config={stepConfig}
                status={status}
                showLabel={showLabels}
                compact={compact}
              />
              
              {/* Conector entre pasos */}
              {!isLast && (
                <div 
                  className={`${compact ? 'w-4 mx-1' : 'w-8 mx-2'} h-0.5 ${
                    index < currentIndex 
                      ? 'bg-environmental' 
                      : 'bg-gray-200'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * BreadcrumbStep - Paso individual del breadcrumb
 */
interface BreadcrumbStepProps {
  config: WorkflowStepConfig;
  status: StepStatus;
  showLabel: boolean;
  compact: boolean;
}

function BreadcrumbStep({ config, status, showLabel, compact }: BreadcrumbStepProps) {
  const statusStyles = {
    completed: {
      circle: 'bg-environmental text-white',
      label: 'text-environmental font-medium',
      ring: '',
    },
    current: {
      circle: 'bg-primary text-white',
      label: 'text-primary font-semibold',
      ring: 'ring-2 ring-primary ring-offset-2',
    },
    next: {
      circle: 'bg-environmental-100 text-environmental-600 border-2 border-environmental',
      label: 'text-environmental-600 font-medium',
      ring: 'animate-pulse',
    },
    upcoming: {
      circle: 'bg-gray-100 text-gray-400 border border-gray-300',
      label: 'text-gray-400',
      ring: '',
    },
  };
  
  const styles = statusStyles[status];
  const isClickable = status === 'completed' || status === 'current';
  
  const content = (
    <div 
      className={`flex items-center gap-2 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
      title={config.description}
    >
      {/* Círculo con icono o checkmark */}
      <div 
        className={`
          ${compact ? 'w-6 h-6' : 'w-8 h-8'} 
          rounded-full flex items-center justify-center 
          transition-all duration-200
          ${styles.circle} ${styles.ring}
        `}
      >
        {status === 'completed' ? (
          <svg className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className={compact ? 'scale-75' : ''}>{config.icon}</span>
        )}
      </div>
      
      {/* Label */}
      {showLabel && (
        <span className={`text-sm whitespace-nowrap ${styles.label}`}>
          {compact ? config.shortLabel : config.label}
        </span>
      )}
    </div>
  );
  
  if (isClickable) {
    return (
      <Link href={config.href} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }
  
  return content;
}

/**
 * NextStepIndicator - Indicador del siguiente paso recomendado
 * Muestra prominentemente cuál es el siguiente paso a seguir
 */
interface NextStepIndicatorProps {
  className?: string;
  showDescription?: boolean;
  variant?: 'banner' | 'card' | 'inline';
}

export function NextStepIndicator({ 
  className = '', 
  showDescription = true,
  variant = 'card',
}: NextStepIndicatorProps) {
  const currentStep = useGlobalStore((state) => state.currentStep);
  const guidedMode = useGlobalStore((state) => state.config.guidedMode);
  
  const nextStep = getNextStep(currentStep);
  
  // No mostrar si no hay siguiente paso o no está en modo guiado
  if (!nextStep || !guidedMode) {
    return null;
  }
  
  if (variant === 'inline') {
    return (
      <Link 
        href={nextStep.href}
        className={`inline-flex items-center gap-2 text-environmental hover:text-environmental-600 transition-colors ${className}`}
      >
        <span className="text-sm font-medium">Siguiente:</span>
        <span className="text-sm">{nextStep.label}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    );
  }
  
  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-environmental-50 to-environmental-100 border-l-4 border-environmental px-4 py-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-environmental text-white flex items-center justify-center">
              {nextStep.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-environmental-800">
                Siguiente paso recomendado
              </p>
              <p className="text-environmental-700 font-semibold">
                {nextStep.label}
              </p>
            </div>
          </div>
          <Link
            href={nextStep.href}
            className="px-4 py-2 bg-environmental text-white rounded-lg hover:bg-environmental-600 transition-colors text-sm font-medium flex items-center gap-2"
          >
            Continuar
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }
  
  // Default: card variant
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-environmental-200 overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-environmental-500 to-environmental-600 px-4 py-2">
        <p className="text-white text-sm font-medium flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          Siguiente paso
        </p>
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-environmental-100 text-environmental-600 flex items-center justify-center flex-shrink-0">
            {nextStep.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900">{nextStep.label}</h4>
            {showDescription && (
              <p className="text-sm text-gray-600 mt-0.5">{nextStep.description}</p>
            )}
          </div>
        </div>
        <Link
          href={nextStep.href}
          className="mt-4 w-full px-4 py-2.5 bg-environmental text-white rounded-lg hover:bg-environmental-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          Ir al siguiente paso
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/**
 * ProgressBar - Barra de progreso del workflow
 * Muestra el progreso general a través del workflow
 */
interface ProgressBarProps {
  className?: string;
  showPercentage?: boolean;
  showStepCount?: boolean;
}

export function ProgressBar({ 
  className = '', 
  showPercentage = false,
  showStepCount = true,
}: ProgressBarProps) {
  const currentStep = useGlobalStore((state) => state.currentStep);
  const currentIndex = getStepIndex(currentStep);
  const totalSteps = WORKFLOW_STEPS.length;
  const progress = ((currentIndex + 1) / totalSteps) * 100;
  
  return (
    <div className={`${className}`}>
      {/* Labels */}
      <div className="flex items-center justify-between mb-1.5">
        {showStepCount && (
          <span className="text-xs text-gray-500">
            Paso {currentIndex + 1} de {totalSteps}
          </span>
        )}
        {showPercentage && (
          <span className="text-xs font-medium text-primary">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary to-environmental rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * StepIndicatorDots - Indicador de pasos con puntos
 * Versión minimalista del indicador de progreso
 */
interface StepIndicatorDotsProps {
  className?: string;
}

export function StepIndicatorDots({ className = '' }: StepIndicatorDotsProps) {
  const currentStep = useGlobalStore((state) => state.currentStep);
  const guidedMode = useGlobalStore((state) => state.config.guidedMode);
  const currentIndex = getStepIndex(currentStep);
  
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {WORKFLOW_STEPS.map((stepConfig, index) => {
        const status = getStepStatus(index, currentIndex, guidedMode);
        
        return (
          <div
            key={stepConfig.step}
            className={`
              w-2 h-2 rounded-full transition-all duration-200
              ${status === 'completed' ? 'bg-environmental' : ''}
              ${status === 'current' ? 'bg-primary w-4' : ''}
              ${status === 'next' ? 'bg-environmental-300 animate-pulse' : ''}
              ${status === 'upcoming' ? 'bg-gray-300' : ''}
            `}
            title={stepConfig.label}
          />
        );
      })}
    </div>
  );
}
