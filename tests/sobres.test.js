import test from 'node:test';
import assert from 'node:assert/strict';
import {planear} from '../js/logica/plan.js';
import {aplicarSobres,gastosDelDia} from '../js/logica/sobres.js';

/* Números inventados: $28.000 para 28 días (4 semanas), $7.000 de ahorro, sin fijos → $21.000 para gastar */
var plan={monto:28000,modo:'monto',ahorro:7000,pct:0,inicio:'2026-10-01',cobro:'2026-10-29'};
function st(extra,gastos){return {plan:Object.assign({},plan,extra),gastos:gastos||[]}}
function suma(ws,k){return ws.reduce(function(a,w){return a+w[k]},0)}

test('sin sobres, las semanas dan idénticas al plan de siempre',function(){
  var g=[{fecha:'2026-10-03',monto:500},{fecha:'2026-10-12',monto:1200}];
  var s=st({colchon:0,compras:0},g),pc=planear(s.plan,g,0),r=aplicarSobres(s,pc);
  pc.weeks.forEach(function(w,i){
    assert.ok(Math.abs(w.budget-r.weeks[i].budget)<1e-9);assert.equal(w.spent,r.weeks[i].spent);assert.ok(Math.abs(w.left-r.weeks[i].left)<1e-9);
  });
});
test('el colchón sale de las semanas y se suma entero a la última; el total no cambia',function(){
  var s=st({colchon:10,compras:0}),pc=planear(s.plan,[],0),r=aplicarSobres(s,pc);
  assert.equal(r.sobres.colchon,2100);
  assert.ok(Math.abs(suma(r.weeks,'budget')-21000)<1e-6);
  assert.ok(Math.abs(r.weeks[0].budget-4725)<1e-6,'cada semana: 18.900 / 4');
  assert.ok(Math.abs(r.weeks[3].budget-6825)<1e-6,'la última: 4.725 + 2.100');
});
test('el sobre de compras no entra en las semanas; lo que te pasás del sobre va a la semana del gasto',function(){
  var g=[{fecha:'2026-10-09',monto:2500,sobre:'compras'},{fecha:'2026-10-16',monto:1000,sobre:'compras'},{fecha:'2026-10-02',monto:300}];
  var s=st({colchon:0,compras:3000},g),pc=planear(s.plan,g,0),r=aplicarSobres(s,pc);
  assert.equal(r.sobres.compras,3000);assert.equal(r.sobres.usado,3000);assert.equal(r.sobres.queda,0);
  assert.ok(Math.abs(suma(r.weeks,'budget')-18000)<1e-6);
  assert.equal(r.weeks[0].spent,300);assert.equal(r.weeks[1].spent,0,'los 2.500 entran en el sobre');
  assert.equal(r.weeks[2].spent,500,'de los 1.000, 500 pasan del sobre');
});
test('con una sola semana no hay colchón, y el sobre nunca pasa la plata para gastar',function(){
  var s=st({cobro:'2026-10-06',colchon:15,compras:999999}),pc=planear(s.plan,[],0),r=aplicarSobres(s,pc);
  assert.equal(r.weeks.length,1);assert.equal(r.sobres.colchon,0);assert.equal(r.sobres.compras,Math.round(pc.gastar));
});
test('los gastos del sobre no bajan lo de hoy',function(){
  assert.deepEqual(gastosDelDia([{monto:1,sobre:'compras'},{monto:2}]),[{monto:2}]);
});
