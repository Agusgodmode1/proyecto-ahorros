# Créditos y licencias

Todo lo que la app usa y no escribimos nosotros, con su origen y su licencia. El repositorio es público: acá no entra nada con derechos de autor ni marcas.

## Cinemática de la estantería (la app y `prototipo/`)
- **Texturas (cuero, madera, papel, guardas, dorado, sombras, halo):** se dibujan por código en `js/ui/escena3d-texturas.js` (y su copia de prueba en `prototipo/texturas.js`). No se descargó ninguna imagen.
- **Modelos (libros, mueble, lámpara, monedas):** se arman por código en `js/ui/escena3d-libro.js` y `js/ui/escena3d.js`. No se descargó ningún modelo.
- **Tipografía Fraunces 5.3.0** (títulos grabados y nombres): SIL Open Font License 1.1. Copia en `vendor/fraunces-5.3.0/` con su `LICENSE`.
- **Three.js r187:** licencia MIT. Copia en `prototipo/vendor/` y en `vendor/three-r187/` con su `LICENSE`.
- **Fotos de respaldo (`icons/escena/*.webp`):** capturas de esa misma escena, hechas por nosotros.

## El libro a la luz de la vela (2.65 a 2.68.1, descartado en 2.69.0; queda en `prototipo/hoy/`)
- **El fondo (mesa, libro abierto, tintero y vela; una imagen por cada página del libro):** imagen renderizada por nosotros desde una escena hecha por código (`prototipo/hoy/escena-hoy.js` y `render.html`), con el mismo cuero de la cinemática; en la app, `icons/hoy/fondo-*.webp`. No se usó ninguna foto: las imágenes que Agus mandó como referencia de ambiente no están en el repositorio.
- **Letras:** IM Fell English 5.3.0, normal e itálica, para todo el texto, e IM Fell English SC 5.3.0, versalitas, para títulos, encabezados y números romanos (Igino Marini; distribución de Google Inc.). SIL Open Font License 1.1; copias y licencias en `vendor/im-fell-english-5.3.0/` y `vendor/im-fell-english-sc-5.3.0/`. Bajadas de los paquetes `@fontsource/im-fell-english` y `@fontsource/im-fell-english-sc`. (Hasta 2.65 se usó Charm; ya no está en la app, solo en `prototipo/hoy/fuentes/`.)
- **Tinta, trazos de pluma, la manito (☞), las manchas y la vuelta de hoja:** dibujados por código en `js/ui/hoy-libro.js` (prueba: `prototipo/hoy/index.html`).
