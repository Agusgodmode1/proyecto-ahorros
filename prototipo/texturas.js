/* Cinemática única · texturas. Todo se dibuja por código (cuero, madera, papel, dorado): no se descarga ninguna imagen.
   Cada material va por capas: color, relieve (normales) y aspereza/metal. Con semilla: sale siempre igual. */
import * as THREE from 'three';

/* ---------- azar y ruido ---------- */
export function azar(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(x, y) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
/* ruido suave; con per > 0 se repite cada «per» (para baldosas sin costura) */
function ruido(x, y, per) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  let x0 = xi, x1 = xi + 1, y0 = yi, y1 = yi + 1;
  if (per) { x0 = ((x0 % per) + per) % per; x1 = ((x1 % per) + per) % per; y0 = ((y0 % per) + per) % per; y1 = ((y1 % per) + per) % per; }
  const a = hash(x0, y0), b = hash(x1, y0), c = hash(x0, y1), d = hash(x1, y1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 4, per = 0) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * ruido(x * f, y * f, per ? per * f : 0); f *= 2; a *= .5; } return s; }
const cl = v => v < 0 ? 0 : v > 1 ? 1 : v;
const ss = (a, b, v) => { const t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mz = (a, b, t) => a + (b - a) * t;

export function lienzo(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
let ANISO = 4;
export function ponerAniso(n) { ANISO = Math.min(8, n || 4); }
export function tex(c, { color = true, rep = null, espejo = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  t.anisotropy = ANISO; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
function deAltura(a, w, h, k, envuelve) {
  const c = lienzo(w, h), g = c.getContext('2d'), im = g.createImageData(w, h), d = im.data;
  const at = (x, y) => { if (envuelve) { x = (x + w) % w; y = (y + h) % h; } else { x = x < 0 ? 0 : x >= w ? w - 1 : x; y = y < 0 ? 0 : y >= h ? h - 1 : y; } return a[y * w + x]; };
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    const nx = (at(x - 1, y) - at(x + 1, y)) * k, ny = (at(x, y + 1) - at(x, y - 1)) * k, L = Math.hypot(nx, ny, 1);
    d[i] = (nx / L * .5 + .5) * 255; d[i + 1] = (ny / L * .5 + .5) * 255; d[i + 2] = (1 / L * .5 + .5) * 255; d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); return c;
}
function difuminar(a, w, h, pasadas) {
  const b = new Float32Array(a.length);
  for (let p = 0; p < pasadas; p++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; b[i] = (a[i] * 2 + a[y * w + (x ? x - 1 : x)] + a[y * w + (x < w - 1 ? x + 1 : x)]) / 4; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; a[i] = (b[i] * 2 + b[(y ? y - 1 : y) * w + x] + b[(y < h - 1 ? y + 1 : y) * w + x]) / 4; }
  }
  return a;
}

/* ---------- el grano del cuero: una baldosa de 512 que se repite ---------- */
const NG = 512;
let GRANO = null;
function grano() {
  if (GRANO) return GRANO;
  const a = new Float32Array(NG * NG), C = 72, r = azar(5), px = new Float32Array(C * C), py = new Float32Array(C * C);
  for (let i = 0; i < C * C; i++) { px[i] = r(); py[i] = r(); }
  for (let y = 0; y < NG; y++) for (let x = 0; x < NG; x++) {
    const fx = x / NG * C, fy = y / NG * C, cx = Math.floor(fx), cy = Math.floor(fy);
    let f1 = 9, f2 = 9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const qx = (cx + i + C) % C, qy = (cy + j + C) % C, k = qy * C + qx;
      const dx = cx + i + px[k] - fx, dy = cy + j + py[k] - fy, d = dx * dx + dy * dy;
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
    }
    /* poros: cada celda es un «granito» alto, con surcos finos entre uno y otro */
    const surco = ss(0, .32, Math.sqrt(f2) - Math.sqrt(f1));
    a[y * NG + x] = surco * (.78 + .22 * fbm(x / 9, y / 9, 2, NG / 9 | 0));
  }
  return (GRANO = a);
}
let _granoN = null;
export function texGranoNormal(rep) {
  if (!_granoN) _granoN = deAltura(grano(), NG, NG, 2.2, true);
  return tex(_granoN, { color: false, rep });
}

/* ---------- cuero teñido con arte dorado ----------
   o = { W, H, base:[r,g,b] 0..255, semilla, arte(g, W, H) dorado, ciego(g, W, H) gofrado sin oro, desgaste 0..1, sombraLados } */
export function cuero(o) {
  const W = o.W, H = o.H, G = grano();
  const cA = lienzo(W, H), gA = cA.getContext('2d'); gA.fillStyle = '#fff'; gA.strokeStyle = '#fff'; if (o.arte) o.arte(gA, W, H);
  const cB = lienzo(W, H), gB = cB.getContext('2d'); gB.fillStyle = '#fff'; gB.strokeStyle = '#fff'; if (o.ciego) o.ciego(gB, W, H);
  const A = gA.getImageData(0, 0, W, H).data, B = gB.getImageData(0, 0, W, H).data;
  const oro = new Float32Array(W * H), cie = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) { oro[i] = A[i * 4 + 3] / 255; cie[i] = B[i * 4 + 3] / 255; }
  const hund = new Float32Array(W * H); for (let i = 0; i < W * H; i++) hund[i] = Math.max(oro[i], cie[i] * .8);
  difuminar(hund, W, H, 2);
  const cC = lienzo(W, H), gC = cC.getContext('2d'), iC = gC.createImageData(W, H), C = iC.data;
  const cO = lienzo(W, H), gO = cO.getContext('2d'), iO = gO.createImageData(W, H), O = iO.data;
  const alt = new Float32Array(W * H), s0 = o.semilla || 1, des = o.desgaste == null ? 1 : o.desgaste;
  const esc = 1024 / H * 1.15; /* cuántos px del grano por px de la textura */
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
    const gx = (x * esc) | 0, gy = (y * esc) | 0, gr = G[(gy % NG) * NG + (gx % NG)];
    const man = fbm(x / 150 + s0, y / 150 + s0 * 2, 4), fino = fbm(x / 9 + s0, y / 9, 2);
    /* pátina: más oscuro hacia los bordes, donde se junta la mugre y la mano */
    const bx = Math.min(x, W - 1 - x), by = Math.min(y, H - 1 - y), bd = Math.min(bx, by);
    const lados = o.sombraLados ? 1 - o.sombraLados * (1 - ss(0, W * .3, bx)) : 1;
    const pat = (.62 + .38 * ss(0, 90, bd + man * 50)) * lados;
    /* desgaste: en las esquinas y el filo el tinte se gasta y asoma el cuero más claro */
    const esq = Math.hypot(bx, by);
    let roz = des * Math.max(ss(46 + man * 60, 0, esq) * .9, ss(7, 0, bd - fino * 5) * .7, ss(.74, .9, fbm(x / 60 + 9 + s0, y / 60, 3) * (1 - ss(60, 240, bd)) * 1.25) * .45);
    roz = cl(roz) * (.55 + .45 * gr);
    const sh = (.72 + .5 * man) * (.8 + .2 * gr) * pat;
    let r = o.base[0] * sh, g = o.base[1] * sh, b = o.base[2] * sh;
    const cl1 = (o.base[0] + o.base[1] + o.base[2]) / 3;
    r = mz(r, o.base[0] * .9 + cl1 * .55 + 34, roz * .62); g = mz(g, o.base[1] * .9 + cl1 * .5 + 28, roz * .62); b = mz(b, o.base[2] * .85 + cl1 * .4 + 20, roz * .62);
    if (cie[i] > 0) { const k = 1 - .38 * cie[i]; r *= k; g *= k; b *= k; }
    /* el oro: una hoja fina, con poros donde no terminó de pegar y gastada en los bordes */
    let m = oro[i];
    if (m > 0) {
      m *= ss(.1, .22, fbm(x / 3.1 + 40, y / 3.1, 2) + .2 * gr) * (1 - .8 * roz);
      const t = .78 + .3 * fbm(x / 26, y / 13 + 7, 2) + .1 * (gr - .5);
      r = mz(r, 246 * t, m); g = mz(g, 200 * t, m); b = mz(b, 112 * t, m);
    }
    const j = i * 4;
    C[j] = r > 255 ? 255 : r; C[j + 1] = g > 255 ? 255 : g; C[j + 2] = b > 255 ? 255 : b; C[j + 3] = 255;
    const rug = mz(mz(.4 + .22 * (1 - gr) + .1 * man, .88, roz * .8), .3 + .12 * fino, m);
    O[j] = 255; O[j + 1] = rug * 255; O[j + 2] = m * 215; O[j + 3] = 255;
    alt[i] = gr * .34 + man * .25 - hund[i] * .85;
  }
  gC.putImageData(iC, 0, 0); gO.putImageData(iO, 0, 0);
  const n = deAltura(alt, W, H, 3.4, false);
  return { map: tex(cC), normalMap: tex(n, { color: false }), orm: tex(cO, { color: false }) };
}

/* ---------- el arte de la tapa ---------- */
function estrella(g, x, y, R, r) {
  g.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, q = i % 2 ? r : R; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * q, y + Math.sin(a) * q); }
  g.closePath(); g.fill();
}
function texto(g, t, x, y, fuente, sep) {
  g.font = fuente;
  if ('letterSpacing' in g) { g.letterSpacing = (sep || 0) + 'px'; g.textAlign = 'center'; g.fillText(t, x + (sep || 0) / 2, y); g.letterSpacing = '0px'; return; }
  let w = 0; for (const ch of t) w += g.measureText(ch).width + (sep || 0);
  let cx = x - w / 2; g.textAlign = 'left';
  for (const ch of t) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + (sep || 0); }
}
/* El motivo de siempre, ahora estampado en oro: la galaxia en espiral hecha de puntitos, con la constelación del libro encima */
function galaxia(g, cx, cy, R, semilla) {
  const r = azar(semilla);
  g.save(); g.translate(cx, cy); g.rotate(-.42); g.scale(1, .56);
  for (let brazo = 0; brazo < 2; brazo++) for (let i = 0; i < 300; i++) {
    const t = i / 300, ang = t * 5.1 + brazo * Math.PI, rad = 10 + t * R + (r() - .5) * (6 + 34 * t);
    const tam = (1 - t * .6) * (1.5 + r() * 2.6);
    g.globalAlpha = 1;
    g.beginPath(); g.arc(Math.cos(ang + (r() - .5) * .18) * rad, Math.sin(ang + (r() - .5) * .18) * rad, tam, 0, 7); g.fill();
  }
  for (let i = 0; i < 70; i++) { const a = r() * 7, d = Math.pow(r(), 2) * 30; g.globalAlpha = .9; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, 1.4 + r() * 2.4, 0, 7); g.fill(); }
  g.globalAlpha = 1; g.restore();
  g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill();
}
const CONSTELACION = {
  solo: { p: [[-.62, .55], [-.12, -.02], [-.32, -.62], [.58, -.22], [.78, .38]], l: [[0, 1], [1, 2], [1, 3], [3, 4]], t: [1, 1.5, .9, 1.15, .9] },
  duo: { p: [[-.6, .3], [.6, -.3]], l: [], t: [1.6, 1.6], arco: true }
};
function constelacion(g, id, cx, cy, R) {
  const K = CONSTELACION[id], P = K.p.map(p => [cx + p[0] * R, cy + p[1] * R]);
  g.lineWidth = 3; g.lineCap = 'round';
  for (const [a, b] of K.l) { g.beginPath(); g.moveTo(P[a][0], P[a][1]); g.lineTo(P[b][0], P[b][1]); g.stroke(); }
  if (K.arco) { g.beginPath(); g.moveTo(P[0][0], P[0][1]); g.quadraticCurveTo(cx, cy - R * 1.05, P[1][0], P[1][1]); g.stroke(); }
  P.forEach((p, i) => { g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(p[0], p[1], 15 * K.t[i], 0, 7); g.fill(); g.restore(); estrella(g, p[0], p[1], 15 * K.t[i], 4.6 * K.t[i]); });
}
function filete(g, W, H, m, ancho) { g.lineWidth = ancho; g.strokeRect(m, m, W - 2 * m, H - 2 * m); }
function esquinero(g, x, y, sx, sy) {
  g.save(); g.translate(x, y); g.scale(sx, sy); g.lineWidth = 2.6;
  g.beginPath(); g.arc(0, 0, 26, 0, Math.PI / 2); g.stroke();
  g.beginPath(); g.arc(0, 0, 40, .12, Math.PI / 2 - .12); g.stroke();
  estrella(g, 20, 20, 9, 3); g.restore();
}
function arteTapa(L) {
  return (g, W, H) => {
    filete(g, W, H, 40, 5); filete(g, W, H, 53, 2.2);
    esquinero(g, 52, 52, 1, 1); esquinero(g, W - 52, 52, -1, 1); esquinero(g, 52, H - 52, 1, -1); esquinero(g, W - 52, H - 52, -1, -1);
    galaxia(g, W / 2, 330, 232, L.id === 'solo' ? 3 : 8);
    constelacion(g, L.id, W / 2, 322, L.id === 'solo' ? 132 : 116);
    g.textBaseline = 'alphabetic';
    texto(g, L.chico, W / 2, 664, "italic 400 46px Fraunces, Georgia, serif", 3);
    let px = 196; g.font = `600 ${px}px Fraunces, Georgia, serif`;
    const an = g.measureText(L.grande).width; if (an > W - 190) px = px * (W - 190) / an;
    texto(g, L.grande, W / 2, 664 + px * .93, `600 ${px}px Fraunces, Georgia, serif`, 0);
    const yl = 908; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - 120, yl); g.lineTo(W / 2 - 22, yl); g.moveTo(W / 2 + 22, yl); g.lineTo(W / 2 + 120, yl); g.stroke();
    estrella(g, W / 2, yl, 11, 3.6);
  };
}
function ciegoTapa(g, W, H) { g.lineWidth = 9; g.strokeRect(22, 22, W - 44, H - 44); g.lineWidth = 3; g.strokeRect(68, 68, W - 136, H - 136); }

/* nervios del lomo: en qué altura (0 abajo, 1 arriba) va cada uno */
export const NERVIOS = [.115, .285, .715, .885];
function arteLomo(L) {
  return (g, W, H) => {
    for (const n of NERVIOS) { const y = H * (1 - n); g.fillRect(10, y - 21, W - 20, 3); g.fillRect(10, y + 18, W - 20, 3); }
    g.fillRect(10, 26, W - 20, 5); g.fillRect(10, H - 31, W - 20, 5);
    const yA = H * (1 - (NERVIOS[3] + NERVIOS[2]) / 2); estrella(g, W / 2, yA, 27, 8.5);
    const yB = H * (1 - (NERVIOS[0] + NERVIOS[1]) / 2); estrella(g, W / 2, yB - 20, 11, 3.6); estrella(g, W / 2, yB + 20, 11, 3.6);
    g.save(); g.translate(W / 2, H / 2); g.rotate(Math.PI / 2); g.textBaseline = 'middle';
    texto(g, L.titulo, 0, 4, "600 62px Fraunces, Georgia, serif", 1.5); g.restore();
  };
}
function ciegoLomo(g, W, H) { for (const n of NERVIOS) { const y = H * (1 - n); g.fillRect(0, y - 12, W, 2); g.fillRect(0, y + 10, W, 2); } }

export const HEROES = {
  solo: { id: 'solo', titulo: 'El Libro del Ahorro', chico: 'el libro del', grande: 'Ahorro', base: [20, 42, 108], cinta: 0x7a1626, halo: 0x5c8dff },
  duo: { id: 'duo', titulo: 'El Pacto de los Dos', chico: 'el pacto de los', grande: 'Dos', base: [172, 92, 24], cinta: 0x1f4a36, halo: 0xff9a3c }
};
export function texHeroe(id) {
  const L = HEROES[id], s = id === 'solo' ? 3 : 17;
  return {
    tapa: cuero({ W: 664, H: 1024, base: L.base, semilla: s, arte: arteTapa(L), ciego: ciegoTapa }),
    lomo: cuero({ W: 192, H: 1024, base: L.base, semilla: s + 5, arte: arteLomo(L), ciego: ciegoLomo, desgaste: .7 }),
    contra: cuero({ W: 352, H: 512, base: L.base, semilla: s + 9, ciego: (g, W, H) => { g.lineWidth = 5; g.strokeRect(11, 11, W - 22, H - 22); } })
  };
}

/* ---------- papel: canto de las hojas y guardas ---------- */
export function texCanto(horizontal) {
  const w = 128, h = 256, c = lienzo(horizontal ? h : w, horizontal ? w : h), g = c.getContext('2d'), im = g.createImageData(c.width, c.height), d = im.data, r = azar(21);
  const col = new Float32Array(w); for (let x = 0; x < w; x++) col[x] = .72 + .28 * r() * (r() < .12 ? .55 : 1);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const a = horizontal ? y : x, b = horizontal ? x : y, v = col[a] * (.9 + .1 * ruido(a * .7, b / 40)) * (.86 + .14 * fbm(a / 30, b / 60, 2));
    const i = (y * c.width + x) * 4; d[i] = 236 * v; d[i + 1] = 222 * v; d[i + 2] = 186 * v; d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); return tex(c);
}
export function texGuarda() {
  const N = 512, c = lienzo(N, N), g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = .9 + .1 * fbm(x / 70, y / 70, 3) - .05 * ruido(x / 2.2, y / 1.3), i = (y * N + x) * 4;
    d[i] = 231 * v; d[i + 1] = 218 * v; d[i + 2] = 188 * v; d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  /* un mapa de estrellas apenas marcado, como el de las guardas de siempre */
  const r = azar(77); g.fillStyle = '#8a6a3a'; g.strokeStyle = '#8a6a3a';
  const P = []; for (let i = 0; i < 46; i++) P.push([r() * N, r() * N, r()]);
  g.globalAlpha = .28; g.lineWidth = 1;
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const dd = Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]); if (dd < 70) { g.beginPath(); g.moveTo(P[i][0], P[i][1]); g.lineTo(P[j][0], P[j][1]); g.stroke(); } }
  g.globalAlpha = .55; for (const p of P) estrella(g, p[0], p[1], 3 + p[2] * 5, 1 + p[2] * 1.4);
  for (let i = 0; i < 260; i++) { g.globalAlpha = .2 + r() * .3; g.beginPath(); g.arc(r() * N, r() * N, .6 + r(), 0, 7); g.fill(); }
  g.globalAlpha = 1; return tex(c);
}

/* ---------- madera oscura con veta ---------- */
export function texMadera() {
  const N = 512, a = new Float32Array(N * N), c = lienzo(N, N), g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    /* la veta corre a lo largo de x: anillos estirados, torcidos por el ruido, y poros finos */
    const tor = fbm(u * 2, v * 5, 3, 0) * 5.2 + fbm(u * .7 + 4, v * 1.5, 2) * 6;
    const an = Math.sin((v * 21 + tor) * Math.PI * 2) * .5 + .5, an2 = Math.pow(an, 2.2);
    const poro = Math.pow(ruido(u * 34, v * 330), 3), hebra = ruido(u * 9, v * 190);
    const k = .34 + .5 * an2 + .16 * hebra - .3 * poro;
    a[y * N + x] = k;
    const i = (y * N + x) * 4, t = cl(k);
    d[i] = mz(30, 118, t); d[i + 1] = mz(15, 66, t); d[i + 2] = mz(8, 32, t); d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return { c, n: deAltura(a, N, N, 2.4, true) };
}
export function texPared() {
  const N = 256, a = new Float32Array(N * N), c = lienzo(N, N), g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const k = fbm(x / 40, y / 40, 4, N / 40 | 0) * .8 + .2 * ruido(x / 2.5, y / 2.5); a[y * N + x] = k;
    const i = (y * N + x) * 4; d[i] = mz(40, 76, k); d[i + 1] = mz(44, 82, k); d[i + 2] = mz(60, 104, k); d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return { map: tex(c, { rep: [5, 4] }), normalMap: tex(deAltura(a, N, N, 1.4, true), { color: false, rep: [5, 4] }) };
}

/* ---------- los libros comunes: todos los lomos en un solo atlas (un solo material, un solo dibujo) ----------
   20 celdas de 102×512. Las 19 primeras son lomos; la última trae cuero liso (arriba) y canto de hojas (abajo). */
export const ATLAS = { N: 1024, cols: 10, cw: 102.4, ch: 512 };
export function celda(i, x0 = 0, y0 = 0, x1 = 1, y1 = 1) {
  const cx = (i % ATLAS.cols) * ATLAS.cw + 3, cy = Math.floor(i / ATLAS.cols) * ATLAS.ch + 3, w = ATLAS.cw - 6, h = ATLAS.ch - 6;
  return { u0: (cx + x0 * w) / 1024, u1: (cx + x1 * w) / 1024, v0: 1 - (cy + y1 * h) / 1024, v1: 1 - (cy + y0 * h) / 1024 };
}
export const PALETA = ['#6e4630', '#35573f', '#7a2e2a', '#40526e', '#806a3c', '#30505c', '#5e3f2a', '#5a3340', '#3e5a50', '#7a5c3e', '#5c2c2a', '#3a4e30', '#694a34', '#34486a', '#84402e', '#4c5c3c', '#4a4254', '#6e5426', '#58423a'];
export function texAtlas() {
  const N = 1024, cC = lienzo(N, N), g = cC.getContext('2d'), cO = lienzo(N, N), o = cO.getContext('2d'), r = azar(91), G = grano();
  g.fillStyle = '#000'; g.fillRect(0, 0, N, N); o.fillStyle = 'rgb(255,178,0)'; o.fillRect(0, 0, N, N);
  const ORO = '#c9a45c', ORO_O = 'rgb(255,92,255)';
  const lomos = [];
  for (let i = 0; i < 19; i++) {
    const x = (i % 10) * 102.4, y = Math.floor(i / 10) * 512, w = 102.4, h = 512, col = PALETA[i % PALETA.length];
    lomos.push(col);
    g.fillStyle = col; g.fillRect(x, y, w + 1, h);
    const oro = (fx, fy, fw, fh) => { g.fillStyle = ORO; g.fillRect(x + fx, y + fy, fw, fh); o.fillStyle = ORO_O; o.fillRect(x + fx, y + fy, fw, fh); };
    const estilo = Math.floor(r() * 4), nb = 3 + Math.floor(r() * 3);
    /* nervios: una banda apenas más clara arriba y oscura abajo, con filetes dorados */
    for (let b = 0; b < nb; b++) {
      const by = 46 + (h - 92) * b / (nb - 1);
      if (estilo !== 3) { g.fillStyle = 'rgba(255,255,255,.13)'; g.fillRect(x, y + by - 6, w + 1, 4); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x, y + by + 4, w + 1, 5); }
      if (estilo < 2 || (estilo === 3 && (b === 0 || b === nb - 1))) { oro(8, by - 13, w - 16, 2.5); oro(8, by + 13, w - 16, 2.5); }
    }
    /* tejuelo: la etiqueta del título, de otro color, con rayitas que hacen de letras */
    if (r() < .8) {
      const ty = h * (.2 + r() * .12), th = 70 + r() * 30, tj = r() < .5;
      if (tj) { g.fillStyle = ['#3a1410', '#14231a', '#1a1a1a', '#2a1c0c'][Math.floor(r() * 4)]; g.fillRect(x + 7, y + ty, w - 14, th); }
      oro(9, ty + 3, w - 18, 1.5); oro(9, ty + th - 5, w - 18, 1.5);
      const nl = 2 + Math.floor(r() * 3); for (let l = 0; l < nl; l++) { const lw = (w - 40) * (.5 + r() * .5); oro((w - lw) / 2, ty + 16 + l * (th - 30) / nl, lw, 4); }
    }
    if (estilo === 1) { g.fillStyle = ORO; o.fillStyle = ORO_O; for (const c2 of [g, o]) { c2.save(); c2.translate(x + w / 2, y + h * .72); c2.rotate(Math.PI / 4); c2.fillRect(-9, -9, 18, 18); c2.restore(); } }
    if (estilo === 2) { oro(8, h - 60, w - 16, 12); }
  }
  /* celda 19: cuero liso (arriba) y canto de hojas (abajo) */
  const x19 = 9 * 102.4, y19 = 512;
  g.fillStyle = '#d9d9d9'; g.fillRect(x19, y19, 103, 256);
  g.fillStyle = '#e6d8b4'; g.fillRect(x19, y19 + 256, 103, 256);
  o.fillStyle = 'rgb(255,225,0)'; o.fillRect(x19, y19 + 256, 103, 256);
  const im = g.getImageData(0, 0, N, N), d = im.data, io = o.getImageData(0, 0, N, N), q = io.data, rl = azar(4);
  const raya = new Float32Array(104); for (let i = 0; i < 104; i++) raya[i] = .7 + .3 * rl() * (rl() < .15 ? .5 : 1);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4, ci = Math.floor(x / 102.4) + 10 * Math.floor(y / 512), lx = x - Math.floor(x / 102.4) * 102.4, ly = y % 512;
    let k;
    if (ci === 19 && ly >= 256) k = raya[lx | 0] * (.88 + .12 * ruido(lx, ly / 30));
    else {
      const gr = G[((y * 1.6) % NG | 0) * NG + ((x * 1.6) % NG | 0)], man = fbm(x / 60, y / 90, 3);
      /* lomo redondeado: se oscurece hacia los dos lados (sombra horneada), más gastado arriba y abajo */
      const red = ci === 19 ? 1 : .5 + .5 * Math.sin(Math.PI * cl(lx / 102.4));
      const punta = ci === 19 ? 0 : ss(26, 0, Math.min(ly, 511 - ly) + man * 22) * .5;
      k = (.7 + .5 * man) * (.82 + .18 * gr) * (.55 + .45 * red) + punta * .4;
      if (q[i + 2] > 128) { k = (.75 + .4 * fbm(x / 7, y / 7, 2)) * (.6 + .4 * red); if (fbm(x / 2.3, y / 2.3 + 30, 2) < .34) { q[i + 2] = 0; q[i + 1] = 190; const b2 = lomos[ci] || '#333'; d[i] = parseInt(b2.slice(1, 3), 16); d[i + 1] = parseInt(b2.slice(3, 5), 16); d[i + 2] = parseInt(b2.slice(5, 7), 16); } }
      else q[i + 1] = (.62 + .25 * (1 - gr)) * 255;
    }
    d[i] = Math.min(255, d[i] * k); d[i + 1] = Math.min(255, d[i + 1] * k); d[i + 2] = Math.min(255, d[i + 2] * k);
  }
  g.putImageData(im, 0, 0); o.putImageData(io, 0, 0);
  return { map: tex(cC), orm: tex(cO, { color: false }) };
}

/* ---------- luces dibujadas: halo, sombras de contacto, haz de luna ---------- */
export function texHalo() {
  const N = 128, c = lienzo(N, N), g = c.getContext('2d'), gr = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.42)'); gr.addColorStop(.6, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, N, N); return tex(c);
}
/* una franja de luz en diagonal: el brillo que cruza la tapa */
export function texBrillo() {
  const N = 256, c = lienzo(N, N), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, N, N); g.translate(N / 2, N / 2); g.rotate(-.42);
  const gr = g.createLinearGradient(-46, 0, 46, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(-46, -N, 92, N * 2);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
/* sombra de un estante sobre lo que tiene abajo: oscura arriba y a la izquierda (la luna entra desde ahí), y en el apoyo */
export function texSombraNicho() {
  const N = 128, c = lienzo(N, N), g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    const a = Math.max(ss(.34, 0, v) * .78, ss(.16, 0, u) * .55, ss(.1, 0, 1 - u) * .32, ss(.06, 0, 1 - v) * .5);
    const i = (y * N + x) * 4; d[i] = 2; d[i + 1] = 3; d[i + 2] = 8; d[i + 3] = a * 255;
  }
  g.putImageData(im, 0, 0); return tex(c);
}
export function texSombraBlanda() {
  const N = 64, c = lienzo(N, N), g = c.getContext('2d'), gr = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  gr.addColorStop(0, 'rgba(0,0,4,.85)'); gr.addColorStop(.55, 'rgba(0,0,4,.4)'); gr.addColorStop(1, 'rgba(0,0,4,0)');
  g.fillStyle = gr; g.fillRect(0, 0, N, N); return tex(c);
}
export function texHaz() {
  const W = 64, H = 256, c = lienzo(W, H), g = c.getContext('2d'), im = g.createImageData(W, H), d = im.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H, a = Math.sin(Math.PI * u) ** 1.6 * ss(0, .12, v) * ss(1, .35, v) * (.75 + .25 * ruido(u * 9, v * 2));
    const i = (y * W + x) * 4; d[i] = 170; d[i + 1] = 196; d[i + 2] = 255; d[i + 3] = a * 255;
  }
  g.putImageData(im, 0, 0); return tex(c);
}
/* grano de película: una baldosa fija que va por CSS encima de todo (no parpadea y no le cuesta nada a la placa) */
export function granoCSS() {
  const N = 128, c = lienzo(N, N), g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data, r = azar(8);
  for (let i = 0; i < N * N; i++) { const v = r() * 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0); return c.toDataURL('image/png');
}
