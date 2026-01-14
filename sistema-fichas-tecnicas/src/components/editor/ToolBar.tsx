/**
 * ToolBar Component - Barra de herramientas del editor
 * Requirements: 3.7, 7.1
 * 
 * Componente reutilizable que proporciona:
 * - Undo/Redo funcional
 * - Guardar cambios
 * - Generar PDF
 * - Personalización de formato
 * - Indicadores de estado y sincronización
 * - Navegación y contexto
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { FichaStore } from '@/stores/fichaStore';
import type { Pozo } from '@/types/pozo';
import { ScopeIndicator } from './ScopeIndicator';
import { GuidedModeBadge } from '@/components/guided';

interface ToolBarProps {
  /** Store de la ficha actual */
  fichaStore: FichaStore;

  /** Datos del pozo */
  pozo: Pozo;

  /** Callback cuando se hace clic en volver */
  onBack?: () => void;

  /** Callback cuando se hace clic en personalizar */
  onCustomizeClick?: () => void;

  /** Callback cuando se hace clic en resetear formato */
  onResetFormat?: () => void;

  /** Callback cuando se hace clic en generar PDF */
  onGeneratePDF?: () => void;

  /** Estado de personalización visible */
  showCustomization?: boolean;

  /** Indicador de sincronización en progreso */
  isPending?: boolean;

  /** Versión actual del estado */
  version?: number;

  /** Indicador de scope global */
  isGlobalScope?: boolean;

  /** Callback cuando cambia el scope */
  onScopeChange?: (isGlobal: boolean) => void;

  /** Mostrar breadcrumbs y next step indicator */
  showWorkflowIndicators?: boolean;

  /** Componente de breadcrumbs personalizado */
  BreadcrumbsComponent?: React.ComponentType<any>;

  /** Componente de next step indicator personalizado */
  NextStepComponent?: React.ComponentType<any>;
}

export function ToolBar({
  fichaStore,
  pozo,
  onBack,
  onCustomizeClick,
  onResetFormat,
  onGeneratePDF,
  showCustomization = false,
  isPending = false,
  version = 1,
  isGlobalScope = false,
  onScopeChange,
  showWorkflowIndicators = true,
  BreadcrumbsComponent,
  NextStepComponent,
}: ToolBarProps) {
  const router = useRouter();

  // Determinar si undo/redo están disponibles
  const canUndo = useMemo(() => fichaStore.canUndo(), [fichaStore]);
  const canRedo = useMemo(() => fichaStore.canRedo(), [fichaStore]);

  // Handler para volver
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      router.push('/pozos');
    }
  }, [onBack, router]);

  // Handler para undo
  const handleUndo = useCallback(() => {
    if (canUndo) {
      fichaStore.undo();
    }
  }, [fichaStore, canUndo]);

  // Handler para redo
  const handleRedo = useCallback(() => {
    if (canRedo) {
      fichaStore.redo();
    }
  }, [fichaStore, canRedo]);

  // Handler para personalizar
  const handleCustomize = useCallback(() => {
    if (onCustomizeClick) {
      onCustomizeClick();
    }
  }, [onCustomizeClick]);

  // Handler para resetear formato
  const handleResetFormat = useCallback(() => {
    if (onResetFormat) {
      onResetFormat();
    }
  }, [onResetFormat]);

  // Handler para generar PDF
  const handleGeneratePDF = useCallback(() => {
    if (onGeneratePDF) {
      onGeneratePDF();
    }
  }, [onGeneratePDF]);

  return (
    <div className="flex flex-col bg-white border-b border-gray-200">
      {/* Workflow indicators row - Requirements 18.4, 18.5 */}
      {showWorkflowIndicators && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {BreadcrumbsComponent && <BreadcrumbsComponent compact showLabels />}
            {NextStepComponent && <NextStepComponent variant="inline" />}
          </div>
        </div>
      )}

      {/* Main toolbar row */}
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        {/* Left section: Navigation and context */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors flex-shrink-0"
            title="Volver a la lista de pozos"
            aria-label="Volver"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200 flex-shrink-0" />

          {/* Title and context */}
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-semibold text-gray-800 truncate">
              Editando: <span className="text-primary">{String(pozo.idPozo?.value || pozo.identificacion.idPozo.value || '-')}</span>
            </h1>

            {/* Sync indicator */}
            {isPending && (
              <span className="flex items-center gap-1 text-xs text-amber-600 flex-shrink-0">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sincronizando...
              </span>
            )}

            {/* Version indicator */}
            <span className="text-xs text-gray-400 flex-shrink-0">v{version}</span>

            {/* Scope indicator - Requirements 16.8, 16.9, 18.2 */}
            {onScopeChange && (
              <ScopeIndicator
                isGlobal={isGlobalScope}
                onScopeChange={onScopeChange}
                variant="badge"
              />
            )}

            {/* Guided mode badge - Requirements 14.1-14.4 */}
            <GuidedModeBadge showLabel={false} />
          </div>
        </div>

        {/* Right section: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Undo button */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${canUndo
              ? 'text-gray-600 hover:bg-gray-100'
              : 'text-gray-300 cursor-not-allowed'
              }`}
            title={canUndo ? 'Deshacer (Ctrl+Z)' : 'No hay acciones para deshacer'}
            aria-label="Deshacer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>

          {/* Redo button */}
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${canRedo
              ? 'text-gray-600 hover:bg-gray-100'
              : 'text-gray-300 cursor-not-allowed'
              }`}
            title={canRedo ? 'Rehacer (Ctrl+Y)' : 'No hay acciones para rehacer'}
            aria-label="Rehacer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200" />

          {/* Customize button - Requirements 6.1-6.4 */}
          {onCustomizeClick && (
            <button
              onClick={handleCustomize}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${showCustomization
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
              title="Personalizar formato"
              aria-label="Personalizar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <span className="hidden sm:inline">Personalizar</span>
            </button>
          )}

          {/* Reset format button - Requirements 12.1, 12.2, 12.4 */}
          {onResetFormat && (
            <button
              onClick={handleResetFormat}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Resetear formato (requiere confirmación)"
              aria-label="Resetear formato"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200" />

          {/* Generate PDF button - Requirements 7.1 */}
          {onGeneratePDF && (
            <button
              onClick={handleGeneratePDF}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
              title="Generar PDF"
              aria-label="Generar PDF"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Generar PDF</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ToolBar;
