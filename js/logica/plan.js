/* Plan hasta cobrar, semanas, fijos del período y próximo cobro (puro, sin DOM). */
import {iso,parse,addDays,diffDays,bizRank} from './fechas.js';
import {num} from './util.js';

/* Para gastar = plata − fijos que vencen antes de cobrar − ahorro. Semanas de 7 días desde el inicio;
   presupuesto de cada una = para gastar × días ÷ días totales, y lo que sobra o falta pasa a la siguiente. */
export function planear(plan,gastos,fijosRes){
  var total=Math.max(1,diffDays(plan.inicio,plan.cobro));
  var ahorro=plan.modo==='monto'?Math.min(Math.max(0,Math.round(plan.ahorro||0)),Math.max(0,plan.monto)):Math.round(plan.monto*plan.pct/100),gastar=plan.monto-ahorro-(fijosRes||0);
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
  return {total:total,ahorro:ahorro,fijos:fijosRes||0,gastar:gastar,daily:gastar/total,weeks:weeks,spentInPlan:inPlan,spentAll:all};
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
export function fijosPeriodoTotal(state){var t=0;fijosPeriodo(state.fijos,state.plan.inicio,state.plan.cobro).forEach(function(o){t+=num(o.f.monto)});return t}
export function totalFijos(fijos){var t=0;fijos.forEach(function(f){t+=num(f.monto)});return t}
/* Pagado: casilla por período, guardada en fijosPagos[fechaDeCobro][id]. */
export function isPagado(state,id){var k=state.plan.cobro;return !!(state.fijosPagos[k]&&state.fijosPagos[k][id])}
export function marcarPagado(state,id,pagado){
  var k=state.plan.cobro;
  if(!state.fijosPagos[k])state.fijosPagos[k]={};
  if(pagado)state.fijosPagos[k][id]=true;else delete state.fijosPagos[k][id];
}

export function planCalc(state){return planear(state.plan,state.gastos,fijosPeriodoTotal(state))}
export function curWeek(pc,hoy){var idx=0;pc.weeks.forEach(function(w,i){if(hoy>=w.start)idx=i});return idx}
/* Índice de la semana del plan donde cae una fecha, o -1 si queda afuera. */
export function semanaDe(pc,fecha){for(var i=0;i<pc.weeks.length;i++){var w=pc.weeks[i];if(fecha>=w.start&&fecha<=w.end)return i}return -1}

/* Próximo cobro: 5.º día hábil del mes (lunes a viernes, sin feriados). */
export function quintoHabil(y,m){
  var base=new Date(y,m,1,12);y=base.getFullYear();m=base.getMonth();
  for(var d=1;d<=31;d++){var dt=new Date(y,m,d,12);if(dt.getMonth()!==m)break;var s=iso(dt);if(bizRank(s)===5)return s}
  return iso(new Date(y,m,7,12));
}
export function nextCobro(s){var p=parse(s);return quintoHabil(p.getFullYear(),p.getMonth()+1)}

/* "Cuando cobres": líquido estimado − fijos del mes − meta = libre para el mes siguiente. */
export function proximo(state,L){
  var p=state.plan,nc=nextCobro(p.cobro),dias=Math.max(1,diffDays(p.cobro,nc));
  var fij=totalFijos(state.fijos),meta=p.modo==='monto'?Math.max(0,Math.round(num(p.ahorro))):Math.round(L.liquido*num(p.pct)/100);
  var libre=L.liquido-fij-meta;
  return {nc:nc,dias:dias,fij:fij,meta:meta,libre:libre,dia:libre/dias,semana:libre*7/dias};
}
