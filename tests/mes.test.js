import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../js/estado.js';
import {planCalc} from '../js/logica/plan.js';
import {ajustarPlan,minimoDe,ritmoDelMes,nivelDe,rachaSemanas} from '../js/logica/mes.js';
import {histStats,cerrarMes} from '../js/logica/logros.js';
import {repartirAhorro,progresoMeta} from '../js/logica/metas.js';

/* Números inventados: $40.000, objetivo $12.000, del 12/10 al 09/11 (28 días, 4 semanas de $7.000) */
function base(){
  var s=defaults('2026-10-12');
  s.plan={monto:40000,modo:'monto',ahorro:12000,pct:30,inicio:'2026-10-12',cobro:'2026-11-09'};
  return s;
}
function g(fecha,monto){return {id:fecha+monto,fecha:fecha,monto:monto,nota:'x'}}
function cerca(a,b,m){assert.ok(Math.abs(a-b)<0.01,(m||'')+': '+a+' vs '+b)}

test('sin mínimo ni cambios de reglas, el plan queda igual que siempre',function(){
  var s=base();s.gastos=[g('2026-10-13',5000),g('2026-10-20',6000)];
  var pc=planCalc(s),aj=ajustarPlan(s,pc,'2026-10-21');
  assert.deepEqual(aj.weeks.map(function(w){return Math.round(w.left)}),pc.weeks.map(function(w){return Math.round(w.left)}));
  assert.equal(aj.ajuste.estado,'objetivo');
  assert.equal(minimoDe(s,pc),12000,'sin mínimo, el mínimo es el objetivo');
});

test('una semana que se pasa: lo que falta se reparte entre las semanas que quedan',function(){
  var s=base();s.gastos=[g('2026-10-13',9400)]; /* semana 1: tenía 7.000, se pasó 2.400 */
  var aj=ajustarPlan(s,planCalc(s),'2026-10-19'); /* ya en la semana 2 */
  assert.deepEqual(aj.ajuste.recalculo,{semana:0,deficit:2400});
  /* 2.400 entre 21 días = 800 por semana menos */
  aj.weeks.slice(1).forEach(function(w){cerca(w.budget,6200)});
  cerca(aj.weeks[1].avail,6200,'la semana 2 no carga sola con todo');
  /* el objetivo sigue intacto: 7.000×4 − 9.400 − 6.200×3 = 0 */
  assert.equal(aj.ajuste.estado,'objetivo');
});

test('si ya no se llega al objetivo, las semanas que quedan cuidan el mínimo',function(){
  var s=base();s.plan.minimo={valor:8000};
  s.gastos=[g('2026-10-13',7000),g('2026-10-20',7000),g('2026-10-27',16000)]; /* 30.000 en 3 semanas: para gastar eran 28.000 */
  var aj=ajustarPlan(s,planCalc(s),'2026-11-03');
  assert.equal(aj.ajuste.estado,'minimo');
  assert.equal(aj.ajuste.minimo,8000);
  /* para quedar justo en el mínimo: 40.000 − 8.000 − 30.000 = 2.000 para la última semana */
  cerca(aj.weeks[3].avail,2000);
  s.gastos.push(g('2026-10-28',5000));
  var aj2=ajustarPlan(s,planCalc(s),'2026-11-03');
  assert.equal(aj2.ajuste.estado,'nada');
  cerca(aj2.ajuste.falta,3000,'faltan 3.000 para el mínimo aunque no gaste más');
});

test('un sobrante pasa a la semana siguiente, o al ahorro si lo elegís',function(){
  var s=base();s.gastos=[g('2026-10-13',5000)]; /* sobran 2.000 en la semana 1 */
  var aj=ajustarPlan(s,planCalc(s),'2026-10-19');
  cerca(aj.weeks[1].avail,9000,'a la semana siguiente');
  s.plan.sobrante='ahorro';
  aj=ajustarPlan(s,planCalc(s),'2026-10-19');
  cerca(aj.weeks[1].avail,7000);cerca(aj.ajuste.alAhorro,2000);cerca(aj.weeks[0].alAhorro,2000);
  s.plan.sobranteSemana={'2026-10-12':'siguiente'};
  aj=ajustarPlan(s,planCalc(s),'2026-10-19');
  cerca(aj.weeks[1].avail,9000,'esa semana elegiste pasarlo a la siguiente');
});

test('mínimo en porcentaje del ingreso, nunca más que el objetivo',function(){
  var s=base();s.plan.modo='pct';s.plan.pct=30;s.plan.minimo={valor:20};
  var pc=planCalc(s);
  assert.equal(pc.ahorro,12000);assert.equal(minimoDe(s,pc),8000);
  s.plan.minimo={valor:50};assert.equal(minimoDe(s,planCalc(s)),12000);
});

test('mes con el mínimo cumplido pero sin llegar al objetivo',function(){
  var x={k:'2026-10',meta:12000,minimo:8000,ahorrado:9000};
  assert.equal(nivelDe(x),'minimo');
  var S=histStats([x]);
  assert.equal(S.met,1,'cuenta como mes logrado');
  assert.equal(S.obj,0,'pero no como objetivo');
  assert.equal(nivelDe({k:'2026-11',meta:12000,minimo:8000,ahorrado:12000}),'objetivo');
  assert.equal(nivelDe({k:'2026-12',meta:12000,minimo:8000,ahorrado:7000}),'ninguno');
  assert.equal(nivelDe({k:'2026-09',meta:12000,ahorrado:12000}),'objetivo','meses viejos sin mínimo: mínimo = meta');
});

test('al cerrar el mes se guarda el mínimo y la racha de semanas',function(){
  var s=base();s.plan.minimo={valor:8000};s.gastos=[g('2026-10-13',6000),g('2026-10-20',8500)]; /* la 2 tenía 7.000 + 1.000 que sobró */
  var pc=ajustarPlan(s,planCalc(s),'2026-11-09');
  cerrarMes(s,pc,9000,40000);
  var r=s.hist[0];
  assert.equal(r.minimo,8000);assert.equal(r.meta,12000);
  assert.deepEqual(r.semanasSeq,[true,false]);
  assert.equal(nivelDe(r),'minimo');
});

test('un mes sin datos: no avisa del ritmo ni rompe nada',function(){
  var s=base();
  var pc=ajustarPlan(s,planCalc(s),'2026-10-30');
  assert.equal(pc.ajuste.estado,'objetivo');
  assert.equal(ritmoDelMes(s,pc,'2026-10-30'),null,'sin gastos anotados no hay ritmo que medir');
  assert.deepEqual(rachaSemanas([],pc,'2026-10-30'),{actual:0,mejor:0});
  assert.equal(nivelDe({k:'2026-10',meta:0,ahorrado:0}),'ninguno');
});

test('aviso a mitad de mes: bien, solo el mínimo, o cuánto bajar por día',function(){
  var s=base();s.plan.minimo={valor:8000};
  assert.equal(ritmoDelMes(s,planCalc(s),'2026-10-15'),null,'muy temprano todavía');
  s.gastos=[g('2026-10-20',10000)]; /* 10.000 en 14 días: a este ritmo 20.000 en el mes */
  var r=ritmoDelMes(s,planCalc(s),'2026-10-25');
  assert.equal(r.tipo,'bien');
  s.gastos=[g('2026-10-20',16000)]; /* 32.000 proyectado: guarda 8.000 → justo el mínimo */
  r=ritmoDelMes(s,planCalc(s),'2026-10-25');
  assert.equal(r.tipo,'minimo');cerca(r.porDiaObjetivo,(28000-16000)/14);
  s.gastos=[g('2026-10-20',20000)]; /* 40.000 proyectado */
  r=ritmoDelMes(s,planCalc(s),'2026-10-25');
  assert.equal(r.tipo,'mal');
  cerca(r.porDiaMinimo,(32000-20000)/14);
  cerca(r.bajar,20000/14-(32000-20000)/14);
});

test('racha de semanas dentro del tope',function(){
  var hist=[{k:'2026-08',semanasSeq:[true,true,false,true]},{k:'2026-09',conGastos:true,semanas:4,semanasOk:4}];
  var s=base();s.gastos=[g('2026-10-13',3000),g('2026-10-20',3000)];
  var r=rachaSemanas(hist,ajustarPlan(s,planCalc(s),'2026-10-27'),'2026-10-27');
  assert.equal(r.actual,7,'1 de agosto + 4 de septiembre + 2 de octubre');
  assert.equal(r.mejor,7);
});

test('reparto del ahorro entre metas, sin pasarse de lo ahorrado',function(){
  var ms=[{id:'a',nombre:'Viaje',objetivo:60000,aportes:[]},{id:'b',nombre:'Fondo',objetivo:20000,aportes:[]}];
  var n=0,id=function(){return 'x'+(n++)};
  assert.equal(repartirAhorro(ms,{a:6000,b:3000},10000,'2026-11-09',id),2);
  assert.equal(progresoMeta(ms[0],'2026-11-09').aportado,6000);
  assert.equal(progresoMeta(ms[1],'2026-11-09').aportado,3000);
  repartirAhorro(ms,{a:8000,b:5000},10000,'2026-12-07',id);
  assert.equal(progresoMeta(ms[0],'2026-12-07').aportado,14000);
  assert.equal(progresoMeta(ms[1],'2026-12-07').aportado,5000,'a la segunda solo le quedaban 2.000 de lo ahorrado');
});
