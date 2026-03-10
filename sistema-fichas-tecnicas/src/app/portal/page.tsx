'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/services/firebaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ADMINS = ['juanvegas003@gmail.com', 'juan.vega.icya@gmail.com'];

export default function PortalPage() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            if (!u) {
                router.push('/login');
            } else if (!ADMINS.includes(u.email || '')) {
                window.location.href = '/registro/index.html';
            } else {
                setUser(u);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/login');
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#020617] p-8 flex flex-col items-center justify-center font-sans overflow-hidden">
            {/* Background patterns */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 w-full max-w-4xl">
                <div className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                            <img src="/logo-ut-star.png" alt="UT STAR" className="w-8 h-8 object-contain" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 font-medium">Panel de Administración</p>
                            <h1 className="text-xl font-bold text-white leading-none mt-1">Hola, {user.email?.split('@')[0]}</h1>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition"
                    >
                        Cerrar Sesión
                    </button>
                </div>

                <h2 className="text-4xl md:text-5xl font-extrabold text-white text-center mb-2 tracking-tight">
                    Elige tu Herramienta
                </h2>
                <p className="text-slate-400 text-center mb-12 max-w-lg mx-auto">
                    Gestiona el catastro de alcantarillado desde la toma de datos hasta la generación de fichas técnicas finales.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
                    {/* Fichas Técnicas */}
                    <Link
                        href="/fichas"
                        className="group relative h-72 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 flex flex-col justify-between hover:border-blue-500/50 hover:bg-slate-800/80 transition-all duration-500 overflow-hidden shadow-2xl"
                    >
                        <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-blue-600/5 blur-[60px] group-hover:bg-blue-600/15 transition-all duration-1000" />

                        <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30 group-hover:scale-110 transition-transform duration-500">
                            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>

                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Sistema de Fichas</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Generación masiva de PDFs, normalización de datos y diseño técnico final para pozos de inspección.
                            </p>
                        </div>

                        <div className="flex items-center text-blue-400 text-sm font-bold opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-500">
                            INGRESAR AHORA
                            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </div>
                    </Link>

                    {/* Registro de Campo */}
                    <Link
                        href="/registro/index.html"
                        className="group relative h-72 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 flex flex-col justify-between hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all duration-500 overflow-hidden shadow-2xl"
                    >
                        <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-emerald-600/5 blur-[60px] group-hover:bg-emerald-600/15 transition-all duration-1000" />

                        <div className="w-14 h-14 bg-emerald-600/20 rounded-2xl flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform duration-500">
                            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>

                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">App de Registro</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Captura de datos en campo, fotos GPS, marcación de pozos y sincronización offline/online en tiempo real.
                            </p>
                        </div>

                        <div className="flex items-center text-emerald-400 text-sm font-bold opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-500">
                            ABRIR REGISTRO
                            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
