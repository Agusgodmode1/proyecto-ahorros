/* Lector de recibos, facturas, liquidación completa y precisión (2.12). Todos los documentos son INVENTADOS. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {leer,clasificar,tipoDocumento,deducirHoras,propuesta,confianza,aprenderConcepto,renglonesDeTexto,desglose} from '../js/logica/lector-recibo.js';
import {leerFactura,liqFactura,sinIva,nuevaFactura,revisarCostos,esFactura} from '../js/logica/factura.js';
import {liqCompleta,minutosFeriado} from '../js/logica/liquidacion.js';
import {liq} from '../js/logica/sueldo.js';
import {precision} from '../js/logica/precision.js';
import {defaults} from '../js/estado.js';
import {usarFeriados} from '../js/logica/fechas.js';
import {feriadosActivos} from '../js/logica/feriados.js';

/* Formato 1: en columnas (concepto · cantidad · haberes · descuentos), como sale de un PDF */
var COLUMNAS=renglonesDeTexto(`ACME SERVICIOS S.A.    RUT: 21.123456.0012
RECIBO DE SUELDO - Octubre 2026
Funcionaria: Ana Pérez       Cargo: Atención al público
Concepto                 Cant.     Haberes     Descuentos
Sueldo básico            30        45.000,00
Horas extras comunes     10,00      3.750,00
Feriado trabajado         8         3.750,00
Montepío 15%                                     7.875,00
FONASA 4,5%                                      2.362,50
FRL 0,1%                                            52,50
IRPF                                             1.234,56
Cuota sindical                                     450,00
Total haberes                       52.500,00
Total descuentos                                11.974,56
Líquido a cobrar                    40.525,44`);
/* Formato 2: «concepto ....... importe» */
var PUNTOS=renglonesDeTexto(`RECIBO DE HABERES
Empresa: La Esquina Ltda.
Período: 09/2026
Sueldo mensual ............ $ 36.000,00
Hs. extras 12 h ........... $ 3.600,00
Presentismo ............... $ 1.500,00
Total haberes ............. $ 41.100,00
Aporte jubilatorio ........ $ 6.165,00
FONASA .................... $ 1.233,00
FRL ....................... $ 41,10
Préstamo ANDA ............. $ 2.000,00
Total descuentos .......... $ 9.439,10
Líquido ................... $ 31.660,90`);
/* Formato 3: texto copiado de una foto (todo pegado, sin totales de haberes) */
var FOTO=renglonesDeTexto(`Kiosco El Faro
liquidacion de sueldo agosto 2026
salario base 28000
presentismo 1200
aporte jubilatorio 4380
fonasa 876
liquido 23944`);
/* Formato 4: el recibo dice las horas del mes (divisor 200) */
var CON_HORAS=renglonesDeTexto(`Tienda Norte SRL  R.U.T. 21 777888 0015
Recibo de sueldo noviembre 2026
Horas mensuales 200
Sueldo básico 40.000,00
Horas extra 5 2.000,00
Montepío 6.300,00
FONASA 1.260,00
Líquido 34.440,00`);

test('reconoce el tipo de documento: recibo de sueldo o factura',function(){
  assert.equal(tipoDocumento(COLUMNAS),'recibo');assert.equal(tipoDocumento(PUNTOS),'recibo');assert.equal(tipoDocumento(FOTO),'recibo');
  assert.equal(tipoDocumento(renglonesDeTexto('e-Factura Serie A 123\nRUT Emisor 21 987654 0011\nIVA 22% 4.400,00\nTotal 24.400,00')),'factura');
});

test('formato en columnas: clasifica haberes, descuentos y totales, y la cuenta cierra',function(){
  var L=leer(COLUMNAS,{});
  assert.equal(L.empleador,'rut:211234560012');assert.equal(L.mes,'2026-10');assert.ok(L.cuadra);
  var por=function(id){return L.renglones.filter(function(r){return r.id===id})[0]};
  assert.equal(por('basico').importe,45000);assert.equal(por('basico').clase,'haber');
  assert.equal(por('horasExtra').cantidad,10);assert.equal(por('horasExtra').importe,3750);
  assert.equal(por('feriado').cantidad,8);
  assert.equal(por('bps').clase,'descuento');assert.equal(por('bps').importe,7875);
  assert.equal(por('sindicato').importe,450);
  assert.equal(L.campos.liquido,40525.44);assert.equal(L.campos.otros,502.5,'FRL y sindicato');
  assert.equal(confianza(L),'alta');
});

test('formato con puntos y $: sueldo, horas, presentismo, préstamo',function(){
  var L=leer(PUNTOS,{});
  assert.equal(L.mes,'2026-09');assert.ok(L.cuadra);
  assert.equal(L.campos.nominal,36000);assert.equal(L.campos.horasCant,12);assert.equal(L.campos.horasMonto,3600);
  assert.ok(L.renglones.some(function(r){return r.id==='presentismo'&&r.importe===1500}));
  assert.ok(L.renglones.some(function(r){return r.id==='prestamo'&&r.clase==='descuento'}));
});

test('texto pegado de una foto, sin totales: suma haberes y descuentos y verifica el líquido',function(){
  var L=leer(FOTO,{});
  assert.equal(L.mes,'2026-08');assert.equal(L.totales.haberes,29200);assert.equal(L.totales.descuentos,5256);assert.ok(L.cuadra);
});

test('horas extra: deduce el multiplicador y el divisor; si hay dudas, pregunta con opciones',function(){
  var h=deducirHoras(leer(COLUMNAS,{}),{divisor:240,multSem:2});
  assert.equal(h.valorHora,375);assert.equal(h.divisor,240);assert.equal(h.mult,2);assert.equal(h.hora,187.5);
  assert.equal(h.feriado.mult,2.5,'el feriado se paga ×2,5');
  /* ×2 sobre 240 también puede leerse distinto: si la cuenta da para más de una regla, pregunta */
  var h2=deducirHoras(leer(PUNTOS,{}),{});assert.equal(h2.mult,2);
  /* el recibo dice 200 horas: ese es el divisor, sin dudas */
  var h3=deducirHoras(leer(CON_HORAS,{}),{});assert.equal(h3.divisor,200);assert.equal(h3.mult,2);assert.ok(h3.seguro);
  /* sin cantidad de horas no deduce nada */
  assert.equal(deducirHoras(leer(FOTO,{}),{}),null);
});

test('la propuesta antes de guardar: «Encontré: sueldo, horas extra ×2 sobre…, BPS 15 %, FONASA 4,5 %»',function(){
  var L=leer(COLUMNAS,{}),h=deducirHoras(L,{divisor:240,multSem:2}),m=function(n){return '$'+Math.round(n*100)/100};
  var t=propuesta(L,h,m).map(function(x){return x.texto});
  assert.ok(t.indexOf('sueldo $45000 mensual')>=0);assert.ok(t.some(function(x){return /horas extra ×2 sobre \$187.5/.test(x)}));
  assert.ok(t.indexOf('BPS 15 %')>=0);assert.ok(t.indexOf('FONASA 4,5 %')>=0);assert.ok(t.indexOf('feriados ×2,5')>=0);
});

test('aprende lo que corregís, por empleador',function(){
  var lineas=renglonesDeTexto('Distribuidora Sur\nRecibo de sueldo julio 2026\nSueldo básico 30.000,00\nPartida alimentación 2.000,00\nMontepío 4.500,00\nLíquido 27.500,00');
  var L=leer(lineas,{});assert.ok(!L.renglones.some(function(r){return /alimentacion/.test(r.etiqueta)}),'no lo conocía');
  var pl={};aprenderConcepto(pl,L.empleador,{etiqueta:'partida alimentacion'},'bono');
  var L2=leer(lineas,pl),r=L2.renglones.filter(function(x){return x.etiqueta==='partida alimentacion'})[0];
  assert.equal(r.id,'bono');assert.ok(r.aprendido);assert.ok(L2.cuadra);
});

/* ---------- Facturas ---------- */
var EFACTURA=renglonesDeTexto(`e-Factura   Serie A  Nº 001234
RUT Emisor: 21 987654 0011
Razón social: Diseño Mínimo
Razón social comprador: Panadería La Espiga
Fecha: 15/10/2026
Moneda: UYU
Diseño de logo          1      20.000,00  20.000,00
Subtotal gravado tasa básica           20.000,00
IVA tasa básica 22%                     4.400,00
Total a pagar                          24.400,00`);
var ETICKET=renglonesDeTexto(`e-Ticket  A-5678
RUT: 21.111222.0013
Fecha de emisión: 2026-10-03
Moneda: USD
Consultoría  US$ 500,00
Total US$ 500,00`);

test('lee una e-Factura (neto, IVA, total, RUT y fecha) y un e-Ticket en dólares',function(){
  var f=leerFactura(EFACTURA);
  assert.equal(f.tipo,'e-Factura');assert.equal(f.rut,'219876540011');assert.equal(f.fecha,'2026-10-15');
  assert.equal(f.neto,20000);assert.equal(f.iva,4400);assert.equal(f.total,24400);assert.equal(f.moneda,'UYU');
  assert.equal(f.cliente,'Panadería La Espiga');
  var t=leerFactura(ETICKET);
  assert.equal(t.tipo,'e-Ticket');assert.equal(t.moneda,'USD');assert.equal(t.total,500);assert.equal(t.fecha,'2026-10-03');assert.equal(t.neto,null,'sin el IVA detallado, lo decide el régimen');
});

test('cobro con factura: te queda lo facturado sin IVA menos tus costos; el IVA del régimen general no es tuyo',function(){
  var st=defaults('2026-10-20');st.plan.cobro='2026-11-06';st.perfil.ingreso={tipo:'variable',factura:true,moneda:'UYU'};
  st.monedas={cotizacion:40,fecha:'2026-10-01'};st.sueldo.nominal=50000;
  st.sueldo.factura={regimen:'general',costos:{bps:4000,fonasa:2500,iva:0,contador:1500,otros:0},anio:2026,facturas:[]};
  assert.ok(esFactura(st));
  var L=liqFactura(st,'2026-11');assert.ok(L.estimado);assert.equal(L.liquido,50000-8000);
  st.sueldo.factura.facturas=[nuevaFactura(leerFactura(EFACTURA)),nuevaFactura(Object.assign(leerFactura(ETICKET),{fecha:'2026-11-03'}),40)];
  st.sueldo.factura.facturas[0].fecha='2026-11-15';
  var L2=liqFactura(st,'2026-11');
  assert.equal(L2.estimado,false);assert.equal(Math.round(L2.N),20000+Math.round(500/1.22*40));
  /* IVA mínimo: no cobrás IVA, el total es tuyo */
  st.sueldo.factura.regimen='minimo';assert.equal(sinIva({total:10000,neto:null},'minimo',0),10000);
  assert.equal(liqCompleta(st,true).tipo,'factura','la liquidación completa usa la factura');
  /* en enero pregunta si los costos siguen igual */
  assert.equal(revisarCostos(st,'2027-01-10'),true);assert.equal(revisarCostos(st,'2026-12-10'),false);
});

/* ---------- Feriados ×2,5 (regla nueva, sin cambiar nada si no está) ---------- */
test('sin la regla de feriados, la liquidación completa es idéntica a la de sueldo.js; con ×2,5 suma la diferencia',function(){
  var st=defaults('2026-09-01');st.plan.inicio='2026-09-01';st.plan.cobro='2026-09-07';
  st.sueldo.nominal=48000;st.horas=[{id:'h1',fecha:'2026-08-25',tipo:'fin',min:480},{id:'h2',fecha:'2026-08-29',tipo:'fin',min:300},{id:'h3',fecha:'2026-08-12',tipo:'sem',min:95}];
  usarFeriados(feriadosActivos(st.feriados),{laborableHabil:true,pagoLaborable:'comun'});
  assert.deepEqual(liqCompleta(st,true),liq(st,true));
  assert.equal(minutosFeriado(st),480,'el 25 de agosto es feriado no laborable');
  st.perfil.horas.multFeriado=2.5;
  var L=liqCompleta(st,true),hora=48000/240;
  assert.equal(Math.round(L.feriadoExtra*100)/100,Math.round(8*hora*(2.5-1.5)*100)/100);
  assert.ok(L.N>liq(st,true).N);
});

/* ---------- Precisión ---------- */
test('la precisión sube con lo que cargás y dice qué falta',function(){
  var st=defaults('2026-10-20');st.plan.cobro='2026-11-06';
  var p0=precision(st,{liquido:30000});assert.equal(p0.nombre,'aproximado');assert.match(p0.falta,/sueldo/);
  st.sueldo.nominal=40000;st.perfil.hecho=true;
  var p1=precision(st,{liquido:30000});assert.equal(p1.nombre,'bueno');assert.equal(p1.margen,900);
  st.recibos=[{id:'r',mes:'2026-10',liquido:31000,moneda:'UYU'}];
  var p3=precision(st,{liquido:31000});assert.equal(p3.nombre,'exacto');assert.equal(p3.falta,null);
  st.recibos=[{id:'r',mes:'2026-09',liquido:liq(st,true).liquido,moneda:'UYU'}];
  var p2=precision(st,{liquido:30000});assert.equal(p2.nombre,'muy bueno');assert.match(p2.falta,/octubre/);
});

test('el desglose de cómo te pagan: lo que ganás, lo que te descuentan (con su %) y lo que te queda',function(){
  var L=leer(COLUMNAS,{}),d=desglose(L,{mult:2,hora:187.5});
  assert.deepEqual(d.gana.map(function(g){return g.id}),['basico','horasExtra','feriado']);
  var hx=d.gana[1];assert.equal(hx.cantidad,10);assert.equal(hx.porHora,375);
  var bps=d.descuentos.filter(function(x){return x.id==='bps'})[0];assert.equal(bps.pct,15);
  assert.equal(d.descuentos.filter(function(x){return x.id==='fonasa'})[0].pct,4.5);
  assert.ok(d.descuentos.some(function(x){return x.id==='sindicato'}));
  assert.equal(d.haberes,52500);assert.equal(d.liquido,40525.44);assert.equal(d.cuadra,true);
  assert.equal(d.hora,187.5);assert.equal(d.mult,2);
  var s=gananSuman(d);assert.equal(s,52500,'lo que ganás suma el total de haberes');
  function gananSuman(x){return Math.round(x.gana.reduce(function(t,g){return t+g.monto},0)*100)/100}
});
