/**
 * AppShell - Layout principal con sidebar
 * Requirements: 8.1, 18.4
 * 
 * Componente principal que envuelve toda la aplicación proporcionando:
 * - Sidebar de navegación fija
 * - Header con contexto actual
 * - Sistema de notificaciones toast
 * - Área de contenido principal responsive
 */

'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { ToastContainer } from '@/components/ui/Toast';
import { useUIStore } from '@/stores';
import { logger } from '@/lib/logger';

interface AppShellProps {
  children: ReactNode;
  noPadding?: boolean;
}

export function AppShell({ children, noPadding = false }: AppShellProps) {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const isGlobalLoading = useUIStore((state) => state.isGlobalLoading);
  const loadingMessage = useUIStore((state) => state.loadingMessage);
  const mobileMenuOpen = useUIStore((state) => state.mobileMenuOpen);
  const setMobileMenuOpen = useUIStore((state) => state.setMobileMenuOpen);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sidebar de navegación */}
      {/* Overlay para móvil */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 tablet:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar />

      {/* Contenido principal */}
      <div
        className={`transition-all duration-300 w-full flex-1 flex flex-col
          ${sidebarCollapsed
            ? 'lg:ml-16'
            : 'desktop:ml-[280px] tablet:ml-[240px] ml-0'}`}
      >
        <Header />
        <main className={`${noPadding ? '' : 'p-5 md:p-8 desktop:p-10 pb-24 tablet:pb-8'} min-h-[calc(100vh-4rem)]`}>
          {children}
        </main>

        {/* Footer info (opcional, como pidió el usuario hacerlo sticky/fijo) */}
        <footer className="mt-auto p-4 flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 hidden md:flex">
          <div>
            &copy; {new Date().getFullYear()} Sistema de Fichas Técnicas - Gestión de Alcantarillado
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => logger.downloadLogs()}
              className="text-primary hover:underline flex items-center gap-1"
              title="Descargar logs detallados para depuración"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar Logs de Errores
            </button>
          </div>
        </footer>
      </div>

      {/* Navegación inferior móvil */}
      <BottomNav />

      {/* Sistema de notificaciones */}
      <ToastContainer />

      {/* Overlay de carga global */}
      {isGlobalLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            {loadingMessage && (
              <p className="text-gray-700 text-sm">{loadingMessage}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
