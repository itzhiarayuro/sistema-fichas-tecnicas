# ✅ CHECKLIST: IMPORTACIÓN DE FOTOS

## 🎯 ANTES DE IMPORTAR

### Paso 1: Verifica tu Excel

```
□ ¿Existe el archivo Excel con los pozos?
  └─ Ubicación: [Tu archivo].xlsx

□ ¿Contiene los pozos que vas a fotografiar?
  └─ Ejemplo: M001, M002, PZ1666, etc.

□ ¿Tiene columnas para fotos?
  └─ Ejemplos: FOTO_PRINCIPAL, FOTO_TUBERIA, FOTO_ENTRADA_1, etc.

□ ¿Los IDs de pozos en Excel coinciden con los nombres de fotos?
  └─ Excel: M001
  └─ Fotos: M001-P.jpg, M001-T.jpg, etc.
  └─ ✓ Coinciden
```

### Paso 2: Verifica tus Fotos

```
□ Nomenclatura correcta
  ├─ Patrón: [POZOCODE]-[TIPO].[ext]
  ├─ Ejemplos válidos:
  │  ├─ M001-P.jpg ✓
  │  ├─ M001-T.jpg ✓
  │  ├─ M001-E1-T.jpg ✓
  │  ├─ M001-SUM1.jpg ✓
  │  └─ PZ1666-P.jpg ✓
  └─ Ejemplos inválidos:
     ├─ M001_P.jpg ✗ (guion bajo)
     ├─ M001 P.jpg ✗ (espacio)
     ├─ M001-P (1).jpg ✗ (caracteres extra)
     └─ FOTO_M001.jpg ✗ (orden incorrecto)

□ Extensión válida
  ├─ .jpg ✓
  ├─ .jpeg ✓
  ├─ .png ✓
  ├─ .gif ✓
  ├─ .webp ✓
  └─ Otras: ✗

□ Tamaño de archivo
  ├─ Máximo: 10 MB por archivo
  ├─ Recomendado: < 5 MB
  └─ Verificar: Propiedades del archivo

□ Calidad de imagen
  ├─ Resolución: Mínimo 800x600
  ├─ Formato: RGB o RGBA
  └─ Compresión: Aceptable (no pixelada)

□ Códigos de pozo correctos
  ├─ ¿Existen en tu Excel?
  ├─ Ejemplo: M001 en Excel → M001-P.jpg en fotos
  └─ Verificar: Cada código de pozo
```

### Paso 3: Organiza tus Fotos

```
Estructura recomendada:

Fotos/
├── M001/
│   ├── M001-P.jpg
│   ├── M001-T.jpg
│   ├── M001-I.jpg
│   ├── M001-A.jpg
│   ├── M001-E1-T.jpg
│   ├── M001-E1-Z.jpg
│   ├── M001-E2-T.jpg
│   ├── M001-E2-Z.jpg
│   ├── M001-S-T.jpg
│   └── M001-S-Z.jpg
├── M002/
│   ├── M002-P.jpg
│   ├── M002-T.jpg
│   └── ...
└── PZ1666/
    ├── PZ1666-P.jpg
    ├── PZ1666-T.jpg
    └── ...

Beneficios:
✓ Fácil de verificar
✓ Fácil de encontrar errores
✓ Fácil de actualizar
```

---

## 🚀 DURANTE LA IMPORTACIÓN

### Paso 4: Carga los Archivos

```
□ Abre la página de Upload
  └─ URL: /upload

□ Arrastra o selecciona archivos
  ├─ Opción 1: Arrastra carpeta completa
  ├─ Opción 2: Selecciona múltiples archivos
  └─ Opción 3: Usa el uploader chunked (> 500 archivos)

□ Espera a que se procesen
  ├─ Validación: 1-2 segundos por archivo
  ├─ Compresión: 2-5 segundos por archivo (si > 1 MB)
  ├─ Almacenamiento: 1-2 segundos por archivo
  └─ Total: 4-9 segundos por archivo

□ Revisa el resumen
  ├─ Total de archivos: X
  ├─ Archivos procesados: X
  ├─ Errores: 0
  ├─ Advertencias: Y (revisar)
  └─ Fotos asociadas: Z
```

### Paso 5: Revisa Advertencias

```
Si ves advertencias:

⚠️ "Nomenclatura no reconocida"
  └─ Acción: Revisa el nombre del archivo
  └─ Ejemplo: M001_P.jpg → Cambiar a M001-P.jpg

⚠️ "Pozo no encontrado"
  └─ Acción: Verifica que el pozo existe en Excel
  └─ Ejemplo: M999-P.jpg → ¿Existe M999 en Excel?

⚠️ "Archivo muy grande"
  └─ Acción: Comprime la imagen
  └─ Ejemplo: 15 MB → Reducir a < 10 MB

⚠️ "Extensión no válida"
  └─ Acción: Convierte a formato válido
  └─ Ejemplo: .bmp → Convertir a .jpg
```

### Paso 6: Continúa

```
□ Si no hay errores críticos:
  └─ Haz clic en "Continuar"

□ Si hay errores:
  ├─ Revisa los archivos problemáticos
  ├─ Corrige los nombres
  ├─ Vuelve a cargar
  └─ Intenta de nuevo
```

---

## ✨ DESPUÉS DE LA IMPORTACIÓN

### Paso 7: Valida el Mapeo

```
□ Abre un pozo
  └─ Ejemplo: M001

□ Revisa las fotos
  ├─ ¿Se muestran todas las fotos?
  ├─ ¿Están en la posición correcta?
  ├─ ¿La calidad es aceptable?
  └─ ¿Los nombres coinciden?

□ Verifica cada tipo de foto
  ├─ FOTO_PRINCIPAL: ¿Muestra M001-P.jpg?
  ├─ FOTO_TUBERIA: ¿Muestra M001-T.jpg?
  ├─ FOTO_INTERIOR: ¿Muestra M001-I.jpg?
  ├─ FOTO_ENTRADA_1: ¿Muestra M001-E1-T.jpg?
  └─ ... (y así para cada tipo)

□ Si algo no se ve:
  ├─ Revisa el nombre del archivo
  ├─ Verifica que el pozo existe
  ├─ Comprueba la extensión
  └─ Intenta de nuevo
```

### Paso 8: Genera PDF

```
□ Abre el diseñador
  └─ Selecciona un pozo

□ Genera PDF
  ├─ Haz clic en "Generar PDF"
  ├─ Espera a que se procese
  └─ Descarga el archivo

□ Revisa el PDF
  ├─ ¿Se muestran todas las fotos?
  ├─ ¿Están en la posición correcta?
  ├─ ¿La calidad es aceptable?
  └─ ¿El layout es correcto?

□ Si algo no se ve:
  ├─ Revisa el diseño
  ├─ Verifica que las fotos se importaron
  ├─ Comprueba la nomenclatura
  └─ Intenta de nuevo
```

---

## 🔧 TROUBLESHOOTING

### Problema 1: Foto no aparece en el pozo

```
Síntoma: Importé M001-P.jpg pero no aparece en M001

Causas posibles:
1. ❌ Nombre incorrecto
   └─ Solución: Verifica que sea M001-P.jpg (no M001_P.jpg)

2. ❌ Pozo no existe
   └─ Solución: Verifica que M001 existe en tu Excel

3. ❌ Campo no existe
   └─ Solución: Verifica que existe campo FOTO_PRINCIPAL

4. ❌ Extensión incorrecta
   └─ Solución: Verifica que sea .jpg (no .JPG o .Jpg)

5. ❌ Archivo corrupto
   └─ Solución: Intenta con otra imagen

Pasos para resolver:
1. Revisa el nombre del archivo
2. Verifica que el pozo existe en Excel
3. Comprueba que el campo existe en el diseño
4. Intenta con un archivo diferente
5. Revisa los logs (F12 → Console)
```

### Problema 2: Error "Nomenclatura no reconocida"

```
Síntoma: Veo advertencia "Nomenclatura no reconocida"

Causas posibles:
1. ❌ Formato incorrecto
   └─ Actual: M001_P.jpg
   └─ Correcto: M001-P.jpg

2. ❌ Tipo no reconocido
   └─ Actual: M001-X.jpg
   └─ Correcto: M001-P.jpg (P, T, I, A, F, L, E1-T, S-T, SUM1, etc)

3. ❌ Código de pozo incorrecto
   └─ Actual: M-001-P.jpg
   └─ Correcto: M001-P.jpg

Pasos para resolver:
1. Revisa el patrón: [POZOCODE]-[TIPO].[ext]
2. Verifica que el tipo es válido
3. Comprueba que el código de pozo es correcto
4. Renombra el archivo
5. Intenta de nuevo
```

### Problema 3: Archivo muy grande

```
Síntoma: Error "Archivo excede el límite de 10 MB"

Causas posibles:
1. ❌ Imagen de alta resolución
   └─ Solución: Comprimir a 1200x800 máximo

2. ❌ Formato ineficiente
   └─ Solución: Convertir a JPEG (no PNG)

3. ❌ Múltiples capas
   └─ Solución: Aplanar la imagen

Pasos para resolver:
1. Abre la imagen en un editor (Paint, Photoshop, etc)
2. Reduce la resolución a 1200x800
3. Guarda como JPEG con compresión media
4. Verifica que el tamaño es < 10 MB
5. Intenta de nuevo
```

### Problema 4: Foto borrosa o pixelada

```
Síntoma: La foto se ve borrosa en el PDF

Causas posibles:
1. ❌ Resolución muy baja
   └─ Solución: Usar imagen de mayor resolución

2. ❌ Compresión excesiva
   └─ Solución: Usar calidad más alta

3. ❌ Zoom muy grande
   └─ Solución: Ajustar el tamaño en el diseño

Pasos para resolver:
1. Verifica la resolución original (mínimo 800x600)
2. Intenta con una imagen de mayor resolución
3. Ajusta el tamaño en el diseño
4. Genera PDF de nuevo
5. Revisa la calidad
```

---

## 📋 CHECKLIST FINAL

Antes de dar por completada la importación:

```
□ Todas las fotos tienen nomenclatura correcta
  └─ Patrón: [POZOCODE]-[TIPO].[ext]

□ Todos los códigos de pozo existen en Excel
  └─ Verificado: Cada código

□ Todas las fotos se importaron sin errores
  └─ Errores: 0
  └─ Advertencias: Revisadas

□ Las fotos se asociaron correctamente
  └─ Verificado: Cada pozo

□ Las fotos aparecen en el PDF
  └─ Verificado: Cada tipo de foto

□ La calidad es aceptable
  └─ Resolución: OK
  └─ Compresión: OK
  └─ Claridad: OK

□ El layout es correcto
  └─ Posiciones: OK
  └─ Tamaños: OK
  └─ Espaciado: OK

✅ IMPORTACIÓN COMPLETADA
```

---

## 🎓 TIPS Y TRUCOS

### Tip 1: Batch Rename
```
Si tienes muchas fotos con nombres incorrectos:

Windows:
1. Selecciona todas las fotos
2. Haz clic derecho → Rename
3. Escribe el nuevo nombre (ej: M001-P)
4. Presiona Shift+Enter
5. Windows renombrará automáticamente

Mac/Linux:
1. Usa herramienta de batch rename
2. Ejemplo: rename 's/FOTO_/M001-/g' *.jpg
```

### Tip 2: Validar Nombres
```
Antes de importar, valida los nombres:

Windows PowerShell:
Get-ChildItem *.jpg | ForEach-Object {
  if ($_.Name -match '^[A-Z0-9]+-[A-Z0-9]+\.jpg$') {
    Write-Host "✓ $($_.Name)"
  } else {
    Write-Host "✗ $($_.Name)"
  }
}

Mac/Linux:
for file in *.jpg; do
  if [[ $file =~ ^[A-Z0-9]+-[A-Z0-9]+\.jpg$ ]]; then
    echo "✓ $file"
  else
    echo "✗ $file"
  fi
done
```

### Tip 3: Comprimir Imágenes
```
Si tienes imágenes muy grandes:

Windows:
1. Abre Paint
2. Abre la imagen
3. Resize → Reduce a 1200x800
4. File → Save As → JPEG
5. Guarda con compresión media

Mac:
1. Abre Preview
2. Abre la imagen
3. Tools → Adjust Size → 1200x800
4. File → Export → JPEG
5. Guarda con compresión media

Linux:
convert input.jpg -resize 1200x800 -quality 75 output.jpg
```

---

## 📞 SOPORTE

Si tienes problemas:

1. **Revisa este checklist**
   └─ Probablemente encontrarás la solución

2. **Revisa los logs**
   └─ Abre F12 → Console
   └─ Busca mensajes de error

3. **Revisa la documentación**
   └─ EVALUACION_MAPEO_FOTOS.md
   └─ MAPEO_FOTOS_EJEMPLOS_REALES.md
   └─ DIAGRAMA_FLUJO_MAPEO_FOTOS.md

4. **Contacta soporte**
   └─ Si el problema persiste

---

## ✅ CONCLUSIÓN

Siguiendo este checklist:

✓ Importarás tus fotos correctamente
✓ Se mapearán automáticamente a los pozos
✓ Aparecerán en el PDF en la posición correcta
✓ Tendrás un resultado profesional

**¡Listo para importar!**

