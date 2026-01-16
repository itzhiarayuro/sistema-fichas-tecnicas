/**
 * Script de prueba para verificar transliteracion SIN espaciado
 * Ejecutar: node test-translit-v2.js
 */

// Simular la funcion sanitizeTextForPDF NUEVA (con replace)
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
    '\u00B0': 'o', // °
    '\u00AA': 'a', // ª
    '\u00BA': 'o', // º
};

function sanitizeTextForPDF_OLD(text) {
    if (!text) return '';
    try {
        let result = text.normalize('NFC');
        // MÉTODO VIEJO: split/map/join (causa espaciado)
        result = result.split('').map(char =>
            TRANSLIT_MAP[char] || char
        ).join('');
        return result;
    } catch (e) {
        return text;
    }
}

function sanitizeTextForPDF_NEW(text) {
    if (!text) return '';
    try {
        let result = text.normalize('NFC');
        // MÉTODO NUEVO: replace con regex (sin espaciado)
        result = result.replace(/[\u00E1\u00E9\u00ED\u00F3\u00FA\u00C1\u00C9\u00CD\u00D3\u00DA\u00F1\u00D1\u00FC\u00DC\u00BF\u00A1\u00B0\u00AA\u00BA]/g, (char) => {
            return TRANSLIT_MAP[char] || char;
        });
        return result;
    } catch (e) {
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
    'Página 1 de 3',
];

console.log('=== COMPARACIÓN DE MÉTODOS ===\n');
console.log('Método VIEJO (split/map/join):');
tests.forEach(test => {
    const result = sanitizeTextForPDF_OLD(test);
    console.log(`  "${test}" → "${result}"`);
});

console.log('\nMétodo NUEVO (replace):');
tests.forEach(test => {
    const result = sanitizeTextForPDF_NEW(test);
    console.log(`  "${test}" → "${result}"`);
});

console.log('\n✅ Ambos métodos deberían producir el mismo resultado');
console.log('✅ La diferencia está en cómo jsPDF procesa el texto internamente');
