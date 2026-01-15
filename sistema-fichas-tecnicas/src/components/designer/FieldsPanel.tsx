/**
 * FieldsPanel - Panel intuitivo de campos arrastables
 * Diseño simplificado: ícono + nombre de campo visible, arrastrable al canvas
 */

'use client';

import { useState, useMemo } from 'react';
import { AVAILABLE_FIELDS, type AvailableField, type FieldCategory } from '@/types/fichaDesign';

const CATEGORY_INFO: Record<FieldCategory, { label: string; icon: string; color: string; bg: string }> = {
    pozo: { label: 'Pozo', icon: '🔵', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
    tuberias: { label: 'Tuberías', icon: '🟢', color: 'text-green-700', bg: 'bg-green-50 border-green-200 hover:bg-green-100' },
    sumideros: { label: 'Sumideros', icon: '🟠', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200 hover:bg-orange-100' },
    fotos: { label: 'Fotos', icon: '🟣', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200 hover:bg-purple-100' },
    otros: { label: 'Otros', icon: '⚪', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200 hover:bg-gray-100' }
};

interface FieldsPanelProps {
    onFieldDragStart: (field: AvailableField) => void;
    onFieldSelect?: (field: AvailableField) => void;
}

export function FieldsPanel({ onFieldDragStart, onFieldSelect }: FieldsPanelProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<FieldCategory | 'all'>('all');
    const [expandedCategories, setExpandedCategories] = useState<Set<FieldCategory>>(new Set(['pozo']));

    const toggleCategory = (cat: FieldCategory) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) {
                next.delete(cat);
            } else {
                next.add(cat);
            }
            return next;
        });
    };

    // Filtrado de campos
    const filteredFields = useMemo(() => {
        let fields = AVAILABLE_FIELDS;

        if (selectedCategory !== 'all') {
            fields = fields.filter(f => f.category === selectedCategory);
        }

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

    const categoryCounts = useMemo(() => {
        const counts: Record<FieldCategory, number> = { pozo: 0, tuberias: 0, sumideros: 0, fotos: 0, otros: 0 };
        AVAILABLE_FIELDS.forEach(f => counts[f.category]++);
        return counts;
    }, []);

    return (
        <aside className="w-full bg-white border-r border-gray-200 flex flex-col h-full">
            {/* Header compacto */}
            <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        Campos
                    </h2>
                    <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded-full">{filteredFields.length} disponibles</span>
                </div>

                {/* Búsqueda */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="🔍 Buscar campo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Filtros rápidos como tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={`flex-1 min-w-max px-3 py-2 text-xs font-medium transition-all border-b-2 ${selectedCategory === 'all'
                        ? 'border-primary text-primary bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Todos
                </button>
                {(Object.keys(CATEGORY_INFO) as FieldCategory[]).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex-1 min-w-max px-3 py-2 text-xs font-medium transition-all border-b-2 flex items-center justify-center gap-1 ${selectedCategory === cat
                            ? 'border-primary text-primary bg-white'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span>{CATEGORY_INFO[cat].icon}</span>
                        <span className="hidden sm:inline">{categoryCounts[cat]}</span>
                    </button>
                ))}
            </div>

            {/* Lista de campos agrupados con acordeón */}
            <div className="flex-1 overflow-y-auto">
                {filteredFields.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <p className="text-sm">No se encontraron campos</p>
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
                            className="mt-2 text-xs text-primary hover:underline"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {(Object.keys(groupedFields) as FieldCategory[]).map(category => {
                            const fields = groupedFields[category];
                            if (fields.length === 0) return null;

                            const isExpanded = expandedCategories.has(category) || selectedCategory !== 'all' || searchTerm.length > 0;
                            const catInfo = CATEGORY_INFO[category];

                            return (
                                <div key={category}>
                                    {/* Cabecera de categoría clicable */}
                                    <button
                                        onClick={() => toggleCategory(category)}
                                        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>{catInfo.icon}</span>
                                            <span className={`text-xs font-bold uppercase ${catInfo.color}`}>
                                                {catInfo.label}
                                            </span>
                                            <span className="text-[10px] text-gray-400 bg-white px-1.5 rounded">
                                                {fields.length}
                                            </span>
                                        </div>
                                        <svg
                                            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Campos de la categoría */}
                                    {isExpanded && (
                                        <div className="grid grid-cols-1 gap-1 p-2">
                                            {fields.map(field => (
                                                <div
                                                    key={field.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, field)}
                                                    onClick={() => onFieldSelect?.(field)}
                                                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all ${catInfo.bg}`}
                                                    title={`Haz clic para agregar o arrastra "${field.label}" al canvas`}
                                                >
                                                    {/* Icono de arrastre */}
                                                    <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                                        <circle cx="9" cy="6" r="1.5" />
                                                        <circle cx="15" cy="6" r="1.5" />
                                                        <circle cx="9" cy="12" r="1.5" />
                                                        <circle cx="15" cy="12" r="1.5" />
                                                        <circle cx="9" cy="18" r="1.5" />
                                                        <circle cx="15" cy="18" r="1.5" />
                                                    </svg>

                                                    {/* Nombre del campo */}
                                                    <span className="text-sm font-medium text-gray-800 truncate flex-1">
                                                        {field.label}
                                                    </span>

                                                    {/* Indicador visual de arrastrar */}
                                                    <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        ➜
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Tip de ayuda */}
            <div className="p-2 border-t border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <p className="text-[10px] text-gray-500 text-center flex items-center justify-center gap-1">
                    <span>💡</span>
                    <span>Arrastra los campos hacia el canvas de diseño</span>
                </p>
            </div>
        </aside>
    );
}
