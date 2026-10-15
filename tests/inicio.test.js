import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../js/estado.js';
import {atajosMeta,resumenInicio,fondoEmergencia} from '../js/logica/inicio.js';

/* Números inventados */
function estado(){
  var s=defaults('2026-10-12');
  s.plan.inicio='2026-10-12';s.plan.cobro='2026-11-09';
  return s;
}
test('atajos de meta: 10, 20 y 30 % redondeados a 100',()=>{
  var a=atajosMeta(50000);
  assert.deepEqual(a.map(x=>x.pct),[10,20,30]);
  assert.deepEqual(a.map(x=>x.monto),[5000,10000,15000]);
  assert.equal(atajosMeta(0).length,0);
  assert.equal(atajosMeta(43210)[0].monto,4300);
});
test('resumen: te queda para gastar y por día, con los fijos descontados',()=>{
  var s=estado();s.fijos=[{id:'a',nombre:'Alquiler',monto:10000,dia:15,cat:'Otros'}];
  var r=resumenInicio(s,40000,10000);
  assert.equal(r.fijos,10000);
  assert.equal(r.gastar,20000);
  assert.ok(r.ok);
  assert.ok(Math.abs(r.porDia*r.dias-20000)<1);
});
test('resumen: meta imposible avisa y propone la que sí se puede',()=>{
  var s=estado();s.fijos=[{id:'a',nombre:'Alquiler',monto:10000,dia:15,cat:'Otros'}];
  var r=resumenInicio(s,15000,12000);
  assert.equal(r.ok,false);
  assert.equal(r.metaPosible,5000);
  assert.equal(r.gastar,0);
  /* con la meta propuesta sí cierra */
  assert.ok(resumenInicio(s,15000,r.metaPosible).ok);
});
test('resumen: no modifica el estado original',()=>{
  var s=estado();resumenInicio(s,30000,5000);
  assert.equal(s.plan.monto,0);assert.equal(s.plan.ahorro,0);
});
test('fondo de emergencia: 3 meses de lo que gastás, a miles',()=>{
  var s=estado();
  assert.equal(fondoEmergencia(s),null);
  s.plan.monto=40000;s.plan.ahorro=10000;s.fijos=[{id:'a',nombre:'Alquiler',monto:10000,dia:15,cat:'Otros'}];
  assert.equal(fondoEmergencia(s),90000);
});
