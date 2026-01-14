/**
 * FieldIndicator - Indicador visual de campos obligatorios vs opcionales
 * Requirements: 3.1, 5.1-5.5
 * 
 * Muestra indicadores visuales:
 * - 🔴 Rojo: Campo obligatorio
 * - 🟠 Naranja: Campo importante
 * - 🟢 Verde: Campo opcional (no mostrado por defecto)
 */

'use client';

interface FieldIndicatorProps {
  /** Si el campo es obligatorio */
  required?: boolean;
  /** Si el campo es importante */
  important?: boolean;
  /** Mostrar tooltip */
  showTooltip?: boolean;
}

export function FieldIndicator({
  required = false,
  important = false,
  showTooltip = true,
}: FieldIndicatorProps) {
  if (!required && !important) {
    return null;
  }

  if (required) {
    return (
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 text-red-600 text-xs font-bold"
        title={showTooltip ? 'Campo obligatorio' : undefined}
      >
        •
      </span>
    );
  }

  if (important) {
    return (
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-100 text-yellow-600 text-xs font-bold"
        title={showTooltip ? 'Campo importante' : undefined}
      >
        •
      </span>
    );
  }

  return null;
}
