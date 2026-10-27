/* Detector de gastos (2.13) con el extracto de ejemplo, que es INVENTADO. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {leerMovimientos,analizarMovimientos} from '../js/logica/bancos.js';
import {detectar,textos,avisoHoy,principales,porDiaDelMes,nivelDia,ritmoContraPlan,anillo} from '../js/logica/detector.js';
import {extractoEjemplo} from '../js/logica/extracto-ejemplo.js';

var HOY='2026-10-27';
function armar(planDia){
  var r=leerMovimientos(extractoEjemplo(),HOY),A=analizarMovimientos(r,{cat:{},hormiga:400});
  return {r:r,A:A,H:detectar(r,A,{planDia:planDia})};
}
function de(H,tipo){return H.filter(function(h){return h.tipo===tipo})}
function money(n){return '$ '+Math.round(n)}

test('el extracto de ejemplo se lee entero', function(){
  var x=armar(900);
  assert.equal(x.r.banco.id,'brou');
  assert.equal(x.r.movs.length,57);
  assert.equal(Math.round(x.A.totG),56570);
  assert.equal(x.A.desde,'2026-09-01');assert.equal(x.A.hasta,'2026-10-26');
});

test('suscripciones: lo que pagás por mes y por año, y la que subió', function(){
  var H=armar(900).H,s=de(H,'subs')[0];
  assert.deepEqual(s.items.map(function(i){return i.nombre}).sort(),['Netflix','Spotify','iCloud']);
  assert.equal(s.mes,690+169+59);
  assert.equal(s.anual,(690+169+59)*12);
  var sub=de(H,'subio');
  assert.equal(sub.length,1);
  assert.equal(sub[0].nombre,'Netflix');assert.equal(sub[0].antes,590);assert.equal(sub[0].ahora,690);assert.equal(sub[0].anual,1200);
});
test('la nafta que se carga cada mes no es una suscripción', function(){
  var s=de(armar(900).H,'subs')[0];
  assert.ok(!s.items.some(function(i){return i.nombre==='Ancap'}));
});

test('compras repetidas, cobro repetido, cuotas, cargos, retiros y el día que se disparó', function(){
  var H=armar(900).H;
  var py=de(H,'repetida').filter(function(h){return h.nombre==='PedidosYa'})[0];
  assert.equal(py.n,9);assert.equal(py.total,9440);
  var d=de(H,'duplicado');
  assert.equal(d.length,1);assert.equal(d[0].nombre,'Tienda Inglesa');assert.equal(d[0].monto,1234);assert.deepEqual(d[0].fechas,['2026-10-18','2026-10-18']);
  var c=de(H,'cuotas')[0];
  assert.equal(c.items[0].nombre,'Mercado Libre');assert.equal(c.items[0].n,3);assert.equal(c.items[0].de,6);assert.equal(c.items[0].falta,4500);
  assert.equal(Math.round(de(H,'cargos')[0].total),366);
  assert.equal(de(H,'retiros')[0].total,4000);
  assert.equal(de(H,'pico')[0].fecha,'2026-10-03');
  assert.equal(de(H,'hormiga')[0].n,24);
});

test('a este ritmo: solo si gastás más por día de lo que da tu plan', function(){
  assert.equal(de(armar(900).H,'ritmo').length,1);
  assert.equal(de(armar(2000).H,'ritmo').length,0);
  assert.equal(de(armar(0).H,'ritmo').length,0);
});

test('se ordenan por plata por mes y los 3 principales no son de una sola vez', function(){
  var H=armar(900).H;
  for(var i=1;i<H.length;i++)assert.ok(H[i-1].mes>=H[i].mes);
  var P=principales(H);
  assert.equal(P.length,3);
  assert.ok(P.every(function(h){return !h.unaVez}));
  assert.equal(P[0].nombre,'PedidosYa','lo evitable va antes que el súper');
  assert.ok(P.every(function(h){return h.tipo!=='ritmo'}),'«a este ritmo» va aparte');
});

test('el aviso de Hoy: uno solo, primero lo urgente, y el que descartaste no vuelve', function(){
  var H=armar(900).H,a=avisoHoy(H,{});
  assert.equal(a.tipo,'duplicado');
  var d={};d[a.id]='2026-10-27';
  var b=avisoHoy(H,d);
  assert.ok(b&&b.id!==a.id&&b.urgente);
  H.forEach(function(h){d[h.id]=1});
  assert.equal(avisoHoy(H,d),null);
});

test('los textos usan el formateador de plata (modo discreto: no se ve ningún monto)', function(){
  var H=armar(900).H,tapa=function(){return '$ •••'};
  H.forEach(function(h){
    var t=textos(h,tapa),todo=t.titulo+t.cifra+t.detalle+t.consejo;
    assert.ok(t.titulo&&t.detalle&&t.consejo,h.tipo);
    assert.ok(!/\d{3}/.test(todo.replace(/2026-\d\d-\d\d/g,'')),h.tipo+': '+todo);
  });
  var conPlata=textos(de(H,'subio')[0],money);
  assert.match(conPlata.detalle,/\$ 590/);
});

test('datos para los dibujos: calendario, ritmo y anillo', function(){
  var x=armar(900),pd=porDiaDelMes(x.A,'2026-10');
  assert.equal(pd['2026-10-03'].t,6800+3900+230);
  assert.equal(pd['2026-10-07'],undefined,'el día del sueldo no hay gastos');
  assert.equal(nivelDia(0,900),0);assert.equal(nivelDia(700,900),1);assert.equal(nivelDia(850,900),2);assert.equal(nivelDia(1000,900),3);
  var rp=ritmoContraPlan(x.A,'2026-10-12','2026-10-26',900);
  assert.equal(rp.length,15);
  assert.equal(rp[0].plan,900);assert.equal(rp[14].plan,900*15);
  assert.ok(rp[14].real>=rp[0].real);
  var an=anillo(x.A.cats,5);
  assert.equal(an.length,6);
  assert.equal(an[5].c,'El resto');
  assert.equal(Math.round(an.reduce(function(t,c){return t+c.pct},0)*1000),1000);
});
