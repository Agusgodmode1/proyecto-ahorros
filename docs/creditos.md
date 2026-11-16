# Créditos y licencias

Todo lo que la app usa y no escribimos nosotros, con su origen y su licencia. El repositorio es público: acá no entra nada con derechos de autor ni marcas.

## Cinemática de la estantería (la app y `prototipo/`)
- **Texturas (cuero, madera, papel, guardas, dorado, sombras, halo):** se dibujan por código en `js/ui/escena3d-texturas.js` (y su copia de prueba en `prototipo/texturas.js`). No se descargó ninguna imagen.
- **Modelos (libros, mueble, lámpara, monedas):** se arman por código en `js/ui/escena3d-libro.js` y `js/ui/escena3d.js`. No se descargó ningún modelo.
- **Tipografía Fraunces 5.3.0** (títulos grabados y nombres): SIL Open Font License 1.1. Copia en `vendor/fraunces-5.3.0/` con su `LICENSE`.
- **Three.js r187:** licencia MIT. Copia en `prototipo/vendor/` y en `vendor/three-r187/` con su `LICENSE`.
- **Fotos de respaldo (`icons/escena/*.webp`):** capturas de esa misma escena, hechas por nosotros.

## Hoy a la luz de la vela (`prototipo/hoy/`, en prueba)
- **El fondo (mesa, libro abierto y vela):** imagen renderizada por nosotros desde una escena hecha por código (`prototipo/hoy/escena-hoy.js`), con el mismo cuero y los mismos materiales de la cinemática. No se usó ninguna foto: las imágenes que Agus mandó como referencia de ambiente no están en el repositorio.
- **Letra:** Charm 5.3.0 (The Charm Project Authors), la elegida por Agus, con SIL Open Font License 1.1; copia y licencia en `prototipo/hoy/fuentes/`. Bajada del paquete `@fontsource/charm`. (Fondamento, la otra candidata de la ronda 1, se descartó y se quitó.)
- **La capital iluminada (la «H»):** pintada por código en `prototipo/hoy/capital.html` (pigmento y pan de oro); de ahí salen `capital-h-pigmento.webp` y `capital-h-oro.webp`.

