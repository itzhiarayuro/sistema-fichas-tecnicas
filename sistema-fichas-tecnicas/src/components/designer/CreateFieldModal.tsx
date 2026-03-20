'use client';

import { useState } from 'react';
import type { AvailableField, FieldCategory } from '@/types/fichaDesign';
import { useFieldsStore } from '@/stores/fieldsStore';

interface CreateFieldModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORIES: { value: FieldCategory; label: string }[] = [
    { value: 'pozo', label: 'Pozo' },
    { value: 'tuberias', label: 'Tuberías' },
    { value: 'entradas', label: 'Entradas' },
    { value: 'salidas', label: 'Salidas' },
    { value: 'sumideros', label: 'Sumideros' },
    { value: 'fotos', label: 'Fotos' },
    { value: 'otros', label: 'Otros' }
];

export function CreateFieldModal({ isOpen, onClose }: CreateFieldModalProps) {
    const [formData, setFormData] = useState<Omit<AvailableField, 'id'>>({
        label: '',
        fieldPath: '',
        category: 'pozo',
        isRepeatable: false,
        defaultWidth: 60,
        defaultHeight: 10
    });
    const addField = useFieldsStore(state => state.addField);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await addField(formData);
        if (success) {
            onClose();
            // Reset form
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 bg-primary text-white flex items-center justify-between">
                    <h2 className="text-xl font-bold">🛠️ Crear Nuevo Campo</h2>
                    <button onClick={onClose} className="hover:text-white/80 transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Label */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Visible (Label)</label>
                        <input
                            required
                            type="text"
                            placeholder="Ej: Municipio, Barrio, etc."
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>

                    {/* Field Path */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ruta del Campo (Path en Firebase)</label>
                        <input
                            required
                            type="text"
                            placeholder="Ej: identificacion.municipio.value"
                            value={formData.fieldPath}
                            onChange={(e) => setFormData({ ...formData, fieldPath: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-mono text-sm"
                        />
                        <p className="text-[10px] text-gray-400 mt-1 italic">Ruta donde se guarda el dato en el objeto Pozo</p>
                    </div>

                    {/* Category */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as FieldCategory })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer pb-2">
                                <input
                                    type="checkbox"
                                    checked={formData.isRepeatable}
                                    onChange={(e) => setFormData({ ...formData, isRepeatable: e.target.checked })}
                                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                                />
                                <span className="text-sm font-medium text-gray-700">¿Es repetible?</span>
                            </label>
                        </div>
                    </div>

                    {/* Dimensions */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Ancho inicial (mm)</label>
                            <input
                                type="number"
                                value={formData.defaultWidth}
                                onChange={(e) => setFormData({ ...formData, defaultWidth: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-center"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Alto inicial (mm)</label>
                            <input
                                type="number"
                                value={formData.defaultHeight}
                                onChange={(e) => setFormData({ ...formData, defaultHeight: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-center"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all font-bold"
                        >
                            🚀 Crear Campo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
