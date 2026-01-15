const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function createZip() {
    const zip = new JSZip();
    // El script está en /scripts/, la carpeta public está en el nivel superior
    const baseDir = path.join(__dirname, '..', 'public', 'archivos-prueba');

    console.log('Buscando archivos en:', baseDir);

    if (!fs.existsSync(baseDir)) {
        throw new Error(`La carpeta base no existe: ${baseDir}`);
    }

    // Agregar README
    const readmePath = path.join(baseDir, 'README.md');
    if (fs.existsSync(readmePath)) {
        const readme = fs.readFileSync(readmePath);
        zip.file('README.md', readme);
    }

    // Agregar Excel
    const excelPath = path.join(baseDir, 'ejemplo_completo_33campos.xlsx');
    if (fs.existsSync(excelPath)) {
        const excel = fs.readFileSync(excelPath);
        zip.file('ejemplo_completo_33campos.xlsx', excel);
    } else {
        console.warn('¡Atención! Excel no encontrado en:', excelPath);
    }

    // Agregar Fotos
    const fotosDir = path.join(baseDir, 'fotos');
    if (fs.existsSync(fotosDir)) {
        const fotosZip = zip.folder('fotos');
        const files = fs.readdirSync(fotosDir);

        files.forEach(file => {
            const content = fs.readFileSync(path.join(fotosDir, file));
            fotosZip.file(file, content);
        });
    }

    const content = await zip.generateAsync({ type: 'nodebuffer' });
    const targetPath = path.join(__dirname, '..', 'public', 'archivos-prueba.zip');
    fs.writeFileSync(targetPath, content);

    console.log('ZIP generado exitosamente en: ' + targetPath);
}

createZip().catch(err => {
    console.error('Error al crear el ZIP:', err);
    process.exit(1);
});
