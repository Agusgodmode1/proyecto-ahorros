/* Ingresos fijos (2.20): lo que entra todos los meses además del sueldo. Números inventados. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normIngresos,totalIngresosMes,ingresosPeriodo,programarIngresos,reprogramar} from '../js/logica/ingresos.js';
import {recibirEsperado,quitarEsperado,deshacerEsperado,estadoSupervivencia} from '../js/logica/supervivencia.js';
import {sellarPacto} from '../js/logica/pacto.js';
import {planCalc,proximo} from '../js/logica/plan.js';
import {disponible} from '../js/logica/saldo.js';
import {defaults} from '../js/estado.js';
import {LISTAS} from '../js/logica/sync.js';

var HOY='2026-10-26';
function conPacto(cobro){var st=defaults(HOY);sellarPacto(st,{total:20000,ahorro:2000,cobro:cobro||'2026-11-25'},HOY);return st}

test('la lista queda prolija y suma por mes',function(){
  var l=normIngresos([{nombre:'Ayuda de Agus',monto:'8000',dia:10},{nombre:'',monto:3000,dia:0},{monto:-1}]);
  assert.equal(l.length,2);assert.equal(l[1].nombre,'Ingreso');assert.equal(l[1].dia,1);
  assert.equal(totalIngresosMes({ingresosFijos:l}),11000);
  assert.ok(LISTAS.ingresosFijos,'se junta entre aparatos');
});

test('los que caen en el pacto, con el último día si el mes es corto',function(){
  var st={ingresosFijos:[{id:'a',nombre:'A',monto:100,dia:31},{id:'b',nombre:'B',monto:200,dia:10}]};
  var l=ingresosPeriodo(st,'2026-10-26','2026-12-01');
  assert.deepEqual(l.map(function(o){return o.ing.id+' '+o.fecha}),['a 2026-10-31','b 2026-11-10','a 2026-11-30']);
});

test('se anotan solos como «te va a entrar», sin contar hasta que llegan',function(){
  var st=conPacto();st.ingresosFijos=[{id:'a',nombre:'Ayuda de Agus',monto:8000,dia:5}];
  var n=programarIngresos(st);
  assert.equal(n.length,1);assert.equal(n[0].id,'if-a-2026-11-05');assert.equal(n[0].fijo,'a');
  assert.equal(programarIngresos(st).length,0,'no se duplica');
  assert.equal(disponible(st,planCalc(st)),20000,'todavía no entró');
});

test('«Me entró» suma y no vuelve; «No entró» tampoco; Deshacer lo trae de nuevo',function(){
  var st=conPacto();st.ingresosFijos=[{id:'a',nombre:'Ayuda',monto:8000,dia:5}];programarIngresos(st);
  var u=recibirEsperado(st,'if-a-2026-11-05');
  assert.equal(st.plan.monto,28000);assert.deepEqual(st.plan.vistos,['if-a-2026-11-05']);
  assert.equal(programarIngresos(st).length,0,'ya respondido');
  deshacerEsperado(st,u);assert.deepEqual(st.plan.vistos,[]);assert.equal(st.plan.esperado.length,1);
  quitarEsperado(st,'if-a-2026-11-05');assert.equal(programarIngresos(st).length,0);assert.equal(st.plan.monto,20000);
});

test('cambiar un ingreso fijo vuelve a anotar lo que no llegó con el monto nuevo',function(){
  var st=conPacto();st.ingresosFijos=[{id:'a',nombre:'Ayuda',monto:8000,dia:5}];programarIngresos(st);
  st.plan.esperado.push({id:'x',fecha:'2026-11-10',monto:500,nota:'changa'});
  st.ingresosFijos[0].monto=9000;reprogramar(st);
  assert.deepEqual(st.plan.esperado.map(function(e){return e.id+':'+e.monto}),['if-a-2026-11-05:9000','x:500'],'la plata a mano no se toca');
  st.ingresosFijos=[];reprogramar(st);assert.deepEqual(st.plan.esperado.map(function(e){return e.id}),['x']);
});

test('un pacto nuevo anota los del período nuevo',function(){
  var st=conPacto('2026-11-06');st.ingresosFijos=[{id:'a',nombre:'Ayuda',monto:8000,dia:5}];programarIngresos(st);
  recibirEsperado(st,'if-a-2026-11-05');
  sellarPacto(st,{total:30000,ahorro:0,cobro:'2026-12-07'},'2026-11-06');
  assert.deepEqual(st.plan.vistos,[],'lo viejo se olvida');
  assert.deepEqual(programarIngresos(st).map(function(e){return e.id}),['if-a-2026-12-05']);
});

test('Cuando cobres suma los ingresos fijos del mes',function(){
  var st=conPacto('2026-11-06');st.plan.ahorro=0;
  var a=proximo(st,{liquido:30000});
  st.ingresosFijos=[{id:'a',nombre:'Ayuda',monto:8000,dia:5}];
  var b=proximo(st,{liquido:30000});
  assert.equal(b.ingresos,8000);assert.equal(b.libre-a.libre,8000);
});
