# Ejemplos de Uso - Sistema de Fichas Técnicas

## Archivos incluidos

### 1. Excel: `ejemplo_pozos.xlsx`
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
- `PZ1666-P.jpg` - Foto Panorámica
- `PZ1666-T.jpg` - Foto de la Tapa
- `PZ1666-I.jpg` - Foto Interna
- `PZ1666-A.jpg` - Foto de Acceso

#### Para el pozo PZ1667:
- `PZ1667-P.jpg` - Foto Panorámica
- `PZ1667-T.jpg` - Foto de la Tapa
- `PZ1667-E1-T.jpg` - Foto Entrada 1 (Tubería)
- `PZ1667-E1-Z.jpg` - Foto Entrada 1 (Zona)

#### Para el pozo PZ1668:
- `PZ1668-P.jpg` - Foto Panorámica
- `PZ1668-F.jpg` - Foto de Fondo

#### Para el pozo PZ1669:
- `PZ1669-P.jpg` - Foto Panorámica
- `PZ1669-T.jpg` - Foto de la Tapa
- `PZ1669-I.jpg` - Foto Interna
- `PZ1669-S-T.jpg` - Foto Salida (Tubería)
- `PZ1669-SUM1.jpg` - Foto Sumidero 1

## Flujo de ejemplo paso a paso

### Paso 1: Cargar el Excel
1. Ve a la página de "Cargar Archivos"
2. Arrastra o selecciona `ejemplo_pozos.xlsx`
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
- Estructura de pavimento: Tipo de pavimento superficial
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
- `{CODIGO}-P.jpg` = Panorámica
- `{CODIGO}-T.jpg` = Tapa
- `{CODIGO}-I.jpg` = Interna
- `{CODIGO}-A.jpg` = Acceso
- `{CODIGO}-F.jpg` = Fondo
- `{CODIGO}-M.jpg` = Medición

### Fotos de entradas/salidas:
- `{CODIGO}-E1-T.jpg` = Entrada 1 - Tubería
- `{CODIGO}-E1-Z.jpg` = Entrada 1 - Zona
- `{CODIGO}-E2-T.jpg` = Entrada 2 - Tubería
- `{CODIGO}-S-T.jpg` = Salida - Tubería
- `{CODIGO}-S-Z.jpg` = Salida - Zona

### Fotos de sumideros:
- `{CODIGO}-SUM1.jpg` = Sumidero 1
- `{CODIGO}-SUM2.jpg` = Sumidero 2

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
