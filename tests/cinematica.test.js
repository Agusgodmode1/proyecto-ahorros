// La línea de tiempo de la cinemática única (prototipo/cinematica.js) y las cuentas de ?perf3d=1 (prototipo/perf.js).
// Spec: docs/specs/spec-cinematica-unica.md (tablas de «Tiempos y movimiento» y Regla 3, Regla 5 y Regla 2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearCinematica, DUR, VUELTA, SALTO, suave, seda, frena } from '../prototipo/cinematica.js';
import { resumen, crearMedidor, aparato, cumple, tope30 } from '../prototipo/perf.js';

const PASO = 1 / 120;
function correr(c, tope = 20) { let t = 0, e = ''; while (!e && t < tope) { e = c.avanzar(PASO); t += PASO; } return { t, e }; }
const cerca = (a, b, tol = .03) => assert.ok(Math.abs(a - b) <= tol, a + ' no está cerca de ' + b);
function enMenu() { const c = crearCinematica(); c.empezar(); correr(c); return c; }
function enTapa(id = 'solo') { const c = enMenu(); c.elegir(id); correr(c); return c; }

test('arranca en la foto de inicio: no avanza sola y el toque se ignora', () => {
  const c = crearCinematica();
  assert.equal(c.estado(), 'foto'); assert.equal(c.avanzar(1), ''); assert.equal(c.tocar(), false); assert.equal(c.elegir('solo'), false);
  assert.equal(c.estado(), 'foto');
});
test('la entrada dura 2,6 s y termina en el menú', () => {
  const c = crearCinematica(); assert.ok(c.empezar()); assert.equal(c.estado(), 'entrada');
  const r = correr(c); assert.equal(r.e, 'menu'); cerca(r.t, DUR.entrada); assert.equal(c.estado(), 'menu');
});
test('tocar durante la entrada salta al final en 0,4 s y no elige libro', () => {
  const c = crearCinematica(); c.empezar(); for (let i = 0; i < 60; i++) c.avanzar(PASO);
  assert.equal(c.elegir('solo'), false); assert.ok(c.tocar());
  const r = correr(c); assert.equal(r.e, 'menu'); cerca(r.t, SALTO); assert.equal(c.libro, null);
  assert.ok(c.elegir('solo'), 'el toque siguiente sí elige');
});
test('elegir dura 2,2 s y deja el libro de frente', () => {
  const c = enMenu(); assert.ok(c.elegir('duo')); assert.equal(c.estado(), 'elegir');
  const r = correr(c); assert.equal(r.e, 'tapa'); cerca(r.t, DUR.elegir); assert.equal(c.estado(), 'tapa'); assert.equal(c.libro, 'duo');
});
test('desde la tapa: ◀ vuelve al estante en 0,8× y ▶ abre en 2,0 s', () => {
  let c = enTapa(); assert.ok(c.atras()); let r = correr(c); assert.equal(r.e, 'menu'); cerca(r.t, DUR.elegir * VUELTA); assert.equal(c.libro, null);
  c = enTapa(); assert.ok(c.adelante()); r = correr(c); assert.equal(r.e, 'app'); cerca(r.t, DUR.abrir); assert.equal(c.estado(), 'app');
});
test('desde la app: ◀ cierra el libro (1,6 s) y queda en la tapa; otro ◀ llega a la estantería', () => {
  const c = enTapa(); c.adelante(); correr(c);
  assert.equal(c.adelante(), false, 'en la app no hay ▶');
  assert.ok(c.atras()); let r = correr(c); assert.equal(r.e, 'tapa'); cerca(r.t, DUR.abrir * VUELTA); assert.equal(c.estado(), 'tapa');
  assert.ok(c.atras()); r = correr(c); assert.equal(r.e, 'menu');
});
test('◀ a mitad de «Elegir» invierte desde donde está, sin saltos', () => {
  const c = enMenu(); c.elegir('solo'); for (let i = 0; i < 132; i++) c.avanzar(PASO);
  const antes = c.p; assert.ok(antes > .45 && antes < .55); assert.ok(c.atras());
  c.avanzar(PASO); assert.ok(c.p < antes && antes - c.p < .01, 'sigue pegado a donde estaba');
  const r = correr(c); assert.equal(r.e, 'menu'); cerca(r.t, DUR.elegir * VUELTA * antes);
  assert.equal(c.atras(), false, 'en el menú no hay ◀');
});
test('◀ a mitad de «Abrir» invierte desde donde está y vuelve a la tapa', () => {
  const c = enTapa(); c.adelante(); for (let i = 0; i < 120; i++) c.avanzar(PASO);
  const antes = c.p; assert.ok(c.atras()); assert.equal(c.atras(), false, 'ya está volviendo');
  c.avanzar(PASO); assert.ok(c.p < antes && antes - c.p < .01);
  assert.equal(correr(c).e, 'tapa'); assert.equal(c.libro, 'solo');
});
test('flechas: ninguna en foto, entrada y menú; solo ◀ atenuada en movimiento; las dos en la tapa; ninguna en la app', () => {
  const c = crearCinematica(); assert.deepEqual(c.flechas(), { atras: 0, adelante: 0 });
  c.empezar(); c.avanzar(.5); assert.deepEqual(c.flechas(), { atras: 0, adelante: 0 });
  correr(c); assert.deepEqual(c.flechas(), { atras: 0, adelante: 0 });
  c.elegir('solo'); c.avanzar(.3); assert.deepEqual(c.flechas(), { atras: .5, adelante: 0 });
  correr(c); assert.deepEqual(c.flechas(), { atras: 1, adelante: 1 });
  c.adelante(); c.avanzar(.3); assert.deepEqual(c.flechas(), { atras: .5, adelante: 0 });
  correr(c); assert.deepEqual(c.flechas(), { atras: 0, adelante: 0 });
});
test('los nombres se ven solo con la estantería quieta: se van al empezar «Elegir» y vuelven al regresar', () => {
  const c = crearCinematica(); assert.equal(c.rotulos(), false); c.empezar(); c.avanzar(1); assert.equal(c.rotulos(), false);
  correr(c); assert.equal(c.rotulos(), true);
  c.elegir('solo'); assert.equal(c.rotulos(), false); correr(c); assert.equal(c.rotulos(), false);
  c.atras(); c.avanzar(.2); assert.equal(c.rotulos(), false); correr(c); assert.equal(c.rotulos(), true);
});
test('solo se elige libro con la estantería quieta', () => {
  const c = enTapa(); assert.equal(c.elegir('duo'), false); assert.equal(c.libro, 'solo');
  c.atras(); c.avanzar(.3); assert.equal(c.elegir('duo'), false);
});
test('poner() lleva directo a un reposo (reducir movimiento)', () => {
  const c = crearCinematica(); c.poner('tapa', 'duo'); assert.equal(c.estado(), 'tapa'); assert.equal(c.libro, 'duo');
  c.poner('app'); assert.equal(c.estado(), 'app'); c.poner('menu'); assert.equal(c.estado(), 'menu'); assert.equal(c.libro, null);
});
test('las curvas arrancan y terminan suave (nada lineal)', () => {
  for (const f of [suave, seda, frena]) {
    assert.equal(f(0), 0); assert.equal(f(1), 1); assert.equal(f(-1), 0); assert.equal(f(2), 1);
    assert.ok(f(.02) < .02, 'arranca despacio'); assert.ok(1 - f(.98) < .02, 'termina despacio');
    for (let i = 1; i <= 100; i++) assert.ok(f(i / 100) >= f((i - 1) / 100), 'nunca retrocede');
  }
});
test('perf: mediana, p95 y máximo', () => {
  const ms = []; for (let i = 1; i <= 100; i++) ms.push(i);
  assert.deepEqual(resumen(ms), { n: 100, mediana: 50, p95: 95, max: 100 });
  assert.deepEqual(resumen([]), { n: 0, mediana: 0, p95: 0, max: 0 });
  assert.deepEqual(resumen([16.7]), { n: 1, mediana: 16.7, p95: 16.7, max: 16.7 });
  assert.ok(cumple({ p95: 20, max: 50 })); assert.ok(!cumple({ p95: 20.1, max: 30 })); assert.ok(!cumple({ p95: 12, max: 51 }));
});
test('perf: el medidor separa por momento y respeta el orden de la cinemática', () => {
  const m = crearMedidor(); m.anotar('abrir', 10); m.anotar('entrada', 16); m.anotar('entrada', 18); m.anotar('foto', 99);
  const t = m.tabla(); assert.deepEqual(t.map(x => x.momento), ['entrada', 'abrir']); assert.equal(t[0].n, 2); assert.equal(t[0].max, 18);
});
test('perf: el nombre del aparato', () => {
  assert.equal(aparato('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)', 390, 844, 3, 'Apple GPU'), 'iPhone · iOS 18.1 · 390×844 @3x · Apple GPU');
  assert.equal(aparato('', 800, 600, 1), 'Otro · 800×600 @1x');
});
test('perf: reconoce el tope de 30 cuadros por segundo del modo de bajo consumo (no es una escena pesada)', () => {
  const tope = []; for (let i = 0; i < 60; i++) tope.push(i % 2 ? 33 : 34); tope[7] = 132;
  assert.equal(tope30(tope), true);
  const fluido = []; for (let i = 0; i < 60; i++) fluido.push(16.7); assert.equal(tope30(fluido), false);
  const pesado = []; for (let i = 0; i < 60; i++) pesado.push(22 + (i * 7) % 30); assert.equal(tope30(pesado), false);
  assert.equal(tope30([33, 33, 33]), false, 'con pocos cuadros no se sabe');
});
test('poner(foto) vuelve al arranque', () => { const c = crearCinematica(); c.poner('tapa', 'solo'); c.poner('foto'); assert.equal(c.estado(), 'foto'); assert.equal(c.libro, null); });
