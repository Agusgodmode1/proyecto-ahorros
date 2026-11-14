# Plan: Cinemática única de la estantería

- **Spec:** `docs/specs/spec-cinematica-unica.md`
- **Objetivo:** una sola escena 3D continua (estantería → tapa → libro abierto → app), con flechas ◀ ▶, que reemplaza las tres animaciones de hoy y elimina la 2.62.
- **Reglas que aplican:** las 15 de la spec y las dos notas del Revisor. De `CLAUDE.md`: en las rondas 1 y 2 no se toca `sw.js` ni `js/version.js`; en la ronda 3, versión nueva en los dos, archivos nuevos en `ARCHIVOS`, `node --test` en verde, solo `transform` y `opacity` en HTML, 44 px, `safe-area`, textos cortos, `docs/referencia-tecnica.md` y `docs/decisiones.md` al día. No se tocan `sueldo.js`, `plan.js`, `extracto.js`, `logros.js`. Sin npm ni compilación.
- **Forma de trabajo (Regla 13):** tres rondas. Al terminar cada una, el Ejecutor frena y espera a Agus. Por pedido de Agus, se trabaja en la rama `claude/jolly-hawking-ldiftc`; pasar algo a `main` (para que GitHub Pages lo publique) se hace solo con su OK.

## Regla 0: lo que hay hoy (informado a Agus antes de tocar código)

### a) Las tres animaciones que se reemplazan
| Hoy | Dónde está | Se reutiliza | Se elimina |
|---|---|---|---|
| 1. La estantería: la 2.62 (dibujada con CSS) y encima la 3D de la 2.63 | `js/ui/estante.js`, bloques «2.62» y «2.63» de `css/papel.css`, `js/ui/escena3d.js` | La lógica que decide 3D o respaldo (`js/logica/estante3d.js` y sus pruebas: 4 s, un reintento, `?forzar3d=`), Three.js en `vendor/three-r187/`, la idea de botones invisibles sobre los libros | Toda la 2.62 (HTML, CSS, chispas, vuelo del libro) y la escena 3D actual (se rehace) |
| 2. La salida del libro y la tapa: en la 3D el libro sale y gira; después aparece OTRA tapa, hecha en HTML, que se abre sola a los 2,5 s | `elegir()` de `js/ui/escena3d.js`; modo `tapa` de `js/ui/libro.js`; `js/ui/tapa.js` (galaxia); `css/libro.css` | El motivo de la galaxia y el emblema de cada libro, como estampado en el cuero (a confirmar en capturas) | La tapa HTML, la galaxia en canvas, `abrirSola()` |
| 3. La apertura: la tapa HTML gira y pasa al prólogo o a Hoy (~2,5 s). Volver a la estantería recarga la página | `js/ui/libro.js` (apertura y «Cerrar el libro»), `aEstante()` en `js/app.js` | Las páginas del prólogo y del pacto (no son parte de la animación) | La apertura HTML, el cierre al revés y la recarga de página para volver |

Capturas de hoy guardadas en `prototipo/antes/` (app, respaldo 2.62 y prototipo actual).

### b) Qué comparten los dos libros
- **Los datos no se comparten.** Cada libro guarda todo (perfil, sueldo, gastos, fijos, metas, categorías, pacto, copias de seguridad) en su propio lugar: `principal` / `copias` para El Libro del Ahorro y `duo` / `copias-duo` para El Pacto de los Dos. Ninguno lee al otro, salvo el «Respaldo completo» de Ajustes, que los baja juntos pero separados.
- **Sí se comparten preferencias del aparato** (no son datos de plata): el PIN, el modo discreto, sonido y volumen, «abrir directo el último libro», la pestaña donde quedaste, las ayudas ya vistas («¿Qué es esto?» y el tour) y un par de avisos ya cerrados.
- **Detalle:** «Empezar de cero» borra solo los datos del libro abierto, pero también reinicia esas ayudas y avisos para los dos.
- **Propuesta (espera el OK de Agus):** dejarlo así. No hace falta cambiar el estado ni migrar nada.

### c) Prólogo visto y «tiene datos guardados»
- Hoy **no existe un indicador** de «prólogo visto». El prólogo sale cuando el libro **no tiene nada guardado** (`cargar()` devuelve vacío). Al sellar el pacto, tocar «Saltar», importar o ver el ejemplo, el libro se guarda y el prólogo no vuelve a salir. Ya es uno por libro.
- **Criterio propuesto para la Regla 9:** «tiene datos guardados» = existe algo guardado en el lugar de ese libro. Cubre el criterio de la spec (sueldo, saldo, gasto, fijo o meta) y además a quien tocó «Saltar». **No hace falta indicador nuevo, ni `VERSION_ESTADO`, ni migración.**
- **A resolver con Agus:** hoy la tapa de un libro nuevo ofrece «Ya tenía datos: importarlos» y «Ver el ejemplo». Como la tapa pasa a ser la de la escena 3D, esos dos botones se mudan a la primera página del prólogo.

## Tareas

### Ronda 1: escena quieta (solo `prototipo/`)

#### Tarea 1: texturas por código
- Archivos: crear `prototipo/texturas.js`.
- Hace: genera en canvas (con semilla, siempre iguales) cuero con grano (color, rugosidad, relieve), madera oscura con veta, papel crema, canto de hojas con líneas finas, tela de las guardas. Tamaño máximo 1024 px.
- Prueba: captura de cada material de cerca.
- [x] Hecho

#### Tarea 2: el libro
- Archivos: crear `prototipo/libro3d.js`; crear `docs/creditos.md`.
- Hace: `crearLibro(op)` arma un libro de tapa dura con piezas separadas (tapa que gira sobre el lomo, lomo con nervios, contratapa, bloque de hojas, guardas, cinta marcapáginas, esquinas gastadas). Título en Fraunces dorado con relieve y brillo especular. Zafiro y ámbar. Motivo de cada libro estampado en dorado.
- Prueba: capturas de la tapa de cada libro, de frente y en ángulo.
- [x] Hecho

#### Tarea 3: la biblioteca y la luz
- Archivos: reescribir `prototipo/escena.js` y `prototipo/index.html`.
- Hace: estantes con grosor, 10 a 20 libros comunes (instanciados), 2 o 3 objetos, luna fría desde la izquierda, lámpara cálida abajo a la derecha, sombras de contacto horneadas, halo que respira (4 a 6 s), hasta 20 motas en el haz, viñeta y grano fijo. Nombres y etiquetas («Solo» / «En pareja») en HTML, siguiendo a su libro. Menos de 100.000 triángulos.
- Prueba: capturas a 390 y 320 px; conteo de triángulos en consola.
- [x] Hecho

#### Tarea 4: comparación «hoy / nuevo»
- Archivos: crear `prototipo/comparar.html` (usa `prototipo/antes/`).
- Hace: muestra lado a lado, con el mismo encuadre, la estantería y las dos tapas de hoy contra las nuevas.
- Prueba: captura de la página. **Frenar y esperar a Agus.**
- [x] Hecho

#### Decisiones de la ronda 1
- Decisión: respuestas de Agus a la Regla 0 — las preferencias del teléfono siguen compartidas entre los dos libros; «importar» y «ver el ejemplo» se mudan a la primera página del prólogo; OK para publicar `prototipo/` en `main` al terminar cada ronda.
- Decisión: Agus quiere conservar un destello suave cuando el libro sale de la biblioteca (le gusta el de hoy) — se suma en la ronda 2, sobrio, sin chispas.
- Decisión: un mueble de tres estantes con 20 libros comunes, una lámpara de aceite (la luz cálida de abajo a la derecha) y unas monedas — entra entero en la pantalla vertical y deja lugar para los nombres.
- Decisión: todos los libros comunes van fundidos en una sola malla con un solo atlas de lomos — un solo dibujo para la placa de video. La escena entera usa unos 14.000 triángulos y 69 dibujos por cuadro (el tope de la spec es 100.000).
- Decisión: sin sombras dinámicas — las sombras son texturas (bajo cada estante y donde apoyan los libros).
- Decisión: el desenfoque del fondo se hace a un cuarto de resolución y solo cuando hay un libro al frente; viñeta y grano van por CSS, fijos — más barato que un posprocesado completo.
- Decisión: el motivo de la galaxia queda estampado en oro (puntitos en espiral) con la constelación de cada libro encima — a confirmar por Agus en las capturas.
- Decisión: Fraunces se toma de `vendor/fraunces-5.3.0/`, que ya estaba en el repo (no hizo falta `prototipo/fuentes/`).
- Decisión: el nombre bajo cada libro pasa a dos renglones cuando los libros quedan a menos de 150 px (teléfono de 320 px o acostado) — así nunca se pisan.
- Decisión: en la ronda 1 tocar un libro lo trae al frente con un paso simple, solo para poder ver las tapas; el movimiento definitivo es la ronda 2.
- Capturas: `prototipo/ronda1/` y la comparación en `prototipo/comparar.html`.

### Ronda 2: movimiento completo (solo `prototipo/`)

#### Tarea 5: la línea de tiempo
- Archivos: crear `prototipo/cinematica.js` (puro, sin Three.js) y `tests/cinematica.test.js`.
- Hace: estados `foto → entrada → menu → elegir → tapa → abrir → app`, con duraciones de la spec, vuelta a 0,8× y **inversión desde donde está** al tocar ◀. Curvas suaves y trayectorias de cámara curvas. Qué flechas se ven en cada momento (Regla 3). Tocar en la entrada salta al final sin elegir.
- Prueba: `tests/cinematica.test.js`, una prueba por fila de las tablas de la spec.
- [x] Hecho

#### Tarea 6: animar la escena con la línea de tiempo
- Archivos: modificar `prototipo/escena.js`, `prototipo/index.html`.
- Hace: entrada, elegir (tirar del lomo, salir en arco, girar), tapa en reposo (vaivén y un brillo que pasa una vez), abrir (tapa a 150°, cámara a la página, fundido a negro). Flechas doradas de 44 px. Tocar afuera y deslizar hacia abajo vuelven al estante. Los nombres se van al elegir y vuelven al regresar. Girar el teléfono reencuadra sin reiniciar. `pixelRatio` 2 que baja a 1,5.
- Prueba: secuencia de capturas cada 200 ms a 390 y 320 px, ida y vuelta, y una inversión a mitad de «Elegir» y de «Abrir».
- [x] Hecho

#### Tarea 7: `?perf3d=1`
- Archivos: crear `prototipo/perf.js`; modificar `prototipo/index.html`.
- Hace: mide el tiempo de cada cuadro por momento y al terminar muestra mediana, p95, máximo y el nombre del aparato. Sin el parámetro no se ve nada.
- Prueba: prueba de las cuentas (mediana, p95) en `tests/cinematica.test.js`; captura del cuadro. **Frenar y esperar a Agus (y su captura del iPhone).**
- [x] Hecho

#### Decisiones de la ronda 2
- Decisión: respuesta de Agus a la ronda 1 — colores y galaxia en oro aprobados; la estantería está bien de luz; **sin lámpara** (queda solo su luz cálida, desde abajo a la derecha, fuera de cuadro); **sin halo** en los libros del estante.
- Decisión: los dos libros «llaman» de otra forma — asoman 1 a 2 cm del estante, se mecen muy despacio (ciclo de 5,2 s, cada uno a su tiempo) y su cuero toma un poco de luz propia. Con reducir movimiento, solo la luz.
- Decisión: al sacar la lámpara, un libro del estante del medio bajó al de abajo — siguen siendo 20 comunes.
- Decisión: las partes de «Elegir» (inclinarse y salir del lomo, subir en arco, girar) se pisan un poco entre sí en vez de ir una atrás de la otra — así no hay cortes de velocidad. Los tiempos totales son los de la spec.
- Decisión: la cámara de la entrada usa una curva que arranca suave, toma velocidad pronto y frena largo (`frena`).
- Decisión: el destello al salir es un resplandor del color del libro en el hueco del estante, que aparece y se apaga en 1,2 s — pedido de Agus, sin chispas.
- Decisión: con la tapa de frente, tocar el libro también lo abre (igual que ▶) — hoy ya se abre tocándolo.
- Decisión: las flechas van abajo, al centro, con círculo fino dorado y 48 px de toque — no tapan el libro ni los nombres.
- Decisión: con reducir movimiento, el prototipo pasa de un reposo al otro con un fundido corto (en la app, ese caso usa el respaldo de fotos).
- Decisión: `?reloj=manual` (solo para capturas) deja avanzar la escena a mano, cuadro por cuadro.
- Decisión: la línea de tiempo (`prototipo/cinematica.js`) y las cuentas de la medición (`prototipo/perf.js`) son puras y tienen 16 pruebas en `tests/cinematica.test.js`.
- Decisión: pedido de Agus tras probar la ronda 2 — una luz tenue y cálida que sale **de atrás** de cada uno de los dos libros (dos manchas de luz por libro: una detrás, que asoma por arriba, y otra que apenas baña a los vecinos). Se bajó la altura de los libros vecinos para que la luz se vea. El movimiento leve de los libros queda.
- Decisión: la primera medición de Agus dio 33 ms parejos en todos los momentos: es el tope de 30 cuadros por segundo del modo de bajo consumo del iPhone, no una escena pesada. Ahora la escena lo reconoce (`tope30` en `prototipo/perf.js`, con prueba): no baja la resolución por eso y lo avisa en el cuadro de tiempos. Falta repetir la medición sin bajo consumo.
- Decisión: los picos de esa medición (132 ms al elegir, 57 ms en la tapa) eran la placa de video preparando por primera vez el desenfoque, el destello y el brillo. Ahora eso se «calienta» antes de mostrar la escena.
- Capturas: `prototipo/ronda2/` (secuencia cada 200 ms a 390 y 320 px, e inversiones a mitad de «Elegir» y de «Abrir»).

### Ronda 3: integración en la app (rama; a `main` con el OK de Agus)

#### Tarea 8: mudar la escena a la app
- Archivos: mover a `js/ui/` y `js/logica/` lo aprobado del prototipo; fuentes a `fuentes/`; `sw.js` (`ARCHIVOS`).
- Hace: la escena nueva reemplaza `js/ui/escena3d.js`. Se adapta `js/logica/estante3d.js`: la escena queda **en pausa** al abrir (no se libera), corte de gráficos en pausa → tapa fija + único reintento.
- Prueba: `tests/estante3d.test.js` (casos nuevos de pausa y reintento), `tests/pwa.test.js`.
- [x] Hecho

#### Tarea 9: el respaldo con 4 fotos
- Archivos: crear `icons/escena/*.webp` (inicio, menú, tapa zafiro, tapa ámbar, menos de 150 KB cada una); crear `js/logica/recorte.js` y `tests/recorte.test.js`; `js/ui/estante.js`; `css/papel.css`.
- Hace: foto de inicio al arrancar, fundido de 0,4 s a la 3D. Respaldo con fotos, fundidos, flechas y botones invisibles ubicados como porcentaje de la foto con una sola cuenta de recorte, recalculada al girar.
- Prueba: `tests/recorte.test.js` (los botones caen sobre los libros a 320, 390 y horizontal); capturas con cada valor de `?forzar3d=` y con reducir movimiento.
- [x] Hecho

#### Tarea 10: eliminar la 2.62 y las animaciones viejas
- Archivos: `js/ui/estante.js`, `js/ui/tapa.js`, `js/ui/libro.js` (tapa, apertura y cierre), `css/papel.css` (bloques 2.62 y 2.63), `css/libro.css`, `js/app.js` (`abrirSola`, `aEstante` con recarga), `sw.js`.
- Hace: borra lo que ya no se usa. El prólogo y el pacto quedan.
- Prueba: `node --test`; búsqueda de clases `es-` y `lb-` sin uso.
- [x] Hecho

#### Tarea 11: ◀ en la app, cerrar sin perder nada y prólogo
- Archivos: `index.html` (◀ junto a la ruedita; «Ver el prólogo» en Ajustes), `js/app.js`, `js/ui/libro.js`, crear `js/logica/pendiente.js` y `tests/pendiente.test.js`.
- Hace: ◀ desvanece la app (0,3 s) e invierte «Abrir» (1,6 s). Si hay un formulario con algo escrito o una carga por voz sin confirmar, pide confirmación. Libro sin nada guardado → prólogo con «Saltar» (con «importar» y «ver el ejemplo» en su primera página); con algo guardado → directo a Hoy.
- Prueba: `tests/pendiente.test.js`; capturas del flujo con libro vacío y con datos; los datos de un libro no aparecen en el otro.
- [x] Hecho

#### Tarea 12: versión, documentación y capturas finales
- Archivos: `sw.js` y `js/version.js` (misma versión), `docs/direccion-visual.md`, `docs/decisiones.md`, `docs/referencia-tecnica.md`, `docs/creditos.md`.
- Hace: cierra el cambio con el skill `cambio-de-la-app`.
- Prueba: `node --test`; capturas finales a 390 y 320 px; modo avión; captura de `?perf3d=1` del iPhone de Agus.
- [x] Hecho

#### Decisiones de la ronda 3
- Decisión: Agus aprobó el diseño de la ronda 2 («adelante con ese diseño»). La medición de tiempos sigue pendiente: sus dos capturas se sacaron con el modo de bajo consumo (30 cuadros por segundo fijos) y la segunda todavía mostraba la versión anterior del prototipo.
- Decisión: la estantería es una sola para toda la sesión — `elegirLibro()` devuelve el libro recién al terminar «Abrir»; la app carga debajo del velo y `soltarEstante()` funde hacia ella. Así los datos se leen después de elegir, como antes, y `js/estado.js` no se toca.
- Decisión: abrir **el otro** libro después de cerrar uno hace que la app arranque de nuevo, directo en ese libro (`pa-abrir`), con la pantalla ya cubierta — es la forma más segura de no mezclar datos: no queda nada del libro anterior en memoria.
- Decisión: «tiene datos guardados» = existe algo guardado en el lugar del libro — sin indicador nuevo ni cambio de estado (`VERSION_ESTADO` sigue en 28).
- Decisión: «algo sin guardar» se detecta anotando los campos donde se escribe y olvidándolos cuando la app guarda — sirve para todos los formularios sin tocar ninguna pantalla.
- Decisión: en el respaldo, si la zona segura de una foto no entra cubriendo la pantalla (teléfono acostado), la foto se achica hasta que entre — prioriza que los libros se vean y se puedan tocar.
- Decisión: se quitaron los complementos de Three.js (`vendor/three-r187/addons/`), que la escena nueva no usa — 14 archivos menos para bajar.
- Decisión: junto con la tapa vieja se quitó el CSS `lb-*` que ya no usa nadie (se comprobó clase por clase contra todo `js/` e `index.html`).
- Decisión: `prototipo/` queda como estaba en la ronda 2 (la spec pide no borrarlo); la app usa su propia copia en `js/`.
- Decisión: las fotos de las tapas muestran el título grabado en el cuero: es parte del libro, no un rótulo. Los nombres y etiquetas del menú sí son texto de la página.
- Pendiente de comprobar en el iPhone de Agus: fluidez real (`?perf3d=1` sin bajo consumo), toques con el dedo y giro del teléfono.
