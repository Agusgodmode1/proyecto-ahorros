---
name: cambio-de-la-app
description: Lista para cerrar cualquier cambio de la app antes del commit (versión, service worker, estado, pruebas, textos, documentación). Usalo siempre antes de hacer commit de código de la app.
---

# Antes del commit

Marcá cada punto. Si uno no aplica, decí por qué en una palabra.

1. **Versión:** el mismo valor nuevo en `sw.js` (`VERSION`) y en `js/version.js`. Arreglo chico: sube el último número; función nueva: el del medio. Los cambios solo en `docs/` no suben versión.
2. **Archivos nuevos** en `css/`, `js/` o `icons/`: agregados a `ARCHIVOS` en `sw.js`.
3. **Forma del estado:** si cambió, subí `VERSION_ESTADO`, agregá el paso en `migrar()`, una prueba en `tests/estado.test.js`, y la sección nueva en `SECCIONES` o `LISTAS` de `js/logica/sync.js`. Ningún dato del usuario se pierde.
4. **No tocados:** `js/logica/sueldo.js`, `plan.js`, `extracto.js` y `logros.js` siguen igual, salvo que la spec lo pida explícitamente.
5. **Textos:** como mucho 2 líneas por bloque, botones con un verbo corto, las mismas palabras para lo mismo («cobro»).
6. **iPhone:** campos de 16 px o más, lo que se toca de 44 px o más, `env(safe-area-inset-*)`, solo se animan `transform` y `opacity`, y existe la versión con reducir movimiento.
7. **Datos reales:** ninguno en el repo (es público).
8. **Pruebas:** `node --test` en verde. Mostrá el resumen (`pass`/`fail`), no lo afirmes sin correrlo.
9. **Documentación:** la sección de `docs/referencia-tecnica.md` actualizada; si fue una decisión, una línea en `docs/decisiones.md`.
10. **Commit:** uno por cambio, mensaje en español.
