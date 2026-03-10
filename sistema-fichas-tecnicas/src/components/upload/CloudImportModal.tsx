'use client';

import { useState, useEffect } from 'react';
import { Pozo } from '@/types';

interface CloudImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (pozos: Pozo[]) => void;
}

export function CloudImportModal({ isOpen, onClose, onImport }: CloudImportModalProps) {
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState<Pozo[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchRecords();
        }
    }, [isOpen]);

    const fetchRecords = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/catastro/records?limit=50');
            const result = await response.json();
            if (result.success) {
                setRecords(result.data);
            } else {
                setError(result.error || 'Error al cargar registros');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleImport = () => {
        const toImport = records.filter(r => selectedIds.has(r.id));
        onImport(toImport);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <span className="text-2xl text-amber-600">☁️</span>
                            Importar desde Catastro Cloud
                        </h2>
                        <p className="text-sm text-gray-600">Selecciona las fichas que deseas importar al sistema</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-gray-600 animate-pulse">Consultando base de datos...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-center gap-3">
                            <span className="text-xl">⚠️</span>
                            {error}
                        </div>
                    ) : records.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 italic">No se encontraron registros en la nube.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-2 mb-4">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {records.length} registros encontrados
                                </span>
                                <button
                                    onClick={() => setSelectedIds(new Set(records.map(r => r.id)))}
                                    className="text-xs text-amber-600 font-bold hover:underline"
                                >
                                    Seleccionar todos
                                </button>
                            </div>
                            {records.map(record => (
                                <div
                                    key={record.id}
                                    onClick={() => toggleSelect(record.id)}
                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-4 ${selectedIds.has(record.id)
                                            ? 'border-amber-500 bg-amber-50'
                                            : 'border-gray-100 hover:border-amber-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${selectedIds.has(record.id) ? 'bg-amber-500 border-amber-500' : 'border-gray-300 bg-white'
                                        }`}>
                                        {selectedIds.has(record.id) && (
                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-900">{record.idPozo?.value}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <span>📅 {record.fecha?.value}</span>
                                            <span>📍 {record.ubicacion?.barrio?.value || 'Sin barrio'}</span>
                                        </div>
                                    </div>
                                    <div className={`text-xs px-2 py-1 rounded-full font-bold ${record.estado?.value === 'Bueno' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {record.estado?.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                        {selectedIds.size} registros seleccionados
                    </span>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={selectedIds.size === 0}
                            className="px-8 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-200 transition-all active:scale-95"
                        >
                            Importar Selección
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
