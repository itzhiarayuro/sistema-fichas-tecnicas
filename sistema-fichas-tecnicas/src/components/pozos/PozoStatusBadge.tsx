/**
 * PozoStatusBadge - Indicador visual de estado del pozo
 * Requirements: 2.5, 16.13
 * 
 * Muestra indicadores claros de estado por ficha:
 * - Completo: todos los datos requeridos (fotos opcionales)
 * - Incompleto: faltan datos requeridos
 * - Con advertencias: datos presentes pero con posibles problemas
 * 
 * Sin afectar visualmente a otras fichas (Requirement 16.13)
 */

'use client';

import { Pozo } from '@/types';
import { useGlobalStore } from '@/stores/globalStore';

export type PozoStatusType = 'complete' | 'incomplete' | 'warning';

interface PozoStatusBadgeProps {
  pozo: Pozo;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Determina el estado de completitud de un pozo
 * Analiza datos requeridos y fotos asociadas
 */
export function getPozoStatus(pozo: Pozo, fotosGlobales?: Map<string, any>): PozoStatusType {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!pozo.idPozo?.value) issues.push('Código faltante');
  if (!pozo.direccion?.value) issues.push('Dirección faltante');

  // Check estructura fields - solo como advertencias
  if (!pozo.profundidad?.value) warnings.push('Profundidad no especificada');
  if (!pozo.materialTapa?.value) warnings.push('Material de tapa no especificado');
  if (!pozo.diametroCilindro?.value) warnings.push('Diámetro de cilindro no especificado');

  // Check photos - buscar en fotos globales si se proporcionan
  const fotosCount = fotosGlobales
    ? countConsolidatedFotos(pozo, fotosGlobales)
    : countFotos(pozo);

  if (fotosCount === 0) {
    warnings.push('Sin fotos asociadas');
  }
  // Nota: Ya no requerimos foto principal específicamente

  // Determine status
  if (issues.length > 0) {
    return 'incomplete';
  }
  if (warnings.length > 0) {
    return 'warning';
  }
  return 'complete';
}

/**
 * Obtiene los detalles de los problemas encontrados
 */
export function getPozoStatusDetails(pozo: Pozo, fotosGlobales?: Map<string, any>): { issues: string[]; warnings: string[] } {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!pozo.idPozo?.value) issues.push('Código faltante');
  if (!pozo.direccion?.value) issues.push('Dirección faltante');

  // Check estructura fields - solo como advertencias, no como problemas
  if (!pozo.profundidad?.value) warnings.push('Profundidad no especificada');
  if (!pozo.materialTapa?.value) warnings.push('Material de tapa no especificado');
  if (!pozo.diametroCilindro?.value) warnings.push('Diámetro de cilindro no especificado');

  // Check photos - buscar en fotos globales si se proporcionan
  const fotosCount = fotosGlobales
    ? countConsolidatedFotos(pozo, fotosGlobales)
    : countFotos(pozo);

  if (fotosCount === 0) {
    warnings.push('Sin fotos asociadas');
  }
  // Nota: Ya no requerimos foto principal específicamente

  return { issues, warnings };
}

// Helper function to count photos in pozo.fotos
function countFotos(pozo: Pozo): number {
  const { fotos } = pozo;
  // fotos is FotosPozo which contains 'fotos' array
  return fotos.fotos?.length || 0;
}

// Helper function to count consolidated photos (embedded + global)
function countConsolidatedFotos(pozo: Pozo, fotosGlobales: Map<string, any>): number {
  if (!pozo) return 0;

  // 1. Fotos incrustadas en el objeto pozo
  const fotosIncrustadas = pozo.fotos?.fotos || [];
  const fotosIds = new Set(fotosIncrustadas.map(f => f.id));
  let totalCount = fotosIncrustadas.length;

  // 2. Buscar fotos globales asociadas por nomenclatura
  if (!pozo.id) return totalCount;

  const safeId = String(pozo.id);
  let targetCode = safeId.toUpperCase();

  if (safeId.startsWith('pozo-')) {
    const parts = safeId.split('-');
    if (parts.length >= 4) {
      targetCode = parts.slice(1, -2).join('-').toUpperCase();
    } else if (parts.length >= 3) {
      targetCode = parts[1].toUpperCase();
    }
  } else {
    targetCode = String(pozo.idPozo?.value || '').trim().toUpperCase();
  }

  if (targetCode) {
    fotosGlobales.forEach((foto) => {
      if (!foto?.filename || !foto?.id) return;
      if (fotosIds.has(foto.id)) return; // Ya contada

      const nameWithoutExt = String(foto.filename).replace(/\.[^/.]+$/, '').toUpperCase();
      if (nameWithoutExt === targetCode || nameWithoutExt.startsWith(`${targetCode}-`)) {
        totalCount++;
        fotosIds.add(foto.id);
      }
    });
  }

  return totalCount;
}

const STATUS_CONFIG: Record<PozoStatusType, {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: React.ReactNode;
}> = {
  complete: {
    label: 'Completo',
    bgColor: 'bg-environmental-50',
    textColor: 'text-environmental-700',
    borderColor: 'border-environmental-200',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  incomplete: {
    label: 'Incompleto',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  warning: {
    label: 'Advertencias',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export function PozoStatusBadge({ pozo, showLabel = true, size = 'sm' }: PozoStatusBadgeProps) {
  const { photos } = useGlobalStore();
  const status = getPozoStatus(pozo, photos);
  const config = STATUS_CONFIG[status];
  const { issues, warnings } = getPozoStatusDetails(pozo, photos);

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-3 py-1 text-sm gap-1.5';

  // Build tooltip content
  const tooltipContent = [...issues, ...warnings].join('\n');

  return (
    <span
      className={`
        inline-flex items-center rounded-full border font-medium
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses}
      `}
      title={tooltipContent || config.label}
    >
      {config.icon}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

/**
 * Componente para mostrar el detalle de estado en un panel
 */
export function PozoStatusDetail({ pozo }: { pozo: Pozo }) {
  const { photos } = useGlobalStore();
  const status = getPozoStatus(pozo, photos);
  const { issues, warnings } = getPozoStatusDetails(pozo, photos);
  const config = STATUS_CONFIG[status];

  if (status === 'complete') {
    return (
      <div className={`p-3 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
        <div className={`flex items-center gap-2 ${config.textColor}`}>
          {config.icon}
          <span className="font-medium">Datos completos</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Todos los datos requeridos están presentes y hay fotos asociadas.
        </p>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
      <div className={`flex items-center gap-2 ${config.textColor}`}>
        {config.icon}
        <span className="font-medium">{config.label}</span>
      </div>

      {issues.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-red-600 mb-1">Problemas:</p>
          <ul className="text-sm text-red-700 space-y-0.5">
            {issues.map((issue, idx) => (
              <li key={idx} className="flex items-start gap-1">
                <span className="text-red-400">•</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-yellow-600 mb-1">Advertencias:</p>
          <ul className="text-sm text-yellow-700 space-y-0.5">
            {warnings.map((warning, idx) => (
              <li key={idx} className="flex items-start gap-1">
                <span className="text-yellow-400">•</span>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
