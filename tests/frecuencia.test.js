/* Cada cuánto cobrás (2.19): semanal, quincenal y por jornal. Números inventados. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {frecDe,cobroFrec,fraccionMes,reglaDesdeFecha,periodoTxt} from '../js/logica/frecuencia.js';
import {cobroDesde,nextCobro,proximo,planCalc} from '../js/logica/plan.js';
import {cuentaPacto,sellarPacto,sugerirCobro,reservaFijos,RESERVA_FIJOS,cobreJornal,deshacerCobre,totalApartado} from '../js/logica/pacto.js';
import {resumenCiclo,cerrarCiclo,sumarCierre} from '../js/logica/ciclo.js';
import {defaults} from '../js/estado.js';

var HOY='2026-10-26'; /* lunes */
function nuevo(){return defaults(HOY)}

test('mensual sigue igual',function(){
  assert.equal(frecDe({}),'mensual');assert.equal(frecDe({frecuencia:'raro'}),'mensual');
  assert.equal(cobroDesde(HOY,{tipo:'habil5'}),cobroDesde(HOY,{tipo:'habil5',frecuencia:'mensual'}));
  assert.equal(nextCobro('2026-11-06',{tipo:'fijo',dia:10}),'2026-12-10');
  assert.equal(fraccionMes({},HOY,'2026-11-26'),1);
});

test('semanal: el próximo día de la semana, siempre después',function(){
  assert.equal(cobroFrec(HOY,{frecuencia:'semanal',dow:5}),'2026-10-30');
  assert.equal(cobroFrec('2026-10-30',{frecuencia:'semanal',dow:5}),'2026-11-06');
  assert.equal(cobroFrec(HOY,{frecuencia:'semanal',dow:1}),'2026-11-02','el mismo día de hoy: la semana que viene');
  assert.equal(nextCobro('2026-10-30',{frecuencia:'semanal',dow:5}),'2026-11-06');
  assert.equal(Math.round(fraccionMes({frecuencia:'semanal'},'2026-10-30','2026-11-06')*1000)/1000,0.23);
});

test('quincenal: dos días del mes, con el último día',function(){
  var c={frecuencia:'quincenal',dias:[15,31]};
  assert.equal(cobroFrec(HOY,c),'2026-10-31');
  assert.equal(cobroFrec('2026-10-31',c),'2026-11-15');
  assert.equal(cobroFrec('2026-11-15',c),'2026-11-30','noviembre tiene 30');
  assert.equal(cobroFrec('2026-02-15',c),'2026-02-28');
  assert.equal(cobroFrec(HOY,{frecuencia:'quincenal'}),'2026-11-01','por defecto el 1 y el 15');
  assert.equal(fraccionMes(c,'2026-10-31','2026-11-15'),0.5);
});

test('jornal: el pacto dura lo que elegiste',function(){
  assert.equal(cobroFrec(HOY,{frecuencia:'jornal',horizonte:7}),'2026-11-02');
  assert.equal(cobroFrec(HOY,{frecuencia:'jornal'}),'2026-11-02','por defecto una semana');
  assert.equal(cobroFrec(HOY,{frecuencia:'jornal',horizonte:14}),'2026-11-09');
});

test('la regla sale del día que tocaste',function(){
  assert.equal(reglaDesdeFecha('semanal','2026-10-30',HOY,{tipo:'habil5'}).dow,5);
  assert.equal(reglaDesdeFecha('jornal','2026-11-09',HOY,{}).horizonte,14);
  assert.deepEqual(reglaDesdeFecha('quincenal','2026-11-01',HOY,{}).dias,[1,15]);
  assert.deepEqual(reglaDesdeFecha('quincenal','2026-11-05',HOY,{}).dias,[5,19]);
  assert.deepEqual(reglaDesdeFecha('quincenal','2026-11-20',HOY,{}).dias,[6,20]);
  assert.deepEqual(reglaDesdeFecha('quincenal','2026-10-31',HOY,{}).dias,[15,31]);
  assert.deepEqual(reglaDesdeFecha('quincenal','2026-11-15',HOY,{frecuencia:'quincenal',dias:[15,31]}).dias,[15,31],'si coincide con lo guardado, no cambia');
  var m=reglaDesdeFecha('mensual','2026-11-06',HOY,{tipo:'fijo',dia:6});assert.equal(m.tipo,'fijo');assert.equal(m.frecuencia,'mensual');
  assert.equal(periodoTxt({frecuencia:'semanal'}).este,'esta semana');
});

test('el libro sugiere el cobro según la frecuencia',function(){
  var st=nuevo();
  assert.equal(sugerirCobro(st,HOY,'semanal').fecha,'2026-11-02','sin saber el día: dentro de una semana');
  assert.equal(sugerirCobro(st,HOY,'quincenal').fecha,'2026-11-01');
  assert.equal(sugerirCobro(st,HOY,'jornal').fecha,'2026-11-02');
  st.perfil.cobro={frecuencia:'semanal',dow:5};
  assert.equal(sugerirCobro(st,HOY).fecha,'2026-10-30','con la regla guardada');
});

test('sellar guarda la frecuencia y la regla',function(){
  var st=nuevo();
  sellarPacto(st,{total:10000,ahorro:500,cobro:'2026-10-30',frecuencia:'semanal'},HOY);
  assert.equal(st.perfil.cobro.frecuencia,'semanal');assert.equal(st.perfil.cobro.dow,5);
  assert.equal(nextCobro(st.plan.cobro,st.perfil.cobro),'2026-11-06');
  assert.equal(st.pacto.pct,0.05);
});

test('semanal con alquiler: cada pacto aparta su parte y el que vence se paga con la reserva',function(){
  var st=nuevo();st.fijos.push({id:'alq',nombre:'Alquiler',monto:20000,dia:5,cat:'Vivienda'});
  /* semana 1 (26/10 → 2/11): el alquiler no vence; aparta ≈ 7/30,4 de 20.000 */
  var c=cuentaPacto(st,{total:30000,ahorro:0,cobro:'2026-11-02',frecuencia:'semanal'},HOY);
  assert.equal(c.fijos,0);assert.equal(c.reserva.parte,4600);assert.equal(c.total,25400);
  sellarPacto(st,{total:30000,ahorro:0,cobro:'2026-11-02',frecuencia:'semanal'},HOY);
  assert.equal(st.plan.monto,25400);
  assert.equal(st.pacto.apartado.filter(function(a){return a.id===RESERVA_FIJOS})[0].monto,4600);
  /* semana 2 (2/11 → 9/11): vence el alquiler; la reserva (4.600) paga una parte */
  var ap=st.pacto.apartado;
  var c2=cuentaPacto(st,{total:30000,ahorro:0,cobro:'2026-11-09',frecuencia:'semanal',apartado:ap},'2026-11-02');
  assert.equal(c2.fijos,20000);assert.equal(c2.reserva.usa,4600);assert.equal(c2.reserva.queda,4600);
  assert.equal(c2.total,30000-4600+4600-4600,'lo libre + lo que sale de la reserva − la parte nueva');
  assert.equal(c2.gastar,c2.total-20000);
});

test('mensual: la reserva de fijos no existe',function(){
  var st=nuevo();st.fijos.push({id:'alq',nombre:'Alquiler',monto:20000,dia:5,cat:'Vivienda'});
  var r=reservaFijos(st,'mensual',[],HOY,'2026-11-06',20000);
  assert.deepEqual(r,{parte:0,usa:0,reserva:0,queda:0});
  sellarPacto(st,{total:30000,ahorro:0,cobro:'2026-11-06'},HOY);
  assert.equal(totalApartado(st),0);assert.equal(st.plan.monto,30000);
});

test('quincenal: la mitad de los fijos por quincena',function(){
  var st=nuevo();st.fijos.push({id:'u',nombre:'UTE',monto:3000,dia:20,cat:'Vivienda'});
  assert.equal(reservaFijos(st,'quincenal',[],HOY,'2026-11-01',0).parte,1500);
});

test('jornal: «Cobré» suma y guarda el mismo porcentaje',function(){
  var st=nuevo();sellarPacto(st,{total:2000,ahorro:200,cobro:'2026-11-02',frecuencia:'jornal'},HOY);
  assert.equal(st.pacto.pct,0.1);
  var u=cobreJornal(st,1500);
  assert.equal(u.guarda,150);assert.equal(st.plan.monto,3500);assert.equal(st.plan.ahorro,350);
  deshacerCobre(st,u);assert.equal(st.plan.monto,2000);assert.equal(st.plan.ahorro,200);
  assert.equal(cobreJornal(st,0),null);
});

test('Cuando cobres: por semana, la parte del sueldo y de los fijos',function(){
  var st=nuevo();st.perfil.cobro={frecuencia:'quincenal',dias:[15,31]};st.plan.cobro='2026-10-31';
  st.fijos.push({id:'u',nombre:'UTE',monto:3000,dia:20,cat:'Vivienda'});st.plan.ahorro=0;
  var nx=proximo(st,{liquido:40000});
  assert.equal(nx.nc,'2026-11-15');assert.equal(nx.liquido,20000);assert.equal(nx.fij,1500);assert.equal(nx.libre,18500);
});

test('cierre: por jornal el cobro estimado es cero; semanal, la parte del mes',function(){
  var st=nuevo();sellarPacto(st,{total:2000,ahorro:0,cobro:'2026-11-02',frecuencia:'jornal'},HOY);
  assert.equal(resumenCiclo(st,'2026-11-02').cobro,0);
});

test('varios pactos en un mes se suman en el historial',function(){
  var r=sumarCierre({k:'2026-10',desde:'2026-10-12',meta:100,ahorrado:150,gastado:900,semanas:1,semanasOk:1,semanasSeq:[true]},{k:'2026-10',desde:'2026-10-05',meta:100,ahorrado:50,gastado:1000,semanas:1,semanasOk:0,semanasSeq:[false]});
  assert.equal(r.meta,200);assert.equal(r.ahorrado,200);assert.equal(r.gastado,1900);assert.equal(r.desde,'2026-10-05');
  assert.deepEqual(r.semanasSeq,[false,true]);assert.equal(r.pactos,2);
  var st=nuevo();sellarPacto(st,{total:5000,ahorro:500,cobro:'2026-10-30',frecuencia:'semanal'},HOY);
  st.hist=[{k:'2026-10',desde:'2026-10-19',hasta:'2026-10-26',meta:500,ahorrado:400,gastado:4000,semanas:1,semanasOk:1}];
  cerrarCiclo(st,'2026-10-30');
  var h=st.hist.filter(function(x){return x.k==='2026-10'});
  assert.equal(h.length,1);assert.equal(h[0].meta,1000);assert.equal(h[0].desde,'2026-10-19');assert.equal(h[0].pactos,2);
});
