# Fix: Detección de Fotos en Layout Flexible

## Problema Resuelto
El bloque de SALIDA aparecía encima de bloques de ENTRADA cuando el grupo contenía principalmente fotos sin campos de datos.

## Causa
La función `getUnitInfo()` en `layoutEngine.ts` solo detectaba campos de datos:
- ✅ `ent_1_material`, `sal_2_diametro` → Detectados
- ❌ `foto_entrada_1`, `foto_salida_2` → NO detectados

Resultado: Grupos con solo fotos quedaban clasificados como `type = 'other'` con prioridad 9, apareciendo después de las entradas.

## Solución Implementada

### Cambio en `getUnitInfo()` (líneas 232-248)

```typescript
// Si el nombre no ayuda, miramos los hijos
for (const el of unit.elements) {
    const fid = (el as any).fieldId || '';
    
    // Detectar campos de datos: ent_1_material, sal_2_diametro
    if (fid.startsWith('ent_')) { type = 'entrada'; break; }
    if (fid.startsWith('sal_')) { type = 'salida'; break; }
    if (fid.startsWith('sum_')) { type = 'sumidero'; break; }
    
    // ✨ NUEVO: Detectar fotos: foto_entrada_1, foto_salida_2, foto_sumidero_3
    if (fid.startsWith('foto_entrada_')) { type = 'entrada'; break; }
    if (fid.startsWith('foto_salida_')) { type = 'salida'; break; }
    if (fid.startsWith('foto_sumidero_')) { type = 'sumidero'; break; }
}
```

### Logs de Debug Agregados

Ahora la consola mostrará:
```
🚦 Tracks — Main: 6 (ent/sal), Right: 2 (sum)
📋 Clasificación Main Track:
  - ENTRADA 1: tipo=entrada, num=1
  - ENTRADA 2: tipo=entrada, num=2
  - ENTRADA 3: tipo=entrada, num=3
  - SALIDA 1: tipo=salida, num=1
  - SALIDA 2: tipo=salida, num=2
  - SALIDA 3: tipo=salida, num=3
```

## Cómo Probar

1. Abre la aplicación y carga un pozo con fotos
2. Ve a la página de Pozos
3. Selecciona un pozo
4. Haz clic en "Generar PDF Flexible"
5. Abre la consola del navegador (F12)
6. Busca los logs que empiezan con 🚦 y 📋
7. Verifica que:
   - Todas las ENTRADAS tienen `tipo=entrada`
   - Todas las SALIDAS tienen `tipo=salida`
   - Los números están correctos
8. Abre el PDF generado
9. Verifica que el orden es:
   - ENTRADA 1, 2, 3... (primero)
   - SALIDA 1, 2, 3... (después)
   - SUMIDEROS en columna derecha

## Resultado Esperado

✅ ENTRADA 1, 2, 3 aparecen primero (prioridad 1)
✅ SALIDA 1, 2, 3 aparecen después (prioridad 2)
✅ Orden correcto independientemente de si el grupo tiene fotos o campos de datos
✅ Protección de encabezado: nada sube de 49mm

## Archivos Modificados

- `src/lib/pdf/layoutEngine.ts` (líneas 232-248, 268-276)

## Commit

```
fix: detectar fotos en clasificación de grupos para layout flexible

- Agrega detección de foto_entrada_, foto_salida_, foto_sumidero_
- Previene que grupos con solo fotos queden como 'other'
- Agrega logs de debug para verificar clasificación
- Garantiza orden correcto: Entradas → Salidas → Sumideros
```
