# Proyecto Ahorros: reglas del proyecto

PWA para iPhone de finanzas personales de Agus (Uruguay). La publica GitHub Pages desde `main`. El usuario no es programador: explicale todo en español simple (rioplatense, con voseo, igual que la interfaz).

## Stack (no cambiar)
- HTML + CSS + JavaScript con módulos ES. Sin compilación, sin frameworks, sin dependencias de npm. `package.json` solo existe para `"type": "module"` y `npm test`.
- Datos: un documento en IndexedDB (`js/estado.js`). Sin servidor, sin cuentas, sin APIs externas, sin enviar datos a ningún lado.
- Pruebas: `node --test` (sin dependencias).

## Reglas al hacer cualquier cambio
1. **Subí la versión** en `sw.js` (`VERSION`) y en `js/version.js`, con el mismo valor. Si no, el teléfono nunca recibe el cambio. Hay una prueba que controla que coincidan.
2. **Archivo nuevo** en `css/`, `js/` o `icons/`: agregalo a `ARCHIVOS` en `sw.js` (una prueba lo controla).
3. **Cambia la forma del estado**: subí `VERSION_ESTADO` en `js/estado.js`, agregá el paso en `migrar()` y una prueba en `tests/estado.test.js`. Nunca pierdas datos del usuario.
4. Corré `node --test` y dejá todo en verde antes de hacer commit.
5. Un commit por cambio, con mensaje en español.

## Lógica de negocio validada (no tocar sin pedido explícito)
- `js/logica/sueldo.js`: liquidación validada con recibos reales (las pruebas de `tests/sueldo.test.js` tienen que dar ±$1).
- `js/logica/plan.js`, `extracto.js` y `logros.js`: copiados tal cual del archivo original `proyecto-ahorros.html`.
- Las reglas de horas y el día de cobro salen del perfil (`state.perfil`), nunca de números fijos en el código. Con el perfil de Agus los resultados tienen que ser idénticos (`tests/perfil.test.js`).
- Feriados: lista base en `js/logica/feriados.js`; los cambios del usuario en `state.feriados`; la app los aplica con `usarFeriados()`.

## iOS
- Campos con letra de 16 px o más (si no, iOS hace zoom). Teclados numéricos con `inputmode`.
- Respetar `env(safe-area-inset-*)`. Nada fijo puede quedar tapado por la barra de pestañas, el micrófono o el indicador de inicio.
- La carga por voz nunca guarda sin confirmación. Si falla `SpeechRecognition`, se usa el dictado del teclado.
