/**
 * FieldsPanel - Panel profesional con 56 campos del sistema
 * Incluye búsqueda, filtrado por categoría y drag & drop
 */

'use client';

import { useState, useMemo } from 'react';
import { AVAILABLE_FIELDS, type AvailableField, type FieldCategory } from '@/types/fichaDesign';

const CATEGORY_LABELS: Record<FieldCategory, string> = {
    pozo: 'Pozo (33)',
    tuberias: 'Tuberías (9)',
    sumideros: 'Sumideros (8)',
    fotos: 'Fotos (6)',
    otros: 'Otros'
};

const CATEGORY_COLORS: Record<FieldCategory, string> = {
    pozo: 'bg-blue-50 text-blue-700 border-blue-200',
    tuberias: 'bg-green-50 text-green-700 border-green-200',
    sumideros: 'bg-orange-50 text-orange-700 border-orange-200',
    fotos: 'bg-purple-50 text-purple-700 border-purple-200',
    otros: 'bg-gray-50 text-gray-700 border-gray-200'
};

interface FieldsPanelProps {
    onFieldDragStart: (field: AvailableField) => void;
}

export function FieldsPanel({ onFieldDragStart }: FieldsPanelProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<FieldCategory | 'all'>('all');

    // Filtrado de campos
    const filteredFields = useMemo(() => {
        let fields = AVAILABLE_FIELDS;

        // Filtrar por categoría
        if (selectedCategory !== 'all') {
            fields = fields.filter(f => f.category === selectedCategory);
        }

        // Filtrar por búsqueda
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            fields = fields.filter(f =>
                f.label.toLowerCase().includes(term) ||
                f.fieldPath.toLowerCase().includes(term)
            );
        }

        return fields;
    }, [searchTerm, selectedCategory]);

    // Agrupar por categoría
    const groupedFields = useMemo(() => {
        const groups: Record<FieldCategory, AvailableField[]> = {
            pozo: [],
            tuberias: [],
            sumideros: [],
            fotos: [],
            otros: []
        };

        filteredFields.forEach(field => {
            groups[field.category].push(field);
        });

        return groups;
    }, [filteredFields]);

    const handleDragStart = (e: React.DragEvent, field: AvailableField) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/json', JSON.stringify(field));
        onFieldDragStart(field);
    };

    return (
        <aside className="w-full bg-white border-r border-gray-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-primary/10">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    Campos Disponibles
                </h2>

                {/* Búsqueda */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar campos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                    <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Filtros de categoría */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${selectedCategory === 'all'
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                    >
                        Todos (56)
                    </button>
                    {(Object.keys(CATEGORY_LABELS) as FieldCategory[]).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1 text-xs font-medium rounded-full transition-all border ${selectedCategory === cat
                                    ? CATEGORY_COLORS[cat]
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border-gray-200'
                                }`}
                        >
                            {CATEGORY_LABELS[cat]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lista de campos */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {filteredFields.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm">No se encontraron campos</p>
                    </div>
                ) : (
                    <>
                        {(Object.keys(groupedFields) as FieldCategory[]).map(category => {
                            const fields = groupedFields[category];
                            if (fields.length === 0) return null;

                            return (
                                <div key={category} className="space-y-2">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                                        {CATEGORY_LABELS[category]}
                                    </h3>
                                    <div className="space-y-1">
                                        {fields.map(field => (
                                            <div
                                                key={field.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, field)}
                                                className={`group relative flex items-center justify-between p-2.5 rounded-lg border cursor-move transition-all hover:shadow-md hover:scale-[1.02] ${CATEGORY_COLORS[field.category]}`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                                        </svg>
                                                        <span className="text-xs font-semibold truncate">{field.label}</span>
                                                    </div>
                                                    <p className="text-[10px] opacity-60 truncate mt-0.5 pl-5">
                                                        {field.fieldPath}
                                                    </p>
                                                </div>
                                                {field.isRepeatable && (
                                                    <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold bg-white/80 rounded-full">
                                                        ∞
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            {/* Footer con contador */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
                <p className="text-[10px] text-gray-500 text-center">
                    Mostrando <span className="font-bold text-primary">{filteredFields.length}</span> de <span className="font-bold">56</span> campos
                </p>
            </div>
        </aside>
    );
}
