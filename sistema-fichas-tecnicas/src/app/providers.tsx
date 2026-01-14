/**
 * GlobalProviders - Componentes globales de la aplicación
 * 
 * Incluye:
 * - GuidedModeProvider para el modo guiado (Requirements: 14.1-14.4)
 * - ConfirmDialog para confirmaciones de acciones destructivas
 * - ToastContainer para notificaciones
 */

'use client';

import { ReactNode } from 'react';
import { ConfirmDialog, ToastContainer } from '@/components/ui';
import { GuidedModeProvider } from '@/components/guided';

interface GlobalProvidersProps {
  children: ReactNode;
}

export function GlobalProviders({ children }: GlobalProvidersProps) {
  return (
    <GuidedModeProvider>
      {children}
      <ConfirmDialog />
      <ToastContainer />
    </GuidedModeProvider>
  );
}
