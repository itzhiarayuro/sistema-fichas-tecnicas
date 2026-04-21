# Problema: Flexible Generator Ignora el Orden de Tuberías

## El Verdadero Problema

Estás usando **`flexiblePdfGenerator.ts`**, no `designBasedPdfGenerator.ts`.

El generador flexible tiene su propia lógica de layout (`layoutEngine.ts`) que:

1. ✅ Detecta grupos técnicos (Entrada, Salida, Sumidero)
2. ❌ **Extrae el número del NOMBRE del grupo, no del valor "Orden" del Excel**
3. ❌ **Ignora la reorganización que hicimos en el parser**

## Cómo Funciona Actualmente

### En layoutEngine.ts (línea ~100):

```typescript
// Extrae número de orden del nombre o de los fieldIds
const nameMatch = name.match(/(\d+)/);
if (nameMatch) {
    num = parseInt(nameMatch[1]);  // ← Extrae de "ENTRADA 2" → 2
} else {
    for (const fid of childFieldIds) {
        const m = fid.match(/(\d+)/);
        if (m) { num = parseInt(m[1]); break; }  // ← Extrae de "tub_2_*" → 2
    }
}
```

**Problema:** Está usando el número del **nombre del grupo** o del **fieldId**, no del **valor de la columna "Orden"** del Excel.

## Flujo Actual

```
Excel (M700):
├─ Entrada Orden=1 (Domiciliaria)
├─ Entrada Orden=2 (S1138) ← Correcto
├─ Entrada Orden=3 (M701)
├─ Entrada Orden=4 (Domiciliaria)
├─ Entrada Orden=5 (S1137)
├─ Entrada Orden=6 (Domiciliaria)
├─ Entrada Orden=7 (S1136)
└─ Salida Orden=1 (C1130)

↓ Parser (reorganiza correctamente)

Sistema:
tuberias[0] = Entrada Orden=1
tuberias[1] = Entrada Orden=2 ← S1138
tuberias[2] = Entrada Orden=3
...

↓ Flexible Generator (ignora el orden)

Layout Engine:
- Detecta grupo "ENTRADA 2" en el diseño
- Extrae número 2 del nombre
- Busca tub_2_* en el diseño
- Accede a tuberias[1] ← CORRECTO por coincidencia

PERO si el diseño tiene "ENTRADA 7" con campos tub_2_*:
- Extrae número 7 del nombre
- Busca tub_2_* en el diseño
- Accede a tuberias[1] ← INCORRECTO
```

## La Solución

El layout engine debe usar el **valor de la columna "Orden"** del Excel, no el número del nombre del grupo.

### Opción A: Pasar el Orden Correcto al Layout Engine

Modificar `flexiblePdfGenerator.ts` para pasar información sobre el orden correcto de las tuberías.

### Opción B: Usar el Generador de Diseño Personalizado

Cambiar a `designBasedPdfGenerator.ts` que respeta el orden correcto.

### Opción C: Desactivar el Generador Flexible

Si no necesitas el layout flexible, usar el generador estándar que ya tiene la reorganización implementada.

## Recomendación

**Usa `designBasedPdfGenerator.ts` en lugar de `flexiblePdfGenerator.ts`** porque:

1. ✅ Ya tiene la reorganización de tuberías implementada
2. ✅ Respeta el valor de la columna "Orden" del Excel
3. ✅ No tiene lógica de layout que interfiera
4. ✅ Genera PDFs con fidelidad 100% al diseño

## Cómo Cambiar

En `src/app/pozos/page.tsx`, busca donde se llama a `generateFlexiblePdf` y cámbialo a `generatePdfFromDesign`.

O en la UI, desactiva la opción "Modo Flexible" si existe.

## Verificación

Si cambias a `designBasedPdfGenerator.ts`, deberías ver en los logs:

```
[ExcelParser] Pozo M700: Reorganizadas 8 tuberías
  [0] Tipo: entrada, Orden: 1, ID: Domiciliaria
  [1] Tipo: entrada, Orden: 2, ID: S1138
  [2] Tipo: entrada, Orden: 3, ID: M701
  ...
```

Y el PDF mostrará:
- ENTRADA 2 → S1138 (Ø=8, Z=0.7860) ✓
- ENTRADA 3 → M701 (Ø=8, Z=2.1450) ✓
- ENTRADA 5 → S1137 (Ø=8, Z=0.7310) ✓
