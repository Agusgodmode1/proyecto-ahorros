import {test} from 'node:test';
import assert from 'node:assert/strict';
import {progresoMeta,aportado} from '../js/logica/metas.js';

test('meta: cuánto falta, cuánto por mes para llegar y a qué ritmo',function(){
  var m={id:'b',nombre:'Viaje a Brasil',objetivo:60000,para:'2027-03',aportes:[{fecha:'2026-09-07',monto:8000},{fecha:'2026-10-07',monto:10000}]};
  assert.equal(aportado(m),18000);
  var p=progresoMeta(m,'2026-10-13');
  assert.equal(p.falta,42000);
  assert.equal(p.mesesHasta,6,'octubre a marzo, contando este mes');
  assert.equal(p.porMes,7000);
  assert.equal(p.ritmo,9000,'18.000 en 2 meses');
  assert.equal(p.llegasEn,5,'42.000 a 9.000 por mes');
  assert.equal(p.cumplida,false);
  assert.equal(Math.round(p.pct*100),30);
});

test('meta cumplida y meta sin fecha ni aportes',function(){
  var p=progresoMeta({objetivo:1000,aportes:[{fecha:'2026-10-01',monto:1200}]},'2026-10-13');
  assert.equal(p.cumplida,true);assert.equal(p.falta,0);assert.equal(p.pct,1);assert.equal(p.llegasEn,0);
  var q=progresoMeta({objetivo:5000,aportes:[]},'2026-10-13');
  assert.equal(q.porMes,null);assert.equal(q.llegasEn,null);assert.equal(q.falta,5000);
});
