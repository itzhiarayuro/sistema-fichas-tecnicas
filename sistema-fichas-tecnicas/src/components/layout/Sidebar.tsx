/**
 * Sidebar - Navegación lateral
 * Requirements: 8.1, 18.4, 18.5
 * 
 * Sidebar de navegación fija que incluye:
 * - Logo y título de la aplicación
 * - Navegación principal con iconos
 * - Indicador de paso actual del workflow
 * - Resaltado visual del siguiente paso recomendado
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore, useGlobalStore, WorkflowStep } from '@/stores';

import { navItems } from '@/constants/navigation';


// Orden del workflow para determinar el siguiente paso
const workflowOrder: WorkflowStep[] = ['upload', 'review', 'edit', 'preview', 'export'];

function getNextStep(currentStep: WorkflowStep): WorkflowStep | null {
  const currentIndex = workflowOrder.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= workflowOrder.length - 1) {
    return null;
  }
  return workflowOrder[currentIndex + 1];
}

function getStepLabel(step: WorkflowStep): string {
  const labels: Record<WorkflowStep, string> = {
    upload: 'Carga de archivos',
    review: 'Revisión de pozos',
    edit: 'Edición de ficha',
    preview: 'Vista previa',
    export: 'Exportación',
  };
  return labels[step];
}

export function Sidebar() {
  const pathname = usePathname();
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const mobileMenuOpen = useUIStore((state) => state.mobileMenuOpen);
  const setMobileMenuOpen = useUIStore((state) => state.setMobileMenuOpen);
  const currentStep = useGlobalStore((state) => state.currentStep);
  const guidedMode = useGlobalStore((state) => state.config.guidedMode);

  const nextStep = getNextStep(currentStep);

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-primary text-white transition-all duration-300 z-50 flex flex-col 
        ${sidebarCollapsed ? 'lg:w-16' : 'desktop:w-[280px] tablet:w-[240px]'} 
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        tablet:translate-x-0`}
    >
      {/* Logo y toggle */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-primary-400 flex-shrink-0">
        {(!sidebarCollapsed || mobileMenuOpen) && (
          <span className="font-bold text-lg truncate desktop:block hidden">Fichas Técnicas</span>
        )}
        {(!sidebarCollapsed || mobileMenuOpen) && (
          <span className="font-bold text-lg truncate desktop:hidden block">Fichas</span>
        )}

        {/* Toggle Desktop */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex p-2 hover:bg-primary-600 rounded-lg transition-colors flex-shrink-0"
          aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          <svg
            className={`w-5 h-5 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Close Mobile */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-2 hover:bg-primary-600 rounded-lg transition-colors flex-shrink-0"
          aria-label="Cerrar menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            const isNextStep = guidedMode && item.step !== null && nextStep === item.step;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group ${isActive
                    ? 'bg-white/20 text-white font-medium'
                    : isNextStep
                      ? 'bg-environmental/30 text-white ring-2 ring-environmental animate-pulse'
                      : 'hover:bg-white/10'
                    }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  {(!sidebarCollapsed || mobileMenuOpen) && (
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{item.label}</span>
                      {isNextStep && (
                        <span className="text-xs text-environmental-200">
                          Siguiente paso →
                        </span>
                      )}
                    </div>
                  )}

                  {/* Indicador de activo */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Indicador de workflow */}
      <div className="p-4 border-t border-primary-400 flex-shrink-0">
        {(!sidebarCollapsed || mobileMenuOpen) ? (
          <div className="bg-primary-600 rounded-lg p-3">
            <p className="text-xs text-primary-200 mb-1">Paso actual</p>
            <p className="font-medium">{getStepLabel(currentStep)}</p>
            {nextStep && guidedMode && (
              <p className="text-xs text-environmental-300 mt-2">
                Siguiente: {getStepLabel(nextStep)}
              </p>
            )}
          </div>
        ) : (
          <div
            className="w-8 h-8 mx-auto bg-primary-600 rounded-full flex items-center justify-center"
            title={`Paso actual: ${getStepLabel(currentStep)}`}
          >
            <span className="text-xs font-bold">
              {workflowOrder.indexOf(currentStep) + 1}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
