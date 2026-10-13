import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planear,fijosPeriodo,quintoHabil,nextCobro,planCalc,semanaDe} from '../js/logica/plan.js';
import {bizRank} from '../js/logica/fechas.js';
import {defaults} from '../js/estado.js';

test('próximo cobro: 5.º día hábil',function(){
  assert.equal(quintoHabil(2026,10),'2026-11-09');
  assert.equal(quintoHabil(2026,11),'2026-12-07');
  assert.equal(nextCobro('2026-10-07'),'2026-11-09');
  assert.equal(nextCobro('2026-11-09'),'2026-12-07');
  assert.equal(bizRank('2026-11-09'),5);
  assert.equal(bizRank('2026-10-12'),null,'12/10 es feriado');
});

var PLAN={monto:40000,modo:'monto',ahorro:12000,pct:30,inicio:'2026-10-12',cobro:'2026-11-09'};

test('plan sin fijos: $40.000, ahorro $12.000, del 12/10 al 09/11',function(){
  var pc=planear(PLAN,[],0);
  assert.equal(pc.total,28);
  assert.equal(pc.gastar,28000);
  assert.equal(pc.daily,1000);
  assert.equal(pc.gastar*7/pc.total,7000);
  assert.equal(pc.weeks.length,4);
  assert.deepEqual(pc.weeks.map(function(w){return w.budget}),[7000,7000,7000,7000]);
});

test('plan con fijos: Alquiler $15.000 el 1 y Celular $1.200 el 20',function(){
  var s=defaults();s.plan=Object.assign({},PLAN);
  s.fijos=[{id:'a',nombre:'Alquiler',monto:15000,dia:1,cat:'Vivienda'},{id:'c',nombre:'Celular',monto:1200,dia:20,cat:'Celular e internet'}];
  var fp=fijosPeriodo(s.fijos,PLAN.inicio,PLAN.cobro);
  assert.deepEqual(fp.map(function(o){return o.f.nombre+' '+o.fecha}),['Celular 2026-10-20','Alquiler 2026-11-01']);
  var pc=planCalc(s);
  assert.equal(pc.fijos,16200);
  assert.equal(pc.gastar,11800);
  assert.equal(Math.round(pc.daily),421);
});

test('fijo con día 31 en un mes corto usa el último día del mes',function(){
  var fp=fijosPeriodo([{id:'x',nombre:'X',monto:1,dia:31}],'2026-11-09','2026-12-07');
  assert.deepEqual(fp.map(function(o){return o.fecha}),['2026-11-30']);
});

test('lo que sobra o falta pasa a la semana siguiente',function(){
  var pc=planear(PLAN,[{fecha:'2026-10-13',monto:9000},{fecha:'2026-10-20',monto:1000}],0);
  assert.equal(pc.weeks[0].left,-2000);
  assert.equal(pc.weeks[1].avail,5000);
  assert.equal(pc.weeks[1].left,4000);
  assert.equal(semanaDe(pc,'2026-10-19'),1);
  assert.equal(semanaDe(pc,'2026-11-09'),-1);
});

test('hoy podés gastar: lo que queda de la semana repartido en los días que faltan',async function(){
  var {hoyPodes}=await import('../js/logica/plan.js');
  var plan={monto:28000,modo:'monto',ahorro:0,inicio:'2026-10-12',cobro:'2026-11-09'};
  var gastos=[{fecha:'2026-10-12',monto:1500},{fecha:'2026-10-14',monto:400}];
  var pc=planear(plan,gastos,0);
  /* semana 1: 7.000; lunes 1.500; el miércoles 14 quedan 5 días (14 al 18) */
  var h=hoyPodes(pc,gastos,'2026-10-14');
  assert.equal(h.dentro,true);
  assert.equal(h.dias,5);
  assert.equal(h.gastadoHoy,400);
  assert.equal(Math.round(h.porDia),1100);     /* (7000−1500)/5 */
  assert.equal(Math.round(h.queda),700);       /* 1100 − 400 de hoy */
  var fuera=hoyPodes(pc,gastos,'2026-12-01');
  assert.equal(fuera.dentro,false);
  assert.equal(Math.round(fuera.porDia),1000);
});
