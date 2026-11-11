/* Modo pareja (2.59). Todos los números son INVENTADOS. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {estadoDe,juntos,activarPareja,sincronizarGrupo,hayPareja,GRUPO} from '../js/logica/pareja.js';
import {defaults} from '../js/estado.js';
import {liqReal} from '../js/logica/recibos.js';
import {proporciones} from '../js/logica/reparto.js';

var HOY='2026-11-11';
function dos(){
  var s=defaults(HOY);s.sueldo.nominal=50000;s.sueldo.aMano=true;
  activarPareja(s,'Sofi',defaults(HOY));
  s.pareja.sueldo.nominal=30000;s.pareja.sueldo.aMano=true;s.pareja.perfil.cobro={tipo:'fijo',dia:1};
  return s;
}
test('estadoDe: «yo» es el estado tal cual; «pareja» lee y escribe en state.pareja', function(){
  var s=dos();
  assert.equal(estadoDe(s,'yo',HOY),s);
  var v=estadoDe(s,'pareja',HOY);
  assert.equal(v.sueldo.nominal,30000);assert.equal(v.plan.monto,s.plan.monto);assert.equal(v.fijos,s.fijos);
  v.recibos=[{id:'a',mes:'2026-10',liquido:1}];v.horas.push({id:'h'});v.sueldo.nominal=31000;
  assert.equal(s.pareja.recibos.length,1);assert.equal(s.pareja.horas.length,1);assert.equal(s.pareja.sueldo.nominal,31000);
  assert.equal(s.recibos.length,0,'lo tuyo no cambia');assert.equal(s.horas.length,0);assert.equal(s.sueldo.nominal,50000);
  /* sin pareja activada, siempre es el estado tal cual */
  var solo=defaults(HOY);assert.equal(estadoDe(solo,'pareja',HOY),solo);assert.equal(hayPareja(solo),false);
});
test('juntos: el total es la suma, los % suman 100 y cada una cobra su día', function(){
  var s=dos(),J=juntos(s,HOY),a=J.personas[0],b=J.personas[1];
  assert.equal(a.cobra,liqReal(s).liquido);assert.equal(b.cobra,liqReal(estadoDe(s,'pareja',HOY)).liquido);
  assert.ok(a.cobra>b.cobra&&b.cobra>0);
  assert.equal(J.total,a.cobra+b.cobra);
  assert.equal(a.pct+b.pct,100);assert.equal(a.pct,Math.round(a.cobra/J.total*100));
  assert.equal(a.cobro,s.plan.cobro);assert.equal(b.cobro,'2026-12-01');assert.notEqual(a.cobro,b.cobro);
  assert.equal(b.nombre,'Sofi');
  /* una persona sin recibo ni sueldo cargado: $ 0 y el otro pone el 100 % */
  var t=dos();t.pareja.sueldo.aMano=false;var K=juntos(t,HOY);
  assert.equal(K.personas[1].cobra,0);assert.equal(K.personas[1].sinRecibo,true);assert.deepEqual([K.personas[0].pct,K.personas[1].pct],[100,0]);
  /* nadie cobra nada todavía: mitad y mitad */
  var z=defaults(HOY);activarPareja(z,'',defaults(HOY));assert.deepEqual(juntos(z,HOY).personas.map(function(x){return x.pct}),[50,50]);
});
test('Fijos: el grupo «En pareja» se crea solo y reparte según lo que cobra cada una', function(){
  var s=dos(),J=juntos(s,HOY);
  assert.equal(sincronizarGrupo(s,HOY),true);
  var g=s.grupos.filter(function(x){return x.id===GRUPO})[0];
  assert.equal(g.reparto.tipo,'ingresos');assert.deepEqual(g.personas.map(function(x){return x.id}),['yo','pareja']);
  assert.ok(g.personas.every(function(x){return x.ingresoAuto}));
  var P=proporciones(g);assert.ok(Math.abs(P.yo-J.personas[0].cobra/J.total)<0.001);assert.ok(Math.abs(P.yo+P.pareja-1)<1e-9);
  assert.equal(sincronizarGrupo(s,HOY),false,'sin cambios no vuelve a escribir');
  s.pareja.sueldo.nominal=50000;assert.equal(sincronizarGrupo(s,HOY),true);assert.equal(proporciones(g).yo,0.5);
  /* con «Solo» no se crea nada */
  var solo=defaults(HOY);assert.equal(sincronizarGrupo(solo,HOY),false);assert.equal(solo.grupos.length,0);
});
