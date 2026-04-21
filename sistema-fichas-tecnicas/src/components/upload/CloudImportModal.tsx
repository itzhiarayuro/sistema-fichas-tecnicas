'use client';

import { useState, useEffect } from 'react';
import { Pozo } from '@/types';
import { collection, query, orderBy, limit as firestoreLimit, getDocs, where, startAfter } from 'firebase/firestore';
import { db } from '@/lib/services/firebaseClient';
import { transformFirebaseToPozo } from '@/lib/services/firebaseAdapter';

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
    const [activeTab, setActiveTab] = useState<'fichas' | 'marcaciones'>('fichas');

    // --- FILTERS STATE ---
    const [filterYear, setFilterYear] = useState<string>('');
    const [filterSystem, setFilterSystem] = useState<string>('');
    const [filterMunicipio, setFilterMunicipio] = useState<string>('');
    const [filterState, setFilterState] = useState<string>('');
    const [availableOptions, setAvailableOptions] = useState<{ systems: string[], municipios: string[] }>({ systems: [], municipios: [] });

    // --- PAGINATION STATE ---
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const [counts, setCounts] = useState({ fichas: 0, marcaciones: 0 });
    const [isFetchingAll, setIsFetchingAll] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setRecords([]);
            setLastDoc(null);
            setHasMore(true);
            fetchRecords(true);
        }
    }, [isOpen, activeTab, filterYear, filterSystem, filterMunicipio, filterState]);

    const fetchRecords = async (isInitial = true) => {
        setLoading(true);
        setError(null);
        try {
            let constraints: any[] = [];

            // Apply filters
            if (filterState) {
                constraints.push(where('estadoPozo', '==', filterState));
            }
            if (activeTab === 'fichas' && filterSystem) {
                constraints.push(where('sistema', '==', filterSystem));
            }
            if (filterMunicipio) {
                constraints.push(where('municipio', '==', filterMunicipio));
            }

            // Pagination
            if (!isInitial && lastDoc) {
                constraints.push(startAfter(lastDoc));
            }

            // Apply a higher limit for "Load All" or chunked loading
            const currentLimit = 2000;
            constraints.push(firestoreLimit(currentLimit));

            const q = query(
                collection(db, activeTab),
                ...constraints
            );

            const snapshot = await getDocs(q);
            const newDocs = snapshot.docs.map(doc => {
                const data = doc.data();
                return transformFirebaseToPozo({
                    ...data,
                    id: doc.id,
                    isMarcacion: activeTab === 'marcaciones'
                });
            });

            // ✅ Ordenar en memoria después de recibir los datos (Evita error de índice compuesto)
            newDocs.sort((a, b) => (b.metadata?.updatedAt || 0) - (a.metadata?.updatedAt || 0));

            // Filter by year client-side
            let filteredDocs = newDocs;
            if (filterYear) {
                filteredDocs = newDocs.filter(d => {
                    const dateVal = d.fecha?.value || '';
                    return dateVal.startsWith(filterYear);
                });
            }

            if (isInitial) {
                setRecords(filteredDocs);
            } else {
                setRecords(prev => {
                    const combined = [...prev, ...filteredDocs];
                    // Mantener ordenado globalmente al añadir más
                    combined.sort((a, b) => (b.metadata?.updatedAt || 0) - (a.metadata?.updatedAt || 0));
                    return combined;
                });
            }

            const lastVisible = snapshot.docs[snapshot.docs.length - 1];
            setLastDoc(lastVisible);
            setHasMore(snapshot.docs.length === currentLimit);

            // Update counts
            setCounts(prev => ({ ...prev, [activeTab]: isInitial ? filteredDocs.length : prev[activeTab] + filteredDocs.length }));

            // Update filters
            if (isInitial && filteredDocs.length > 0) {
                const sys = new Set<string>();
                const mun = new Set<string>();
                filteredDocs.forEach(d => {
                    if (d.sistema?.value) sys.add(d.sistema.value);
                    if (d.municipio?.value) mun.add(d.municipio.value);
                });
                setAvailableOptions(prev => ({
                    systems: Array.from(sys).sort(),
                    municipios: Array.from(mun).sort()
                }));
            }

            return { hasMore: snapshot.docs.length === currentLimit, lastDoc: lastVisible };

        } catch (err: any) {
            console.error(err);
            if (err.message?.includes('requires an index')) {
                setError('⚠️ Falta un índice en Firestore para esta consulta. El sistema lo está creando, por favor espera unos minutos. (Error: ' + err.message + ')');
            } else {
                setError('Error de conexión con Firebase: ' + err.message);
            }
            return { hasMore: false, lastDoc: null };
        } finally {
            setLoading(false);
        }
    };

    const fetchAllRecords = async () => {
        setIsFetchingAll(true);
        let more = hasMore;
        while (more) {
            const result = await fetchRecords(false);
            more = result.hasMore;
            // Safety break to avoid infinite loops
            if (records.length > 10000) break;
        }
        setIsFetchingAll(false);
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
        setSelectedIds(new Set()); // Reset selection after import
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
                        <p className="text-sm text-gray-600">Selecciona los registros que deseas importar</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs Selection */}
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('fichas')}
                        className={`flex-1 py-3 text-sm font-bold transition-all ${activeTab === 'fichas' ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/30' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        FICHAS TÉCNICAS
                    </button>
                    <button
                        onClick={() => setActiveTab('marcaciones')}
                        className={`flex-1 py-3 text-sm font-bold transition-all ${activeTab === 'marcaciones' ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/30' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        MARCACIONES
                    </button>
                </div>

                {/* Filters Section */}
                <div className="bg-gray-50/80 border-b border-gray-100 p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Año</label>
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            className="text-sm bg-white border border-gray-200 rounded-lg p-2 focus:ring-2 ring-amber-500/20 outline-none"
                        >
                            <option value="">Todos</option>
                            <option value="2026">2026</option>
                            <option value="2025">2025</option>
                            <option value="2024">2024</option>
                            <option value="2023">2023</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Estado</label>
                        <select
                            value={filterState}
                            onChange={(e) => setFilterState(e.target.value)}
                            className="text-sm bg-white border border-gray-200 rounded-lg p-2 focus:ring-2 ring-amber-500/20 outline-none"
                        >
                            <option value="">Todos</option>
                            <option value="BUENO">Bueno</option>
                            <option value="REGULAR">Regular</option>
                            <option value="MALO">Malo</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Municipio</label>
                        <select
                            value={filterMunicipio}
                            onChange={(e) => setFilterMunicipio(e.target.value)}
                            className="text-sm bg-white border border-gray-200 rounded-lg p-2 focus:ring-2 ring-amber-500/20 outline-none"
                        >
                            <option value="">Todos</option>
                            {availableOptions.municipios.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Sistema</label>
                        <select
                            value={filterSystem}
                            onChange={(e) => setFilterSystem(e.target.value)}
                            className="text-sm bg-white border border-gray-200 rounded-lg p-2 focus:ring-2 ring-amber-500/20 outline-none"
                        >
                            <option value="">Todos</option>
                            {availableOptions.systems.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-gray-600 animate-pulse font-medium">Consultando {activeTab}...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex flex-col gap-3">
                            <div className="flex items-center gap-3 font-bold">
                                <span className="text-xl">⚠️</span>
                                Error de Firebase
                            </div>
                            <p className="text-xs leading-relaxed opacity-80">{error}</p>
                            <button 
                                onClick={() => fetchRecords(true)}
                                className="mt-2 text-red-600 font-bold hover:underline self-start"
                            >
                                Reintentar consulta
                            </button>
                        </div>
                    ) : records.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 italic">No se encontraron {activeTab} en la nube.</p>
                            <button
                                onClick={() => fetchRecords(true)}
                                className="mt-4 text-amber-600 hover:underline text-sm font-bold"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-2 mb-4">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {records.length} {activeTab} encontrados
                                </span>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setSelectedIds(new Set())}
                                        className="text-xs text-gray-500 hover:underline"
                                    >
                                        Limpiar
                                    </button>
                                    <button
                                        onClick={() => setSelectedIds(new Set(records.map(r => r.id)))}
                                        className="text-xs text-amber-600 font-bold hover:underline"
                                    >
                                        Seleccionar todos
                                    </button>
                                </div>
                            </div>
                            <div className="grid gap-3">
                                {records.map(record => (
                                    <div
                                        key={record.id}
                                        onClick={() => toggleSelect(record.id)}
                                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-4 bg-white ${selectedIds.has(record.id)
                                            ? 'border-amber-500 ring-4 ring-amber-500/10 shadow-md'
                                            : 'border-gray-100 hover:border-amber-200 hover:shadow-sm'
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
                                            <div className="font-bold text-gray-900 leading-tight">
                                                {record.idPozo?.value || 'SIN CÓDIGO'}
                                                {activeTab === 'marcaciones' && (
                                                    <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase align-middle">
                                                        Marcación
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                                <span>📅 {record.fecha?.value}</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                <span>📍 {record.municipio?.value || record.ubicacion?.municipio?.value || 'Sin municipio'}</span>
                                            </div>
                                        </div>
                                        <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${record.estado?.value === 'Bueno' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {record.estado?.value || 'General'}
                                        </div>
                                    </div>
                                ))}
                            </div>

                             {/* Load More Button */}
                            {hasMore && (
                                <div className="flex flex-col items-center gap-3 pt-4">
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => fetchRecords(false)}
                                            disabled={loading || isFetchingAll}
                                            className="text-sm font-bold text-amber-600 hover:text-amber-700 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {loading && !isFetchingAll ? (
                                                <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <span>Ver más (2000+)</span>
                                            )}
                                        </button>

                                        <button
                                            onClick={fetchAllRecords}
                                            disabled={loading || isFetchingAll}
                                            className="text-sm font-bold text-orange-600 hover:text-orange-700 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isFetchingAll ? (
                                                <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <span>🚀 Cargar TODA la Nube</span>
                                            )}
                                        </button>
                                    </div>
                                    {isFetchingAll && (
                                        <p className="text-[10px] text-gray-400 animate-pulse">
                                            Trayendo todos los registros... esto puede tardar unos segundos.
                                        </p>
                                    )}
                                </div>
                            )}
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
