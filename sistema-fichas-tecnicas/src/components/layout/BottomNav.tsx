'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/constants/navigation';
import { useGlobalStore } from '@/stores';

/**
 * BottomNav - Navegación inferior para dispositivos móviles
 * Aparece solo en pantallas menores a 768px
 */
export function BottomNav() {
    const pathname = usePathname();
    const currentStep = useGlobalStore((state) => state.currentStep);
    const guidedMode = useGlobalStore((state) => state.config.guidedMode);

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 tablet:hidden flex items-center justify-around h-16 px-2 safe-area-bottom shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            {navItems.map((item) => {
                const isActive = pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href));

                // El diseñador lo ocultamos en móvil para ahorrar espacio si hay muchos items
                if (item.href === '/designer') return null;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive ? 'text-primary font-medium' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span className="text-xl leading-none">{item.icon}</span>
                        <span className="text-[10px] uppercase tracking-wider">{item.label}</span>

                        {/* Indicador de activo */}
                        {isActive && (
                            <div className="absolute bottom-0 w-8 h-1 bg-primary rounded-t-full" />
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}
