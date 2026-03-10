'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/services/firebaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const ADMINS = ['juanvegas003@gmail.com', 'juan.vega.icya@gmail.com'];

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                if (ADMINS.includes(user.email || '')) {
                    router.push('/portal');
                } else {
                    window.location.href = '/registro/index.html';
                }
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (ADMINS.includes(user.email || '')) {
                router.push('/portal');
            } else {
                window.location.href = '/registro/index.html';
            }
        } catch (err: any) {
            setError('Credenciales incorrectas o problema de conexión.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4 font-sans">
            <div className="max-w-md w-full space-y-8 bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                            <img src="/logo-ut-star.png" alt="UT STAR" className="w-14 h-14 object-contain" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">Acceso Unificado</h2>
                    <p className="mt-2 text-sm text-slate-400">UT STAR · Gestión de Alcantarillado</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Correo Electrónico</label>
                            <input
                                type="email"
                                required
                                className="appearance-none block w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="usuario@ejemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
                            <input
                                type="password"
                                required
                                className="appearance-none block w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                'Ingresar al Sistema'
                            )}
                        </button>
                    </div>
                </form>

                <div className="pt-6 border-t border-white/5 text-center">
                    <p className="text-xs text-slate-500">© 2026 UT STAR · Soporte Catastral</p>
                </div>
            </div>
        </div>
    );
}
