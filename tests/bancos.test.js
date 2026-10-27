/* Lector de bancos, tarjetas y billeteras (2.13). Todos los extractos son INVENTADOS: comercios reales,
   montos y fechas de mentira, sin números de cuenta. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {detectarBanco,leerMovimientos,analizarMovimientos,comercio,tablaDe,tablaDeFilas,filasATexto,adivinarColumnas,
  fechaCelda,montoCelda,firma,formatoPara} from '../js/logica/bancos.js';

var HOY='2026-10-27';
function gastos(r){return r.movs.filter(function(m){return m.m<0&&!m.usd}).reduce(function(t,m){return t-m.m},0)}
function ingresos(r){return r.movs.filter(function(m){return m.m>0}).reduce(function(t,m){return t+m.m},0)}
function r2(x){return Math.round(x*100)/100}

var EXTRACTOS={
  brou:['Banco de la República Oriental del Uruguay','Caja de ahorro en pesos · cuenta •••456','Fecha\tDescripción\tDébito\tCrédito\tSaldo',
    '01/10/2026\tCOMPRA POS 4521 TATA SUC 12 MVD\t1.250,00\t\t48.750,00',
    '02/10/2026\tTRANSFERENCIA RECIBIDA SUELDO\t\t40.000,00\t88.750,00',
    '03/10/2026\tRETIRO REDBROU 0042\t2.000,00\t\t86.750,00',
    '05/10/2026\tCOMISION MANTENIMIENTO CUENTA\t150,00\t\t86.600,00'].join('\n'),
  itau:['Itaú Uruguay · Estado de cuenta','Cuenta corriente en pesos','Fecha  Concepto  Importe  Saldo',
    '02/10/26  COMPRA PEDIDOSYA*MVD  -890,00  20.110,00',
    '04/10/26  DEB AUT NETFLIX.COM  -590,00  19.520,00',
    '06/10/26  DEPOSITO EN EFECTIVO  1.000,00  20.520,00'].join('\n'),
  santander:['Santander · Movimientos de tu cuenta','Fecha;Descripción;Importe;Saldo',
    '03/10/2026;COMPRA TIENDA INGLESA;-2.340,50;15.000,00',
    '04/10/2026;COMPRA FARMASHOP 23;-480,00;14.520,00',
    '08/10/2026;TRANSF RECIBIDA;3.000,00;17.520,00'].join('\n'),
  scotia:['Scotiabank Uruguay','Fecha Descripción Débitos Créditos Saldo',
    '05/10/2026 COMPRA DISCO 7 1.120,00 9.880,00',
    '07/10/2026 COMPRA ANCAP 2.000,00 7.880,00'].join('\n'),
  hsbc:['HSBC Bank (Uruguay)','2026-10-05 POS NETFLIX.COM 590.00-','2026-10-09 POS RAPPI*MVD 1,250.00-','2026-10-10 TRANSFER CREDIT 5,000.00'].join('\n'),
  oca:['OCA · Estado de cuenta','Fecha de cierre: 20/10/2026',
    '21/09/26  PEDIDOSYA*MVD  1.250,00',
    '25/09/26  SU PAGO GRACIAS  -15.000,00',
    '02/10/26  MERCADOLIBRE CUOTA 02/06  1.500,00',
    '10/10/26  SPOTIFY  169,00'].join('\n'),
  cabal:['Cabal · Resumen de tarjeta','05 oct  TIENDA INGLESA  2.100,00','09 oct  FARMACIA SAN ROQUE  640,00'].join('\n'),
  creditel:['Creditel · Estado de cuenta','10/10/2026  MERCADOLIBRE CUOTA 03/12  990,00','12/10/2026  GEANT  3.200,00'].join('\n'),
  anda:['ANDA · Tarjeta','11/10/2026  DEVOTO  1.870,00','13/10/2026  INTERESES FINANCIACION  320,00'].join('\n'),
  prex:['Prex · Movimientos','Fecha,Descripción,Monto,Moneda','"2026-10-03 14:22","Compra Spotify","-169,00","UYU"','"2026-10-04 09:10","Carga de saldo","2.000,00","UYU"','"2026-10-05 20:01","Compra Steam","-12,99","USD"'].join('\n'),
  midinero:['Midinero · Mis movimientos','Fecha;Movimiento;Débito;Crédito;Saldo','01/10/2026;COMPRA AM PM;350,00;;4.650,00','02/10/2026;CARGA EN REDPAGOS;;1.000,00;5.650,00'].join('\n'),
  mercadopago:['INITIAL_BALANCE;CREDITS;DEBITS;FINAL_BALANCE','1000.00;5000.00;-1350.50;4649.50','',
    'RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE',
    '03-10-2026;Pago Kiosco El Pepe;12345678901;-350.50;650.00',
    '05-10-2026;Transferencia recibida;12345678902;5000.00;5650.00',
    '07-10-2026;Pago PedidosYa;12345678903;-1000.00;4650.00'].join('\n')
};

test('reconoce de dónde viene el extracto por el encabezado', function(){
  var esperado={brou:'brou',itau:'itau',santander:'santander',scotia:'scotia',hsbc:'hsbc',oca:'oca',cabal:'cabal',creditel:'creditel',anda:'anda',prex:'prex',midinero:'midinero',mercadopago:'mercadopago'};
  Object.keys(esperado).forEach(function(k){assert.equal(detectarBanco(EXTRACTOS[k]).id,esperado[k],k)});
  assert.equal(detectarBanco('BBVA · Movimientos\n01/10/2026 COMPRA 100,00').id,'bbva');
  /* una línea de la lista no confunde: «PAGO OCA» desde la cuenta del banco no es un extracto de OCA */
  assert.equal(detectarBanco('09/10/2026 PAGO OCA 5.000,00\n10/10/2026 COMPRA TATA 100,00').id,'generico');
  assert.equal(detectarBanco('Este es un texto cualquiera').id,'generico');
  assert.equal(detectarBanco(EXTRACTOS.oca).tarjeta,true);
  assert.equal(detectarBanco(EXTRACTOS.brou).tarjeta,false);
  assert.equal(detectarBanco('Itaú · Resumen de tarjeta de crédito\nPago mínimo 1.000').tarjeta,true);
  assert.equal(formatoPara(detectarBanco(EXTRACTOS.oca),'auto'),'pos');
  assert.equal(formatoPara(detectarBanco(EXTRACTOS.oca),'neg'),'neg');
});

test('BROU con columnas débito y crédito (planilla con tabuladores)', function(){
  var r=leerMovimientos(EXTRACTOS.brou,HOY);
  assert.equal(r.banco.id,'brou');
  assert.ok(r.tabla&&r.tabla.seguro);
  assert.equal(r.movs.length,4);
  assert.equal(r2(gastos(r)),3400);
  assert.equal(r2(ingresos(r)),40000);
  assert.deepEqual(r.movs.map(function(m){return m.tipo}),[null,'transferencia','retiro','comision']);
  assert.equal(r.nombres.TATA,'Tata');
});

test('Itaú, Scotiabank y HSBC: texto del PDF con importe y saldo', function(){
  var it=leerMovimientos(EXTRACTOS.itau,HOY);
  assert.equal(it.movs.length,3);assert.equal(r2(gastos(it)),1480);assert.equal(r2(ingresos(it)),1000);
  var sc=leerMovimientos(EXTRACTOS.scotia,HOY);
  assert.equal(sc.movs.length,2);assert.equal(r2(gastos(sc)),3120);
  var hs=leerMovimientos(EXTRACTOS.hsbc,HOY);
  assert.equal(hs.movs.length,3);assert.equal(r2(gastos(hs)),1840);assert.equal(r2(ingresos(hs)),5000);
  assert.ok(Object.values(hs.nombres).indexOf('Netflix')>=0);
  assert.ok(Object.values(hs.nombres).indexOf('Rappi')>=0);
});

test('Santander con punto y coma', function(){
  var r=leerMovimientos(EXTRACTOS.santander,HOY);
  assert.ok(r.tabla);
  assert.equal(r.movs.length,3);
  assert.equal(r2(gastos(r)),2820.5);
  assert.equal(r2(ingresos(r)),3000);
});

test('tarjetas: los cargos vienen en positivo y el pago resta', function(){
  var oca=leerMovimientos(EXTRACTOS.oca,HOY);
  assert.equal(oca.movs.length,4);
  assert.equal(r2(gastos(oca)),2919);
  assert.equal(r2(ingresos(oca)),15000);
  var cu=oca.movs.filter(function(m){return m.cuota})[0];
  assert.deepEqual(cu.cuota,{n:2,de:6});
  assert.equal(r2(gastos(leerMovimientos(EXTRACTOS.cabal,HOY))),2740);
  var cr=leerMovimientos(EXTRACTOS.creditel,HOY);
  assert.equal(r2(gastos(cr)),4190);
  assert.equal(cr.movs[0].cuota.de,12);
  var an=leerMovimientos(EXTRACTOS.anda,HOY);
  assert.equal(r2(gastos(an)),2190);
  assert.equal(an.movs[1].tipo,'interes');
  /* si la persona elige «gastos con signo menos», se respeta */
  assert.equal(r2(ingresos(leerMovimientos(EXTRACTOS.cabal,HOY,{formato:'neg'}))),2740);
});

test('billeteras: Prex (CSV con comas y comillas), Midinero y Mercado Pago', function(){
  var p=leerMovimientos(EXTRACTOS.prex,HOY);
  assert.equal(p.movs.length,3);
  assert.equal(p.movs.filter(function(m){return m.usd}).length,1);
  assert.equal(r2(gastos(p)),169);
  assert.equal(r2(ingresos(p)),2000);
  var md=leerMovimientos(EXTRACTOS.midinero,HOY);
  assert.equal(md.movs.length,2);assert.equal(r2(gastos(md)),350);assert.equal(r2(ingresos(md)),1000);
  var mp=leerMovimientos(EXTRACTOS.mercadopago,HOY);
  assert.equal(mp.banco.id,'mercadopago');
  assert.equal(mp.movs.length,3,'el número de referencia no es un importe');
  assert.equal(r2(gastos(mp)),1350.5);
  assert.equal(r2(ingresos(mp)),5000);
  assert.ok(Object.values(mp.nombres).indexOf('PedidosYa')>=0);
});

test('Excel (BBVA): fechas como número de Excel y columna de moneda', function(){
  var filas=[['BBVA Uruguay'],['Fecha','Concepto','Importe','Divisa','Saldo'],[46296,'COMPRA TATA',-1200,'UYU',5000],[46297,'COMPRA AMAZON',-25.5,'USD',5000],[46298,'TRANSFERENCIA RECIBIDA',3000,'UYU',8000]];
  var texto=filasATexto(filas),r=leerMovimientos(texto,HOY);
  assert.equal(r.banco.id,'bbva');
  assert.equal(r.movs.length,3);
  assert.equal(r.movs[0].f,'2026-10-01');
  assert.equal(r.movs.filter(function(m){return m.usd}).length,1);
  assert.equal(r2(gastos(r)),1200);
  var T=tablaDeFilas(filas);assert.equal(T.cab,1);
});

test('planilla sin títulos claros: pregunta y recuerda las columnas por banco', function(){
  var txt=['Prex','Día;Qué;Cuánto;Saldo','01/10/2026;COMPRA TATA;-500,00;1.000,00','02/10/2026;COMPRA DISCO;-300,00;700,00'].join('\n');
  /* «Día» se reconoce como fecha, pero «Qué» y «Cuánto» no: no está seguro */
  var T=tablaDe(txt);assert.ok(T);
  var a=adivinarColumnas(T,HOY);
  assert.equal(a.cols.fecha,0);
  assert.equal(a.seguro,false);
  var cols={};cols.prex={firma:firma(T),cols:{fecha:0,detalle:1,monto:2,debito:-1,credito:-1,saldo:3,moneda:-1}};
  var r=leerMovimientos(txt,HOY,{columnas:cols});
  assert.equal(r.tabla.seguro,true);
  assert.equal(r.movs.length,2);
  assert.equal(r2(gastos(r)),800);
});

test('fechas e importes de una celda', function(){
  assert.equal(fechaCelda('03/10/2026',HOY),'2026-10-03');
  assert.equal(fechaCelda('2026-10-03T10:22:11.000-03:00',HOY),'2026-10-03');
  assert.equal(fechaCelda('03-10-2026',HOY),'2026-10-03');
  assert.equal(fechaCelda(46297,HOY),'2026-10-02');
  assert.equal(fechaCelda('hola',HOY),null);
  assert.equal(montoCelda('1.234,56'),1234.56);
  assert.equal(montoCelda('1,234.56'),1234.56);
  assert.equal(montoCelda('-1234.56'),-1234.56);
  assert.equal(montoCelda('(1.234,56)'),-1234.56);
  assert.equal(montoCelda('$ 1.234'),1234);
  assert.equal(montoCelda('590.00-'),-590);
  assert.equal(montoCelda('03/10/2026'),null);
  assert.equal(montoCelda('COMPRA TATA'),null);
  assert.equal(montoCelda(-25.5),-25.5);
});

test('limpia el nombre del comercio y le pone categoría', function(){
  var c=comercio('POS COMPRA 4521 TATA SUC 12 MVD');
  assert.equal(c.nombre,'Tata');assert.equal(c.cat,'Supermercado');
  assert.equal(comercio('PEDIDOSYA*MVD').nombre,'PedidosYa');
  assert.equal(comercio('DLO*SPOTIFY').sub,true);
  assert.equal(comercio('MERPAGO*KIOSCO EL PEPE').nombre,'Kiosco El Pepe');
  assert.equal(comercio('MERPAGO*KIOSCO EL PEPE').cat,'Kiosco y almacén');
  assert.equal(comercio('COMPRA POS •••123 AM PM 18 DE JULIO').nombre,'AM PM');
  assert.equal(comercio('PANADERIA LA ESPIGA S.A.').nombre,'Panadería La Espiga');
  assert.equal(comercio('RETIRO REDBROU 1234').tipo,'retiro');
  assert.equal(comercio('TRANSF A JUAN PEREZ').nombre,'Transferencia · Juan Perez');
  assert.equal(comercio('COMISION MANTENIMIENTO CUENTA').tipo,'comision');
  /* los cargos del banco, con nombres claros en oraciones */
  assert.equal(comercio('COMISION MANTENIMIENTO CUENTA').nombre,'Mantenimiento de la cuenta');
  assert.equal(comercio('IVA S/COMISION').nombre,'IVA de la comisión');
  assert.equal(comercio('INTERESES FINANCIACION').nombre,'Intereses de la tarjeta');
  assert.equal(comercio('SEGURO DE VIDA TARJETA').nombre,'Seguro de vida');
  assert.equal(comercio('SEGURO DE VIDA TARJETA').tipo,'seguro');
  assert.equal(comercio('COMPRA MERCADOLIBRE CUOTA 02/06').cuota.n,2);
  assert.equal(comercio('NETFLIX 12/10').cuota,null,'una fecha no es una cuota');
});

test('el análisis usa los nombres limpios y lo que corregiste manda', function(){
  var txt=['01/10/2026  POS COMPRA 4521 TATA SUC 12 MVD  -1.000,00','08/10/2026  POS COMPRA 9921 TATA SUC 3 MVD  -500,00','09/10/2026  COMPRA NEGOCIO RARO  -200,00'].join('\n');
  var r=leerMovimientos(txt,HOY),A=analizarMovimientos(r,{cat:{},hormiga:400});
  var tata=A.com.filter(function(c){return c.k==='TATA'})[0];
  assert.equal(tata.n,2,'las dos sucursales son el mismo comercio');
  assert.equal(tata.c,'Supermercado');
  var A2=analizarMovimientos(r,{cat:{TATA:'Otros'},hormiga:400});
  assert.equal(A2.com.filter(function(c){return c.k==='TATA'})[0].c,'Otros');
});
