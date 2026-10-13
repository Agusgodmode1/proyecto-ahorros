import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ejemplo} from '../js/estado.js';
import {cerrarMes} from '../js/logica/logros.js';
import {planCalc} from '../js/logica/plan.js';
import {liq} from '../js/logica/sueldo.js';

test('cerrar el mes guarda también el sueldo de ese cobro (para el aguinaldo)',function(){
  var s=ejemplo('2026-10-13'),L=liq(s,true);
  var nc=cerrarMes(s,planCalc(s),12000,44000);
  var r=s.hist[0];
  assert.equal(r.k,'2026-10');
  assert.equal(r.ahorrado,12000);
  assert.equal(r.cobro,'2026-11-09');
  assert.equal(Math.round(r.nominal),Math.round(L.N));
  assert.equal(Math.round(r.liquido),Math.round(L.liquido));
  assert.ok(r.extras>0,'con horas extra de ejemplo');
  assert.equal(nc,'2026-12-07');
});
