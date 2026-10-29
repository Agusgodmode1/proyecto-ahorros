import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,ejemplo,migrar,VERSION_ESTADO} from '../js/estado.js';
import {puesto} from '../js/logica/puestos.js';
import {extraPorHorario,tipoDeDia,tieneHorario} from '../js/logica/horario.js';
import {liq,tarifas,mins,pagoSem,mesTrabajo,extraDelDia} from '../js/logica/sueldo.js';
import {fechaCobro,nextCobro,cobroDesde} from '../js/logica/plan.js';
import {logrosLista} from '../js/logica/logros.js';
import {planCalc} from '../js/logica/plan.js';
import {FERIADOS_UY,feriadosActivos} from '../js/logica/feriados.js';
import {usarFeriados,bizRank,esFeriado} from '../js/logica/fechas.js';

function cerca(a,b,msg){assert.ok(Math.abs(a-b)<=1,msg+': '+a.toFixed(2)+' vs '+b)}
/* Así se guardaban los datos en la versión 4 (con números inventados) */
function agusV4(){
  var s=ejemplo();
  s.v=4;s.ejemplo=false;delete s.perfil;delete s.feriados;
  s.sueldo={nominal:45000,bonoFijo:0,bonoHora:93.75,heCom:375,heEsp:187.5,hijos:0,conyuge:false,otros:0,bpc:6864,redondeo:true};
  s.horas.forEach(function(h){delete h.ej});
  return s;
}

test('tus datos actuales (v4) migran a tu perfil y dan exactamente lo mismo',function(){
  var s=migrar(agusV4());
  assert.equal(s.perfil.nombre,'Agus');
  assert.equal(s.perfil.hecho,true);
  assert.equal(s.perfil.cobro.tipo,'habil5');
  assert.equal(s.perfil.horas.redondeo,'media');
  assert.equal(s.sueldo.tarifaManual,null,'las tarifas salen del perfil');
  assert.equal(s.sueldo.heCom,undefined);
  var t=tarifas(s);
  assert.equal(t.heCom,375);assert.equal(t.heEsp,187.5);assert.equal(t.bonoHora,93.75);
  var L=liq(s,true);
  assert.equal(Math.round(L.N*100)/100,50718.75);
  assert.equal(Math.round(L.liquido*100)/100,40777.88);
  assert.equal(s.ejemplo,false);
  assert.equal(s.horas.length,10);
});

test('si había cambiado el valor de las horas a mano, se respeta',function(){
  var v=agusV4();v.sueldo.heCom=410;
  var s=migrar(v);
  assert.deepEqual(s.sueldo.tarifaManual,{heCom:410,heEsp:187.5,bonoHora:93.75});
  assert.equal(tarifas(s).heCom,410);
});

test('redondeo apagado en v4 pasa al perfil',function(){
  var v=agusV4();v.sueldo.redondeo=false;
  assert.equal(migrar(v).perfil.horas.redondeo,'no');
});

test('instalación nueva: en blanco, sin datos de Agus',function(){
  var s=defaults('2026-10-13');
  assert.equal(s.perfil.nombre,'');
  assert.equal(s.perfil.hecho,false);
  assert.equal(s.horas.length,0);
  assert.equal(s.sueldo.nominal,0);
  assert.equal(s.plan.monto,0);
  assert.equal(s.plan.inicio,'2026-10-13');
  assert.equal(s.plan.cobro,'2026-11-06','el 2/11 (Difuntos) es laborable: cuenta como día hábil');
  assert.equal(s.ejemplo,false);
  assert.deepEqual(migrar(s),s,'un estado v5 no cambia al migrar');
});

test('datos de ejemplo: marcados como ejemplo',function(){
  var s=ejemplo();
  assert.equal(s.ejemplo,true);
  assert.ok(s.horas.every(function(h){return h.ej}));
  assert.equal(migrar(s).ejemplo,true,'siguen marcados después de guardar y abrir');
});

test('otras reglas de horas',function(){
  var s=defaults('2026-10-13');
  s.sueldo.nominal=60000;
  s.perfil.horas=Object.assign(s.perfil.horas,{divisor:200,multSem:1.5,multFin:2,finDividido:false});
  var t=tarifas(s);
  assert.equal(t.hora,300);assert.equal(t.heCom,450);assert.equal(t.heEsp,600);assert.equal(t.bonoHora,0);
  s.plan.cobro='2026-11-09';
  s.horas=[{id:'a',fecha:'2026-10-05',tipo:'sem',min:60},{id:'b',fecha:'2026-10-10',tipo:'fin',min:120}];
  var L=liq(s,true);
  assert.equal(L.extraCom,450);assert.equal(L.extraEsp,1200);assert.equal(L.bono,0);
});

test('sin horas extra: no suman y no aparece el logro de horas',function(){
  var s=ejemplo();s.perfil.horas.activo=false;
  assert.equal(mins(s,'sem'),0);assert.equal(mins(s,'fin'),0);
  var L=liq(s,true);assert.equal(L.N,45000);
  var ls=logrosLista(s,planCalc(s),'2026-10-13',null);
  var todos=logrosLista(Object.assign({},s,{perfil:Object.assign({},s.perfil,{horas:Object.assign({},s.perfil.horas,{activo:true})})}),planCalc(s),'2026-10-13',null);
  assert.equal(ls.length,todos.length-1,'es la lista completa menos el de horas');
  assert.ok(!ls.some(function(l){return l.id==='horas'}));
});

test('las horas se cobran el mes siguiente o el mismo mes',function(){
  var s=ejemplo();
  assert.equal(mesTrabajo(s),'2026-10');
  s.perfil.horas.mesCobro='mismo';
  assert.equal(mesTrabajo(s),'2026-11');
});

test('extra del día según la presencia (umbral 9 h 15, jornada 9 h: el puesto de CRM)',function(){
  var s=defaults();Object.assign(s.perfil.horas,puesto('crm').horas);
  assert.equal(extraDelDia(s,560),20);
  assert.equal(extraDelDia(s,555),15,'15 min justos ya cuentan (antes + después)');
  assert.equal(extraDelDia(s,554),0,'14 min no cuentan');
  assert.equal(extraDelDia(s,556),16);
  assert.equal(extraDelDia(s,500),0);
});

test('día de cobro: 5.º hábil, último hábil o día fijo',function(){
  assert.equal(fechaCobro(2026,10,{tipo:'habil5'}),'2026-11-06');
  assert.equal(fechaCobro(2026,9,{tipo:'ultimoHabil'}),'2026-10-30');
  assert.equal(fechaCobro(2026,11,{tipo:'ultimoHabil'}),'2026-12-31');
  assert.equal(fechaCobro(2027,1,{tipo:'fijo',dia:31}),'2027-02-28');
  assert.equal(nextCobro('2026-10-30',{tipo:'ultimoHabil'}),'2026-11-30');
  assert.equal(nextCobro('2026-11-06'),'2026-12-07');
  assert.equal(cobroDesde('2026-10-13',{tipo:'fijo',dia:15}),'2026-10-15');
  assert.equal(cobroDesde('2026-10-15',{tipo:'fijo',dia:15}),'2026-11-15');
});

test('feriados 2026 y 2027 completos y editables',function(){
  assert.ok(FERIADOS_UY.some(function(f){return f.fecha==='2026-04-02'}),'Turismo');
  assert.ok(FERIADOS_UY.some(function(f){return f.fecha==='2027-10-11'}),'12/10/2027 se corre al lunes');
  ['2026-10-12','2026-11-02','2026-12-25','2027-01-01','2027-01-06','2027-11-02'].forEach(function(f){assert.ok(esFeriado(f),f)});
  var lista=feriadosActivos({quitados:['2026-11-02'],agregados:[{fecha:'2026-11-20',nombre:'Libre de la empresa'}]});
  assert.ok(!lista.some(function(f){return f.fecha==='2026-11-02'}));
  assert.ok(lista.some(function(f){return f.fecha==='2026-11-20'&&f.propio}));
  usarFeriados(lista);
  assert.equal(bizRank('2026-11-02'),1,'el 2/11 es laborable: día hábil');
  assert.equal(bizRank('2026-11-20'),null,'un feriado propio no es hábil');
  usarFeriados(FERIADOS_UY,{laborableHabil:false});
  assert.equal(bizRank('2026-11-02'),null,'con la regla vieja, el 2/11 no era hábil');
  usarFeriados(FERIADOS_UY);
  assert.equal(bizRank('2026-08-25'),null,'un no laborable nunca es hábil');
});

/* ---------- (2.26) El horario de cada uno ---------- */
test('alguien nuevo no arranca con mi horario ni con mis reglas',function(){
  var h=defaults('2026-10-29').perfil.horas;
  assert.equal(h.entrada,'');assert.equal(h.salida,'');assert.equal(tieneHorario(h),false);
  assert.notEqual(h.multFin,1.5);assert.equal(h.redondeo,'no');assert.equal(h.finDividido,false);
  assert.equal(extraPorHorario(h,'11:45','21:15','sem'),null,'sin horario no se inventa uno');
  /* mi perfil sigue disponible como puesto para quien lo quiera elegir */
  var P=puesto('crm');assert.equal(P.nombre,'Agente de CRM (call center)');assert.equal(P.horas.entrada,'12:00');assert.equal(P.horas.salida,'21:00');
});
test('mis datos (de antes del horario) migran con mi horario y mis reglas: todo da idéntico',function(){
  var s=migrar(agusV4());
  assert.equal(s.v,VERSION_ESTADO);
  var h=s.perfil.horas;
  assert.equal(h.entrada,'12:00');assert.equal(h.salida,'21:00');assert.equal(h.dias,'lv');
  assert.equal(h.multSem,2);assert.equal(h.multFin,1.5);assert.equal(h.finDividido,true);assert.equal(h.redondeo,'media');
  assert.equal(h.umbral,555);assert.equal(h.jornada,540);
  var L=liq(s,true);
  assert.equal(Math.round(L.N*100)/100,50718.75);assert.equal(Math.round(L.liquido*100)/100,40777.88);
  /* un estado v23 al que le faltaban campos de horas (los tomaba de las reglas de siempre) */
  var v23=JSON.parse(JSON.stringify(s));v23.v=23;delete v23.perfil.horas.entrada;delete v23.perfil.horas.salida;delete v23.perfil.horas.umbral;delete v23.perfil.horas.jornada;delete v23.perfil.horas.dias;
  var m=migrar(v23);
  assert.equal(m.perfil.horas.entrada,'12:00');assert.equal(m.perfil.horas.umbral,555);assert.equal(m.perfil.horas.dias,'lv');
  assert.deepEqual(liq(m,true),liq(s,true));
  /* y el sábado sigue siendo fin de semana para mí */
  assert.equal(tipoDeDia('2026-10-17',m.perfil.horas.dias),'fin');
});
