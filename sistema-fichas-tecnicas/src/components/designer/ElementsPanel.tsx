/**
 * ElementsPanel - Panel lateral con elementos que se pueden agregar al canvas
 */

'use client';

import { useDesignStore } from '@/stores/designStore';
import { ShapeType } from '@/types/fichaDesign';

import { AVAILABLE_DATA_FIELDS } from '@/constants/fieldMapping';

const BASIC_ELEMENTS = [
    { type: 'text' as ShapeType, label: 'Texto', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { type: 'rectangle' as ShapeType, label: 'Rectángulo', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z' },
    { type: 'circle' as ShapeType, label: 'Círculo', icon: 'M12 21a9 9 0 100-18 9 9 0 000 18z' },
    { type: 'line' as ShapeType, label: 'Línea', icon: 'M5 12h14' },
];

const DATA_FIELDS = AVAILABLE_DATA_FIELDS;

export function ElementsPanel() {
    const { addPlacement, addShape, currentVersionId } = useDesignStore();

    const handleAddField = (field: typeof DATA_FIELDS[0]) => {
        if (!currentVersionId) return;
        addPlacement(currentVersionId, {
            fieldId: field.id,
            x: 20,
            y: 20,
            width: 60,
            height: 10,
            zIndex: 10,
            showLabel: true,
            fontSize: 10,
            fontFamily: 'Inter',
            color: '#000000',
            textAlign: 'left',
        });
    };

    const handleAddBasic = (type: ShapeType) => {
        if (!currentVersionId) return;
        addShape(currentVersionId, {
            type,
            x: 50,
            y: 50,
            width: type === 'line' ? 50 : 40,
            height: type === 'line' ? 1 : 20,
            zIndex: 5,
            fillColor: type === 'text' ? 'transparent' : '#ffffff',
            strokeColor: '#000000',
            strokeWidth: 1,
            content: type === 'text' ? 'Nuevo Texto' : undefined,
            fontSize: type === 'text' ? 12 : undefined,
            fontFamily: 'Inter',
            color: '#000000',
            textAlign: 'left',
        });
    };

    return (
        <aside className="w-full bg-white border-r border-gray-200 overflow-y-auto z-20 shadow-sm">
            <div className="p-4 space-y-6">
                {/* Elementos Básicos */}
                <section>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Elementos Básicos</h2>
                    <div className="grid grid-cols-2 gap-2">
                        {BASIC_ELEMENTS.map((el) => (
                            <button
                                key={el.type}
                                onClick={() => handleAddBasic(el.type)}
                                className="flex flex-col items-center justify-center p-3 border border-gray-100 rounded-lg hover:border-primary-200 hover:bg-primary-50 transition-all group"
                            >
                                <svg className="w-6 h-6 text-gray-400 group-hover:text-primary mb-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={el.icon} />
                                </svg>
                                <span className="text-[10px] text-gray-600 group-hover:text-primary font-medium">{el.label}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Campos de Datos */}
                <section>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Campos del Pozo</h2>
                    <div className="space-y-1">
                        {DATA_FIELDS.map((field) => (
                            <button
                                key={field.id}
                                onClick={() => handleAddField(field)}
                                className="w-full flex items-center justify-between p-2 text-xs font-medium text-gray-600 hover:bg-primary-50 hover:text-primary rounded-md border border-transparent hover:border-primary-100 transition-all group"
                            >
                                <span className="truncate">{field.label}</span>
                                <span className="text-[8px] bg-gray-100 text-gray-400 px-1 rounded group-hover:bg-primary-100 group-hover:text-primary transition-colors">
                                    {field.category}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            </div>
        </aside>
    );
}
