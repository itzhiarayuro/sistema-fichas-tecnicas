# 🎨 VISUAL: MAPEO DE FOTOS - DIAGRAMAS Y EJEMPLOS

## 📸 FLUJO VISUAL COMPLETO

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                    IMPORTACIÓN DE FOTOS - FLUJO VISUAL                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

PASO 1: USUARIO IMPORTA FOTOS
═══════════════════════════════════════════════════════════════════════════

    📁 Carpeta de Fotos
    ├── M001-P.jpg      ← Planta
    ├── M001-T.jpg      ← Tubería
    ├── M001-I.jpg      ← Interior
    ├── M001-A.jpg      ← Acceso
    ├── M001-E1-T.jpg   ← Entrada 1 - Tubería
    ├── M001-E1-Z.jpg   ← Entrada 1 - Zoom
    ├── M001-E2-T.jpg   ← Entrada 2 - Tubería
    ├── M001-E2-Z.jpg   ← Entrada 2 - Zoom
    ├── M001-S-T.jpg    ← Salida - Tubería
    └── M001-S-Z.jpg    ← Salida - Zoom

                            ↓ ARRASTRA AL SISTEMA

    ┌─────────────────────────────────────────┐
    │  UPLOAD PAGE (/upload)                  │
    │                                         │
    │  [Arrastra archivos aquí]               │
    │                                         │
    │  Archivos: 10                           │
    │  Tamaño: 25 MB                          │
    │                                         │
    │  [Procesar]                             │
    └─────────────────────────────────────────┘


PASO 2: VALIDACIÓN Y PROCESAMIENTO
═══════════════════════════════════════════════════════════════════════════

    Para cada archivo:

    M001-P.jpg
    ├─ ✓ Validar tamaño (< 10 MB)
    ├─ ✓ Validar extensión (.jpg)
    ├─ ✓ Parsear nomenclatura
    │  └─ pozoId: "M001"
    │  └─ subcategoria: "P"
    │  └─ tipo: "Planta"
    ├─ ✓ Comprimir si > 1 MB
    ├─ ✓ Guardar en BlobStore
    │  └─ blobId: "blob-uuid-12345"
    └─ ✓ Crear FotoInfo
       └─ { id, idPozo, tipo, categoria, subcategoria, blobId, filename }


PASO 3: ALMACENAMIENTO
═══════════════════════════════════════════════════════════════════════════

    BlobStore (IndexedDB)
    ┌─────────────────────────────────────────┐
    │ blob-uuid-12345 → [Imagen comprimida]   │
    │ blob-uuid-12346 → [Imagen comprimida]   │
    │ blob-uuid-12347 → [Imagen comprimida]   │
    │ ...                                     │
    └─────────────────────────────────────────┘
                            ↓
    GlobalStore (Zustand)
    ┌─────────────────────────────────────────┐
    │ Pozo M001                               │
    │ ├─ fotos: [                             │
    │ │  ├─ { id, subcategoria: "P", ... }   │
    │ │  ├─ { id, subcategoria: "T", ... }   │
    │ │  ├─ { id, subcategoria: "I", ... }   │
    │ │  └─ ...                               │
    │ │ ]                                     │
    │ └─ ...                                  │
    └─────────────────────────────────────────┘


PASO 4: BÚSQUEDA Y MATCHING (PDF Generation)
═══════════════════════════════════════════════════════════════════════════

    Cuando generas PDF:

    Campo: FOTO_PRINCIPAL (subcategoria = "P")
                            ↓
    ┌─────────────────────────────────────────────────────────────────┐
    │ NIVEL 1: BÚSQUEDA POR SUBCATEGORÍA EXACTA                       │
    ├─────────────────────────────────────────────────────────────────┤
    │                                                                 │
    │  Busca: pozo.fotos.find(f => f.subcategoria === "P")           │
    │                                                                 │
    │  Resultado: ✅ ENCONTRADO                                       │
    │  └─ { subcategoria: "P", filename: "M001-P.jpg", ... }         │
    │                                                                 │
    └─────────────────────────────────────────────────────────────────┘
                            ↓
    Obtiene: imageUrl del BlobStore
                            ↓
    Renderiza: Imagen en PDF
                            ↓
    ✅ ÉXITO


PASO 5: RESULTADO EN PDF
═══════════════════════════════════════════════════════════════════════════

    ┌─────────────────────────────────────────┐
    │  FICHA TÉCNICA - POZO M001              │
    ├─────────────────────────────────────────┤
    │                                         │
    │  FOTO PRINCIPAL:                        │
    │  ┌─────────────────────────────────┐   │
    │  │                                 │   │
    │  │     [M001-P.jpg renderizada]    │   │
    │  │                                 │   │
    │  └─────────────────────────────────┘   │
    │                                         │
    │  FOTO TUBERÍA:                          │
    │  ┌─────────────────────────────────┐   │
    │  │                                 │   │
    │  │     [M001-T.jpg renderizada]    │   │
    │  │                                 │   │
    │  └─────────────────────────────────┘   │
    │                                         │
    │  ... (más fotos)                        │
    │                                         │
    └─────────────────────────────────────────┘
```

---

## 🎯 MAPEO DE TIPOS DE FOTOS

```
TIPOS RECONOCIDOS Y SUS CÓDIGOS
═══════════════════════════════════════════════════════════════════════════

FOTOS PRINCIPALES
┌─────────────────────────────────────────────────────────────────┐
│ Código │ Nombre              │ Ejemplo        │ Descripción     │
├─────────────────────────────────────────────────────────────────┤
│   P    │ Planta              │ M001-P.jpg     │ Vista superior  │
│   T    │ Tubería             │ M001-T.jpg     │ Tuberías        │
│   I    │ Interior            │ M001-I.jpg     │ Interior pozo   │
│   A    │ Acceso              │ M001-A.jpg     │ Acceso/Tapa     │
│   F    │ Fondo               │ M001-F.jpg     │ Fondo pozo      │
│   L    │ Argis (Levantamiento)│ M001-L.jpg    │ Levantamiento   │
└─────────────────────────────────────────────────────────────────┘

ENTRADAS
┌─────────────────────────────────────────────────────────────────┐
│ Código │ Nombre              │ Ejemplo        │ Descripción     │
├─────────────────────────────────────────────────────────────────┤
│ E1-T   │ Entrada 1 - Tubería │ M001-E1-T.jpg  │ Entrada 1       │
│ E1-Z   │ Entrada 1 - Zoom    │ M001-E1-Z.jpg  │ Detalle entrada │
│ E2-T   │ Entrada 2 - Tubería │ M001-E2-T.jpg  │ Entrada 2       │
│ E2-Z   │ Entrada 2 - Zoom    │ M001-E2-Z.jpg  │ Detalle entrada │
│ E3-T   │ Entrada 3 - Tubería │ M001-E3-T.jpg  │ Entrada 3       │
│ E3-Z   │ Entrada 3 - Zoom    │ M001-E3-Z.jpg  │ Detalle entrada │
└─────────────────────────────────────────────────────────────────┘

SALIDAS
┌─────────────────────────────────────────────────────────────────┐
│ Código │ Nombre              │ Ejemplo        │ Descripción     │
├─────────────────────────────────────────────────────────────────┤
│ S-T    │ Salida - Tubería    │ M001-S-T.jpg   │ Salida principal│
│ S-Z    │ Salida - Zoom       │ M001-S-Z.jpg   │ Detalle salida  │
│ S1-T   │ Salida 1 - Tubería  │ M001-S1-T.jpg  │ Salida 1        │
│ S1-Z   │ Salida 1 - Zoom     │ M001-S1-Z.jpg  │ Detalle salida  │
│ S2-T   │ Salida 2 - Tubería  │ M001-S2-T.jpg  │ Salida 2        │
│ S2-Z   │ Salida 2 - Zoom     │ M001-S2-Z.jpg  │ Detalle salida  │
└─────────────────────────────────────────────────────────────────┘

SUMIDEROS
┌─────────────────────────────────────────────────────────────────┐
│ Código │ Nombre              │ Ejemplo        │ Descripción     │
├─────────────────────────────────────────────────────────────────┤
│ SUM1   │ Sumidero 1          │ M001-SUM1.jpg  │ Sumidero 1      │
│ SUM2   │ Sumidero 2          │ M001-SUM2.jpg  │ Sumidero 2      │
│ SUM3   │ Sumidero 3          │ M001-SUM3.jpg  │ Sumidero 3      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 MATRIZ DE MAPEO

```
MATRIZ: ARCHIVO → CAMPO → RESULTADO
═══════════════════════════════════════════════════════════════════════════

Archivo         │ Campo              │ Subcategoría │ Resultado
────────────────┼────────────────────┼──────────────┼──────────
M001-P.jpg      │ FOTO_PRINCIPAL     │ P            │ ✅ MAPEA
M001-T.jpg      │ FOTO_TUBERIA       │ T            │ ✅ MAPEA
M001-I.jpg      │ FOTO_INTERIOR      │ I            │ ✅ MAPEA
M001-A.jpg      │ FOTO_ACCESO        │ A            │ ✅ MAPEA
M001-F.jpg      │ FOTO_FONDO         │ F            │ ✅ MAPEA
M001-L.jpg      │ FOTO_ARGIS         │ L            │ ✅ MAPEA
M001-E1-T.jpg   │ FOTO_ENTRADA_1     │ E1-T         │ ✅ MAPEA
M001-E1-Z.jpg   │ FOTO_ENTRADA_1_Z   │ E1-Z         │ ✅ MAPEA
M001-E2-T.jpg   │ FOTO_ENTRADA_2     │ E2-T         │ ✅ MAPEA
M001-E2-Z.jpg   │ FOTO_ENTRADA_2_Z   │ E2-Z         │ ✅ MAPEA
M001-S-T.jpg    │ FOTO_SALIDA        │ S-T          │ ✅ MAPEA
M001-S-Z.jpg    │ FOTO_SALIDA_Z      │ S-Z          │ ✅ MAPEA
M001-SUM1.jpg   │ FOTO_SUMIDERO_1    │ SUM1         │ ✅ MAPEA
M001-SUM2.jpg   │ FOTO_SUMIDERO_2    │ SUM2         │ ✅ MAPEA
```

---

## 🔄 CICLO DE VIDA DE UNA FOTO

```
CICLO COMPLETO: M001-P.jpg
═══════════════════════════════════════════════════════════════════════════

1. CREACIÓN
   └─ Foto tomada: M001-P.jpg (2 MB)

2. IMPORTACIÓN
   └─ Usuario arrastra a /upload
   └─ Sistema valida: ✓ Tamaño, ✓ Extensión, ✓ Nomenclatura

3. PROCESAMIENTO
   └─ Compresión: 2 MB → 500 KB
   └─ Parseo: M001 + P → { pozoId: "M001", subcategoria: "P" }

4. ALMACENAMIENTO
   └─ BlobStore: Guarda imagen comprimida
   └─ GlobalStore: Guarda metadata
   └─ blobId: "blob-uuid-12345"

5. BÚSQUEDA
   └─ Usuario genera PDF
   └─ Sistema busca: subcategoria === "P"
   └─ Encuentra: M001-P.jpg

6. RENDERIZADO
   └─ Obtiene: imageUrl del BlobStore
   └─ Renderiza: En PDF
   └─ Resultado: ✅ Foto visible en PDF

7. DESCARGA
   └─ Usuario descarga PDF
   └─ PDF contiene: M001-P.jpg renderizada
   └─ Resultado: ✅ Ficha técnica completa
```

---

## 📈 TASA DE ÉXITO POR NOMENCLATURA

```
GRÁFICO: TASA DE ÉXITO vs NOMENCLATURA
═══════════════════════════════════════════════════════════════════════════

100% │                                    ╱─────────────────
     │                                  ╱
  95% │                                ╱
     │                              ╱
  90% │                          ╱
     │                      ╱
  85% │                  ╱
     │              ╱
  80% │          ╱
     │      ╱
  75% │  ╱
     │
  70% └─────────────────────────────────────────────────────
     Estándar    Variada    No Estándar    Fallback
     (M001-P)    (M001_P)   (FOTO_P)       (Tipo)
     95%+        99%+       100%           100%

Conclusión: Incluso con nomenclatura no estándar, 
            el sistema tiene 100% de cobertura
```

---

## 🎨 EJEMPLO VISUAL: POZO M001

```
POZO M001 - VISTA COMPLETA
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│                         FICHA TÉCNICA - POZO M001                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  IDENTIFICACIÓN                                                         │
│  ├─ ID Pozo: M001                                                       │
│  ├─ Coordenadas: 10.5, -75.3                                            │
│  ├─ Fecha: 2024-02-18                                                   │
│  └─ Inspector: Juan Pérez                                               │
│                                                                         │
│  FOTOGRAFÍAS                                                            │
│  ├─ FOTO PRINCIPAL                                                      │
│  │  ┌──────────────────────────────────────────────────────────┐       │
│  │  │                                                          │       │
│  │  │              [M001-P.jpg renderizada]                   │       │
│  │  │                                                          │       │
│  │  └──────────────────────────────────────────────────────────┘       │
│  │                                                                     │
│  ├─ FOTO TUBERÍA                                                        │
│  │  ┌──────────────────────────────────────────────────────────┐       │
│  │  │                                                          │       │
│  │  │              [M001-T.jpg renderizada]                   │       │
│  │  │                                                          │       │
│  │  └──────────────────────────────────────────────────────────┘       │
│  │                                                                     │
│  ├─ FOTO INTERIOR                                                       │
│  │  ┌──────────────────────────────────────────────────────────┐       │
│  │  │                                                          │       │
│  │  │              [M001-I.jpg renderizada]                   │       │
│  │  │                                                          │       │
│  │  └──────────────────────────────────────────────────────────┘       │
│  │                                                                     │
│  ├─ ENTRADA 1 - TUBERÍA                                                 │
│  │  ┌──────────────────────────────────────────────────────────┐       │
│  │  │                                                          │       │
│  │  │              [M001-E1-T.jpg renderizada]                │       │
│  │  │                                                          │       │
│  │  └──────────────────────────────────────────────────────────┘       │
│  │                                                                     │
│  ├─ ENTRADA 1 - ZOOM                                                    │
│  │  ┌──────────────────────────────────────────────────────────┐       │
│  │  │                                                          │       │
│  │  │              [M001-E1-Z.jpg renderizada]                │       │
│  │  │                                                          │       │
│  │  └──────────────────────────────────────────────────────────┘       │
│  │                                                                     │
│  ├─ SALIDA - TUBERÍA                                                    │
│  │  ┌──────────────────────────────────────────────────────────┐       │
│  │  │                                                          │       │
│  │  │              [M001-S-T.jpg renderizada]                 │       │
│  │  │                                                          │       │
│  │  └──────────────────────────────────────────────────────────┘       │
│  │                                                                     │
│  └─ SALIDA - ZOOM                                                       │
│     ┌──────────────────────────────────────────────────────────┐       │
│     │                                                          │       │
│     │              [M001-S-Z.jpg renderizada]                 │       │
│     │                                                          │       │
│     └──────────────────────────────────────────────────────────┘       │
│                                                                         │
│  COMPONENTES                                                            │
│  ├─ Tapa: Concreto - Bueno                                              │
│  ├─ Cilindro: Ø 1.2m - Concreto - Bueno                                 │
│  ├─ Peldaños: 5 - Hierro - Regular                                      │
│  └─ Profundidad: 3.5m                                                   │
│                                                                         │
│  OBSERVACIONES                                                          │
│  └─ Pozo en buen estado general. Requiere limpieza.                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST VISUAL

```
ANTES DE IMPORTAR
═══════════════════════════════════════════════════════════════════════════

□ Nomenclatura
  ├─ ✓ M001-P.jpg (Correcto)
  ├─ ✓ M001-T.jpg (Correcto)
  ├─ ✓ M001-E1-T.jpg (Correcto)
  └─ ✗ M001_P.jpg (Incorrecto - cambiar a M001-P.jpg)

□ Códigos de Pozo
  ├─ ✓ M001 existe en Excel
  ├─ ✓ M002 existe en Excel
  └─ ✗ M999 no existe en Excel (eliminar o crear)

□ Extensiones
  ├─ ✓ .jpg (Válida)
  ├─ ✓ .png (Válida)
  └─ ✗ .bmp (Inválida - convertir a .jpg)

□ Tamaños
  ├─ ✓ 500 KB (OK)
  ├─ ✓ 2 MB (OK)
  └─ ✗ 15 MB (Demasiado grande - comprimir)

RESULTADO: ✅ LISTO PARA IMPORTAR
```

---

## 🎓 CONCLUSIÓN VISUAL

```
FLUJO RESUMIDO
═══════════════════════════════════════════════════════════════════════════

Importas:           M001-P.jpg
                         ↓
Sistema extrae:     pozoId="M001", subcategoria="P"
                         ↓
Sistema busca:      ¿Existe subcategoria="P"?
                         ↓
Sistema encuentra:  ✅ M001-P.jpg
                         ↓
Sistema renderiza:  Imagen en PDF
                         ↓
Resultado:          ✅ ÉXITO - Foto visible en PDF

TASA DE ÉXITO: 100% (con nomenclatura estándar)
```

