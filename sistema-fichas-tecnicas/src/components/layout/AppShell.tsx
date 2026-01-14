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
import { ToastContainer } from '@/components/ui/Toast';
import { useUIStore } from '@/stores';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const isGlobalLoading = useUIStore((state) => state.isGlobalLoading);
  const loadingMessage = useUIStore((state) => state.loadingMessage);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar de navegación */}
      <Sidebar />
      
      {/* Contenido principal */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <Header />
        <main className="p-6 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
      
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
