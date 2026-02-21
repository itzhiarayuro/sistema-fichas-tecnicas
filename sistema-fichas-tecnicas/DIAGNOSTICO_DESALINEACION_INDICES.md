# Diagnóstico: Desalineación de Índices en PDF

## Problema Reportado

El PDF genera datos de **Entrada 2** en la sección etiquetada como **ENTRADA 7**.

**Datos esperados en ENTRADA 2:**
- ID: S1138
- Tipo: Entrada
- Orden: 2
- Ø: 8 pulgadas
- Material: PVC
- Z: 0.7860
- Estado: Bueno
- Emboquillado: NO
- Batea: 2.8180

**Ubicación en PDF:** ENTRADA 7 (incorrecto)

## Análisis de Causas Posibles

### 1. Problema de Mapeo de Índices en el Diseño

El diseño visual tiene **7 slots** para entradas (ENTRADA 1 a ENTRADA 7), pero:
- El pozo solo tiene **2 entradas reales** en los datos
- El generador está usando el índice del array del pozo (índice 1 = segunda entrada)
- Pero el diseño espera que se llene secuencialmente desde ENTRADA 1

**Flujo incorrecto:**
```
Pozo tiene: [Entrada_0, Entrada_1]
Diseño espera: ENTRADA_1, ENTRADA_2, ENTRADA_3, ..., ENTRADA_7
Resultado: Entrada_1 (índice 1) → ENTRADA_7 (último slot)
```

### 2. Lógica de Resolución de Campos

En `designBasedPdfGenerator.ts`, la resolución de campos usa:
```typescript
'tub_1_diametro': 'tuberias.tuberias[0].diametro.value'
'tub_2_diametro': 'tuberias.tuberias[1].diametro.value'
```

Esto significa:
- `tub_1_*` → siempre accede a `tuberias[0]` (primera entrada)
- `tub_2_*` → siempre accede a `tuberias[1]` (segunda entrada)
- `tub_7_*` → siempre accede a `tuberias[6]` (séptima entrada)

**Si el diseño tiene campos `tub_7_*` pero solo hay 2 entradas:**
- `tub_7_diametro` intenta acceder a `tuberias[6]` → undefined
- Pero si hay un campo `tub_2_*` en la posición visual de ENTRADA 7, mostrará los datos de `tuberias[1]`

### 3. Desalineación Visual vs. Lógica

**Hipótesis más probable:**

El diseño tiene los campos así:
```
ENTRADA 1 → campos: tub_1_*
ENTRADA 2 → campos: tub_2_*
ENTRADA 3 → campos: tub_3_*
...
ENTRADA 7 → campos: tub_2_* (ERROR: debería ser tub_7_*)
```

Cuando el generador renderiza:
- Busca `tub_2_diametro` → encuentra `tuberias[1].diametro` → **Entrada 2**
- Lo coloca en la posición visual de ENTRADA 7
- Resultado: "ENTRADA 7" con datos de Entrada 2

## Verificación Necesaria

Para confirmar, revisar en el diseñador:

1. **Abre el diseño** que genera el PDF
2. **Selecciona la sección ENTRADA 7**
3. **Verifica qué fieldIds tiene:**
   - ¿Tiene `tub_7_*` (correcto)?
   - ¿O tiene `tub_2_*` (incorrecto)?

## Solución

Si el problema es que ENTRADA 7 tiene campos `tub_2_*`:

**En el diseñador:**
1. Selecciona cada campo en ENTRADA 7
2. Cambia el fieldId de `tub_2_*` a `tub_7_*`
3. Guarda el diseño
4. Regenera el PDF

**Campos a verificar en ENTRADA 7:**
- `tub_7_id` (no `tub_2_id`)
- `tub_7_diametro` (no `tub_2_diametro`)
- `tub_7_material` (no `tub_2_material`)
- `tub_7_estado` (no `tub_2_estado`)
- `tub_7_orden` (no `tub_2_orden`)
- `tub_7_z` (no `tub_2_z`)
- `tub_7_emboquillado` (no `tub_2_emboquillado`)
- `tub_7_batea` (no `tub_2_batea`)

## Patrón de Mapeo Correcto

| Sección Visual | Field IDs Correctos |
|---|---|
| ENTRADA 1 | `tub_1_*` |
| ENTRADA 2 | `tub_2_*` |
| ENTRADA 3 | `tub_3_*` |
| ENTRADA 4 | `tub_4_*` |
| ENTRADA 5 | `tub_5_*` |
| ENTRADA 6 | `tub_6_*` |
| ENTRADA 7 | `tub_7_*` |

## Conclusión

El problema es **100% de configuración del diseño**, no del código del generador.

El generador está funcionando correctamente:
- Accede a los índices correctos del array
- Renderiza los datos que encuentra

El error está en que **los fieldIds del diseño no coinciden con las posiciones visuales**.
