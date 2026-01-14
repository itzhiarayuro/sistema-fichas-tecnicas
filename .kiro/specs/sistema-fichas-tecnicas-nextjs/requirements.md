# Requirements Document

## Introduction

Sistema de Fichas Técnicas de Pozos de Inspección - una aplicación web profesional construida con Next.js (App Router), React y TypeScript que permite generar, editar y personalizar fichas técnicas de pozos de alcantarillado a partir de datos Excel y fotografías. El sistema incluye un editor visual en tiempo real estilo PDF Builder con sincronización bidireccional entre la vista de edición y el resultado final.

El sistema está diseñado bajo principios de robustez extrema, fail-safe y fool-proof, garantizando que ninguna acción del usuario pueda romper la aplicación y que los datos nunca se pierdan.

## Glossary

- **Sistema**: La aplicación web completa de fichas técnicas
- **Ficha_Técnica**: Documento PDF generado con información estructurada de un pozo de inspección, tratada como unidad aislada e independiente
- **Pozo**: Estructura de alcantarillado con datos técnicos y fotografías asociadas
- **Editor_Visual**: Componente de edición en tiempo real estilo PDF Builder
- **Vista_Previa**: Panel que muestra el resultado final de la ficha en tiempo real
- **Nomenclatura**: Sistema de nombres de archivos para asociar fotos con pozos (ej: M680-P.jpg)
- **Sección**: Bloque de contenido dentro de una ficha (identificación, estructura, tuberías, fotos)
- **Trazabilidad**: Sistema que indica el origen y fuente de cada dato mostrado
- **Sincronización**: Actualización bidireccional en tiempo real entre editor y vista previa
- **Fail_Safe**: Principio de diseño donde los fallos no rompen el sistema ni pierden información
- **Fool_Proof**: Diseño a prueba de errores humanos donde el usuario no puede romper el sistema
- **Snapshot**: Copia del estado del sistema en un momento específico para recuperación (solo datos estructurales)
- **Modo_Guiado**: Modo de operación simplificado que previene acciones peligrosas
- **Modo_Degradado**: Operación restringida automática bajo alta carga para prevenir colapso
- **Principio_Rector**: Nada pesado en memoria, nada crítico en una sola capa, nada del usuario rompe el sistema
- **Resource_Manager**: Componente central que monitorea y gestiona recursos físicos (RAM, Workers)
- **Lifecycle_Manager**: Gestiona el ciclo de vida de las fichas (active/suspended/destroyed)

## Requirements

### Requirement 0: Principios de Robustez y Seguridad Operativa

**User Story:** Como arquitecto del sistema, quiero que la aplicación sea inherentemente segura y robusta, para que ningún fallo o error humano pueda comprometer la integridad del sistema o los datos.

#### Acceptance Criteria

1. THE Sistema SHALL estar diseñado bajo el principio fail-safe: si algo falla, el sistema no se rompe, no se pierde información y no se bloquea el flujo de trabajo
2. THE Sistema SHALL ser a prueba de errores humanos (fool-proof): el usuario no puede romper el sistema aunque lo intente
3. THE Sistema SHALL requerir confirmación explícita para todas las acciones destructivas
4. THE Sistema SHALL anticipar y manejar graciosamente los errores comunes del usuario
5. THE Sistema SHALL priorizar en todo momento: integridad de datos, continuidad del trabajo y recuperación automática ante fallos
6. THE Sistema SHALL nunca mostrar errores técnicos al usuario, solo mensajes claros y accionables

### Requirement 1: Carga de Archivos

**User Story:** Como usuario, quiero cargar archivos Excel y fotografías mediante drag & drop, para que el sistema procese automáticamente los datos y asocie las fotos con los pozos correspondientes.

#### Acceptance Criteria

1. WHEN el usuario arrastra archivos sobre la zona de carga THEN THE Sistema SHALL mostrar feedback visual indicando que puede soltar los archivos
2. WHEN el usuario suelta archivos válidos (.xlsx, .jpg, .png) THEN THE Sistema SHALL procesarlos y mostrar un resumen de archivos cargados
3. WHEN el usuario intenta cargar archivos con formato no soportado THEN THE Sistema SHALL rechazar el archivo y mostrar mensaje de error descriptivo
4. WHEN se carga un archivo Excel THEN THE Sistema SHALL extraer los datos de pozos y mostrar estadísticas (cantidad de pozos, campos detectados)
5. WHEN se cargan fotografías THEN THE Sistema SHALL asociarlas automáticamente con los pozos según la nomenclatura del nombre de archivo
6. THE Sistema SHALL mostrar progreso de carga para archivos grandes (>5MB)
7. WHEN la carga se completa exitosamente THEN THE Sistema SHALL persistir los datos en el estado de la aplicación
8. WHEN un archivo Excel tenga columnas desconocidas THEN THE Sistema SHALL ignorarlas sin error
9. WHEN falten columnas esperadas THEN THE Sistema SHALL 
mapear lo disponible y advertir visualmente sin bloquear el flujo
10. WHEN una imagen esté corrupta THEN THE Sistema SHALL omitirla, registrar el error y permitir reemplazo manual

### Requirement 2: Visualización de Datos

**User Story:** Como usuario, quiero ver los datos cargados en una tabla interactiva, para poder revisar y seleccionar los pozos que deseo procesar.

#### Acceptance Criteria

1. WHEN los datos se cargan exitosamente THEN THE Sistema SHALL mostrar una tabla con todos los pozos detectados
2. THE Sistema SHALL permitir ordenar la tabla por cualquier columna
3. THE Sistema SHALL permitir filtrar pozos por estado, sistema o búsqueda de texto
4. WHEN el usuario selecciona un pozo THEN THE Sistema SHALL mostrar una vista previa de la ficha técnica
5. THE Sistema SHALL mostrar indicadores visuales del estado de cada pozo (fotos asociadas, datos completos)
6. WHEN el usuario hace clic en una celda THEN THE Sistema SHALL mostrar tooltip con la fuente del dato

### Requirement 3: Editor Visual de Fichas

**User Story:** Como usuario, quiero editar las fichas técnicas visualmente en tiempo real, para personalizar el contenido y formato antes de generar el PDF final.

#### Acceptance Criteria

1. WHEN el usuario abre el editor THEN THE Sistema SHALL mostrar la ficha en modo edición con controles visuales
2. THE Sistema SHALL permitir editar texto directamente haciendo clic en los campos
3. THE Sistema SHALL permitir agregar, quitar y reordenar imágenes mediante drag & drop
4. THE Sistema SHALL permitir cambiar el tamaño de imágenes y bloques de texto
5. THE Sistema SHALL permitir reordenar secciones de la ficha mediante drag & drop
6. WHEN el usuario modifica cualquier elemento THEN THE Sistema SHALL actualizar la vista previa en tiempo real (latencia <100ms)
7. THE Sistema SHALL mantener un historial de cambios con opción de deshacer/rehacer
8. THE Sistema SHALL validar que los cambios no rompan la estructura base de la ficha
9. THE Sistema SHALL impedir que el usuario elimine secciones obligatorias o rompa la estructura mínima de la ficha
10. WHEN el usuario intente una acción inválida THEN THE Sistema SHALL rechazarla silenciosamente y explicar el motivo de forma clara

### Requirement 4: Sincronización en Tiempo Real

**User Story:** Como usuario, quiero ver los cambios reflejados instantáneamente tanto en el editor como en la vista previa, para tener certeza de cómo quedará el documento final.

#### Acceptance Criteria

1. WHEN el usuario edita en el panel de edición THEN THE Vista_Previa SHALL actualizarse en tiempo real
2. WHEN el usuario edita en la vista previa THEN THE Editor_Visual SHALL reflejar los cambios
3. THE Sistema SHALL sincronizar cambios de texto, imágenes y estructura bidireccionalmente
4. IF ocurre un conflicto de sincronización THEN THE Sistema SHALL priorizar el último cambio y notificar al usuario
5. THE Sistema SHALL mantener consistencia de datos entre ambas vistas en todo momento

### Requirement 5: Trazabilidad de Datos

**User Story:** Como usuario, quiero conocer el origen de cada dato mostrado en la ficha, para poder verificar la información y entender de dónde proviene.

#### Acceptance Criteria

1. WHEN el usuario pasa el cursor sobre un dato THEN THE Sistema SHALL mostrar tooltip con la fuente de información
2. THE Sistema SHALL indicar si el dato proviene del Excel, fue editado manualmente, o es un valor por defecto
3. THE Sistema SHALL proporcionar un botón de "Ayuda / Fuente" que muestre información detallada del origen
4. WHEN un dato ha sido modificado THEN THE Sistema SHALL mostrar indicador visual de edición
5. THE Sistema SHALL mantener registro de todas las modificaciones con timestamp y valor original

### Requirement 6: Personalización de Formato

**User Story:** Como usuario, quiero personalizar el formato y estilos de las fichas, para adaptar el diseño a mis necesidades específicas.

#### Acceptance Criteria

1. THE Sistema SHALL permitir cambiar colores de encabezados y secciones
2. THE Sistema SHALL permitir modificar tamaños de fuente para títulos, etiquetas y valores
3. THE Sistema SHALL permitir ajustar márgenes y espaciado entre secciones
4. THE Sistema SHALL permitir seleccionar entre plantillas predefinidas
5. WHEN el usuario guarda una configuración personalizada THEN THE Sistema SHALL persistirla para uso futuro
6. THE Sistema SHALL aplicar los cambios de formato en tiempo real a la vista previa

### Requirement 7: Generación de PDF

**User Story:** Como usuario, quiero generar PDFs de las fichas técnicas con alta calidad, para poder imprimir o compartir los documentos.

#### Acceptance Criteria

1. WHEN el usuario solicita generar PDF THEN THE Sistema SHALL crear el documento respetando todos los estilos y personalizaciones
2. THE Sistema SHALL generar PDFs con resolución de impresión (300 DPI para imágenes)
3. THE Sistema SHALL permitir generar PDFs individuales o en lote (múltiples pozos)
4. WHEN se genera un lote THEN THE Sistema SHALL mostrar progreso y permitir cancelar
5. THE Sistema SHALL comprimir las imágenes optimizando tamaño sin perder calidad visible
6. WHEN la generación se completa THEN THE Sistema SHALL ofrecer descarga directa o como archivo ZIP

### Requirement 8: Interfaz de Usuario Profesional

**User Story:** Como usuario, quiero una interfaz moderna y profesional, para tener una experiencia de uso fluida y agradable.

#### Acceptance Criteria

1. THE Sistema SHALL implementar diseño con sidebar de navegación fija y área de contenido principal
2. THE Sistema SHALL usar paleta de colores corporativa (azul primario #1F4E79, verde ambiental #2E7D32)
3. THE Sistema SHALL implementar transiciones suaves y feedback visual en todas las interacciones
4. THE Sistema SHALL ser completamente responsive (desktop, tablet, móvil)
5. THE Sistema SHALL mostrar estados de carga con skeletons o spinners apropiados
6. THE Sistema SHALL implementar notificaciones toast para feedback de acciones
7. THE Sistema SHALL seguir principios de accesibilidad WCAG 2.1 nivel AA

### Requirement 9: Gestión de Estado y Persistencia

**User Story:** Como usuario, quiero que mis datos y configuraciones se mantengan entre sesiones, para no perder mi trabajo.

#### Acceptance Criteria

1. THE Sistema SHALL persistir datos cargados en localStorage/IndexedDB
2. THE Sistema SHALL guardar automáticamente cambios cada 30 segundos
3. WHEN el usuario cierra el navegador y regresa THEN THE Sistema SHALL restaurar el estado anterior
4. THE Sistema SHALL permitir exportar e importar configuraciones
5. IF ocurre un error durante el guardado THEN THE Sistema SHALL notificar al usuario y reintentar
6. THE Sistema SHALL manejar el estado bajo el principio: "estado local por ficha, estado global solo explícito"
7. IF un error ocurre en una ficha THEN THE Sistema SHALL registrarse solo en su contexto y NO modificar el estado global de la aplicación

### Requirement 10: Nomenclatura y Asociación de Fotos

**User Story:** Como usuario, quiero que el sistema reconozca automáticamente el tipo de foto según su nombre, para que se ubique correctamente en la ficha.

#### Acceptance Criteria

1. WHEN se carga una foto con nomenclatura válida (ej: M680-P.jpg) THEN THE Sistema SHALL asociarla al pozo y categoría correctos
2. THE Sistema SHALL reconocer los siguientes tipos: P (Panorámica), T (Tapa), I (Interna), A (Acceso), F (Fondo), M (Medición)
3. THE Sistema SHALL reconocer fotos de entradas (E1-T, E1-Z, E2-T...) y salidas (S-T, S-Z, S1-T...)
4. THE Sistema SHALL reconocer fotos de sumideros (SUM1, SUM2...)
5. WHEN una foto no coincide con ningún patrón THEN THE Sistema SHALL permitir asociación manual
6. THE Sistema SHALL mostrar guía de nomenclatura accesible al usuario

### Requirement 11: Validación y Autocorrección de Datos

**User Story:** Como usuario, quiero que el sistema detecte, prevenga y corrija errores automáticamente, para no romper el flujo de trabajo aunque los datos estén incompletos o incorrectos.

#### Acceptance Criteria

1. THE Sistema SHALL validar TODOS los datos entrantes (Excel, fotos, edición manual)
2. WHEN un dato requerido esté ausente THEN THE Sistema SHALL usar un valor seguro por defecto y marcarlo visualmente como "dato incompleto"
3. WHEN un valor tenga formato incorrecto THEN THE Sistema SHALL intentar normalizarlo automáticamente; si no es posible, notificar sin bloquear el flujo
4. THE Sistema SHALL nunca lanzar errores fatales por datos inválidos
5. THE Sistema SHALL permitir continuar el proceso incluso con datos incompletos

### Requirement 12: Protección Contra Errores del Usuario

**User Story:** Como usuario, quiero que el sistema me impida cometer errores graves, incluso si hago clic donde no debo.

#### Acceptance Criteria

1. THE Sistema SHALL bloquear acciones destructivas sin confirmación explícita
2. Acciones como borrar secciones, eliminar imágenes y resetear formatos SHALL requerir confirmación doble
3. THE Sistema SHALL permitir deshacer cualquier acción crítica
4. THE Sistema SHALL mostrar advertencias claras antes de cambios irreversibles

### Requirement 13: Recuperación ante Fallos

**User Story:** Como usuario, quiero que mi trabajo nunca se pierda, incluso si el navegador falla o ocurre un error inesperado.

#### Acceptance Criteria

1. THE Sistema SHALL guardar snapshots automáticos cada 30 segundos
2. THE Sistema SHALL mantener al menos los últimos 10 estados válidos
3. WHEN ocurre un crash THEN THE Sistema SHALL restaurar el último estado estable
4. THE Sistema SHALL permitir restauración manual de versiones anteriores

### Requirement 14: Modo Guiado para Usuarios No Técnicos

**User Story:** Como usuario, quiero que el sistema me guíe para no cometer errores, incluso si no sé cómo funciona internamente.

#### Acceptance Criteria

1. THE Sistema SHALL ofrecer un "Modo Guiado" opcional
2. En Modo Guiado: se deshabilitan acciones avanzadas peligrosas y se muestran recomendaciones contextuales
3. THE Sistema SHALL sugerir correcciones automáticas cuando detecte inconsistencias
4. THE Sistema SHALL explicar errores en lenguaje no técnico

### Requirement 15: Criterio de Finalización del Sistema

**User Story:** Como stakeholder, quiero criterios claros de completitud del sistema, para saber cuándo está listo para producción.

#### Acceptance Criteria

1. THE Sistema se considera COMPLETO cuando ninguna acción del usuario puede romper la aplicación
2. THE Sistema se considera COMPLETO cuando ningún error de datos bloquea el flujo
3. THE Sistema se considera COMPLETO cuando todo cambio es reversible
4. THE Sistema se considera COMPLETO cuando la ficha final siempre es válida
5. THE Sistema se considera COMPLETO cuando puede recuperarse tras un fallo sin pérdida de información
6. THE Sistema se considera COMPLETO cuando la UX guía al usuario en todo momento

### Requirement 16: Aislamiento e Independencia entre Fichas

**User Story:** Como usuario, quiero que cada ficha técnica sea completamente independiente, para que errores, personalizaciones o datos incorrectos de una ficha no afecten a ninguna otra.

#### Acceptance Criteria

1. THE Sistema SHALL tratar cada Ficha_Técnica como una unidad aislada e independiente
2. WHEN una ficha contiene datos incompletos, errores o personalizaciones avanzadas THEN NINGÚN dato, error, estado o configuración SHALL propagarse a otras fichas
3. THE Sistema SHALL inicializar cada nueva ficha desde un estado base limpio, definido por la plantilla seleccionada, los datos específicos de ese pozo y configuraciones globales explícitas (solo si el usuario lo indica)
4. THE Sistema SHALL prohibir el uso de estados compartidos mutables entre fichas
5. Cambios realizados en una ficha SHALL aplicarse únicamente a esa ficha y persistirse únicamente en su propio scope
6. WHEN una ficha presenta errores de datos THEN el error SHALL quedar confinado a esa ficha y el sistema SHALL continuar permitiendo crear o editar otras fichas normalmente
7. THE Sistema SHALL impedir que validaciones fallidas, flags de error o estados "incompletos" afecten a fichas ya terminadas o futuras
8. Personalizaciones de formato (colores, tamaños, orden de secciones) SHALL ser locales por ficha, salvo que el usuario marque explícitamente "Aplicar como plantilla global"
9. THE Sistema SHALL diferenciar claramente entre configuración global y configuración por ficha
10. THE Sistema SHALL persistir cada ficha en un namespace independiente (ej: por ID único)
11. WHEN una ficha se marca como "Finalizada" THEN su estado SHALL congelarse y quedar protegida contra mutaciones accidentales
12. THE Sistema SHALL permitir duplicar una ficha duplicando solo su estructura base sin arrastrar errores ni estados inválidos
13. THE Sistema SHALL mostrar indicadores claros de estado por ficha (completa / incompleta / con advertencias) sin afectar visualmente a otras fichas
14. THE Sistema SHALL permitir reiniciar una ficha individual sin afectar ninguna otra y sin perder configuraciones globales


### Requirement 17: Contención Total de Errores y Observabilidad Interna

**User Story:** Como arquitecto del sistema, quiero que cualquier error sea completamente contenido, observable y diagnosticable, sin afectar otras fichas ni el estado global del sistema.

#### Acceptance Criteria

1. THE Sistema SHALL encapsular errores por ficha, operación y sesión sin propagarlos fuera de su contexto
2. WHEN ocurre un error interno THEN THE Sistema SHALL registrarse de forma estructurada (log interno), NO romper el flujo del usuario y NO afectar otras fichas ni configuraciones
3. THE Sistema SHALL diferenciar claramente entre errores de datos, errores de usuario y errores del sistema
4. THE Sistema SHALL exponer al usuario solo mensajes comprensibles, acciones recomendadas y estado seguro del sistema
5. THE Sistema SHALL permitir diagnosticar errores por ficha, limpiar errores sin reiniciar la aplicación y continuar trabajando normalmente
6. UNDER NO CIRCUMSTANCE SHALL un error en una ficha bloquear la creación de nuevas fichas, afectar fichas finalizadas o contaminar plantillas base


### Requirement 19: Límites Explícitos y Modo Degradado

**User Story:** Como administrador del sistema, quiero establecer límites físicos innegociables para que la aplicación cambie su comportamiento proactivamente bajo carga extrema en lugar de colapsar.

#### Acceptance Criteria - Límites de Entrada (Innegociables)
1. THE Sistema SHALL limitar a **100 fotos por pozo** (Advertir al exceder).
2. THE Sistema SHALL entrar en Modo Degradado al superar **2.000 fotos totales**.
3. THE Sistema SHALL rechazar fotos individuales que pesen más de **10 MB**.
4. THE Sistema SHALL encolar el procesamiento si hay más de **20 archivos Excel** simultáneos.
5. THE Sistema SHALL suspender fichas inactivas si hay más de **25 fichas activas**.

#### Acceptance Criteria - Modo Degradado (Obligatorio)
6. THE Sistema SHALL activar automáticamente el Modo Degradado cuando:
   - La memoria estimada supere el umbral crítico.
   - La cantidad de fotos supere el umbral de 2.000.
   - Todos los Workers estén saturados.
7. EN Modo Degradado, THE Sistema SHALL:
   - Desactivar la Vista Previa en tiempo real.
   - Desactivar animaciones y transiciones complejas.
   - Desactivar la sincronización bidireccional inmediata.
   - Mantener la edición segura, el guardado y la recuperación de errores.
   - Informar claramente al usuario que el sistema está operando en modo de ahorro de recursos.

### Requirement 20: Gestión de Recursos y Ciclo de Vida

**User Story:** Como desarrollador, quiero un componente central que gestione el uso de RAM y Workers para asegurar la estabilidad a largo plazo.

#### Acceptance Criteria
1. THE Sistema SHALL implementar un **Resource Manager** que monitoree memoria, workers y aplique límites.
2. THE Sistema SHALL implementar un **Lifecycle Manager** que gestione estados de ficha: `mounted` → `active` → `suspended` → `resumed` → `destroyed`.
3. UNA Ficha `suspended` SHALL liberar todos sus recursos pesados (imágenes cargadas, listeners, observers).
4. UNA Ficha `destroyed` SHALL persistir su estado y liberar toda la RAM asociada inmediatamente.
5. TODO procesamiento pesado (Excel, Fotos, PDF) SHALL ejecutarse exclusivamente en **Web Workers** cancelables.
