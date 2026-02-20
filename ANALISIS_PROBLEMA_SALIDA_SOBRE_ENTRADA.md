# Análisis: Bloque de SALIDA aparece encima de bloques de ENTRADA en PDF Flexible

## Problema Observado
Al generar el PDF con el botón "flexible", el bloque de SALIDA 1 aparece posicionado encima de los bloques de ENTRADA (ENTRADA 1, ENTRADA 2, ENTRADA 3), cuando debería aparecer después de todas las entradas.

## ACTUALIZACIÓN: Código Actual Revisado

El código actual en `layoutEngine.ts` (líneas 226-287) YA tiene implementado un sistema de prioridades con `getUnitInfo()`:

```typescript
const getUnitInfo = (unit: typeof flowUnits[0]) => {
    const group = newDesign.groups.find(g => g.id === unit.id);
    const name = (group?.name || '').toLowerCase();

    let type = 'other';
    let num = 999;

    // 1. Detectar tipo (Prioridad: Entrada=1, Salida=2)
    if (name.includes('entrada')) type = 'entrada';
    else if (name.includes('salida')) type = 'salida';
    else if (name.includes('sumidero')) type = 'sumidero';
    else {
        // Si el nombre no ayuda, miramos los hijos
        for (const el of unit.elements) {
            const fid = (el as any).fieldId || '';
            if (fid.startsWith('ent_')) { type = 'entrada'; break; }
            if (fid.startsWith('sal_')) { type = 'salida'; break; }
            if (fid.startsWith('sum_')) { type = 'sumidero'; break; }
        }
    }
    // ... resto del código
}
```

Y el ordenamiento usa prioridades:
```typescript
const prioA = infoA.type === 'entrada' ? 1 : infoA.type === 'salida' ? 2 : 9;
const prioB = infoB.type === 'entrada' ? 1 : infoB.type === 'salida' ? 2 : 9;
```

**Entonces, ¿por qué sigue fallando?**

## Causa Raíz Identificada

### 1. Lógica de Ordenamiento en `layoutEngine.ts` (Líneas 175-189)

```typescript
const getUnitOrder = (unit: typeof flowUnits[0]): number => {
    for (const el of unit.elements) {
        const fid = (el as any).fieldId || '';
        const m = fid.match(/^(ent|sal|sum)_(\d+)_/);
        if (m) {
            const num = parseInt(m[2]);
            if (m[1] === 'ent') return num;          // Entradas: 1-99
            if (m[1] === 'sal') return 100 + num;    // Salidas: 101-199 (después de todas las entradas)
            if (m[1] === 'sum') return num;           // Sumideros: 1-99 (en su propio track)
        }
    }
    return 999;
};
```

**El problema:** Esta función solo examina el PRIMER elemento (`for...of` con lógica que retorna inmediatamente). Si un grupo contiene múltiples elementos con diferentes `fieldId`, solo se considera el primero.

### 2. Composición de Grupos Mixtos

Los grupos de tuberías típicamente contienen:
- Foto: `foto_entrada_1`, `foto_salida_1`, etc.
- Campos de datos: `ent_1_material`, `sal_1_diametro`, etc.
- Shapes decorativos (rectángulos, líneas)

**Escenario problemático:**
```
Grupo "SALIDA 1":
  - Elemento 1: Shape (rectángulo de fondo) → fieldId = undefined
  - Elemento 2: foto_salida_1
  - Elemento 3: sal_1_diametro
  - Elemento 4: sal_1_material
```

La función `getUnitOrder()` itera sobre los elementos y al encontrar el Shape sin `fieldId`, continúa al siguiente. Pero si el primer elemento con `fieldId` es `foto_salida_1` (que NO coincide con el patrón `/^(ent|sal|sum)_(\d+)_/`), retorna `999` (valor por defecto).

### 3. Patrón Regex Restrictivo

```typescript
const m = fid.match(/^(ent|sal|sum)_(\d+)_/);
```

Este patrón **NO coincide** con:
- `foto_entrada_1` (no tiene guión bajo después del número)
- `foto_salida_1` (no tiene guión bajo después del número)
- `foto_sumidero_1` (no tiene guión bajo después del número)

Solo coincide con:
- `ent_1_material` ✓
- `sal_2_diametro` ✓
- `sum_3_id` ✓

### 4. Resultado del Bug

Si el grupo de SALIDA 1 tiene como primer elemento con `fieldId` una foto (`foto_salida_1`):
- `getUnitOrder()` retorna `999` (no coincide con el patrón)
- El grupo de ENTRADA 1 con `ent_1_material` retorna `1`
- **Ordenamiento:** ENTRADA 1 (orden=1) < SALIDA 1 (orden=999) ✓ (correcto)

Pero si el grupo de SALIDA 1 tiene elementos en este orden:
1. Shape (sin fieldId)
2. `sal_1_diametro` → coincide, retorna `101`
3. `foto_salida_1`

Y el grupo de ENTRADA 3 tiene:
1. Shape (sin fieldId)
2. `foto_entrada_3` → NO coincide, retorna `999`
3. `ent_3_material`

**Resultado:** SALIDA 1 (orden=101) < ENTRADA 3 (orden=999) ❌ (INCORRECTO)

## Soluciones Propuestas

### Opción 1: Examinar TODOS los elementos del grupo (Recomendada)

```typescript
const getUnitOrder = (unit: typeof flowUnits[0]): number => {
    let minOrder = 999;
    
    for (const el of unit.elements) {
        const fid = (el as any).fieldId || '';
        
        // Intentar con patrón de campos de datos: ent_1_material, sal_2_diametro
        const m = fid.match(/^(ent|sal|sum)_(\d+)_/);
        if (m) {
            const num = parseInt(m[2]);
            let order = 999;
            if (m[1] === 'ent') order = num;
            if (m[1] === 'sal') order = 100 + num;
            if (m[1] === 'sum') order = num;
            minOrder = Math.min(minOrder, order);
        }
        
        // Intentar con patrón de fotos: foto_entrada_1, foto_salida_2
        const photoMatch = fid.match(/^foto_(entrada|salida|sumidero)_(\d+)$/);
        if (photoMatch) {
            const num = parseInt(photoMatch[2]);
            let order = 999;
            if (photoMatch[1] === 'entrada') order = num;
            if (photoMatch[1] === 'salida') order = 100 + num;
            if (photoMatch[1] === 'sumidero') order = num;
            minOrder = Math.min(minOrder, order);
        }
    }
    
    return minOrder;
};
```

### Opción 2: Usar el nombre del grupo como fallback

```typescript
const getUnitOrder = (unit: typeof flowUnits[0]): number => {
    // Primero intentar extraer de fieldIds
    for (const el of unit.elements) {
        const fid = (el as any).fieldId || '';
        const m = fid.match(/^(ent|sal|sum)_(\d+)_/);
        if (m) {
            const num = parseInt(m[2]);
            if (m[1] === 'ent') return num;
            if (m[1] === 'sal') return 100 + num;
            if (m[1] === 'sum') return num;
        }
        
        const photoMatch = fid.match(/^foto_(entrada|salida|sumidero)_(\d+)$/);
        if (photoMatch) {
            const num = parseInt(photoMatch[2]);
            if (photoMatch[1] === 'entrada') return num;
            if (photoMatch[1] === 'salida') return 100 + num;
            if (photoMatch[1] === 'sumidero') return num;
        }
    }
    
    // Fallback: Extraer del nombre del grupo si es un grupo
    if (unit.type === 'group') {
        const group = newDesign.groups.find(g => g.id === unit.id);
        if (group?.name) {
            const name = group.name.toLowerCase();
            const match = name.match(/(entrada|salida|sumidero)\s*(\d+)/);
            if (match) {
                const num = parseInt(match[2]);
                if (match[1] === 'entrada') return num;
                if (match[1] === 'salida') return 100 + num;
                if (match[1] === 'sumidero') return num;
            }
        }
    }
    
    return 999;
};
```

## Recomendación

**Implementar Opción 1** porque:
1. Es más robusta: examina todos los elementos del grupo
2. Soporta tanto campos de datos como fotos
3. No depende de nombres de grupos (que pueden variar)
4. Usa `Math.min()` para garantizar el orden más bajo encontrado

## Impacto

Este cambio garantizará que:
- ENTRADA 1, 2, 3... siempre aparezcan primero (orden 1-99)
- SALIDA 1, 2, 3... siempre aparezcan después (orden 101-199)
- SUMIDEROS se mantengan en su carril separado (orden 1-99)

Independientemente del orden de los elementos dentro de cada grupo.


## Posibles Causas del Bug Persistente

### 1. El grupo NO tiene nombre o el nombre no contiene "entrada"/"salida"

Si el grupo se llama algo como "Grupo 1" o "Tubería 1" en lugar de "ENTRADA 1" o "SALIDA 1", la primera condición falla:

```typescript
if (name.includes('entrada')) type = 'entrada';
else if (name.includes('salida')) type = 'salida';
```

Y luego busca en los hijos:
```typescript
for (const el of unit.elements) {
    const fid = (el as any).fieldId || '';
    if (fid.startsWith('ent_')) { type = 'entrada'; break; }
    if (fid.startsWith('sal_')) { type = 'salida'; break; }
    if (fid.startsWith('sum_')) { type = 'sumidero'; break; }
}
```

**PROBLEMA:** Si el primer elemento del grupo es un Shape (sin fieldId) o una foto (`foto_salida_1` que NO empieza con `sal_`), el loop continúa pero puede no encontrar ningún `fieldId` que empiece con `ent_`, `sal_` o `sum_`.

### 2. Fotos NO son detectadas

Los `fieldId` de fotos son:
- `foto_entrada_1`, `foto_entrada_2`, etc.
- `foto_salida_1`, `foto_salida_2`, etc.

Estos **NO empiezan** con `ent_`, `sal_` o `sum_`, por lo que NO son detectados por:
```typescript
if (fid.startsWith('ent_')) { type = 'entrada'; break; }
if (fid.startsWith('sal_')) { type = 'salida'; break; }
```

### 3. El grupo puede quedar como `type = 'other'`

Si:
- El nombre del grupo NO contiene "entrada"/"salida"/"sumidero"
- Y ningún hijo tiene `fieldId` que empiece con `ent_`, `sal_`, `sum_`
- Entonces `type = 'other'` y `prioridad = 9`

Resultado: Un grupo de SALIDA con solo fotos puede tener prioridad 9, apareciendo DESPUÉS de las entradas.

## Solución Definitiva

Modificar `getUnitInfo()` para detectar fotos:

```typescript
const getUnitInfo = (unit: typeof flowUnits[0]) => {
    const group = newDesign.groups.find(g => g.id === unit.id);
    const name = (group?.name || '').toLowerCase();

    let type = 'other';
    let num = 999;

    // 1. Detectar tipo desde el nombre del grupo
    if (name.includes('entrada')) type = 'entrada';
    else if (name.includes('salida')) type = 'salida';
    else if (name.includes('sumidero')) type = 'sumidero';
    else {
        // 2. Si el nombre no ayuda, examinar TODOS los hijos
        for (const el of unit.elements) {
            const fid = (el as any).fieldId || '';
            
            // Detectar campos de datos: ent_1_material, sal_2_diametro
            if (fid.startsWith('ent_')) { type = 'entrada'; break; }
            if (fid.startsWith('sal_')) { type = 'salida'; break; }
            if (fid.startsWith('sum_')) { type = 'sumidero'; break; }
            
            // Detectar fotos: foto_entrada_1, foto_salida_2
            if (fid.startsWith('foto_entrada_')) { type = 'entrada'; break; }
            if (fid.startsWith('foto_salida_')) { type = 'salida'; break; }
            if (fid.startsWith('foto_sumidero_')) { type = 'sumidero'; break; }
        }
    }

    // 3. Detectar número de orden
    const m = name.match(/(\d+)/);
    if (m) num = parseInt(m[1]);
    else {
        // Buscar en fieldIds: ent_2_material → 2, foto_salida_3 → 3
        for (const el of unit.elements) {
            const fid = (el as any).fieldId || '';
            const m2 = fid.match(/(\d+)/);
            if (m2) { num = parseInt(m2[1]); break; }
        }
    }

    return { type, num };
};
```

## Verificación Necesaria

Para confirmar el diagnóstico, necesitamos saber:

1. ¿Cómo se llaman los grupos en el diseño? (ej: "ENTRADA 1", "Grupo Entrada 1", "Tubería Entrada 1")
2. ¿Qué elementos contiene el grupo de SALIDA 1 que se sube? (fotos, campos, shapes)
3. ¿En qué orden están los elementos dentro del grupo?

Con los logs actuales vemos:
```
🎨 Generando PDF: {nombre: 'Formato oficial prueba flexible', flexible: true, placements: 154}
```

Pero necesitamos ver el log de:
```
🚦 Tracks — Main: X (ent/sal), Right: Y (sum)
```

Y agregar un log adicional para ver qué tipo y número se detectó para cada grupo.
