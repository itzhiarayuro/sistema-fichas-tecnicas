/**
 * LayersPanel - Panel de Control de Capas
 * Permite ver, seleccionar y ordenar elementos por Z-Index
 * Con scroll automático, labels personalizados y agrupación
 */

'use client';

import { useDesignStore } from '@/stores/designStore';
import { FichaDesignVersion } from '@/types/fichaDesign';
import { useEffect, useRef, useState } from 'react';

interface LayersPanelProps {
    version: FichaDesignVersion | null;
}

export function LayersPanel({
    version,
}: LayersPanelProps) {
    const {
        selectedPlacementId,
        selectedShapeId,
        setSelectedPlacementId,
        setSelectedShapeId,
        updatePlacement,
        updateShape,
        createGroup,
        ungroupElements,
        updateGroup
    } = useDesignStore();
    const selectedItemRef = useRef<HTMLDivElement>(null);

    // Estado para selección múltiple
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    console.log('🔴 LayersPanel render - selectedPlacementId:', selectedPlacementId);
    console.log('🔴 LayersPanel render - selectedShapeId:', selectedShapeId);

    // Sincronizar selección múltiple con selección individual
    useEffect(() => {
        if (selectedPlacementId) {
            setSelectedIds([selectedPlacementId]);
        } else if (selectedShapeId) {
            setSelectedIds([selectedShapeId]);
        } else {
            setSelectedIds([]);
        }
    }, [selectedPlacementId, selectedShapeId]);

    // Scroll automático cuando se selecciona un elemento
    useEffect(() => {
        console.log('🔴 useEffect scroll - selectedItemRef.current:', selectedItemRef.current);
        if (selectedItemRef.current) {
            // Pequeño delay para asegurar que el DOM está actualizado
            setTimeout(() => {
                console.log('🔴 Haciendo scroll al elemento seleccionado');
                selectedItemRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                });
            }, 100);
        }
    }, [selectedPlacementId, selectedShapeId]);

    if (!version) return null;

    // Asegurar que version.groups sea un array válido
    const safeGroups = Array.isArray(version.groups) ? version.groups : [];
    const safeShapes = Array.isArray(version.shapes) ? version.shapes : [];
    const safePlacements = Array.isArray(version.placements) ? version.placements : [];

    // Combinar y ordenar para mostrar (Mayor Z-Index arriba en la lista visualmente, user expectation)
    const allElements = [
        ...safeShapes.map(s => ({
            ...s,
            isShape: true,
            isGroup: false,
            label: s.type === 'text' && s.content
                ? `Texto: ${s.content.substring(0, 20)}${s.content.length > 20 ? '...' : ''}`
                : s.type === 'image'
                    ? 'Imagen'
                    : `${s.type.charAt(0).toUpperCase() + s.type.slice(1)}`
        })),
        ...safePlacements.map(p => ({
            ...p,
            isShape: false,
            isGroup: false,
            label: p.customLabel || `Campo ${p.fieldId}`,
            hasCustomLabel: !!p.customLabel
        })),
        ...safeGroups.map(g => ({
            ...g,
            isShape: false,
            isGroup: true,
            label: g.name || 'Grupo sin nombre'
        }))
    ].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)); // Ascending Z-Index (Opción A: menor arriba, mayor abajo)

    // Filtrar elementos que no están en grupos (para mostrar en el nivel raíz)
    const rootElements = allElements.filter(item => {
        if (item.isGroup) return true; // Los grupos siempre se muestran en raíz
        return !(item as any).groupId; // Solo elementos sin grupo
    });

    const handleToggleVisible = (e: React.MouseEvent, item: any) => {
        e.stopPropagation();
        if (item.isGroup) {
            updateGroup(version.id, item.id, { isVisible: item.isVisible === false ? true : false });
        } else if (item.isShape) {
            updateShape(version.id, item.id, { isVisible: item.isVisible === false ? true : false });
        } else {
            updatePlacement(version.id, item.id, { isVisible: item.isVisible === false ? true : false });
        }
    };

    const handleToggleLock = (e: React.MouseEvent, item: any) => {
        e.stopPropagation();
        if (item.isGroup) {
            updateGroup(version.id, item.id, { isLocked: !item.isLocked });
        } else if (item.isShape) {
            updateShape(version.id, item.id, { isLocked: !item.isLocked });
        } else {
            updatePlacement(version.id, item.id, { isLocked: !item.isLocked });
        }
    };

    const handleItemClick = (e: React.MouseEvent, item: any) => {
        if (item.isGroup) {
            // Toggle collapse del grupo
            setCollapsedGroups(prev => {
                const next = new Set(prev);
                if (next.has(item.id)) {
                    next.delete(item.id);
                } else {
                    next.add(item.id);
                }
                return next;
            });
            return;
        }

        // Selección múltiple con Ctrl/Cmd
        if (e.ctrlKey || e.metaKey) {
            setSelectedIds(prev => {
                if (prev.includes(item.id)) {
                    return prev.filter(id => id !== item.id);
                } else {
                    return [...prev, item.id];
                }
            });
        } else {
            // Selección simple
            if (item.isShape) {
                setSelectedShapeId(item.id);
            } else {
                setSelectedPlacementId(item.id);
            }
        }
    };

    const handleCreateGroup = () => {
        if (selectedIds.length < 2) return;
        const groupId = createGroup(version.id, selectedIds, `Grupo ${(version.groups?.length || 0) + 1}`);
        setSelectedIds([]);
        setSelectedPlacementId(null);
        setSelectedShapeId(null);
    };

    const handleUngroup = (e: React.MouseEvent, groupId: string) => {
        e.stopPropagation();
        ungroupElements(version.id, groupId);
    };

    const toggleGroupCollapse = (e: React.MouseEvent, groupId: string) => {
        e.stopPropagation();
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    const renderElement = (item: any, isChild = false) => {
        const isSelected = selectedIds.includes(item.id) ||
            (item.isShape ? selectedShapeId === item.id : selectedPlacementId === item.id);

        if (isSelected) {
            console.log('🔴 Elemento seleccionado encontrado:', item.id, item.label);
        }

        if (item.isGroup) {
            const isCollapsed = collapsedGroups.has(item.id);
            const childElements = allElements.filter(el =>
                !el.isGroup && (el as any).groupId === item.id
            );

            return (
                <div key={item.id} className={isChild ? 'ml-4' : ''}>
                    <div
                        ref={isSelected ? selectedItemRef : null}
                        onClick={(e) => toggleGroupCollapse(e, item.id)}
                        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg cursor-pointer group border-2 transition-all ${isSelected
                            ? 'bg-gradient-to-r from-purple-100 via-indigo-100 to-purple-100 border-purple-500 shadow-xl ring-4 ring-purple-300'
                            : 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 hover:border-purple-300 hover:shadow-sm'
                            }`}
                    >
                        {/* Icono de grupo con expand/collapse */}
                        <button
                            onClick={(e) => toggleGroupCollapse(e, item.id)}
                            className="text-purple-600"
                        >
                            <svg className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        {/* Icono de carpeta */}
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>

                        {/* Label del grupo */}
                        <div className="flex-1 min-w-0">
                            <span className="text-sm font-bold text-purple-900 truncate block">
                                {item.label}
                            </span>
                            <span className="text-[10px] text-purple-600">
                                {childElements.length} elemento{childElements.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Botón desagrupar */}
                        <button
                            onClick={(e) => handleUngroup(e, item.id)}
                            className="p-1 rounded hover:bg-purple-200 text-purple-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Desagrupar"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </button>

                        {/* Actions (Visible/Lock) */}
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={(e) => handleToggleVisible(e, item)}
                                className={`p-0.5 rounded ${item.isVisible === false ? 'text-gray-300' : 'text-purple-600 hover:text-purple-800'}`}
                                title={item.isVisible === false ? "Mostrar" : "Ocultar"}
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {item.isVisible === false ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    ) : (
                                        <>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </>
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

                    {/* Elementos hijos del grupo */}
                    {!isCollapsed && childElements.length > 0 && (
                        <div className="ml-6 mt-1 space-y-1 border-l-2 border-purple-200 pl-2">
                            {childElements.map(child => renderElement(child, true))}
                        </div>
                    )}
                </div>
            );
        }

        // Elemento normal (campo o shape)
        return (
            <div
                key={item.id}
                ref={isSelected ? selectedItemRef : null}
                onClick={(e) => handleItemClick(e, item)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg cursor-pointer group border-2 transition-all ${isChild ? 'ml-0' : ''
                    } ${isSelected
                        ? 'bg-gradient-to-r from-emerald-100 via-green-100 to-emerald-100 border-emerald-500 shadow-xl ring-4 ring-emerald-300 scale-105'
                        : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm'
                    }`}
            >
                {/* Checkbox para selección múltiple */}
                <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => { }}
                    className="w-3 h-3 text-emerald-600 rounded"
                    onClick={(e) => e.stopPropagation()}
                />

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
                    <span className={`text-sm truncate block ${isSelected
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
                                <>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </>
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
    };

    return (
        <aside className="w-full bg-white border-l border-gray-200 overflow-y-auto h-full flex flex-col">
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between sticky top-0 z-10">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Capas</h2>
                <span className="text-[10px] text-gray-400">{allElements.length} elementos</span>
            </div>

            {/* Botón de agrupar cuando hay selección múltiple */}
            {selectedIds.length >= 2 && (
                <div className="p-2 bg-purple-50 border-b border-purple-200">
                    <button
                        onClick={handleCreateGroup}
                        className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        Agrupar {selectedIds.length} elementos
                    </button>
                </div>
            )}

            {/* Indicador de selección activa - Más prominente */}
            {(selectedPlacementId || selectedShapeId) && selectedIds.length === 1 && (
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
                {rootElements.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-4">No hay elementos</p>
                )}

                {rootElements.map((item) => renderElement(item))}
            </div>

            {/* Tip de ayuda */}
            <div className="p-2 border-t border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-start gap-1.5">
                    <span className="text-xs">💡</span>
                    <div className="flex-1">
                        <p className="text-[9px] text-gray-600 font-medium">Ctrl/Cmd + Click para selección múltiple</p>
                        <p className="text-[8px] text-gray-500 mt-0.5">
                            Selecciona varios elementos y haz clic en "Agrupar"
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
