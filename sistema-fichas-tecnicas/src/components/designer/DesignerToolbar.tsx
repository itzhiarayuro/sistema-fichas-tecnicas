/**
 * DesignerToolbar - Controles principales del diseñador
 */

'use client';

import { FichaDesignVersion } from '@/types/fichaDesign';
import { useDesignStore, useUIStore, useGlobalStore } from '@/stores';
import { HTMLImporter } from './HTMLImporter';
import { generatePdfFromDesign } from '@/lib/pdf/designBasedPdfGenerator';
import { downloadPDF } from '@/lib/pdf/pdfGenerator';

interface DesignerToolbarProps {
    design: FichaDesignVersion | null | undefined;
    onSave: () => void;
}

export function DesignerToolbar({ design, onSave }: DesignerToolbarProps) {
    const { updateVersion, duplicateVersion } = useDesignStore();
    const { addToast, designerPanels, toggleDesignerPanel } = useUIStore();
    const pozos = useGlobalStore((state) => state.pozos);

    const handlePreview = async () => {
        if (!design) return;

        // Tomar el primer pozo para la vista previa
        const firstPozo = Array.from(pozos.values())[0];
        if (!firstPozo) {
            addToast({ type: 'warning', message: 'Carga al menos un pozo para ver la vista previa' });
            return;
        }

        addToast({ type: 'info', message: 'Generando vista previa...' });
        const result = await generatePdfFromDesign(design, firstPozo);

        if (result.success && result.blob) {
            downloadPDF({
                success: true,
                blob: result.blob,
                filename: `preview_${design.name}.pdf`
            });
            addToast({ type: 'success', message: 'Vista previa generada' });
        } else {
            addToast({ type: 'error', message: `Error: ${result.error}` });
        }
    };

    if (!design) return null;

    return (
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm z-30">
            <div className="flex items-center gap-4">
                <h1 className="text-lg font-bold text-primary flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Diseñador de Fichas
                </h1>
                <div className="h-6 w-px bg-gray-200 mx-2" />
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={design.name}
                        onChange={(e) => updateVersion(design.id, { name: e.target.value })}
                        className="bg-transparent border-none font-medium focus:ring-0 px-2 py-1 rounded hover:bg-gray-50 focus:bg-white focus:outline-none transition-colors"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${design.pageSize === 'A4' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => updateVersion(design.id, { pageSize: 'A4' })}
                    >
                        A4
                    </button>
                    <button
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${design.pageSize === 'Letter' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => updateVersion(design.id, { pageSize: 'Letter' })}
                    >
                        Carta
                    </button>
                </div>

                <HTMLImporter versionId={design.id} />

                <div className="h-6 w-px bg-gray-200 mx-1" />

                <button
                    onClick={() => updateVersion(design.id, { orientation: design.orientation === 'portrait' ? 'landscape' : 'portrait' })}
                    className="p-2 text-gray-500 hover:text-primary hover:bg-primary-50 rounded-lg transition-all"
                    title="Cambiar orientación"
                >
                    <svg className={`w-5 h-5 transition-transform ${design.orientation === 'landscape' ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                </button>

                <button
                    onClick={handlePreview}
                    className="p-2 text-gray-500 hover:text-primary hover:bg-primary-50 rounded-lg transition-all"
                    title="Exportar PDF de prueba"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </button>

                <div className="h-6 w-px bg-gray-200 mx-1" />

                <button
                    onClick={() => duplicateVersion(design.id, `${design.name} (Copia)`)}
                    className="p-2 text-gray-500 hover:text-primary hover:bg-primary-50 rounded-lg transition-all"
                    title="Duplicar diseño"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                </button>

                <div className="h-6 w-px bg-gray-200 mx-1" />

                <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1 gap-1">
                    <button
                        onClick={() => toggleDesignerPanel('designs')}
                        className={`p-1.5 rounded-md transition-all ${designerPanels.showDesigns ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Togle Panel de Diseños"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </button>
                    <button
                        onClick={() => toggleDesignerPanel('elements')}
                        className={`p-1.5 rounded-md transition-all ${designerPanels.showElements ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Toggle Panel de Elementos"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => toggleDesignerPanel('properties')}
                        className={`p-1.5 rounded-md transition-all ${designerPanels.showProperties ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Toggle Panel de Propiedades"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                    </button>
                </div>

                <div className="h-6 w-px bg-gray-200 mx-1" />

                <button
                    onClick={onSave}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-600 transition-all shadow-sm active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Guardar
                </button>
            </div>
        </div>
    );
}
