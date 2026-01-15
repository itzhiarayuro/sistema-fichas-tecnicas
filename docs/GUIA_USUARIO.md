# 📘 Guía de Usuario - Sistema de Fichas Técnicas

Bienvenido al sistema de gestión de fichas técnicas de pozos. Esta guía explica cómo utilizar todas las funcionalidades del sistema.

## 🚀 Inicio Rápido

1. **Cargar Excel**: Desde el dashboard, sube tu archivo Excel con los datos.
2. **Seleccionar Pozo**: Elige un pozo de la lista para editar.
3. **Validar Informacion**: Revisa que los datos sean correctos (campos obligatorios en rojo).
4. **Agregar Fotos**: Sube las fotografías correspondientes.
5. **Generar PDF**: Descarga la ficha técnica finalizada.

---

## 🛡️ Integridad y Estabilidad del Sistema

### Fuente de verdad del sistema
El modelo interno del sistema es la fuente de verdad para todos los datos.
El archivo Excel es tratado como un input externo, que puede contener inconsistencias, variaciones de nombres o datos incompletos.

Para garantizar estabilidad y evitar regresiones, los datos provenientes del Excel no se usan directamente, sino que se procesan mediante una capa de adaptación explícita que los convierte al modelo interno del sistema.

Esto permite que el sistema se mantenga estable incluso si el formato del Excel cambia ligeramente en el futuro.

### Adaptador de datos desde Excel
El sistema utiliza una capa de adaptación entre el Excel y el modelo interno.
Esta capa es responsable de:
- Mapear columnas del Excel a claves internas del sistema
- Corregir variaciones nominales (por ejemplo, errores tipográficos)
- Asignar valores seguros cuando faltan columnas
- Ignorar columnas desconocidas sin generar errores fatales

Esta estrategia evita acoplar el dominio del sistema directamente al formato del Excel y reduce el riesgo de errores silenciosos.

### Recuperación ante errores
El sistema está diseñado para no quedar en un estado inutilizable ante errores inesperados (cierres del navegador, datos corruptos, fallos de carga).

Al iniciar, el sistema intenta recuperar el estado en el siguiente orden:
1. Último estado válido guardado
2. Snapshot anterior
3. Estado base seguro

Si ocurre un error durante la ejecución, este se contiene y el sistema intenta continuar desde el último estado válido disponible, mostrando mensajes claros al usuario.

### Alineación con el archivo Excel
La alineación entre el sistema y el Excel se realiza de forma controlada e incremental.
El sistema no depende estructuralmente del Excel, sino que mantiene su propio modelo interno estable.

Cualquier ajuste futuro en la estructura del Excel se gestiona mediante el adaptador de entrada, sin necesidad de modificar la lógica central del sistema ni los componentes de visualización.

---

## 📊 1. Carga de Datos (Excel)

El sistema acepta archivos Excel (.xlsx) con la siguiente estructura:
- **Hoja POZOS**: Contiene la información principal del pozo (identificación, ubicación, componentes).
- **Hoja TUBERIAS**: Contiene el listado de tuberías (entradas y salidas).
- **Hoja SUMIDEROS**: Contiene información de sumideros conectados.
- **Hoja FOTOS**: (Opcional) Metadatos de fotografías.

### Campos Importantes
- **ID Pozo**: Campo obligatorio que vincula todas las hojas.
- **Coordenadas**: Recomendado incluirlas para validación geográfica.
- **Fechas**: Formato YYYY-MM-DD.

---

## ✏️ 2. Edición de Fichas

La interfaz de edición permite modificar todos los datos del pozo.

### Secciones
- **Identificación**: Datos básicos. El ID y coordenadas son críticos.
- **Ubicación**: Dirección y datos físicos.
- **Componentes**: Tapa, cilindro, cono, etc. Campos condicionales (ej. Si hay tapa, se pide estado).
- **Tuberías**: Tabla unificada de entradas y salidas.
  - *Nuevo*: Se incluyen campos como Emboquillado y Longitud.
  - *Nuevo*: Validación de tipo (Entrada/Salida).
- **Sumideros**: Gestión de sumideros conectados.
  - *Nuevo*: Campo "No. Esquema".
- **Fotos**: Galería interactiva. Arrastra y suelta para reordenar.

### Iconos de Validación
- 🔴 **Error**: Campo obligatorio faltante o dato inválido. Bloquea la finalización.
- 🟠 **Advertencia**: Dato importante faltante o inusual. Permite continuar pero se recomienda revisar.
- ✅ **Correcto**: Dato válido.

---

## 🎨 3. Diseñador de Fichas (Nuevo)

Permite personalizar la apariencia del PDF sin código.

### Funcionalidades
- **Editor Visual**: Arrastra campos al lienzo para posicionarlos.
- **Importar HTML**: Si tienes un diseño previo en HTML, úsalo como plantilla.
- **Versiones**: Guarda múltiples versiones de tu diseño.

---

## 📄 4. Generación de PDF

Una vez completada la ficha:
1. Ve a la pestaña **Exportar**.
2. Selecciona el diseño (Default o personalizado.
3. Clic en **Descargar PDF**.

El PDF incluirá todas las secciones, fotos y diagramas organizados automáticamente.

---

## ❓ Preguntas Frecuentes

**¿Qué pasa si mi Excel tiene otro formato?**
El sistema intenta detectar las columnas automáticamente. Si faltan columnas obligatorias, se mostrará un aviso.

**¿Puedo trabajar sin internet?**
El sistema funciona localmente una vez cargado, pero requiere conexión para mapas y sincronización si se habilita.

**¿Dónde guardo las fotos?**
Las fotos se cargan directamente en el navegador. Para persistencia a largo plazo, asegúrate de guardar/exportar los datos.
