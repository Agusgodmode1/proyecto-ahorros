/* Configuración inicial guiada: cuentas puras (sin pantalla). Todo sale del mismo estado: plan, fijos y perfil. */
import {num} from './util.js';
import {planCalc,totalFijos} from './plan.js';
import {maxAhorro} from './saldo.js';

/* Atajos de meta: 10, 20 y 30 % de lo que cobrás, redondeado a $ 100 */
export function atajosMeta(liquido){
  var l=num(liquido);
  if(!(l>0))return [];
  return [10,20,30].map(function(pct){return {pct:pct,monto:Math.round(l*pct/100/100)*100}});
}
/* Copia del estado con la plata de hoy y la meta puestas (no toca el original) */
function conPlan(st,saldo,meta){
  return Object.assign({},st,{plan:Object.assign({},st.plan,{monto:Math.max(0,num(saldo)),modo:'monto',ahorro:Math.max(0,num(meta))})});
}
/* Lo que muestra el resumen final: cuánto queda para gastar y por día; y si la meta no se puede, cuál sí */
export function resumenInicio(st,saldo,meta){
  var t=conPlan(st,saldo,meta),pc=planCalc(t),mx=maxAhorro(t,pc);
  return {gastar:Math.max(0,pc.gastar),porDia:Math.max(0,pc.daily),dias:pc.total,fijos:pc.fijos,maxAhorro:mx,metaPosible:Math.floor(mx),ok:num(meta)<=mx+0.5};
}
/* Fondo de emergencia: 3 meses de lo que gastás (fijos + lo que te queda para gastar), a miles. null si no hay datos. */
export function fondoEmergencia(st){
  var pc=planCalc(st),base=totalFijos(st.fijos,st)+Math.max(0,pc.gastar);
  if(!(base>0))return null;
  return Math.max(1000,Math.round(base*3/1000)*1000);
}
