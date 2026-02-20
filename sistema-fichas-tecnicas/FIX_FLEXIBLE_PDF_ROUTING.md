# Fix: Routing Correcto para PDF Flexible

## Problema Identificado

El botón "Generar PDF Flexible" en la página de Pozos NO estaba usando el `flexiblePdfGenerator` que contiene la lógica de `applyFlexibleGrid`.

### Código Anterior (Incorrecto)

```typescript
if (isCustom && customDesign) {
    const { generatePdfFromDesign } = await import('@/lib/pdf/designBasedPdfGenerator');
    const result = await generatePdfFromDesign(customDesign, enrichedPozo, { isFlexible });
    // ❌ designBasedPdfGenerator con isFlexible usa lógica de acordeón vieja
}
```

### Código Nuevo (Correcto)

```typescript
if (isCustom && customDesign) {
    let result;
    if (isFlexible) {
        // ✅ Modo Flexible: Usa layoutEngine para reorganizar elementos dinámicamente
        const { generateFlexiblePdf } = await import('@/lib/pdf/flexiblePdfGenerator');
        result = await generateFlexiblePdf(customDesign, enrichedPozo);
    } else {
        // Modo Normal: Usa generador estándar con posiciones fijas
        const { generatePdfFromDesign } = await import('@/lib/pdf/designBasedPdfGenerator');
        result = await generatePdfFromDesign(customDesign, enrichedPozo, { isFlexible: false });
    }
}
```

## Flujo Correcto

1. Usuario hace clic en "Generar PDF Flexible"
2. `page.tsx` detecta `isFlexible: true`
3. Importa `flexiblePdfGenerator`
4. `flexiblePdfGenerator` llama a `applyFlexibleGrid(design, pozo)`
5. `applyFlexibleGrid` usa `getUnitInfo()` con detección de fotos
6. Reorganiza elementos: Entradas → Salidas → Sumideros
7. Pasa diseño optimizado a `designBasedPdfGenerator` con `skipGroupVisibility: true`
8. Genera PDF con orden correcto

## Logs Esperados

Ahora deberías ver en consola:

```
🚀 Iniciando Generación Flexible (Beta)...
📏 Límite de encabezado detectado dinámicamente en: 49mm
🚦 Tracks — Main: 6 (ent/sal), Right: 2 (sum)
📋 Clasificación Main Track:
  - ENTRADA 1: tipo=entrada, num=1
  - ENTRADA 2: tipo=entrada, num=2
  - ENTRADA 3: tipo=entrada, num=3
  - SALIDA 1: tipo=salida, num=1
  - SALIDA 2: tipo=salida, num=2
  - SALIDA 3: tipo=salida, num=3
🎨 Generando PDF: {nombre: '...', flexible: true, placements: 154}
```

## Archivos Modificados

- `src/app/pozos/page.tsx` (líneas 180-195)

## Próximos Pasos

1. Recargar la aplicación
2. Generar PDF Flexible
3. Verificar logs en consola
4. Verificar orden en PDF: ENTRADA 1, 2, 3 → SALIDA 1, 2, 3
5. Si el problema persiste, verificar que los grupos en el diseño tengan nombres correctos o fieldIds detectables
