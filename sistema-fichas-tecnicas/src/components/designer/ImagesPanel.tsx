/**
 * ImagesPanel - Panel compacto de gestión de logos
 * Diseño simplificado para encajar en el área de herramientas
 */

'use client';

import { useGlobalStore } from '@/stores/globalStore';
import { useRef } from 'react';

interface ImagesPanelProps {
    onImageSelect: (imageData: string) => void;
}

export function ImagesPanel({ onImageSelect }: ImagesPanelProps) {
    const { uploadedImages, addUploadedImage, removeUploadedImage } = useGlobalStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen es demasiado grande. Máximo 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                addUploadedImage({
                    name: file.name,
                    data: event.target.result as string
                });
            }
        };
        reader.readAsDataURL(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="p-3 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <span>🖼️</span> Logos
                </h3>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors flex items-center gap-1"
                >
                    <span>+</span> Subir
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileUpload}
                />
            </div>

            {uploadedImages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center text-gray-400">
                    <div>
                        <p className="text-xs">Sin imágenes</p>
                        <p className="text-[9px]">Sube un logo o encabezado (max 5MB)</p>
                    </div>
                </div>
            ) : (
                <div className="flex gap-2 flex-wrap overflow-auto">
                    {uploadedImages.map((img) => (
                        <div
                            key={img.id}
                            className="group relative w-12 h-12 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 hover:shadow-md transition-all cursor-pointer flex items-center justify-center"
                            onClick={() => onImageSelect(img.data)}
                            title={`Clic para agregar: ${img.name}`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={img.data}
                                alt={img.name}
                                className="max-w-full max-h-full object-contain"
                            />

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('¿Eliminar?')) removeUploadedImage(img.id);
                                }}
                                className="absolute top-0 right-0 p-0.5 bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-bl"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
