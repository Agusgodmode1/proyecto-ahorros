# Proyecto Ahorros: reglas del proyecto

PWA para iPhone de finanzas personales de Agus (Uruguay). La publica GitHub Pages desde `main`. El usuario no es programador: explicale todo en español simple (rioplatense, con voseo, igual que la interfaz).

## Stack (no cambiar)
- HTML + CSS + JavaScript con módulos ES. Sin compilación, sin frameworks, sin dependencias de npm. `package.json` solo existe para `"type": "module"` y `npm test`.
- Datos: un documento en IndexedDB (`js/estado.js`). Siempre se guarda primero en el teléfono.
- Cuenta en la nube **opcional** (Supabase, etapa B: `js/nube.js`, `js/ui/cuenta.js`, `js/logica/sync.js`). Sin cuenta todo funciona igual y nada sale del teléfono. Nunca la clave `service_role`/secret en la app.
- Pruebas: `node --test` (sin dependencias).

## Reglas al hacer cualquier cambio
1. **Subí la versión** en `sw.js` (`VERSION`) y en `js/version.js`, con el mismo valor. Si no, el teléfono nunca recibe el cambio. Hay una prueba que controla que coincidan.
2. **Archivo nuevo** en `css/`, `js/` o `icons/`: agregalo a `ARCHIVOS` en `sw.js` (una prueba lo controla).
3. **Cambia la forma del estado**: subí `VERSION_ESTADO` en `js/estado.js`, agregá el paso en `migrar()` y una prueba en `tests/estado.test.js`. Nunca pierdas datos del usuario. Antes de migrar, la app guarda sola una copia (`guardarCopia`); se puede volver desde Ajustes → Copias automáticas.
4. Corré `node --test` y dejá todo en verde antes de hacer commit.
5. Un commit por cambio, con mensaje en español.

## Lógica de negocio validada (no tocar sin pedido explícito)
- `js/logica/sueldo.js`: liquidación validada con recibos reales (las pruebas de `tests/sueldo.test.js` tienen que dar ±$1).
- `js/logica/plan.js`, `extracto.js` y `logros.js`: copiados tal cual del archivo original `proyecto-ahorros.html`.
- Las reglas de horas y el día de cobro salen del perfil (`state.perfil`), nunca de números fijos en el código. Con el perfil de Agus los resultados tienen que ser idénticos (`tests/perfil.test.js`).
- Feriados: lista base en `js/logica/feriados.js` (solo 5 no laborables por año); los cambios del usuario en `state.feriados`; la app los aplica con `aplicarFeriados()`. **Regla de Agus: solo cuentan los no laborables; los laborables son días comunes** (por defecto `perfil.cobro.laborableHabil=true` y `perfil.horas.feriadoLaborable='comun'`, cambiables en el perfil).

## iOS
- Diseño "noche de cobro": fondo tinta violeta (#14131C), superficies sin borde, un pastel por pestaña (Plan lavanda, Semanas menta, Fijos agua, Sueldo lila, Tarjeta durazno, Logros miel). Lo único grande es "Hoy podés gastar" en la portada. Etiquetas en minúscula (sin mayúsculas sostenidas).
- Tema oscuro por defecto (`data-theme` en `<html>`, script en el `<head>` de index.html); se cambia en Ajustes → Apariencia y se guarda en `localStorage` (pa-tema). Todo color sale de las variables de `:root`.
- Campos con letra de 16 px o más (si no, iOS hace zoom). Teclados numéricos con `inputmode`.
- Respetar `env(safe-area-inset-*)`. Nada fijo puede quedar tapado por la barra de pestañas, el micrófono o el indicador de inicio.
- Gastos: el formulario es uno solo (`js/ui/gastos.js`), con categoría sugerida por la nota. Borrar siempre ofrece "Deshacer".
- Montos: siempre con `money()`/`money2()`/`usd()` de `ui/comun.js` (respetan el modo discreto).
- Dólares: un gasto en US$ guarda `monto` (pesos), `usd` y `cotiz` (la del día); todas las cuentas usan `monto`. Los fijos en US$ se recalculan al cambiar la cotización (`logica/monedas.js`).
- Metas (`state.metas`, `logica/metas.js`), aguinaldo y vacacional (`logica/aguinaldo.js`: estimaciones), CSV para Excel (`logica/csv.js`).
- La carga por voz nunca guarda sin confirmación. Si falla `SpeechRecognition`, se usa el dictado del teclado.
