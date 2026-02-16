# Enfoque Replanteado - Selección de Elementos

## Problema Identificado

El sistema anterior tenía varios problemas:
1. ❌ No diferenciaba entre un "click simple" y un "drag"
2. ❌ El drag se iniciaba inmediatamente sin esperar movimiento real
3. ❌ La deselección no funcionaba correctamente
4. ❌ El resize no seleccionaba el elemento
5. ❌ Había confusión entre selección y movimiento

## ✅ Nuevo Enfoque

### Principio Fundamental
**Separar claramente: SELECCIÓN vs MOVIMIENTO**

- **SELECCIÓN**: Ocurre al hacer clic (sin movimiento)
- **MOVIMIENTO**: Ocurre solo si hay movimiento real (threshold de 2px)

---

## Flujo Detallado

### 1. Hacer Clic en un Elemento

```
MOUSE DOWN en elemento
    ↓
Seleccionar elemento (INMEDIATO)
    ├─> onSelectPlacement(id) o onSelectShape(id)
    ├─> Actualizar selectedPlacementId o selectedShapeId
    ├─> Resaltar en canvas (ring verde)
    ├─> Resaltar en capas (fondo verde)
    └─> Mostrar indicador en canvas
    
Preparar para drag (pero NO iniciar aún)
    ├─> Guardar posición inicial
    ├─> Guardar ID del elemento
    └─> Esperar movimiento
```

**Resultado**: Elemento seleccionado, listo para editar o mover

---

### 2. Mover el Mouse (sin soltar)

```
MOUSE MOVE
    ↓
Calcular distancia desde posición inicial
    ↓
¿Distancia > 2 píxeles?
    │
    ├─ NO: Ignorar (es un click simple)
    │
    └─ SÍ: Iniciar drag
        ├─> isDragging = true
        ├─> Cursor cambia a "grabbing"
        ├─> Actualizar posición del elemento
        └─> Continuar actualizando mientras se mueve
```

**Resultado**: Elemento se mueve suavemente mientras lo arrastras

---

### 3. Soltar el Mouse

```
MOUSE UP
    ↓
¿Estaba en drag?
    │
    ├─ SÍ: Elemento queda en nueva posición
    │
    └─ NO: Elemento queda seleccionado (click simple)
    
Limpiar estado
    ├─> isDragging = false
    ├─> dragElementId = null
    ├─> Cursor vuelve a "grab"
    └─> Elemento permanece seleccionado
```

**Resultado**: Elemento en posición final, seleccionado para editar

---

## Casos de Uso

### Caso 1: Click Simple (Seleccionar)

```
1. MOUSE DOWN en elemento
   └─> Elemento se selecciona
   └─> Se resalta en canvas y capas
   └─> Indicador muestra nombre

2. MOUSE MOVE (sin movimiento real)
   └─> Ignorado (distancia < 2px)

3. MOUSE UP
   └─> Elemento permanece seleccionado
   └─> Listo para editar propiedades
```

**Tiempo**: < 100ms
**Resultado**: Selección clara

---

### Caso 2: Drag (Mover)

```
1. MOUSE DOWN en elemento
   └─> Elemento se selecciona
   └─> Se prepara para drag

2. MOUSE MOVE (con movimiento real)
   └─> Distancia > 2px
   └─> Inicia drag
   └─> Cursor cambia a "grabbing"
   └─> Elemento se escala 105%
   └─> Elemento sigue el cursor

3. MOUSE MOVE (continúa)
   └─> Posición se actualiza continuamente
   └─> Snap to grid (si está activado)

4. MOUSE UP
   └─> Elemento queda en nueva posición
   └─> Cursor vuelve a "grab"
   └─> Elemento permanece seleccionado
```

**Tiempo**: Variable (depende del usuario)
**Resultado**: Elemento movido a nueva posición

---

### Caso 3: Resize (Redimensionar)

```
1. MOUSE DOWN en resize handle
   └─> Elemento se selecciona (NUEVO)
   └─> Se prepara para resize

2. MOUSE MOVE
   └─> Ancho/alto se actualiza
   └─> Elemento se redimensiona

3. MOUSE UP
   └─> Elemento queda con nuevo tamaño
   └─> Elemento permanece seleccionado
```

**Resultado**: Elemento redimensionado, seleccionado

---

### Caso 4: Click en Vacío (Deseleccionar)

```
1. MOUSE DOWN en área vacía del canvas
   └─> onSelectPlacement(null)
   └─> onSelectShape(null)
   └─> Deseleccionar todo

2. Indicadores desaparecen
   └─> Ring verde desaparece
   └─> Fondo verde en capas desaparece
   └─> Indicador en canvas desaparece
```

**Resultado**: Nada seleccionado

---

## Indicadores Visuales

### En el Canvas

**Cuando está seleccionado**:
- Ring verde `ring-emerald-500`
- Sombra `shadow-xl`
- Indicador con nombre del elemento

**Cuando se está arrastrando**:
- Ring verde (permanece)
- Escala 105% (`scale-105`)
- Cursor `grabbing`

**Cuando está bloqueado**:
- Opacidad 60%
- Cursor `not-allowed`

---

### En el Panel de Capas

**Cuando está seleccionado**:
- Fondo verde `from-emerald-50 to-green-50`
- Borde verde `border-emerald-300`
- Ring verde `ring-emerald-200`
- Sombra `shadow-md`

**Banner de confirmación**:
- Fondo verde `from-emerald-100 to-green-100`
- Borde verde 2px
- Icono con bounce animation
- Texto: "✓ Elemento Seleccionado"

---

## Código Clave

### Threshold de Drag

```typescript
const distance = Math.sqrt(dx * dx + dy * dy);
if (distance > 2) {
    // Iniciar drag solo si se movió más de 2 píxeles
    isDraggingRef.current = true;
    setIsDragging(true);
    document.body.style.cursor = 'grabbing';
}
```

**Ventaja**: Evita iniciar drag accidentalmente con clicks simples

---

### Selección en Resize

```typescript
const handleResizeMouseDown = (e, item) => {
    // Asegurar que el elemento está seleccionado
    if ('fieldId' in item) {
        onSelectPlacement(item.id);
    } else {
        onSelectShape(item.id);
    }
    
    // Luego iniciar resize
    isResizingRef.current = true;
    // ...
};
```

**Ventaja**: Elemento siempre está seleccionado cuando se redimensiona

---

### Deselección Correcta

```typescript
const handleCanvasMouseDown = (e) => {
    // Solo actuar si es clic directo en el canvas
    if (e.target !== e.currentTarget) {
        return;
    }
    
    // Deseleccionar
    onSelectPlacement(null);
    onSelectShape(null);
};
```

**Ventaja**: Deselección solo ocurre en área vacía, no en elementos

---

## Ventajas del Nuevo Enfoque

### ✅ Claridad
- Diferencia clara entre selección y movimiento
- Feedback visual en cada paso
- Indicadores en múltiples lugares

### ✅ Precisión
- Threshold de 2px evita drags accidentales
- Selección siempre ocurre al hacer clic
- Deselección solo en área vacía

### ✅ Consistencia
- Mismo comportamiento en todos los casos
- Elemento siempre seleccionado cuando se interactúa
- Indicadores siempre presentes

### ✅ Usabilidad
- Flujo intuitivo y predecible
- Menos confusión entre acciones
- Feedback visual claro

---

## Comparación: Antes vs Después

### Antes (Problemático):
```
Click en elemento
    ↓
Drag se inicia INMEDIATAMENTE
    ↓
¿Movimiento?
    ├─ SÍ: Elemento se mueve
    └─ NO: Elemento se selecciona (confuso)
```

### Después (Correcto):
```
Click en elemento
    ↓
Elemento se SELECCIONA (SIEMPRE)
    ↓
¿Movimiento > 2px?
    ├─ SÍ: Drag se inicia, elemento se mueve
    └─ NO: Elemento permanece seleccionado
```

---

## Resumen

El nuevo enfoque:
1. ✅ **Selecciona siempre** al hacer clic
2. ✅ **Diferencia click de drag** con threshold de 2px
3. ✅ **Selecciona en resize** para consistencia
4. ✅ **Deselecciona correctamente** en área vacía
5. ✅ **Proporciona feedback visual** claro

**Resultado**: Sistema de selección robusto, intuitivo y sin confusiones.
