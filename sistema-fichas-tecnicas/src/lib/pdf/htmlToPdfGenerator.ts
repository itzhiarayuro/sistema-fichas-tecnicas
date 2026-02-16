
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generador de PDF de Alta Fidelidad usando html2canvas
 * Captura el DOM renderizado y lo incrusta en el PDF
 */
export async function generateHighFidelityPdf(
    elementId: string,
    fileName: string = 'ficha-tecnica.pdf',
    options = {
        orientation: 'p',
        format: 'a4',
        compress: true,
        scale: 2 // Escala 2x para nitidez en retina/impresión
    }
): Promise<Blob> {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Elemento con ID ${elementId} no encontrado para captura PDF`);
    }

    console.log(`📸 Iniciando captura de alta fidelidad para ${elementId}`);

    // Configuración optimizada de html2canvas
    const canvas = await html2canvas(element, {
        scale: options.scale,
        useCORS: true, // Permitir imágenes externas (blob urls)
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 15000, // Timeout generoso para fotos grandes
        onclone: (clonedDoc) => {
            // Ajustes CSS específicos para la impresión si fueran necesarios
            // Por ejemplo, forzar visibilidad de fondos
            const el = clonedDoc.getElementById(elementId);
            if (el) {
                el.style.overflow = 'visible';
            }
        }
    });

    // Dimensiones
    const imgWidth = 210; // A4 ancho en mm
    const pageHeight = 297; // A4 alto en mm

    // Calcular altura proporcional de la imagen capturada
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Crear PDF
    const doc = new jsPDF('p', 'mm', 'a4');

    // Convertir canvas a imagen
    const imgData = canvas.toDataURL('image/jpeg', options.compress ? 0.8 : 1.0);

    // Manejo de múltiples páginas (corte automático)
    let heightLeft = imgHeight;
    let position = 0;

    // Primer página
    doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    // Páginas adicionales si el contenido es muy largo
    while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
    }

    // Retornar Blob
    return doc.output('blob');
}
