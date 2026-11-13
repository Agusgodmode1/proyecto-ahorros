# Plan: Estantería 3D como inicio de la app

- **Spec:** `docs/specs/2026-11-13-estanteria-3d.md`
- **Objetivo:** la estantería 3D del prototipo entra con un fundido sobre la 2.62 al abrir la app; la 2.62 queda de respaldo.
- **Reglas que aplican:** las 14 de la spec. De `CLAUDE.md`: subir versión en `sw.js` y `js/version.js`; archivos nuevos en `ARCHIVOS`; sin npm ni compilación; solo se animan `transform` y `opacity`; con reducir movimiento, solo fundidos; 44 px o más; `env(safe-area-inset-*)`; colores de `:root` (salvo la escena, regla 9); no tocar el estado ni `sueldo.js`, `plan.js`, `extracto.js`, `logros.js`.

## Qué carga el prototipo (regla 1)
Revisado `prototipo/index.html` y `prototipo/escena.js`:
- Three.js r187: `three.module.js` y `three.core.js`.
- Complementos: `RoundedBoxGeometry`, `RoomEnvironment`, `EffectComposer`, `RenderPass`, `BokehPass`, `UnrealBloomPass`, `OutputPass`, `ShaderPass`, y lo que esos importan (`Pass`, `MaskPass`, `BokehShader`, `CopyShader`, `LuminosityHighPassShader`, `OutputShader`). Son 16 archivos `.js` en total.
- Texturas: ninguna descargada. Madera, cuero, papel, pared, lomos y tapas se dibujan en el momento.
- Modelos: ninguno. Imágenes: ninguna.
- Fuentes: ninguna descargada. Los títulos de los libros se dibujan con Georgia, que ya viene en el iPhone.

No hay nada que no se pueda guardar para usar sin internet.

## Tareas

### Tarea 1: Three.js dentro de la app y prueba de `ARCHIVOS`
- Archivos: crear `vendor/three-r187/` (copia de `prototipo/vendor/`); modificar `sw.js` (`ARCHIVOS`) y `tests/pwa.test.js`.
- Hace: copia los 16 archivos; en `addons/` cambia `from 'three'` por la ruta relativa. La prueba exige que toda la carpeta y todo lo que la app importa (siguiendo los `import` desde `js/app.js`) esté en `ARCHIVOS`, y que la escena no pida nada a internet.
- Prueba: `tests/pwa.test.js` (3 pruebas nuevas).
- Decisión: carpeta `vendor/three-r187/` — igual que `vendor/pdfjs-6.3.289/`.
- Decisión: rutas relativas en vez de importmap — anda en iPhone más viejos y no toca `index.html`.
- [x] Hecho

### Tarea 2: la lógica que decide entre la 3D y la 2.62
- Archivos: crear `js/logica/estante3d.js` y `tests/estante3d.test.js`.
- Hace: `forzado()` lee `?forzar3d=`; `crearControl()` maneja los estados (cargando, fundiendo, mostrada, abriendo…), el límite de 4 s que solo corre con la app a la vista, el toque anticipado, los cortes de gráficos, el único reintento y las marcas de sesión.
- Prueba: `tests/estante3d.test.js`, una prueba por regla (24).
- Decisión: «sesión» se guarda en `sessionStorage` (`pa-3d-no`, `pa-3d-reintento`) — volver a la estantería recarga la página, y `sessionStorage` sobrevive a la recarga pero se borra al cerrar la app.
- Decisión: «la 3D está lista» = el primer cuadro ya se dibujó — ahí se compilan los sombreadores, que es lo más lento.
- Decisión: un corte de gráficos cuenta como «en segundo plano» si la app está oculta o si el aviso llega hasta 1,5 s después de volver — el iPhone suele avisar recién al volver.
- Decisión: un error al dibujar en medio de la animación de abrir entra directo al libro, igual que la regla 5.
- [x] Hecho

### Tarea 3: la escena
- Archivos: crear `js/ui/escena3d.js` (port de `prototipo/escena.js`).
- Hace: `crearEscena(op)` arma la misma escena y devuelve `seguir()`, `pausar()`, `elegir(id, alTerminar)`, `perder()` y `liberar()`. Avisa con `alPerder` y `alError`.
- Prueba: capturas a 390 y 320 px comparadas con el prototipo.
- Decisión: al terminar la animación el libro muestra la tapa 0,6 s y se entra solo — la spec dice que «termina entrando al libro elegido»; el prototipo mostraba «Volver / Abrir».
- Decisión: 40 motas de polvo y 20 chispas por libro (80 en total), en vez de 260 + 72 — regla 10 («unas decenas, no cientos»). Es el único cambio que se nota respecto del prototipo.
- Decisión: los toques llegan por un botón invisible sobre cada libro, de 44 px de ancho como mínimo — a 320 px el lomo mide unos 15 px; además sirve para teclado y lector de pantalla.
- [x] Hecho

### Tarea 4: la 3D sobre la 2.62
- Archivos: modificar `js/ui/estante.js` (`elegirLibro()`), `css/papel.css` (bloque «2.63»), `sw.js`.
- Hace: la capa `.es-3d` va encima de la 2.62 con `opacity:0` y sin recibir toques; entra con un fundido de 0,9 s; al terminar recibe los toques y la 2.62 de abajo se apaga. `fin(id)` es la única puerta para entrar a un libro, para las dos. La escena se carga con `import()` solo cuando hace falta.
- Prueba: navegador a 390 px con cada valor de `?forzar3d=`, toque en la 3D, toque en la 2.62 durante la carga y durante el fundido.
- Decisión: `js/app.js` no se toca — `elegirLibro()` sigue devolviendo el id del libro.
- Decisión: cada vez que queda la 2.62 se anota el motivo en la consola (`console.info`) — sirve para revisar en Safari si pasa seguido.
- [x] Hecho

### Tarea 5: reducir movimiento en la 2.62 (regla 7)
- Archivos: revisar `js/ui/estante.js` y el bloque «2.62» de `css/papel.css`.
- Hace: confirma que con reducir movimiento no hay vuelo del libro, cámara, polvo ni partículas; si falta algo, se corrige.
- Prueba: captura con reducir movimiento y conteo de animaciones en marcha.
- Resultado: ya cumplía, no hubo que cambiar nada. Con reducir movimiento hay 0 animaciones en marcha en la estantería, el polvo y las chispas no se dibujan, y al tocar un libro corre un solo fundido de 0,26 s.
- [x] Hecho

### Tarea 6: versión, documentación y capturas finales
- Archivos: `sw.js` y `js/version.js` (2.63.0); `docs/referencia-tecnica.md`; `docs/decisiones.md`; `sw.js` (comentario de `/prototipo/`).
- Hace: sube la versión, documenta la pantalla de inicio y `?forzar3d=`, anota las decisiones y la excepción de colores.
- Prueba: `node --test`; capturas a 390 y 320 px (2.62 inicial, 3D mostrada, 2.62 con reducir movimiento); prueba sin internet con el service worker.
- Resultado: 391 pruebas en verde. Sin internet (service worker instalado, red cortada, recarga) la 3D se mostró completa y los 17 archivos salieron de lo guardado, sin pedidos fallidos.
- Decisión: los lemas de la 3D bajan a 11,5 px en pantallas de 320 px — a 13 px quedaban casi pegados.
- Nota: el servidor de pruebas no tiene placa de video y la 3D tarda unos 10 s; para verla hubo que alargar el límite solo en el navegador de prueba. Con el límite real de 4 s, ahí cae a la 2.62 (como pide la regla 2). La velocidad real se juzga en el iPhone.
- Fuera de alcance, para avisar a Agus: el botón «‹ Estantería» de la tapa del libro no hace nada (ya pasaba antes de este cambio; `js/ui/libro.js` solo lo atiende en las hojas, no en la tapa).
- [x] Hecho
