/* Herramientas sueltas, sin pacto (2.26). Todos los números son inventados. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,ejemplo,migrar} from '../js/estado.js';
import {HERRAMIENTAS,herramienta,tienePacto,pideElPacto,sueldoVacio,aplicarFormaCobro,alDiaSinPacto,sugerenciaPacto} from '../js/logica/herramientas.js';
import {liqReal} from '../js/logica/recibos.js';
import {planCalc} from '../js/logica/plan.js';
import {nuevoGrupo,resumenCasa,balance} from '../js/logica/compartidos.js';
import {analisisGuardado} from '../js/logica/extracto.js';
import {extractoEjemplo} from '../js/logica/extracto-ejemplo.js';
import {sellarPacto} from '../js/logica/pacto.js';

var HOY='2026-10-29';
function sinPacto(){return defaults(HOY)}

test('cuatro herramientas, cada una con su capítulo; sin pacto, Hoy, Semanas y Logros invitan a armarlo',function(){
  assert.deepEqual(HERRAMIENTAS.map(function(h){return h.id}),['sueldo','recibo','dividir','extracto']);
  assert.deepEqual(HERRAMIENTAS.map(function(h){return h.tab}),['sueldo','sueldo','fijos','gastos']);
  assert.equal(herramienta('dividir').t,'Dividir gastos fijos');assert.equal(herramienta('nada'),null);
  assert.equal(tienePacto(sinPacto()),false);assert.equal(tienePacto(ejemplo(HOY)),true);
  assert.ok(pideElPacto('resumen')&&pideElPacto('w2')&&pideElPacto('logros'));
  assert.ok(!pideElPacto('fijos')&&!pideElPacto('sueldo')&&!pideElPacto('gastos')&&!pideElPacto('guardado'));
  /* el estado sin pacto es válido: migra igual y el plan se calcula sin errores */
  var st=sinPacto();assert.deepEqual(migrar(st),st);
  var pc=planCalc(st);assert.equal(pc.gastar,0);assert.ok(pc.weeks.length>0);
});

test('calcular mi sueldo sin pacto: pide tipo, sueldo y día; después el pacto sugiere la fecha y el monto',function(){
  var st=sinPacto();
  assert.equal(sueldoVacio(st),true);
  assert.equal(aplicarFormaCobro(st,{tipo:'uy',nominal:0,cobro:{tipo:'habil5'}},HOY).error,'nominal');
  assert.equal(aplicarFormaCobro(st,{tipo:'otra',nominal:1000},HOY).error,'tipo');
  var r=aplicarFormaCobro(st,{tipo:'uy',nominal:42000,cobro:{tipo:'fijo',dia:10}},HOY);
  assert.equal(r.ok,true);
  assert.equal(sueldoVacio(st),false);
  assert.equal(st.perfil.hecho,true);assert.deepEqual(st.perfil.ingreso,{tipo:'uy',moneda:'UYU'});
  assert.equal(st.perfil.cobro.tipo,'fijo');assert.equal(st.perfil.cobro.dia,10);
  var L=liqReal(st);assert.ok(L.liquido>0&&L.liquido<42000,'en mano, menos que el nominal');
  /* sin pacto, el «hasta el cobro» se pone al día con la regla */
  assert.equal(st.plan.inicio,HOY);assert.equal(st.plan.cobro,'2026-11-10');
  var s=sugerenciaPacto(st,HOY);
  assert.equal(s.cobro,'2026-11-10');assert.equal(s.monto,Math.round(L.liquido));
  assert.equal(tienePacto(st),false,'calcular el sueldo no sella nada');
  /* con la sugerencia, el pacto se sella como siempre */
  var v=sellarPacto(st,{total:s.monto,ahorro:3000,cobro:s.cobro},HOY);
  assert.equal(v.ok,true);assert.equal(tienePacto(st),true);assert.equal(st.plan.cobro,'2026-11-10');
});

test('factura mensual y sueldo con mis descuentos; sin sueldo no hay monto que sugerir',function(){
  var st=sinPacto();
  assert.deepEqual(sugerenciaPacto(st,HOY),{cobro:'2026-11-06',monto:null});
  aplicarFormaCobro(st,{tipo:'factura',nominal:50000,cobro:{tipo:'ultimoHabil'}},HOY);
  assert.deepEqual(st.perfil.ingreso,{tipo:'variable',factura:true,moneda:'UYU'});assert.ok(st.sueldo.factura);
  assert.equal(st.perfil.cobro.dia,undefined);
  assert.ok(liqReal(st).liquido>0);
  var st2=sinPacto();aplicarFormaCobro(st2,{tipo:'personalizado',nominal:30000},HOY);
  assert.equal(st2.perfil.ingreso.tipo,'personalizado');assert.equal(Math.round(liqReal(st2).liquido),30000,'sin descuentos cargados, queda igual');
});

test('con pacto, cambiar el día de cobro recalcula el cobro de este pacto; sin cambiarlo, nada se mueve',function(){
  var st=ejemplo(HOY),cobro=st.plan.cobro;
  aplicarFormaCobro(st,{tipo:'uy',nominal:45000,cobro:{tipo:st.perfil.cobro.tipo,dia:st.perfil.cobro.dia}},HOY);
  assert.equal(st.plan.cobro,cobro);
  aplicarFormaCobro(st,{tipo:'uy',nominal:45000,cobro:{tipo:'fijo',dia:20}},HOY);
  assert.equal(st.plan.cobro.slice(8),'20');
});

test('sin pacto, la fecha de cobro se mantiene al día (y con pacto no se toca)',function(){
  var st=sinPacto();st.plan.inicio='2026-09-01';st.plan.cobro='2026-10-07';
  assert.equal(alDiaSinPacto(st,HOY),true);assert.equal(st.plan.inicio,HOY);assert.equal(st.plan.cobro,'2026-11-06');
  assert.equal(alDiaSinPacto(st,HOY),false,'si ya está al día, no cambia');
  var e=ejemplo(HOY),c=e.plan.cobro;e.plan.cobro='2026-10-01';
  assert.equal(alDiaSinPacto(e,HOY),false);assert.equal(e.plan.cobro,'2026-10-01');assert.notEqual(c,null);
});

test('dividir gastos fijos sin pacto: el grupo, el reparto y quién debe a quién',function(){
  var st=sinPacto(),g=nuevoGrupo('Casa',2,['Sol']);st.grupos.push(g);
  st.fijos.push({id:'f1',nombre:'Alquiler',monto:24000,dia:5,cat:'Vivienda',grupo:g.id,paga:'yo'});
  var r=resumenCasa(st);
  assert.equal(r.totalCasa,24000);assert.equal(r.teToca,12000);assert.equal(r.hayCompartidos,true);
  assert.doesNotThrow(function(){balance(st,HOY)});
});

test('ver en qué se me va la plata sin pacto: el extracto se lee y se analiza igual',function(){
  var st=sinPacto();st.extracto.texto=extractoEjemplo();
  var A=analisisGuardado(st.extracto,HOY);
  assert.ok(A,'hay análisis');
  assert.ok(Object.keys(A).length>0);
});
