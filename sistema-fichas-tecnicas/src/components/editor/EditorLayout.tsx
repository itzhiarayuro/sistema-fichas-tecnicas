/**
 * EditorLayout - Layout split para editor visual
 * Requirements: 3.1
 * 
 * Proporciona un layout dividido con:
 * - Panel izquierdo: Editor de secciones
 * - Panel derecho: Vista previa en tiempo real
 * - Barra de herramientas superior
 * - Soporte para resize de paneles
 */

'use client';

import { ReactNode, useState, useCallback, useRef, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { SectionErrorFallback } from '@/components/ui/SectionErrorFallback';

interface EditorLayoutProps {
  /** Contenido del panel de edición (izquierda) */
  editorContent: ReactNode;
  /** Contenido del panel de vista previa (derecha) */
  previewContent: ReactNode;
  /** Barra de herramientas opcional */
  toolbar?: ReactNode;
  /** Ancho inicial del panel de edición en porcentaje (default: 50) */
  initialEditorWidth?: number;
  /** Ancho mínimo del panel de edición en píxeles */
  minEditorWidth?: number;
  /** Ancho mínimo del panel de preview en píxeles */
  minPreviewWidth?: number;
  /** Callback cuando cambia el tamaño de los paneles */
  onResize?: (editorWidth: number) => void;
  /** Modo de visualización */
  mode?: 'split' | 'editor' | 'preview';
  /** Callback cuando cambia el modo */
  onModeChange?: (mode: 'split' | 'editor' | 'preview') => void;
}

export function EditorLayout({
  editorContent,
  previewContent,
  toolbar,
  initialEditorWidth = 50,
  minEditorWidth = 300,
  minPreviewWidth = 300,
  onResize,
  mode = 'split',
  onModeChange,
}: EditorLayoutProps) {
  const [editorWidth, setEditorWidth] = useState(initialEditorWidth);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;

      // Calcular nuevo ancho en porcentaje
      let newWidth = (mouseX / containerWidth) * 100;

      // Aplicar límites mínimos
      const minEditorPercent = (minEditorWidth / containerWidth) * 100;
      const maxEditorPercent = 100 - (minPreviewWidth / containerWidth) * 100;

      newWidth = Math.max(minEditorPercent, Math.min(maxEditorPercent, newWidth));

      setEditorWidth(newWidth);
      onResize?.(newWidth);
    },
    [isResizing, minEditorWidth, minPreviewWidth, onResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Barra de herramientas */}
      {toolbar && (
        <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
          {toolbar}
        </div>
      )}

      {/* Botones de modo de visualización */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2">
        <span className="text-sm text-gray-500 mr-2">Vista:</span>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => onModeChange?.('editor')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'editor'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            title="Solo editor"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onModeChange?.('split')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-x border-gray-200 ${
              mode === 'split'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            title="Vista dividida"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </button>
          <button
            onClick={() => onModeChange?.('preview')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'preview'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            title="Solo vista previa"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Contenedor principal con paneles */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Panel de edición */}
        {(mode === 'split' || mode === 'editor') && (
          <div
            className={`flex flex-col bg-white overflow-hidden ${
              mode === 'editor' ? 'w-full' : ''
            }`}
            style={mode === 'split' ? { width: `${editorWidth}%` } : undefined}
          >
            <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editor
              </h2>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <ErrorBoundary fallback={<SectionErrorFallback sectionName="Editor" />}>
                {editorContent}
              </ErrorBoundary>
            </div>
          </div>
        )}

        {/* Divisor redimensionable */}
        {mode === 'split' && (
          <div
            className={`flex-shrink-0 w-1 bg-gray-200 hover:bg-primary/50 cursor-col-resize transition-colors relative group ${
              isResizing ? 'bg-primary' : ''
            }`}
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 bg-gray-300 group-hover:bg-primary/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg className="w-2 h-4 text-white" fill="currentColor" viewBox="0 0 8 16">
                <circle cx="2" cy="4" r="1.5" />
                <circle cx="6" cy="4" r="1.5" />
                <circle cx="2" cy="8" r="1.5" />
                <circle cx="6" cy="8" r="1.5" />
                <circle cx="2" cy="12" r="1.5" />
                <circle cx="6" cy="12" r="1.5" />
              </svg>
            </div>
          </div>
        )}

        {/* Panel de vista previa */}
        {(mode === 'split' || mode === 'preview') && (
          <div
            className={`flex flex-col bg-gray-50 overflow-hidden ${
              mode === 'preview' ? 'w-full' : 'flex-1'
            }`}
          >
            <div className="flex-shrink-0 px-4 py-3 bg-gray-100 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Vista Previa
              </h2>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <ErrorBoundary fallback={<SectionErrorFallback sectionName="Vista Previa" />}>
                {previewContent}
              </ErrorBoundary>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
