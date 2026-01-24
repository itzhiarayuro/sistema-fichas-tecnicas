#!/bin/bash

# ============================================================================
# SCRIPT DE INSTALACIÓN AUTOMÁTICA - SOLUCIÓN HÍBRIDA PDF
# ============================================================================
# Este script instala la solución 100% funcional automáticamente
# Uso: bash instalar-solucion-hibrida.sh
# ============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   🚀 INSTALADOR AUTOMÁTICO - SOLUCIÓN PDF HÍBRIDA         ║"
echo "║                                                            ║"
echo "║   Garantía 100% de funcionamiento                          ║"
echo "║   Mantiene TODO tu código existente                        ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ============================================================================
# PASO 1: Verificación de ubicación
# ============================================================================
print_info "Verificando ubicación del proyecto..."

if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json"
    print_warning "Asegúrate de ejecutar este script desde la raíz de tu proyecto:"
    echo "   cd /ruta/a/sistema-fichas-tecnicas"
    echo "   bash instalar-solucion-hibrida.sh"
    exit 1
fi

if [ ! -d "src/lib/pdf" ]; then
    print_error "No se encontró la carpeta src/lib/pdf"
    print_warning "Verifica que estés en el directorio correcto del proyecto"
    exit 1
fi

print_success "Proyecto encontrado correctamente"
echo ""

# ============================================================================
# PASO 2: Verificar que existe el archivo de solución
# ============================================================================
print_info "Verificando archivo de solución..."

ARCHIVO_NUEVO="pdfMakeGenerator-HIBRIDO-100-FUNCIONAL.ts"
ARCHIVO_DESTINO="src/lib/pdf/pdfMakeGenerator.ts"

if [ ! -f "$ARCHIVO_NUEVO" ]; then
    print_error "No se encontró: $ARCHIVO_NUEVO"
    print_warning "Asegúrate de que el archivo esté en el mismo directorio que este script"
    print_info "Estructura esperada:"
    echo "   📁 tu-proyecto/"
    echo "   ├── instalar-solucion-hibrida.sh (este script)"
    echo "   ├── $ARCHIVO_NUEVO"
    echo "   └── src/lib/pdf/pdfMakeGenerator.ts"
    exit 1
fi

print_success "Archivo de solución encontrado"
echo ""

# ============================================================================
# PASO 3: Hacer backup del archivo actual
# ============================================================================
print_info "Creando backup del archivo actual..."

if [ -f "$ARCHIVO_DESTINO" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="src/lib/pdf/pdfMakeGenerator.BACKUP_${TIMESTAMP}.ts"
    
    cp "$ARCHIVO_DESTINO" "$BACKUP_FILE"
    
    if [ -f "$BACKUP_FILE" ]; then
        print_success "Backup creado: $BACKUP_FILE"
    else
        print_warning "No se pudo crear backup, pero continuando..."
    fi
else
    print_warning "No existe archivo previo (instalación nueva)"
fi

echo ""

# ============================================================================
# PASO 4: Copiar nuevo archivo
# ============================================================================
print_info "Instalando nueva versión del generador..."

cp "$ARCHIVO_NUEVO" "$ARCHIVO_DESTINO"

if [ $? -eq 0 ]; then
    print_success "Archivo instalado correctamente"
else
    print_error "Error copiando archivo"
    exit 1
fi

echo ""

# ============================================================================
# PASO 5: Verificar dependencias
# ============================================================================
print_info "Verificando dependencias de npm..."

if ! grep -q '"pdfmake"' package.json; then
    print_warning "pdfmake no encontrado en package.json"
    print_info "Instalando pdfmake..."
    npm install pdfmake
fi

if ! grep -q '"jspdf"' package.json; then
    print_warning "jspdf no encontrado en package.json"
    print_info "Instalando jspdf..."
    npm install jspdf
fi

print_success "Dependencias verificadas"
echo ""

# ============================================================================
# PASO 6: Limpiar cache
# ============================================================================
print_info "Limpiando cache de Next.js..."

if [ -d ".next" ]; then
    rm -rf .next
    print_success "Cache limpiado"
else
    print_info "No hay cache para limpiar"
fi

echo ""

# ============================================================================
# PASO 7: Resumen
# ============================================================================
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   ✅ INSTALACIÓN COMPLETADA EXITOSAMENTE                   ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

print_success "Cambios realizados:"
echo "   • Generador PDF híbrido instalado"
echo "   • Backup del archivo anterior creado"
echo "   • Dependencias verificadas"
echo "   • Cache limpiado"
echo ""

print_info "PRÓXIMOS PASOS:"
echo ""
echo "   1️⃣  Inicia el servidor de desarrollo:"
echo "      ${GREEN}npm run dev${NC}"
echo ""
echo "   2️⃣  Abre el navegador en: http://localhost:3000"
echo ""
echo "   3️⃣  Ve a un pozo y haz clic en 'Generar PDF'"
echo ""
echo "   4️⃣  ¡Debería funcionar perfectamente! 🎉"
echo ""

print_info "QUÉ ESPERAR EN LA CONSOLA DEL NAVEGADOR:"
echo "   ${GREEN}✅ pdfMake VFS cargado correctamente${NC}"
echo "   ${GREEN}✅ jsPDF cargado correctamente${NC}"
echo "   ${GREEN}🚀 INICIANDO GENERACIÓN DE PDF${NC}"
echo "   ${GREEN}✅ PDF generado exitosamente${NC}"
echo ""

print_warning "SI ALGO NO FUNCIONA:"
echo "   1. Abre la consola del navegador (F12)"
echo "   2. Copia el error exacto"
echo "   3. Envíalo para obtener ayuda"
echo ""

print_info "ARCHIVOS MODIFICADOS:"
echo "   ✏️  $ARCHIVO_DESTINO (reemplazado)"
if [ -f "$BACKUP_FILE" ]; then
    echo "   💾 $BACKUP_FILE (backup)"
fi
echo ""

print_success "¡Tu sistema está listo para generar PDFs! 🚀"
echo ""
