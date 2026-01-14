/**
 * ImageEditor - Editor de imágenes con resize y drag & drop
 * Requirements: 3.3, 3.4, 12.1, 12.2
 * 
 * Proporciona:
 * - Visualización de imágenes con resize
 * - Drag & drop para reordenar
 * - Controles de tamaño predefinidos
 * - Eliminación con confirmación doble (usando ConfirmDialog global)
 * - Soporte para múltiples imágenes
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useConfirmDialog } from '@/components/ui';
import { blobStore } from '@/lib/storage/blobStore';
import type { FotoInfo } from '@/types/pozo';
import type { ImageSize } from '@/types/ficha';

interface ImageEditorProps {
  /** Información de la imagen */
  image: FotoInfo;
  /** Tamaño actual de la imagen */
  size?: ImageSize;
  /** Si la imagen es editable */
  editable?: boolean;
  /** Si la imagen está seleccionada */
  selected?: boolean;
  /** Si la imagen está siendo arrastrada */
  isDragging?: boolean;
  /** Callback cuando cambia el tamaño */
  onResize?: (size: ImageSize) => void;
  /** Callback cuando se elimina la imagen */
  onRemove?: () => void;
  /** Callback cuando se selecciona la imagen */
  onSelect?: () => void;
  /** Props para drag handle */
  dragHandleProps?: Record<string, unknown>;
  /** Clase CSS adicional */
  className?: string;
  /** Tamaños predefinidos disponibles */
  presetSizes?: ImageSize[];
}

// Tamaños predefinidos por defecto
const DEFAULT_PRESET_SIZES: ImageSize[] = [
  { width: 100, height: 75 },   // Pequeño
  { width: 150, height: 112 },  // Mediano
  { width: 200, height: 150 },  // Grande
  { width: 300, height: 225 },  // Extra grande
];

const PRESET_LABELS = ['S', 'M', 'L', 'XL'];

// Tamaño mínimo y máximo para resize manual
const MIN_SIZE = 50;
const MAX_SIZE = 500;

export function ImageEditor({
  image,
  size = { width: 150, height: 112 },
  editable = true,
  selected = false,
  isDragging = false,
  onResize,
  onRemove,
  onSelect,
  dragHandleProps,
  className = '',
  presetSizes = DEFAULT_PRESET_SIZES,
}: ImageEditorProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [localSize, setLocalSize] = useState(size);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startSizeRef = useRef({ width: 0, height: 0 });

  // Hook para confirmación de eliminación
  const { confirmDeleteImage } = useConfirmDialog();

  // Sync local size with prop
  useEffect(() => {
    if (!isResizing) {
      setLocalSize(size);
    }
  }, [size, isResizing]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startSizeRef.current = { ...localSize };
  }, [localSize]);

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;

      // Mantener aspect ratio
      const aspectRatio = startSizeRef.current.width / startSizeRef.current.height;
      const delta = Math.max(deltaX, deltaY / aspectRatio);

      const newWidth = Math.min(MAX_SIZE, Math.max(MIN_SIZE, startSizeRef.current.width + delta));
      const newHeight = Math.round(newWidth / aspectRatio);

      setLocalSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      onResize?.(localSize);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, localSize, onResize]);

  // Handle preset size selection
  const handlePresetSize = useCallback((presetSize: ImageSize) => {
    setLocalSize(presetSize);
    onResize?.(presetSize);
  }, [onResize]);

  // Handle remove with global confirmation dialog (double confirmation)
  const handleRemoveClick = useCallback(async () => {
    const confirmed = await confirmDeleteImage(image.filename);
    if (confirmed) {
      onRemove?.();
    }
  }, [confirmDeleteImage, image.filename, onRemove]);

  // Get current preset index
  const getCurrentPresetIndex = () => {
    return presetSizes.findIndex(
      (ps) => Math.abs(ps.width - localSize.width) < 10 && Math.abs(ps.height - localSize.height) < 10
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block group ${isDragging ? 'opacity-50' : ''} ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        setShowControls(false);
      }}
      onClick={onSelect}
    >
      {/* Image container */}
      <div
        className={`relative overflow-hidden rounded-lg border-2 transition-all ${selected
            ? 'border-primary ring-2 ring-primary/30'
            : 'border-transparent hover:border-gray-300'
          } ${isDragging ? 'shadow-lg' : ''}`}
        style={{ width: localSize.width, height: localSize.height }}
      >
        {/* Image */}
        {image.blobId ? (
          <img
            src={blobStore.getUrl(image.blobId)}
            alt={image.descripcion || image.filename}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">
          {image.subcategoria || image.categoria}
        </div>

        {/* Drag handle overlay */}
        {editable && showControls && (
          <div
            {...dragHandleProps}
            className="absolute inset-0 bg-black/0 hover:bg-black/10 cursor-grab active:cursor-grabbing transition-colors flex items-center justify-center"
          >
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
              </svg>
            </div>
          </div>
        )}

        {/* Resize handle */}
        {editable && showControls && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 bg-primary cursor-se-resize rounded-tl"
            onMouseDown={handleResizeStart}
          >
            <svg className="w-full h-full text-white p-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" />
              <path d="M10 5a1 1 0 011 1v8a1 1 0 11-2 0V6a1 1 0 011-1z" />
            </svg>
          </div>
        )}
      </div>

      {/* Controls toolbar */}
      {editable && showControls && (
        <div className="absolute -bottom-10 left-0 right-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Preset size buttons */}
          <div className="flex bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            {presetSizes.map((presetSize, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePresetSize(presetSize);
                }}
                className={`px-2 py-1 text-xs font-medium transition-colors ${getCurrentPresetIndex() === index
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                title={`${presetSize.width}x${presetSize.height}`}
              >
                {PRESET_LABELS[index]}
              </button>
            ))}
          </div>

          {/* Remove button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveClick();
            }}
            className="p-1.5 bg-white rounded-lg shadow-lg border border-gray-200 text-red-500 hover:bg-red-50 transition-colors"
            title="Eliminar imagen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Image info tooltip */}
      {showControls && (
        <div className="absolute -top-8 left-0 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap">
          {image.filename}
        </div>
      )}
    </div>
  );
}
