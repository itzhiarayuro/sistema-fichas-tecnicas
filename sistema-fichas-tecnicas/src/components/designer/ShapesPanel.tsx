/**
 * ShapesPanel - Panel de figuras geométricas para diseño
 * Permite agregar rectángulos, círculos, líneas y texto
 */

'use client';

import type { ShapeType } from '@/types/fichaDesign';

interface ShapesPanelProps {
    onShapeSelect: (shapeType: ShapeType) => void;
}

const SHAPES = [
    {
        type: 'rectangle' as ShapeType,
        label: 'Rectángulo',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="6" width="16" height="12" strokeWidth={2} rx="2" />
            </svg>
        ),
    },
    {
        type: 'circle' as ShapeType,
        label: 'Círculo',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" strokeWidth={2} />
            </svg>
        ),
    },
    {
        type: 'triangle' as ShapeType,
        label: 'Triángulo',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 4L4 20H20L12 4Z" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        type: 'line' as ShapeType,
        label: 'Línea',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeWidth={2} d="M5 19L19 5" />
            </svg>
        ),
    },
    {
        type: 'text' as ShapeType,
        label: 'Texto',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
        ),
    }
];

export function ShapesPanel({ onShapeSelect }: ShapesPanelProps) {
    return (
        <div className="p-3 h-full flex flex-col bg-white">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span>🔷</span> Figuras
            </h3>

            <div className="flex gap-1.5 flex-wrap">
                {SHAPES.map((shape) => (
                    <button
                        key={shape.type}
                        onClick={() => onShapeSelect(shape.type)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-100 bg-white hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all active:scale-95 group shadow-sm"
                        title={`Agregar ${shape.label}`}
                    >
                        <span className="text-gray-500 group-hover:text-blue-600">{shape.icon}</span>
                        <span className="text-[11px] font-medium">{shape.label}</span>
                    </button>
                ))}
            </div>

            <p className="text-[9px] text-gray-400 mt-2">Clic para agregar al canvas</p>
        </div>
    );
}
