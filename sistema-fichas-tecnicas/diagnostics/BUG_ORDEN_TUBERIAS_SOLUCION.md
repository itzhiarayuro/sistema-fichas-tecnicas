# BUG: El Sistema Ignora la Columna "Orden" para Determinar Entrada/Salida N

## El Problema

El sistema **debe usar el valor de la columna "Orden"** para determinar qué número de entrada/salida es, pero actualmente **ignora este valor y usa el índice de la fila**.

### Ejemplo del Bug

Tu Excel tiene:

| Fila | ID_Pozo | Tipo_Tuberia | **Orden** | Ø | Material | Z | Estado |
|-----|---------|--------------|----------|---|----------|---|--------|
| 2 | M700 | Entrada | **2** | 8 | PVC | 0.7860 | Bueno |
| 3 | M700 | Salida | 1 | 6 | PVC | 0.5000 | Bueno |

**Comportamiento actual (INCORRECTO):**
- Fila 1 (Orden=2) → Se almacena en `tuberias[0]` → Se renderiza como ENTRADA 1 ❌
- Fila 2 (Orden=1) → Se almacena en `tuberias[1]` → Se renderiza como ENTRADA 2 ❌

**Comportamiento esperado (CORRECTO):**
- Fila 1 (Orden=2) → Debe ser ENTRADA 2 ✓
- Fila 2 (Orden=1) → Debe ser SALIDA 1 ✓

## Dónde Está el Bug

### Ubicación 1: Parser de Excel

**Archivo:** `src/lib/parsers/excelParser.ts`

**Función:** `parseTuberiaRow()` (línea 1150)

```typescript
export function parseTuberiaRow(
  row: Record<string, unknown>, 
  map: Record<string, string>, 
  index: number,  // ← PROBLEMA: Usa el índice de fila, no el valor de "Orden"
  result: ExcelParseResult
): TuberiaInfo | null {
  
  const getValue = (f: string) => getMappedValue(row, f, TUBERIA_MAPPING, map);

  const idPozo = getValue('idPozo');
  if (!idPozo) return null;

  return {
    idTuberia: { value: getValue('idTuberia') || `TUB-${index}`, source: 'excel' },
    idPozo: { value: idPozo, source: 'excel' },
    tipoTuberia: { value: getValue('tipoTuberia'), source: 'excel' },
    orden: { value: getValue('orden'), source: 'excel' },  // ← Se lee pero NO se usa
    diametro: { value: getValue('diametro'), source: 'excel' },
    // ...
  };
}
```

**El problema:** El valor de `orden` se lee pero **no se usa para determinar la posición en el array**.

### Ubicación 2: Generador de PDF

**Archivo:** `src/lib/pdf/designBasedPdfGenerator.ts`

**Problema:** Accede directamente por índice:

```typescript
'tub_1_diametro': 'tuberias.tuberias[0].diametro.value'  // ← Siempre índice 0
'tub_2_diametro': 'tuberias.tuberias[1].diametro.value'  // ← Siempre índice 1
```

No hay lógica que diga: "Si orden=2, entonces usa tub_2_*"

## La Solución Correcta

### Paso 1: Reorganizar Tuberías por Tipo y Orden

Después de parsear todas las tuberías, el sistema debe:

1. **Separar por tipo:**
   - Entradas (tipo_tuberia = "entrada")
   - Salidas (tipo_tuberia = "salida")
   - Sumideros (tipo_tuberia = "sumidero")

2. **Ordenar cada grupo por la columna "Orden":**
   ```
   Entradas ordenadas por orden:
   - Orden 1 → tuberias[0]
   - Orden 2 → tuberias[1]
   - Orden 3 → tuberias[2]
   
   Salidas ordenadas por orden:
   - Orden 1 → tuberias[N]
   - Orden 2 → tuberias[N+1]
   ```

3. **Reconstruir el array:**
   ```
   tuberias = [
     { tipo: "entrada", orden: 1, ... },  // índice 0 → ENTRADA 1
     { tipo: "entrada", orden: 2, ... },  // índice 1 → ENTRADA 2
     { tipo: "salida", orden: 1, ... },   // índice 2 → SALIDA 1
     { tipo: "salida", orden: 2, ... },   // índice 3 → SALIDA 2
   ]
   ```

### Paso 2: Actualizar el Mapeo de Campos

El generador debe saber:
- `tub_1_*` → Primera entrada (orden=1)
- `tub_2_*` → Segunda entrada (orden=2)
- `sal_1_*` → Primera salida (orden=1)
- `sal_2_*` → Segunda salida (orden=2)

### Paso 3: Lógica de Resolución

```typescript
// Pseudocódigo
function resolveFieldValue(fieldId, pozo) {
  if (fieldId.startsWith('tub_')) {
    const num = parseInt(fieldId.split('_')[1]);
    const entradas = pozo.tuberias.filter(t => t.tipo === 'entrada')
                                   .sort((a, b) => a.orden - b.orden);
    return entradas[num - 1];  // tub_1 → índice 0
  }
  
  if (fieldId.startsWith('sal_')) {
    const num = parseInt(fieldId.split('_')[1]);
    const salidas = pozo.tuberias.filter(t => t.tipo === 'salida')
                                  .sort((a, b) => a.orden - b.orden);
    return salidas[num - 1];  // sal_1 → índice 0
  }
}
```

## Resumen del Bug

| Aspecto | Actual (INCORRECTO) | Esperado (CORRECTO) |
|--------|-------------------|-------------------|
| **Determina posición por** | Índice de fila | Valor de columna "Orden" |
| **Entrada 2 se almacena en** | tuberias[1] (fila 2) | tuberias[1] (orden=2) |
| **Resultado en PDF** | Datos incorrectos | Datos correctos |
| **Columna "Orden"** | Se lee pero se ignora | Se usa para ordenar |

## Impacto

Este bug causa que:
- ✗ Los datos se muestren en la entrada/salida incorrecta
- ✗ El PDF no respete el orden lógico del Excel
- ✗ El usuario vea "ENTRADA 7" con datos de "ENTRADA 2"

## Solución Recomendada

Implementar una función de **reorganización de tuberías** que:
1. Agrupe por tipo (entrada/salida/sumidero)
2. Ordene cada grupo por la columna "Orden"
3. Reconstruya el array en el orden correcto
4. Actualice la lógica de resolución de campos en el generador de PDF
