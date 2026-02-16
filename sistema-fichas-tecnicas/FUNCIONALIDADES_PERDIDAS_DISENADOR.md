# Funcionalidades Perdidas del Diseñador

## Resumen
El usuario reporta que se perdieron funcionalidades clave del diseñador visual que existían anteriormente.

## Funcionalidades que Faltan

### 1. **Agrupación de Capas**
- **Estado Actual**: No existe funcionalidad de agrupación
- **Requerido**: Poder seleccionar múltiples elementos y agruparlos
- **Beneficio**: Organización visual, mover grupos completos juntos

### 2. **Labels Personalizables por Campo**
- **Estado Actual**: Existe `customLabel` en el código pero no hay UI visible para editarlo fácilmente
- **Requerido**: Cada campo debe tener un label personalizable visible en el panel de propiedades
- **Beneficio**: Identificación clara de cada campo sin tener que recordar IDs

### 3. **Selección desde Canvas → Resaltar en Panel de Capas**
- **Estado Actual**: Se puede seleccionar en canvas, pero no hay indicación visual clara en el panel de capas
- **Requerido**: Al hacer clic en un elemento del canvas, debe resaltarse automáticamente en el panel de capas
- **Beneficio**: No perderse buscando qué capa corresponde al elemento seleccionado

### 4. **Selección desde Panel de Capas → Resaltar en Canvas**
- **Estado Actual**: Funciona parcialmente
- **Requerido**: Al hacer clic en una capa, debe resaltarse visualmente en el canvas (scroll automático si está fuera de vista)
- **Beneficio**: Navegación bidireccional intuitiva

## Análisis del Código Actual

### LayersPanel.tsx
✅ Tiene lista de elementos
✅ Muestra selección con `bg-blue-50`
❌ No tiene agrupación
❌ No muestra labels personalizados claramente

### PropertiesPanel.tsx
✅ Tiene campos de geometría
✅ Tiene estilos
❌ No tiene campo visible para editar `customLabel` fácilmente

### DesignCanvas.tsx
✅ Selección funciona
✅ Drag & drop funciona
❌ No hay scroll automático al seleccionar desde capas

## Plan de Implementación

### Fase 1: Labels Personalizables (PRIORIDAD ALTA)
1. Agregar campo de texto en PropertiesPanel para `customLabel`
2. Mostrar el customLabel en LayersPanel en lugar de solo el ID
3. Actualizar FieldsPanel para mostrar sugerencias de labels

### Fase 2: Sincronización Canvas ↔ Capas (PRIORIDAD ALTA)
1. Implementar scroll automático en canvas cuando se selecciona desde LayersPanel
2. Mejorar resaltado visual en LayersPanel cuando se selecciona desde canvas
3. Agregar indicador visual más prominente

### Fase 3: Agrupación de Capas (PRIORIDAD MEDIA)
1. Agregar tipo `GroupElement` al schema
2. Implementar selección múltiple (Ctrl+Click, Shift+Click)
3. Agregar botón "Agrupar" en toolbar
4. Permitir expandir/colapsar grupos en LayersPanel
5. Mover grupos completos en canvas

### Fase 4: Mejoras UX Adicionales
1. Renombrar capas con doble-clic
2. Duplicar elementos (Ctrl+D)
3. Copiar/Pegar entre páginas
4. Atajos de teclado documentados

## Notas Técnicas

### Estructura de Datos para Grupos
```typescript
interface GroupElement {
  id: string;
  type: 'group';
  name: string;
  children: string[]; // IDs de placements/shapes/otros grupos
  isExpanded: boolean;
  isLocked: boolean;
  isVisible: boolean;
  pageNumber: number;
}
```

### Selección Múltiple
- Mantener array de IDs seleccionados en lugar de solo uno
- Actualizar handlers para soportar múltiples elementos
- Agregar bounding box visual para selección múltiple

## Referencias de Usuario
- "cada campo tenia un label personalizable"
- "cada campo se podia seleccionar desde el canvas y me remitia a que capa estaba seleccionado"
- "capas se podian agrupar"
- "asi yo no me perdia y tenia que estar buscando cada campo desde las capas"
