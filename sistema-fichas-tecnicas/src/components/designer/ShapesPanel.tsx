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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="6" width="16" height="12" strokeWidth={2} rx="2" />
            </svg>
        ),
        description: 'Cuadrado o rectángulo'
    },
    {
        type: 'circle' as ShapeType,
        label: 'Círculo',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" strokeWidth={2} />
            </svg>
        ),
        description: 'Círculo u óvalo'
    },
    {
        type: 'line' as ShapeType,
        label: 'Línea',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeWidth={2} d="M5 19L19 5" />
            </svg>
        ),
        description: 'Línea recta'
    },
    {
        type: 'text' as ShapeType,
        label: 'Texto',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
        ),
        description: 'Texto libre'
    }
];

export function ShapesPanel({ onShapeSelect }: ShapesPanelProps) {
    return (
        <aside className="w-full bg-white border-r border-gray-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple/5 to-pink/5">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    Figuras Geométricas
                </h2>
                <p className="text-[10px] text-gray-500">Haz clic para agregar al canvas</p>
            </div>

            {/* Shapes Grid */}
            <div className="p-4 grid grid-cols-2 gap-3">
                {SHAPES.map((shape) => (
                    <button
                        key={shape.type}
                        onClick={() => onShapeSelect(shape.type)}
                        className="group relative flex flex-col items-center justify-center p-4 rounded-lg border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all active:scale-95"
                    >
                        <div className="text-gray-600 group-hover:text-purple-600 transition-colors mb-2">
                            {shape.icon}
                        </div>
                        <span className="text-xs font-semibold text-gray-700 group-hover:text-purple-700">
                            {shape.label}
                        </span>
                        <span className="text-[9px] text-gray-400 mt-0.5">
                            {shape.description}
                        </span>
                    </button>
                ))}
            </div>

            {/* Instrucciones */}
            <div className="mt-auto p-4 border-t border-gray-100 bg-gray-50">
                <div className="text-[10px] text-gray-500 space-y-1">
                    <p className="flex items-start gap-1">
                        <span className="text-purple-600">•</span>
                        <span>Haz clic en una figura para agregarla al centro del canvas</span>
                    </p>
                    <p className="flex items-start gap-1">
                        <span className="text-purple-600">•</span>
                        <span>Arrastra para mover, usa el handle para redimensionar</span>
                    </p>
                    <p className="flex items-start gap-1">
                        <span className="text-purple-600">•</span>
                        <span>Edita colores y estilos en el panel de propiedades</span>
                    </p>
                </div>
            </div>
        </aside>
    );
}
