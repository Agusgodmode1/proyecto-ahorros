/* Modo supervivencia (2.18): poca plata y mucho tiempo hasta cobrar. Números inventados. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enSupervivencia,ahorroSimbolico,atajosSupervivencia,estadoSupervivencia,agregarEsperado,recibirEsperado,quitarEsperado,deshacerEsperado,normEsperado,DIA_SUPERV} from '../js/logica/supervivencia.js';
import {cuentaPacto,sellarPacto,DIA_BAJO} from '../js/logica/pacto.js';
import {planCalc} from '../js/logica/plan.js';
import {disponible} from '../js/logica/saldo.js';
import {defaults,migrar,VERSION_ESTADO} from '../js/estado.js';

var HOY='2026-10-26',COBRO='2026-11-25'; /* 30 días */
function conPacto(total,ahorro){var st=defaults(HOY);sellarPacto(st,{total:total,ahorro:ahorro,cobro:COBRO},HOY);return st}

test('se entra con menos de DIA_BAJO por día aunque no guardes nada',function(){
  assert.equal(DIA_SUPERV,DIA_BAJO);
  assert.equal(enSupervivencia(500,0,30),true);
  assert.equal(enSupervivencia(9000,0,30),false,'300 por día justo no');
  assert.equal(enSupervivencia(8999,0,30),true);
  assert.equal(enSupervivencia(20000,12000,30),true,'los fijos se descuentan primero');
  assert.equal(enSupervivencia(0,0,30),false,'sin plata no hay plan');
});

test('el pacto avisa supervivencia mirando la plata sin ahorro',function(){
  var st=defaults(HOY);
  assert.equal(cuentaPacto(st,{total:500,ahorro:0,cobro:COBRO},HOY).supervivencia,true);
  assert.equal(cuentaPacto(st,{total:30000,ahorro:25000,cobro:COBRO},HOY).supervivencia,false,'si es por el ahorro, es el aviso de siempre');
});

test('ahorro sugerido: nada o algo simbólico',function(){
  assert.equal(ahorroSimbolico(500,0),10);
  assert.equal(ahorroSimbolico(5000,0),100);
  assert.equal(ahorroSimbolico(80,0),0);
  assert.deepEqual(atajosSupervivencia(5000,0),[{monto:0,t:'Nada esta vez'},{monto:100,t:'Algo simbólico'}]);
  assert.deepEqual(atajosSupervivencia(50,0),[{monto:0,t:'Nada esta vez'}]);
});

test('Hoy en supervivencia: por día, por semana y fijos que faltan',function(){
  var st=conPacto(500,0),r=estadoSupervivencia(st,planCalc(st),HOY);
  assert.ok(r);assert.equal(r.dias,30);assert.equal(r.resto,500);
  assert.equal(Math.round(r.porDia*100)/100,16.67);assert.equal(Math.round(r.porSemana),117);
  assert.equal(r.ritmo,null,'con menos de 3 días no hay ritmo');
  assert.equal(estadoSupervivencia(conPacto(30000,3000),planCalc(conPacto(30000,3000)),HOY),null,'con plata suficiente no aparece');
});

test('a tu ritmo: hasta cuándo te alcanza',function(){
  var st=conPacto(2000,0);
  st.gastos.push({id:'a',fecha:'2026-10-26',monto:300,cat:'Otros'},{id:'b',fecha:'2026-10-27',monto:300,cat:'Otros'},{id:'c',fecha:'2026-10-28',monto:300,cat:'Otros'});
  var r=estadoSupervivencia(st,planCalc(st),'2026-10-28');
  assert.equal(r.ritmo,300);assert.equal(r.resto,1100);
  assert.deepEqual(r.alcanza,{llega:false,dias:3,hasta:'2026-10-30'});
});

test('la plata que va a entrar no cuenta hasta que llega',function(){
  var st=conPacto(500,0);
  assert.equal(agregarEsperado(st,{fecha:'2026-11-05',monto:0},HOY).error,'monto');
  assert.equal(agregarEsperado(st,{fecha:'2026-10-20',monto:100},HOY).error,'pasada');
  assert.equal(agregarEsperado(st,{fecha:'2026-11-30',monto:100},HOY).error,'despues');
  var a=agregarEsperado(st,{fecha:'2026-11-05',monto:3000,nota:'changa'},HOY);
  assert.equal(a.ok,true);assert.equal(disponible(st,planCalc(st)),500,'todavía no entró');
  var r=estadoSupervivencia(st,planCalc(st),HOY);assert.equal(r.totalEsperado,3000);assert.equal(r.llego.length,0);
  assert.equal(estadoSupervivencia(st,planCalc(st),'2026-11-05').llego.length,1,'el día que tocaba, pregunta si entró');
});

test('«Me entró» suma lo que entró de verdad, y se deshace',function(){
  var st=conPacto(500,0),a=agregarEsperado(st,{fecha:'2026-11-05',monto:3000},HOY);
  var u=recibirEsperado(st,a.item.id,2500);
  assert.equal(st.plan.monto,3000);assert.equal(st.plan.esperado.length,0);
  deshacerEsperado(st,u);assert.equal(st.plan.monto,500);assert.equal(st.plan.esperado.length,1);
  u=recibirEsperado(st,a.item.id);assert.equal(st.plan.monto,3500,'sin monto, lo esperado');
  assert.equal(recibirEsperado(st,'nada'),null);
});

test('«No va a entrar» lo borra sin tocar tu plata',function(){
  var st=conPacto(500,0),a=agregarEsperado(st,{fecha:'2026-11-05',monto:3000},HOY);
  var u=quitarEsperado(st,a.item.id);assert.equal(st.plan.monto,500);assert.equal(st.plan.esperado.length,0);
  deshacerEsperado(st,u);assert.equal(st.plan.esperado.length,1);
});

test('al sellar un pacto nuevo sigue solo lo que todavía no llegó y entra antes del cobro',function(){
  var st=conPacto(500,0);
  st.plan.esperado=[{id:'x',fecha:'2026-10-20',monto:100},{id:'y',fecha:'2026-11-10',monto:200},{id:'z',fecha:'2026-12-20',monto:300}];
  sellarPacto(st,{total:500,ahorro:0,cobro:'2026-12-01'},HOY);
  assert.deepEqual(st.plan.esperado.map(function(x){return x.id}),['y']);
});

test('migración v20: sin nada esperado',function(){
  assert.equal(VERSION_ESTADO,20);
  var d=defaults(HOY);d.v=19;delete d.plan.esperado;
  assert.deepEqual(migrar(d).plan.esperado,[]);
  d.plan.esperado=[{fecha:'2026-11-05',monto:'300'},{fecha:'mal',monto:5},{fecha:'2026-11-01',monto:0}];
  var e=migrar(d).plan.esperado;assert.equal(e.length,1);assert.equal(e[0].monto,300);
  assert.deepEqual(normEsperado(null),[]);
});
