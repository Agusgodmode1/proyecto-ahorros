/* Etapa 2 del libro: ajustes del pacto, fin del ciclo y capítulos. Números inventados. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {previaAjuste,aplicarAjuste,deshacerAjustePacto} from '../js/logica/pacto.js';
import {resumenCiclo,cerrarCiclo,cicloTerminado} from '../js/logica/ciclo.js';
import {sellarPacto} from '../js/logica/pacto.js';
import {capituloDe,paginas,vecina,numeroDePagina,nombreDePagina} from '../js/logica/capitulos.js';
import {disponible} from '../js/logica/saldo.js';
import {defaults} from '../js/estado.js';

var HOY='2026-10-27';
function armado(){
  var st=defaults('2026-10-20');
  st.plan.monto=30000;st.plan.modo='monto';st.plan.ahorro=6000;st.plan.inicio='2026-10-20';st.plan.cobro='2026-11-19';
  st.gastos.push({id:'a',fecha:'2026-10-21',monto:2000,nota:'Súper'});
  return st;
}

test('ajustes del pacto: la plata de hoy no puede ser negativa',function(){
  var v=previaAjuste(armado(),{tenes:-1,ahorro:6000,cobro:'2026-11-19'},HOY);
  assert.equal(v.ok,false);assert.ok(v.errores.tenes);
});

test('ajustes del pacto: el ahorro no pasa de lo que tenés menos los fijos que faltan',function(){
  var st=armado();st.fijos.push({id:'f',nombre:'Alquiler',monto:10000,dia:1,cat:'Vivienda'});
  var v=previaAjuste(st,{tenes:28000,ahorro:20000,cobro:'2026-11-19'},HOY);
  assert.equal(v.errores.ahorro,'max');
  assert.equal(v.maxAhorro,18000);
  assert.equal(previaAjuste(st,{tenes:28000,ahorro:18000,cobro:'2026-11-19'},HOY).ok,true);
});

test('ajustes del pacto: el cobro tiene que ser futuro',function(){
  var st=armado();
  assert.ok(previaAjuste(st,{tenes:28000,ahorro:6000,cobro:HOY},HOY).errores.cobro);
  assert.ok(previaAjuste(st,{tenes:28000,ahorro:6000,cobro:'2027-06-01'},HOY).errores.cobro,'más de 120 días no');
});

test('ajustes del pacto: gastos sin anotar → ajuste de saldo, y todo se recalcula',function(){
  var st=armado();
  assert.equal(disponible(st),28000);
  var v=aplicarAjuste(st,{tenes:25000,ahorro:5000,cobro:'2026-11-17'},HOY);
  assert.equal(v.ok,true);
  assert.equal(disponible(st),25000,'queda lo que dijiste que tenés');
  assert.equal(st.gastos.filter(function(g){return g.src==='ajuste'})[0].monto,3000);
  assert.equal(st.plan.ahorro,5000);assert.equal(st.plan.cobro,'2026-11-17');
  /* 25000 − 5000 = 20000 para gastar en 21 días (27/10 → 17/11) */
  assert.equal(v.gastar,20000);assert.equal(v.dias,21);
});

test('ajustes del pacto: «Deshacer» deja todo como estaba',function(){
  var st=armado(),antes=JSON.stringify(st);
  var v=aplicarAjuste(st,{tenes:31000,ahorro:7000,cobro:'2026-11-20'},HOY);
  assert.equal(v.ok,true);assert.equal(st.plan.monto,33000,'entró plata: suma al plan');
  deshacerAjustePacto(st,v.deshacer);
  assert.equal(JSON.stringify(st),antes);
});

test('ajustes del pacto: si cambia el cobro, los fijos pagados siguen pagados',function(){
  var st=armado();st.fijos.push({id:'f',nombre:'Celular',monto:1000,dia:25,cat:'Servicios'});
  st.fijosPagos['2026-11-19']={f:{monto:1000,fecha:'2026-10-25'}};
  aplicarAjuste(st,{tenes:27000,ahorro:6000,cobro:'2026-11-20'},HOY);
  assert.ok(st.fijosPagos['2026-11-20'].f);assert.equal(st.fijosPagos['2026-11-19'],undefined);
});

test('ajustes del pacto inválidos no tocan nada',function(){
  var st=armado(),antes=JSON.stringify(st);
  aplicarAjuste(st,{tenes:28000,ahorro:99999,cobro:'2026-11-19'},HOY);
  assert.equal(JSON.stringify(st),antes);
});

test('fin del ciclo: solo el día de cobro o después',function(){
  var st=armado();
  assert.equal(cicloTerminado(st,'2026-11-18'),false);
  assert.equal(cicloTerminado(st,'2026-11-19'),true);
  st.ejemplo=true;assert.equal(cicloTerminado(st,'2026-11-19'),false,'con el ejemplo no');
});

test('fin del ciclo: lo que no gastaste es lo ahorrado; el pacto nuevo suma el cobro',function(){
  var st=armado();st.sueldo.nominal=40000;
  var r=resumenCiclo(st,'2026-11-19');
  assert.equal(r.ahorrado,28000);
  assert.equal(r.cumplido,true);
  assert.equal(r.racha,1,'primer mes cumplido');
  assert.ok(r.cobro>0);
  assert.equal(r.total,r.ahorrado+r.cobro);
  assert.equal(st.hist.length,0,'el resumen no cierra nada');
});

test('fin del ciclo: cerrar guarda el mes y el pacto nuevo arranca',function(){
  var st=armado();st.pacto.numero=1;st.hist.push({k:'2026-09',meta:5000,ahorrado:6000});
  var r=cerrarCiclo(st,'2026-11-19');
  assert.equal(st.hist.length,2);assert.equal(r.racha,2);
  var v=sellarPacto(st,{total:50000,ahorro:8000,cobro:'2026-12-18'},'2026-11-19');
  assert.equal(v.ok,true);
  assert.equal(st.plan.inicio,'2026-11-19');assert.equal(st.plan.monto,50000);
  assert.equal(st.pacto.numero,2,'el segundo pacto');
});

test('capítulos: números romanos y semanas como páginas',function(){
  assert.equal(capituloDe('w3').n,'II');assert.equal(capituloDe('logros').t,'Logros');
  assert.equal(capituloDe('ajustes'),null);
  assert.deepEqual(paginas(2),['resumen','w0','w1','fijos','sueldo','gastos','logros','guardado']);
  assert.equal(capituloDe('guardado').n,'VII');
});

test('capítulos: deslizar pasa de página y frena en los bordes',function(){
  assert.equal(vecina('resumen',1,5,2),'w2','desde Hoy, a la semana actual');
  assert.equal(vecina('w2',1,5,2),'w3');
  assert.equal(vecina('w4',1,5,2),'fijos');
  assert.equal(vecina('w0',-1,5,2),'resumen');
  assert.equal(vecina('fijos',-1,5,2),'w4');
  assert.equal(vecina('resumen',-1,5,2),'prologo','hacia atrás desde Hoy, el pacto');
  assert.equal(vecina('logros',1,5,2),'guardado');
  assert.equal(vecina('guardado',1,5,2),'ajustes','Ajustes es la última página');
  assert.equal(vecina('ajustes',1,5,2),null);
  assert.equal(vecina('ajustes',-1,5,2),'guardado');
  assert.equal(vecina('resumen',1,0,0),'fijos');
});

test('capítulos: el folio de cada página',function(){
  assert.equal(numeroDePagina('p1',3),1);assert.equal(numeroDePagina('qi',3),null);assert.equal(numeroDePagina('q1',3),2);assert.equal(numeroDePagina('qa',3),3);assert.equal(numeroDePagina('qf',3),4);assert.equal(numeroDePagina('pacto',3),7);
  assert.equal(numeroDePagina('indice',3),8);assert.equal(numeroDePagina('resumen',3),9);
  assert.equal(numeroDePagina('w0',3),10);assert.equal(numeroDePagina('w2',3),12);
  assert.equal(numeroDePagina('fijos',3),13);assert.equal(numeroDePagina('logros',3),16);
  assert.equal(numeroDePagina('guardado',3),17);assert.equal(numeroDePagina('ajustes',3),18);assert.equal(numeroDePagina('semanas',3),10);
  assert.equal(numeroDePagina('nada',3),null);
  assert.equal(nombreDePagina('w1'),'Semana 2');assert.equal(nombreDePagina('sueldo'),'Sueldo');assert.equal(nombreDePagina('guardado'),'Lo guardado');assert.equal(nombreDePagina('prologo'),'El pacto');
});
