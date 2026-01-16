/**
 * HTMLImporter - Importador de plantillas desde archivos HTML
 */

'use client';

import { useState } from 'react';
import { useDesignStore } from '@/stores/designStore';

export function HTMLImporter({ versionId }: { versionId: string }) {
    const { addPlacement, updateVersion } = useDesignStore();
    const [isImporting, setIsImporting] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            const htmlContent = event.target?.result as string;

            // Lógica de extracción (Simulada para esta fase)
            // En una versión real, esto buscaría {{etiquetas}} 
            const placeholders = htmlContent.match(/\{\{([^}]+)\}\}/g) || [];

            placeholders.forEach((tag, index) => {
                const fieldId = tag.replace(/[{}]/g, '').trim();

                addPlacement(versionId, {
                    fieldId,
                    x: 20,
                    y: 20 + (index * 15),
                    width: 80,
                    height: 10,
                    zIndex: 1,
                    showLabel: true,
                    fontSize: 10,
                    fontFamily: 'Arial',
                    color: '#000000',
                    textAlign: 'left'
                });
            });

            updateVersion(versionId, {
                description: `Importado de: ${file.name}`
            });

            setIsImporting(false);
        };

        reader.readAsText(file);
    };

    return (
        <div className="relative">
            <input
                type="file"
                accept=".html"
                onChange={handleFileUpload}
                className="hidden"
                id="html-import-input"
            />
            <label
                htmlFor="html-import-input"
                className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${isImporting
                    ? 'bg-gray-100 text-gray-400 border-gray-200'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary shadow-sm'
                    }`}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {isImporting ? 'Importando...' : 'Importar HTML'}
            </label>
        </div>
    );
}
