# Checklist de Pruebas de Ruptura (Manual Resilience testing)
Version: 1.0 - Hardening MVP

Este documento define las pruebas manuales necesarias para garantizar que el sistema es "indestructible" ante el caos del usuario.

## 1. Integridad del Estado y Persistencia
- [ ] **Cierre Brusco**: Abre una ficha, haz 10 cambios rápidos y cierra la pestaña del navegador inmediatamente. Al volver, los 10 cambios deben estar ahí (SafePersist).
- [ ] **Corrupción de LocalStorage**: Abre las DevTools, ve a Application -> Local Storage. Modifica el JSON de una ficha para que sea inválido (borra una llave obligatoria como `sections`). Recarga.
  - *Resultado Esperado*: Debe aparecer la **StateGuard Recovery Screen** y al pulsar "Restablecer", la ficha debe volver al estado base sin crashear.
- [ ] **Desconexión de Store**: Inicia un reset manual. Verifica que se cree un snapshot antes del borrado.

## 2. Límites de Recursos (Stress Test)
- [ ] **Límite de Fotos**: Intenta subir 101 fotos a un solo pozo.
  - *Resultado Esperado*: Bloqueo por `LimitManager` con mensaje claro.
- [ ] **Fotos Gigantes**: Intenta subir una foto de 15MB.
  - *Resultado Esperado*: Error de validación "Excede 10MB".
- [ ] **Modo Degradado**: Carga un Excel con 500 pozos y sube 200 fotos.
  - *Resultado Esperado*: El sistema debe entrar en **Modo Degradado** (alerta ámbar). La vista previa visual debe desactivarse.

## 3. Web Workers y Concurrencia
- [ ] **Excel Roto**: Sube un archivo .xlsx que no sea una ficha técnica (ej: una lista de compras).
  - *Resultado Esperado*: El worker debe pillar el error sin bloquear el hilo de la UI.
- [ ] **Múltiples Fichas**: Abre 5 fichas en 5 pestañas diferentes. Haz cambios en todas.
  - *Resultado Esperado*: `LifecycleManager` debe suspender las pestañas inactivas. El uso de RAM del navegador no debe dispararse.

## 4. Recuperación Automática (Pipeline)
- [ ] **Fallo de Sincronización**: Simula un conflicto de red (si aplica) o una caída del `SyncEngine`.
  - *Resultado Esperado*: El fallback debe usar `last_valid_state` de la sesión anterior.

## 5. Pruebas de UX Criticas
- [ ] **Reset Seguro**: Pulsa "Restablecer esta ficha".
  - *Resultado Esperado*: Se guarda snapshot -> Se limpia estado -> La UI se actualiza instantáneamente.

---
**Garantía MVP**: Si todos estos puntos pasan, el sistema cumple con el Requirement 0: "Nada del usuario puede provocar un colapso sistémico".
