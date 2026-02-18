# Ejemplo: Replicar Diseño de Labels (Etiquetas)

## Escenario

Tienes un campo "Nombre del Pozo" con un label personalizado que quieres replicar en otros campos.

## Configuración Original del Label

```
Campo: "Nombre del Pozo"

Label (Etiqueta):
- Texto: "NOMBRE DEL POZO"
- Tamaño: 9pt
- Peso: Bold
- Color: #6B7280 (Gris)
- Fondo: #F3F4F6 (Gris claro)
- Alineación: left
- Padding: 2px
```

## Pasos para Replicar

### 1. Selecciona el Campo Fuente
```
Haz clic en el campo "Nombre del Pozo" en el canvas
→ Se resaltará con un anillo verde
```

### 2. Captura los Estilos
```
En el Panel de Propiedades (lado derecho):
1. Haz clic en el botón "Capturar" (azul con icono de escobilla)
2. Verás la vista previa de estilos capturados
```

### 3. Vista Previa de Estilos Capturados
```
Escobilla de Estilos
├─ Tipografía
│  ├─ Tamaño: 10px
│  ├─ Fuente: Arial
│  ├─ Peso: normal
│  └─ Color: #000000
│
├─ Contenedor
│  ├─ Fondo: rgba(255,255,255,0.9)
│  ├─ Borde: #e5e7eb
│  └─ Grosor: 1px
│
└─ Etiqueta ⭐ (NUEVO)
   ├─ Texto: "NOMBRE DEL POZO"
   ├─ Tamaño: 9px
   ├─ Peso: bold
   ├─ Color: #6B7280
   ├─ Fondo: #F3F4F6
   ├─ Alineación: left
   └─ Padding: 2px
```

### 4. Selecciona el Campo Destino
```
Haz clic en otro campo (ej: "Ubicación")
→ Se resaltará con un anillo verde
```

### 5. Aplica los Estilos
```
En el Panel de Propiedades:
1. Haz clic en el botón "Aplicar" (verde con icono de copiar)
2. Los estilos se aplicarán inmediatamente
```

### 6. Resultado
```
Campo "Ubicación" ahora tiene:
- El mismo label: "NOMBRE DEL POZO" (o el que tenía)
- Mismo tamaño: 9pt
- Mismo peso: Bold
- Mismo color: #6B7280
- Mismo fondo: #F3F4F6
- Misma alineación: left
- Mismo padding: 2px
```

## Qué se Replica del Label

✅ **Se replica:**
- Tamaño de fuente
- Peso de fuente (normal/bold)
- Color del texto
- Color de fondo
- Alineación (left/center/right)
- Padding interno

❌ **NO se replica:**
- El texto personalizado (mantiene el original)
- La visibilidad del label (si está oculto/visible)

## Ejemplo Completo: Crear Consistencia en Toda la Ficha

### Paso 1: Crear Campo de Referencia
```
Creas un campo "REFERENCIA" con:
- Label Tamaño: 9pt
- Label Peso: Bold
- Label Color: #1F2937 (Gris oscuro)
- Label Fondo: #E5E7EB (Gris claro)
```

### Paso 2: Replicar a Otros Campos
```
Para cada campo que quieras actualizar:

1. Selecciona "REFERENCIA"
2. Captura estilos
3. Selecciona el campo destino
4. Aplica estilos

Resultado: Todos los labels tienen el mismo estilo
```

### Paso 3: Verificar Consistencia
```
Todos los campos ahora tienen:
✓ Labels con tamaño 9pt
✓ Labels en negrita
✓ Labels en gris oscuro
✓ Labels con fondo gris claro
✓ Apariencia uniforme en toda la ficha
```

## Casos de Uso Comunes

### Caso 1: Cambiar Color de Todos los Labels
```
Problema: Necesitas cambiar el color de los labels de azul a rojo

Solución:
1. Edita UN campo con el color rojo correcto
2. Captura estilos
3. Aplica a todos los demás campos
4. ¡Todos los labels ahora son rojos!
```

### Caso 2: Hacer Labels Más Grandes
```
Problema: Los labels son muy pequeños (8pt) y quieres 11pt

Solución:
1. Edita UN campo con tamaño 11pt
2. Captura estilos
3. Aplica a todos los campos
4. ¡Todos los labels ahora son más grandes!
```

### Caso 3: Agregar Fondo a Labels
```
Problema: Los labels no tienen fondo y quieres agregarles uno

Solución:
1. Edita UN campo con fondo gris claro
2. Captura estilos
3. Aplica a todos los campos
4. ¡Todos los labels ahora tienen fondo!
```

## Vista Previa en JSON

Cuando copias los estilos en JSON, verás algo como:

```json
{
  "fontSize": 10,
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
  "labelFontWeight": "bold",
  "customLabel": "NOMBRE DEL POZO",
  "labelBackgroundColor": "#F3F4F6",
  "labelPadding": 2,
  "labelAlign": "left"
}
```

## Consejos Profesionales

### 💡 Tip 1: Crear Paleta de Labels
Crea 2-3 campos con diferentes estilos de label:
- **Label Principal**: 10pt, Bold, Azul
- **Label Secundario**: 8pt, Normal, Gris
- **Label Énfasis**: 11pt, Bold, Rojo

Úsalos como referencia para toda la ficha.

### 💡 Tip 2: Documentar Decisiones
Copia JSON de los estilos de label y guarda:
```
# Estilos de Labels - Ficha Técnica v1.0

## Label Principal
{
  "labelFontSize": 10,
  "labelFontWeight": "bold",
  "labelColor": "#1F2937",
  "labelBackgroundColor": "#E5E7EB"
}

## Label Secundario
{
  "labelFontSize": 8,
  "labelFontWeight": "normal",
  "labelColor": "#6B7280",
  "labelBackgroundColor": "transparent"
}
```

### 💡 Tip 3: Combinar con Capas
1. Abre el Panel de Capas
2. Selecciona un campo desde las capas
3. Captura estilos
4. Selecciona otro desde las capas
5. Aplica estilos

Esto es más rápido que hacer clic en el canvas.

### 💡 Tip 4: Probar Antes de Aplicar
Siempre crea un campo de prueba primero:
1. Crea un campo "TEST"
2. Aplica los estilos de label que quieres
3. Verifica que se vea bien
4. Luego aplica a todos los demás

## Limitaciones Conocidas

⚠️ **El texto del label NO se replica**
- Si el campo destino tiene "Ubicación" como label, se mantiene
- Solo se replican los estilos visuales (tamaño, color, etc.)
- Esto es intencional para mantener la identidad de cada campo

⚠️ **Algunos estilos pueden no ser visibles**
- Si el label está oculto (showLabel: false), los estilos se aplican pero no se ven
- Activa "Mostrar etiqueta" en el campo destino para verlos

## Solución de Problemas

**P: Capturé los estilos pero el label no cambió**
R: Verifica que el campo destino tenga "Mostrar etiqueta" activado en las propiedades

**P: El texto del label cambió cuando no quería**
R: El texto NO se replica. Si cambió, fue porque editaste manualmente el campo

**P: Los colores se ven diferentes en el PDF**
R: Algunos navegadores muestran colores ligeramente diferentes. Verifica en el preview PDF

**P: ¿Puedo replicar solo el color del label?**
R: Actualmente se replican todos los estilos. Para cambiar solo el color, edita manualmente
