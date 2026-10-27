/* Capítulo VII · Lo guardado. Números inventados. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resumenGuardado,esFondo} from '../js/logica/guardado.js';
import {defaults} from '../js/estado.js';

var HOY='2026-10-27';
function base(){
  var st=defaults('2026-10-20');
  st.plan.monto=30000;st.plan.ahorro=6000;st.plan.inicio='2026-10-20';st.plan.cobro='2026-11-19';
  st.fijos.push({id:'f',nombre:'Celular',monto:1000,dia:10,cat:'Servicios'});
  st.hist=[{k:'2026-07',meta:5000,ahorrado:3000},{k:'2026-08',meta:5000,ahorrado:5200},{k:'2026-09',meta:6000,ahorrado:6400}];
  return st;
}

test('lo guardado: el total y cada pacto, del más nuevo al más viejo, con su sello',function(){
  var r=resumenGuardado(base(),HOY);
  assert.equal(r.total,14600);
  assert.deepEqual(r.pactos.map(function(p){return p.k}),['2026-09','2026-08','2026-07']);
  assert.deepEqual(r.pactos.map(function(p){return p.ok}),[true,true,false]);
  assert.equal(r.ultimo.ahorrado,6400);
  assert.equal(r.promedio,4867);
});

test('sin meta de emergencia: objetivo sugerido (3 meses de gastos) y nada juntado; primero, el fondo',function(){
  var r=resumenGuardado(base(),HOY);
  assert.ok(r.fondo.objetivo>0);assert.equal(r.fondo.id,null);
  assert.equal(r.fondo.tiene,0);assert.equal(r.fondo.pct,0);
  assert.equal(r.paso,'fondo');
  assert.equal(r.fondo.pactos,Math.ceil(r.fondo.objetivo/4866.666666666667));
});

test('con la meta «Fondo de emergencia»: su objetivo, sus aportes y cuántos pactos faltan',function(){
  var st=base();st.metas=[{id:'fe',nombre:'Fondo de emergencia',objetivo:20000,aportes:[{id:'a',fecha:'2026-09-30',monto:5000},{id:'b',fecha:'2026-10-20',monto:4000}]},
    {id:'v',nombre:'Viaje',objetivo:30000,para:'2027-07',aportes:[{id:'c',fecha:'2026-10-01',monto:3000}]}];
  var r=resumenGuardado(st,HOY);
  assert.equal(r.fondo.id,'fe');assert.equal(r.fondo.tiene,9000);assert.equal(r.fondo.falta,11000);
  assert.equal(r.fondo.pct,0.45);assert.equal(r.fondo.pactos,3);
  assert.deepEqual(r.metas.map(function(m){return m.nombre}),['Viaje'],'el fondo no se repite entre las metas');
  assert.equal(r.metas[0].tiene,3000);assert.equal(r.paso,'fondo');
});

test('con el fondo completo, el paso siguiente son las metas; con todo cumplido, listo',function(){
  var st=base();st.metas=[{id:'fe',nombre:'Mi fondo de EMERGENCIA',objetivo:5000,aportes:[{id:'a',fecha:'2026-09-30',monto:5000}]},{id:'v',nombre:'Bici',objetivo:8000,aportes:[]}];
  var r=resumenGuardado(st,HOY);
  assert.equal(r.fondo.completo,true);assert.equal(r.fondo.pactos,null);assert.equal(r.paso,'metas');
  st.metas[1].aportes.push({id:'b',fecha:'2026-10-25',monto:8000});
  assert.equal(resumenGuardado(st,HOY).paso,'listo');
});

test('sin historial ni gastos: nada que mostrar, sin errores',function(){
  var st=defaults(HOY),r=resumenGuardado(st,HOY);
  assert.equal(r.total,0);assert.deepEqual(r.pactos,[]);assert.equal(r.ultimo,null);assert.equal(r.fondo,null);assert.equal(r.paso,'listo');
});

test('esFondo reconoce el nombre sin importar mayúsculas',function(){
  assert.equal(esFondo({nombre:'Fondo de Emergencia'}),true);assert.equal(esFondo({nombre:'Viaje'}),false);assert.equal(esFondo(null),false);
});
