import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cruzar,hormigas} from '../js/logica/control.js';
import {defaults} from '../js/estado.js';
import {planCalc} from '../js/logica/plan.js';

/* Números inventados */
function mov(f,monto,k){return {f:f,monto:monto,d:k,k:k}}
function gasto(id,fecha,monto){return {id:id,fecha:fecha,monto:monto,nota:id}}

test('cruce: coincide, falta anotar y solo anotado',function(){
  var movs=[mov('2026-10-13',850,'DISCO'),mov('2026-10-14',300,'KIOSCO'),mov('2026-10-20',1200,'FARMASHOP')];
  var gs=[gasto('super','2026-10-13',850),gasto('farmacia','2026-10-18',1200),gasto('efectivo','2026-10-15',500)];
  var C=cruzar(movs,gs,'2026-10-12','2026-11-09');
  assert.deepEqual(C.coinciden.map(function(x){return x.gasto.id}),['super','farmacia']);
  assert.equal(C.coinciden[1].dias,2,'dos días de diferencia todavía cuenta');
  assert.deepEqual(C.faltan.map(function(m){return m.k}),['KIOSCO']);
  assert.deepEqual(C.soloAnotados.map(function(g){return g.id}),['efectivo']);
});

test('más de 3 días de diferencia ya no es el mismo gasto',function(){
  var C=cruzar([mov('2026-10-13',850,'DISCO')],[gasto('a','2026-10-17',850)],'2026-10-12','2026-11-09');
  assert.equal(C.coinciden.length,0);assert.equal(C.faltan.length,1);assert.equal(C.soloAnotados.length,1);
});

test('el mismo monto repetido el mismo día: cada movimiento con un gasto distinto',function(){
  var movs=[mov('2026-10-13',120,'BOLETO'),mov('2026-10-13',120,'BOLETO')];
  var una=cruzar(movs,[gasto('b1','2026-10-13',120)],'2026-10-12','2026-11-09');
  assert.equal(una.coinciden.length,1);assert.equal(una.faltan.length,1,'el segundo boleto no está anotado');
  var dos=cruzar(movs,[gasto('b1','2026-10-13',120),gasto('b2','2026-10-13',120)],'2026-10-12','2026-11-09');
  assert.equal(dos.coinciden.length,2);assert.equal(dos.faltan.length,0);
  assert.notEqual(dos.coinciden[0].gasto.id,dos.coinciden[1].gasto.id);
});

test('prefiere el gasto con la fecha más cercana',function(){
  var C=cruzar([mov('2026-10-15',500,'X')],[gasto('lejos','2026-10-12',500),gasto('cerca','2026-10-16',500)],'2026-10-12','2026-11-09');
  assert.equal(C.coinciden[0].gasto.id,'cerca');
});

test('sin doble cuenta: agregar lo que falta no cambia lo que ya coincidía, y el plan suma una sola vez',function(){
  var s=defaults('2026-10-13');s.plan={monto:40000,modo:'monto',ahorro:12000,pct:30,inicio:'2026-10-12',cobro:'2026-11-09'};
  s.gastos=[gasto('super','2026-10-13',850)];
  var movs=[mov('2026-10-13',850,'DISCO'),mov('2026-10-14',300,'KIOSCO')];
  var C=cruzar(movs,s.gastos,'2026-10-12','2026-11-09');
  C.faltan.forEach(function(m,i){s.gastos.push({id:'nuevo'+i,fecha:m.f,monto:m.monto,nota:m.k,src:'brou'})});
  assert.equal(planCalc(s).spentInPlan,1150,'850 + 300, no 850 dos veces');
  var otra=cruzar(movs,s.gastos,'2026-10-12','2026-11-09');
  assert.equal(otra.faltan.length,0,'después de agregar, no queda nada por agregar');
  assert.equal(otra.coinciden.length,2);
});

test('solo cruza dentro de las fechas pedidas',function(){
  var C=cruzar([mov('2026-09-30',100,'A'),mov('2026-10-13',200,'B')],[gasto('g','2026-11-20',300)],'2026-10-12','2026-11-09');
  assert.equal(C.faltan.length,1);assert.equal(C.soloAnotados.length,0);
});

test('gastos hormiga: chicos y repetidos en el mes, con lo que sería en un año',function(){
  var items=[];
  for(var i=1;i<=12;i++)items.push({fecha:'2026-10-'+(i<10?'0':'')+i,monto:150,grupo:'Café de la esquina'});
  items.push({fecha:'2026-10-05',monto:120,grupo:'Kiosco'},{fecha:'2026-10-06',monto:130,grupo:'Kiosco'});
  items.push({fecha:'2026-10-07',monto:2500,grupo:'Café de la esquina'});
  items.push({fecha:'2026-09-28',monto:150,grupo:'Café de la esquina'});
  var h=hormigas(items,'2026-10',400);
  assert.equal(h.length,1,'el kiosco tiene solo 2 compras: no es hormiga');
  assert.deepEqual(h[0],{grupo:'Café de la esquina',n:12,total:1800,anual:21600});
});
