# 🎨 Especificación: Diseñador de Fichas

## Visión General

Sistema visual que permite diseñar el layout y estilo de las fichas de inspección de pozos. Los usuarios pueden:

1. **Diseñar visualmente** usando drag & drop
2. **Importar HTML** prediseñado
3. **Guardar múltiples versiones** de diseños
4. **Generar PDFs automáticamente** usando el diseño guardado

---

## Arquitectura

### Componentes Principales

```
DISEÑADOR DE FICHAS
├── 📋 Panel de Campos (Izquierda)
│   ├── Búsqueda de campos
│   ├── Campos agrupados por categoría
│   └── Drag & drop habilitado
│
├── 🎯 Canvas de Diseño (Centro)
│   ├── Grilla editable (A4/Letter)
│   ├── Elementos arrastrables
│   ├── Redimensionamiento
│   ├── Snap to grid
│   └── Preview en tiempo real
│
├── ⚙️ Panel de Propiedades (Derecha)
│   ├── Propiedades del elemento
│   ├── Estilos CSS
│   └── Configuración de repetibilidad
│
└── 🛠️ Toolbar Superior
    ├── Nuevo/Guardar/Cargar
    ├── Importar HTML
    ├── Gestor de versiones
    └── Preview PDF
```

---

## Tipos de Datos

### FieldPlacement - Elemento en el Diseño

```typescript
interface FieldPlacement {
  // Identificación
  id: string;                          // ID único en el diseño (ej: "field_1")
  fieldId: string;                     // ID del campo del diccionario (ej: "id_pozo")
  fieldType: 'pozo' | 'tuberia' | 'sumidero' | 'foto';
  fieldName: string;                   // Nombre legible (ej: "ID Pozo")
  
  // Posición y tamaño
  position: {
    x: number;                         // mm desde izquierda
    y: number;                         // mm desde arriba
  };
  size: {
    width: number;                     // mm
    height: number;                    // mm
  };
  
  // Estilos
  style: {
    fontSize: number;                  // pt
    fontFamily: string;                // ej: "Arial", "Helvetica"
    fontWeight: 'normal' | 'bold';
    color: string;                     // hex color
    backgroundColor: string;           // hex color
    borderRadius: number;              // px
    padding: number;                   // px
    textAlign: 'left' | 'center' | 'right';
    border?: {
      width: number;                   // px
      color: string;                   // hex
      style: 'solid' | 'dashed' | 'dotted';
    };
  };
  
  // Configuración
  label?: string;                      // Etiqueta personalizada
  isRepeatable: boolean;               // Para tuberías, sumideros, fotos (N registros)
  repeatableConfig?: {
    maxItems?: number;                 // Máximo de items a mostrar
    itemSpacing: number;               // Espaciado entre items (mm)
    pageBreak: boolean;                // ¿Saltar a nueva página si hay muchos?
  };
  
  // Tipo de contenido
  contentType: 'text' | 'image' | 'table' | 'qrcode';
  
  // Validación
  required: boolean;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'image';
}
```

### FichaDesign - Diseño Completo

```typescript
interface FichaDesign {
  // Metadata
  id: string;                          // ID único del diseño
  name: string;                        // Nombre del diseño (ej: "Diseño Estándar v1")
  description: string;
  version: string;                     // Versión (ej: "1.0.0")
  
  // Configuración de página
  pageConfig: {
    size: 'A4' | 'Letter';
    orientation: 'portrait' | 'landscape';
    margins: {
      top: number;                     // mm
      right: number;
      bottom: number;
      left: number;
    };
  };
  
  // Campos en el diseño
  fields: FieldPlacement[];
  
  // Metadata del sistema
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isDefault: boolean;                  // ¿Es el diseño por defecto?
  
  // Origen del diseño
  source: 'visual' | 'html_import';    // ¿Creado visualmente o importado de HTML?
  htmlSource?: string;                 // HTML original si fue importado
}
```

### DesignTemplate - Versión Guardada

```typescript
interface DesignTemplate {
  id: string;
  designId: string;                    // Referencia al diseño
  versionNumber: number;               // 1, 2, 3...
  name: string;                        // Nombre de la versión
  design: FichaDesign;
  createdAt: Date;
  isActive: boolean;                   // ¿Es la versión activa?
}
```

---

## Campos Disponibles para Diseño

### Campos POZO (33 campos)

**Obligatorios (🔴):**
- id_pozo
- coordenada_x
- coordenada_y
- fecha
- levanto
- estado

**Importantes (🟠):**
- direccion
- barrio
- elevacion
- profundidad
- existe_tapa
- estado_tapa
- existe_cilindro
- diametro_cilindro

**Opcionales (🟢):**
- sistema
- anio_instalacion
- tipo_camara
- estructura_pavimento
- material_tapa
- existe_cono
- tipo_cono
- material_cono
- estado_cono
- material_cilindro
- estado_cilindro
- existe_caniuela
- material_caniuela
- estado_caniuela
- existe_peldanios
- material_peldanios
- numero_peldanios
- estado_peldanios
- observaciones

### Campos TUBERIAS (9 campos - Repetibles)

- id_tuberia
- tipo_tuberia (entrada/salida)
- diametro_mm
- material
- cota_z
- estado
- emboquillado
- longitud

### Campos SUMIDEROS (8 campos - Repetibles)

- id_sumidero
- tipo_sumidero
- num_esquema
- diametro_mm
- material_tuberia
- altura_salida_m
- altura_llegada_m

### Campos FOTOS (6 campos - Repetibles)

- id_foto
- tipo_foto
- ruta_archivo (imagen)
- fecha_captura
- descripcion

---

## Flujos de Uso

### Flujo 1: Diseño Visual

```
1. Usuario abre "Diseñador de Fichas"
2. Crea nuevo diseño
3. Selecciona tamaño de página (A4/Letter)
4. Selecciona orientación (Portrait/Landscape)
5. Arrastra campos del panel izquierdo al canvas
6. Posiciona y redimensiona elementos
7. Personaliza estilos (color, fuente, tamaño)
8. Configura campos repetibles (tuberías, sumideros, fotos)
9. Guarda diseño con nombre y versión
10. Establece como diseño por defecto (opcional)
```

### Flujo 2: Importar HTML

```
1. Usuario abre "Diseñador de Fichas"
2. Hace clic en "Importar HTML"
3. Sube archivo HTML prediseñado
4. Sistema parsea HTML y extrae estructura
5. Usuario mapea elementos HTML a campos del diccionario
6. Sistema genera FieldPlacements automáticamente
7. Usuario ajusta posiciones y estilos si es necesario
8. Guarda como nueva versión de diseño
```

### Flujo 3: Generar PDF con Diseño

```
1. Usuario carga datos de pozo (Excel)
2. Selecciona diseño a usar
3. Sistema lee diseño guardado
4. Sistema lee datos del pozo
5. Sistema renderiza HTML según diseño
6. Sistema convierte a PDF
7. Usuario descarga PDF
```

---

## Funcionalidades Principales

### Panel de Campos

- ✅ Listar todos los campos del diccionario
- ✅ Agrupar por categoría (Pozo, Tuberías, Sumideros, Fotos)
- ✅ Búsqueda y filtrado
- ✅ Drag & drop a canvas
- ✅ Indicador de campos obligatorios (🔴), importantes (🟠), opcionales (🟢)

### Canvas de Diseño

- ✅ Grilla editable (A4/Letter, portrait/landscape)
- ✅ Drag & drop de campos
- ✅ Redimensionamiento de elementos
- ✅ Selección de elementos
- ✅ Snap to grid (opcional)
- ✅ Zoom in/out
- ✅ Undo/Redo
- ✅ Preview en tiempo real
- ✅ Mostrar guías de alineación

### Panel de Propiedades

- ✅ Editar propiedades del elemento seleccionado
- ✅ Cambiar estilos (color, fuente, tamaño)
- ✅ Configurar repetibilidad
- ✅ Cambiar label personalizado
- ✅ Validaciones en tiempo real

### Toolbar

- ✅ Nuevo diseño
- ✅ Guardar diseño
- ✅ Cargar diseño
- ✅ Duplicar diseño
- ✅ Eliminar diseño
- ✅ Importar HTML
- ✅ Gestor de versiones
- ✅ Preview PDF
- ✅ Exportar diseño (JSON)

### Gestor de Versiones

- ✅ Listar todas las versiones
- ✅ Crear nueva versión
- ✅ Duplicar versión
- ✅ Renombrar versión
- ✅ Eliminar versión
- ✅ Establecer versión por defecto
- ✅ Ver historial de cambios

### Importador de HTML

- ✅ Upload de archivo HTML
- ✅ Parsear estructura HTML
- ✅ Extraer elementos (div, img, table, etc.)
- ✅ Mapear a campos del diccionario
- ✅ Guardar como nueva versión
- ✅ Validar HTML

---

## Generación de PDF desde Diseño

### Proceso

```
1. Leer FichaDesign guardado
2. Leer datos del Pozo (con tuberías, sumideros, fotos)
3. Para cada FieldPlacement en el diseño:
   a. Obtener valor del pozo
   b. Si es repetible (tuberías, sumideros, fotos):
      - Renderizar N veces (una por cada item)
      - Aplicar itemSpacing
      - Si pageBreak=true y hay muchos items: saltar página
   c. Si es imagen: insertar imagen
   d. Si es tabla: renderizar tabla
   e. Aplicar estilos (color, fuente, tamaño, etc.)
4. Convertir HTML renderizado a PDF
5. Retornar PDF
```

### Manejo de Campos Repetibles

```
Ejemplo: Tuberías (pueden ser 1, 2, 3... N)

Diseño especifica:
- FieldPlacement para "tuberias" con isRepeatable=true
- itemSpacing: 10mm
- pageBreak: true (si hay más de 5 tuberías, saltar página)

Generación:
- Si pozo tiene 3 tuberías:
  - Renderizar tubería 1 en posición Y
  - Renderizar tubería 2 en posición Y + 10mm
  - Renderizar tubería 3 en posición Y + 20mm
  
- Si pozo tiene 8 tuberías:
  - Renderizar tuberías 1-5 en página 1
  - Saltar a página 2
  - Renderizar tuberías 6-8 en página 2
```

---

## Persistencia

### Almacenamiento

- **Diseños**: IndexedDB (local) + Backend (sincronización)
- **Versiones**: Historial completo en IndexedDB
- **HTML importado**: Guardar HTML original en `htmlSource`

### Sincronización

- Auto-save cada 30 segundos
- Mantener últimas 10 versiones
- Permitir exportar/importar diseños (JSON)

---

## Validaciones

### Validaciones de Diseño

- ✅ Nombre de diseño no vacío
- ✅ Al menos un campo en el diseño
- ✅ Campos no se solapan (opcional)
- ✅ Campos dentro de los márgenes de página
- ✅ Tamaño mínimo de campo (10mm x 10mm)

### Validaciones de HTML Importado

- ✅ HTML válido
- ✅ Estructura reconocible
- ✅ Elementos mapeables a campos del diccionario

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

### Caso 2: Diseño Complejo

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

## Interfaz de Usuario

### Panel de Campos (Izquierda)

```
┌─────────────────────────┐
│ 🔍 Buscar campos...     │
├─────────────────────────┤
│ 📋 POZO (33)            │
│   🔴 id_pozo            │
│   🔴 coordenada_x       │
│   🔴 coordenada_y       │
│   🟠 direccion          │
│   🟢 observaciones      │
│                         │
│ 🔗 TUBERIAS (9)         │
│   🔴 id_tuberia         │
│   🔴 tipo_tuberia       │
│   🟠 material           │
│                         │
│ 🌊 SUMIDEROS (8)        │
│   🔴 id_sumidero        │
│   🟠 tipo_sumidero      │
│                         │
│ 📸 FOTOS (6)            │
│   🔴 id_foto            │
│   🔴 ruta_archivo       │
└─────────────────────────┘
```

### Canvas (Centro)

```
┌──────────────────────────────────────┐
│ A4 Portrait - Zoom 100%              │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │ FICHA DE INSPECCIÓN            │  │
│  ├────────────────────────────────┤  │
│  │ ID: [id_pozo]                  │  │
│  │ Dirección: [direccion]         │  │
│  │ Fecha: [fecha]                 │  │
│  ├────────────────────────────────┤  │
│  │ TUBERIAS                       │  │
│  │ [tabla de tuberías]            │  │
│  ├────────────────────────────────┤  │
│  │ FOTOS                          │  │
│  │ [galería de fotos]             │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

### Panel de Propiedades (Derecha)

```
┌─────────────────────────┐
│ Propiedades             │
├─────────────────────────┤
│ ID: field_1             │
│ Campo: id_pozo          │
│ Tipo: Texto             │
│                         │
│ Posición                │
│ X: 10 mm                │
│ Y: 20 mm                │
│                         │
│ Tamaño                  │
│ Ancho: 80 mm            │
│ Alto: 10 mm             │
│                         │
│ Estilos                 │
│ Fuente: Arial           │
│ Tamaño: 12 pt           │
│ Color: #000000          │
│ Fondo: #FFFFFF          │
│                         │
│ Configuración           │
│ ☐ Repetible             │
│ Label: ID del Pozo      │
└─────────────────────────┘
```

---

## Tecnologías Sugeridas

- **Canvas/Diseño**: React + Konva.js o Fabric.js
- **Drag & Drop**: dnd-kit
- **HTML Parsing**: jsdom o html-parse-stringify
- **PDF Generation**: jsPDF + html2canvas
- **Persistencia**: IndexedDB + Zustand
- **UI**: Tailwind CSS + Shadcn/ui

---

## Próximos Pasos

1. ✅ Crear tipos de datos
2. ✅ Crear store de diseños
3. ✅ Implementar Panel de Campos
4. ✅ Implementar Canvas de Diseño
5. ✅ Implementar Panel de Propiedades
6. ✅ Implementar Toolbar
7. ✅ Implementar Importador de HTML
8. ✅ Implementar Gestor de Versiones
9. ✅ Implementar Generador de PDF desde Diseño
10. ✅ Testing y validaciones

---

¿Algún ajuste o aclaración sobre el Diseñador de Fichas?
