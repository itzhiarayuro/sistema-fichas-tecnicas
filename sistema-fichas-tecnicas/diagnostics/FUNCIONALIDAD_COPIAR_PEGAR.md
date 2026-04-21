# Funcionalidad de Copiar/Pegar en el Canvas

## Atajos de Teclado Implementados

### Copiar (Ctrl+C / Cmd+C)
- Selecciona un campo o figura en el canvas
- Presiona `Ctrl+C` (Windows/Linux) o `Cmd+C` (Mac)
- El elemento queda copiado en memoria

### Pegar (Ctrl+V / Cmd+V)
- Después de copiar un elemento
- Presiona `Ctrl+V` (Windows/Linux) o `Cmd+V` (Mac)
- El elemento se pega con un offset de 5mm (para que no quede encima del original)
- El nuevo elemento queda automáticamente seleccionado

### Duplicar Rápido (Ctrl+D / Cmd+D)
- Selecciona un campo o figura
- Presiona `Ctrl+D` (Windows/Linux) o `Cmd+D` (Mac)
- Duplica instantáneamente el elemento con offset de 5mm
- El duplicado queda seleccionado

## Características

✅ Funciona con campos (placements) y figuras (shapes)
✅ Mantiene todas las propiedades del elemento original (estilos, tamaños, colores, etc.)
✅ Offset automático de 5mm para evitar superposición
✅ El elemento duplicado se selecciona automáticamente
✅ Respeta el z-index (el nuevo elemento aparece encima)
✅ No interfiere con inputs de texto (solo funciona cuando el canvas está activo)

## Flujo de Trabajo Recomendado

1. **Crear un campo base** con los estilos deseados
2. **Duplicar con Ctrl+D** para crear variaciones rápidas
3. **Ajustar posición** con las flechas del teclado
4. **Modificar propiedades** en el panel de estilos

## Cambios Técnicos

- `addPlacement()` y `addShape()` ahora retornan el ID del nuevo elemento
- Estado `copiedElement` mantiene el elemento en memoria
- Offset de 5mm aplicado automáticamente al pegar/duplicar
