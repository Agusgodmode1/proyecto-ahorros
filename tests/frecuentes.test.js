import {test} from 'node:test';
import assert from 'node:assert/strict';
import {frecuentes} from '../js/logica/frecuentes.js';

test('gastos frecuentes: lo que más repetiste, con el monto más común',function(){
  var g=[
    {fecha:'2026-10-01',monto:50,nota:'Boleto'},{fecha:'2026-10-02',monto:50,nota:'boleto'},{fecha:'2026-10-05',monto:52,nota:'Boleto'},
    {fecha:'2026-10-03',monto:450,nota:'Almuerzo',cat:'Delivery y comida'},{fecha:'2026-10-08',monto:480,nota:'almuerzo',cat:'Delivery y comida'},
    {fecha:'2026-10-04',monto:3000,nota:'Súper'},
    {fecha:'2026-06-01',monto:99,nota:'Viejo'},{fecha:'2026-06-02',monto:99,nota:'Viejo'}
  ];
  var f=frecuentes(g,'2026-10-13');
  assert.deepEqual(f.map(function(x){return x.clave}),['boleto','almuerzo'],'se ordenan por cantidad; uno solo o de hace más de 60 días no cuenta');
  assert.equal(f[0].monto,50,'el monto que más se repite');
  assert.equal(f[0].nota,'Boleto');
  assert.equal(f[1].monto,480,'si no se repite ninguno, el último');
  assert.equal(f[1].cat,'Delivery y comida');
});

test('frecuentes en dólares guardan el monto en dólares',function(){
  var g=[{fecha:'2026-10-01',monto:2000,usd:50,nota:'Steam'},{fecha:'2026-10-09',monto:2050,usd:50,nota:'Steam'}];
  var f=frecuentes(g,'2026-10-13');
  assert.equal(f[0].usd,50);assert.equal(f[0].monto,undefined);
});

test('dólares: el gasto guarda pesos, dólares y la cotización de ese día',async function(){
  var {gastoUSD,actualizarFijosUSD,cotizacion}=await import('../js/logica/monedas.js');
  assert.deepEqual(gastoUSD(12.5,40.2),{monto:502.5,usd:12.5,cotiz:40.2});
  var st={monedas:{cotizacion:41,fecha:'2026-10-13'},fijos:[{id:'n',nombre:'Netflix',monto:400,usd:10,cotiz:40},{id:'u',nombre:'UTE',monto:1800}]};
  assert.equal(cotizacion(st),41);
  assert.equal(actualizarFijosUSD(st,41),1);
  assert.equal(st.fijos[0].monto,410,'los fijos en dólares siguen la cotización nueva');
  assert.equal(st.fijos[1].monto,1800,'los fijos en pesos no cambian');
});
