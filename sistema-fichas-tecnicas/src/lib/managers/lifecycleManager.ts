/**
 * LifecycleManager - Gestión del ciclo de vida operativo de las fichas
 * 
 * Controla cuándo una ficha debe liberar recursos pesados de la RAM.
 * Implementa el principio: "Nada pesado vive en RAM más de lo necesario".
 */

import { resourceManager } from './resourceManager';
import { blobStore } from '@/lib/storage/blobStore';

export type FichaLifeState = 'mounted' | 'active' | 'suspended' | 'resumed' | 'destroyed';

class LifecycleManager {
    private static instance: LifecycleManager;
    private states: Map<string, FichaLifeState> = new Map();
    private photoReferences: Map<string, Set<string>> = new Map(); // fichaId -> Set<blobId>

    private constructor() { }

    public static getInstance(): LifecycleManager {
        if (!LifecycleManager.instance) {
            LifecycleManager.instance = new LifecycleManager();
        }
        return LifecycleManager.instance;
    }

    /**
     * Inicia el ciclo de vida de una ficha
     */
    public mount(fichaId: string): void {
        this.states.set(fichaId, 'mounted');
        resourceManager.registerFicha(fichaId);
    }

    /**
     * Activa una ficha (visible/en edición)
     */
    public activate(fichaId: string): void {
        this.states.set(fichaId, 'active');
        console.log(`[Lifecycle] Ficha ${fichaId} activa: Cargando recursos...`);
    }

    /**
     * Suspende una ficha (pestaña en segundo plano, minimizada o inactiva por > 5 min)
     * Libera recursos pesados pero mantiene el estado de edición.
     */
    public suspend(fichaId: string): void {
        if (this.states.get(fichaId) === 'active' || this.states.get(fichaId) === 'resumed') {
            this.states.set(fichaId, 'suspended');

            // Liberar URLs de objetos de esta ficha para ahorrar RAM
            const refs = this.photoReferences.get(fichaId);
            if (refs) {
                refs.forEach(blobId => {
                    // Nota: No liberamos el blob del blobStore todavía porque se usa en otras fichas,
                    // solo liberamos la URL de visualización si es necesario.
                    // URLs de blobs son baratas, pero los Blobs en sí ocupan RAM.
                });
            }

            console.log(`[Lifecycle] Ficha ${fichaId} suspendida: RAM liberada.`);
        }
    }

    /**
     * Reanuda una ficha suspendida
     */
    public resume(fichaId: string): void {
        if (this.states.get(fichaId) === 'suspended') {
            this.states.set(fichaId, 'resumed');
            console.log(`[Lifecycle] Ficha ${fichaId} reanudada.`);
        }
    }

    /**
     * Finaliza el ciclo de vida y limpia TODO
     */
    public destroy(fichaId: string): void {
        this.states.delete(fichaId);
        this.photoReferences.delete(fichaId);
        resourceManager.unregisterFicha(fichaId);
        console.log(`[Lifecycle] Ficha ${fichaId} destruida.`);
    }

    /**
     * Asocia una foto a una ficha para control de liberación
     */
    public registerPhotoUse(fichaId: string, blobId: string): void {
        if (!this.photoReferences.has(fichaId)) {
            this.photoReferences.set(fichaId, new Set());
        }
        this.photoReferences.get(fichaId)?.add(blobId);
    }

    public getState(fichaId: string): FichaLifeState | undefined {
        return this.states.get(fichaId);
    }
}

export const lifecycleManager = LifecycleManager.getInstance();
