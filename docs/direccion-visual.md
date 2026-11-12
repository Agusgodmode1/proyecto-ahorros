# Dirección visual

Cómo se quiere ver y sentir la app. Pedido de Agus: «un cambio grande, un cambio lindo». Esta es la guía para que cada pantalla nueva hable el mismo idioma. Agus no tiene que describir detalles: Claude propone opciones visibles y él elige.

## Idea central
**Un mundo normal y corriente donde de pronto aparece lo mágico.** Lo cotidiano va apagado y realista; lo mágico brilla y es lo único con color vivo.

## La estantería (2.62)
- **Escena:** una biblioteca común de noche, con luz de luna entrando por la izquierda (cian) y un resplandor de lámpara abajo a la derecha (naranja). Madera cálida, libros comunes en tonos apagados (marrones, verdes, bordó, azul grisáceo).
- **Los dos libros mágicos:** zafiro vivo (El Libro del Ahorro) y ámbar/cobre vivo (El Pacto de los Dos). Cada uno tiene un halo que late despacio, polvo de luz que sube (puntos y estrellitas) y un flote casi imperceptible.
- **Cámara y cine:** la escena entra como una cámara que se acerca (1,7 s), viñeta oscura en los bordes y grano de película fino.
- **Al tocar un libro:** sale del estante, viaja al centro, gira de lomo a tapa, destello de luz + chispas, un brillo recorre la tapa; el resto de la biblioteca se apaga y se funde hacia la tapa del libro. Dura unos 2,2 s.
- **Letra:** títulos en Fraunces (la de siempre), dorada con un resplandor suave; textos chicos en Nunito.

## Reglas para todo lo visual
- Un solo foco de color vivo por pantalla: lo mágico. Todo lo demás, apagado.
- Movimiento lento y suave (ciclos de 4 a 11 s en lo ambiental, 0,4 a 2 s en lo que responde a un toque); nada brusco ni que parpadee.
- Solo se animan `transform` y `opacity`; en el iPhone, pocos elementos animados a la vez (unas decenas de partículas, no cientos).
- Con «reducir movimiento»: solo fundidos, sin polvo ni partículas.
- Toda animación grande se verifica con capturas a 390 y 320 px de ancho.

## Cómo pedir cambios (para Agus)
No hace falta describir colores ni tamaños. Alcanza con reaccionar: «más oscuro», «más brillo en el libro azul», «que el polvo suba más lento», «me gusta cómo gira, pero que se quede más tiempo mostrando la tapa». Claude traduce eso a valores exactos.
