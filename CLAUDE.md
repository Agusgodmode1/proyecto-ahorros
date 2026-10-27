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
- Diseño: desde 2.2 manda «El Libro del Ahorro» (ver abajo). Antes era "Limón": fondo negro, lima para lo que podés gastar, verde para lo que guardás, naranja para el cobro, un tono por pestaña. En la portada, "Hoy podés gastar" (tarjeta de ~36 px) y "Cobrás en N días" (tarjeta con barra de 12 tramos) van cada uno en su tarjeta. Etiquetas en minúscula (sin mayúsculas sostenidas).
- Tema: desde 2.3 sigue al modo del teléfono (papel claro o papel de noche); se fuerza en Ajustes → Apariencia y se guarda en `localStorage` (pa-tema: auto/claro/oscuro). `data-theme` en `<html>` lo pone el script del `<head>` de index.html. Todo color sale de las variables de `:root`.
- Campos con letra de 16 px o más (si no, iOS hace zoom). Teclados numéricos con `inputmode`.
- Respetar `env(safe-area-inset-*)`. Nada fijo puede quedar tapado por la barra de pestañas, el micrófono o el indicador de inicio.
- Categorías de gasto: editables (`state.categorias`, `logica/categorias.js`). Nunca una lista fija en la pantalla: usá `nombresVisibles()`, `nombreDe()` (lo que reconoce la nota, la voz o el extracto → tu categoría) y `colorDe()`. Borrar siempre pasa los gastos a otra; "Otros" no se borra.
- Gastos: el formulario es uno solo (`js/ui/gastos.js`), con categoría sugerida por la nota. Borrar siempre ofrece "Deshacer".
- Montos: siempre con `money()`/`money2()`/`usd()` de `ui/comun.js` (respetan el modo discreto).
- Dólares: un gasto en US$ guarda `monto` (pesos), `usd` y `cotiz` (la del día); todas las cuentas usan `monto`. Los fijos en US$ se recalculan al cambiar la cotización (`logica/monedas.js`).
- Fin de mes (`logica/mes.js`): capa sobre `planear()` (que no cambia). Mínimo aceptable (`plan.minimo`) y objetivo (`plan.ahorro`); lo que sobra de una semana pasa a la siguiente o al ahorro (`plan.sobrante`, `plan.sobranteSemana`); lo que te pasaste se reparte entre las semanas que quedan y, si no alcanza para el objetivo, se cuida el mínimo. La pantalla siempre usa `planNow()` (el plan ajustado).
- Recibos (`state.recibos`, `logica/recibos.js`): el recibo del mes trabajado manda sobre la estimación (`liqReal`, que usa `liqNow(true)`) y alimenta el aguinaldo. Los PDF se leen con pdf.js guardado en `vendor/pdfjs-6.3.289/` (versión exacta, en el service worker); el PDF nunca se guarda. Recibos reales para probar solo en `pruebas/` (está en .gitignore).
- Tarjeta = control (`logica/control.js`): el extracto nunca suma gastos solo. Se cruza con lo anotado (mismo monto, ±3 días, uno a uno) y el usuario elige qué agregar de lo que falta. Nada de cargas masivas que dupliquen.
- Metas (`state.metas`, `logica/metas.js`), aguinaldo y vacacional (`logica/aguinaldo.js`: estimaciones), CSV para Excel (`logica/csv.js`).
- PIN (`logica/pin.js`, `ui/pin.js`): opcional, de este aparato (localStorage `pa-pin` = {sal, hash SHA-256}); nunca en texto plano ni en los respaldos. "Olvidé el PIN" solo borra los datos del teléfono (no hay cuenta).
- La carga por voz nunca guarda sin confirmación. Si falla `SpeechRecognition`, se usa el dictado del teclado.

## Saldo y topes (1.14)
- `logica/saldo.js`: `disponible` = plata del plan − gastos anotados − fijos pagados. "Actualizar saldo" (botón en la portada) compara con lo que el usuario dice que tiene: si tiene menos, anota un gasto `src:'ajuste'` ("Ajuste de saldo", fecha del día anterior); si tiene más, suma a `plan.monto`. Siempre con "Deshacer". El ajuste no entra en el cruce de la tarjeta.
- Un gasto real nunca se bloquea: se anota siempre y, si deja lo disponible en negativo, `avisoAnotado()` (`ui/gastos.js`) avisa y ofrece "Actualizar saldo"; si no, ofrece "Deshacer". El aviso (`.toast`) va por encima de la hoja de gasto.
- Topes: el ahorro del plan no pasa de monto − fijos (`planear`); la meta de "Cuando cobres" no pasa de sueldo − fijos (`proximo`). Los gastos del extracto de la tarjeta no se limitan: son hechos.

## Diseño 2.0 (1.18)
- Mismos colores; otra forma. Capa al final de `app.css` con el prefijo `.v2` (clase en `<html>`), que le gana a las capas viejas. Cambios de diseño nuevos van ahí.
- Letra: `ui-rounded` (la redondeada del iPhone) para números y títulos, `system-ui` para el texto. Nada se descarga.
- La portada (Hoy podés gastar, Cobrás en, Tenés, Guardás) solo se ve en Plan (`data-vista` en `<html>`, lo pone `showPanels`). En las otras pestañas, la franja `#hero-mini` (hoy podés gastar + cobrás en; al tocarla vuelve a Plan).
- Plan: la cifra de "Hoy podés gastar" enorme y sin caja (el signo $ chico, `grande()`); debajo, bloque de 3: "Cobrás en" alto a la izquierda, Tenés y Guardás apilados a la derecha. Hasta que cobres / Semana por semana / Cuando cobres forman una sola lista agrupada. La guía es una tira que se desliza.
- Celular: barra de pestañas flotante y el micrófono al lado (no tapa contenido).

## Inicio simple (1.15)
- Portada (1.17): "Hoy podés gastar" con un botón chico «+ Gasto» al lado (abre la hoja `#gasto-sheet`, formulario con prefijo `q`, con «¿Qué día?»: Hoy/Ayer/Anteayer; el foco va al monto en el mismo toque para que iOS abra el teclado) + tarjeta "Cobrás en N días" con barra de 12 tramos (`renderCountdown`, también en vista simple) + fila de 2 datos (Tenés / Guardás). Agus pidió que la cuenta regresiva tenga su tarjeta: no la saques ni la achiques.
- "Hasta que cobres", "Semana por semana" y "Cuando cobres" son `<details class="fold">` cerrados; el estado abierto se guarda en `plegados` (plan.js).
- Vista simple («Hoy en versión corta», desde 2.5 en Ajustes, botones `[data-simple]`; localStorage `pa-simple`): clase `.simple` en `#app` oculta plan y tarjetas, muestra los últimos 3 gastos.
- Tamaños táctiles: bloque "Inicio 1.15" al final de app.css (botones/campos ≥ 48 px).

## Primer uso, tour y cierre (1.19)
- (Hasta 1.19 la primera vez era `flujoNuevo()`; desde 2.0 es el prólogo del libro, ver abajo.) Las cuentas de `logica/inicio.js` siguen sirviendo a «Mis datos».
- «Mis datos» (Ajustes) abre los mismos 3 pasos en modo edición; el saldo pasa por `ajustarSaldo` (igual que «Actualizar saldo»). Un solo estado (`plan`, `fijos`, `gastos`): ningún número se guarda duplicado.
- Tour (`ui/tour.js`): globos sobre la pantalla real, arranca solo después de la primera configuración (`localStorage pa-tour`), se repite desde Ajustes. Si agregás una pestaña o botón principal, sumalo a `PASOS`.
- Día de cobro: aviso «Llegó el día de cobro» en Plan (`renderCierre`), lleva a «Cerrar el mes» de Logros. Metas vacías sugieren el fondo de emergencia (3 meses de gastos, `fondoEmergencia`).
- Pendiente a propósito: «Qué hacer con tus ahorros» (fase 4): se hace después de probar estas fases con uso real.

## El Libro del Ahorro (2.0, etapa 1: prólogo y pacto)
- La app pasa a ser un libro. Primera vez (o perfil nuevo al borrar el ejemplo): libro cerrado en 3D (`ui/libro.js`, `css/libro.css`) → al tocarlo se abre (~2,5 s, saltable) → prólogo (2 páginas) → 3 preguntas, una por página (con cuánta plata empezás, con dólares opcionales; cuánto querés ahorrar, con deslizador y «te quedan $X, ≈ $Y por día»; qué día cobrás, en un calendario que sugiere el 5.º día hábil o la regla del perfil) → «El pacto» y «Sellar el pacto» (sello de lacre).
- Lógica pura en `logica/pacto.js` (probada en `tests/pacto.test.js`): `validarPacto` (total > 0, ahorro ≤ total y ≤ total − fijos, cobro futuro; avisos sin bloquear si queda < `DIA_BAJO` por día o si el ahorro es 0), `cuentaPacto`, `sellarPacto`, `sugerirCobro`, `mesCalendario` (marca solo los feriados no laborables).
- Estado v14: `state.pacto = {sellado, numero, usd}`. Los tres datos del pacto viven en `state.plan` (monto, ahorro, cobro): no se guardan dos veces. Quien ya usaba la app migra con el pacto sellado el día de inicio de su plan y no ve el prólogo; lo puede releer desde Ajustes → Mis datos → «Releer el prólogo».
- Diseño del libro: siempre de noche. Variables `--lb-*` en `:root` (neutros #060807…#1b221d, lima #c6f432 / #e6ff9a / #5f7a0e, oro viejo #b89a4a solo en herrajes). Serif Cormorant Garamond (600 y 700) dentro de `vendor/cormorant-garamond-5.3.0/`, en el service worker; solo para títulos y números grandes. Ojo: el atajo `font:` reinicia las cifras; por eso hay una regla con `lining-nums`.
- Animaciones: solo `transform` y `opacity` (Web Animations). Con `prefers-reduced-motion`, solo fundidos. En segundo plano se pausan (`lb-pausa`). Sin Three.js ni dependencias.
- Pendiente (etapas 3 y 4): paleta y materiales en toda la app, pase de página que sigue al dedo, sonido opcional.

## El Libro del Ahorro (2.1, etapa 2: capítulos)
- Las pestañas son capítulos (`logica/capitulos.js`: `CAPITULOS`, `capituloDe`, `paginas`, `vecina`): I Hoy (`resumen`), II Semanas (`wN`, cada semana es una página), III Fijos, IV Sueldo, V Tarjeta, VI Logros. Los ids de pestaña no cambiaron. «Ajustes del pacto» (`ajustes`) queda fuera de los capítulos.
- Barra de abajo: lomos con número romano (`.tab.lomo`), con una cinta sobre el capítulo abierto. Cada panel lleva `data-cap` («capítulo II · semanas»). Índice (`ui/indice.js`, botón `#indice-abrir`): capítulos con cintas y una pista a la derecha.
- Deslizar a los costados en `main` pasa de página (`initDeslizar` en app.js, no desde campos ni listas que se deslizan); `go()` hace el pase de hoja (≤ 380 ms, solo transform/opacity).
- Hoy: «Cobrás en» es lo más grande (serif); «Hoy podés gastar» de tamaño medio, en su tarjeta (esto reemplaza lo de «la cifra enorme» de Diseño 2.0, a pedido de Agus); frecuentes de un toque en `#hoy-out`.
- Anotar un gasto: solo monto y nota (y el día). La categoría no se muestra en los formularios `q` y `g`: se elige sola por la nota y se ve/corrige en Tarjeta.
- Ajustes del pacto (`#pacto-card`): Tengo hoy / Quiero guardar / Cobro el. Puro en `logica/pacto.js`: `previaAjuste`, `aplicarAjuste` (pasa por `ajustarSaldo`; mueve los pagos de fijos si cambia el cobro), `deshacerAjustePacto`. Nunca negativo; el ahorro no pasa de `maxAhorro`. El formulario viejo del plan (porcentaje, mínimo, fechas) quedó abajo como «Más opciones del plan».
- Fin del ciclo (`logica/ciclo.js`): el día de cobro, Hoy muestra «fin del capítulo» arriba (lo ahorrado = lo que no gastaste, racha como quedaría) y «Empezar un pacto nuevo»: el libro en modo `ciclo` (solo las 3 preguntas, total = lo que quedó + cobro estimado) cierra el mes con `cerrarCiclo` justo antes de sellar.

## El Libro del Ahorro (2.2: toda la app es un libro)
- (Desde 2.3 esta capa se reemplazó por `css/papel.css`, ver abajo.) Paleta del libro en las mismas variables de siempre (`--sky`, `--mint`…), con `:root.v2` para ganarle a las viejas: noche (tema oscuro, papel #131813, tinta lima) y pergamino (tema claro). Matiz por capítulo, de la familia lima/verde: Hoy lima (`--sky`), Semanas menta (`--mint`), Fijos verde agua (`--teal`), Sueldo oliva dorado (`--grape`), Tarjeta verde ácido (`--coral`), Logros dorado (`--sun`). `--cobro` para los días que faltan; `--bad` rojo, `--ojo` ámbar.
- `#app` es la página (papel con fibras `--lb-fibra`, sombra del lomo, cantos a la derecha). `#hoja` envuelve encabezado + capítulo: es lo único que gira. La barra de capítulos (`nav.tabs`) y el micrófono quedan fuera de `#hoja` porque son fijos (un transform en un padre los movería).
- Pasar de hoja (`initDeslizar` en app.js): sigue al dedo (hasta 22°, sombra del pliegue con `--pl`), si la soltás antes de ~28 % del ancho vuelve; si tocás otro capítulo mientras gira, manda lo que tocaste. `main` y `.hero` tienen `touch-action:pan-y pinch-zoom`. Con «reducir movimiento», solo fundidos.
- Libro en todo: títulos y números grandes en Cormorant Garamond (`--f-libro`), capitular en la presentación de cada capítulo (`.ph-s::first-letter`), orla bajo el título, encabezado corrido en los otros capítulos (`.mini`), folio al pie (`.foot[data-folio]`), barra de lomos de cuero. «Hoy podés gastar» cuenta hasta el valor nuevo al anotar (≤ 400 ms) y el gasto nuevo aparece como tinta.

## El Libro del Ahorro (2.3: tapa cósmica y páginas de papel)
- Sistema visual en `css/papel.css` (se carga después de app.css y libro.css). Bloques de tokens `@papel` (claro) y `@noche` (papel de noche; el de `@media` tiene que ser igual al de `[data-theme="dark"]`).
- Cosmos (tapa y lo que rodea la página): #070B24 → #0E1640 → #1B2A6B, nebulosa #4B3FA8, estrellas #F4F1FF, estrella fugaz #FFD27A. Papel #F3E6C8 / sombra #E6D3A8 / canto #CDB27E; noche #2A2620 con tinta #EFE4CC.
- Tinta #1C2440 (secundaria #4A5170), dorado viejo #A87A1F solo en títulos grandes y números grandes (degradado `--oro-deg`); texto chico dorado `--oro-t`. Botones de acción: relleno naranja `--cta` con letra `--on-cta`. Enlaces `--azul`. Estados `--bien`, `--ojo`, `--mal`, siempre con ícono o texto.
- **Contraste: `tests/contraste.test.js` exige AA** (4,5:1 texto, 3:1 títulos dorados grandes) en los dos papeles. Si un color no pasa, se ajusta la luminosidad y se conserva el tono.
- Escalas fijas: espacios `--e1…--e6` (4/8/12/16/24/32), letra `--t1…--t8`. Texto con la letra del sistema; títulos y números grandes en Cormorant; números `lining-nums tabular-nums`.
- Piezas: página (`#app`, fibras `--fibra`, viñeta, sombra del lomo, cantos), recuadros finos (no tarjetas), botones que se hunden, campos como renglones, cinta del índice que cuelga del borde de arriba (`.indice-btn`), folio al pie, barra de lomos azul cósmico.
- Tapa (`libro.css`, bloque «Tapa cósmica»): nebulosa, dos capas de estrellas que titilan (opacity) y estrella fugaz cada 9 s (transform); con «reducir movimiento», quietas.

## El Libro del Ahorro (2.4: el libro y su navegación)
- Páginas y folios (`logica/capitulos.js`, `numeroDePagina`): prólogo 1–5 (`PROLOGO`: p1 propósito, q1 plata, q2 ahorro, q3 cobro, pacto), índice 6, Hoy 7, una por semana, Fijos, Sueldo, Tarjeta, Logros y Ajustes (la última). `vecina`: desde Hoy hacia atrás va a `'prologo'` (abre el pacto); después de Logros viene Ajustes.
- `ui/libro.js`, modos: `nuevo` (primera vez), `ciclo` (pacto nuevo al cobrar), `hojear` (ya hay datos: cada pregunta muestra tu valor de hoy con «Cambiar»; «Guardar» pasa por `aplicarAjuste` con «Deshacer» y reescribe el número) y `tapa` («Cerrar el libro»: la apertura al revés, 1,7× más rápida; al tocar la tapa vuelve a Hoy). `ctx.abrirPrologo(pagina, editar, dir)` y `ctx.cerrarLibro()` los pone app.js.
- «Tenés», «Guardás» y «Actualizar saldo» abren la pregunta del prólogo ya en modo «Cambiar» (antes de cobrar). La tarjeta «Tu pacto» de Ajustes se sacó: el pacto se cambia en el prólogo.
- Letra chica del pacto (página 5 en hojear): lo que sobra de cada semana y el formulario `#plan-aj` (porcentaje, mínimo, fechas). Ese formulario vive oculto en `#plan-aj-casa` (Ajustes) y se presta a la página mientras está abierta (`prestarLetra`/`devolverLetra`): sus ids y eventos (plan.js) no cambian.
- Índice (`ui/indice.js`): papel, número de página por capítulo, cinta en el abierto, «Ir al prólogo» y «Cerrar el libro». Saltar lejos desde el índice hace el abanico (3 hojas, ≤ 700 ms).
- Pie de cada página (`#pie`, dentro de `#hoja`): flecha anterior, folio y flecha siguiente (48 px, en las esquinas; en pantallas ≥ 1000 px, a los costados).
- Pase de hoja: eje inclinado `rotate3d(-.16,1,0,…)` (la esquina de abajo se adelanta), sombra del pliegue, rebote leve al asentar (400–450 ms). Con «reducir movimiento», solo fundidos (comprobado: ninguna animación con transform).
- `--cielo` tiene 8 capas: todo `background-size` que lo use tiene que repetir el tamaño 8 veces (si no, aparecen bandas).

## El Libro del Ahorro (2.5: capítulos)
- Avisos de Hoy = «notas al margen» (`.banner::before`, la de alerta dice «ojo»). Logros = sellos de lacre (logrados) y estampas punteadas (los que faltan); la racha es un sello dorado. Al desbloquear un logro: sonido de sello y polvo de estrellas (`polvo()` de `ui/libro.js`) desde el aviso.
- Categorías: su tarjeta (`#aj-cats`) vive en el capítulo V · Tarjeta (único lugar con categorías); `renderCategorias()` se llama con la pestaña `gastos`.
- La guía «Cómo usar esta página» se sacó (la reemplaza el índice); el tour (`PASOS`) habla de la cinta, el pie y el prólogo.
- Sonido (`ui/sonido.js`): opcional, apagado por defecto (localStorage `pa-sonido`, Ajustes → Sonido). Sin archivos: Web Audio arma «hoja», «sello» y «broche». Se usa en `pasarHoja`, el prólogo, el sello y la tapa.
- Pantallas ≥ 1100 px: el libro abierto a doble página (pliegue al medio). Hoy: cobro y «hoy podés gastar» a la izquierda, tu día y el plan a la derecha; los demás capítulos en dos columnas; cada semana es una doble página (resumen | anotar y lista). Las flechas quedan fuera del libro.
