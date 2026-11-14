/* Cinemática única · la línea de tiempo (pura: no toca la pantalla ni Three.js, se prueba con node --test).
   Tres tramos encadenados sobre una misma escena: entrada → elegir → abrir. Cada tramo lleva un avance p de 0 a 1;
   ir para atrás es el mismo tramo recorrido al revés, desde donde esté (nunca salta), a 0,8× del tiempo de ida.
   Estados en reposo: «menu» (la estantería), «tapa» (el libro de frente) y «app» (el libro abierto). */
export const DUR = { entrada: 2.6, elegir: 2.2, abrir: 2.0 };
export const VUELTA = .8;   /* volver tarda 0,8× lo que tardó ir */
export const SALTO = .4;    /* tocar durante la entrada: llega al final en 0,4 s */

/* curvas: nada se mueve en línea recta ni arranca de golpe */
export const cl = v => v < 0 ? 0 : v > 1 ? 1 : v;
export const suave = t => { t = cl(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const seda = t => { t = cl(t); return t * t * t * (t * (t * 6 - 15) + 10); };
/* arranca suave, toma velocidad pronto y frena largo (para la entrada de la cámara) */
export const frena = t => seda(Math.pow(cl(t), .72));
/* el pedacito de p que va de a a b, llevado a 0..1 */
export const tramo = (p, a, b) => cl((p - a) / (b - a));

export function crearCinematica() {
  let seg = 'foto', p = 0, dir = 0, libro = null, vel = 0;
  const c = {
    get seg() { return seg; }, get p() { return p; }, get dir() { return dir; }, get libro() { return libro; },
    estado() {
      if (seg === 'foto' || seg === 'entrada') return seg;
      if (seg === 'elegir') return dir ? 'elegir' : p <= 0 ? 'menu' : 'tapa';
      return dir ? 'abrir' : p >= 1 ? 'app' : 'tapa';
    },
    /* la foto de inicio ya dio paso a la escena: arranca la entrada */
    empezar() { if (seg !== 'foto') return false; seg = 'entrada'; p = 0; dir = 1; vel = 0; return true; },
    /* un toque en cualquier lado. En la entrada: salta al final y no elige nada. En la foto: se ignora. */
    tocar() { if (seg !== 'entrada' || vel) return false; vel = (1 - p) / SALTO; return true; },
    elegir(id) { if (c.estado() !== 'menu' || !id) return false; libro = id; seg = 'elegir'; p = 0; dir = 1; return true; },
    /* ◀ */
    atras() {
      const e = c.estado();
      if (e === 'tapa') { seg = 'elegir'; p = 1; dir = -1; return true; }
      if (e === 'app') { seg = 'abrir'; p = 1; dir = -1; return true; }
      if ((e === 'elegir' || e === 'abrir') && dir === 1) { dir = -1; return true; }
      return false;
    },
    /* ▶ */
    adelante() { if (c.estado() !== 'tapa') return false; seg = 'abrir'; p = 0; dir = 1; return true; },
    /* pasa dt segundos; devuelve a qué reposo llegó ('menu', 'tapa', 'app') o '' */
    avanzar(dt) {
      if (!dir || seg === 'foto' || !(dt > 0)) return '';
      const d = DUR[seg] * (dir < 0 ? VUELTA : 1);
      p += dir * Math.max(dt / d, seg === 'entrada' ? dt * vel : 0);
      if (dir > 0 && p >= 1) {
        dir = 0; vel = 0;
        if (seg === 'entrada') { seg = 'elegir'; p = 0; return 'menu'; }
        p = 1; return seg === 'elegir' ? 'tapa' : 'app';
      }
      if (dir < 0 && p <= 0) {
        dir = 0;
        if (seg === 'abrir') { seg = 'elegir'; p = 1; return 'tapa'; }
        p = 0; libro = null; return 'menu';
      }
      return '';
    },
    /* qué flechas se ven y con cuánta opacidad */
    flechas() {
      const e = c.estado();
      if (e === 'tapa') return { atras: 1, adelante: 1 };
      if (e === 'elegir' || e === 'abrir') return { atras: .5, adelante: 0 };
      return { atras: 0, adelante: 0 };
    },
    /* los nombres bajo los libros: solo con la estantería quieta */
    rotulos() { return c.estado() === 'menu'; },
    /* se pueden tocar los libros */
    tocable() { return c.estado() === 'menu'; },
    /* ir directo a un reposo, sin recorrido (reducir movimiento, pruebas, tomas fijas) */
    poner(e, id) {
      dir = 0; vel = 0;
      if (e === 'menu') { seg = 'elegir'; p = 0; libro = null; }
      else if (e === 'tapa') { seg = 'elegir'; p = 1; libro = id || libro; }
      else if (e === 'app') { seg = 'abrir'; p = 1; libro = id || libro; }
    }
  };
  return c;
}
