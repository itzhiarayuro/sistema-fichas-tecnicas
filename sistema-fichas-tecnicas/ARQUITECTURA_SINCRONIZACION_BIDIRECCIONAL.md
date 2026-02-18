# Arquitectura de Sincronización Bidireccional Canvas ↔ Capas

## 1. Arquitectura Recomendada

Tu sistema ya implementa correctamente la arquitectura de sincronización bidireccional. Aquí está el flujo:

```
┌─────────────────────────────────────────────────┐
│   Estado Global (Zustand Store)                 │
│   - selectedPlacementId                          │
│   - selectedShapeId                              │
└──────────┬──────────────────────────┬───────────┘
           │                          │
           ↓                          ↓
    ┌──────────────┐          ┌──────────────┐
    │ DesignCanvas │          │ LayersPanel  │
    │              │          │              │
    │ onClick →    │          │ onClick →    │
    │ onSelect*()  │          │ onSelect*()  │
    └──────────────┘          └──────────────┘
           ↑                          ↑
           └──────────────────────────┘
              Ambos actualizan el mismo estado
```

## 2. Estructura de IDs y Estado

### Estado Centralizado (designStore)
```typescript
// Estado único de verdad
{
  selectedPlacementId: string | null,  // ID del campo seleccionado
  selectedShapeId: string | null,      // ID de la figura seleccionada
  // Regla: Solo uno puede estar activo a la vez
}
```

### Identificadores de Elementos
```typescript
// Cada elemento tiene un ID único
interface Element {
  id: string;           // UUID generado automáticamente
  zIndex: number;       // Orden de apilamiento
  pageNumber?: number;  // Página donde aparece
  groupId?: string;     // ID del grupo (si pertenece a uno)
}
```

## 3. Flujo de Sincronización Actual

### A. Canvas → Capas (✅ YA FUNCIONA)

**Archivo:** `DesignCanvas.tsx`

```typescript
// Cuando haces clic en un elemento del canvas
const handlePlacementMouseDown = (e: React.MouseEvent, placement: FieldPlacement) => {
  e.stopPropagation();
  
  // 1. Actualizar estado global
  onSelectPlacement(placement.id);
  onSelectShape(null);
  
  // 2. El LayersPanel reacciona automáticamente al cambio de estado
};

const handleShapeMouseDown = (e: React.MouseEvent, shape: ShapeElement) => {
  e.stopPropagation();
  
  // 1. Actualizar estado global
  onSelectShape(shape.id);
  onSelectPlacement(null);
  
  // 2. El LayersPanel reacciona automáticamente al cambio de estado
};
```

### B. Capas → Canvas (✅ YA FUNCIONA)

**Archivo:** `LayersPanel.tsx`

```typescript
// Cuando haces clic en una capa
const handleItemClick = (e: React.MouseEvent, item: any) => {
  if (item.isShape) {
    // 1. Actualizar estado global
    onSelectShape(item.id);
    onSelectPlacement(null);
  } else {
    // 1. Actualizar estado global
    onSelectPlacement(item.id);
    onSelectShape(null);
  }
  
  // 2. El DesignCanvas reacciona automáticamente al cambio de estado
};
```

### C. Scroll Automático (⚠️ PROBLEMA DETECTADO)

**Problema:** El scroll automático tiene un timing issue. El `ref` se asigna correctamente pero el scroll no siempre funciona.

**Solución:** Ya está implementada con `setTimeout`, pero puede mejorarse.

## 4. Código de Ejemplo Mejorado

### Mejora para LayersPanel.tsx

El problema está en que el `ref` se asigna en el render, pero el scroll se ejecuta antes de que el DOM esté completamente actualizado. Aquí está la solución mejorada:

```typescript
// En LayersPanel.tsx - MEJORADO
const selectedItemRef = useRef<HTMLDivElement>(null);

// Scroll automático mejorado con doble verificación
useEffect(() => {
  if (selectedPlacementId || selectedShapeId) {
    // Primera verificación inmediata
    const scrollToElement = () => {
      if (selectedItemRef.current) {
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
      // Si falla, reintentar después del render
      requestAnimationFrame(() => {
        if (!scrollToElement()) {
          // Último intento con timeout
          setTimeout(scrollToElement, 100);
        }
      });
    }
  }
}, [selectedPlacementId, selectedShapeId]);
```

### Mejora para DesignCanvas.tsx

Similar mejora para el scroll en el canvas:

```typescript
// En DesignCanvas.tsx - MEJORADO
const selectedElementRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (selectedPlacementId || selectedShapeId) {
    const scrollToElement = () => {
      if (selectedElementRef.current) {
        selectedElementRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
        return true;
      }
      return false;
    };

    // Intentar con requestAnimationFrame para mejor timing
    requestAnimationFrame(() => {
      if (!scrollToElement()) {
        setTimeout(scrollToElement, 100);
      }
    });
  }
}, [selectedPlacementId, selectedShapeId]);
```

## 5. Posibles Problemas y Soluciones

### Problema 1: Scroll no funciona consistentemente
**Causa:** El ref se asigna después del useEffect
**Solución:** Usar `requestAnimationFrame` + fallback con `setTimeout`

### Problema 2: Selección múltiple interfiere con selección simple
**Causa:** Estado local `selectedIds` no sincronizado
**Solución:** Ya implementado correctamente con useEffect de sincronización

```typescript
// Ya implementado en LayersPanel.tsx
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

### Problema 3: Elementos en grupos no se seleccionan correctamente
**Causa:** Grupos colapsados ocultan elementos
**Solución:** Expandir automáticamente el grupo cuando se selecciona un hijo

```typescript
// NUEVO - Agregar a LayersPanel.tsx
useEffect(() => {
  if (selectedPlacementId || selectedShapeId) {
    const selectedId = selectedPlacementId || selectedShapeId;
    const selectedElement = allElements.find(el => el.id === selectedId);
    
    // Si el elemento está en un grupo, expandir el grupo
    if (selectedElement && (selectedElement as any).groupId) {
      setCollapsedGroups(prev => {
        const next = new Set(prev);
        next.delete((selectedElement as any).groupId);
        return next;
      });
    }
  }
}, [selectedPlacementId, selectedShapeId, allElements]);
```

### Problema 4: Elementos en páginas diferentes no se muestran
**Causa:** Elementos solo se renderizan en su página asignada
**Solución:** Scroll automático a la página correcta

```typescript
// NUEVO - Agregar a DesignCanvas.tsx
useEffect(() => {
  if (selectedPlacementId || selectedShapeId) {
    const selectedElement = selectedPlacementId 
      ? version?.placements.find(p => p.id === selectedPlacementId)
      : version?.shapes.find(s => s.id === selectedShapeId);
    
    if (selectedElement) {
      const pageNumber = selectedElement.pageNumber || 1;
      const pageContainer = document.getElementById(`page-container-${pageNumber}`);
      
      if (pageContainer) {
        pageContainer.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }
}, [selectedPlacementId, selectedShapeId, version]);
```

## 6. Debugging Tips

### Verificar sincronización
```typescript
// Agregar logs temporales
console.log('🔴 LayersPanel - selectedPlacementId:', selectedPlacementId);
console.log('🔴 LayersPanel - selectedShapeId:', selectedShapeId);
console.log('🔴 LayersPanel - ref asignado:', !!selectedItemRef.current);
```

### Verificar que el elemento existe en el DOM
```typescript
useEffect(() => {
  if (selectedPlacementId || selectedShapeId) {
    const selectedId = selectedPlacementId || selectedShapeId;
    const element = document.querySelector(`[data-placement-id="${selectedId}"], [data-shape-id="${selectedId}"]`);
    console.log('🔴 Elemento en DOM:', !!element);
  }
}, [selectedPlacementId, selectedShapeId]);
```

## 7. Resumen de la Arquitectura

### ✅ Lo que ya funciona bien:
1. Estado centralizado en Zustand
2. Sincronización Canvas → Capas
3. Sincronización Capas → Canvas
4. Selección múltiple con Ctrl/Cmd
5. Grupos y jerarquía de elementos

### ⚠️ Lo que puede mejorarse:
1. Timing del scroll automático (usar `requestAnimationFrame`)
2. Expandir grupos automáticamente al seleccionar hijos
3. Scroll a la página correcta en documentos multipágina
4. Indicadores visuales más prominentes

### 🎯 Principios clave:
1. **Una sola fuente de verdad:** El estado global es el único que importa
2. **Reactividad:** Ambos componentes reaccionan a cambios de estado
3. **Refs para scroll:** Usar refs para hacer scroll al elemento seleccionado
4. **Timing correcto:** Usar `requestAnimationFrame` para sincronizar con el render
5. **Feedback visual:** Indicadores claros de qué está seleccionado

## 8. Próximos Pasos

Si quieres implementar las mejoras sugeridas, puedo ayudarte a:
1. Mejorar el timing del scroll automático
2. Agregar expansión automática de grupos
3. Implementar scroll a página correcta
4. Agregar más indicadores visuales
