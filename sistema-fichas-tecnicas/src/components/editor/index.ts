/**
 * Componentes del editor visual de fichas técnicas
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 5.1-5.4, 6.1-6.4, 16.8, 16.9, 18.2
 */

export { EditorLayout } from './EditorLayout';

// Toolbar
export { ToolBar } from './ToolBar';

// Editores inline
export { TextEditor, TextEditorReadOnly } from './TextEditor';
export { ImageEditor } from './ImageEditor';
export { ImageGrid } from './ImageGrid';

// Indicadores de campos
export { FieldIndicator } from './FieldIndicator';

// Vista previa en tiempo real
export { PreviewPanel } from './PreviewPanel';

// Reordenamiento de secciones
export { SortableSections, useSectionDrag } from './SortableSections';

// Personalización de formato
export { CustomizationPanel } from './CustomizationPanel';
export { TemplateSelector, templateToCustomization } from './TemplateSelector';
export { ScopeIndicator, ScopeChangeConfirmation } from './ScopeIndicator';

// Secciones
export {
  FichaSection,
  IdentificacionSection,
  EstructuraSection,
  TuberiasSection,
  SumiderosSection,
  FotosSection,
  ObservacionesSection,
} from './sections';
