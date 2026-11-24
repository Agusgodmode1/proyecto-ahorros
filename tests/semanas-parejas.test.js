// (2.70) Semanas parejas desde la última actualización del saldo (o desde el pacto) hasta el cobro,
// y lo no gastado de un día se suma a los días que quedan. Números inventados.
import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../js/estado.js';
import {planCalc,semanasParejas,puntoDePartida,hoyPodes,ayerEnSemana} from '../js/logica/plan.js';
import {aplicarSobres,gastosDelDia} from '../js/logica/sobres.js';
import {ajustarPlan} from '../js/logica/mes.js';
import {disponible,ajustarSaldo,deshacerAjuste,fijosPendientes} from '../js/logica/saldo.js';
import {diffDays} from '../js/logica/fechas.js';

/* un plan de 16 días: del lunes 16 de noviembre al miércoles 2 de diciembre (se cobra ese día) */
function estado(o){
  var s=defaults();
  s.plan=Object.assign({monto:40000,modo:'monto',ahorro:8000,pct:20,inicio:'2026-11-16',cobro:'2026-12-02',minimo:null,sobrante:'siguiente',sobranteSemana:{}},o||{});
  s.fijos=[{id:'f',nombre:'Internet',monto:1600,dia:28,cat:'Celular e internet'}];
  s.gastos=[];s.fijosPagos={};
  return s;
}
/* lo que usa Hoy: el plan con el reparto y el ajuste de fin de mes encima */
function ahora(s,hoy){return ajustarPlan(s,aplicarSobres(s,planCalc(s)),hoy)}
function dias(pc){return pc.weeks.map(function(w){return w.days})}
function plata(pc){var t=0;pc.weeks.forEach(function(w){t+=w.budget});return t}
function queda(pc){var w=pc.weeks[pc.weeks.length-1];return w.left}

test('la tabla de semanas parejas, exacta',()=>{
  const T={14:[7,7],16:[8,8],17:[9,8],23:[8,8,7],30:[8,8,7,7],10:[5,5],4:[4]};
  for(const d in T)assert.deepEqual(semanasParejas(Number(d)),T[d],d+' días');
  for(let d=1;d<=45;d++){const w=semanasParejas(d);assert.equal(w.reduce((a,b)=>a+b,0),d,'suman '+d);assert.ok(Math.max(...w)-Math.min(...w)<=1,'parejas '+d);for(let i=1;i<w.length;i++)assert.ok(w[i]<=w[i-1],'las largas primero')}
});

test('armo el pacto con 16 días hasta el cobro: dos semanas de 8, ninguna de 2',()=>{
  const pc=planCalc(estado());
  assert.equal(pc.dias,16);assert.deepEqual(dias(pc),[8,8]);
  assert.equal(pc.weeks[0].start,'2026-11-16');assert.equal(pc.weeks[1].end,'2026-12-01','hasta el día anterior al cobro');
  assert.ok(Math.abs(plata(pc)-(40000-8000-1600))<1e-6,'sin actualizar: lo de siempre (plata − ahorro − fijos)');
});

test('actualizo el saldo a mitad de mes: las semanas arrancan ese día y reparten saldo − fijos pendientes − ahorro',()=>{
  const s=estado();s.gastos=[{id:'a',fecha:'2026-11-17',monto:5000,nota:'súper'}];
  ajustarSaldo(s,30000,'2026-11-21');  /* tenía 35.000 según lo anotado: faltan 5.000 (se reparten antes del 21) */
  const pc=planCalc(s);
  assert.equal(puntoDePartida(s.plan),'2026-11-21');
  assert.equal(pc.weeks[0].start,'2026-11-21');
  assert.equal(dias(pc).reduce((a,b)=>a+b,0),diffDays('2026-11-21','2026-12-02'),'los días suman exacto hasta el día anterior al cobro');
  assert.deepEqual(dias(pc),[6,5]);
  assert.equal(disponible(s,pc),30000);
  assert.ok(Math.abs(plata(pc)-(30000-fijosPendientes(s,pc)-8000))<1e-6,'saldo − fijos pendientes − ahorro');
});

test('con un «Ajuste de saldo» fechado ayer y el punto de partida en hoy: la semana no pierde plata por ese ajuste',()=>{
  const s=estado();
  const r=ajustarSaldo(s,30000,'2026-11-24');  /* el ajuste cae ayer (23), el punto de partida es hoy (24) */
  assert.equal(s.gastos.filter(g=>g.src==='ajuste').every(g=>g.fecha<'2026-11-24'),true);
  const pc=ahora(s,'2026-11-24');
  assert.equal(pc.weeks[0].start,'2026-11-24');
  assert.equal(pc.weeks[0].spent,0,'el ajuste no es un gasto de la semana');
  assert.ok(Math.abs(plata(pc)-(30000-1600-8000))<1e-6,'la semana se arma con la plata que tenés de verdad');
  /* un ajuste viejo con fecha dentro de las semanas tampoco cuenta como gasto de la semana */
  s.gastos.push({id:'v',fecha:'2026-11-24',monto:1650,nota:'Ajuste de saldo',src:'ajuste'});
  assert.equal(ahora(s,'2026-11-24').weeks[0].spent,0);
  assert.ok(r.tipo==='gasto');
});

test('actualizo dos veces el mismo día: manda el segundo saldo',()=>{
  const s=estado();
  ajustarSaldo(s,30000,'2026-11-21');ajustarSaldo(s,28000,'2026-11-21');
  const pc=planCalc(s);
  assert.equal(disponible(s,pc),28000);
  assert.equal(pc.weeks[0].start,'2026-11-21');
  assert.ok(Math.abs(plata(pc)-(28000-1600-8000))<1e-6);
});

test('con gastos anotados hoy antes de actualizar: no se descuentan dos veces',()=>{
  const s=estado();s.gastos=[{id:'h',fecha:'2026-11-21',monto:700,nota:'almuerzo'}];
  ajustarSaldo(s,30000,'2026-11-21');  /* los 30.000 ya son sin los 700 */
  const pc=ahora(s,'2026-11-21');
  assert.ok(Math.abs(queda(pc)-(30000-1600-8000))<1e-6,'lo que queda para gastar hasta el cobro es saldo − fijos − ahorro, no 700 menos');
});

test('ayer no gasté nada: hoy puedo gastar más que el promedio y aparece «Ayer te sobraron»',()=>{
  const s=estado(),pc=ahora(s,'2026-11-18'),H=hoyPodes(pc,gastosDelDia(s.gastos),'2026-11-18');
  const w=pc.weeks[0],prom=w.budget/w.days;
  assert.ok(Math.abs(H.porDia-w.left/6)<1e-6,'lo que queda de la semana ÷ los días que faltan (incluido hoy)');
  assert.ok(H.porDia>prom,'más alto que el promedio');
  const a=ayerEnSemana(pc,gastosDelDia(s.gastos),'2026-11-18');
  /* el 16 tampoco gastaste: ayer podías lo de la semana ÷ los 7 días que le faltaban, y te sobró todo */
  assert.equal(a.sobro,true);assert.ok(Math.abs(a.monto-w.avail/7)<1e-6,'te sobró todo lo de ayer');assert.ok(a.monto>prom);
});

test('ayer me pasé: hoy baja y aparece «Ayer te pasaste»',()=>{
  const s=estado();s.gastos=[{id:'x',fecha:'2026-11-17',monto:4000,nota:'zapatos'}];
  const pc=ahora(s,'2026-11-18'),w=pc.weeks[0],prom=w.budget/w.days;
  const H=hoyPodes(pc,gastosDelDia(s.gastos),'2026-11-18');
  assert.ok(H.porDia<prom,'hoy baja');
  const a=ayerEnSemana(pc,gastosDelDia(s.gastos),'2026-11-18');
  assert.equal(a.sobro,false);assert.ok(Math.abs(a.monto-(4000-(w.avail)/7))<1e-6,'lo que gastaste − lo que podías');
});

test('el primer día de una semana, y el día del punto de partida, no hay aviso',()=>{
  const s=estado();
  assert.equal(ayerEnSemana(ahora(s,'2026-11-24'),[],'2026-11-24'),null,'el 24 empieza la semana 2');
  assert.equal(ayerEnSemana(ahora(s,'2026-11-16'),[],'2026-11-16'),null,'el primer día del pacto');
  ajustarSaldo(s,30000,'2026-11-20');
  assert.equal(ayerEnSemana(ahora(s,'2026-11-20'),[],'2026-11-20'),null,'el día que actualizaste');
});

test('deshacer la actualización deja las semanas como estaban',()=>{
  const s=estado();s.gastos=[{id:'a',fecha:'2026-11-17',monto:5000,nota:'súper'}];
  const antes=JSON.stringify(planCalc(s).weeks);
  const r=ajustarSaldo(s,30000,'2026-11-21');
  assert.notEqual(JSON.stringify(planCalc(s).weeks),antes);
  deshacerAjuste(s,r);
  assert.equal(JSON.stringify(planCalc(s).weeks),antes);
});

test('Optimizado reparte las semanas parejas desde el punto de partida, con la misma plata',()=>{
  const s=estado({reparto:'recomendado'});
  ajustarSaldo(s,30000,'2026-11-21');
  const pc=aplicarSobres(s,planCalc(s));
  assert.equal(pc.weeks[0].start,'2026-11-21');
  assert.ok(Math.abs(plata(pc)-(30000-1600-8000))<1e-6,'la misma plata, repartida con sus pesos');
  assert.ok(pc.weeks[0].budget/pc.weeks[0].days<pc.weeks[1].budget/pc.weeks[1].days,'la primera más liviana');
});
