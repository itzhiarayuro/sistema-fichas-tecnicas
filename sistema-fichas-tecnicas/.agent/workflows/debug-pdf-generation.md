---
description: Diagnosticar y resolver problema de generación PDF con pdfMake
---

# Tarea: Diagnosticar por qué pdfMake falla y se activa el respaldo jsPDF

## Contexto
El sistema híbrido está funcionando correctamente (genera PDFs), pero está usando el motor de respaldo jsPDF con un diseño básico en lugar del diseño profesional de pdfMake.

**Diseño esperado**: Layout profesional con secciones numeradas, datos en dos columnas, formato limpio
**Diseño actual**: Formato básico de respaldo con lista simple de datos

## Diagnóstico Sistemático

### 1. Verificar logs de consola del navegador
Abrir DevTools (F12) y buscar:
- ✅ Si aparece: "✅ pdfMake VFS cargado correctamente"
- ❌ Si aparece: "pdfMake falló, intentando motor de respaldo jsPDF..."
- Ver mensaje de error específico

### 2. Verificar que las fuentes VFS estén cargadas
Ejecutar en consola del navegador:
```javascript
console.log('VFS Keys:', Object.keys(window.pdfMake?.vfs || {}));
```
Debe mostrar archivos .ttf de Roboto

### 3. Problemas comunes y soluciones

#### Problema A: VFS vacío o undefined
**Síntoma**: `VFS está vacío, fonts fallarán`
**Causa**: Fuentes no se importaron correctamente
**Solución**: Verificar que pdfFonts se importe correctamente en pdfMakeGenerator.ts

#### Problema B: Error "Font 'Roboto' in style 'normal' is not defined"
**Síntoma**: Error en createPdf sobre fuentes
**Causa**: Configuración de fuentes no coincide con VFS
**Solución**: Asegurar que getFontConfiguration() mapee correctamente a archivos en VFS

#### Problema C: Timeout (>30s)
**Síntoma**: "TIMEOUT: La generación de PDF se estancó"
**Causa**: Proceso bloqueado, posiblemente por imágenes
**Solución**: Reducir número de fotos o timeout de fetch de imágenes

### 4. Plan de corrección por prioridad

#### Paso 1: Forzar uso de Roboto sin verificación dinámica
Simplificar getFontConfiguration() para usar solo Roboto sin detección:

```typescript
private getFontConfiguration(): any {
    return {
        Roboto: {
            normal: 'Roboto-Regular.ttf',
            bold: 'Roboto-Medium.ttf',
            italics: 'Roboto-Italic.ttf',
            bolditalics: 'Roboto-MediumItalic.ttf'
        }
    };
}
```

#### Paso 2: Asegurar VFS antes de cada generación
Verificar que ensureVfs() se llame y complete exitosamente

#### Paso 3: Agregar más logging
Añadir logs específicos para identificar exactamente dónde falla:
- Antes de createPdf
- Después de createPdf
- En getBlob callback

#### Paso 4: Si todo lo anterior falla, usar estrategia de reinicio
Limpiar completamente el cache y node_modules:
```bash
rm -rf .next
rm -rf node_modules
npm install
npm run dev
```

## Resultado Esperado
- pdfMake genera el PDF con el diseño profesional original
- No se activa el modo respaldo jsPDF
- Logs muestran: "✅ PDF generado exitosamente con pdfMake"

## Notas
- El diseño profesional YA ESTÁ implementado en buildContent() y métodos relacionados
- Solo necesitamos que pdfMake funcione, no cambiar el diseño
- jsPDF es solo un respaldo de emergencia, no la solución principal
