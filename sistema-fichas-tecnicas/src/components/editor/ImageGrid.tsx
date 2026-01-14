/**
 * ImageGrid - Grid de imágenes con drag & drop para reordenar
 * Requirements: 3.3, 3.4
 * 
 * Proporciona:
 * - Grid responsivo de imágenes
 * - Drag & drop para reordenar
 * - Selección múltiple
 * - Agregar nuevas imágenes
 */

'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ImageEditor } from './ImageEditor';
import type { FotoInfo } from '@/types/pozo';
import type { ImageSize } from '@/types/ficha';

interface ImageGridProps {
  /** Lista de imágenes */
  images: FotoInfo[];
  /** Tamaños de las imágenes por ID */
  imageSizes?: Map<string, ImageSize>;
  /** Si el grid es editable */
  editable?: boolean;
  /** Callback cuando se reordenan las imágenes */
  onReorder?: (images: FotoInfo[]) => void;
  /** Callback cuando se elimina una imagen */
  onRemove?: (imageId: string) => void;
  /** Callback cuando se cambia el tamaño de una imagen */
  onResize?: (imageId: string, size: ImageSize) => void;
  /** Callback para agregar imágenes */
  onAdd?: () => void;
  /** Clase CSS adicional */
  className?: string;
  /** Título del grid */
  title?: string;
  /** Mensaje cuando no hay imágenes */
  emptyMessage?: string;
}

interface SortableImageProps {
  image: FotoInfo;
  size?: ImageSize;
  editable: boolean;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onResize: (size: ImageSize) => void;
}

function SortableImage({
  image,
  size,
  editable,
  selected,
  onSelect,
  onRemove,
  onResize,
}: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ImageEditor
        image={image}
        size={size}
        editable={editable}
        selected={selected}
        isDragging={isDragging}
        onSelect={onSelect}
        onRemove={onRemove}
        onResize={onResize}
        dragHandleProps={listeners}
      />
    </div>
  );
}

export function ImageGrid({
  images,
  imageSizes = new Map(),
  editable = true,
  onReorder,
  onRemove,
  onResize,
  onAdd,
  className = '',
  title,
  emptyMessage = 'No hay imágenes',
}: ImageGridProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id);
      const newIndex = images.findIndex((img) => img.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newImages = arrayMove(images, oldIndex, newIndex);
        onReorder?.(newImages);
      }
    }
  }, [images, onReorder]);

  const handleSelect = useCallback((imageId: string) => {
    setSelectedId((prev) => (prev === imageId ? null : imageId));
  }, []);

  const handleRemove = useCallback((imageId: string) => {
    if (selectedId === imageId) {
      setSelectedId(null);
    }
    onRemove?.(imageId);
  }, [selectedId, onRemove]);

  const handleResize = useCallback((imageId: string, size: ImageSize) => {
    onResize?.(imageId, size);
  }, [onResize]);

  const activeImage = activeId ? images.find((img) => img.id === activeId) : null;

  if (images.length === 0) {
    return (
      <div className={`${className}`}>
        {title && (
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">{title}</h4>
            {editable && onAdd && (
              <button
                onClick={onAdd}
                className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar
              </button>
            )}
          </div>
        )}
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-500">{emptyMessage}</p>
          {editable && onAdd && (
            <button
              onClick={onAdd}
              className="mt-3 px-4 py-2 text-sm text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors"
            >
              Agregar imágenes
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">
            {title}
            <span className="ml-2 text-xs text-gray-400">({images.length})</span>
          </h4>
          {editable && onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar
            </button>
          )}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
          <div className="flex flex-wrap gap-4 pb-12">
            {images.map((image) => (
              <SortableImage
                key={image.id}
                image={image}
                size={imageSizes.get(image.id)}
                editable={editable}
                selected={selectedId === image.id}
                onSelect={() => handleSelect(image.id)}
                onRemove={() => handleRemove(image.id)}
                onResize={(size) => handleResize(image.id, size)}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeImage && (
            <ImageEditor
              image={activeImage}
              size={imageSizes.get(activeImage.id)}
              editable={false}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
