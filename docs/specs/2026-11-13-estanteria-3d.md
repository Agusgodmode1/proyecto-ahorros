# Spec: Estantería 3D como inicio de la app

## Objetivo y por qué
Llevar la estantería 3D del prototipo (`prototipo/`, hecha con Three.js) a la pantalla de inicio de la app, para que los dos libros se vean y se sientan como en el prototipo. La estantería mágica actual (2.62) no se borra: queda como respaldo para que Agus nunca se quede sin poder entrar a sus libros.

## Alcance
- La pantalla de inicio donde se elige el libro (estantería).
- Guardar en el teléfono todo lo que la 3D necesita para funcionar sin internet.
- El mecanismo que decide cuándo se muestra la 3D y cuándo la 2.62.
- No se toca ninguna otra pantalla.

## Cómo se ve y se siente
- La 3D se ve **igual que el prototipo**, tal cual está hoy. Cualquier ajuste visual se pide después, en otro cambio.
- Sigue `direccion-visual.md`: lo mágico es lo único con color vivo (zafiro y ámbar), movimiento lento y suave.
- Al abrir la app se ve primero la 2.62. Cuando la 3D está lista, entra con un fundido por encima. Nunca hay pantalla en blanco ni salto brusco.
- Al tocar un libro, la 3D hace lo que hace el prototipo y termina entrando al libro elegido.

## Reglas
1. **Funciona sin internet.** Three.js se copia desde `prototipo/vendor/` a una carpeta de la app. El Ejecutor primero lista TODO lo que carga el prototipo (Three.js, complementos de Three.js, texturas, modelos, fuentes, imágenes) y todo eso tiene que estar en `ARCHIVOS` de `sw.js`. La prueba que controla `ARCHIVOS` se amplía para cubrir la carpeta nueva, de modo que si falta un archivo la prueba falle. Con el teléfono en modo avión, después de haber abierto la app una vez con internet, se ve la estantería 3D completa.
2. **Cuándo se usa la 2.62 (respaldo).** En cualquiera de estos casos se muestra la 2.62:
   - el teléfono no tiene WebGL;
   - la 3D tira un error al cargar o al dibujar;
   - la 3D tarda más de 4 segundos en estar lista. Los 4 s se cuentan desde que empieza a cargar la 3D y solo mientras la app está a la vista;
   - «reducir movimiento» está activado (en ese caso ni se carga la 3D);
   - se pierde el contexto de gráficos con la app a la vista: pasa directo a la 2.62, sin reintento;
   - el reintento de la regla 4 falla o tarda más de 4 s (mismo límite).
   Esta regla se cumple siempre, sin excepciones.
3. **Tocar un libro antes de que la 3D esté lista.** Vale desde que se abre la estantería hasta que la 3D termina de aparecer, **incluido el fundido de entrada**: durante ese tiempo el toque lo recibe la 2.62. En ese caso se cancela la carga de la 3D, la 3D no aparece más en esa sesión y el libro abre una sola vez. Cuando la 3D ya terminó de aparecer, el toque lo recibe la 3D.
4. **Volver del segundo plano.** «Sesión» = desde que se abre la app hasta que se cierra del todo (si se cierra y se vuelve a abrir, es una sesión nueva). Si la 3D estaba mostrada y el iPhone corta los gráficos mientras la app estaba en segundo plano, al volver se permite **un solo reintento** de recrear la 3D (mostrando la 2.62 mientras tanto, y con fundido al estar lista). El reintento tiene el mismo límite de 4 s de la regla 2. Si falla, tarda más o se vuelven a perder los gráficos, queda la 2.62 hasta cerrar la app del todo. Este es el único caso con reintento.
5. **Gráficos perdidos durante la animación de abrir un libro.** Si ya había un libro tocado, se entra directo a ese libro, sin volver a la estantería.
6. **Volver a la estantería desde un libro.** La 3D se detuvo y liberó sus recursos al entrar (regla 10). Al volver a la estantería en la misma sesión se repite el mismo arranque: se ve la 2.62, entra la 3D con fundido cuando está lista y vale el límite de 4 s. La excepción es que la sesión ya haya quedado en la 2.62 (por cualquier regla anterior): en ese caso se queda en la 2.62.
7. **Reducir movimiento en la 2.62.** La 2.62 de respaldo cumple la regla de `CLAUDE.md`: solo fundidos. El libro no sale volando del estante, la cámara no se acerca, no hay polvo ni partículas. Si hoy no lo cumple, se arregla en este cambio.
8. **Los dos libros abren lo de siempre.** El zafiro abre El Libro del Ahorro (clave de datos `principal`) y el ámbar abre El Pacto de los Dos. No se cambia cómo se elige el libro ni cómo se guardan los datos. La 3D y la 2.62 llaman a la misma función para entrar al libro.
9. **Colores.** Los colores de la escena 3D (madera, luz de luna, lámpara, brillos de los libros) pueden quedar escritos en el código de la escena, como en el prototipo: es una excepción, y se anota en `decisiones.md`. Todo lo que está fuera de la escena (cualquier texto, fondo o botón alrededor) sale de las variables de `:root` en `css/papel.css`.
10. **Rendimiento y batería.** La animación se pausa cuando la app pasa a segundo plano o la pestaña no está visible, y se retoma al volver. Pocas partículas (unas decenas, no cientos). Al entrar a un libro, la 3D se detiene y libera sus recursos.
11. **Modo discreto.** Si la estantería (3D o 2.62) muestra algún monto, usa `money()`/`money2()`/`usd()` y respeta el modo discreto. Si no muestra montos, no hay nada que hacer, y el Ejecutor lo anota.
12. Los libros se pueden tocar con un área de 44 px o más. Respeta `env(safe-area-inset-*)`.
13. Sin dependencias nuevas de npm, sin compilación (regla del stack).
14. **Forma fija de forzar los casos de falla (solo para probar).** Un parámetro en el link, `?forzar3d=`, con estos valores: `sinwebgl`, `error`, `lento` (la 3D tarda más de 4 s), `perdida` (se pierde el contexto de gráficos después de mostrarse). No tiene botón ni texto en la pantalla, y sin el parámetro la app se comporta normal. Se documenta en `docs/referencia-tecnica.md`, aclarando que **estos casos se prueban en Safari o en la computadora**, porque abierta desde el ícono de la pantalla de inicio la app no permite agregar cosas al link.

## Casos a probar
- iPhone chico (320 px) y normal (390 px)
- Primera apertura con internet: se ve la 2.62 y la 3D entra con fundido.
- Segunda apertura en modo avión: se ve la 3D completa, sin ningún archivo faltante.
- `?forzar3d=sinwebgl`: se ve la 2.62, nunca blanco.
- `?forzar3d=error`: se ve la 2.62.
- `?forzar3d=lento`: se ve la 2.62 a los 4 s y la 3D no aparece después de golpe.
- `?forzar3d=perdida`: con la 3D mostrada y la app a la vista, pasa directo a la 2.62, sin reintento y sin pantalla en blanco.
- Tocar un libro en la 2.62 durante la carga: abre una sola vez y la 3D no aparece encima.
- Tocar un libro durante el fundido de entrada de la 3D: lo recibe la 2.62, abre una sola vez y la 3D se cancela.
- Perder los gráficos en medio de la animación de abrir un libro: entra directo a ese libro.
- Mandar la app a segundo plano y volver con los gráficos cortados: se hace un único reintento con límite de 4 s; si falla, queda la 2.62.
- Entrar a un libro y volver a la estantería: se repite el arranque (2.62, fundido, 4 s). Si la sesión había quedado en la 2.62, se queda en la 2.62.
- «Reducir movimiento» activado: se ve la 2.62 con solo fundidos.
- Tocar cada libro (en la 3D y en la 2.62): abre el libro correcto con sus datos intactos.
- Modo discreto activado: ningún monto visible en la estantería.
- Datos vacíos (app recién instalada): la estantería se ve y los dos libros abren.

## Cómo sabemos que quedó bien
- `node --test` en verde, incluida la prueba ampliada de `ARCHIVOS`.
- Versión subida con el mismo valor en `sw.js` (`VERSION`) y en `js/version.js`.
- Capturas a 390 px y 320 px de: la 2.62 inicial, la 3D ya mostrada, y la 2.62 de respaldo con «reducir movimiento».
- Prueba en modo avión que confirme que la 3D carga solo desde lo guardado en el teléfono.
- Los datos de `principal` y del Pacto de los Dos se ven igual que antes de la actualización.
- `docs/decisiones.md`: una línea nueva («La estantería 3D (Three.js) es el inicio; la 2.62 queda como respaldo»), la línea de 2.62.1 actualizada (ya no es solo prototipo) y la excepción de colores de la escena 3D (regla 9).
- Se actualiza la sección de la pantalla de inicio en `docs/referencia-tecnica.md` (incluido `?forzar3d=`).

## Fuera de alcance
- Cambios de aspecto respecto del prototipo (más oscuro, más brillo, tiempos de la animación, etc.): se piden aparte, después de ver la 3D en el teléfono.
- Cualquier cambio en cómo se guardan los datos, `VERSION_ESTADO` o `migrar()`.
- El resto de las pantallas (tapa, prólogo, Hoy, Herramientas).
- `sueldo.js`, `plan.js`, `extracto.js` y `logros.js`.
- Borrar la carpeta `prototipo/`: se decide en otro cambio.

## Si el Ejecutor duda
- **Puede decidir solo (y anotarlo en el commit):** detalles chicos de cómo medir que la 3D está lista, nombres de archivos y carpetas, cómo hacer el fundido (solo `transform` y `opacity`).
- **Tiene que frenar y preguntar:** si para hacer funcionar la 3D hay que cambiar cómo se elige el libro, tocar datos guardados o el estado, o si el prototipo necesita algo que no se puede guardar para usar sin internet.
- **Si en el iPhone real la 3D pasa seguido a la 2.62** (por los 4 s o por cortes de gráficos), la regla 2 sigue valiendo igual: avisá a Agus para revisar el umbral o el peso de la escena.
