/**
 * photoQueue.ts — gestor de concurrencia genérico con prioridad y tamaño dinámico.
 *
 * Reemplaza el patrón `for (let i=0; i<n; i+=CONCURRENCY)` por una cola real:
 *   - N workers procesan en paralelo
 *   - Se puede agregar trabajo mientras corre
 *   - Soporta prioridades (alta/normal/baja)
 *   - Mide tiempo de cada item para logging
 *
 * Uso:
 *   const queue = new PhotoQueue({ concurrency: 16 });
 *   const result = await queue.enqueue('PZ01-P.JPG', async () => downloadPhoto('PZ01-P.JPG'));
 *
 *   // Múltiples items:
 *   const results = await queue.enqueueAll(items, (item) => task(item));
 *   // results es Map<key, result | null>
 */

export type Priority = 0 | 1 | 2; // 0=alta, 1=normal, 2=baja

interface Task<T> {
    key: string;
    priority: Priority;
    fn: () => Promise<T>;
    resolve: (v: T | null) => void;
    reject: (e: any) => void;
    enqueuedAt: number;
}

export interface PhotoQueueOptions {
    concurrency?: number;      // default 16 — pool recomendado para HTTP
    onItem?: (key: string, durationMs: number, ok: boolean) => void;
}

export class PhotoQueue {
    private concurrency: number;
    private running = 0;
    private queues: Task<any>[][] = [[], [], []]; // 3 prioridades
    private onItem?: PhotoQueueOptions['onItem'];

    constructor(opts: PhotoQueueOptions = {}) {
        this.concurrency = Math.max(1, Math.min(50, opts.concurrency ?? 16));
        this.onItem = opts.onItem;
    }

    /** Agrega una tarea — devuelve Promise que resuelve con el resultado o null si falla */
    enqueue<T>(key: string, fn: () => Promise<T>, priority: Priority = 1): Promise<T | null> {
        return new Promise((resolve, reject) => {
            const task: Task<T> = { key, priority, fn, resolve, reject, enqueuedAt: performance.now() };
            this.queues[priority].push(task);
            this.pump();
        });
    }

    /**
     * Encola N items en paralelo y espera a que terminen todos.
     * Retorna un Map<key, resultado|null>.
     */
    async enqueueAll<T, K>(
        items: K[],
        keyFn: (item: K) => string,
        task: (item: K) => Promise<T>,
        priority: Priority = 1
    ): Promise<Map<string, T | null>> {
        const results = new Map<string, T | null>();
        await Promise.all(
            items.map(async (item) => {
                const key = keyFn(item);
                const r = await this.enqueue(key, () => task(item), priority);
                results.set(key, r);
            })
        );
        return results;
    }

    /** Items pendientes (no corriendo todavía) */
    get pending(): number {
        return this.queues.reduce((a, q) => a + q.length, 0);
    }

    /** Items corriendo ahora */
    get active(): number {
        return this.running;
    }

    /** Cambia dinámicamente el pool size (útil para adaptar según latencia) */
    setConcurrency(n: number) {
        this.concurrency = Math.max(1, Math.min(50, n));
        this.pump();
    }

    // ─────────────────────────────────────────────────────────────
    // Motor interno
    // ─────────────────────────────────────────────────────────────

    private nextTask(): Task<any> | null {
        for (const q of this.queues) {
            if (q.length > 0) return q.shift()!;
        }
        return null;
    }

    private pump() {
        while (this.running < this.concurrency) {
            const task = this.nextTask();
            if (!task) return;
            this.running++;
            this.runTask(task);
        }
    }

    private async runTask(task: Task<any>) {
        const t0 = performance.now();
        let ok = false;
        try {
            const result = await task.fn();
            ok = result != null;
            task.resolve(result);
        } catch (err) {
            task.resolve(null); // no reject — el llamador mira el resultado null
        } finally {
            this.running--;
            const dur = Math.round(performance.now() - t0);
            this.onItem?.(task.key, dur, ok);
            this.pump();
        }
    }
}
