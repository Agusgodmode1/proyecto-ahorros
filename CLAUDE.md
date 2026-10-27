# Proyecto Ahorros: reglas del proyecto

PWA para iPhone de finanzas personales de Agus (Uruguay). La publica GitHub Pages desde `main`. El usuario no es programador: explicale todo en español simple (rioplatense, con voseo, igual que la interfaz).

## Stack (no cambiar)
- HTML + CSS + JavaScript con módulos ES. Sin compilación, sin frameworks, sin dependencias de npm. `package.json` solo existe para `"type": "module"` y `npm test`.
- Datos: un documento en IndexedDB (`js/estado.js`). Siempre se guarda primero en el teléfono.
- Sin nube ni servidores: cada aparato guarda sus datos; para pasar datos entre aparatos se usa un archivo que se junta con `logica/sync.js` (Ajustes → Pasar mis datos a otro aparato). Cada guardado anota qué cambió y cuándo (`prepararGuardado` en `app.js`); toda sección nueva del estado va en `SECCIONES` o `LISTAS` de `sync.js` (una prueba lo controla).
- Pruebas: `node --test` (sin dependencias).

## Reglas al hacer cualquier cambio
1. **Subí la versión** en `sw.js` (`VERSION`) y en `js/version.js`, con el mismo valor. Si no, el teléfono nunca recibe el cambio. Hay una prueba que controla que coincidan.
2. **Archivo nuevo** en `css/`, `js/` o `icons/`: agregalo a `ARCHIVOS` en `sw.js` (una prueba lo controla).
3. **Cambia la forma del estado**: subí `VERSION_ESTADO` en `js/estado.js`, agregá el paso en `migrar()` y una prueba en `tests/estado.test.js`. Nunca pierdas datos del usuario. Antes de migrar, la app guarda sola una copia (`guardarCopia`); se puede volver desde Ajustes → Copias automáticas.
4. Corré `node --test` y dejá todo en verde antes de hacer commit.
5. Un commit por cambio, con mensaje en español.

## Lógica de negocio validada (no tocar sin pedido explícito)
- `js/logica/sueldo.js`: liquidación validada con recibos reales (las pruebas de `tests/sueldo.test.js`, con sueldos inventados y valores calculados a mano, tienen que dar ±$1).
- **El repositorio es público: nunca guardes datos reales de nadie** (sueldos, recibos, horas, planillas). Ejemplos y pruebas, siempre con números inventados.
- `js/logica/plan.js`, `extracto.js` y `logros.js`: copiados tal cual del archivo original `proyecto-ahorros.html`.
- Tipo de ingreso (`perfil.ingreso`): `uy` (sueldo en Uruguay, el cálculo validado), `personalizado` (nominal menos `sueldo.descuentos`, en % o monto) o `variable` (lo cobrado cada mes en `sueldo.ingresosMes`, sin horas extra). Los dos últimos pueden ser en USD: `liq()` devuelve todo en pesos con la cotización de Ajustes y guarda el original en `orig`. Aguinaldo, BPC y control del recibo son solo para `uy`.
- Las reglas de horas y el día de cobro salen del perfil (`state.perfil`), nunca de números fijos en el código. Con el perfil de Agus los resultados tienen que ser idénticos (`tests/perfil.test.js`).
- Feriados: lista base en `js/logica/feriados.js` (solo 5 no laborables por año); los cambios del usuario en `state.feriados`; la app los aplica con `aplicarFeriados()`. **Regla de Agus: solo cuentan los no laborables; los laborables son días comunes** (por defecto `perfil.cobro.laborableHabil=true` y `perfil.horas.feriadoLaborable='comun'`, cambiables en el perfil).

## iOS
- Diseño: «El Libro del Ahorro» (ver la sección de abajo). Etiquetas en minúscula (sin mayúsculas sostenidas).
- Tema: desde 2.3 sigue al modo del teléfono (papel claro o papel de noche); se fuerza en Ajustes → Apariencia y se guarda en `localStorage` (pa-tema: auto/claro/oscuro). `data-theme` en `<html>` lo pone el script del `<head>` de index.html. Todo color sale de las variables de `:root`.
- Campos con letra de 16 px o más (si no, iOS hace zoom). Teclados numéricos con `inputmode`.
- Todo lo que se toca mide 44 px o más (lo revisa la recorrida final página por página). Respetar `env(safe-area-inset-*)`. Nada fijo puede quedar tapado por la barra de pestañas, el micrófono o el indicador de inicio.
- Categorías de gasto: editables (`state.categorias`, `logica/categorias.js`). Nunca una lista fija en la pantalla: usá `nombresVisibles()`, `nombreDe()` (lo que reconoce la nota, la voz o el extracto → tu categoría) y `colorDe()`. Borrar siempre pasa los gastos a otra; "Otros" no se borra.
- Gastos: el formulario es uno solo (`js/ui/gastos.js`). Al anotar se ve solo monto, nota y día: la categoría se elige sola por la nota (sigue en el formulario, oculta) y se corrige en Tarjeta. Borrar siempre ofrece "Deshacer".
- Montos: siempre con `money()`/`money2()`/`usd()` de `ui/comun.js` (respetan el modo discreto).
- Dólares: un gasto en US$ guarda `monto` (pesos), `usd` y `cotiz` (la del día); todas las cuentas usan `monto`. Los fijos en US$ se recalculan al cambiar la cotización (`logica/monedas.js`).
- Fin de mes (`logica/mes.js`): capa sobre `planear()` (que no cambia). Mínimo aceptable (`plan.minimo`) y objetivo (`plan.ahorro`); lo que sobra de una semana pasa a la siguiente o al ahorro (`plan.sobrante`, `plan.sobranteSemana`); lo que te pasaste se reparte entre las semanas que quedan y, si no alcanza para el objetivo, se cuida el mínimo. La pantalla siempre usa `planNow()` (el plan ajustado).
- Recibos (`state.recibos`, `logica/recibos.js`): el recibo del mes trabajado manda sobre la estimación (`liqReal`, que usa `liqNow(true)`) y alimenta el aguinaldo. Los PDF se leen con pdf.js guardado en `vendor/pdfjs-6.3.289/` (versión exacta, en el service worker); el PDF nunca se guarda. Recibos reales para probar solo en `pruebas/` (está en .gitignore).
- Tarjeta = control (`logica/control.js`): el extracto nunca suma gastos solo. Se cruza con lo anotado (mismo monto, ±3 días, uno a uno) y el usuario elige qué agregar de lo que falta. Nada de cargas masivas que dupliquen.
- Metas (`state.metas`, `logica/metas.js`), aguinaldo y vacacional (`logica/aguinaldo.js`: estimaciones), CSV para Excel (`logica/csv.js`).
- PIN (`logica/pin.js`, `ui/pin.js`): opcional, de este aparato (localStorage `pa-pin` = {sal, hash SHA-256}); nunca en texto plano ni en los respaldos. "Olvidé el PIN" solo borra los datos del teléfono (no hay cuenta).
- La carga por voz nunca guarda sin confirmación. Si falla `SpeechRecognition`, se usa el dictado del teclado.

## Saldo y topes (1.14)
- `logica/saldo.js`: `disponible` = plata del plan − gastos anotados − fijos pagados. "Actualizar saldo" (desde «Tenés» o desde el aviso de un gasto, abre la pregunta «¿Cuánta plata tenés hoy?» del prólogo; después del cobro, la tarjeta `#saldo-card`) compara con lo que el usuario dice que tiene: si tiene menos, anota un gasto `src:'ajuste'` ("Ajuste de saldo", fecha del día anterior); si tiene más, suma a `plan.monto`. Siempre con "Deshacer". El ajuste no entra en el cruce de la tarjeta.
- Un gasto real nunca se bloquea: se anota siempre y, si deja lo disponible en negativo, `avisoAnotado()` (`ui/gastos.js`) avisa y ofrece "Actualizar saldo"; si no, ofrece "Deshacer". El aviso (`.toast`) va por encima de la hoja de gasto.
- Topes: el ahorro del plan no pasa de monto − fijos (`planear`); la meta de "Cuando cobres" no pasa de sueldo − fijos (`proximo`). Los gastos del extracto de la tarjeta no se limitan: son hechos.

## El Libro del Ahorro (diseño actual, 2.6)
La app es un libro: tapa cósmica, prólogo (el pacto), índice, seis capítulos y Ajustes al final. Cambios de diseño nuevos van en `css/papel.css`.

**Archivos**
- `css/app.css`: las capas viejas (estructura, formularios, listas). No le agregues diseño nuevo.
- `css/libro.css`: la tapa en 3D, el prólogo, el pacto, el índice y el pie con flechas.
- `css/papel.css`: el sistema visual (tokens, papel, tinta, piezas, capítulos, doble página, pulido). Va último.
- `js/ui/libro.js` (tapa y prólogo), `js/ui/indice.js` (índice), `js/ui/sonido.js` (sonido), `js/logica/pacto.js`, `js/logica/ciclo.js` y `js/logica/capitulos.js` (puros, con pruebas).

**Paleta y letra** (`css/papel.css`)
- Bloques de tokens `@papel` (claro) y `@noche` (papel de noche); el de `@media` tiene que ser igual al de `[data-theme="dark"]` (una prueba lo controla).
- Cosmos (tapa y lo que rodea la página): #070B24 → #0E1640 → #1B2A6B, nebulosa #4B3FA8, estrellas #F4F1FF, estrella fugaz #FFD27A. Papel #F3E6C8 / sombra #E6D3A8 / canto #CDB27E; noche #2A2620 con tinta #EFE4CC.
- Tinta #1C2440 (secundaria #4A5170). Dorado viejo `--oro` solo en títulos y números grandes (degradado `--oro-deg`); texto chico dorado `--oro-t`. Botones de acción: relleno naranja `--cta` con letra `--on-cta`. Enlaces `--azul`. Estados `--bien`, `--ojo`, `--mal`, siempre con ícono o texto. Los nombres viejos (`--sky`, `--mint`…) siguen existiendo con la paleta del libro.
- **Contraste: `tests/contraste.test.js` exige AA** (4,5:1 texto, 3:1 títulos dorados grandes) en los dos papeles. Si un color no pasa, se ajusta la luminosidad y se conserva el tono.
- Escalas fijas: espacios `--e1…--e6` (4/8/12/16/24/32) y letra `--t1…--t8`. Texto con la letra del sistema; títulos y números grandes en Cormorant Garamond (600 y 700, dentro de `vendor/cormorant-garamond-5.3.0/`, en el service worker). Números `lining-nums tabular-nums` (el atajo `font:` las reinicia: hay una regla con `!important`).
- `--cielo` tiene 8 capas: todo `background-size` que lo use repite el tamaño 8 veces (si no, aparecen bandas).
- Tema: sigue al teléfono; se fuerza en Ajustes → Apariencia (pa-tema).

**Páginas y navegación**
- Folios (`numeroDePagina`): prólogo 1–5 (`PROLOGO`: p1 propósito, q1 plata, q2 ahorro, q3 cobro, pacto), índice 6, Hoy 7, una por semana, Fijos, Sueldo, Tarjeta, Logros y Ajustes (la última).
- Capítulos (`CAPITULOS`): I Hoy (`resumen`), II Semanas (`wN`), III Fijos, IV Sueldo, V Tarjeta (`gastos`), VI Logros. La barra de abajo son lomos con número romano y una cinta en el abierto. Cada panel lleva `data-cap` («capítulo II · semanas»).
- `#app` es la página; `#hoja` (encabezado + capítulo + `#pie`) es lo único que gira. La barra (`nav.tabs`) y el micrófono quedan fuera porque son fijos (un transform en un padre los movería).
- Pasar de página: flechas del pie (`#pie`: anterior, folio, siguiente; en pantallas ≥ 1000 px a los costados), deslizar (`initDeslizar`: sigue al dedo, eje inclinado `rotate3d(-.16,1,0,…)`, sombra del pliegue `--pl`; si la soltás antes de ~28 % vuelve; si tocás otro capítulo mientras gira, manda lo que tocaste) e índice (`ui/indice.js`; si el salto es lejos, abanico de 3 hojas ≤ 700 ms). `vecina`: desde Hoy hacia atrás va a `'prologo'` (abre el pacto); después de Logros viene Ajustes.
- La cinta del índice (`#indice-abrir`) cuelga del borde de arriba. Desde el índice: «Ir al prólogo» y «Cerrar el libro».

**Tapa y prólogo** (`ui/libro.js`, modos)
- `nuevo`: la primera vez (o al borrar el ejemplo). Tapa (con importar o ver el ejemplo) → apertura (~2,5 s, saltable) → las 5 páginas → «Sellar el pacto» (sello de lacre, polvo de estrellas).
- `hojear`: ya hay datos. Cada pregunta muestra tu valor de hoy con «Cambiar»; «Guardar» pasa por `aplicarAjuste` (con «Deshacer») y reescribe el número. Se llega deslizando hacia atrás desde Hoy, desde el índice, desde Ajustes → «Ir al prólogo» o tocando «Tenés» / «Guardás» (abren la pregunta ya en «Cambiar»).
- `ciclo`: el día de cobro, Hoy muestra «fin del capítulo» arriba (lo ahorrado = lo que no gastaste, la racha como quedaría) y «Empezar un pacto nuevo»: solo las 3 preguntas, total = lo que quedó + cobro estimado; `cerrarCiclo` cierra el mes justo antes de sellar.
- `tapa`: «Cerrar el libro» (la apertura al revés, 1,7× más rápida); al tocar la tapa se abre en Hoy.
- `ctx.abrirPrologo(pagina, editar, dir)` y `ctx.cerrarLibro()` los pone app.js.
- Pacto puro en `logica/pacto.js`: `validarPacto` (total > 0, ahorro ≤ total y ≤ total − fijos, cobro futuro; avisos sin bloquear si queda < `DIA_BAJO` por día o si el ahorro es 0), `sellarPacto`, `previaAjuste`/`aplicarAjuste`/`deshacerAjustePacto` (nunca negativo, ahorro ≤ `maxAhorro`, mueve los pagos de fijos si cambia el cobro), `sugerirCobro`, `mesCalendario` (solo feriados no laborables).
- Estado v14: `state.pacto = {sellado, numero, usd}`. Los tres datos del pacto viven en `state.plan` (monto, ahorro, cobro): no se guardan dos veces. Quien venía de antes migra con el pacto sellado el día de inicio de su plan y no ve el prólogo.
- Letra chica del pacto (página 5 en hojear): lo que sobra de cada semana y el formulario `#plan-aj` (porcentaje, mínimo, fechas). Ese formulario vive oculto en `#plan-aj-casa` (Ajustes) y se presta a la página mientras está abierta (`prestarLetra`/`devolverLetra`): sus ids y eventos (plan.js) no cambian.

**Capítulos**
- Hoy: «Cobrás en» es lo más grande (dorado, con barra de 12 tramos; Agus pidió que no se achique); «Hoy podés gastar» mediano, con «+ Gasto» (hoja `#gasto-sheet`, formulario `q`, día Hoy/Ayer/Anteayer, el foco va al monto en el mismo toque); «Tenés» y «Guardás»; frecuentes de un toque; gastaste hoy; Hasta que cobres / Semana por semana / Cuando cobres plegables (`plegados`). Los avisos son «notas al margen» (`.banner::before`; la de alerta dice «ojo»). «Hoy en versión corta» (Ajustes, `[data-simple]`, pa-simple): clase `.simple` en `#app`. «Hoy podés gastar» cuenta hasta el valor nuevo al anotar (≤ 400 ms) y el gasto nuevo aparece como tinta.
- En los otros capítulos, arriba va el encabezado corrido (`#hero-mini`: hoy podés gastar + cobrás en).
- Logros: sellos de lacre (logrados) y estampas punteadas (los que faltan); la racha es un sello dorado. Al desbloquear: sonido de sello y polvo de estrellas (`polvo()` de `ui/libro.js`).
- Tarjeta: el único lugar con categorías (`#aj-cats`, `renderCategorias()` con la pestaña `gastos`).
- Pantallas ≥ 1100 px: libro abierto a doble página (pliegue al medio). Hoy: cobro y «hoy podés gastar» a la izquierda, tu día y el plan a la derecha; los demás capítulos en dos columnas; cada semana es una doble página.
- Tour (`ui/tour.js`, `PASOS`): arranca solo después del primer pacto (pa-tour) y se repite desde Ajustes. Si agregás un capítulo o un botón principal, sumalo.
- Sin uso (pendiente de sacar): el asistente «Mis datos» (`ui/inicio.js`, `#cfg`): desde 2.4 el pacto se cambia en el prólogo. `logica/inicio.js` sigue con sus pruebas (`fondoEmergencia` se usa en Metas).
- Pendiente a propósito: «Qué hacer con tus ahorros»: se hace después de probar el libro con uso real.

**Movimiento, sonido y rendimiento**
- Solo se animan `transform` y `opacity` (Web Animations). Con `prefers-reduced-motion`, solo fundidos (comprobado: ninguna animación con transform). En segundo plano todo se pausa (`lb-pausa`). Sin Three.js ni dependencias.
- Tiempos: controles 100–180 ms, microinteracciones 180–350 ms, pase de hoja 400–450 ms con rebote leve, ambiente de la tapa en ciclos de 7–11 s (estrellas) y 9 s (estrella fugaz).
- Sonido (`ui/sonido.js`): opcional, apagado por defecto (pa-sonido, Ajustes → Sonido). Sin archivos: Web Audio arma «hoja», «sello» y «broche».
