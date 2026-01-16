# Guía de Pruebas: Validación de Migración jsPDF -> pdfMake

Esta guía detalla el proceso para validar que la migración del generador de PDFs de `jsPDF` a `pdfMake` cumple con los requisitos de negocio y estabilidad técnica.

## 1. Objetivos de Verificación
- Confirmar que se generan PDFs válidos sin errores de ejecución.
- Validar la integridad de los 33 campos del diccionario de datos.
- Verificar el renderizado de tablas dinámicas (tuberías y sumideros).
- Asegurar la correcta visualización de imágenes asociadas.
- Validar la estabilidad ante datos parciales o nulos.

## 2. Casos de Prueba Automatizados (Técnicos)

### CP-01: Generación de Documento Base
- **Procedimiento**: Ejecutar el generador con un `Pozo` mínimo.
- **Resultado Esperado**: Devuelve un `Blob` de tipo `application/pdf` con tamaño > 0.

### CP-02: Manejo de Datos Nulos (Robustez)
- **Procedimiento**: Pasar un objeto de pozo con secciones vacías o `undefined`.
- **Resultado Esperado**: El PDF se genera correctamente usando guiones (`-`) o placeholders, sin lanzar excepciones de "length of undefined".

### CP-03: Renderizado de Tablas
- **Procedimiento**: Generar PDF para un pozo con múltiples entradas/salidas y sumideros.
- **Resultado Esperado**: Las tablas se visualizan con encabezados y las filas corresponden a los datos de la tienda global.

## 3. Casos de Prueba Funcionales (Manuales)

### CP-04: Descarga desde la Lista de Pozos
- **Procedimiento**: Navegar a `/pozos` -> Botón "Generar PDF".
- **Resultado Esperado**: El navegador inicia la descarga automática del archivo `.pdf`.

### CP-05: Descarga desde el Editor
- **Procedimiento**: Abrir un pozo en `/editor/[id]` -> Icono PDF.
- **Resultado Esperado**: El PDF generado refleja los cambios realizados en el editor antes de la descarga.

### CP-06: Incorporación de Imágenes
- **Procedimiento**: Subir fotos -> Asociar a pozo -> Generar PDF.
- **Resultado Esperado**: La sección "REGISTRO FOTOGRÁFICO" muestra las imágenes y sus descripciones.

## 4. Matriz de Ejecución Técnica

| ID | Componente | Acción | Resultado |
|----|------------|--------|-----------|
| T1 | `pdfMakeGenerator` | Integración de Fuentes | [PASA] Roboto cargada vía VFS. |
| T2 | `getPhotoData` | Fetch de Blobs | [PASA] Funciona en entorno cliente. |
| T3 | `buildContent` | Estructura de Secciones | [PASA] Mapeo completo de 33 campos. |
| T4 | `ErrorHandling` | Bloques try-catch | [PASA] Captura errores de pdfMake sin bloquear UI. |
