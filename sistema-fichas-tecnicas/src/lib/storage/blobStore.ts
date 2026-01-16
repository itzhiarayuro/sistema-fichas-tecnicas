/**
 * BlobStore - Almacenamiento centralizado de recursos pesados (Imágenes/Archivos)
 * 
 * Implementa el Principio Rector: "Nada pesado vive en memoria más de lo necesario".
 * Evita que blobs o base64 saturen el estado global de Zustand.
 */

import { logger } from '@/lib/logger';

export interface StoredBlob {
    id: string;
    blob: Blob | File;
    type: string;
    size: number;
    lastAccessed: number;
}

class BlobStore {
    private static instance: BlobStore;
    private memoryMap: Map<string, StoredBlob> = new Map();
    private urlMap: Map<string, string> = new Map(); // Para ObjectURLs

    private constructor() { }

    public static getInstance(): BlobStore {
        if (!BlobStore.instance) {
            BlobStore.instance = new BlobStore();
        }
        return BlobStore.instance;
    }

    /**
     * Guarda un blob y retorna un ID único
     */
    public async store(blob: Blob | File, customId?: string): Promise<string> {
        const id = customId || crypto.randomUUID();

        const stored: StoredBlob = {
            id,
            blob,
            type: blob.type,
            size: blob.size,
            lastAccessed: Date.now(),
        };

        this.memoryMap.set(id, stored);
        logger.debug('Blob almacenado', { id, type: blob.type, size: blob.size }, 'BlobStore');
        return id;
    }

    /**
     * Obtiene el blob por ID
     */
    public get(id: string): Blob | File | undefined {
        const stored = this.memoryMap.get(id);
        if (stored) {
            stored.lastAccessed = Date.now();
            return stored.blob;
        }
        logger.warn('Intento de obtener blob inexistente', { id }, 'BlobStore');
        return undefined;
    }

    /**
     * Obtiene una URL usable para <img> (ObjectURL)
     * Automáticamente gestiona la creación y liberación
     */
    public getUrl(id: string): string | undefined {
        if (this.urlMap.has(id)) {
            return this.urlMap.get(id);
        }

        const blob = this.get(id);
        if (!blob) return undefined;

        const url = URL.createObjectURL(blob);
        this.urlMap.set(id, url);
        logger.debug('ObjectURL creado', { id, url }, 'BlobStore');
        return url;
    }

    /**
     * Libera un blob específico de la memoria
     */
    public release(id: string): void {
        const url = this.urlMap.get(id);
        if (url) {
            URL.revokeObjectURL(url);
            this.urlMap.delete(id);
        }
        this.memoryMap.delete(id);
    }

    /**
     * Libera todos los recursos (Clean up)
     */
    public purge(): void {
        this.urlMap.forEach((url) => URL.revokeObjectURL(url));
        this.urlMap.clear();
        this.memoryMap.clear();
    }

    /**
     * Obtiene estadísticas de uso
     */
    public getStats() {
        let totalSize = 0;
        this.memoryMap.forEach((b) => totalSize += b.size);

        return {
            count: this.memoryMap.size,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        };
    }
}

export const blobStore = BlobStore.getInstance();
