import pdfMake from 'pdfmake/build/pdfmake';
import { FichaState, FichaSection, FichaCustomization } from '@/types/ficha';
import { Pozo, FotoInfo } from '@/types/pozo';
import { blobStore } from '@/lib/storage/blobStore';
import { logger } from '@/lib/logger';

// Initialize pdfMake fonts
// @ts-ignore
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Configurar VFS y pdfMake de forma que funcione en cliente y servidor
let pdfMakeInstance: any = pdfMake;

if (typeof window !== 'undefined') {
    // Entorno Navegador
    const pdfMakeVFS = (pdfFonts as any).pdfMake?.vfs || (pdfFonts as any).vfs || pdfFonts;
    if (pdfMakeVFS) {
        (pdfMakeInstance as any).vfs = pdfMakeVFS;
    }
} else {
    // Entorno Servidor (Node.js)
    // pdfmake en Node no usa vfs por defecto de la misma forma,
    // pero podemos forzarlo si es necesario o cargar fuentes de disco.
    const pdfMakeVFS = (pdfFonts as any).pdfMake?.vfs || (pdfFonts as any).vfs || pdfFonts;
    if (pdfMakeVFS) {
        (pdfMakeInstance as any).vfs = pdfMakeVFS;
    }
}

import { PDFGeneratorOptions, PDFGenerationResult } from '@/types/pdf';


export class PDFMakeGenerator {
    /**
     * Genera un PDF usando pdfMake para una ficha y pozo
     */
    async generatePDF(
        ficha: FichaState,
        pozo: Pozo,
        options: PDFGeneratorOptions = { pageNumbers: true, includeDate: true, includePhotos: true }
    ): Promise<PDFGenerationResult> {
        logger.info('Iniciando generación de PDF', { pozoId: pozo.id, sections: ficha.sections.length }, 'PDFMakeGenerator');
        try {
            const customization = this.mergeCustomization(ficha.customizations);
            logger.debug('Customización aplicada', customization, 'PDFMakeGenerator');

            // Definir el mapa de fuentes explícitamente para evitar errores de fuentes faltantes.
            // Mapeamos fuentes comunes a Roboto para máxima compatibilidad.
            const fonts = {
                Arial: {
                    normal: 'Roboto-Regular.ttf',
                    bold: 'Roboto-Bold.ttf',
                    italics: 'Roboto-Italic.ttf',
                    bolditalics: 'Roboto-BoldItalic.ttf'
                }
            };

            const docDefinition: any = {
                pageSize: 'A4',
                pageMargins: [40, 60, 40, 60],
                header: (currentPage: number) => {
                    if (currentPage === 1) return null; // No header on first page (custom header used)
                    return {
                        text: 'FICHA TÉCNICA DE POZO DE INSPECCIÓN',
                        alignment: 'center',
                        margin: [0, 20, 0, 0],
                        fontSize: 10,
                        color: '#666666',
                        font: 'Arial'
                    };
                },
                footer: (currentPage: number, pageCount: number) => {
                    const footerItems = [];

                    if (options.includeDate) {
                        const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
                        footerItems.push({ text: date, alignment: 'left', font: 'Arial' });
                    }

                    if (options.pageNumbers) {
                        footerItems.push({ text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', font: 'Arial' });
                    }

                    return {
                        columns: footerItems,
                        margin: [40, 20, 40, 0],
                        fontSize: 8,
                        color: '#999999'
                    };
                },
                content: await this.buildContent(ficha, pozo, customization, options),
                styles: this.buildStyles(customization),
                defaultStyle: {
                    font: 'Arial'
                }
            };

            logger.info('Estructura de documento construida, procediendo a crear PDF blob', null, 'PDFMakeGenerator');

            return new Promise(async (resolve, reject) => {
                try {
                    if (typeof window !== 'undefined') {
                        // Lógica de Cliente (Browser)
                        const pdfDocGenerator = pdfMakeInstance.createPdf(docDefinition, undefined, fonts);
                        logger.debug('Llamando a pdfDocGenerator.getBlob', null, 'PDFMakeGenerator');
                        pdfDocGenerator.getBlob((blob: Blob) => {
                            logger.info('Blob generado exitosamente', { size: blob.size }, 'PDFMakeGenerator');
                            const pozoId = pozo.idPozo?.value ||
                                pozo.identificacion?.idPozo?.value ||
                                pozo.id ||
                                'sin-codigo';
                            const filename = `${pozoId}.pdf`;
                            resolve({ success: true, blob, filename });
                        });
                    } else {
                        // Lógica de Servidor (Node.js)
                        // En el servidor, pdfmake/build/pdfmake puede fallar si intenta usar el DOM.
                        // Usamos una aproximación segura para Next.js Server Components/API Routes.
                        try {
                            const pdfDocGenerator = pdfMakeInstance.createPdf(docDefinition, undefined, fonts);

                            // En Node, getBlob puede no estar disponible o requerir un callback síncrono
                            // Simulamos el comportamiento para mantener la interfaz.
                            pdfDocGenerator.getBuffer((buffer: Buffer) => {
                                const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
                                const pozoId = pozo.idPozo?.value ||
                                    pozo.identificacion?.idPozo?.value ||
                                    pozo.id ||
                                    'sin-codigo';
                                const filename = `${pozoId}.pdf`;
                                resolve({ success: true, blob, filename });
                            });
                        } catch (nodeErr) {
                            logger.error('Error específico de pdfMake en Node', nodeErr, 'PDFMakeGenerator');
                            console.error('Error específico de pdfMake en Node:', nodeErr);
                            // Fallback extremo o error controlado
                            throw nodeErr;
                        }
                    }
                } catch (err) {
                    logger.error('Error durante la ejecución de pdfMake', err, 'PDFMakeGenerator');
                    console.error('Error within pdfMake execution:', err);
                    resolve({
                        success: false,
                        error: err instanceof Error ? err.message : 'Error interno en pdfMake'
                    });
                }
            });
        } catch (error) {
            logger.error('Error fatal detectado en generatePDF', error, 'PDFMakeGenerator');
            console.error('Error generating PDF with pdfMake:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error desconocido al generar PDF'
            };
        }
    }

    private mergeCustomization(custom?: FichaCustomization): FichaCustomization {
        const defaultCust: FichaCustomization = {
            colors: {
                headerBg: '#1F4E79',
                headerText: '#FFFFFF',
                sectionBg: '#F5F5F5',
                sectionText: '#333333',
                labelText: '#666666',
                valueText: '#000000',
                borderColor: '#CCCCCC',
            },
            fonts: {
                titleSize: 14,
                labelSize: 9,
                valueSize: 10,
                fontFamily: 'Roboto', // Default to Roboto for pdfMake
            },
            spacing: {
                sectionGap: 8,
                fieldGap: 4,
                padding: 5,
                margin: 15,
            },
            template: 'default',
            isGlobal: true,
        };

        if (!custom) return defaultCust;

        return {
            ...defaultCust,
            ...custom,
            colors: { ...defaultCust.colors, ...custom.colors },
            fonts: { ...defaultCust.fonts, ...custom.fonts },
            spacing: { ...defaultCust.spacing, ...custom.spacing },
        };
    }

    private buildStyles(customization: FichaCustomization) {
        return {
            header: {
                fontSize: customization.fonts.titleSize,
                bold: true,
                color: customization.colors.headerText,
            },
            sectionHeader: {
                fontSize: customization.fonts.labelSize + 2,
                bold: true,
                color: customization.colors.sectionText,
                fillColor: customization.colors.sectionBg,
                margin: [0, 10, 0, 5],
            },
            label: {
                fontSize: customization.fonts.labelSize,
                color: customization.colors.labelText,
                bold: true,
            },
            value: {
                fontSize: customization.fonts.valueSize,
                color: customization.colors.valueText,
            },
            tableHeader: {
                bold: true,
                fontSize: customization.fonts.labelSize,
                color: customization.colors.sectionText,
                fillColor: customization.colors.sectionBg,
            }
        };
    }

    private async buildContent(
        ficha: FichaState,
        pozo: Pozo,
        customization: FichaCustomization,
        options: PDFGeneratorOptions
    ): Promise<any[]> {
        const content: any[] = [];

        // Title Row (Header)
        content.push({
            table: {
                widths: ['*'],
                body: [
                    [
                        {
                            stack: [
                                { text: 'FICHA TÉCNICA DE POZO DE INSPECCIÓN', style: 'header', alignment: 'center' },
                                {
                                    text: `Pozo: ${pozo.idPozo?.value || pozo.identificacion?.idPozo?.value || 'N/A'}`,
                                    alignment: 'center',
                                    color: customization.colors.headerText
                                }
                            ],
                            fillColor: customization.colors.headerBg,
                            border: [false, false, false, false],
                            margin: [0, 10, 0, 10]
                        }
                    ]
                ]
            },
            margin: [0, 0, 0, 10]
        });

        // Sections
        for (const section of ficha.sections) {
            if (!section.visible) continue;

            switch (section.type) {
                case 'identificacion':
                    content.push(this.buildGenericSection(section, pozo, 'IDENTIFICACIÓN Y UBICACIÓN', customization));
                    break;
                case 'estructura':
                    content.push(this.buildEstructuraSection(section, pozo, customization));
                    break;
                case 'tuberias':
                    content.push(this.buildTuberiasSection(pozo, customization));
                    break;
                case 'sumideros':
                    content.push(this.buildSumiderosSection(pozo, customization));
                    break;
                case 'fotos':
                    if (options.includePhotos) {
                        try {
                            const fotosContent = await this.buildFotosSection(pozo, customization);
                            if (fotosContent) content.push(fotosContent);
                        } catch (e) {
                            logger.warn('Error al añadir sección de fotos al PDF', e, 'PDFMakeGenerator');
                            console.error('Error adding fotos section to PDF:', e);
                        }
                    }
                    break;
                case 'observaciones':
                    content.push(this.buildObservacionesSection(section, pozo, customization));
                    break;
            }
        }

        logger.debug('Contenido del PDF (buildContent) completado', { totalSecciones: content.length }, 'PDFMakeGenerator');
        return content;
    }

    private buildSectionHeader(title: string, customization: FichaCustomization) {
        return {
            table: {
                widths: ['*'],
                body: [
                    [{ text: title, style: 'sectionHeader', margin: [5, 2, 0, 2], border: [false, false, false, false] }]
                ]
            },
            layout: 'noBorders',
            margin: [0, 5, 0, 5]
        };
    }

    private buildGenericSection(section: FichaSection, pozo: Pozo, title: string, customization: FichaCustomization) {
        const rows = [];
        rows.push(this.buildSectionHeader(title, customization));

        // Simplified: create a 2-column grid for fields
        const fields = section.content ? Object.entries(section.content) : [];
        const fieldRows = [];
        for (let i = 0; i < fields.length; i += 2) {
            const f1 = fields[i];
            const f2 = fields[i + 1];

            const row = [];
            const val1 = f1[1] ? (f1[1] as any).value : '-';
            row.push(this.buildField(f1[0] || 'Campo', val1));

            if (f2) {
                const val2 = f2[1] ? (f2[1] as any).value : '-';
                row.push(this.buildField(f2[0] || 'Campo', val2));
            } else {
                row.push({ text: '' });
            }
            fieldRows.push(row);
        }

        if (fieldRows.length > 0) {
            rows.push({
                table: {
                    widths: ['*', '*'],
                    body: fieldRows
                },
                layout: 'noBorders'
            });
        } else {
            rows.push({ text: 'No hay datos registrados en esta sección', style: 'value', margin: [5, 2, 0, 2] });
        }

        return { stack: rows };
    }

    private buildField(label: string, value: string) {
        return {
            text: [
                { text: `${label}: `, style: 'label' },
                { text: String(value || '-'), style: 'value' }
            ],
            margin: [0, 2, 0, 2]
        };
    }

    private buildEstructuraSection(section: FichaSection, pozo: Pozo, customization: FichaCustomization) {
        const content = [];
        content.push(this.buildSectionHeader('CARACTERÍSTICAS DE LA ESTRUCTURA', customization));

        // Components layout
        const comp = pozo.componentes || {};
        const body = [
            [
                this.buildField('Existe Tapa', pozo.existeTapa?.value || comp.existeTapa?.value),
                this.buildField('Estado Tapa', pozo.estadoTapa?.value || comp.estadoTapa?.value)
            ],
            [
                this.buildField('Material Tapa', pozo.materialTapa?.value || comp.materialTapa?.value),
                this.buildField('Material Cilindro', pozo.materialCilindro?.value || comp.materialCilindro?.value)
            ],
            [
                this.buildField('Diametro Cilindro', pozo.diametroCilindro?.value || comp.diametroCilindro?.value),
                this.buildField('Estado Cilindro', pozo.estadoCilindro?.value || comp.estadoCilindro?.value)
            ]
        ];

        content.push({
            table: {
                widths: ['*', '*'],
                body
            },
            layout: 'noBorders'
        });

        return { stack: content };
    }

    private buildTuberiasSection(pozo: Pozo, customization: FichaCustomization) {
        const stack = [];
        stack.push(this.buildSectionHeader('TUBERÍAS (ENTRADAS Y SALIDAS)', customization));

        const tuberias = pozo.tuberias?.tuberias || [];
        if (tuberias.length === 0) {
            stack.push({ text: 'Sin tuberías registradas', style: 'value', margin: [0, 5, 0, 5] });
            return { stack };
        }

        const tableBody = [
            [
                { text: 'Ø (mm)', style: 'tableHeader' },
                { text: 'Material', style: 'tableHeader' },
                { text: 'Cota', style: 'tableHeader' },
                { text: 'Estado', style: 'tableHeader' },
                { text: 'Emboq.', style: 'tableHeader' },
                { text: 'Tipo', style: 'tableHeader' }
            ]
        ];

        tuberias.forEach(tub => {
            tableBody.push([
                { text: String(tub.diametro?.value || '-'), style: 'value' },
                { text: String(tub.material?.value || '-'), style: 'value' },
                { text: String(tub.cota?.value || '-'), style: 'value' },
                { text: String(tub.estado?.value || '-'), style: 'value' },
                { text: String(tub.emboquillado?.value || '-'), style: 'value' },
                { text: String(tub.tipoTuberia?.value || '-'), style: 'value' }
            ]);
        });

        stack.push({
            table: {
                headerRows: 1,
                widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
                body: tableBody
            },
            margin: [0, 5, 0, 10]
        });

        return { stack };
    }

    private buildSumiderosSection(pozo: Pozo, customization: FichaCustomization) {
        const stack = [];
        stack.push(this.buildSectionHeader('SUMIDEROS', customization));

        const sumideros = pozo.sumideros?.sumideros || [];
        if (sumideros.length === 0) {
            stack.push({ text: 'Sin sumideros registrados', style: 'value', margin: [0, 5, 0, 5] });
            return { stack };
        }

        const tableBody = [
            [
                { text: 'ID', style: 'tableHeader' },
                { text: 'Tipo', style: 'tableHeader' },
                { text: 'Material', style: 'tableHeader' },
                { text: 'Ø (mm)', style: 'tableHeader' },
                { text: 'H Salida', style: 'tableHeader' }
            ]
        ];

        sumideros.forEach(sum => {
            tableBody.push([
                { text: String(sum.idSumidero?.value || '-'), style: 'value' },
                { text: String(sum.tipoSumidero?.value || '-'), style: 'value' },
                { text: String(sum.materialTuberia?.value || '-'), style: 'value' },
                { text: String(sum.diametro?.value || '-'), style: 'value' },
                { text: String(sum.alturaSalida?.value || '-'), style: 'value' }
            ]);
        });

        stack.push({
            table: {
                headerRows: 1,
                widths: ['auto', '*', '*', '*', '*'],
                body: tableBody
            },
            margin: [0, 5, 0, 10]
        });

        return { stack };
    }

    private async buildFotosSection(pozo: Pozo, customization: FichaCustomization) {
        const stack: any[] = [];
        stack.push(this.buildSectionHeader('REGISTRO FOTOGRÁFICO', customization));

        const allPhotos = pozo.fotos?.fotos || [];
        if (allPhotos.length === 0) {
            stack.push({ text: 'Sin fotografías registradas', style: 'value' });
            return { stack };
        }

        const photoRows = [];
        for (let i = 0; i < allPhotos.length; i += 2) {
            const p1 = allPhotos[i];
            const p2 = allPhotos[i + 1];

            const row = [];

            // Photo 1
            const img1 = await this.getPhotoData(p1);
            if (img1) {
                row.push({
                    stack: [
                        { image: img1, width: 230 },
                        { text: p1.descripcion || p1.filename || 'Foto', style: 'label', margin: [0, 5, 0, 10] }
                    ]
                });
            } else {
                row.push({ text: 'Imagen no disponible', margin: [0, 0, 0, 10] });
            }

            // Photo 2
            if (p2) {
                const img2 = await this.getPhotoData(p2);
                if (img2) {
                    row.push({
                        stack: [
                            { image: img2, width: 230 },
                            { text: p2.descripcion || p2.filename || 'Foto', style: 'label', margin: [0, 5, 0, 10] }
                        ]
                    });
                } else {
                    row.push({ text: 'Imagen no disponible', margin: [0, 0, 0, 10] });
                }
            } else {
                row.push({ text: '' });
            }

            photoRows.push(row);
        }

        stack.push({
            table: {
                widths: ['*', '*'],
                body: photoRows
            },
            layout: 'noBorders'
        });

        return { stack };
    }

    private async getPhotoData(foto: FotoInfo): Promise<string | null> {
        try {
            const imageUrl = foto.blobId ? blobStore.getUrl(foto.blobId) : (foto as any).dataUrl;
            if (!imageUrl) return null;

            // pdfMake expects data URL or base64
            if (imageUrl.startsWith('data:')) {
                logger.debug('Imagen ya es dataURL', { filename: foto.filename }, 'PDFMakeGenerator');
                return imageUrl;
            }

            logger.debug('Iniciando fetch de imagen', { url: imageUrl, filename: foto.filename }, 'PDFMakeGenerator');
            // Fetch and convert to base64 if it's a blob/URL
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Fallo el fetch de imagen: ${response.status} ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();

            logger.debug('Imagen descargada, convirtiendo...', { size: arrayBuffer.byteLength, filename: foto.filename }, 'PDFMakeGenerator');

            // Check for environment (Browser vs Server)
            if (typeof window !== 'undefined' && typeof FileReader !== 'undefined') {
                const blob = new Blob([arrayBuffer]);
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            } else {
                // Node.js environment
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                const contentType = response.headers.get('content-type') || 'image/jpeg';
                return `data:${contentType};base64,${base64}`;
            }
        } catch (e) {
            logger.error('Error obteniendo datos de fotografía', { error: e, foto: foto.filename }, 'PDFMakeGenerator');
            console.error('Error fetching photo data for pdfMake:', e);
            return null;
        }
    }

    private buildObservacionesSection(section: FichaSection, pozo: Pozo, customization: FichaCustomization) {
        const stack = [];
        stack.push(this.buildSectionHeader('OBSERVACIONES', customization));

        const obs = pozo.observacionesPozo?.value || pozo.observaciones.observaciones?.value || 'Sin observaciones';
        stack.push({ text: String(obs), style: 'value', margin: [5, 5, 5, 10] });

        return { stack };
    }
}

export const pdfMakeGenerator = new PDFMakeGenerator();
