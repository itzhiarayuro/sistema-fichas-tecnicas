/**
 * Property Test: Error Containment
 * **Property 8: Contención de Errores**
 * **Validates: Requirements 0.1, 17.1-17.6**
 * 
 * For any error that occurs during the processing of a ficha,
 * the error SHALL remain encapsulated in the context of that ficha
 * without affecting the global state or other fichas.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createFichaStore, type FichaStore } from '@/stores/fichaStore';
import { useGlobalStore } from '@/stores/globalStore';
import { 
  createDataError, 
  createUserError, 
  createSystemError 
} from '@/lib/errors/FichaError';
import type { FichaState, FichaError } from '@/types';

// Generators for property-based testing
const fichaIdArb = fc.uuid();
const pozoIdArb = fc.stringOf(fc.constantFrom('M', 'P', 'S'), { minLength: 1, maxLength: 1 })
  .chain(prefix => fc.integer({ min: 1, max: 9999 }).map(n => `${prefix}${n}`));

const errorTypeArb = fc.constantFrom('data', 'user', 'system') as fc.Arbitrary<'data' | 'user' | 'system'>;
const errorSeverityArb = fc.constantFrom('warning', 'error') as fc.Arbitrary<'warning' | 'error'>;

const fichaErrorArb = fc.record({
  id: fc.uuid(),
  fichaId: fichaIdArb,
  type: errorTypeArb,
  severity: errorSeverityArb,
  message: fc.string({ minLength: 1, maxLength: 100 }),
  userMessage: fc.string({ minLength: 1, maxLength: 200 }),
  field: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  timestamp: fc.integer({ min: 0 }),
  resolved: fc.boolean(),
});

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
      locked: true,
      content: {},
    },
  ],
  errors: [],
  history: [],
  lastModified: Date.now(),
  version: 1,
});

describe('Property 8: Error Containment', () => {
  beforeEach(() => {
    // Reset global store before each test
    useGlobalStore.getState().reset();
  });

  /**
   * Feature: sistema-fichas-tecnicas-nextjs, Property 8: Error Containment
   * 
   * Property: For any error added to Ficha A, Ficha B's state remains unchanged
   */
  it('errors in one ficha do not affect other fichas', () => {
    fc.assert(
      fc.property(
        fichaIdArb,
        fichaIdArb,
        pozoIdArb,
        pozoIdArb,
        fichaErrorArb,
        (fichaIdA, fichaIdB, pozoIdA, pozoIdB, errorData) => {
          // Ensure different ficha IDs
          if (fichaIdA === fichaIdB) return true;

          // Create two isolated ficha stores
          const storeA = createFichaStore(createInitialFichaState(fichaIdA, pozoIdA));
          const storeB = createFichaStore(createInitialFichaState(fichaIdB, pozoIdB));

          // Capture initial state of Ficha B
          const initialStateBVersion = storeB.getState().version;
          const initialStateBErrors = [...storeB.getState().errors];
          const initialStateBSections = JSON.stringify(storeB.getState().sections);

          // Add error to Ficha A with correct fichaId
          const errorForA: FichaError = {
            ...errorData,
            fichaId: fichaIdA,
          };
          storeA.getState().addError(errorForA);

          // Verify Ficha A has the error
          expect(storeA.getState().errors).toHaveLength(1);
          expect(storeA.getState().errors[0].fichaId).toBe(fichaIdA);

          // Verify Ficha B is completely unaffected
          expect(storeB.getState().version).toBe(initialStateBVersion);
          expect(storeB.getState().errors).toEqual(initialStateBErrors);
          expect(JSON.stringify(storeB.getState().sections)).toBe(initialStateBSections);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sistema-fichas-tecnicas-nextjs, Property 8: Error Containment
   * 
   * Property: Errors are always associated with their originating ficha
   */
  it('errors are always scoped to their originating ficha', () => {
    fc.assert(
      fc.property(
        fichaIdArb,
        pozoIdArb,
        fc.array(fichaErrorArb, { minLength: 1, maxLength: 10 }),
        (fichaId, pozoId, errors) => {
          const store = createFichaStore(createInitialFichaState(fichaId, pozoId));

          // Add all errors with correct fichaId
          errors.forEach(error => {
            const scopedError: FichaError = {
              ...error,
              fichaId: fichaId,
            };
            store.getState().addError(scopedError);
          });

          // All errors should be scoped to this ficha
          const storeErrors = store.getState().errors;
          expect(storeErrors).toHaveLength(errors.length);
          
          storeErrors.forEach(error => {
            expect(error.fichaId).toBe(fichaId);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sistema-fichas-tecnicas-nextjs, Property 8: Error Containment
   * 
   * Property: Global state remains unaffected by ficha errors
   */
  it('global state is not affected by ficha errors', () => {
    fc.assert(
      fc.property(
        fichaIdArb,
        pozoIdArb,
        fc.array(fichaErrorArb, { minLength: 1, maxLength: 5 }),
        (fichaId, pozoId, errors) => {
          // Capture initial global state
          const globalStore = useGlobalStore.getState();
          const initialConfig = { ...globalStore.config };
          const initialStep = globalStore.currentStep;
          const initialPozosSize = globalStore.pozos.size;
          const initialPhotosSize = globalStore.photos.size;

          // Create ficha store and add errors
          const fichaStore = createFichaStore(createInitialFichaState(fichaId, pozoId));
          
          errors.forEach(error => {
            const scopedError: FichaError = {
              ...error,
              fichaId: fichaId,
            };
            fichaStore.getState().addError(scopedError);
          });

          // Verify global state is unchanged
          const currentGlobalState = useGlobalStore.getState();
          expect(currentGlobalState.config).toEqual(initialConfig);
          expect(currentGlobalState.currentStep).toBe(initialStep);
          expect(currentGlobalState.pozos.size).toBe(initialPozosSize);
          expect(currentGlobalState.photos.size).toBe(initialPhotosSize);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sistema-fichas-tecnicas-nextjs, Property 8: Error Containment
   * 
   * Property: Clearing errors in one ficha doesn't affect other fichas
   */
  it('clearing errors in one ficha does not affect other fichas', () => {
    fc.assert(
      fc.property(
        fichaIdArb,
        fichaIdArb,
        pozoIdArb,
        pozoIdArb,
        fichaErrorArb,
        fichaErrorArb,
        (fichaIdA, fichaIdB, pozoIdA, pozoIdB, errorA, errorB) => {
          // Ensure different ficha IDs
          if (fichaIdA === fichaIdB) return true;

          // Create two isolated ficha stores
          const storeA = createFichaStore(createInitialFichaState(fichaIdA, pozoIdA));
          const storeB = createFichaStore(createInitialFichaState(fichaIdB, pozoIdB));

          // Add errors to both fichas
          const scopedErrorA: FichaError = { ...errorA, fichaId: fichaIdA };
          const scopedErrorB: FichaError = { ...errorB, fichaId: fichaIdB };
          
          storeA.getState().addError(scopedErrorA);
          storeB.getState().addError(scopedErrorB);

          // Clear all errors in Ficha A
          storeA.getState().clearAllErrors();

          // Verify Ficha A has no errors
          expect(storeA.getState().errors).toHaveLength(0);

          // Verify Ficha B still has its error
          expect(storeB.getState().errors).toHaveLength(1);
          expect(storeB.getState().errors[0].fichaId).toBe(fichaIdB);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sistema-fichas-tecnicas-nextjs, Property 8: Error Containment
   * 
   * Property: Error creation functions always produce properly scoped errors
   */
  it('error factory functions produce properly scoped errors', () => {
    fc.assert(
      fc.property(
        fichaIdArb,
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        (fichaId, message, userMessage, field) => {
          // Test all error factory functions
          const dataError = createDataError(fichaId, message, userMessage, field);
          const userError = createUserError(fichaId, message, userMessage);
          const systemError = createSystemError(fichaId, message, userMessage);

          // All errors should be scoped to the correct ficha
          expect(dataError.fichaId).toBe(fichaId);
          expect(userError.fichaId).toBe(fichaId);
          expect(systemError.fichaId).toBe(fichaId);

          // Verify error types
          expect(dataError.type).toBe('data');
          expect(userError.type).toBe('user');
          expect(systemError.type).toBe('system');

          // Verify all errors have required fields
          [dataError, userError, systemError].forEach(error => {
            expect(error.id).toBeDefined();
            expect(error.timestamp).toBeGreaterThan(0);
            expect(error.resolved).toBe(false);
            expect(error.message).toBe(message);
            expect(error.userMessage).toBe(userMessage);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sistema-fichas-tecnicas-nextjs, Property 8: Error Containment
   * 
   * Property: Multiple operations with errors maintain isolation
   */
  it('multiple operations with errors maintain ficha isolation', () => {
    fc.assert(
      fc.property(
        fc.array(fichaIdArb, { minLength: 2, maxLength: 5 }),
        fc.array(pozoIdArb, { minLength: 2, maxLength: 5 }),
        fc.array(fichaErrorArb, { minLength: 1, maxLength: 3 }),
        (fichaIds, pozoIds, errors) => {
          // Ensure unique ficha IDs
          const uniqueFichaIds = [...new Set(fichaIds)];
          if (uniqueFichaIds.length < 2) return true;

          // Create stores for each unique ficha
          const stores = uniqueFichaIds.map((fichaId, index) => ({
            fichaId,
            store: createFichaStore(
              createInitialFichaState(fichaId, pozoIds[index % pozoIds.length])
            ),
          }));

          // Add errors only to the first ficha
          const targetFichaId = stores[0].fichaId;
          errors.forEach(error => {
            const scopedError: FichaError = { ...error, fichaId: targetFichaId };
            stores[0].store.getState().addError(scopedError);
          });

          // Verify only the first ficha has errors
          expect(stores[0].store.getState().errors.length).toBe(errors.length);

          // Verify all other fichas have no errors
          stores.slice(1).forEach(({ store, fichaId }) => {
            expect(store.getState().errors).toHaveLength(0);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
