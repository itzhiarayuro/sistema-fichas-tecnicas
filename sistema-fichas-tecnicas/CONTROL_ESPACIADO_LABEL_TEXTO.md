# Control del Espaciado entre Label y Texto en Campos

## Resumen
El espacio entre el label y el texto de un campo se controla mediante **dos propiedades diferentes** dependiendo de dónde se renderice:

1. **En el Canvas (DesignCanvas.tsx)**: Se usa `mb-0.5` (margin-bottom de Tailwind)
2. **En el PDF (designBasedPdfGenerator.ts)**: Se calcula automáticamente basado en `labelAreaHeight`

## 1. Canvas (Vista del Diseñador)

### Ubicación del Código
**Archivo**: `src/components/designer/DesignCanvas.tsx`
**Línea**: ~620

### Código Actual
```tsx
{placement.showLabel && (
    <div
        className="flex-shrink-0 mb-0.5 flex items-center overflow-hidden"  // ← AQUÍ: mb-0.5
        style={{
            fontWeight: placement.labelFontWeight || 'bold',
            color: placement.labelColor || '#6B7280',
            backgroundColor: placement.labelBackgroundColor || 'transparent',
            padding: placement.labelPadding ? `${placement.labelPadding}px` : 0,
            // ... más estilos
        }}
    >
        <span className="truncate uppercase" style={{
            fontSize: `${(placement.labelFontSize || ((placement.fontSize || 10) * 0.8)) * zoom}px`,
        }}>
            {placement.customLabel || placement.fieldId}
        </span>
    </div>
)}
```

### Cómo Modificar el Espaciado en Canvas

**Opción 1: Cambiar la clase Tailwind**
```tsx
// Reducir espacio (más junto)
className="flex-shrink-0 mb-0 flex items-center overflow-hidden"

// Aumentar espacio
className="flex-shrink-0 mb-1 flex items-center overflow-hidden"
className="flex-shrink-0 mb-2 flex items-center overflow-hidden"
```

**Opción 2: Usar margen personalizado con style**
```tsx
<div
    className="flex-shrink-0 flex items-center overflow-hidden"
    style={{
        marginBottom: '2px',  // ← Control preciso en píxeles
        fontWeight: placement.labelFontWeight || 'bold',
        // ... resto de estilos
    }}
>
```

**Opción 3: Agregar una nueva propiedad al tipo FieldPlacement**
```typescript
// En src/types/fichaDesign.ts
export interface FieldPlacement {
    // ... propiedades existentes
    labelSpacing?: number; // Espaciado entre label y texto en píxeles
}

// Luego en DesignCanvas.tsx
<div
    className="flex-shrink-0 flex items-center overflow-hidden"
    style={{
        marginBottom: `${placement.labelSpacing || 2}px`,
        // ... resto de estilos
    }}
>
```

## 2. PDF (Generación del Documento)

### Ubicación del Código
**Archivo**: `src/lib/pdf/designBasedPdfGenerator.ts`
**Función**: `renderField`
**Línea**: ~352-450

### Código Actual
```typescript
if (placement.showLabel) {
    const labelText = sanitizeTextForPDF(placement.customLabel || placement.fieldId);
    const labelFontSize = placement.labelFontSize || (fontSize * 0.8);
    const labelPadding = placement.labelPadding || 0.5;
    
    // ← AQUÍ: Se calcula el área del label
    labelAreaHeight = (labelFontSize * 0.4) + (labelPadding * 2);
    
    const labelWidthMM = placement.labelWidth || placement.width;
    
    // Renderizar fondo del label
    if (placement.labelBackgroundColor && placement.labelBackgroundColor !== 'transparent') {
        doc.setFillColor(placement.labelBackgroundColor);
        doc.rect(placement.x, placement.y, labelWidthMM, labelAreaHeight, 'F');
    }
    
    // Renderizar texto del label
    doc.setFontSize(labelFontSize);
    doc.setFont(font, (placement.labelFontWeight === 'bold') ? 'bold' : 'normal');
    doc.setTextColor(placement.labelColor || '#6B7280');
    
    const labelAlign = placement.labelAlign || 'left';
    let labelX = placement.x + labelPadding;
    if (labelAlign === 'center') labelX = placement.x + (labelWidthMM / 2);
    if (labelAlign === 'right') labelX = placement.x + labelWidthMM - labelPadding;
    
    doc.text(labelText, labelX, placement.y + labelPadding + (labelFontSize * 0.28), { 
        align: labelAlign, 
        maxWidth: labelWidthMM - (labelPadding * 2) 
    });
    
    // ← AQUÍ: Se reduce la altura disponible para el contenido
    availableContentHeight -= labelAreaHeight;
}

// El contenido se renderiza después, en contentAreaY
const contentAreaY = placement.y + labelAreaHeight;
```

### Cómo Modificar el Espaciado en PDF

El espaciado en el PDF está determinado por `labelAreaHeight`, que se calcula como:

```typescript
labelAreaHeight = (labelFontSize * 0.4) + (labelPadding * 2);
```

**Opción 1: Modificar el multiplicador del fontSize**
```typescript
// Reducir espacio (label más compacto)
labelAreaHeight = (labelFontSize * 0.3) + (labelPadding * 2);

// Aumentar espacio (label más espacioso)
labelAreaHeight = (labelFontSize * 0.5) + (labelPadding * 2);
```

**Opción 2: Agregar un espaciado adicional explícito**
```typescript
const labelSpacing = 0.5; // mm de espacio adicional entre label y texto

labelAreaHeight = (labelFontSize * 0.4) + (labelPadding * 2) + labelSpacing;
```

**Opción 3: Usar la propiedad labelPadding existente**
El `labelPadding` ya existe en `FieldPlacement` y se puede ajustar desde el panel de propiedades:

```typescript
// En StylePicker.tsx o PropertiesPanel.tsx
<input 
    type="number" 
    value={placement.labelPadding || 0.5}
    onChange={(e) => updatePlacement({ labelPadding: parseFloat(e.target.value) })}
    step="0.1"
    min="0"
    max="5"
/>
```

**Opción 4: Agregar una nueva propiedad labelSpacing**
```typescript
// En src/types/fichaDesign.ts
export interface FieldPlacement {
    // ... propiedades existentes
    labelSpacing?: number; // Espaciado adicional entre label y texto en mm (para PDF)
}

// En designBasedPdfGenerator.ts
const labelSpacing = placement.labelSpacing || 0;
labelAreaHeight = (labelFontSize * 0.4) + (labelPadding * 2) + labelSpacing;
```

## 3. Propiedad Actual: Padding Interno

Actualmente, el sistema usa **`padding`** (Padding Interno) que afecta el espacio DENTRO del contenedor del campo completo, no específicamente entre el label y el texto.

```typescript
// En FieldPlacement
padding?: number; // Padding interno del contenedor completo
```

Este padding se aplica a TODO el campo:
- Canvas: `padding: placement.padding ? ${placement.padding}px : '4px'`
- PDF: No se usa directamente para el espaciado label-texto

## 4. Recomendación

Para tener control preciso del espacio entre label y texto, recomiendo:

### Solución Completa

1. **Agregar nueva propiedad al tipo**:
```typescript
// src/types/fichaDesign.ts
export interface FieldPlacement {
    // ... propiedades existentes
    labelSpacing?: number; // Espaciado entre label y texto (px en canvas, mm en PDF)
}
```

2. **Actualizar DesignCanvas.tsx**:
```tsx
{placement.showLabel && (
    <div
        className="flex-shrink-0 flex items-center overflow-hidden"
        style={{
            marginBottom: `${(placement.labelSpacing || 2) * zoom}px`,
            fontWeight: placement.labelFontWeight || 'bold',
            // ... resto de estilos
        }}
    >
```

3. **Actualizar designBasedPdfGenerator.ts**:
```typescript
const labelSpacing = placement.labelSpacing || 0.5; // mm
labelAreaHeight = (labelFontSize * 0.4) + (labelPadding * 2) + labelSpacing;
```

4. **Agregar control en StylePicker.tsx o PropertiesPanel.tsx**:
```tsx
<div>
    <label className="text-[10px] text-gray-600 mb-1 block font-medium">
        Espaciado Label-Texto
    </label>
    <input 
        type="number" 
        value={placement.labelSpacing || 2}
        onChange={(e) => updatePlacement({ labelSpacing: parseFloat(e.target.value) })}
        step="0.5"
        min="0"
        max="10"
        className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs"
    />
</div>
```

## 5. Solución Rápida (Sin Modificar Tipos)

Si solo quieres un cambio rápido sin agregar propiedades nuevas:

### Canvas
```tsx
// Cambiar mb-0.5 por mb-0 o mb-1
className="flex-shrink-0 mb-0 flex items-center overflow-hidden"
```

### PDF
```typescript
// Cambiar el multiplicador de 0.4 a 0.3 (más junto) o 0.5 (más separado)
labelAreaHeight = (labelFontSize * 0.3) + (labelPadding * 2);
```

## Resumen de Valores

| Ubicación | Propiedad Actual | Valor por Defecto | Cómo Modificar |
|-----------|------------------|-------------------|----------------|
| Canvas | `mb-0.5` (Tailwind) | 2px (~0.5rem) | Cambiar clase o usar `marginBottom` en style |
| PDF | `labelAreaHeight` | `(fontSize * 0.4) + (padding * 2)` | Modificar multiplicador o agregar spacing |
| Padding Interno | `padding` | 4px (canvas) / no usado (PDF) | Afecta TODO el campo, no solo label-texto |

## Conclusión

El **Padding Interno** NO controla directamente el espacio entre label y texto. Controla el padding del contenedor completo del campo.

Para controlar el espacio entre label y texto específicamente:
- **Canvas**: Modificar `mb-0.5` en la línea ~620 de DesignCanvas.tsx
- **PDF**: Modificar el cálculo de `labelAreaHeight` en la línea ~380 de designBasedPdfGenerator.ts
