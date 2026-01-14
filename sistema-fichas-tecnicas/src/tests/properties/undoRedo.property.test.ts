/**
 * Property Test: Undo/Redo Consistency
 * **Property 4: Historial Undo/Redo Consistente**
 * **Validates: Requirements 3.7, 12.3**
 * 
 * For any sequence of N edit operations followed by N undo operations,
 * the final state SHALL be equivalent to the initial state.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createFichaStore, clearAllFichaStores } from '@/stores/fichaStore';
import type { FichaState, FichaSection, FieldValue } from '@/types';

// Helper to create a valid initial ficha state
const createInitialFichaState = (id: string, pozoId: string): Partial<FichaState> => ({
  id,
  pozoId,
  status: 'draft',
  sections: [
    {
      id: 'identificacion',
      type: 'identificacion',
      order: 0,
      visible: true,
      locked: false,
      content: {
        codigo: { value: 'M001', source: 'excel' },
        direccion: { value: 'Calle Principal', source: 'excel' },
      },
    },
    {
      id: 'estructura',
      type: 'estructura',
      order: 1,
      visible: true,
      locked: false,
      content: {
        alturaTotal: { value: '2.5m', source: 'excel' },
        diametro: { value: '1.2m', source: 'excel' },
      },
    },
    {
      id: 'observaciones',
      type: 'observaciones',
      order: 2,
      visible: true,
      locked: false,
      content: {
        notas: { value: 'Sin observaciones', source: 'default' },
      },
    },
  ],
  errors: [],
  history: [],
  lastModified: Date.now(),
  version: 1,
});

// Generators for property-based testing
const fichaIdArb = fc.uuid();
const pozoIdArb = fc.stringOf(fc.constantFrom('M', 'P', 'S'), { minLength: 1, maxLength: 1 })
  .chain(prefix => fc.integer({ min: 1, max: 9999 }).map(n => `${prefix}${n}`));

// Generator for field values
const fieldValueArb = fc.string({ minLength: 1, maxLength: 50 });

// Generator for edit operations
type EditOperation = 
  | { type: 'updateField'; sectionId: string; field: string; value: string }
  | { type: 'reorderSections'; fromIndex: number; toIndex: number };

// Valid field/section combinations based on initial state
const validFieldCombinations = [
  { sectionId: 'identificacion', field: 'codigo' },
  { sectionId: 'identificacion', field: 'direccion' },
  { sectionId: 'estructura', field: 'alturaTotal' },
  { sectionId: 'estructura', field: 'diametro' },
  { sectionId: 'observaciones', field: 'notas' },
];

const updateFieldOpArb = fc.constantFrom(...validFieldCombinations)
  .chain(({ sectionId, field }) => 
    fieldValueArb.map(value => ({
      type: 'updateField' as const,
      sectionId,
      field,
      value,
    }))
  );

const reorderSectionsOpArb = fc.record({
  type: fc.constant('reorderSections' as const),
  fromIndex: fc.integer({ min: 0, max: 2 }),
  toIndex: fc.integer({ min: 0, max: 2 }),
});

const editOperationArb: fc.Arbitrary<EditOperation> = fc.oneof(
  updateFieldOpArb,
  reorderSectionsOpArb
);

// Helper to compare sections content (ignoring timestamps and generated IDs)
function compareSectionsContent(sectionsA: FichaSection[], sectionsB: FichaSection[]): boolean {
  if (sectionsA.length !== sectionsB.length) return false;
  
  for (let i = 0; i < sectionsA.length; i++) {
    const sectionA = sectionsA[i];
    const sectionB = sectionsB[i];
    
    if (sectionA.id !== sectionB.id) return false;
    if (sectionA.type !== sectionB.type) return false;
    if (sectionA.order !== sectionB.order) return false;
    if (sectionA.visible !== sectionB.visible) return false;
    if (sectionA.locked !== sectionB.locked) return false;
    
    // Compare content values (ignoring modifiedAt timestamps)
    const keysA = Object.keys(sectionA.content);
    const keysB = Object.keys(sectionB.content);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      const fieldA = sectionA.content[key];
      const fieldB = sectionB.content[key];
      
      if (!fieldB) return false;
      if (fieldA.value !== fieldB.value) return false;
    }
  }
  
  return true;
}

// Helper to execute an edit operation
function executeOperation(store: ReturnType<typeof createFichaStore>, op: EditOperation): void {
  const state = store.getState();
  
  switch (op.type) {
    case 'updateField':
      // Only execute if the section and field exist
      const section = state.sections.find(s => s.id === op.sectionId);
      if (section && section.content[op.field] !== undefined) {
        state.updateField(op.sectionId, op.field, op.value);
      }
      break;
    case 'reorderSections':
      // Only execute if indices are valid and different
      if (op.fromIndex !== op.toIndex && 
          op.fromIndex < state.sections.length && 
          op.toIndex < state.sections.length) {
        state.reorderSections(op.fromIndex, op.toIndex);
      }
      break;
  }
}

describe('Property 4: Undo/Redo Consistency', () => {
  beforeEach(() => {
    clearAllFichaStores();
  });

  /**
   * Feature: sistema-fichas-tecnicas-nextjs, Property 4: Historial Undo/Redo Consistente
   * 
   * Property: For any sequence of N operations followed by N undos,
   * the final state equals the initial state
   */
  it('N operations followed by N undos returns to initial state', () => {
    fc.assert(
      fc.property(
        fichaIdArb,
        pozoIdArb,
        fc.array(editOperationArb, { minLength: 1, maxLength: 10 }),
        (fichaId, pozoId, operations) => {
          // Create store with initial state
          const store = createFichaStore(createInitialFichaState(fichaId, pozoId));
          
          // Capture initial sections state
          const initialSections = JSON.parse(JSON.stringify(store.getState().sections));
          
          // Execute all operations
          let operationsExecuted = 0;
          operations.forEach(op => {
            const historyLengthBefore = store.getState().history.length;
            executeOperation(store, op);
            const historyLengthAfter = store.getState().history.length;
            
            // Count only operations that actually modified history
            if (historyLengthAfter > historyLengthBefore) {
              operationsExecuted++;
            }
          });
          
          // Undo all executed operations
          for (let i = 0; i < operationsExecuted; i++) {
            if (store.getState().canUndo()) {
              store.getState().undo();
            }
          }
          
          // Final state should match initial state
          const finalSections = store.getState().sections;
          const sectionsMatch = compareSectionsContent(initialSections, finalSections);
          
          expect(sectionsMatch).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sistema-fichas-tecnicas-nextjs, Property 4: Historial Undo/Redo Consistente
   * 
   * Property: Undo followed by redo restores the state before undo
   */
  it('undo followed by redo restores state', () => {
    fc.assert(
      fc.property(
        fichaIdArb,
        pozoIdArb,
        editOperationArb,
        (fichaId, pozoId, operation) => {
          const store = createFichaStore(createInitialFichaState(fichaId, pozoId));
          
          // Execute operation
          executeOperation(store, operation);
          
          // Capture state after operation
          const stateAfterOp = JSON.parse(JSON.stringify(store.getState().sections));
          
          // Only proceed if operation was recorded in history
          if (!store.getState().canUndo()) {
            return true; // Skip if operation didn't modify state
          }
          
          // Undo
          store.getState().undo();
          
          // Redo
          if (store.getState().canRedo()) {
            store.getState().redo();
            
            // State should match state after operation
            const stateAfterRedo = store.getState().sections;
            const sectionsMatch = compareSectionsContent(stateAfterOp, stateAfterRedo);
            
            expect(sectionsMatch).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sistema-fichas-tecnicas-nextjs, Property 4: Historial Undo/Redo Consistente
   * 
   * Property: Multiple undo/redo cycles maintain consistency
   */
  it('multiple undo/redo cycles maintain consistency', () => {
    fc.assert(
      fc.property(
        fichaIdArb,
        pozoIdArb,
        fc.array(editOperationArb, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 3 }),
        (fichaId, pozoId, operations, cycles) => {
          const store = createFichaStore(createInitialFichaState(fichaId, pozoId));
          
          // Capture initial state
          const initialSections = JSON.parse(JSON.stringify(store.getState().sections));
          
          // Execute all operations
          let operationsExecuted = 0;
          operations.forEach(op => {
            const historyLengthBefore = store.getState().history.length;
            executeOperation(store, op);
            if (store.getState().history.length > historyLengthBefore) {
              operationsExecuted++;
            }
          });
          
          // Perform multiple undo/redo cycles
          for (let cycle = 0; cycle < cycles; cycle++) {
            // Undo all
            for (let i = 0; i < operationsExecuted; i++) {
              if (store.getState().canUndo()) {
                store.getState().undo();
              }
            }
            
            // Verify we're back to initial state
            expect(compareSectionsContent(initialSections, store.getState().sections)).toBe(true);
            
            // Redo all
            for (let i = 0; i < operationsExecuted; i++) {
              if (store.getState().canRedo()) {
                store.getState().redo();
              }
            }
          }
          
          // Final undo all to return to initial
          for (let i = 0; i < operationsExecuted; i++) {
            if (store.getState().canUndo()) {
              store.getState().undo();
            }
          }
          
          // Should be back to initial state
          expect(compareSectionsContent(initialSections, store.getState().sections)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sistema-fichas-tecnicas-nextjs, Property 4: Historial Undo/Redo Consistente
   * 
   * Property: canUndo returns false when at initial state
   */
  it('canUndo is false at initial state', () => {
    fc.assert(
      fc.property(
        fichaIdArb,
        pozoIdArb,
        (fichaId, pozoId) => {
          const store = createFichaStore(createInitialFichaState(fichaId, pozoId));
          
          // At initial state, canUndo should be false
          expect(store.getState().canUndo()).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sistema-fichas-tecnicas-nextjs, Property 4: Historial Undo/Redo Consistente
   * 
   * Property: canRedo is false when at latest state
   */
  it('canRedo is false at latest state', () => {
    fc.assert(
      fc.property(
        fichaIdArb,
        pozoIdArb,
        fc.array(editOperationArb, { minLength: 1, maxLength: 5 }),
        (fichaId, pozoId, operations) => {
          const store = createFichaStore(createInitialFichaState(fichaId, pozoId));
          
          // Execute operations
          operations.forEach(op => executeOperation(store, op));
          
          // At latest state, canRedo should be false
          expect(store.getState().canRedo()).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sistema-fichas-tecnicas-nextjs, Property 4: Historial Undo/Redo Consistente
   * 
   * Property: New operation after undo clears redo history
   */
  it('new operation after undo clears redo history', () => {
    fc.assert(
      fc.property(
        fichaIdArb,
        pozoIdArb,
        editOperationArb,
        editOperationArb,
        (fichaId, pozoId, op1, op2) => {
          const store = createFichaStore(createInitialFichaState(fichaId, pozoId));
          
          // Execute first operation
          executeOperation(store, op1);
          
          // Only proceed if operation was recorded
          if (!store.getState().canUndo()) {
            return true;
          }
          
          // Undo
          store.getState().undo();
          
          // Capture history length before second operation
          const historyLengthBefore = store.getState().history.length;
          
          // Execute second operation
          executeOperation(store, op2);
          
          // Only check if second operation actually modified history
          const historyLengthAfter = store.getState().history.length;
          if (historyLengthAfter > historyLengthBefore) {
            // canRedo should be false (redo history cleared)
            expect(store.getState().canRedo()).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sistema-fichas-tecnicas-nextjs, Property 4: Historial Undo/Redo Consistente
   * 
   * Property: Finalized fichas cannot be undone
   */
  it('finalized fichas cannot be undone', () => {
    fc.assert(
      fc.property(
        fichaIdArb,
        pozoIdArb,
        fc.array(editOperationArb, { minLength: 1, maxLength: 3 }),
        (fichaId, pozoId, operations) => {
          const store = createFichaStore(createInitialFichaState(fichaId, pozoId));
          
          // Execute operations
          operations.forEach(op => executeOperation(store, op));
          
          // Capture state before finalize
          const stateBeforeFinalize = JSON.parse(JSON.stringify(store.getState().sections));
          
          // Finalize the ficha
          store.getState().finalize();
          
          // canUndo should be false for finalized ficha
          expect(store.getState().canUndo()).toBe(false);
          
          // Attempting undo should not change state
          store.getState().undo();
          
          expect(compareSectionsContent(stateBeforeFinalize, store.getState().sections)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
