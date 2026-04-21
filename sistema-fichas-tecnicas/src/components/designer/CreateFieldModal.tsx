'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/services/firebaseClient';
import { transformFirebaseToPozo } from '@/lib/services/firebaseAdapter';
import type { AvailableField, FieldCategory } from '@/types/fichaDesign';
import { useFieldsStore } from '@/stores/fieldsStore';

interface CreateFieldModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORIES: { value: FieldCategory; label: string }[] = [
    { value: 'pozo', label: 'Pozo' },
    { value: 'tuberias', label: 'Tuberías (Todas)' },
    { value: 'entradas', label: 'Entradas' },
    { value: 'salidas', label: 'Salidas' },
    { value: 'sumideros', label: 'Sumideros' },
    { value: 'fotos', label: 'Fotos' },
    { value: 'otros', label: 'Otros' }
];

/**
 * Función auxiliar para aplanar las keys de un objeto en notación dot.
 * Excluye objetos intermedios y devuelve solo rutas a las hojas.
 */
function flattenKeys(obj: any, prefix = ""): string[] {
    let result: string[] = [];
    if (!obj || typeof obj !== 'object') return result;

    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        // Si es un objeto y NO es null ni un array
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const keys = Object.keys(value);
            if (keys.length > 0) {
                // Recursión para objetos
                result = result.concat(flattenKeys(value, newKey));
            } else {
                result.push(newKey);
            }
        } 
        // Si es un array
        else if (Array.isArray(value)) {
            if (value.length > 0) {
                // Para arrays, procesamos el primer elemento (o representativo)
                if (typeof value[0] === 'object' && value[0] !== null) {
                    result = result.concat(flattenKeys(value[0], `${newKey}[0]`));
                } else {
                    result.push(`${newKey}[0]`);
                }
            }
        } 
        // Valor primitivo (hoja)
        else {
            result.push(newKey);
        }
    }
    return result;
}

export function CreateFieldModal({ isOpen, onClose }: CreateFieldModalProps) {
    const [formData, setFormData] = useState<Omit<AvailableField, 'id'>>({
        label: '',
        fieldPath: '',
        category: 'pozo',
        isRepeatable: false,
        defaultWidth: 60,
        defaultHeight: 10
    });
    
    const [availablePaths, setAvailablePaths] = useState<string[]>([]);
    const [isLoadingPaths, setIsLoadingPaths] = useState(false);
    const addField = useFieldsStore(state => state.addField);

    /**
     * Obtiene rutas reales de Firebase según la categoría
     */
    const fetchRealPaths = useCallback(async (category: FieldCategory) => {
        setIsLoadingPaths(true);
        setAvailablePaths([]);
        
        try {
            // Intentamos obtener el documento más reciente de 'fichas'
            const q = query(collection(db, 'fichas'), limit(1));
            const querySnapshot = await getDocs(q);
            
            let dataToFlatten: any = null;

            if (!querySnapshot.empty) {
                const rawData = querySnapshot.docs[0].data();
                // Transformamos al formato Pozo usado en el PDF
                dataToFlatten = transformFirebaseToPozo(rawData);
            } else {
                // Si no hay fichas, intentamos con marcaciones
                const qMarc = query(collection(db, 'marcaciones'), limit(1));
                const snapMarc = await getDocs(qMarc);
                if (!snapMarc.empty) {
                    dataToFlatten = transformFirebaseToPozo(snapMarc.docs[0].data());
                }
            }

            if (dataToFlatten) {
                const allPaths = flattenKeys(dataToFlatten);
                
                // Filtrado inteligente por categoría
                let filtered = allPaths;
                if (category === 'pozo') {
                    filtered = allPaths.filter(p => 
                        p.startsWith('identificacion') || 
                        p.startsWith('ubicacion') || 
                        p.startsWith('componentes') ||
                        p.startsWith('observaciones')
                    );
                } else if (category === 'tuberias') {
                    filtered = allPaths.filter(p => p.startsWith('tuberias'));
                } else if (category === 'entradas') {
                    // Slots 0-7 en Pozo transformado son Entradas
                    filtered = allPaths.filter(p => {
                        const match = p.match(/tuberias\.tuberias\[(\d+)\]/);
                        return match && parseInt(match[1]) < 8;
                    });
                } else if (category === 'salidas') {
                    // Slots 8-15 en Pozo transformado son Salidas
                    filtered = allPaths.filter(p => {
                        const match = p.match(/tuberias\.tuberias\[(\d+)\]/);
                        return match && parseInt(match[1]) >= 8;
                    });
                } else if (category === 'sumideros') {
                    filtered = allPaths.filter(p => p.startsWith('sumideros'));
                } else if (category === 'fotos') {
                    filtered = allPaths.filter(p => p.startsWith('fotos'));
                }

                // Limpiar rutas (quitar .value para que el listado sea más legible si se prefiere)
                // Pero el usuario pidió dot notation completo ej: .value
                // Así que mantenemos todo y ordenamos
                setAvailablePaths(Array.from(new Set(filtered)).sort());
            }
        } catch (error) {
            console.error('Error fetching real paths:', error);
        } finally {
            setIsLoadingPaths(false);
        }
    }, []);

    // Actualizar rutas cuando cambia la categoría o abre el modal
    useEffect(() => {
        if (isOpen) {
            fetchRealPaths(formData.category);
        }
    }, [isOpen, formData.category, fetchRealPaths]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.fieldPath) return;

        const success = await addField(formData);
        if (success) {
            onClose();
            setFormData({
                label: '',
                fieldPath: '',
                category: 'pozo',
                isRepeatable: false,
                defaultWidth: 60,
                defaultHeight: 10
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">
                {/* Header */}
                <div className="px-6 py-4 bg-primary text-white flex items-center justify-between shadow-md">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span>🛠️</span> Crear Nuevo Campo
                        </h2>
                        <p className="text-[10px] text-white/70">Asistente de rutas dinámicas</p>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Category */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5 uppercase tracking-wider text-[11px]">
                            1. Categoría del Dato
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => {
                                setFormData({ ...formData, category: e.target.value as FieldCategory, fieldPath: '' });
                            }}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-gray-50/50"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Field Path (Dynamic Selector) */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5 uppercase tracking-wider text-[11px] flex justify-between">
                            2. Ruta en Firebase (Pozo)
                            {isLoadingPaths && <span className="text-primary animate-pulse normal-case">Cargando...</span>}
                        </label>
                        
                        <div className="relative">
                            <select
                                required
                                value={formData.fieldPath}
                                onChange={(e) => setFormData({ ...formData, fieldPath: e.target.value })}
                                className={`w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-xs ${isLoadingPaths ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={isLoadingPaths}
                            >
                                <option value="">--- Seleccione una ruta real ---</option>
                                {availablePaths.map(path => (
                                    <option key={path} value={path}>{path}</option>
                                ))}
                            </select>
                            
                            {!isLoadingPaths && availablePaths.length === 0 && (
                                <p className="text-[10px] text-red-400 mt-1 italic">
                                    No se encontraron rutas para esta categoría.
                                </p>
                            )}
                        </div>
                        <p className="text-[9px] text-gray-400 mt-1.5 italic leading-tight">
                            * Solo se muestran rutas validadas contra documentos reales de Firebase.
                        </p>
                    </div>

                    {/* Label */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5 uppercase tracking-wider text-[11px]">
                            3. Nombre para el PDF (Label)
                        </label>
                        <input
                            required
                            type="text"
                            placeholder="Ej: Material de la Tapa"
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                    </div>

                    {/* Repeatable & Dimensions */}
                    <div className="grid grid-cols-1 gap-4 pt-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-600">¿Permite múltiples valores?</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isRepeatable}
                                    onChange={(e) => setFormData({ ...formData, isRepeatable: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Ancho (mm)</label>
                                <input
                                    type="number"
                                    value={formData.defaultWidth}
                                    onChange={(e) => setFormData({ ...formData, defaultWidth: Number(e.target.value) })}
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded-md outline-none text-xs text-center"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Alto (mm)</label>
                                <input
                                    type="number"
                                    value={formData.defaultHeight}
                                    onChange={(e) => setFormData({ ...formData, defaultHeight: Number(e.target.value) })}
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded-md outline-none text-xs text-center"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={!formData.fieldPath || isLoadingPaths}
                            type="submit"
                            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary-dark shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                        >
                            🚀 Crear Campo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
