# Análisis: Datos del Excel M700

## Estructura del Excel

### Tuberías de M700

| Fila | ID_tuberia | Tipo | Orden | Ø | Material | Z | Estado | Emboquillado | Batea |
|-----|-----------|------|-------|---|----------|-------|--------|--------------|-------|
| 1 | C1130 | **Salida** | 1 | 8 | PVC | 2.6466 | Bueno | SI | 4.6786 |
| 2 | Domiciliaria | **Entrada** | 6 | - | PVC | - | Bueno | si | 0.0000 |
| 3 | Domiciliaria | **Entrada** | 4 | - | PVC | - | Bueno | si | 0.0000 |
| 4 | Domiciliaria | **Entrada** | 1 | - | PVC | - | Bueno | SI | 0.0000 |
| 5 | M701 | **Entrada** | 3 | 8 | PVC | 2.1450 | Bueno | NO | 4.1770 |
| 6 | S1136 | **Entrada** | 7 | 8 | PVC | 0.6270 | Bueno | NO | 2.6590 |
| 7 | S1137 | **Entrada** | 5 | 8 | PVC | 0.7310 | Bueno | NO | 2.7630 |
| 8 | S1138 | **Entrada** | 2 | 8 | PVC | 0.7860 | Bueno | NO | 2.8180 |

## Análisis del Problema

### Entradas Esperadas (Ordenadas por Orden)

```
ENTRADA 1 → Domiciliaria (Orden=1, Ø=-, Z=-)
ENTRADA 2 → S1138 (Orden=2, Ø=8, Z=0.7860) ← CORRECTO
ENTRADA 3 → M701 (Orden=3, Ø=8, Z=2.1450)
ENTRADA 4 → Domiciliaria (Orden=4, Ø=-, Z=-)
ENTRADA 5 → S1137 (Orden=5, Ø=8, Z=0.7310)
ENTRADA 6 → Domiciliaria (Orden=6, Ø=-, Z=-)
ENTRADA 7 → S1136 (Orden=7, Ø=8, Z=0.6270)
```

### Lo que Muestra el PDF

**ENTRADA 2:**
- ID: C1130 (INCORRECTO - es SALIDA, no entrada)
- Material: PVC ✓
- Z: 2.6466 (INCORRECTO - debería ser 0.7860)
- Emboquillado: SI (INCORRECTO - debería ser NO)
- Batea: 4.6786 (INCORRECTO - debería ser 2.8180)

**ENTRADA 3:**
- ID: Domiciliaria (INCORRECTO - debería ser M701)
- Material: PVC ✓
- Emboquillado: si (INCORRECTO - debería ser NO)
- Batea: 0.0000 (INCORRECTO - debería ser 4.1770)

**ENTRADA 5:**
- ID: M701 (INCORRECTO - debería ser S1137)
- Material: PVC ✓
- Z: 2.1450 (INCORRECTO - debería ser 0.7310)
- Emboquillado: NO ✓
- Batea: 4.1770 (INCORRECTO - debería ser 2.7630)

## El Verdadero Problema

La reorganización está funcionando, pero está mostrando:
- ENTRADA 2 → Datos de la fila 1 (C1130 - SALIDA)
- ENTRADA 3 → Datos de la fila 2 (Domiciliaria - ENTRADA 6)
- ENTRADA 5 → Datos de la fila 5 (M701 - ENTRADA 3)

Esto sugiere que **NO está filtrando por tipo antes de reorganizar**.

## Causa Raíz

La función `reorganizeTuberias()` está:
1. ✓ Agrupando por tipo (entrada/salida)
2. ✓ Ordenando cada grupo por orden
3. ✓ Reconstruyendo el array

**PERO:**

El array final tiene:
```
[0] = Entrada Orden 1 (Domiciliaria)
[1] = Entrada Orden 2 (S1138) ← ENTRADA 2
[2] = Entrada Orden 3 (M701) ← ENTRADA 3
[3] = Entrada Orden 4 (Domiciliaria)
[4] = Entrada Orden 5 (S1137) ← ENTRADA 5
[5] = Entrada Orden 6 (Domiciliaria)
[6] = Entrada Orden 7 (S1136)
[7] = Salida Orden 1 (C1130)
```

Pero el PDF está accediendo a:
```
tub_1_* → tuberias[0] → Entrada 1 ✓
tub_2_* → tuberias[1] → Entrada 2 ✓
tub_3_* → tuberias[2] → Entrada 3 ✓
...
```

**Espera, esto debería estar correcto.**

## Verificación Necesaria

Necesitamos ver los logs de la consola para confirmar:

1. ¿Se está reorganizando correctamente?
2. ¿El array final tiene las entradas en el orden correcto?
3. ¿El PDF está accediendo a los índices correctos?

## Hipótesis

El problema podría ser que:

1. **La reorganización NO se está ejecutando** (los logs no aparecen)
2. **La reorganización se ejecuta pero NO se asigna correctamente** al pozo
3. **El diseño tiene fieldIds incorrectos** (ej: ENTRADA 2 tiene `tub_1_*` en lugar de `tub_2_*`)

## Próximos Pasos

1. **Sube el Excel**
2. **Abre la consola (F12)**
3. **Busca logs como:**
   ```
   [ExcelParser] Pozo M700: Reorganizadas 8 tuberías
     [0] Tipo: entrada, Orden: 1, ID: Domiciliaria
     [1] Tipo: entrada, Orden: 2, ID: S1138
     [2] Tipo: entrada, Orden: 3, ID: M701
     ...
   ```
4. **Comparte los logs exactos que ves**

Si los logs muestran que S1138 está en `[1]` con `Orden: 2`, entonces la reorganización está correcta y el problema está en el diseño.

Si los logs muestran algo diferente, entonces hay un bug en la reorganización.
