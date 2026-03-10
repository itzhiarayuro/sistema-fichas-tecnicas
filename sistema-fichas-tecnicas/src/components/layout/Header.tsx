/**
 * Header - Barra superior con contexto
 * Requirements: 18.1-18.3, 18.4, 18.5
 * 
 * Barra superior que muestra:
 * - Breadcrumbs de progreso del workflow
 * - Indicador de contexto actual (ficha, pozo)
 * - Toggle de modo guiado
 * - Acciones rápidas contextuales
 */

'use client';

import { useUIStore, useGlobalStore } from '@/stores';
import { ContextIndicator } from './ContextIndicator';
import { WorkflowBreadcrumbs, StepIndicatorDots } from './FlowIndicators';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/services/firebaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function Header() {
  const guidedMode = useGlobalStore((state) => state.config.guidedMode);
  const setConfig = useGlobalStore((state) => state.setConfig);
  const currentStep = useGlobalStore((state) => state.currentStep);
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Breadcrumbs y contexto */}
      <div className="flex items-center gap-6">
        {/* Toggle Mobile */}
        <button
          onClick={() => useUIStore.getState().toggleMobileMenu()}
          className="tablet:hidden -ml-2 p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Breadcrumbs - visible en pantallas grandes */}
        <div className="hidden lg:block">
          <WorkflowBreadcrumbs compact showLabels={false} />
        </div>

        {/* Dots indicator - visible en pantallas medianas */}
        <div className="hidden md:block lg:hidden">
          <StepIndicatorDots />
        </div>

        {/* Separador */}
        <div className="hidden md:block w-px h-8 bg-gray-200" />

        {/* Contexto actual */}
        <ContextIndicator />
      </div>

      {/* Acciones y configuración */}
      <div className="flex items-center gap-6">
        {/* Indicador de paso actual (visible en móvil) */}
        <div className="flex md:hidden items-center gap-2 text-sm text-gray-500">
          <span className="w-2 h-2 rounded-full bg-environmental animate-pulse" />
          <span className="capitalize">{currentStep}</span>
        </div>

        {/* Toggle de modo guiado */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <span className="text-sm text-gray-600 hidden sm:inline">Modo Guiado</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={guidedMode}
              onChange={(e) => setConfig({ guidedMode: e.target.checked })}
              className="sr-only peer"
              aria-label="Activar modo guiado"
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 ${guidedMode ? 'bg-environmental' : 'bg-gray-300'
                }`}
            />
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${guidedMode ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
          </div>
          {guidedMode && (
            <span className="text-xs text-environmental font-medium hidden md:inline">
              Activo
            </span>
          )}
        </label>

        {/* Botón de ayuda */}
        <button
          className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Ayuda"
          title="Ayuda y documentación"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Separador */}
        <div className="w-px h-8 bg-gray-200" />

        {/* Volver al Portal */}
        <Link
          href="/portal"
          className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
          title="Volver al selector de aplicaciones"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Cerrar Sesión"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}
