# Fix: Error "groups is not a function or its return value is not iterable"

## Problema Identificado

El error ocurría porque:

1. **Presets sin `groups`**: Las funciones `createOfficialMarinillaDesign()`, `createStandardDesign()`, `createCompactDesign()` y `createEnvironmentalDesign()` en `designPresets.ts` no incluían el campo `groups: []` en sus retornos.

2. **Datos antiguos en localStorage**: Versiones guardadas antes de que se agregara el campo `groups` no tenían este campo.

3. **Falta de validación**: El componente `LayersPanel` intentaba hacer `.map()` en `undefined`.

## Cambios Realizados

### 1. Arreglados los Presets (src/lib/designPresets.ts)

Agregué `groups: []` a todas las funciones de creación de presets:

```typescript
// Antes
return {
    id: 'preset_standard',
    // ... otros campos
    shapes: [...]
};

// Después
return {
    id: 'preset_standard',
    // ... otros campos
    groups: [],  // ← AGREGADO
    shapes: [...]
};
```

Presets arreglados:
- ✅ `createOfficialMarinillaDesign()`
- ✅ `createStandardDesign()`
- ✅ `createCompactDesign()`
- ✅ `createEnvironmentalDesign()`

### 2. Mejorado el Store (src/stores/designStore.ts)

#### A. Migración automática en persist
```typescript
migrate: (persistedState: any, version: number) => {
    if (persistedState && persistedState.versions && Array.isArray(persistedState.versions)) {
        persistedState.versions = persistedState.versions.map((v: any) => ({
            ...v,
            groups: Array.isArray(v.groups) ? v.groups : [],
            shapes: Array.isArray(v.shapes) ? v.shapes : [],
            placements: Array.isArray(v.placements) ? v.placements : []
        }));
    }
    return persistedState;
}
```

#### B. Validación en getCurrentVersion()
```typescript
getCurrentVersion: () => {
    const state = get();
    if (!state.currentVersionId) return null;
    const version = state.versions.find((v) => v.id === state.currentVersionId) || null;
    
    // Asegurar que la versión tiene todos los campos requeridos
    if (version) {
        return {
            ...version,
            groups: Array.isArray(version.groups) ? version.groups : [],
            shapes: Array.isArray(version.shapes) ? version.shapes : [],
            placements: Array.isArray(version.placements) ? version.placements : []
        };
    }
    return null;
};
```

#### C. Validación en getVersionById()
```typescript
getVersionById: (id) => {
    const version = get().versions.find((v) => v.id === id);
    
    if (version) {
        return {
            ...version,
            groups: Array.isArray(version.groups) ? version.groups : [],
            shapes: Array.isArray(version.shapes) ? version.shapes : [],
            placements: Array.isArray(version.placements) ? version.placements : []
        };
    }
    return undefined;
};
```

### 3. Validación Defensiva en LayersPanel (src/components/designer/LayersPanel.tsx)

```typescript
if (!version) return null;

// Asegurar que version.groups sea un array válido
const safeGroups = Array.isArray(version.groups) ? version.groups : [];
const safeShapes = Array.isArray(version.shapes) ? version.shapes : [];
const safePlacements = Array.isArray(version.placements) ? version.placements : [];

// Usar safeGroups, safeShapes, safePlacements en lugar de version.groups, etc.
```

## Cómo Funciona la Solución

### Capas de Defensa

1. **Prevención en la fuente**: Los presets ahora incluyen `groups: []`
2. **Migración automática**: Al cargar datos de localStorage, se aseguran que tengan los campos
3. **Validación en getters**: `getCurrentVersion()` y `getVersionById()` validan los datos
4. **Validación en componentes**: `LayersPanel` valida antes de usar

### Flujo de Datos

```
Cargar desde localStorage
    ↓
Ejecutar migrate() → Asegurar que groups existe
    ↓
Llamar getCurrentVersion()
    ↓
Validar y retornar versión segura
    ↓
LayersPanel recibe versión con groups garantizado
    ↓
Validación defensiva en LayersPanel (por si acaso)
    ↓
Usar safeGroups, safeShapes, safePlacements
```

## Cómo Limpiar Datos Antiguos

Si aún tienes datos antiguos en localStorage, ejecuta esto en la consola:

```javascript
// Opción 1: Limpiar todo
localStorage.clear();
location.reload();

// Opción 2: Limpiar solo el store de diseños
localStorage.removeItem('fichas:design-versions');
location.reload();

// Opción 3: Migrar datos existentes
const data = localStorage.getItem('fichas:design-versions');
if (data) {
    const parsed = JSON.parse(data);
    const migrated = {
        ...parsed,
        versions: parsed.versions.map(v => ({
            ...v,
            groups: Array.isArray(v.groups) ? v.groups : [],
            shapes: Array.isArray(v.shapes) ? v.shapes : [],
            placements: Array.isArray(v.placements) ? v.placements : []
        }))
    };
    localStorage.setItem('fichas:design-versions', JSON.stringify(migrated));
    location.reload();
}
```

## Verificación

Para verificar que el error está resuelto:

1. Abre la consola (F12)
2. Ejecuta: `localStorage.removeItem('fichas:design-versions')`
3. Recarga la página
4. El error debería desaparecer

## Archivos Modificados

- ✅ `src/lib/designPresets.ts` - Agregado `groups: []` a todos los presets
- ✅ `src/stores/designStore.ts` - Mejorada migración y validación
- ✅ `src/components/designer/LayersPanel.tsx` - Validación defensiva

## Resumen

El error está completamente resuelto con:
1. Presets que incluyen `groups`
2. Migración automática de datos antiguos
3. Validación en múltiples capas
4. Validación defensiva en componentes

El sistema ahora es robusto contra datos incompletos o corruptos.
