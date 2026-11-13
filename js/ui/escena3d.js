/* La escena 3D de la estantería (2.63): una biblioteca de noche con dos libros mágicos, hecha con Three.js.
   Es el prototipo de `prototipo/escena.js` llevado a la app, con el mismo aspecto. Lo que cambió es solo el borde:
   no tiene pantalla de carga ni botones propios, avisa si se cortan los gráficos o falla, se pausa y se libera.
   Todas las texturas se generan acá (madera, cuero, papel, dorado): no se descarga ninguna imagen, modelo ni fuente.
   Los colores de la escena van escritos acá, como en el prototipo (excepción anotada en docs/decisiones.md).
   Cuándo se muestra y cuándo queda la 2.62: logica/estante3d.js. Quién la pone en pantalla: ui/estante.js.
   Este archivo se carga recién cuando hace falta (import() desde ui/estante.js). */
import * as THREE from '../../vendor/three-r187/three.module.js';
import { RoundedBoxGeometry } from '../../vendor/three-r187/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from '../../vendor/three-r187/addons/environments/RoomEnvironment.js';
import { EffectComposer } from '../../vendor/three-r187/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../../vendor/three-r187/addons/postprocessing/RenderPass.js';
import { BokehPass } from '../../vendor/three-r187/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from '../../vendor/three-r187/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../vendor/three-r187/addons/postprocessing/OutputPass.js';
import { ShaderPass } from '../../vendor/three-r187/addons/postprocessing/ShaderPass.js';

const MOVIL = matchMedia('(pointer: coarse)').matches;
/* Regla de la app: pocas partículas (unas decenas en total, no cientos como en el prototipo) */
const N_POLVO = 40, N_CHISPAS = 20;
/* Cuánto se queda el libro mostrando la tapa antes de entrar */
const T_TAPA = .6;

/* ---------- azar y ruido ---------- */
function azar(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rnd = azar(11);
const entre = (a, b) => a + (b - a) * rnd();
function hash(x, y) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function ruido(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 5) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * ruido(x * f, y * f); f *= 2.03; a *= .5; } return s; }

/* ---------- texturas ---------- */
function lienzo(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function campo(w, h, f) { const a = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = f(x / w, y / h); return a; }
function pintar(w, h, a, col) {
  const c = lienzo(w, h), g = c.getContext('2d'), im = g.createImageData(w, h), d = im.data;
  for (let i = 0; i < w * h; i++) { const k = col(a[i], i % w, (i / w) | 0); d[i * 4] = k[0]; d[i * 4 + 1] = k[1]; d[i * 4 + 2] = k[2]; d[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0); return c;
}
function normales(w, h, a, k) {
  return pintar(w, h, a, (v, x, y) => {
    const l = a[y * w + (x - 1 + w) % w], r = a[y * w + (x + 1) % w], u = a[((y - 1 + h) % h) * w + x], d = a[((y + 1) % h) * w + x];
    const nx = (l - r) * k, ny = (d - u) * k, L = Math.hypot(nx, ny, 1);
    return [(nx / L * .5 + .5) * 255, (ny / L * .5 + .5) * 255, (1 / L * .5 + .5) * 255];
  });
}
let ANISO = 4;
let TEXS = []; // todas las texturas creadas, para poder liberarlas
function tex(c, color = true, rep = 1) {
  const t = new THREE.CanvasTexture(c); TEXS.push(t);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = ANISO;
  return t;
}
const mezcla = (a, b, t) => a + (b - a) * t;

function texMadera() {
  const N = 512, a = campo(N, N, (u, v) => {
    const veta = Math.sin((v * 70 + fbm(u * 3, v * 6, 4) * 9) * Math.PI);
    return .55 * fbm(u * 2, v * 40, 4) + .3 * (veta * .5 + .5) + .15 * ruido(u * 300, v * 8);
  });
  const col = pintar(N, N, a, v => [mezcla(34, 104, v), mezcla(19, 64, v), mezcla(11, 36, v)]);
  return { map: tex(col), normal: tex(normales(N, N, a, 2.5), false) };
}
let CUERO_C, CUERO_N;
function texCuero() {
  const N = 256, a = campo(N, N, (u, v) => .7 * fbm(u * 18, v * 18, 4) + .3 * Math.pow(ruido(u * 140, v * 140), 3));
  CUERO_C = pintar(N, N, a, v => { const g = mezcla(150, 245, v); return [g, g, g]; });
  CUERO_N = tex(normales(N, N, a, 3.5), false);
}
function texPapel() {
  const a = campo(64, 256, (u, v) => .75 + .25 * ruido(u * 3, v * 260));
  return tex(pintar(64, 256, a, v => [218 * v + 20, 204 * v + 18, 164 * v + 12]));
}
function texPared() {
  const N = 512, a = campo(N, N, (u, v) => fbm(u * 5, v * 5, 6) * .8 + .2 * ruido(u * 90, v * 90));
  return { map: tex(pintar(N, N, a, v => [mezcla(14, 40, v), mezcla(16, 44, v), mezcla(28, 66, v)]), true, 3), normal: tex(normales(N, N, a, 1.6), false, 3) };
}

/* Dibuja la misma figura en cuatro capas: color, metal, aspereza y brillo propio. */
const CAPAS = ['c', 'm', 'r', 'e'];
function capas(w, h, dib, conBrillo) {
  const out = {};
  for (const k of CAPAS) {
    if (k === 'e' && !conBrillo) continue;
    const c = lienzo(w, h), g = c.getContext('2d'); dib(g, k, w, h); out[k] = c;
  }
  return {
    map: tex(out.c), metalnessMap: tex(out.m, false), roughnessMap: tex(out.r, false),
    emissiveMap: out.e ? tex(out.e) : null,
  };
}
function base(g, k, w, h, color) {
  g.fillStyle = k === 'c' ? color : k === 'm' ? '#000' : k === 'r' ? '#c4c4c4' : '#000';
  g.fillRect(0, 0, w, h);
  if (k === 'c') {
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = g.createPattern(CUERO_C, 'repeat'); g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#0008'); gr.addColorStop(.18, '#0000'); gr.addColorStop(.82, '#0000'); gr.addColorStop(1, '#0008');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
}
const ORO = '#d8b468';
const tinta = (k, oro) => k === 'c' ? oro : k === 'm' ? '#fff' : k === 'r' ? '#5a5a5a' : '#000';

function lomoComun(color, seed) {
  const r = azar(seed);
  return capas(64, 512, (g, k, w, h) => {
    base(g, k, w, h, color);
    const n = 2 + Math.floor(r() * 3);
    const ys = [.08, .14, .78, .86, .92].slice(0, n + 1);
    g.fillStyle = tinta(k, ORO);
    for (const y of ys) g.fillRect(0, y * h, w, 3 + (seed % 3));
    if (r() < .55) { // etiqueta del título
      const y0 = h * entre(.25, .35), hh = h * entre(.18, .26);
      g.fillStyle = k === 'c' ? '#0000004d' : k === 'r' ? '#a8a8a8' : '#000';
      g.fillRect(w * .14, y0, w * .72, hh);
      g.strokeStyle = tinta(k, ORO); g.lineWidth = 2; g.strokeRect(w * .14, y0, w * .72, hh);
    }
  }, false);
}
function lomoMagico(L) {
  return capas(128, 768, (g, k, w, h) => {
    base(g, k, w, h, L.cuero);
    const oro = tinta(k, ORO), luz = k === 'e' ? L.brillo : oro;
    g.fillStyle = luz;
    for (const y of [.05, .075, .9, .925]) g.fillRect(0, y * h, w, 6);
    g.strokeStyle = luz; g.lineWidth = 3;
    g.strokeRect(w * .12, h * .14, w * .76, h * .72);
    g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2);
    g.fillStyle = luz; g.font = 'italic 44px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(L.titulo, 0, 2);
    g.restore();
    for (const y of [.11, .89]) { g.beginPath(); g.arc(w / 2, y * h, 9, 0, 7); g.fill(); }
  }, true);
}
function tapaMagica(L) {
  return capas(512, 768, (g, k, w, h) => {
    base(g, k, w, h, L.cuero);
    const oro = tinta(k, ORO), luz = k === 'e' ? L.brillo : oro;
    g.strokeStyle = oro; g.lineWidth = 6; g.strokeRect(34, 34, w - 68, h - 68);
    g.lineWidth = 2; g.strokeRect(52, 52, w - 104, h - 104);
    g.fillStyle = oro;
    for (const [x, y] of [[52, 52], [w - 52, 52], [52, h - 52], [w - 52, h - 52]]) {
      g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill();
      g.beginPath(); g.arc(x, y, 26, 0, 7); g.lineWidth = 2; g.strokeStyle = oro; g.stroke();
    }
    // emblema
    g.save(); g.translate(w / 2, h * .42); g.strokeStyle = luz; g.fillStyle = luz; g.lineWidth = 5;
    if (L.id === 'solo') {
      g.beginPath();
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? 34 : 96; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); g.fill();
      g.beginPath(); g.arc(0, 0, 118, 0, 7); g.stroke();
    } else {
      g.beginPath(); g.arc(-44, 0, 70, 0, 7); g.stroke();
      g.beginPath(); g.arc(44, 0, 70, 0, 7); g.stroke();
      g.beginPath(); g.arc(0, 0, 122, 0, 7); g.lineWidth = 2; g.stroke();
    }
    g.restore();
    g.fillStyle = oro; g.textAlign = 'center';
    g.font = 'italic 46px Georgia, serif'; g.fillText(L.titulo, w / 2, h * .7);
    g.font = 'italic 24px Georgia, serif'; g.fillText(L.lema, w / 2, h * .77);
  }, true);
}

/* ---------- datos de los libros ---------- */
const LIBROS = [
  { id: 'solo', titulo: 'El Libro del Ahorro', lema: 'Cada peso, en su lugar', cuero: '#1d3f9e', brillo: '#7fc4ff', luz: 0x4aa8ff },
  { id: 'duo', titulo: 'El Pacto de los Dos', lema: 'Lo nuestro, juntos', cuero: '#a24a14', brillo: '#ffc46a', luz: 0xff9a3c },
];
const COLORES = ['#5b1d1d', '#1f3b2c', '#1c2a4a', '#4a3020', '#6b5320', '#3e2440', '#2b2b2b', '#1d4a4a', '#7a3b22', '#2f3d1c', '#593a2a', '#3a3f55'];

/* ---------- escena ---------- */
/* op = { capa, pista, etiquetas:[el,el], botones:[el,el], cancelado() → bool, alPerder(), alError(e) }
   Devuelve { seguir(), pausar(), elegir(id, alTerminar), perder(), liberar() }; arranca en pausa, con el primer cuadro ya dibujado. */
export async function crearEscena(op) {
  rnd = azar(11); TEXS = []; ANISO = 4; // siempre la misma biblioteca, también al recrearla
  const ancho = () => op.capa.clientWidth || innerWidth, alto = () => op.capa.clientHeight || innerHeight;
  const sueltos = []; // lo que hay que liberar aparte de la escena
  let ren = null, escena = null, comp = null, libre = false, corre = false;
  const alPerder = e => { e.preventDefault(); if (!libre) op.alPerder(); };
  /* Se detiene y devuelve la memoria y el contexto de gráficos (los iPhone tienen pocos) */
  function liberar() {
    if (libre) return; libre = true; corre = false;
    removeEventListener('resize', encuadre);
    if (!ren) return;
    try {
      ren.setAnimationLoop(null);
      ren.domElement.removeEventListener('webglcontextlost', alPerder);
      if (escena) escena.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        for (const m of [].concat(o.material || [])) m.dispose();
      });
      for (const t of TEXS) t.dispose();
      for (const s of sueltos) s.dispose();
      if (comp) comp.dispose();
      ren.dispose(); if (!ren.getContext().isContextLost()) ren.forceContextLoss();
    } catch (e) { /* ya no importa: se va igual */ }
    ren.domElement.remove(); TEXS = [];
  }
  let encuadre = () => {};
  const espera = () => new Promise((ok, mal) => requestAnimationFrame(() => {
    if (op.cancelado()) mal(new Error('3D cancelada')); else ok();
  }));
  try {
  ren = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  ren.domElement.addEventListener('webglcontextlost', alPerder);
  ren.setPixelRatio(Math.min(devicePixelRatio, MOVIL ? 1.6 : 2));
  ren.setSize(ancho(), alto());
  ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFShadowMap;
  ren.toneMapping = THREE.ACESFilmicToneMapping; ren.toneMappingExposure = 1.05;
  ANISO = ren.capabilities.getMaxAnisotropy();
  op.capa.prepend(ren.domElement);

  escena = new THREE.Scene();
  escena.background = new THREE.Color(0x05060b);
  escena.fog = new THREE.Fog(0x05060b, 6, 14);
  const pm = new THREE.PMREMGenerator(ren), sala = new RoomEnvironment();
  escena.environment = pm.fromScene(sala, .04).texture;
  sueltos.push(pm, escena.environment, { dispose: () => sala.dispose() });
  escena.environmentIntensity = .22;

  const cam = new THREE.PerspectiveCamera(32, ancho() / alto(), .05, 40);

  await espera();
  texCuero();
  const madera = texMadera(); await espera();
  const pared = texPared(); const papel = texPapel(); await espera();

  /* habitación */
  const matPared = new THREE.MeshStandardMaterial({ map: pared.map, normalMap: pared.normal, roughness: .95 });
  const muro = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), matPared);
  muro.position.set(0, 2, -.25); muro.receiveShadow = true; escena.add(muro);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshStandardMaterial({ map: madera.map, normalMap: madera.normal, roughness: .55, color: 0x6a5a50 }));
  piso.rotation.x = -Math.PI / 2; piso.position.y = -.05; piso.receiveShadow = true; escena.add(piso);

  /* mueble */
  const W = 1.24, D = .36, LADO = .055, TAB = .036;
  const COMP = [.42, .56, .42]; // de abajo hacia arriba; el del medio es el de los libros mágicos
  const matMadera = new THREE.MeshStandardMaterial({ map: madera.map, normalMap: madera.normal, roughness: .6, color: 0xb59a86 });
  const matFondo = new THREE.MeshStandardMaterial({ map: madera.map, normalMap: madera.normal, roughness: .8, color: 0x4a3a32 });
  const mueble = new THREE.Group(); escena.add(mueble);
  const caja = (w, h, d, x, y, z, m = matMadera) => {
    const g = new RoundedBoxGeometry(w, h, d, 2, .006);
    const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.castShadow = me.receiveShadow = true; mueble.add(me); return me;
  };
  const zocalo = .09;
  let y = zocalo; const pisos = [];
  caja(W, zocalo, D + .02, 0, zocalo / 2, 0);
  for (const h of COMP) { caja(W - LADO * 2, TAB, D, 0, y + TAB / 2, 0); pisos.push({ y: y + TAB, h }); y += TAB + h; }
  caja(W - LADO * 2, TAB, D, 0, y + TAB / 2, 0); y += TAB;
  const ALTO = y + .07;
  caja(W + .06, .07, D + .05, 0, y + .035, .01); // cornisa
  caja(LADO, ALTO, D, -W / 2 + LADO / 2, ALTO / 2, 0);
  caja(LADO, ALTO, D, W / 2 - LADO / 2, ALTO / 2, 0);
  caja(W - LADO * 2, ALTO - zocalo, .015, 0, zocalo + (ALTO - zocalo) / 2, -D / 2 + .008, matFondo);

  /* libros */
  const matPapel = new THREE.MeshStandardMaterial({ map: papel, roughness: .9 });
  const lomosComunes = COLORES.flatMap((c, i) => [0, 1, 2].map(j => ({ c, t: lomoComun(c, i * 7 + j + 1) })));
  await espera();
  const cueroDe = c => new THREE.MeshStandardMaterial({ color: c, map: tex(CUERO_C), normalMap: CUERO_N, roughness: .72 });
  const tapas = {}; for (const c of COLORES) tapas[c] = cueroDe(c);

  function libro(x, py, grosor, alto, fondo, mats) {
    const g = new RoundedBoxGeometry(grosor, alto, fondo, 2, Math.min(.006, grosor * .2));
    const m = new THREE.Mesh(g, mats);
    const zFrente = D / 2 - .025 - rnd() * .025;
    m.position.set(x, py + alto / 2, zFrente - fondo / 2);
    m.castShadow = m.receiveShadow = true; mueble.add(m); return m;
  }
  const xmin = -W / 2 + LADO + .006, xmax = W / 2 - LADO - .006;
  const magicos = [];
  function comunes(p, x0, x1) {
    let x = x0 + entre(0, .012);
    while (true) {
      const grosor = entre(.022, .052), alto = p.h * entre(.58, .88), fondo = entre(.2, .28);
      if (x + grosor > x1) break;
      const { c, t } = lomosComunes[Math.floor(rnd() * lomosComunes.length)];
      const mLomo = new THREE.MeshStandardMaterial({ map: t.map, metalnessMap: t.metalnessMap, roughnessMap: t.roughnessMap, metalness: 1, roughness: 1 });
      const tapa = tapas[c];
      const me = libro(x + grosor / 2, p.y, grosor, alto, fondo, [tapa, tapa, matPapel, matPapel, mLomo, matPapel]);
      me.rotation.y = entre(-.03, .03);
      x += grosor + entre(.0005, .004);
    }
  }
  function magico(p, L, x) {
    const grosor = .066, alto = p.h * .84, fondo = .3;
    const lomo = lomoMagico(L), tapa = tapaMagica(L);
    const em = new THREE.Color(L.brillo);
    const mLomo = new THREE.MeshStandardMaterial({ ...lomo, metalness: 1, roughness: 1, emissive: em, emissiveIntensity: 1 });
    const mTapa = new THREE.MeshStandardMaterial({ ...tapa, metalness: 1, roughness: 1, emissive: em, emissiveIntensity: .22 });
    const me = libro(x + grosor / 2, p.y, grosor, alto, fondo, [mTapa, mTapa, matPapel, matPapel, mLomo, matPapel]);
    const luz = new THREE.PointLight(L.luz, .5, .6, 2); luz.position.set(0, 0, fondo / 2 + .05); me.add(luz);
    magicos.push({ L, me, mLomo, mTapa, luz, grosor, alto, fondo, base: me.position.clone(), rotBase: me.rotation.clone() });
  }
  pisos.forEach((p, ip) => {
    if (ip !== 1) return comunes(p, xmin, xmax);
    const a = xmin + (xmax - xmin) * .24, b = xmin + (xmax - xmin) * .66;
    comunes(p, xmin, a - .008); magico(p, LIBROS[0], a);
    comunes(p, a + .074, b - .008); magico(p, LIBROS[1], b);
    comunes(p, b + .074, xmax);
  });
  await espera();

  /* luces */
  escena.add(new THREE.HemisphereLight(0x3a4a7a, 0x1a0f08, .35));
  const lampara = new THREE.SpotLight(0xffc47a, 38, 9, .55, .7, 1.6);
  lampara.position.set(-1.6, 2.9, 2.6); lampara.target.position.set(.05, .85, 0);
  lampara.castShadow = true; lampara.shadow.mapSize.set(MOVIL ? 1024 : 2048, MOVIL ? 1024 : 2048);
  lampara.shadow.bias = -.0004; lampara.shadow.radius = 4;
  escena.add(lampara, lampara.target);
  const luna = new THREE.DirectionalLight(0x9fb8ff, 1.1);
  luna.position.set(3, 3.4, 1.8); luna.target.position.set(0, .9, 0);
  luna.castShadow = true; luna.shadow.mapSize.set(1024, 1024);
  Object.assign(luna.shadow.camera, { left: -1.2, right: 1.2, top: 1.4, bottom: -.6, near: .5, far: 9 });
  luna.shadow.bias = -.0005;
  escena.add(luna, luna.target);
  const barrido = new THREE.PointLight(0xfff0d0, 0, 1.2, 2); escena.add(barrido);

  /* rayo de luna */
  const rayo = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 5),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { t: { value: 0 }, c: { value: new THREE.Color(0x8fa8ff) } },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv;uniform float t;uniform vec3 c;
        void main(){float x=abs(vUv.x-.5)*2.;float a=exp(-x*x*3.)*smoothstep(0.,.35,vUv.y)*smoothstep(1.,.55,vUv.y);
        a*=.75+.25*sin(vUv.y*9.+t*.4+vUv.x*3.);gl_FragColor=vec4(c*a*.2,1.);}`,
    }));
  rayo.position.set(.75, 1.5, .55); rayo.rotation.set(0, 0, .55); escena.add(rayo);

  /* polvo */
  const puntoTex = (() => { const c = lienzo(64, 64), g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(.25, '#fffa'); gr.addColorStop(1, '#fff0'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return tex(c); })();
  const NP = N_POLVO, pos = new Float32Array(NP * 3), sem = [];
  for (let i = 0; i < NP; i++) { pos.set([entre(-1.1, 1.3), entre(0, 2.2), entre(.2, 1.6)], i * 3); sem.push([rnd() * 6.3, entre(.2, .6)]); }
  const gPolvo = new THREE.BufferGeometry(); gPolvo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const polvo = new THREE.Points(gPolvo, new THREE.PointsMaterial({ map: puntoTex, size: .011, color: 0xffe6c0, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }));
  escena.add(polvo);

  /* chispas de los libros mágicos */
  for (const M of magicos) {
    const N = N_CHISPAS, p = new Float32Array(N * 3), col = new Float32Array(N * 3), d = [];
    for (let i = 0; i < N; i++) d.push([rnd() * 6.3, entre(.05, .11), entre(-.24, .24), entre(.6, 2.2), rnd() * 6.3]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: puntoTex, size: .022, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    M.me.add(pts); M.chispas = { g, d, c: new THREE.Color(M.L.brillo) };
  }

  /* posprocesado: foco, resplandor, viñeta y grano */
  comp = new EffectComposer(ren);
  comp.setPixelRatio(ren.getPixelRatio());
  comp.addPass(new RenderPass(escena, cam));
  const foco = new BokehPass(escena, cam, { focus: 5, aperture: MOVIL ? .0016 : .0022, maxblur: .006 });
  comp.addPass(foco);
  const brillo = new UnrealBloomPass(new THREE.Vector2(ancho(), alto()), .4, .45, .9);
  comp.addPass(brillo);
  comp.addPass(new OutputPass());
  const grano = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, t: { value: 0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D tDiffuse;uniform float t;varying vec2 vUv;
      float r(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+t)*43758.5453);}
      void main(){vec4 c=texture2D(tDiffuse,vUv);float d=distance(vUv,vec2(.5,.47));
      c.rgb*=mix(.38,1.,1.-smoothstep(.28,.85,d));c.rgb+=(r(vUv*913.)-.5)*.028;gl_FragColor=c;}`,
  });
  comp.addPass(grano);
  sueltos.push(foco, brillo, grano);

  /* cámara */
  const mira = new THREE.Vector3(0, pisos[1].y + pisos[1].h * .45, 0);
  let dist = 5;
  encuadre = () => {
    if (libre) return;
    const a = ancho() / alto(), t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    dist = Math.max((W * .56) / (t * a), 1.05 / t);
    cam.aspect = a; cam.updateProjectionMatrix();
    ren.setSize(ancho(), alto()); comp.setSize(ancho(), alto());
  };
  encuadre(); addEventListener('resize', encuadre);

  /* interacción: los toques llegan por los botones invisibles que la app pone encima de cada libro (44 px o más) */
  let elegido = null, tSac = 0, dir = 0, listo = false, alTerminar = null, tTapa = 0;
  const T_SAC = 2.6;
  function elegir(id, fin) {
    const M = magicos.find(m => m.L.id === id);
    if (!M || elegido || libre) return;
    elegido = M; dir = 1; tSac = 0; tTapa = 0; alTerminar = fin;
    op.pista.style.opacity = 0; for (const e2 of etqs) e2.style.opacity = 0;
  }

  const suave = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const salir = t => 1 - Math.pow(1 - t, 3);
  const cl = t => Math.min(1, Math.max(0, t));
  const etqs = op.etiquetas, tams = [null, null];
  const va = new THREE.Vector3(), vb = new THREE.Vector3();

  function poseLibro(M, p, reloj) {
    const b = M.base, camZ = mira.z + dist - .45;
    const destino = new THREE.Vector3(0, mira.y + .07, camZ - 1.75);
    const p1 = salir(cl(p / .22)), p2 = suave(cl((p - .18) / .82));
    const fuera = b.clone(); fuera.z += .17 * p1; fuera.y += .012 * p1;
    const pos = fuera.lerp(destino, p2);
    pos.y += Math.sin(p2 * Math.PI) * .12 + (p > .99 ? Math.sin(reloj * 1.3) * .006 : 0);
    M.me.position.copy(pos);
    M.me.rotation.set(-.05 * p2, -Math.PI / 2 * p2 + Math.sin(p2 * Math.PI) * .25, Math.sin(p1 * Math.PI) * .03);
  }

  /* bucle */
  /* el reloj es propio y solo avanza mientras se dibuja: al volver del segundo plano sigue donde estaba */
  let t = 0, ultimo = 0, inicio = null;
  const v = new THREE.Vector3();
  function cuadro(dt) {
    t += dt;
    if (inicio === null) inicio = t;
    const ti = suave(cl((t - inicio) / 4.2));
    const AN = ancho(), AL = alto();

    // cámara: entra despacio y respira
    const acerca = elegido ? suave(cl(tSac / T_SAC)) : 0;
    cam.position.set(Math.sin(t * .21) * .03 * (1 - acerca) - .35 * (1 - ti), mira.y + .05 - .3 * (1 - ti) + Math.sin(t * .17) * .015, mira.z + dist + 1.6 * (1 - ti) - .45 * acerca);
    cam.lookAt(mira.x, mira.y - .03 * (1 - acerca), mira.z);
    if (!listo && ti > .55) { listo = true; if (!elegido) { op.pista.style.opacity = .8; for (const e of etqs) e.style.opacity = 1; } }

    // libro elegido
    if (elegido) {
      tSac = cl(tSac / T_SAC + dir * dt / T_SAC) * T_SAC;
      const p = tSac / T_SAC;
      poseLibro(elegido, p, t);
      foco.uniforms.focus.value = mezcla(cam.position.distanceTo(mira), 1.75, suave(p));
      foco.uniforms.aperture.value = (MOVIL ? .0016 : .0022) * (1 + suave(p) * 1.6);
      for (const M of magicos) if (M !== elegido) M.luz.intensity = .5 * (1 - p * .8);
      // barrido de luz sobre el dorado de la tapa
      const s = cl((p - .82) / .18);
      barrido.intensity = dir > 0 ? Math.sin(s * Math.PI) * 1.2 : 0;
      barrido.position.set(-.25 + s * .5, mira.y + .1, elegido.me.position.z + .25);
      brillo.strength = .4 + Math.sin(s * Math.PI) * .35;
      /* ya muestra la tapa: un momento y se entra al libro (el prototipo mostraba acá «Volver / Abrir») */
      if (p >= 1 && dir > 0 && alTerminar) {
        tTapa += dt;
        if (tTapa >= T_TAPA) { const fin = alTerminar; alTerminar = null; fin(); }
      }
      if (p <= 0 && dir < 0) {
        elegido.me.position.copy(elegido.base); elegido.me.rotation.copy(elegido.rotBase);
        elegido = null; foco.uniforms.focus.value = dist; for (const e of etqs) e.style.opacity = 1;
        for (const M of magicos) M.luz.intensity = .5;
      }
    } else {
      foco.uniforms.focus.value = cam.position.distanceTo(mira);
    }

    // brillo vivo de los libros mágicos
    for (const [i, M] of magicos.entries()) {
      const pulso = .5 + .5 * Math.sin(t * 1.4 + i * 2);
      M.mLomo.emissiveIntensity = .7 + pulso * .5;
      M.luz.intensity *= 1; M.luz.distance = .55 + pulso * .2;
      const { g, d, c } = M.chispas, P = g.attributes.position.array, C = g.attributes.color.array;
      d.forEach(([a, r, yy, vel, f], k) => {
        const an = a + t * vel * .35;
        P[k * 3] = Math.cos(an) * r; P[k * 3 + 1] = yy + Math.sin(t * .6 + f) * .03; P[k * 3 + 2] = Math.sin(an) * r * 1.6;
        const w = Math.pow(.5 + .5 * Math.sin(t * vel * 2 + f), 4) * 1.4;
        C[k * 3] = c.r * w; C[k * 3 + 1] = c.g * w; C[k * 3 + 2] = c.b * w;
      });
      g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true;
      // etiqueta debajo del libro
      v.set(M.base.x, pisos[1].y - .05, M.base.z + .15).project(cam);
      etqs[i].style.transform = `translate(${(v.x * .5 + .5) * AN}px,${(-v.y * .5 + .5) * AL}px) translate(-50%,0)`;
      // el botón invisible encima del lomo: sigue al libro en el estante y nunca mide menos de 44 px
      const zf = M.base.z + M.fondo / 2, y0 = M.base.y - M.alto / 2;
      va.set(M.base.x - M.grosor / 2, y0 + M.alto, zf).project(cam); vb.set(M.base.x + M.grosor / 2, y0, zf).project(cam);
      const x0 = (va.x * .5 + .5) * AN, x1 = (vb.x * .5 + .5) * AN, yA = (-va.y * .5 + .5) * AL, yB = (-vb.y * .5 + .5) * AL;
      const bw = Math.max(44, Math.round(x1 - x0) + 16), bh = Math.max(44, Math.round(yB - yA) + 8), b = op.botones[i];
      if (!tams[i] || Math.abs(tams[i][0] - bw) > 1 || Math.abs(tams[i][1] - bh) > 1) { tams[i] = [bw, bh]; b.style.width = bw + 'px'; b.style.height = bh + 'px'; }
      b.style.transform = `translate(${(x0 + x1) / 2 - bw / 2}px,${(yA + yB) / 2 - bh / 2}px)`;
    }

    // polvo flotando
    const P = gPolvo.attributes.position.array;
    for (let i = 0; i < NP; i++) {
      const [f, vel] = sem[i];
      P[i * 3] += Math.sin(t * .3 + f) * .0004; P[i * 3 + 1] += (Math.cos(t * .23 + f) * .5 - .15) * .0006 * vel;
      if (P[i * 3 + 1] < 0) P[i * 3 + 1] = 2.2;
    }
    gPolvo.attributes.position.needsUpdate = true;
    rayo.material.uniforms.t.value = t; grano.uniforms.t.value = t % 10;
    comp.render(dt);
  }
  function bucle() {
    if (libre || !corre) return;
    const ahora = performance.now(), dt = Math.min((ahora - ultimo) / 1000, .05); ultimo = ahora;
    try { cuadro(dt); }
    catch (e) { corre = false; ren.setAnimationLoop(null); op.alError(e); }
  }

  /* «lista» = el primer cuadro ya se dibujó (acá se compilan los sombreadores, que es lo que más tarda) */
  await espera();
  cuadro(0);
  if (ren.getContext().isContextLost()) throw new Error('se cortaron los gráficos al cargar');
  await espera();

  return {
    seguir() { if (libre || corre) return; corre = true; ultimo = performance.now(); ren.setAnimationLoop(bucle); },
    pausar() { if (libre) return; corre = false; ren.setAnimationLoop(null); },
    elegir,
    /* solo para probar (?forzar3d=perdida): corta los gráficos como lo haría el teléfono */
    perder() { if (!libre) ren.forceContextLoss(); },
    liberar,
  };
  } catch (e) { liberar(); throw e; }
}
