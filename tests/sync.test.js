import {test} from 'node:test';
import assert from 'node:assert/strict';
import {marcarCambios,combinar,iguales,tieneDatos} from '../js/logica/sync.js';
import {ejemplo,defaults,migrar} from '../js/estado.js';

function copia(x){return JSON.parse(JSON.stringify(x))}
/* Simula un aparato: parte de un estado y guarda cambios en un momento dado */
function guardar(prev,cambiar,t){var cur=copia(prev);cambiar(cur);return marcarCambios(prev,cur,t)}

test('anota qué sección y qué gasto cambió',function(){
  var a=ejemplo();marcarCambios(null,a,0);
  var b=guardar(a,function(s){s.plan.monto=50000;s.gastos.push({id:'g1',fecha:'2026-10-13',monto:850})},100);
  assert.equal(b.sync.t.plan,100);
  assert.equal(b.sync.t.sueldo,undefined);
  assert.equal(b.gastos[0]._u,100);
  var c=guardar(b,function(s){s.gastos[0].monto=900},200);
  assert.equal(c.gastos[0]._u,200);
  var d=guardar(c,function(s){s.gastos=[]},300);
  assert.equal(d.sync.borrados.gastos.g1,300);
});

test('dos aparatos sin conexión: se juntan los gastos de los dos',function(){
  var base=ejemplo();marcarCambios(null,base,0);
  var cel=guardar(base,function(s){s.gastos.push({id:'cel',fecha:'2026-10-13',monto:100})},10);
  var pc=guardar(base,function(s){s.gastos.push({id:'pc',fecha:'2026-10-13',monto:200})},20);
  var m=combinar(cel,pc);
  assert.deepEqual(m.gastos.map(function(g){return g.id}).sort(),['cel','pc']);
  assert.ok(iguales(m,combinar(pc,cel)),'da lo mismo en los dos aparatos');
});

test('si el mismo dato cambió en los dos, gana el más reciente',function(){
  var base=ejemplo();base.gastos=[{id:'g',fecha:'2026-10-13',monto:100,_u:1}];marcarCambios(null,base,0);
  var cel=guardar(base,function(s){s.gastos[0].monto=111;s.plan.ahorro=5000},10);
  var pc=guardar(base,function(s){s.gastos[0].monto=222},20);
  var m=combinar(cel,pc);
  assert.equal(m.gastos[0].monto,222,'el gasto lo cambió último la compu');
  assert.equal(m.plan.ahorro,5000,'el plan solo cambió en el celular');
  var pc2=guardar(base,function(s){s.plan.ahorro=8000},30);
  assert.equal(combinar(cel,pc2).plan.ahorro,8000);
});

test('lo borrado no vuelve a aparecer, pero lo cambiado después del borrado sí queda',function(){
  var base=ejemplo();base.gastos=[{id:'g',fecha:'2026-10-13',monto:100,_u:1}];marcarCambios(null,base,0);
  var cel=guardar(base,function(s){s.gastos=[]},10);
  var pc=copia(base);
  assert.equal(combinar(pc,cel).gastos.length,0);
  assert.equal(combinar(cel,pc).gastos.length,0);
  var pc2=guardar(base,function(s){s.gastos[0].monto=500},20);
  assert.equal(combinar(cel,pc2).gastos.length,1,'se editó después de borrarlo en el otro aparato');
});

test('las horas y los meses cerrados también se juntan',function(){
  var base=ejemplo();marcarCambios(null,base,0);
  var cel=guardar(base,function(s){s.horas.push({id:'h1',fecha:'2026-10-13',tipo:'sem',min:20});s.hist.push({k:'2026-09',meta:1,ahorrado:2})},10);
  var pc=guardar(base,function(s){s.horas=s.horas.filter(function(h){return h.id!=='x1'})},20);
  var m=combinar(cel,pc);
  assert.equal(m.horas.length,10,'10 del ejemplo + 1 nueva − 1 borrada');
  assert.equal(m.hist.length,1);
});

test('el estado con datos de sincronización pasa por migrar sin perderlos',function(){
  var a=ejemplo();marcarCambios(null,a,0);
  var b=guardar(a,function(s){s.gastos.push({id:'g',fecha:'2026-10-13',monto:1})},5);
  var m=migrar(copia(b));
  assert.equal(m.sync.t.ejemplo,undefined);
  assert.equal(m.gastos[0]._u,5);
  assert.deepEqual(m.sync,b.sync);
});

test('saber si hay datos para subir',function(){
  assert.equal(tieneDatos(defaults()),false);
  assert.equal(tieneDatos(ejemplo()),true);
});
