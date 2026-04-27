/**
 * connectivity.ts — detección y espera de conectividad real.
 * Mismo módulo que catastro-ut-star-app/src/utils/connectivity.ts.
 */

const PING_URL = "https://www.gstatic.com/generate_204";
const PING_TIMEOUT_MS = 4_000;
const PING_INTERVALS_MS = [2000, 4000, 8000, 15000, 30000];

export type ConnectivityCallback = (status: "lost" | "waiting" | "restored", attempt?: number) => void;

export async function pingConnectivity(): Promise<boolean> {
    try {
        await fetch(PING_URL, {
            method: "HEAD",
            mode: "no-cors",
            cache: "no-store",
            signal: AbortSignal.timeout(PING_TIMEOUT_MS),
        });
        return true;
    } catch {
        return false;
    }
}

export async function waitForConnectivity(
    onStatus?: ConnectivityCallback,
    abortSignal?: AbortSignal
): Promise<void> {
    if (navigator.onLine && (await pingConnectivity())) return;
    onStatus?.("lost");
    let attempt = 0;
    while (true) {
        if (abortSignal?.aborted) throw new Error("Cancelado");
        const interval = PING_INTERVALS_MS[Math.min(attempt, PING_INTERVALS_MS.length - 1)];
        onStatus?.("waiting", attempt + 1);
        await Promise.race([
            new Promise<void>((r) => setTimeout(r, interval)),
            new Promise<void>((r) => {
                const h = () => { window.removeEventListener("online", h); r(); };
                window.addEventListener("online", h);
            }),
        ]);
        if (abortSignal?.aborted) throw new Error("Cancelado");
        if (await pingConnectivity()) { onStatus?.("restored"); return; }
        attempt++;
    }
}

export async function withConnectivityRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 10,
    onStatus?: ConnectivityCallback,
    abortSignal?: AbortSignal
): Promise<T> {
    const PERMANENT = ["unauthenticated", "not-found", "invalid-argument", "permission-denied"];
    let networkRetries = 0;
    while (true) {
        if (abortSignal?.aborted) throw new Error("Cancelado");
        try {
            return await fn();
        } catch (err: any) {
            const msg = String(err?.message || err?.code || err || "").toLowerCase();
            if (PERMANENT.some((e) => msg.includes(e))) throw err;
            const isNetwork = msg.includes("network") || msg.includes("fetch") ||
                msg.includes("failed to fetch") || msg.includes("quic") ||
                msg.includes("timeout") || msg.includes("abort") || !navigator.onLine;
            if (isNetwork && networkRetries < maxRetries) {
                networkRetries++;
                await waitForConnectivity(onStatus, abortSignal);
                continue;
            }
            throw err;
        }
    }
}
