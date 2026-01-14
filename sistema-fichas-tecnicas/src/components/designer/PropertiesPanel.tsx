/**
 * PropertiesPanel - Panel profesional de propiedades de placement
 * Permite editar posición, tamaño, estilos, label y configuración avanzada
 */

'use client';

import type { FichaDesignVersion, FieldPlacement, ShapeElement } from '@/types/fichaDesign';
import { AVAILABLE_FIELDS } from '@/types/fichaDesign';
import { useDesignStore } from '@/stores/designStore';

interface PropertiesPanelProps {
    version: FichaDesignVersion | null;
    selectedPlacementId: string | null;
    selectedShapeId: string | null;
}

export function PropertiesPanel({ version, selectedPlacementId, selectedShapeId }: PropertiesPanelProps) {
    const { updatePlacement, removePlacement, updateShape, removeShape } = useDesignStore();

    if (!version || (!selectedPlacementId && !selectedShapeId)) {
        return (
            <aside className="w-full bg-white border-l border-gray-200 p-6 flex flex-col items-center justify-center text-center h-full">
                <div className="bg-gradient-to-br from-primary/10 to-purple/10 p-6 rounded-full mb-4">
                    <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                </div>
                <p className="text-sm text-gray-500 font-medium">Selecciona un campo para editar</p>
                <p className="text-xs text-gray-400 mt-1">Haz clic en cualquier elemento del canvas</p>
            </aside>
        );
    }

    const placement = selectedPlacementId ? version.placements.find((p) => p.id === selectedPlacementId) : null;
    const shape = selectedShapeId ? version.shapes?.find((s) => s.id === selectedShapeId) : null;

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

    // Render para SHAPES
    if (shape) {
        return (
            <aside className="w-full bg-white border-l border-gray-200 overflow-y-auto h-full">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple/5 to-pink/5 sticky top-0 z-10">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Propiedades</h2>
                        <button
                            onClick={handleDelete}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                    <div className="text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">
                        <span className="font-semibold capitalize">{shape.type}</span>
                    </div>
                </div>

                <div className="p-4 space-y-6">
                    {/* Geometría */}
                    <section className="space-y-3">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Geometría (mm)</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">X</label>
                                <input type="number" value={shape.x} onChange={(e) => handleUpdateShape({ x: parseFloat(e.target.value) || 0 })} className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-purple/20 focus:border-purple outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Y</label>
                                <input type="number" value={shape.y} onChange={(e) => handleUpdateShape({ y: parseFloat(e.target.value) || 0 })} className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-purple/20 focus:border-purple outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Ancho</label>
                                <input type="number" value={shape.width} onChange={(e) => handleUpdateShape({ width: parseFloat(e.target.value) || 10 })} className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-purple/20 focus:border-purple outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Alto</label>
                                <input type="number" value={shape.height} onChange={(e) => handleUpdateShape({ height: parseFloat(e.target.value) || 5 })} className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-purple/20 focus:border-purple outline-none" />
                            </div>
                        </div>
                    </section>

                    {/* Colores */}
                    <section className="space-y-3 pt-4 border-t border-gray-100">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Colores</h3>
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Relleno</label>
                            <div className="flex gap-2">
                                <input type="color" value={shape.fillColor || '#E5E7EB'} onChange={(e) => handleUpdateShape({ fillColor: e.target.value })} className="w-10 h-8 border border-gray-200 rounded cursor-pointer" />
                                <input type="text" value={shape.fillColor || '#E5E7EB'} onChange={(e) => handleUpdateShape({ fillColor: e.target.value })} className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-[10px] font-mono outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Borde</label>
                            <div className="flex gap-2">
                                <input type="color" value={shape.strokeColor || '#374151'} onChange={(e) => handleUpdateShape({ strokeColor: e.target.value })} className="w-10 h-8 border border-gray-200 rounded cursor-pointer" />
                                <input type="text" value={shape.strokeColor || '#374151'} onChange={(e) => handleUpdateShape({ strokeColor: e.target.value })} className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-[10px] font-mono outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Grosor Borde</label>
                            <input type="number" value={shape.strokeWidth || 1} onChange={(e) => handleUpdateShape({ strokeWidth: parseInt(e.target.value) || 1 })} className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-purple/20 focus:border-purple outline-none" />
                        </div>
                    </section>

                    {/* Texto (solo para type='text') */}
                    {shape.type === 'text' && (
                        <section className="space-y-3 pt-4 border-t border-gray-100">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Texto</h3>
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Contenido</label>
                                <textarea value={shape.content || ''} onChange={(e) => handleUpdateShape({ content: e.target.value })} rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-purple/20 focus:border-purple outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Tamaño (pt)</label>
                                <input type="number" value={shape.fontSize || 12} onChange={(e) => handleUpdateShape({ fontSize: parseInt(e.target.value) || 12 })} className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-purple/20 focus:border-purple outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Color</label>
                                <div className="flex gap-2">
                                    <input type="color" value={shape.color || '#000000'} onChange={(e) => handleUpdateShape({ color: e.target.value })} className="w-10 h-8 border border-gray-200 rounded cursor-pointer" />
                                    <input type="text" value={shape.color || '#000000'} onChange={(e) => handleUpdateShape({ color: e.target.value })} className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-[10px] font-mono outline-none" />
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Border Radius (solo para rectangle) */}
                    {shape.type === 'rectangle' && (
                        <section className="space-y-3 pt-4 border-t border-gray-100">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bordes</h3>
                            <div>
                                <label className="text-[10px] text-gray-600 mb-1 block font-medium">Border Radius</label>
                                <input type="number" value={shape.borderRadius || 0} onChange={(e) => handleUpdateShape({ borderRadius: parseInt(e.target.value) || 0 })} className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-purple/20 focus:border-purple outline-none" />
                            </div>
                        </section>
                    )}
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
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Propiedades</h2>
                    <button
                        onClick={handleDelete}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                        title="Eliminar campo"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
                {field && (
                    <div className="text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">
                        <span className="font-semibold">{field.label}</span>
                        <span className="text-gray-400 ml-2">({field.category})</span>
                    </div>
                )}
            </div>

            <div className="p-4 space-y-6">
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

                {/* Tipografía */}
                <section className="space-y-3 pt-4 border-t border-gray-100">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tipografía</h3>

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
                            value={placement.fontFamily || 'Inter'}
                            onChange={(e) => handleUpdate({ fontFamily: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        >
                            <option value="Inter">Inter</option>
                            <option value="Arial">Arial</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Courier New">Courier New</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-600 mb-1 block font-medium">Alineación</label>
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
                        <label className="text-[10px] text-gray-600 mb-1 block font-medium">Color</label>
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

                {/* Estilos */}
                <section className="space-y-3 pt-4 border-t border-gray-100">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estilos</h3>

                    <div>
                        <label className="text-[10px] text-gray-600 mb-1 block font-medium">Fondo</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={placement.backgroundColor || '#FFFFFF'}
                                onChange={(e) => handleUpdate({ backgroundColor: e.target.value })}
                                className="w-10 h-8 border border-gray-200 rounded cursor-pointer"
                            />
                            <input
                                type="text"
                                value={placement.backgroundColor || '#FFFFFF'}
                                onChange={(e) => handleUpdate({ backgroundColor: e.target.value })}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-[10px] font-mono outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Border Radius</label>
                            <input
                                type="number"
                                value={placement.borderRadius || 0}
                                onChange={(e) => handleUpdate({ borderRadius: parseInt(e.target.value) || 0 })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Padding</label>
                            <input
                                type="number"
                                value={placement.padding || 0}
                                onChange={(e) => handleUpdate({ padding: parseInt(e.target.value) || 0 })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>
                </section>

                {/* Label */}
                <section className="space-y-3 pt-4 border-t border-gray-100">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Label</h3>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={placement.showLabel}
                            onChange={(e) => handleUpdate({ showLabel: e.target.checked })}
                            className="w-4 h-4 text-primary focus:ring-primary/20 rounded"
                        />
                        <label className="text-xs text-gray-700 font-medium">Mostrar label</label>
                    </div>

                    {placement.showLabel && (
                        <div>
                            <label className="text-[10px] text-gray-600 mb-1 block font-medium">Label personalizado</label>
                            <input
                                type="text"
                                value={placement.customLabel || ''}
                                onChange={(e) => handleUpdate({ customLabel: e.target.value })}
                                placeholder={field?.label || 'Label...'}
                                className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    )}
                </section>

                {/* Z-Index */}
                <section className="space-y-3 pt-4 border-t border-gray-100">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Capa</h3>
                    <div>
                        <label className="text-[10px] text-gray-600 mb-1 block font-medium">Z-Index</label>
                        <input
                            type="number"
                            value={placement.zIndex}
                            onChange={(e) => handleUpdate({ zIndex: parseInt(e.target.value) || 1 })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>
                </section>
            </div>
        </aside>
    );
}
