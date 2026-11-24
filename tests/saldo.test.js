import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../js/estado.js';
import {planear,proximo,planCalc} from '../js/logica/plan.js';
import {disponible,cabeGasto,previaSaldo,ajustarSaldo,deshacerAjuste,maxAhorro,fijosPendientes} from '../js/logica/saldo.js';
import {hoyPodes} from '../js/logica/plan.js';
import {gastosDelDia} from '../js/logica/sobres.js';

/* Números inventados, igual que el resto de las pruebas */
function estado(){
  var s=defaults();
  s.plan={monto:40000,modo:'monto',ahorro:10000,pct:30,inicio:'2026-10-12',cobro:'2026-11-09',minimo:null,sobrante:'siguiente',sobranteSemana:{}};
  s.fijos=[{id:'c',nombre:'Celular',monto:1200,dia:20,cat:'Celular e internet'}];
  s.gastos=[{id:'g1',fecha:'2026-10-13',monto:3000,nota:'súper',cat:'Comida'}];
  s.fijosPagos={};
  return s;
}

test('disponible: lo que tenías − gastos anotados − fijos pagados',function(){
  var s=estado();
  assert.equal(disponible(s),37000,'sin fijos pagados');
  s.fijosPagos['2026-11-09']={c:{monto:1200,fecha:'2026-10-20'}};
  assert.equal(disponible(s),35800,'con el celular pagado');
});

test('actualizar saldo con menos plata: se anota un gasto "Ajuste de saldo" del día anterior',function(){
  var s=estado();
  var r=ajustarSaldo(s,30000,'2026-10-15');
  assert.equal(r.tipo,'gasto');
  assert.equal(r.diff,7000);
  var g=s.gastos.filter(function(x){return x.id===r.id})[0];
  assert.equal(g.fecha,'2026-10-14');
  assert.equal(g.src,'ajuste');
  assert.equal(disponible(s),30000,'el disponible queda en lo que dijiste');
  deshacerAjuste(s,r);
  assert.equal(disponible(s),37000,'deshacer vuelve al estado anterior');
});

test('sin gastos ni fijos pagados: lo que decís pasa a ser la plata del plan (no hay nada que ajustar)',function(){
  var s=estado();s.gastos=[];
  var r=ajustarSaldo(s,35000,'2026-10-12');
  assert.equal(r.tipo,'monto');
  assert.equal(s.plan.monto,35000);
  assert.equal(s.gastos.length,0,'no se inventa un gasto');
  assert.equal(disponible(s),35000);
  deshacerAjuste(s,r);
  assert.equal(s.plan.monto,40000);
});

test('el ajuste nunca cae antes del inicio del plan (2.70: ni en hoy; el primer día corrige la plata del plan)',function(){
  var s=estado();
  var r=ajustarSaldo(s,30000,'2026-10-12');
  assert.equal(r.tipo,'monto');
  assert.ok(s.gastos.every(function(x){return x.src!=='ajuste'}),'ningún gasto de ajuste');
  assert.equal(disponible(s),30000);
});

test('actualizar saldo con más plata: se suma a lo que tenías, y se puede deshacer',function(){
  var s=estado();
  var r=ajustarSaldo(s,40000,'2026-10-15');
  assert.equal(r.tipo,'ingreso');
  assert.equal(r.diff,3000);
  assert.equal(s.plan.monto,43000);
  assert.equal(disponible(s),40000);
  deshacerAjuste(s,r);
  assert.equal(s.plan.monto,40000);
});

test('actualizar saldo: igual, negativo o ya cobrado no cambian nada',function(){
  var s=estado();
  assert.equal(previaSaldo(s,37000,'2026-10-15').tipo,'igual');
  assert.equal(previaSaldo(s,-5,'2026-10-15').tipo,'invalido');
  assert.equal(previaSaldo(s,null,'2026-10-15').tipo,'invalido');
  assert.equal(previaSaldo(s,100,'2026-11-09').tipo,'fuera');
  var antes=JSON.stringify(s);
  ajustarSaldo(s,-5,'2026-10-15');ajustarSaldo(s,100,'2026-11-09');
  assert.equal(JSON.stringify(s),antes,'negativo o ya cobrado no tocan nada');
  ajustarSaldo(s,37000,'2026-10-15');
  assert.equal(s.gastos.length,1,'igual: ningún gasto nuevo');
  assert.equal(s.plan.saldoFecha,'2026-10-15','igual: solo anota que hoy revisaste');
});

test('(2.45) lo gastado se reparte entre los días desde la última vez que actualizaste hasta ayer',function(){
  var s=estado();
  ajustarSaldo(s,36000,'2026-10-15');
  assert.equal(s.plan.saldoFecha,'2026-10-15');
  var r=ajustarSaldo(s,33001,'2026-10-18'); /* 2.999 en 3 días: el 15, el 16 y el 17 */
  assert.equal(r.tipo,'gasto');
  var gs=s.gastos.filter(function(g){return r.ids.indexOf(g.id)>=0});
  assert.deepEqual(gs.map(function(g){return g.fecha}),['2026-10-15','2026-10-16','2026-10-17']);
  assert.deepEqual(gs.map(function(g){return g.monto}),[999,999,1001],'las partes suman lo que falta');
  assert.equal(disponible(s),33001);
  deshacerAjuste(s,r);
  assert.equal(disponible(s),36000,'deshacer saca todas las partes');
  assert.equal(s.plan.saldoFecha,'2026-10-15','y vuelve la fecha de antes');
});

test('(2.70) si ya actualizaste hoy, lo nuevo cae entero en ayer (nunca hoy); nunca antes del inicio del plan',function(){
  var s=estado();
  ajustarSaldo(s,36000,'2026-10-15');
  var r=ajustarSaldo(s,35500,'2026-10-15');
  var gs=s.gastos.filter(function(g){return r.ids.indexOf(g.id)>=0});
  assert.deepEqual(gs.map(function(g){return g.fecha}),['2026-10-14'],'la segunda diferencia va a ayer');
  assert.deepEqual(gs.map(function(g){return g.monto}),[500]);
  assert.equal(disponible(s),35500,'lo que tenés es lo que escribiste');
  var t=estado();t.plan.saldoFecha='2026-10-01';
  var q=ajustarSaldo(t,36000,'2026-10-14');
  assert.deepEqual(t.gastos.filter(function(g){return q.ids.indexOf(g.id)>=0}).map(function(g){return g.fecha}),['2026-10-12','2026-10-13']);
});

test('(2.45) sin anotar gastos, después del primer día lo que falta es gasto (no cambia la plata del plan)',function(){
  var s=estado();s.gastos=[];
  assert.equal(previaSaldo(s,35000,'2026-10-12').tipo,'monto','el primer día corrige lo que tenías');
  assert.equal(previaSaldo(s,35000,'2026-10-14').tipo,'gasto');
  s.perfil.anotarGastos=true;
  assert.equal(previaSaldo(s,35000,'2026-10-14').tipo,'monto','anotando cada gasto, como antes');
});

test('tope: un gasto nuevo no puede ser mayor que lo disponible',function(){
  var s=estado();
  assert.equal(cabeGasto(s,37000).ok,true);
  assert.equal(cabeGasto(s,37001).ok,false);
  assert.equal(cabeGasto(s,37001).disponible,37000);
  s.plan.monto=0;
  assert.equal(cabeGasto(s,999999).ok,true,'sin plan armado no se limita');
});

test('tope: el ahorro no puede ser mayor que lo que queda después de los fijos',function(){
  var plan={monto:10000,modo:'monto',ahorro:9000,pct:30,inicio:'2026-10-12',cobro:'2026-11-09'};
  var pc=planear(plan,[],4000);
  assert.equal(pc.ahorroPedido,9000);
  assert.equal(pc.ahorro,6000);
  assert.equal(pc.gastar,0,'para gastar nunca da negativo');
  var pp=planear(Object.assign({},plan,{modo:'pct',pct:100}),[],4000);
  assert.equal(pp.ahorro,6000);
  assert.ok(pp.gastar>=0);
});

test('tope: la meta del mes que viene no pasa de lo que cobrás menos los fijos',function(){
  var s=estado();s.plan.ahorro=90000;
  var nx=proximo(s,{liquido:30000});
  assert.equal(nx.metaPedida,90000);
  assert.equal(nx.meta,28800);
  assert.ok(nx.libre>=0);
});

test('meta imposible: con $2.000 y una meta de $12.000, el pedido se ve y el ahorro se recorta',function(){
  var s=estado();s.gastos=[];s.fijos=[];s.plan.monto=2000;s.plan.ahorro=12000;
  var pc=planCalc(s);
  assert.equal(pc.ahorroPedido,12000,'lo que pidió se conserva para poder avisar');
  assert.equal(pc.ahorro,2000,'lo que se usa nunca pasa de lo que hay');
  assert.equal(maxAhorro(s,pc),2000);
  assert.ok(pc.gastar>=0);
});

test('máximo a guardar: lo que tenés menos los fijos que faltan pagar',function(){
  var s=estado();
  assert.equal(maxAhorro(s),37000-1200,'celular todavía sin pagar');
  s.fijosPagos['2026-11-09']={c:{monto:1200,fecha:'2026-10-20'}};
  assert.equal(maxAhorro(s),35800,'con el celular pagado');
  assert.equal(fijosPendientes(s),0);
});

/* ---------- (2.70) el ajuste de saldo nunca cuenta como gasto de hoy ---------- */
function hoyDe(s){var hoy=Array.from(arguments)[1];return hoyPodes(planCalc(s),gastosDelDia(s.gastos),hoy)}
function ajustesDe(s){return s.gastos.filter(function(g){return g.src==='ajuste'})}
test('(2.70) ningún ajuste lleva la fecha de hoy, en ningún caso',function(){
  var hoy='2026-10-15';
  var a=estado();ajustarSaldo(a,36000,hoy);ajustarSaldo(a,35000,hoy);ajustarSaldo(a,34000,hoy);
  assert.ok(ajustesDe(a).length>0);assert.ok(ajustesDe(a).every(function(g){return g.fecha!==hoy}),'actualizando varias veces el mismo día');
  var b=estado();b.plan.saldoFecha='2026-10-12';ajustarSaldo(b,30000,hoy);
  assert.ok(ajustesDe(b).every(function(g){return g.fecha>='2026-10-12'&&g.fecha<hoy}),'repartido entre la última vez y ayer');
  assert.equal(disponible(b),30000);
});
test('(2.70) el primer día del plan, con menos plata: baja la plata del plan y no aparece ningún gasto',function(){
  var s=estado(),hoy='2026-10-12';  /* el plan empieza hoy: no hay un ayer dentro del plan */
  s.gastos=[{id:'g0',fecha:hoy,monto:2000,nota:'súper',cat:'Comida'}];  /* ya anotaste algo hoy */
  assert.equal(disponible(s),38000);
  var p=previaSaldo(s,35000,hoy);assert.equal(p.tipo,'monto');
  var r=ajustarSaldo(s,35000,hoy);
  assert.equal(r.tipo,'monto');assert.equal(s.plan.monto,37000,'40.000 − 3.000 de diferencia');
  assert.equal(ajustesDe(s).length,0,'ningún gasto «Ajuste de saldo»');
  assert.equal(disponible(s),35000,'lo que tenés es lo que escribiste');
  assert.equal(hoyDe(s,hoy).gastadoHoy,2000,'hoy gastaste sigue siendo solo lo que anotaste');
  deshacerAjuste(s,r);
  assert.equal(s.plan.monto,40000);assert.equal(disponible(s),38000);assert.equal(s.plan.saldoFecha,undefined);
});
test('(2.70) un «Ajuste de saldo» viejo con la fecha de hoy no cuenta en «hoy gastaste» (pero sí baja lo de la semana)',function(){
  var s=estado(),hoy='2026-10-15';
  var antes=hoyDe(s,hoy);
  s.gastos.push({id:'v1',fecha:hoy,monto:1650,nota:'Ajuste de saldo',cat:'Otros',src:'ajuste'});
  var H=hoyDe(s,hoy);
  assert.equal(H.gastadoHoy,0,'no es un gasto de hoy');
  assert.ok(H.queda>=0,'no dice «te pasaste» por un ajuste');
  /* (2.70) un ajuste nunca es de una semana: baja la plata total, repartida entre todos los días que quedan */
  assert.ok(H.semanaQueda<antes.semanaQueda&&H.semanaQueda>antes.semanaQueda-1650,'la semana baja solo su parte');
  assert.ok(H.porDia<antes.porDia,'y lo de cada día se recalcula desde hoy');
});
test('(2.70) deshacer deja todo como estaba en los tres casos',function(){
  function foto(s){return JSON.stringify({g:s.gastos,m:s.plan.monto,f:s.plan.saldoFecha})}
  /* normal: repartido hasta ayer */
  var a=estado();a.plan.saldoFecha='2026-10-12';var fa=foto(a),ra=ajustarSaldo(a,30000,'2026-10-15');assert.equal(ra.tipo,'gasto');deshacerAjuste(a,ra);assert.equal(foto(a),fa);
  /* ya actualizaste hoy: a ayer */
  var b=estado();ajustarSaldo(b,36000,'2026-10-15');var fb=foto(b),rb=ajustarSaldo(b,35000,'2026-10-15');assert.equal(rb.tipo,'gasto');deshacerAjuste(b,rb);assert.equal(foto(b),fb);
  /* el primer día del plan: la plata del plan */
  var c=estado();var fc=foto(c),rc=ajustarSaldo(c,30000,'2026-10-12');assert.equal(rc.tipo,'monto');deshacerAjuste(c,rc);assert.equal(foto(c),fc);
});
test('(2.70) después de actualizar, lo que tenés es el número que escribiste (más o menos plata, cualquier día)',function(){
  [['2026-10-12',30000],['2026-10-12',45000],['2026-10-15',30000],['2026-10-15',45000]].forEach(function(c){
    var s=estado();ajustarSaldo(s,c[1],c[0]);assert.equal(disponible(s),c[1],c[0]+' → '+c[1]);
    ajustarSaldo(s,c[1]-700,c[0]);assert.equal(disponible(s),c[1]-700,'y otra vez el mismo día');
  });
});
