/**
 * Script de prueba para verificar transliteracion
 * Ejecutar: node test-translit.js
 */

// Simular la funcion sanitizeTextForPDF
const TRANSLIT_MAP = {
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
    '\u00F1': 'n', // ñ
    '\u00D1': 'N', // Ñ
    '\u00FC': 'u', // ü
    '\u00DC': 'U', // Ü
    '\u00BF': '?', // ¿
    '\u00A1': '!', // ¡
};

function sanitizeTextForPDF(text) {
    if (!text) return '';

    try {
        let result = text.normalize('NFC');
        result = result.split('').map(char =>
            TRANSLIT_MAP[char] || char
        ).join('');
        return result;
    } catch (e) {
        console.warn('Error sanitizando texto:', e);
        return text;
    }
}

// Pruebas
const tests = [
    'IDENTIFICACIÓN',
    'Coordenada X',
    'Cañuela',
    'Peldaños',
    'Dirección',
    'María Angel',
    'SELLADO',
    'Página 1 de 3',
];

console.log('=== PRUEBA DE TRANSLITERACIÓN ===\n');
tests.forEach(test => {
    const result = sanitizeTextForPDF(test);
    console.log(`"${test}" → "${result}"`);
});

console.log('\n✅ Si ves texto sin tildes/eñes arriba, la transliteración funciona correctamente');
