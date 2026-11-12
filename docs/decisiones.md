# Decisiones tomadas (no se vuelven a discutir salvo pedido de Agus)

Una línea por decisión. Lo nuevo va arriba. El detalle técnico de cada una está en `referencia-tecnica.md`.

## Producto
- **Distribución:** repositorio de GitHub + GitHub Pages, por link. Descartado: App Store y Google Play.
- **Privacidad:** datos solo locales (IndexedDB), sin nube. Para pasar datos entre aparatos se usa un archivo (Ajustes → Pasar mis datos a otro aparato).
- **Monetización:** ninguna.
- **Dos libros** elegidos desde la estantería: solo (clave de datos de siempre, `principal`) y El Pacto de los Dos (pareja). Se retiró el tercer libro «del Negocio».
- **Pantalla principal simple:** Hoy muestra cuánto podés gastar por mes y por día, días para cobrar y registro de gastos. Horas extra, calculador de sueldo y análisis de la tarjeta viven en «Herramientas» (la ruedita).
- **Prólogo:** se mantiene, con «Saltar» para ir directo a las herramientas.
- **Con lo que tengo:** por defecto no se anota cada gasto; se actualiza el saldo y la app calcula lo gastado. «Anoto cada gasto» se elige en Ajustes.
- **Una sola forma de cobrar:** por mes (sueldo o factura mensual). Las otras formas están en la rama `guardado/v2.25.0-con-ventas`.
- **Recibo:** con un solo recibo alcanza para completar el sueldo; el PDF nunca se guarda.

## Diseño
- 2.62.1: se prueba una estantería 3D real con Three.js (copiado en `prototipo/vendor/`, sin npm), primero como prototipo aparte en `prototipo/`. El service worker deja pasar `/prototipo/` por la red.
- **Estantería mágica (2.62):** biblioteca nocturna realista con dos libros que brillan (zafiro y ámbar); al tocar uno sale del estante y muestra su tapa. Estética «cinematográfica»: colores vivos, brillos, movimiento suave, cámara que se acerca. Detalle en `direccion-visual.md`.
- **Papel «Noche dorada»:** un solo tema oscuro; no hay claro ni selector de apariencia.
- **Menos texto:** máximo 2 líneas por bloque, el resto en desplegables.

## Código
- Sin frameworks ni dependencias; módulos ES; pruebas con `node --test`.
- `sueldo.js`, `plan.js`, `extracto.js` y `logros.js` no se tocan sin pedido explícito.
- Repo público: jamás datos reales de nadie.
