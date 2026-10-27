/* El pacto del Libro del Ahorro: validaciones, topes, cuentas, sello y migración. Números inventados. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {totalPacto,validarPacto,cuentaPacto,sellarPacto,sugerirCobro,atajosPacto,pasoAhorro,mesCalendario,pactoDesdePlan,DIA_BAJO} from '../js/logica/pacto.js';
import {defaults,ejemplo,migrar,VERSION_ESTADO} from '../js/estado.js';

var HOY='2026-10-26';
function nuevo(){return defaults(HOY)}

test('el total suma los pesos y los dólares a la cotización',function(){
  assert.equal(totalPacto(20000,0,0),20000);
  assert.equal(totalPacto(20000,100,40.5),24050);
  assert.equal(totalPacto('',100,40),4000);
  assert.equal(totalPacto(1000,100,0),1000,'sin cotización los dólares no suman');
  assert.equal(totalPacto(-5,0,0),0);
});

test('el monto inicial tiene que ser mayor que cero',function(){
  var v=validarPacto(nuevo(),{total:0,ahorro:0,cobro:'2026-11-06'},HOY);
  assert.equal(v.ok,false);assert.ok(v.errores.total);
});

test('no se puede ahorrar más que el total',function(){
  var v=validarPacto(nuevo(),{total:10000,ahorro:12000,cobro:'2026-11-06'},HOY);
  assert.equal(v.ok,false);assert.ok(v.errores.ahorro);
  assert.equal(validarPacto(nuevo(),{total:10000,ahorro:10000,cobro:'2026-11-06'},HOY).errores.ahorro,undefined,'todo, sí');
});

test('con fijos, el ahorro no pasa de total − fijos',function(){
  var st=nuevo();st.fijos.push({id:'f',nombre:'Alquiler',monto:8000,dia:1,cat:'Vivienda'});
  var v=validarPacto(st,{total:20000,ahorro:15000,cobro:'2026-11-06'},HOY);
  assert.equal(v.errores.ahorro,'fijos');
  assert.equal(v.cuenta.maxAhorro,12000);
});

test('la fecha de cobro tiene que ser futura y válida',function(){
  var st=nuevo();
  assert.ok(validarPacto(st,{total:1000,ahorro:0,cobro:HOY},HOY).errores.cobro,'hoy no');
  assert.ok(validarPacto(st,{total:1000,ahorro:0,cobro:'2026-10-01'},HOY).errores.cobro,'pasada no');
  assert.ok(validarPacto(st,{total:1000,ahorro:0,cobro:'2026-02-30'},HOY).errores.cobro,'inexistente no');
  assert.ok(validarPacto(st,{total:1000,ahorro:0,cobro:''},HOY).errores.cobro);
  assert.equal(validarPacto(st,{total:1000,ahorro:0,cobro:'2026-10-27'},HOY).errores.cobro,undefined,'mañana sí');
});

test('si queda poco por día avisa, pero no bloquea',function(){
  var v=validarPacto(nuevo(),{total:3000,ahorro:1000,cobro:'2026-11-25'},HOY);
  assert.equal(v.ok,true);
  assert.ok(v.cuenta.porDia<DIA_BAJO);
  assert.ok(v.avisos.indexOf('bajo')>=0);
  var w=validarPacto(nuevo(),{total:30000,ahorro:3000,cobro:'2026-11-25'},HOY);
  assert.deepEqual(w.avisos,[]);
});

test('ahorrar cero avisa con cariño, sin bloquear',function(){
  var v=validarPacto(nuevo(),{total:30000,ahorro:0,cobro:'2026-11-25'},HOY);
  assert.equal(v.ok,true);assert.ok(v.avisos.indexOf('cero')>=0);
});

test('la cuenta: te quedan $X para gastar, ≈ $Y por día',function(){
  var c=cuentaPacto(nuevo(),{total:30000,ahorro:6000,cobro:'2026-11-25'},HOY);
  assert.equal(c.gastar,24000);
  assert.equal(c.dias,30);
  assert.equal(c.porDia,800);
  assert.equal(c.pct,0.2);
});

test('la cuenta descuenta los fijos que vencen antes de cobrar',function(){
  var st=nuevo();
  st.fijos.push({id:'a',nombre:'Celular',monto:1000,dia:5,cat:'Servicios'});        /* 5/11: entra */
  st.fijos.push({id:'b',nombre:'Tarjeta',monto:9000,dia:10,cat:'Otros',tarjeta:true}); /* pago de tarjeta: no cuenta */
  var c=cuentaPacto(st,{total:30000,ahorro:5000,cobro:'2026-11-25'},HOY);
  assert.equal(c.fijos,1000);assert.equal(c.gastar,24000);
});

test('sin fecha válida, la cuenta usa el cobro sugerido',function(){
  var c=cuentaPacto(nuevo(),{total:10000,ahorro:0,cobro:''},HOY);
  assert.equal(c.cobro,sugerirCobro(nuevo(),HOY).fecha);
});

test('sugiere el 5.º día hábil contando solo los feriados no laborables',function(){
  /* Noviembre 2026: el 2/11 (Difuntos) es laborable, cuenta como hábil → 2,3,4,5,6 → viernes 6 */
  var s=sugerirCobro(nuevo(),HOY);
  assert.equal(s.fecha,'2026-11-06');assert.equal(s.perfil,false);
  var st=nuevo();st.perfil.hecho=true;st.perfil.cobro={tipo:'fijo',dia:15,laborableHabil:true};
  assert.deepEqual(sugerirCobro(st,HOY),{fecha:'2026-11-15',perfil:true,tipo:'fijo',frecuencia:'mensual'});
});

test('sellar pasa los datos al plan, arranca hoy y anota el sello',function(){
  var st=nuevo();
  var v=sellarPacto(st,{total:24050,usd:100,cotiz:40.5,ahorro:5000,cobro:'2026-11-06'},HOY);
  assert.equal(v.ok,true);
  assert.equal(st.plan.monto,24050);assert.equal(st.plan.ahorro,5000);assert.equal(st.plan.modo,'monto');
  assert.equal(st.plan.inicio,HOY);assert.equal(st.plan.cobro,'2026-11-06');
  assert.deepEqual(st.pacto,{sellado:HOY,numero:1,usd:100,apartado:[],pct:0.208});
  assert.equal(st.monedas.cotizacion,40.5);
});

test('un pacto inválido no toca nada',function(){
  var st=nuevo(),antes=JSON.stringify(st);
  var v=sellarPacto(st,{total:1000,ahorro:5000,cobro:'2026-11-06'},HOY);
  assert.equal(v.ok,false);assert.equal(JSON.stringify(st),antes);
});

test('un segundo pacto suma al número',function(){
  var st=nuevo();
  sellarPacto(st,{total:1000,ahorro:100,cobro:'2026-11-06'},HOY);
  sellarPacto(st,{total:2000,ahorro:100,cobro:'2026-12-07'},'2026-11-06');
  assert.equal(st.pacto.numero,2);assert.equal(st.pacto.sellado,'2026-11-06');
});

test('atajos y paso del deslizador',function(){
  assert.deepEqual(atajosPacto(30000).map(function(a){return a.monto}),[3000,6000,9000]);
  assert.deepEqual(atajosPacto(0),[]);
  assert.equal(pasoAhorro(500),10);assert.equal(pasoAhorro(5000),50);assert.equal(pasoAhorro(50000),100);
});

test('calendario del mes: semanas de lunes a domingo y días pasados',function(){
  var c=mesCalendario(2026,10,HOY); /* noviembre 2026 empieza domingo */
  assert.equal(c.semanas[0].filter(function(x){return x===null}).length,6);
  assert.equal(c.semanas[0][6].fecha,'2026-11-01');
  assert.ok(c.semanas.every(function(s){return s.length===7}));
  var oct=mesCalendario(2026,9,HOY),dias=[].concat.apply([],oct.semanas).filter(Boolean);
  assert.equal(dias.find(function(d){return d.fecha===HOY}).hoy,true);
  assert.equal(dias.find(function(d){return d.fecha===HOY}).pasado,true,'hoy no se puede elegir');
  assert.equal(dias.find(function(d){return d.fecha==='2026-10-27'}).pasado,false);
  var dic=[].concat.apply([],mesCalendario(2026,11,HOY).semanas).filter(Boolean);
  assert.equal(dic.find(function(d){return d.fecha==='2026-12-25'}).feriado,true);
  var nov=[].concat.apply([],c.semanas).filter(Boolean);
  assert.equal(nov.find(function(d){return d.fecha==='2026-11-02'}).feriado,false,'los laborables son días comunes');
  assert.equal(mesCalendario(2026,12,HOY).y,2027,'mes 12 = enero del año siguiente');
});

test('migración: quien ya usaba la app tiene su pacto sellado y no ve el prólogo',function(){
  var v13={v:13,plan:{monto:30000,modo:'monto',ahorro:6000,pct:30,inicio:'2026-10-07',cobro:'2026-11-06'},
    gastos:[{id:'g',fecha:'2026-10-10',monto:500,nota:'Súper'}],perfil:{nombre:'Ana',hecho:true},fijos:[],hist:[]};
  var s=migrar(v13);
  assert.equal(s.v,VERSION_ESTADO);
  assert.deepEqual(s.pacto,{sellado:'2026-10-07',numero:1,usd:0,apartado:[]});
  assert.equal(s.plan.monto,30000,'el plan no cambia');
  assert.equal(s.plan.ahorro,6000);assert.equal(s.plan.cobro,'2026-11-06');
  assert.equal(s.gastos.length,1,'no se pierde ningún gasto');
});

test('migración: un estado ya en v14 sin sellar sigue sin sellar',function(){
  var d=defaults(HOY);
  assert.equal(migrar(d).pacto.sellado,null);
  var e=ejemplo(HOY);assert.ok(e.pacto.sellado,'el ejemplo ya viene sellado');
  assert.equal(pactoDesdePlan({plan:{}},HOY).sellado,HOY);
});
