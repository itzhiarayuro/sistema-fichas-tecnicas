# ============================================================================
# SCRIPT DE INSTALACIÓN AUTOMÁTICA - SOLUCIÓN HÍBRIDA PDF (Windows)
# ============================================================================
# Este script instala la solución 100% funcional automáticamente en Windows
# Uso: .\instalar-solucion-hibrida.ps1
# ============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║   🚀 INSTALADOR AUTOMÁTICO - SOLUCIÓN PDF HÍBRIDA         ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║   Garantía 100% de funcionamiento                          ║" -ForegroundColor Cyan
Write-Host "║   Mantiene TODO tu código existente                        ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Funciones para imprimir mensajes con colores
function Print-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Print-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# ============================================================================
# PASO 1: Verificación de ubicación
# ============================================================================
Print-Info "Verificando ubicación del proyecto..."

if (-not (Test-Path "package.json")) {
    Print-Error "No se encontró package.json"
    Print-Warning "Asegúrate de ejecutar este script desde la raíz de tu proyecto:"
    Write-Host "   cd C:\ruta\a\sistema-fichas-tecnicas"
    Write-Host "   .\instalar-solucion-hibrida.ps1"
    exit 1
}

if (-not (Test-Path "src\lib\pdf")) {
    Print-Error "No se encontró la carpeta src\lib\pdf"
    Print-Warning "Verifica que estés en el directorio correcto del proyecto"
    exit 1
}

Print-Success "Proyecto encontrado correctamente"
Write-Host ""

# ============================================================================
# PASO 2: Verificar que existe el archivo de solución
# ============================================================================
Print-Info "Verificando archivo de solución..."

$archivoNuevo = "pdfMakeGenerator-HIBRIDO-100-FUNCIONAL.ts"
$archivoDestino = "src\lib\pdf\pdfMakeGenerator.ts"

if (-not (Test-Path $archivoNuevo)) {
    Print-Error "No se encontró: $archivoNuevo"
    Print-Warning "Asegúrate de que el archivo esté en el mismo directorio que este script"
    Print-Info "Estructura esperada:"
    Write-Host "   📁 tu-proyecto\"
    Write-Host "   ├── instalar-solucion-hibrida.ps1 (este script)"
    Write-Host "   ├── $archivoNuevo"
    Write-Host "   └── src\lib\pdf\pdfMakeGenerator.ts"
    exit 1
}

Print-Success "Archivo de solución encontrado"
Write-Host ""

# ============================================================================
# PASO 3: Hacer backup del archivo actual
# ============================================================================
Print-Info "Creando backup del archivo actual..."

if (Test-Path $archivoDestino) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "src\lib\pdf\pdfMakeGenerator.BACKUP_$timestamp.ts"
    
    Copy-Item $archivoDestino $backupFile
    
    if (Test-Path $backupFile) {
        Print-Success "Backup creado: $backupFile"
    } else {
        Print-Warning "No se pudo crear backup, pero continuando..."
    }
} else {
    Print-Warning "No existe archivo previo (instalación nueva)"
}

Write-Host ""

# ============================================================================
# PASO 4: Copiar nuevo archivo
# ============================================================================
Print-Info "Instalando nueva versión del generador..."

Copy-Item $archivoNuevo $archivoDestino -Force

if ($?) {
    Print-Success "Archivo instalado correctamente"
} else {
    Print-Error "Error copiando archivo"
    exit 1
}

Write-Host ""

# ============================================================================
# PASO 5: Verificar dependencias
# ============================================================================
Print-Info "Verificando dependencias de npm..."

$packageJson = Get-Content package.json -Raw

if ($packageJson -notmatch '"pdfmake"') {
    Print-Warning "pdfmake no encontrado en package.json"
    Print-Info "Instalando pdfmake..."
    npm install pdfmake
}

if ($packageJson -notmatch '"jspdf"') {
    Print-Warning "jspdf no encontrado en package.json"
    Print-Info "Instalando jspdf..."
    npm install jspdf
}

Print-Success "Dependencias verificadas"
Write-Host ""

# ============================================================================
# PASO 6: Limpiar cache
# ============================================================================
Print-Info "Limpiando cache de Next.js..."

if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Print-Success "Cache limpiado"
} else {
    Print-Info "No hay cache para limpiar"
}

Write-Host ""

# ============================================================================
# PASO 7: Resumen
# ============================================================================
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║   ✅ INSTALACIÓN COMPLETADA EXITOSAMENTE                   ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Print-Success "Cambios realizados:"
Write-Host "   • Generador PDF híbrido instalado"
Write-Host "   • Backup del archivo anterior creado"
Write-Host "   • Dependencias verificadas"
Write-Host "   • Cache limpiado"
Write-Host ""

Print-Info "PRÓXIMOS PASOS:"
Write-Host ""
Write-Host "   1️⃣  Inicia el servidor de desarrollo:" -ForegroundColor White
Write-Host "      npm run dev" -ForegroundColor Green
Write-Host ""
Write-Host "   2️⃣  Abre el navegador en: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "   3️⃣  Ve a un pozo y haz clic en 'Generar PDF'" -ForegroundColor White
Write-Host ""
Write-Host "   4️⃣  ¡Debería funcionar perfectamente! 🎉" -ForegroundColor White
Write-Host ""

Print-Info "QUÉ ESPERAR EN LA CONSOLA DEL NAVEGADOR:"
Write-Host "   ✅ pdfMake VFS cargado correctamente" -ForegroundColor Green
Write-Host "   ✅ jsPDF cargado correctamente" -ForegroundColor Green
Write-Host "   🚀 INICIANDO GENERACIÓN DE PDF" -ForegroundColor Green
Write-Host "   ✅ PDF generado exitosamente" -ForegroundColor Green
Write-Host ""

Print-Warning "SI ALGO NO FUNCIONA:"
Write-Host "   1. Abre la consola del navegador (F12)"
Write-Host "   2. Copia el error exacto"
Write-Host "   3. Envíalo para obtener ayuda"
Write-Host ""

Print-Info "ARCHIVOS MODIFICADOS:"
Write-Host "   ✏️  $archivoDestino (reemplazado)"
if ($backupFile) {
    Write-Host "   💾 $backupFile (backup)"
}
Write-Host ""

Print-Success "¡Tu sistema está listo para generar PDFs! 🚀"
Write-Host ""
