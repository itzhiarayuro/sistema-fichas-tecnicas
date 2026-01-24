
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PDFMakeGenerator } from '../pdfMakeGenerator';
import { Pozo } from '@/types/pozo';
import { FichaState } from '@/types/ficha';

// Mock pdfmake
const mockCreatePdf = vi.fn();
vi.mock('pdfmake/build/pdfmake', () => ({
    default: {
        vfs: {},
        createPdf: (...args: any[]) => {
            mockCreatePdf(...args);
            return {
                getBlob: (cb: any) => cb(new Blob(['test-pdf-content'], { type: 'application/pdf' })),
                getBuffer: (cb: any) => cb(Buffer.from('test-pdf-content'))
            };
        }
    }
}));

// Mock vfs_fonts
vi.mock('pdfmake/build/vfs_fonts', () => ({
    pdfMake: { vfs: { 'Roboto-Regular.ttf': 'Base64FontContent' } },
    vfs: { 'Roboto-Regular.ttf': 'Base64FontContent' }
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));

// Mock blobStore
vi.mock('@/lib/storage/blobStore', () => ({
    blobStore: {
        getUrl: (id: string) => `blob:http://localhost:3000/${id}`
    }
}));

describe('PDFMakeGenerator Robustness', () => {
    let generator: PDFMakeGenerator;

    // Test data
    const mockPozo: Partial<Pozo> = {
        id: 'pozo-123',
        identificacion: {
            idPozo: { value: 'M680' }
        } as any,
        fotos: { fotos: [] }
    };

    const mockFicha: Partial<FichaState> = {
        sections: [],
        customizations: {} as any
    };

    beforeEach(() => {
        vi.clearAllMocks();
        generator = new PDFMakeGenerator();
    });

    it('should initialize VFS on construction', () => {
        // Just verify it doesn't throw
        expect(generator).toBeDefined();
    });

    it('should handle null/undefined inputs gracefully', async () => {
        const result = await generator.generatePDF(null as any, null as any);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Datos de ficha o pozo inválidos');
    });

    it('should generate PDF successfully with minimal valid data', async () => {
        const result = await generator.generatePDF(mockFicha as any, mockPozo as any);
        expect(result.success).toBe(true);
        expect(result.blob).toBeDefined();
    });

    it('should NOT crash even if buildContent fails (simulated)', async () => {
        // Force an error in buildContent using a broken section
        const brokenFicha = {
            sections: [{
                type: 'identificacion',
                visible: true,
                // @ts-ignore
                content: { get invalid() { throw new Error('Simulated Build Failure'); } }
            }]
        };

        // Note: buildContent error is caught in generatePDF catch block?
        // Actually generatePDF awaits buildContent. If buildContent throws, generatePDF catches it.

        const result = await generator.generatePDF(brokenFicha as any, mockPozo as any);
        expect(result.success).toBe(false);
        // Expect robust error message
        expect(result.error).toBeDefined();
    });

    it('should handle blob URLs on server side safely', async () => {
        // Mock server side environment
        const originalWindow = global.window;
        // @ts-ignore
        delete global.window;

        const pozoWithBlob = {
            ...mockPozo,
            fotos: {
                fotos: [
                    {
                        id: 'f1',
                        blobId: 'blob-1',
                        tipo: 'TAPA',
                        categoria: 'PRINCIPAL'
                    }
                ]
            }
        };

        // Run generation
        const result = await generator.generatePDF(mockFicha as any, pozoWithBlob as any);

        // Should succeed (ignoring image) not crash
        expect(result.success).toBe(true);

        // Restore window
        global.window = originalWindow;
    });
});
