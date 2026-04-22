/**
 * robustDrivePhotoDownloader.ts
 *
 * Descargador tolerante a fallos para fotos servidas por Google Apps Script.
 *
 * Características:
 *   - Timeout generoso por intento (60s) — GAS es lento pero usualmente responde
 *   - Reintentos con backoff exponencial (3 intentos: 0s, 2s, 6s)
 *   - Concurrencia configurable (por defecto 2) para no saturar GAS
 *   - Cache por filename: si una descarga ya fue exitosa en esta sesión, se reutiliza
 *   - Cancelable: acepta un AbortSignal externo para cancelar el lote completo
 *   - Reporte de progreso granular (total, ok, fallidas, intento actual)
 *
 * USO BÁSICO:
 *   const downloader = new RobustDrivePhotoDownloader({
 *     gasUrl: process.env.NEXT_PUBLIC_GAS_URL!,
 *     token: process.env.NEXT_PUBLIC_SECRET_TOKEN!,
 *   });
 *
 *   const results = await downloader.downloadBatch(
 *     [{ filename: 'PZ29-P.JPG', driveId: '1abc' }, ...],
 *     {
 *       onProgress: ({ completed, total, ok, failed, current }) => {
 *         console.log(`${completed}/${total} — ok:${ok} fail:${failed} actual:${current}`);
 *       },
 *     }
 *   );
 *
 *   // results es un Map<filename, dataUrl | null>
 */

export interface PhotoRequest {
  filename: string;
  driveId?: string;
}

export interface DownloaderConfig {
  gasUrl: string;
  token: string;
  concurrency?: number;       // default 2
  maxRetries?: number;        // default 3
  timeoutMs?: number;         // default 60000 (60s por intento)
  backoffBaseMs?: number;     // default 2000 (2s, luego 6s, luego 18s...)
}

export interface BatchProgress {
  completed: number;   // fotos terminadas (ok + failed)
  total: number;
  ok: number;
  failed: number;
  current: string;     // filename en curso
  attempt?: number;    // número de intento actual (1..maxRetries)
}

export interface BatchOptions {
  onProgress?: (p: BatchProgress) => void;
  signal?: AbortSignal;  // cancela el lote completo
}

export interface PhotoResult {
  filename: string;
  dataUrl: string | null;
  error?: string;
  attempts: number;
}

export class RobustDrivePhotoDownloader {
  private gasUrl: string;
  private token: string;
  private concurrency: number;
  private maxRetries: number;
  private timeoutMs: number;
  private backoffBaseMs: number;
  private cache = new Map<string, string>();

  constructor(config: DownloaderConfig) {
    if (!config.gasUrl) throw new Error('gasUrl es obligatorio');
    if (!config.token)  throw new Error('token es obligatorio');
    this.gasUrl        = config.gasUrl;
    this.token         = config.token;
    this.concurrency   = config.concurrency   ?? 2;
    this.maxRetries    = config.maxRetries    ?? 3;
    this.timeoutMs     = config.timeoutMs     ?? 60000;
    this.backoffBaseMs = config.backoffBaseMs ?? 2000;
  }

  /** Limpia el cache en memoria (útil si quieres forzar re-descargas). */
  clearCache() { this.cache.clear(); }

  /** Descarga una sola foto con retries. null si tras todos los intentos falló. */
  async downloadOne(req: PhotoRequest, externalSignal?: AbortSignal): Promise<PhotoResult> {
    if (this.cache.has(req.filename)) {
      return { filename: req.filename, dataUrl: this.cache.get(req.filename)!, attempts: 0 };
    }

    let lastError = '';
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      if (externalSignal?.aborted) {
        return { filename: req.filename, dataUrl: null, error: 'cancelado', attempts: attempt - 1 };
      }

      try {
        const dataUrl = await this.fetchOnce(req, externalSignal);
        if (dataUrl) {
          this.cache.set(req.filename, dataUrl);
          return { filename: req.filename, dataUrl, attempts: attempt };
        }
        lastError = 'GAS respondió sin base64';
      } catch (err: any) {
        lastError = err?.message || String(err);
        if (lastError.includes('cancelado') || externalSignal?.aborted) {
          return { filename: req.filename, dataUrl: null, error: 'cancelado', attempts: attempt };
        }
      }

      // Backoff antes del siguiente intento (no en el último)
      if (attempt < this.maxRetries) {
        const wait = this.backoffBaseMs * Math.pow(3, attempt - 1); // 2s, 6s, 18s
        await this.sleep(wait, externalSignal);
      }
    }

    return { filename: req.filename, dataUrl: null, error: lastError, attempts: this.maxRetries };
  }

  /** Descarga un lote con concurrencia limitada. Garantiza orden estable en el Map. */
  async downloadBatch(requests: PhotoRequest[], opts: BatchOptions = {}): Promise<Map<string, PhotoResult>> {
    const results = new Map<string, PhotoResult>();
    const total = requests.length;
    let completed = 0, ok = 0, failed = 0;

    // Un worker toma tareas de la cola hasta que se vacía
    const queue = [...requests];
    const worker = async () => {
      while (queue.length > 0) {
        if (opts.signal?.aborted) return;
        const req = queue.shift();
        if (!req) return;

        // Progreso: iniciando esta foto
        opts.onProgress?.({ completed, total, ok, failed, current: req.filename, attempt: 1 });

        const result = await this.downloadOne(req, opts.signal);
        results.set(req.filename, result);
        completed++;
        if (result.dataUrl) ok++; else failed++;

        opts.onProgress?.({ completed, total, ok, failed, current: req.filename });
      }
    };

    const workers = Array.from({ length: Math.min(this.concurrency, total) }, () => worker());
    await Promise.all(workers);

    return results;
  }

  // ──────── privados ────────

  private async fetchOnce(req: PhotoRequest, externalSignal?: AbortSignal): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    // Combinar signal externo + timeout interno
    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener('abort', onExternalAbort);

    try {
      const payload: any = { token: this.token, action: 'download', filename: req.filename };
      if (req.driveId) payload.fileId = req.driveId;

      const response = await fetch(this.gasUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success || !data.base64) {
        throw new Error(data.error || 'GAS success=false');
      }

      let base64 = data.base64 as string;
      const idx = base64.indexOf('base64,');
      if (idx !== -1) base64 = base64.substring(idx + 7);
      return `data:${data.mimeType || 'image/jpeg'};base64,${base64}`;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        if (externalSignal?.aborted) throw new Error('cancelado');
        throw new Error(`timeout ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) { reject(new Error('cancelado')); return; }
      const t = setTimeout(resolve, ms);
      signal?.addEventListener('abort', () => { clearTimeout(t); reject(new Error('cancelado')); });
    });
  }
}

/** Helper: convierte dataUrl a Blob. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(';base64,');
  const contentType = header.split(':')[1];
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return new Blob([arr], { type: contentType });
}
