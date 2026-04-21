# Ejemplos de Uso: Escobilla de Estilos

## Ejemplo 1: Replicar Tipografía de Encabezado

### Escenario:
Tienes un campo "Nombre del Pozo" con un estilo profesional que quieres aplicar a otros campos.

### Configuración Original:
```
Campo: "Nombre del Pozo"
- Tamaño: 14pt
- Fuente: Arial
- Peso: Bold
- Color: #1F2937 (Gris oscuro)
- Fondo: #F3F4F6 (Gris claro)
```

### Pasos:
1. Selecciona el campo "Nombre del Pozo" en el canvas
2. En el Panel de Propiedades, haz clic en **"Capturar"**
3. Verás los estilos en la vista previa:
   ```
   Tipografía
   - Tamaño: 14px
   - Fuente: Arial
   - Peso: bold
   - Color: #1F2937
   
   Contenedor
   - Fondo: #F3F4F6
   ```
4. Selecciona otro campo (ej: "Ubicación")
5. Haz clic en **"Aplicar"**
6. ¡El campo "Ubicación" ahora tiene el mismo estilo!

---

## Ejemplo 2: Replicar Colores de Figuras

### Escenario:
Tienes un rectángulo decorativo con colores específicos que quieres usar en otros elementos.

### Configuración Original:
```
Figura: Rectángulo
- Relleno: #3B82F6 (Azul)
- Borde: #1E40AF (Azul oscuro)
- Grosor Borde: 2px
```

### Pasos:
1. Selecciona el rectángulo en el canvas
2. En el Panel de Propiedades, haz clic en **"Capturar"**
3. Verás los estilos:
   ```
   Colores
   - Relleno: #3B82F6 (muestra azul)
   - Borde: #1E40AF (muestra azul oscuro)
   
   Bordes
   - Ancho: 2px
   ```
4. Selecciona otro rectángulo o círculo
5. Haz clic en **"Aplicar"**
6. ¡La nueva figura tiene los mismos colores!

---

## Ejemplo 3: Crear Consistencia en Etiquetas

### Escenario:
Quieres que todas las etiquetas de campos tengan el mismo estilo.

### Configuración de Referencia:
```
Campo: "Profundidad"
- Etiqueta Tamaño: 9pt
- Etiqueta Peso: Bold
- Etiqueta Color: #6B7280 (Gris)
- Etiqueta Fondo: #F9FAFB (Gris muy claro)
```

### Pasos:
1. Selecciona el campo "Profundidad"
2. Haz clic en **"Capturar"**
3. La escobilla captura los estilos de la etiqueta
4. Selecciona otro campo (ej: "Temperatura")
5. Haz clic en **"Aplicar"**
6. Todas las etiquetas ahora tienen consistencia visual

---

## Ejemplo 4: Usar JSON para Documentación

### Escenario:
Quieres guardar la configuración de estilos para referencia o compartir con el equipo.

### Pasos:
1. Captura los estilos de un elemento
2. Haz clic en **"Copiar JSON"**
3. El JSON se copia al portapapeles:

```json
{
  "fontSize": 12,
  "fontFamily": "Arial",
  "color": "#000000",
  "fontWeight": "normal",
  "textAlign": "left",
  "backgroundColor": "rgba(255,255,255,0.9)",
  "borderColor": "#e5e7eb",
  "borderWidth": 1,
  "borderRadius": 0,
  "labelFontSize": 9,
  "labelColor": "#6B7280",
  "labelFontWeight": "bold"
}
```

4. Puedes:
   - Guardar en un documento
   - Compartir con colegas
   - Usar como referencia
   - Documentar paletas de diseño

---

## Ejemplo 5: Flujo Completo de Diseño

### Escenario:
Estás diseñando una ficha técnica con múltiples campos y quieres mantener consistencia.

### Paso 1: Crear Estilos Base
```
Creas 3 campos de referencia:
1. "Encabezado" - Estilo principal (14pt, Bold, Azul)
2. "Subtítulo" - Estilo secundario (11pt, Normal, Gris)
3. "Valor" - Estilo de datos (10pt, Normal, Negro)
```

### Paso 2: Replicar Estilos
```
Para cada nuevo campo:
1. Determina qué tipo es (encabezado, subtítulo, valor)
2. Selecciona el campo de referencia
3. Captura estilos
4. Selecciona el nuevo campo
5. Aplica estilos
```

### Paso 3: Documentar
```
Copia JSON de cada estilo base:
- Encabezado.json
- Subtítulo.json
- Valor.json

Guarda en un documento para referencia futura
```

### Resultado:
✅ Diseño consistente
✅ Proceso rápido
✅ Fácil de mantener
✅ Documentado para el equipo

---

## Ejemplo 6: Cambios Rápidos en Masa

### Escenario:
Necesitas cambiar el color de todos los campos de "Rojo" a "Verde".

### Método Tradicional:
- Editar cada campo individualmente (lento)

### Método con Escobilla:
1. Crea UN campo con el color verde correcto
2. Captura sus estilos
3. Selecciona cada campo rojo uno por uno
4. Aplica estilos (solo se cambia el color)
5. ¡Todos los campos ahora son verdes!

---

## Consejos Profesionales

### 💡 Tip 1: Crear Paleta de Referencia
Crea campos "ocultos" con los estilos base de tu diseño:
- Encabezado Principal
- Encabezado Secundario
- Texto Normal
- Texto Pequeño
- Énfasis

Luego úsalos como referencia para toda la ficha.

### 💡 Tip 2: Documentar Decisiones
Copia JSON de estilos importantes y guarda en un documento:
```
# Paleta de Estilos - Ficha Técnica v1.0

## Encabezados
[JSON aquí]

## Valores
[JSON aquí]

## Etiquetas
[JSON aquí]
```

### 💡 Tip 3: Combinar con Capas
Usa el Panel de Capas para seleccionar elementos rápidamente, luego aplica estilos con la escobilla.

### 💡 Tip 4: Probar Antes de Aplicar
Siempre captura en un elemento de prueba primero para ver cómo se ve antes de aplicar a todos.

---

## Casos de Uso Comunes

| Caso | Solución |
|------|----------|
| Todos los campos deben tener el mismo tamaño de fuente | Captura de uno, aplica a todos |
| Cambiar color corporativo en toda la ficha | Captura nuevo color, aplica a elementos |
| Mantener consistencia entre versiones | Documenta JSON, úsalo como referencia |
| Crear tema claro/oscuro | Crea dos conjuntos de estilos, alterna |
| Replicar diseño en otra ficha | Copia JSON, úsalo como guía |

---

## Preguntas Frecuentes

**P: ¿Puedo aplicar solo algunos estilos?**
R: Actualmente se aplican todos. Para aplicar selectivamente, edita manualmente después.

**P: ¿Se puede deshacer la aplicación de estilos?**
R: Sí, usa Ctrl+Z (Deshacer) como siempre.

**P: ¿Funciona con elementos de diferente tipo?**
R: Sí, pero algunos estilos pueden no aplicarse si no son relevantes (ej: color de texto en un rectángulo).

**P: ¿Dónde se guardan los estilos capturados?**
R: En la memoria de la sesión. Se pierden al cerrar el navegador. Usa "Copiar JSON" para guardar.
