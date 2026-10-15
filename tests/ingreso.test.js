import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,ejemplo,migrar,VERSION_ESTADO} from '../js/estado.js';
import {liq,ingresoDe,reglasHoras,mins} from '../js/logica/sueldo.js';
import {planCalc,proximo} from '../js/logica/plan.js';

/* Números inventados. Cobro el 9/11/2026: las horas de octubre se cobran ese día. */
function persona(tipo,moneda){
  var s=defaults('2026-10-13');
  s.perfil.hecho=true;s.perfil.ingreso={tipo:tipo,moneda:moneda||'UYU'};
  s.plan.cobro='2026-11-09';
  return s;
}
function cerca(a,b,msg){assert.ok(Math.abs(a-b)<=0.01,(msg||'')+': '+a+' vs '+b)}

test('sueldo en Uruguay: el cálculo de siempre (ejemplo)',function(){
  var s=ejemplo();
  assert.equal(ingresoDe(s).tipo,'uy');
  var L=liq(s,true);
  assert.ok(L.mont>0&&L.fon>0&&L.frl>0,'tiene aportes de Uruguay');
  cerca(L.liquido,L.N-L.mont-L.fon-L.frl-L.irpf-L.otros);
});

test('sueldo personalizado: nominal menos mis descuentos, sin reglas de Uruguay',function(){
  var s=persona('personalizado');
  s.sueldo.nominal=50000;
  s.sueldo.descuentos=[{id:'a',nombre:'Aportes',tipo:'pct',valor:10},{id:'b',nombre:'Cuota',tipo:'monto',valor:1500}];
  var L=liq(s,true);
  assert.equal(L.tipo,'personalizado');
  assert.equal(L.mont,0);assert.equal(L.irpf,0);
  cerca(L.N,50000);cerca(L.otros,6500);cerca(L.liquido,43500);
  assert.deepEqual(L.descuentos.map(function(d){return d.nombre+' '+d.monto}),['Aportes 5000','Cuota 1500']);
  /* Con horas extra: el % se aplica sobre todo lo ganado */
  s.horas=[{id:'h',fecha:'2026-10-05',tipo:'sem',min:60}];
  var L2=liq(s,true),hora=50000/240;
  cerca(L2.extraCom,Math.round(hora*2*100)/100,'una hora extra al doble');
  cerca(L2.liquido,L2.N*0.9-1500);
  cerca(liq(s,false).liquido,43500,'sin extras');
});

test('sueldo personalizado sin descuentos: lo que pongo es lo que cobro',function(){
  var s=persona('personalizado');s.sueldo.nominal=38000;
  cerca(liq(s,true).liquido,38000);
});

test('independiente o variable: el ingreso de cada mes se carga a mano',function(){
  var s=persona('variable');
  s.sueldo.nominal=30000; /* lo que espera cobrar en un mes normal */
  var L=liq(s,true);
  assert.equal(L.tipo,'variable');
  assert.equal(L.estimado,true,'todavía no cargó noviembre: usa el esperado');
  cerca(L.liquido,30000);
  s.sueldo.ingresosMes={'2026-11':42500};
  L=liq(s,true);
  assert.equal(L.estimado,false);cerca(L.liquido,42500);
  /* el plan usa ese valor */
  s.plan.monto=20000;s.plan.ahorro=5000;
  cerca(proximo(s,L).libre,42500-5000);
});

test('con ingreso variable no hay horas extra, aunque haya horas cargadas',function(){
  var s=persona('variable');s.sueldo.nominal=30000;
  s.horas=[{id:'h',fecha:'2026-10-05',tipo:'sem',min:120}];
  assert.equal(reglasHoras(s).activo,false);
  assert.equal(mins(s,'sem'),0);
  cerca(liq(s,true).liquido,30000);
  s.perfil.ingreso.tipo='uy';
  assert.equal(reglasHoras(s).activo,true,'el perfil de horas no se pierde si vuelve a sueldo en Uruguay');
});

test('ingreso en dólares: se pasa a pesos con la cotización y guarda el original',function(){
  var s=persona('variable','USD');s.sueldo.nominal=2000;
  s.monedas={cotizacion:40,fecha:'2026-10-13'};
  var L=liq(s,true);
  assert.equal(L.moneda,'USD');
  cerca(L.liquido,80000);cerca(L.orig.liquido,2000);assert.equal(L.cotiz,40);
  var p=persona('personalizado','USD');p.sueldo.nominal=1500;p.sueldo.descuentos=[{id:'a',nombre:'Retención',tipo:'pct',valor:10}];
  p.monedas={cotizacion:40,fecha:'2026-10-13'};
  var P=liq(p,true);
  cerca(P.liquido,1350*40);cerca(P.descuentos[0].monto,150*40);cerca(P.orig.liquido,1350);
});

test('ingreso en dólares sin cotización cargada: avisa',function(){
  var s=persona('variable','USD');s.sueldo.nominal=2000;
  var L=liq(s,true);
  assert.equal(L.sinCotizacion,true);
});

test('sueldo en Uruguay es siempre en pesos',function(){
  var s=persona('uy','USD');
  assert.equal(ingresoDe(s).moneda,'UYU');
});

test('v9 → v10: todos pasan a "sueldo en Uruguay" en pesos, sin cambiar el resultado',function(){
  var s=ejemplo();s.v=9;delete s.perfil.ingreso;delete s.sueldo.descuentos;delete s.sueldo.ingresosMes;
  var antes=liq(s,true).liquido;
  var m=migrar(s);
  assert.equal(m.v,VERSION_ESTADO);
  assert.deepEqual(m.perfil.ingreso,{tipo:'uy',moneda:'UYU'});
  assert.deepEqual(m.sueldo.descuentos,[]);
  assert.deepEqual(m.sueldo.ingresosMes,{});
  cerca(liq(m,true).liquido,antes);
});

test('instalación nueva: vacía y con sueldo en Uruguay por defecto',function(){
  var s=defaults('2026-10-13');
  assert.deepEqual(s.perfil.ingreso,{tipo:'uy',moneda:'UYU'});
  assert.equal(s.gastos.length+s.horas.length+s.fijos.length+s.hist.length+s.metas.length,0);
  assert.equal(s.sueldo.nominal,0);assert.equal(s.perfil.nombre,'');
  assert.equal(planCalc(s).spentAll,0);
});
