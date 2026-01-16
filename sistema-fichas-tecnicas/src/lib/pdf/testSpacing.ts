/**
 * Prueba mínima de jsPDF para diagnosticar problema de espaciado
 * Este archivo se puede ejecutar en el navegador
 */

import { jsPDF } from 'jspdf';

export function testJsPDFSpacing() {
    const doc = new jsPDF();

    // Test 1: Texto simple sin procesar
    doc.setFontSize(14);
    doc.text('Test 1: Texto directo', 10, 10);
    doc.text('IDENTIFICACION', 10, 20);
    doc.text('Coordenada X: 123', 10, 30);

    // Test 2: Texto con normalize
    doc.text('Test 2: Con normalize()', 10, 50);
    const text1 = 'IDENTIFICACION'.normalize('NFC');
    doc.text(text1, 10, 60);

    // Test 3: Texto procesado con split/join
    doc.text('Test 3: Con split/join', 10, 80);
    const text2 = 'IDENTIFICACION'.split('').join('');
    doc.text(text2, 10, 90);

    // Test 4: Texto con replace
    doc.text('Test 4: Con replace', 10, 110);
    const text3 = 'IDENTIFICACION'.replace(/I/g, 'I');
    doc.text(text3, 10, 120);

    // Test 5: Array de strings
    doc.text('Test 5: Array de strings', 10, 140);
    doc.text(['IDENTIFICACION', 'Coordenada X'], 10, 150);

    // Test 6: Con opciones de rendering
    doc.text('Test 6: Con opciones', 10, 180);
    doc.text('IDENTIFICACION', 10, 190, {
        renderingMode: 'fill',
        charSpace: 0,
    });

    return doc;
}

// Para usar en el navegador:
// 1. Importar esta función
// 2. Llamar: const doc = testJsPDFSpacing();
// 3. Descargar: doc.save('test-spacing.pdf');
// 4. Abrir PDF y seleccionar texto para ver si hay espacios
