# Guía: Precisión Milimétrica en Diseño y PDF

## Resumen Ejecutivo

El sistema está diseñado para mantener **precisión milimétrica exacta** entre el canvas del diseñador y el PDF generado. Las posiciones que colocas en el diseño "prueba" se respetarán exactamente en el PDF.

## Cómo Funciona

### 1. Canvas (Diseñador)
- **Unidad de almacenamiento**: Milímetros (mm)
- **Conversión visual**: `píxeles = mm × 3.78 × zoom`
- **Almacenamiento**: Las coordenadas se guardan SIEMPRE en mm, sin zoom

### 2. PDF
- **Unidad de jsPDF**: Milímetros (mm)
- **Renderizado**: Usa directamente las coordenadas en mm
- **Resultado**: Posiciones exactas al milímetro

## Verificación de Precisión

### Paso 1: Colocar un Elemento
1. Abre el diseñador con el diseño "prueba"
2. Arrastra un campo al canvas
3. Anota la posición exacta (ej: X=10mm, Y=20mm)

### Paso 2: Generar PDF
1. Haz clic en "Generar PDF"
2. Descarga el PDF

### Paso 3: Medir en el PDF
1. Abre el PDF en Adobe Acrobat o similar
2. Usa la herramienta de medición
3. Verifica que el elemento está exactamente en (10mm, 20mm)

## Factores que NO Afectan la Precisión

✓ **Zoom en el canvas**: Solo afecta la visualización, no las coordenadas guardadas
✓ **Snap to Grid**: Si está desactivado, no redondea las posiciones
✓ **Escala visual**: El zoom no afecta los valores guardados

## Factores que SÍ Afectan la Precisión

⚠️ **Snap to Grid habilitado**: Redondea las posiciones al tamaño de grid
⚠️ **Conversión de unidades incorrecta**: Si `MM_TO_PX ≠ 3.78`
⚠️ **Transformaciones CSS**: No debería haber, pero verifica

## Código Crítico

### Conversión de Píxeles a Milímetros (Canvas)
```typescript
const MM_TO_PX = 3.78; // 1mm = 3.78px a 96 DPI
const x = snapValue((e.clientX - rect.left) / (MM_TO_PX * zoom));
const y = snapValue((e.clientY - rect.top) / (MM_TO_PX * zoom));
// Resultado: x, y en milímetros
```

### Renderizado en PDF
```typescript
const doc = new jsPDF({
    unit: 'mm', // ✓ Unidad en milímetros
    format: 'A4'
});

doc.rect(placement.x, placement.y, placement.width, placement.height);
// placement.x, placement.y están en mm
```

## Troubleshooting

### Problema: Las posiciones no coinciden exactamente
**Solución 1**: Desactiva "Snap to Grid"
**Solución 2**: Verifica que el zoom no está afectando (no debería)
**Solución 3**: Recarga la página y vuelve a intentar

### Problema: El PDF se ve diferente al canvas
**Causa**: Esto es normal debido a:
- Diferencias de renderizado entre navegador y PDF
- Fuentes diferentes
- Escala de pantalla vs escala de impresión

**Solución**: Las posiciones son exactas, pero la apariencia visual puede variar

### Problema: Los elementos se desplazan en el PDF
**Causa**: Probablemente hay un problema con el diseño guardado
**Solución**: 
1. Verifica que el diseño "prueba" se guardó correctamente
2. Recarga el diseño
3. Vuelve a generar el PDF

## Recomendaciones

1. **Desactiva Snap to Grid** si necesitas precisión exacta
2. **Usa zoom 100%** en el canvas para mejor precisión visual
3. **Verifica las posiciones** antes de generar el PDF
4. **Guarda el diseño** regularmente

## Confirmación de Precisión

✓ El sistema está diseñado para precisión milimétrica
✓ Las coordenadas se guardan en mm
✓ El PDF usa mm como unidad
✓ No hay conversiones innecesarias
✓ Las posiciones se respetan exactamente

**Conclusión**: Puedes confiar en que las posiciones del diseño "prueba" se respetarán exactamente en el PDF generado.
