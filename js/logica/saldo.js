/* Saldo disponible y ajuste de saldo (puro, sin DOM).
   - disponible: la plata que deberías tener en la cuenta y en efectivo según lo anotado:
     lo que tenías al empezar el plan − gastos anotados − fijos que ya pagaste.
   - ajustarSaldo: vos decís cuánta plata tenés de verdad y la app anota la diferencia:
     si tenés menos, es un gasto "Ajuste de saldo" (cae el día anterior, así no te arruina el de hoy);
     si tenés más, se suma a lo que tenías (plata que te entró).
   - topes: nunca un saldo negativo, y un gasto nuevo no puede ser mayor que lo disponible.
   - (2.45) Sin anotar cada gasto (lo de siempre desde 2.45): lo que falta se reparte en partes iguales entre los días
     desde la última vez que actualizaste (`plan.saldoFecha`) hasta ayer; si ya actualizaste hoy, cae hoy. */
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
/* (2.45) ¿Anotás cada gasto? Si no (lo de siempre), la app funciona con lo que tenés. */
export function anotaGastos(state){return !!(state.perfil&&state.perfil.anotarGastos)}
/* Los días en que se reparte lo gastado: [desde, hasta] */
export function diasDelAjuste(state,hoy){
  var ini=state.plan.inicio,u=state.plan.saldoFecha,ayer=iso(addDays(parse(hoy),-1));
  if(!u||u>=hoy||ayer<ini){var f=u&&u>=hoy?hoy:(ayer<ini?ini:ayer);if(f<ini)f=ini;return [f,f]}
  return [u<ini?ini:u,ayer];
}
function partes(total,n){
  var b=Math.floor(total/n),out=[],acc=0;
  for(var k=0;k<n;k++){var v=k===n-1?r2(total-acc):b;out.push(v);acc+=v}
  return out;
}
export function previaSaldo(state,real,hoy){
  var d=disponible(state);
  if(real===null||real===undefined||!isFinite(real)||real<0)return {tipo:'invalido',diff:0,disponible:d};
  if(hoy>=state.plan.cobro)return {tipo:'fuera',diff:0,disponible:d};
  var diff=r2(d-real);
  if(Math.abs(diff)<0.5)return {tipo:'igual',diff:0,disponible:d};
  /* sin movimientos todavía: el primer día del plan, lo que decís pasa a ser la plata del plan */
  var sinMov=planCalc(state).spentInPlan===0&&fijosPagados(state)===0&&(anotaGastos(state)||hoy<=state.plan.inicio);
  var dd=diasDelAjuste(state,hoy);
  return {tipo:sinMov?'monto':(diff>0?'gasto':'ingreso'),diff:Math.abs(diff),disponible:d,desde:dd[0],hasta:dd[1]};
}
/* Aplica el ajuste. Devuelve {tipo, diff, id?, montoAntes?} para poder deshacerlo. */
export function ajustarSaldo(state,real,hoy){
  var p=previaSaldo(state,real,hoy),antesF=state.plan.saldoFecha;
  if(p.tipo==='invalido'||p.tipo==='fuera')return {tipo:p.tipo,diff:0};
  state.plan.saldoFecha=hoy;
  if(p.tipo==='gasto'){
    var a=parse(p.desde),n=Math.max(1,Math.round((parse(p.hasta)-a)/864e5)+1),ms=partes(p.diff,n),ids=[];
    ms.forEach(function(m,k){
      if(!(m>0))return;
      var g={id:uid(),fecha:iso(addDays(a,k)),monto:m,nota:'Ajuste de saldo',cat:'Otros',src:'ajuste'};
      state.gastos.push(g);ids.push(g.id);
    });
    return {tipo:'gasto',diff:p.diff,id:ids[0],ids:ids,desde:p.desde,hasta:p.hasta,fechaAntes:antesF};
  }
  if(p.tipo==='ingreso'||p.tipo==='monto'){
    var antes=num(state.plan.monto);
    state.plan.monto=p.tipo==='monto'?r2(real):r2(antes+p.diff);
    return {tipo:p.tipo,diff:p.diff,montoAntes:antes,fechaAntes:antesF};
  }
  return {tipo:p.tipo,diff:0,fechaAntes:antesF};
}
export function deshacerAjuste(state,r){
  if('fechaAntes' in r){if(r.fechaAntes===undefined)delete state.plan.saldoFecha;else state.plan.saldoFecha=r.fechaAntes}
  if(r.tipo==='gasto'){var ids=r.ids||[r.id];state.gastos=state.gastos.filter(function(g){return ids.indexOf(g.id)<0})}
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
