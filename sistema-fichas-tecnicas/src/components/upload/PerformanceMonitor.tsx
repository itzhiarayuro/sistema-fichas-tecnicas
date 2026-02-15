/**
 * PerformanceMonitor - Monitorea rendimiento durante cargas masivas
 * Muestra estadísticas de memoria, velocidad y recomendaciones
 */

'use client';

import { useState, useEffect } from 'react';
import { memoryManager } from '@/lib/managers/memoryManager';

interface PerformanceMonitorProps {
  isActive?: boolean;
  onRecommendation?: (recommendation: string) => void;
  className?: string;
}

export function PerformanceMonitor({ 
  isActive = false, 
  onRecommendation,
  className = '' 
}: PerformanceMonitorProps) {
  const [memoryStats, setMemoryStats] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const stats = memoryManager.getMemoryStats();
      setMemoryStats(stats);

      // Generar recomendaciones
      if (stats) {
        const newRecommendations: string[] = [];

        if (stats.usagePercentage > 0.85) {
          newRecommendations.push('Memoria crítica: Reduce el tamaño de lote');
          newRecommendations.push('Considera pausar la carga temporalmente');
        } else if (stats.usagePercentage > 0.7) {
          newRecommendations.push('Memoria alta: Procesa en lotes más pequeños');
        }

        if (stats.usagePercentage > 0.9) {
          newRecommendations.push('¡URGENTE! Cierra otras pestañas del navegador');
        }

        setRecommendations(newRecommendations);

        // Notificar recomendación principal
        if (newRecommendations.length > 0) {
          onRecommendation?.(newRecommendations[0]);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isActive, onRecommendation]);

  if (!isActive || !memoryStats) {
    return null;
  }

  const getStatusColor = (usage: number) => {
    if (usage > 0.9) return 'text-red-600 bg-red-50 border-red-200';
    if (usage > 0.7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusIcon = (usage: number) => {
    if (usage > 0.9) return '🔴';
    if (usage > 0.7) return '🟡';
    return '🟢';
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor(memoryStats.usagePercentage)} ${className}`}>
      {/* Header compacto */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{getStatusIcon(memoryStats.usagePercentage)}</span>
          <span className="font-medium">
            Memoria: {(memoryStats.usagePercentage * 100).toFixed(1)}%
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {recommendations.length > 0 && (
            <span className="text-xs px-2 py-1 bg-white rounded-full">
              {recommendations.length} recomendación{recommendations.length !== 1 ? 'es' : ''}
            </span>
          )}
          <svg 
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Barra de progreso de memoria */}
      <div className="mt-2 w-full bg-white bg-opacity-50 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            memoryStats.usagePercentage > 0.9 ? 'bg-red-500' :
            memoryStats.usagePercentage > 0.7 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${memoryStats.usagePercentage * 100}%` }}
        />
      </div>

      {/* Detalles expandidos */}
      {isExpanded && (
        <div className="mt-4 space-y-3">
          {/* Estadísticas detalladas */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium">Memoria usada</div>
              <div>{memoryManager.formatBytes(memoryStats.usedJSHeapSize)}</div>
            </div>
            <div>
              <div className="font-medium">Límite</div>
              <div>{memoryManager.formatBytes(memoryStats.jsHeapSizeLimit)}</div>
            </div>
          </div>

          {/* Recomendaciones */}
          {recommendations.length > 0 && (
            <div>
              <div className="font-medium text-sm mb-2">Recomendaciones:</div>
              <ul className="space-y-1 text-sm">
                {recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-xs mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Acciones rápidas */}
          <div className="flex gap-2 pt-2 border-t border-current border-opacity-20">
            <button
              onClick={() => memoryManager.forceGarbageCollection()}
              className="px-3 py-1 text-xs bg-white bg-opacity-50 rounded hover:bg-opacity-70 transition-colors"
            >
              Liberar memoria
            </button>
            <button
              onClick={() => {
                const report = memoryManager.getMemoryReport();
                console.log('Reporte de memoria:', report);
                alert(report);
              }}
              className="px-3 py-1 text-xs bg-white bg-opacity-50 rounded hover:bg-opacity-70 transition-colors"
            >
              Ver reporte
            </button>
          </div>
        </div>
      )}
    </div>
  );
}