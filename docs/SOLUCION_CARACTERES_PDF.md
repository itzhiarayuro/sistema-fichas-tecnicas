# Solución: Caracteres Especiales en PDFs

## Problema Identificado

Al generar PDFs, los caracteres especiales del español (tildes, eñes, etc.) se mostraban como símbolos extraños debido a un **bug conocido en jsPDF 2.5.1** con la codificación UTF-8.

### Ejemplo del Error
```
&I&D&E&N&T&I&F&I&C&A&C&I&O&N
%I& &C&o&o&r&d&e&n&a&d&aM679
```

## Causa Raíz

jsPDF 2.5.1 tiene un bug donde intenta separar cada carácter UTF-8 en bytes individuales, causando que los caracteres especiales se rendericen incorrectamente. Este es un problema conocido de la librería que no se ha resuelto completamente.

## Solución Implementada: Transliteración

La única solución confiable es **transliterar** (convertir) los caracteres especiales a sus equivalentes ASCII antes de pasarlos a jsPDF.

### Mapa de Transliteración

```typescript
'á' → 'a'    'Á' → 'A'
'é' → 'e'    'É' → 'E'
'í' → 'i'    'Í' → 'I'
'ó' → 'o'    'Ó' → 'O'
'ú' → 'u'    'Ú' → 'U'
'ñ' → 'n'    'Ñ' → 'N'
'ü' → 'u'    'Ü' → 'U'
'¿' → '?'    '¡' → '!'
```

### Implementación

**Archivo: `src/lib/pdf/fontConfig.ts`**

```typescript
export function sanitizeTextForPDF(text: string): string {
    if (!text) return '';
    
    // Normalizar primero
    let result = text.normalize('NFC');
    
    // Transliterar cada carácter especial
    result = result.split('').map(char => 
        TRANSLIT_MAP[char] || char
    ).join('');
    
    return result;
}
```

Esta función se aplica **automáticamente** a TODO el texto que se renderiza en los PDFs.

## Resultado

### Antes
```
Coordenada X: → &C&o&o&r&d&e&n&a&d&a&X&:
Cañuela: → &C&a&ñ&u&e&l&a&:
Peldaños: → &P&e&l&d&a&ñ&o&s&:
```

### Después
```
Coordenada X: → Coordenada X:
Cañuela: → Canuela:
Peldaños: → Peldanos:
```

## Archivos Modificados

1. ✅ `src/lib/pdf/fontConfig.ts` - Implementa transliteración
2. ✅ `src/lib/pdf/pdfGenerator.ts` - Usa sanitizeTextForPDF en todos los textos
3. ✅ `src/lib/pdf/designBasedPdfGenerator.ts` - Usa sanitizeTextForPDF en todos los textos

## Limitaciones

⚠️ **Nota Importante**: Los PDFs generados mostrarán texto sin tildes ni eñes:
- "Dirección" → "Direccion"
- "Cañuela" → "Canuela"  
- "Peldaños" → "Peldanos"

Esto es un **compromiso necesario** debido al bug de jsPDF. El texto sigue siendo legible y profesional.

## Alternativas Evaluadas

1. ❌ **Normalización UTF-8**: No funciona, jsPDF sigue separando caracteres
2. ❌ **Configuración de encoding**: jsPDF ignora estas configuraciones
3. ❌ **Fuentes personalizadas**: Requiere archivos .ttf y aumenta complejidad
4. ✅ **Transliteración**: Solución simple, confiable y sin dependencias

## Solución Futura (Opcional)

Si en el futuro se requieren tildes y eñes en los PDFs, las opciones son:

1. **Actualizar jsPDF** cuando se corrija el bug (monitorear releases)
2. **Usar fuentes personalizadas** con soporte UTF-8 completo
3. **Cambiar a otra librería** como `pdfmake` o `pdf-lib`

Para el alcance actual del proyecto, la transliteración es la solución óptima.

## Validación

✅ Probado con:
- Campos con tildes
- Campos con eñes
- Textos largos en observaciones
- Fechas en español
- Todos los formatos (A4, Letter, Portrait, Landscape)
- Ambos generadores (pdfGenerator y designBasedPdfGenerator)
