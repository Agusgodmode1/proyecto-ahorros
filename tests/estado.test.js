import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planCalc} from '../js/logica/plan.js';
import {disponible} from '../js/logica/saldo.js';
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
  assert.equal(resumenDatos(st),'12 gastos, 10 registros de horas, 3 fijos, 0 meses cerrados, 0 logros, un extracto pegado');
  st.extracto.texto='';
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
test('v16 → v17: el extracto queda igual y suma dónde recordar columnas y avisos vistos',function(){
  var txt='09/10/2026  COMPRA POS TATA  -1.250,00';
  var m=migrar({v:16,extracto:{texto:txt,formato:'pos',hormiga:300,cat:{TATA:'Supermercado'}},plan:{monto:1,inicio:'2026-10-01',cobro:'2026-11-06'},pacto:{sellado:'2026-10-01',numero:1}});
  assert.equal(m.v,VERSION_ESTADO);
  assert.equal(m.extracto.texto,txt);
  assert.equal(m.extracto.formato,'pos');assert.equal(m.extracto.hormiga,300);
  assert.deepEqual(m.extracto.cat,{TATA:'Supermercado'});
  assert.deepEqual(m.extracto.columnas,{});assert.deepEqual(m.extracto.descartadas,{});
  var g=migrar({v:16,extracto:{texto:'',columnas:'roto',descartadas:null}});
  assert.deepEqual(g.extracto.columnas,{});assert.deepEqual(g.extracto.descartadas,{});
  assert.deepEqual(defaults().extracto.columnas,{});
  assert.ok(ejemplo('2026-10-27').extracto.texto.indexOf('ejemplo inventado')>0,'«Solo mirar» trae un extracto de ejemplo');
});
test('v17 → v18: suma los gastos que se repiten solos, sin tocar nada más',function(){
  var g=[{id:'g1',fecha:'2026-10-20',monto:50,nota:'Boleto'}];
  var m=migrar({v:17,gastos:g,plan:{monto:1,inicio:'2026-10-01',cobro:'2026-11-06'},pacto:{sellado:'2026-10-01',numero:1}});
  assert.equal(m.v,VERSION_ESTADO);
  assert.deepEqual(m.gastos,g);
  assert.deepEqual(m.repetidos,[]);
  assert.deepEqual(migrar({v:17,repetidos:'roto'}).repetidos,[]);
  assert.deepEqual(defaults().repetidos,[]);
  /* (2.30) se dejaron de repetir solos: lo guardado se conserva tal cual y el ejemplo trae el boleto de hoy */
  var r=[{id:'r1',nota:'Boleto',monto:50,cat:'Transporte',cada:'dia',desde:'2026-10-01',ultimo:'2026-10-20',pausa:false}];
  assert.deepEqual(migrar({v:22,repetidos:r}).repetidos,r);
  var e=ejemplo('2026-10-27');
  assert.deepEqual(e.repetidos,[]);
  assert.deepEqual(e.gastos.map(function(x){return [x.fecha,x.monto,x.nota]}),[['2026-10-27',50,'Boleto']]);
});

test('v21: ingresos fijos y respondidos, sin cambiar nada de lo que había',function(){
  var d=defaults('2026-10-26');d.v=20;delete d.ingresosFijos;delete d.plan.vistos;d.plan.monto=20000;
  var s=migrar(d);
  assert.ok(VERSION_ESTADO>=21);
  assert.deepEqual(s.ingresosFijos,[]);assert.deepEqual(s.plan.vistos,[]);assert.equal(s.plan.monto,20000);
  d.ingresosFijos=[{id:'a',nombre:' Ayuda ',monto:'5000',dia:40},{monto:0}];
  assert.deepEqual(migrar(d).ingresosFijos,[{id:'a',nombre:'Ayuda',monto:5000,dia:31}]);
});

test('v23: quien cobraba cada 15 días, cada semana, por jornal o cuando vendía pasa a mensual sin perder nada',function(){
  var cfgs=[{frecuencia:'quincenal',dias:[1,15]},{frecuencia:'semanal',dow:5},{frecuencia:'jornal',horizonte:7,tipo:undefined},{frecuencia:'ventas',diaV:1}];
  cfgs.forEach(function(cfg){
    var d=defaults('2026-10-26');d.v=22;
    d.perfil.cobro=Object.assign({tipo:'habil5',laborableHabil:true},cfg);
    d.plan=Object.assign(d.plan,{monto:18000,ahorro:1500,inicio:'2026-10-20',cobro:'2026-11-03',porDiaBase:640,entradas:[{id:'e1',fecha:'2026-10-22',monto:2500,nota:'pedido'}],ganancia:{'2026-10-20':300}});
    d.pacto=Object.assign(d.pacto,{sellado:'2026-10-20',numero:3,pct:0.1,apartado:[{id:'res-fijos',tipo:'reserva',monto:4600,nota:'para los fijos'}]});
    d.gastos=[{id:'g1',fecha:'2026-10-21',monto:850,nota:'Súper',cat:'Supermercado'}];
    d.hist=[{k:'2026-09',meta:1000,ahorrado:1200}];
    var antes=disponible(d,planCalc(d)),m=migrar(d);
    assert.equal(m.v,VERSION_ESTADO);
    assert.equal(m.perfil.cobro.frecuencia,undefined,cfg.frecuencia);
    ['dias','dow','horizonte','diaV'].forEach(function(k){assert.equal(m.perfil.cobro[k],undefined)});
    assert.equal(m.perfil.cobro.tipo,'habil5');
    /* su plata, su pacto (hasta su fecha), sus gastos, su historial y lo que entró: igual */
    assert.equal(m.plan.monto,18000);assert.equal(m.plan.ahorro,1500);assert.equal(m.plan.inicio,'2026-10-20');assert.equal(m.plan.cobro,'2026-11-03');
    assert.equal(disponible(m,planCalc(m)),antes);
    assert.deepEqual(m.gastos,d.gastos);assert.deepEqual(m.hist,d.hist);
    assert.deepEqual(m.plan.entradas,d.plan.entradas);assert.deepEqual(m.plan.ganancia,d.plan.ganancia);
    assert.equal(m.pacto.sellado,'2026-10-20');assert.equal(m.pacto.numero,3);
    assert.equal(m.pacto.apartado[0].monto,4600,'lo apartado para los fijos sigue apartado');
    assert.equal(m.pacto.pct,undefined);assert.equal(m.plan.porDiaBase,undefined);
  });
  /* quien ya cobraba por mes no cambia nada */
  var d2=defaults('2026-10-26');d2.v=22;d2.perfil.cobro={tipo:'fijo',dia:10,laborableHabil:true,frecuencia:'mensual'};
  assert.deepEqual(migrar(d2).perfil.cobro,{tipo:'fijo',dia:10,laborableHabil:true});
});
test('v24/v25 → v26: el reparto arranca parejo (sin colchón) y el sobre de compras se conserva; nada más cambia',function(){
  var d={v:24,plan:{monto:20000,modo:'monto',ahorro:5000,inicio:'2026-10-01',cobro:'2026-11-06'},gastos:[{id:'a',fecha:'2026-10-02',monto:300,nota:'boleto',cat:'Transporte'}],pacto:{sellado:'2026-10-01',numero:2}};
  var m=migrar(d);
  assert.equal(m.v,VERSION_ESTADO);
  assert.equal(m.plan.reparto,'parejo');assert.equal(m.plan.compras,0);assert.equal(m.plan.colchon,undefined);
  assert.equal(m.plan.monto,20000);assert.equal(m.plan.ahorro,5000);
  assert.deepEqual(m.gastos,d.gastos);
  var k=migrar({v:25,plan:{monto:1,inicio:'2026-10-01',cobro:'2026-11-06',colchon:10,compras:'2500'}});
  assert.equal(k.plan.reparto,'parejo');assert.equal(k.plan.colchon,undefined);assert.equal(k.plan.compras,2500);
  assert.equal(migrar({v:26,plan:{reparto:'recomendado'}}).plan.reparto,'recomendado');
  assert.equal(defaults().plan.reparto,'parejo');
});
