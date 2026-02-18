# Documentación Técnica: Escobilla de Estilos

## Arquitectura

### Componentes

#### StylePicker.tsx
Componente React que proporciona la interfaz de captura y aplicación de estilos.

**Props:**
```typescript
interface StylePickerProps {
    version: FichaDesignVersion;
    selectedPlacementId: string | null;
    selectedShapeId: string | null;
    onApplyStyle: (style: CapturedStyle) => void;
}
```

**Estado:**
```typescript
- isPickerMode: boolean - Modo de selección (no usado actualmente)
- capturedStyle: CapturedStyle | null - Estilos capturados
- copied: boolean - Indicador de copia exitosa
```

#### CapturedStyle Interface
```typescript
interface CapturedStyle {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    fontWeight?: string;
    textAlign?: string;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    labelFontSize?: number;
    labelColor?: string;
    labelFontWeight?: string;
    customLabel?: string;
    labelBackgroundColor?: string;
    labelPadding?: number;
    labelAlign?: string;
}
```

### Integración en PropertiesPanel

**Cambios realizados:**
1. Import de StylePicker
2. Método `handleApplyStyle` que aplica estilos capturados
3. Renderizado de StylePicker en ambas secciones (shapes y placements)

**Flujo:**
```
StylePicker (captura) 
    ↓
handleApplyStyle (PropertiesPanel)
    ↓
handleUpdatePlacement/handleUpdateShape (useDesignStore)
    ↓
Estado actualizado
```

## Funcionalidades

### 1. Captura de Estilos

**Método: `getElementStyle`**
```typescript
const getElementStyle = useCallback((element: FieldPlacement | ShapeElement): CapturedStyle => {
    if ('fieldId' in element) {
        // Es un FieldPlacement - extrae estilos de campo
    } else {
        // Es un ShapeElement - extrae estilos de figura
    }
}, []);
```

**Lógica:**
- Detecta el tipo de elemento (placement o shape)
- Extrae propiedades relevantes
- Retorna objeto CapturedStyle

### 2. Aplicación de Estilos

**Método: `handleApplyStyle`**
```typescript
const handleApplyStyle = (style: any) => {
    if (placement) {
        handleUpdatePlacement(style);
    } else if (shape) {
        handleUpdateShape(style);
    }
};
```

**Lógica:**
- Determina el tipo de elemento seleccionado
- Aplica estilos usando los métodos de actualización del store
- Actualiza el estado del diseño

### 3. Copia de JSON

**Método: `handleCopyJson`**
```typescript
const handleCopyJson = useCallback(() => {
    if (capturedStyle) {
        navigator.clipboard.writeText(JSON.stringify(capturedStyle, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
}, [capturedStyle]);
```

**Lógica:**
- Serializa estilos a JSON
- Copia al portapapeles
- Muestra indicador de éxito temporal

## Estilos Capturados por Tipo

### FieldPlacement
```typescript
{
    fontSize: placement.fontSize,
    fontFamily: placement.fontFamily,
    color: placement.color,
    fontWeight: placement.fontWeight,
    textAlign: placement.textAlign,
    backgroundColor: placement.backgroundColor,
    borderColor: placement.borderColor,
    borderWidth: placement.borderWidth,
    borderRadius: placement.borderRadius,
    labelFontSize: placement.labelFontSize,
    labelColor: placement.labelColor,
    labelFontWeight: placement.labelFontWeight,
    customLabel: placement.customLabel,
    labelBackgroundColor: placement.labelBackgroundColor,
    labelPadding: placement.labelPadding,
    labelAlign: placement.labelAlign,
}
```

### ShapeElement
```typescript
{
    fontSize: shape.fontSize,
    fontFamily: shape.fontFamily,
    color: shape.color,
    fontWeight: shape.fontWeight,
    textAlign: shape.textAlign,
    fillColor: shape.fillColor,
    strokeColor: shape.strokeColor,
    strokeWidth: shape.strokeWidth,
}
```

## Interfaz de Usuario

### Estructura HTML
```
<div class="flex flex-col gap-3 p-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200">
    <!-- Header con icono -->
    <div class="flex items-center gap-2">
        <svg>...</svg>
        <span>Escobilla de Estilos</span>
    </div>
    
    <!-- Botones de acción -->
    <div class="flex gap-2">
        <button>Capturar</button>
        <button>Aplicar</button>
    </div>
    
    <!-- Vista previa de estilos -->
    {capturedStyle && (
        <div class="bg-white rounded border border-slate-200 p-3 space-y-2">
            <!-- Secciones de estilos -->
        </div>
    )}
    
    <!-- Mensaje cuando no hay estilos -->
    {!capturedStyle && (
        <div>Selecciona un elemento y captura sus estilos</div>
    )}
</div>
```

### Clases Tailwind Utilizadas
- `bg-gradient-to-br` - Gradiente de fondo
- `rounded-lg` - Bordes redondeados
- `border` - Bordes
- `flex` - Flexbox
- `gap-*` - Espaciado entre elementos
- `p-*` - Padding
- `text-*` - Tamaño de texto
- `font-*` - Estilos de fuente
- `hover:` - Estados hover
- `disabled:` - Estados deshabilitados
- `transition-colors` - Transiciones suaves

## Iconos SVG

Todos los iconos son SVG inline (sin dependencias externas):

1. **Icono de Escobilla** - Captura de estilos
2. **Icono de Copiar** - Aplicar/Copiar estilos
3. **Icono de Verificación** - Confirmación de copia

## Flujo de Datos

```
Usuario selecciona elemento
    ↓
handlePickStyle() ejecuta getElementStyle()
    ↓
setCapturedStyle(style)
    ↓
Renderiza vista previa
    ↓
Usuario selecciona otro elemento
    ↓
handleApplyStyle() ejecuta
    ↓
onApplyStyle(capturedStyle) callback
    ↓
PropertiesPanel.handleApplyStyle()
    ↓
updatePlacement/updateShape()
    ↓
useDesignStore actualiza estado
    ↓
Canvas se re-renderiza
```

## Manejo de Errores

### Validaciones
1. **Selección requerida**: Botones deshabilitados si no hay selección
2. **Estilos capturados requeridos**: Botón "Aplicar" deshabilitado sin estilos
3. **Elemento válido**: Verifica que el elemento exista antes de capturar

### Estados de Error
- No hay elemento seleccionado → Botones deshabilitados
- No hay estilos capturados → Mensaje informativo
- Copia fallida → Manejo silencioso (no afecta UX)

## Performance

### Optimizaciones
1. **useCallback**: Funciones memoizadas para evitar re-renders innecesarios
2. **Condicional rendering**: Solo renderiza vista previa si hay estilos
3. **Timeout para indicador**: Limpia estado de copia después de 2s

### Complejidad
- Captura: O(1) - Acceso directo a propiedades
- Aplicación: O(1) - Actualización de propiedades
- Copia JSON: O(n) - Serialización (n = número de propiedades)

## Extensibilidad

### Agregar Nuevos Estilos

1. **Actualizar CapturedStyle interface:**
```typescript
interface CapturedStyle {
    // ... estilos existentes
    newStyle?: string; // Nuevo estilo
}
```

2. **Actualizar getElementStyle:**
```typescript
const getElementStyle = useCallback((element) => {
    // ... código existente
    return {
        // ... estilos existentes
        newStyle: element.newStyle,
    };
}, []);
```

3. **Actualizar vista previa:**
```typescript
{capturedStyle.newStyle && (
    <div>
        Nuevo Estilo: <span>{capturedStyle.newStyle}</span>
    </div>
)}
```

### Agregar Nuevas Funcionalidades

**Ejemplo: Aplicar estilos selectivos**
```typescript
const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

const handleApplySelectedStyle = () => {
    const filtered = Object.fromEntries(
        Object.entries(capturedStyle).filter(([key]) => 
            selectedStyles.includes(key)
        )
    );
    onApplyStyle(filtered);
};
```

## Testing

### Casos de Prueba Sugeridos

1. **Captura de estilos**
   - Capturar de FieldPlacement
   - Capturar de ShapeElement
   - Verificar que todos los estilos se capturen

2. **Aplicación de estilos**
   - Aplicar a FieldPlacement
   - Aplicar a ShapeElement
   - Verificar que se actualice el store

3. **Copia de JSON**
   - Copiar JSON válido
   - Verificar formato
   - Verificar portapapeles

4. **Estados de UI**
   - Botones deshabilitados sin selección
   - Botones deshabilitados sin estilos
   - Vista previa se muestra/oculta correctamente

### Ejemplo de Test
```typescript
describe('StylePicker', () => {
    it('should capture styles from selected element', () => {
        const mockVersion = { /* ... */ };
        const mockPlacementId = 'placement-1';
        
        render(
            <StylePicker
                version={mockVersion}
                selectedPlacementId={mockPlacementId}
                selectedShapeId={null}
                onApplyStyle={jest.fn()}
            />
        );
        
        const captureButton = screen.getByText('Capturar');
        fireEvent.click(captureButton);
        
        expect(screen.getByText('Estilos Capturados')).toBeInTheDocument();
    });
});
```

## Dependencias

### Internas
- `@/types/fichaDesign` - Tipos de datos
- `@/stores/designStore` - Store de diseño (usado en PropertiesPanel)

### Externas
- React (useState, useCallback)
- Tailwind CSS (estilos)

### Sin Dependencias
- Lucide React (reemplazado con SVG inline)
- Otras librerías de UI

## Archivos Relacionados

- `src/components/designer/StylePicker.tsx` - Componente principal
- `src/components/designer/PropertiesPanel.tsx` - Integración
- `src/components/designer/index.ts` - Exports
- `GUIA_ESCOBILLA_ESTILOS.md` - Guía de usuario
- `EJEMPLOS_ESCOBILLA_ESTILOS.md` - Ejemplos de uso

## Notas de Desarrollo

1. **Compatibilidad**: Funciona con todos los navegadores modernos
2. **Accesibilidad**: Usa atributos semánticos y ARIA donde es necesario
3. **Responsive**: Adaptable a diferentes tamaños de pantalla
4. **Temas**: Compatible con sistema de temas Tailwind

## Roadmap Futuro

- [ ] Historial de estilos capturados
- [ ] Presets guardados
- [ ] Aplicación selectiva de estilos
- [ ] Paletas de colores predefinidas
- [ ] Sincronización entre dispositivos
- [ ] Exportación de estilos a CSS
- [ ] Importación de estilos desde CSS
