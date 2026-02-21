# Instrucciones para Debuggear la Reorganización de Tuberías

## Cambios Realizados

Se agregaron logs en la consola del navegador para ver exactamente cómo se están reorganizando las tuberías.

## Cómo Debuggear

### 1. Abre la Consola del Navegador

- **Chrome/Edge:** F12 → Pestaña "Console"
- **Firefox:** F12 → Pestaña "Consola"

### 2. Sube el Excel

Cuando subas el archivo Excel, verás logs como:

```
[ExcelParser] Pozo M700: Reorganizadas 3 tuberías
  [0] Tipo: entrada, Orden: 1, ID: ...
  [1] Tipo: entrada, Orden: 2, ID: S1138
  [2] Tipo: salida, Orden: 1, ID: ...
```

### 3. Verifica el Orden

**Esperado:**
```
[0] Tipo: entrada, Orden: 1
[1] Tipo: entrada, Orden: 2  ← S1138 debe estar aquí
[2] Tipo: salida, Orden: 1
```

**Si ves algo diferente, hay un problema.**

## Qué Significa Cada Log

| Log | Significado |
|-----|------------|
| `[0] Tipo: entrada, Orden: 1` | Primera entrada (orden=1) → ENTRADA 1 |
| `[1] Tipo: entrada, Orden: 2` | Segunda entrada (orden=2) → ENTRADA 2 |
| `[2] Tipo: salida, Orden: 1` | Primera salida (orden=1) → SALIDA 1 |

## Pasos para Reportar el Problema

1. **Sube el Excel**
2. **Abre la consola (F12)**
3. **Copia los logs que aparecen**
4. **Comparte:**
   - Los logs de la consola
   - La estructura de tu Excel (qué filas tiene TUBERIAS para M700)
   - Qué datos esperas en ENTRADA 2

## Ejemplo de Diagnóstico

### Si ves esto en la consola:

```
[ExcelParser] Pozo M700: Reorganizadas 2 tuberías
  [0] Tipo: entrada, Orden: 2, ID: S1138
  [1] Tipo: entrada, Orden: 1, ID: ...
```

**Problema:** Las tuberías NO se reorganizaron correctamente.
- Esperado: Orden 1 en índice 0, Orden 2 en índice 1
- Obtenido: Orden 2 en índice 0, Orden 1 en índice 1

### Si ves esto:

```
[ExcelParser] Pozo M700: Reorganizadas 3 tuberías
  [0] Tipo: entrada, Orden: 1, ID: ...
  [1] Tipo: entrada, Orden: 2, ID: S1138
  [2] Tipo: salida, Orden: 1, ID: ...
```

**Correcto:** Las tuberías se reorganizaron bien.
- ENTRADA 1 (Orden=1) en índice 0 ✓
- ENTRADA 2 (Orden=2) en índice 1 ✓
- SALIDA 1 (Orden=1) en índice 2 ✓

## Próximos Pasos

1. Sube el Excel
2. Abre la consola
3. Comparte los logs
4. Verificaremos si la reorganización está funcionando correctamente

Si la reorganización está correcta pero el PDF sigue mostrando datos incorrectos, entonces el problema está en el diseño (fieldIds incorrectos).
