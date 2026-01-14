/**
 * ScopeIndicator - Indicador visual de scope de personalización
 * Requirements: 16.8, 16.9, 18.2
 * 
 * Muestra claramente si los cambios de personalización afectan:
 * - Solo la ficha actual (local)
 * - Futuras fichas (global/plantilla)
 * 
 * Proporciona feedback visual inmediato sobre el impacto de los cambios.
 */

'use client';

import { useState, useCallback } from 'react';

interface ScopeIndicatorProps {
  /** Si el scope actual es global */
  isGlobal: boolean;
  /** Callback cuando cambia el scope */
  onScopeChange: (isGlobal: boolean) => void;
  /** Si está en modo solo lectura */
  readOnly?: boolean;
  /** Variante de visualización */
  variant?: 'badge' | 'toggle' | 'full';
  /** Mostrar tooltip explicativo */
  showTooltip?: boolean;
}

export function ScopeIndicator({
  isGlobal,
  onScopeChange,
  readOnly = false,
  variant = 'badge',
  showTooltip = true,
}: ScopeIndicatorProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const handleToggle = useCallback(() => {
    if (readOnly) return;
    onScopeChange(!isGlobal);
  }, [isGlobal, onScopeChange, readOnly]);

  if (variant === 'badge') {
    return (
      <div 
        className="relative inline-flex"
        onMouseEnter={() => showTooltip && setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
      >
        <button
          onClick={handleToggle}
          disabled={readOnly}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            isGlobal
              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
          } ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isGlobal ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Global
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Local
            </>
          )}
        </button>

        {/* Tooltip */}
        {tooltipVisible && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50">
            {isGlobal
              ? 'Los cambios se aplicarán a futuras fichas'
              : 'Los cambios solo afectan esta ficha'
            }
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'toggle') {
    return (
      <div className="flex items-center gap-3">
        <span className={`text-sm ${!isGlobal ? 'text-blue-700 font-medium' : 'text-gray-500'}`}>
          Local
        </span>
        <button
          onClick={handleToggle}
          disabled={readOnly}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            isGlobal ? 'bg-amber-500' : 'bg-blue-500'
          } ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              isGlobal ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm ${isGlobal ? 'text-amber-700 font-medium' : 'text-gray-500'}`}>
          Global
        </span>
      </div>
    );
  }

  // Full variant with detailed explanation
  return (
    <div className={`p-4 rounded-lg border ${
      isGlobal 
        ? 'bg-amber-50 border-amber-200' 
        : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${isGlobal ? 'bg-amber-100' : 'bg-blue-100'}`}>
          {isGlobal ? (
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
        </div>
        
        <div className="flex-1">
          <h4 className={`text-sm font-semibold ${isGlobal ? 'text-amber-800' : 'text-blue-800'}`}>
            {isGlobal ? 'Modo Global (Plantilla)' : 'Modo Local (Solo esta ficha)'}
          </h4>
          <p className={`text-xs mt-1 ${isGlobal ? 'text-amber-700' : 'text-blue-700'}`}>
            {isGlobal
              ? 'Los cambios de formato se guardarán como plantilla y se aplicarán automáticamente a las nuevas fichas que crees.'
              : 'Los cambios de formato solo afectan a esta ficha. Las demás fichas mantendrán su formato actual.'
            }
          </p>
          
          <button
            onClick={handleToggle}
            disabled={readOnly}
            className={`mt-3 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              isGlobal
                ? 'bg-amber-200 text-amber-800 hover:bg-amber-300'
                : 'bg-blue-200 text-blue-800 hover:bg-blue-300'
            } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isGlobal ? 'Cambiar a modo local' : 'Aplicar como plantilla global'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ScopeChangeConfirmation - Diálogo de confirmación para cambio de scope
 * Muestra advertencia antes de aplicar cambios globalmente
 */
interface ScopeChangeConfirmationProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  changingTo: 'global' | 'local';
}

export function ScopeChangeConfirmation({
  isOpen,
  onConfirm,
  onCancel,
  changingTo,
}: ScopeChangeConfirmationProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className={`px-6 py-4 ${changingTo === 'global' ? 'bg-amber-50' : 'bg-blue-50'}`}>
          <div className="flex items-center gap-3">
            {changingTo === 'global' ? (
              <div className="p-2 bg-amber-100 rounded-lg">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            ) : (
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
            <h3 className={`text-lg font-semibold ${changingTo === 'global' ? 'text-amber-800' : 'text-blue-800'}`}>
              {changingTo === 'global' 
                ? '¿Aplicar como plantilla global?' 
                : '¿Cambiar a modo local?'
              }
            </h3>
          </div>
        </div>
        
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600">
            {changingTo === 'global'
              ? 'Los cambios de formato actuales se guardarán como plantilla predeterminada. Las nuevas fichas que crees usarán este formato automáticamente.'
              : 'Los cambios de formato solo se aplicarán a esta ficha. Las demás fichas no se verán afectadas.'
            }
          </p>
          
          {changingTo === 'global' && (
            <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-700">
                <strong>Nota:</strong> Las fichas existentes no se modificarán. Solo las nuevas fichas usarán esta plantilla.
              </p>
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              changingTo === 'global'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {changingTo === 'global' ? 'Aplicar como plantilla' : 'Cambiar a local'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScopeIndicator;
