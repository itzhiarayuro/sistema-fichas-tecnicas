# Verificación Final: Reorganización de Tuberías

## Estado Actual

Se ha implementado la reorganización de tuberías por tipo y orden. El código:

1. ✅ Lee todas las tuberías del Excel
2. ✅ Agrupa por tipo (entrada/salida)
3. ✅ Ordena cada grupo por la columna "orden"
4. ✅ Reconstruye el array en el orden correcto
5. ✅ Imprime logs en la consola para debuggear

## Datos de M700 en tu Excel

**Entradas (7 total):**
- Orden 1: Domiciliaria (sin Ø, sin Z)
- Orden 2: S1138 (Ø=8, Z=0.7860) ← **ENTRADA 2 esperada**
- Orden 3: M701 (Ø=8, Z=2.1450)
- Orden 4: Domiciliaria (sin Ø, sin Z)
- Orden 5: S1137 (Ø=8, Z=0.7310)
- Orden 6: Domiciliaria (sin Ø, sin Z)
- Orden 7: S1136 (Ø=8, Z=0.6270)

**Salidas (1 total):**
- Orden 1: C1130 (Ø=8, Z=2.6466)

## Cómo Verificar

### Paso 1: Sube el Excel

1. Ve a la aplicación
2. Sube el archivo Excel con los datos de M700

### Paso 2: Abre la Consola

- **Chrome/Edge:** F12 → Pestaña "Console"
- **Firefox:** F12 → Pestaña "Consola"

### Paso 3: Busca los Logs

Deberías ver algo como:

```
[ExcelParser] Pozo M700: Reorganizadas 8 tuberías
  [0] Tipo: entrada, Orden: 1, ID: Domiciliaria
  [1] Tipo: entrada, Orden: 2, ID: S1138
  [2] Tipo: entrada, Orden: 3, ID: M701
  [3] Tipo: entrada, Orden: 4, ID: Domiciliaria
  [4] Tipo: entrada, Orden: 5, ID: S1137
  [5] Tipo: entrada, Orden: 6, ID: Domiciliaria
  [6] Tipo: entrada, Orden: 7, ID: S1136
  [7] Tipo: salida, Orden: 1, ID: C1130
```

### Paso 4: Verifica el Orden

**Si ves esto, la reorganización está CORRECTA:**
- `[1]` tiene `Orden: 2, ID: S1138` ← ENTRADA 2 correcta
- `[2]` tiene `Orden: 3, ID: M701` ← ENTRADA 3 correcta
- `[4]` tiene `Orden: 5, ID: S1137` ← ENTRADA 5 correcta

**Si ves algo diferente, hay un problema.**

## Qué Significa Cada Índice

| Índice | Tipo | Orden | ID | Corresponde a |
|--------|------|-------|----|----|
| [0] | entrada | 1 | Domiciliaria | ENTRADA 1 |
| [1] | entrada | 2 | S1138 | ENTRADA 2 |
| [2] | entrada | 3 | M701 | ENTRADA 3 |
| [3] | entrada | 4 | Domiciliaria | ENTRADA 4 |
| [4] | entrada | 5 | S1137 | ENTRADA 5 |
| [5] | entrada | 6 | Domiciliaria | ENTRADA 6 |
| [6] | entrada | 7 | S1136 | ENTRADA 7 |
| [7] | salida | 1 | C1130 | SALIDA 1 |

## Mapeo en el PDF

El generador accede así:

```typescript
'tub_1_*' → tuberias[0] → ENTRADA 1 (Domiciliaria)
'tub_2_*' → tuberias[1] → ENTRADA 2 (S1138) ← Debe mostrar Z=0.7860, Batea=2.8180
'tub_3_*' → tuberias[2] → ENTRADA 3 (M701)
'tub_4_*' → tuberias[3] → ENTRADA 4 (Domiciliaria)
'tub_5_*' → tuberias[4] → ENTRADA 5 (S1137)
'tub_6_*' → tuberias[5] → ENTRADA 6 (Domiciliaria)
'tub_7_*' → tuberias[6] → ENTRADA 7 (S1136)
'sal_1_*' → tuberias[7] → SALIDA 1 (C1130)
```

## Resultado Esperado en el PDF

**ENTRADA 2 debe mostrar:**
- ID: S1138 ✓
- Material: PVC ✓
- Z: 0.7860 ✓
- Estado: Bueno ✓
- Emboquillado: NO ✓
- Batea: 2.8180 ✓

**ENTRADA 3 debe mostrar:**
- ID: M701 ✓
- Material: PVC ✓
- Z: 2.1450 ✓
- Estado: Bueno ✓
- Emboquillado: NO ✓
- Batea: 4.1770 ✓

**ENTRADA 5 debe mostrar:**
- ID: S1137 ✓
- Material: PVC ✓
- Z: 0.7310 ✓
- Estado: Bueno ✓
- Emboquillado: NO ✓
- Batea: 2.7630 ✓

## Si Sigue Mostrando Datos Incorrectos

Si después de verificar los logs, la reorganización está correcta pero el PDF sigue mostrando datos incorrectos, entonces el problema está en:

1. **El diseño tiene fieldIds incorrectos**
   - Verificar que ENTRADA 2 tiene campos `tub_2_*`
   - Verificar que ENTRADA 3 tiene campos `tub_3_*`
   - etc.

2. **El generador de PDF no está usando los fieldIds correctos**
   - Revisar `designBasedPdfGenerator.ts`

## Próximos Pasos

1. Sube el Excel
2. Abre la consola (F12)
3. Comparte los logs exactos que ves
4. Generamos el PDF y verificamos si muestra los datos correctos

Si los logs muestran la reorganización correcta pero el PDF sigue mal, entonces el problema está en el diseño o en el generador, no en el parser.
