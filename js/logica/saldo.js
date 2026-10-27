/* Saldo disponible y ajuste de saldo (puro, sin DOM).
   - disponible: la plata que deberías tener en la cuenta y en efectivo según lo anotado:
     lo que tenías al empezar el plan − gastos anotados − fijos que ya pagaste.
   - ajustarSaldo: vos decís cuánta plata tenés de verdad y la app anota la diferencia:
     si tenés menos, es un gasto "Ajuste de saldo" (cae el día anterior, así no te arruina el de hoy);
     si tenés más, se suma a lo que tenías (plata que te entró).
   - topes: nunca un saldo negativo, y un gasto nuevo no puede ser mayor que lo disponible. */
import {num,uid} from './util.js';
import {addDays,parse,iso} from './fechas.js';
import {fijosPeriodo,cuentaEnPresupuesto,isPagado,pagoDe,montoDelPeriodo,parteDelPeriodo,planCalc} from './plan.js';
import {grupoDe,quienPaga} from './reparto.js';

function r2(n){return Math.round(n*100)/100}

/* Lo que salió de tu bolsillo por un fijo pagado (2.11):
   - solo tuyo: lo que pagaste;
   - compartido y lo pagaste vos todo: el total, menos lo que ya te devolvieron;
   - cada uno paga su parte, o lo paga otro y le diste la tuya: tu parte. */
export function salidaDelPago(state,f){
  var p=pagoDe(state,f.id);if(!p)return 0;
  if(!grupoDe(state,f))return montoDelPeriodo(state,f);
  if(quienPaga(state,f)==='yo'){
    var dev=0,d=p.devuelto||{};Object.keys(d).forEach(function(k){dev+=num(d[k]&&d[k].monto)});
    return Math.max(0,montoDelPeriodo(state,f)-dev);
  }
  return parteDelPeriodo(state,f);
}
export function fijosPagados(state){
  var t=0;
  fijosPeriodo(state.fijos,state.plan.inicio,state.plan.cobro).forEach(function(o){
    if(cuentaEnPresupuesto(o.f)&&isPagado(state,o.f.id))t+=salidaDelPago(state,o.f);
  });
  return t;
}
/* Tu parte de los fijos que ya pagaste (para saber cuánto falta de lo que te toca) */
export function fijosPagadosParte(state){
  var t=0;
  fijosPeriodo(state.fijos,state.plan.inicio,state.plan.cobro).forEach(function(o){
    if(cuentaEnPresupuesto(o.f)&&isPagado(state,o.f.id))t+=parteDelPeriodo(state,o.f);
  });
  return t;
}
export function disponible(state,pc){
  pc=pc||planCalc(state);
  return r2(num(state.plan.monto)-pc.spentInPlan-fijosPagados(state));
}
/* ¿Cabe un gasto de este monto en lo disponible? Sin plan armado no se limita. */
export function cabeGasto(state,monto){
  if(!(num(state.plan.monto)>0))return {ok:true,disponible:0};
  var d=disponible(state);
  return {ok:monto<=d+0.5,disponible:Math.max(0,d)};
}
/* Qué haría actualizar el saldo a `real`: {tipo:'igual'|'gasto'|'ingreso'|'monto'|'invalido'|'fuera', diff, disponible}.
   'monto' = todavía no anotaste gastos ni pagaste fijos: lo que decís pasa a ser la plata del plan (no hay nada que ajustar). */
export function previaSaldo(state,real,hoy){
  var d=disponible(state);
  if(real===null||real===undefined||!isFinite(real)||real<0)return {tipo:'invalido',diff:0,disponible:d};
  if(hoy>=state.plan.cobro)return {tipo:'fuera',diff:0,disponible:d};
  var diff=r2(d-real);
  if(Math.abs(diff)<0.5)return {tipo:'igual',diff:0,disponible:d};
  var sinMov=planCalc(state).spentInPlan===0&&fijosPagados(state)===0;
  return {tipo:sinMov?'monto':(diff>0?'gasto':'ingreso'),diff:Math.abs(diff),disponible:d};
}
/* Aplica el ajuste. Devuelve {tipo, diff, id?, montoAntes?} para poder deshacerlo. */
export function ajustarSaldo(state,real,hoy){
  var p=previaSaldo(state,real,hoy);
  if(p.tipo==='gasto'){
    var ayer=iso(addDays(parse(hoy),-1)),fecha=ayer<state.plan.inicio?state.plan.inicio:ayer;
    if(fecha<state.plan.inicio)fecha=state.plan.inicio;
    var g={id:uid(),fecha:fecha,monto:p.diff,nota:'Ajuste de saldo',cat:'Otros',src:'ajuste'};
    state.gastos.push(g);
    return {tipo:'gasto',diff:p.diff,id:g.id};
  }
  if(p.tipo==='ingreso'||p.tipo==='monto'){
    var antes=num(state.plan.monto);
    state.plan.monto=p.tipo==='monto'?r2(real):r2(antes+p.diff);
    return {tipo:p.tipo,diff:p.diff,montoAntes:antes};
  }
  return {tipo:p.tipo,diff:0};
}
export function deshacerAjuste(state,r){
  if(r.tipo==='gasto')state.gastos=state.gastos.filter(function(g){return g.id!==r.id});
  else if(r.tipo==='ingreso'||r.tipo==='monto')state.plan.monto=r.montoAntes;
}

/* Lo máximo que se puede guardar ahora: la plata que tenés menos los fijos que todavía faltan pagar */
export function fijosPendientes(state,pc){
  pc=pc||planCalc(state);
  return Math.max(0,pc.fijos-Math.min(pc.fijos,fijosPagadosParte(state)));
}
export function maxAhorro(state,pc){
  pc=pc||planCalc(state);
  return Math.max(0,r2(disponible(state,pc)-fijosPendientes(state,pc)));
}
