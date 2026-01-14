/**
 * ResourceManager - Vigilante de recursos sistémicos
 * 
 * Monitorea uso de memoria estimado, estado de workers y activa el modo degradado.
 * Implementa el Principio Rector: "Nada del usuario puede provocar colapso sistémico".
 */

import { blobStore } from '@/lib/storage/blobStore';

export interface SystemStats {
    estimatedMemoryMB: number;
    workerCount: number;
    blobCount: number;
    isDegraded: boolean;
    activeFichas: number;
    memoryStatus: 'normal' | 'warning' | 'critical';
}

class ResourceManager {
    private static instance: ResourceManager;
    private isDegradedMode: boolean = false;
    private activeWorkers: number = 0;
    private maxMemoryMB: number = 250; // Umbral conservador para modo degradado
    private activeFichas: Set<string> = new Set();

    private constructor() {
        // En un entorno real, podríamos usar performance.memory si está disponible
        // Pero aquí usaremos una estimación basada en BlobStore + Estado
    }

    public static getInstance(): ResourceManager {
        if (!ResourceManager.instance) {
            ResourceManager.instance = new ResourceManager();
        }
        return ResourceManager.instance;
    }

    /**
     * Registra el inicio de una tarea en un worker
     */
    public registerWorkerStart(): void {
        this.activeWorkers++;
        this.checkStatus();
    }

    /**
     * Registra el fin de una tarea en un worker
     */
    public registerWorkerEnd(): void {
        this.activeWorkers = Math.max(0, this.activeWorkers - 1);
        this.checkStatus();
    }

    /**
     * Registra una ficha activa
     */
    public registerFicha(id: string): void {
        this.activeFichas.add(id);
        this.checkStatus();
    }

    /**
     * Desregistra una ficha (cerrada)
     */
    public unregisterFicha(id: string): void {
        this.activeFichas.delete(id);
        this.checkStatus();
    }

    /**
     * Evalúa si debemos entrar en modo degradado
     */
    private checkStatus(): boolean {
        const stats = this.getStats();

        // Reglas de degradación
        const memoryCritical = stats.estimatedMemoryMB > this.maxMemoryMB;
        const tooManyPhotos = stats.blobCount > 2000;
        const tooManyFichas = stats.activeFichas > 25;

        const shouldBeDegraded = memoryCritical || tooManyPhotos || tooManyFichas;

        if (shouldBeDegraded !== this.isDegradedMode) {
            this.isDegradedMode = shouldBeDegraded;
            console.warn(`[ResourceManager] Cambio de modo: ${this.isDegradedMode ? 'DEGRADADO' : 'NORMAL'}`);
            // Aquí dispararíamos un evento global o actualizaríamos un store
        }

        return this.isDegradedMode;
    }

    /**
     * Obtiene telemetría en tiempo real
     */
    public getStats(): SystemStats {
        const blobStats = blobStore.getStats();
        const memMB = parseFloat(blobStats.totalSizeMB);

        let memoryStatus: 'normal' | 'warning' | 'critical' = 'normal';
        if (memMB > this.maxMemoryMB) memoryStatus = 'critical';
        else if (memMB > this.maxMemoryMB * 0.7) memoryStatus = 'warning';

        return {
            estimatedMemoryMB: memMB,
            workerCount: this.activeWorkers,
            blobCount: blobStats.count,
            isDegraded: this.isDegradedMode,
            activeFichas: this.activeFichas.size,
            memoryStatus
        };
    }

    public getStatus(): SystemStats {
        return this.getStats();
    }

    public isDegraded(): boolean {
        return this.isDegradedMode;
    }
}

export const resourceManager = ResourceManager.getInstance();
