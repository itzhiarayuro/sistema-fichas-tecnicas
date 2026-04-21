# Problemas Comunes en Sincronización Bidireccional

## Diagrama de Flujo Completo

```
Usuario hace clic en Canvas
         ↓
handlePlacementMouseDown() / handleShapeMouseDown()
         ↓
onSelectPlacement(id) / onSelectShape(id)
         ↓
Estado global actualizado (Zustand)
         ↓
    ┌────┴────┐
    ↓         ↓
Canvas    LayersPanel
re-render  re-render
    ↓         ↓
Ref        Ref
asignado   asignado
    ↓         ↓
useEffect  useEffect
detecta    detecta
cambio     cambio
    ↓         ↓
Scroll     Scroll
automático automático
```

## Problema 1: El scroll no funciona

### Síntomas
- Haces clic en un elemento del canvas
- El elemento se selecciona visualmente
- Pero el panel de capas NO hace scroll al elemento

### Causa Raíz
El `useEffect` se ejecuta ANTES de que el ref se asigne al elemento correcto.

### Timing del Problema
```
1. Click en elemento
2. Estado cambia (selectedPlacementId = "abc123")
3. useEffect se ejecuta → ref.current = null ❌
4. Componente re-renderiza
5. Ref se asigna → ref.current = <div> ✅ (pero ya es tarde)
```

### Solución
```typescript
useEffect(() => {
  if (selectedPlacementId || selectedShapeId) {
    const scrollToElement = () => {
      if (selectedItemRef.current) {
        selectedItemRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        return true;
      }
      return false;
    };

    // Intento 1: Inmediato (puede fallar)
    if (!scrollToElement()) {
      // Intento 2: Después del siguiente frame (mejor timing)
      requestAnimationFrame(() => {
        if (!scrollToElement()) {
          // Intento 3: Con delay (fallback)
          setTimeout(scrollToElement, 100);
        }
      });
    }
  }
}, [selectedPlacementId, selectedShapeId]);
```

## Problema 2: Elementos en grupos colapsados no se ven

### Síntomas
- Seleccionas un elemento desde el canvas
- El panel de capas no muestra el elemento porque está en un grupo colapsado

### Causa Raíz
El grupo está colapsado y oculta sus hijos.

### Solución
```typescript
useEffect(() => {
  if (!version) return;
  
  const selectedId = selectedPlacementId || selectedShapeId;
  if (!selectedId) return;

  // Buscar el elemento
  const allElements = [
    ...(version.shapes || []),
    ...(version.placements || [])
  ];
  
  const selectedElement = allElements.find(el => el.id === selectedId);
  
  // Si está en un grupo, expandir el grupo
  if (selectedElement && (selectedElement as any).groupId) {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.delete((selectedElement as any).groupId);
      return next;
    });
  }
}, [selectedPlacementId, selectedShapeId, version]);
```

## Problema 3: Elementos en páginas diferentes

### Síntomas
- Documento tiene múltiples páginas
- Seleccionas un elemento de la página 2
- El canvas no hace scroll a la página correcta

### Causa Raíz
El scroll va al elemento, pero la página no está visible.

### Solución
```typescript
useEffect(() => {
  if (!version) return;
  
  const selectedId = selectedPlacementId || selectedShapeId;
  if (!selectedId) return;

  const selectedElement = selectedPlacementId 
    ? version.placements.find(p => p.id === selectedPlacementId)
    : version.shapes?.find(s => s.id === selectedShapeId);
  
  if (selectedElement) {
    const pageNumber = selectedElement.pageNumber || 1;
    const pageContainer = document.getElementById(`page-container-${pageNumber}`);
    
    if (pageContainer) {
      // Primero scroll a la página
      pageContainer.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      
      // Luego al elemento (con delay)
      setTimeout(() => {
        if (selectedElementRef.current) {
          selectedElementRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 300);
    }
  }
}, [selectedPlacementId, selectedShapeId, version]);
```

## Problema 4: Drag accidental al hacer clic

### Síntomas
- Quieres solo seleccionar un elemento
- Pero se inicia un drag accidental
- El elemento se mueve ligeramente

### Causa Raíz
El `mousedown` inicia el drag inmediatamente sin threshold.

### Solución (ya implementada en tu código)
```typescript
const handleMouseMove = useCallback((e: MouseEvent) => {
  if (dragElementIdRef.current && dragElementTypeRef.current) {
    const dx = (e.clientX - dragStartRef.current.x) / (MM_TO_PX * zoom);
    const dy = (e.clientY - dragStartRef.current.y) / (MM_TO_PX * zoom);

    // Threshold: solo iniciar drag si se movió más de 2 píxeles
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 2) {
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        setIsDragging(true);
      }
      // ... actualizar posición
    }
  }
}, [/* deps */]);
```

## Problema 5: Múltiples elementos seleccionados

### Síntomas
- Selección múltiple con Ctrl/Cmd funciona
- Pero al hacer clic simple, no se deseleccionan los demás

### Causa Raíz
Estado local `selectedIds` no se sincroniza con estado global.

### Solución (ya implementada)
```typescript
// Sincronizar selección múltiple con selección individual
useEffect(() => {
  if (selectedPlacementId) {
    setSelectedIds([selectedPlacementId]);
  } else if (selectedShapeId) {
    setSelectedIds([selectedShapeId]);
  } else {
    setSelectedIds([]);
  }
}, [selectedPlacementId, selectedShapeId]);
```

## Problema 6: Elementos ocultos se pueden seleccionar

### Síntomas
- Un elemento está oculto (isVisible = false)
- Pero aún se puede seleccionar desde el panel de capas
- Esto causa confusión

### Solución
```typescript
const handleItemClick = (e: React.MouseEvent, item: any) => {
  // Prevenir selección de elementos ocultos
  if (item.isVisible === false) {
    console.log('⚠️ No se puede seleccionar elemento oculto');
    return;
  }
  
  // ... resto del código de selección
};
```

## Problema 7: Elementos bloqueados se pueden seleccionar

### Síntomas
- Un elemento está bloqueado (isLocked = true)
- Se puede seleccionar pero no mover
- Esto puede ser confuso

### Solución (opcional)
```typescript
const handleItemClick = (e: React.MouseEvent, item: any) => {
  // Permitir selección pero mostrar indicador
  if (item.isLocked) {
    console.log('🔒 Elemento bloqueado seleccionado');
    // Mostrar toast o mensaje
  }
  
  // ... resto del código de selección
};
```

## Debugging Checklist

Cuando la sincronización no funciona, verifica:

### 1. Estado Global
```typescript
console.log('Estado:', {
  selectedPlacementId,
  selectedShapeId
});
```

### 2. Ref Asignado
```typescript
console.log('Ref asignado:', !!selectedItemRef.current);
```

### 3. Elemento en DOM
```typescript
const element = document.querySelector(`[data-placement-id="${selectedPlacementId}"]`);
console.log('Elemento en DOM:', !!element);
```

### 4. Timing del useEffect
```typescript
useEffect(() => {
  console.log('useEffect ejecutado:', {
    selectedPlacementId,
    refCurrent: !!selectedItemRef.current
  });
}, [selectedPlacementId]);
```

### 5. Scroll Container
```typescript
// Verificar que el contenedor tiene scroll
const container = document.querySelector('.overflow-y-auto');
console.log('Container scroll:', {
  scrollHeight: container?.scrollHeight,
  clientHeight: container?.clientHeight,
  hasScroll: (container?.scrollHeight || 0) > (container?.clientHeight || 0)
});
```

## Mejores Prácticas

### 1. Una sola fuente de verdad
```typescript
// ✅ BIEN: Estado centralizado
const [selectedId, setSelectedId] = useState<string | null>(null);

// ❌ MAL: Estados duplicados
const [canvasSelectedId, setCanvasSelectedId] = useState<string | null>(null);
const [layersSelectedId, setLayersSelectedId] = useState<string | null>(null);
```

### 2. Callbacks estables
```typescript
// ✅ BIEN: useCallback para evitar re-renders
const handleSelect = useCallback((id: string | null) => {
  setSelectedId(id);
}, []);

// ❌ MAL: Función inline (causa re-renders)
<LayersPanel onSelect={(id) => setSelectedId(id)} />
```

### 3. Refs para elementos dinámicos
```typescript
// ✅ BIEN: Ref condicional
<div ref={isSelected ? selectedItemRef : null}>

// ❌ MAL: Ref siempre asignado
<div ref={selectedItemRef}>
```

### 4. Timing correcto
```typescript
// ✅ BIEN: requestAnimationFrame + fallback
requestAnimationFrame(() => {
  if (!scroll()) setTimeout(scroll, 100);
});

// ❌ MAL: Solo setTimeout
setTimeout(scroll, 100);
```

### 5. Feedback visual claro
```typescript
// ✅ BIEN: Indicadores múltiples
className={`${isSelected ? 'ring-4 ring-emerald-500 scale-105 shadow-xl' : ''}`}

// ❌ MAL: Indicador sutil
className={`${isSelected ? 'border-blue-500' : ''}`}
```

## Herramientas de Debugging

### 1. React DevTools
- Inspeccionar props y estado en tiempo real
- Ver qué componentes re-renderizan

### 2. Console Logs Estratégicos
```typescript
// Agregar logs temporales
console.log('🔴 LayersPanel render');
console.log('🟢 Canvas render');
console.log('🟡 useEffect scroll');
```

### 3. Performance Monitor
```typescript
useEffect(() => {
  const start = performance.now();
  // ... código
  const end = performance.now();
  console.log(`Tiempo: ${end - start}ms`);
}, [deps]);
```

### 4. Breakpoints Condicionales
```typescript
if (selectedPlacementId === 'elemento-problematico') {
  debugger; // Pausar aquí
}
```

## Resumen

La sincronización bidireccional funciona cuando:

1. ✅ Hay una sola fuente de verdad (estado global)
2. ✅ Ambos componentes reaccionan al mismo estado
3. ✅ Los refs se asignan correctamente
4. ✅ El timing del scroll es correcto (requestAnimationFrame)
5. ✅ Los elementos están visibles en el DOM
6. ✅ Hay feedback visual claro

Si algo no funciona, revisa estos 6 puntos en orden.
