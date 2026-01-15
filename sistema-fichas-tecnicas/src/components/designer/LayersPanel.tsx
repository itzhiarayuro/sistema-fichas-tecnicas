/**
 * LayersPanel - Panel de Control de Capas
 * Permite ver, seleccionar y ordenar elementos por Z-Index
 */

'use client';

import { useDesignStore } from '@/stores/designStore';
import { FichaDesignVersion } from '@/types/fichaDesign';

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

    if (!version) return null;

    // Combinar y ordenar para mostrar (Mayor Z-Index arriba en la lista visualmente, user expectation)
    // O menor Z-index arriba? Photoshop pone capa superior (Mayor Z) arriba.
    const allElements = [
        ...(version.shapes || []).map(s => ({ ...s, isShape: true, label: `${s.type} ${s.id.slice(0, 4)}` })),
        ...(version.placements || []).map(p => ({ ...p, isShape: false, label: p.customLabel || `Campo ${p.fieldId}` }))
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
                            onClick={() => item.isShape ? onSelectShape(item.id) : onSelectPlacement(item.id)}
                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer group border transition-all ${isSelected
                                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                                    : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100'
                                }`}
                        >
                            {/* Icono Tipo */}
                            <div className="text-gray-400">
                                {item.isShape ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </div>

                            {/* Label */}
                            <span className={`flex-1 text-xs truncate ${isSelected ? 'font-medium text-blue-700' : 'text-gray-600'}`}>
                                {item.label}
                            </span>

                            {/* Actions (Visible/Lock) */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => handleToggleVisible(e, item)}
                                    className={`p-1 rounded ${item.isVisible === false ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                                    title={item.isVisible === false ? "Mostrar" : "Ocultar"}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                    className={`p-1 rounded ${item.isLocked ? 'text-amber-500' : 'text-gray-300 hover:text-gray-500'}`}
                                    title={item.isLocked ? "Desbloquear" : "Bloquear"}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.isLocked ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" : "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"} />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}
