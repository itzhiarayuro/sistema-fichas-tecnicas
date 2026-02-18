# Diagnóstico: Precisión de Posiciones en PDF

## Problema
Las posiciones del diseño "prueba" en el canvas no se respetan exactamente en el PDF generado.

## Análisis de Flujo

### 1. Canvas (DesignCanvas.tsx)
- **Unidad**: Milímetros (mm)
- **Conversión**: `x = snapValue((e.clientX - rect.left) / (MM_TO_PX * zoom))`
  - `MM_TO_PX = 3.78` (1mm = 3.78px a 96 DPI)
  - Divide píxeles por (3.78 * zoom) para obtener mm
- **Almacenamiento**: Se guardan en `placement.x` y `placement.y` en mm
- **Snap to Grid**: Aplica redondeo si está habilitado

### 2. Store (designStore.ts)
- **updatePlacement**: Simplemente hace spread: `{ ...p, ...updates }`
- **Almacenamiento**: Los valores en mm se guardan tal cual

### 3. PDF Generator (designBasedPdfGenerator.ts)
- **Configuración jsPDF**: `unit: 'mm'` ✓
- **Renderizado**: Usa `placement.x`, `placement.y` directamente
- **Fórmula**: `doc.rect(placement.x, placement.y, placement.width, placement.height, style)`

## Verificaciones Necesarias

### ✓ Verificado
1. jsPDF está configurado con `unit: 'mm'`
2. Los valores se guardan en milímetros
3. El renderizado usa las coordenadas directamente

### ⚠️ Posibles Problemas
1. **Zoom en Canvas**: El zoom visual no afecta las coordenadas guardadas (correcto)
2. **Snap to Grid**: Si está habilitado, redondea las posiciones
3. **Conversión de Bordes**: `borderWidth * PX_TO_MM` podría causar imprecisión
4. **Escala de Fuentes**: Las fuentes se multiplican por zoom en canvas pero no en PDF

## Recomendaciones

### Para Garantizar Precisión Milimétrica
1. Desactivar "Snap to Grid" si necesitas precisión exacta
2. Verificar que `MM_TO_PX = 3.78` es correcto para tu DPI
3. Asegurar que no hay transformaciones CSS que afecten el canvas
4. Verificar que el zoom no afecta las coordenadas guardadas

### Verificación Manual
Para verificar que las posiciones son exactas:
1. Coloca un elemento en posición (10, 10) mm en el canvas
2. Genera el PDF
3. Mide en el PDF con una regla digital
4. Debe estar exactamente en (10, 10) mm

## Código Crítico

### Canvas - Cálculo de Posición
```typescript
const x = snapValue((e.clientX - rect.left) / (MM_TO_PX * zoom));
const y = snapValue((e.clientY - rect.top) / (MM_TO_PX * zoom));
```

### PDF - Renderizado
```typescript
doc.rect(placement.x, placement.y, placement.width, placement.height, style);
```

## Estado Actual
- ✓ Flujo de datos es correcto
- ✓ Unidades son consistentes (mm)
- ✓ No hay conversiones innecesarias
- ⚠️ Necesita verificación con diseño "prueba" real
