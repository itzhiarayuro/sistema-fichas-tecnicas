/**
 * DesignToolbar - Barra de herramientas profesional del diseñador
 * Incluye zoom, snap-to-grid, orientación, tamaño de página, y preview PDF
 */

'use client';

import type { FichaDesignVersion } from '@/types/fichaDesign';
import { useDesignStore } from '@/stores/designStore';

interface DesignToolbarProps {
    version: FichaDesignVersion | null;
    zoom: number;
    onZoomChange: (zoom: number) => void;
    snapToGrid: boolean;
    onSnapToGridChange: (snap: boolean) => void;
    gridSize: number;
    onGridSizeChange: (size: number) => void;
    onPreview: () => void;
}

export function DesignToolbar({
    version,
    zoom,
    onZoomChange,
    snapToGrid,
    onSnapToGridChange,
    gridSize,
    onGridSizeChange,
    onPreview
}: DesignToolbarProps) {
    const { updateVersion, duplicateVersion, undo, redo, past, future, currentVersionId } = useDesignStore();

    if (!version) return null;

    const canUndo = currentVersionId ? (past[currentVersionId]?.length || 0) > 0 : false;
    const canRedo = currentVersionId ? (future[currentVersionId]?.length || 0) > 0 : false;

    const handleDuplicate = () => {
        duplicateVersion(version.id, `${version.name} (copia)`);
    };

    const handleExportHTML = () => {
        // Generar HTML simple
        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${version.name}</title>
    <style>
        body { margin: 0; padding: 0; background: #f0f0f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; }
        .page {
            position: relative;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .element { position: absolute; box-sizing: border-box; }
        @media print {
            body { background: none; display: block; }
            .page { box-shadow: none; margin: 0; page-break-after: always; }
        }
    </style>
</head>
<body>
    <div class="page" style="width: ${version.pageSize === 'A4' ? '210mm' : '215.9mm'}; height: ${version.pageSize === 'A4' ? '297mm' : '279.4mm'};">
        ${version.shapes?.map(s => {
            if (s.isVisible === false) return '';
            const style = [
                `left: ${s.x}mm`, `top: ${s.y}mm`, `width: ${s.width}mm`, `height: ${s.height}mm`,
                `z-index: ${s.zIndex}`, `opacity: ${s.opacity ?? 1}`,
                s.type === 'rectangle' || s.type === 'circle' ? `background-color: ${s.fillColor || 'transparent'}` : '',
                (s.type === 'rectangle' || s.type === 'circle') && s.strokeColor ? `border: ${s.strokeWidth}px solid ${s.strokeColor}` : '',
                s.borderRadius ? `border-radius: ${s.borderRadius}px` : (s.type === 'circle' ? 'border-radius: 50%' : ''),
                s.type === 'text' ? `font-family: ${s.fontFamily || 'Arial'}; font-size: ${s.fontSize}pt; color: ${s.color || '#000'}; text-align: ${s.textAlign || 'left'}; display: flex; align-items: center;` : ''
            ].join(';');

            let content = '';
            if (s.type === 'text') content = s.content || '';
            if (s.type === 'image' && s.imageUrl) content = `<img src="${s.imageUrl}" style="width:100%; height:100%; object-fit:contain;">`;
            if (s.type === 'line') content = `<div style="width:100%; height:${s.strokeWidth}px; background:${s.strokeColor || '#000'};"></div>`;

            return `<div class="element" style="${style}">${content}</div>`;
        }).join('')}
        
        ${version.placements.map(p => {
            if (p.isVisible === false) return '';
            const style = [
                `left: ${p.x}mm`, `top: ${p.y}mm`, `width: ${p.width}mm`, `height: ${p.height}mm`,
                `z-index: ${p.zIndex}`,
                `font-family: ${p.fontFamily || 'Arial'}`, `font-size: ${p.fontSize}pt`,
                `color: ${p.color || '#000'}`, `text-align: ${p.textAlign || 'left'}`,
                p.backgroundColor ? `background-color: ${p.backgroundColor}` : '',
                p.borderRadius ? `border-radius: ${p.borderRadius}px` : '',
                p.padding ? `padding: ${p.padding}px` : '',
                'display: flex; flex-direction: column; justify-content: center;'
            ].join(';');
            return `<div class="element" style="${style}">{{${p.fieldId}}}</div>`;
        }).join('')}
    </div>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${version.name.replace(/\s+/g, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm z-30">
            {/* Left: Título y nombre */}
            <div className="flex items-center gap-4">
                <h1 className="text-lg font-bold text-primary flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Diseñador Visual
                </h1>
                <div className="h-6 w-px bg-gray-200" />
                <div className="text-sm">
                    <span className="font-semibold text-gray-700">{version.name}</span>
                    <span className="text-gray-400 ml-2">({version.placements.length} campos)</span>
                </div>
            </div>

            {/* Center: Controles */}
            <div className="flex items-center gap-3">
                {/* Undo/Redo */}
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
                    <button
                        onClick={undo}
                        disabled={!canUndo}
                        className={`p-1.5 rounded transition-colors ${canUndo ? 'text-gray-600 hover:text-primary hover:bg-white shadow-sm' : 'text-gray-300 cursor-not-allowed'}`}
                        title="Deshacer (Ctrl+Z)"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                    </button>
                    <button
                        onClick={redo}
                        disabled={!canRedo}
                        className={`p-1.5 rounded transition-colors ${canRedo ? 'text-gray-600 hover:text-primary hover:bg-white shadow-sm' : 'text-gray-300 cursor-not-allowed'}`}
                        title="Rehacer (Ctrl+Y)"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                        </svg>
                    </button>
                </div>

                <div className="h-6 w-px bg-gray-200" />

                {/* Zoom */}
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1">
                    <button
                        onClick={() => onZoomChange(Math.max(0.25, zoom - 0.25))}
                        className="p-1 hover:bg-white rounded text-gray-600 hover:text-primary transition-colors"
                        title="Zoom out"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                        </svg>
                    </button>
                    <span className="text-xs font-mono font-bold text-gray-700 w-12 text-center">
                        {Math.round(zoom * 100)}%
                    </span>
                    <button
                        onClick={() => onZoomChange(Math.min(2, zoom + 0.25))}
                        className="p-1 hover:bg-white rounded text-gray-600 hover:text-primary transition-colors"
                        title="Zoom in"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                    </button>
                </div>

                <div className="h-6 w-px bg-gray-200" />

                {/* Snap to Grid */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onSnapToGridChange(!snapToGrid)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${snapToGrid
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                            }`}
                        title="Snap to grid"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        Grid
                    </button>
                    {snapToGrid && (
                        <select
                            value={gridSize}
                            onChange={(e) => onGridSizeChange(parseInt(e.target.value))}
                            className="px-2 py-1 text-xs border border-gray-200 rounded bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        >
                            <option value="1">1mm</option>
                            <option value="5">5mm</option>
                            <option value="10">10mm</option>
                        </select>
                    )}
                </div>

                <div className="h-6 w-px bg-gray-200" />

                {/* Tamaño de página */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${version.pageSize === 'A4'
                            ? 'bg-white shadow-sm text-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                        onClick={() => updateVersion(version.id, { pageSize: 'A4' })}
                    >
                        A4
                    </button>
                    <button
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${version.pageSize === 'Letter'
                            ? 'bg-white shadow-sm text-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                        onClick={() => updateVersion(version.id, { pageSize: 'Letter' })}
                    >
                        Carta
                    </button>
                </div>

                {/* Orientación */}
                <button
                    onClick={() =>
                        updateVersion(version.id, {
                            orientation: version.orientation === 'portrait' ? 'landscape' : 'portrait'
                        })
                    }
                    className="p-2 text-gray-500 hover:text-primary hover:bg-primary-50 rounded-lg transition-all"
                    title="Cambiar orientación"
                >
                    <svg
                        className={`w-5 h-5 transition-transform ${version.orientation === 'landscape' ? 'rotate-90' : ''
                            }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                </button>

                <div className="h-6 w-px bg-gray-200" />

                {/* Duplicar */}
                <button
                    onClick={handleDuplicate}
                    className="p-2 text-gray-500 hover:text-primary hover:bg-primary-50 rounded-lg transition-all"
                    title="Duplicar versión"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                        />
                    </svg>
                </button>

                {/* Preview PDF */}
                <button
                    onClick={onPreview}
                    className="flex items-center gap-2 bg-white border border-primary text-primary px-3 py-2 rounded-lg font-medium hover:bg-primary-50 transition-all active:scale-95 text-xs"
                    title="Preview con datos reales"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                </button>

                {/* Export PDF */}
                <button
                    onClick={async () => {
                        if (!version) return;
                        try {
                            // En el toolbar, necesitamos un pozo para exportar. 
                            // Si no hay pozo seleccionado en el global store, usamos el primero disponible.
                            const { useGlobalStore } = await import('@/stores');
                            const pozos = useGlobalStore.getState().pozos;
                            const pozo = Array.from(pozos.values())[0];

                            if (!pozo) {
                                alert('No hay pozos cargados para generar la exportación.');
                                return;
                            }

                            const { generatePdfFromDesign } = await import('@/lib/pdf/designBasedPdfGenerator');
                            const result = await generatePdfFromDesign(version, pozo);
                            if (result.success && result.blob) {
                                const url = URL.createObjectURL(result.blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `${version.name.replace(/\s+/g, '_')}.pdf`;
                                link.click();
                                URL.revokeObjectURL(url);
                            } else {
                                alert('Error al generar PDF: ' + result.error);
                            }
                        } catch (e) {
                            console.error(e);
                            alert('Error inesperado al generar PDF');
                        }
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-2 rounded-lg font-medium hover:shadow-lg transition-all active:scale-95 text-xs"
                    title="Exportar PDF"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDF
                </button>

                {/* Export HTML */}
                <button
                    onClick={handleExportHTML}
                    className="flex items-center gap-2 bg-gradient-to-r from-primary to-purple-600 text-white px-3 py-2 rounded-lg font-medium hover:shadow-lg transition-all active:scale-95 text-xs"
                    title="Exportar HTML"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    HTML
                </button>
            </div>
        </div>
    );
}
