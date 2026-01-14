/**
 * HistoryManager - Gestión avanzada de historial y snapshots
 * Requirements: 3.7, 13.1-13.4, 27.2
 */

import { FichaState, Snapshot } from '@/types/ficha';
import { generateId } from '@/stores/designStore'; // Reusing generateId

export class HistoryManager {
    private static MAX_HISTORY = 50;
    private static MAX_SNAPSHOTS = 10;

    static createSnapshot(state: FichaState, trigger: Snapshot['trigger']): Snapshot {
        const values: Record<string, any> = {};
        state.sections.forEach(s => {
            Object.entries(s.content).forEach(([k, v]) => {
                values[`${s.id}.${k}`] = v.value;
            });
        });

        return {
            id: `snap-${generateId()}`,
            fichaId: state.id,
            schemaVersion: '1.0',
            structure: state.sections.map(s => ({ id: s.id, type: s.type, visible: s.visible })),
            values: values,
            references: [],
            metadata: {
                status: state.status,
                version: state.version,
                lastModified: state.lastModified
            },
            timestamp: Date.now(),
            trigger,
        };
    }

    static applyUndo(history: any[], currentIndex: number): number {
        if (currentIndex <= 0) return currentIndex;
        return currentIndex - 1;
    }

    static applyRedo(history: any[], currentIndex: number): number {
        if (currentIndex >= history.length - 1) return currentIndex;
        return currentIndex + 1;
    }

    static pruneHistory(history: any[]): any[] {
        if (history.length <= this.MAX_HISTORY) return history;
        return history.slice(history.length - this.MAX_HISTORY);
    }
}
