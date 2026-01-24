import pdfMake from 'pdfmake/build/pdfmake';
import { FichaState, FichaSection, FichaCustomization } from '@/types/ficha';
import { Pozo, FotoInfo } from '@/types/pozo';
import { AVAILABLE_FIELDS, FichaDesignVersion, DesignElement, isFieldPlacement, isShapeElement } from '@/types/fichaDesign';
import { blobStore } from '@/lib/storage/blobStore';
import { logger } from '@/lib/logger';
import { PDFGeneratorOptions, PDFGenerationResult } from '@/types/pdf';

// Initialize pdfMake fonts
// @ts-ignore
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Configurar VFS y pdfMake de forma que funcione en cliente y servidor
let pdfMakeInstance: any = pdfMake;

// MOTOR 2: jsPDF (Respaldo - Siempre funciona)
let jsPDFAvailable = false;
let jsPDF: any = null;

async function initJsPDF() {
    if (jsPDFAvailable) return true;
    try {
        const { jsPDF: jsPDFClass } = await import('jspdf');
        jsPDF = jsPDFClass;
        jsPDFAvailable = true;
        logger.info('✅ jsPDF cargado correctamente como motor de respaldo', null, 'PDFGenerator');
        return true;
    } catch (error) {
        logger.error('Error cargando jsPDF', error, 'PDFGenerator');
        return false;
    }
}

export class PDFMakeGenerator {

    constructor() {
        // Intentar inicializar motores en construcción
        if (typeof window !== 'undefined') {
            initJsPDF().catch(() => logger.warn('jsPDF no disponible en construcción', null, 'PDFMakeGenerator'));
        }
    }

    private getFontConfiguration(): any {
        // CONFIGURACIÓN SIMPLIFICADA Y ROBUSTA
        // Usa nombres exactos de archivos del VFS estándar de pdfmake
        const config = {
            Roboto: {
                normal: 'Roboto-Regular.ttf',
                bold: 'Roboto-Medium.ttf',
                italics: 'Roboto-Italic.ttf',
                bolditalics: 'Roboto-MediumItalic.ttf'
            }
        };

        logger.debug('Configuración de fuentes (modo simplificado)', { config }, 'PDFMakeGenerator');
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
        options: PDFGeneratorOptions = { pageNumbers: true, includeDate: true, includePhotos: true },
        customDesign?: any
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

        // 🔥 PRIORIDAD JS-PDF EN NAVEGADOR: Evita el cuelgue de pdfMake con fotos
        if (typeof window !== 'undefined') {
            logger.info('🚀 Priorizando motor jsPDF para respuesta instantánea en navegador', null, 'PDFMakeGenerator');
            const result = await this.generateWithJsPDF(ficha, pozo, options, customDesign);
            if (result.success) {
                logger.info('✅ PDF generado exitosamente con motor prioritario jsPDF', {
                    duration: `${Date.now() - startTime}ms`
                }, 'PDFMakeGenerator');
                return result;
            }
            logger.warn('⚠️ Falló jsPDF prioritario, intentando pdfMake como fallback...', { error: result.error }, 'PDFMakeGenerator');
        }

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
                            logger.error('TIMEOUT: La generación de PDF se estancó por más de 60 segundos', null, 'PDFMakeGenerator');
                            resolve({ success: false, error: 'Tiempo de espera agotado generando el PDF' });
                        }, 60000);

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
                    const errorMessage = err instanceof Error ? err.message : 'Error interno en pdfMake';
                    const errorStack = err instanceof Error ? err.stack : undefined;

                    logger.error('‼️ Error durante la ejecución de pdfMake (createPdf)', {
                        message: errorMessage,
                        stack: errorStack,
                        error: err
                    }, 'PDFMakeGenerator');

                    resolve({
                        success: false,
                        error: errorMessage
                    });
                }
            });

            // Si falló pdfMake, probamos con el respaldo (jsPDF)
            if (!result.success) {
                logger.warn('⚠️ pdfMake FALLÓ - Activando motor de respaldo jsPDF', {
                    errorDetalles: result.error,
                    motivo: 'El motor primario no pudo completar la generación'
                }, 'PDFMakeGenerator');
                return await this.generateWithJsPDF(ficha, pozo, options);
            }

            return result;

        } catch (error) {
            logger.error('Error detectado en motor primario, intentando respaldo...', error, 'PDFMakeGenerator');
            return await this.generateWithJsPDF(ficha, pozo, options);
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
                        img ? { image: img, width: 180 } : { text: 'Imagen no disponible (Error carga)', margin: [0, 60, 0, 60], alignment: 'center', color: 'red' },
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

    /**
     * Comprime una imagen a un tamaño manejable para pdfMake
     * Máximo 600px de ancho/alto, calidad 0.6 (más agresivo para evitar timeout)
     */
    private async compressImage(dataUrl: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const maxSize = 600; // Reducido de 800px
                    let width = img.width;
                    let height = img.height;

                    // Calcular nuevo tamaño manteniendo proporción
                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = (height / width) * maxSize;
                            width = maxSize;
                        } else {
                            width = (width / height) * maxSize;
                            height = maxSize;
                        }
                    }

                    // Crear canvas y comprimir
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        reject(new Error('No se pudo obtener contexto 2D del canvas'));
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);

                    // Comprimir a JPEG 0.6 calidad (reducido para evitar timeout de pdfMake)
                    const compressed = canvas.toDataURL('image/jpeg', 0.6);

                    logger.debug('Imagen comprimida', {
                        originalSize: dataUrl.length,
                        compressedSize: compressed.length,
                        reduction: `${((1 - compressed.length / dataUrl.length) * 100).toFixed(1)}%`
                    }, 'PDFMakeGenerator');

                    resolve(compressed);
                } catch (error) {
                    logger.error('Error comprimiendo imagen', error, 'PDFMakeGenerator');
                    resolve(dataUrl); // Fallback a original si falla compresión
                }
            };
            img.onerror = () => {
                logger.error('Error cargando imagen para comprimir', null, 'PDFMakeGenerator');
                resolve(dataUrl); // Fallback a original
            };
            img.src = dataUrl;
        });
    }

    private async getPhotoData(foto: FotoInfo): Promise<string | null> {
        try {
            const imageUrl = foto.blobId ? blobStore.getUrl(foto.blobId) : (foto as any).dataUrl;
            if (!imageUrl) {
                logger.debug('getPhotoData: No se encontró URL para la foto', { filename: foto.filename }, 'PDFMakeGenerator');
                return null;
            }

            let rawDataUrl: string | null = null;

            // CASO 1: Data URL (Base64) - Seguro en ambos entornos
            if (imageUrl.startsWith('data:')) {
                logger.debug('getPhotoData: Detector Base64 directo', { type: imageUrl.split(';')[0] }, 'PDFMakeGenerator');
                rawDataUrl = imageUrl;
            }
            // CASO 2: Blob URL en Servidor - CRÍTICO: No soportado
            else if (typeof window === 'undefined' && imageUrl.startsWith('blob:')) {
                logger.warn('getPhotoData: Intento de cargar blob: URL en servidor (ignorado)', { url: imageUrl }, 'PDFMakeGenerator');
                return null;
            }
            // CASO 3: Fetch con timeout y manejo de errores
            else {
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
                        rawDataUrl = await new Promise<string>((resolve, reject) => {
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
                        rawDataUrl = `data:${contentType};base64,${base64}`;
                    }
                } catch (err: any) {
                    if (err.name === 'AbortError') {
                        logger.warn('getPhotoData: TIMEOUT obteniendo imagen', { url: imageUrl }, 'PDFMakeGenerator');
                    } else {
                        logger.error('getPhotoData: Error obteniendo imagen vía fetch', { err, url: imageUrl }, 'PDFMakeGenerator');
                    }
                    return null;
                }
            }

            // COMPRESIÓN: Solo en navegador (pdfMake se cuelga con imágenes grandes)
            if (rawDataUrl && typeof window !== 'undefined') {
                logger.debug('getPhotoData: Comprimiendo imagen antes de enviar a pdfMake', { filename: foto.filename }, 'PDFMakeGenerator');
                return await this.compressImage(rawDataUrl);
            }

            return rawDataUrl;
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

    /**
     * GENERADOR PROFESIONAL CON jsPDF
     * Implementa el diseño prediseñado completo (mismo que pdfMake)
     * 100% confiable, sin timeouts
     */
    private async generateWithJsPDF(
        ficha: FichaState,
        pozo: Pozo,
        options: PDFGeneratorOptions,
        customDesign?: any
    ): Promise<PDFGenerationResult> {

        const ready = await initJsPDF();
        if (!ready || !jsPDF) {
            return { success: false, error: 'Motor jsPDF no disponible' };
        }

        try {
            logger.info('🎨 Generando PDF con diseño profesional (jsPDF)', { pozoId: pozo.id }, 'PDFMakeGenerator');

            // Obtener customización (con valores por defecto si no existe)
            const customization = this.mergeCustomization(ficha.customizations);
            logger.debug('Customización aplicada a jsPDF', { customization }, 'PDFMakeGenerator');

            // Configuración inicial de página (valores por defecto)
            const orientation = customDesign?.orientation || 'portrait';
            const pageSize = customDesign?.pageSize || 'a4';

            const doc = new jsPDF({
                orientation: orientation as any,
                unit: 'mm',
                format: pageSize as any
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Convertir spacing de px a mm (aprox 1px = 0.264mm)
            const pxToMm = (px: number) => px * 0.264583;
            const margin = pxToMm(customization.spacing.margin * 2.67); // ~15px margin = ~14mm
            const contentWidth = pageWidth - (2 * margin);

            // Función auxiliar: Convertir hex a RGB
            const hexToRgb = (hex: string): [number, number, number] => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result
                    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
                    : [0, 0, 0];
            };

            // Colores desde customización
            const colors = {
                headerBg: hexToRgb(customization.colors.headerBg),
                headerText: hexToRgb(customization.colors.headerText),
                sectionBg: hexToRgb(customization.colors.sectionBg),
                sectionText: hexToRgb(customization.colors.sectionText),
                labelText: hexToRgb(customization.colors.labelText),
                valueText: hexToRgb(customization.colors.valueText),
                borderColor: hexToRgb(customization.colors.borderColor)
            };

            // Tamaños de fuente desde customización (convertir px a pt para jsPDF)
            const fonts = {
                title: customization.fonts.titleSize,
                label: customization.fonts.labelSize,
                value: customization.fonts.valueSize,
                sectionHeader: customization.fonts.labelSize + 2
            };

            // Espaciados desde customización
            const spacing = {
                sectionGap: pxToMm(customization.spacing.sectionGap),
                fieldGap: pxToMm(customization.spacing.fieldGap),
                padding: pxToMm(customization.spacing.padding)
            };

            let yPos = 20;
            let currentPage = 1;

            // Función auxiliar: Verificar si necesitamos nueva página
            const checkPageBreak = (neededSpace: number) => {
                if (yPos + neededSpace > pageHeight - 25) {
                    doc.addPage();
                    currentPage++;
                    yPos = 20;
                    return true;
                }
                return false;
            };

            // Función auxiliar: Header de sección
            const addSectionHeader = (title: string) => {
                checkPageBreak(12);
                doc.setFillColor(...colors.sectionBg);
                doc.rect(margin, yPos, contentWidth, 8, 'F');
                doc.setTextColor(...colors.sectionText);
                doc.setFontSize(fonts.sectionHeader);
                doc.setFont('helvetica', 'bold');
                doc.text(title, margin + spacing.padding, yPos + 5.5);
                yPos += 10 + spacing.sectionGap;
            };

            // Función auxiliar: Campo (label: value)
            const addField = (label: string, value: any, xOffset: number = 0) => {
                doc.setFontSize(fonts.label);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...colors.labelText);
                doc.text(`${label}:`, margin + xOffset, yPos);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(fonts.value);
                doc.setTextColor(...colors.valueText);
                const valueText = String(value || '-');
                doc.text(valueText, margin + xOffset + spacing.padding + (doc.getTextWidth(`${label}:`)), yPos);
            };

            const idPozo = pozo.idPozo?.value || pozo.identificacion?.idPozo?.value || 'N/A';
            yPos = 30;


            // =====================================
            // BRANCH: DISEÑO PERSONALIZADO VS ESTÁNDAR
            // =====================================
            if (customDesign && (customDesign.placements?.length > 0 || customDesign.shapes?.length > 0)) {
                logger.info('🚀 Usando MODO DISEÑO PERSONALIZADO (Posicionamiento Absoluto)', {
                    designName: customDesign.name,
                    placements: customDesign.placements?.length,
                    shapes: customDesign.shapes?.length
                }, 'PDFMakeGenerator');

                await this.renderCustomDesignWithJsPDF(doc, customDesign, pozo, options);
            } else {
                // =====================================
                // HEADER PRINCIPAL (SOLO PARA MODO ESTÁNDAR)
                // =====================================
                doc.setFillColor(...colors.headerBg);
                doc.rect(0, 0, pageWidth, 25, 'F');
                doc.setTextColor(...colors.headerText);
                doc.setFontSize(fonts.title);
                doc.setFont('helvetica', 'bold');
                doc.text('FICHA TÉCNICA DE POZO DE INSPECCIÓN', pageWidth / 2, 12, { align: 'center' });

                doc.setFontSize(fonts.value);
                doc.setFont('helvetica', 'normal');
                doc.text(`Pozo: ${idPozo}`, pageWidth / 2, 19, { align: 'center' });

                // =====================================
                // RENDERIZADO DINÁMICO POR SECCIONES (ESTÁNDAR)
                // =====================================
                // El motor ahora sigue fielmente el orden y visibilidad definidos en la ficha
                const sortedSections = [...(ficha.sections || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

                if (sortedSections.length === 0) {
                    // Fallback si no hay secciones (no debería pasar)
                    addSectionHeader('FICHA TÉCNICA');
                    addField('Código', idPozo);
                }

                for (const section of sortedSections) {
                    if (!section.visible) {
                        logger.debug(` jsPDF: Omitiendo sección invisible: ${section.type}`, null, 'PDFMakeGenerator');
                        continue;
                    }

                    logger.debug(` jsPDF: Renderizando sección: ${section.type}`, null, 'PDFMakeGenerator');

                    switch (section.type) {
                        case 'identificacion':
                            addSectionHeader('IDENTIFICACIÓN Y UBICACIÓN');
                            const identFields = [
                                ['Código', idPozo],
                                ['Dirección', pozo.direccion?.value || pozo.ubicacion?.direccion?.value || '-'],
                                ['Barrio', pozo.barrio?.value || pozo.ubicacion?.barrio?.value || '-'],
                                ['Sistema', pozo.sistema?.value || pozo.componentes?.sistema?.value || '-'],
                                ['Estado', pozo.estado?.value || pozo.identificacion?.estado?.value || '-'],
                                ['Fecha', pozo.fecha?.value || pozo.identificacion?.fecha?.value || '-'],
                                ['Profundidad', pozo.profundidad?.value || pozo.ubicacion?.profundidad?.value || '-'],
                                ['Elevación', pozo.elevacion?.value || pozo.ubicacion?.elevacion?.value || '-']
                            ];
                            const rowH = (fonts.value * 0.3528) + spacing.fieldGap;
                            for (let i = 0; i < identFields.length; i += 2) {
                                checkPageBreak(rowH);
                                addField(identFields[i][0], identFields[i][1], 0);
                                if (identFields[i + 1]) {
                                    addField(identFields[i + 1][0], identFields[i + 1][1], contentWidth / 2);
                                }
                                yPos += rowH;
                            }
                            yPos += spacing.sectionGap;
                            break;

                        case 'estructura':
                            addSectionHeader('CARACTERÍSTICAS DE LA ESTRUCTURA');
                            const comp = pozo.componentes || {};
                            const estructuraFields = [
                                ['Existe Tapa', pozo.existeTapa?.value || comp.existeTapa?.value],
                                ['Estado Tapa', pozo.estadoTapa?.value || comp.estadoTapa?.value],
                                ['Material Tapa', pozo.materialTapa?.value || comp.materialTapa?.value],
                                ['Material Cilindro', pozo.materialCilindro?.value || comp.materialCilindro?.value],
                                ['Diámetro Cilindro', pozo.diametroCilindro?.value || comp.diametroCilindro?.value],
                                ['Estado Cilindro', pozo.estadoCilindro?.value || comp.estadoCilindro?.value]
                            ];
                            const rowHE = (fonts.value * 0.3528) + spacing.fieldGap;
                            for (let i = 0; i < estructuraFields.length; i += 2) {
                                checkPageBreak(rowHE);
                                addField(estructuraFields[i][0], estructuraFields[i][1], 0);
                                if (estructuraFields[i + 1]) {
                                    addField(estructuraFields[i + 1][0], estructuraFields[i + 1][1], contentWidth / 2);
                                }
                                yPos += rowHE;
                            }
                            yPos += spacing.sectionGap;
                            break;

                        case 'tuberias':
                            const tuberias = pozo.tuberias?.tuberias || [];
                            if (tuberias.length > 0) {
                                addSectionHeader('TUBERÍAS (ENTRADAS Y SALIDAS)');
                                checkPageBreak(25);
                                const tableStartY = yPos;
                                const colWidths = [15, 30, 20, 25, 25, 25];
                                const rowH_T = 6;
                                doc.setFillColor(...colors.sectionBg);
                                doc.rect(margin, yPos, contentWidth, rowH_T, 'F');
                                doc.setFontSize(fonts.label);
                                doc.setFont('helvetica', 'bold');
                                doc.setTextColor(...colors.sectionText);
                                const headers = ['Ø (mm)', 'Material', 'Cota', 'Estado', 'Emboq.', 'Tipo'];
                                let xT = margin;
                                headers.forEach((h, idx) => {
                                    doc.text(h, xT + 1, yPos + 4);
                                    xT += colWidths[idx];
                                });
                                yPos += rowH_T;
                                doc.setFont('helvetica', 'normal');
                                doc.setFontSize(fonts.label);
                                tuberias.forEach((tub) => {
                                    checkPageBreak(rowH_T + 2);
                                    doc.setTextColor(...colors.valueText);
                                    let rowXT = margin;
                                    const values = [
                                        String(tub.diametro?.value || '-'),
                                        String(tub.material?.value || '-'),
                                        String(tub.cota?.value || '-'),
                                        String(tub.estado?.value || '-'),
                                        String(tub.emboquillado?.value || '-'),
                                        String(tub.tipoTuberia?.value || '-')
                                    ];
                                    values.forEach((v, idx) => {
                                        doc.text(v, rowXT + 1, yPos + 4);
                                        rowXT += colWidths[idx];
                                    });
                                    yPos += rowH_T;
                                });
                                doc.setDrawColor(...colors.borderColor);
                                doc.setLineWidth(0.1);
                                doc.rect(margin, tableStartY, contentWidth, yPos - tableStartY);
                                yPos += spacing.sectionGap;
                            }
                            break;

                        case 'sumideros':
                            const sumideros = pozo.sumideros?.sumideros || [];
                            if (sumideros.length > 0) {
                                addSectionHeader('SUMIDEROS');
                                checkPageBreak(25);
                                const tableStartY_S = yPos;
                                const colWidths_S = [25, 35, 35, 25, 25];
                                const rowH_S = 6;
                                doc.setFillColor(...colors.sectionBg);
                                doc.rect(margin, yPos, contentWidth, rowH_S, 'F');
                                doc.setFontSize(fonts.label);
                                doc.setFont('helvetica', 'bold');
                                doc.setTextColor(...colors.sectionText);
                                const headers_S = ['ID', 'Tipo', 'Material', 'Ø (mm)', 'H Salida'];
                                let xS = margin;
                                headers_S.forEach((h, idx) => {
                                    doc.text(h, xS + 1, yPos + 4);
                                    xS += colWidths_S[idx];
                                });
                                yPos += rowH_S;
                                doc.setFont('helvetica', 'normal');
                                doc.setFontSize(fonts.label);
                                sumideros.forEach((sum) => {
                                    checkPageBreak(rowH_S + 2);
                                    doc.setTextColor(...colors.valueText);
                                    let rowXS = margin;
                                    const values_S = [
                                        String(sum.idPozo?.value || '-'),
                                        String(sum.tipoSumidero?.value || '-'),
                                        String(sum.materialTuberia?.value || '-'),
                                        String(sum.diametro?.value || '-'),
                                        String(sum.alturaSalida?.value || '-')
                                    ];
                                    values_S.forEach((v, idx) => {
                                        doc.text(v, rowXS + 1, yPos + 4);
                                        rowXS += colWidths_S[idx];
                                    });
                                    yPos += rowH_S;
                                });
                                doc.setDrawColor(...colors.borderColor);
                                doc.setLineWidth(0.1);
                                doc.rect(margin, tableStartY_S, contentWidth, yPos - tableStartY_S);
                                yPos += spacing.sectionGap;
                            }
                            break;

                        case 'fotos':
                            if (options.includePhotos) {
                                const fotos_F = pozo.fotos?.fotos || [];
                                if (fotos_F.length > 0) {
                                    addSectionHeader('REGISTRO FOTOGRÁFICO');
                                    const photoW = (contentWidth / 2) - 3;
                                    const photoH = photoW * 0.75;
                                    for (let i = 0; i < fotos_F.length; i += 2) {
                                        checkPageBreak(photoH + 15);
                                        try {
                                            const img1 = await this.getPhotoData(fotos_F[i]);
                                            if (img1) {
                                                doc.addImage(img1, 'JPEG', margin, yPos, photoW, photoH);
                                                doc.setFontSize(fonts.label);
                                                doc.setFont('helvetica', 'bold');
                                                doc.setTextColor(...colors.labelText);
                                                const d1 = fotos_F[i].descripcion || String(fotos_F[i].tipo || '') || 'Foto';
                                                doc.text(d1, margin + (photoW / 2), yPos + photoH + 4, { align: 'center' });
                                            }
                                        } catch (e) { }
                                        if (fotos_F[i + 1]) {
                                            try {
                                                const img2 = await this.getPhotoData(fotos_F[i + 1]);
                                                if (img2) {
                                                    const xR = margin + photoW + 6;
                                                    doc.addImage(img2, 'JPEG', xR, yPos, photoW, photoH);
                                                    doc.setFontSize(fonts.label);
                                                    doc.setFont('helvetica', 'bold');
                                                    doc.setTextColor(...colors.labelText);
                                                    const d2 = fotos_F[i + 1].descripcion || String(fotos_F[i + 1].tipo || '') || 'Foto';
                                                    doc.text(d2, xR + (photoW / 2), yPos + photoH + 4, { align: 'center' });
                                                }
                                            } catch (e) { }
                                        }
                                        yPos += photoH + 12;
                                    }
                                    yPos += spacing.sectionGap;
                                }
                            }
                            break;

                        case 'observaciones':
                            const obs_O = pozo.observacionesPozo?.value || pozo.observaciones?.observaciones?.value;
                            if (obs_O) {
                                addSectionHeader('OBSERVACIONES');
                                checkPageBreak(15);
                                doc.setFontSize(fonts.value);
                                doc.setFont('helvetica', 'normal');
                                doc.setTextColor(...colors.valueText);
                                const lines = doc.splitTextToSize(String(obs_O), contentWidth - 4);
                                doc.text(lines, margin, yPos);
                                yPos += (lines.length * 5) + spacing.sectionGap;
                            }
                            break;
                    }
                } // Fin de loop de secciones
            } // Fin de branch custom vs standard

            // =====================================
            // FOOTER EN TODAS LAS PÁGINAS
            // =====================================
            const totalPages = (doc as any).internal.pages.length - 1; // -1 porque incluye una página vacía al principio

            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);

                // Línea divisoria
                doc.setDrawColor(...colors.borderColor);
                doc.setLineWidth(0.2);
                doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

                doc.setFontSize(Math.max(6, fonts.label - 1));
                doc.setTextColor(153, 153, 153); // #999999
                doc.setFont('helvetica', 'normal');

                if (options.includeDate) {
                    const fecha = new Date().toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    doc.text(fecha, margin, pageHeight - 10);
                }

                if (options.pageNumbers) {
                    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
                }
            }

            // =====================================
            // GENERAR BLOB
            // =====================================
            const blob = doc.output('blob');
            const pozoIdFinal = idPozo.replace(/[^a-zA-Z0-9-]/g, '_');

            logger.info('✅ PDF generado exitosamente con jsPDF profesional', {
                size: blob.size,
                pages: totalPages
            }, 'PDFMakeGenerator');

            return {
                success: true,
                blob,
                filename: `${pozoIdFinal}.pdf`
            };

        } catch (error) {
            logger.error('Error en generador jsPDF profesional', error, 'PDFMakeGenerator');
            return {
                success: false,
                error: `Error generando PDF: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * RENDERIZADO DE DISEÑO PERSONALIZADO (MODO ABSOLUTO)
     */
    private async renderCustomDesignWithJsPDF(
        doc: any,
        design: FichaDesignVersion,
        pozo: Pozo,
        options: PDFGeneratorOptions
    ) {
        const hexToRgb = (hex: string): [number, number, number] => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result
                ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
                : [0, 0, 0];
        };

        // 1. Renderizar Formas (Shapes) - Fondo
        const shapes = [...(design.shapes || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        for (const shape of shapes) {
            if (shape.isVisible === false) continue;

            if (shape.fillColor) doc.setFillColor(...hexToRgb(shape.fillColor));
            if (shape.strokeColor) doc.setDrawColor(...hexToRgb(shape.strokeColor));
            if (shape.strokeWidth) doc.setLineWidth(shape.strokeWidth * 0.264);

            switch (shape.type) {
                case 'rectangle':
                    doc.rect(shape.x, shape.y, shape.width, shape.height, shape.fillColor ? 'F' : 'D');
                    break;
                case 'circle':
                    const radius = Math.min(shape.width, shape.height) / 2;
                    doc.circle(shape.x + radius, shape.y + radius, radius, shape.fillColor ? 'F' : 'D');
                    break;
                case 'line':
                    doc.line(shape.x, shape.y, shape.x + shape.width, shape.y + shape.height);
                    break;
                case 'image':
                    if (shape.imageUrl) {
                        try {
                            doc.addImage(shape.imageUrl, 'JPEG', shape.x, shape.y, shape.width, shape.height);
                        } catch (e) {
                            logger.warn('Error agregando imagen estática a jsPDF', { url: shape.imageUrl, e }, 'PDFMakeGenerator');
                        }
                    }
                    break;
                case 'text':
                    if (shape.content) {
                        doc.setFontSize(shape.fontSize || 10);
                        doc.setFont('helvetica', shape.fontWeight === 'bold' ? 'bold' : 'normal');
                        doc.setTextColor(...hexToRgb(shape.color || '#000000'));
                        doc.text(shape.content, shape.x, shape.y + (shape.fontSize || 10) * 0.3);
                    }
                    break;
            }
        }

        // 2. Renderizar Campos (Placements)
        for (const placement of (design.placements || [])) {
            if (placement.isVisible === false) continue;

            const field = AVAILABLE_FIELDS.find(f => f.id === placement.fieldId);
            if (!field) continue;

            const value = this.getFieldValueByPath(pozo, field.fieldPath);

            // Caso especial: FOTOS
            if (field.category === 'fotos' && value) {
                try {
                    let imageData = value;
                    if (value.startsWith('blob:') || !value.startsWith('data:')) {
                        imageData = (blobStore.get(value) as unknown as string) || value;
                    }

                    if (imageData && imageData.startsWith('data:')) {
                        doc.addImage(imageData, 'JPEG', placement.x, placement.y, placement.width, placement.height);
                    } else {
                        doc.setDrawColor(200, 200, 200);
                        doc.rect(placement.x, placement.y, placement.width, placement.height, 'D');
                        doc.setFontSize(8);
                        doc.text('Foto no disponible', placement.x + 2, placement.y + 5);
                    }
                    continue;
                } catch (e) {
                    logger.warn('Error agregando foto de pozo a jsPDF', { fieldId: field.id, e }, 'PDFMakeGenerator');
                }
            }

            if (placement.backgroundColor) {
                doc.setFillColor(...hexToRgb(placement.backgroundColor));
                doc.rect(placement.x, placement.y, placement.width, placement.height, 'F');
            }

            doc.setFontSize(placement.fontSize || 10);
            doc.setTextColor(...hexToRgb(placement.color || '#000000'));
            doc.setFont('helvetica', placement.fontWeight === 'bold' ? 'bold' : 'normal');

            const textX = placement.x + (placement.padding || 0);
            const textY = placement.y + (placement.height / 2) + ((placement.fontSize || 10) * 0.15);

            const label = placement.showLabel ? (placement.customLabel || field.label) : '';
            const displayText = label ? `${label}: ${value || '-'}` : String(value || '-');

            const textOptions: any = {};
            if (placement.textAlign === 'center') {
                textOptions.align = 'center';
                doc.text(displayText, placement.x + placement.width / 2, textY, textOptions);
            } else if (placement.textAlign === 'right') {
                textOptions.align = 'right';
                doc.text(displayText, placement.x + placement.width - (placement.padding || 0), textY, textOptions);
            } else {
                doc.text(displayText, textX, textY);
            }
        }
    }

    /**
     * Resuelve un valor del objeto Pozo usando un path de strings
     */
    private getFieldValueByPath(obj: any, path: string): string {
        try {
            if (!path) return '';
            const cleanPath = path.replace(/\[(\d+)\]/g, '.$1');
            const parts = cleanPath.split('.');
            let current = obj;
            for (const part of parts) {
                if (current === null || current === undefined) return '';
                current = current[part];
            }
            return current !== undefined && current !== null ? String(current) : '';
        } catch (e) {
            return '';
        }
    }
}

export const pdfMakeGenerator = new PDFMakeGenerator();
