# Diagnóstico: Reorganización de Tuberías por Orden

## El Problema Reportado

El PDF muestra datos incorrectos en ENTRADA 2:
- **Esperado:** M700, S1138, Entrada, Orden=2, Ø=8, PVC, 0.7860, Bueno, NO, 2.8180
- **Obtenido:** Datos de la segunda fila de la hoja TUBERIAS (sin respetar el orden)

## Análisis

La reorganización está funcionando, pero parece que:

1. **Está reorganizando correctamente por tipo y orden**
2. **Pero el PDF sigue mostrando datos incorrectos**

Esto sugiere que el problema podría estar en:

### Opción A: El Diseño Tiene los FieldIds Incorrectos

Si el diseño tiene:
- ENTRADA 2 → campos `tub_2_*` ✓ (correcto)

Pero los datos que llegan son de la segunda fila sin reorganizar, entonces la reorganización no se está aplicando correctamente.

### Opción B: La Reorganización No Se Está Aplicando

Verificar que:
1. La función `reorganizeTuberias()` se está llamando
2. Se está aplicando DESPUÉS de parsear todas las tuberías de un pozo
3. El resultado se está asignando correctamente: `pozo.tuberias.tuberias = reorganizeTuberias(...)`

### Opción C: Hay Múltiples Pozos y Se Está Confundiendo

Si hay múltiples pozos en el Excel, la reorganización debe aplicarse **por pozo**, no globalmente.

## Verificación Necesaria

Para confirmar qué está pasando, necesitamos ver:

### 1. Estructura del Excel

```
Hoja TUBERIAS:
| ID_Pozo | ID_Tuberia | Tipo_Tuberia | Orden | Ø | Material | Z | Estado | Emboquillado | Batea |
|---------|------------|--------------|-------|---|----------|---|--------|--------------|-------|
| M700    | S1138      | Entrada      | 2     | 8 | PVC      | 0.7860 | Bueno | NO | 2.8180 |
| M700    | ?          | Entrada      | 1     | ? | ?        | ?      | ?     | ?  | ?      |
| M700    | ?          | Salida       | 1     | ? | ?        | ?      | ?     | ?  | ?      |
```

### 2. Datos Después del Parser (Antes de Reorganizar)

```
pozo.tuberias.tuberias = [
  { idTuberia: "S1138", orden: 2, tipo: "entrada", ø: 8, ... },  // índice 0
  { idTuberia: "?", orden: 1, tipo: "entrada", ø: ?, ... },      // índice 1
  { idTuberia: "?", orden: 1, tipo: "salida", ø: ?, ... },       // índice 2
]
```

### 3. Datos Después de Reorganizar (Esperado)

```
pozo.tuberias.tuberias = [
  { idTuberia: "?", orden: 1, tipo: "entrada", ø: ?, ... },      // índice 0 → ENTRADA 1
  { idTuberia: "S1138", orden: 2, tipo: "entrada", ø: 8, ... },  // índice 1 → ENTRADA 2
  { idTuberia: "?", orden: 1, tipo: "salida", ø: ?, ... },       // índice 2 → SALIDA 1
]
```

## Posible Causa

La imagen muestra que ENTRADA 2 tiene:
- Material: PVC ✓
- Emboquillado: si (pero debería ser NO)
- Estado: Bueno ✓
- Batea: 0.0000 (pero debería ser 2.8180)

Esto sugiere que está tomando datos de una fila diferente, posiblemente:
- La segunda fila de la hoja TUBERIAS (sin reorganizar)
- O una entrada diferente que tiene Material=PVC pero otros datos distintos

## Solución

Necesitamos verificar:

1. **¿Se está llamando `reorganizeTuberias()`?**
   - Agregar logs para confirmar

2. **¿Se está aplicando por pozo?**
   - Verificar que cada pozo reorganiza sus propias tuberías

3. **¿El diseño tiene los fieldIds correctos?**
   - ENTRADA 1 → `tub_1_*`
   - ENTRADA 2 → `tub_2_*`

## Próximos Pasos

1. Compartir la estructura completa del Excel (todas las filas de TUBERIAS para M700)
2. Verificar que la reorganización se está ejecutando
3. Confirmar que el diseño tiene los fieldIds correctos
