# Guía Completa - Sistema de Fichas Técnicas de Pozos

## 📋 Tabla de Contenidos
1. [Introducción](#introducción)
2. [Archivos de Ejemplo](#archivos-de-ejemplo)
3. [Flujo Completo Paso a Paso](#flujo-completo-paso-a-paso)
4. [Nomenclatura de Fotos](#nomenclatura-de-fotos)
5. [Campos del Excel](#campos-del-excel)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Introducción

Este sistema permite:
- ✅ Cargar datos de pozos desde Excel
- ✅ Asociar fotos automáticamente por nomenclatura
- ✅ Editar fichas técnicas de forma visual
- ✅ Generar PDFs profesionales
- ✅ Exportar datos en lote

---

## 📦 Archivos de Ejemplo

### Excel: `ejemplo_pozos.xlsx`
Contiene 2 pozos completos con todos los datos:

| Campo | M680 | M681 |
|-------|------|------|
| Código | M680 | M681 |
| Dirección | Calle 45 #12-34 | Carrera 10 #20-15 |
| Barrio | Centro | Norte |
| Sistema | Sanitario | Pluvial |
| Estado | Bueno | Regular |
| Altura Total | 2.50 m | 3.00 m |
| Rasante | 1850.25 | 1852.10 |
| Tapa Material | Hierro fundido | Concreto |
| Tapa Estado | Bueno | Regular |
| Cono Tipo | Excéntrico | Concéntrico |
| Cono Material | Concreto | Concreto |
| Cuerpo Diámetro | 1.20 m | 1.00 m |
| Cañuela Material | Concreto | Concreto |
| Peldaños Cantidad | 8 | 10 |
| Peldaños Material | Hierro | Acero |

### Imágenes JPG

**Para M680 (4 fotos):**
- `M680-P.jpg` - Panorámica
- `M680-T.jpg` - Tapa
- `M680-I.jpg` - Interna
- `M680-A.jpg` - Acceso

**Para M681 (4 fotos):**
- `M681-P.jpg` - Panorámica
- `M681-T.jpg` - Tapa
- `M681-E1-T.jpg` - Entrada 1 (Tubería)
- `M681-E1-Z.jpg` - Entrada 1 (Zona)

---

## 🚀 Flujo Completo Paso a Paso

### PASO 1️⃣: Ir a la página de Cargar Archivos

1. Abre la aplicación
2. Haz clic en "Cargar Archivos" en el menú
3. Verás la página de carga con:
   - Zona de arrastrar archivos
   - Guía de formato Excel
   - Guía de nomenclatura de fotos

### PASO 2️⃣: Cargar el Excel

**Opción A - Arrastrar:**
1. Arrastra `ejemplo_pozos.xlsx` a la zona gris
2. El sistema procesará el archivo

**Opción B - Seleccionar:**
1. Haz clic en la zona gris
2. Selecciona `ejemplo_pozos.xlsx`
3. Haz clic en "Abrir"

**Resultado esperado:**
```
✓ Carga completada: 2 pozos, 0 fotos
```

Verás una tabla con:
- Nombre del archivo
- Estado: ✓ Éxito
- Mensaje: "2 pozos extraídos"

### PASO 3️⃣: Cargar las Imágenes

1. Arrastra todas las imágenes JPG a la zona de carga
   - M680-P.jpg
   - M680-T.jpg
   - M680-I.jpg
   - M680-A.jpg
   - M681-P.jpg
   - M681-T.jpg
   - M681-E1-T.jpg
   - M681-E1-Z.jpg

2. El sistema procesará cada imagen

**Resultado esperado:**
```
✓ Carga completada: 0 pozos, 8 fotos
```

Verás en la tabla:
- Cada imagen con estado ✓ Éxito
- Mensaje: "Asociada: Panorámica" (o el tipo correspondiente)

### PASO 4️⃣: Continuar a Revisar Pozos

1. Haz clic en el botón "Continuar" (abajo a la derecha)
2. Se abrirá la página "Revisar Pozos"

**Qué verás:**
- Tabla con 2 pozos (M680 y M681)
- Columnas: Código, Dirección, Barrio, Sistema, Estado, Fotos, Acciones
- Ambos pozos mostrarán:
  - ✓ Estado: "Completo" (verde)
  - 4 fotos asociadas

### PASO 5️⃣: Abrir una Ficha para Editar

1. Haz clic en el pozo M680
2. Se abrirá el editor con:
   - **Panel izquierdo**: Formulario editable
   - **Panel derecho**: Vista previa en tiempo real

**Secciones del editor:**
- 📍 Identificación (código, dirección, barrio, etc.)
- 🏗️ Estructura (altura, rasante, tapa, cono, etc.)
- 🔧 Tuberías (entradas, salidas)
- 📸 Fotos (galería de imágenes)

### PASO 6️⃣: Editar Datos

1. Haz clic en cualquier campo para editarlo
2. Escribe el nuevo valor
3. Presiona Enter o haz clic fuera del campo
4. La vista previa se actualiza automáticamente

**Ejemplo:**
- Haz clic en "Dirección"
- Cambia "Calle 45 #12-34" a "Calle 50 #15-40"
- Verás el cambio en la vista previa al instante

### PASO 7️⃣: Ver las Fotos

1. Desplázate hasta la sección "Fotos"
2. Verás 4 imágenes:
   - Panorámica
   - Tapa
   - Interna
   - Acceso

3. Puedes:
   - Hacer clic para ampliar
   - Arrastrar para reordenar
   - Eliminar si lo deseas

### PASO 8️⃣: Generar PDF

1. Haz clic en el botón "Generar PDF" (arriba)
2. Se descargará un archivo `M680.pdf`

**El PDF incluye:**
- Datos completos del pozo
- Todas las fotos
- Formato profesional
- Información de la estructura

### PASO 9️⃣: Volver a la Lista

1. Haz clic en "Volver" o en el botón de atrás
2. Regresarás a la lista de pozos
3. Puedes editar otro pozo o cargar más datos

---

## 📸 Nomenclatura de Fotos

### Regla Principal
```
{CODIGO_POZO}-{TIPO}.jpg
```

### Tipos Válidos

#### Fotos Principales (1 letra)
| Código | Tipo | Ejemplo |
|--------|------|---------|
| P | Panorámica | M680-P.jpg |
| T | Tapa | M680-T.jpg |
| I | Interna | M680-I.jpg |
| A | Acceso | M680-A.jpg |
| F | Fondo | M680-F.jpg |
| M | Medición | M680-M.jpg |

#### Fotos de Entradas (E + número + tipo)
| Código | Tipo | Ejemplo |
|--------|------|---------|
| E1-T | Entrada 1 - Tubería | M680-E1-T.jpg |
| E1-Z | Entrada 1 - Zona | M680-E1-Z.jpg |
| E2-T | Entrada 2 - Tubería | M680-E2-T.jpg |
| E2-Z | Entrada 2 - Zona | M680-E2-Z.jpg |

#### Fotos de Salidas (S + tipo)
| Código | Tipo | Ejemplo |
|--------|------|---------|
| S-T | Salida - Tubería | M680-S-T.jpg |
| S-Z | Salida - Zona | M680-S-Z.jpg |
| S1-T | Salida 1 - Tubería | M680-S1-T.jpg |
| S1-Z | Salida 1 - Zona | M680-S1-Z.jpg |

#### Fotos de Sumideros (SUM + número)
| Código | Tipo | Ejemplo |
|--------|------|---------|
| SUM1 | Sumidero 1 | M680-SUM1.jpg |
| SUM2 | Sumidero 2 | M680-SUM2.jpg |
| SUM3 | Sumidero 3 | M680-SUM3.jpg |

### ✅ Ejemplos Correctos
```
M680-P.jpg          ✓ Panorámica de M680
M680-T.jpg          ✓ Tapa de M680
M680-E1-T.jpg       ✓ Entrada 1 Tubería de M680
M681-S-Z.jpg        ✓ Salida Zona de M681
M682-SUM1.jpg       ✓ Sumidero 1 de M682
```

### ❌ Ejemplos Incorrectos
```
M680-PT.jpg         ✗ Combina dos tipos (usar M680-P.jpg y M680-T.jpg)
M680-Panoramica.jpg ✗ Nombre descriptivo (usar M680-P.jpg)
680-P.jpg           ✗ Falta la letra del código (usar M680-P.jpg)
M680.jpg            ✗ Sin tipo de foto
```

---

## 📊 Campos del Excel

### Campos Obligatorios
- **codigo**: Identificador único del pozo (ej: M680)

### Campos Recomendados (para ficha completa)
- **direccion**: Ubicación del pozo
- **barrio**: Sector o zona
- **sistema**: Tipo de sistema (Sanitario, Pluvial, Combinado)
- **estado**: Condición actual (Bueno, Regular, Malo)
- **fecha**: Fecha de inspección
- **observaciones**: Notas adicionales
- **altura_total**: Altura en metros
- **rasante**: Cota de rasante
- **tapa_material**: Material de la tapa
- **tapa_estado**: Estado de la tapa
- **cono_tipo**: Tipo de cono
- **cono_material**: Material del cono
- **cuerpo_diametro**: Diámetro del cuerpo
- **canuela_material**: Material de la cañuela
- **peldanos_cantidad**: Número de peldaños
- **peldanos_material**: Material de los peldaños

### Variaciones de Nombres Aceptadas
El sistema es flexible con los nombres de columnas:

| Aceptado | También funciona |
|----------|------------------|
| codigo | código, cod, id, numero, número |
| direccion | dirección, dir, ubicacion, ubicación |
| barrio | sector, zona, localidad |
| sistema | red, tipo_sistema |
| estado | condicion, condición, status |
| fecha | fecha_inspeccion, date |
| altura_total | altura, height |
| tapa_material | material_tapa |

---

## 🔧 Troubleshooting

### ❌ "Sin fotos asociadas"

**Causa:** Las fotos no coinciden con el código del pozo

**Solución:**
1. Verifica que el nombre de la foto comience con el código correcto
   - ✓ M680-P.jpg para el pozo M680
   - ✗ M681-P.jpg para el pozo M680

2. Verifica la nomenclatura
   - ✓ M680-P.jpg
   - ✗ M680-Panoramica.jpg

3. Recarga la página y vuelve a cargar las fotos

### ❌ "Incompleto"

**Causa:** Faltan campos en el Excel o fotos

**Solución:**
1. Verifica que el Excel tenga todos estos campos:
   - codigo ✓
   - direccion ✓
   - barrio ✓
   - sistema ✓
   - estado ✓
   - altura_total ✓
   - rasante ✓
   - tapa_material ✓
   - tapa_estado ✓
   - cono_tipo ✓
   - cono_material ✓
   - cuerpo_diametro ✓
   - canuela_material ✓
   - peldanos_cantidad ✓
   - peldanos_material ✓

2. Verifica que haya cargado al menos una foto

3. Descarga la plantilla desde la aplicación y úsala como referencia

### ❌ "Nomenclatura no reconocida"

**Causa:** El nombre de la foto no sigue el formato esperado

**Solución:**
1. Verifica que el nombre tenga el formato correcto:
   - `{CODIGO}-{TIPO}.jpg`
   - Ejemplo: `M680-P.jpg`

2. Verifica que uses solo letras y números
   - ✓ M680-P.jpg
   - ✗ M680 - P.jpg (espacios)
   - ✗ M680_P.jpg (guión bajo)

3. Verifica que el tipo sea válido (P, T, I, A, F, M, E1-T, S-T, SUM1, etc.)

### ❌ Las fotos no aparecen en el editor

**Causa:** Las fotos se cargaron pero no se asociaron

**Solución:**
1. Recarga la página (F5)
2. Vuelve a cargar las fotos
3. Verifica que los nombres sean exactos (mayúsculas/minúsculas importan)

### ❌ El PDF no se genera

**Causa:** Datos incompletos o error temporal

**Solución:**
1. Verifica que la ficha esté completa
2. Intenta de nuevo
3. Si persiste, recarga la página

---

## 💡 Tips y Trucos

### Tip 1: Descargar la Plantilla
En la página de carga, haz clic en "Descargar plantilla Excel" para obtener un archivo con la estructura correcta.

### Tip 2: Edición Rápida
En el editor, presiona Tab para pasar al siguiente campo.

### Tip 3: Vista Previa en Tiempo Real
Mientras editas, la vista previa se actualiza automáticamente. Úsala para verificar cambios.

### Tip 4: Reordenar Fotos
En la sección de fotos, puedes arrastrar las imágenes para cambiar el orden.

### Tip 5: Exportar en Lote
Desde la lista de pozos, puedes seleccionar varios y exportar todos los PDFs a la vez.

---

## 📞 Soporte

Si tienes problemas:
1. Consulta esta guía
2. Verifica los archivos de ejemplo
3. Intenta con los datos de ejemplo primero
4. Recarga la página si algo no funciona

---

**¡Listo! Ya sabes cómo usar el sistema. ¡Comienza con los archivos de ejemplo!**
