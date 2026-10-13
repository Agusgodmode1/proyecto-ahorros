import {test} from 'node:test';
import assert from 'node:assert/strict';
import {liquidar,liq,mins,pagoSem,mesTrabajo} from '../js/logica/sueldo.js';
import {ejemplo} from '../js/estado.js';

/* La liquidación se validó contra recibos reales; esos números no se guardan acá (el repositorio es público).
   Estas pruebas usan sueldos inventados y valores calculados a mano con las reglas de Uruguay:
   15% jubilación, FONASA 3% hasta 2,5 BPC y 4,5% arriba (+1,5% hijos, +2% cónyuge), 0,1% FRL,
   IRPF por franjas de BPC menos el crédito del 14% de los aportes (8% arriba de 15 BPC). BPC $6.864. Tolerancia ±$1. */
var P={rateCom:375,rateEsp:187.5,hijos:0,conyuge:false,otros:0,bpc:6864};
function caso(nominal,extra){return liquidar(Object.assign({nominal:nominal,bono:0,minCom:0,minEsp:0},P,extra||{}))}
function desc(L){return L.mont+L.fon+L.frl+L.irpf+L.otros}
function cerca(a,b,msg){assert.ok(Math.abs(a-b)<=1,msg+': '+a.toFixed(2)+' vs '+b)}

test('solo sueldo, sin extras ni IRPF (45.000)',function(){
  var L=caso(45000);
  cerca(L.N,45000,'nominal');
  cerca(desc(L),45000*0.196,'descuentos: 15% + 4,5% + 0,1%');
  cerca(L.liquido,36180,'líquido');
  assert.equal(L.irpf,0,'no pasa de 7 BPC');
});

test('con IRPF: 80.000 (franjas del 10% y 15%, crédito del 14%)',function(){
  var L=caso(80000);
  /* (68.640 − 48.048) × 10% + (80.000 − 68.640) × 15% = 3.763,20; crédito 14% de 15.680 = 2.195,20 */
  cerca(L.prim,3763.2,'IRPF primario');
  cerca(L.irpf,1568,'IRPF');
  cerca(L.liquido,62752,'líquido');
});

test('arriba de 15 BPC el crédito baja al 8% (120.000)',function(){
  var L=caso(120000);
  cerca(L.prim,11296.8,'IRPF primario');
  cerca(L.irpf,9415.2,'IRPF');
  cerca(L.liquido,87064.8,'líquido');
});

test('FONASA con hijos y cónyuge, y la franja de 2,5 BPC',function(){
  assert.equal(caso(30000,{hijos:1,conyuge:true}).fonRate,0.08,'4,5% + 1,5% + 2%');
  assert.equal(caso(17000).fonRate,0.03,'hasta 2,5 BPC (17.160) es 3%');
});

test('extras: semana redondeada, finde y bono, desde el estado de ejemplo',function(){
  var s=ejemplo();
  assert.equal(mesTrabajo(s),'2026-10');
  assert.equal(mins(s,'sem'),140);
  assert.equal(mins(s,'fin'),1020);
  assert.equal(pagoSem(s),150);
  var L=liq(s,true);
  /* 45.000 + 2,5 h × 375 + 17 h × 187,50 + 17 h × 93,75 de bono = 50.718,75 */
  cerca(L.N,50718.75,'nominal');
  cerca(L.liquido,50718.75*(1-0.196),'líquido');
});

test('redondeo de minutos de semana a la media hora más cercana',function(){
  var s=ejemplo();s.horas=[{id:'a',fecha:'2026-10-05',tipo:'sem',min:265}];
  assert.equal(pagoSem(s),270);
  s.horas[0].min=245;assert.equal(pagoSem(s),240);
  s.perfil.horas.redondeo='no';assert.equal(pagoSem(s),245);
  s.perfil.horas.redondeo='cuarto';assert.equal(pagoSem(s),240);
  s.horas[0].min=263;assert.equal(pagoSem(s),270);
});
