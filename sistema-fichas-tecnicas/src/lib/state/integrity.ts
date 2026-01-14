/**
 * State Integrity - Garantía de robustez absoluta del estado
 * 
 * Implementa los principios de recuperación ante fallos y persistencia segura.
 * "Nunca guardo un estado corrupto"
 */

import type { FichaState, FichaSection } from '@/types/ficha';

/**
 * ESTADO BASE INMUTABLE ( fallback último )
 * Principio: "Nunca se persiste, nunca se modifica"
 */
export const BASE_STATE: Readonly<Partial<FichaState>> = Object.freeze({
    status: 'draft',
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
    errors: [],
    version: 0,
    stateStatus: 'ok'
});

/**
 * Valida la estructura mínima de una ficha
 */
export function isStateValid(state: any): state is FichaState {
    if (!state || typeof state !== 'object') return false;
    if (!state.id || !state.pozoId) return false;
    if (!Array.isArray(state.sections)) return false;
    if (!state.customizations || !state.customizations.colors) return false;

    // Validar integridad de secciones
    const sectionsValid = state.sections.every((s: any) =>
        s.id && s.type && typeof s.content === 'object'
    );

    return sectionsValid;
}

/**
 * Persistencia Segura
 * Regla: "Nunca sobrescribe lo bueno con basura"
 */
export function safePersist(state: FichaState): void {
    if (!isStateValid(state)) {
        console.error('[Integrity] Intento de persistencia fallido: Estado corrupto ignorado.');
        return;
    }

    try {
        const key = `ficha_store_${state.id}`;
        const serialized = JSON.stringify({
            ...state,
            lastValidStateRef: undefined, // No guardamos recursivamente
            stateStatus: 'ok'
        });

        // Guardar estado actual
        localStorage.setItem(key, serialized);

        // Guardar como "Último Estado Válido" (Separado)
        localStorage.setItem(`${key}_last_valid`, serialized);

    } catch (e) {
        console.error('[Integrity] Error al persistir:', e);
    }
}

/**
 * Pipeline único de recuperación
 * Orden: Último válido -> Snapshot (TODO) -> Base
 */
export function recoverState(fichaId: string, pozoId: string): FichaState {
    const key = `ficha_store_${fichaId}`;

    try {
        // 1. Intentar cargar estado actual
        const currentData = localStorage.getItem(key);
        if (currentData) {
            const parsed = JSON.parse(currentData);
            if (isStateValid(parsed)) return { ...parsed, stateStatus: 'ok' };
        }

        // 2. Intentar cargar Último Estado Válido
        const lastValidData = localStorage.getItem(`${key}_last_valid`);
        if (lastValidData) {
            const parsed = JSON.parse(lastValidData);
            if (isStateValid(parsed)) {
                console.warn('[Integrity] Estado recuperado desde LastValidState');
                return { ...parsed, stateStatus: 'recovered' };
            }
        }

        // 3. Fallback a BASE_STATE
        console.error('[Integrity] No se pudo recuperar ningún estado. Iniciando desde base.');
        return {
            ...BASE_STATE,
            id: fichaId,
            pozoId: pozoId,
            lastModified: Date.now(),
            stateStatus: 'reset'
        } as FichaState;

    } catch (e) {
        return {
            ...BASE_STATE,
            id: fichaId,
            pozoId: pozoId,
            lastModified: Date.now(),
            stateStatus: 'reset'
        } as FichaState;
    }
}
