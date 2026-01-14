/**
 * PDFGenerator - Generacion de PDFs para fichas tecnicas
 * Requirements: 7.1, 7.2, 5.1-5.5
 * 
 * Incluye todos los 33 campos del diccionario de datos:
 * - Identificación (6 campos obligatorios)
 * - Ubicación (4 campos importantes)
 * - Componentes (23 campos opcionales/importantes)
 * - Tuberías unificadas (entrada/salida)
 * - Sumideros
 * - Fotos con descripciones
 * - Indicadores de campos obligatorios vs opcionales
 */

import { jsPDF } from 'jspdf';
import type { FichaState, FichaCustomization, FichaSection } from '@/types/ficha';
import type { Pozo, FotoInfo, TuberiaInfo, SumideroInfo } from '@/types/pozo';
import { blobStore } from '@/lib/storage/blobStore';

const PDF_CONFIG = {
  pageWidth: 210,
  pageHeight: 297,
  margin: 12,
  headerHeight: 25,
  sectionTitleHeight: 8,
  lineHeight: 5.5,
  imageQuality: 0.85,
  maxImageWidth: 50,
  maxImageHeight: 35,
  footerHeight: 10,
  fieldIndicatorWidth: 3,
};

export interface PDFGeneratorOptions {
  watermark?: string;
  pageNumbers?: boolean;
  includeDate?: boolean;
  imageQuality?: number;
}

export interface PDFGenerationResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
  pageCount?: number;
}

interface RenderContext {
  doc: jsPDF;
  currentY: number;
  pageNumber: number;
  customization: FichaCustomization;
  options: PDFGeneratorOptions;
}

export class PDFGenerator {
  private defaultCustomization: FichaCustomization = {
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
      fontFamily: 'helvetica',
    },
    spacing: {
      sectionGap: 8,
      fieldGap: 4,
      padding: 5,
      margin: 15,
    },
    template: 'default',
    isGlobal: false,
  };


  async generatePDF(
    ficha: FichaState,
    pozo: Pozo,
    options: PDFGeneratorOptions = {}
  ): Promise<PDFGenerationResult> {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const customization = this.mergeCustomization(ficha.customizations);
      const ctx: RenderContext = {
        doc,
        currentY: PDF_CONFIG.margin,
        pageNumber: 1,
        customization,
        options: { pageNumbers: true, includeDate: true, ...options },
      };

      this.renderHeader(ctx, pozo);

      // Renderizar secciones de forma segura
      if (ficha.sections && Array.isArray(ficha.sections)) {
        const visibleSections = ficha.sections.filter(s => s && s.visible).sort((a, b) => (a?.order || 0) - (b?.order || 0));
        for (const section of visibleSections) {
          if (section) {
            await this.renderSection(ctx, section, pozo);
          }
        }
      }

      if (ctx.options.pageNumbers || ctx.options.includeDate) {
        this.renderFooters(ctx);
      }

      const blob = doc.output('blob');
      return { success: true, blob, filename: `ficha_${pozo.idPozo?.value || pozo.identificacion.idPozo.value}_${Date.now()}.pdf`, pageCount: ctx.pageNumber };
    } catch (error) {
      console.error('PDF Generation Error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  private mergeCustomization(custom?: FichaCustomization): FichaCustomization {
    if (!custom) return this.defaultCustomization;
    return {
      colors: { ...this.defaultCustomization.colors, ...custom.colors },
      fonts: { ...this.defaultCustomization.fonts, ...custom.fonts },
      spacing: { ...this.defaultCustomization.spacing, ...custom.spacing },
      template: custom.template || this.defaultCustomization.template,
      isGlobal: custom.isGlobal,
    };
  }

  private renderHeader(ctx: RenderContext, pozo: Pozo): void {
    const { doc, customization } = ctx;
    const { colors, fonts } = customization;
    doc.setFillColor(colors.headerBg);
    doc.rect(0, 0, PDF_CONFIG.pageWidth, PDF_CONFIG.headerHeight, 'F');
    doc.setTextColor(colors.headerText);
    doc.setFontSize(fonts.titleSize);
    doc.setFont(fonts.fontFamily, 'bold');
    doc.text('FICHA TECNICA DE POZO DE INSPECCION', PDF_CONFIG.pageWidth / 2, 10, { align: 'center' });
    doc.setFontSize(fonts.titleSize - 2);
    doc.text(`Pozo: ${pozo.idPozo?.value || pozo.identificacion.idPozo.value}`, PDF_CONFIG.pageWidth / 2, 18, { align: 'center' });
    ctx.currentY = PDF_CONFIG.headerHeight + 5;
  }

  private async renderSection(ctx: RenderContext, section: FichaSection, pozo: Pozo): Promise<void> {
    this.checkPageBreak(ctx, 30);
    switch (section.type) {
      case 'identificacion': this.renderIdentificacionSection(ctx, section, pozo); break;
      case 'estructura': this.renderUbicacionSection(ctx, section, pozo); this.renderEstructuraSection(ctx, section, pozo); break;
      case 'tuberias': this.renderTuberiasSection(ctx, section, pozo); break;
      case 'sumideros': this.renderSumiderosSection(ctx, section, pozo); break;
      case 'fotos': await this.renderFotosSection(ctx, section, pozo); break;
      case 'observaciones': this.renderObservacionesSection(ctx, section, pozo); break;
    }
    ctx.currentY += ctx.customization.spacing.sectionGap;
  }

  private renderSectionTitle(ctx: RenderContext, title: string): void {
    const { doc, customization } = ctx;
    const { colors, fonts, spacing } = customization;
    doc.setFillColor(colors.sectionBg);
    doc.rect(PDF_CONFIG.margin, ctx.currentY, PDF_CONFIG.pageWidth - PDF_CONFIG.margin * 2, PDF_CONFIG.sectionTitleHeight, 'F');
    doc.setTextColor(colors.sectionText);
    doc.setFontSize(fonts.labelSize + 1);
    doc.setFont(fonts.fontFamily, 'bold');
    doc.text(title, PDF_CONFIG.margin + spacing.padding, ctx.currentY + 5.5);
    ctx.currentY += PDF_CONFIG.sectionTitleHeight + 2;
  }


  private renderField(ctx: RenderContext, label: string, value: string, x: number, width: number, isRequired: boolean = false): void {
    const { doc, customization } = ctx;
    const { colors, fonts } = customization;

    // Indicador de campo obligatorio (🔴) o importante (🟠)
    let indicator = '';
    if (isRequired) {
      doc.setTextColor('#DC2626'); // Rojo para obligatorio
      indicator = '●';
    }

    doc.setTextColor(colors.labelText);
    doc.setFontSize(fonts.labelSize);
    doc.setFont(fonts.fontFamily, 'normal');

    const indicatorText = indicator ? `${indicator} ` : '';
    doc.text(`${indicatorText}${label}:`, x, ctx.currentY);

    doc.setTextColor(colors.valueText);
    doc.setFontSize(fonts.valueSize);
    const labelWidth = doc.getTextWidth(`${indicatorText}${label}: `);
    const valueX = x + labelWidth + 1;
    const maxWidth = width - labelWidth - 2;
    let displayValue = value || '-';

    while (doc.getTextWidth(displayValue) > maxWidth && displayValue.length > 3) {
      displayValue = displayValue.slice(0, -4) + '...';
    }
    doc.text(displayValue, valueX, ctx.currentY);
  }

  private getFieldValue(section: FichaSection, field: string, fallback: string = '-'): string {
    const fieldValue = section.content[field];
    if (!fieldValue) return fallback;
    return fieldValue.value || fallback;
  }

  private renderIdentificacionSection(ctx: RenderContext, section: FichaSection, pozo: Pozo): void {
    this.renderSectionTitle(ctx, 'IDENTIFICACION (Campos Obligatorios 🔴)');
    const colWidth = (PDF_CONFIG.pageWidth - PDF_CONFIG.margin * 2) / 2;
    const leftX = PDF_CONFIG.margin;
    const rightX = PDF_CONFIG.margin + colWidth;

    // 🔴 Obligatorios
    this.renderField(ctx, 'Código Pozo', this.getFieldValue(section, 'idPozo', pozo.idPozo?.value || pozo.identificacion.idPozo.value), leftX, colWidth, true);
    this.renderField(ctx, 'Levantó', this.getFieldValue(section, 'levanto', pozo.levanto?.value || pozo.identificacion.levanto.value), rightX, colWidth, true);
    ctx.currentY += PDF_CONFIG.lineHeight;

    this.renderField(ctx, 'Fecha Inspección', this.getFieldValue(section, 'fecha', pozo.fecha?.value || pozo.identificacion.fecha.value), leftX, colWidth, true);
    this.renderField(ctx, 'Estado General', this.getFieldValue(section, 'estado', pozo.estado?.value || pozo.identificacion.estado.value), rightX, colWidth, true);
    ctx.currentY += PDF_CONFIG.lineHeight;

    this.renderField(ctx, 'Coordenada X', this.getFieldValue(section, 'coordenadaX', pozo.coordenadaX?.value || pozo.identificacion.coordenadaX.value), leftX, colWidth, true);
    this.renderField(ctx, 'Coordenada Y', this.getFieldValue(section, 'coordenadaY', pozo.coordenadaY?.value || pozo.identificacion.coordenadaY.value), rightX, colWidth, true);
    ctx.currentY += PDF_CONFIG.lineHeight;
  }

  private renderUbicacionSection(ctx: RenderContext, section: FichaSection, pozo: Pozo): void {
    this.renderSectionTitle(ctx, 'UBICACION (Campos Importantes 🟠)');
    const colWidth = (PDF_CONFIG.pageWidth - PDF_CONFIG.margin * 2) / 2;
    const leftX = PDF_CONFIG.margin;
    const rightX = PDF_CONFIG.margin + colWidth;

    // 🟠 Importantes
    this.renderField(ctx, 'Dirección', this.getFieldValue(section, 'direccion', pozo.direccion?.value || pozo.ubicacion.direccion.value), leftX, colWidth * 2, true);
    ctx.currentY += PDF_CONFIG.lineHeight;

    this.renderField(ctx, 'Barrio', this.getFieldValue(section, 'barrio', pozo.barrio?.value || pozo.ubicacion.barrio.value), leftX, colWidth, true);
    this.renderField(ctx, 'Elevación (m)', this.getFieldValue(section, 'elevacion', pozo.elevacion?.value || pozo.ubicacion.elevacion.value), rightX, colWidth, true);
    ctx.currentY += PDF_CONFIG.lineHeight;

    this.renderField(ctx, 'Profundidad (m)', this.getFieldValue(section, 'profundidad', pozo.profundidad?.value || pozo.ubicacion.profundidad.value), leftX, colWidth, true);
    ctx.currentY += PDF_CONFIG.lineHeight;
  }

  private renderEstructuraSection(ctx: RenderContext, section: FichaSection, pozo: Pozo): void {
    this.renderSectionTitle(ctx, 'COMPONENTES DEL POZO (Campos Importantes 🟠 y Opcionales 🟢)');
    const { doc, customization } = ctx;
    const colWidth = (PDF_CONFIG.pageWidth - PDF_CONFIG.margin * 2) / 2;
    const leftX = PDF_CONFIG.margin;
    const rightX = PDF_CONFIG.margin + colWidth;
    const comp = pozo.componentes;

    // Sección 1: Tapa y Cilindro (Importantes)
    doc.setTextColor(customization.colors.sectionText);
    doc.setFontSize(customization.fonts.labelSize);
    doc.setFont(customization.fonts.fontFamily, 'bold');
    doc.text('Tapa y Cilindro:', leftX, ctx.currentY);
    ctx.currentY += PDF_CONFIG.lineHeight;

    this.renderField(ctx, 'Existe Tapa', this.getFieldValue(section, 'existeTapa', pozo.existeTapa?.value || comp.existeTapa.value), leftX, colWidth, true);
    this.renderField(ctx, 'Estado Tapa', this.getFieldValue(section, 'estadoTapa', pozo.estadoTapa?.value || comp.estadoTapa.value), rightX, colWidth, true);
    ctx.currentY += PDF_CONFIG.lineHeight;

    this.renderField(ctx, 'Material Tapa', this.getFieldValue(section, 'materialTapa', pozo.materialTapa?.value || comp.materialTapa.value), leftX, colWidth);
    this.renderField(ctx, 'Existe Cilindro', this.getFieldValue(section, 'existeCilindro', pozo.existeCilindro?.value || comp.existeCilindro.value), rightX, colWidth, true);
    ctx.currentY += PDF_CONFIG.lineHeight;

    this.renderField(ctx, 'Diámetro Cilindro (m)', this.getFieldValue(section, 'diametroCilindro', pozo.diametroCilindro?.value || comp.diametroCilindro.value), leftX, colWidth, true);
    this.renderField(ctx, 'Material Cilindro', this.getFieldValue(section, 'materialCilindro', pozo.materialCilindro?.value || comp.materialCilindro.value), rightX, colWidth);
    ctx.currentY += PDF_CONFIG.lineHeight;

    this.renderField(ctx, 'Estado Cilindro', this.getFieldValue(section, 'estadoCilindro', pozo.estadoCilindro?.value || comp.estadoCilindro.value), leftX, colWidth);
    ctx.currentY += PDF_CONFIG.lineHeight;

    // Sección 2: Cono (Opcional)
    doc.setTextColor(customization.colors.sectionText);
    doc.setFontSize(customization.fonts.labelSize);
    doc.setFont(customization.fonts.fontFamily, 'bold');
    doc.text('Cono:', leftX, ctx.currentY);
    ctx.currentY += PDF_CONFIG.lineHeight;

    this.renderField(ctx, 'Existe Cono', this.getFieldValue(section, 'existeCono', pozo.existeCono?.value || comp.existeCono.value), leftX, colWidth);
    this.renderField(ctx, 'Tipo Cono', this.getFieldValue(section, 'tipoCono', pozo.tipoCono?.value || comp.tipoCono.value), rightX, colWidth);
    ctx.currentY += PDF_CONFIG.lineHeight;

    this.renderField(ctx, 'Material Cono', this.getFieldValue(section, 'materialCono', pozo.materialCono?.value || comp.materialCono.value), leftX, colWidth);
    this.renderField(ctx, 'Estado Cono', this.getFieldValue(section, 'estadoCono', pozo.estadoCono?.value || comp.estadoCono.value), rightX, colWidth);
    ctx.currentY += PDF_CONFIG.lineHeight;

    // Sección 3: Cañuela (Opcional)
    doc.setTextColor(customization.colors.sectionText);
    doc.setFontSize(customization.fonts.labelSize);
    doc.setFont(customization.fonts.fontFamily, 'bold');
    doc.text('Cañuela:', leftX, ctx.currentY);
    ctx.currentY += PDF_CONFIG.lineHeight;

    this.renderField(ctx, 'Existe Cañuela', this.getFieldValue(section, 'existeCanuela', pozo.existeCanuela?.value || comp.existeCanuela.value), leftX, colWidth);
    this.renderField(ctx, 'Material Cañuela', this.getFieldValue(section, 'materialCanuela', pozo.materialCanuela?.value || comp.materialCanuela.value), rightX, colWidth);
    ctx.currentY += PDF_CONFIG.lineHeight;

    this.renderField(ctx, 'Estado Cañuela', this.getFieldValue(section, 'estadoCanuela', pozo.estadoCanuela?.value || comp.estadoCanuela.value), leftX, colWidth);
    ctx.currentY += PDF_CONFIG.lineHeight;

    // Sección 4: Peldaños (Opcional)
    doc.setTextColor(customization.colors.sectionText);
    doc.setFontSize(customization.fonts.labelSize);
    doc.setFont(customization.fonts.fontFamily, 'bold');
    doc.text('Peldaños:', leftX, ctx.currentY);
    ctx.currentY += PDF_CONFIG.lineHeight;

    this.renderField(ctx, 'Existe Peldaños', this.getFieldValue(section, 'existePeldanos', pozo.existePeldanos?.value || comp.existePeldanos.value), leftX, colWidth);
    this.renderField(ctx, 'Número Peldaños', this.getFieldValue(section, 'numeroPeldanos', pozo.numeroPeldanos?.value || comp.numeroPeldanos.value), rightX, colWidth);
    ctx.currentY += PDF_CONFIG.lineHeight;

    this.renderField(ctx, 'Material Peldaños', this.getFieldValue(section, 'materialPeldanos', pozo.materialPeldanos?.value || comp.materialPeldanos.value), leftX, colWidth);
    this.renderField(ctx, 'Estado Peldaños', this.getFieldValue(section, 'estadoPeldanos', pozo.estadoPeldanos?.value || comp.estadoPeldanos.value), rightX, colWidth);
    ctx.currentY += PDF_CONFIG.lineHeight;

    // Sección 5: Información General (Opcional)
    doc.setTextColor(customization.colors.sectionText);
    doc.setFontSize(customization.fonts.labelSize);
    doc.setFont(customization.fonts.fontFamily, 'bold');
    doc.text('Información General:', leftX, ctx.currentY);
    ctx.currentY += PDF_CONFIG.lineHeight;

    this.renderField(ctx, 'Sistema', this.getFieldValue(section, 'sistema', pozo.sistema?.value || comp.sistema.value), leftX, colWidth);
    this.renderField(ctx, 'Año Instalación', this.getFieldValue(section, 'anoInstalacion', pozo.anoInstalacion?.value || comp.anoInstalacion.value), rightX, colWidth);
    ctx.currentY += PDF_CONFIG.lineHeight;

    this.renderField(ctx, 'Tipo Cámara', this.getFieldValue(section, 'tipoCamara', pozo.tipoCamara?.value || comp.tipoCamara.value), leftX, colWidth);
    this.renderField(ctx, 'Estructura Pavimento', this.getFieldValue(section, 'estructuraPavimento', pozo.estructuraPavimento?.value || comp.estructuraPavimento.value), rightX, colWidth);
    ctx.currentY += PDF_CONFIG.lineHeight;
  }


  private renderTuberiasSection(ctx: RenderContext, _section: FichaSection, pozo: Pozo): void {
    this.renderSectionTitle(ctx, 'TUBERIAS (Entrada y Salida Unificadas)');
    const { doc, customization } = ctx;
    const { colors, fonts } = customization;

    if (!pozo.tuberias.tuberias || pozo.tuberias.tuberias.length === 0) {
      doc.setTextColor(colors.labelText);
      doc.setFontSize(fonts.valueSize);
      doc.text('Sin tuberías registradas', PDF_CONFIG.margin, ctx.currentY);
      ctx.currentY += PDF_CONFIG.lineHeight;
      return;
    }

    // Separar entradas y salidas
    const entradas = pozo.tuberias.tuberias.filter(t => t.tipoTuberia.value === 'entrada');
    const salidas = pozo.tuberias.tuberias.filter(t => t.tipoTuberia.value === 'salida');

    if (entradas.length > 0) {
      doc.setTextColor(colors.sectionText);
      doc.setFontSize(fonts.labelSize);
      doc.setFont(fonts.fontFamily, 'bold');
      doc.text('Entradas:', PDF_CONFIG.margin, ctx.currentY);
      ctx.currentY += PDF_CONFIG.lineHeight;
      this.renderTuberiaTable(ctx, entradas);
    }

    if (salidas.length > 0) {
      doc.setTextColor(colors.sectionText);
      doc.setFontSize(fonts.labelSize);
      doc.setFont(fonts.fontFamily, 'bold');
      doc.text('Salidas:', PDF_CONFIG.margin, ctx.currentY);
      ctx.currentY += PDF_CONFIG.lineHeight;
      this.renderTuberiaTable(ctx, salidas);
    }
  }

  private renderTuberiaTable(ctx: RenderContext, tuberias: TuberiaInfo[]): void {
    const { doc, customization } = ctx;
    const { colors, fonts } = customization;
    const tableWidth = PDF_CONFIG.pageWidth - PDF_CONFIG.margin * 2;
    // 6 columnas: Ø, Material, Cota, Estado, Emboq, Longitud
    const colWidths = [
      tableWidth * 0.15, // Ø
      tableWidth * 0.20, // Material
      tableWidth * 0.15, // Cota
      tableWidth * 0.20, // Estado
      tableWidth * 0.15, // Emboq
      tableWidth * 0.15  // Longitud
    ];
    const headers = ['Ø (mm)', 'Material', 'Cota', 'Estado', 'Emboq.', 'Longitud'];

    doc.setFillColor(colors.sectionBg);
    doc.rect(PDF_CONFIG.margin, ctx.currentY - 4, tableWidth, 6, 'F');
    doc.setTextColor(colors.sectionText);
    doc.setFontSize(fonts.labelSize);
    doc.setFont(fonts.fontFamily, 'bold');

    let x = PDF_CONFIG.margin;
    headers.forEach((header, i) => {
      doc.text(header, x + 2, ctx.currentY);
      x += colWidths[i];
    });
    ctx.currentY += PDF_CONFIG.lineHeight;

    doc.setFont(fonts.fontFamily, 'normal');
    doc.setTextColor(colors.valueText);
    doc.setFontSize(fonts.valueSize);

    for (const tub of tuberias) {
      x = PDF_CONFIG.margin;
      doc.text(tub.diametro?.value || '-', x + 2, ctx.currentY); x += colWidths[0];
      doc.text(tub.material?.value || '-', x + 2, ctx.currentY); x += colWidths[1];
      doc.text(tub.cota?.value || '-', x + 2, ctx.currentY); x += colWidths[2];
      doc.text(tub.estado?.value || '-', x + 2, ctx.currentY); x += colWidths[3];
      doc.text(tub.emboquillado?.value || '-', x + 2, ctx.currentY); x += colWidths[4];
      doc.text(tub.longitud?.value || '-', x + 2, ctx.currentY);
      ctx.currentY += PDF_CONFIG.lineHeight;
    }
  }

  private renderSumiderosSection(ctx: RenderContext, _section: FichaSection, pozo: Pozo): void {
    this.renderSectionTitle(ctx, 'SUMIDEROS');
    const { doc, customization } = ctx;
    const { colors, fonts } = customization;

    if (!pozo.sumideros.sumideros || pozo.sumideros.sumideros.length === 0) {
      doc.setTextColor(colors.labelText);
      doc.setFontSize(fonts.valueSize);
      doc.text('Sin sumideros registrados', PDF_CONFIG.margin, ctx.currentY);
      ctx.currentY += PDF_CONFIG.lineHeight;
      return;
    }

    this.renderSumideroTable(ctx, pozo.sumideros.sumideros);
  }

  private renderSumideroTable(ctx: RenderContext, sumideros: SumideroInfo[]): void {
    const { doc, customization } = ctx;
    const { colors, fonts } = customization;
    const tableWidth = PDF_CONFIG.pageWidth - PDF_CONFIG.margin * 2;
    // 7 columnas: ID, Esq, Tipo, Mat, Ø, Salida, Llegada
    const colWidths = [
      tableWidth * 0.12, // ID
      tableWidth * 0.10, // Esq
      tableWidth * 0.16, // Tipo
      tableWidth * 0.16, // Material
      tableWidth * 0.12, // Ø
      tableWidth * 0.17, // Salida
      tableWidth * 0.17  // Llegada
    ];
    const headers = ['ID', 'Esq.', 'Tipo', 'Material', 'Ø (mm)', 'H Salida', 'H Llegada'];

    doc.setFillColor(colors.sectionBg);
    doc.rect(PDF_CONFIG.margin, ctx.currentY - 4, tableWidth, 6, 'F');
    doc.setTextColor(colors.sectionText);
    doc.setFontSize(fonts.labelSize);
    doc.setFont(fonts.fontFamily, 'bold');

    let x = PDF_CONFIG.margin;
    headers.forEach((header, i) => {
      doc.text(header, x + 2, ctx.currentY);
      x += colWidths[i];
    });
    ctx.currentY += PDF_CONFIG.lineHeight;

    doc.setFont(fonts.fontFamily, 'normal');
    doc.setTextColor(colors.valueText);
    doc.setFontSize(fonts.valueSize);

    for (const sum of sumideros) {
      x = PDF_CONFIG.margin;
      doc.text(sum.idSumidero?.value || '-', x + 2, ctx.currentY); x += colWidths[0];
      doc.text(sum.numeroEsquema?.value || '-', x + 2, ctx.currentY); x += colWidths[1];
      doc.text(sum.tipoSumidero?.value || '-', x + 2, ctx.currentY); x += colWidths[2];
      doc.text(sum.materialTuberia?.value || '-', x + 2, ctx.currentY); x += colWidths[3];
      doc.text(sum.diametro?.value || '-', x + 2, ctx.currentY); x += colWidths[4];
      doc.text(sum.alturaSalida?.value || '-', x + 2, ctx.currentY); x += colWidths[5];
      doc.text(sum.alturaLlegada?.value || '-', x + 2, ctx.currentY);
      ctx.currentY += PDF_CONFIG.lineHeight;
    }
  }


  private async renderFotosSection(ctx: RenderContext, _section: FichaSection, pozo: Pozo): Promise<void> {
    this.renderSectionTitle(ctx, 'REGISTRO FOTOGRAFICO');
    const allPhotos = pozo.fotos.fotos || [];

    if (allPhotos.length === 0) {
      const { doc, customization } = ctx;
      doc.setTextColor(customization.colors.labelText);
      doc.setFontSize(customization.fonts.valueSize);
      doc.text('Sin fotografías registradas', PDF_CONFIG.margin, ctx.currentY);
      ctx.currentY += PDF_CONFIG.lineHeight;
      return;
    }

    const photosPerRow = 2;
    const photoWidth = PDF_CONFIG.maxImageWidth;
    const photoHeight = PDF_CONFIG.maxImageHeight;
    const gap = 8;
    const startX = PDF_CONFIG.margin;

    for (let i = 0; i < allPhotos.length; i++) {
      const col = i % photosPerRow;
      const x = startX + col * (photoWidth + gap);

      if (col === 0 && i > 0) {
        ctx.currentY += photoHeight + 15;
        this.checkPageBreak(ctx, photoHeight + 20);
      }

      await this.renderPhoto(ctx, allPhotos[i], x, ctx.currentY, photoWidth, photoHeight);
    }

    ctx.currentY += photoHeight + 15;
  }

  private async renderPhoto(ctx: RenderContext, foto: FotoInfo, x: number, y: number, maxWidth: number, maxHeight: number): Promise<void> {
    const { doc, customization } = ctx;
    try {
      const imageUrl = foto.blobId ? blobStore.getUrl(foto.blobId) : (foto as any).dataUrl;

      if (imageUrl) {
        const img = await this.loadImage(imageUrl);
        const { width, height } = this.calculateImageDimensions(img.width, img.height, maxWidth, maxHeight);
        doc.addImage(img, 'JPEG', x, y, width, height, undefined, 'MEDIUM');

        // Renderizar descripción y tipo de foto
        doc.setTextColor(customization.colors.labelText);
        doc.setFontSize(customization.fonts.labelSize - 1);

        const description = foto.descripcion || (foto as any).tipoFoto?.value || foto.filename || 'Foto';
        doc.text(description, x, y + height + 2, { maxWidth: maxWidth });
      } else {
        doc.setDrawColor(customization.colors.borderColor);
        doc.setFillColor('#F9F9F9');
        doc.rect(x, y, maxWidth, maxHeight, 'FD');
        doc.setTextColor(customization.colors.labelText);
        doc.setFontSize(customization.fonts.labelSize);
        doc.text('Imagen no disponible', x + maxWidth / 2, y + maxHeight / 2, { align: 'center' });

        const description = foto.descripcion || (foto as any).tipoFoto?.value || foto.filename || 'Foto';
        doc.text(description, x, y + maxHeight + 2, { maxWidth: maxWidth });
      }
    } catch {
      doc.setDrawColor(customization.colors.borderColor);
      doc.rect(x, y, maxWidth, maxHeight);
      doc.setTextColor(customization.colors.labelText);
      doc.setFontSize(customization.fonts.labelSize);
      doc.text('Error al cargar', x + 2, y + maxHeight / 2);

      const description = foto.descripcion || (foto as any).tipoFoto?.value || foto.filename || 'Foto';
      doc.text(description, x, y + maxHeight + 2, { maxWidth: maxWidth });
    }
  }

  private loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  private calculateImageDimensions(origW: number, origH: number, maxW: number, maxH: number): { width: number; height: number } {
    const ratio = Math.min(maxW / origW, maxH / origH);
    return { width: origW * ratio, height: origH * ratio };
  }


  private renderObservacionesSection(ctx: RenderContext, section: FichaSection, pozo: Pozo): void {
    this.renderSectionTitle(ctx, 'OBSERVACIONES');
    const { doc, customization } = ctx;
    const observaciones = this.getFieldValue(section, 'observaciones', pozo.observacionesPozo?.value || pozo.observaciones.observaciones.value);
    doc.setTextColor(customization.colors.valueText);
    doc.setFontSize(customization.fonts.valueSize);
    const maxWidth = PDF_CONFIG.pageWidth - PDF_CONFIG.margin * 2;
    const lines = doc.splitTextToSize(observaciones || 'Sin observaciones', maxWidth);
    for (const line of lines) {
      this.checkPageBreak(ctx, PDF_CONFIG.lineHeight);
      doc.text(line, PDF_CONFIG.margin, ctx.currentY);
      ctx.currentY += PDF_CONFIG.lineHeight;
    }
  }

  private checkPageBreak(ctx: RenderContext, requiredSpace: number): void {
    const availableSpace = PDF_CONFIG.pageHeight - ctx.currentY - PDF_CONFIG.footerHeight - PDF_CONFIG.margin;
    if (availableSpace < requiredSpace) {
      ctx.doc.addPage();
      ctx.pageNumber++;
      ctx.currentY = PDF_CONFIG.margin;
    }
  }

  private renderFooters(ctx: RenderContext): void {
    const { doc, options } = ctx;
    const totalPages = ctx.pageNumber;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor('#999999');
      const footerY = PDF_CONFIG.pageHeight - 8;
      if (options.pageNumbers) {
        doc.text(`Pagina ${i} de ${totalPages}`, PDF_CONFIG.pageWidth / 2, footerY, { align: 'center' });
      }
      if (options.includeDate) {
        const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.text(date, PDF_CONFIG.pageWidth - PDF_CONFIG.margin, footerY, { align: 'right' });
      }
    }
  }
}

export const pdfGenerator = new PDFGenerator();

export async function generateFichaPDF(
  ficha: FichaState,
  pozo: Pozo,
  options?: PDFGeneratorOptions
): Promise<PDFGenerationResult> {
  return pdfGenerator.generatePDF(ficha, pozo, options);
}

export function downloadPDF(result: PDFGenerationResult): void {
  if (!result.success || !result.blob || !result.filename) {
    console.error('No se puede descargar: PDF no generado correctamente');
    return;
  }
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
