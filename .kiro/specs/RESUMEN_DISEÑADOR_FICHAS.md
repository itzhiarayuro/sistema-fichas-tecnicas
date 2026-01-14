# 📋 Resumen: Diseñador de Fichas

## ¿Qué es?

Un módulo visual que permite **diseñar el layout y estilo de las fichas de inspección** sin escribir código. Incluye:

1. **Editor Visual** - Drag & drop de campos
2. **Importador de HTML** - Subir HTML prediseñado
3. **Gestor de Versiones** - Guardar múltiples diseños
4. **Generador de PDF** - Usar diseño para generar PDFs automáticamente

---

## Flujo de Uso

### Opción 1: Diseño Visual (Drag & Drop)

```
1. Abres "Diseñador de Fichas"
2. Creas nuevo diseño
3. Arrastra campos del diccionario al canvas
   - Campos POZO (33 campos)
   - Campos TUBERIAS (9 campos, repetibles)
   - Campos SUMIDEROS (8 campos, repetibles)
   - Campos FOTOS (6 campos, repetibles)
4. Posicionas y redimensionas elementos
5. Personalizas estilos (color, fuente, tamaño)
6. Configuras campos repetibles (cuántos items mostrar, espaciado, saltos de página)
7. Guardas diseño con nombre y versión
8. Estableces como diseño por defecto (opcional)
```

### Opción 2: Importar HTML

```
1. Diseñas tu ficha en Figma, Adobe XD, o cualquier herramienta
2. Exportas como HTML
3. Abres "Diseñador de Fichas"
4. Haces clic en "Importar HTML"
5. Subes tu archivo HTML
6. Sistema parsea HTML y extrae estructura
7. Mapeas elementos HTML a campos del diccionario
8. Ajustas posiciones y estilos si es necesario
9. Guardas como nueva versión de diseño
```

### Opción 3: Usar Diseño para Generar PDF

```
1. Cargas datos de pozo (Excel)
2. Seleccionas qué diseño usar
3. Sistema genera PDF automáticamente usando el diseño guardado
4. Descargas PDF
```

---

## Interfaz

### Layout de 3 Paneles

```
┌─────────────────────────────────────────────────────────────┐
│ 🛠️ TOOLBAR: Nuevo | Guardar | Cargar | Importar HTML | ... │
├──────────────┬──────────────────────────┬──────────────────┤
│              │                          │                  │
│  📋 CAMPOS   │   🎯 CANVAS DE DISEÑO   │  ⚙️ PROPIEDADES  │
│              │                          │                  │
│ 🔍 Buscar    │  ┌──────────────────┐   │ ID: field_1      │
│              │  │ FICHA DE INSPEC. │   │ Campo: id_pozo   │
│ 📋 POZO      │  │                  │   │ Posición: X,Y    │
│  🔴 id_pozo  │  │ [Elementos       │   │ Tamaño: W,H      │
│  🔴 coord_x  │  │  arrastrables]   │   │ Estilos: ...     │
│  🟠 direc.   │  │                  │   │ Repetible: ☐     │
│  🟢 obs.     │  └──────────────────┘   │                  │
│              │                          │                  │
│ 🔗 TUBERIAS  │  Zoom: 100%              │ Guardar cambios  │
│  🔴 id_tub.  │  Snap to grid: ☑        │                  │
│  🔴 tipo     │                          │                  │
│              │                          │                  │
│ 🌊 SUMIDEROS │                          │                  │
│  🔴 id_sum.  │                          │                  │
│              │                          │                  │
│ 📸 FOTOS     │                          │                  │
│  🔴 id_foto  │                          │                  │
│              │                          │                  │
└──────────────┴──────────────────────────┴──────────────────┘
```

---

## Características Principales

### Panel de Campos (Izquierda)

✅ Listar todos los campos del diccionario (56 campos totales)
✅ Agrupar por categoría (Pozo, Tuberías, Sumideros, Fotos)
✅ Búsqueda y filtrado
✅ Drag & drop a canvas
✅ Indicadores de obligatorios (🔴), importantes (🟠), opcionales (🟢)

### Canvas de Diseño (Centro)

✅ Grilla editable (A4/Letter, portrait/landscape)
✅ Drag & drop de campos
✅ Redimensionamiento de elementos
✅ Selección de elementos
✅ Snap to grid
✅ Zoom in/out
✅ Undo/Redo
✅ Preview en tiempo real
✅ Guías de alineación

### Panel de Propiedades (Derecha)

✅ Editar propiedades del elemento seleccionado
✅ Cambiar estilos (color, fuente, tamaño, etc.)
✅ Configurar repetibilidad (para tuberías, sumideros, fotos)
✅ Cambiar label personalizado
✅ Validaciones en tiempo real

### Toolbar Superior

✅ Nuevo diseño
✅ Guardar diseño
✅ Cargar diseño
✅ Duplicar diseño
✅ Eliminar diseño
✅ Importar HTML
✅ Gestor de versiones
✅ Preview PDF
✅ Exportar diseño (JSON)

### Gestor de Versiones

✅ Listar todas las versiones de diseños
✅ Crear nueva versión
✅ Duplicar versión
✅ Renombrar versión
✅ Eliminar versión
✅ Establecer versión por defecto
✅ Ver historial de cambios

### Importador de HTML

✅ Upload de archivo HTML
✅ Parsear estructura HTML
✅ Extraer elementos (div, img, table, etc.)
✅ Mapear a campos del diccionario
✅ Guardar como nueva versión
✅ Validar HTML

---

## Generación de PDF desde Diseño

### Proceso Automático

```
1. Usuario selecciona diseño
2. Sistema lee diseño guardado
3. Sistema lee datos del pozo
4. Para cada campo en el diseño:
   - Si es repetible (tuberías, sumideros, fotos):
     * Renderizar N veces (una por cada item)
     * Aplicar espaciado entre items
     * Si hay muchos items: saltar a nueva página
   - Si es imagen: insertar imagen
   - Si es tabla: renderizar tabla
   - Aplicar estilos (color, fuente, tamaño, etc.)
5. Convertir HTML renderizado a PDF
6. Descargar PDF
```

### Ejemplo: Pozo con 3 Tuberías

```
Diseño especifica:
- Campo "tuberias" en posición Y=100mm
- Tamaño: 80mm x 20mm
- Repetible: SÍ
- Espaciado entre items: 10mm

Generación:
- Tubería 1: Y=100mm
- Tubería 2: Y=130mm (100 + 20 + 10)
- Tubería 3: Y=160mm (130 + 20 + 10)

Resultado: 3 filas de tuberías en el PDF
```

---

## Tipos de Datos

### FieldPlacement (Elemento en el Diseño)

```typescript
{
  id: "field_1",                    // ID único en el diseño
  fieldId: "id_pozo",               // ID del campo del diccionario
  fieldType: "pozo",                // Categoría
  fieldName: "ID Pozo",             // Nombre legible
  
  position: { x: 10, y: 20 },       // mm desde esquina
  size: { width: 80, height: 10 },  // mm
  
  style: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "#000000",
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
    padding: 5
  },
  
  label: "ID del Pozo",             // Etiqueta personalizada
  isRepeatable: false,              // ¿Es repetible?
  contentType: "text",              // Tipo de contenido
  required: true,                   // ¿Es obligatorio?
  dataType: "string"                // Tipo de dato
}
```

### FichaDesign (Diseño Completo)

```typescript
{
  id: "design_1",
  name: "Diseño Estándar v1",
  description: "Diseño estándar para fichas de inspección",
  version: "1.0.0",
  
  pageConfig: {
    size: "A4",
    orientation: "portrait",
    margins: { top: 10, right: 10, bottom: 10, left: 10 }
  },
  
  fields: [
    // Array de FieldPlacement
  ],
  
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z",
  createdBy: "usuario@example.com",
  isDefault: true,
  source: "visual",                 // "visual" o "html_import"
  htmlSource: null                  // HTML original si fue importado
}
```

---

## Casos de Uso

### Caso 1: Diseño Simple

```
Usuario quiere un diseño simple con:
- Título "FICHA DE INSPECCIÓN"
- Información básica del pozo (ID, Dirección, Fecha)
- Tabla de tuberías
- Tabla de sumideros
- Sección de fotos

Pasos:
1. Abre Diseñador
2. Crea nuevo diseño "Simple"
3. Arrastra campos al canvas
4. Posiciona elementos
5. Guarda diseño
6. Usa para generar PDFs
```

### Caso 2: Diseño Profesional (Importado)

```
Usuario quiere un diseño profesional con:
- Logo de la empresa
- Información detallada del pozo (33 campos)
- Tablas de tuberías, sumideros, fotos
- Gráficos de estado
- Mapa de ubicación
- Observaciones

Pasos:
1. Diseña HTML en Figma/Adobe XD
2. Exporta como HTML
3. Abre Diseñador
4. Importa HTML
5. Mapea elementos a campos
6. Ajusta estilos
7. Guarda como "Profesional v1"
8. Usa para generar PDFs
```

### Caso 3: Múltiples Versiones

```
Usuario tiene 3 versiones de diseño:
- "Estándar" (por defecto)
- "Detallado" (con todos los campos)
- "Resumen" (solo información básica)

Pasos:
1. Crea 3 diseños diferentes
2. Establece "Estándar" como por defecto
3. Al generar PDF, puede elegir qué versión usar
4. Sistema genera PDF con el diseño seleccionado
```

---

## Persistencia

### Almacenamiento

- **Diseños**: IndexedDB (local) + Backend (sincronización)
- **Versiones**: Historial completo en IndexedDB
- **HTML importado**: Guardar HTML original en `htmlSource`

### Auto-save

- Auto-save cada 30 segundos
- Mantener últimas 10 versiones
- Permitir exportar/importar diseños (JSON)

---

## Validaciones

### Validaciones de Diseño

✅ Nombre de diseño no vacío
✅ Al menos un campo en el diseño
✅ Campos dentro de los márgenes de página
✅ Tamaño mínimo de campo (10mm x 10mm)

### Validaciones de HTML Importado

✅ HTML válido
✅ Estructura reconocible
✅ Elementos mapeables a campos del diccionario

---

## Tecnologías Sugeridas

- **Canvas/Diseño**: React + Konva.js o Fabric.js
- **Drag & Drop**: dnd-kit
- **HTML Parsing**: jsdom o html-parse-stringify
- **PDF Generation**: jsPDF + html2canvas
- **Persistencia**: IndexedDB + Zustand
- **UI**: Tailwind CSS + Shadcn/ui

---

## Tareas Implementación

### Fase 1: Tipos y Store (Tarea 3.3.1 - 3.3.2)
- Crear tipos de datos
- Crear store de diseños

### Fase 2: UI Base (Tarea 3.3.3 - 3.3.7)
- Página del Diseñador
- Panel de Campos
- Canvas de Diseño
- Panel de Propiedades
- Toolbar

### Fase 3: Funcionalidades Avanzadas (Tarea 3.3.8 - 3.3.10)
- Importador de HTML
- Gestor de Versiones
- Generador de PDF desde Diseño

---

## Próximos Pasos

1. ✅ Revisar especificación
2. ✅ Confirmar arquitectura
3. ✅ Comenzar implementación (Tarea 3.3.1)

¿Algún ajuste o pregunta sobre el Diseñador de Fichas?
