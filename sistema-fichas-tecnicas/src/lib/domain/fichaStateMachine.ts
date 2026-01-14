/**
 * FichaStateMachine - Máquina de estados formal para el ciclo de vida de una ficha
 * Requirements: 16.1-16.5, 27.1
 */

import { FichaStatus } from '@/types/ficha';

export type FichaTransition = 'START_EDITING' | 'COMPLETE' | 'FINALIZE' | 'REOPEN';

interface StateTransition {
    from: FichaStatus;
    to: FichaStatus;
    action: FichaTransition;
    validate?: (context: any) => boolean;
}

const TRANSITIONS: StateTransition[] = [
    { from: 'draft', to: 'editing', action: 'START_EDITING' },
    { from: 'editing', to: 'complete', action: 'COMPLETE' },
    { from: 'complete', to: 'finalized', action: 'FINALIZE' },
    { from: 'complete', to: 'editing', action: 'REOPEN' },
    { from: 'finalized', to: 'editing', action: 'REOPEN' },
];

export class FichaStateMachine {
    static canTransition(currentStatus: FichaStatus, transition: FichaTransition): boolean {
        return TRANSITIONS.some(t => t.from === currentStatus && t.action === transition);
    }

    static getNextState(currentStatus: FichaStatus, transition: FichaTransition): FichaStatus {
        const found = TRANSITIONS.find(t => t.from === currentStatus && t.action === transition);
        if (!found) {
            throw new Error(`Transición inválida: ${transition} desde el estado ${currentStatus}`);
        }
        return found.to;
    }

    static getAvailableTransitions(currentStatus: FichaStatus): FichaTransition[] {
        return TRANSITIONS.filter(t => t.from === currentStatus).map(t => t.action);
    }
}
