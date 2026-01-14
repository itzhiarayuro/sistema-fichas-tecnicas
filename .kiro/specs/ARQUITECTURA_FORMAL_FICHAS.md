# 🏗️ Arquitectura Formal - Sistema de Fichas

## 1. State Machine Explícito: Ciclo de Vida de Ficha

### Estados Válidos

```typescript
type FichaState = 'draft' | 'editing' | 'complete' | 'finalized';

interface FichaLifecycle {
  state: FichaState;
  enteredAt: number;      // timestamp
  lastModified: number;
  transitionHistory: Array<{
    from: FichaState;
    to: FichaState;
    timestamp: number;
    reason: string;
  }>;
}
```

### Transiciones Permitidas

```typescript
type FichaTransition =
  | { from: 'draft'; to: 'editing'; reason: 'user_starts_editing' }
  | { from: 'editing'; to: 'complete'; reason: 'validation_passed' }
  | { from: 'editing'; to: 'draft'; reason: 'user_discards' }
  | { from: 'complete'; to: 'editing'; reason: 'validation_failed_late' }
  | { from: 'complete'; to: 'finalized'; reason: 'user_finalizes' }
  | { from: 'finalized'; to: 'complete'; reason: 'admin_unlock' };

// Transiciones NO permitidas (explícitamente)
// ❌ draft → finalized (debe pasar por complete)
// ❌ finalized → editing (solo admin puede unlock)
// ❌ finalized → draft (irreversible)
```

### Máquina de Estados Centralizada

```typescript
class FichaStateMachine {
  private state: FichaState;
  private history: FichaTransition[] = [];

  canTransition(to: FichaState): boolean {
    const validTransitions: Record<FichaState, FichaState[]> = {
      'draft': ['editing'],
      'editing': ['complete', 'draft'],
      'complete': ['editing', 'finalized'],
      'finalized': ['complete'] // solo admin
    };
    return validTransitions[this.state]?.includes(to) ?? false;
  }

  transition(to: FichaState, reason: string): Result<void> {
    if (!this.canTransition(to)) {
      return Err(`Invalid transition: ${this.state} → ${to}`);
    }
    
    this.history.push({
      from: this.state,
      to,
      timestamp: Date.now(),
      reason
    });
    
    this.state = to;
    return Ok(void);
  }

  getState(): FichaState {
    return this.state;
  }

  getHistory(): FichaTransition[] {
    return [...this.history];
  }
}
```

### Reglas por Estado

| Estado | Permite Edición | Permite Undo | Permite Snapshot | Permite Finalizar |
|--------|-----------------|--------------|------------------|-------------------|
| draft | ✅ | ✅ | ✅ | ❌ |
| editing | ✅ | ✅ | ✅ | ❌ |
| complete | ❌ | ❌ | ✅ | ✅ |
| finalized | ❌ | ❌ | ❌ | ❌ |

---

## 2. Modelo Formal: Undo/Redo + Snapshots

### Niveles de Historia

```typescript
interface HistoryLevel {
  name: string;
  purpose: string;
  reversible: boolean;
  resetsOtherLevels: boolean;
}

const HISTORY_LEVELS: Record<string, HistoryLevel> = {
  UNDO_REDO: {
    name: 'Undo/Redo',
    purpose: 'UX inmediata',
    reversible: true,
    resetsOtherLevels: false
  },
  SNAPSHOT: {
    name: 'Snapshot',
    purpose: 'Recovery y persistencia',
    reversible: false,
    resetsOtherLevels: true  // ⚠️ Restaurar snapshot resetea undo/redo
  },
  FINALIZED: {
    name: 'Finalized',
    purpose: 'Inmutable',
    reversible: false,
    resetsOtherLevels: false
  }
};
```

### Arquitectura de Historia

```typescript
interface FichaHistory {
  // Nivel 1: Undo/Redo (en memoria)
  undoStack: FichaState[];
  redoStack: FichaState[];
  
  // Nivel 2: Snapshots (persistencia)
  snapshots: Array<{
    id: string;
    state: FichaState;
    timestamp: number;
    reason: 'auto_save' | 'user_save' | 'recovery';
  }>;
  
  // Nivel 3: Finalized (inmutable)
  finalizedAt?: number;
  finalizedState?: FichaState;
}

// Reglas
class HistoryManager {
  // Undo/Redo: siempre permitido en draft/editing
  undo(): Result<FichaState> {
    if (this.fichaState.state !== 'draft' && this.fichaState.state !== 'editing') {
      return Err('Cannot undo in current state');
    }
    // ... implementación
  }

  // Snapshot: resetea undo/redo
  restoreSnapshot(snapshotId: string): Result<void> {
    // 1. Restaurar estado
    // 2. Limpiar undo/redo stacks
    // 3. Registrar evento
    return Ok(void);
  }

  // Finalized: no permite nada
  canModify(): boolean {
    return this.fichaState.state !== 'finalized';
  }
}
```

### Property: Snapshot Resets Undo/Redo

```typescript
// Property test
property('restoring snapshot resets undo/redo', () => {
  const ficha = createFicha();
  
  // 1. Hacer cambios
  ficha.edit('field1', 'value1');
  ficha.edit('field2', 'value2');
  
  // 2. Crear snapshot
  const snapshotId = ficha.createSnapshot();
  
  // 3. Hacer más cambios
  ficha.edit('field3', 'value3');
  
  // 4. Restaurar snapshot
  ficha.restoreSnapshot(snapshotId);
  
  // 5. Verificar: undo/redo vacíos
  assert(ficha.canUndo() === false);
  assert(ficha.canRedo() === false);
  
  // 6. Verificar: estado es el del snapshot
  assert(ficha.getState().field1 === 'value1');
  assert(ficha.getState().field2 === 'value2');
  assert(ficha.getState().field3 === undefined);
});
```

---

## 3. Schema Versioning Layer

### Versionado Explícito

```typescript
interface PersistedFicha {
  schemaVersion: number;  // Versión del esquema
  dataVersion: number;    // Versión de los datos
  data: FichaState;
  migratedFrom?: number;  // Versión anterior (para auditoría)
}

// Versiones de esquema
const SCHEMA_VERSIONS = {
  1: 'Initial schema',
  2: 'Added FichaSection.metadata',
  3: 'Unified tuberias (entrada/salida)',
  4: 'Added FichaLifecycle'
};

const CURRENT_SCHEMA_VERSION = 4;
```

### Migraciones

```typescript
type Migration = (state: any) => any;

const migrations: Record<number, Migration> = {
  // v1 → v2
  2: (state) => ({
    ...state,
    sections: state.sections.map(s => ({
      ...s,
      metadata: { createdAt: Date.now(), updatedAt: Date.now() }
    }))
  }),

  // v2 → v3
  3: (state) => ({
    ...state,
    tuberias: state.tuberias.map(t => ({
      ...t,
      tipo_tuberia: t.tipo || 'entrada'  // Unificar
    }))
  }),

  // v3 → v4
  4: (state) => ({
    ...state,
    lifecycle: {
      state: 'draft',
      enteredAt: Date.now(),
      lastModified: Date.now(),
      transitionHistory: []
    }
  })
};

class SchemaVersioningLayer {
  migrate(persisted: PersistedFicha): Result<FichaState> {
    let data = persisted.data;
    let version = persisted.schemaVersion;

    while (version < CURRENT_SCHEMA_VERSION) {
      const migration = migrations[version + 1];
      if (!migration) {
        return Err(`No migration from v${version} to v${version + 1}`);
      }
      
      try {
        data = migration(data);
        version++;
      } catch (e) {
        return Err(`Migration v${version}→v${version + 1} failed: ${e}`);
      }
    }

    return Ok(data);
  }
}
```

---

## 4. Event Log Estructurado

### Eventos por Ficha

```typescript
interface FichaEvent {
  id: string;                    // UUID
  fichaId: string;
  type: 'EDIT' | 'UNDO' | 'REDO' | 'SNAPSHOT' | 'TRANSITION' | 'ERROR' | 'VALIDATE';
  payload: unknown;
  timestamp: number;
  userId?: string;               // Para auditoría futura
  severity: 'info' | 'warning' | 'error';
}

class FichaEventLog {
  private events: FichaEvent[] = [];
  private maxSize = 1000;        // Circular buffer

  log(event: Omit<FichaEvent, 'id' | 'timestamp'>): void {
    const fullEvent: FichaEvent = {
      ...event,
      id: generateUUID(),
      timestamp: Date.now()
    };

    this.events.push(fullEvent);
    
    // Mantener circular
    if (this.events.length > this.maxSize) {
      this.events.shift();
    }
  }

  getEvents(filter?: { type?: string; since?: number }): FichaEvent[] {
    return this.events.filter(e => {
      if (filter?.type && e.type !== filter.type) return false;
      if (filter?.since && e.timestamp < filter.since) return false;
      return true;
    });
  }

  // Para debugging post-mortem
  getLastNEvents(n: number): FichaEvent[] {
    return this.events.slice(-n);
  }
}
```

### Persistencia de Event Log

```typescript
// En IndexedDB
interface FichaEventLogPersisted {
  fichaId: string;
  events: FichaEvent[];
  lastUpdated: number;
}

// Guardar cada N eventos o cada X segundos
class EventLogPersistence {
  private batchSize = 10;
  private flushInterval = 30000; // 30s

  async flush(fichaId: string, eventLog: FichaEventLog): Promise<void> {
    const events = eventLog.getEvents();
    await db.put('fichaEventLogs', {
      fichaId,
      events,
      lastUpdated: Date.now()
    });
  }
}
```

---

## 5. Modelo de Concurrencia: Editor ↔ Preview

### Autoridad Explícita

```typescript
type SyncAuthority = 'editor' | 'preview' | 'engine';

interface SyncModel {
  authority: SyncAuthority;
  debounceMs: number;
  throttleMs: number;
  conflictResolution: 'editor_wins' | 'preview_wins' | 'merge';
}

const DEFAULT_SYNC_MODEL: SyncModel = {
  authority: 'editor',           // Editor es source of truth
  debounceMs: 300,               // Debounce edits
  throttleMs: 100,               // Throttle preview renders
  conflictResolution: 'editor_wins'
};
```

### SyncEngine Formalizado

```typescript
class SyncEngine {
  private authority: SyncAuthority;
  private pendingEdits: Map<string, unknown> = new Map();
  private lastSyncTime = 0;

  onEditorChange(field: string, value: unknown): void {
    if (this.authority !== 'editor') {
      console.warn('Editor change ignored: not authority');
      return;
    }

    this.pendingEdits.set(field, value);
    this.scheduleSync();
  }

  onPreviewChange(field: string, value: unknown): void {
    if (this.authority === 'editor') {
      console.warn('Preview change ignored: editor is authority');
      return;
    }

    // Resolver conflicto
    this.resolveConflict(field, value);
    this.scheduleSync();
  }

  private scheduleSync(): void {
    // Debounce
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => this.sync(), DEFAULT_SYNC_MODEL.debounceMs);
  }

  private sync(): void {
    // Aplicar cambios en orden
    for (const [field, value] of this.pendingEdits) {
      this.applyChange(field, value);
    }
    this.pendingEdits.clear();
    this.lastSyncTime = Date.now();
  }
}
```

### Property: Orden Garantizado

```typescript
property('sync maintains edit order', () => {
  const engine = new SyncEngine();
  const edits: Array<[string, unknown]> = [];

  // Generar edits aleatorios
  fc.assert(
    fc.property(fc.array(fc.tuple(fc.string(), fc.anything())), (randomEdits) => {
      edits.push(...randomEdits);

      // Aplicar edits
      for (const [field, value] of randomEdits) {
        engine.onEditorChange(field, value);
      }

      // Verificar: orden preservado
      const syncedEdits = engine.getSyncedEdits();
      assert(syncedEdits.length === edits.length);
      
      for (let i = 0; i < edits.length; i++) {
        assert(syncedEdits[i][0] === edits[i][0]);
        assert(syncedEdits[i][1] === edits[i][1]);
      }
    })
  );
});
```

---

## 6. Lifecycle Manager: Aislamiento de Recursos

### Ciclo de Vida por Ficha

```typescript
type FichaLifecyclePhase = 'mounted' | 'suspended' | 'resumed' | 'destroyed';

class FichaLifecycleManager {
  private phase: FichaLifecyclePhase = 'mounted';
  private resources: {
    intervals: NodeJS.Timeout[];
    observers: AbortController[];
    listeners: Array<() => void>;
  } = {
    intervals: [],
    observers: [],
    listeners: []
  };

  mount(): void {
    this.phase = 'mounted';
    this.startAutoSave();
    this.startValidationWatcher();
  }

  suspend(): void {
    this.phase = 'suspended';
    this.clearIntervals();
    this.abortObservers();
  }

  resume(): void {
    this.phase = 'resumed';
    this.startAutoSave();
    this.startValidationWatcher();
  }

  destroy(): void {
    this.phase = 'destroyed';
    this.clearIntervals();
    this.abortObservers();
    this.removeListeners();
  }

  private startAutoSave(): void {
    const interval = setInterval(() => {
      if (this.phase === 'mounted' || this.phase === 'resumed') {
        this.autoSave();
      }
    }, 30000);
    this.resources.intervals.push(interval);
  }

  private clearIntervals(): void {
    this.resources.intervals.forEach(clearInterval);
    this.resources.intervals = [];
  }

  private abortObservers(): void {
    this.resources.observers.forEach(controller => controller.abort());
    this.resources.observers = [];
  }

  private removeListeners(): void {
    this.resources.listeners.forEach(fn => fn());
    this.resources.listeners = [];
  }
}
```

### Uso en Next.js

```typescript
export default function EditorPage({ fichaId }: Props) {
  const lifecycleManager = useRef<FichaLifecycleManager>();

  useEffect(() => {
    lifecycleManager.current = new FichaLifecycleManager();
    lifecycleManager.current.mount();

    return () => {
      lifecycleManager.current?.destroy();
    };
  }, []);

  // Suspender cuando navegamos
  useEffect(() => {
    const handleBeforeUnload = () => {
      lifecycleManager.current?.suspend();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return <EditorUI />;
}
```

---

## 7. Seguridad: Sanitización y Límites

### Sanitización Explícita

```typescript
import DOMPurify from 'dompurify';

class SecurityLayer {
  // Sanitizar HTML importado
  sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['div', 'p', 'span', 'img', 'table', 'tr', 'td', 'th'],
      ALLOWED_ATTR: ['class', 'id', 'style', 'src', 'alt']
    });
  }

  // Validar tamaño de ficha
  validateFichaSize(ficha: FichaState): Result<void> {
    const size = JSON.stringify(ficha).length;
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (size > maxSize) {
      return Err(`Ficha too large: ${size} bytes (max ${maxSize})`);
    }

    return Ok(void);
  }

  // Validar tamaño de foto
  validatePhotoSize(photo: Blob): Result<void> {
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (photo.size > maxSize) {
      return Err(`Photo too large: ${photo.size} bytes (max ${maxSize})`);
    }

    return Ok(void);
  }

  // Validar base64
  validateBase64(data: string): Result<void> {
    try {
      atob(data);
      return Ok(void);
    } catch {
      return Err('Invalid base64 data');
    }
  }
}
```

---

## 8. Validador Determinístico Final

### Función Canónica

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'error';
}

class FichaValidator {
  // Validador determinístico (puro)
  validate(ficha: FichaState): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. Validar estructura
    if (!ficha.pozo?.id_pozo) {
      errors.push({
        field: 'pozo.id_pozo',
        message: 'ID pozo es obligatorio',
        severity: 'critical'
      });
    }

    // 2. Validar integridad referencial
    for (const tuberia of ficha.tuberias || []) {
      if (!ficha.pozo || tuberia.id_pozo !== ficha.pozo.id_pozo) {
        errors.push({
          field: `tuberias.${tuberia.id_tuberia}`,
          message: 'Tubería no pertenece a este pozo',
          severity: 'error'
        });
      }
    }

    // 3. Validar reglas de negocio
    if (ficha.pozo?.existe_tapa && !ficha.pozo?.estado_tapa) {
      warnings.push({
        field: 'pozo.estado_tapa',
        message: 'Si existe tapa, debe indicar estado'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Usado por: Generate PDF, Finalize
  validateForPDF(ficha: FichaState): Result<void> {
    const result = this.validate(ficha);
    
    if (!result.isValid) {
      return Err(`Cannot generate PDF: ${result.errors.map(e => e.message).join(', ')}`);
    }

    return Ok(void);
  }

  validateForFinalize(ficha: FichaState): Result<void> {
    const result = this.validate(ficha);
    
    if (!result.isValid) {
      return Err(`Cannot finalize: ${result.errors.map(e => e.message).join(', ')}`);
    }

    return Ok(void);
  }
}
```

---

## 9. Capa de Dominio: Preparación para Multiusuario

### Separación UI ↔ Dominio

```typescript
// domain/ficha/commands.ts
export type FichaCommand =
  | { type: 'EDIT_FIELD'; field: string; value: unknown }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CREATE_SNAPSHOT'; reason: string }
  | { type: 'RESTORE_SNAPSHOT'; snapshotId: string }
  | { type: 'TRANSITION'; to: FichaState; reason: string }
  | { type: 'FINALIZE' };

// domain/ficha/reducers.ts
export function fichaReducer(state: FichaState, command: FichaCommand): FichaState {
  switch (command.type) {
    case 'EDIT_FIELD':
      return { ...state, [command.field]: command.value };
    case 'UNDO':
      return undoState(state);
    case 'TRANSITION':
      return { ...state, lifecycle: { ...state.lifecycle, state: command.to } };
    // ...
  }
}

// domain/ficha/invariants.ts
export function checkInvariants(state: FichaState): Result<void> {
  if (!state.pozo?.id_pozo) {
    return Err('Invariant violated: pozo.id_pozo must exist');
  }
  // ...
  return Ok(void);
}

// UI solo emite commands
export function EditorUI() {
  const dispatch = useDispatch();

  const handleEdit = (field: string, value: unknown) => {
    dispatch({ type: 'EDIT_FIELD', field, value });
  };

  // No muta estado directamente
  // dispatch maneja reducers + invariants
}
```

---

## 10. Límites Explícitos: Qué NO Hace el Sistema

### Declaración de Alcance

```typescript
/**
 * SISTEMA DE FICHAS TÉCNICAS - LÍMITES EXPLÍCITOS
 * 
 * ✅ QUÉ HACE:
 * - Gestiona fichas de inspección de pozos (local-first)
 * - Edición visual con undo/redo
 * - Generación de PDFs personalizados
 * - Persistencia en IndexedDB
 * - Validación de datos
 * 
 * ❌ QUÉ NO HACE:
 * - No es multiusuario (sin sincronización remota)
 * - No es gestor documental legal (sin auditoría formal)
 * - No garantiza validez normativa externa (sin integración regulatoria)
 * - No versiona PDFs emitidos (sin historial de generaciones)
 * - No sincroniza entre dispositivos
 * - No tiene autenticación/autorización
 * - No cumple GDPR/HIPAA/normativas específicas
 * - No es backup automático a cloud
 * - No tiene recuperación ante corrupción de IndexedDB
 * - No soporta colaboración en tiempo real
 */

interface SystemBoundaries {
  scope: {
    maxFichasPerSession: 1000;
    maxPhotosPerFicha: 100;
    maxPhotoSize: 50 * 1024 * 1024;  // 50MB
    maxFichaSize: 10 * 1024 * 1024;  // 10MB
  };
  
  limitations: {
    singleUser: true;
    localOnly: true;
    noRemoteSync: true;
    noLegalAudit: true;
    noPDFVersioning: true;
  };
  
  futureWork: [
    'Multiusuario con CRDT',
    'Sincronización remota',
    'Auditoría formal',
    'Integración normativa',
    'Backup automático'
  ];
}
```

---

## Resumen: Cambios Arquitectónicos Requeridos

| # | Aspecto | Cambio | Impacto |
|---|---------|--------|--------|
| 1 | State Machine | Agregar máquina de estados formal | Evita transiciones ilegales |
| 2 | Undo/Redo | Formalizar relación con snapshots | Claridad semántica |
| 3 | Schema | Agregar versionado y migraciones | Evolución segura |
| 4 | Observabilidad | Event log estructurado | Debugging post-mortem |
| 5 | Sincronización | Definir autoridad explícita | Evita glitches |
| 6 | Recursos | Lifecycle manager | Evita memory leaks |
| 7 | Seguridad | Sanitización + límites | Protección contra payloads |
| 8 | Validación | Validador determinístico | Consistencia garantizada |
| 9 | Dominio | Separar UI de lógica | Preparado para multiusuario |
| 10 | Límites | Documentar explícitamente | Reduce deuda futura |

