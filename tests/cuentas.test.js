/* Cuentas entre los dos (2.61). Números inventados y calculados a mano. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parteMia,nuevoGasto,balance,saldar,resumen,ahorroDe} from '../js/logica/cuentas.js';

test('reparto: mitad y mitad, porcentaje y gastos de uno solo', function(){
  assert.equal(parteMia(2000,'conjunto',.5),1000);
  assert.equal(parteMia(2000,'conjunto',.6),1200);
  assert.equal(parteMia(999,'conjunto',.5),499.5);
  assert.equal(parteMia(800,'yo',.5),800);assert.equal(parteMia(800,'pareja',.5),0);
  assert.equal(parteMia(1000,'conjunto',7),500,'un reparto imposible cae en mitad y mitad');
});
test('balance: tres gastos con repartos distintos, uno «de mi pareja» y un saldo en el medio', function(){
  var c=[];
  function g(o,p){var r=nuevoGasto(o,p);assert.ok(r.ok,r.error);c.push(r.gasto)}
  g({id:1,monto:2000,paga:'yo',de:'conjunto'},.5);        /* pagué 2.000 a medias → me debe 1.000 */
  assert.equal(balance(c),1000);
  g({id:2,monto:3000,paga:'pareja',de:'conjunto'},.6);    /* pagó 3.000, me toca el 60 % = 1.800 → 1.000 − 1.800 = −800 */
  assert.equal(balance(c),-800);
  var s=saldar(c,{id:3,fecha:'2026-11-11'});               /* le paso 800 y quedamos a mano */
  assert.deepEqual([s.tipo,s.monto,s.paga],['saldo',800,'yo']);c.push(s);
  assert.equal(balance(c),0);assert.equal(saldar(c,{id:9}),null);
  g({id:4,monto:1350,paga:'yo',de:'pareja'},.5);           /* pagué algo que era suyo: entero */
  assert.equal(balance(c),1350);
  g({id:5,monto:500,paga:'pareja',de:'yo'},.5);            /* me pagó algo mío: 1.350 − 500 */
  assert.equal(balance(c),850);
  assert.deepEqual(resumen(c),{total:6850,yo:3350,pareja:3500}); /* 2.000 + 3.000 + 1.350 + 500 */
  /* cambiar el reparto después no mueve lo anotado */
  assert.equal(c[1].parte,1800);
});
test('lo que no tiene sentido no se anota', function(){
  assert.equal(nuevoGasto({monto:0,paga:'yo',de:'conjunto'},.5).ok,false);
  assert.equal(nuevoGasto({monto:100,paga:'yo',de:'yo'},.5).ok,false);
  assert.equal(nuevoGasto({monto:100,paga:'pareja',de:'pareja'},.5).ok,false);
});
test('el ahorro del pacto: juntos o dividido (las partes suman la meta)', function(){
  assert.deepEqual(ahorroDe(9000,.54,'juntos'),{juntos:9000});
  assert.deepEqual(ahorroDe(9000,.54,'dividido'),{yo:4860,pareja:4140});
  var d=ahorroDe(1001,.5,'dividido');assert.equal(d.yo+d.pareja,1001);
});
