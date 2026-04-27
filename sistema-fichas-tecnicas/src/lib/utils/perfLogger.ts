/**
 * perfLogger.ts — logging estructurado con timings y categorías.
 *
 * Categorías oficiales:
 *   [PERF]    tiempo de operación con métricas
 *   [CACHE]   hit/miss/set con key
 *   [MISSING] archivo marcado como inexistente — no se reintentará
 *   [NET]     red: retry, timeout, reconexión
 *   [ERROR]   errores reales del negocio
 *   [INFO]    informativo general
 *
 * Estilo:  [CATEGORIA] op=<op> key=value metric=X ...
 */

type Fields = Record<string, string | number | boolean | undefined>;

function serialize(fields: Fields): string {
    return Object.entries(fields)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(' ');
}

export const perf = {
    /** Comienza a medir una operación. Retorna una función que al llamarla emite el log con duración. */
    start(op: string) {
        const t0 = performance.now();
        return (fields: Fields = {}) => {
            const took = Math.round(performance.now() - t0);
            console.log(`[PERF] op=${op} took=${took}ms ${serialize(fields)}`);
            return took;
        };
    },
    cache: {
        hit: (key: string) => console.log(`[CACHE] hit key=${key}`),
        miss: (key: string) => console.log(`[CACHE] miss key=${key}`),
        set: (key: string, size?: number) =>
            console.log(`[CACHE] set key=${key}${size ? ` size=${size}` : ''}`),
        evict: (n: number) => console.log(`[CACHE] evict n=${n}`),
    },
    missing: (key: string, reason = 'not_found_in_drive') =>
        console.log(`[MISSING] key=${key} reason=${reason}`),
    net: {
        retry: (op: string, attempt: number, max: number, key?: string) =>
            console.log(`[NET] retry op=${op} attempt=${attempt}/${max}${key ? ` key=${key}` : ''}`),
        wait: () => console.log(`[NET] waiting_connectivity`),
        restored: () => console.log(`[NET] connectivity_restored`),
    },
    error: (op: string, fields: Fields) =>
        console.warn(`[ERROR] op=${op} ${serialize(fields)}`),
    info: (msg: string, fields: Fields = {}) =>
        console.log(`[INFO] ${msg} ${serialize(fields)}`),
};
