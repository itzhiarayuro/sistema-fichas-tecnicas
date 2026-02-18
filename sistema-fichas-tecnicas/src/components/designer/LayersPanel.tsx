/**
 * LayersPanel - Panel de Control de Capas
 * Permite ver, seleccionar y ordenar elementos por Z-Index
 * Con scroll automático y labels personalizados destacados
 */

'use client';

import { useDesignStore } from '@/stores/designStore';
import { FichaDesignVersion } from '@/types/fichaDesign';
import { useEffect, useRef } from 'react';

interface LayersPanelProps {
    version: FichaDesignVersion | null;
    selectedPlacementId: string | null;
    selectedShapeId: string | null;
    onSelectPlacement: (id: string | null) => void;
    onSelectShape: (id: string | null) => void;
}

export function LayersPanel({
    version,
    selectedPlacementId,
    selectedShapeId,
    onSelectPlacement,
    onSelectShape
}: LayersPanelProps) {
    const { updatePlacement, updateShape } = useDesignStore();
    const selectedItemRef = useRef<HTMLDivElement>(null);

    // Scroll automático cuando se selecciona un elemento
    useEffect(() => {
        if (selectedItemRef.current) {
            // Pequeño delay para asegurar que el DOM está actualizado
            setTimeout(() => {
                selectedItemRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                });
            }, 100);
        }
    }, [selectedPlacementId, selectedShapeId]);

    if (!version) return null;

    // Combinar y ordenar para mostrar (Mayor Z-Index arriba en la lista visualmente, user expectation)
    // O menor Z-index arriba? Photoshop pone capa superior (Mayor Z) arriba.
    const allElements = [
        ...(version.shapes || []).map(s => ({ 
            ...s, 
            isShape: true, 
            label: s.type === 'text' && s.content 
                ? `Texto: ${s.content.substring(0, 20)}${s.content.length > 20 ? '...' : ''}`
                : s.type === 'image' 
                    ? 'Imagen'
                    : `${s.type.charAt(0).toUpperCase() + s.type.slice(1)}`
        })),
        ...(version.placements || []).map(p => ({ 
            ...p, 
            isShape: false, 
            label: p.customLabel || `Campo ${p.fieldId}`,
            hasCustomLabel: !!p.customLabel
        }))
    ].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)); // Descending Z-Index

    const handleToggleVisible = (e: React.MouseEvent, item: any) => {
        e.stopPropagation();
        if (item.isShape) {
            updateShape(version.id, item.id, { isVisible: item.isVisible === false ? true : false });
        } else {
            updatePlacement(version.id, item.id, { isVisible: item.isVisible === false ? true : false });
        }
    };

    const handleToggleLock = (e: React.MouseEvent, item: any) => {
        e.stopPropagation();
        if (item.isShape) {
            updateShape(version.id, item.id, { isLocked: !item.isLocked });
        } else {
            updatePlacement(version.id, item.id, { isLocked: !item.isLocked });
        }
    };

    return (
        <aside className="w-full bg-white border-l border-gray-200 overflow-y-auto h-full flex flex-col">
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between sticky top-0 z-10">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Capas</h2>
                <span className="text-[10px] text-gray-400">{allElements.length} elementos</span>
            </div>

            {/* Indicador de selección activa - Más prominente */}
            {(selectedPlacementId || selectedShapeId) && (
                <div className="px-3 py-3 bg-gradient-to-r from-emerald-100 to-green-100 border-b-2 border-emerald-400 shadow-md">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-emerald-700 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-bold text-emerald-800">
                            ✓ Elemento Seleccionado
                        </span>
                    </div>
                    <p className="text-xs text-emerald-700 ml-7 font-medium">
                        Busca abajo el elemento resaltado en verde
                    </p>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {allElements.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-4">No hay elementos</p>
                )}

                {allElements.map((item) => {
                    const isSelected = item.isShape
                        ? (selectedShapeId === item.id)
                        : (selectedPlacementId === item.id);

                    return (
                        <div
                            key={item.id}
                            ref={isSelected ? selectedItemRef : null}
                            onClick={() => item.isShape ? onSelectShape(item.id) : onSelectPlacement(item.id)}
                            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg cursor-pointer group border-2 transition-all ${isSelected
                                    ? 'bg-gradient-to-r from-emerald-100 via-green-100 to-emerald-100 border-emerald-500 shadow-xl ring-4 ring-emerald-300 scale-105 animate-pulse'
                                    : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm'
                                }`}
                        >
                            {/* Icono Tipo */}
                            <div className={`${isSelected ? 'text-emerald-700 scale-125' : 'text-gray-400'}`}>
                                {item.isShape ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                )}
                            </div>

                            {/* Label con indicador de personalización */}
                            <div className="flex-1 min-w-0">
                                <span className={`text-sm truncate block ${
                                    isSelected 
                                        ? 'font-extrabold text-emerald-900 text-base' 
                                        : (item as any).hasCustomLabel 
                                            ? 'font-semibold text-gray-800'
                                            : 'font-medium text-gray-600'
                                }`}>
                                    {isSelected && '👉 '}
                                    {item.label}
                                </span>
                                {(item as any).hasCustomLabel && !isSelected && (
                                    <span className="text-[8px] text-primary uppercase tracking-wide">Personalizado</span>
                                )}
                                {isSelected && (
                                    <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wide">← SELECCIONADO</span>
                                )}
                            </div>

                            {/* Actions (Visible/Lock) */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => handleToggleVisible(e, item)}
                                    className={`p-0.5 rounded ${item.isVisible === false ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                                    title={item.isVisible === false ? "Mostrar" : "Ocultar"}
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {item.isVisible === false ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        )}
                                        {item.isVisible !== false && (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        )}
                                    </svg>
                                </button>
                                <button
                                    onClick={(e) => handleToggleLock(e, item)}
                                    className={`p-0.5 rounded ${item.isLocked ? 'text-amber-500' : 'text-gray-300 hover:text-gray-500'}`}
                                    title={item.isLocked ? "Desbloquear" : "Bloquear"}
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.isLocked ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" : "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"} />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Tip de ayuda */}
            <div className="p-2 border-t border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-start gap-1.5">
                    <span className="text-xs">💡</span>
                    <div className="flex-1">
                        <p className="text-[9px] text-gray-600 font-medium">Personaliza nombres en propiedades</p>
                        <p className="text-[8px] text-gray-500 mt-0.5">
                            Haz clic en un elemento para editarlo
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
