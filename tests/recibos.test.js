import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMonto,montosDe,renglones,leerRecibo,aprenderPlantilla,liqReal,compararRecibo,sensibilidadDolar,reciboDe} from '../js/logica/recibos.js';
import {ejemplo,defaults,migrar,VERSION_ESTADO} from '../js/estado.js';
import {liq} from '../js/logica/sueldo.js';
import {aguinaldo} from '../js/logica/aguinaldo.js';

/* Recibo inventado (empresa, RUT y números de mentira) */
var RECIBO=[
  'EMPRESA DE PRUEBA S.A.          RUT: 21.999.888.0011',
  'Recibo de sueldo - Octubre 2026',
  'Sueldo básico                      45.000,00',
  'Horas extras comunes      2,50       937,50',
  'Descanso trabajado        17,00     3.187,50',
  'Total haberes                     50.718,75',
  'Aporte jubilatorio  15%            7.607,81',
  'FONASA  4,5%                       2.282,34',
  'FRL 0,1%                              50,72',
  'IRPF                                   0,00',
  'Total descuentos                   9.940,87',
  'Líquido a cobrar                  40.777,88'
];
function cerca(a,b,m){assert.ok(Math.abs(a-b)<0.01,(m||'')+': '+a+' vs '+b)}

test('montos con formato uruguayo y con formato inglés',function(){
  assert.equal(parseMonto('47.954,63'),47954.63);
  assert.equal(parseMonto('47,954.63'),47954.63);
  assert.equal(parseMonto('$ 1.234'),1234);
  assert.equal(parseMonto('937,50'),937.5);
  assert.equal(parseMonto('1,234,567.8'),1234567.8);
  assert.equal(parseMonto('(150,00)'),-150);
  assert.equal(parseMonto('hola'),null);
  assert.deepEqual(montosDe('Horas extras   2,50   937,50'),[2.5,937.5]);
});

test('el texto del PDF se arma en renglones según su posición',function(){
  var items=[{str:'Total haberes',x:40,y:500},{str:'50.718,75',x:400,y:501},{str:'Líquido a cobrar',x:40,y:480},{str:'40.777,88',x:400,y:480},{str:' ',x:10,y:470}];
  assert.deepEqual(renglones(items),['Total haberes  50.718,75','Líquido a cobrar  40.777,88']);
});

test('lee las etiquetas conocidas de un recibo',function(){
  var r=leerRecibo(RECIBO,{});
  assert.equal(r.sinTexto,false);
  assert.equal(r.mes,'2026-10');
  assert.equal(r.empleador,'rut:219998880011');
  var v=function(k){return r.campos[k]&&r.campos[k].valor};
  assert.equal(v('nominal'),45000);assert.equal(v('haberes'),50718.75);
  assert.equal(v('aportes'),7607.81);assert.equal(v('fonasa'),2282.34);assert.equal(v('irpf'),0);
  cerca(v('otros'),50.72,'otros = total descuentos − aportes − FONASA − IRPF');
  assert.equal(v('liquido'),40777.88);
  assert.equal(v('horasCant'),2.5);assert.equal(v('horasMonto'),937.5);
  assert.match(r.campos.liquido.linea,/Líquido a cobrar/,'muestra de qué renglón salió');
});

test('un campo que falta no se inventa',function(){
  var r=leerRecibo(RECIBO.filter(function(l){return !/Líquido/.test(l)}),{});
  assert.equal(r.campos.liquido,undefined);
  assert.ok(r.campos.haberes);
});

test('PDF escaneado (sin texto): se detecta para ofrecer la carga a mano',function(){
  assert.equal(leerRecibo([],{}).sinTexto,true);
  assert.equal(leerRecibo(['  ','12'],{}).sinTexto,true);
});

test('si corregís un campo, se guarda una plantilla del empleador y el mes siguiente se aplica sola',function(){
  var raro=RECIBO.map(function(l){return l.replace('Líquido a cobrar','Importe a depositar en cuenta')});
  var r=leerRecibo(raro,{});
  assert.equal(r.campos.liquido,undefined,'esa etiqueta no la conoce');
  var pl={};
  assert.ok(aprenderPlantilla(pl,r.empleador,'liquido',40777.88,raro));
  assert.equal(pl['rut:219998880011'].liquido,'importe a depositar en cuenta');
  var noviembre=raro.map(function(l){return l.replace('40.777,88','41.100,00').replace('Octubre','Noviembre')});
  var r2=leerRecibo(noviembre,pl);
  assert.equal(r2.campos.liquido.valor,41100);
  assert.equal(r2.mes,'2026-11');
});

test('el recibo guardado pasa a ser lo que cobrás en el plan',function(){
  var s=ejemplo(); /* cobra el 6/11: las horas y el recibo son de octubre */
  var est=liq(s,true);
  assert.equal(liqReal(s).real,undefined,'sin recibo: la estimación de siempre');
  s.recibos=[{id:'r1',mes:'2026-10',moneda:'UYU',haberes:50718.75,liquido:40500}];
  var L=liqReal(s);
  assert.equal(L.real,true);assert.equal(L.liquido,40500);assert.equal(L.N,50718.75);
  cerca(L.estimado.liquido,est.liquido,'la estimación queda para comparar');
  assert.equal(reciboDe(s,'2026-09'),null);
});

test('ingreso en otra moneda: el recibo en dólares se pasa a pesos con su cotización',function(){
  var s=ejemplo();s.recibos=[{id:'r',mes:'2026-10',moneda:'USD',cotiz:40,haberes:1200,liquido:1000}];
  var L=liqReal(s);
  assert.equal(L.liquido,40000);assert.equal(L.N,48000);
  assert.deepEqual(sensibilidadDolar(L),{pct:5,cambio:2000},'si el dólar se mueve 5 %, cambian $ 2.000');
  assert.equal(sensibilidadDolar(liq(ejemplo(),true)),null,'en pesos no aplica');
});

test('comparar con lo calculado: muestra qué renglón explica la diferencia',function(){
  var s=ejemplo(),est=liq(s,true);
  var r={mes:'2026-10',moneda:'UYU',haberes:est.N,aportes:est.mont,fonasa:est.fon,irpf:est.irpf+800,otros:est.frl+est.otros,liquido:est.liquido-800};
  var c=compararRecibo(s,r);
  assert.equal(c.filas.filter(function(f){return f.campo==='irpf'})[0].estado,'revisar');
  assert.equal(c.explica.concepto,'IRPF');
  cerca(c.liquidoDif,-800);
  var igual=compararRecibo(s,{mes:'2026-10',moneda:'UYU',haberes:est.N,liquido:est.liquido});
  assert.ok(igual.filas.every(function(f){return f.estado==='igual'}));assert.equal(igual.explica,null);
});

test('el aguinaldo usa los sueldos reales de los recibos',function(){
  var s=ejemplo();
  var antes=aguinaldo(s,'2026-10-15');
  s.recibos=[{id:'a',mes:'2026-06',moneda:'UYU',haberes:60000,liquido:48000},{id:'b',mes:'2026-07',moneda:'UYU',haberes:60000,liquido:48000}];
  var A=aguinaldo(s,'2026-10-15');
  assert.equal(A.meses.filter(function(m){return m.fuente==='recibo'}).length,2);
  assert.equal(A.estimados,antes.estimados-2,'dos meses menos estimados');
  assert.ok(A.total>antes.total);
});

test('v12 → v13: suma recibos y plantillas vacíos',function(){
  var s=defaults();s.v=12;delete s.recibos;delete s.plantillasRecibo;
  var m=migrar(s);
  assert.equal(m.v,VERSION_ESTADO);assert.deepEqual(m.recibos,[]);assert.deepEqual(m.plantillasRecibo,{});
});
