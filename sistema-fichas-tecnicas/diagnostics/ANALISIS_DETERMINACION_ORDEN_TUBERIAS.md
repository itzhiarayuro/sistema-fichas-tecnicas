# Análisis: Cómo se Determina el Orden de Tuberías (Entrada 1, 2, 3...)

## Respuesta Directa

**El sistema NO usa ninguna columna específica para determinar si es Entrada 1, 2, 3, etc.**

En su lugar, **usa el ORDEN DE LAS FILAS en el Excel**.

## Flujo de Procesamiento

### 1. Lectura del Excel

```
Hoja "TUBERIAS" del Excel
↓
Se lee fila por fila (en orden)
↓
Primera fila de datos → Entrada 1 (índice 0)
Segunda fila de datos → Entrada 2 (índice 1)
Tercera fila de datos → Entrada 3 (índice 2)
...
```

### 2. Función que Procesa Tuberías

En `excelParser.ts`, línea 1150:

```typescript
export function parseTuberiaRow(
  row: Record<string, unknown>, 
  map: Record<string, string>, 
  index: number,  // ← ESTE ES EL ÍNDICE DE LA FILA
  result: ExcelParseResult
): TuberiaInfo | null {
  
  const getValue = (f: string) => getMappedValue(row, f, TUBERIA_MAPPING, map);

  const idPozo = getValue('idPozo');
  if (!idPozo) return null;

  return {
    idTuberia: { value: getValue('idTuberia') || `TUB-${index}`, source: 'excel' },
    idPozo: { value: idPozo, source: 'excel' },
    tipoTuberia: { value: getValue('tipoTuberia'), source: 'excel' },
    orden: { value: getValue('orden'), source: 'excel' },  // ← COLUMNA "ORDEN"
    diametro: { value: getValue('diametro'), source: 'excel' },
    material: { value: getValue('material'), source: 'excel' },
    cota: { value: getValue('cota'), source: 'excel' },
    estado: { value: getValue('estado'), source: 'excel' },
    emboquillado: { value: getValue('emboquillado'), source: 'excel' },
    batea: { value: getValue('batea'), source: 'excel' },
    longitud: { value: getValue('longitud'), source: 'excel' },
  };
}
```

### 3. Mapeo de Columnas

El parser busca estas variaciones de nombres para la columna "ORDEN":

```typescript
const TUBERIA_MAPPING: Record<string, string> = {
  'orden': 'orden',
  'orden_tuberia': 'orden',
  // ... otras variaciones
};
```

**Columnas reconocidas:**
- `orden`
- `orden_tuberia`
- `Orden`
- `ORDEN`
- `Orden_Tuberia`
- etc. (normaliza a minúsculas)

## El Problema: Desalineación de Orden

### Escenario Actual

Tu Excel tiene:

| Fila | ID_Pozo | Tipo_Tuberia | Orden | Ø | Material | Z | Estado | Emboquillado | Batea |
|-----|---------|--------------|-------|---|----------|---|--------|--------------|-------|
| 2 | M700 | Entrada | **2** | 8 | PVC | 0.7860 | Bueno | NO | 2.8180 |
| 3 | M700 | Salida | 1 | 6 | PVC | 0.5000 | Bueno | NO | 1.5000 |

**Lo que sucede:**
1. Primera fila (índice 0) → Se convierte en `tuberias[0]` (Entrada 1)
2. Segunda fila (índice 1) → Se convierte en `tuberias[1]` (Entrada 2)

**Pero el campo "Orden" dice:**
- Fila 1: Orden = 2
- Fila 2: Orden = 1

### Cómo se Almacena en el Sistema

```javascript
pozo.tuberias.tuberias = [
  {
    idTuberia: "S1138",
    orden: { value: "2", source: "excel" },  // ← Dice que es orden 2
    diametro: { value: "8", source: "excel" },
    material: { value: "PVC", source: "excel" },
    // ...
  },
  {
    idTuberia: "...",
    orden: { value: "1", source: "excel" },  // ← Dice que es orden 1
    // ...
  }
]
```

### Cómo se Renderiza en el PDF

El generador accede así:

```typescript
'tub_1_diametro': 'tuberias.tuberias[0].diametro.value'  // → 8 (de la fila 1)
'tub_2_diametro': 'tuberias.tuberias[1].diametro.value'  // → 6 (de la fila 2)
```

**Resultado:**
- ENTRADA 1 en PDF → Muestra datos de fila 1 (Orden=2, Ø=8)
- ENTRADA 2 en PDF → Muestra datos de fila 2 (Orden=1, Ø=6)

## La Columna "Orden" es Informativa, No Determinante

La columna **"Orden"** en tu Excel es **solo un campo de datos**, no determina la posición.

**Ejemplo:**
```
Fila 1: Orden = 5  → Se almacena en tuberias[0]
Fila 2: Orden = 1  → Se almacena en tuberias[1]
Fila 3: Orden = 3  → Se almacena en tuberias[2]
```

El sistema **ignora el valor de "Orden"** para determinar la posición. Solo usa **el índice de la fila**.

## Solución

Para que el PDF muestre correctamente:

### Opción 1: Ordenar el Excel por la Columna "Orden"

Ordena tu hoja TUBERIAS por la columna "Orden" ascendente:

| Fila | ID_Pozo | Tipo_Tuberia | Orden | Ø | Material |
|-----|---------|--------------|-------|---|----------|
| 2 | M700 | Entrada | **1** | 6 | PVC |
| 3 | M700 | Entrada | **2** | 8 | PVC |
| 4 | M700 | Salida | **1** | 4 | PVC |

Así:
- Fila 1 (Orden=1) → tuberias[0] → ENTRADA 1 ✓
- Fila 2 (Orden=2) → tuberias[1] → ENTRADA 2 ✓
- Fila 3 (Orden=1) → tuberias[2] → SALIDA 1 ✓

### Opción 2: Usar la Columna "Tipo_Tuberia" para Filtrar

El sistema podría mejorar usando:
1. Filtrar por `tipo_tuberia = "Entrada"`
2. Ordenar por `orden` ascendente
3. Asignar índices secuenciales

Pero actualmente **NO lo hace**.

## Resumen

| Aspecto | Valor |
|--------|-------|
| **Columna que determina Entrada 1, 2, 3** | NINGUNA - usa el orden de filas |
| **Columna "Orden"** | Solo informativa, se almacena como dato |
| **Cómo se asigna índice** | Por posición en el Excel (fila 1 = índice 0) |
| **Problema actual** | El Excel no está ordenado por "Orden" |
| **Solución** | Ordenar el Excel por la columna "Orden" |
