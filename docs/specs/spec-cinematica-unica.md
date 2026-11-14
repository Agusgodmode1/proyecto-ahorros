# Spec: Cinemática única de la estantería (menú de modos → tapa → libro abierto)

## Objetivo y por qué
Hoy hay tres animaciones encadenadas y distintas (la estantería, la tapa/salida del libro y la apertura), y se sienten toscas. Agus quiere UNA sola cinemática continua, realista y pulida, que sea el menú de modos de la app: el libro de uso individual (single player, «El Libro del Ahorro») y el de pareja (multiplayer, «El Pacto de los Dos»). Es la primera impresión de la app, por eso la prioridad es un salto grande y notorio en diseño, animación y fluidez, no retoques. Agus lo quiere "como una animación 3D pulida, veloz, optimizada, renderizada", con detalles reales de un libro de verdad.

## Alcance
1. **Una sola escena 3D, una sola cámara, un mismo objeto libro** de principio a fin: estantería → libro de frente con su tapa → libro abierto → app. Reemplaza las tres animaciones actuales. No quedan animaciones viejas sueltas en el código.
2. **Navegación con flechas** ◀ ▶ para ir y volver por los pasos (Regla 3).
3. **Prólogo:** deja de ser parte obligada del camino (Regla 9).
4. **Modos separados:** se verifica y se respeta (Regla 0b y Regla 10).
5. **Lo único que se toca de la app fuera de la estantería:** (a) el botón ◀ al lado de la ruedita de Herramientas, en las pantallas donde está la ruedita; (b) un ítem «Ver el prólogo» en Ajustes; (c) el paso que decide si se muestra el prólogo al abrir un libro. Nada más.
6. **Relación con la spec anterior** (`docs/specs/2026-11-13-estanteria-3d.md`, que esta spec llama `spec-estanteria-3d.md`): sigue vigente todo lo que no contradiga esta. Esta spec **reemplaza** de la anterior: la Regla 3 (tocar un libro durante la carga), la Regla 6 (volver a la estantería desde un libro), la Regla 7 (reducir movimiento en la 2.62), la parte de la Regla 10 que dice que la 3D «libera sus recursos al entrar a un libro», y el uso de la 2.62 como respaldo. **La 2.62 se elimina por completo** (su CSS, JS y assets, y también de `ARCHIVOS`). Todo lo demás de la anterior sigue: funciona sin internet, la Regla 2 (casos de respaldo, límite de 4 s), la Regla 4 (un solo reintento), la Regla 5 (gráficos perdidos al abrir un libro), modo discreto, 44 px, `safe-area`, `?forzar3d=`. Donde la anterior dice «se muestra la 2.62», ahora significa «se muestra el respaldo» (Regla 6).

## Cómo se ve y se siente
**Principio:** realista y sobrio. Lo único "mágico" es un brillo pequeño y suave en cada libro. Nada de chispas, estrellitas ni destellos grandes.

**El libro (lo que más se tiene que notar):**
- Libro de tapa dura con proporciones reales: lomo con nervios, esquinas con leve desgaste, bordes de cuero, canto de páginas color crema con las líneas finas de las hojas, cinta marcapáginas y hojas de guarda al abrirse.
- Tapa de cuero teñido con grano visible: zafiro profundo para El Libro del Ahorro, ámbar/cobre profundo para El Pacto de los Dos. Colores ricos pero de cuero, no neón.
- Título grabado en dorado con relieve (tipografía Fraunces), con un brillo especular suave que cambia según el ángulo de la cámara.
- Si la tapa actual tiene un motivo (la galaxia), el Ejecutor propone cómo conservarlo de forma realista (estampado o bordado) y lo confirma con Agus en las capturas.

**La estantería:**
- Biblioteca de noche, madera oscura con veta, estantes con grosor real y sombra de contacto donde apoya cada libro.
- Entre 10 y 20 libros comunes con alturas, anchos y lomos distintos (algunos apenas inclinados) en tonos apagados (marrón, verde, bordó, azul grisáceo). Como mucho 2 o 3 objetos de utilería.
- Los dos libros especiales se distinguen por su cuero y su brillo, no por tamaño.

**La luz:** luna fría desde la izquierda y lámpara cálida desde abajo a la derecha. Sombras suaves, sombra de contacto, un leve desenfoque de fondo cuando el libro está al frente, viñeta suave. Grano mínimo que no parpadee.

**El brillo y el polvo:** un halo suave en cada libro que "respira" en ciclos de 4 a 6 s. Como mucho unas 20 motas de polvo finas, visibles solo en el haz de la luna.

**Textos del menú:** cuando la cámara llega, aparece con un fundido suave, en marfil, el nombre pequeño bajo cada libro («El Libro del Ahorro» / «El Pacto de los Dos») y una etiqueta corta («Solo» / «En pareja»). **Son texto real de la página (HTML), nunca parte de una imagen ni de la escena 3D**, tanto con la 3D como en el respaldo.

**Tiempos y movimiento** (valores de partida; Agus los ajusta reaccionando a las capturas):

| Momento | Duración | Qué pasa |
|---|---|---|
| Entrada | 2,6 s | La cámara avanza en arco suave hacia la biblioteca y desacelera al final |
| Elegir | 2,2 s | 0–0,5 s: el libro se inclina y se "tira" del lomo. 0,5–1,5 s: sale y sube en arco. 1,5–2,2 s: gira de frente mientras la cámara termina de acercarse. Los otros libros se oscurecen un poco |
| Tapa en reposo | sin límite | Vaivén casi imperceptible (ciclo de unos 7 s, menos de 1 cm). Un brillo recorre la tapa una sola vez al llegar (0,9 s) |
| Abrir | 2,0 s | 0–1,1 s: la tapa gira sobre el lomo (unos 150°). 1,1–1,7 s: la cámara avanza hacia la página. 1,7–2,0 s: fundido hacia la app |
| Retroceder | 0,8× del tiempo de ida | El mismo recorrido invertido. Desde la app: primero se desvanece la pantalla de la app (0,3 s) y luego se invierte «Abrir» (1,6 s) |

- Ningún movimiento es lineal: todos arrancan y terminan suave (curvas tipo ease-in-out) y la cámara sigue trayectorias curvas.
- Si Agus toca una flecha en medio de una animación, esta se invierte desde donde está, sin saltos.

## Reglas

**0. Primeros pasos del Ejecutor, antes de tocar código.** Le informa a Agus en pocas líneas:
   - **a)** Las tres animaciones actuales que se reemplazan, y qué se reutiliza y qué se elimina de cada una. **Antes de cambiar nada saca capturas de cómo se ven hoy** (cuadros clave de la estantería y de la tapa, a 390 px) y las guarda para la comparación de la ronda 1.
   - **b)** **Qué comparten hoy El Libro del Ahorro y El Pacto de los Dos** (perfil, sueldo, categorías, metas, ajustes, lo que sea). Si comparten algo, **frena y le pregunta a Agus antes de cambiar nada**, porque separarlos puede ser un cambio de estado que borre datos (regla 3 de `CLAUDE.md`).
   - **c)** Cómo se guarda hoy el indicador de «prólogo visto» (uno solo para toda la app, o uno por libro) y **cómo se reconoce en el estado que un libro «tiene datos guardados»** (Regla 9).

**1. Fluidez (lo más importante).** Tiene que verse parejo en el iPhone, sin tirones. Presupuesto de partida: escena completa con menos de 100.000 triángulos, texturas de 1024 px o menos, no más de 3 MB de archivos nuevos (sin contar Three.js, e incluyendo las 4 fotos del respaldo), iluminación y oclusión horneadas en texturas cuando se pueda, sin sombras dinámicas pesadas, `pixelRatio` máximo 2 que baja a 1,5 si el tiempo de cuadro es alto en los primeros 60 cuadros. En la parte HTML solo se animan `transform` y `opacity`.

**2. Medición que se puede ver en el iPhone.** Con `?perf3d=1`, al terminar la cinemática aparece en pantalla un cuadro con el tiempo de cuadro (mediana, p95 y máximo) de cada momento, y el nombre del aparato. Agus le saca una captura y se la manda al Ejecutor. Sin ese parámetro no se ve nada. Objetivo: p95 de 20 ms o menos y ningún cuadro de más de 50 ms. **La medición que vale es la del iPhone de Agus**; la de la computadora solo sirve para ir probando. El juez final es Agus ("sin trabas").

**3. Estados y flechas.**

| Estado | ◀ | ▶ |
|---|---|---|
| Estantería (menú) | no hay | no hay: se elige tocando uno de los dos libros |
| Tapa (libro de frente) | el libro vuelve al estante | abre el libro |
| Libro abierto (app) | cierra el libro y deja en la tapa; otro ◀ llega a la estantería | no hay |

   También se vuelve de la tapa a la estantería tocando afuera del libro o deslizando hacia abajo. Dentro de la app solo funciona la flecha (el deslizar chocaría con el scroll).

   **Visibilidad de las flechas durante las animaciones.** En «Elegir» y en «Abrir» se muestra **solo la ◀**, atenuada (a la mitad de opacidad), y sigue siendo tocable para invertir la animación; aparece con un fundido de 0,3 s al empezar el movimiento. La ▶ aparece únicamente cuando la tapa está en reposo. En la foto de inicio y en la entrada no hay flechas. Al terminar «Abrir», la ◀ de la escena se va con el fundido a la app y queda la ◀ de la app junto a la ruedita.

**4. La escena 3D queda en pausa mientras estás en la app.** Al abrir un libro, la escena deja de dibujar (sin bucle de animación, sin gasto de batería) pero se mantiene en memoria, para que ◀ pueda invertir la animación. Esto reemplaza la regla de la spec anterior que liberaba todo al entrar. Si el iPhone corta los gráficos mientras la escena está en pausa (por ejemplo, la app estuvo en segundo plano), al tocar ◀ se muestra la tapa fija del respaldo (Regla 6) con un fundido y se usa el **único reintento** de la Regla 4 de la spec anterior (límite de 4 s): si la escena se reconstruye, entra con un fundido; si no, el resto de la sesión sigue en el respaldo.

**5. Arranque, en este orden exacto.**
   1. Se ve de inmediato la **foto de inicio** (el primer cuadro de la entrada, con la cámara lejos). Está guardada en `ARCHIVOS` como las demás, así que también aparece sin internet. Se muestra con el mismo recorte que las fotos del respaldo (Regla 6).
   2. Empieza a cargar la 3D. Los 4 s de la Regla 2 se cuentan desde que se pide el primer archivo de la 3D hasta que la escena dibujó su primer cuadro listo, solo mientras la app está a la vista. **La entrada de 2,6 s no cuenta.**
   3. Cuando la 3D está lista, un fundido corto (0,4 s) pasa de la foto a la escena 3D, que coincide con la foto.
   4. Empieza la entrada de 2,6 s.
   5. Termina la entrada y los libros se pueden tocar.
   - **Tocar durante el paso 1 al 3:** el toque se ignora (la foto de inicio no es interactiva). Si pasan los 4 s, se cancela la 3D, no vuelve a aparecer en esa sesión y se muestra el respaldo interactivo (Regla 6).
   - **Tocar durante la entrada (paso 4):** salta al final de la entrada (0,4 s) y no elige ningún libro. El siguiente toque sí elige.

**6. Respaldo (lo que se ve cuando no hay 3D).** Se usa en los casos de la Regla 2 de la spec anterior (sin WebGL, error, más de 4 s, «reducir movimiento»). Son **4 fotos fijas sacadas de la propia escena 3D** (inicio, menú, tapa del libro zafiro, tapa del libro ámbar), en WebP de menos de 150 KB cada una, todas en `ARCHIVOS`, con solo fundidos entre pasos:
   - **Estantería:** foto del menú, con los dos libros. Cada libro es un botón invisible de 44 px o más puesto encima, con su etiqueta de accesibilidad.
   - **Tapa:** foto del libro elegido de frente. Con ◀ y ▶, y tocar afuera hace lo mismo que ◀.
   - **Libro abierto:** fundido directo a la app (sin foto).
   Las mismas flechas, el mismo prólogo y las mismas reglas de datos. La 2.62 no existe más.
   **Los botones tienen que quedar siempre sobre los libros** (así nunca te quedás sin poder entrar):
   - Las fotos **no llevan texto adentro**: los nombres y etiquetas son texto real de la página (ver «Textos del menú»).
   - La foto y sus botones están en un mismo contenedor y comparten una sola cuenta de recorte (cómo se ajusta la foto a la pantalla). Los botones se ubican como porcentajes de la propia foto y se **recalculan en cada tamaño y al girar el teléfono**.
   - Las fotos se componen con los libros en una zona central segura, para que el recorte nunca los deje afuera, ni a 320 px, ni a 390 px, ni en horizontal.

**7. Flechas.** Chicas y discretas, en dorado como la escena, con un área de toque de 44 px o más, que no tapan los libros. En la app, la ◀ va al lado de la ruedita de Herramientas. Con «reducir movimiento» hacen lo mismo pero con fundidos.

**8. Cerrar el libro desde la app no toca los datos.** «Algo sin guardar» significa: un formulario o una edición abierta con algo escrito que todavía no se confirmó (incluida una carga por voz pendiente de confirmar). Si hay algo así, se pide confirmación antes de cerrar y, si Agus cancela, no se pierde lo escrito. Si no hay nada pendiente, se cierra directo.

**9. Prólogo.** Después de abrir el libro se entra directo a Hoy. El prólogo se muestra solo la primera vez que se abre cada libro (cada modo es una partida distinta), con «Saltar», y se puede volver a ver desde Ajustes («Ver el prólogo»). **Para quienes ya usan la app:** nadie que ya tenga datos guardados en un libro vuelve a ver el prólogo de ese libro. **«Tener datos guardados»** = el libro tiene cargado el sueldo, un saldo, o al menos un gasto, un fijo o una meta (cualquier cosa distinta del estado inicial vacío). El Ejecutor confirma contra el estado real (paso 0c), y si la estructura exige otro criterio, lo propone y se lo informa a Agus. Un libro sin datos (por ejemplo, el Pacto si nunca se usó) muestra el prólogo la primera vez. Se usa el indicador de «prólogo visto» que ya exista. Si hay que guardar uno nuevo, se sigue la regla 3 de `CLAUDE.md` (`VERSION_ESTADO`, `migrar()`, prueba, `SECCIONES`/`LISTAS`) y se avisa a Agus.

**10. Modos separados.** El Libro del Ahorro (clave `principal`) y El Pacto de los Dos son partidas completamente distintas: no comparten ningún dato. Pasar de un modo al otro no copia ni mezcla nada, y quien cambie de modo carga su info de nuevo. No se cambia cómo se elige el libro ni cómo se guardan los datos, salvo lo que resulte del paso 0b y con el permiso de Agus.

**11. Materiales y fuentes.** El repositorio es público y no se descargan imágenes de cualquier sitio. Las texturas (cuero, madera, veta, papel) se **generan por código** o salen de **imágenes libres de derechos (CC0)** guardadas en el repositorio, anotando origen y licencia en `docs/creditos.md`. Nada de contenido con derechos de autor ni de marcas. La tipografía Fraunces (y Nunito, si se usa) se guarda en el repositorio y en `ARCHIVOS` para que funcione sin internet.

**12. Orientación.** La cinemática está pensada para vertical. Si se gira el teléfono, la escena (y también el respaldo, con sus botones: Regla 6) se reencuadra al tamaño de la pantalla sin cortarse, los libros siguen siendo tocables y la cinemática no se rompe ni se reinicia.

**13. Forma de trabajo: rondas con capturas, sin Revisor.** El Ejecutor se detiene al terminar cada ronda y espera a Agus.
   - **Rondas 1 y 2: solo se toca `prototipo/`.** Los commits van a `main` (porque GitHub Pages publica desde ahí), pero **no se sube `VERSION`, no se toca `sw.js` ni `js/version.js`, y la app real no cambia**. El service worker deja pasar `prototipo/` por la red, así que Agus siempre ve la última versión en su iPhone. El Ejecutor le pasa el link, más capturas a 390 y 320 px.
     - **Ronda 1, escena quieta:** estantería, materiales, luz, los dos libros y sus tapas. **Muestra la toma de hoy (capturas del paso 0a) y la nueva lado a lado, con el mismo encuadre**, para que Agus decida viéndolas juntas.
     - **Ronda 2, movimiento completo:** entrada, elegir, tapa, abrir (que termina en un fundido a negro), flechas en los dos sentidos y `?perf3d=1`. Secuencia de capturas cada 200 ms (o un video corto si puede generarlo).
   - **Ronda 3, integración en la app**, en una rama. Incluye el respaldo, el prólogo de primera vez, el ◀ de la app, Ajustes, el paso 0b y las pruebas. Recién con la cinemática aprobada por Agus en `prototipo/` se pasa a `main` (con versión nueva). Después del pase, Agus verifica en la app real, y cualquier detalle se corrige con un commit nuevo.

**14. Perfil de trabajo.** Trabajá como artista técnico de animación 3D: referencias reales de libro y biblioteca, materiales por capas (color, rugosidad, relieve), luz con intención, curvas de movimiento con inercia, y siempre mirando el resultado en capturas antes de dar algo por terminado.

**15. Sin dependencias nuevas de npm ni compilación.**

## Casos a probar
- iPhone chico (320 px) y normal (390 px), en vertical, y girando el teléfono (en reposo y en medio de la cinemática).
- Los dos libros: elegir, ver la tapa, abrir, volver con ◀ en cada paso.
- Invertir en medio de cada animación (tocar ◀ a la mitad de «Elegir» o de «Abrir»): sin saltos ni pantalla en blanco, y la ◀ se ve (atenuada) durante el movimiento.
- Tocar durante la foto de inicio (se ignora) y durante la entrada (salta al final sin elegir libro).
- ◀ desde la app con la escena en pausa: invierte la animación hasta la tapa.
- ◀ desde la app después de que se cortaron los gráficos: tapa fija con fundido, un solo reintento, sin pantalla en blanco.
- ◀ en la app con un formulario a medio llenar: pide confirmación y no pierde lo escrito si se cancela.
- Primera apertura de un libro sin datos: sale el prólogo con «Saltar». Un libro con datos guardados: entra directo a Hoy sin prólogo. «Ver el prólogo» en Ajustes lo muestra.
- Datos de los dos libros: no se mezclan al ir de uno a otro.
- Modo avión después de una apertura con internet: la cinemática completa funciona, y el arranque empieza con la foto de inicio (no en blanco), con las fuentes incluidas.
- Respaldo (`?forzar3d=` con los cuatro valores, sin WebGL, y «reducir movimiento»): fotos fijas con fundidos, flechas, nombres como texto real. **Tocar cada uno de los dos libros** abre el correcto a 320 px, a 390 px y en horizontal, y después de girar el teléfono.
- `?perf3d=1` en el iPhone: el cuadro de tiempos aparece al terminar la cinemática.
- Datos vacíos (app recién instalada): se ven los dos libros y ambos abren.
- En las rondas 1 y 2: `sw.js` y `js/version.js` quedan sin cambios y la app real se ve igual que antes.

## Cómo sabemos que quedó bien
- `node --test` en verde.
- Ronda 3: versión subida con el mismo valor en `sw.js` y en `js/version.js`; todos los archivos nuevos (3D, texturas, fuentes, las 4 fotos) en `ARCHIVOS`; los de la 2.62 eliminados de `ARCHIVOS` y del código.
- Capturas de cada ronda a 390 y 320 px, aprobadas por Agus, incluida la comparación lado a lado de «hoy» contra «nuevo» en la ronda 1.
- Captura del cuadro de `?perf3d=1` en el iPhone de Agus con p95 de 20 ms o menos y ningún cuadro de más de 50 ms.
- Agus lo mira en su iPhone y confirma que no se ve trabado: fluido, elegante y con un cambio claramente notorio frente a lo anterior.
- Se actualizan `docs/direccion-visual.md` (realista, brillo suave, sin chispas), `docs/decisiones.md` (una sola cinemática, 2.62 eliminada, escena en pausa, prólogo solo la primera vez, flechas) y `docs/referencia-tecnica.md` (pantalla de inicio, `?perf3d=`, respaldo).

## Fuera de alcance
- Hoy, Herramientas y el resto de las pantallas de la app, salvo lo del punto 5 del Alcance.
- Cómo se guardan los datos, salvo lo que resulte del paso 0b (con permiso de Agus) y un indicador de «prólogo visto» si no existe.
- `sueldo.js`, `plan.js`, `extracto.js` y `logros.js`.
- Sonido.
- Borrar la carpeta `prototipo/`.

## Si el Ejecutor duda
- **Puede decidir solo (y anotarlo en el commit):** tamaños y proporciones del libro, detalles de materiales y luz, valores exactos de las curvas, cómo hornear la iluminación, y cualquier ajuste de tiempos de hasta un 20 % para que se vea más fluido.
- **Tiene que frenar y preguntar:** si los dos libros comparten datos (paso 0b), si algo exige cambiar cómo se guardan los datos o quitar una funcionalidad, o si el presupuesto de rendimiento (Regla 1) no alcanza para el nivel de detalle pedido. En ese caso propone qué sacrificar, con capturas de las dos opciones.
- **Si no está seguro de qué quiere ver Agus,** muestra dos capturas de la misma toma con una diferencia clara (por ejemplo "más oscuro" y "más claro") y espera la reacción. No inventa en silencio.

---

## Notas del Revisor (forman parte de la spec)
1. **Nombres de los libros durante «Elegir».** Los nombres y etiquetas en HTML se van con un fundido al empezar «Elegir» y vuelven al regresar a la estantería. Siempre siguen la posición de su libro, también al cambiar el tamaño o al girar el teléfono.
2. **El prototipo actual se pisa en las rondas 1 y 2.** En el paso 0a, se sacan capturas también de lo que hay hoy en `prototipo/`, para que la comparación de la ronda 1 esté completa.
