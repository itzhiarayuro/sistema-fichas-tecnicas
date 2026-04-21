import EditorPageClient from './EditorPageClient';

export function generateStaticParams() {
  // En exportación estática para una SPA, no necesitamos conocer los IDs de antemano
  // El cliente manejará el ID desde la URL
  return [{ id: 'local' }]; 
}

export default function Page() {
  return <EditorPageClient />;
}
