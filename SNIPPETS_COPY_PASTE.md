# Snippets Copy & Paste - Código Listo para Usar

## 📋 Tabla de Contenidos
1. [Acceso Seguro a Datos](#acceso-seguro-a-datos)
2. [Validación de Fotos](#validación-de-fotos)
3. [Generación de PDF](#generación-de-pdf)
4. [Descarga de Archivo](#descarga-de-archivo)
5. [Status Badge](#status-badge)
6. [Toast Notifications](#toast-notifications)
7. [Componentes Completos](#componentes-completos)

---

## 🔐 Acceso Seguro a Datos

### Snippet 1: Acceso a Propiedades Opcionales

```typescript
// ✅ COPIAR Y PEGAR
const fotosData = useMemo(() => {
  if (!pozo) {
    return {
      principal: [],
      entradas: [],
      salidas: [],
      sumideros: [],
      otras: [],
    };
  }
  return {
    principal: pozo.fotos?.principal || [],
    entradas: pozo.fotos?.entradas || [],
    salidas: pozo.fotos?.salidas || [],
    sumideros: pozo.fotos?.sumideros || [],
    otras: pozo.fotos?.otras || [],
  };
}, [pozo]);
```

**Uso:** En cualquier componente que acceda a `pozo.fotos`

---

### Snippet 2: Acceso a Valores Anidados

```typescript
// ✅ COPIAR Y PEGAR
const idPozo = pozo?.idPozo?.value || 'sin-id';
const direccion = pozo?.direccion?.value || 'sin-dirección';
const estado = pozo?.estado?.value || 'desconocido';

// O más compacto:
const getFieldValue = (field: any) => field?.value || '';
const id = getFieldValue(pozo?.idPozo);
```

**Uso:** Cuando necesites extraer valores de objetos anidados

---

## ✅ Validación de Fotos

### Snippet 3: Contar Fotos

```typescript
// ✅ COPIAR Y PEGAR
const fotosCount = (
  (fotosData.principal?.length || 0) +
  (fotosData.entradas?.length || 0) +
  (fotosData.salidas?.length || 0) +
  (fotosData.sumideros?.length || 0) +
  (fotosData.otras?.length || 0)
);

console.log(`Total de fotos: ${fotosCount}`);
```

**Uso:** Antes de cualquier acción que requiera fotos

---

### Snippet 4: Validar Fotos con Mensaje

```typescript
// ✅ COPIAR Y PEGAR
const validarFotos = (fotosData: any): boolean => {
  const fotosCount = (
    (fotosData.principal?.length || 0) +
    (fotosData.entradas?.length || 0) +
    (fotosData.salidas?.length || 0) +
    (fotosData.sumideros?.length || 0) +
    (fotosData.otras?.length || 0)
  );

  if (fotosCount === 0) {
    console.warn('⚠️ No hay fotos asociadas');
    return false;
  }

  console.log(`✅ ${fotosCount} fotos encontradas`);
  return true;
};

// Uso:
if (!validarFotos(fotosData)) {
  return;
}
```

**Uso:** Crear función reutilizable para validación

---

## 📄 Generación de PDF

### Snippet 5: Llamada a API de PDF

```typescript
// ✅ COPIAR Y PEGAR
const generarPDF = async (ficha: any, pozo: any) => {
  try {
    const response = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ficha,
        pozo,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error desconocido');
    }

    return await response.blob();
  } catch (error) {
    console.error('Error generando PDF:', error);
    throw error;
  }
};

// Uso:
try {
  const blob = await generarPDF(fichaState, pozo);
  // Procesar blob...
} catch (error) {
  console.error(error);
}
```

**Uso:** Función reutilizable para generar PDF

---

### Snippet 6: API Route Completa

```typescript
// ✅ COPIAR Y PEGAR
// src/app/api/pdf/route.ts

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
    
    // Validar datos requeridos
    if (!body.ficha || !body.pozo) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    const { ficha, pozo } = body;

    // ✅ VALIDACIÓN CLAVE
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
        'Content-Length': arrayBuffer.byteLength.toString(),
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

**Uso:** Copiar completo a `src/app/api/pdf/route.ts`

---

## 💾 Descarga de Archivo

### Snippet 7: Descargar Blob como PDF

```typescript
// ✅ COPIAR Y PEGAR
const descargarPDF = (blob: Blob, nombreArchivo: string) => {
  // Crear URL temporal
  const url = URL.createObjectURL(blob);

  // Crear elemento de descarga
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;

  // Agregar al DOM (necesario en algunos navegadores)
  document.body.appendChild(a);

  // Simular clic
  a.click();

  // Limpiar
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log(`✅ Descargado: ${nombreArchivo}`);
};

// Uso:
const blob = await response.blob();
descargarPDF(blob, `ficha-${pozo.idPozo?.value}.pdf`);
```

**Uso:** Función reutilizable para descargar cualquier blob

---

### Snippet 8: Descargar con Validación

```typescript
// ✅ COPIAR Y PEGAR
const descargarPDFSeguro = async (
  ficha: any,
  pozo: any,
  onSuccess?: () => void,
  onError?: (error: string) => void
) => {
  try {
    // Validar fotos
    const fotosCount = (
      (pozo.fotos?.principal?.length || 0) +
      (pozo.fotos?.entradas?.length || 0) +
      (pozo.fotos?.salidas?.length || 0) +
      (pozo.fotos?.sumideros?.length || 0) +
      (pozo.fotos?.otras?.length || 0)
    );

    if (fotosCount === 0) {
      onError?.('No hay fotos asociadas');
      return;
    }

    // Generar PDF
    const response = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ficha, pozo }),
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

    onSuccess?.();
  } catch (error) {
    onError?.(error instanceof Error ? error.message : 'Error desconocido');
  }
};

// Uso:
descargarPDFSeguro(
  fichaState,
  pozo,
  () => console.log('✅ PDF descargado'),
  (error) => console.error(`❌ ${error}`)
);
```

**Uso:** Función completa con validación y callbacks

---

## 🎨 Status Badge

### Snippet 9: Función getPozoStatus

```typescript
// ✅ COPIAR Y PEGAR
export function getPozoStatus(pozo: any): 'complete' | 'incomplete' | 'warning' {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Validar campos obligatorios
  if (!pozo.idPozo?.value) issues.push('Código faltante');
  if (!pozo.direccion?.value) issues.push('Dirección faltante');
  
  // ✅ CLAVE: Fotos como advertencia
  const fotosCount = (
    (pozo.fotos?.principal?.length || 0) +
    (pozo.fotos?.entradas?.length || 0) +
    (pozo.fotos?.salidas?.length || 0) +
    (pozo.fotos?.sumideros?.length || 0) +
    (pozo.fotos?.otras?.length || 0)
  );

  if (fotosCount === 0) {
    warnings.push('Sin fotos asociadas');
  }

  // Determinar estado
  if (issues.length > 0) return 'incomplete';
  if (warnings.length > 0) return 'warning';
  return 'complete';
}
```

**Uso:** Copiar a `src/components/pozos/PozoStatusBadge.tsx`

---

### Snippet 10: Componente PozoStatusBadge

```typescript
// ✅ COPIAR Y PEGAR
export function PozoStatusBadge({ pozo }: { pozo: any }) {
  const status = getPozoStatus(pozo);
  
  const config = {
    complete: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      label: '✅ Completo',
    },
    incomplete: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      label: '❌ Incompleto',
    },
    warning: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      label: '⚠️ Advertencias',
    },
  };

  const { bg, text, label } = config[status];

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}
```

**Uso:** Componente visual para mostrar estado

---

## 🔔 Toast Notifications

### Snippet 11: Toast de Error

```typescript
// ✅ COPIAR Y PEGAR
addToast({
  type: 'error',
  message: 'No se puede generar PDF: la ficha no tiene fotos asociadas.',
  duration: 5000,
});
```

**Uso:** Mostrar error cuando faltan fotos

---

### Snippet 12: Toast de Éxito

```typescript
// ✅ COPIAR Y PEGAR
addToast({
  type: 'success',
  message: 'PDF generado y descargado exitosamente',
  duration: 3000,
});
```

**Uso:** Confirmar descarga exitosa

---

### Snippet 13: Toast de Advertencia

```typescript
// ✅ COPIAR Y PEGAR
addToast({
  type: 'warning',
  message: 'Esta ficha tiene advertencias: sin fotos asociadas',
  duration: 4000,
});
```

**Uso:** Alertar sobre problemas no críticos

---

## 🧩 Componentes Completos

### Snippet 14: Editor Mínimo Funcional

```typescript
// ✅ COPIAR Y PEGAR
// src/app/editor/[id]/page.tsx

'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useGlobalStore, useUIStore } from '@/stores';

export default function EditorPage() {
  const params = useParams();
  const pozoId = params.id as string;
  
  const pozo = useGlobalStore((state) => state.getPozoById(pozoId));
  const addToast = useUIStore((state) => state.addToast);
  
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
  
  const handleGeneratePDF = async () => {
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
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ficha: {}, pozo }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Editar: {pozo.idPozo?.value}</h1>
      
      {/* Secciones editables aquí */}
      
      <button
        onClick={handleGeneratePDF}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Generar PDF
      </button>
    </div>
  );
}
```

**Uso:** Copiar como base para tu editor

---

### Snippet 15: Hook Personalizado para PDF

```typescript
// ✅ COPIAR Y PEGAR
// src/hooks/usePDFGenerator.ts

import { useCallback } from 'react';
import { useUIStore } from '@/stores';

export function usePDFGenerator() {
  const addToast = useUIStore((state) => state.addToast);

  const generarPDF = useCallback(async (ficha: any, pozo: any) => {
    try {
      // Validar fotos
      const fotosCount = (
        (pozo.fotos?.principal?.length || 0) +
        (pozo.fotos?.entradas?.length || 0) +
        (pozo.fotos?.salidas?.length || 0) +
        (pozo.fotos?.sumideros?.length || 0) +
        (pozo.fotos?.otras?.length || 0)
      );

      if (fotosCount === 0) {
        addToast({
          type: 'error',
          message: 'No se puede generar PDF: carga al menos una foto',
          duration: 5000,
        });
        return false;
      }

      // Generar
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ficha, pozo }),
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

      return true;
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al generar PDF',
        duration: 5000,
      });
      return false;
    }
  }, [addToast]);

  return { generarPDF };
}

// Uso en componente:
// const { generarPDF } = usePDFGenerator();
// await generarPDF(ficha, pozo);
```

**Uso:** Hook reutilizable en múltiples componentes

---

## 🎯 Checklist de Implementación

- [ ] Copiar Snippet 1 (Acceso seguro)
- [ ] Copiar Snippet 3 (Contar fotos)
- [ ] Copiar Snippet 6 (API Route)
- [ ] Copiar Snippet 7 (Descargar)
- [ ] Copiar Snippet 9 (getPozoStatus)
- [ ] Copiar Snippet 10 (PozoStatusBadge)
- [ ] Copiar Snippet 14 (Editor)
- [ ] Probar flujo completo
- [ ] Agregar Toast notifications
- [ ] Documentar cambios

---

## 🔗 Referencias Rápidas

| Concepto | Snippet |
|----------|---------|
| Acceso seguro | 1, 2 |
| Validación | 3, 4 |
| API | 6 |
| Descarga | 7, 8 |
| UI | 9, 10 |
| Toast | 11, 12, 13 |
| Componentes | 14, 15 |

