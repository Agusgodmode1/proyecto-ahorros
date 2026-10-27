import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,ejemplo,migrar,leerRespaldo,armarRespaldo,resumenDatos,diasSinRespaldo,VERSION_ESTADO,agregarCopia,necesitaMigrar} from '../js/estado.js';

test('los datos de ejemplo ya están en la versión actual',function(){
  var d=defaults();
  assert.equal(d.v,VERSION_ESTADO);
  assert.deepEqual(migrar(d),d);
});

test('migra un estado v3 del archivo HTML: suma voz y meta y conserva todo',function(){
  var v3={v:3,plan:{monto:30000,modo:'pct',ahorro:0,pct:20,inicio:'2026-09-07',cobro:'2026-10-07'},gastos:[{id:'g',fecha:'2026-09-10',monto:500,nota:'súper'}],
    sueldo:{nominal:50000},horas:[{id:'h1',fecha:'2026-09-03',tipo:'sem',min:20}],fijos:[{id:'f',nombre:'UTE',monto:1500,dia:10,cat:'Servicios'}],logros:{'meta-1':'2026-09-07'}};
  var s=migrar(v3);
  assert.equal(s.v,VERSION_ESTADO);
  assert.equal(s.plan.pct,20);
  assert.equal(s.sueldo.nominal,50000);
  assert.equal(s.sueldo.bpc,6864,'completa los campos que faltan');
  assert.deepEqual(s.voz,{cats:{}});
  assert.equal(s.meta.ultimoExport,null);
  assert.equal(s.horas.length,11,'suma una vez las horas del Excel que faltaban');
});

test('en v4 una hora del Excel borrada no vuelve a aparecer',function(){
  var s=ejemplo();s.v=4;s.ejemplo=false;s.horas=s.horas.filter(function(h){return h.id!=='x1'});
  assert.equal(migrar(s).horas.length,9);
});

test('estado viejo (v1) vuelve al sueldo y las horas de ejemplo',function(){
  var s=migrar({v:1,sueldo:{nominal:1},horas:[]});
  assert.equal(s.sueldo.nominal,45000);
  assert.equal(s.horas.length,10);
});

test('leer respaldo con el formato de "Copiar mis datos"',function(){
  var st=defaults();st.gastos.push({id:'a',fecha:'2026-10-13',monto:850,nota:'Súper'});
  var txt=JSON.stringify(armarRespaldo(st,new Date('2026-10-13T12:00:00Z')));
  var r=leerRespaldo(txt);
  assert.ok(r.ok);
  assert.equal(r.exportado,'2026-10-13T12:00:00.000Z');
  assert.equal(r.estado.gastos[0].monto,850);
});

test('leer respaldo con el objeto de estado directo',function(){
  var r=leerRespaldo(JSON.stringify({plan:{monto:1000},gastos:[]}));
  assert.ok(r.ok);
  assert.equal(r.estado.plan.monto,1000);
});

test('rechaza textos que no son respaldos',function(){
  assert.equal(leerRespaldo('hola').ok,false);
  assert.equal(leerRespaldo('[1,2]').ok,false);
  assert.equal(leerRespaldo('{"app":"otra","datos":{"plan":{}}}').ok,false);
  assert.equal(leerRespaldo('{"x":1}').ok,false);
});

test('resumen antes de importar',function(){
  var st=ejemplo();
  st.gastos=new Array(12).fill(0).map(function(_,i){return {id:'g'+i,fecha:'2026-10-13',monto:1}});
  st.fijos=[{id:'a'},{id:'b'},{id:'c'}];
  assert.equal(resumenDatos(st),'12 gastos, 10 registros de horas, 3 fijos, 0 meses cerrados, 0 logros');
});

test('días sin respaldo',function(){
  var st=defaults();
  assert.equal(diasSinRespaldo(st,'2026-10-13'),null);
  st.meta.creado='2026-10-01';
  assert.equal(diasSinRespaldo(st,'2026-10-16'),15);
  st.meta.ultimoExport='2026-10-10';
  assert.equal(diasSinRespaldo(st,'2026-10-16'),6);
});

test('copias automáticas: se guarda la más nueva primero y quedan 3',function(){
  var l=[],d=defaults();
  for(var i=1;i<=4;i++){d.plan.monto=i*1000;l=agregarCopia(l,d,'copia '+i,new Date(2026,9,13,10,i))}
  assert.equal(l.length,3);
  assert.equal(l[0].motivo,'copia 4');
  assert.equal(l[0].datos.plan.monto,4000);
  assert.equal(l[2].motivo,'copia 2');
  d.plan.monto=1;assert.equal(l[0].datos.plan.monto,4000,'la copia no cambia si después cambian los datos');
});

test('solo se guarda copia antes de migrar si los datos son de una versión anterior',function(){
  assert.equal(necesitaMigrar(null),false);
  assert.equal(necesitaMigrar(defaults()),false);
  assert.equal(necesitaMigrar({v:6,plan:{}}),true);
  assert.equal(necesitaMigrar({plan:{}}),true,'sin versión = archivo viejo');
});

test('v6 → v7: suma las opciones de feriados (solo cuentan los no laborables)',function(){
  var s=defaults();s.v=6;delete s.perfil.cobro.laborableHabil;delete s.perfil.horas.feriadoLaborable;
  s.perfil.nombre='Agus';s.perfil.horas.divisor=200;
  var m=migrar(s);
  assert.equal(m.v,VERSION_ESTADO);
  assert.equal(m.perfil.cobro.laborableHabil,true,'los laborables son días hábiles');
  assert.equal(m.perfil.horas.feriadoLaborable,'comun','un laborable trabajado es un día común');
  assert.equal(m.perfil.horas.divisor,200);
  assert.equal(m.perfil.nombre,'Agus');
});

test('v7 → v8: suma metas, cotización del dólar y días de licencia sin tocar lo demás',function(){
  var s=defaults();s.v=7;delete s.metas;delete s.monedas;delete s.sueldo.diasLicencia;
  s.gastos.push({id:'a',fecha:'2026-10-13',monto:850,nota:'Súper'});
  var m=migrar(s);
  assert.equal(m.v,VERSION_ESTADO);
  assert.deepEqual(m.metas,[]);
  assert.deepEqual(m.monedas,{cotizacion:0,fecha:null});
  assert.equal(m.sueldo.diasLicencia,0);
  assert.equal(m.gastos.length,1);
});

test('v8 → v9: la BPC guardada queda como la de 2026',function(){
  var s=defaults();s.v=8;delete s.sueldo.bpcAnio;s.sueldo.bpc=6864;
  var m=migrar(s);
  assert.equal(m.v,VERSION_ESTADO);
  assert.equal(m.sueldo.bpcAnio,2026);
  assert.equal(migrar(m).sueldo.bpcAnio,2026,'no cambia al volver a abrir');
});

test('v11 → v12: el plan suma mínimo y "lo que sobra" sin cambiar nada de lo anterior',function(){
  var s=defaults();s.v=11;delete s.plan.minimo;delete s.plan.sobrante;delete s.plan.sobranteSemana;s.plan.ahorro=9000;
  var m=migrar(s);
  assert.equal(m.v,VERSION_ESTADO);
  assert.equal(m.plan.minimo,null);assert.equal(m.plan.sobrante,'siguiente');assert.deepEqual(m.plan.sobranteSemana,{});
  assert.equal(m.plan.ahorro,9000);
});

test('v14 → v15: suma los grupos para compartir fijos; los fijos y sus pagos quedan igual («Solo míos»)',function(){
  var d={v:14,plan:{monto:30000,modo:'monto',ahorro:5000,inicio:'2026-10-20',cobro:'2026-11-06'},
    fijos:[{id:'f1',nombre:'Alquiler',monto:18000,dia:1,cat:'Vivienda'}],fijosPagos:{'2026-11-06':{f1:{monto:18000,fecha:'2026-11-01'}}},
    pacto:{sellado:'2026-10-20',numero:3,usd:0}};
  var st=migrar(d);
  assert.equal(st.v,VERSION_ESTADO);
  assert.deepEqual(st.grupos,[]);
  assert.deepEqual(st.fijos,d.fijos);
  assert.deepEqual(st.fijosPagos,d.fijosPagos);
  assert.equal(st.pacto.numero,3);
});

test('v15 → v16: «¿hay horas extra?» queda contestado para quien ya tenía perfil o horas; los demás lo ven una vez',function(){
  var con=migrar({v:15,perfil:{nombre:'Ana',hecho:true,horas:{activo:true}},plan:{monto:1,inicio:'2026-10-01',cobro:'2026-11-06'},pacto:{sellado:'2026-10-01',numero:1}});
  assert.equal(con.perfil.horas.preguntado,true);
  var sin=migrar({v:15,perfil:{nombre:'',hecho:false},plan:{monto:1,inicio:'2026-10-01',cobro:'2026-11-06'},horas:[],pacto:{sellado:'2026-10-01',numero:1}});
  assert.equal(sin.perfil.horas.preguntado,false);
  assert.equal(sin.perfil.horas.divisor,240,'las reglas de siempre no cambian');
  assert.equal(defaults().perfil.horas.preguntado,false);
});
