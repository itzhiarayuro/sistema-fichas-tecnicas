/**
 * PropertiesPanel - Panel profesional de propiedades de placement
 * Permite editar posición, tamaño, estilos, label y configuración avanzada
 */

'use client';

import type { FichaDesignVersion, FieldPlacement, ShapeElement } from '@/types/fichaDesign';
import { AVAILABLE_FIELDS } from '@/types/fichaDesign';
import { useDesignStore } from '@/stores/designStore';
import { StylePicker } from './StylePicker';

interface PropertiesPanelProps {
    version: FichaDesignVersion | null;
}

export function PropertiesPanel({ version }: PropertiesPanelProps) {
    const {
        selectedPlacementId,
        selectedShapeId,
        selectedGroupId,
        setSelectedPlacementId,
        setSelectedShapeId,
        updatePlacement,
        removePlacement,
        updateShape,
        removeShape,
        addPlacement,
        addShape,
        updateGroup,
        ungroupElements,
        removeFromGroup
    } = useDesignStore();

    if (!version || (!selectedPlacementId && !selectedShapeId && !selectedGroupId)) {
        return (
            <aside className="w-full bg-white border-l border-gray-200 p-6 flex flex-col items-center justify-center text-center h-full">
                <div className="bg-gradient-to-br from-primary/10 to-purple/10 p-6 rounded-full mb-4">
                    <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                </div>
                <p className="text-sm text-gray-500 font-medium">Selecciona un elemento para editar</p>
                <p className="text-xs text-gray-400 mt-1">Haz clic en cualquier campo o figura del canvas</p>
            </aside>
        );
    }

    const placement = selectedPlacementId ? version.placements.find((p) => p.id === selectedPlacementId) : null;
    const shape = selectedShapeId ? version.shapes?.find((s) => s.id === selectedShapeId) : null;
    const group = selectedGroupId ? version.groups?.find((g) => g.id === selectedGroupId) : null;

    // Render para GRUPOS seleccionados
    if (group) {
        const childCount = (version.placements.filter(p => p.groupId === group.id).length)
            + (version.shapes?.filter(s => s.groupId === group.id).length || 0);
        return (
            <aside className="w-full bg-white border-l border-gray-200 overflow-y-auto h-full">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 sticky top-0 z-10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="bg-white p-1.5 rounded-lg shadow-sm border border-purple-200">
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                            </div>
                            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Propiedades del Grupo</h2>
                        </div>
                        <button
                            onClick={() => { if (confirm('¿Desagrupar todos los elementos?')) ungroupElements(version.id, group.id); }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Desagrupar"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </button>
                    </div>
                    <span className="text-[10px] font-bold text-purple-600 bg-white px-2 py-0.5 rounded-full shadow-sm border border-purple-100 uppercase">
                        {childCount} elemento{childCount !== 1 ? 's' : ''}
                    </span>
                </div>

                <div className="p-4 space-y-5">
                    {/* Nombre del grupo */}
                    <section className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border-2 border-purple-200 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="bg-purple-600 text-white p-1 rounded">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider">Nombre del Grupo</h3>
                        </div>
                        <input
                            type="text"
                            defaultValue={group.name || ''}
                            placeholder="Ej: Entrada 1, Salida 2..."
                            onBlur={(e) => updateGroup(version.id, group.id, { name: e.target.value.trim() || group.name })}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-full bg-white border-2 border-purple-300 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-purple-400/30 focus:border-purple-500 outline-none transition-all shadow-sm"
                        />
                        <p className="text-[9px] text-purple-600/80 leading-tight">
                            💡 El nombre es clave para el efecto acordeón en el PDF Flexible.<br />
                            Usa nombres como <strong>Entrada 1</strong>, <strong>Salida 2</strong>, <strong>Sumidero 3</strong>.
                        </p>
                    </section>

                    {/* Visibilidad y bloqueo */}
                    <section className="space-y-3 pt-2 border-t border-gray-100">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estado</h3>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={group.isVisible !== false}
                                    onChange={(e) => updateGroup(version.id, group.id, { isVisible: e.target.checked })}
                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                                <span className="text-xs text-gray-700">Visible</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={group.isLocked === true}
                                    onChange={(e) => updateGroup(version.id, group.id, { isLocked: e.target.checked })}
                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                                <span className="text-xs text-gray-700">Bloqueado</span>
                            </label>
                        </div>
                    </section>
                </div>
            </aside>
        );
    }

    if (!placement && !shape) return null;

    const field = placement ? AVAILABLE_FIELDS.find(f => f.id === placement.fieldId) : null;

    const handleUpdatePlacement = (updates: Partial<FieldPlacement>) => {
        if (placement) updatePlacement(version.id, placement.id, updates);
    };

    const handleUpdateShape = (updates: Partial<ShapeElement>) => {
        if (shape) updateShape(version.id, shape.id, updates);
    };

    const handleDelete = () => {
        if (placement && confirm('¿Eliminar este campo del diseño?')) {
            removePlacement(version.id, placement.id);
        } else if (shape && confirm('¿Eliminar esta figura del diseño?')) {
            removeShape(version.id, shape.id);
        }
    };

    const handleApplyStyle = (style: any) => {
        if (placement) {
            handleUpdatePlacement(style);
        } else if (shape) {
            handleUpdateShape(style);
        }
    };

    const handleDuplicate = () => {
        if (!version) return;
        if (placement) {
            const newId = addPlacement(version.id, { ...placement, x: placement.x + 5, y: placement.y + 5 });
            setSelectedPlacementId(newId);
        } else if (shape) {
            const newId = addShape(version.id, { ...shape, x: shape.x + 5, y: shape.y + 5 });
            setSelectedShapeId(newId);
        }
    };

    // Render para SHAPES
    if (shape) {
        return (
            <aside className="w-full bg-white border-l border-gray-200 overflow-y-auto h-full">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-10">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="bg-white p-1.5 rounded-lg shadow-sm">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Propiedades</h2>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleDuplicate}
                                className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all"
                                title="Duplicar"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                </svg>
                            </button>
                            <button
                                onClick={handleDelete}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Eliminar"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full shadow-sm border border-indigo-100 uppercase">
                            {shape.type}
                        </span>
                        {shape.groupId && (
                            <button
                                onClick={() => removeFromGroup(version.id, shape.groupId!, [shape.id])}
                                className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200 uppercase transition-all"
                                title="Sacar del grupo"
                            >
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Sacar del grupo
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-4 space-y-6">
                    {/* Style Picker */}
                    <StylePicker
                        version={version}
                        onApplyStyle={handleApplyStyle}
                    />

                    {/* Geometría */}
                    <section className="space-y-3">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Geometría (mm)</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">X</label>
                                <input type="number" value={shape.x} onChange={(e) => handleUpdateShape({ x: parseFloat(e.target.value) || 0 })} className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Y</label>
                                <input type="number" value={shape.y} onChange={(e) => handleUpdateShape({ y: parseFloat(e.target.value) || 0 })} className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Ancho</label>
                                <input type="number" value={shape.width} onChange={(e) => handleUpdateShape({ width: parseFloat(e.target.value) || 10 })} className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Alto</label>
                                <input type="number" value={shape.height} onChange={(e) => handleUpdateShape({ height: parseFloat(e.target.value) || 5 })} className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                            </div>
                        </div>
                    </section>

                    {/* Colores */}
                    <section className="space-y-3 pt-4 border-t border-gray-100">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Colores</h3>
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Relleno</label>
                            <div className="flex items-center gap-1">
                                {shape.fillColor && shape.fillColor !== 'transparent' ? (
                                    <>
                                        <input
                                            type="color"
                                            value={shape.fillColor}
                                            onChange={(e) => handleUpdateShape({ fillColor: e.target.value })}
                                            className="w-6 h-6 border border-gray-200 rounded cursor-pointer p-0"
                                        />
                                        <input
                                            type="text"
                                            value={shape.fillColor}
                                            onChange={(e) => handleUpdateShape({ fillColor: e.target.value })}
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-[10px] font-mono outline-none"
                                        />
                                        <button
                                            onClick={() => handleUpdateShape({ fillColor: 'transparent' })}
                                            className="text-[10px] text-red-500 hover:bg-red-50 px-1 rounded ml-1"
                                        >
                                            Quitar
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleUpdateShape({ fillColor: '#E5E7EB' })}
                                        className="w-full text-[10px] bg-gray-100 border border-dashed border-gray-300 rounded py-1.5 text-gray-500 hover:bg-gray-200 transition"
                                    >
                                        Transparente (Click para color)
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Borde</label>
                            <div className="flex items-center gap-1">
                                {shape.strokeColor && shape.strokeColor !== 'transparent' ? (
                                    <>
                                        <input
                                            type="color"
                                            value={shape.strokeColor}
                                            onChange={(e) => handleUpdateShape({ strokeColor: e.target.value })}
                                            className="w-6 h-6 border border-gray-200 rounded cursor-pointer p-0"
                                        />
                                        <input
                                            type="text"
                                            value={shape.strokeColor}
                                            onChange={(e) => handleUpdateShape({ strokeColor: e.target.value })}
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-[10px] font-mono outline-none"
                                        />
                                        <button
                                            onClick={() => handleUpdateShape({ strokeColor: 'transparent', strokeWidth: 0 })}
                                            className="text-[10px] text-red-500 hover:bg-red-50 px-1 rounded ml-1"
                                        >
                                            Quitar
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleUpdateShape({ strokeColor: '#000000', strokeWidth: 1 })}
                                        className="w-full text-[10px] bg-gray-100 border border-dashed border-gray-300 rounded py-1.5 text-gray-500 hover:bg-gray-200 transition"
                                    >
                                        Sin Borde (Click para color)
                                    </button>
                                )}
                            </div>
                        </div>
                        {shape.strokeColor && shape.strokeColor !== 'transparent' && (
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Grosor Borde</label>
                                <input
                                    type="number"
                                    value={shape.strokeWidth || 1}
                                    onChange={(e) => handleUpdateShape({ strokeWidth: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                            </div>
                        )}
                    </section>

                    {/* Texto (solo para type='text') */}
                    {shape.type === 'text' && (
                        <section className="space-y-3 pt-4 border-t border-gray-100">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Texto</h3>
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Contenido</label>
                                <textarea value={shape.content || ''} onChange={(e) => handleUpdateShape({ content: e.target.value })} rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Alineación</label>
                                <div className="flex bg-gray-50 rounded-md p-1 gap-1">
                                    {(['left', 'center', 'right'] as const).map((align) => (
                                        <button
                                            key={align}
                                            onClick={() => handleUpdateShape({ textAlign: align })}
                                            className={`flex-1 p-1.5 rounded transition-all ${(shape.textAlign || 'left') === align
                                                ? 'bg-white shadow-sm text-blue-600'
                                                : 'text-gray-400 hover:text-gray-600'
                                                }`}
                                        >
                                            <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                                                    align === 'left' ? 'M4 6h16M4 12h10M4 18h16' :
                                                        align === 'center' ? 'M4 6h16M7 12h10M4 18h16' :
                                                            'M4 6h16M10 12h10M4 18h16'
                                                } />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-gray-600 mb-1 block font-medium">Tamaño (pt)</label>
                                    <input type="number" value={shape.fontSize || 12} onChange={(e) => handleUpdateShape({ fontSize: parseInt(e.target.value) || 12 })} className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-600 mb-1 block font-medium">Peso</label>
                                    <select
                                        value={shape.fontWeight || 'normal'}
                                        onChange={(e) => handleUpdateShape({ fontWeight: e.target.value as 'normal' | 'bold' })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="bold">Negrita</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Color Texto</label>
                                <div className="flex gap-2">
                                    <input type="color" value={shape.color || '#000000'} onChange={(e) => handleUpdateShape({ color: e.target.value })} className="w-10 h-8 border border-gray-200 rounded cursor-pointer" />
                                    <input type="text" value={shape.color || '#000000'} onChange={(e) => handleUpdateShape({ color: e.target.value })} className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-[10px] font-mono outline-none" />
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Imagen (solo para type='image') */}
                    {shape.type === 'image' && (
                        <section className="space-y-3 pt-4 border-t border-gray-100">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Imagen</h3>
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Fuente de Imagen</label>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => document.getElementById('shape-image-upload')?.click()}
                                        className="w-full py-2 px-3 border border-gray-200 bg-white hover:bg-gray-50 rounded-md text-xs font-semibold text-gray-700 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Subir Local...
                                    </button>
                                    <input
                                        id="shape-image-upload"
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    handleUpdateShape({ imageUrl: ev.target?.result as string });
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                    <label className="text-[10px] text-gray-500 mt-2 block italic">O pega el enlace abajo:</label>
                                    <textarea
                                        value={shape.imageUrl || ''}
                                        onChange={(e) => handleUpdateShape({ imageUrl: e.target.value })}
                                        rows={3}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-[10px] font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        placeholder="data:image/... o https://..."
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Opacidad ({Math.round((shape.opacity ?? 1) * 100)}%)</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={shape.opacity ?? 1}
                                    onChange={(e) => handleUpdateShape({ opacity: parseFloat(e.target.value) })}
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                            </div>
                        </section>
                    )}

                    {/* Border Radius (solo para rectangle e image) */}
                    {(shape.type === 'rectangle' || shape.type === 'image') && (
                        <section className="space-y-3 pt-4 border-t border-gray-100">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bordes</h3>
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Border Radius</label>
                                <input type="number" value={shape.borderRadius || 0} onChange={(e) => handleUpdateShape({ borderRadius: parseInt(e.target.value) || 0 })} className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                            </div>
                        </section>
                    )}

                    {/* Estado y Orden */}
                    <section className="space-y-3 pt-4 border-t border-gray-100">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estado y Orden</h3>
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Z-Index (Capa)</label>
                            <input
                                type="number"
                                value={shape.zIndex || 1}
                                onChange={(e) => handleUpdateShape({ zIndex: parseInt(e.target.value) || 1 })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-4 py-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={shape.isVisible !== false}
                                    onChange={(e) => handleUpdateShape({ isVisible: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-700">Visible</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={shape.isLocked === true}
                                    onChange={(e) => handleUpdateShape({ isLocked: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-700">Bloqueado</span>
                            </label>
                        </div>
                        <div className="py-1">
                            <label className="flex items-center gap-2 cursor-pointer p-2 bg-blue-50/50 rounded-md border border-blue-100 hover:bg-blue-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={shape.repeatOnEveryPage === true}
                                    onChange={(e) => handleUpdateShape({ repeatOnEveryPage: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <div>
                                    <span className="text-xs font-bold text-blue-700 block">Encabezado de Página</span>
                                    <span className="text-[9px] text-blue-500">Se repetirá en todas las hojas</span>
                                </div>
                            </label>
                        </div>
                    </section>
                </div>
            </aside>
        );
    }

    // Render para FIELD PLACEMENTS
    if (!placement) return null;

    const handleUpdate = (updates: Partial<FieldPlacement>) => {
        handleUpdatePlacement(updates);
    };

    return (
        <aside className="w-full bg-white border-l border-gray-200 overflow-y-auto h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-purple/5 sticky top-0 z-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="bg-white p-1.5 rounded-lg shadow-sm border border-primary/20">
                            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Propiedades Campo</h2>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleDuplicate}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                            title="Duplicar"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Eliminar campo"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
                {field && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-[10px] text-gray-600 bg-white/80 px-3 py-1.5 rounded-full border border-gray-200 inline-flex items-center gap-2">
                            <span className="font-bold text-gray-800">{field.label}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className="text-gray-500 uppercase">{field.category}</span>
                        </div>
                        {placement.groupId && (
                            <button
                                onClick={() => removeFromGroup(version.id, placement.groupId!, [placement.id])}
                                className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded-full border border-orange-200 uppercase transition-all"
                                title="Sacar del grupo"
                            >
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Sacar del grupo
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="p-4 space-y-6">
                {/* SECCIÓN 0: ETIQUETA / TEXTO (Prioridad Máxima del Usuario) */}
                <section className="bg-gradient-to-br from-primary/10 to-purple/10 p-4 rounded-xl border-2 border-primary/20 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary text-white p-1 rounded">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Texto del Campo</h3>
                    </div>

                    <div>
                        <label className="text-[10px] text-primary/70 mb-1.5 block font-bold uppercase">Nombre Personalizado</label>
                        <input
                            type="text"
                            value={placement.customLabel || ''}
                            onChange={(e) => handleUpdate({ customLabel: e.target.value })}
                            placeholder={field?.label || 'Escribe aquí...'}
                            className="w-full bg-white border-2 border-primary/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                        />
                        <p className="text-[9px] text-gray-500 mt-2 leading-tight">
                            Este texto aparecerá en la etiqueta si está activada y servirá para identificar el elemento.
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={`w-8 h-4 rounded-full transition-all relative ${placement.showLabel ? 'bg-primary' : 'bg-gray-300'}`}>
                                <input
                                    type="checkbox"
                                    checked={placement.showLabel}
                                    onChange={(e) => handleUpdate({ showLabel: e.target.checked })}
                                    className="sr-only"
                                />
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${placement.showLabel ? 'left-4.5' : 'left-0.5'}`} />
                            </div>
                            <span className="text-xs font-bold text-gray-700">Mostrar Etiqueta</span>
                        </label>
                    </div>
                </section>

                {/* Style Picker */}
                <StylePicker
                    version={version}
                    onApplyStyle={handleApplyStyle}
                />

                {/* Geometría */}
                <section className="space-y-3">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Geometría (mm)</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">X</label>
                            <input
                                type="number"
                                value={placement.x}
                                onChange={(e) => handleUpdate({ x: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Y</label>
                            <input
                                type="number"
                                value={placement.y}
                                onChange={(e) => handleUpdate({ y: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Ancho</label>
                            <input
                                type="number"
                                value={placement.width}
                                onChange={(e) => handleUpdate({ width: parseFloat(e.target.value) || 10 })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Alto</label>
                            <input
                                type="number"
                                value={placement.height}
                                onChange={(e) => handleUpdate({ height: parseFloat(e.target.value) || 5 })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>
                </section>

                {/* SECCIÓN 1: CONTENEDOR (CAJA) */}
                <section className="space-y-3 pt-4 border-t border-gray-100">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contenedor (Caja)</h3>

                    {/* Fondo del Contenedor */}
                    <div>
                        <label className="text-[10px] text-gray-600 mb-1 block font-medium">Fondo General</label>
                        <div className="flex items-center gap-1">
                            {placement.backgroundColor && placement.backgroundColor !== 'transparent' ? (
                                <>
                                    <input
                                        type="color"
                                        value={placement.backgroundColor}
                                        onChange={(e) => handleUpdate({ backgroundColor: e.target.value })}
                                        className="w-6 h-6 border border-gray-200 rounded cursor-pointer p-0"
                                    />
                                    <button
                                        onClick={() => handleUpdate({ backgroundColor: 'transparent' })}
                                        className="text-[10px] text-red-500 hover:bg-red-50 px-1 rounded ml-auto"
                                    >
                                        Quitar
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => handleUpdate({ backgroundColor: '#FFFFFF' })}
                                    className="w-full text-[10px] bg-gray-100 border border-dashed border-gray-300 rounded py-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition"
                                >
                                    Transparente (Click para color)
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Borde del Contenedor */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Grosor Borde</label>
                            <input
                                type="number"
                                value={placement.borderWidth || 0}
                                onChange={(e) => handleUpdate({ borderWidth: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Color Borde</label>
                            <div className="flex items-center gap-1">
                                {placement.borderColor && placement.borderColor !== 'transparent' ? (
                                    <>
                                        <input
                                            type="color"
                                            value={placement.borderColor}
                                            onChange={(e) => handleUpdate({ borderColor: e.target.value })}
                                            className="w-6 h-6 border border-gray-200 rounded cursor-pointer p-0"
                                        />
                                        <button
                                            onClick={() => handleUpdate({ borderColor: 'transparent' })}
                                            className="text-[10px] text-red-500 hover:bg-red-50 px-1 rounded ml-auto"
                                        >
                                            Quitar
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleUpdate({ borderColor: '#000000' })}
                                        className="w-full text-[10px] bg-gray-100 border border-dashed border-gray-300 rounded py-1 text-gray-500 hover:bg-gray-200 transition"
                                    >
                                        Sin Borde
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Radio (Radius)</label>
                            <input
                                type="number"
                                value={placement.borderRadius || 0}
                                onChange={(e) => handleUpdate({ borderRadius: parseInt(e.target.value) || 0 })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Padding Interno</label>
                            <input
                                type="number"
                                value={placement.padding || 0}
                                onChange={(e) => handleUpdate({ padding: parseInt(e.target.value) || 0 })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>
                </section>

                {/* SECCIÓN 2: CONTENIDO (VALOR) */}
                <section className="space-y-3 pt-4 border-t border-gray-100">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contenido (Valor)</h3>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Tamaño (pt)</label>
                            <input
                                type="number"
                                value={placement.fontSize || 10}
                                onChange={(e) => handleUpdate({ fontSize: parseInt(e.target.value) || 10 })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Peso</label>
                            <select
                                value={placement.fontWeight || 'normal'}
                                onChange={(e) => handleUpdate({ fontWeight: e.target.value as 'normal' | 'bold' })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                <option value="normal">Normal</option>
                                <option value="bold">Bold</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-600 mb-1 block font-medium">Fuente</label>
                        <select
                            value={placement.fontFamily || 'Arial'}
                            onChange={(e) => handleUpdate({ fontFamily: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        >
                            <option value="Arial">Arial</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-600 mb-1 block font-medium">Alineación Texto</label>
                        <div className="flex bg-gray-50 rounded-md p-1 gap-1">
                            {(['left', 'center', 'right'] as const).map((align) => (
                                <button
                                    key={align}
                                    onClick={() => handleUpdate({ textAlign: align })}
                                    className={`flex-1 p-1.5 rounded transition-all ${placement.textAlign === align
                                        ? 'bg-white shadow-sm text-primary'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d={
                                                align === 'left'
                                                    ? 'M4 6h16M4 12h10M4 18h16'
                                                    : align === 'center'
                                                        ? 'M4 6h16M7 12h10M4 18h16'
                                                        : 'M4 6h16M10 12h10M4 18h16'
                                            }
                                        />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-600 mb-1 block font-medium">Color Texto</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={placement.color || '#000000'}
                                onChange={(e) => handleUpdate({ color: e.target.value })}
                                className="w-10 h-8 border border-gray-200 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={placement.color || '#000000'}
                                onChange={(e) => handleUpdate({ color: e.target.value })}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-[10px] font-mono outline-none"
                            />
                        </div>
                    </div>
                </section>

                {/* SECCIÓN 3: ETIQUETA (LABEL) */}
                <section className="space-y-3 pt-4 border-t-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple/5 -mx-4 px-4 py-4">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Etiqueta (Label)</h3>
                    </div>

                    <div>
                        <label className="text-xs text-gray-700 mb-2 block font-bold">Texto Personalizado</label>
                        <input
                            type="text"
                            value={placement.customLabel || ''}
                            onChange={(e) => handleUpdate({ customLabel: e.target.value })}
                            placeholder={field?.label || 'Ej: Nombre del Pozo...'}
                            className="w-full bg-white border border-primary/30 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary/40 focus:border-primary outline-none"
                        />
                        <p className="text-[10px] text-gray-500 mt-1.5 italic">
                            💡 Este nombre aparecerá en el panel de capas para identificar fácilmente este campo
                        </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 mb-3">
                        <input
                            type="checkbox"
                            checked={placement.showLabel}
                            onChange={(e) => handleUpdate({ showLabel: e.target.checked })}
                            className="w-4 h-4 text-primary focus:ring-primary/20 rounded"
                        />
                        <label className="text-xs text-gray-700 font-medium">Mostrar etiqueta</label>
                    </div>

                    {placement.showLabel && (
                        <div className="space-y-3 bg-white/60 p-3 rounded-lg border border-primary/10">

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[9px] text-gray-500 block mb-1">Tamaño</label>
                                    <input
                                        type="number"
                                        value={placement.labelFontSize || Math.round((placement.fontSize || 10) * 0.8)}
                                        onChange={(e) => handleUpdate({ labelFontSize: parseInt(e.target.value) || 8 })}
                                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 block mb-1">Peso</label>
                                    <select
                                        value={placement.labelFontWeight || 'bold'}
                                        onChange={(e) => handleUpdate({ labelFontWeight: e.target.value as 'normal' | 'bold' })}
                                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs"
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="bold">Negrita</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[9px] text-gray-500 block mb-1">Ancho (mm)</label>
                                    <input
                                        type="number"
                                        placeholder="Auto"
                                        value={placement.labelWidth || ''}
                                        onChange={(e) => handleUpdate({ labelWidth: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 block mb-1">Padding (px)</label>
                                    <input
                                        type="number"
                                        value={placement.labelPadding || 0}
                                        onChange={(e) => handleUpdate({ labelPadding: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] text-gray-500 block mb-1">Alineación Label</label>
                                <div className="flex bg-gray-100 rounded p-0.5 gap-0.5">
                                    {(['left', 'center', 'right'] as const).map((align) => (
                                        <button
                                            key={align}
                                            onClick={() => handleUpdate({ labelAlign: align })}
                                            className={`flex-1 p-1 rounded transition-all ${(placement.labelAlign || 'left') === align
                                                ? 'bg-white shadow text-primary'
                                                : 'text-gray-400 hover:text-gray-600'
                                                }`}
                                        >
                                            <svg className="w-3 h-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                                                    align === 'left' ? 'M4 6h16M4 12h10M4 18h16' :
                                                        align === 'center' ? 'M4 6h16M7 12h10M4 18h16' :
                                                            'M4 6h16M10 12h10M4 18h16'
                                                } />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-dashed border-gray-200">
                                <div>
                                    <label className="text-[9px] text-gray-500 block mb-1">Color Label</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="color"
                                            value={placement.labelColor || '#6B7280'}
                                            onChange={(e) => handleUpdate({ labelColor: e.target.value })}
                                            className="w-6 h-6 border border-gray-200 rounded cursor-pointer p-0"
                                        />
                                        <span className="text-[10px] text-gray-400 font-mono">{placement.labelColor || '#6B72'}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 block mb-1">Fondo Label</label>
                                    <div className="flex items-center gap-1">
                                        {placement.labelBackgroundColor && placement.labelBackgroundColor !== 'transparent' ? (
                                            <>
                                                <input
                                                    type="color"
                                                    value={placement.labelBackgroundColor}
                                                    onChange={(e) => handleUpdate({ labelBackgroundColor: e.target.value })}
                                                    className="w-6 h-6 border border-gray-200 rounded cursor-pointer p-0"
                                                />
                                                <button
                                                    onClick={() => handleUpdate({ labelBackgroundColor: 'transparent' })}
                                                    className="text-[10px] text-red-500 hover:bg-red-50 px-1 rounded ml-auto"
                                                    title="Hacer transparente"
                                                >
                                                    Quitar
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleUpdate({ labelBackgroundColor: '#EEEEEE' })} // Un gris claro por defecto para ver el cambio
                                                className="w-full text-[10px] bg-gray-100 border border-dashed border-gray-300 rounded py-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition"
                                            >
                                                Transparente
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* Z-Index y Estado */}
                <section className="space-y-3 pt-4 border-t border-gray-100">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Capa y Estado</h3>
                    <div>
                        <label className="text-[10px] text-gray-600 mb-1 block font-medium">Z-Index</label>
                        <input
                            type="number"
                            value={placement.zIndex}
                            onChange={(e) => handleUpdate({ zIndex: parseInt(e.target.value) || 1 })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-4 py-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={placement.isVisible !== false}
                                onChange={(e) => handleUpdate({ isVisible: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-700">Visible</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={placement.isLocked === true}
                                onChange={(e) => handleUpdate({ isLocked: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-700">Bloqueado</span>
                        </label>
                    </div>
                    <div className="py-1">
                        <label className="flex items-center gap-2 cursor-pointer p-2 bg-primary/5 rounded-md border border-primary/10 hover:bg-primary/10 transition-colors">
                            <input
                                type="checkbox"
                                checked={placement.repeatOnEveryPage === true}
                                onChange={(e) => handleUpdate({ repeatOnEveryPage: e.target.checked })}
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/20"
                            />
                            <div>
                                <span className="text-xs font-bold text-primary block">Encabezado de Página</span>
                                <span className="text-[9px] text-primary/60">Se repetirá en todas las hojas</span>
                            </div>
                        </label>
                    </div>
                </section>
            </div>
        </aside>
    );
}
