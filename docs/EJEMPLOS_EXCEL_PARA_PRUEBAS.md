# Ejemplos de Excel para Pruebas

## Casos de Excel con errores controlados

Además de los ejemplos válidos, el sistema debe ser probado con archivos Excel que contengan errores comunes del mundo real.

### Ejemplos:
- Columnas con nombres mal escritos (ej: Logitud en lugar de Longitud)
- Columnas adicionales no utilizadas por el sistema
- Columnas obligatorias faltantes
- Valores de texto en campos numéricos
- Celdas vacías en identificadores

### Comportamiento esperado del sistema:
- El sistema no debe colapsar ni quedar inutilizable
- Los datos inválidos deben ser ignorados o marcados
- El usuario debe poder continuar trabajando
- La generación de PDF debe seguir siendo posible con la información disponible
