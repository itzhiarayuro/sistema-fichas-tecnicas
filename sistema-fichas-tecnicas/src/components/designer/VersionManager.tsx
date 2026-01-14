/**
 * VersionManager - Gestor completo de versiones de diseños
 * Permite crear, duplicar, renombrar, eliminar y establecer versión por defecto
 */

'use client';

import { useState } from 'react';
import { useDesignStore } from '@/stores/designStore';
import type { FichaDesignVersion } from '@/types/fichaDesign';

interface VersionManagerProps {
    currentVersionId: string | null;
    onVersionSelect: (id: string) => void;
}

export function VersionManager({ currentVersionId, onVersionSelect }: VersionManagerProps) {
    const { versions, createVersion, deleteVersion, duplicateVersion, setDefaultVersion, updateVersion } = useDesignStore();
    const [isCreating, setIsCreating] = useState(false);
    const [newVersionName, setNewVersionName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const handleCreate = () => {
        if (!newVersionName.trim()) return;
        const id = createVersion(newVersionName.trim(), 'Versión personalizada');
        setNewVersionName('');
        setIsCreating(false);
        onVersionSelect(id);
    };

    const handleDuplicate = (version: FichaDesignVersion) => {
        const newId = duplicateVersion(version.id, `${version.name} (copia)`);
        onVersionSelect(newId);
    };

    const handleRename = (id: string) => {
        if (!editingName.trim()) return;
        updateVersion(id, { name: editingName.trim() });
        setEditingId(null);
        setEditingName('');
    };

    const handleDelete = (id: string) => {
        if (confirm('¿Eliminar esta versión de diseño?')) {
            deleteVersion(id);
            if (currentVersionId === id && versions.length > 1) {
                const nextVersion = versions.find(v => v.id !== id);
                if (nextVersion) onVersionSelect(nextVersion.id);
            }
        }
    };

    const startEdit = (version: FichaDesignVersion) => {
        setEditingId(version.id);
        setEditingName(version.name);
    };

    return (
        <div className="w-full bg-white border-r border-gray-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Versiones de Diseño
                    </h2>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="p-1.5 hover:bg-white/80 rounded-lg transition-colors"
                        title="Nueva versión"
                    >
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>

                {/* Formulario de creación */}
                {isCreating && (
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-200">
                        <input
                            type="text"
                            placeholder="Nombre de la versión..."
                            value={newVersionName}
                            onChange={(e) => setNewVersionName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none mb-2"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleCreate}
                                disabled={!newVersionName.trim()}
                                className="flex-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Crear
                            </button>
                            <button
                                onClick={() => {
                                    setIsCreating(false);
                                    setNewVersionName('');
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Lista de versiones */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {versions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm">No hay versiones guardadas</p>
                    </div>
                ) : (
                    versions.map(version => (
                        <div
                            key={version.id}
                            className={`group relative p-3 rounded-lg border-2 transition-all cursor-pointer ${currentVersionId === version.id
                                    ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                                }`}
                            onClick={() => onVersionSelect(version.id)}
                        >
                            {/* Nombre editable */}
                            {editingId === version.id ? (
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRename(version.id);
                                        if (e.key === 'Escape') setEditingId(null);
                                    }}
                                    onBlur={() => handleRename(version.id)}
                                    className="w-full px-2 py-1 text-sm font-bold border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`text-sm font-bold truncate ${currentVersionId === version.id ? 'text-indigo-700' : 'text-gray-800'
                                            }`}>
                                            {version.name}
                                        </h3>
                                        {version.description && (
                                            <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                                {version.description}
                                            </p>
                                        )}
                                    </div>
                                    {version.isDefault && (
                                        <span className="px-2 py-0.5 text-[9px] font-bold bg-yellow-100 text-yellow-700 rounded-full border border-yellow-300">
                                            DEFAULT
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Metadata */}
                            <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-2">
                                <span className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                    </svg>
                                    {version.placements?.length || 0} campos
                                </span>
                                <span>•</span>
                                <span>{version.pageSize} {version.orientation === 'portrait' ? '↕' : '↔'}</span>
                            </div>

                            {/* Acciones */}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startEdit(version);
                                    }}
                                    className="p-1 hover:bg-white rounded text-gray-500 hover:text-indigo-600 transition-colors"
                                    title="Renombrar"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDuplicate(version);
                                    }}
                                    className="p-1 hover:bg-white rounded text-gray-500 hover:text-green-600 transition-colors"
                                    title="Duplicar"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                    </svg>
                                </button>
                                {!version.isDefault && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDefaultVersion(version.id);
                                        }}
                                        className="p-1 hover:bg-white rounded text-gray-500 hover:text-yellow-600 transition-colors"
                                        title="Establecer como default"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                    </button>
                                )}
                                {!version.isDefault && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(version.id);
                                        }}
                                        className="p-1 hover:bg-white rounded text-gray-500 hover:text-red-600 transition-colors"
                                        title="Eliminar"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
                <p className="text-[10px] text-gray-500 text-center">
                    <span className="font-bold text-indigo-600">{versions.length}</span> versión{versions.length !== 1 ? 'es' : ''} guardada{versions.length !== 1 ? 's' : ''}
                </p>
            </div>
        </div>
    );
}
