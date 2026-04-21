# Instrucciones para Debug del PDF Flexible

## Cambios Aplicados

1. ✅ Fix de routing: `page.tsx` ahora usa `flexiblePdfGenerator` cuando `isFlexible: true`
2. ✅ Logs de debug agregados en `layoutEngine.ts`

## Cómo Probar

1. **Recarga la aplicación** (Ctrl+R o F5)
2. Ve a la página de Pozos
3. Selecciona un pozo con datos de tuberías
4. Haz clic en el botón **ámbar** "Generar PDF Flexible"
5. **Abre la consola del navegador** (F12)
6. Busca los siguientes logs:

### Logs Esperados

```
🚀 Iniciando Generación Flexible (Beta)...
📏 Límite de encabezado detectado dinámicamente en: 49mm
🔍 Grupo: "ENTRADA 1" → tipo=entrada, num=1, fieldIds=[foto_entrada_1, ent_1_material, ent_1_diametro]
🔍 Grupo: "ENTRADA 2" → tipo=entrada, num=2, fieldIds=[foto_entrada_2, ent_2_material]
🔍 Grupo: "ENTRADA 3" → tipo=entrada, num=3, fieldIds=[foto_entrada_3, ent_3_material]
🔍 Grupo: "SALIDA 1" → tipo=salida, num=1, fieldIds=[foto_salida_1, sal_1_material]
🚦 Tracks — Main: 4 (ent/sal), Right: 1 (sum)
📋 Clasificación Main Track:
  - ENTRADA 1: tipo=entrada, num=1
  - ENTRADA 2: tipo=entrada, num=2
  - ENTRADA 3: tipo=entrada, num=3
  - SALIDA 1: tipo=salida, num=1
```

## Qué Verificar

### 1. Si NO aparecen los logs 🚀 y 🔍

**Problema:** El código no está usando `flexiblePdfGenerator`

**Solución:** 
- Verifica que el botón ámbar esté llamando a `handleGeneratePDF(undefined, true)`
- Verifica que tengas un diseño personalizado seleccionado (no "standard")

### 2. Si los grupos tienen `tipo=other`

**Problema:** Los nombres de grupos o fieldIds no son detectables

**Ejemplos de logs problemáticos:**
```
🔍 Grupo: "Grupo 1" → tipo=other, num=1, fieldIds=[shape_123, rect_456]
🔍 Grupo: "Tubería A" → tipo=other, num=999, fieldIds=[]
```

**Solución:**
- Los grupos deben tener nombres que incluyan "entrada", "salida" o "sumidero"
- O los elementos dentro deben tener fieldIds como:
  - `foto_entrada_1`, `foto_salida_2`, `foto_sumidero_1`
  - `ent_1_material`, `sal_2_diametro`, `sum_1_id`

### 3. Si SALIDA aparece antes que ENTRADA en el PDF

**Problema:** Los números de orden están mal detectados

**Ejemplo:**
```
🔍 Grupo: "SALIDA 1" → tipo=salida, num=1, fieldIds=[foto_salida_1]
🔍 Grupo: "ENTRADA 3" → tipo=entrada, num=999, fieldIds=[shape_123]
```

**Solución:**
- Asegúrate de que los grupos tengan números en el nombre: "ENTRADA 1", "SALIDA 2"
- O que los fieldIds tengan números: `foto_entrada_3`, `ent_2_material`

## Próximos Pasos

1. Ejecuta la prueba y copia los logs de consola
2. Si el problema persiste, comparte:
   - Los logs completos de consola
   - El archivo JSON del diseño (desde localStorage o exportado)
3. Con esa información podremos ajustar la detección

## Exportar Diseño (Opcional)

Si necesitas compartir el diseño:

1. Abre la consola (F12)
2. Ejecuta:
```javascript
const designs = JSON.parse(localStorage.getItem('ficha-design-versions') || '[]');
const myDesign = designs.find(d => d.name === 'Formato oficial prueba flexible');
console.log(JSON.stringify(myDesign, null, 2));
```
3. Copia el resultado
