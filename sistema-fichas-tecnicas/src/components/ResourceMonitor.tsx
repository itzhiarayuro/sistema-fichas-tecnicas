/**
 * ResourceMonitor - Monitoreo silencioso de recursos del sistema
 * 
 * Implementa el principio: "Nada del usuario puede provocar un colapso sistémico".
 * Requirements: 19, 20
 */

'use client';

import { useEffect } from 'react';
import { resourceManager } from '@/lib/managers/resourceManager';
import { useUIStore } from '@/stores/uiStore';
import { useGlobalStore } from '@/stores/globalStore';

export function ResourceMonitor() {
    const showWarning = useUIStore(s => s.showWarning);
    const setDegradedMode = useUIStore(s => s.setDegradedMode); // Asumiendo que existe
    const photosCount = useGlobalStore(s => s.photos.size);

    useEffect(() => {
        // Intervalo de monitoreo más largo (cada 15 segundos) para reducir overhead
        const interval = setInterval(() => {
            const status = resourceManager.getStatus();

            // Solo activar modo degradado en casos extremos (más de 5000 fotos)
            // La paginación ya maneja la visualización eficientemente
            if (photosCount > 5000) {
                setDegradedMode(true);
                // Advertencia silenciosa, solo en consola
                console.warn(`⚠️ Sistema con ${photosCount} fotos. Modo degradado activado.`);
            }

            // Si la memoria es crítica Y hay muchas fotos, activar modo degradado
            if (status.memoryStatus === 'critical' && photosCount > 3000) {
                setDegradedMode(true);
                console.warn('⚠️ Memoria crítica con alta carga de fotos. Modo degradado activado.');
            }

        }, 15000); // Aumentado de 5s a 15s

        return () => clearInterval(interval);
    }, [showWarning, setDegradedMode, photosCount]);

    return null; // Componente invisible
}
