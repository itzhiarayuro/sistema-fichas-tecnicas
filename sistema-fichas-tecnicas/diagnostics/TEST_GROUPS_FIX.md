# Test: Verificar que el Fix de Groups Funciona

## Pasos para Probar

### 1. Limpiar localStorage
Abre la consola (F12) y ejecuta:

```javascript
localStorage.removeItem('fichas:design-versions');
console.log('✅ localStorage limpiado');
```

### 2. Recargar la página
```javascript
location.reload();
```

### 3. Verificar que los presets se cargan correctamente
En la consola, ejecuta:

```javascript
// Esperar a que el store se cargue (1-2 segundos)
setTimeout(() => {
    const store = window.__ZUSTAND_DEVTOOLS__ || {};
    console.log('Store cargado');
}, 2000);
```

### 4. Verificar que las versiones tienen groups
```javascript
// Ejecutar después de que la página esté completamente cargada
setTimeout(() => {
    const data = localStorage.getItem('fichas:design-versions');
    if (data) {
        const parsed = JSON.parse(data);
        console.log('Versiones cargadas:', parsed.versions.length);
        
        // Verificar que todas tienen groups
        const allHaveGroups = parsed.versions.every(v => Array.isArray(v.groups));
        console.log('✅ Todas las versiones tienen groups:', allHaveGroups);
        
        // Mostrar detalles
        parsed.versions.forEach(v => {
            console.log(`- ${v.name}: groups=${Array.isArray(v.groups) ? v.groups.length : 'FALTA'}`);
        });
    } else {
        console.log('❌ No hay datos en localStorage');
    }
}, 3000);
```

### 5. Verificar que LayersPanel no da error
- Haz clic en un elemento del canvas
- Verifica que el panel de capas se actualiza sin errores
- Abre la consola y verifica que no hay errores rojos

### 6. Test Completo en Consola

Copia y pega esto en la consola para un test completo:

```javascript
console.log('🧪 Iniciando test de groups...');

// Test 1: Verificar localStorage
setTimeout(() => {
    const data = localStorage.getItem('fichas:design-versions');
    if (!data) {
        console.log('❌ Test 1 FALLÓ: No hay datos en localStorage');
        return;
    }
    
    const parsed = JSON.parse(data);
    console.log('✅ Test 1 PASÓ: Datos en localStorage');
    
    // Test 2: Verificar que todas las versiones tienen groups
    const allHaveGroups = parsed.versions.every(v => Array.isArray(v.groups));
    if (!allHaveGroups) {
        console.log('❌ Test 2 FALLÓ: No todas las versiones tienen groups');
        parsed.versions.forEach(v => {
            if (!Array.isArray(v.groups)) {
                console.log(`  - ${v.name}: groups=${v.groups}`);
            }
        });
        return;
    }
    console.log('✅ Test 2 PASÓ: Todas las versiones tienen groups');
    
    // Test 3: Verificar que todas tienen shapes y placements
    const allHaveShapes = parsed.versions.every(v => Array.isArray(v.shapes));
    const allHavePlacements = parsed.versions.every(v => Array.isArray(v.placements));
    
    if (!allHaveShapes || !allHavePlacements) {
        console.log('❌ Test 3 FALLÓ: Faltan shapes o placements');
        return;
    }
    console.log('✅ Test 3 PASÓ: Todas las versiones tienen shapes y placements');
    
    // Test 4: Verificar estructura de datos
    const firstVersion = parsed.versions[0];
    console.log('✅ Test 4 PASÓ: Estructura de datos:');
    console.log(`  - Versión: ${firstVersion.name}`);
    console.log(`  - Groups: ${firstVersion.groups.length}`);
    console.log(`  - Shapes: ${firstVersion.shapes.length}`);
    console.log(`  - Placements: ${firstVersion.placements.length}`);
    
    console.log('\n✅ TODOS LOS TESTS PASARON');
}, 3000);
```

## Resultados Esperados

### Si todo funciona correctamente:
```
✅ Test 1 PASÓ: Datos en localStorage
✅ Test 2 PASÓ: Todas las versiones tienen groups
✅ Test 3 PASÓ: Todas las versiones tienen shapes y placements
✅ Test 4 PASÓ: Estructura de datos:
  - Versión: Formato Oficial Marinilla
  - Groups: 0
  - Shapes: 12
  - Placements: 18

✅ TODOS LOS TESTS PASARON
```

### Si algo falla:
- Verifica que los cambios en `designPresets.ts` se guardaron correctamente
- Verifica que no hay errores de sintaxis en los archivos modificados
- Limpia el navegador cache (Ctrl+Shift+Delete)
- Intenta en una ventana privada/incógnito

## Prueba Manual

1. Abre la página del designer
2. Verifica que se cargan los presets sin errores
3. Haz clic en un elemento del canvas
4. Verifica que el panel de capas se actualiza correctamente
5. Abre la consola y verifica que no hay errores rojos

## Troubleshooting

### Error: "Cannot read property 'map' of undefined"
- Limpia localStorage: `localStorage.clear()`
- Recarga la página
- Verifica que los presets tienen `groups: []`

### Error: "groups is not a function"
- Verifica que `groups` es un array: `Array.isArray(version.groups)`
- Revisa que la migración se ejecutó correctamente

### LayersPanel no se actualiza
- Verifica que `selectedPlacementId` o `selectedShapeId` cambian
- Revisa que el ref se asigna correctamente
- Abre la consola y busca logs de debug

## Logs de Debug

Si necesitas más información, agrega estos logs temporales:

```javascript
// En LayersPanel.tsx
console.log('🔴 LayersPanel render - version:', version);
console.log('🔴 safeGroups:', safeGroups);
console.log('🔴 safeShapes:', safeShapes);
console.log('🔴 safePlacements:', safePlacements);
```

## Conclusión

Si todos los tests pasan, el error está completamente resuelto y el sistema está listo para usar.
