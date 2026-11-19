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
- **Una sola cinemática (2.64):** estantería → tapa → libro abierto en una misma escena 3D, con una sola cámara y el mismo libro. Reemplaza las tres animaciones anteriores. Realista y sobria: sin chispas, estrellitas ni destellos grandes.
- **La 2.62 se eliminó por completo (2.64).** El respaldo ahora son 4 fotos sacadas de la propia escena, con fundidos. Descartado: mantener una segunda estantería dibujada.
- **Flechas ◀ ▶ (2.64):** se va y se vuelve por los pasos; en medio de una animación, ◀ la invierte desde donde está. En la app, la ◀ va junto a la ruedita y cierra el libro.
- **La escena queda en pausa con el libro abierto (2.64):** no dibuja, pero sigue en memoria para poder volver. Antes se liberaba al entrar.
- **Prólogo solo la primera vez de cada libro (2.64):** con algo guardado se entra directo a Hoy. Se puede volver a ver desde Ajustes.
- **Los dos libros no comparten datos; sí las preferencias del teléfono (2.64):** PIN, modo discreto, sonido, «abrir directo» y ayudas vistas siguen siendo del aparato. Se revisará función por función más adelante.
- **Cómo «llaman» los dos libros (2.64):** una luz tenue y cálida que sale de atrás de cada uno y un movimiento apenas visible. Descartado: el halo de color y la lámpara a la vista.
- **La galaxia de la tapa (2.64):** queda estampada en oro, con la constelación de cada libro encima.
- **Excepción de colores:** los colores de la escena 3D (madera, luces, cueros) los pone Three.js y no salen de `:root`; lo de afuera (nombres, flechas, velo) sí.
- **Hoy del libro individual (2.65): libro abierto sobre una mesa a la luz de una vela; la hoja clara dentro de una escena oscura.** Una página por pantalla (2:3), escrita a mano en Charm, encabezados en IM Fell English SC; la hoja se pasa siguiendo el dedo. Mismas funciones, datos y orden que el Hoy de siempre, que sigue debajo: los números salen de `ui/plan.js` y los botones tocan los de siempre. Lo que tiene formulario (actualizar lo que tenés, una nota con campos) abre el Hoy de siempre y vuelve solo al libro. El libro de a dos no cambia.
- **Dentro del libro individual, la regla de colores de `CLAUDE.md` se reemplaza por la del libro antiguo (pedido de Agus, 2.66; antes, 2.65: plata en tinta sepia):** tinta ferrogálica azul-negra (≈ #24304a) para todo el texto y los números, con más o menos carga por palabra y multiplicada sobre el papel; rojo de rúbrica (≈ #8a2b1d) solo para títulos de sección y «te pasaste»; oro solo en adornos chicos y en «21 días»; nada de verde ni de jade. «$ 967» se destaca por el tamaño (72 px) y la tinta más cargada. Fuera del libro, la regla de siempre.
- **El libro individual es un libro antiguo (2.66):** letra IM Fell (English para el texto, su itálica para notas, SC para títulos y romanos) con números antiguos. Quedan cuatro páginas: Hoy, Tus semanas, Tu plata y Tu plan; se sacaron Índice, Notas al margen («Ya lo pasé» incluido), Consejos y Seis ideas. Las notas que hacen algo se mudaron a su página: el fin del capítulo a Hoy, «esa meta no se puede» a Tu plan, lo que sobró de la semana a Tus semanas, «¿Te entraron?» a Tu plata; las que solo recordaban algo ya no salen en Hoy. Todo se hace en la hoja: cambiar un dato tacha la cifra vieja y abre un renglón («anotar · dejar»); elegir es rodear con un óvalo; borrar pregunta «¿Lo tachamos?» y el «deshacer» se escribe al pie. Sin ventanas, sin deslizadores, sin íconos.
- **Papel «Noche dorada»:** un solo tema oscuro; no hay claro ni selector de apariencia.
- **Menos texto:** máximo 2 líneas por bloque, el resto en desplegables.

## Código
- Sin frameworks ni dependencias; módulos ES; pruebas con `node --test`.
- **Three.js va copiado en `vendor/three-r187/`, sin npm ni compilación.** Desde 2.64 solo el núcleo (`three.module.js` y `three.core.js`): la escena no usa complementos.
- `sueldo.js`, `plan.js`, `extracto.js` y `logros.js` no se tocan sin pedido explícito.
- Repo público: jamás datos reales de nadie.
