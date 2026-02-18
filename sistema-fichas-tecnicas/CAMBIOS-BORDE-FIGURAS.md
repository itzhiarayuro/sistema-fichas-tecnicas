# Cambios: Reducción de Grosor de Bordes en Figuras

## Problema
Las figuras (shapes) en el canvas tenían bordes muy gruesos, especialmente cuando se hacía zoom. El borde se multiplicaba por el factor de zoom, haciendo que se viera desproporcionado. Además, había inconsistencia entre el PDF generado desde el diseñador (que se veía bien) y el PDF generado desde la página de pozos (que se veía grueso).

## Causa Raíz
- El `pdfMakeGenerator` estaba multiplicando el strokeWidth por 0.264
- La página de pozos usaba `highFidelityGenerator` para diseños personalizados, que tenía diferentes calibraciones
- El diseñador usaba `designBasedPdfGenerator`, que generaba bordes más delgados

## Solución Implementada

### 1. Reducción del strokeWidth por defecto
**Archivo:** `src/components/designer/DesignCanvas.tsx` (línea ~250)
- **Antes:** `strokeWidth: 1`
- **Después:** `strokeWidth: 0.5`
- **Razón:** Un borde de 1px es muy grueso visualmente. 0.5px es más proporcional.

### 2. Remover multiplicación por zoom en shapes
**Archivo:** `src/components/designer/DesignCanvas.tsx` (línea ~380)
- **Antes:** `border: shape.strokeColor ? \`${(shape.strokeWidth || 1) * zoom}px solid ${shape.strokeColor}\` : 'none'`
- **Después:** `border: shape.strokeColor ? \`${shape.strokeWidth || 0.5}px solid ${shape.strokeColor}\` : 'none'`
- **Razón:** El borde no debe multiplicarse por zoom. Debe mantenerse consistente independientemente del nivel de zoom.

### 3. Remover multiplicación por zoom en placements
**Archivo:** `src/components/designer/DesignCanvas.tsx` (línea ~420)
- **Antes:** `border: placement.borderWidth ? \`${placement.borderWidth * zoom}px solid ${placement.borderColor || '#e5e7eb'}\` : '1px solid #e5e7eb'`
- **Después:** `border: placement.borderWidth ? \`${placement.borderWidth}px solid ${placement.borderColor || '#e5e7eb'}\` : '1px solid #e5e7eb'`
- **Razón:** Consistencia con las shapes. El borde debe ser independiente del zoom.

### 4. Remover conversión incorrecta en pdfMakeGenerator
**Archivo:** `src/lib/pdf/pdfMakeGenerator.ts` (línea ~1345)
- **Antes:** `if (shape.strokeWidth) doc.setLineWidth(shape.strokeWidth * 0.264);`
- **Después:** `if (shape.strokeWidth) doc.setLineWidth(shape.strokeWidth);`
- **Razón:** El strokeWidth ya está en mm (no en px), así que no necesita multiplicarse por 0.264.

### 5. Usar designBasedPdfGenerator consistentemente
**Archivo:** `src/app/pozos/page.tsx` (línea ~183)
- **Antes:** Usaba `highFidelityGenerator` para diseños personalizados
- **Después:** Usa `designBasedPdfGenerator` para todos los diseños personalizados
- **Razón:** `designBasedPdfGenerator` genera bordes más consistentes y delgados, igual que el diseñador

## Impacto
- ✅ Los bordes de las figuras ahora son más delgados y proporcionales
- ✅ El zoom no afecta el grosor del borde
- ✅ Consistencia entre el PDF del diseñador y el PDF de la página de pozos
- ✅ El PDF replica automáticamente los cambios del canvas
- ✅ La experiencia visual es más profesional

## Cómo Revertir
Si necesitas volver a los valores anteriores, busca los comentarios `// CAMBIO:` en:
- `DesignCanvas.tsx` (3 cambios)
- `pdfMakeGenerator.ts` (1 cambio)
- `pozos/page.tsx` (1 cambio)

Y restaura los valores originales indicados en los comentarios.

## Pruebas Recomendadas
1. Crear una nueva figura (rectángulo, círculo, etc.) en el designer
2. Verificar que el borde sea delgado en el canvas
3. Hacer zoom in/out y verificar que el borde NO cambie de grosor
4. Generar un PDF desde el Preview del diseñador y verificar que el borde sea consistente
5. Generar un PDF desde la página principal de pozos y verificar que el borde sea idéntico al del diseñador


