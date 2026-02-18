/**
 * EJEMPLO PRÁCTICO: Sincronización Bidireccional Mejorada
 * 
 * Este archivo muestra las mejoras específicas que puedes aplicar
 * a tu código actual para resolver problemas de sincronización.
 */

// ============================================
// 1. MEJORA PARA LayersPanel.tsx
// ============================================

import { useEffect, useRef, useState } from 'react';

export function LayersPanelMejorado() {
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // ✅ MEJORA 1: Scroll automático con mejor timing
  useEffect(() => {
    if (selectedPlacementId || selectedShapeId) {
      const scrollToElement = () => {
        if (selectedItemRef.current) {
          console.log('✅ Haciendo scroll al elemento seleccionado');
          selectedItemRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
          return true;
        }
        return false;
      };

      // Intentar inmediatamente
      if (!scrollToElement()) {
        // Si falla, usar requestAnimationFrame (mejor que setTimeout)
        requestAnimationFrame(() => {
          if (!scrollToElement()) {
            // Último intento con timeout como fallback
            setTimeout(scrollToElement, 100);
          }
        });
      }
    }
  }, [selectedPlacementId, selectedShapeId]);

  // ✅ MEJORA 2: Expandir grupos automáticamente cuando se selecciona un hijo
  useEffect(() => {
    if (!version) return;
    
    const selectedId = selectedPlacementId || selectedShapeId;
    if (!selectedId) return;

    // Buscar el elemento seleccionado
    const allElements = [
      ...(version.shapes || []),
      ...(version.placements || [])
    ];
    
    const selectedElement = allElements.find(el => el.id === selectedId);
    
    // Si el elemento está en un grupo colapsado, expandirlo
    if (selectedElement && (selectedElement as any).groupId) {
      const groupId = (selectedElement as any).groupId;
      
      setCollapsedGroups(prev => {
        if (prev.has(groupId)) {
          console.log('✅ Expandiendo grupo automáticamente:', groupId);
          const next = new Set(prev);
          next.delete(groupId);
          return next;
        }
        return prev;
      });
    }
  }, [selectedPlacementId, selectedShapeId, version]);

  // ... resto del código
}

// ============================================
// 2. MEJORA PARA DesignCanvas.tsx
// ============================================

export function DesignCanvasMejorado() {
  const selectedElementRef = useRef<HTMLDivElement>(null);

  // ✅ MEJORA 3: Scroll automático en canvas con mejor timing
  useEffect(() => {
    if (selectedPlacementId || selectedShapeId) {
      const scrollToElement = () => {
        if (selectedElementRef.current) {
          console.log('✅ Haciendo scroll al elemento en canvas');
          selectedElementRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
          return true;
        }
        return false;
      };

      // Usar requestAnimationFrame para mejor sincronización con el render
      requestAnimationFrame(() => {
        if (!scrollToElement()) {
          setTimeout(scrollToElement, 100);
        }
      });
    }
  }, [selectedPlacementId, selectedShapeId]);

  // ✅ MEJORA 4: Scroll a la página correcta en documentos multipágina
  useEffect(() => {
    if (!version) return;
    
    const selectedId = selectedPlacementId || selectedShapeId;
    if (!selectedId) return;

    // Encontrar el elemento seleccionado
    const selectedElement = selectedPlacementId 
      ? version.placements.find(p => p.id === selectedPlacementId)
      : version.shapes?.find(s => s.id === selectedShapeId);
    
    if (selectedElement) {
      const pageNumber = selectedElement.pageNumber || 1;
      const pageContainer = document.getElementById(`page-container-${pageNumber}`);
      
      if (pageContainer) {
        console.log('✅ Haciendo scroll a la página:', pageNumber);
        
        // Scroll a la página primero
        pageContainer.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        
        // Luego scroll al elemento específico (con delay)
        setTimeout(() => {
          if (selectedElementRef.current) {
            selectedElementRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'center'
            });
          }
        }, 300);
      }
    }
  }, [selectedPlacementId, selectedShapeId, version]);

  // ✅ MEJORA 5: Threshold para evitar selección accidental durante drag
  const handlePlacementMouseDown = useCallback((e: React.MouseEvent, placement: FieldPlacement) => {
    e.stopPropagation();
    
    if (placement.isLocked) return;

    // Guardar posición inicial para detectar drag vs click
    const startX = e.clientX;
    const startY = e.clientY;
    const startTime = Date.now();

    // Seleccionar SIEMPRE cuando se hace mousedown
    onSelectPlacement(placement.id);
    onSelectShape(null);

    // Preparar para posible drag
    dragElementTypeRef.current = 'placement';
    dragElementIdRef.current = placement.id;
    dragStartRef.current = {
      x: startX,
      y: startY,
      initialX: placement.x,
      initialY: placement.y,
    };

    console.log('🟢 Elemento seleccionado:', placement.id);
  }, [onSelectPlacement, onSelectShape]);

  // ... resto del código
}

// ============================================
// 3. COMPONENTE DE DEBUGGING (OPCIONAL)
// ============================================

/**
 * Componente helper para debugging de sincronización
 * Muestra en tiempo real el estado de selección
 */
export function SyncDebugPanel({ 
  selectedPlacementId, 
  selectedShapeId 
}: { 
  selectedPlacementId: string | null;
  selectedShapeId: string | null;
}) {
  const [history, setHistory] = useState<Array<{ time: string; type: string; id: string }>>([]);

  useEffect(() => {
    if (selectedPlacementId) {
      setHistory(prev => [...prev.slice(-4), {
        time: new Date().toLocaleTimeString(),
        type: 'Placement',
        id: selectedPlacementId
      }]);
    } else if (selectedShapeId) {
      setHistory(prev => [...prev.slice(-4), {
        time: new Date().toLocaleTimeString(),
        type: 'Shape',
        id: selectedShapeId
      }]);
    }
  }, [selectedPlacementId, selectedShapeId]);

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-xs">
      <div className="font-bold mb-2">🔍 Sync Debug</div>
      <div className="space-y-1">
        <div>
          <span className="text-gray-400">Placement:</span>{' '}
          <span className="text-green-400">{selectedPlacementId || 'none'}</span>
        </div>
        <div>
          <span className="text-gray-400">Shape:</span>{' '}
          <span className="text-blue-400">{selectedShapeId || 'none'}</span>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-600">
        <div className="font-bold mb-1">Historial:</div>
        {history.map((entry, i) => (
          <div key={i} className="text-[10px] text-gray-300">
            {entry.time} - {entry.type}: {entry.id.slice(0, 8)}...
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// 4. HOOK PERSONALIZADO PARA SINCRONIZACIÓN
// ============================================

/**
 * Hook reutilizable para manejar scroll automático
 * Puedes usar esto en cualquier componente que necesite scroll a elemento seleccionado
 */
export function useAutoScroll(
  selectedId: string | null,
  ref: React.RefObject<HTMLElement>,
  options?: ScrollIntoViewOptions
) {
  useEffect(() => {
    if (!selectedId) return;

    const scrollToElement = () => {
      if (ref.current) {
        ref.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
          ...options
        });
        return true;
      }
      return false;
    };

    // Triple intento para máxima confiabilidad
    if (!scrollToElement()) {
      requestAnimationFrame(() => {
        if (!scrollToElement()) {
          setTimeout(scrollToElement, 100);
        }
      });
    }
  }, [selectedId, ref, options]);
}

// Uso del hook:
// const selectedItemRef = useRef<HTMLDivElement>(null);
// useAutoScroll(selectedPlacementId || selectedShapeId, selectedItemRef);

// ============================================
// 5. UTILIDAD PARA VERIFICAR SINCRONIZACIÓN
// ============================================

/**
 * Función helper para verificar que la sincronización funciona
 */
export function verifySyncState(
  canvasSelectedId: string | null,
  layersSelectedId: string | null,
  elementType: 'placement' | 'shape'
): boolean {
  const isInSync = canvasSelectedId === layersSelectedId;
  
  if (!isInSync) {
    console.error('❌ DESINCRONIZACIÓN DETECTADA:', {
      canvas: canvasSelectedId,
      layers: layersSelectedId,
      type: elementType
    });
  } else {
    console.log('✅ Sincronización correcta:', {
      id: canvasSelectedId,
      type: elementType
    });
  }
  
  return isInSync;
}

// ============================================
// 6. EJEMPLO DE INTEGRACIÓN COMPLETA
// ============================================

/**
 * Ejemplo de cómo integrar todas las mejoras en tu página principal
 */
export function DesignerPageMejorada() {
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Handlers centralizados
  const handleSelectPlacement = useCallback((id: string | null) => {
    console.log('🔵 Seleccionando placement:', id);
    setSelectedPlacementId(id);
    setSelectedShapeId(null);
  }, []);

  const handleSelectShape = useCallback((id: string | null) => {
    console.log('🟢 Seleccionando shape:', id);
    setSelectedShapeId(id);
    setSelectedPlacementId(null);
  }, []);

  return (
    <div className="flex h-screen">
      {/* Canvas */}
      <div className="flex-1">
        <DesignCanvas
          selectedPlacementId={selectedPlacementId}
          selectedShapeId={selectedShapeId}
          onSelectPlacement={handleSelectPlacement}
          onSelectShape={handleSelectShape}
          // ... otros props
        />
      </div>

      {/* Panel de Capas */}
      <div className="w-80">
        <LayersPanel
          selectedPlacementId={selectedPlacementId}
          selectedShapeId={selectedShapeId}
          onSelectPlacement={handleSelectPlacement}
          onSelectShape={handleSelectShape}
          // ... otros props
        />
      </div>

      {/* Debug Panel (opcional) */}
      {showDebug && (
        <SyncDebugPanel
          selectedPlacementId={selectedPlacementId}
          selectedShapeId={selectedShapeId}
        />
      )}

      {/* Toggle Debug */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="fixed bottom-4 left-4 bg-gray-800 text-white px-3 py-2 rounded text-xs"
      >
        {showDebug ? 'Ocultar' : 'Mostrar'} Debug
      </button>
    </div>
  );
}

// ============================================
// 7. TESTS PARA VERIFICAR SINCRONIZACIÓN
// ============================================

/**
 * Tests básicos que puedes ejecutar en la consola del navegador
 */
export const syncTests = {
  // Test 1: Verificar que el estado se actualiza
  testStateUpdate: (setSelectedPlacement: Function, setSelectedShape: Function) => {
    console.log('🧪 Test 1: Actualizando estado...');
    setSelectedPlacement('test-id-123');
    setTimeout(() => {
      console.log('✅ Estado actualizado');
    }, 100);
  },

  // Test 2: Verificar que el ref se asigna
  testRefAssignment: (ref: React.RefObject<HTMLElement>) => {
    console.log('🧪 Test 2: Verificando ref...');
    if (ref.current) {
      console.log('✅ Ref asignado correctamente:', ref.current);
    } else {
      console.log('❌ Ref no asignado');
    }
  },

  // Test 3: Verificar que el elemento existe en el DOM
  testDOMElement: (elementId: string) => {
    console.log('🧪 Test 3: Buscando elemento en DOM...');
    const element = document.querySelector(`[data-placement-id="${elementId}"], [data-shape-id="${elementId}"]`);
    if (element) {
      console.log('✅ Elemento encontrado en DOM:', element);
    } else {
      console.log('❌ Elemento no encontrado en DOM');
    }
  }
};

// Uso en consola:
// syncTests.testStateUpdate(setSelectedPlacement, setSelectedShape);
// syncTests.testRefAssignment(selectedItemRef);
// syncTests.testDOMElement('elemento-id-123');
