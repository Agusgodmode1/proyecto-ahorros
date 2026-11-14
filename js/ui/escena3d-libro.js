/* Cinemática única · geometría: el libro de tapa dura (piezas separadas, para que la tapa gire sobre el lomo),
   los libros comunes (todos fundidos en una sola malla) y la utilería. Medidas en metros. */
import * as THREE from '../../vendor/three-r187/three.module.js';
import { NERVIOS, celda, PALETA } from './escena3d-texturas.js';

/* ---------- el libro de tapa dura ---------- */
export const LIBRO = { W: .150, H: .225, T: .040, tabla: .0034, comba: .0052, cajo: .0055 };

/* una tabla (tapa o contratapa): cartón forrado, con el filo y las puntas apenas redondeados */
function tablaGeom(w, h, g) {
  const r = .0026, b = .0009, s = new THREE.Shape();
  s.moveTo(r, 0); s.lineTo(w - r, 0); s.quadraticCurveTo(w, 0, w, r); s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h);
  s.lineTo(r, h); s.quadraticCurveTo(0, h, 0, h - r); s.lineTo(0, r); s.quadraticCurveTo(0, 0, r, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: g - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 2, curveSegments: 5 });
  geo.translate(0, 0, -(g / 2 - b));
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, Math.min(1, Math.max(0, p.getX(i) / w)), Math.min(1, Math.max(0, p.getY(i) / h)));
  geo.computeVertexNormals();
  return geo;
}
/* el lomo: redondeado, con los nervios en relieve y el cajo (la canaleta donde dobla la tapa) a cada lado */
function lomoGeom() {
  const { H, T, comba, cajo } = LIBRO, nu = 20, nv = 110, pos = [], uv = [], idx = [];
  const e = .16; /* parte del ancho de la textura que se lleva cada cajo */
  for (let j = 0; j <= nv; j++) {
    const y = H * j / nv;
    let n = 0; for (const k of NERVIOS) { const d = (y - k * H) / .0034; n += Math.exp(-d * d); }
    /* las cofias: el cuero se engrosa apenas arriba y abajo */
    const cof = Math.exp(-Math.pow(y / .004, 2)) + Math.exp(-Math.pow((H - y) / .004, 2));
    for (let i = 0; i <= nu; i++) {
      const t = i / nu * 2 - 1, a = Math.abs(t), sg = t < 0 ? -1 : 1, lim = 1 - e * 2;
      let x, z, u = i / nu;
      if (a <= lim) { const s = a / lim; x = -(comba + n * .0019 + cof * .0008) * (1 - Math.pow(s, 2.4)); z = sg * s * T / 2; }
      else { const f = (a - lim) / (1 - lim); x = f * cajo; z = sg * (T / 2 - .0016 * Math.sin(Math.PI * Math.min(1, f * 1.15))); }
      pos.push(x, y, z); uv.push(u, j / nv);
    }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  /* que mire hacia afuera (−x) */
  if (g.attributes.normal.getX(Math.floor((nv / 2) * (nu + 1) + nu / 2)) > 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}
function cintaGeom() {
  const g = new THREE.PlaneGeometry(.0068, 1, 1, 12), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = .5 - p.getY(i); /* 0 arriba (adentro del libro), 1 en la punta */
    const y = .02 - t * .068, z = Math.sin(t * 2.6) * .0045 * t, x = p.getX(i) + Math.sin(t * 3.4) * .004 * t;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals(); return g;
}
function rayasCabezada(c1, c2) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 2; const g = c.getContext('2d');
  for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? c1 : c2; g.fillRect(i, 0, 1, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(5, 1); t.magFilter = THREE.NearestFilter; return t;
}

/* C = lo que comparten los dos libros: { canto, cantoH, guarda, granoN } ; X = sus texturas propias (texHeroe) ; L = datos (HEROES[id]) */
export function crearHeroe(L, X, C) {
  const { W, H, T, tabla, cajo } = LIBRO, wt = W - cajo;
  const cuero = t => new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.orm, metalnessMap: t.orm, roughness: 1, metalness: 1, envMapIntensity: 1.15, normalScale: new THREE.Vector2(1.1, 1.1) });
  /* la tapa y la contratapa arrancan con el cuero del lomo y se visten después (vestir), cuando su textura está lista */
  const mTapa = cuero(X.tapa || X.lomo), mLomo = cuero(X.lomo), mContra = cuero(X.contra || X.lomo);
  mLomo.side = THREE.DoubleSide;
  const mGuarda = new THREE.MeshStandardMaterial({ map: C.guarda, roughness: .86, metalness: 0, envMapIntensity: .3 });
  const mCanto = new THREE.MeshStandardMaterial({ map: C.canto, roughness: .9, metalness: 0, envMapIntensity: .25 });
  const mCantoH = new THREE.MeshStandardMaterial({ map: C.cantoH, roughness: .9, metalness: 0, envMapIntensity: .25 });
  const mCinta = new THREE.MeshStandardMaterial({ color: L.cinta, roughness: .42, metalness: 0, side: THREE.DoubleSide, envMapIntensity: .6 });

  const grupo = new THREE.Group(), d = new THREE.Group(); d.position.set(-W / 2, -H / 2, 0); grupo.add(d);
  const gt = tablaGeom(wt, H, tabla);
  /* contratapa */
  const contra = new THREE.Mesh(gt, mContra); contra.position.set(cajo, 0, -T / 2 + tabla / 2); contra.rotation.y = Math.PI; contra.position.x = cajo + wt; d.add(contra);
  /* lomo */
  const lomo = new THREE.Mesh(lomoGeom(), mLomo); d.add(lomo);
  /* las hojas: sobresalen menos que las tapas (la ceja) */
  const ceja = .0048, wb = wt - ceja - .0005, hb = H - 2 * ceja, tb = T - 2 * tabla - .0004;
  const hojas = new THREE.Mesh(new THREE.BoxGeometry(wb, hb, tb), [mCanto, mCanto, mCantoH, mCantoH, mGuarda, mGuarda]);
  hojas.position.set(cajo - .0012 + wb / 2, H / 2, 0); d.add(hojas);
  /* cabezadas: el cordoncito rayado que cierra el lomo arriba y abajo */
  const mCab = new THREE.MeshStandardMaterial({ map: rayasCabezada('#c9a45c', '#' + new THREE.Color(L.cinta).getHexString()), roughness: .7 });
  const gc = new THREE.CylinderGeometry(1, 1, .0036, 20);
  for (const y of [ceja + .0022, H - ceja - .0022]) { const c = new THREE.Mesh(gc, mCab); c.scale.set(LIBRO.comba + cajo - .0024, 1, tb / 2); c.position.set(cajo - .0016, y, 0); d.add(c); }
  /* cinta marcapáginas: asoma por abajo cuando el libro está en el aire */
  const cinta = new THREE.Mesh(cintaGeom(), mCinta); cinta.position.set(cajo + wb * .3, 0, .002); d.add(cinta);
  /* la tapa: gira sobre la bisagra, pegada al cajo */
  const bisagra = new THREE.Group(); bisagra.position.set(cajo, 0, T / 2 - tabla / 2); d.add(bisagra);
  const tapa = new THREE.Mesh(gt, mTapa); bisagra.add(tapa);
  /* la guarda pegada del lado de adentro: deja ver el cuero doblado en todo el borde */
  const guarda = new THREE.Mesh(new THREE.PlaneGeometry(wt - .0062, H - .0066), mGuarda); guarda.rotation.y = Math.PI; guarda.position.set(wt / 2 - .0006, H / 2, -tabla / 2 - .00025); bisagra.add(guarda);
  return {
    id: L.id, grupo, bisagra, cinta, lomo, mats: [mTapa, mLomo, mContra, mGuarda, mCanto, mCantoH, mCinta, mCab],
    abrir(grados) { bisagra.rotation.y = -grados * Math.PI / 180; },
    vestir(X2) { for (const [m, t] of [[mTapa, X2.tapa], [mContra, X2.contra]]) { m.map = t.map; m.normalMap = t.normalMap; m.roughnessMap = t.orm; m.metalnessMap = t.orm; m.needsUpdate = true; } },
    capa(n) { grupo.traverse(o => o.layers.set(n)); }
  };
}

/* ---------- fundir geometrías sueltas en una sola (posición, normal, uv y color) ---------- */
function Bolsa() { return { p: [], n: [], u: [], c: [] }; }
function meter(B, geo, m, uvCara, color) {
  const g = geo.index ? geo.toNonIndexed() : geo, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
  const v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(m);
  for (let i = 0; i < P.count; i++) {
    const r = uvCara(Math.floor(i / 6), U.getX(i), U.getY(i));
    v.fromBufferAttribute(P, i).applyMatrix4(m); B.p.push(v.x, v.y, v.z);
    v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); B.n.push(v.x, v.y, v.z);
    B.u.push(r[0], r[1]); B.c.push(color.r, color.g, color.b);
  }
}
function cerrar(B) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
  g.computeBoundingSphere(); return g;
}
const enCelda = (R) => (cara, u, v) => [R.u0 + u * (R.u1 - R.u0), R.v0 + v * (R.v1 - R.v0)];

/* un libro común parado: grosor en x, alto en y, el lomo mira a +z y el cuerpo se va hacia −z. Origen: abajo, al centro, en el lomo */
function meterComun(B, o, m) {
  const bt = .0026, comba = Math.min(.0055, o.w * .14), blanco = new THREE.Color(1, 1, 1), tinte = new THREE.Color(PALETA[o.celda % PALETA.length]).multiplyScalar(1.15);
  const cu = celda(19, .1, .05, .9, .45), pa = celda(19, .05, .55, .95, .95), lo = celda(o.celda);
  const M = new THREE.Matrix4();
  for (const s of [-1, 1]) meter(B, new THREE.BoxGeometry(bt, o.h, o.d), M.copy(m).multiply(new THREE.Matrix4().makeTranslation(s * (o.w / 2 - bt / 2), o.h / 2, -o.d / 2)), enCelda(cu), tinte);
  meter(B, new THREE.BoxGeometry(o.w - 2 * bt, o.h - .009, o.d - .007), M.copy(m).multiply(new THREE.Matrix4().makeTranslation(0, o.h / 2, -(o.d - .007) / 2 - .0012)), enCelda(pa), blanco);
  /* lomo curvo */
  const n = 7, g = new THREE.PlaneGeometry(o.w, o.h, n, 1), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const s = P.getX(i) / (o.w / 2); P.setZ(i, comba * (1 - s * s)); P.setY(i, P.getY(i) + o.h / 2); }
  g.computeVertexNormals();
  meter(B, g, m, (c, u, v) => [lo.u0 + u * (lo.u1 - lo.u0), lo.v0 + v * (lo.v1 - lo.v0)], blanco);
}
/* filas = [{ y, z, x0, items:[{w,h,d,celda} | {hueco} | {inclinado:grados, ...} | {acostados:[...]} | {heroe:id}] }]
   Devuelve la malla de todos los comunes y dónde quedó cada libro especial. */
export function crearComunes(filas, material) {
  const B = Bolsa(), sitios = {}; let cuenta = 0;
  for (const f of filas) {
    let x = f.x0, altoPrev = 0;
    for (const it of f.items) {
      if (it.hueco) { x += it.hueco; continue; }
      if (it.heroe) { sitios[it.heroe] = { x: x + LIBRO.T / 2, y: f.y, z: f.z }; x += LIBRO.T + .0008; altoPrev = LIBRO.H; continue; }
      if (it.acostados) {
        let y = f.y, largo = 0;
        for (const a of it.acostados) {
          const m = new THREE.Matrix4().makeTranslation(x + a.h + (a.dx || 0), y + a.w / 2, f.z + (a.dz || 0)).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
          meterComun(B, a, m); y += a.w + .0004; largo = Math.max(largo, a.h + (a.dx || 0)); cuenta++;
        }
        x += largo + .004; altoPrev = 0; continue;
      }
      if (it.inclinado) {
        const a = it.inclinado * Math.PI / 180, alto = Math.min(it.h, altoPrev / Math.cos(a) || it.h), x0 = x + alto * Math.sin(a) - .0006;
        const m = new THREE.Matrix4().makeTranslation(x0, f.y, f.z + (it.dz || 0)).multiply(new THREE.Matrix4().makeRotationZ(a)).multiply(new THREE.Matrix4().makeTranslation(it.w / 2, 0, 0));
        meterComun(B, it, m); x = x0 + it.w * Math.cos(a) + .002; altoPrev = 0; cuenta++; continue;
      }
      meterComun(B, it, new THREE.Matrix4().makeTranslation(x + it.w / 2, f.y, f.z + (it.dz || 0)));
      x += it.w + .0007; altoPrev = it.h; cuenta++;
    }
  }
  const malla = new THREE.Mesh(cerrar(B), material);
  return { malla, sitios, cuenta };
}

/* ---------- madera: cajas con la veta a lo largo ---------- */
export function tablon(w, h, d, semilla = 0) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(), P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
  const ox = (semilla * .37) % 1, oy = (semilla * .61) % 1;
  for (let i = 0; i < P.count; i++) {
    const nx = Math.abs(N.getX(i)), ny = Math.abs(N.getY(i));
    let a, b, la, lb;
    if (nx > .5) { a = P.getZ(i); b = P.getY(i); la = d; lb = h; } else if (ny > .5) { a = P.getX(i); b = P.getZ(i); la = w; lb = d; } else { a = P.getX(i); b = P.getY(i); la = w; lb = h; }
    if (la >= lb) U.setXY(i, a / .62 + ox, b / .2 + oy); else U.setXY(i, b / .62 + ox, a / .2 + oy);
  }
  return g;
}

/* ---------- utilería ---------- */
/* unas monedas apiladas */
export function crearMonedas() {
  const g = new THREE.Group(), oro = new THREE.MeshStandardMaterial({ color: 0xcfa24a, roughness: .36, metalness: 1, envMapIntensity: 1.4 });
  const geo = new THREE.CylinderGeometry(.017, .017, .0026, 28), r = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const pila = (x, z, n) => { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo, oro); m.position.set(x + (r() - .5) * .0032, .0013 + i * .0027, z + (r() - .5) * .0026); m.rotation.y = r() * 6; g.add(m); } };
  pila(0, 0, 8); pila(.042, .008, 5); pila(.02, .04, 2);
  const c = new THREE.Mesh(geo, oro); c.position.set(.075, .0158, .03); c.rotation.set(Math.PI / 2 - .4, 0, .5); g.add(c);
  return g;
}
