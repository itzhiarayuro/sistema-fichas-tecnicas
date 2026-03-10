'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, Key } from 'lucide-react';

export function FirebaseSetupBanner() {
    const [status, setStatus] = useState<{ adminKey: boolean, publicConfig: boolean, allReady: boolean } | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        fetch('/api/health')
            .then(res => res.json())
            .then(data => setStatus(data))
            .catch(err => console.error('Error checking health', err));
    }, []);

    if (dismissed || (status && status.allReady)) return null;

    return (
        <div className="mb-6 animate-in slide-in-from-top-4 duration-500">
            <div className={`rounded-2xl border p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 transition-all ${!status?.adminKey
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${!status?.adminKey ? 'bg-amber-100' : 'bg-emerald-100'
                        }`}>
                        {!status?.adminKey ? (
                            <AlertCircle className="w-6 h-6 text-amber-600" />
                        ) : (
                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        )}
                    </div>
                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-tight">
                            {!status?.adminKey ? 'Configuración Pendiente' : 'Firebase Conectado'}
                        </h4>
                        <p className="text-sm opacity-80 leading-snug">
                            {!status?.adminKey
                                ? 'Falta la Clave Maestra (JSON) para que el generador de PDF pueda leer los datos de Catastro.'
                                : 'Todo listo. El sistema puede leer y escribir datos en tiempo real.'
                            }
                        </p>
                    </div>
                </div>

                {!status?.adminKey && (
                    <div className="flex items-center gap-2">
                        <a
                            href="https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95"
                        >
                            <Key className="w-4 h-4" />
                            Generar JSON
                        </a>
                        <button
                            onClick={() => setDismissed(true)}
                            className="px-3 py-2 text-amber-700 hover:bg-amber-100 rounded-xl text-sm"
                        >
                            Omitir
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
