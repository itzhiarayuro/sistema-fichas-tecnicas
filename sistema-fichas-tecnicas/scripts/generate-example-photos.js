const fs = require('fs');
const path = require('path');

// Un pixel blanco en JPEG (buffer mínimo válido)
const base64Jpeg = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElUWFVldYWVpjZGVmZnaGlqc3R1dnd4eXqGhcXG19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwA/Af/Z';
const jpegBuffer = Buffer.from(base64Jpeg, 'base64');

const fotos = [
    'PZ1666-P.jpg', 'PZ1666-T.jpg', 'PZ1666-I.jpg', 'PZ1666-A.jpg',
    'PZ1667-P.jpg', 'PZ1667-T.jpg', 'PZ1667-E1-T.jpg', 'PZ1667-E1-Z.jpg',
    'PZ1668-P.jpg', 'PZ1668-F.jpg',
    'PZ1669-P.jpg', 'PZ1669-T.jpg', 'PZ1669-I.jpg', 'PZ1669-S-T.jpg', 'PZ1669-SUM1.jpg',
    'PZ1670-P.jpg', 'PZ1670-T.jpg', 'PZ1670-C.jpg'
];

const targetDir = path.join(__dirname, 'public', 'archivos-prueba', 'fotos');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

fotos.forEach(foto => {
    fs.writeFileSync(path.join(targetDir, foto), jpegBuffer);
});

console.log('18 fotos de ejemplo generadas en: ' + targetDir);
