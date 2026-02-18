# Limpiar localStorage para Resolver Error de Groups

El error ocurre porque hay versiones antiguas en localStorage que no tienen el campo `groups`.

## Solución Rápida

Abre la consola del navegador (F12) y ejecuta esto:

```javascript
// Opción 1: Limpiar TODO el localStorage
localStorage.clear();
console.log('✅ localStorage limpiado');

// Luego recarga la página
location.reload();
```

## Solución Selectiva (si quieres preservar otros datos)

```javascript
// Opción 2: Limpiar solo el store de diseños
localStorage.removeItem('fichas:design-versions');
console.log('✅ Store de diseños limpiado');

// Luego recarga la página
location.reload();
```

## Verificar el Contenido Actual

```javascript
// Ver qué hay en localStorage
const data = localStorage.getItem('fichas:design-versions');
if (data) {
  const parsed = JSON.parse(data);
  console.log('Versiones actuales:', parsed.versions);
  console.log('Versiones sin groups:', parsed.versions.filter(v => !Array.isArray(v.groups)));
} else {
  console.log('No hay datos en localStorage');
}
```

## Pasos Completos

1. Abre el navegador en la página del designer
2. Abre la consola (F12)
3. Ejecuta: `localStorage.removeItem('fichas:design-versions')`
4. Recarga la página: `location.reload()`
5. El error debería desaparecer

## Si el Error Persiste

Si después de limpiar localStorage el error sigue ocurriendo, significa que el problema está en cómo se crean las versiones. En ese caso:

```javascript
// Ejecuta esto para ver el estado actual del store
const store = window.__ZUSTAND_DEVTOOLS__;
if (store) {
  console.log('Estado del store:', store);
}
```

O verifica en la consola si hay errores adicionales.

## Alternativa: Forzar Migración

Si prefieres no perder datos, puedes forzar la migración:

```javascript
// 1. Obtener datos actuales
const data = localStorage.getItem('fichas:design-versions');
const parsed = JSON.parse(data);

// 2. Migrar cada versión
const migrated = {
  ...parsed,
  versions: parsed.versions.map(v => ({
    ...v,
    groups: Array.isArray(v.groups) ? v.groups : [],
    shapes: Array.isArray(v.shapes) ? v.shapes : [],
    placements: Array.isArray(v.placements) ? v.placements : []
  }))
};

// 3. Guardar datos migrados
localStorage.setItem('fichas:design-versions', JSON.stringify(migrated));
console.log('✅ Datos migrados correctamente');

// 4. Recargar
location.reload();
```

## Verificar que Funcionó

Después de limpiar/migrar, ejecuta esto:

```javascript
const data = localStorage.getItem('fichas:design-versions');
const parsed = JSON.parse(data);
const allHaveGroups = parsed.versions.every(v => Array.isArray(v.groups));
console.log('✅ Todas las versiones tienen groups:', allHaveGroups);
```

Debería mostrar `true`.
