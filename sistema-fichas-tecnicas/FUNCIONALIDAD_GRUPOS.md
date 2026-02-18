# Funcionalidad de Agrupación de Elementos en el Panel de Capas

## Descripción

El panel de capas ahora soporta la agrupación visual de elementos (campos y shapes) para facilitar la organización y manipulación de múltiples elementos como una unidad.

## Cómo Usar

### 1. Selección Múltiple
- Mantén presionado **Ctrl** (Windows/Linux) o **Cmd** (Mac)
- Haz clic en los elementos que quieres agrupar
- Verás checkboxes marcados en los elementos seleccionados

### 2. Crear Grupo
- Una vez que tengas 2 o más elementos seleccionados
- Aparecerá un botón morado **"Agrupar X elementos"** en la parte superior del panel
- Haz clic en el botón para crear el grupo
- El grupo se creará automáticamente con un nombre como "Grupo 1", "Grupo 2", etc.

### 3. Trabajar con Grupos
- **Expandir/Colapsar**: Haz clic en la flecha junto al icono de carpeta
- **Ver elementos**: Cuando está expandido, verás todos los elementos del grupo indentados
- **Desagrupar**: Haz clic en el botón de desagrupar (⇄) que aparece al pasar el mouse sobre el grupo
- **Ocultar/Mostrar**: Usa el icono de ojo para ocultar/mostrar todo el grupo
- **Bloquear**: Usa el icono de candado para bloquear todo el grupo

### 4. Características Visuales
- **Grupos**: Fondo morado/índigo con icono de carpeta 📁
- **Elementos seleccionados**: Fondo verde con checkbox marcado ✓
- **Elementos en grupo**: Se muestran indentados con una línea vertical morada

## Características

### Selección Múltiple
- Usa Ctrl/Cmd + Click para seleccionar múltiples elementos
- Los checkboxes muestran qué elementos están seleccionados
- Puedes seleccionar campos, shapes, o una mezcla de ambos

### Grupos Jerárquicos
- Los grupos se muestran como carpetas colapsables
- Los elementos dentro del grupo se muestran indentados
- Línea vertical morada conecta los elementos del grupo

### Operaciones de Grupo
- **Crear**: Selecciona múltiples elementos y haz clic en "Agrupar"
- **Desagrupar**: Click en el botón ⇄ del grupo
- **Expandir/Colapsar**: Click en la flecha del grupo
- **Visibilidad**: Oculta/muestra todos los elementos del grupo
- **Bloqueo**: Bloquea todos los elementos del grupo

## Estructura de Datos

### GroupElement
```typescript
interface GroupElement {
    id: string;
    type: 'group';
    name?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    pageNumber?: number;
    childIds: string[];
    isVisible?: boolean;
    isLocked?: boolean;
    isCollapsed?: boolean;
    repeatOnEveryPage?: boolean;
}
```

### Elementos con Grupo
Los elementos (FieldPlacement y ShapeElement) ahora tienen:
```typescript
groupId?: string; // ID del grupo al que pertenece
```

## Casos de Uso

### 1. Agrupar Encabezado
Selecciona el logo, título y fecha → Agrupar → "Encabezado"

### 2. Agrupar Sección de Datos
Selecciona todos los campos de "Identificación" → Agrupar → "Datos de Identificación"

### 3. Agrupar Elementos Decorativos
Selecciona líneas, rectángulos y texto decorativo → Agrupar → "Decoración"

### 4. Organizar por Páginas
Agrupa elementos que van en la misma página → "Página 1", "Página 2", etc.

## Atajos de Teclado

- **Ctrl/Cmd + Click**: Selección múltiple
- Los grupos se pueden expandir/colapsar con un solo click

## Flujo de Trabajo Recomendado

1. **Diseña tu layout**: Arrastra campos y shapes al canvas
2. **Organiza visualmente**: Posiciona los elementos donde los necesitas
3. **Agrupa elementos relacionados**: 
   - Selecciona elementos relacionados (Ctrl/Cmd + Click)
   - Haz clic en "Agrupar"
4. **Nombra tus grupos**: (Próximamente: editar nombre del grupo)
5. **Colapsa grupos**: Mantén tu panel de capas limpio colapsando grupos

## Limitaciones Actuales

- No se soportan grupos anidados (grupos dentro de grupos)
- Los nombres de grupos se generan automáticamente ("Grupo 1", "Grupo 2", etc.)
- Para renombrar un grupo, necesitarás usar el panel de propiedades (próximamente)

## Próximas Mejoras

1. **Renombrar grupos**: Click derecho → Renombrar
2. **Arrastrar elementos entre grupos**: Drag & drop para reorganizar
3. **Grupos anidados**: Soporte para jerarquías más complejas
4. **Colores de grupo**: Asignar colores a grupos para mejor identificación
5. **Duplicar grupo**: Duplicar un grupo completo con todos sus elementos

## API Programática

```typescript
import { useDesignStore } from '@/stores/designStore';

function MyComponent() {
  const { createGroup, ungroupElements, updateGroup } = useDesignStore();
  
  // Crear grupo
  const groupId = createGroup(versionId, ['field-1', 'shape-2'], 'Mi Grupo');
  
  // Desagrupar
  ungroupElements(versionId, groupId);
  
  // Actualizar grupo
  updateGroup(versionId, groupId, { name: 'Nuevo Nombre', isVisible: false });
}
```

## Historial y Undo/Redo

Todas las operaciones de agrupación se registran en el historial:
- Crear grupo → Undo deshace la agrupación
- Desagrupar → Undo restaura el grupo
- Las operaciones mantienen el estado completo del diseño
