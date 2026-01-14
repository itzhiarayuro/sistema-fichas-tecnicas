/**
 * LimitManager - Control de límites físicos innegociables
 * 
 * Previene que el sistema procese archivos excesivamente grandes o demasiadas fotos.
 * Implementa las reglas del Requirement 19.
 */

export const SYSTEM_LIMITS = {
    MAX_PHOTOS_PER_POZO: 100,
    DEGRADED_MODE_PHOTOS_TOTAL: 2000,
    MAX_PHOTO_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
    MAX_SIMULTANEOUS_EXCELS: 20,
    MAX_ACTIVE_FICHAS: 25,
};

export class LimitManager {
    /**
     * Valida si se puede agregar una foto a un pozo
     */
    public static canAddPhotoToPozo(currentCount: number): { can: boolean; message?: string } {
        if (currentCount >= SYSTEM_LIMITS.MAX_PHOTOS_PER_POZO) {
            return {
                can: false,
                message: `Límite alcanzado: máximo ${SYSTEM_LIMITS.MAX_PHOTOS_PER_POZO} fotos por pozo.`
            };
        }
        return { can: true };
    }

    /**
     * Valida el tamaño de una foto
     */
    public static isPhotoSizeAllowed(sizeInBytes: number): boolean {
        return sizeInBytes <= SYSTEM_LIMITS.MAX_PHOTO_SIZE_BYTES;
    }

    /**
     * Valida si el sistema debe entrar en modo degradado por cantidad total de fotos
     */
    public static shouldEnterDegradedMode(totalPhotos: number): boolean {
        return totalPhotos >= SYSTEM_LIMITS.DEGRADED_MODE_PHOTOS_TOTAL;
    }
}
