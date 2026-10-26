/* El pacto (puro, sin DOM): los tres datos con los que arranca el libro.
   - total: con cuánta plata empezás (pesos + dólares × cotización).
   - ahorro: cuánto de eso querés guardar.
   - cobro: qué día volvés a cobrar.
   Los tres viven en state.plan (monto, ahorro, cobro), igual que siempre: ningún número se guarda dos veces.
   state.pacto solo anota cuándo se selló, cuántos pactos llevás y si parte de la plata era en dólares. */
import {num} from './util.js';
import {iso,parse,addDays,diffDays,esFeriado,esLaborable,bizRank} from './fechas.js';
import {planCalc,cobroDesde,cfgCobro} from './plan.js';

/* Por debajo de esto por día se avisa (sin bloquear): es poco para el día a día */
export var DIA_BAJO=300;

export function pactoBase(){return {sellado:null,numero:0,usd:0}}

/* Pesos + dólares a la cotización que pusiste, redondeado a pesos */
export function totalPacto(pesos,usd,cotiz){
  var t=Math.max(0,num(pesos))+(num(usd)>0&&num(cotiz)>0?num(usd)*num(cotiz):0);
  return Math.round(t);
}

/* El cobro que te propone el libro: con el perfil de sueldo, su regla (5.º día hábil, último hábil o día fijo);
   sin perfil, el 5.º día hábil. Solo cuentan los feriados no laborables (fechas.js). */
export function sugerirCobro(st,hoy){
  var conPerfil=!!(st&&st.perfil&&st.perfil.hecho);
  var cfg=conPerfil?cfgCobro(st):{tipo:'habil5'};
  return {fecha:cobroDesde(hoy,cfg),perfil:conPerfil,tipo:cfg.tipo||'habil5'};
}

/* Copia del estado con el pacto puesto, para hacer las cuentas sin tocar el original */
function conPacto(st,d,hoy){
  var plan=Object.assign({},st.plan,{monto:Math.max(0,num(d.total)),modo:'monto',ahorro:Math.max(0,Math.round(num(d.ahorro))),inicio:hoy,cobro:d.cobro});
  return Object.assign({},st,{plan:plan,gastos:[]});
}
function fechaOk(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&iso(parse(s))===s}

/* Lo que se ve al instante: cuánto queda para gastar, por día y por cuántos días.
   Los fijos que vencen antes de cobrar se descuentan primero (con un pacto nuevo y fijos ya cargados). */
export function cuentaPacto(st,d,hoy){
  var total=Math.max(0,num(d.total)),cobro=fechaOk(d.cobro)&&d.cobro>hoy?d.cobro:sugerirCobro(st,hoy).fecha;
  var pc=planCalc(conPacto(st,{total:total,ahorro:d.ahorro,cobro:cobro},hoy));
  var maxAhorro=Math.max(0,total-pc.fijos),ahorro=Math.min(Math.max(0,Math.round(num(d.ahorro))),maxAhorro);
  var gastar=Math.max(0,total-pc.fijos-ahorro);
  return {total:total,ahorro:ahorro,pct:total>0?ahorro/total:0,fijos:pc.fijos,maxAhorro:maxAhorro,gastar:gastar,dias:pc.total,porDia:gastar/pc.total,cobro:cobro};
}

/* Valida los tres datos. Devuelve {ok, errores:{total?,ahorro?,cobro?}, avisos:[texto], cuenta}.
   Los errores frenan; los avisos son amables y no bloquean. */
export function validarPacto(st,d,hoy){
  var e={},avisos=[],total=num(d.total),ahorro=num(d.ahorro);
  if(!(total>0))e.total='Escribí con cuánta plata empezás: tiene que ser más que cero.';
  if(d.ahorro===''||d.ahorro===null||d.ahorro===undefined||!isFinite(ahorro)||ahorro<0)e.ahorro='Elegí cuánto querés ahorrar (puede ser poquito).';
  else if(total>0&&ahorro>total)e.ahorro='No podés ahorrar más de lo que tenés: como mucho, todo.';
  if(!fechaOk(d.cobro))e.cobro='Elegí qué día volvés a cobrar.';
  else if(d.cobro<=hoy)e.cobro='El día de cobro tiene que ser después de hoy.';
  var c=cuentaPacto(st,d,hoy);
  if(!e.ahorro&&!e.total&&ahorro>c.maxAhorro+0.5)e.ahorro='fijos'; /* la pantalla dice el máximo con money() */
  if(!e.total&&!e.ahorro&&!e.cobro){
    if(ahorro<0.5)avisos.push('cero');
    if(c.porDia<DIA_BAJO)avisos.push('bajo');
  }
  return {ok:!Object.keys(e).length,errores:e,avisos:avisos,cuenta:c};
}

/* Paso del control deslizante del ahorro: fino con poca plata, de a $ 100 con más */
export function pasoAhorro(total){var t=num(total);return t>=20000?100:t>=2000?50:10}
/* Atajos 10, 20 y 30 % del total, redondeados al paso */
export function atajosPacto(total){
  var t=num(total),p=pasoAhorro(t);if(!(t>0))return [];
  return [10,20,30].map(function(pct){return {pct:pct,monto:Math.round(t*pct/100/p)*p}});
}

/* Sella el pacto: pasa los tres datos al plan (que es de donde sale todo) y anota el sello.
   El plan arranca hoy. Si había dólares, la cotización queda como la del día en Ajustes. */
export function sellarPacto(st,d,hoy){
  var v=validarPacto(st,d,hoy);if(!v.ok)return v;
  var p=st.plan;
  p.monto=Math.round(num(d.total));p.modo='monto';p.ahorro=Math.round(v.cuenta.ahorro);p.inicio=hoy;p.cobro=d.cobro;
  if(!st.pacto)st.pacto=pactoBase();
  st.pacto.sellado=hoy;st.pacto.numero=(Math.round(num(st.pacto.numero))||0)+1;
  st.pacto.usd=num(d.usd)>0&&num(d.cotiz)>0?Math.round(num(d.usd)*100)/100:0;
  if(st.pacto.usd&&st.monedas){st.monedas.cotizacion=num(d.cotiz);st.monedas.fecha=hoy}
  return v;
}

/* Quien ya usaba la app no ve el prólogo: su plan de siempre pasa a ser su pacto, sellado el día que empezó. */
export function pactoDesdePlan(st,hoy){
  var p=st.plan||{};
  return {sellado:fechaOk(p.inicio)?p.inicio:hoy,numero:1,usd:0};
}

/* Calendario del mes (para elegir el cobro): semanas de lunes a domingo, con huecos (null) al principio y al final.
   Cada día: {fecha, dia, pasado, hoy, feriado (solo los no laborables), habil (n.º de día hábil o null)} */
export function mesCalendario(y,m,hoy){
  var b=new Date(y,m,1,12);y=b.getFullYear();m=b.getMonth();
  var lead=(b.getDay()+6)%7,celdas=[],d=b;
  for(var i=0;i<lead;i++)celdas.push(null);
  while(d.getMonth()===m){
    var s=iso(d);
    celdas.push({fecha:s,dia:d.getDate(),pasado:s<=hoy,hoy:s===hoy,feriado:esFeriado(s)&&!esLaborable(s),habil:bizRank(s)});
    d=addDays(d,1);
  }
  while(celdas.length%7)celdas.push(null);
  var semanas=[];for(var k=0;k<celdas.length;k+=7)semanas.push(celdas.slice(k,k+7));
  return {y:y,m:m,semanas:semanas};
}

/* Texto corto de días: "1 día", "23 días" */
export function diasTxt(a,b){var n=diffDays(a,b);return n+' '+(n===1?'día':'días')}
