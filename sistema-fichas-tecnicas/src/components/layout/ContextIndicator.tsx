/**
 * ContextIndicator - Muestra ficha actual, estado y scope de cambios
 * Requirements: 18.1-18.3
 * 
 * Indicador visual que muestra:
 * - Pozo actualmente seleccionado
 * - Ficha en edición
 * - Estado de la ficha (borrador, editando, completa, finalizada)
 * - Scope de los cambios (local vs global)
 */

'use client';

import { useUIStore } from '@/stores';

type FichaStatus = 'draft' | 'editing' | 'complete' | 'finalized';
type ChangeScope = 'local' | 'global';

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

const STATUS_CONFIG: Record<FichaStatus, StatusConfig> = {
  draft: {
    label: 'Borrador',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: '📝',
  },
  editing: {
    label: 'Editando',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: '✏️',
  },
  complete: {
    label: 'Completa',
    color: 'text-environmental-700',
    bgColor: 'bg-environmental-100',
    icon: '✓',
  },
  finalized: {
    label: 'Finalizada',
    color: 'text-primary-700',
    bgColor: 'bg-primary-100',
    icon: '🔒',
  },
};

interface ContextIndicatorProps {
  fichaStatus?: FichaStatus;
  changeScope?: ChangeScope;
  hasUnsavedChanges?: boolean;
}

export function ContextIndicator({ 
  fichaStatus = 'draft',
  changeScope = 'local',
  hasUnsavedChanges = false,
}: ContextIndicatorProps) {
  const selectedFichaId = useUIStore((state) => state.selectedFichaId);
  const selectedPozoId = useUIStore((state) => state.selectedPozoId);
  
  // Si no hay nada seleccionado
  if (!selectedFichaId && !selectedPozoId) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-sm">Ninguna ficha seleccionada</span>
      </div>
    );
  }
  
  const status = STATUS_CONFIG[fichaStatus];
  
  return (
    <div className="flex items-center gap-4">
      {/* Pozo seleccionado */}
      {selectedPozoId && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Pozo:</span>
          <span className="font-semibold text-primary bg-primary-50 px-2 py-0.5 rounded">
            {selectedPozoId}
          </span>
        </div>
      )}
      
      {/* Separador */}
      {selectedPozoId && selectedFichaId && (
        <div className="w-px h-6 bg-gray-200" />
      )}
      
      {/* Ficha seleccionada */}
      {selectedFichaId && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Ficha:</span>
          <span className="font-medium text-gray-700">
            {selectedFichaId.slice(0, 8)}...
          </span>
        </div>
      )}
      
      {/* Estado de la ficha */}
      {selectedFichaId && (
        <>
          <div className="w-px h-6 bg-gray-200" />
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
            <span>{status.icon}</span>
            <span>{status.label}</span>
          </div>
        </>
      )}
      
      {/* Indicador de scope de cambios */}
      {selectedFichaId && (
        <div 
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            changeScope === 'local' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-purple-100 text-purple-700'
          }`}
          title={changeScope === 'local' 
            ? 'Los cambios afectan solo a esta ficha' 
            : 'Los cambios se aplicarán a futuras fichas'
          }
        >
          {changeScope === 'local' ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Cambios locales</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Cambios globales</span>
            </>
          )}
        </div>
      )}
      
      {/* Indicador de cambios sin guardar */}
      {hasUnsavedChanges && (
        <div className="flex items-center gap-1.5 text-warning text-xs">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
          <span>Sin guardar</span>
        </div>
      )}
    </div>
  );
}
