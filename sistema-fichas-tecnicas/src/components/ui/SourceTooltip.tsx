/**
 * SourceTooltip - Muestra el origen y trazabilidad de un dato
 * Requirements: 29.1, 5.1-5.5
 */

import React from 'react';
import { FieldSource } from '@/types/ficha';

interface SourceTooltipProps {
    source: FieldSource;
    originalValue?: string;
    modifiedAt?: number;
}

export function SourceTooltip({ source, originalValue, modifiedAt }: SourceTooltipProps) {
    const getSourceLabel = (s: FieldSource) => {
        switch (s) {
            case 'excel': return { label: 'Importado de Excel', color: 'text-blue-600', icon: '📊' };
            case 'manual': return { label: 'Editado manualmente', color: 'text-orange-600', icon: '✍️' };
            default: return { label: 'Valor por defecto', color: 'text-gray-500', icon: '⚙️' };
        }
    };

    const { label, color, icon } = getSourceLabel(source);

    return (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-50 text-[10px] invisible group-hover:visible transition-all opacity-0 group-hover:opacity-100 flex flex-col gap-1.5 pointer-events-none">
            <div className={`font-bold flex items-center gap-1.5 ${color}`}>
                <span>{icon}</span>
                {label}
            </div>

            {source === 'manual' && originalValue && (
                <div className="border-t border-gray-100 pt-1 text-gray-400 italic">
                    Valor original: <span className="text-gray-600">{originalValue}</span>
                </div>
            )}

            {modifiedAt && (
                <div className="text-[8px] text-gray-400 mt-1">
                    Última edición: {new Date(modifiedAt).toLocaleString()}
                </div>
            )}

            {/* Flecha */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-white" />
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[7px] border-transparent border-t-gray-200 -z-10" />
        </div>
    );
}
