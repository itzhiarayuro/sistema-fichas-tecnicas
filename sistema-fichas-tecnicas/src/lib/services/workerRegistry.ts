/**
 * WorkerRegistry - Gestión centralizada de Web Workers
 * 
 * Implementa el principio: "Todo procesamiento pesado vive en workers cancelables".
 * Requirements: 20.5
 */

import { resourceManager } from '../managers/resourceManager';

export interface WorkerResponse<T> {
    type: 'SUCCESS' | 'ERROR' | 'PROGRESS';
    id?: string; // ID para identificar la tarea en entornos concurrentes
    result?: T;
    error?: string;
    progress?: number;
    message?: string;
}

class WorkerRegistry {
    private static instance: WorkerRegistry;
    private excelWorker: Worker | null = null;
    private photoWorker: Worker | null = null;

    private constructor() { }

    public static getInstance(): WorkerRegistry {
        if (!WorkerRegistry.instance) {
            WorkerRegistry.instance = new WorkerRegistry();
        }
        return WorkerRegistry.instance;
    }

    public async runExcelTask<T>(buffer: ArrayBuffer, onProgress?: (p: number, m: string) => void): Promise<T> {
        const taskId = `excel-${Math.random().toString(36).substring(7)}`;
        return this.executeInWorker<T>(
            'excel',
            { id: taskId, buffer },
            [buffer],
            onProgress,
            taskId
        );
    }

    /**
     * Ejecuta una tarea de procesamiento de fotos
     */
    public async runPhotoTask<T>(
        file: File | Blob,
        options: { maxWidth?: number; maxHeight?: number; quality?: number; generateHash?: boolean },
        onProgress?: (p: number, m: string) => void
    ): Promise<T> {
        const taskId = `photo-${Math.random().toString(36).substring(7)}`;
        return this.executeInWorker<T>(
            'photo',
            { id: taskId, file, options },
            [], // No transferibles por ahora para evitar problemas con File
            onProgress,
            taskId
        );
    }

    /**
     * Lógica interna para ejecutar en Worker genérico
     */
    private async executeInWorker<T>(
        type: 'excel' | 'photo',
        payload: any,
        transferables: Transferable[] = [],
        onProgress?: (p: number, m: string) => void,
        taskId?: string
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            try {
                let worker: Worker | null = null;

                if (type === 'excel') {
                    if (!this.excelWorker) {
                        this.excelWorker = new Worker(new URL('../workers/excel.worker.ts', import.meta.url));
                    }
                    worker = this.excelWorker;
                } else {
                    if (!this.photoWorker) {
                        this.photoWorker = new Worker(new URL('../workers/photo.worker.ts', import.meta.url));
                    }
                    worker = this.photoWorker;
                }

                if (!worker) return reject(new Error(`No se pudo inicializar worker de tipo ${type}`));

                resourceManager.registerWorkerStart();

                const handler = (e: MessageEvent<WorkerResponse<T>>) => {
                    const response = e.data;

                    // Si la respuesta tiene ID, validar que sea el nuestro
                    if (taskId && response.id && response.id !== taskId) {
                        return; // No es para nosotros, ignorar
                    }

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
                    worker!.removeEventListener('message', handler);
                    resourceManager.registerWorkerEnd();
                };

                worker.addEventListener('message', handler);
                worker.postMessage(payload, transferables);
            } catch (err) {
                reject(err);
            }
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
        if (this.photoWorker) {
            this.photoWorker.terminate();
            this.photoWorker = null;
        }
    }
}

export const workerRegistry = WorkerRegistry.getInstance();
