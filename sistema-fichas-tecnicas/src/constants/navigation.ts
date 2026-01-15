import { WorkflowStep } from '@/stores';

export interface NavItem {
    href: string;
    label: string;
    icon: string;
    step: WorkflowStep | null;
    description: string;
}

export const navItems: NavItem[] = [
    {
        href: '/',
        label: 'Inicio',
        icon: '🏠',
        step: null,
        description: 'Dashboard principal'
    },
    {
        href: '/upload',
        label: 'Cargar',
        icon: '📁',
        step: 'upload',
        description: 'Cargar Excel y fotos'
    },
    {
        href: '/pozos',
        label: 'Pozos',
        icon: '🔍',
        step: 'review',
        description: 'Revisar datos cargados'
    },
    {
        href: '/editor',
        label: 'Editor',
        icon: '✏️',
        step: 'edit',
        description: 'Editar fichas técnicas'
    },
    {
        href: '/designer',
        label: 'Diseño',
        icon: '🎨',
        step: null,
        description: 'Diseño visual de formatos'
    },
];
