# Verificación: Precisión Milimétrica de Posiciones

## Checklist de Verificación

### 1. Verificar que el Canvas usa Milímetros
- ✓ `MM_TO_PX = 3.78` (correcto para 96 DPI)
- ✓ Conversión: `x = (pixeles) / (3.78 * zoom)`
- ✓ Los valores se guardan en mm

### 2. Verificar que el PDF usa Milímetros
- ✓ jsPDF configurado con `unit: 'mm'`
- ✓ Renderizado: `doc.rect(placement.x, placement.y, ...)`
- ✓ No hay conversiones adicionales

### 3. Verificar que el Diseño se Guarda Correctamente
- ✓ `updatePlacement` hace spread: `{ ...p, ...updates }`
- ✓ Los valores se guardan tal cual

## Pasos para Verificar Precisión

### Paso 1: Crear Elemento de Prueba
1. Abre el diseñador con el diseño "prueba"
2. Coloca un campo en posición exacta (ej: 10mm, 10mm)
3. Anota la posición mostrada en el inspector

### Paso 2: Generar PDF
1. Genera el PDF desde el diseño "prueba"
2. Abre el PDF en un lector que muestre coordenadas

### Paso 3: Medir en el PDF
1. Mide la posición del elemento en el PDF
2. Debe estar exactamente en (10mm, 10mm)

## Posibles Problemas y Soluciones

### Problema: Posiciones no coinciden
**Causa Probable**: Snap to Grid está habilitado
**Solución**: Desactiva "Snap to Grid" en el diseñador

### Problema: Elementos se desplazan en el PDF
**Causa Probable**: Zoom en canvas afecta las coordenadas
**Solución**: Verifica que zoom NO afecta las coordenadas guardadas (está correcto)

### Problema: Tamaños no coinciden
**Causa Probable**: Conversión de unidades incorrecta
**Solución**: Verifica que `MM_TO_PX = 3.78` es correcto

## Código Crítico a Verificar

### En DesignCanvas.tsx
```typescript
const MM_TO_PX = 3.78; // ✓ Correcto
const x = snapValue((e.clientX - rect.left) / (MM_TO_PX * zoom)); // ✓ Correcto
```

### En designBasedPdfGenerator.ts
```typescript
const doc = new jsPDF({
    orientation,
    unit: 'mm', // ✓ Correcto
    format: design.pageSize.toLowerCase() as any,
});

doc.rect(placement.x, placement.y, placement.width, placement.height, style); // ✓ Correcto
```

## Conclusión

El sistema está diseñado correctamente para mantener precisión milimétrica:
- ✓ Canvas usa mm
- ✓ PDF usa mm
- ✓ No hay conversiones innecesarias
- ✓ Las coordenadas se guardan exactamente como se diseñan

**Si las posiciones no coinciden, verifica:**
1. ¿Está habilitado "Snap to Grid"?
2. ¿El zoom está afectando visualmente pero no las coordenadas?
3. ¿El diseño "prueba" se guardó correctamente?
