/* Cuando vendo (2.21): la plata entra a medida que sale cada pedido. Números inventados. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {semanasVentas,guardarGanancia,deshacerGanancia,normEntradas} from '../js/logica/ventas.js';
import {cobroFrec,frecDe,fraccionMes,reglaDesdeFecha,periodoTxt} from '../js/logica/frecuencia.js';
import {sellarPacto,cobreJornal,deshacerCobre,sugerirCobro,reservaFijos,cuentaPacto} from '../js/logica/pacto.js';
import {planCalc} from '../js/logica/plan.js';
import {resumenCiclo} from '../js/logica/ciclo.js';
import {defaults} from '../js/estado.js';

var HOY='2026-11-01'; /* domingo; el pacto va hasta el 1 de diciembre: 30 días, 5 semanas (la última de 2) */
function vendedor(fijos,total){
  var st=defaults(HOY);
  (fijos||[]).forEach(function(f){st.fijos.push(f)});
  sellarPacto(st,{total:total||5000,ahorro:0,cobro:'2026-12-01',frecuencia:'ventas'},HOY);
  return st;
}

test('el pacto es por mes: hasta el 1 del mes que viene (o el día que tocaste)',function(){
  assert.equal(frecDe({frecuencia:'ventas'}),'ventas');
  assert.equal(cobroFrec('2026-10-27',{frecuencia:'ventas'}),'2026-11-01');
  assert.equal(cobroFrec('2026-11-01',{frecuencia:'ventas'}),'2026-12-01');
  assert.equal(cobroFrec('2026-11-01',{frecuencia:'ventas',diaV:15}),'2026-11-15');
  assert.equal(reglaDesdeFecha('ventas','2026-12-01','2026-11-01',{tipo:'fijo',dia:30}).diaV,1);
  assert.equal(fraccionMes({frecuencia:'ventas'},'2026-11-01','2026-12-01'),1);
  assert.equal(periodoTxt({frecuencia:'ventas'}).este,'este mes');
  assert.equal(sugerirCobro(defaults(HOY),HOY,'ventas').fecha,'2026-12-01');
  assert.equal(sugerirCobro(defaults('2026-10-27'),'2026-10-27','ventas').fecha,'2026-12-01','con menos de 7 días, el mes que viene entero');
});

test('los fijos se descuentan como siempre, sin reserva',function(){
  var st=defaults(HOY);st.fijos.push({id:'a',nombre:'Alquiler',monto:12000,dia:10,cat:'Vivienda'});
  assert.equal(reservaFijos(st,'ventas',[],HOY,'2026-12-01',12000).parte,0);
  assert.equal(cuentaPacto(st,{total:20000,ahorro:0,cobro:'2026-12-01',frecuencia:'ventas'},HOY).fijos,12000);
});

test('«Entró plata» suma, anota la entrada y no guarda solo',function(){
  var st=vendedor();
  var u=cobreJornal(st,1500,'2026-11-02','pedido de Marta');
  assert.equal(st.plan.monto,6500);assert.equal(st.plan.ahorro,0);assert.equal(u.guarda,0);
  assert.deepEqual(normEntradas(st.plan.entradas).map(function(e){return e.fecha+' '+e.monto+' '+e.nota}),['2026-11-02 1500 pedido de Marta']);
  deshacerCobre(st,u);assert.equal(st.plan.monto,5000);assert.equal(st.plan.entradas.length,0);
});

test('semana a semana: la parte de los fijos, lo vendido, lo que falta y la ganancia',function(){
  var st=vendedor([{id:'a',nombre:'Alquiler',monto:12000,dia:10,cat:'Vivienda'}]);
  cobreJornal(st,2000,'2026-11-02');cobreJornal(st,1500,'2026-11-05');
  var r=semanasVentas(st,planCalc(st),'2026-11-05');
  var s=r.semanas[0];
  assert.equal(r.fijos,12000);assert.equal(s.parte,2800,'12.000 × 7/30');
  assert.equal(s.vendido,3500);assert.equal(s.cubierta,true);assert.equal(s.ganancia,700);assert.equal(s.actual,true);
  assert.equal(r.actual,0);
});

test('lo que faltó en una semana se suma a la siguiente',function(){
  var st=vendedor([{id:'a',nombre:'Alquiler',monto:12000,dia:10,cat:'Vivienda'}]);
  cobreJornal(st,1000,'2026-11-03');
  var r=semanasVentas(st,planCalc(st),'2026-11-09');
  assert.equal(r.semanas[0].falta,1800);
  assert.equal(r.semanas[1].arrastre,1800);assert.equal(r.semanas[1].meta,4600);
  assert.equal(r.semanas[2].arrastre,0,'las que vienen todavía no');
});

test('sin fijos, todo lo vendido es ganancia',function(){
  var st=vendedor();cobreJornal(st,900,HOY);
  var s=semanasVentas(st,planCalc(st),HOY).semanas[0];
  assert.equal(s.meta,0);assert.equal(s.cubierta,true);assert.equal(s.ganancia,900);
});

test('guardar la ganancia la suma al ahorro, una sola vez, y se deshace',function(){
  var st=vendedor([{id:'a',nombre:'Alquiler',monto:12000,dia:10,cat:'Vivienda'}]);
  st.plan.monto=20000;cobreJornal(st,3500,'2026-11-02');
  var u=guardarGanancia(st,'2026-11-01',undefined,'2026-11-02');
  assert.equal(u.monto,700);assert.equal(st.plan.ahorro,700);
  assert.equal(guardarGanancia(st,'2026-11-01',undefined,'2026-11-02'),null,'ya está guardada');
  var s=semanasVentas(st,planCalc(st),'2026-11-02').semanas[0];assert.equal(s.guardada,700);assert.equal(s.porGuardar,0);
  deshacerGanancia(st,u);assert.equal(st.plan.ahorro,0);assert.deepEqual(st.plan.ganancia,{});
});

test('no se guarda más de lo que se puede',function(){
  var st=vendedor([{id:'a',nombre:'Alquiler',monto:12000,dia:10,cat:'Vivienda'}]);
  st.plan.monto=0;cobreJornal(st,3500,'2026-11-02'); /* tiene 3.500 y faltan pagar 12.000 de alquiler */
  assert.equal(guardarGanancia(st,'2026-11-01',undefined,'2026-11-02'),null);
});

test('un pacto nuevo empieza sin entradas ni ganancia, y el cobro estimado es cero',function(){
  var st=vendedor();cobreJornal(st,900,HOY);st.plan.ganancia={'2026-11-01':100};
  assert.equal(resumenCiclo(st,'2026-12-01').cobro,0);
  sellarPacto(st,{total:5000,ahorro:0,cobro:'2027-01-01',frecuencia:'ventas'},'2026-12-01');
  assert.deepEqual(st.plan.entradas,[]);assert.deepEqual(st.plan.ganancia,{});
});

import {tuPlataAlcanza,proximoPago,ritmoGasto} from '../js/logica/ventas.js';
import {marcarPagado} from '../js/logica/plan.js';

test('tu plata alcanza: días al ritmo del plan, y al tuyo cuando hay gastos',function(){
  var st=vendedor([{id:'a',nombre:'Alquiler',monto:12000,dia:10,cat:'Vivienda'}],21000);
  var pc=planCalc(st),r=tuPlataAlcanza(st,pc,HOY);
  assert.equal(r.resto,9000);assert.equal(r.porDia,300,'9.000 en 30 días');assert.equal(r.dias,30);
  assert.equal(r.pago.nombre,'Alquiler');assert.equal(r.pago.dias,9);assert.equal(r.juntado,12000);assert.equal(r.llega,true);assert.equal(r.estrellas,12);
  ['2026-11-01','2026-11-02','2026-11-03'].forEach(function(f,i){st.gastos.push({id:'g'+i,fecha:f,monto:1000,cat:'Otros'})});
  r=tuPlataAlcanza(st,planCalc(st),'2026-11-03');
  assert.equal(ritmoGasto(st,'2026-11-03'),1000);assert.equal(r.resto,6000);assert.equal(r.dias,6);assert.equal(r.hasta,'2026-11-08');
  assert.equal(r.pago.dias,7);assert.equal(r.llega,false,'6 días no llegan al 10');assert.equal(r.estrellas,10);
});

test('vender suma días',function(){
  var st=vendedor(null,3000); /* 100 por día */
  var a=tuPlataAlcanza(st,planCalc(st),HOY).dias;
  cobreJornal(st,1000,HOY);
  var b=tuPlataAlcanza(st,planCalc(st),HOY).dias;
  assert.equal(st.plan.porDiaBase,100);assert.equal(a,30);assert.equal(b,40,'1.000 a 100 por día son 10 días más');
});

test('el próximo pago: el que no está pagado, aunque caiga en el mes que viene',function(){
  var st=vendedor([{id:'a',nombre:'Alquiler',monto:12000,dia:10,cat:'Vivienda'},{id:'b',nombre:'UTE',monto:2000,dia:20,cat:'Vivienda'}]);
  assert.equal(proximoPago(st,HOY).nombre,'Alquiler');
  marcarPagado(st,'a',true,{monto:12000,fecha:'2026-11-09'});
  assert.equal(proximoPago(st,'2026-11-09').nombre,'UTE');
  marcarPagado(st,'b',true,{monto:2000,fecha:'2026-11-20'});
  var n=proximoPago(st,'2026-11-21');assert.equal(n.nombre,'Alquiler');assert.equal(n.fecha,'2026-12-10');
});

test('si no alcanza para el pago, falta y no se encienden todas',function(){
  var st=vendedor([{id:'a',nombre:'Alquiler',monto:12000,dia:10,cat:'Vivienda'}],20000);
  st.gastos.push({id:'g',fecha:HOY,monto:15000,cat:'Otros'});
  var r=tuPlataAlcanza(st,planCalc(st),HOY);
  assert.equal(r.juntado,5000);assert.equal(r.falta,7000);assert.equal(r.llega,false);assert.ok(r.estrellas<=11);
});

import {resumenIngresos,quitarEntrada,deshacerQuitarEntrada} from '../js/logica/ventas.js';
import {nombrarCapitulos,CAPITULOS,nombreDePagina} from '../js/logica/capitulos.js';
test('(2.24) Ingresos: semana a semana, promedio, mejor semana y lo guardado solo',function(){
  var st=defaults(HOY);sellarPacto(st,{total:2000,ahorro:0,cobro:'2026-11-15',cobroCfg:{frecuencia:'jornal'},pctCobro:10},HOY);
  cobreJornal(st,1000,'2026-11-02');cobreJornal(st,3000,'2026-11-09');cobreJornal(st,500,'2026-11-09');
  var r=resumenIngresos(st,planCalc(st),'2026-11-09');
  assert.deepEqual(r.semanas.map(function(x){return x.entro}),[1000,3500]);
  assert.equal(r.total,4500);assert.equal(r.veces,3);assert.equal(r.promedio,2250);assert.equal(r.mejor.i,1);assert.equal(r.guardadoSolo,450);
  assert.equal(r.entradas[0].fecha,'2026-11-09');
});
test('(2.24) borrar una entrada saca la plata y lo guardado de ella; Deshacer la trae',function(){
  var st=defaults(HOY);sellarPacto(st,{total:2000,ahorro:0,cobro:'2026-11-15',cobroCfg:{frecuencia:'jornal'},pctCobro:10},HOY);
  cobreJornal(st,1000,'2026-11-02');var id=st.plan.entradas[0].id;
  assert.equal(st.plan.monto,3000);assert.equal(st.plan.ahorro,100);
  var u=quitarEntrada(st,id);assert.equal(st.plan.monto,2000);assert.equal(st.plan.ahorro,0);assert.equal(st.plan.entradas.length,0);
  deshacerQuitarEntrada(st,u);assert.equal(st.plan.monto,3000);assert.equal(st.plan.ahorro,100);assert.equal(st.plan.entradas.length,1);
});
test('(2.24) el capítulo IV se llama Ingresos por jornal o cuando vendo',function(){
  nombrarCapitulos('ventas');assert.equal(nombreDePagina('sueldo'),'Ingresos');
  nombrarCapitulos('mensual');assert.equal(nombreDePagina('sueldo'),'Sueldo');
  assert.equal(CAPITULOS[3].corto,undefined);
});
