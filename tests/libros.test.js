/* La estantería (2.60). Datos inventados. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LIBROS,libroValido,claves,respaldoCompleto,parteDelRespaldo} from '../js/logica/libros.js';
import {defaults,leerRespaldo,armarRespaldo,usarLibro,migrar,VERSION_ESTADO} from '../js/estado.js';

test('hay dos libros: el de siempre y el de los dos', function(){
  assert.deepEqual(LIBROS.map(function(l){return l.id}),['solo','duo']);
  assert.equal(libroValido('duo'),'duo');assert.equal(libroValido('negocio'),'solo');assert.equal(libroValido('cualquiera'),'solo');assert.equal(libroValido(null),'solo');
});
test('cada libro guarda en su lugar y el de siempre no se movió', function(){
  assert.deepEqual(claves('solo'),{estado:'principal',copias:'copias',ls:'proyecto-ahorros-v1'});
  var d=claves('duo');assert.equal(d.estado,'duo');
  ['estado','copias','ls'].forEach(function(k){assert.notEqual(d[k],claves('solo')[k],k)});
});
test('respaldo completo: cada libro aparte, y cada libro importa solo lo suyo', function(){
  var a=defaults('2026-11-11');a.plan.monto=1234;var b=defaults('2026-11-11');b.plan.monto=777;
  var R=respaldoCompleto({solo:a,duo:b,negocio:{x:1},otro:null},new Date('2026-11-11T12:00:00Z'));
  assert.deepEqual(Object.keys(R.libros),['solo','duo']);
  var txt=JSON.stringify(R);
  usarLibro('solo');var s=leerRespaldo(txt);assert.equal(s.ok,true);assert.equal(s.estado.plan.monto,1234);
  usarLibro('duo');var d=leerRespaldo(txt);assert.equal(d.ok,true);assert.equal(d.estado.plan.monto,777);
  /* un respaldo completo sin este libro: error claro */
  var solo=leerRespaldo(JSON.stringify(respaldoCompleto({solo:a})));assert.equal(solo.ok,false);assert.match(solo.error,/Pacto de los Dos/);
  /* el respaldo de un solo libro sigue andando igual */
  usarLibro('solo');assert.equal(leerRespaldo(JSON.stringify(armarRespaldo(a))).estado.plan.monto,1234);
  assert.deepEqual(parteDelRespaldo({plan:{}},'solo'),{datos:{plan:{}}});
});
test('v28: la estantería no cambia nada de los datos', function(){
  var antes=defaults('2026-11-11');antes.v=27;antes.plan.monto=5000;antes.gastos.push({id:'a',fecha:'2026-11-11',monto:10,nota:'x'});
  var s=migrar(antes);assert.equal(s.v,VERSION_ESTADO);assert.equal(s.plan.monto,5000);assert.deepEqual(s.gastos,antes.gastos);
});
