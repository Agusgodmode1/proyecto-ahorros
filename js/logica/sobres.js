/* Los sobres del mes (2.39, puro). Una capa sobre el plan de siempre (plan.js no cambia), antes del ajuste de fin de mes:
   - Sobre de compras e imprevistos (plan.compras, en pesos): sale de la plata para gastar y no entra en las semanas.
     Los gastos marcados {sobre:'compras'} salen de acá; si te pasás del sobre, lo de más cuenta en la semana de ese gasto.
   - Colchón de fin de mes (plan.colchon, % de lo que queda para las semanas): se guarda para la última semana.
     Con una sola semana no hay colchón.
   Sin sobres (colchón 0 y compras 0) las semanas dan idénticas al plan de siempre.
   Por qué: después de cobrar se gasta de más y a fin de mes se llega justo (Huffman y Barenstein, 2004);
   separar la plata en partes con nombre hace gastar menos (Soman y Cheema, 2011) y los gastos «raros»
   se subestiman casi a la mitad (Sussman y Alter, 2012). */
import {num} from './util.js';

export var COLCHON_DEF=10;
export var COLCHON_OPC=[0,5,10,15];
export function esDeCompras(g){return !!g&&g.sobre==='compras'}

export function aplicarSobres(state,pc){
  var p=state.plan,ws=pc.weeks,n=ws.length;
  var vacio={pct:0,colchon:0,compras:0,usado:0,queda:0,ultima:n?ws[n-1].start:null};
  if(!n)return Object.assign({},pc,{sobres:vacio});
  var gastar=Math.max(0,pc.gastar);
  var C=Math.min(Math.max(0,Math.round(num(p.compras))),gastar);
  var pct=n>1?Math.max(0,Math.min(30,num(p.colchon))):0;
  var K=Math.round((gastar-C)*pct/100);
  var base=gastar-C-K,desde=ws[0].start,hasta=ws[n-1].end;
  /* lo que salió del sobre de compras, en orden; lo que pasa del sobre va a la semana de ese gasto */
  var extra={},usado=0;
  state.gastos.filter(function(g){return esDeCompras(g)&&g.fecha>=desde&&g.fecha<=hasta})
    .sort(function(a,b){return a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0})
    .forEach(function(g){
      var m=num(g.monto),entra=Math.max(0,Math.min(m,C-usado));usado+=entra;
      if(m>entra)extra[g.fecha]=(extra[g.fecha]||0)+m-entra;
    });
  var carry=0,out=ws.map(function(w,i){
    var spent=0;
    state.gastos.forEach(function(g){if(!esDeCompras(g)&&g.fecha>=w.start&&g.fecha<=w.end)spent+=num(g.monto)});
    Object.keys(extra).forEach(function(f){if(f>=w.start&&f<=w.end)spent+=extra[f]});
    var budget=base*w.days/pc.total+(i===n-1?K:0),avail=budget+carry,left=avail-spent;
    carry=left;
    return Object.assign({},w,{budget:budget,carry:avail-budget,avail:avail,spent:spent,left:left});
  });
  return Object.assign({},pc,{weeks:out,sobres:{pct:pct,colchon:K,compras:C,usado:usado,queda:C-usado,ultima:ws[n-1].start}});
}

/* Los gastos que cuentan para el día (los del sobre de compras no bajan lo de hoy) */
export function gastosDelDia(gastos){return gastos.filter(function(g){return !esDeCompras(g)})}
