/**
 * Configuracion de fuentes para jsPDF con soporte UTF-8
 * Soluciona el problema de caracteres especiales en espanol
 * 
 * NOTA: jsPDF 2.5.1 tiene un bug con UTF-8.
 * Solucion: Usar escape sequences en lugar de caracteres literales
 */

import { jsPDF } from 'jspdf';

/**
 * Configura jsPDF para usar fuentes con soporte UTF-8
 * CRÍTICO: Intenta desactivar character spacing que causa separación de letras
 */
export function configurePDFFont(doc: jsPDF): void {
    try {
        // Configurar idioma
        doc.setLanguage('es-ES');

        // CRÍTICO: Intentar forzar character spacing a 0
        // Esto puede resolver el problema de "I D E N T I F I C A C I O N"
        // @ts-ignore - Acceso a API interna de jsPDF
        if (doc.internal && (doc.internal as any).write) {
            // Comando PDF: 0 Tc = Set character spacing to 0
            (doc.internal as any).write('0 Tc');
        }

        // También intentar con setCharSpace si existe
        if (typeof (doc as any).setCharSpace === 'function') {
            (doc as any).setCharSpace(0);
        }
    } catch (e) {
        console.warn('No se pudo configurar idioma en PDF:', e);
    }
}

/**
 * Mapa de transliteracion usando Unicode escape sequences
 * Esto evita problemas de encoding del archivo fuente
 */
const TRANSLIT_MAP: Record<string, string> = {
    // Vocales con tilde (usando escape sequences)
    '\u00E1': 'a', // á
    '\u00E9': 'e', // é
    '\u00ED': 'i', // í
    '\u00F3': 'o', // ó
    '\u00FA': 'u', // ú
    '\u00C1': 'A', // Á
    '\u00C9': 'E', // É
    '\u00CD': 'I', // Í
    '\u00D3': 'O', // Ó
    '\u00DA': 'U', // Ú

    // Eñe
    '\u00F1': 'n', // ñ
    '\u00D1': 'N', // Ñ

    // Dieresis
    '\u00FC': 'u', // ü
    '\u00DC': 'U', // Ü

    // Signos de puntuacion
    '\u00BF': '?', // ¿
    '\u00A1': '!', // ¡

    // Otros caracteres comunes
    '\u00B0': 'o', // °
    '\u00AA': 'a', // ª
    '\u00BA': 'o', // º
};

/**
 * Sanitiza texto para asegurar compatibilidad con jsPDF
 * Transliteracion de caracteres especiales a ASCII
 * 
 * IMPORTANTE: Usa replace() en lugar de split().map().join()
 * para evitar que jsPDF separe cada carácter
 */
export function sanitizeTextForPDF(text: string): string {
    if (!text) return '';

    try {
        // Normalizar primero
        let result = text.normalize('NFC');

        // Transliterar usando replace con regex
        // Esto evita procesar carácter por carácter
        result = result.replace(/[\u00E1\u00E9\u00ED\u00F3\u00FA\u00C1\u00C9\u00CD\u00D3\u00DA\u00F1\u00D1\u00FC\u00DC\u00BF\u00A1\u00B0\u00AA\u00BA]/g, (char) => {
            return TRANSLIT_MAP[char] || char;
        });

        return result;
    } catch (e) {
        console.warn('Error sanitizando texto:', e);
        return text;
    }
}

/**
 * Mapeo de fuentes seguras para jsPDF (Standard 14 PDF fonts)
 */
export const SAFE_FONTS = {
    helvetica: 'helvetica',
} as const;

/**
 * Obtiene una fuente segura para jsPDF
 * Retorna siempre helvetica (equivalente a Arial en PDF)
 */
export function getSafeFont(fontFamily?: string): string {
    return SAFE_FONTS.helvetica;
}
