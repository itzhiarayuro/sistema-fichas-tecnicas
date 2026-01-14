# Sistema de Fichas Técnicas de Pozos

Sistema de nivel empresarial para la gestión, edición y exportación de fichas técnicas de pozos de inspección, construido con Next.js 14, Tailwind CSS y Zustand.

## 🚀 Características Principales

### 1. Gestión de Datos Inteligente
- **Carga de Datos**: Procesamiento de archivos Excel con nomenclatura automatizada.
- **Indexación Fotográfica**: Asociación automática de fotos a pozos basada en patrones de nombre.
- **Trazabilidad Total**: Rastreo del origen de cada dato (Excel, manual o defecto) con historial de cambios.

### 2. Editor Visual Avanzado
- **Edición Inline**: Modificación directa de campos con feedback visual instantáneo.
- **Sincronización en Tiempo Real**: Motor de sincronización que previene conflictos y asegura persistencia.
- **Gestión de Secciones**: Reordenamiento mediante Drag & Drop y control de visibilidad.

### 3. Diseñador de Formatos (BETA)
- **Lienzo A4**: Diseño visual absoluto con coordenadas en milímetros (mm).
- **Importador HTML**: Capacidad de importar plantillas existentes y mapear campos dinámicos.
- **Exportación Pixel-Perfect**: Generación de PDFs determinísticos basados en el diseño visual.

### 4. Robustez y UX
- **Modo Guiado**: Asistente que recomienda el siguiente paso en el flujo de trabajo.
- **Aislamiento de Fichas**: Cada ficha es una entidad independiente con su propio estado y reglas.
- **Manejo de Errores**: Sistema de contención que evita caídas generales ante datos corruptos.

## 🛠️ Tecnologías

- **Frontend**: React 18, Next.js 14 (App Router), TypeScript.
- **Estilos**: Tailwind CSS (Vanilla CSS para componentes críticos).
- **Estado**: Zustand (Global y Local por Ficha).
- **PDF**: jsPDF con motor de renderizado custom.
- **Drag & Drop**: @dnd-kit.

## 📦 Instalación

1. Clonar el repositorio.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Iniciar entorno de desarrollo:
   ```bash
   npm run dev
   ```

## 🛠️ Arquitectura
El sistema sigue principios de **Clean Architecture** adaptados a React:
- `/src/types`: Definiciones de dominio.
- `/src/lib/sync`: Motor de sincronización y persistencia.
- `/src/lib/pdf`: Motores de generación de documentos.
- `/src/components`: Componentes atómicos y de negocio.

---
Desarrollado con foco en precisión técnica y experiencia de usuario premium.
