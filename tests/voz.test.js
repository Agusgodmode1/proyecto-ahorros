import {test} from 'node:test';
import assert from 'node:assert/strict';
import {interpretar,leerNumero,tokenizar,aprender,categoriaGasto,responder} from '../js/logica/voz.js';

/* Fecha de referencia: martes 13/10/2026 (el lunes 12 es feriado laborable: día común). */
var HOY='2026-10-13';
var FIJOS=[{id:'f1',nombre:'Alquiler',monto:15000,dia:1,cat:'Vivienda'},{id:'f2',nombre:'UTE',monto:1800,dia:15,cat:'Servicios'}];
function v(txt,extra){return interpretar(txt,Object.assign({hoy:HOY,fijos:FIJOS,aprendido:{}},extra||{}))}
function num(txt){return leerNumero(tokenizar(txt),0).v}

/* ---------- Las pruebas pedidas ---------- */
test('"gasté 850 en el súper"',function(){
  var r=v('gasté 850 en el súper');
  assert.equal(r.intencion,'gasto');assert.equal(r.monto,850);assert.equal(r.cat,'Supermercado');assert.equal(r.fecha,'2026-10-13');
  assert.equal(r.nota,'Súper');
});
test('"ayer 450 de pedidos ya"',function(){
  var r=v('ayer 450 de pedidos ya');
  assert.equal(r.intencion,'gasto');assert.equal(r.monto,450);assert.equal(r.cat,'Delivery y comida');assert.equal(r.fecha,'2026-10-12');
  assert.equal(r.nota,'Pedidos Ya');
});
test('"mil doscientos en farmacia el sábado"',function(){
  var r=v('mil doscientos en farmacia el sábado');
  assert.equal(r.intencion,'gasto');assert.equal(r.monto,1200);assert.equal(r.cat,'Salud');assert.equal(r.fecha,'2026-10-10');
});
test('"dos lucas en el kiosco"',function(){
  var r=v('dos lucas en el kiosco');
  assert.equal(r.intencion,'gasto');assert.equal(r.monto,2000);assert.equal(r.cat,'Kiosco y almacén');assert.equal(r.fecha,'2026-10-13');
});
test('"hice 20 minutos extra hoy"',function(){
  var r=v('hice 20 minutos extra hoy');
  assert.equal(r.intencion,'horas');assert.equal(r.tipo,'sem');assert.equal(r.min,20);assert.equal(r.fecha,'2026-10-13');
});
test('"trabajé el sábado 6 horas y media"',function(){
  var r=v('trabajé el sábado 6 horas y media');
  assert.equal(r.intencion,'horas');assert.equal(r.tipo,'fin');assert.equal(r.min,390);assert.equal(r.fecha,'2026-10-10');
});
test('"ayer trabajé el feriado 9 horas 20" avisa que es feriado laborable (día común)',function(){
  var r=v('ayer trabajé el feriado 9 horas 20');
  /* El 12/10 es laborable: se paga como día común y de 9 h 20 de presencia cuentan 20 min de extra */
  assert.equal(r.intencion,'horas');assert.equal(r.tipo,'sem');assert.equal(r.min,20);assert.equal(r.fecha,'2026-10-12');
  assert.match(r.avisos.join(' '),/feriado laborable/);
  assert.ok(r.alternativas.some(function(a){return a.cambios.tipo==='fin'&&a.cambios.min===560}),'se puede cargar como feriado');
  assert.equal(r.feriado,false,'no se paga como feriado');
  assert.match(r.avisos.join(' '),/feriado/);
});
test('"agregá un fijo de alquiler de 15 mil el día 1"',function(){
  var r=v('agregá un fijo de alquiler de 15 mil el día 1');
  assert.equal(r.intencion,'fijo');assert.equal(r.nombre,'Alquiler');assert.equal(r.monto,15000);assert.equal(r.dia,1);assert.equal(r.cat,'Vivienda');
});
test('"pagué el alquiler" marca el fijo que existe',function(){
  var r=v('pagué el alquiler');
  assert.equal(r.intencion,'pagado');assert.equal(r.fijoId,'f1');
  var sin=v('pagué el alquiler',{fijos:[]});
  assert.equal(sin.intencion,'pagado');assert.equal(sin.fijoId,null);assert.ok(sin.avisos.length);
});
test('"cuánto me queda esta semana" es una consulta',function(){
  var r=v('cuánto me queda esta semana');
  assert.equal(r.intencion,'consulta');assert.equal(r.que,'semana');
});

/* ---------- Más ejemplos de la tabla ---------- */
test('otros gastos',function(){
  var r=v('pagué el boleto 50');
  assert.equal(r.intencion,'gasto');assert.equal(r.monto,50);assert.equal(r.cat,'Transporte');assert.equal(r.nota,'Boleto');
  r=v('1.200 en farmacia el sábado');
  assert.equal(r.monto,1200);assert.equal(r.fecha,'2026-10-10');
  r=v('450 de pedidos ya ayer');
  assert.equal(r.monto,450);assert.equal(r.fecha,'2026-10-12');assert.equal(r.cat,'Delivery y comida');
  r=v('cargué nafta 1500 en ancap');
  assert.equal(r.cat,'Transporte');
  r=v('$850 en Tienda Inglesa');
  assert.equal(r.monto,850);assert.equal(r.nota,'Tienda Inglesa');assert.equal(r.cat,'Supermercado');
});
test('fijo con "por mes"',function(){
  var r=v('netflix 450 por mes el 10');
  assert.equal(r.intencion,'fijo');assert.equal(r.nombre,'Netflix');assert.equal(r.monto,450);assert.equal(r.dia,10);assert.equal(r.cat,'Suscripciones');
});
test('"ya pagué UTE"',function(){
  var r=v('ya pagué UTE');
  assert.equal(r.intencion,'pagado');assert.equal(r.fijoId,'f2');
});
test('otras horas',function(){
  var r=v('me quedé media hora');
  assert.equal(r.intencion,'horas');assert.equal(r.min,30);assert.equal(r.tipo,'sem');assert.equal(r.fecha,HOY);
  r=v('hoy trabajé el feriado 9 horas');
  assert.equal(r.tipo,'fin');assert.equal(r.min,540);assert.match(r.avisos.join(' '),/no está en la lista/);
  r=v('trabajé el sábado 6 y media');
  assert.equal(r.min,390);
  r=v('ayer me quedé una hora');
  assert.equal(r.min,60);assert.equal(r.fecha,'2026-10-12');assert.equal(r.tipo,'sem','el 12 es laborable: día común');
  r=v('hice una hora y media extra el jueves');
  assert.equal(r.min,90);assert.equal(r.fecha,'2026-10-08');assert.equal(r.tipo,'sem');
});
test('otras consultas',function(){
  assert.equal(v('cuánto voy a cobrar').que,'cobro');
  assert.equal(v('cuánto llevo gastado').que,'gastado');
  assert.equal(v('cuánto puedo gastar hoy').que,'dia');
  assert.equal(v('cuántos días faltan para cobrar').que,'dias');
});

/* ---------- Montos ---------- */
test('montos en dígitos, palabras y lunfardo',function(){
  assert.equal(num('850'),850);
  assert.equal(num('1.200'),1200);
  assert.equal(num('1200,50'),1200.5);
  assert.equal(num('1.234,56'),1234.56);
  assert.equal(num('ochocientos cincuenta'),850);
  assert.equal(num('mil doscientos'),1200);
  assert.equal(num('dos mil quinientos'),2500);
  assert.equal(num('15 mil'),15000);
  assert.equal(num('una luca'),1000);
  assert.equal(num('media luca'),500);
  assert.equal(num('dos lucas'),2000);
  assert.equal(num('treinta y cinco'),35);
  assert.equal(num('trescientos cuarenta y nueve'),349);
  assert.equal(leerNumero(tokenizar('un fijo'),0),null,'"un" suelto no es un número');
});
test('"pesos" se ignora y los dólares se marcan',function(){
  var r=v('gasté 300 pesos en el kiosco');
  assert.equal(r.monto,300);assert.equal(r.nota,'Kiosco');assert.ok(!r.dolares);
  r=v('gasté 20 dólares en steam');
  assert.ok(r.dolares);assert.equal(r.monto,20);assert.equal(r.cat,'Juegos');assert.match(r.avisos.join(' '),/pesos/);
  r=v('US$ 15 en spotify');
  assert.ok(r.dolares);assert.equal(r.monto,15);
});

/* ---------- Fechas ---------- */
test('fechas: nunca a futuro',function(){
  assert.equal(v('850 en el súper el martes').fecha,HOY,'hoy es martes');
  assert.equal(v('850 en el súper el martes pasado').fecha,'2026-10-06');
  assert.equal(v('850 en el súper el domingo').fecha,'2026-10-11');
  assert.equal(v('850 en el súper el 10').fecha,'2026-10-10');
  assert.equal(v('850 en el súper el 20').fecha,'2026-09-20','el 20 de octubre todavía no llegó');
  assert.equal(v('850 en el súper el 10 de octubre').fecha,'2026-10-10');
  assert.equal(v('850 en el súper el 31 de diciembre').fecha,'2025-12-31');
  assert.equal(v('850 en el súper anteayer').fecha,'2026-10-11');
  assert.equal(v('850 en el súper antes de ayer').fecha,'2026-10-11');
  var r=v('mañana gasto 500 en el súper');
  assert.equal(r.fecha,HOY);assert.ok(r.avisos.length);
});

/* ---------- Ambigüedad y aprendizaje ---------- */
test('si un número puede ser monto o día, muestra la otra lectura',function(){
  var r=v('gasté 850 en el súper 10');
  assert.equal(r.monto,850);
  assert.ok(r.alternativas.some(function(a){return a.cambios.fecha==='2026-10-10'}));
  assert.ok(r.alternativas.some(function(a){return a.cambios.monto===10}));
  r=v('gasté en el súper el 10');
  assert.equal(r.monto,null);assert.equal(r.fecha,'2026-10-10');
  assert.ok(r.alternativas.some(function(a){return a.cambios.monto===10&&a.cambios.fecha===HOY}));
});
test('aprende de las correcciones de categoría',function(){
  assert.equal(categoriaGasto('Feria del barrio',{}),'Supermercado');
  assert.equal(v('gasté 300 en lo de Juan').cat,'Otros');
  var ap=aprender({},'lo de Juan','Delivery y comida');
  assert.equal(v('gasté 300 en lo de Juan',{aprendido:ap}).cat,'Delivery y comida');
  var ap2=aprender({},'gimnasio','Salud');
  assert.equal(v('mil en el gimnasio del centro',{aprendido:ap2}).cat,'Salud','también por palabra suelta');
});
test('si no entiende, lo dice',function(){
  assert.equal(v('hola qué tal').intencion,'nada');
  assert.equal(v('').intencion,'nada');
});

test('respuestas de las consultas',function(){
  var d={semana:{queda:4250,porDia:850,fin:'2026-10-18',gastado:2750,tenias:7000},liquido:41250.5,cobro:'2026-11-09'};
  assert.equal(responder('semana',d),'Esta semana te quedan 4.250 pesos: unos 850 pesos por día hasta el domingo.');
  assert.equal(responder('cobro',d),'Vas a cobrar unos 41.251 pesos el lunes 9 de noviembre.');
  assert.match(responder('semana',{semana:{queda:-300,porDia:0,fin:'2026-10-18'}}),/te pasaste por 300 pesos/);
});
