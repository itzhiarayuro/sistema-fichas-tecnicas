/**
 * Editor Redirect Page
 * Maneja la redirección cuando el usuario accede a /editor directamente
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EditorRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirigir a la lista de pozos para seleccionar uno
        router.replace('/pozos');
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Redirigiendo a la lista de pozos...</p>
            </div>
        </div>
    );
}
