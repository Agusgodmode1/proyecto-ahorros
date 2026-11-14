/* Cinemática única · la escena: una biblioteca de noche, una sola cámara y los dos libros.
   Ronda 1 (escena quieta): estantería, materiales, luz y las dos tapas. El movimiento definitivo llega en la ronda 2.
   Para ir a una toma fija: ?toma=menu | solo | duo  (y &abre=150 para ver el libro abierto). */
import * as THREE from 'three';
import { azar, ponerAniso, tex, texHeroe, HEROES, texCanto, texGuarda, texMadera, texPared, texAtlas, texHalo, texSombraNicho, texSombraBlanda, texHaz, granoCSS } from './texturas.js';
import { LIBRO, crearHeroe, crearComunes, tablon, crearLampara, crearMonedas } from './libro3d.js';

const $ = s => document.querySelector(s);
const Q = new URLSearchParams(location.search);
const QUIETO = matchMedia('(prefers-reduced-motion: reduce)').matches;
const suave = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ---------- medidas de la biblioteca (metros) ---------- */
const AN = .44, PARANTE = .03, TABLA = .028, NICHO = .30, PASO = NICHO + TABLA, FONDO = .24, Z_LOMO = -.012;
const PISO = -PASO - TABLA - .075;

export async function iniciar() {
  const lienzo3d = $('#escena');
  const R = new THREE.WebGLRenderer({ canvas: lienzo3d, antialias: true, powerPreference: 'high-performance' });
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.12; R.outputColorSpace = THREE.SRGBColorSpace;
  ponerAniso(R.capabilities.getMaxAnisotropy());
  try { await Promise.all([document.fonts.load("600 100px Fraunces"), document.fonts.load("italic 400 40px Fraunces")]); } catch (e) { }

  const escena = new THREE.Scene(); R.setClearColor(0x05060b, 1); /* sin escena.background: obligaría a limpiar en cada pasada */
  const cam = new THREE.PerspectiveCamera(30, 1, .05, 30);

  /* reflejos: un cuartito con una ventana fría a la izquierda y un resplandor cálido abajo a la derecha */
  {
    const pm = new THREE.PMREMGenerator(R), e = new THREE.Scene();
    const luz = (c, k, w, h, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); e.add(m); };
    e.add(new THREE.Mesh(new THREE.SphereGeometry(8, 16, 8), new THREE.MeshBasicMaterial({ color: 0x0a0d16, side: THREE.BackSide })));
    luz(0xc3d2ff, 6, 3, 4, -5, 2.5, 3); luz(0xffa45a, 8, 2.4, 1.8, 3.5, -2.2, 3.5); luz(0x4e5262, 1.4, 6, 3, 0, 5, 1); luz(0xa9a6b0, 2, 1.2, 3, 1.5, 1, 6);
    escena.environment = pm.fromScene(e, .035).texture; escena.environmentIntensity = .55; pm.dispose();
  }

  /* ---------- texturas compartidas ---------- */
  const mad = texMadera(), halo = texHalo();
  const madera = (tinte, rug = .52) => new THREE.MeshStandardMaterial({ map: tex(mad.c, { rep: [1, 1] }), normalMap: tex(mad.n, { color: false, rep: [1, 1] }), color: tinte, roughness: rug, metalness: 0, envMapIntensity: .7, normalScale: new THREE.Vector2(.8, .8) });
  const mMadera = madera(0xcbab90), mFondo = madera(0x5e5048, .75), mPiso = madera(0x4c423c, .6);
  const C = { canto: texCanto(false), cantoH: texCanto(true), guarda: texGuarda() };

  /* ---------- el cuarto ---------- */
  const cuarto = new THREE.Group(); escena.add(cuarto);
  const pared = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), new THREE.MeshStandardMaterial({ ...texPared(), color: 0x7f8cab, roughness: .93, envMapIntensity: .25 }));
  pared.position.set(0, .7, -FONDO - .012); cuarto.add(pared);
  const piso = new THREE.Mesh(tablon(5, .04, 3.2, 3), mPiso); piso.position.set(0, PISO - .02, 1.2); cuarto.add(piso);

  /* ---------- el mueble ---------- */
  const mueble = new THREE.Group(); escena.add(mueble);
  const pieza = (w, h, d, x, y, z, mat = mMadera, s = 1) => { const m = new THREE.Mesh(tablon(w, h, d, s), mat); m.position.set(x, y, z); mueble.add(m); return m; };
  const techo = 2 * PASO, altoP = techo - PISO;
  for (const s of [-1, 1]) pieza(PARANTE, altoP, FONDO + .012, s * (AN / 2 + PARANTE / 2), PISO + altoP / 2, -FONDO / 2 + .006, mMadera, 3 + s);
  for (let k = -1; k <= 2; k++) pieza(AN, TABLA, FONDO, 0, k * PASO - TABLA / 2, -FONDO / 2, mMadera, 7 + k * 2);
  pieza(AN + 2 * PARANTE + .05, .042, FONDO + .05, 0, techo + .021, -FONDO / 2 + .012, mMadera, 13);
  pieza(AN + 2 * PARANTE + .022, .02, FONDO + .03, 0, techo + .052, -FONDO / 2 + .008, mMadera, 14);
  pieza(AN + .004, .075, .02, 0, PISO + .0375, -.016, mMadera, 15);
  const fondo = new THREE.Mesh(new THREE.PlaneGeometry(AN, altoP), mFondo); fondo.position.set(0, PISO + altoP / 2, -FONDO + .004); mueble.add(fondo);

  /* ---------- los libros ---------- */
  const at = texAtlas();
  const mComunes = new THREE.MeshStandardMaterial({ map: at.map, roughnessMap: at.orm, metalnessMap: at.orm, roughness: 1, metalness: 1, vertexColors: true, envMapIntensity: .5 });
  const c = (w, h, d, celda, extra) => Object.assign({ w, h, d, celda }, extra);
  const X0 = -AN / 2 + .006;
  const filas = [
    { y: PASO, z: Z_LOMO, x0: X0, items: [c(.031, .236, .16, 0), c(.044, .212, .15, 1, { dz: -.004 }), c(.027, .248, .165, 2), c(.038, .226, .155, 3, { dz: -.006 }), c(.033, .205, .15, 4), c(.03, .23, .16, 5, { inclinado: 9 })] },
    { y: 0, z: Z_LOMO, x0: X0, items: [c(.035, .232, .16, 6), c(.042, .246, .165, 8), { heroe: 'solo' }, c(.027, .203, .15, 7, { dz: -.005 }), c(.036, .214, .15, 9, { dz: -.004 }), c(.029, .24, .16, 10), c(.044, .222, .155, 11, { dz: -.007 }), c(.026, .2, .15, 12), c(.037, .238, .16, 13), { heroe: 'duo' }, c(.031, .21, .15, 14, { inclinado: 11 })] },
    { y: -PASO, z: Z_LOMO, x0: X0 + .004, items: [{ acostados: [c(.04, .205, .15, 15), c(.031, .196, .15, 16, { dx: -.006, dz: -.004 }), c(.036, .178, .14, 17, { dx: -.012, dz: .003 })] }, { hueco: .012 }, c(.039, .228, .16, 18), c(.03, .207, .15, 2, { dz: -.005 })] }
  ];
  const comunes = crearComunes(filas, mComunes); mueble.add(comunes.malla);

  const heroes = {};
  for (const id of ['solo', 'duo']) {
    const h = crearHeroe(HEROES[id], texHeroe(id), C), s = comunes.sitios[id];
    /* en el estante: el lomo mira hacia afuera */
    h.reposo = { pos: new THREE.Vector3(s.x, s.y + LIBRO.H / 2, s.z - LIBRO.comba - LIBRO.W / 2 + .002), rot: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)) };
    h.grupo.position.copy(h.reposo.pos); h.grupo.quaternion.copy(h.reposo.rot); h.cinta.visible = false;
    escena.add(h.grupo); heroes[id] = h;
    /* el brillo: un halo suave que respira */
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: HEROES[id].halo, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .3 }));
    sp.scale.set(.2, .46, 1); sp.position.set(s.x, s.y + LIBRO.H / 2, s.z + .03); escena.add(sp); h.halo = sp; h.fase = id === 'solo' ? 0 : 2.1;
  }

  /* ---------- utilería ---------- */
  const lampara = crearLampara(halo); lampara.position.set(.142, -PASO, -.105); mueble.add(lampara);
  const monedas = crearMonedas(); monedas.position.set(.09, PASO, -.05); mueble.add(monedas);

  /* ---------- sombras horneadas ---------- */
  const mNicho = new THREE.MeshBasicMaterial({ map: texSombraNicho(), transparent: true, depthWrite: false, toneMapped: false });
  const mBlanda = new THREE.MeshBasicMaterial({ map: texSombraBlanda(), transparent: true, depthWrite: false, toneMapped: false });
  for (let k = -1; k <= 1; k++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(AN, NICHO), mNicho); s.position.set(0, k * PASO + NICHO / 2, -.0035); s.renderOrder = 2; mueble.add(s);
    /* sombra de contacto: donde apoyan los lomos */
    const a = new THREE.Mesh(new THREE.PlaneGeometry(AN, .05), mBlanda); a.rotation.x = -Math.PI / 2; a.position.set(0, k * PASO + .0006, Z_LOMO - .004); a.renderOrder = 1; mueble.add(a);
  }
  const blob = (x, y, z, w, d) => { const a = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mBlanda); a.rotation.x = -Math.PI / 2; a.position.set(x, y + .0008, z); a.renderOrder = 1; mueble.add(a); };
  blob(.142, -PASO, -.105, .13, .12); blob(.115, PASO, -.04, .12, .09);
  const sPiso = new THREE.Mesh(new THREE.PlaneGeometry(.9, .5), mBlanda); sPiso.rotation.x = -Math.PI / 2; sPiso.position.set(.04, PISO + .001, .12); cuarto.add(sPiso);

  /* ---------- la luz ---------- */
  const todos = l => { l.layers.enableAll(); escena.add(l); return l; };
  todos(new THREE.HemisphereLight(0x8c96b8, 0x3d2716, .55));
  const relleno = todos(new THREE.DirectionalLight(0xffb27a, .55)); relleno.position.set(1.3, -.7, 1.6);
  const luna = todos(new THREE.DirectionalLight(0xc2d1ff, 1.9)); luna.position.set(-1.5, 1.25, 1.9);
  const lamp = todos(new THREE.PointLight(0xffa25a, .26, 1.8, 2)); lamp.position.copy(lampara.position).add(lampara.userData.foco).add(new THREE.Vector3(-.05, .02, .1));
  /* cuando un libro está al frente, la lámpara lo alcanza desde abajo a la derecha */
  const calida = todos(new THREE.PointLight(0xffab66, 0, 2.2, 2));
  /* el haz de la luna, con unas pocas motas de polvo adentro */
  const haz = new THREE.Mesh(new THREE.PlaneGeometry(.5, 2.1), new THREE.MeshBasicMaterial({ map: texHaz(), transparent: true, opacity: .34, blending: THREE.AdditiveBlending, depthWrite: false }));
  haz.position.set(-.1, .42, .2); haz.rotation.set(0, .35, -.62); haz.renderOrder = 3; escena.add(haz);
  const N_MOTAS = 18, motas = (() => {
    const r = azar(12), p = new Float32Array(N_MOTAS * 3), base = [];
    for (let i = 0; i < N_MOTAS; i++) base.push({ u: (r() - .5) * .3, v: (r() - .5) * 1.5, w: r() * .5 - .05, f: r() * 6.28, s: .35 + r() * .65 });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ map: halo, size: .0085, sizeAttenuation: true, color: 0xcfe0ff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.frustumCulled = false; m.renderOrder = 4; escena.add(m);
    return { m, p, base };
  })();
  function moverMotas(t) {
    const cz = Math.cos(-.62), sz = Math.sin(-.62);
    motas.base.forEach((b, i) => {
      const u = b.u + Math.sin(t * .11 * b.s + b.f) * .02, v = b.v + Math.sin(t * .07 * b.s + b.f * 2) * .05 - ((t * .004 * b.s) % .2);
      motas.p[i * 3] = -.1 + u * cz - v * sz; motas.p[i * 3 + 1] = .42 + u * sz + v * cz; motas.p[i * 3 + 2] = .05 + b.w + Math.sin(t * .09 + b.f) * .02;
    });
    motas.m.geometry.attributes.position.needsUpdate = true;
  }

  /* ---------- desenfoque del fondo cuando un libro está al frente ---------- */
  const tipoRT = { type: THREE.HalfFloatType, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, generateMipmaps: false };
  const rtFondo = new THREE.WebGLRenderTarget(4, 4, { ...tipoRT, depthBuffer: true }), rtA = new THREE.WebGLRenderTarget(4, 4, { ...tipoRT, depthBuffer: false }), rtB = new THREE.WebGLRenderTarget(4, 4, { ...tipoRT, depthBuffer: false });
  const camQ = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), geoQ = new THREE.PlaneGeometry(2, 2);
  const vQ = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  const mBorr = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new THREE.Vector2() } }, vertexShader: vQ, depthTest: false, depthWrite: false, toneMapped: false,
    fragmentShader: 'uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec4 c = texture2D(t, vUv) * .2270; c += (texture2D(t, vUv + d * 1.3846) + texture2D(t, vUv - d * 1.3846)) * .3162; c += (texture2D(t, vUv + d * 3.2308) + texture2D(t, vUv - d * 3.2308)) * .0703; gl_FragColor = c; }' });
  const mFinal = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, k: { value: 1 }, luz: { value: 1 } }, vertexShader: vQ, depthTest: false, depthWrite: false, transparent: true,
    fragmentShader: 'uniform sampler2D t; uniform float k; uniform float luz; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb * luz, k);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' });
  const cuadro = new THREE.Mesh(geoQ, mBorr), escQ = new THREE.Scene(); escQ.add(cuadro); cuadro.frustumCulled = false;
  function pasada(mat, destino) { cuadro.material = mat; R.setRenderTarget(destino); R.render(escQ, camQ); }

  /* ---------- la cámara y las tomas ---------- */
  const tan = Math.tan(15 * Math.PI / 180), MIRA_Y = .128;
  const E = { dMenu: 2.3, dTapa: 1, camTapa: new THREE.Vector3(), libroTapa: new THREE.Vector3() };
  function encuadre() {
    const w = innerWidth, h = innerHeight, pr = Math.min(devicePixelRatio || 1, 2);
    R.setPixelRatio(pr); R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    const W2 = Math.max(2, Math.round(w * pr / 2)), H2 = Math.max(2, Math.round(h * pr / 2));
    rtFondo.setSize(W2, H2); rtA.setSize(Math.round(W2 / 2), Math.round(H2 / 2)); rtB.setSize(Math.round(W2 / 2), Math.round(H2 / 2));
    /* menú: entra todo el mueble, a lo ancho en vertical y a lo alto en horizontal */
    E.dMenu = Math.max(.28 / (tan * cam.aspect), .6 / tan);
    /* tapa: el libro ocupa dos tercios del ancho (o poco más de la mitad del alto, si el teléfono está acostado) */
    E.dTapa = Math.max(.118 / (tan * cam.aspect), .21 / tan);
    const zc = Math.max(E.dMenu * .66, E.dTapa + .45);
    E.camTapa.set(0, MIRA_Y + .05, zc); E.libroTapa.set(.004, MIRA_Y + .05 + E.dTapa * tan * .06, zc - E.dTapa);
  }
  const giroTapa = new THREE.Quaternion().setFromEuler(new THREE.Euler(.17, -.25, .012));

  /* k = 0 en el menú, 1 con el libro «elegido» de frente. Ronda 1: un paso simple entre las dos tomas. */
  const est = { k: 0, meta: 0, elegido: null, abre: +(Q.get('abre') || 0), t0: performance.now() };
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), q1 = new THREE.Quaternion();
  function posar(t) {
    const k = suave(est.k);
    cam.position.set(0, MIRA_Y, E.dMenu).lerp(E.camTapa, k);
    cam.lookAt(v1.set(0, MIRA_Y, 0).lerp(v2.copy(E.libroTapa), k));
    for (const id in heroes) {
      const h = heroes[id], yo = est.elegido === id, kk = yo ? k : 0;
      /* sale del estante hacia adelante, sube en arco y gira de frente */
      const sale = Math.min(1, kk * 3.2), vuelo = Math.max(0, (kk - .16) / .84);
      v1.copy(h.reposo.pos); v1.z += sale * .19;
      h.grupo.position.copy(v1).lerp(E.libroTapa, suave(vuelo)); h.grupo.position.y += Math.sin(Math.PI * vuelo) * .05;
      if (yo && !QUIETO) h.grupo.position.y += Math.sin(t * .9) * .0035 * k;
      h.grupo.quaternion.copy(h.reposo.rot).slerp(giroTapa, suave(Math.max(0, (kk - .3) / .7)));
      h.cinta.visible = kk > .25; h.cinta.scale.y = Math.min(1, Math.max(.001, (kk - .25) * 3));
      h.abrir(yo ? est.abre * k : 0);
      h.capa(yo && est.k > 0 ? 1 : 0);
      h.halo.material.opacity = (.6 + .16 * Math.sin(t * (6.283 / 5) + h.fase)) * (yo ? 1 - k : 1 - .4 * k);
    }
    calida.intensity = .9 * k; calida.position.set(E.libroTapa.x + .55, E.libroTapa.y - .42, E.libroTapa.z + .5);
    lampara.userData.llama.scale.y = .058 * (1 + .05 * Math.sin(t * 9.1) * Math.sin(t * 3.7));
  }
  function dibujar(t) {
    posar(t); moverMotas(t);
    const k = suave(est.k);
    if (k <= .001) { cam.layers.enableAll(); R.setRenderTarget(null); R.autoClear = true; R.render(escena, cam); return; }
    cam.layers.set(0); R.autoClear = true;
    if (k < .999) { R.setRenderTarget(null); R.render(escena, cam); }
    R.setRenderTarget(rtFondo); R.render(escena, cam);
    mBorr.uniforms.t.value = rtFondo.texture; mBorr.uniforms.d.value.set(1.1 / rtA.width, 0); pasada(mBorr, rtA);
    mBorr.uniforms.t.value = rtA.texture; mBorr.uniforms.d.value.set(0, 1.1 / rtA.height); pasada(mBorr, rtB);
    mBorr.uniforms.t.value = rtB.texture; mBorr.uniforms.d.value.set(1.8 / rtA.width, 0); pasada(mBorr, rtA);
    mBorr.uniforms.t.value = rtA.texture; mBorr.uniforms.d.value.set(0, 1.8 / rtA.height); pasada(mBorr, rtB);
    R.autoClear = false; R.setRenderTarget(null); if (k >= .999) R.clear();
    mFinal.uniforms.t.value = rtB.texture; mFinal.uniforms.k.value = k; mFinal.uniforms.luz.value = 1 - .34 * k; cuadro.material = mFinal; R.render(escQ, camQ);
    R.clearDepth(); cam.layers.set(1); R.render(escena, cam); R.autoClear = true;
  }

  /* ---------- lo que es HTML: nombres, etiquetas y zonas de toque ---------- */
  const rot = [...document.querySelectorAll('.rotulo')], toq = [...document.querySelectorAll('.toque')];
  function ubicar() {
    const cxs = [];
    ['solo', 'duo'].forEach((id, i) => {
      const s = comunes.sitios[id];
      const a = v1.set(s.x - LIBRO.T / 2, s.y, 0).project(cam), ax = (a.x * .5 + .5) * innerWidth, ay = (-a.y * .5 + .5) * innerHeight;
      const b = v2.set(s.x + LIBRO.T / 2, s.y + LIBRO.H, 0).project(cam), bx = (b.x * .5 + .5) * innerWidth, by = (-b.y * .5 + .5) * innerHeight;
      const cx = (ax + bx) / 2, w = Math.max(44, bx - ax + 14), h = Math.max(44, ay - by + 10);
      rot[i].style.transform = `translate(${Math.round(cx)}px,${Math.round(ay + innerHeight * .012)}px) translateX(-50%)`;
      toq[i].style.cssText = `left:${cx - w / 2}px;top:${(ay + by) / 2 - h / 2}px;width:${w}px;height:${h}px`;
      cxs.push(cx);
    });
    /* si los dos libros quedan muy juntos (teléfono chico o acostado), el nombre va en dos renglones */
    for (const r of rot) r.classList.toggle('angosto', Math.abs(cxs[1] - cxs[0]) < 150);
  }
  function interfaz() {
    const menu = est.meta === 0;
    for (const r of rot) r.classList.toggle('ver', menu && est.k < .02);
    for (const b of toq) b.hidden = !menu;
    $('#volver').classList.toggle('ver', !menu);
  }
  toq.forEach((b, i) => b.addEventListener('click', () => { est.elegido = i ? 'duo' : 'solo'; est.meta = 1; interfaz(); }));
  $('#volver').addEventListener('click', () => { est.meta = 0; interfaz(); });

  /* ---------- arranque ---------- */
  encuadre();
  const toma = Q.get('toma');
  if (toma === 'solo' || toma === 'duo') { est.elegido = toma; est.k = est.meta = 1; }
  addEventListener('resize', () => { encuadre(); posar(0); cam.updateMatrixWorld(); if (est.k < .02) { const kk = est.k; est.k = 0; posar(0); cam.updateMatrixWorld(); ubicar(); est.k = kk; } });
  est.k && (est.k = 0, posar(0), cam.updateMatrixWorld(), ubicar(), est.k = 1) || (posar(0), cam.updateMatrixWorld(), ubicar());
  interfaz();
  $('.grano').style.backgroundImage = `url(${granoCSS()})`;
  let antes = performance.now();
  function cuadroAnim(ahora) {
    const dt = Math.min(.05, (ahora - antes) / 1000); antes = ahora;
    if (est.k !== est.meta) { const paso = dt / (QUIETO ? .3 : 1.5); est.k = est.meta > est.k ? Math.min(est.meta, est.k + paso) : Math.max(est.meta, est.k - paso); if (est.k === est.meta) interfaz(); }
    if (!est.pausa) dibujar((ahora - est.t0) / 1000);
    requestAnimationFrame(cuadroAnim);
  }
  dibujar(0);
  document.body.classList.add('lista');
  window.__escena = { R, info: () => R.info.render, est };
  requestAnimationFrame(cuadroAnim);
}
iniciar().catch(e => { console.error(e); const p = document.createElement('p'); p.className = 'falla'; p.textContent = 'No se pudo encender la escena: ' + e.message; document.body.appendChild(p); });
