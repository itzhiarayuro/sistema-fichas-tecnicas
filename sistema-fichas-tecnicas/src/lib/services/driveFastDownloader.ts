'use client';

/**
 * driveFastDownloader.ts
 *
 * Descarga fotos de Drive en lotes usando la Cloud Function fetchDrivePhotoByIds.
 * Evita GAS por completo para fotos que tienen driveId persistido.
 *
 * Mejoras v2:
 *   - Pre-filtro con photoCache.isMissing(): no pide fotos ya marcadas como 404
 *   - Queue dinámica (PhotoQueue) en lugar de chunks fijos
 *   - Concurrencia 4 lotes paralelos × batch 20 = 80 driveIds en vuelo
 *   - No reintentar errores permanentes (not-found, unauth)
 *   - Logging estructurado (PERF/CACHE/MISSING/NET)
 *   - Mantiene contrato: mismo export fetchPhotosByDriveIds(ids, onProgress)
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/services/firebaseClient';
import { withConnectivityRetry, ConnectivityCallback } from '@/lib/utils/connectivity';
import { PhotoQueue } from '@/lib/services/photoQueue';
import { photoCache } from '@/lib/services/photoCache';
import { perf } from '@/lib/utils/perfLogger';

export type DriveBatchResult = Record<string, string | null>;

export interface DownloadProgress {
    done: number;
    total: number;
    failed: number;
    skipped?: number;           // marcadas como missing y saltadas
    waitingNetwork?: boolean;
}

const BATCH_SIZE = 20;              // coincide con MAX_BATCH del backend
const BATCH_CONCURRENCY = 4;        // nº de lotes simultáneos
const CALLABLE_TIMEOUT_MS = 120_000;

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

/**
 * Descarga fotos por driveId en lotes, con queue dinámica y pre-filtro de missing.
 * Nunca lanza — devuelve null para los que fallen.
 */
export async function fetchPhotosByDriveIds(
    driveIds: string[],
    onProgress?: (p: DownloadProgress) => void
): Promise<DriveBatchResult> {
    await photoCache.init();
    const done_hydrate = perf.start('drive_batch.total');

    const uniqueIds = Array.from(new Set(driveIds.filter(Boolean)));
    if (uniqueIds.length === 0) return {};

    // Pre-filtro: saltar los que ya sabemos que no existen
    const skipped: string[] = [];
    const toFetch: string[] = [];
    for (const id of uniqueIds) {
        if (photoCache.isMissing(id)) skipped.push(id);
        else toFetch.push(id);
    }

    const result: DriveBatchResult = {};
    for (const id of skipped) result[id] = null;

    if (toFetch.length === 0) {
        onProgress?.({ done: skipped.length, total: uniqueIds.length, failed: 0, skipped: skipped.length });
        done_hydrate({ n: uniqueIds.length, skipped: skipped.length, fetched: 0 });
        return result;
    }

    const functions = getFunctions(app);
    const fetchBatch = httpsCallable(functions, 'fetchDrivePhotoByIds', {
        timeout: CALLABLE_TIMEOUT_MS,
    });

    let done = skipped.length;
    let failed = 0;
    let netWaiting = false;

    const emit = () =>
        onProgress?.({
            done,
            total: uniqueIds.length,
            failed,
            skipped: skipped.length,
            waitingNetwork: netWaiting,
        });

    const onConn: ConnectivityCallback = (status) => {
        netWaiting = status !== 'restored';
        emit();
        if (status === 'lost' || status === 'waiting') perf.net.wait();
        if (status === 'restored') perf.net.restored();
    };

    // Cada lote es una Promise independiente — PhotoQueue los orquesta
    const queue = new PhotoQueue({ concurrency: BATCH_CONCURRENCY });
    const lotes = chunk(toFetch, BATCH_SIZE);

    await Promise.all(
        lotes.map((lote, idx) =>
            queue.enqueue(`lote#${idx}`, async () => {
                const doneLote = perf.start('drive_batch.lote');
                try {
                    const data = await withConnectivityRetry(
                        async () => {
                            const res = await fetchBatch({ driveIds: lote });
                            return (res.data || {}) as DriveBatchResult;
                        },
                        10,
                        onConn
                    );
                    let lotOk = 0, lotFail = 0;
                    for (const id of lote) {
                        const v = data[id];
                        if (v) {
                            result[id] = v;
                            lotOk++;
                        } else {
                            result[id] = null;
                            failed++;
                            lotFail++;
                            // Marca como missing para no reintentar nunca más
                            photoCache.markMissing(id, 'drive_api_null');
                        }
                    }
                    done += lote.length;
                    emit();
                    doneLote({ n: lote.length, ok: lotOk, fail: lotFail });
                } catch (err: any) {
                    const msg = String(err?.message || err?.code || '').toLowerCase();
                    const isPermanent =
                        msg.includes('not-found') ||
                        msg.includes('unauthenticated') ||
                        msg.includes('invalid-argument') ||
                        msg.includes('permission-denied');
                    for (const id of lote) {
                        result[id] = null;
                        failed++;
                        if (isPermanent) photoCache.markMissing(id, `permanent:${msg.slice(0, 30)}`);
                    }
                    done += lote.length;
                    emit();
                    doneLote({ n: lote.length, error: msg.slice(0, 60) });
                    perf.error('drive_batch', { error: msg.slice(0, 100) });
                }
                return true;
            })
        )
    );

    done_hydrate({
        n: uniqueIds.length,
        skipped: skipped.length,
        fetched: toFetch.length,
        failed,
    });
    return result;
}
