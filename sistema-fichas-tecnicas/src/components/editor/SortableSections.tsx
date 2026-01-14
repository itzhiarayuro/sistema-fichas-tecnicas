/**
 * SortableSections - Contenedor de secciones con drag & drop
 * Requirements: 3.5, 3.9
 * 
 * Proporciona:
 * - Reordenamiento de secciones mediante drag & drop
 * - Protección de secciones obligatorias (locked)
 * - Feedback visual durante el arrastre
 * - Validación de posiciones válidas
 */

'use client';

import { useState, useCallback, ReactNode } from 'react';
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
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FichaSection, SectionType } from '@/types/ficha';

interface SortableSectionsProps {
  /** Lista de secciones */
  sections: FichaSection[];
  /** Callback cuando se reordenan las secciones */
  onReorder: (fromIndex: number, toIndex: number) => void;
  /** Función para renderizar cada sección */
  renderSection: (section: FichaSection, dragHandleProps: Record<string, unknown>) => ReactNode;
  /** Clase CSS adicional */
  className?: string;
}

interface SortableSectionWrapperProps {
  section: FichaSection;
  renderSection: (section: FichaSection, dragHandleProps: Record<string, unknown>) => ReactNode;
}

function SortableSectionWrapper({ section, renderSection }: SortableSectionWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    disabled: section.locked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  // Combine attributes with listeners for drag handle
  const dragHandleProps = section.locked ? {} : { ...attributes, ...listeners };

  return (
    <div ref={setNodeRef} style={style}>
      {renderSection(
        { ...section, visible: section.visible },
        dragHandleProps
      )}
    </div>
  );
}

export function SortableSections({
  sections,
  onReorder,
  renderSection,
  className = '',
}: SortableSectionsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

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
    const { active } = event;
    const activeSection = sections.find((s) => s.id === active.id);
    
    // Don't allow dragging locked sections
    if (activeSection?.locked) {
      return;
    }
    
    setActiveId(active.id as string);
  }, [sections]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string | null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeSection = sections.find((s) => s.id === active.id);
    const overSection = sections.find((s) => s.id === over.id);

    // Don't allow moving locked sections
    if (activeSection?.locked) {
      return;
    }

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(oldIndex, newIndex);
    }
  }, [sections, onReorder]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
  }, []);

  const activeSection = activeId ? sections.find((s) => s.id === activeId) : null;

  // Filter visible sections for rendering
  const visibleSections = sections.filter((s) => s.visible);
  const hiddenSections = sections.filter((s) => !s.visible);

  return (
    <div className={className}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={visibleSections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {visibleSections.map((section) => (
              <div
                key={section.id}
                className={`transition-all ${
                  overId === section.id && activeId !== section.id
                    ? 'ring-2 ring-primary/30 ring-offset-2'
                    : ''
                }`}
              >
                <SortableSectionWrapper
                  section={section}
                  renderSection={renderSection}
                />
              </div>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeSection && (
            <div className="opacity-90 shadow-2xl">
              {renderSection(activeSection, {})}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Hidden sections */}
      {hiddenSections.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-500 mb-3">
            Secciones ocultas ({hiddenSections.length})
          </h4>
          <div className="space-y-2">
            {hiddenSections.map((section) => (
              <div key={section.id}>
                {renderSection(section, {})}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook para usar en componentes de sección individuales
 * Proporciona el estado de arrastre y las props necesarias
 */
export function useSectionDrag(sectionId: string, locked: boolean = false) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: sectionId,
    disabled: locked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandleProps = locked ? {} : { ...attributes, ...listeners };

  return {
    setNodeRef,
    style,
    isDragging,
    isOver,
    dragHandleProps,
  };
}
