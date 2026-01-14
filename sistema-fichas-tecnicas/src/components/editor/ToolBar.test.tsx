/**
 * ToolBar Component - Tests
 * Requirements: 3.7, 7.1
 * 
 * Verifica que:
 * - Los botones de undo/redo funcionan correctamente
 * - El estado de habilitación es correcto
 * - Los callbacks se ejecutan cuando se hace clic
 * - Los indicadores de estado se muestran correctamente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolBar } from './ToolBar';
import type { FichaStore } from '@/stores/fichaStore';
import type { Pozo } from '@/types/pozo';

// Mock de next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock de componentes
vi.mock('./ScopeIndicator', () => ({
  ScopeIndicator: ({ isGlobal, onScopeChange }: any) => (
    <button onClick={() => onScopeChange?.(!isGlobal)}>
      Scope: {isGlobal ? 'Global' : 'Local'}
    </button>
  ),
}));

vi.mock('@/components/guided', () => ({
  GuidedModeBadge: () => <div>Guided Mode</div>,
}));

// Helper to create FieldValue
const fv = (value: string) => ({ value, source: 'manual' as const });

// Mock de ficha store
const createMockFichaStore = (overrides?: Partial<FichaStore>): FichaStore => ({
  id: 'ficha-1',
  pozoId: 'pozo-1',
  status: 'editing',
  sections: [],
  customizations: {
    colors: {
      headerBg: '#1F4E79',
      headerText: '#FFFFFF',
      sectionBg: '#FFFFFF',
      sectionText: '#333333',
      labelText: '#666666',
      valueText: '#000000',
      borderColor: '#E5E7EB',
    },
    fonts: {
      titleSize: 16,
      labelSize: 12,
      valueSize: 12,
      fontFamily: 'Inter',
    },
    spacing: {
      sectionGap: 16,
      fieldGap: 8,
      padding: 16,
      margin: 24,
    },
    template: 'standard',
    isGlobal: false,
  },
  history: [],
  historyIndex: -1,
  errors: [],
  lastModified: Date.now(),
  version: 1,
  snapshots: [],
  imageSizes: new Map(),
  initialState: null,
  stateStatus: 'ok',
  updateField: vi.fn(),
  reorderSections: vi.fn(),
  toggleSectionVisibility: vi.fn(),
  addImage: vi.fn(),
  removeImage: vi.fn(),
  resizeImage: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: vi.fn(() => false),
  canRedo: vi.fn(() => false),
  createSnapshot: vi.fn(),
  restoreSnapshot: vi.fn(),
  getSnapshots: vi.fn(() => []),
  pruneSnapshots: vi.fn(),
  addError: vi.fn(),
  clearError: vi.fn(),
  clearAllErrors: vi.fn(),
  resolveError: vi.fn(),
  setStatus: vi.fn(),
  finalize: vi.fn(),
  reset: vi.fn(),
  isDirty: vi.fn(() => false),
  getState: vi.fn(() => ({
    id: 'ficha-1',
    pozoId: 'pozo-1',
    status: 'editing',
    sections: [],
    customizations: {} as any,
    history: [],
    errors: [],
    lastModified: Date.now(),
    version: 1,
  })),
  ...overrides,
});

// Mock de pozo
const createMockPozo = (overrides?: Partial<Pozo>): Pozo => ({
  id: 'pozo-1',
  identificacion: {
    idPozo: fv('M680'),
    coordenadaX: fv('-74.123'),
    coordenadaY: fv('4.567'),
    fecha: fv('2024-01-08'),
    levanto: fv('Test'),
    estado: fv('Activo'),
  },
  ubicacion: {
    direccion: fv('Calle Principal 123'),
    barrio: fv('Centro'),
    elevacion: fv('2600'),
    profundidad: fv('2.5'),
  },
  componentes: {
    existeTapa: fv('Sí'),
    estadoTapa: fv('Bueno'),
    existeCilindro: fv('Sí'),
    diametroCilindro: fv('1.2'),
    sistema: fv('Alcantarillado'),
    anoInstalacion: fv('2020'),
    tipoCamara: fv('Circular'),
    estructuraPavimento: fv('Asfalto'),
    materialTapa: fv('Hierro'),
    existeCono: fv('No'),
    tipoCono: fv(''),
    materialCono: fv(''),
    estadoCono: fv(''),
    materialCilindro: fv(''),
    estadoCilindro: fv(''),
    existeCanuela: fv('No'),
    materialCanuela: fv(''),
    estadoCanuela: fv(''),
    existePeldanos: fv('No'),
    materialPeldanos: fv(''),
    numeroPeldanos: fv(''),
    estadoPeldanos: fv(''),
  },
  tuberias: {
    tuberias: [],
  },
  sumideros: {
    sumideros: [],
  },
  observaciones: {
    observaciones: fv('Sin observaciones'),
  },
  fotos: {
    fotos: [],
  },
  metadata: {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: 'excel',
    version: 1,
  },
  ...overrides,
});

describe('ToolBar', () => {
  let mockFichaStore: FichaStore;
  let mockPozo: Pozo;

  beforeEach(() => {
    mockFichaStore = createMockFichaStore();
    mockPozo = createMockPozo();
    vi.clearAllMocks();
  });

  it('debe renderizar el componente correctamente', () => {
    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
      />
    );

    expect(screen.getByText(/Editando:/)).toBeTruthy();
    expect(screen.getByText('M680')).toBeTruthy();
  });

  it('debe mostrar el botón de volver', () => {
    const onBack = vi.fn();
    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
        onBack={onBack}
      />
    );

    const backButton = screen.getByLabelText('Volver');
    fireEvent.click(backButton);

    expect(onBack).toHaveBeenCalled();
  });

  it('debe deshabilitar undo cuando no hay acciones para deshacer', () => {
    mockFichaStore.canUndo = vi.fn(() => false);

    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
      />
    );

    const undoButton = screen.getByLabelText('Deshacer') as HTMLButtonElement;
    expect(undoButton.disabled).toBe(true);
  });

  it('debe habilitar undo cuando hay acciones para deshacer', () => {
    mockFichaStore.canUndo = vi.fn(() => true);

    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
      />
    );

    const undoButton = screen.getByLabelText('Deshacer') as HTMLButtonElement;
    expect(undoButton.disabled).toBe(false);
  });

  it('debe llamar a undo cuando se hace clic en el botón de deshacer', () => {
    mockFichaStore.canUndo = vi.fn(() => true);
    mockFichaStore.undo = vi.fn();

    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
      />
    );

    const undoButton = screen.getByLabelText('Deshacer');
    fireEvent.click(undoButton);

    expect(mockFichaStore.undo).toHaveBeenCalled();
  });

  it('debe deshabilitar redo cuando no hay acciones para rehacer', () => {
    mockFichaStore.canRedo = vi.fn(() => false);

    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
      />
    );

    const redoButton = screen.getByLabelText('Rehacer') as HTMLButtonElement;
    expect(redoButton.disabled).toBe(true);
  });

  it('debe habilitar redo cuando hay acciones para rehacer', () => {
    mockFichaStore.canRedo = vi.fn(() => true);

    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
      />
    );

    const redoButton = screen.getByLabelText('Rehacer') as HTMLButtonElement;
    expect(redoButton.disabled).toBe(false);
  });

  it('debe llamar a redo cuando se hace clic en el botón de rehacer', () => {
    mockFichaStore.canRedo = vi.fn(() => true);
    mockFichaStore.redo = vi.fn();

    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
      />
    );

    const redoButton = screen.getByLabelText('Rehacer');
    fireEvent.click(redoButton);

    expect(mockFichaStore.redo).toHaveBeenCalled();
  });

  it('debe mostrar indicador de sincronización cuando isPending es true', () => {
    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
        isPending={true}
      />
    );

    expect(screen.getByText('Sincronizando...')).toBeTruthy();
  });

  it('debe mostrar versión del estado', () => {
    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
        version={5}
      />
    );

    expect(screen.getByText('v5')).toBeTruthy();
  });

  it('debe llamar a onCustomizeClick cuando se hace clic en personalizar', () => {
    const onCustomizeClick = vi.fn();

    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
        onCustomizeClick={onCustomizeClick}
      />
    );

    const customizeButton = screen.getByLabelText('Personalizar');
    fireEvent.click(customizeButton);

    expect(onCustomizeClick).toHaveBeenCalled();
  });

  it('debe mostrar botón de personalizar con estado activo cuando showCustomization es true', () => {
    const onCustomizeClick = vi.fn();

    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
        onCustomizeClick={onCustomizeClick}
        showCustomization={true}
      />
    );

    const customizeButton = screen.getByLabelText('Personalizar');
    expect(customizeButton.className).toContain('bg-primary');
  });

  it('debe llamar a onResetFormat cuando se hace clic en resetear formato', () => {
    const onResetFormat = vi.fn();

    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
        onResetFormat={onResetFormat}
      />
    );

    const resetButton = screen.getByLabelText('Resetear formato');
    fireEvent.click(resetButton);

    expect(onResetFormat).toHaveBeenCalled();
  });

  it('debe llamar a onGeneratePDF cuando se hace clic en generar PDF', () => {
    const onGeneratePDF = vi.fn();

    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
        onGeneratePDF={onGeneratePDF}
      />
    );

    const pdfButton = screen.getByLabelText('Generar PDF');
    fireEvent.click(pdfButton);

    expect(onGeneratePDF).toHaveBeenCalled();
  });

  it('debe llamar a onScopeChange cuando cambia el scope', () => {
    const onScopeChange = vi.fn();

    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
        onScopeChange={onScopeChange}
        isGlobalScope={false}
      />
    );

    const scopeButton = screen.getByText(/Scope:/);
    fireEvent.click(scopeButton);

    expect(onScopeChange).toHaveBeenCalledWith(true);
  });

  it('debe mostrar indicadores de workflow cuando showWorkflowIndicators es true', () => {
    const BreadcrumbsComponent = () => <div>Breadcrumbs</div>;
    const NextStepComponent = () => <div>Next Step</div>;

    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
        showWorkflowIndicators={true}
        BreadcrumbsComponent={BreadcrumbsComponent}
        NextStepComponent={NextStepComponent}
      />
    );

    expect(screen.getByText('Breadcrumbs')).toBeTruthy();
    expect(screen.getByText('Next Step')).toBeTruthy();
  });

  it('debe no mostrar indicadores de workflow cuando showWorkflowIndicators es false', () => {
    const BreadcrumbsComponent = () => <div>Breadcrumbs</div>;
    const NextStepComponent = () => <div>Next Step</div>;

    render(
      <ToolBar
        fichaStore={mockFichaStore}
        pozo={mockPozo}
        showWorkflowIndicators={false}
        BreadcrumbsComponent={BreadcrumbsComponent}
        NextStepComponent={NextStepComponent}
      />
    );

    expect(screen.queryByText('Breadcrumbs')).toBeNull();
    expect(screen.queryByText('Next Step')).toBeNull();
  });
});
