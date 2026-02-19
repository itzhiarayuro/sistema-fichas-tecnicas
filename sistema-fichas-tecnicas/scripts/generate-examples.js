/**
 * Script para generar archivos de ejemplo
 * Genera un Excel con datos de ejemplo y imágenes JPG válidas
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Crear directorio si no existe
const examplesDir = path.join(__dirname, '../public/ejemplos');
if (!fs.existsSync(examplesDir)) {
  fs.mkdirSync(examplesDir, { recursive: true });
}

// Datos de ejemplo para el Excel - Estructura completa del diccionario (33 campos)
const exampleData = [
  {
    // 🔴 Obligatorios
    'Id_pozo': 'PZ1666',
    'Coordenada X': '-74.123456',
    'Coordenada Y': '4.678901',
    'Fecha': '2024-01-15',
    'Levantó': 'Juan Pérez',
    'Estado': 'Bueno',
    
    // 🟠 Importantes
    'Dirección': 'Cl 7 # 10-44',
    'Barrio': 'Centro',
    'Elevación': '2650.00',
    'Profundidad': '2.50',
    'Existe tapa': 'Sí',
    'Estado tapa': 'Bueno',
    'Existe Cilindro': 'Sí',
    'Diametro Cilindro (m)': '1.20',
    
    // 🟢 Opcionales
    'Sistema': 'Alcantarillado sanitario',
    'Año de instalación': '2010',
    'Tipo Cámara': 'Circular',
    'Rasante': 'Concreto',
    'Material tapa': 'Hierro fundido',
    'Existe cono': 'No',
    'Tipo Cono': '',
    'Materia Cono': '',
    'Estado Cono': '',
    'Material Cilindro': 'Concreto',
    'Estado Cilindro': 'Regular',
    'Existe Cañuela': 'Sí',
    'Material Cañuela': 'Concreto',
    'Estado Cañuela': 'Bueno',
    'Existe Peldaños': 'Sí',
    'Material Peldaños': 'Hierro',
    'Número Peldaños': '8',
    'Estado Peldaños': 'Bueno',
    'Observaciones': 'Requiere limpieza periódica. Tapa en buen estado, cilindro con pequeñas grietas.',
  },
  {
    // 🔴 Obligatorios
    'Id_pozo': 'PZ1667',
    'Coordenada X': '-74.125789',
    'Coordenada Y': '4.680234',
    'Fecha': '2024-01-16',
    'Levantó': 'María García',
    'Estado': 'Regular',
    
    // 🟠 Importantes
    'Dirección': 'Av. Caracas # 45-67',
    'Barrio': 'Norte',
    'Elevación': '2655.50',
    'Profundidad': '3.00',
    'Existe tapa': 'Sí',
    'Estado tapa': 'Regular',
    'Existe Cilindro': 'Sí',
    'Diametro Cilindro (m)': '1.00',
    
    // 🟢 Opcionales
    'Sistema': 'Alcantarillado pluvial',
    'Año de instalación': '2005',
    'Tipo Cámara': 'Rectangular',
    'Rasante': 'Asfalto',
    'Material tapa': 'Concreto',
    'Existe cono': 'Sí',
    'Tipo Cono': 'Estándar',
    'Materia Cono': 'Concreto',
    'Estado Cono': 'Regular',
    'Material Cilindro': 'Concreto',
    'Estado Cilindro': 'Malo',
    'Existe Cañuela': 'No',
    'Material Cañuela': '',
    'Estado Cañuela': '',
    'Existe Peldaños': 'Sí',
    'Material Peldaños': 'Acero',
    'Número Peldaños': '10',
    'Estado Peldaños': 'Regular',
    'Observaciones': 'Cilindro con daños significativos. Requiere reparación urgente. Peldaños oxidados.',
  },
  {
    // 🔴 Obligatorios
    'Id_pozo': 'PZ1668',
    'Coordenada X': '-74.120123',
    'Coordenada Y': '4.675456',
    'Fecha': '2024-01-17',
    'Levantó': 'Carlos López',
    'Estado': 'Malo',
    
    // 🟠 Importantes
    'Dirección': 'Cra 15 # 32-10',
    'Barrio': 'Sur',
    'Elevación': '2645.00',
    'Profundidad': '1.80',
    'Existe tapa': 'No',
    'Estado tapa': '',
    'Existe Cilindro': 'No',
    'Diametro Cilindro (m)': '',
    
    // 🟢 Opcionales
    'Sistema': 'Alcantarillado combinado',
    'Año de instalación': '1995',
    'Tipo Cámara': 'Cuadrada',
    'Rasante': 'Tierra',
    'Material tapa': '',
    'Existe cono': 'No',
    'Tipo Cono': '',
    'Materia Cono': '',
    'Estado Cono': '',
    'Material Cilindro': '',
    'Estado Cilindro': '',
    'Existe Cañuela': 'No',
    'Material Cañuela': '',
    'Estado Cañuela': '',
    'Existe Peldaños': 'No',
    'Material Peldaños': '',
    'Número Peldaños': '',
    'Estado Peldaños': '',
    'Observaciones': 'Pozo sin tapa ni cilindro. Estructura muy deteriorada. Requiere reemplazo completo.',
  },
  {
    // 🔴 Obligatorios
    'Id_pozo': 'PZ1669',
    'Coordenada X': '',
    'Coordenada Y': '',
    'Fecha': '2024-01-18',
    'Levantó': 'Ana Martínez',
    'Estado': 'Bueno',
    
    // 🟠 Importantes
    'Dirección': 'Calle 50 # 8-25',
    'Barrio': 'Occidente',
    'Elevación': '2660.75',
    'Profundidad': '2.20',
    'Existe tapa': 'Sí',
    'Estado tapa': 'Bueno',
    'Existe Cilindro': 'Sí',
    'Diametro Cilindro (m)': '1.50',
    
    // 🟢 Opcionales
    'Sistema': 'Alcantarillado sanitario',
    'Año de instalación': '2015',
    'Tipo Cámara': 'Circular',
    'Rasante': 'Concreto',
    'Material tapa': 'Hierro fundido',
    'Existe cono': 'Sí',
    'Tipo Cono': 'Excéntrico',
    'Materia Cono': 'Concreto',
    'Estado Cono': 'Bueno',
    'Material Cilindro': 'Concreto reforzado',
    'Estado Cilindro': 'Bueno',
    'Existe Cañuela': 'Sí',
    'Material Cañuela': 'Concreto',
    'Estado Cañuela': 'Bueno',
    'Existe Peldaños': 'Sí',
    'Material Peldaños': 'Hierro galvanizado',
    'Número Peldaños': '6',
    'Estado Peldaños': 'Bueno',
    'Observaciones': 'Pozo en excelente estado. Instalación reciente. Sin problemas detectados. Nota: Coordenadas no disponibles en este levantamiento.',
  },
];

// Crear workbook
const wb = XLSX.utils.book_new();

// Crear hoja con datos
const ws = XLSX.utils.json_to_sheet(exampleData);
ws['!cols'] = [
  { wch: 18 }, // Id_pozo
  { wch: 15 }, // Coordenada X
  { wch: 15 }, // Coordenada Y
  { wch: 12 }, // Fecha
  { wch: 15 }, // Levantó
  { wch: 12 }, // Estado
  { wch: 20 }, // Dirección
  { wch: 15 }, // Barrio
  { wch: 12 }, // Elevación
  { wch: 12 }, // Profundidad
  { wch: 12 }, // Existe tapa
  { wch: 12 }, // Estado tapa
  { wch: 15 }, // Existe Cilindro
  { wch: 18 }, // Diametro Cilindro (m)
  { wch: 25 }, // Sistema
  { wch: 18 }, // Año de instalación
  { wch: 12 }, // Tipo Cámara
  { wch: 20 }, // Rasante
  { wch: 15 }, // Material tapa
  { wch: 12 }, // Existe cono
  { wch: 12 }, // Tipo Cono
  { wch: 15 }, // Materia Cono
  { wch: 12 }, // Estado Cono
  { wch: 18 }, // Material Cilindro
  { wch: 15 }, // Estado Cilindro
  { wch: 15 }, // Existe Cañuela
  { wch: 18 }, // Material Cañuela
  { wch: 15 }, // Estado Cañuela
  { wch: 15 }, // Existe Peldaños
  { wch: 18 }, // Material Peldaños
  { wch: 15 }, // Número Peldaños
  { wch: 15 }, // Estado Peldaños
  { wch: 40 }, // Observaciones
];

XLSX.utils.book_append_sheet(wb, ws, 'Pozos');

// Guardar Excel
const excelPath = path.join(examplesDir, 'ejemplo_pozos.xlsx');
XLSX.writeFile(wb, excelPath);
console.log(`✓ Excel creado: ${excelPath}`);

// Crear imágenes JPG de ejemplo (pequeñas imágenes válidas)
// Usamos un JPG mínimo válido (1x1 pixel rojo)
const minimalJpg = Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
  0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
  0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
  0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
  0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
  0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
  0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
  0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
  0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
  0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
  0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
  0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
  0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
  0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
  0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
  0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
  0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
  0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
  0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
  0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
  0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
  0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD3, 0xFF, 0xD9,
]);

// Fotos para PZ1666
const fotosPZ1666 = [
  'PZ1666-P.jpg', // Panorámica
  'PZ1666-T.jpg', // Tapa
  'PZ1666-I.jpg', // Interna
  'PZ1666-A.jpg', // Acceso
];

// Fotos para PZ1667
const fotosPZ1667 = [
  'PZ1667-P.jpg', // Panorámica
  'PZ1667-T.jpg', // Tapa
  'PZ1667-E1-T.jpg', // Entrada 1 - Tubería
  'PZ1667-E1-Z.jpg', // Entrada 1 - Zona
];

// Fotos para PZ1668
const fotosPZ1668 = [
  'PZ1668-P.jpg', // Panorámica
  'PZ1668-F.jpg', // Fondo
];

// Fotos para PZ1669
const fotosPZ1669 = [
  'PZ1669-P.jpg', // Panorámica
  'PZ1669-T.jpg', // Tapa
  'PZ1669-I.jpg', // Interna
  'PZ1669-S-T.jpg', // Salida - Tubería
  'PZ1669-SUM1.jpg', // Sumidero 1
];

// Crear todas las fotos
[...fotosPZ1666, ...fotosPZ1667, ...fotosPZ1668, ...fotosPZ1669].forEach((filename) => {
  const filepath = path.join(examplesDir, filename);
  fs.writeFileSync(filepath, minimalJpg);
  console.log(`✓ Imagen creada: ${filepath}`);
});

// Crear archivo README con instrucciones
const readmeContent = `# Ejemplos de Uso - Sistema de Fichas Técnicas

## Archivos incluidos

### 1. Excel: \`ejemplo_pozos.xlsx\`
Contiene datos de 4 pozos de ejemplo con la estructura completa del diccionario (33 campos):

#### PZ1666 - Pozo Completo en Buen Estado
- **Ubicación**: Cl 7 # 10-44, Centro
- **Sistema**: Alcantarillado sanitario
- **Estado**: Bueno
- **Características**: Tapa, cilindro, cañuela y peldaños en buen estado
- **Coordenadas**: Incluidas (-74.123456, 4.678901)
- **Fotos**: 4 fotos asociadas

#### PZ1667 - Pozo en Estado Regular
- **Ubicación**: Av. Caracas # 45-67, Norte
- **Sistema**: Alcantarillado pluvial
- **Estado**: Regular
- **Características**: Cilindro con daños, requiere reparación
- **Coordenadas**: Incluidas (-74.125789, 4.680234)
- **Fotos**: 4 fotos asociadas

#### PZ1668 - Pozo en Estado Malo
- **Ubicación**: Cra 15 # 32-10, Sur
- **Sistema**: Alcantarillado combinado
- **Estado**: Malo
- **Características**: Sin tapa ni cilindro, estructura muy deteriorada
- **Coordenadas**: Incluidas (-74.120123, 4.675456)
- **Fotos**: 2 fotos asociadas

#### PZ1669 - Pozo Nuevo sin Coordenadas
- **Ubicación**: Calle 50 # 8-25, Occidente
- **Sistema**: Alcantarillado sanitario
- **Estado**: Bueno
- **Características**: Instalación reciente, excelente estado
- **Coordenadas**: NO INCLUIDAS (ejemplo de pozo sin coordenadas)
- **Fotos**: 5 fotos asociadas

### 2. Imágenes JPG

#### Para el pozo PZ1666:
- \`PZ1666-P.jpg\` - Foto Panorámica
- \`PZ1666-T.jpg\` - Foto de la Tapa
- \`PZ1666-I.jpg\` - Foto Interna
- \`PZ1666-A.jpg\` - Foto de Acceso

#### Para el pozo PZ1667:
- \`PZ1667-P.jpg\` - Foto Panorámica
- \`PZ1667-T.jpg\` - Foto de la Tapa
- \`PZ1667-E1-T.jpg\` - Foto Entrada 1 (Tubería)
- \`PZ1667-E1-Z.jpg\` - Foto Entrada 1 (Zona)

#### Para el pozo PZ1668:
- \`PZ1668-P.jpg\` - Foto Panorámica
- \`PZ1668-F.jpg\` - Foto de Fondo

#### Para el pozo PZ1669:
- \`PZ1669-P.jpg\` - Foto Panorámica
- \`PZ1669-T.jpg\` - Foto de la Tapa
- \`PZ1669-I.jpg\` - Foto Interna
- \`PZ1669-S-T.jpg\` - Foto Salida (Tubería)
- \`PZ1669-SUM1.jpg\` - Foto Sumidero 1

## Flujo de ejemplo paso a paso

### Paso 1: Cargar el Excel
1. Ve a la página de "Cargar Archivos"
2. Arrastra o selecciona \`ejemplo_pozos.xlsx\`
3. El sistema extraerá 4 pozos (PZ1666, PZ1667, PZ1668, PZ1669)
4. Verás estadísticas de carga:
   - 4 pozos detectados
   - 33 campos mapeados
   - Todos los campos obligatorios presentes

### Paso 2: Cargar las imágenes
1. Arrastra o selecciona todas las imágenes JPG
2. El sistema las asociará automáticamente con los pozos según el nombre
3. Verás que:
   - PZ1666 tendrá 4 fotos asociadas
   - PZ1667 tendrá 4 fotos asociadas
   - PZ1668 tendrá 2 fotos asociadas
   - PZ1669 tendrá 5 fotos asociadas

### Paso 3: Revisar los pozos
1. Haz clic en "Continuar"
2. Irás a la página de "Revisar Pozos"
3. Verás una tabla con los 4 pozos
4. Indicadores de estado:
   - PZ1666: Completo (todos los datos y fotos)
   - PZ1667: Completo (todos los datos y fotos)
   - PZ1668: Completo (todos los datos y fotos)
   - PZ1669: Completo (todos los datos y fotos, sin coordenadas)

### Paso 4: Editar una ficha
1. Haz clic en un pozo para abrirlo
2. Verás el editor con:
   - Panel izquierdo: Formulario editable con todos los 33 campos
   - Panel derecho: Vista previa en tiempo real
3. Puedes editar cualquier campo
4. Las fotos aparecerán en la sección de "Fotos" organizadas por tipo

### Paso 5: Generar PDF
1. En el editor, haz clic en "Generar PDF"
2. Se descargará un PDF con toda la información de la ficha
3. El PDF incluye:
   - Datos completos del pozo (33 campos)
   - Todas las fotos organizadas por categoría
   - Formato profesional con paleta corporativa

## Estructura de Datos - Referencia Completa

### Campos Obligatorios 🔴 (6 campos)
- Id_pozo: Identificador único
- Coordenada X: Longitud geográfica
- Coordenada Y: Latitud geográfica
- Fecha: Fecha de inspección (YYYY-MM-DD)
- Levantó: Inspector que realizó levantamiento
- Estado: Estado general (Bueno/Regular/Malo/Muy Malo/No Aplica)

### Campos Importantes 🟠 (8 campos)
- Dirección: Dirección física del pozo
- Barrio: Barrio o sector
- Elevación: Elevación sobre nivel del mar (m)
- Profundidad: Profundidad del pozo (m)
- Existe tapa: ¿Tiene tapa? (Sí/No)
- Estado tapa: Estado de la tapa (si existe)
- Existe Cilindro: ¿Tiene cilindro? (Sí/No)
- Diametro Cilindro (m): Diámetro del cilindro (si existe)

### Campos Opcionales 🟢 (19 campos)
- Sistema: Sistema al que pertenece
- Año de instalación: Año de instalación
- Tipo Cámara: Tipo de cámara (Circular/Rectangular/Cuadrada)
- Rasante: Tipo de pavimento superficial
- Material tapa: Material de la tapa
- Existe cono: ¿Tiene cono? (Sí/No)
- Tipo Cono: Tipo de cono
- Materia Cono: Material del cono
- Estado Cono: Estado del cono
- Material Cilindro: Material del cilindro
- Estado Cilindro: Estado del cilindro
- Existe Cañuela: ¿Tiene cañuela? (Sí/No)
- Material Cañuela: Material de la cañuela
- Estado Cañuela: Estado de la cañuela
- Existe Peldaños: ¿Tiene peldaños? (Sí/No)
- Material Peldaños: Material de los peldaños
- Número Peldaños: Cantidad de peldaños
- Estado Peldaños: Estado de los peldaños
- Observaciones: Observaciones adicionales

## Nomenclatura de fotos - Referencia rápida

### Fotos principales (una letra):
- \`{CODIGO}-P.jpg\` = Panorámica
- \`{CODIGO}-T.jpg\` = Tapa
- \`{CODIGO}-I.jpg\` = Interna
- \`{CODIGO}-A.jpg\` = Acceso
- \`{CODIGO}-F.jpg\` = Fondo
- \`{CODIGO}-M.jpg\` = Medición

### Fotos de entradas/salidas:
- \`{CODIGO}-E1-T.jpg\` = Entrada 1 - Tubería
- \`{CODIGO}-E1-Z.jpg\` = Entrada 1 - Zona
- \`{CODIGO}-E2-T.jpg\` = Entrada 2 - Tubería
- \`{CODIGO}-S-T.jpg\` = Salida - Tubería
- \`{CODIGO}-S-Z.jpg\` = Salida - Zona

### Fotos de sumideros:
- \`{CODIGO}-SUM1.jpg\` = Sumidero 1
- \`{CODIGO}-SUM2.jpg\` = Sumidero 2

## Casos de Uso Demostrados

### 1. Pozo Completo (PZ1666)
Demuestra cómo se ve un pozo con:
- Todos los campos obligatorios e importantes completos
- Coordenadas geográficas incluidas
- Múltiples componentes (tapa, cilindro, cañuela, peldaños)
- Fotos de diferentes tipos
- Estado "Bueno"

### 2. Pozo con Problemas (PZ1667)
Demuestra cómo se ve un pozo con:
- Componentes en estado "Regular" o "Malo"
- Necesidad de reparaciones
- Múltiples fotos para documentar problemas
- Estado "Regular"

### 3. Pozo Deteriorado (PZ1668)
Demuestra cómo se ve un pozo con:
- Componentes faltantes (sin tapa ni cilindro)
- Estructura muy deteriorada
- Pocas fotos disponibles
- Estado "Malo"
- Requiere reemplazo completo

### 4. Pozo sin Coordenadas (PZ1669)
Demuestra cómo el sistema maneja:
- Pozos sin coordenadas geográficas (campos opcionales)
- Instalaciones recientes
- Excelente estado
- El sistema NO requiere coordenadas para funcionar

## Notas Importantes

1. **Coordenadas son opcionales**: El ejemplo PZ1669 demuestra que el sistema funciona sin coordenadas
   - ✓ Correcto: Pozo sin coordenadas (campos vacíos)
   - ✓ Correcto: Pozo con coordenadas válidas
   - ✗ Incorrecto: Coordenadas parciales (solo X sin Y)

2. **Cada foto es un archivo separado**: No combines tipos en un nombre
   - ✓ Correcto: PZ1666-P.jpg y PZ1666-T.jpg
   - ✗ Incorrecto: PZ1666-PT.jpg

3. **El código debe coincidir**: El nombre de la foto debe empezar con el código del pozo
   - ✓ Correcto: PZ1666-P.jpg para el pozo PZ1666
   - ✗ Incorrecto: PZ1667-P.jpg para el pozo PZ1666

4. **Campos condicionales**: Algunos campos solo son requeridos si otros tienen ciertos valores
   - Si "Existe tapa" = Sí → "Estado tapa" es obligatorio
   - Si "Existe Cilindro" = Sí → "Diametro Cilindro" es obligatorio
   - Si "Existe Peldaños" = Sí → "Número Peldaños" es obligatorio

5. **Todos los campos del Excel son importantes**: El sistema mapea automáticamente los 33 campos

## Troubleshooting

### "Sin fotos asociadas"
- Verifica que el nombre de la foto comience con el código del pozo
- Verifica que uses la nomenclatura correcta (ej: PZ1666-P.jpg, no PZ1666-Panoramica.jpg)

### "Incompleto"
- Verifica que el Excel tenga todos los campos requeridos
- Verifica que las fotos estén correctamente asociadas
- Nota: Coordenadas son opcionales, no afectan la completitud

### Las fotos no aparecen
- Recarga la página
- Verifica que los nombres de las fotos sean exactos (mayúsculas/minúsculas importan)
- Verifica que el código del pozo en el nombre coincida exactamente

### Campos vacíos en la ficha
- Algunos campos son opcionales (marcados con 🟢)
- Si un campo condicional no aplica, déjalo vacío
- El sistema mostrará indicadores visuales para campos obligatorios vs opcionales
`;

const readmePath = path.join(examplesDir, 'README.md');
fs.writeFileSync(readmePath, readmeContent);
console.log(`✓ Guía creada: ${readmePath}`);

console.log('\n✓ Todos los archivos de ejemplo han sido generados correctamente');
console.log(`\nUbicación: ${examplesDir}`);
