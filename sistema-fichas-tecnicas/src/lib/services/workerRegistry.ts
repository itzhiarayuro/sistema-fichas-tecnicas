/**
 * WorkerRegistry - Gestión centralizada de Web Workers
 * 
 * Implementa el principio: "Todo procesamiento pesado vive en workers cancelables".
 * Requirements: 20.5
 */

import { resourceManager } from '../managers/resourceManager';

export interface WorkerResponse<T> {
    type: 'SUCCESS' | 'ERROR' | 'PROGRESS';
    result?: T;
    error?: string;
    progress?: number;
    message?: string;
}

class WorkerRegistry {
    private static instance: WorkerRegistry;
    private excelWorker: Worker | null = null;

    private constructor() { }

    public static getInstance(): WorkerRegistry {
        if (!WorkerRegistry.instance) {
            WorkerRegistry.instance = new WorkerRegistry();
        }
        return WorkerRegistry.instance;
    }

    /**
     * Ejecuta una tarea en el worker de Excel
     */
    public async runExcelTask<T>(buffer: ArrayBuffer, onProgress?: (p: number, m: string) => void): Promise<T> {
        return new Promise((resolve, reject) => {
            // Aseguramos que solo hay un worker activo o los gestionamos
            if (!this.excelWorker) {
                this.excelWorker = new Worker(new URL('../workers/excel.worker.ts', import.meta.url));
            }

            const worker = this.excelWorker;
            resourceManager.registerWorkerStart();

            const handler = (e: MessageEvent<WorkerResponse<T>>) => {
                const response = e.data;

                switch (response.type) {
                    case 'PROGRESS':
                        onProgress?.(response.progress || 0, response.message || '');
                        break;
                    case 'SUCCESS':
                        cleanup();
                        resolve(response.result!);
                        break;
                    case 'ERROR':
                        cleanup();
                        reject(new Error(response.error));
                        break;
                }
            };

            const cleanup = () => {
                worker.removeEventListener('message', handler);
                resourceManager.registerWorkerEnd();
            };

            worker.addEventListener('message', handler);
            worker.postMessage({ buffer }, [buffer]); // Transferable buffer
        });
    }

    /**
     * Detiene todos los workers
     */
    public terminateAll(): void {
        if (this.excelWorker) {
            this.excelWorker.terminate();
            this.excelWorker = null;
        }
    }
}

export const workerRegistry = WorkerRegistry.getInstance();
