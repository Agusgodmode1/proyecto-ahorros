import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../js/estado.js';
import {diasSinCopia} from '../js/logica/avisos.js';
import {marcarPagado,pagoDe,isPagado,pagosDe,montoEsperado,montoDelPeriodo,fijosPeriodoTotal,totalFijos,planCalc,proximo} from '../js/logica/plan.js';

function base(){
  var s=defaults('2026-10-13');
  s.plan={monto:40000,modo:'monto',ahorro:10000,pct:30,inicio:'2026-10-07',cobro:'2026-11-06'};
  s.fijos=[{id:'ute',nombre:'UTE',monto:1800,dia:15,cat:'Servicios',variable:true},
           {id:'alq',nombre:'Alquiler',monto:15000,dia:1,cat:'Vivienda'},
           {id:'tar',nombre:'Tarjeta de crédito',monto:6000,dia:20,cat:'Deudas y cuotas',tarjeta:true}];
  return s;
}
test('pagar con monto y fecha reales; lo viejo (true) sigue contando como pagado',function(){
  var s=base();
  marcarPagado(s,'ute',true,{monto:2150,fecha:'2026-10-14',nombre:'UTE'});
  assert.deepEqual(pagoDe(s,'ute'),{monto:2150,fecha:'2026-10-14',nombre:'UTE'});
  s.fijosPagos['2026-11-06'].alq=true;
  assert.equal(isPagado(s,'alq'),true);assert.deepEqual(pagoDe(s,'alq'),{});
  marcarPagado(s,'ute',false);assert.equal(isPagado(s,'ute'),false);
});
test('fijo variable: espera el promedio de los últimos 3 pagos; pagado cuenta lo real',function(){
  var s=base();
  s.fijosPagos={'2026-08-07':{ute:{monto:1600}},'2026-09-07':{ute:{monto:2000}},'2026-10-07':{ute:{monto:2100}},'2026-07-07':{ute:{monto:9999}}};
  assert.deepEqual(pagosDe(s,'ute').map(function(x){return x.monto}),[2100,2000,1600,9999]);
  assert.equal(montoEsperado(s,s.fijos[0]),1900,'promedio de los 3 más nuevos');
  assert.equal(montoEsperado(s,s.fijos[1]),15000,'el fijo no variable usa su monto');
  assert.equal(montoDelPeriodo(s,s.fijos[0]),1900);
  marcarPagado(s,'ute',true,{monto:2300,fecha:'2026-10-15'});
  assert.equal(montoDelPeriodo(s,s.fijos[0]),2300,'ya pagado: el monto real');
});
test('el pago de la tarjeta no se resta del presupuesto (ni ahora ni el mes que viene)',function(){
  var s=base();
  /* vencen en el período 7/10–6/11: UTE (15/10), tarjeta (20/10) y alquiler (1/11) */
  assert.equal(fijosPeriodoTotal(s),1800+15000);
  assert.equal(planCalc(s).fijos,16800);
  assert.equal(totalFijos(s.fijos,s),16800);
  assert.equal(proximo(s,{liquido:45000}).fij,16800);
});

test('avisos: año sin feriados y BPC de un año anterior',async function(){
  var {aniosSinFeriados,revisarBPC}=await import('../js/logica/avisos.js');
  var s=base();
  assert.deepEqual(aniosSinFeriados(s,'2026-10-13'),[]);
  s.plan.cobro='2028-01-07';
  assert.deepEqual(aniosSinFeriados(s,'2027-12-20'),['2028'],'el cobro cae en un año sin feriados');
  s.feriados.agregados=[{fecha:'2028-01-01',nombre:'Año Nuevo'}];
  assert.deepEqual(aniosSinFeriados(s,'2027-12-20'),[]);
  s.sueldo.bpcAnio=2026;
  assert.equal(revisarBPC(s,'2026-12-31'),false);
  assert.equal(revisarBPC(s,'2027-01-02'),true);
});

test('aviso de copia fuera del teléfono: recién después de 30 días',function(){
  var st=defaults();
  assert.equal(diasSinCopia(st,'2026-10-15'),null,'sin fechas no avisa');
  st.meta.creado='2026-09-15';
  assert.equal(diasSinCopia(st,'2026-10-15'),null,'30 días justos todavía no');
  assert.equal(diasSinCopia(st,'2026-10-16'),31,'nunca exportó: cuenta desde que empezó');
  st.meta.ultimoExport='2026-10-01';
  assert.equal(diasSinCopia(st,'2026-10-16'),null,'exportó hace 15 días');
  assert.equal(diasSinCopia(st,'2026-11-05'),35);
});
