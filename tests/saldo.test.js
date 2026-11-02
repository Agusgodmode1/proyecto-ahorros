import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../js/estado.js';
import {planear,proximo,planCalc} from '../js/logica/plan.js';
import {disponible,cabeGasto,previaSaldo,ajustarSaldo,deshacerAjuste,maxAhorro,fijosPendientes} from '../js/logica/saldo.js';

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

test('el ajuste nunca cae antes del inicio del plan',function(){
  var s=estado();
  var r=ajustarSaldo(s,30000,'2026-10-12');
  assert.equal(s.gastos.filter(function(x){return x.id===r.id})[0].fecha,'2026-10-12');
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

test('(2.45) si ya actualizaste hoy, lo nuevo cae hoy; nunca antes del inicio del plan',function(){
  var s=estado();
  ajustarSaldo(s,36000,'2026-10-15');
  var r=ajustarSaldo(s,35500,'2026-10-15');
  assert.equal(s.gastos.filter(function(g){return g.id===r.id})[0].fecha,'2026-10-15');
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
