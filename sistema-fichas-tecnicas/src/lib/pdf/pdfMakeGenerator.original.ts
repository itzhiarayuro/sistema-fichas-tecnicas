import pdfMake from 'pdfmake/build/pdfmake';
import { FichaState, FichaSection, FichaCustomization } from '@/types/ficha';
import { Pozo, FotoInfo } from '@/types/pozo';
import { blobStore } from '@/lib/storage/blobStore';
import { logger } from '@/lib/logger';
import { PDFGeneratorOptions, PDFGenerationResult } from '@/types/pdf';

// Initialize pdfMake fonts
// @ts-ignore
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Configurar VFS y pdfMake de forma que funcione en cliente y servidor
let pdfMakeInstance: any = pdfMake;

export class PDFMakeGenerator {

    constructor() {
        // No-op or init logic if needed
    }

    private getFontConfiguration(): any {
        const vfs = (pdfMakeInstance as any).vfs || {};
        const keys = Object.keys(vfs);

        // Helper to find the best match for a style
        const findFont = (patterns: string[], fallback: string) => {
            for (const pattern of patterns) {
                const match = keys.find(k => k.toLowerCase().includes(pattern.toLowerCase()));
                if (match) return match;
            }
            // If fallback exists in VFS, use it
            if (keys.includes(fallback)) return fallback;
            // Otherwise, try any font in VFS
            return keys[0] || fallback;
        };

        const roboto = {
            normal: findFont(['Roboto-Regular.ttf', 'Roboto.ttf'], 'Roboto-Regular.ttf'),
            bold: findFont(['Roboto-Bold.ttf', 'Roboto-Medium.ttf'], 'Roboto-Bold.ttf'),
            italics: findFont(['Roboto-Italic.ttf'], 'Roboto-Italic.ttf'),
            bolditalics: findFont(['Roboto-BoldItalic.ttf', 'Roboto-MediumItalic.ttf'], 'Roboto-BoldItalic.ttf')
        };

        // Detect if Inter exists in VFS
        const hasInter = keys.some(k => k.toLowerCase().includes('inter'));

        const config: any = {
            Roboto: roboto,
            // Always define Inter to avoid crashes if it's requested
            Inter: hasInter ? {
                normal: findFont(['Inter-Regular.ttf', 'Inter-Medium.ttf'], roboto.normal),
                bold: findFont(['Inter-Bold.ttf', 'Inter-SemiBold.ttf'], roboto.bold),
                italics: findFont(['Inter-Italic.ttf'], roboto.italics),
                bolditalics: findFont(['Inter-BoldItalic.ttf'], roboto.bolditalics)
            } : roboto
        };

        logger.debug('Configuración de fuentes detectada dinámicamente', {
            hasInter,
            keysCount: keys.length,
            config
        }, 'PDFMakeGenerator');

        return config;
    }

    /**
     * Asegura que el VFS esté correctamente inicializado antes de usar pdfMake
     * Crítico para evitar errores en SSR o reinicios de contexto
     */
    private ensureVfs() {
        try {
            logger.debug('Verificando inicialización de VFS...', null, 'PDFMakeGenerator');

            // 1. Obtener el objeto VFS de donde esté disponible
            const vfs = (pdfFonts as any).pdfMake?.vfs || (pdfFonts as any).vfs || pdfFonts;

            if (!vfs) {
                logger.error('CRÍTICO: No se pudieron cargar las fuentes (VFS not found)', null, 'PDFMakeGenerator');
                return;
            }

            // 2. Asignar al instance global si no tiene
            if (!(pdfMakeInstance as any).vfs) {
                logger.debug('VFS no detectado en pdfMakeInstance, asignando...', null, 'PDFMakeGenerator');
                (pdfMakeInstance as any).vfs = vfs;
            } else {
                logger.debug('VFS ya presente en pdfMakeInstance', null, 'PDFMakeGenerator');
            }

            // 2.1 Asegurar global en cliente (parche de seguridad para algunas versiones de pdfmake)
            if (typeof window !== 'undefined') {
                (window as any).pdfMake = pdfMakeInstance;
            }

            // 3. Verificación de archivos disponibles
            const fontKeys = Object.keys((pdfMakeInstance as any).vfs || {});
            if (fontKeys.length === 0) {
                logger.warn('ADVERTENCIA: VFS está vacío, fonts fallarán', null, 'PDFMakeGenerator');
            } else {
                logger.info('VFS Cargado Correctamente', {
                    total: fontKeys.length,
                    archivos: fontKeys.join(', ') // String simple para evitar colapsos en consola
                }, 'PDFMakeGenerator');
            }

        } catch (error) {
            logger.error('Error fatal inicializando VFS', error, 'PDFMakeGenerator');
        }
    }

    /**
     * Genera un PDF usando pdfMake para una ficha y pozo
     */
    async generatePDF(
        ficha: FichaState,
        pozo: Pozo,
        options: PDFGeneratorOptions = { pageNumbers: true, includeDate: true, includePhotos: true }
    ): Promise<PDFGenerationResult> {
        // Validación preliminar de datos
        if (!ficha || !pozo) {
            logger.warn('Intento de generar PDF con datos inválidos', { ficha: !!ficha, pozo: !!pozo }, 'PDFMakeGenerator');
            return { success: false, error: 'Datos de ficha o pozo inválidos (null o undefined)' };
        }

        const startTime = Date.now();
        logger.info('>>> INICIANDO GENERACIÓN DE PDF <<<', {
            pozoId: pozo.id,
            codigoPozo: pozo.idPozo?.value || pozo.identificacion?.idPozo?.value,
            sections: ficha.sections?.length,
            options
        }, 'PDFMakeGenerator');

        try {
            this.ensureVfs(); // Re-check VFS
            const fontConfig = this.getFontConfiguration();
            const customization = this.mergeCustomization(ficha.customizations);

            // PRODUCCIÓN: Forzar Roboto hasta que la configuración de fuentes personalizadas esté completamente estable
            // TODO: Después del lanzamiento, habilitar selección de fuentes personalizadas
            const mainFont = 'Roboto';

            logger.info('Usando fuente Roboto (modo producción)', {
                originalRequest: customization.fonts.fontFamily
            }, 'PDFMakeGenerator');

            const content = await this.buildContent(ficha, pozo, customization, options);
            const styles = this.buildStyles(customization);

            const docDefinition: any = {
                pageSize: 'A4',
                pageMargins: [40, 60, 40, 60],
                header: (currentPage: number) => {
                    if (currentPage === 1) return null;
                    return {
                        text: 'FICHA TÉCNICA DE POZO DE INSPECCIÓN',
                        alignment: 'center',
                        margin: [0, 20, 0, 0],
                        fontSize: 10,
                        color: '#666666',
                        font: mainFont
                    };
                },
                footer: (currentPage: number, pageCount: number) => {
                    const footerItems = [];

                    if (options.includeDate) {
                        const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
                        footerItems.push({ text: date, alignment: 'left', font: mainFont });
                    }

                    if (options.pageNumbers) {
                        footerItems.push({ text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', font: mainFont });
                    }

                    return {
                        columns: footerItems,
                        margin: [40, 20, 40, 0],
                        fontSize: 8,
                        color: '#999999'
                    };
                },
                content: content,
                styles: styles,
                defaultStyle: {
                    font: mainFont
                }
            };

            logger.info('Estructura de documento construida, procediendo a crear PDF blob', {
                pozoId: pozo.id,
                mainFont,
                includePhotos: options.includePhotos
            }, 'PDFMakeGenerator');

            const result = await new Promise<PDFGenerationResult>((resolve) => {
                try {
                    logger.debug('Llamando a pdfMake.createPdf...', null, 'PDFMakeGenerator');
                    // Usar fontConfig detectado
                    const pdfDocGenerator = pdfMakeInstance.createPdf(docDefinition, undefined, fontConfig);

                    if (typeof window !== 'undefined') {
                        // Client side
                        logger.debug('Entorno detectado: Navegador. Solicitando Blob...', null, 'PDFMakeGenerator');

                        // Timeout de seguridad para la generación misma
                        const pdfTimeout = setTimeout(() => {
                            logger.error('TIMEOUT: La generación de PDF se estancó por más de 30 segundos', null, 'PDFMakeGenerator');
                            resolve({ success: false, error: 'Tiempo de espera agotado generando el PDF' });
                        }, 30000);

                        pdfDocGenerator.getBlob((blob: Blob) => {
                            clearTimeout(pdfTimeout);
                            const duration = Date.now() - startTime;
                            logger.info('Blob generado exitosamente', { size: blob.size, durationMs: duration }, 'PDFMakeGenerator');
                            const pozoId = pozo.idPozo?.value ||
                                pozo.identificacion?.idPozo?.value ||
                                pozo.id ||
                                'sin-codigo';
                            const filename = `${pozoId}.pdf`;
                            resolve({ success: true, blob, filename });
                        });
                    } else {
                        // Server side
                        logger.debug('Entorno detectado: Servidor. Solicitando Buffer...', null, 'PDFMakeGenerator');
                        pdfDocGenerator.getBuffer((buffer: Buffer) => {
                            const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
                            const pozoId = pozo.idPozo?.value ||
                                pozo.identificacion?.idPozo?.value ||
                                pozo.id ||
                                'sin-codigo';
                            const filename = `${pozoId}.pdf`;
                            resolve({ success: true, blob, filename });
                        });
                    }
                } catch (err) {
                    logger.error('Error durante la ejecución de pdfMake (createPdf)', err, 'PDFMakeGenerator');
                    resolve({
                        success: false,
                        error: err instanceof Error ? err.message : 'Error interno en pdfMake'
                    });
                }
            });

            return result;

        } catch (error) {
            logger.error('Error fatal detectado en generatePDF', error, 'PDFMakeGenerator');
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
                fontFamily: 'Roboto',
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

        logger.debug('buildContent: Iniciando construcción del cuerpo...', null, 'PDFMakeGenerator');

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
        if (ficha.sections) {
            logger.debug(`buildContent: Procesando ${ficha.sections.length} secciones...`, null, 'PDFMakeGenerator');
            for (const section of ficha.sections) {
                if (!section.visible) {
                    logger.debug(`buildContent: Sección ignorada (visible=false): ${section.type}`, null, 'PDFMakeGenerator');
                    continue;
                }

                logger.debug(`buildContent: Construyendo sección ${section.type}`, null, 'PDFMakeGenerator');

                try {
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
                                logger.debug('buildContent: Iniciando buildFotosSection...', null, 'PDFMakeGenerator');
                                const fotosContent = await this.buildFotosSection(pozo, customization);
                                if (fotosContent) {
                                    content.push(fotosContent);
                                    logger.debug('buildContent: buildFotosSection añadido correctamente', null, 'PDFMakeGenerator');
                                }
                            } else {
                                logger.debug('buildContent: Sección fotos omitida por opciones', null, 'PDFMakeGenerator');
                            }
                            break;
                        case 'observaciones':
                            content.push(this.buildObservacionesSection(section, pozo, customization));
                            break;
                        default:
                            logger.warn(`buildContent: Tipo de sección desconocido: ${section.type}`, null, 'PDFMakeGenerator');
                    }
                } catch (sectErr) {
                    logger.error(`Error construyendo sección ${section.type}`, sectErr, 'PDFMakeGenerator');
                    // No detenemos todo el proceso, solo avisamos
                    content.push({ text: `[Error en sección ${section.type}]`, color: 'red', italic: true });
                }
            }
        } else {
            logger.warn('buildContent: ficha.sections está ausente o vacío', null, 'PDFMakeGenerator');
        }

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

        let fields = section.content ? Object.entries(section.content) : [];

        // Fallback: Si no hay campos en la sección (ficha nueva), poblar con mapeo por defecto
        if (fields.length === 0) {
            logger.debug(`buildGenericSection (${section.type}): Seccion vacía, usando mapeo por defecto`, null, 'PDFMakeGenerator');

            if (section.type === 'identificacion') {
                const idMap = {
                    'Código': pozo.idPozo?.value || pozo.identificacion?.idPozo?.value || 'S/N',
                    'Dirección': pozo.direccion?.value || pozo.ubicacion?.direccion?.value || 'S/D',
                    'Barrio': pozo.barrio?.value || pozo.ubicacion?.barrio?.value || '-',
                    'Sistema': pozo.sistema?.value || pozo.componentes?.sistema?.value || '-',
                    'Estado': pozo.estado?.value || pozo.identificacion?.estado?.value || '-',
                    'Fecha': pozo.fecha?.value || pozo.identificacion?.fecha?.value || '-',
                    'Profundidad': pozo.profundidad?.value || pozo.ubicacion?.profundidad?.value || '-',
                    'Elevación': pozo.elevacion?.value || pozo.ubicacion?.elevacion?.value || '-'
                };
                fields = Object.entries(idMap).map(([k, v]) => [k, { value: String(v), source: 'excel' as const }]);
            }
        }

        logger.debug(`buildGenericSection (${section.type}): Procesando ${fields.length} campos`, {
            keys: fields.map(f => f[0])
        }, 'PDFMakeGenerator');

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
            logger.debug(`buildGenericSection (${section.type}): Sin campos para mostrar incluso después de fallback`, null, 'PDFMakeGenerator');
            rows.push({ text: 'No hay datos registrados en esta sección', style: 'value', margin: [5, 2, 0, 2] });
        }

        return { stack: rows };
    }

    private buildField(label: string, value: any) {
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

        const tableBody: any[][] = [
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

        const tableBody: any[][] = [
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
        logger.debug('buildFotosSection: Cantidad de fotos a procesar', { count: allPhotos.length }, 'PDFMakeGenerator');

        if (allPhotos.length === 0) {
            stack.push({ text: 'Sin fotografías registradas', style: 'value' });
            return { stack };
        }

        const photoTasks = allPhotos.map(async (p, idx) => {
            try {
                logger.debug(`buildFotosSection: Obteniendo datos para foto ${idx + 1}`, { filename: p.filename, blobId: p.blobId }, 'PDFMakeGenerator');
                const img = await this.getPhotoData(p);
                return {
                    stack: [
                        img ? { image: img, width: 230 } : { text: 'Imagen no disponible (Error carga)', margin: [0, 60, 0, 60], alignment: 'center', color: 'red' },
                        { text: p.descripcion || String(p.tipo || '') || p.filename || 'Foto', style: 'label', margin: [0, 5, 0, 10], alignment: 'center' }
                    ]
                };
            } catch (err) {
                logger.error(`buildFotosSection: Error procesando foto ${idx + 1}`, err, 'PDFMakeGenerator');
                return {
                    stack: [
                        { text: 'Error procesando imagen', margin: [0, 60, 0, 60], alignment: 'center', color: 'red' },
                        { text: p.descripcion || 'Foto', style: 'label', alignment: 'center' }
                    ]
                };
            }
        });

        const resolvedPhotos = await Promise.all(photoTasks);
        logger.debug('buildFotosSection: Todas las tareas de fotos finalizadas', { resolvedCount: resolvedPhotos.length }, 'PDFMakeGenerator');

        const photoRows = [];
        for (let i = 0; i < resolvedPhotos.length; i += 2) {
            photoRows.push([
                resolvedPhotos[i],
                resolvedPhotos[i + 1] || { text: '' }
            ]);
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
            if (!imageUrl) {
                logger.debug('getPhotoData: No se encontró URL para la foto', { filename: foto.filename }, 'PDFMakeGenerator');
                return null;
            }

            // CASO 1: Data URL (Base64) - Seguro en ambos entornos
            if (imageUrl.startsWith('data:')) {
                logger.debug('getPhotoData: Detector Base64 directo', { type: imageUrl.split(';')[0] }, 'PDFMakeGenerator');
                return imageUrl;
            }

            // CASO 2: Blob URL en Servidor - CRÍTICO: No soportado
            if (typeof window === 'undefined' && imageUrl.startsWith('blob:')) {
                logger.warn('getPhotoData: Intento de cargar blob: URL en servidor (ignorado)', { url: imageUrl }, 'PDFMakeGenerator');
                return null;
            }

            // CASO 3: Fetch con timeout y manejo de errores
            logger.debug('getPhotoData: Iniciando fetch de imagen', { url: imageUrl, filename: foto.filename }, 'PDFMakeGenerator');

            const controller = new AbortController();
            // Timeout reducido a 5s para no bloquear generación
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            try {
                const response = await fetch(imageUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`Fallo fetch: ${response.status}`);

                const arrayBuffer = await response.arrayBuffer();

                if (typeof window !== 'undefined') {
                    // Client Side: Convertir a Data URL via FileReader
                    const blob = new Blob([arrayBuffer]);
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            if (typeof reader.result === 'string') {
                                resolve(reader.result);
                            } else {
                                reject(new Error('FileReader result is not string'));
                            }
                        };
                        reader.onerror = () => {
                            logger.error('getPhotoData: FileReader error', reader.error, 'PDFMakeGenerator');
                            reject(reader.error);
                        };
                        reader.readAsDataURL(blob);
                    });
                } else {
                    // Server Side: Convertir a Base64
                    const base64 = Buffer.from(arrayBuffer).toString('base64');
                    const contentType = response.headers.get('content-type') || 'image/jpeg';
                    return `data:${contentType};base64,${base64}`;
                }
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    logger.warn('getPhotoData: TIMEOUT obteniendo imagen', { url: imageUrl }, 'PDFMakeGenerator');
                } else {
                    logger.error('getPhotoData: Error obteniendo imagen vía fetch', { err, url: imageUrl }, 'PDFMakeGenerator');
                }
                return null;
            }
        } catch (e) {
            logger.error('getPhotoData: Excepción general', { e, foto: foto.filename }, 'PDFMakeGenerator');
            return null;
        }
    }

    private buildObservacionesSection(section: FichaSection, pozo: Pozo, customization: FichaCustomization) {
        const stack: any[] = [];
        stack.push(this.buildSectionHeader('OBSERVACIONES', customization));

        const obs = pozo.observacionesPozo?.value || pozo.observaciones?.observaciones?.value || 'Sin observaciones';
        stack.push({ text: String(obs), style: 'value', margin: [5, 5, 5, 10] });

        return { stack };
    }
}

export const pdfMakeGenerator = new PDFMakeGenerator();
