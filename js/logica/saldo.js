/* Saldo disponible y ajuste de saldo (puro, sin DOM).
   - disponible: la plata que deberías tener en la cuenta y en efectivo según lo anotado:
     lo que tenías al empezar el plan − gastos anotados − fijos que ya pagaste.
   - ajustarSaldo: vos decís cuánta plata tenés de verdad y la app anota la diferencia:
     si tenés menos, es un gasto "Ajuste de saldo" (cae el día anterior, así no te arruina el de hoy);
     si tenés más, se suma a lo que tenías (plata que te entró).
   - topes: nunca un saldo negativo, y un gasto nuevo no puede ser mayor que lo disponible. */
import {num,uid} from './util.js';
import {addDays,parse,iso} from './fechas.js';
import {fijosPeriodo,cuentaEnPresupuesto,isPagado,montoDelPeriodo,planCalc} from './plan.js';

function r2(n){return Math.round(n*100)/100}

export function fijosPagados(state){
  var t=0;
  fijosPeriodo(state.fijos,state.plan.inicio,state.plan.cobro).forEach(function(o){
    if(cuentaEnPresupuesto(o.f)&&isPagado(state,o.f.id))t+=montoDelPeriodo(state,o.f);
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
/* Qué haría actualizar el saldo a `real`: {tipo:'igual'|'gasto'|'ingreso'|'invalido'|'fuera', diff, disponible} */
export function previaSaldo(state,real,hoy){
  var d=disponible(state);
  if(real===null||real===undefined||!isFinite(real)||real<0)return {tipo:'invalido',diff:0,disponible:d};
  if(hoy>=state.plan.cobro)return {tipo:'fuera',diff:0,disponible:d};
  var diff=r2(d-real);
  if(Math.abs(diff)<0.5)return {tipo:'igual',diff:0,disponible:d};
  return {tipo:diff>0?'gasto':'ingreso',diff:Math.abs(diff),disponible:d};
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
  if(p.tipo==='ingreso'){
    var antes=num(state.plan.monto);
    state.plan.monto=r2(antes+p.diff);
    return {tipo:'ingreso',diff:p.diff,montoAntes:antes};
  }
  return {tipo:p.tipo,diff:0};
}
export function deshacerAjuste(state,r){
  if(r.tipo==='gasto')state.gastos=state.gastos.filter(function(g){return g.id!==r.id});
  else if(r.tipo==='ingreso')state.plan.monto=r.montoAntes;
}
