---
name: escribir-plan
description: Convierte una spec aprobada de docs/specs/ en un plan de tareas chicas en docs/planes/ y lo ejecuta tarea por tarea. Usalo cuando Agus pega una spec o pide ejecutar un archivo de docs/specs/.
---

# Escribir y ejecutar un plan

## 1. Guardar la spec
Si Agus la pegó, guardala en `docs/specs/AAAA-MM-DD-<nombre>.md` sin cambiarle nada.

## 2. Antes de planear
Leé la spec, `CLAUDE.md` y solo las secciones de `docs/referencia-tecnica.md` que toca el cambio (con `grep -n`). Mirá el código actual de esas partes.
Escribile a Agus, en 5 líneas como máximo: qué entendiste, qué vas a tocar y **tus suposiciones**. Si una suposición cambia lo que se construye, esperá su OK. Si no, seguí.

## 3. El plan
Guardalo en `docs/planes/AAAA-MM-DD-<nombre>.md` con este encabezado:
- **Spec:** ruta
- **Objetivo:** una línea
- **Reglas que aplican:** las de la spec y de `CLAUDE.md` que tocan este cambio

Después, tareas numeradas. Cada tarea es lo más chico que se puede probar y aprobar por separado:
```
### Tarea N: <nombre>
- Archivos: crear `ruta` / modificar `ruta` (qué parte)
- Hace: <qué cambia, con nombres exactos de funciones y clases>
- Prueba: <qué test se agrega o qué captura lo demuestra>
- [ ] Hecho
```
La última tarea siempre es: versión, documentación (`referencia-tecnica.md`, `decisiones.md`) y capturas finales.

## 4. Ejecutar
Por cada tarea: construí, corré `node --test`, sacá capturas si es visual (skill `captura-visual`), pedile al subagente `revisor` que revise el diff, corregí lo que marque, marcá la tarea como hecha y hacé el commit (aplicá el skill `cambio-de-la-app`).
No frenes entre tareas para preguntar. Frená solo si algo puede borrar datos, si la spec se contradice de una forma que obliga a adivinar, o si hay que publicar algo que la spec no pidió. Las decisiones chicas que tomes, anotalas en el plan como `Decisión: … — por qué`.

## 5. Cerrar
Decile a Agus en pocas líneas qué cambió, cómo verlo en el iPhone y qué decisiones tomaste solo.
