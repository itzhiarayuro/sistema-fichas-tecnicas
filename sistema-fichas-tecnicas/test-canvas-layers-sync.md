# Prueba de Sincronización Canvas ↔ Capas

## Objetivo
Verificar que la selección bidireccional entre canvas y capas funciona correctamente.

## Escenarios de Prueba

### ✅ Prueba 1: Selección desde Canvas → Capas
**Pasos:**
1. Abrir http://localhost:3001/designer
2. Asegurarse de tener elementos en el canvas (campos o figuras)
3. Hacer clic en un elemento del canvas
4. Verificar que el panel de capas se abre automáticamente (si estaba cerrado)
5. Verificar que el elemento se resalta en verde en el panel de capas
6. Verificar que hace scroll automático al elemento en capas
7. Verificar que el panel de propiedades NO se abre automáticamente

**Resultado Esperado:**
- ✅ Panel de capas abierto
- ✅ Elemento resaltado en verde con borde emerald
- ✅ Scroll automático al elemento
- ✅ Panel de propiedades cerrado (o sin cambios)
- ✅ Indicador visual "✓ Elemento Seleccionado" en la parte superior del panel de capas

### ✅ Prueba 2: Selección desde Capas → Canvas
**Pasos:**
1. Abrir el panel de capas
2. Hacer clic en un elemento de la lista de capas
3. Verificar que el elemento se resalta en el canvas
4. Verificar que hace scroll al elemento en el canvas
5. Verificar que el panel de propiedades SÍ se abre automáticamente

**Resultado Esperado:**
- ✅ Elemento resaltado en el canvas con ring emerald
- ✅ Scroll automático al elemento en canvas
- ✅ Panel de propiedades abierto
- ✅ Propiedades del elemento mostradas

### ✅ Prueba 3: Flujo Completo Canvas → Capas → Propiedades
**Pasos:**
1. Hacer clic en un elemento del canvas
2. Observar que se resalta en capas
3. Hacer clic en el elemento resaltado en capas
4. Verificar que se abren las propiedades

**Resultado Esperado:**
- ✅ Flujo completo funcional
- ✅ Usuario puede ver qué elemento seleccionó en canvas
- ✅ Usuario puede abrir propiedades haciendo clic en capas

## Estado Actual de Implementación

### Código Implementado:

**page.tsx - Handlers de selección:**
```typescript
// Desde Canvas (NO abre propiedades)
const handleSelectPlacement = (id: string | null) => {
    setSelectedPlacementId(id);
    setSelectedShapeId(null);
    setPendingShape(null);
    setPendingField(null);
    
    // Abrir panel de capas si hay selección y no está abierto
    if (id && !designerPanels.showLayers) {
        toggleDesignerPanel('layers');
    }
};

// Desde Capas (SÍ abre propiedades)
const handleSelectPlacementFromLayers = (id: string | null) => {
    setSelectedPlacementId(id);
    setSelectedShapeId(null);
    setPendingShape(null);
    setPendingField(null);
    
    // Abrir propiedades cuando se selecciona desde capas
    if (id && !designerPanels.showProperties) {
        toggleDesignerPanel('properties');
    }
    
    // Scroll al elemento en el canvas
    if (id) {
        setTimeout(() => {
            const element = document.querySelector(`[data-placement-id="${id}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
        }, 100);
    }
};
```

**LayersPanel.tsx - Scroll automático:**
```typescript
useEffect(() => {
    if (selectedItemRef.current) {
        // Pequeño delay para asegurar que el DOM está actualizado
        setTimeout(() => {
            selectedItemRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        }, 100);
    }
}, [selectedPlacementId, selectedShapeId]);
```

## Instrucciones para Prueba Manual

1. Abre http://localhost:3001/designer
2. Si no hay elementos, arrastra algunos campos desde el panel de elementos
3. Cierra el panel de capas (botón de capas en la esquina superior izquierda)
4. Haz clic en un elemento del canvas
5. Observa que:
   - El panel de capas se abre automáticamente
   - El elemento aparece resaltado en verde
   - Hay un banner verde que dice "✓ Elemento Seleccionado"
   - El scroll te lleva al elemento
6. Ahora haz clic en ese elemento resaltado en capas
7. Observa que se abre el panel de propiedades

## Resultado
✅ Funcionalidad completamente implementada y lista para pruebas
