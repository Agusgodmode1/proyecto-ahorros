/* Hoy a la luz de la vela · el taller que fabrica el fondo. NO corre en la app: se abre una vez (render.html), dibuja
   la escena con Three.js y de ahí se guarda la imagen (WebP). En la app, Hoy solo muestra esa imagen quieta.
   La escena: el mismo libro de la cinemática (cuero zafiro, canto de hojas, cinta), abierto sobre una mesa de tablones
   viejos, con un cabo de vela en su platillo de bronce. Todo se dibuja por código; no se descarga ninguna imagen.
   La cámara mira derecho hacia abajo pero corrida hacia quien lee (como una lente descentrable): así la página queda
   como un rectángulo perfecto, para escribirle encima con HTML, y la vela igual se ve parada. */
import * as THREE from 'three';
import { azar, lienzo, tex, cuero, HEROES, texCanto, texHalo } from '../texturas.js';
import { tablon } from '../libro3d.js';

const cl = v => v < 0 ? 0 : v > 1 ? 1 : v, ss = (a, b, v) => { const t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); };
function hash(x, y) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function ruido(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, o = 4) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * ruido(x * f, y * f); f *= 2; a *= .5; } return s; }

/* ---------- medidas (metros). x: derecha · z: hacia quien lee · y: arriba. El lomo abierto corre por x = 0 ---------- */
export const M = { H: .225, tabla: .0034, anchoTabla: .1445, lomo: .019, hoja: .140, altoHoja: .213, grIzq: .0065, grDer: .021 };

/* ---------- el papel: amarillento, con fibra, bordes tostados y manchas de humedad lejos de donde van los números ---------- */
function texPagina(semilla, espejo, escrita) {
  const W = 1024, H = 1536, c = lienzo(W, H), g = c.getContext('2d'), im = g.createImageData(W, H), d = im.data, alt = new Float32Array(W * H), r = azar(semilla);
  /* manchas de humedad: aureolas con el borde más marcado, siempre contra los bordes */
  const aureolas = [];
  for (let i = 0; i < 4; i++) { const lado = Math.floor(r() * 4), t = r(); aureolas.push({ x: lado === 0 ? .02 + r() * .1 : lado === 1 ? .9 + r() * .1 : t, y: lado === 2 ? .0 + r() * .06 : lado === 3 ? .95 + r() * .05 : t, R: .07 + r() * .09, s: r() * 9 }); }
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
    const u = (espejo ? W - 1 - x : x) / W, v = y / H, px = u * W, py = y;
    const fibra = ruido(px / 1.6, py / 5.5) * .5 + ruido(px / 7, py / 2.2) * .5, mancha = fbm(px / 190 + semilla, py / 190, 4), fina = fbm(px / 24, py / 24 + 3, 3);
    /* distancia al borde, con el contorno irregular */
    const bx = Math.min(u, 1 - u) * W, by = Math.min(v, 1 - v) * H, bd = Math.min(bx, by) + (mancha - .5) * 70 + (fina - .5) * 22;
    const tostado = ss(150, 0, bd), quemado = ss(26, 0, bd);
    let hum = 0;
    for (const a of aureolas) { const dd = Math.hypot(u - a.x, (v - a.y) * 1.5) / a.R + (fbm(px / 60 + a.s, py / 60, 3) - .5) * .5; hum = Math.max(hum, ss(1.06, .9, dd) * .035 + ss(.07, 0, Math.abs(dd - 1)) * .05); }
    /* puntitos de óxido (foxing), más cerca de los bordes */
    const fox = ss(.73, .8, fbm(px / 9 + 50, py / 9, 2)) * ss(300, 30, bd) * .55;
    let k = .95 + .06 * mancha + .035 * (fibra - .5) - .2 * tostado * tostado - .16 * quemado - hum - fox * .22;
    const cal = 1 - .2 * tostado - .1 * quemado - hum * 1.2 - fox * .4; /* hacia el borde, más marrón */
    const j = i * 4;
    d[j] = 238 * k; d[j + 1] = (224 * cal + 4) * k; d[j + 2] = (186 * cal * cal + 4) * k; d[j + 3] = 255;
    alt[i] = fibra * .5 + fina * .5;
  }
  g.putImageData(im, 0, 0);
  if (escrita) {
    /* la página de al lado ya está escrita: renglones a pluma, que no llegan a leerse */
    g.strokeStyle = 'rgba(46,28,14,.62)'; g.lineCap = 'round';
    for (let l = 0; l < 26; l++) {
      const y0 = 190 + l * 44; let x = 150 + r() * 20; const fin = l % 7 === 6 ? 500 + r() * 200 : 900 - r() * 40;
      while (x < fin) {
        const w = 26 + r() * 70; g.lineWidth = 1.6 + r() * 1.4; g.beginPath(); g.moveTo(x, y0);
        for (let q = 0; q < w; q += 7) g.quadraticCurveTo(x + q + 3.5, y0 - 9 - r() * 9, x + q + 7, y0 + (r() - .5) * 5);
        g.stroke(); x += w + 13 + r() * 8;
      }
    }
  }
  const cn = lienzo(W, H), gn = cn.getContext('2d'), inn = gn.createImageData(W, H), n = inn.data;
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
    const l = alt[y * W + Math.max(0, x - 1)], rr = alt[y * W + Math.min(W - 1, x + 1)], a = alt[Math.max(0, y - 1) * W + x], b = alt[Math.min(H - 1, y + 1) * W + x];
    const nx = (l - rr) * .9, ny = (b - a) * .9, L = Math.hypot(nx, ny, 1), j = i * 4;
    n[j] = (nx / L * .5 + .5) * 255; n[j + 1] = (ny / L * .5 + .5) * 255; n[j + 2] = (1 / L * .5 + .5) * 255; n[j + 3] = 255;
  }
  gn.putImageData(inn, 0, 0);
  return { map: tex(c), normalMap: tex(cn, { color: false }) };
}

/* ---------- un bloque de hojas abierto: la superficie se hunde en el lomo, hace lomo de ballena y baja hacia el corte ---------- */
function perfil(u, grosor) { return M.tabla + grosor * (1 - .86 * Math.exp(-Math.pow(u / .075, 2))) + .0024 * Math.exp(-Math.pow((u - .2) / .14, 2)) - .0012 * u; }
function bloque(lado, grosor, mats) {
  const nu = 56, nv = 40, P = [], U = [], I = [], w = M.hoja, h = M.altoHoja, g = new THREE.Group();
  const alto = (u, v) => {
    let y = perfil(u, grosor);
    y += .0007 * Math.sin(v * 21 + lado) * Math.exp(-u / .16);                    /* la hoja ondula apenas cerca del lomo */
    if (lado > 0) { const dq = Math.hypot((1 - u) * w, (1 - v) * h) / .024; if (dq < 1) y += .0042 * Math.pow(1 - dq, 2); } /* una esquina apenas levantada */
    return y;
  };
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, v = j / nv; P.push(lado * u * w, alto(u, v), (v - .5) * h); U.push(lado > 0 ? u : 1 - u, 1 - v);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, e = c + 1; if (lado > 0) I.push(a, c, b, b, c, e); else I.push(a, b, c, b, e, c); }
  const sup = new THREE.BufferGeometry(); sup.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); sup.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); sup.setIndex(I); sup.computeVertexNormals();
  const hoja = new THREE.Mesh(sup, mats.pagina); hoja.castShadow = hoja.receiveShadow = true; g.add(hoja);
  /* los cantos: el corte de adelante y los de cabeza y pie */
  const pared = (pts, mat) => {
    const p = [], uv = [], ix = [];
    pts.forEach((q, k) => { p.push(q[0], M.tabla, q[2], q[0], q[1], q[2]); uv.push(0, q[3], (q[1] - M.tabla) / .024, q[3]); if (k) { const a = (k - 1) * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); ge.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); ge.setIndex(ix); ge.computeVertexNormals();
    const m = new THREE.Mesh(ge, mat); m.castShadow = m.receiveShadow = true; g.add(m);
  };
  const corte = [], cabeza = [], pie = [];
  for (let j = 0; j <= nv; j++) { const v = j / nv; corte.push([lado * w, alto(1, v), (v - .5) * h, v * 2]); }
  for (let i = 0; i <= nu; i++) { const u = i / nu; cabeza.push([lado * u * w, alto(u, 0), -h / 2, u * 1.4]); pie.push([lado * u * w, alto(u, 1), h / 2, u * 1.4]); }
  pared(corte, mats.canto); pared(cabeza, mats.canto); pared(pie, mats.canto);
  return { grupo: g, alto };
}

/* ---------- el cabo de vela en su platillo de bronce ---------- */
function vela(halo) {
  const g = new THREE.Group(), torno = (p, s = 40) => new THREE.LatheGeometry(p.map(q => new THREE.Vector2(q[0], q[1])), s);
  const bronce = new THREE.MeshStandardMaterial({ color: 0x8a5a22, roughness: .38, metalness: 1, envMapIntensity: 1.1 });
  const plato = new THREE.Mesh(torno([[0, 0], [.021, 0], [.029, .0035], [.0305, .0075], [.0285, .0082], [.0195, .0046], [.0135, .0046], [.0135, .014], [.0118, .0152], [.0118, .006], [0, .006]]), bronce);
  const asa = new THREE.Mesh(new THREE.TorusGeometry(.0088, .0017, 10, 28), bronce); asa.position.set(.036, .0068, .004); asa.rotation.set(Math.PI / 2 - .5, 0, 0);
  /* la cera: marfil, más luminosa arriba, donde la atraviesa la llama; con un chorreado en el borde */
  const pc = [[0, .006], [.0106, .006], [.0109, .02], [.0114, .0295], [.0104, .0322], [.0078, .0302], [.003, .0288], [0, .0286]];
  const gc = torno(pc, 36), pos = gc.attributes.position, col = [];
  for (let i = 0; i < pos.count; i++) { const k = ss(.008, .032, pos.getY(i)); col.push(.42 + .4 * k, .36 + .36 * k, .25 + .3 * k); }
  gc.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const cera = new THREE.Mesh(gc, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: 0, emissive: 0xff9a44, emissiveIntensity: .12 }));
  const gota = new THREE.Mesh(new THREE.SphereGeometry(.0026, 12, 10), cera.material); gota.scale.set(1, 3.6, .8); gota.position.set(-.0098, .021, .0052);
  const gota2 = gota.clone(); gota2.scale.set(.8, 2.2, .8); gota2.position.set(.004, .024, .0104);
  const pabilo = new THREE.Mesh(new THREE.CylinderGeometry(.0005, .0006, .006, 6), new THREE.MeshBasicMaterial({ color: 0x140a05 })); pabilo.position.y = .0315;
  const sm = (c, o) => new THREE.SpriteMaterial({ map: halo, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o });
  const llama = new THREE.Sprite(sm(0xffd9a0, 1)); llama.scale.set(.0125, .03, 1); llama.position.y = .0465;
  const nucleo = new THREE.Sprite(sm(0xfff4dc, 1)); nucleo.scale.set(.006, .016, 1); nucleo.position.y = .043;
  const aura = new THREE.Sprite(sm(0xff9838, .5)); aura.scale.set(.17, .17, 1); aura.position.y = .046;
  for (const m of [plato, asa, cera, gota, gota2]) { m.castShadow = m.receiveShadow = true; }
  g.add(plato, asa, cera, gota, gota2, pabilo, aura, llama, nucleo);
  g.userData.llama = new THREE.Vector3(0, .045, 0);
  return g;
}

/* ---------- madera vieja: hebra larga, poco contraste, grietas y algún nudo ---------- */
function texMaderaVieja() {
  const N = 512, a = new Float32Array(N * N), c = lienzo(N, N), g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data, r = azar(31);
  const nudos = [[r() * N, r() * N, 16 + r() * 10], [r() * N, r() * N, 10 + r() * 8]];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let tor = fbm(x / 260, y / 60, 3) * 3.2, nd = 0;
    for (const n of nudos) { const dd = Math.hypot((x - n[0]) * .45, y - n[1]) / n[2]; tor += 1.6 * Math.exp(-dd * dd * .5); nd = Math.max(nd, Math.exp(-dd * dd * 2.2)); }
    const anillo = Math.sin((y / N * 9 + tor) * 6.283) * .5 + .5, hebra = ruido(x / 70, y / 1.7), poro = Math.pow(ruido(x / 12, y / 1.1), 4), gasto = fbm(x / 90 + 7, y / 90, 3);
    const k = cl(.34 + .2 * anillo + .22 * hebra - .3 * poro + .18 * (gasto - .5) - .3 * nd);
    a[y * N + x] = k; const i = (y * N + x) * 4; d[i] = 34 + 110 * k; d[i + 1] = 24 + 82 * k; d[i + 2] = 16 + 58 * k; d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  /* grietas finas a lo largo de la hebra */
  g.strokeStyle = 'rgba(8,5,3,.8)';
  for (let q = 0; q < 9; q++) { let x = r() * N, y = r() * N; g.lineWidth = .6 + r() * 1.2; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 14; k++) { x += 9 + r() * 14; y += (r() - .5) * 2.2; g.lineTo(x, y); } g.stroke(); }
  const cn = lienzo(N, N), gn = cn.getContext('2d'), inn = gn.createImageData(N, N), n = inn.data, im2 = g.getImageData(0, 0, N, N).data;
  const at = (x, y) => im2[(((y + N) % N) * N + ((x + N) % N)) * 4] / 255;
  for (let y = 0, i = 0; y < N; y++) for (let x = 0; x < N; x++, i += 4) { const nx = (at(x - 1, y) - at(x + 1, y)) * 2.2, ny = (at(x, y + 1) - at(x, y - 1)) * 2.2, L = Math.hypot(nx, ny, 1); n[i] = (nx / L * .5 + .5) * 255; n[i + 1] = (ny / L * .5 + .5) * 255; n[i + 2] = (1 / L * .5 + .5) * 255; n[i + 3] = 255; }
  gn.putImageData(inn, 0, 0);
  return { c, n: cn };
}

/* ---------- la escena ---------- */
export function armar(R) {
  const escena = new THREE.Scene();
  {
    const pm = new THREE.PMREMGenerator(R), e = new THREE.Scene();
    e.add(new THREE.Mesh(new THREE.SphereGeometry(8, 16, 8), new THREE.MeshBasicMaterial({ color: 0x060504, side: THREE.BackSide })));
    const luz = (c, k, w, h, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); e.add(m); };
    luz(0xffb060, 9, 1.4, 1.4, 1.2, 2.2, -3.2); luz(0xff9a50, 2, 4, 2, -3, 3, 1); luz(0x3a3440, 1, 6, 3, 0, 5, 3);
    escena.environment = pm.fromScene(e, .04).texture; escena.environmentIntensity = .5; pm.dispose();
  }
  const halo = texHalo(), mad = texMaderaVieja();
  /* la mesa: tablones viejos, cada uno con su tono, con juntas oscuras */
  const mesa = new THREE.Group(); escena.add(mesa);
  const r = azar(5);
  for (let i = -5; i <= 5; i++) {
    const tono = .5 + r() * .3, m = new THREE.MeshStandardMaterial({ map: tex(mad.c, { rep: [1, 1] }), normalMap: tex(mad.n, { color: false, rep: [1, 1] }), color: new THREE.Color(.95 * tono, .88 * tono, .8 * tono), roughness: .82, metalness: 0, envMapIntensity: .2, normalScale: new THREE.Vector2(.9, .9) });
    const t = new THREE.Mesh(tablon(.0975, .03, 1.5, 3 + i * 7), m);
    t.position.set(i * .1 + .028, -.015 - r() * .0012, -.1); t.receiveShadow = true; mesa.add(t);
  }
  const bajo = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ color: 0x030201 })); bajo.rotation.x = -Math.PI / 2; bajo.position.y = -.02; mesa.add(bajo);

  /* el libro: el mismo cuero zafiro de la cinemática */
  const L = HEROES.solo, libro = new THREE.Group(); escena.add(libro);
  const piel = cuero({ W: 512, H: 768, base: L.base, semilla: 12, ciego: (g, W, H) => { g.lineWidth = 6; g.strokeRect(14, 14, W - 28, H - 28); } });
  const mCuero = new THREE.MeshStandardMaterial({ map: piel.map, normalMap: piel.normalMap, roughness: .5, metalness: 0, envMapIntensity: .9, color: 0xffffff, emissive: 0x0b1c4e, emissiveIntensity: .3 });
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(M.anchoTabla, M.tabla, M.H), mCuero); b.position.set(s * (M.lomo + M.anchoTabla / 2), M.tabla / 2, 0); b.castShadow = b.receiveShadow = true; libro.add(b); }
  const lomo = new THREE.Mesh(new THREE.BoxGeometry(M.lomo * 2, M.tabla * .8, M.H), mCuero); lomo.position.set(0, M.tabla * .4, 0); lomo.receiveShadow = true; libro.add(lomo);
  const mats = { canto: new THREE.MeshStandardMaterial({ map: texCanto(false), roughness: .92, envMapIntensity: .2, side: THREE.DoubleSide }) };
  const pap = (t) => new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: .93, metalness: 0, envMapIntensity: .12, normalScale: new THREE.Vector2(.5, .5) });
  const der = bloque(1, M.grDer, { pagina: pap(texPagina(7, false, false)), canto: mats.canto }), izq = bloque(-1, M.grIzq, { pagina: pap(texPagina(23, true, true)), canto: mats.canto });
  der.grupo.position.x = 0; izq.grupo.position.x = 0; libro.add(der.grupo, izq.grupo);
  /* cabezada y cinta marcapáginas */
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(.0026, .0026, .013, 12), new THREE.MeshStandardMaterial({ color: 0xb08a3c, roughness: .6 })); cab.rotation.z = Math.PI / 2; cab.position.set(0, .006, -M.altoHoja / 2 - .0005); libro.add(cab);
  {
    const n = 60, p = [], ix = [], an = .0026;
    for (let i = 0; i <= n; i++) {
      const t = i / n, z = -M.altoHoja / 2 + t * (M.altoHoja + .05), x = .0032 + .0034 * Math.sin(t * 2.6) + .0012 * Math.sin(t * 9) + .016 * Math.pow(Math.max(0, t - .8) / .2, 2), u = cl((x) / M.hoja), v = cl((z + M.altoHoja / 2) / M.altoHoja);
      let y = z < M.altoHoja / 2 ? der.alto(u, v) + .0006 : Math.max(.0008, der.alto(u, 1) * Math.max(0, 1 - (z - M.altoHoja / 2) / .018) + .0008);
      if (z > M.H / 2) y = .0008; else if (z > M.altoHoja / 2) y = Math.max(y, M.tabla + .0006);
      p.push(x - an, y, z, x + an, y, z); if (i) { const a = (i - 1) * 2; ix.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); ge.setIndex(ix); ge.computeVertexNormals();
    const cinta = new THREE.Mesh(ge, new THREE.MeshStandardMaterial({ color: L.cinta, roughness: .45, side: THREE.DoubleSide, envMapIntensity: .5 })); cinta.castShadow = cinta.receiveShadow = true; libro.add(cinta);
  }
  /* la vela, arriba de la página, un poco a la derecha */
  const v = vela(halo); v.position.set(.092, 0, -.151); escena.add(v);
  const foco = v.position.clone().add(v.userData.llama);
  const luz = new THREE.SpotLight(0xffd3a2, .3, 1.4, 1.25, .85, 1.7); luz.castShadow = true; luz.shadow.mapSize.set(2048, 2048); luz.shadow.camera.near = .02; luz.shadow.camera.far = 1.2; luz.shadow.bias = -.0006; luz.shadow.normalBias = .0012;
  luz.target.position.set(.05, 0, .02); escena.add(luz, luz.target);
  /* relleno: lo que rebota en el cuarto; mantiene pareja la zona de lectura sin borrar las sombras */
  const relleno = new THREE.DirectionalLight(0xffd2a0, .55); relleno.position.set(.1, 1, -.25); escena.add(relleno);
  escena.add(new THREE.HemisphereLight(0x6a4a30, 0x100a06, .5));
  const cerca = new THREE.PointLight(0xff9a48, .012, .22, 2); cerca.position.copy(foco); escena.add(cerca);
  return { escena, luz, foco, vela: v, alturaPagina: der.alto(.5, .5), xPagina: 0 };
}

/* la ventana de mesa que se ve en cada formato: x0..x1 a lo ancho y z0 (arriba) .. z1 (abajo) */
export const VISTAS = {
  alto: { w: 780, h: 1688, x0: -.0145, x1: .1535 },
  corto: { w: 640, h: 1136, x0: -.0145, x1: .1535 }
};
export function camara(vista, alturaPagina) {
  const V = VISTAS[vista], Hc = .85, zn = .55, ancho = V.x1 - V.x0, alto = ancho * V.h / V.w;
  /* la página ocupa el mismo lugar en todos: su borde de arriba queda a un 27 % (alto) o 22 % (corto) de la pantalla */
  const arriba = vista === 'alto' ? .268 : .3, z0 = -M.altoHoja / 2 - arriba * alto, z1 = z0 + alto, cx = (V.x0 + V.x1) / 2;
  const cam = new THREE.PerspectiveCamera(30, V.w / V.h, .05, 5); cam.position.set(cx, Hc, zn); cam.up.set(0, 0, -1); cam.lookAt(cx, 0, zn); cam.updateMatrixWorld();
  const n = .05, k = n / Hc;
  cam.projectionMatrix.makePerspective((V.x0 - cx) * k, (V.x1 - cx) * k, (zn - z0) * k, (zn - z1) * k, n, 5); cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  return cam;
}
