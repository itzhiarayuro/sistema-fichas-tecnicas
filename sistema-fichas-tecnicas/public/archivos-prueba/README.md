# Archivos de Prueba - Sistema de Fichas Técnicas

Este paquete contiene todo lo necesario para probar el flujo completo del sistema.

## Contenido

1.  **📊 ejemplo_completo_33campos.xlsx**: Excel con 5 pozos (PZ1666 a PZ1670) y los 33 campos técnicos requeridos.
2.  **📸 fotos/**: Carpeta con 18 imágenes placeholder nombradas correctamente para vinculación automática.
3.  **📝 Instrucciones**: Esta guía.

## Pasos para la Prueba

1.  **Carga**: Ve a la sección `/upload` del sistema.
2.  **Excel**: Arrastra el archivo `ejemplo_completo_33campos.xlsx`.
3.  **Fotos**: Arrastra todas las fotos contenidas en la carpeta `fotos/`.
4.  **Validación**: Observa cómo el sistema asocia automáticamente cada foto con su pozo correspondiente basándose en el nombre (ej: `PZ1666-P.jpg`).
5.  **Continuar**: Haz clic en "Continuar" para ver los pozos en el listado.
6.  **Edición**: Entra a cualquier pozo para ver sus detalles y generar el PDF.

## Detalle de los Pozos de Ejemplo

- **PZ1666**: Caso ideal. Datos completos y 4 fotos (Panorámica, Tapa, Interna, Acceso).
- **PZ1667**: Caso con entrada y salida. Incluye fotos de tubería y zona.
- **PZ1668**: Caso minimalista. Solo 2 fotos.
- **PZ1669**: Caso sin coordenadas GPS para probar la flexibilidad del sistema. 5 fotos incluyendo sumidero.
- **PZ1670**: Caso con datos parciales. 3 fotos.

---
*Nota: Puedes reemplazar estas imágenes por fotos reales siempre que respetes la nomenclatura (CodigoPozo-Tipo.jpg).*
