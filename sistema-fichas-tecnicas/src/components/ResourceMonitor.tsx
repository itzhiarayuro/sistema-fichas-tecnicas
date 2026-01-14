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
        // Intervalo de monitoreo (cada 5 segundos)
        const interval = setInterval(() => {
            const status = resourceManager.getStatus();

            // Si la memoria es crítica, activar modo degradado
            if (status.memoryStatus === 'critical') {
                setDegradedMode(true);
                showWarning('Sistema bajo carga extrema. Activando modo de ahorro de recursos.');
            }

            // Monitorear límites de visualización
            if (photosCount > 2000) {
                setDegradedMode(true);
            }

        }, 5000);

        return () => clearInterval(interval);
    }, [showWarning, setDegradedMode, photosCount]);

    return null; // Componente invisible
}
