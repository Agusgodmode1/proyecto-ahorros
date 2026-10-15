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
- Diseño "Limón" (modo oscuro): fondo negro (#0D0D0D), lima (#E4FF3A) para lo que podés gastar, verde para lo que guardás, naranja para el cobro; un tono por pestaña (Plan lima, Semanas verde, Fijos turquesa, Sueldo violeta suave, Tarjeta naranja, Logros ámbar). En la portada, "Hoy podés gastar" (tarjeta de ~36 px) y "Cobrás en N días" (tarjeta con barra de 12 tramos) van cada uno en su tarjeta. Etiquetas en minúscula (sin mayúsculas sostenidas).
- Tema oscuro por defecto (`data-theme` en `<html>`, script en el `<head>` de index.html); se cambia en Ajustes → Apariencia y se guarda en `localStorage` (pa-tema). Todo color sale de las variables de `:root`.
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
- Topes: un gasto nuevo no puede ser mayor que lo disponible (`permitido()` en `ui/gastos.js`, ofrece "Actualizar saldo"); el ahorro del plan no pasa de monto − fijos (`planear`); la meta de "Cuando cobres" no pasa de sueldo − fijos (`proximo`). Los gastos del extracto de la tarjeta no se limitan: son hechos.

## Inicio simple (1.15)
- Portada: "Hoy podés gastar" + botón grande «Anotar un gasto» (abre la hoja `#gasto-sheet`, formulario con prefijo `q`) + fila de 3 datos (Cobrás en / Tenés / Guardás). La cuenta regresiva ya no es una tarjeta aparte (`renderCountdown` quedó vacío).
- "Hasta que cobres", "Semana por semana" y "Cuando cobres" son `<details class="fold">` cerrados; el estado abierto se guarda en `plegados` (plan.js).
- Vista simple: botón `#modo-simple` (localStorage `pa-simple`), clase `.simple` en `#app` oculta plan y tarjetas, muestra los últimos 3 gastos.
- Tamaños táctiles: bloque "Inicio 1.15" al final de app.css (botones/campos ≥ 48 px).
