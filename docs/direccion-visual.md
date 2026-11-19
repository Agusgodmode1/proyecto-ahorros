# Dirección visual

Cómo se quiere ver y sentir la app. Pedido de Agus: «un cambio grande, un cambio lindo». Esta es la guía para que cada pantalla nueva hable el mismo idioma. Agus no tiene que describir detalles: Claude propone opciones visibles y él elige.

## Idea central
**Un mundo normal y corriente donde de pronto aparece lo mágico.** Lo cotidiano va apagado y realista; lo mágico brilla y es lo único con color vivo.

## La estantería (2.64): una sola cinemática
- **Principio:** realista y sobria. Lo único «mágico» es una luz tenue y cálida que sale de atrás de los dos libros. Nada de chispas, estrellitas ni destellos grandes.
- **Escena:** una biblioteca de noche. Mueble de madera oscura con veta, tres estantes, 20 libros comunes en tonos apagados y unas monedas. Luna fría desde la izquierda, luz cálida desde abajo a la derecha (sin lámpara a la vista), sombras suaves, viñeta.
- **Los dos libros:** tapa dura de cuero con grano, zafiro profundo (El Libro del Ahorro) y ámbar cobrizo (El Pacto de los Dos). Lomo con nervios, título en Fraunces dorado con relieve, la galaxia estampada en oro, cinta marcapáginas y guardas con mapa de estrellas. Se distinguen por su cuero y su luz, no por tamaño.
- **Cómo llaman:** asoman uno o dos centímetros del estante y se mecen muy despacio, cada uno a su tiempo.
- **Movimiento:** entrada de la cámara en arco (2,6 s); al elegir, el libro se inclina, sale del lomo, sube en arco y gira de frente (2,2 s), con un destello suave del hueco y el fondo desenfocado; un brillo cruza la tapa una vez; al abrir, la tapa gira sobre el lomo y la cámara entra en la página (2,0 s). Nada se mueve en línea recta ni arranca de golpe.
- **Letra:** los nombres bajo los libros son texto de la página (Fraunces, marfil) con una etiqueta corta en dorado («Solo» / «En pareja»).

## El libro individual (2.65; libro antiguo desde 2.66): a la luz de una vela
- **Principio:** el libro abierto sobre una mesa vieja, de noche; la hoja clara dentro de una escena oscura. Lo único que brilla es la vela (en las páginas impares, a la derecha).
- **La hoja:** papel viejo en proporción 2:3, una página por pantalla, con su número en romanos («— i —»). Fondos renderizados de nuestra escena (`icons/hoy/`), uno por lado y por alto de pantalla.
- **La letra y la tinta (2.66):** un libro antiguo. IM Fell English (texto), su itálica (notas) e IM Fell English SC (títulos, encabezados, romanos), con números antiguos. Cinco tamaños (72/24/20/17/14 px a 390; nada bajo 13). Tinta ferrogálica azul-negra para todo, unas palabras más cargadas que otras, multiplicada sobre el papel; rojo de rúbrica solo en títulos y «te pasaste»; oro solo en adornos chicos y en «21 días». Cada letra varía un poco (±1°, ±0,6 px), siempre igual.
- **La página:** encabezado corrido arriba en versalitas (el libro a la izquierda, el día a la derecha), título rojo centrado con un adorno fino, mucho margen, cifras alineadas como en un libro de cuentas y el número abajo («— i —»).
- **Cómo se hace cada cosa:** botón = una palabra subrayada a pluma (44 px de toque); elegir = palabras separadas por «·», la elegida con un óvalo de tinta; cambiar un dato = la cifra vieja tachada y un renglón fino debajo, con «anotar · dejar», y la nueva se escribe de a una letra (0,4 s); borrar = «¿Lo tachamos? sí · no» y «deshacer» al pie. Nada de ventanas, deslizadores ni íconos.
- **Movimiento:** la hoja se pasa siguiendo el dedo (16 franjas que se curvan, 0,45 a 0,7 s al soltar). Con «reducir movimiento», un fundido.
- **Modo discreto:** cada monto queda tapado con una mancha de tinta.

## Reglas para todo lo visual
- Un solo foco de color vivo por pantalla: lo mágico. Todo lo demás, apagado.
- Movimiento lento y suave (ciclos de 4 a 11 s en lo ambiental, 0,4 a 2 s en lo que responde a un toque); nada brusco ni que parpadee.
- Solo se animan `transform` y `opacity`; en el iPhone, pocos elementos animados a la vez (unas decenas de partículas, no cientos).
- Con «reducir movimiento»: solo fundidos, sin polvo ni partículas.
- Toda animación grande se verifica con capturas a 390 y 320 px de ancho.

## Cómo pedir cambios (para Agus)
No hace falta describir colores ni tamaños. Alcanza con reaccionar: «más oscuro», «más brillo en el libro azul», «que el polvo suba más lento», «me gusta cómo gira, pero que se quede más tiempo mostrando la tapa». Claude traduce eso a valores exactos.
