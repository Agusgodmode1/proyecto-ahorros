/* Plan hasta cobrar, semanas, fijos del período y próximo cobro (puro, sin DOM). */
import {iso,parse,addDays,diffDays,bizRank} from './fechas.js';
import {num} from './util.js';

/* Para gastar = plata − fijos que vencen antes de cobrar − ahorro. Semanas de 7 días desde el inicio;
   presupuesto de cada una = para gastar × días ÷ días totales, y lo que sobra o falta pasa a la siguiente. */
export function planear(plan,gastos,fijosRes){
  var total=Math.max(1,diffDays(plan.inicio,plan.cobro));
  /* Tope: no se puede guardar más de lo que queda después de los fijos (si no, "para gastar" daría negativo) */
  var tope=Math.max(0,plan.monto-(fijosRes||0));
  var pedido=plan.modo==='monto'?Math.min(Math.max(0,Math.round(plan.ahorro||0)),Math.max(0,plan.monto)):Math.round(plan.monto*plan.pct/100);
  var ahorro=Math.min(pedido,tope),gastar=plan.monto-ahorro-(fijosRes||0);
  var weeks=[],off=0,w=0,carry=0;
  while(off<total){
    var len=Math.min(7,total-off),s=addDays(parse(plan.inicio),off),e=addDays(s,len-1);
    var si=iso(s),ei=iso(e),spent=0;
    for(var k=0;k<gastos.length;k++){var g=gastos[k];if(g.fecha>=si&&g.fecha<=ei)spent+=g.monto}
    var budget=gastar*len/total,avail=budget+carry,left=avail-spent;
    weeks.push({i:w,start:si,end:ei,days:len,budget:budget,carry:carry,avail:avail,spent:spent,left:left});
    carry=left;off+=len;w++;
  }
  var inPlan=0;
  for(var j=0;j<weeks.length;j++)inPlan+=weeks[j].spent;
  var all=0;for(var q=0;q<gastos.length;q++)all+=gastos[q].monto;
  return {total:total,ahorro:ahorro,ahorroPedido:pedido,fijos:fijosRes||0,gastar:gastar,daily:gastar/total,weeks:weeks,spentInPlan:inPlan,spentAll:all};
}

/* Fijos: vencen en el período si su día cae entre el inicio (incluido) y el cobro (excluido).
   Si el mes es más corto, se usa el último día del mes. */
export function diaEn(y,m,dia){var last=new Date(y,m+1,0,12).getDate();return iso(new Date(y,m,Math.min(Math.max(1,dia),last),12))}
export function fijosPeriodo(fijos,desde,hasta){
  var out=[],a=parse(desde),b=parse(hasta);
  fijos.forEach(function(f){
    var dia=Math.round(num(f.dia))||1,cur=new Date(a.getFullYear(),a.getMonth(),1,12),end=new Date(b.getFullYear(),b.getMonth(),1,12);
    while(cur<=end){
      var fe=diaEn(cur.getFullYear(),cur.getMonth(),dia);
      if(fe>=desde&&fe<hasta)out.push({f:f,fecha:fe});
      cur=new Date(cur.getFullYear(),cur.getMonth()+1,1,12);
    }
  });
  return out.sort(function(x,y){return x.fecha<y.fecha?-1:1});
}
/* ---------- Pagos de los fijos ----------
   fijosPagos[fechaDeCobro][id] = {monto, fecha, nombre, usd?} con lo que pagaste de verdad
   (o true, en los pagos marcados antes de guardar el monto).
   - Un fijo "variable" (UTE, OSE…) espera el promedio de sus últimos 3 pagos.
   - Un fijo "pago de tarjeta" no se resta del presupuesto: lo que compraste con la tarjeta ya está en tus gastos. */
export function pagoDe(state,id,k){var m=state.fijosPagos[k||state.plan.cobro];var v=m&&m[id];return v?(typeof v==='object'?v:{}):null}
export function isPagado(state,id){return !!pagoDe(state,id)}
export function marcarPagado(state,id,pagado,datos){
  var k=state.plan.cobro;
  if(!state.fijosPagos[k])state.fijosPagos[k]={};
  if(pagado)state.fijosPagos[k][id]=datos&&typeof datos==='object'?datos:true;else delete state.fijosPagos[k][id];
}
/* Pagos anotados de un fijo, del más nuevo al más viejo: [{k, monto, fecha}] */
export function pagosDe(state,id){
  return Object.keys(state.fijosPagos||{}).sort().reverse().map(function(k){var v=state.fijosPagos[k][id];return v&&typeof v==='object'&&num(v.monto)>0?{k:k,monto:num(v.monto),fecha:v.fecha||null}:null}).filter(Boolean);
}
/* Cuánto se espera pagar: el monto del fijo, o el promedio de los últimos 3 pagos si es variable */
export function montoEsperado(state,f){
  if(f.variable){var ps=pagosDe(state,f.id).slice(0,3);if(ps.length){var t=0;ps.forEach(function(x){t+=x.monto});return Math.round(t/ps.length)}}
  return num(f.monto);
}
/* Cuánto cuenta en este período: lo que pagaste de verdad, o lo esperado si todavía no */
export function montoDelPeriodo(state,f){var p=pagoDe(state,f.id);return p&&num(p.monto)>0?num(p.monto):montoEsperado(state,f)}
export function cuentaEnPresupuesto(f){return !f.tarjeta}
export function fijosPeriodoTotal(state){var t=0;fijosPeriodo(state.fijos,state.plan.inicio,state.plan.cobro).forEach(function(o){if(cuentaEnPresupuesto(o.f))t+=montoDelPeriodo(state,o.f)});return t}
/* Total de los fijos de un mes (sin el pago de la tarjeta). Con state, los variables usan su promedio. */
export function totalFijos(fijos,state){var t=0;fijos.forEach(function(f){if(cuentaEnPresupuesto(f))t+=state?montoEsperado(state,f):num(f.monto)});return t}

export function planCalc(state){return planear(state.plan,state.gastos,fijosPeriodoTotal(state))}
/* Cuánto podés gastar hoy: lo que le queda a la semana (sumando lo que ya gastaste hoy), repartido parejo
   en los días que le quedan, menos lo de hoy. Fuera del plan devuelve el promedio diario. */
export function hoyPodes(pc,gastos,hoy){
  var i=semanaDe(pc,hoy);
  if(i<0)return {dentro:false,porDia:pc.daily,queda:pc.daily,gastadoHoy:0};
  var w=pc.weeks[i],rem=diffDays(hoy,w.end)+1,gh=0;
  gastos.forEach(function(g){if(g.fecha===hoy)gh+=num(g.monto)});
  var porDia=(w.left+gh)/rem;
  return {dentro:true,semana:i,dias:rem,gastadoHoy:gh,porDia:porDia,queda:porDia-gh,semanaQueda:w.left,fin:w.end};
}
export function curWeek(pc,hoy){var idx=0;pc.weeks.forEach(function(w,i){if(hoy>=w.start)idx=i});return idx}
/* Índice de la semana del plan donde cae una fecha, o -1 si queda afuera. */
export function semanaDe(pc,fecha){for(var i=0;i<pc.weeks.length;i++){var w=pc.weeks[i];if(fecha>=w.start&&fecha<=w.end)return i}return -1}

/* Día de cobro según el perfil: cfg = {tipo:'habil5'|'ultimoHabil'|'fijo', dia:N}.
   5.º día hábil = lunes a viernes, sin feriados. */
export function quintoHabil(y,m){
  var base=new Date(y,m,1,12);y=base.getFullYear();m=base.getMonth();
  for(var d=1;d<=31;d++){var dt=new Date(y,m,d,12);if(dt.getMonth()!==m)break;var s=iso(dt);if(bizRank(s)===5)return s}
  return iso(new Date(y,m,7,12));
}
export function ultimoHabil(y,m){
  var base=new Date(y,m+1,0,12);
  while(bizRank(iso(base))===null)base=addDays(base,-1);
  return iso(base);
}
/* Fecha de cobro del mes m (0 = enero; se aceptan desbordes, 12 = enero del año siguiente). */
export function fechaCobro(y,m,cfg){
  var t=cfg&&cfg.tipo;
  if(t==='ultimoHabil')return ultimoHabil(y,m);
  if(t==='fijo'){var base=new Date(y,m,1,12),last=new Date(base.getFullYear(),base.getMonth()+1,0,12).getDate();
    return iso(new Date(base.getFullYear(),base.getMonth(),Math.min(Math.max(1,Math.round(num(cfg.dia))||1),last),12))}
  return quintoHabil(y,m);
}
export function nextCobro(s,cfg){var p=parse(s);return fechaCobro(p.getFullYear(),p.getMonth()+1,cfg)}
/* Primer cobro después de hoy (para arrancar un plan nuevo). */
export function cobroDesde(hoy,cfg){var p=parse(hoy),f=fechaCobro(p.getFullYear(),p.getMonth(),cfg);return f>hoy?f:fechaCobro(p.getFullYear(),p.getMonth()+1,cfg)}
export function cfgCobro(state){return (state.perfil&&state.perfil.cobro)||{tipo:'habil5'}}

/* "Cuando cobres": líquido estimado − fijos del mes − meta = libre para el mes siguiente. */
export function proximo(state,L){
  var p=state.plan,nc=nextCobro(p.cobro,cfgCobro(state)),dias=Math.max(1,diffDays(p.cobro,nc));
  var fij=totalFijos(state.fijos,state),metaPedida=p.modo==='monto'?Math.max(0,Math.round(num(p.ahorro))):Math.round(L.liquido*num(p.pct)/100);
  /* Tope: no se puede guardar más de lo que cobrás menos los fijos */
  var meta=Math.min(metaPedida,Math.max(0,L.liquido-fij));
  var libre=L.liquido-fij-meta;
  return {nc:nc,dias:dias,fij:fij,meta:meta,metaPedida:metaPedida,libre:libre,dia:libre/dias,semana:libre*7/dias};
}
