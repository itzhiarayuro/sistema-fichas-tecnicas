/**
 * Dashboard Principal - Página de inicio
 * Requirements: 8.1, 18.4
 * 
 * Muestra:
 * - Resumen de pozos cargados y fichas completadas
 * - Accesos directos al flujo principal
 * - Indicadores de progreso del workflow
 * - Acciones rápidas
 */

'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGlobalStore, useUIStore } from '@/stores';
import { AppShell } from '@/components/layout';
import { NextStepIndicator, ProgressBar, WorkflowBreadcrumbs } from '@/components/layout';
import { RecommendationsPanel } from '@/components/guided';

export default function DashboardPage() {
  const router = useRouter();

  // Global store
  const pozos = useGlobalStore((state) => state.pozos);
  const photos = useGlobalStore((state) => state.photos);
  const guidedMode = useGlobalStore((state) => state.guidedMode);
  const setCurrentStep = useGlobalStore((state) => state.setCurrentStep);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const pozosArray = Array.from(pozos.values());
    const photosArray = Array.from(photos.values());

    // Contar pozos con fotos asociadas
    const pozosConFotos = pozosArray.filter(pozo => {
      return (pozo.fotos.fotos?.length || 0) > 0;
    }).length;

    // Contar pozos con datos completos (tienen al menos código y dirección)
    const pozosCompletos = pozosArray.filter(pozo =>
      String(pozo.identificacion.idPozo.value || '') && String(pozo.ubicacion.direccion.value || '')
    ).length;

    return {
      totalPozos: pozosArray.length,
      totalFotos: photosArray.length,
      pozosConFotos,
      pozosCompletos,
      pozosIncompletos: pozosArray.length - pozosCompletos,
    };
  }, [pozos, photos]);

  // Establecer paso inicial del workflow
  useEffect(() => {
    if (stats.totalPozos === 0) {
      setCurrentStep('upload');
    }
  }, [stats.totalPozos, setCurrentStep]);

  const hasData = stats.totalPozos > 0;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Sistema de Fichas Técnicas
          </h1>
          <p className="mt-2 text-gray-600">
            Pozos de Inspección de Alcantarillado
          </p>
        </div>

        {/* Panel de recomendaciones del modo guiado */}
        {guidedMode && (
          <RecommendationsPanel className="mb-6" maxItems={2} />
        )}

        {/* Progreso del workflow */}
        {hasData && (
          <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Progreso del Workflow</h2>
              <ProgressBar className="w-48" showPercentage />
            </div>
            <WorkflowBreadcrumbs showLabels compact={false} />
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Pozos Cargados"
            value={stats.totalPozos}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            color="primary"
            subtitle={stats.totalPozos > 0 ? `${stats.pozosCompletos} completos` : undefined}
          />

          <StatCard
            title="Fotografías"
            value={stats.totalFotos}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            color="environmental"
            subtitle={stats.pozosConFotos > 0 ? `${stats.pozosConFotos} pozos con fotos` : undefined}
          />

          <StatCard
            title="Datos Completos"
            value={stats.pozosCompletos}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="success"
            subtitle={stats.totalPozos > 0 ? `${Math.round((stats.pozosCompletos / stats.totalPozos) * 100)}% del total` : undefined}
          />

          <StatCard
            title="Pendientes"
            value={stats.pozosIncompletos}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="warning"
            subtitle={stats.pozosIncompletos > 0 ? 'Requieren revisión' : 'Todo al día'}
          />
        </div>

        {/* Acciones principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 tablet:grid-cols-3 gap-6 mb-8">
          {/* Cargar archivos */}
          <ActionCard
            title="Cargar Archivos"
            description="Carga archivos Excel con datos de pozos y fotografías para comenzar."
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            }
            href="/upload"
            buttonText="Ir a cargar"
            variant="primary"
            highlight={!hasData}
          />

          {/* Ver pozos */}
          <ActionCard
            title="Ver Pozos"
            description={hasData
              ? `Revisa y selecciona entre ${stats.totalPozos} pozos cargados.`
              : 'Carga datos primero para ver la lista de pozos.'
            }
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
            href="/pozos"
            buttonText="Ver lista"
            variant="secondary"
            disabled={!hasData}
          />

          {/* Editar ficha */}
          <ActionCard
            title="Editar Fichas"
            description={hasData
              ? 'Personaliza y genera fichas técnicas en PDF.'
              : 'Carga y selecciona un pozo para editar su ficha.'
            }
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
            href="/pozos"
            buttonText="Seleccionar pozo"
            variant="secondary"
            disabled={!hasData}
          />
        </div>

        {/* Siguiente paso recomendado */}
        {guidedMode && hasData && (
          <NextStepIndicator variant="banner" className="mb-8" />
        )}

        {/* Flujo de trabajo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Flujo de Trabajo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 tablet:grid-cols-5 gap-4">
            <WorkflowStepCard
              step={1}
              title="Cargar"
              description="Sube Excel y fotos"
              isActive={!hasData}
              isComplete={hasData}
            />
            <WorkflowStepCard
              step={2}
              title="Revisar"
              description="Verifica los datos"
              isActive={hasData}
              isComplete={false}
            />
            <WorkflowStepCard
              step={3}
              title="Editar"
              description="Personaliza la ficha"
              isActive={false}
              isComplete={false}
            />
            <WorkflowStepCard
              step={4}
              title="Preview"
              description="Revisa el resultado"
              isActive={false}
              isComplete={false}
            />
            <WorkflowStepCard
              step={5}
              title="Exportar"
              description="Genera el PDF"
              isActive={false}
              isComplete={false}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/**
 * StatCard - Tarjeta de estadística
 */
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'environmental' | 'success' | 'warning';
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const colorStyles = {
    primary: 'bg-primary-50 text-primary-600',
    environmental: 'bg-environmental-50 text-environmental-600',
    success: 'bg-green-50 text-green-600',
    warning: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorStyles[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ActionCard - Tarjeta de acción principal
 */
interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  buttonText: string;
  variant: 'primary' | 'secondary';
  disabled?: boolean;
  highlight?: boolean;
}

function ActionCard({
  title,
  description,
  icon,
  href,
  buttonText,
  variant,
  disabled = false,
  highlight = false,
}: ActionCardProps) {
  const cardClasses = highlight
    ? 'bg-gradient-to-br from-primary-50 to-environmental-50 border-primary-200'
    : 'bg-white border-gray-200';

  const buttonClasses = variant === 'primary'
    ? 'bg-primary text-white hover:bg-primary-dark'
    : 'bg-gray-100 text-gray-700 hover:bg-gray-200';

  return (
    <div className={`rounded-xl shadow-sm border p-6 ${cardClasses} ${disabled ? 'opacity-60' : ''}`}>
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${variant === 'primary' ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
        }`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      {disabled ? (
        <button
          disabled
          className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
        >
          {buttonText}
        </button>
      ) : (
        <Link
          href={href}
          className={`block w-full px-4 py-2.5 rounded-lg text-sm font-medium text-center transition-colors ${buttonClasses}`}
        >
          {buttonText}
        </Link>
      )}
    </div>
  );
}

/**
 * WorkflowStepCard - Tarjeta de paso del workflow
 */
interface WorkflowStepCardProps {
  step: number;
  title: string;
  description: string;
  isActive: boolean;
  isComplete: boolean;
}

function WorkflowStepCard({ step, title, description, isActive, isComplete }: WorkflowStepCardProps) {
  return (
    <div className={`relative p-4 rounded-lg border-2 transition-all ${isComplete
      ? 'border-environmental bg-environmental-50'
      : isActive
        ? 'border-primary bg-primary-50'
        : 'border-gray-200 bg-gray-50'
      }`}>
      {/* Número del paso */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${isComplete
        ? 'bg-environmental text-white'
        : isActive
          ? 'bg-primary text-white'
          : 'bg-gray-200 text-gray-500'
        }`}>
        {isComplete ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          step
        )}
      </div>

      <h4 className={`font-medium ${isComplete || isActive ? 'text-gray-900' : 'text-gray-500'
        }`}>
        {title}
      </h4>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>

      {/* Conector */}
      {step < 5 && (
        <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-0.5 bg-gray-200 transform -translate-y-1/2" />
      )}
    </div>
  );
}
