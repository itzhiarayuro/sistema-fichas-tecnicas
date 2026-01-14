# 📋 REVISIÓN DEL DICCIONARIO DE DATOS - RESUMEN EJECUTIVO

**Fecha de Revisión:** 2024-01-13  
**Archivo Fuente:** `modelo de datos/diccionario_datos_completo.md`  
**Estado:** ✅ Revisión Completada

---

## 1. CAMPOS OBLIGATORIOS 🔴 (6 campos)

### TABLA POZOS - Campos que SIEMPRE deben estar presentes:

| # | Campo | Tipo | Descripción | Validación |
|---|-------|------|-------------|-----------|
| 1 | **Id_pozo** | Texto (20) | Identificador único del pozo | Único, no nulo |
| 2 | **Coordenada X** | Decimal | Longitud geográfica | Rango válido, no nulo |
| 3 | **Coordenada Y** | Decimal | Latitud geográfica | Rango válido, no nulo |
| 4 | **Fecha** | Fecha | Fecha de inspección | Formato YYYY-MM-DD, no nulo |
| 5 | **Levantó** | Texto (100) | Inspector que realizó levantamiento | No nulo, máx 100 caracteres |
| 6 | **Estado** | Texto (50) | Estado general del pozo | Valores predefinidos: Bueno/Regular/Malo, no nulo |

**Implicación:** Estos 6 campos DEBEN estar presentes en todo Excel cargado. Si faltan, el sistema debe rechazar la carga o usar valores por defecto seguros.

---

## 2. CAMPOS IMPORTANTES 🟠 (8 campos)

### TABLA POZOS - Campos recomendados que mejoran la calidad:

| # | Campo | Tipo | Descripción | Validación | Dependencia |
|---|-------|------|-------------|-----------|------------|
| 1 | **Dirección** | Texto (200) | Dirección física del pozo | Máx 200 caracteres | Ninguna |
| 2 | **Barrio** | Texto (100) | Barrio o sector | Máx 100 caracteres | Ninguna |
| 3 | **Elevación** | Decimal | Elevación sobre nivel del mar (m) | Número positivo | Ninguna |
| 4 | **Profundidad** | Decimal | Profundidad del pozo (m) | > 0 | Ninguna |
| 5 | **Existe tapa** | Booleano | ¿Tiene tapa el pozo? | Sí/No | Ninguna |
| 6 | **Estado tapa** | Texto (50) | Estado de la tapa | Valores predefinidos | **Depende de:** Existe tapa = Sí |
| 7 | **Existe Cilindro** | Booleano | ¿Tiene cilindro el pozo? | Sí/No | Ninguna |
| 8 | **Diametro Cilindro (m)** | Decimal | Diámetro del cilindro en metros | > 0 | **Depende de:** Existe cilindro = Sí |

**Implicación:** Estos campos son recomendados. Si faltan, el sistema debe permitir continuar pero marcar visualmente como "incompleto".

---

## 3. CAMPOS OPCIONALES 🟢 (19 campos)

### TABLA POZOS - Campos que pueden estar vacíos:

| # | Campo | Tipo | Descripción | Validación |
|---|-------|------|-------------|-----------|
| 1 | Sistema | Texto (100) | Sistema al que pertenece | Máx 100 caracteres |
| 2 | Año de instalación | Número entero | Año en que se instaló | Año válido (1900-2100) |
| 3 | Tipo Cámara | Texto (100) | Tipo de cámara del pozo | Circular/Rectangular/Cuadrada |
| 4 | Estructura de pavimento | Texto (100) | Tipo de pavimento superficial | Concreto/Asfalto/Tierra |
| 5 | Material tapa | Texto (50) | Material de la tapa | Hierro fundido/Concreto/Plástico |
| 6 | Existe cono | Booleano | ¿Tiene cono? | Sí/No |
| 7 | Tipo Cono | Texto (50) | Tipo de cono | Estándar/Especial |
| 8 | **Material Cono** | Texto (50) | Material del cono | Concreto/Hierro/Mixto |
| 9 | Estado Cono | Texto (50) | Estado del cono | Bueno/Regular/Malo |
| 10 | Material Cilindro | Texto (50) | Material del cilindro | Concreto/Hierro/Ladrillo |
| 11 | Estado Cilindro | Texto (50) | Estado del cilindro | Bueno/Regular/Malo |
| 12 | Existe Cañuela | Booleano | ¿Tiene cañuela? | Sí/No |
| 13 | Material Cañuela | Texto (50) | Material de la cañuela | Concreto/Hierro |
| 14 | Estado Cañuela | Texto (50) | Estado de la cañuela | Bueno/Regular/Malo |
| 15 | Existe Peldaños | Booleano | ¿Tiene peldaños? | Sí/No |
| 16 | Material Peldaños | Texto (50) | Material de los peldaños | Hierro/Acero/Concreto |
| 17 | Número Peldaños | Número entero | Cantidad de peldaños | > 0 |
| 18 | Estado Peldaños | Texto (50) | Estado de los peldaños | Bueno/Regular/Malo |
| 19 | Observaciones | Texto largo | Observaciones adicionales | Sin límite de caracteres |

**Implicación:** Estos campos pueden estar vacíos sin afectar la validación. El sistema debe permitir valores nulos.

---

## 4. CAMBIOS EN NOMENCLATURA IDENTIFICADOS 🔄

### Correcciones de Nombres de Campos:

| Nombre Anterior (INCORRECTO) | Nombre Correcto (USAR) | Tabla | Impacto |
|------------------------------|----------------------|-------|--------|
| **Logitud** | **Longitud** | TUBERÍAS | Alto - Campo importante |
| **Materia Cono** | **Material Cono** | POZOS | Bajo - Campo opcional |
| **Materia Tuberia** | **Material Tubería** | TUBERÍAS | Alto - Campo obligatorio |

**Acción Requerida:** 
- Actualizar parser de Excel para mapear ambos nombres (antiguo y nuevo)
- Mostrar advertencia si se detecta nombre antiguo
- Normalizar internamente al nombre correcto

---

## 5. UNIFICACIÓN DE TUBERÍAS 🔗

### CAMBIO ESTRUCTURAL IMPORTANTE:

**ANTES (Estructura Antigua):**
```
- Tabla: TUBERÍAS_ENTRADA
  - Id_tuberia, Id_pozo, ø, Material, Z, Estado, ...

- Tabla: TUBERÍAS_SALIDA
  - Id_tuberia, Id_pozo, ø, Material, Z, Estado, ...
```

**AHORA (Estructura Unificada):**
```
- Tabla: TUBERÍAS (Una sola tabla)
  - Id_tuberia 🔴
  - Id_pozo 🔴
  - tipo_tuberia 🔴 (NUEVO CAMPO: "entrada" o "salida")
  - ø (mm) 🔴
  - Material 🔴
  - Z 🟠
  - Estado 🟠
  - Emboquillado 🟢
  - Longitud 🟢
```

### Campos de la Tabla TUBERÍAS Unificada:

| # | Campo | Tipo | Obligatorio | Descripción |
|---|-------|------|------------|-------------|
| 1 | **Id_tuberia** | Texto (20) | 🔴 Sí | Identificador único |
| 2 | **Id_pozo** | Texto (20) | 🔴 Sí | Referencia al pozo (integridad referencial) |
| 3 | **tipo_tuberia** | Texto (20) | 🔴 Sí | "entrada" o "salida" (NUEVO) |
| 4 | **ø (mm)** | Número entero | 🔴 Sí | Diámetro en milímetros, > 0 |
| 5 | **Material** | Texto (50) | 🔴 Sí | PVC/GRES/Concreto/Hierro Fundido/Polietileno |
| 6 | **Z** | Decimal | 🟠 Recomendado | Cota o profundidad |
| 7 | **Estado** | Texto (50) | 🟠 Recomendado | Bueno/Regular/Malo |
| 8 | **Emboquillado** | Booleano | 🟢 Opcional | Sí/No |
| 9 | **Longitud** | Decimal | 🟢 Opcional | En metros, > 0 |

**Implicación:** 
- El parser de Excel debe detectar si hay columnas "Tuberías_entrada" o "Tuberías_salida" y convertirlas a la estructura unificada
- Agregar campo `tipo_tuberia` automáticamente basado en la hoja de origen
- Validar integridad referencial: todo Id_pozo debe existir en tabla POZOS

---

## 6. TABLA SUMIDEROS 📍

### Estructura Completa:

| # | Campo | Tipo | Obligatorio | Descripción | Validación |
|---|-------|------|------------|-------------|-----------|
| 1 | **Id_sumidero** | Texto (20) | 🔴 Sí | Identificador único | Único, no nulo |
| 2 | **Id_pozo** | Texto (20) | 🔴 Sí | Pozo al que conecta | Debe existir en POZOS |
| 3 | **Tipo sumidero** | Texto (100) | 🟠 Recomendado | Tipo de sumidero | Rejilla/Buzón/Combinado/Lateral |
| 4 | **#_esquema** | Número entero | 🟢 Opcional | Número en esquema/plano | Número positivo |
| 5 | **ø (mm)** | Número entero | 🟢 Opcional | Diámetro en milímetros | > 0 |
| 6 | **Material Tubería** | Texto (50) | 🟢 Opcional | Material | GRES/PVC/Concreto |
| 7 | **H salida (m)** | Decimal | 🟢 Opcional | Altura de salida | Número positivo |
| 8 | **H llegada (m)** | Decimal | 🟢 Opcional | Altura de llegada | Número positivo |

---

## 7. TABLA FOTOS (NUEVA - SUGERIDA) 📸

### Estructura Propuesta:

| # | Campo | Tipo | Obligatorio | Descripción |
|---|-------|------|------------|-------------|
| 1 | **Id_foto** | Texto (50) | 🔴 Sí | Identificador único |
| 2 | **Id_pozo** | Texto (20) | 🔴 Sí | Pozo fotografiado |
| 3 | **tipo_foto** | Texto (50) | 🔴 Sí | Tipo: tapa/interior/general/entrada/salida/sumidero |
| 4 | **ruta_archivo** | Texto (500) | 🔴 Sí | Ruta del archivo |
| 5 | **fecha_captura** | Fecha/Hora | 🟠 Recomendado | Fecha y hora de captura |
| 6 | **descripcion** | Texto largo | 🟢 Opcional | Descripción de la foto |

**Nota:** Esta tabla se genera automáticamente al cargar fotos con nomenclatura válida.

---

## 8. VALORES PREDEFINIDOS (LISTAS DESPLEGABLES) 📋

### Estados (Aplicable a múltiples campos):
```
- Bueno
- Regular
- Malo
- Muy Malo
- No Aplica
```

### Materiales de Tuberías:
```
- PVC
- GRES
- Concreto
- Hierro Fundido
- Polietileno
```

### Materiales de Componentes de Pozo:
```
- Concreto
- Hierro
- Hierro Fundido
- Ladrillo
- Mixto
```

### Tipos de Tubería (NUEVO):
```
- entrada
- salida
```

### Tipos de Sumidero:
```
- Rejilla
- Buzón
- Combinado
- Lateral
```

### Tipos de Cámara:
```
- Circular
- Rectangular
- Cuadrada
```

---

## 9. REGLAS DE VALIDACIÓN RECOMENDADAS ✅

### 9.1 Integridad Referencial:
```
✓ Toda tubería debe tener un Id_pozo que exista en POZOS
✓ Todo sumidero debe tener un Id_pozo que exista en POZOS
✓ Id_pozo, Id_tuberia, Id_sumidero deben ser únicos globalmente
```

### 9.2 Validaciones de Negocio (Condicionales):
```
✓ Si existe_tapa = Sí → estado_tapa DEBE estar lleno
✓ Si existe_cilindro = Sí → diametro_cilindro DEBE estar lleno y > 0
✓ Si existe_peldaños = Sí → numero_peldaños DEBE estar lleno y > 0
✓ Si existe_cono = Sí → tipo_cono DEBE estar lleno
✓ Si existe_cañuela = Sí → material_cañuela DEBE estar lleno
```

### 9.3 Validaciones de Rango:
```
✓ Profundidad > 0
✓ Diámetros > 0
✓ Número de peldaños > 0
✓ Coordenadas en rangos geográficos válidos (Colombia: -81 a -66 longitud, 1 a 13 latitud)
✓ Año de instalación entre 1900 y 2100
```

### 9.4 Validaciones de Formato:
```
✓ Fechas en formato YYYY-MM-DD
✓ Coordenadas con máximo 6 decimales
✓ Números positivos para medidas
✓ Textos sin caracteres especiales problemáticos
```

---

## 10. ESTADÍSTICAS DE LA ESTRUCTURA 📊

### TABLA POZOS:
- **Total de campos:** 33
- **Obligatorios (🔴):** 6 campos (18%)
- **Importantes (🟠):** 8 campos (24%)
- **Opcionales (🟢):** 19 campos (58%)

### TABLA TUBERÍAS:
- **Total de campos:** 9 (incluyendo nuevo campo `tipo_tuberia`)
- **Obligatorios (🔴):** 5 campos (56%)
- **Importantes (🟠):** 2 campos (22%)
- **Opcionales (🟢):** 2 campos (22%)

### TABLA SUMIDEROS:
- **Total de campos:** 8
- **Obligatorios (🔴):** 2 campos (25%)
- **Importantes (🟠):** 1 campo (12.5%)
- **Opcionales (🟢):** 5 campos (62.5%)

### TABLA FOTOS:
- **Total de campos:** 6
- **Obligatorios (🔴):** 4 campos (67%)
- **Importantes (🟠):** 1 campo (17%)
- **Opcionales (🟢):** 1 campo (16%)

---

## 11. RECOMENDACIONES FINALES ✅

### ✅ Estructura Actual:
- La estructura es **EXCELENTE** y bien pensada
- Los 33 campos del pozo son útiles y necesarios
- La unificación de tuberías es un mejora importante
- La tabla de fotos es una adición valiosa

### ✅ Acciones Requeridas:
1. **Corregir nombres:** Logitud → Longitud, Materia → Material
2. **Unificar tuberías:** Crear tabla única con campo `tipo_tuberia`
3. **Implementar validaciones:** Especialmente las condicionales
4. **Crear tabla FOTOS:** Para gestión centralizada de fotografías
5. **Definir listas desplegables:** Para campos con valores predefinidos

### ✅ Próximos Pasos en Implementación:
1. Actualizar tipos TypeScript con esta estructura
2. Actualizar parser de Excel para mapear todos los campos
3. Implementar validaciones de negocio
4. Crear componentes de UI para cada sección
5. Actualizar generador de PDF

---

## 12. MAPEO A REQUIREMENTS 📌

Esta revisión cubre los siguientes requirements:

- **Requirement 5.1-5.5:** Trazabilidad de Datos - Estructura completa documentada
- **Requirement 1.8-1.9:** Carga de Archivos - Campos y validaciones definidas
- **Requirement 11.1-11.5:** Validación de Datos - Reglas de validación documentadas

---

**Documento Generado:** 2024-01-13  
**Estado:** ✅ Listo para implementación  
**Próxima Tarea:** 3.5.2 Revisar guía de implementación
