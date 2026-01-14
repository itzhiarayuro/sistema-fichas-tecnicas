# Design Document: Sistema de Fichas Técnicas de Pozos

## Overview

Este documento describe la arquitectura técnica del Sistema de Fichas Técnicas de Pozos, una aplicación Next.js 14+ con App Router que implementa un editor visual en tiempo real para fichas técnicas de pozos de inspección de alcantarillado.

El sistema está diseñado bajo principios de robustez extrema (fail-safe, fool-proof) con aislamiento completo entre fichas y contención total de errores.

### Principios Arquitectónicos

1. **Fail-Safe by Design**: Toda operación tiene un fallback seguro
2. **Aislamiento Total**: Cada ficha es una unidad independiente con su propio estado
3. **Inmutabilidad**: Estado gestionado con patrones inmutables para facilitar undo/redo
4. **Sincronización Optimista**: Actualizaciones en tiempo real con reconciliación
5. **Persistencia Defensiva**: Múltiples capas de backup y recuperación

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       UI / UX                           │
│  (Virtualizada, degradable, consciente de carga)        │
├─────────────────────────────────────────────────────────┤
│               Application Orchestration                 │
│  Workflow + Limits + Mode Manager                       │
├─────────────────────────────────────────────────────────┤
│                 Domain / Business Core                  │
│  Fichas | Validación | Invariantes | Commands            │
├─────────────────────────────────────────────────────────┤
│           Resource & Lifecycle Management                │
│  Memory | Workers | Cancellation | Suspension            │
├─────────────────────────────────────────────────────────┤
│                 Storage Abstraction                     │
│  IndexedDB (data) | FS/Blob (files)                      │
├─────────────────────────────────────────────────────────┤
│                 Background Processing                   │
│  ExcelWorker | PhotoWorker | PdfWorker                  │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Core Components

```typescript
// components/layout/
├── AppShell.tsx           // Layout principal con sidebar
├── Sidebar.tsx            // Navegación lateral
├── Header.tsx             // Barra superior con contexto
└── ContextIndicator.tsx   // Indicador de ficha actual y estado

// components/upload/
├── DropZone.tsx           // Zona de drag & drop
├── FileList.tsx           // Lista de archivos cargados
├── UploadProgress.tsx     // Progreso de carga
└── FileValidationBadge.tsx // Estado de validación

// components/pozos/
├── PozosTable.tsx         // Tabla interactiva de pozos
├── PozoRow.tsx            // Fila individual con estado
├── PozoFilters.tsx        // Filtros y búsqueda
└── PozoStatusBadge.tsx    // Indicador de completitud

// components/editor/
├── EditorLayout.tsx       // Layout split editor/preview
├── EditorPanel.tsx        // Panel de edición
├── PreviewPanel.tsx       // Vista previa en tiempo real
├── SectionEditor.tsx      // Editor de sección individual
├── ImageEditor.tsx        // Editor de imágenes con resize
├── TextEditor.tsx         // Editor de texto inline
├── DragHandle.tsx         // Control de reordenamiento
└── ToolBar.tsx            // Barra de herramientas

// components/ficha/
├── FichaHeader.tsx        // Encabezado de ficha
├── FichaSection.tsx       // Sección genérica
├── IdentificacionSection.tsx
├── EstructuraSection.tsx
├── TuberiasSection.tsx
├── FotosSection.tsx
└── ObservacionesSection.tsx

// components/ui/
├── ConfirmDialog.tsx      // Diálogo de confirmación doble
├── Toast.tsx              // Notificaciones no intrusivas
├── Tooltip.tsx            // Tooltips con trazabilidad
├── LoadingSkeleton.tsx    // Estados de carga
└── ErrorBoundary.tsx      // Contención de errores por componente
```

### Key Interfaces

```typescript
interface Pozo {
  id: string;
  identificacion: {
    idPozo: FieldValue;
    coordenadaX: FieldValue;
    coordenadaY: FieldValue;
    fecha: FieldValue;
    levanto: FieldValue;
    estado: FieldValue;
  };
  ubicacion: {
    direccion: FieldValue;
    barrio: FieldValue;
    elevacion: FieldValue;
    profundidad: FieldValue;
  };
  componentes: {
    existeTapa: FieldValue;
    estadoTapa: FieldValue;
    existeCilindro: FieldValue;
    diametroCilindro: FieldValue;
    sistema: FieldValue;
    anoInstalacion: FieldValue;
    tipoCamara: FieldValue;
    estructuraPavimento: FieldValue;
    materialTapa: FieldValue;
    existeCono: FieldValue;
    tipoCono: FieldValue;
    materialCono: FieldValue;
    estadoCono: FieldValue;
    materialCilindro: FieldValue;
    estadoCilindro: FieldValue;
    existeCanuela: FieldValue;
    materialCanuela: FieldValue;
    estadoCanuela: FieldValue;
    existePeldanos: FieldValue;
    materialPeldanos: FieldValue;
    numeroPeldanos: FieldValue;
    estadoPeldanos: FieldValue;
  };
  observaciones: {
    observaciones: FieldValue;
  };
  tuberias: { tuberias: TuberiaInfo[] };
  sumideros: { sumideros: SumideroInfo[] };
  fotos: { fotos: FotoInfo[] };
  metadata: PozoMetadata;
}

interface FotoInfo {
  id: string;
  path: string;
  filename: string;
  categoria: 'PRINCIPAL' | 'ENTRADA' | 'SALIDA' | 'SUMIDERO' | 'OTRO';
  subcategoria: string;
  descripcion: string;
  dataUrl?: string;
}

// types/ficha.ts
interface FichaState {
  id: string;
  pozoId: string;
  status: 'draft' | 'editing' | 'complete' | 'finalized';
  sections: FichaSection[];
  customizations: FichaCustomization;
  history: HistoryEntry[];
  errors: FichaError[];
  lastModified: number;
  version: number;
}

interface FichaSection {
  id: string;
  type: SectionType;
  order: number;
  visible: boolean;
  locked: boolean;
  content: Record<string, FieldValue>;
}

interface FieldValue {
  value: string;
  source: 'excel' | 'manual' | 'default';
  originalValue?: string;
  modifiedAt?: number;
}

interface FichaCustomization {
  colors: ColorScheme;
  fonts: FontScheme;
  spacing: SpacingScheme;
  template: string;
  isGlobal: boolean;
}

// types/error.ts
interface FichaError {
  id: string;
  fichaId: string;
  type: 'data' | 'user' | 'system';
  severity: 'warning' | 'error';
  message: string;
  userMessage: string;
  field?: string;
  timestamp: number;
  resolved: boolean;
}

// types/snapshot.ts
interface Snapshot {
  id: string;
  fichaId: string;
  schemaVersion: string;
  fichaStructure: any;
  fieldValues: Record<string, string>;
  references: string[]; // Solo IDs de fotos, no datas
  metadata: any;
  timestamp: number;
}
```

## Data Models

### State Architecture

```typescript
// stores/globalStore.ts
interface GlobalState {
  // Datos cargados (inmutables después de carga)
  pozos: Map<string, Pozo>;
  photos: Map<string, FotoInfo>;
  
  // Configuración global
  config: GlobalConfig;
  templates: Template[];
  
  // Estado de la aplicación
  currentStep: WorkflowStep;
  guidedMode: boolean;
  
  // Acciones
  loadPozos: (data: ExcelData) => void;
  indexPhotos: (files: File[]) => void;
  setConfig: (config: Partial<GlobalConfig>) => void;
}

// stores/fichaStore.ts - Una instancia por ficha
interface FichaStore {
  state: FichaState;
  
  // Edición
  updateField: (sectionId: string, field: string, value: string) => void;
  reorderSections: (fromIndex: number, toIndex: number) => void;
  addImage: (sectionId: string, image: FotoInfo) => void;
  removeImage: (sectionId: string, imageId: string) => void;
  resizeImage: (imageId: string, size: ImageSize) => void;
  
  // Historial
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // Errores
  errors: FichaError[];
  clearError: (errorId: string) => void;
  clearAllErrors: () => void;
  
  // Snapshots
  createSnapshot: (trigger: string) => void;
  restoreSnapshot: (snapshotId: string) => void;
  snapshots: Snapshot[];
}

// stores/uiStore.ts
interface UIState {
  // Transient UI state
  selectedPozoId: string | null;
  editorMode: 'edit' | 'preview' | 'split';
  sidebarCollapsed: boolean;
  activeSection: string | null;
  
  // Modals
  confirmDialog: ConfirmDialogState | null;
  
  // Notifications
  toasts: Toast[];
  addToast: (toast: Toast) => void;
  removeToast: (id: string) => void;
}
```

### Persistence Strategy

```typescript
// lib/persistence/indexedDB.ts
const DB_NAME = 'fichas-tecnicas';
const STORES = {
  fichas: 'fichas',      // FichaState por ID
  snapshots: 'snapshots', // Snapshots para recovery
  photos: 'photos',       // Fotos en base64
};

// Cada ficha se persiste en su propio namespace
async function saveFicha(fichaId: string, state: FichaState): Promise<void>;
async function loadFicha(fichaId: string): Promise<FichaState | null>;
async function deleteFicha(fichaId: string): Promise<void>;

// lib/persistence/localStorage.ts
const KEYS = {
  globalConfig: 'fichas:config',
  templates: 'fichas:templates',
  lastSession: 'fichas:session',
};

// lib/persistence/snapshotManager.ts
class SnapshotManager {
  private maxSnapshots = 10;
  private autoSaveInterval = 30000; // 30 segundos
  
  async createSnapshot(fichaId: string, state: FichaState, trigger: string): Promise<void>;
  async getSnapshots(fichaId: string): Promise<Snapshot[]>;
  async restoreLatest(fichaId: string): Promise<FichaState | null>;
  async pruneOldSnapshots(fichaId: string): Promise<void>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Robustez de Carga de Archivos
*For any* archivo Excel con columnas extra, columnas faltantes, o datos malformados, el sistema SHALL procesarlo sin lanzar excepciones, extrayendo los datos válidos disponibles y marcando los problemas encontrados.
**Validates: Requirements 1.8, 1.9, 1.10, 11.1-11.5**

### Property 2: Parsing de Nomenclatura Round-Trip
*For any* nombre de archivo válido según la nomenclatura (ej: M680-P.jpg, M680-E1-T.jpg), parsear el nombre y reconstruirlo SHALL producir un resultado equivalente que identifica el mismo pozo y categoría.
**Validates: Requirements 10.1-10.4**

### Property 3: Sincronización Bidireccional
*For any* cambio realizado en el Editor_Visual, la Vista_Previa SHALL reflejar exactamente el mismo estado, y viceversa. La función sync(edit(state)) === sync(preview(state)) para todo estado válido.
**Validates: Requirements 4.1-4.5**

### Property 4: Historial Undo/Redo Consistente
*For any* secuencia de N operaciones de edición seguidas de N operaciones de undo, el estado final SHALL ser equivalente al estado inicial.
**Validates: Requirements 3.7, 12.3**

### Property 5: Aislamiento Total entre Fichas
*For any* error, modificación o estado inválido en una Ficha A, el estado de cualquier otra Ficha B SHALL permanecer completamente inalterado. Formalmente: mutate(fichaA) ∩ state(fichaB) = ∅
**Validates: Requirements 16.1-16.14, 17.1-17.6**

### Property 6: Persistencia y Recuperación
*For any* estado válido de ficha, guardar y luego restaurar SHALL producir un estado equivalente. serialize(state) |> deserialize === state
**Validates: Requirements 9.1-9.7, 13.1-13.4**

### Property 7: Protección de Estructura Mínima
*For any* secuencia de operaciones de edición del usuario, la ficha resultante SHALL mantener todas las secciones obligatorias y una estructura válida para generación de PDF.
**Validates: Requirements 3.8, 3.9, 3.10**

### Property 8: Contención de Errores
*For any* error que ocurra durante el procesamiento de una ficha, el error SHALL quedar encapsulado en el contexto de esa ficha sin afectar el estado global ni otras fichas.
**Validates: Requirements 0.1, 17.1-17.6**

### Property 9: Acciones Destructivas Requieren Confirmación
*For any* acción clasificada como destructiva (eliminar sección, eliminar imagen, resetear formato), el sistema SHALL requerir confirmación explícita antes de ejecutarla.
**Validates: Requirements 0.3, 12.1, 12.2, 12.4**

### Property 10: Validación No Bloqueante
*For any* dato de entrada inválido o incompleto, el sistema SHALL continuar funcionando, usando valores por defecto seguros y marcando visualmente los problemas sin bloquear el flujo.
**Validates: Requirements 11.1-11.5, 0.1**

## Hardening and Resource Management

### Hardening de Estado (Zustand)
Para prevenir colapsos por memoria (OOM), se aplican las siguientes reglas:
1. **Zustand**: Solo almacena texto, números e IDs de referencia.
2. **Blob Storage**: Las imágenes y archivos pesados viven fuera de Zustand, referenciados por ID.
3. **Snapshots Livianos**: Los snapshots excluyen fotos y blobs; contienen solo la estructura de datos.

### Resource Manager
Un servicio centralizado que actúa como el "vigilante" del sistema:
- `trackMemory()`: Estima el uso de RAM actual.
- `enforceLimits()`: Aplica los límites innegociables (100 fotos/pozo, 2.000 fotos total).
- `enterDegradedMode()`: Activa el modo de bajo consumo si los recursos escasean.

### Lifecycle Manager
Gestiona el estado de cada ficha en ejecución:
- **Active**: Ficha en uso, todos los recursos cargados.
- **Suspended**: Ficha inactiva (ej: abierta en otra pestaña o minimizada), libera RAM pesada pero mantiene el estado de edición.
- **Destroyed**: Ficha cerrada, recursos liberados al 100%.

### Background Workers
Todo procesamiento pesado se externaliza para mantener la UI responsiva:
- **ExcelWorker**: Parseo de archivos grandes.
- **PhotoWorker**: Optimización y hashing de imágenes.
- **PdfWorker**: Generación de PDF por bloques/chunks.

### UI Virtualización
- **Tablas y Listas**: Uso obligatorio de virtualización para manejar miles de filas o fotos.
- **Lazy Loading**: Carga de recursos visuales solo bajo demanda.

## Testing Strategy

### Dual Testing Approach

El sistema utiliza tanto tests unitarios como property-based tests:

- **Unit Tests**: Casos específicos, edge cases, integración de componentes
- **Property-Based Tests**: Verificación de propiedades universales con inputs generados

### Property-Based Testing Configuration

```typescript
// tests/properties/config.ts
import * as fc from 'fast-check';

// Mínimo 100 iteraciones por propiedad
const PBT_CONFIG = {
  numRuns: 100,
  verbose: true,
};

// Generadores personalizados
const pozoIdArb = fc.stringOf(fc.constantFrom('M', 'P', 'S'), { minLength: 1, maxLength: 1 })
  .chain(prefix => fc.integer({ min: 1, max: 9999 }).map(n => `${prefix}${n}`));

const nomenclaturaArb = fc.tuple(
  pozoIdArb,
  fc.constantFrom('P', 'T', 'I', 'A', 'F', 'M', 'E1', 'E2', 'S', 'S1', 'SUM1'),
  fc.constantFrom('T', 'Z', '')
).map(([id, tipo, subtipo]) => subtipo ? `${id}-${tipo}-${subtipo}` : `${id}-${tipo}`);
```

### Test Structure

```
tests/
├── unit/
│   ├── parsers/
│   │   ├── excelParser.test.ts
│   │   └── nomenclatura.test.ts
│   ├── stores/
│   │   ├── fichaStore.test.ts
│   │   └── globalStore.test.ts
│   └── components/
│       └── editor.test.tsx
├── properties/
│   ├── nomenclatura.property.ts    // Property 2
│   ├── sync.property.ts            // Property 3
│   ├── undoRedo.property.ts        // Property 4
│   ├── isolation.property.ts       // Property 5
│   ├── persistence.property.ts     // Property 6
│   ├── structure.property.ts       // Property 7
│   ├── errorContainment.property.ts // Property 8
│   └── validation.property.ts      // Property 10
└── integration/
    ├── uploadFlow.test.ts
    ├── editorFlow.test.ts
    └── pdfGeneration.test.ts
```
