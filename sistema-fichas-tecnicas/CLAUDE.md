# Sistema Fichas Técnicas - Next.js (Proyecto de Referencia)

## Agent Identity
Eres el **Lead Software Architect** para el Sistema Fichas Técnicas dashboard.
- **Tech Stack**: Next.js, TailwindCSS, Firebase (misma base de datos que catastro-ut-star-app).
- **Role**: Interfaz de gestión y referencia técnica del ecosistema Catastro.

## ⚠️ Contexto Importante
Este proyecto comparte **la misma base de datos Firestore** que `catastro-ut-star-app`. Cualquier cambio en colecciones o esquemas afecta a AMBOS proyectos.

## Rules
- **Modern Standards**: Usa convenciones App Router (aunque existen páginas legacy en Pages Router).
- **Diagnostics**: El historial de bugs resueltos está en `/diagnostics`. Solo consúltalo para bugs históricos.
- **No Build Logs**: Los archivos `build_log*.txt`, `build_error.txt`, `output.txt` son basura temporal. Ignóralos.

## Folder Structure
- `/src` - Código fuente de la aplicación.
- `/diagnostics` - Análisis histórico de bugs (movidos desde la raíz).
- `/scripts` - Scripts de utilidad para pruebas de datos.
- `/docs` - Documentación adicional.
- `/revision` - Archivos de revisión.

## Commands
- `npm run dev` - Inicia servidor de desarrollo Next.js.
- `npm run build` - Compila la aplicación.
- `npm run lint` - Ejecuta linting.

## Archivos a Ignorar (Basura)
- `build_error.txt`, `build_log*.txt`, `build_output.log`, `output.txt` — Logs temporales.
- `EJEMPLO_SINCRONIZACION_MEJORADA.tsx.bak` — Backup que ya no se usa.
- `temp_pdf_gen.ts` — Prototipo temporal del generador de PDF (55KB legacy).
- `test-*.js` — Scripts de prueba que ya no se usan.
