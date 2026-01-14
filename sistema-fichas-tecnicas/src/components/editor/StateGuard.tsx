/**
 * StateGuard - Guardian de integridad de la UI
 * 
 * Previene crashes y pantallas blancas validando el estado antes del renderizado.
 */

'use client';

import React from 'react';
import { isStateValid } from '@/lib/state/integrity';
import type { FichaState } from '@/types/ficha';

interface StateGuardProps {
    state: FichaState | null | undefined;
    children: React.ReactNode;
    onReset?: () => void;
}

export function StateGuard({ state, children, onReset }: StateGuardProps) {
    // Si no hay estado aún, mostramos cargando o nada (el useEffect lo arreglará)
    if (!state) return <>{children}</>;

    // Validación dura de integridad
    if (!isStateValid(state)) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
                <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border border-red-500/30 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-red-100">Estado Corrupto Detectado</h2>
                            <p className="text-red-400 text-sm">Integrity Guard v1.0</p>
                        </div>
                    </div>

                    <p className="text-slate-300 mb-6 text-sm leading-relaxed">
                        Se ha detectado una inconsistencia crítica en los datos de esta ficha. Para prevenir pérdida de información mayor o errores en cascada, el renderizado se ha detenido.
                    </p>

                    <div className="bg-slate-950/50 rounded-lg p-4 mb-8 font-mono text-xs text-slate-400">
                        Error: INVARIANT_VIOLATION_INVALID_STRUCTURE
                        Status: {(state as any).stateStatus || 'unknown'}
                    </div>

                    <button
                        onClick={onReset}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Restablecer Ficha con Seguridad
                    </button>

                    <p className="text-center mt-4 text-xs text-slate-500">
                        Su progreso actual se guardará en un snapshot antes de restablecer.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
