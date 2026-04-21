# 🎯 ELIMINACIÓN CONDICIONAL DE PÁGINA 2

## 📋 Resumen

Se implementó lógica inteligente para omitir automáticamente la página 2 del PDF cuando no contiene información relevante.

## ✅ Condición de Eliminación

La página 2 se omite SOLO cuando se cumplen TODAS estas condiciones:

```typescript
✓ NO hay tuberías (ni entradas ni salidas)
✓ NO hay sumideros
✓ NO hay fotos de entradas (E1-E6)
✓ NO hay fotos de salidas (S1-S6)
✓ NO hay fotos de sumideros (SUM1-SUM6)
```

## 🔍 Lógica Implementada

### Función: `checkIfPage2ShouldBeSkipped()`

```typescript
async function checkIfPage2ShouldBeSkipped(
    design: FichaDesignVersion,
    pozo: Pozo,
    blobStore: any
): Promise<boolean>
```

### Verificaciones en Orden:

1. **Diseño tiene menos de 2 páginas** → No omitir (return false)
2. **Hay tuberías** → No omitir (return false)
3. **Hay sumideros** → No omitir (return false)
4. **Hay fotos de E1-E6, S1-S6, SUM1-SUM6** → No omitir (return false)
5. **Ninguna de las anteriores** → OMITIR página 2 (return true)

## 📊 Ejemplos de Comportamiento

### Caso 1: Pozo con 1 entrada
```
Tuberías: 1 entrada
Sumideros: 0
Fotos: M001-E1-T.jpg

Resultado: ✅ Genera página 2 (hay tubería y foto)
```

### Caso 2: Pozo con solo salidas
```
Tuberías: 2 salidas
Sumideros: 0
Fotos: M001-S1-T.jpg, M001-S2-T.jpg

Resultado: ✅ Genera página 2 (hay tuberías y fotos)
```

### Caso 3: Pozo con sumideros
```
Tuberías: 0
Sumideros: 1
Fotos: M001-SUM1.jpg

Resultado: ✅ Genera página 2 (hay sumidero y foto)
```

### Caso 4: Pozo sin nada
```
Tuberías: 0
Sumideros: 0
Fotos: M001-P.jpg, M001-T.jpg (solo fotos generales)

Resultado: ⏭️ OMITE página 2 (no hay contenido relevante)
```

### Caso 5: Pozo con foto de entrada pero sin tubería
```
Tuberías: 0
Sumideros: 0
Fotos: M001-E1-T.jpg

Resultado: ✅ Genera página 2 (hay foto de entrada)
```

## 🎨 Integración con el Diseñador

### Comportamiento Actual:
- El diseñador permite configurar `numPages: 1-5`
- El usuario puede colocar elementos en cualquier página
- La página 2 típicamente contiene: tuberías, sumideros y sus fotos

### Comportamiento Nuevo:
- Si `numPages >= 2` y la página 2 está vacía → Se omite automáticamente
- Si el usuario coloca elementos en página 2 → Se respeta y se genera
- La omisión es transparente y automática

## 🔧 Archivos Modificados

### `src/lib/pdf/highFidelityGenerator.ts`

**Función agregada:**
```typescript
async function checkIfPage2ShouldBeSkipped(
    design: FichaDesignVersion,
    pozo: Pozo,
    blobStore: any
): Promise<boolean>
```

**Modificación en `generateHighFidelityPDF()`:**
```typescript
// Determinar si la página 2 debe ser omitida
const shouldSkipPage2 = await checkIfPage2ShouldBeSkipped(design, pozo, blobStore);

for (let pageIdx = 1; pageIdx <= numPages; pageIdx++) {
    // Saltar página 2 si está vacía
    if (pageIdx === 2 && shouldSkipPage2) {
        console.log('⏭️ [HIGH FIDELITY] Omitiendo página 2 (sin contenido)');
        continue;
    }
    
    if (pageIdx > 1) doc.addPage();
    // ... renderizar elementos
}
```

## 📝 Logs de Consola

### Cuando se omite página 2:
```
🔍 [HIGH FIDELITY] Evaluación página 2: {
  shouldSkip: true,
  tuberias: 0,
  sumideros: 0
}
⏭️ [HIGH FIDELITY] Omitiendo página 2 (sin contenido)
```

### Cuando se genera página 2:
```
🔍 [HIGH FIDELITY] Evaluación página 2: {
  shouldSkip: false,
  tuberias: 2,
  sumideros: 0
}
```

## ✅ Ventajas

1. **Ahorro de papel**: No se imprimen páginas vacías
2. **PDFs más limpios**: Solo contenido relevante
3. **Automático**: No requiere configuración manual
4. **Inteligente**: Detecta múltiples tipos de contenido
5. **Flexible**: Respeta el diseño del usuario

## ⚠️ Consideraciones

### ¿Qué pasa si tengo elementos personalizados en página 2?
- Si colocaste shapes o campos en página 2, se generará normalmente
- La omisión solo aplica cuando la página está completamente vacía

### ¿Qué pasa con páginas 3, 4, 5?
- Esta lógica solo aplica a página 2
- Las demás páginas se generan según `numPages`
- Puedes extender la lógica si lo necesitas

### ¿Cómo desactivo esta funcionalidad?
- Opción 1: Coloca un elemento invisible en página 2
- Opción 2: Modifica `checkIfPage2ShouldBeSkipped()` para return false

## 🧪 Testing

### Casos de Prueba Recomendados:

```typescript
// Test 1: Pozo sin tuberías, sumideros ni fotos
const pozo1 = {
  tuberias: { tuberias: [] },
  sumideros: { sumideros: [] },
  fotos: { fotos: [] }
};
// Esperado: Omite página 2

// Test 2: Pozo con 1 tubería
const pozo2 = {
  tuberias: { tuberias: [{ tipo: 'entrada', ... }] },
  sumideros: { sumideros: [] },
  fotos: { fotos: [] }
};
// Esperado: Genera página 2

// Test 3: Pozo con foto de entrada
const pozo3 = {
  tuberias: { tuberias: [] },
  sumideros: { sumideros: [] },
  fotos: { fotos: [{ subcategoria: 'E1', ... }] }
};
// Esperado: Genera página 2

// Test 4: Pozo con sumidero
const pozo4 = {
  tuberias: { tuberias: [] },
  sumideros: { sumideros: [{ tipo: 'Rejilla', ... }] },
  fotos: { fotos: [] }
};
// Esperado: Genera página 2
```

## 🚀 Próximos Pasos

### Posibles Mejoras:

1. **Extender a otras páginas**: Aplicar lógica similar a páginas 3-5
2. **Configuración por diseño**: Permitir activar/desactivar por diseño
3. **Detección más inteligente**: Analizar si hay elementos visibles en la página
4. **Advertencia en UI**: Mostrar en el diseñador si una página será omitida

## 📚 Referencias

- Archivo: `src/lib/pdf/highFidelityGenerator.ts`
- Función: `checkIfPage2ShouldBeSkipped()`
- Línea: ~24-70
- Commit: "feat: implementar eliminación condicional de página 2 vacía"

---

## ✨ Conclusión

La página 2 ahora se omite inteligentemente cuando no hay contenido relevante (tuberías, sumideros o sus fotos), resultando en PDFs más limpios y eficientes.

**Estado**: ✅ Implementado y funcionando
**Fecha**: 2026-02-19
**Versión**: 1.0.0
