/**
 * UploadProgress Component - Indicador de progreso de carga
 * Requirements: 1.6
 * 
 * Muestra el progreso de carga para archivos grandes (>5MB)
 * con estadísticas detalladas del procesamiento.
 */

'use client';

import { useMemo } from 'react';

export interface UploadStats {
  totalFiles: number;
  processedFiles: number;
  totalPozos: number;
  totalPhotos: number;
  warnings: number;
  errors: number;
}

export interface UploadProgressProps {
  /** Progreso general (0-100) */
  progress: number;
  /** Estadísticas de la carga */
  stats?: UploadStats;
  /** Mensaje de estado actual */
  message?: string;
  /** Si está procesando */
  isProcessing: boolean;
  /** Callback para cancelar */
  onCancel?: () => void;
  /** Clase CSS adicional */
  className?: string;
}

export function UploadProgress({
  progress,
  stats,
  message,
  isProcessing,
  onCancel,
  className = '',
}: UploadProgressProps) {
  // Calcular el color de la barra según el progreso
  const progressColor = useMemo(() => {
    if (stats?.errors && stats.errors > 0) return 'bg-yellow-500';
    if (progress === 100) return 'bg-green-500';
    return 'bg-primary';
  }, [progress, stats?.errors]);

  // Calcular tiempo estimado (simulado)
  const estimatedTime = useMemo(() => {
    if (!isProcessing || progress >= 100) return null;
    const remaining = 100 - progress;
    const seconds = Math.ceil(remaining / 10); // Estimación simple
    if (seconds < 60) return `~${seconds}s restantes`;
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes}min restantes`;
  }, [isProcessing, progress]);

  if (!isProcessing && progress === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Header con mensaje y tiempo estimado */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isProcessing && (
            <svg className="w-5 h-5 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {progress === 100 && !isProcessing && (
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span className="text-sm font-medium text-gray-700">
            {message || (isProcessing ? 'Procesando archivos...' : 'Procesamiento completado')}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {estimatedTime && (
            <span className="text-xs text-gray-500">{estimatedTime}</span>
          )}
          {isProcessing && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="relative">
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ease-out ${progressColor}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <span className="absolute right-0 -top-6 text-xs font-medium text-gray-600">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Estadísticas detalladas */}
      {stats && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatItem
            label="Archivos"
            value={`${stats.processedFiles}/${stats.totalFiles}`}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          />
          <StatItem
            label="Pozos"
            value={stats.totalPozos.toString()}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            color="text-primary"
          />
          <StatItem
            label="Fotos"
            value={stats.totalPhotos.toString()}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            color="text-blue-600"
          />
          {stats.warnings > 0 ? (
            <StatItem
              label="Advertencias"
              value={stats.warnings.toString()}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
              color="text-yellow-600"
            />
          ) : stats.errors > 0 ? (
            <StatItem
              label="Errores"
              value={stats.errors.toString()}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="text-red-600"
            />
          ) : (
            <StatItem
              label="Estado"
              value="OK"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="text-green-600"
            />
          )}
        </div>
      )}
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}

function StatItem({ label, value, icon, color = 'text-gray-600' }: StatItemProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
      <div className={color}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm font-semibold ${color}`}>{value}</p>
      </div>
    </div>
  );
}
