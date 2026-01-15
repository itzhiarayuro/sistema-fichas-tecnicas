# Documento de Auditoría y Evaluación para Arquitecto Senior
## Sistema de Gestión de Fichas Técnicas de Pozos

Este documento ha sido generado para facilitar una evaluación externa profunda sobre la integridad, seguridad y eficiencia del sistema actual.

---

### 1. Resumen Ejecutivo de la Arquitectura
El sistema es una aplicación **Local-First** construida sobre **Next.js 14+ (App Router)**. Su objetivo es transformar datos crudos de Excel y fotografías en fichas técnicas PDF parametrizables mediante un diseñador visual tipo canvas.

- **Frontend**: React, TailwindCSS, Lucide Icons.
- **Estado**: Zustand con persistencia (IndexedDB/LocalStorage).
- **Persistencia de Binarios**: BlobStore personalizado para manejo de imágenes fuera del estado de memoria.
- **Procesamiento**: Web Workers para el parsing de Excel pesado.
- **Salida**: jsPDF para la generación de documentos del lado del cliente.

---

### 2. Estructura de Datos y Flujo (Reciprocidad)
El sistema mantiene una "Sincronía Bidireccional" entre tres capas:
1.  **Capa de Importación**: `parsers/excelParser.ts` (Normaliza variaciones de Excel).
2.  **Capa de Dominio**: `types/pozo.ts` (Modelo de verdad, 33 campos planos + estructuras anidadas).
3.  **Capa de Presentación**: `constants/fieldMapping.ts` (Puente entre el modelo y el diseñador visual).

**Punto de Evaluación**: Verificar si existen fugas de coherencia entre los campos del Excel y los slots definidos en `AVAILABLE_DATA_FIELDS`.

---

### 3. Análisis de Vulnerabilidades Potenciales (Seguridad)
- **Sanitización**: El sistema permite importar fragmentos HTML para el diseñador. Se debe evaluar el riesgo de **XSS (Cross-Site Scripting)** en el `HTMLImporter.tsx`.
- **Límite de Recursos**: Al no tener backend, el sistema es vulnerable a ataques de "Agotamiento de RAM" si se cargan miles de fotos base64 simultáneamente (Mitigado parcialmente por `BlobStore`).
- **Seguridad de Datos**: Todo reside en el navegador del usuario. Evaluar si la falta de cifrado en reposo (`IndexedDB`) es aceptable para la sensibilidad de los datos del proyecto.

---

### 4. Redundancia y Deuda Técnica
- **Mapeo Manual**: El archivo `fieldMapping.ts` contiene definiciones manuales de rutas de objetos (ej. `identificacion.idPozo.value`). Evaluar si una aproximación reflexiva o basada en esquemas sería más óptima.
- **Doble Lógica de PDF**: Coexisten `pdfGenerator.ts` (Legacy/Automático) y `designBasedPdfGenerator.ts` (Nuevo/Visual). Evaluar el impacto de mantener ambos o la necesidad de una unificación inmediata.

---

### 5. Áreas Críticas para el Arquitecto (Lo que aún no vemos)
- **Reciprocidad de Datos**: ¿Qué sucede si el modelo de datos `Pozo` evoluciona pero el `FichaDesignVersion` del usuario tiene campos antiguos? (Falta una capa de Migración de Esquemas).
- **Manejo de Memoria**: El sistema realiza múltiples clones de estado profundo (`deepClone`) para el historial Undo/Redo. En diseños complejos con muchas imágenes, esto podría degradar la performance drásticamente.
- **Inyección de Código Malicioso**: Verificar que ninguna dependencia de terceros (npm) esté realizando llamadas externas fuera de la ejecución local.

---

### 6. Mapa de Archivos Clave para Revisión
1.  `src/stores/globalStore.ts`: Cerebro del estado global.
2.  `src/lib/storage/blobStore.ts`: Gestión de memoria para archivos grandes.
3.  `src/lib/pdf/designBasedPdfGenerator.ts`: Algoritmo de renderizado y paginación.
4.  `src/components/designer/DesignCanvas.tsx`: Lógica de manipulación espacial y transformaciones.

---

### PREGUNTAS CLAVE PARA EL EVALUADOR:
1.  ¿Es la estructura de `FichaDesignVersion` escalable para soportar tablas dinámicas complejas o solo sirve para campos fijos?
2.  ¿Existe algún riesgo de desbordamiento de búfer o pérdida de datos al persistir estados grandes en `IndexedDB`?
3.  ¿Cómo afectaría la inclusión de un backend futuro al desacoplamiento actual del sistema?
