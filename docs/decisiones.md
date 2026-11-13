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
- **La estantería 3D (Three.js) es el inicio; la 2.62 queda como respaldo (2.63).** Al abrir se ve primero la 2.62 y la 3D entra con un fundido. Queda la 2.62 si no hay WebGL, si la 3D falla, si tarda más de 4 s, si se cortan los gráficos o con «reducir movimiento». Spec: `specs/2026-11-13-estanteria-3d.md`.
- **Excepción de colores (2.63):** los colores de la escena 3D (madera, luz de luna, lámpara, brillos de los libros) van escritos en `js/ui/escena3d.js`, como en el prototipo. Todo lo de afuera de la escena (pista, lemas, foco) sale de las variables de `:root`.
- **Al tocar un libro en la 3D se entra solo (2.63):** el libro sale, muestra la tapa un momento y abre. No están los botones «Volver / Abrir» del prototipo.
- **Pocas partículas en la 3D (2.63):** 80 en total (40 de polvo y 20 chispas por libro), en vez de las más de 300 del prototipo, para cuidar la batería.
- 2.62.1: la estantería 3D con Three.js empezó como prototipo aparte en `prototipo/` (Three.js copiado en `prototipo/vendor/`, sin npm). Desde 2.63 ya no es solo prototipo: la app la usa con su propia copia en `vendor/three-r187/`. La carpeta `prototipo/` sigue ahí (el service worker la deja pasar por la red); si se borra, se decide en otro cambio.
- **Estantería mágica (2.62):** biblioteca nocturna realista con dos libros que brillan (zafiro y ámbar); al tocar uno sale del estante y muestra su tapa. Estética «cinematográfica»: colores vivos, brillos, movimiento suave, cámara que se acerca. Detalle en `direccion-visual.md`.
- **Papel «Noche dorada»:** un solo tema oscuro; no hay claro ni selector de apariencia.
- **Menos texto:** máximo 2 líneas por bloque, el resto en desplegables.

## Código
- Sin frameworks ni dependencias; módulos ES; pruebas con `node --test`.
- **Three.js va copiado en `vendor/three-r187/` (2.63), sin npm ni compilación.** En sus complementos, `from 'three'` se cambió por la ruta relativa para no depender de un importmap.
- `sueldo.js`, `plan.js`, `extracto.js` y `logros.js` no se tocan sin pedido explícito.
- Repo público: jamás datos reales de nadie.
