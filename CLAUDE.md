# Proyecto Ahorros: cómo trabajar acá

PWA para iPhone de finanzas personales de Agus (Uruguay), llamada «El Libro del Ahorro». La publica GitHub Pages desde `main`. Agus no es programador: explicale todo en español simple (rioplatense, con voseo, igual que la interfaz). Una sola respuesta recomendada, no listas de alternativas.

## Dónde está cada cosa (leé solo lo que toca el cambio)
- `docs/vision.md`: para quién es la app, qué sensación tiene y qué NO va a ser. Leelo antes de proponer ideas o cambios de diseño.
- `docs/decisiones.md`: lo que ya se decidió y lo que se descartó. No lo vuelvas a discutir.
- `docs/roadmap.md`: lo que sigue, en orden. Trabajá lo de arriba salvo que Agus pida otra cosa.
- `docs/referencia-tecnica.md`: el detalle de cada pantalla, cuenta y versión (el CLAUDE.md largo de antes). **No lo leas entero**: buscá la sección con `grep -n` y leé solo esa.
- `docs/prompt-maestro.md`: plantilla para pedidos grandes. Si Agus manda un audio o un texto desordenado, ordenalo con esa plantilla antes de programar.

## Stack (no cambiar)
HTML + CSS + JavaScript con módulos ES. Sin compilación, sin frameworks, sin dependencias de npm (`package.json` solo existe para `"type": "module"` y `npm test`). Datos en IndexedDB (`js/estado.js`), siempre se guardan primero en el teléfono. Sin nube ni servidores. Pruebas: `node --test`.

## Reglas al hacer cualquier cambio de la app
1. **Subí la versión** en `sw.js` (`VERSION`) y en `js/version.js`, con el mismo valor. Si no, el teléfono nunca recibe el cambio (una prueba controla que coincidan).
2. **Archivo nuevo** en `css/`, `js/` o `icons/`: agregalo a `ARCHIVOS` en `sw.js` (una prueba lo controla).
3. **Cambia la forma del estado**: subí `VERSION_ESTADO` en `js/estado.js`, agregá el paso en `migrar()` y una prueba en `tests/estado.test.js`. Nunca pierdas datos del usuario. Toda sección nueva del estado va en `SECCIONES` o `LISTAS` de `js/logica/sync.js`.
4. Corré `node --test` y dejá todo en verde antes de hacer commit.
5. Un commit por cambio, con mensaje en español.
6. **Menos texto:** como mucho 2 líneas de explicación por bloque (lo demás va en «¿Cómo funciona? ▸» o en «Más opciones»); títulos que dicen qué hacer, botones con un verbo corto, y siempre las mismas palabras para lo mismo (el «cobro», nunca «día de pago»).
7. Si el cambio toca una pantalla o una cuenta, **actualizá la sección correspondiente de `docs/referencia-tecnica.md`** y, si fue una decisión, agregá una línea a `docs/decisiones.md`.

Los cambios que son solo de documentación (`docs/`, este archivo) no suben la versión.

## Lo que no se toca sin pedido explícito
- `js/logica/sueldo.js`: liquidación validada con recibos reales (`tests/sueldo.test.js` tiene que dar ±$1).
- `js/logica/plan.js`, `extracto.js` y `logros.js`: copiados tal cual del archivo original.
- **El repositorio es público: nunca guardes datos reales de nadie** (sueldos, recibos, horas, planillas, extractos). Ejemplos y pruebas, siempre con números inventados. Recibos reales para probar solo en `pruebas/` (está en `.gitignore`).
- Las reglas de horas y el día de cobro salen del perfil (`state.perfil`), nunca de números fijos en el código.

## Diseño y iPhone, lo esencial
- Un solo papel oscuro, «Noche dorada»: todo color sale de las variables de `:root` en `css/papel.css`. Si cambiás un color, cambialo en los tres bloques de tokens. Cambios de diseño nuevos van en `css/papel.css` (no en `css/app.css`). `tests/contraste.test.js` exige contraste AA.
- Jade = la plata disponible, oro = el tiempo y lo guardado, coral = te pasaste, marfil = acción.
- Campos con letra de 16 px o más (si no, iOS hace zoom); todo lo que se toca mide 44 px o más; respetar `env(safe-area-inset-*)`.
- Montos siempre con `money()`/`money2()`/`usd()` de `ui/comun.js` (respetan el modo discreto). Categorías siempre editables (`nombresVisibles()`, `nombreDe()`, `colorDe()`), nunca una lista fija.
- Solo se animan `transform` y `opacity`; con `prefers-reduced-motion`, solo fundidos.
- Borrar siempre ofrece «Deshacer». La carga por voz nunca guarda sin confirmación.

## Cómo terminar un trabajo
Probá con `node --test`, mirá la app en un navegador a 390 px de ancho si el cambio es visual, hacé el commit y decile a Agus en pocas líneas qué cambió y cómo verlo en su iPhone (la versión nueva aparece sola al abrir la app).
