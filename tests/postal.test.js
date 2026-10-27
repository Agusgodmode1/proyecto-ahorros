/* La postal del capítulo cerrado (2.16). Números inventados. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {postal} from '../js/logica/postal.js';

const H = [
  { k: '2026-08', meta: 10000, minimo: 5000, ahorrado: 11000, semanas: 4, semanasOk: 4 },
  { k: '2026-09', meta: 10000, minimo: 5000, ahorrado: 12500, semanas: 5, semanasOk: 3 },
  { k: '2026-10', meta: 10000, minimo: 5000, ahorrado: 6000, semanas: 4, semanasOk: 2 }
];

test('con montos: lo guardado, la meta, las semanas; la racha hasta ese pacto', () => {
  const d = postal({ hist: H }, '2026-09');
  assert.match(d.mes, /^Se[pt]+iembre 2026$/);
  assert.equal(d.kick, 'capítulo cerrado · pacto n.º 2');
  assert.equal(d.titulo, 'Cumplí mi pacto');
  assert.equal(d.sello, true);
  assert.equal(d.antes, 'guardé');
  assert.equal(d.cifra, '$ 12.500');
  assert.deepEqual(d.lineas, ['mi meta era $ 10.000', '3 de 5 semanas dentro del plan', 'racha: 2 pactos seguidos']);
  assert.match(d.archivo, /^capitulo-[a-z]+-2026\.png$/);
});

test('sin montos: ningún número de plata, solo porcentaje y semanas', () => {
  const d = postal({ hist: H }, '2026-09', { montos: false });
  assert.equal(d.cifra, '125 %');
  assert.equal(d.despues, 'de lo que me propuse');
  const todo = [d.antes, d.cifra, d.despues, d.alt].concat(d.lineas).join(' ');
  assert.doesNotMatch(todo, /\$/);
});

test('mínimo, primer pacto de la racha y pacto que no está', () => {
  const d = postal({ hist: H }, '2026-10');
  assert.equal(d.titulo, 'Llegué a mi mínimo');
  assert.equal(d.numero, 3);
  assert.ok(d.lineas.length <= 3);
  const sinMeta = postal({ hist: [{ k: '2026-10', meta: 0, ahorrado: 0, semanas: 4, semanasOk: 4 }] }, '2026-10', { montos: false });
  assert.equal(sinMeta.cifra, '4 de 4');
  assert.equal(postal({ hist: H }, '2025-01'), null);
  assert.equal(postal({}, '2026-10'), null);
});
