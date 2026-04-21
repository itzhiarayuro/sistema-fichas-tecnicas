# Mejoras en Drag & Drop - Canvas

## ✅ Funcionalidad Implementada

### Movimiento Libre e Independiente
Los elementos en el canvas ahora se pueden mover libremente **sin depender del panel de capas**.

## Características del Drag & Drop

### 1. **Selección y Movimiento Inmediato**
- Haces clic en cualquier elemento del canvas
- El elemento se selecciona inmediatamente (ring verde)
- Puedes arrastrarlo libremente sin necesidad de ir a las capas
- El movimiento es fluido y en tiempo real

### 2. **Feedback Visual Mejorado**

#### Estados del Cursor:
- **Reposo**: `cursor-grab` (mano abierta) 🖐️
- **Arrastrando**: `cursor-grabbing` (mano cerrada) ✊
- **Bloqueado**: `cursor-not-allowed` (prohibido) 🚫

#### Estados Visuales del Elemento:
- **Normal**: Borde sutil al hover
- **Seleccionado**: Ring verde + sombra
- **Arrastrando**: Ring verde + escala 105% + cursor grabbing
- **Hover**: Escala 102% (efecto de "levantamiento")
- **Bloqueado**: Opacidad 60% + cursor prohibido

### 3. **Transiciones Suaves**
- Todas las transiciones son de 200ms
- Efecto de escala al arrastrar (105%)
- Efecto de hover sutil (102%)
- Cambio de cursor instantáneo

## Cómo Funciona

### Flujo de Drag & Drop:

```
1. HOVER sobre elemento
   └─> Cursor cambia a "grab" (mano abierta)
   └─> Elemento se escala ligeramente (102%)

2. MOUSE DOWN (clic y mantener)
   └─> Elemento se selecciona (ring verde)
   └─> Cursor cambia a "grabbing" (mano cerrada)
   └─> Elemento se escala más (105%)
   └─> isDragging = true

3. MOUSE MOVE (mientras mantienes presionado)
   └─> Elemento sigue el cursor en tiempo real
   └─> Posición se actualiza continuamente
   └─> Snap to grid (si está activado)

4. MOUSE UP (soltar)
   └─> Elemento queda en nueva posición
   └─> Cursor vuelve a "grab"
   └─> Escala vuelve a normal
   └─> isDragging = false
```

## Código Implementado

### Handlers de Mouse:

```typescript
// Al hacer clic en un elemento
const handlePlacementMouseDown = (e, placement) => {
    e.stopPropagation();
    if (placement.isLocked) return;

    // Seleccionar inmediatamente
    onSelectPlacement(placement.id);
    
    // Iniciar drag
    isDraggingRef.current = true;
    dragElementIdRef.current = placement.id;
    dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        initialX: placement.x,
        initialY: placement.y,
    };
    setIsDragging(true);
    
    // Cambiar cursor
    document.body.style.cursor = 'grabbing';
};

// Al mover el mouse
const handleMouseMove = (e) => {
    if (isDraggingRef.current) {
        const dx = (e.clientX - dragStartRef.current.x) / (MM_TO_PX * zoom);
        const dy = (e.clientY - dragStartRef.current.y) / (MM_TO_PX * zoom);
        
        const newX = snapValue(dragStartRef.current.initialX + dx);
        const newY = snapValue(dragStartRef.current.initialY + dy);
        
        updatePlacement(version.id, dragElementIdRef.current, { 
            x: newX, 
            y: newY 
        });
    }
};

// Al soltar el mouse
const handleMouseUp = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
    document.body.style.cursor = '';
};
```

### Clases CSS Dinámicas:

```typescript
className={`
    absolute select-none transition-all duration-200
    ${placement.isLocked 
        ? 'cursor-not-allowed opacity-60' 
        : isDragging && selectedPlacementId === placement.id
            ? 'cursor-grabbing scale-105'
            : 'cursor-grab hover:scale-[1.02]'
    }
    ${isSelected 
        ? 'ring-2 ring-emerald-500 ring-offset-2 z-50 shadow-xl' 
        : 'hover:ring-1 hover:ring-emerald-300'
    }
`}
```

## Características Adicionales

### 1. **Snap to Grid**
- Si está activado, el elemento se ajusta a la cuadrícula
- Movimiento preciso y alineado
- Configurable desde el toolbar

### 2. **Movimiento con Teclado**
- Flechas: Mover 1mm
- Shift + Flechas: Mover 5mm
- Funciona con elemento seleccionado

### 3. **Bloqueo de Elementos**
- Elementos bloqueados no se pueden mover
- Cursor cambia a "not-allowed"
- Opacidad reducida al 60%

### 4. **Z-Index Automático**
- Elemento seleccionado sube a z-50
- Siempre visible durante el drag
- Vuelve a su z-index original al deseleccionar

## Ventajas del Sistema

### ✅ Independencia Total
- No necesitas ir al panel de capas para mover elementos
- Selección y movimiento en un solo paso
- Flujo de trabajo más rápido

### ✅ Feedback Visual Claro
- Siempre sabes si puedes mover un elemento (cursor)
- Ves claramente qué elemento está seleccionado (ring verde)
- Efecto visual al arrastrar (escala + cursor)

### ✅ Precisión
- Snap to grid para alineación perfecta
- Movimiento suave y continuo
- Posicionamiento exacto

### ✅ Prevención de Errores
- Elementos bloqueados no se pueden mover
- Feedback visual inmediato si está bloqueado
- No hay movimientos accidentales

## Comparación: Antes vs Después

### Antes:
```
1. Clic en elemento del canvas
2. Elemento se selecciona
3. ??? (no está claro si se puede mover)
4. Intentas arrastrar
5. Tal vez funciona, tal vez no
```

### Después:
```
1. Hover sobre elemento
   └─> Cursor: grab (mano abierta) ✓
   └─> Elemento se levanta ligeramente ✓

2. Clic y mantener
   └─> Cursor: grabbing (mano cerrada) ✓
   └─> Elemento se escala 105% ✓
   └─> Ring verde de selección ✓

3. Arrastrar
   └─> Elemento sigue el cursor ✓
   └─> Movimiento fluido ✓
   └─> Snap to grid (opcional) ✓

4. Soltar
   └─> Elemento queda en nueva posición ✓
   └─> Cursor vuelve a grab ✓
   └─> Escala vuelve a normal ✓
```

## Casos de Uso

### Caso 1: Ajuste Rápido de Posición
**Escenario**: Necesitas mover un campo un poco a la derecha

**Flujo**:
1. Hover sobre el campo → cursor grab
2. Clic y arrastra → cursor grabbing, elemento se escala
3. Suelta → elemento en nueva posición

**Tiempo**: < 2 segundos

---

### Caso 2: Alineación Precisa
**Escenario**: Necesitas alinear varios campos

**Flujo**:
1. Activa snap to grid
2. Arrastra cada campo
3. Se ajustan automáticamente a la cuadrícula

**Resultado**: Alineación perfecta sin esfuerzo

---

### Caso 3: Reorganización Completa
**Escenario**: Necesitas reorganizar todo el diseño

**Flujo**:
1. Arrastra elementos libremente
2. Usa panel de capas para ver estructura
3. Ajusta z-index si es necesario
4. Continúa arrastrando desde canvas

**Resultado**: Reorganización rápida y visual

---

## Atajos de Teclado

### Movimiento:
- `↑` `↓` `←` `→`: Mover 1mm
- `Shift + ↑↓←→`: Mover 5mm

### Selección:
- `Clic`: Seleccionar elemento
- `Clic en vacío`: Deseleccionar

### Eliminación:
- `Delete` o `Backspace`: Eliminar elemento seleccionado

## Notas Técnicas

### Performance:
- Uso de refs para evitar re-renders durante drag
- Transiciones CSS para suavidad
- Actualización continua de posición sin lag

### Compatibilidad:
- Funciona en todos los navegadores modernos
- Touch events no implementados (solo mouse)
- Responsive (funciona en diferentes tamaños de pantalla)

### Limitaciones:
- No hay selección múltiple (por ahora)
- No hay drag desde panel de capas al canvas
- No hay copiar/pegar con drag

## Resumen

El sistema de drag & drop ahora es:
- ✅ **Independiente**: No necesitas el panel de capas
- ✅ **Visual**: Feedback claro en todo momento
- ✅ **Fluido**: Movimiento suave y continuo
- ✅ **Preciso**: Snap to grid y movimiento con teclado
- ✅ **Seguro**: Elementos bloqueados protegidos

**Resultado**: Experiencia de diseño profesional y eficiente.
