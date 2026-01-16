import { describe, it, expect, vi } from 'vitest';
import { pdfMakeGenerator } from '../pdfMakeGenerator';
import { Pozo } from '@/types/pozo';
import { FichaState } from '@/types/ficha';

// Mock de pdfmake para evitar errores de entorno en Node
vi.mock('pdfmake/build/pdfmake', () => ({
    default: {
        createPdf: vi.fn().mockReturnValue({
            getBlob: (cb: any) => cb(new Blob(['test-pdf-content'], { type: 'application/pdf' }))
        })
    }
}));

// Mock de vfs_fonts
vi.mock('pdfmake/build/vfs_fonts', () => ({
    pdfMake: { vfs: {} }
}));

describe('PDFMakeGenerator Validation', () => {
    const mockPozo: Partial<Pozo> = {
        identificacion: {
            idPozo: { value: 'M680' },
            levanto: { value: 'Juan Perez' },
            fecha: { value: '2024-01-15' },
            estado: { value: 'Bueno' },
            coordenadaX: { value: '123' },
            coordenadaY: { value: '456' }
        },
        ubicacion: {
            direccion: { value: 'Calle 123' },
            barrio: { value: 'Centro' },
            elevacion: { value: '2600' },
            profundidad: { value: '1.5' }
        } as any,
        componentes: {
            existeTapa: { value: 'SI' },
            estadoTapa: { value: 'Bueno' }
        } as any,
        tuberias: { tuberias: [] },
        sumideros: { sumideros: [] },
        fotos: { fotos: [] }
    };

    const mockFicha: Partial<FichaState> = {
        sections: [
            { id: '1', type: 'identificacion', title: 'Identificación', visible: true, order: 1, content: {} },
            { id: '2', type: 'estructura', title: 'Estructura', visible: true, order: 2, content: {} },
            { id: '3', type: 'fotos', title: 'Fotos', visible: true, order: 3, content: {} }
        ] as any,
        customizations: {
            colors: { headerBg: '#1f4e79' }
        } as any
    };

    it('debe generar un blob de PDF correctamente (CP-01)', async () => {
        const result = await pdfMakeGenerator.generatePDF(mockFicha as any, mockPozo as any);

        expect(result.success).toBe(true);
        expect(result.blob).toBeDefined();
        expect(result.filename).toContain('M680');
    });

    it('debe ser robusto ante datos faltantes (CP-02)', async () => {
        // Pozo con datos mínimos/incompletos
        const incompletePozo: any = {
            identificacion: { idPozo: { value: 'MIN-001' } }
        };

        // Debería generar el PDF sin crashear gracias a los guards añadidos
        const result = await pdfMakeGenerator.generatePDF(mockFicha as any, incompletePozo);

        expect(result.success).toBe(true);
        expect(result.blob).toBeDefined();
        expect(result.filename).toContain('MIN-001');
    });

    it('debe manejar secciones sin contenido definido', async () => {
        const emptyFicha: any = {
            sections: [{ type: 'identificacion', visible: true, content: null }],
            customizations: {}
        };

        const result = await pdfMakeGenerator.generatePDF(emptyFicha, mockPozo as any);
        expect(result.success).toBe(true);
    });
});
