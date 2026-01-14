/**
 * DesignsPanel - Lista de diseños disponibles para edición
 */

'use client';

import { useDesignStore } from '@/stores/designStore';

export function DesignsPanel() {
    const { versions, currentVersionId, setCurrentVersion, createVersion, deleteVersion } = useDesignStore();

    const handleCreateNew = () => {
        createVersion(`Nuevo Diseño ${versions.length + 1}`, 'Plantilla personalizada');
    };

    return (
        <aside className="w-full bg-slate-50 border-r border-slate-200 flex flex-col z-20">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mis Diseños</h2>
                <button
                    onClick={handleCreateNew}
                    className="p-1 hover:bg-slate-100 rounded-md text-primary transition-colors"
                    title="Nuevo diseño"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {versions.length === 0 && (
                    <div className="text-center py-8 px-4">
                        <p className="text-xs text-slate-400 italic">No hay diseños guardados</p>
                    </div>
                )}

                {versions.map((version) => (
                    <div
                        key={version.id}
                        className={`group relative flex flex-col p-3 rounded-lg border transition-all cursor-pointer ${currentVersionId === version.id
                            ? 'bg-white border-primary shadow-sm'
                            : 'bg-transparent border-transparent hover:bg-white hover:border-slate-300'
                            }`}
                        onClick={() => setCurrentVersion(version.id)}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-bold truncate ${currentVersionId === version.id ? 'text-primary' : 'text-slate-700'
                                }`}>
                                {version.name}
                            </span>
                            {version.isDefault && (
                                <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                                    Base
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mb-1">
                            {version.description || 'Sin descripción'}
                        </p>
                        <div className="text-[9px] text-slate-300 flex items-center gap-2">
                            <span>{version.pageSize}</span>
                            <span>•</span>
                            <span>{version.placements.length + (version.shapes?.length || 0)} elems</span>
                        </div>

                        {!version.isDefault && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('¿Eliminar este diseño?')) deleteVersion(version.id);
                                }}
                                className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </aside>
    );
}
