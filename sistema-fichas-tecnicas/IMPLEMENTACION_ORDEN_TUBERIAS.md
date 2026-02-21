# Implementación: Reorganización de Tuberías por Orden

## Cambios Realizados

Se ha implementado la lógica para reorganizar tuberías y sumideros según el valor de la columna "Orden" en lugar del orden de las filas del Excel.

### Archivo Modificado

**`src/lib/parsers/excelParser.ts`**

## Funciones Agregadas

### 1. `reorganizeTuberias(tuberias: TuberiaInfo[]): TuberiaInfo[]`

**Ubicación:** Línea ~1180

**Responsabilidad:**
- Agrupa tuberías por tipo (entrada/salida)
- Ordena cada grupo por la columna "orden"
- Reconstruye el array en el orden correcto

**Lógica:**
```typescript
1. Normaliza tipos de tubería (entrada, salida, etc.)
2. Agrupa por tipo en un objeto: { entrada: [...], salida: [...] }
3. Ordena cada grupo por orden ascendente
4. Reconstruye: primero entradas, luego salidas, luego otros
```

**Resultado:**
```
Entrada con Orden=1 → tuberias[0]
Entrada con Orden=2 → tuberias[1]
Salida con Orden=1 → tuberias[2]
Salida con Orden=2 → tuberias[3]
```

### 2. `reorganizeSumideros(sumideros: SumideroInfo[]): SumideroInfo[]`

**Ubicación:** Línea ~1220

**Responsabilidad:**
- Ordena sumideros por la columna "numeroEsquema"
- Asegura secuencia correcta

**Lógica:**
```typescript
1. Ordena por numeroEsquema ascendente
2. Sumidero con Esquema=1 → sumideros[0]
3. Sumidero con Esquema=2 → sumideros[1]
```

## Integración en el Parser

### Después de Parsear Tuberías

**Ubicación:** Línea ~1095

```typescript
// Reorganizar tuberías por tipo y orden para cada pozo
pozosMap.forEach(pozo => {
  pozo.tuberias.tuberias = reorganizeTuberias(pozo.tuberias.tuberias);
});
```

### Después de Parsear Sumideros

**Ubicación:** Línea ~1120

```typescript
// Reorganizar sumideros por orden para cada pozo
pozosMap.forEach(pozo => {
  pozo.sumideros.sumideros = reorganizeSumideros(pozo.sumideros.sumideros);
});
```

## Flujo Completo

### Antes (INCORRECTO)

```
Excel (Hoja TUBERIAS):
Fila 1: Orden=2, Tipo=Entrada, Ø=8
Fila 2: Orden=1, Tipo=Entrada, Ø=6

↓ Parser (ignoraba "Orden")

Sistema:
tuberias[0] = { orden: 2, ø: 8 }  ← Entrada 1 (INCORRECTO)
tuberias[1] = { orden: 1, ø: 6 }  ← Entrada 2 (INCORRECTO)

↓ PDF

ENTRADA 1: Ø=8 (debería ser Ø=6)
ENTRADA 2: Ø=6 (debería ser Ø=8)
```

### Después (CORRECTO)

```
Excel (Hoja TUBERIAS):
Fila 1: Orden=2, Tipo=Entrada, Ø=8
Fila 2: Orden=1, Tipo=Entrada, Ø=6

↓ Parser + reorganizeTuberias()

Sistema:
tuberias[0] = { orden: 1, ø: 6 }  ← Entrada 1 (CORRECTO)
tuberias[1] = { orden: 2, ø: 8 }  ← Entrada 2 (CORRECTO)

↓ PDF

ENTRADA 1: Ø=6 ✓
ENTRADA 2: Ø=8 ✓
```

## Casos de Uso

### Caso 1: Entradas Desordenadas

```
Excel:
Orden=3, Tipo=Entrada
Orden=1, Tipo=Entrada
Orden=2, Tipo=Entrada

Resultado:
tuberias[0] = Orden 1
tuberias[1] = Orden 2
tuberias[2] = Orden 3
```

### Caso 2: Entradas y Salidas Mezcladas

```
Excel:
Orden=2, Tipo=Entrada
Orden=1, Tipo=Salida
Orden=1, Tipo=Entrada
Orden=2, Tipo=Salida

Resultado:
tuberias[0] = Entrada Orden 1
tuberias[1] = Entrada Orden 2
tuberias[2] = Salida Orden 1
tuberias[3] = Salida Orden 2
```

### Caso 3: Sumideros

```
Excel:
Esquema=3
Esquema=1
Esquema=2

Resultado:
sumideros[0] = Esquema 1
sumideros[1] = Esquema 2
sumideros[2] = Esquema 3
```

## Validación

✅ No hay errores de compilación
✅ Las funciones son robustas (manejan arrays vacíos)
✅ Normalización de tipos de tubería
✅ Ordenamiento ascendente por orden/esquema

## Próximos Pasos

1. Probar con un Excel que tenga tuberías desordenadas
2. Verificar que el PDF muestre los datos en el orden correcto
3. Confirmar que ENTRADA 1 tiene Orden=1, ENTRADA 2 tiene Orden=2, etc.

## Resumen

La lógica ahora:
- ✓ Lee la columna "Orden" del Excel
- ✓ Agrupa por tipo (entrada/salida)
- ✓ Ordena cada grupo por orden ascendente
- ✓ Reconstruye el array en el orden correcto
- ✓ Asegura que Orden=N → índice N-1
