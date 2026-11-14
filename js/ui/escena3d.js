/* La escena 3D de la estantería (2.64): una biblioteca de noche, una sola cámara y los dos libros, de principio a fin
   (estantería → libro de frente → libro abierto). Qué pasa en cada momento lo dice logica/cinematica.js; acá solo se dibuja.
   Todo se genera por código (texturas en escena3d-texturas.js, piezas en escena3d-libro.js): no descarga nada.
   No tiene botones ni textos propios: eso es HTML y lo pone ui/estante.js. Avisa si se cortan los gráficos o si falla. */
import * as THREE from '../../vendor/three-r187/three.module.js';
import { azar, ponerAniso, tex, texHeroe, HEROES, texCanto, texGuarda, texMadera, texPared, texAtlas, texHalo, texBrillo, texSombraNicho, texSombraBlanda, texHaz, granoCSS } from './escena3d-texturas.js';
import { LIBRO, crearHeroe, crearComunes, tablon, crearMonedas } from './escena3d-libro.js';
import { suave, seda, frena, tramo } from '../logica/cinematica.js';

/* ---------- medidas de la biblioteca (metros) ---------- */
const AN = .44, PARANTE = .03, TABLA = .028, NICHO = .30, PASO = NICHO + TABLA, FONDO = .24, Z_LOMO = -.012;
const PISO = -PASO - TABLA - .075;

/* op = { lienzo, c (la línea de tiempo), quieto, alPerder(), alError(e) } */
export function crearEscena(op) {
  const lienzo3d = op.lienzo, c = op.c, QUIETO = !!op.quieto;
  const R = new THREE.WebGLRenderer({ canvas: lienzo3d, antialias: true, powerPreference: 'high-performance' });
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.12; R.outputColorSpace = THREE.SRGBColorSpace;
  ponerAniso(R.capabilities.getMaxAnisotropy());
  let rota = false, completa = false;
  const alCorte = e => { e.preventDefault(); rota = true; op.alPerder && op.alPerder(); };
  lienzo3d.addEventListener('webglcontextlost', alCorte);

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
  const mMadera = madera(0xcbab90), mFondo = madera(0x5e5048, .75), mPiso = madera(0x4c423c, .85); mPiso.envMapIntensity = .15;
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
  const lb = (w, h, d, celda, extra) => Object.assign({ w, h, d, celda }, extra);
  const X0 = -AN / 2 + .006;
  const filas = [
    { y: PASO, z: Z_LOMO, x0: X0, items: [lb(.031, .236, .16, 0), lb(.044, .212, .15, 1, { dz: -.004 }), lb(.027, .248, .165, 2), lb(.038, .226, .155, 3, { dz: -.006 }), lb(.033, .205, .15, 4), lb(.03, .23, .16, 5, { inclinado: 9 })] },
    { y: 0, z: Z_LOMO, x0: X0, items: [lb(.035, .232, .16, 6), lb(.042, .204, .165, 8), { heroe: 'solo' }, lb(.027, .192, .15, 7, { dz: -.005 }), lb(.036, .214, .15, 9, { dz: -.004 }), lb(.029, .24, .16, 10), lb(.044, .222, .155, 11, { dz: -.007 }), lb(.037, .2, .16, 13), { heroe: 'duo' }, lb(.031, .21, .15, 14, { inclinado: 13 })] },
    { y: -PASO, z: Z_LOMO, x0: X0 + .004, items: [{ acostados: [lb(.04, .205, .15, 15), lb(.031, .196, .15, 16, { dx: -.006, dz: -.004 }), lb(.036, .178, .14, 17, { dx: -.012, dz: .003 })] }, { hueco: .05 }, lb(.039, .228, .16, 18), lb(.03, .207, .15, 2, { dz: -.005 }), lb(.026, .2, .15, 12, { inclinado: 12 })] }
  ];
  const comunes = crearComunes(filas, mComunes); mueble.add(comunes.malla);

  const heroes = {};
  for (const id of ['solo', 'duo']) {
    const h = crearHeroe(HEROES[id], texHeroe(id, 'lomo'), C), s = comunes.sitios[id];
    /* en el estante: el lomo mira hacia afuera */
    h.reposo = { pos: new THREE.Vector3(s.x, s.y + LIBRO.H / 2, s.z - LIBRO.comba - LIBRO.W / 2 + .002), rot: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)) };
    h.grupo.position.copy(h.reposo.pos); h.grupo.quaternion.copy(h.reposo.rot); h.cinta.visible = false;
    escena.add(h.grupo); heroes[id] = h;
    /* los dos libros «llaman»: asoman del estante, se mueven apenas y su cuero toma un poco de luz propia (sin halo) */
    h.mats[1].emissive = new THREE.Color(0xffffff); h.mats[1].emissiveMap = h.mats[1].map; h.mats[1].emissiveIntensity = 0;
    h.fase = id === 'solo' ? 0 : Math.PI; h.enCapa = 0;
    /* la luz que sale de atrás de cada libro: tenue y cálida, como si su lugar en el estante estuviera encendido.
       Una mancha queda detrás de los libros (asoma por arriba de ellos) y otra apenas baña a los vecinos de los costados. */
    const luzAtras = (w, a, x, y, z, orden) => { const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0xffa24e, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); g.scale.set(w, a, 1); g.position.set(x, y, z); g.renderOrder = orden; escena.add(g); return g; };
    h.luces = [luzAtras(.17, .46, s.x, s.y + LIBRO.H * .7, s.z - .035, 3), luzAtras(.115, .3, s.x, s.y + LIBRO.H * .5, s.z + .0085, 3)];
    /* el destello suave del hueco cuando el libro sale de la biblioteca */
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: HEROES[id].halo, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    sp.scale.set(.34, .56, 1); sp.position.set(s.x, s.y + LIBRO.H / 2, s.z + .02); sp.visible = false; escena.add(sp); h.destello = sp;
    /* el brillo que recorre la tapa una sola vez al llegar */
    const wt = LIBRO.W - LIBRO.cajo, br = new THREE.Mesh(new THREE.PlaneGeometry(wt, LIBRO.H), new THREE.MeshBasicMaterial({ map: texBrillo(), color: 0xfff0d2, blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false }));
    br.position.set(wt / 2, LIBRO.H / 2, LIBRO.tabla / 2 + .0005); br.visible = false; h.bisagra.add(br); h.brillo = br;
  }

  /* ---------- utilería ---------- */
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
  blob(.115, PASO, -.04, .12, .09);
  const sPiso = new THREE.Mesh(new THREE.PlaneGeometry(.9, .5), mBlanda); sPiso.rotation.x = -Math.PI / 2; sPiso.position.set(.04, PISO + .001, .12); cuarto.add(sPiso);

  /* ---------- la luz ---------- */
  const todos = l => { l.layers.enableAll(); escena.add(l); return l; };
  todos(new THREE.HemisphereLight(0x8c96b8, 0x3d2716, .55));
  const relleno = todos(new THREE.DirectionalLight(0xffb27a, .55)); relleno.position.set(1.3, -.7, 1.6);
  const luna = todos(new THREE.DirectionalLight(0xc2d1ff, 1.9)); luna.position.set(-1.5, 1.25, 1.9);
  /* la luz cálida de abajo a la derecha: ya no hay lámpara a la vista, solo su luz */
  const lamp = todos(new THREE.PointLight(0xffa25a, .5, 2.4, 2)); lamp.position.set(.46, -.16, .5);
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

  /* ---------- la cámara: dónde está en cada reposo ---------- */
  const tan = Math.tan(15 * Math.PI / 180), MIRA_Y = .128, V = (x, y, z) => new THREE.Vector3(x, y, z);
  const E = { w: 390, h: 844, prMax: 2, lejos: V(0, 0, 0), miraLejos: V(.02, .2, 0), menu: V(0, 0, 0), miraMenu: V(0, MIRA_Y, 0), camTapa: V(0, 0, 0), libroTapa: V(0, 0, 0), camPag: V(0, 0, 0), pag: V(0, 0, 0) };
  function encuadre(w, h) {
    E.w = w = w || E.w; E.h = h = h || E.h; const pr = Math.min(devicePixelRatio || 1, E.prMax);
    R.setPixelRatio(pr); R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    const W2 = Math.max(2, Math.round(w * pr / 2)), H2 = Math.max(2, Math.round(h * pr / 2));
    rtFondo.setSize(W2, H2); rtA.setSize(Math.round(W2 / 2), Math.round(H2 / 2)); rtB.setSize(Math.round(W2 / 2), Math.round(H2 / 2));
    /* menú: entra todo el mueble, a lo ancho en vertical y a lo alto en horizontal */
    const dM = Math.max(.28 / (tan * cam.aspect), .6 / tan);
    E.menu.set(0, MIRA_Y, dM); E.lejos.set(-.62, .5, dM * 1.75 + .5);
    /* tapa: el libro ocupa dos tercios del ancho (o poco más de la mitad del alto, si el teléfono está acostado) */
    const dT = Math.max(.118 / (tan * cam.aspect), .21 / tan), zc = Math.max(dM * .66, dT + .45);
    E.camTapa.set(0, MIRA_Y + .05, zc); E.libroTapa.set(.004, MIRA_Y + .05 + dT * tan * .06, zc - dT);
    /* abrir: la cámara se mete en la primera página hasta que el papel llena la pantalla */
    const dP = Math.min(.0648 / (tan * cam.aspect), .0995 / tan);
    E.pag.copy(E.libroTapa).add(v1.set(.003, 0, LIBRO.T / 2 - LIBRO.tabla)); E.camPag.copy(E.pag); E.camPag.z += dP;
  }
  const giroTapa = new THREE.Quaternion().setFromEuler(new THREE.Euler(.17, -.25, .012)), giroPlano = new THREE.Quaternion();
  const ejeX = V(1, 0, 0), v1 = V(0, 0, 0), v2 = V(0, 0, 0), v3 = V(0, 0, 0), q1 = new THREE.Quaternion();

  /* ---------- de la línea de tiempo a la escena ---------- */
  const est = { tBrillo: -9, k: 0, velo: 0, calentar: false };
  function posar(t) {
    const seg = c.seg, p = c.p, id = c.libro, arco = Math.sin;
    /* cámara: siempre en curva, nunca en línea recta */
    if (seg === 'foto' || seg === 'entrada') {
      const k = seg === 'foto' ? 0 : frena(p), a = arco(Math.PI * k);
      cam.position.copy(E.lejos).lerp(E.menu, k); cam.position.x += a * .2; cam.position.y -= a * .07;
      cam.lookAt(v1.copy(E.miraLejos).lerp(E.miraMenu, k));
    } else if (seg === 'elegir') {
      const k = seda(tramo(p, .06, 1)), a = arco(Math.PI * k), lado = id === 'duo' ? 1 : -1;
      cam.position.copy(E.menu).lerp(E.camTapa, k); cam.position.x += lado * a * .07; cam.position.y += a * .025;
      cam.lookAt(v1.copy(E.miraMenu).lerp(E.libroTapa, k));
    } else {
      const k = seda(tramo(p, .3, .9)), a = arco(Math.PI * k);
      cam.position.copy(E.camTapa).lerp(E.camPag, k); cam.position.y += a * .012;
      cam.lookAt(v1.copy(E.libroTapa).lerp(E.pag, k));
    }
    /* cuánto está «al frente» el libro elegido: desenfoca y oscurece el resto */
    est.k = seg === 'elegir' ? seda(tramo(p, .3, .96)) : seg === 'abrir' ? 1 : 0;
    est.velo = seg === 'abrir' ? tramo(p, .85, 1) : 0;
    const enEstante = seg === 'foto' || seg === 'entrada' || seg === 'elegir';
    for (const hid in heroes) {
      const h = heroes[hid], yo = id === hid, pe = yo && seg === 'elegir' ? p : yo ? 1 : 0;
      /* elegir, por partes que se pisan un poco para que no haya cortes: se inclina y sale del lomo, sube en arco, gira de frente */
      const tira = suave(tramo(pe, 0, .27)), sale = seda(tramo(pe, .17, .74)), gira = seda(tramo(pe, .46, 1));
      /* el llamado: asoma del estante y se mece muy despacio; cada libro a su tiempo */
      const late = QUIETO ? .5 : .5 + .5 * Math.sin(t * (6.283 / 5.2) + h.fase), llama = (1 - sale) * (yo ? 1 : 1 - .6 * est.k);
      v1.copy(h.reposo.pos); v1.z += llama * (.011 + .007 * late) + tira * .055;
      h.grupo.position.copy(v1).lerp(E.libroTapa, sale);
      const a = Math.sin(Math.PI * sale); h.grupo.position.y += a * .06; h.grupo.position.z += a * .05;
      q1.setFromAxisAngle(ejeX, llama * (.012 + .022 * late) + tira * (1 - sale) * .15).multiply(h.reposo.rot);
      h.grupo.quaternion.copy(q1).slerp(giroTapa, gira);
      let abre = 0;
      if (yo && seg === 'abrir') {
        h.grupo.quaternion.slerp(giroPlano, seda(tramo(p, .1, .8)));
        abre = 150 * seda(tramo(p, 0, .55));
      }
      /* en reposo de frente: un vaivén casi imperceptible (ciclo de 7 s, menos de 1 cm) */
      if (yo && !QUIETO) {
        const quieto = seg === 'elegir' ? tramo(p, .86, 1) : 1 - tramo(p, 0, .25), w = 6.283 / 7;
        h.grupo.position.y += Math.sin(t * w) * .0036 * quieto; h.grupo.position.x += Math.sin(t * w * .5 + 1) * .0018 * quieto;
        h.grupo.rotateY(Math.sin(t * w + .6) * .012 * quieto);
      }
      h.abrir(abre);
      h.cinta.visible = sale > .2; h.cinta.scale.y = Math.max(.001, tramo(sale, .2, .7));
      h.mats[1].emissiveIntensity = (.04 + .06 * late) * llama * (enEstante ? 1 : 0);
      const luz = (.82 + .18 * late) * (1 - sale) * (yo ? 1 : 1 - .5 * est.k);
      h.luces[0].material.opacity = .95 * luz; h.luces[1].material.opacity = .34 * luz;
      const capa = yo && est.k > 0 ? 1 : 0; if (capa !== h.enCapa) { h.capa(capa); h.enCapa = capa; }
      /* el destello del hueco al salir: aparece y se apaga, sin chispas */
      const d = yo && seg === 'elegir' ? Math.pow(Math.sin(Math.PI * tramo(p, .03, .6)), 2) : 0;
      h.destello.visible = est.calentar || d > .004; h.destello.material.opacity = d * .8;
      /* el brillo que cruza la tapa una vez (0,9 s) */
      const b = (t - est.tBrillo) / .9, pasa = est.calentar || (yo && b > 0 && b < 1 && seg === 'elegir' && !c.dir);
      h.brillo.visible = pasa; if (pasa) { h.brillo.material.map.offset.x = .95 - b * 1.9; h.brillo.material.opacity = .26 * Math.sin(Math.PI * b); }
    }
    calida.intensity = .9 * Math.max(est.k, c.seg === 'elegir' ? seda(tramo(c.p, .17, .6)) : 0); calida.position.set(E.libroTapa.x + .55, E.libroTapa.y - .42, E.libroTapa.z + .5);
  }
  function dibujar(t) {
    posar(t); moverMotas(t);
    const k = est.k;
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

  /* ---------- lo que usa ui/estante.js ---------- */
  const aPantalla = v => { v.project(cam); v.x = (v.x * .5 + .5) * E.w; v.y = (-v.y * .5 + .5) * E.h; return v; };
  function camEnMenu() { cam.position.copy(E.menu); cam.lookAt(E.miraMenu); cam.updateMatrixWorld(); }
  return {
    /* dibuja el cuadro que corresponde a la línea de tiempo; t = segundos de reloj (para lo que respira) */
    dibujar(t) { if (rota) return; try { dibujar(t); } catch (e) { op.alError && op.alError(e); } },
    encuadre,
    /* dónde quedan los dos libros en la pantalla con la estantería quieta: [{id, x0, y0, x1, y1}] (para nombres y toques) */
    sitios() {
      camEnMenu();
      return ['solo', 'duo'].map(id => {
        const s = comunes.sitios[id], a = aPantalla(v1.set(s.x - LIBRO.T / 2, s.y, 0)), b = aPantalla(v2.set(s.x + LIBRO.T / 2, s.y + LIBRO.H, 0));
        return { id, x0: a.x, y0: b.y, x1: b.x, y1: a.y };
      });
    },
    /* el rectángulo del libro elegido en la pantalla, donde esté ahora */
    cajaLibro() {
      const h = heroes[c.libro]; if (!h) return null;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const p = aPantalla(h.grupo.localToWorld(v3.set(sx * LIBRO.W / 2, sy * LIBRO.H / 2, LIBRO.T / 2))); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
      return { x0, y0, x1, y1 };
    },
    /* el brillo que cruza la tapa: arranca en el segundo t del reloj */
    brillo(t) { est.tBrillo = t; },
    /* calentar: se dibuja una vez, sin mostrarlo, lo que recién aparece más adelante (desenfoque, destello, brillo de la tapa),
       para que la placa de video prepare todo ahora y no haya un tirón la primera vez que se elige un libro */
    /* lo que no hace falta para el primer cuadro: las tapas de los dos libros y el calentamiento. Va después de ese
       primer cuadro (mientras la foto de inicio se funde hacia la escena), para que la escena aparezca cuanto antes */
    completar() {
      if (!completa) { completa = true; for (const id in heroes) heroes[id].vestir(texHeroe(id, 'tapas')); }
      this.calentar();
    },
    calentar() {
      const g = { seg: c.seg, p: c.p, libro: c.libro };
      est.calentar = true; c.poner('tapa', 'solo'); dibujar(0); c.poner('tapa', 'duo'); dibujar(0); est.calentar = false;
      c.poner(g.seg === 'foto' ? 'foto' : g.seg === 'abrir' ? 'app' : g.p >= 1 ? 'tapa' : 'menu', g.libro);
      for (const id in heroes) { heroes[id].capa(0); heroes[id].enCapa = 0; }
    },
    /* si los cuadros vienen pesados, se baja la resolución de 2 a 1,5 */
    bajar() { if (E.prMax <= 1.5) return false; E.prMax = 1.5; encuadre(); return true; },
    escala() { return R.getPixelRatio(); },
    placa() { try { const gl = R.getContext(), x = gl.getExtension('WEBGL_debug_renderer_info'); return x ? String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)).replace(/^ANGLE \(|\)$/g, '').slice(0, 44) : ''; } catch (e) { return ''; } },
    info() { return R.info.render; },
    /* solo para probar (?forzar3d=perdida): simula que el teléfono cortó los gráficos */
    perder() { try { R.forceContextLoss(); } catch (e) { } },
    /* suelta todo lo que ocupa memoria en la placa de video */
    liberar() {
      lienzo3d.removeEventListener('webglcontextlost', alCorte);
      const vistas = new Set();
      const soltarMat = m => { if (!m || vistas.has(m)) return; vistas.add(m); for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } m.dispose(); };
      escena.traverse(o => { if (o.geometry) o.geometry.dispose(); if (Array.isArray(o.material)) o.material.forEach(soltarMat); else soltarMat(o.material); });
      if (escena.environment) escena.environment.dispose();
      rtFondo.dispose(); rtA.dispose(); rtB.dispose(); geoQ.dispose(); mBorr.dispose(); mFinal.dispose();
      R.dispose();
    }
  };
}
