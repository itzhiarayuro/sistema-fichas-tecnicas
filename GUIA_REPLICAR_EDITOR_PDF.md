# Guía Completa: Cómo Replicar el Editor con Generación de PDF

## 📋 Índice
1. [Arquitectura General](#arquitectura-general)
2. [Funciones Clave](#funciones-clave)
3. [Archivos Necesarios](#archivos-necesarios)
4. [Comandos y Setup](#comandos-y-setup)
5. [Flujo de Datos](#flujo-de-datos)
6. [Ejemplos de Código](#ejemplos-de-código)

---

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    EDITOR PAGE                              │
│  src/app/editor/[id]/page.tsx                               │
│  - Carga datos del pozo                                     │
│  - Renderiza secciones editables                            │
│  - Maneja generación de PDF                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│  COMPONENTES     │  │  TOOLBAR         │
│  - Identificación│  │  - Botón PDF     │
│  - Estructura    │  │  - Botón Guardar │
│  - Tuberías      │  │  - Botón Volver  │
│  - Fotos         │  └──────────────────┘
│  - Observaciones │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  API ROUTE: /api/pdf                 │
│  - Valida fotos                      │
│  - Genera PDF                        │
│  - Retorna blob descargable          │
└──────────────────────────────────────┘
```

---

## 🔧 Funciones Clave

### 1. **Manejo Seguro de Datos Opcionales**

```typescript
// ❌ ANTES: Acceso directo (puede fallar)
const fotos = pozo.fotos.principal;

// ✅ DESPUÉS: Operador de coalescencia nula
const fotos = pozo.fotos?.principal || [];
```

**Dónde se usa:**
- `src/app/editor/[id]/page.tsx` líneas 307-327
- Cualquier lugar donde accedas a propiedades que podrían ser undefined

---

### 2. **Validación de Datos Antes de Acción**

```typescript
// Contar fotos disponibles
const fotosCount = (
  (fotosData.principal?.length || 0) +
  (fotosData.entradas?.length || 0) +
  (fotosData.salidas?.length || 0) +
  (fotosData.sumideros?.length || 0) +
  (fotosData.otras?.length || 0)
);

// Validar antes de proceder
if (fotosCount === 0) {
  addToast({
    type: 'error',
    message: 'No se puede generar PDF: la ficha no tiene fotos asociadas.',
    duration: 5000,
  });
  return;
}
```

**Dónde se usa:**
- `src/app/editor/[id]/page.tsx` líneas 528-545
- `src/app/api/pdf/route.ts` líneas 19-32

---

### 3. **Llamada a API con Manejo de Errores**

```typescript
try {
  const response = await fetch('/api/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ficha: syncedState,
      pozo,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    addToast({
      type: 'error',
      message: error.error || 'Error al generar PDF',
      duration: 5000,
    });
    return;
  }

  // Procesar respuesta...
} catch (error) {
  console.error('Error:', error);
  addToast({
    type: 'error',
    message: 'Error al generar PDF. Por favor, intenta de nuevo.',
    duration: 5000,
  });
}
```

**Dónde se usa:**
- `src/app/editor/[id]/page.tsx` líneas 546-585

---

### 4. **Descarga de Archivo Blob**

```typescript
// Convertir respuesta a blob
const blob = await response.blob();

// Crear URL temporal
const url = URL.createObjectURL(blob);

// Crear elemento de descarga
const a = document.createElement('a');
a.href = url;
a.download = `ficha-${pozo.idPozo?.value || 'tecnica'}.pdf`;

// Descargar
document.body.appendChild(a);
a.click();
document.body.removeChild(a);

// Limpiar
URL.revokeObjectURL(url);
```

**Dónde se usa:**
- `src/app/editor/[id]/page.tsx` líneas 560-575

---

### 5. **Cambio de Estado Visual (Badges)**

```typescript
// Cambiar de "Incompleto" a "Advertencias"
if (fotosCount === 0) {
  warnings.push('Sin fotos asociadas');  // ✅ Advertencia
  // NO: issues.push('Sin fotos asociadas');  // ❌ Problema
}

// Determinar estado
if (issues.length > 0) return 'incomplete';
if (warnings.length > 0) return 'warning';
return 'complete';
```

**Dónde se usa:**
- `src/components/pozos/PozoStatusBadge.tsx` líneas 48-52, 88-92

---

## 📁 Archivos Necesarios

### Estructura Mínima Requerida

```
src/
├── app/
│   ├── editor/
│   │   ├── [id]/
│   │   │   └── page.tsx          ⭐ EDITOR PRINCIPAL
│   │   └── page.tsx              (selector de pozo)
│   ├── api/
│   │   └── pdf/
│   │       └── route.ts          ⭐ API DE GENERACIÓN
│   └── pozos/
│       └── page.tsx              (lista de pozos)
├── components/
│   ├── editor/
│   │   ├── ToolBar.tsx           ⭐ BOTONES DE ACCIÓN
│   │   ├── FotosSection.tsx      (sección de fotos)
│   │   ├── ImageGrid.tsx         (grid de imágenes)
│   │   └── ImageEditor.tsx       (editor de imagen)
│   ├── pozos/
│   │   └── PozoStatusBadge.tsx   ⭐ INDICADOR DE ESTADO
│   └── ui/
│       └── Toast.tsx             (notificaciones)
├── lib/
│   ├── pdf/
│   │   └── pdfGenerator.ts       (generador de PDF)
│   └── helpers/
│       └── pozoAccessor.ts       (acceso a datos)
├── stores/
│   ├── globalStore.ts            (estado global)
│   └── uiStore.ts                (estado de UI)
└── types/
    ├── pozo.ts                   (tipos de datos)
    └── ficha.ts                  (tipos de ficha)
```

### Archivos Críticos (⭐)

| Archivo | Propósito | Líneas Clave |
|---------|-----------|-------------|
| `editor/[id]/page.tsx` | Renderiza editor y maneja PDF | 307-327, 528-585 |
| `api/pdf/route.ts` | Valida y genera PDF | 19-32, 58-75 |
| `ToolBar.tsx` | Botón de generar PDF | 40-41, 128-132, 275-280 |
| `PozoStatusBadge.tsx` | Muestra estado (completo/advertencias/incompleto) | 48-52, 88-92 |

---

## 🚀 Comandos y Setup

### 1. **Instalación de Dependencias**

```bash
# Next.js (ya incluido en proyecto)
npm install next@latest

# PDF generation
npm install jspdf canvas

# UI/Toast notifications
npm install react-hot-toast  # O tu librería preferida

# Drag & drop (opcional, para fotos)
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 2. **Estructura de Carpetas**

```bash
# Crear estructura de carpetas
mkdir -p src/app/editor/[id]
mkdir -p src/app/api/pdf
mkdir -p src/components/editor
mkdir -p src/lib/pdf
mkdir -p src/stores
mkdir -p src/types
```

### 3. **Configuración de TypeScript**

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "jsxImportSource": "react",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 4. **Comandos de Desarrollo**

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Producción
npm start

# Linting
npm run lint

# Type checking
npx tsc --noEmit
```

---

## 📊 Flujo de Datos

### Flujo 1: Cargar Editor

```
1. Usuario navega a /editor/[id]
   ↓
2. page.tsx obtiene pozoId de params
   ↓
3. useGlobalStore.getPozoById(pozoId)
   ↓
4. Renderiza componentes con datos del pozo
   ↓
5. FotosSection recibe: pozo.fotos?.principal || []
   ↓
6. ImageGrid renderiza fotos (o vacío si no hay)
```

### Flujo 2: Generar PDF

```
1. Usuario hace clic en "Generar PDF"
   ↓
2. onGeneratePDF() valida fotosCount
   ↓
3. Si fotosCount === 0 → mostrar error y retornar
   ↓
4. Si fotosCount > 0 → fetch('/api/pdf', {...})
   ↓
5. API valida nuevamente fotosCount
   ↓
6. Si válido → PDFGenerator.generatePDF()
   ↓
7. Retorna blob
   ↓
8. Cliente descarga blob como archivo
```

### Flujo 3: Cambiar Estado Visual

```
1. getPozoStatus(pozo) se ejecuta
   ↓
2. Cuenta fotos: fotosCount = 0
   ↓
3. Si fotosCount === 0 → warnings.push('Sin fotos')
   ↓
4. Si issues.length > 0 → return 'incomplete'
   ↓
5. Si warnings.length > 0 → return 'warning'
   ↓
6. PozoStatusBadge renderiza con color amarillo
```

---

## 💻 Ejemplos de Código

### Ejemplo 1: Componente Editor Mínimo

```typescript
// src/app/editor/[id]/page.tsx (VERSIÓN SIMPLIFICADA)

'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useGlobalStore, useUIStore } from '@/stores';

export default function EditorPage() {
  const params = useParams();
  const pozoId = params.id as string;
  
  // Obtener pozo del store
  const pozo = useGlobalStore((state) => state.getPozoById(pozoId));
  const addToast = useUIStore((state) => state.addToast);
  
  // Datos de fotos seguros
  const fotosData = useMemo(() => {
    if (!pozo) return { principal: [], entradas: [], salidas: [], sumideros: [], otras: [] };
    return {
      principal: pozo.fotos?.principal || [],
      entradas: pozo.fotos?.entradas || [],
      salidas: pozo.fotos?.salidas || [],
      sumideros: pozo.fotos?.sumideros || [],
      otras: pozo.fotos?.otras || [],
    };
  }, [pozo]);
  
  // Generar PDF
  const handleGeneratePDF = async () => {
    // Validar fotos
    const fotosCount = (
      (fotosData.principal?.length || 0) +
      (fotosData.entradas?.length || 0) +
      (fotosData.salidas?.length || 0) +
      (fotosData.sumideros?.length || 0) +
      (fotosData.otras?.length || 0)
    );

    if (fotosCount === 0) {
      addToast({
        type: 'error',
        message: 'No se puede generar PDF: carga al menos una foto',
        duration: 5000,
      });
      return;
    }

    try {
      // Llamar API
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ficha: {}, pozo }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      // Descargar
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha-${pozo.idPozo?.value}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        message: 'PDF generado exitosamente',
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al generar PDF',
        duration: 5000,
      });
    }
  };

  if (!pozo) return <div>Pozo no encontrado</div>;

  return (
    <div>
      <h1>Editar Ficha: {pozo.idPozo?.value}</h1>
      
      {/* Secciones editables aquí */}
      
      <button onClick={handleGeneratePDF}>
        Generar PDF
      </button>
    </div>
  );
}
```

### Ejemplo 2: API Route Mínima

```typescript
// src/app/api/pdf/route.ts (VERSIÓN SIMPLIFICADA)

import { NextRequest, NextResponse } from 'next/server';
import { PDFGenerator } from '@/lib/pdf';
import type { Pozo } from '@/types/pozo';

interface PDFRequestBody {
  ficha: any;
  pozo: Pozo;
}

export async function POST(request: NextRequest) {
  try {
    const body: PDFRequestBody = await request.json();
    
    if (!body.ficha || !body.pozo) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    const { ficha, pozo } = body;

    // ✅ VALIDACIÓN CLAVE: Verificar fotos
    const fotosCount = (
      (pozo.fotos?.principal?.length || 0) +
      (pozo.fotos?.entradas?.length || 0) +
      (pozo.fotos?.salidas?.length || 0) +
      (pozo.fotos?.sumideros?.length || 0) +
      (pozo.fotos?.otras?.length || 0)
    );

    if (fotosCount === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No se puede generar PDF: carga al menos una foto' 
        },
        { status: 400 }
      );
    }

    // Generar PDF
    const generator = new PDFGenerator();
    const result = await generator.generatePDF(ficha, pozo);

    if (!result.success || !result.blob) {
      return NextResponse.json(
        { success: false, error: result.error || 'Error al generar PDF' },
        { status: 500 }
      );
    }

    // Retornar como descarga
    const arrayBuffer = await result.blob.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error('Error en /api/pdf:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

### Ejemplo 3: Status Badge

```typescript
// src/components/pozos/PozoStatusBadge.tsx (VERSIÓN SIMPLIFICADA)

import { Pozo } from '@/types/pozo';

type StatusType = 'complete' | 'incomplete' | 'warning';

export function getPozoStatus(pozo: Pozo): StatusType {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Validar campos obligatorios
  if (!pozo.idPozo?.value) issues.push('Código faltante');
  if (!pozo.direccion?.value) issues.push('Dirección faltante');
  
  // ✅ CAMBIO CLAVE: Fotos como advertencia, no problema
  const fotosCount = (
    (pozo.fotos?.principal?.length || 0) +
    (pozo.fotos?.entradas?.length || 0) +
    (pozo.fotos?.salidas?.length || 0) +
    (pozo.fotos?.sumideros?.length || 0) +
    (pozo.fotos?.otras?.length || 0)
  );

  if (fotosCount === 0) {
    warnings.push('Sin fotos asociadas');  // ✅ Advertencia
  }

  // Determinar estado
  if (issues.length > 0) return 'incomplete';
  if (warnings.length > 0) return 'warning';
  return 'complete';
}

export function PozoStatusBadge({ pozo }: { pozo: Pozo }) {
  const status = getPozoStatus(pozo);
  
  const colors = {
    complete: 'bg-green-50 text-green-700',
    incomplete: 'bg-red-50 text-red-700',
    warning: 'bg-yellow-50 text-yellow-700',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status]}`}>
      {status === 'complete' ? '✅ Completo' : 
       status === 'incomplete' ? '❌ Incompleto' : 
       '⚠️ Advertencias'}
    </span>
  );
}
```

---

## 🎯 Checklist de Implementación

- [ ] Crear estructura de carpetas
- [ ] Instalar dependencias (jsPDF, canvas)
- [ ] Crear tipos de datos (Pozo, FichaState)
- [ ] Crear store global (useGlobalStore)
- [ ] Crear store de UI (useUIStore)
- [ ] Implementar editor page con manejo seguro de fotos
- [ ] Implementar API route con validación
- [ ] Implementar ToolBar con botón de PDF
- [ ] Implementar PozoStatusBadge
- [ ] Implementar Toast notifications
- [ ] Probar flujo completo
- [ ] Agregar manejo de errores
- [ ] Documentar API

---

## 🔍 Debugging Tips

### Problema: "Editor no se pudo cargar"
```typescript
// ❌ Causa: Acceso directo a propiedad undefined
const fotos = pozo.fotos.principal;

// ✅ Solución: Usar operador de coalescencia
const fotos = pozo.fotos?.principal || [];
```

### Problema: PDF no se descarga
```typescript
// ✅ Verificar que:
1. response.ok === true
2. blob.size > 0
3. URL.createObjectURL(blob) funciona
4. a.click() se ejecuta
5. URL.revokeObjectURL(url) se ejecuta después
```

### Problema: Validación no funciona
```typescript
// ✅ Verificar que:
1. fotosCount se calcula correctamente
2. Comparación es === 0 (no < 1)
3. Toast se muestra antes de return
4. API también valida
```

---

## 📚 Referencias

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [jsPDF Documentation](https://github.com/parallax/jsPDF)
- [Blob API](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
- [Optional Chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)
- [Nullish Coalescing](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)

