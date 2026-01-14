/**
 * EventLogger - Registro persistente de eventos para auditoría y debug
 * Requirements: 27.4
 */

export interface AppEvent {
    id: string;
    timestamp: number;
    type: 'action' | 'error' | 'sync' | 'system';
    source: string;
    payload: any;
    userId?: string;
}

export class EventLogger {
    private static STORAGE_KEY = 'fichas:event_log';
    private static MAX_EVENTS = 200;

    static log(event: Omit<AppEvent, 'id' | 'timestamp'>): void {
        const fullEvent: AppEvent = {
            ...event,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        };

        console.log(`[EventLog] ${fullEvent.type}: ${fullEvent.source}`, fullEvent.payload);

        try {
            const logs = this.getLogs();
            logs.unshift(fullEvent);

            const pruned = logs.slice(0, this.MAX_EVENTS);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pruned));
        } catch (e) {
            console.error('Failed to save log to localStorage', e);
        }
    }

    static getLogs(): AppEvent[] {
        try {
            const logs = localStorage.getItem(this.STORAGE_KEY);
            return logs ? JSON.parse(logs) : [];
        } catch {
            return [];
        }
    }

    static clear(): void {
        localStorage.removeItem(this.STORAGE_KEY);
    }
}
