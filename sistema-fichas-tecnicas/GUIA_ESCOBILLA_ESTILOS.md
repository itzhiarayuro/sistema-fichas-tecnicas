# Guía: Escobilla de Estilos (Style Picker)

## ¿Qué es la Escobilla de Estilos?

La **Escobilla de Estilos** es una herramienta que te permite capturar y replicar rápidamente los estilos de diseño (colores, tipografía, bordes, etc.) de un elemento a otro en el diseñador visual.

## Ubicación

La escobilla se encuentra en el **Panel de Propiedades** (lado derecho del diseñador), en la parte superior de las opciones de edición.

## Cómo Usar

### Paso 1: Selecciona un Elemento Fuente
1. Haz clic en el elemento del que deseas copiar los estilos (campo o figura)
2. El elemento se resaltará en el canvas

### Paso 2: Captura los Estilos
1. En el Panel de Propiedades, haz clic en el botón **"Capturar"** (con icono de escobilla)
2. Los estilos del elemento se guardarán en la escobilla

### Paso 3: Selecciona un Elemento Destino
1. Haz clic en otro elemento al que deseas aplicar los estilos
2. El elemento destino se resaltará en el canvas

### Paso 4: Aplica los Estilos
1. En el Panel de Propiedades, haz clic en el botón **"Aplicar"** (con icono de copiar)
2. Los estilos capturados se aplicarán al elemento destino

## Estilos que se Capturan

### Para Campos (Field Placements):
- **Tipografía**: Tamaño de fuente, familia de fuente, peso, color
- **Contenedor**: Color de fondo, color de borde, grosor de borde, radio de esquinas
- **Etiqueta**: Tamaño, peso, color, color de fondo, texto personalizado, alineación, padding

### Para Figuras (Shapes):
- **Tipografía**: Tamaño de fuente, familia de fuente, peso, color (solo para texto)
- **Colores**: Relleno, borde, grosor de borde
- **Bordes**: Radio de esquinas

## Ejemplo de Uso

1. Tienes un campo "Nombre del Pozo" con:
   - Fuente: Arial, 12pt, negrita
   - Color: Azul (#0066CC)
   - Fondo: Gris claro (#F0F0F0)

2. Quieres aplicar el mismo estilo a otro campo "Ubicación"

3. Pasos:
   - Selecciona "Nombre del Pozo" → Captura
   - Selecciona "Ubicación" → Aplica
   - ¡Listo! "Ubicación" ahora tiene el mismo estilo

## Características Adicionales

### Copiar JSON
Puedes copiar los estilos capturados en formato JSON haciendo clic en **"Copiar JSON"**. Esto es útil para:
- Documentar estilos
- Compartir configuraciones
- Usar en otras herramientas

### Vista Previa de Estilos
La escobilla muestra una vista previa de todos los estilos capturados:
- Muestras de color con código hexadecimal
- Valores de tipografía
- Información de bordes

## Consejos

✅ **Usa la escobilla para mantener consistencia** en el diseño
✅ **Captura estilos de referencia** antes de empezar a diseñar
✅ **Combina con el panel de capas** para seleccionar elementos rápidamente
✅ **Copia JSON** para documentar paletas de colores y estilos

## Limitaciones

- Solo copia estilos visuales (no posición ni tamaño)
- Los estilos se aplican completamente (no puedes seleccionar qué estilos aplicar)
- Funciona mejor con elementos del mismo tipo (campo a campo, figura a figura)

## Solución de Problemas

**P: El botón "Capturar" está deshabilitado**
R: Asegúrate de haber seleccionado un elemento en el canvas

**P: El botón "Aplicar" está deshabilitado**
R: Primero captura estilos de un elemento, luego selecciona otro elemento y aplica

**P: Los estilos no se ven aplicados**
R: Algunos estilos pueden no ser visibles si el elemento destino tiene configuraciones que los ocultan (ej: fondo transparente)
