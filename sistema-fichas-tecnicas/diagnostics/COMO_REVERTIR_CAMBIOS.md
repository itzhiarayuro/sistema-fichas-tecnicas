# Cómo Revertir Cambios: Guía Rápida

## 🎯 Objetivo
Si necesitas revertir cambios de la Escobilla de Estilos, aquí están las instrucciones.

## 📌 Información Importante

**Commit Principal:** `6229766`
**Tag:** `v2.0-escobilla-estilos`
**Rama:** `master`

## 🔄 Opciones de Reversión

### Opción 1: Revertir el Commit (Recomendado)
Crea un nuevo commit que deshace los cambios:

```bash
git revert 6229766
```

**Ventajas:**
- ✅ Mantiene el historial
- ✅ Seguro
- ✅ Reversible
- ✅ Recomendado para ramas compartidas

**Desventajas:**
- ❌ Crea un nuevo commit

---

### Opción 2: Reset Hard (Destructivo)
Vuelve a un commit anterior eliminando todos los cambios:

```bash
git reset --hard HEAD~1
```

**Ventajas:**
- ✅ Limpio
- ✅ Rápido

**Desventajas:**
- ❌ Destructivo
- ❌ Pierde el historial
- ❌ No recomendado para ramas compartidas

---

### Opción 3: Checkout a Commit Anterior
Vuelve a un estado anterior sin eliminar cambios:

```bash
git checkout 6229766^
```

**Ventajas:**
- ✅ No destructivo
- ✅ Puedes ver el estado anterior

**Desventajas:**
- ❌ Deja el repositorio en estado "detached HEAD"

---

### Opción 4: Revertir Archivos Específicos
Si solo quieres revertir ciertos archivos:

```bash
# Revertir StylePicker.tsx
git checkout 6229766^ -- src/components/designer/StylePicker.tsx

# Revertir PropertiesPanel.tsx
git checkout 6229766^ -- src/components/designer/PropertiesPanel.tsx

# Revertir index.ts
git checkout 6229766^ -- src/components/designer/index.ts
```

---

## 🚀 Pasos Detallados

### Paso 1: Ver el Estado Actual
```bash
git log --oneline -5
```

Deberías ver algo como:
```
6229766 feat: Escobilla de Estilos v2.0
```

### Paso 2: Elegir Método de Reversión

#### Si quieres revertir TODO (Opción 1 - Recomendado):
```bash
git revert 6229766
```

Luego:
```bash
git push origin master
```

#### Si quieres revertir ARCHIVOS ESPECÍFICOS (Opción 4):
```bash
git checkout 6229766^ -- src/components/designer/StylePicker.tsx
git add src/components/designer/StylePicker.tsx
git commit -m "revert: Remover StylePicker.tsx"
git push origin master
```

### Paso 3: Verificar Cambios
```bash
git log --oneline -5
```

Deberías ver el nuevo commit de reversión.

---

## 📊 Comparativa de Métodos

| Método | Seguro | Historial | Reversible | Recomendado |
|--------|--------|-----------|-----------|------------|
| Revert | ✅ | ✅ | ✅ | ✅ |
| Reset Hard | ❌ | ❌ | ❌ | ❌ |
| Checkout | ✅ | ✅ | ✅ | ⭐ |
| Revertir Archivos | ✅ | ✅ | ✅ | ✅ |

---

## 🔍 Verificación

### Verificar que la reversión funcionó:
```bash
# Ver el nuevo commit
git log --oneline -3

# Ver los archivos
git ls-files | grep StylePicker

# Ver el contenido de un archivo
git show HEAD:src/components/designer/StylePicker.tsx
```

---

## ⚠️ Casos Especiales

### Caso 1: Ya Hiciste Push
Si ya hiciste push a la rama remota:

```bash
# Revertir localmente
git revert 6229766

# Push de la reversión
git push origin master
```

### Caso 2: Necesitas Volver a Incluir los Cambios
Si revertiste pero luego quieres volver a incluir los cambios:

```bash
# Ver el commit de reversión
git log --oneline -1

# Revertir la reversión
git revert <commit-de-reversión>

# Push
git push origin master
```

### Caso 3: Quieres Crear Rama Separada
Si quieres mantener los cambios en una rama separada:

```bash
# Crear rama desde el commit
git checkout -b escobilla-experimental 6229766

# Hacer cambios en la rama
# ...

# Volver a master
git checkout master

# Revertir en master
git revert 6229766
```

---

## 🛠️ Comandos Útiles

### Ver Diferencias
```bash
# Ver qué cambió en el commit
git diff 6229766^ 6229766

# Ver qué cambió en un archivo
git diff 6229766^ 6229766 -- src/components/designer/StylePicker.tsx
```

### Ver Archivos Modificados
```bash
# Ver todos los archivos del commit
git show --name-only 6229766

# Ver archivos con estadísticas
git show --stat 6229766
```

### Ver Contenido de Archivos
```bash
# Ver StylePicker.tsx en el commit
git show 6229766:src/components/designer/StylePicker.tsx

# Ver PropertiesPanel.tsx en el commit
git show 6229766:src/components/designer/PropertiesPanel.tsx
```

---

## 📝 Ejemplo Completo

### Escenario: Necesitas Revertir TODO

```bash
# 1. Ver el estado actual
git log --oneline -3

# 2. Revertir el commit
git revert 6229766

# 3. Escribir mensaje de reversión (se abrirá editor)
# Mensaje por defecto: "Revert "feat: Escobilla de Estilos v2.0...""

# 4. Guardar y cerrar editor (Ctrl+S, Ctrl+X en nano)

# 5. Verificar que funcionó
git log --oneline -3

# 6. Push a remoto
git push origin master
```

---

## 📞 Soporte

### Si algo sale mal:

1. **No hagas push aún**
2. **Verifica el estado:** `git status`
3. **Revierte cambios locales:** `git reset --hard HEAD`
4. **Intenta de nuevo**

### Si ya hiciste push:

1. **Crea un nuevo commit de reversión:** `git revert <commit>`
2. **Push:** `git push origin master`
3. **Notifica al equipo**

---

## ✅ Checklist de Reversión

- [ ] Identifiqué el commit a revertir (6229766)
- [ ] Elegí el método de reversión
- [ ] Ejecuté el comando de reversión
- [ ] Verifiqué que funcionó
- [ ] Hice push si es necesario
- [ ] Notifiqué al equipo si es necesario

---

## 🎯 Resumen Rápido

**Para revertir TODO:**
```bash
git revert 6229766
git push origin master
```

**Para revertir ARCHIVOS ESPECÍFICOS:**
```bash
git checkout 6229766^ -- src/components/designer/StylePicker.tsx
git add .
git commit -m "revert: Remover StylePicker"
git push origin master
```

**Para ver qué cambió:**
```bash
git diff 6229766^ 6229766
```

---

**Guardado en Git:** ✅ Seguro
**Recuperable:** ✅ Sí
**Reversible:** ✅ Sí
**Estado:** ✅ Listo para cualquier cambio
