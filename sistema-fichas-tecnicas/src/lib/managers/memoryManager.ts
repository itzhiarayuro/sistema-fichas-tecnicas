/**
 * MemoryManager - Gestión inteligente de memoria para cargas masivas
 * Monitorea uso de memoria y ajusta parámetros automáticamente
 */

interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
}

interface MemoryThresholds {
  warning: number; // 70%
  critical: number; // 85%
  emergency: number; // 95%
}

export class MemoryManager {
  private static instance: MemoryManager;
  private thresholds: MemoryThresholds = {
    warning: 0.7,
    critical: 0.85,
    emergency: 0.95
  };

  private callbacks: {
    onWarning?: () => void;
    onCritical?: () => void;
    onEmergency?: () => void;
  } = {};

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Obtiene estadísticas actuales de memoria
   */
  getMemoryStats(): MemoryStats | null {
    if (!('memory' in performance)) {
      console.warn('Performance.memory no disponible en este navegador');
      return null;
    }

    const memory = (performance as any).memory;
    const usagePercentage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage
    };
  }

  /**
   * Verifica si es seguro procesar más archivos
   */
  isSafeToProcess(): boolean {
    const stats = this.getMemoryStats();
    if (!stats) return true; // Si no podemos medir, asumimos que es seguro

    return stats.usagePercentage < this.thresholds.critical;
  }

  /**
   * Calcula el tamaño de lote recomendado basado en memoria disponible
   */
  getRecommendedBatchSize(defaultSize: number = 20): number {
    const stats = this.getMemoryStats();
    if (!stats) return defaultSize;

    if (stats.usagePercentage > this.thresholds.warning) {
      return Math.max(5, Math.floor(defaultSize * 0.5)); // Reducir a la mitad
    }
    
    if (stats.usagePercentage > this.thresholds.critical) {
      return Math.max(2, Math.floor(defaultSize * 0.25)); // Reducir a un cuarto
    }

    return defaultSize;
  }

  /**
   * Calcula el delay recomendado entre lotes
   */
  getRecommendedDelay(defaultDelay: number = 100): number {
    const stats = this.getMemoryStats();
    if (!stats) return defaultDelay;

    if (stats.usagePercentage > this.thresholds.warning) {
      return defaultDelay * 2; // Doble delay
    }
    
    if (stats.usagePercentage > this.thresholds.critical) {
      return defaultDelay * 4; // Cuádruple delay
    }

    return defaultDelay;
  }

  /**
   * Fuerza garbage collection si está disponible
   */
  forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }

  /**
   * Monitorea memoria y ejecuta callbacks según umbrales
   */
  startMonitoring(interval: number = 5000): void {
    const monitor = () => {
      const stats = this.getMemoryStats();
      if (!stats) return;

      if (stats.usagePercentage > this.thresholds.emergency) {
        this.callbacks.onEmergency?.();
        this.forceGarbageCollection();
      } else if (stats.usagePercentage > this.thresholds.critical) {
        this.callbacks.onCritical?.();
      } else if (stats.usagePercentage > this.thresholds.warning) {
        this.callbacks.onWarning?.();
      }
    };

    setInterval(monitor, interval);
  }

  /**
   * Configura callbacks para diferentes niveles de memoria
   */
  setCallbacks(callbacks: {
    onWarning?: () => void;
    onCritical?: () => void;
    onEmergency?: () => void;
  }): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Formatea bytes a formato legible
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Obtiene reporte detallado de memoria
   */
  getMemoryReport(): string {
    const stats = this.getMemoryStats();
    if (!stats) return 'Información de memoria no disponible';

    return `
Memoria utilizada: ${this.formatBytes(stats.usedJSHeapSize)}
Memoria total: ${this.formatBytes(stats.totalJSHeapSize)}
Límite de memoria: ${this.formatBytes(stats.jsHeapSizeLimit)}
Uso: ${(stats.usagePercentage * 100).toFixed(1)}%
Estado: ${this.getMemoryStatus(stats.usagePercentage)}
    `.trim();
  }

  private getMemoryStatus(usage: number): string {
    if (usage > this.thresholds.emergency) return '🔴 CRÍTICO';
    if (usage > this.thresholds.critical) return '🟠 ALTO';
    if (usage > this.thresholds.warning) return '🟡 MODERADO';
    return '🟢 NORMAL';
  }
}

// Instancia singleton
export const memoryManager = MemoryManager.getInstance();