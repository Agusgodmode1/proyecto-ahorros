/* El reparto del mes y el sobre de compras (2.39, 2.40; puro). Una capa sobre el plan de siempre (plan.js no cambia),
   antes del ajuste de fin de mes:
   - Reparto (plan.reparto): 'parejo' (cada semana según sus días, como siempre) o 'recomendado': la primera semana
     pesa 0,8, la última 1,2 y las del medio 1 (con 4 semanas iguales: 20 / 25 / 25 / 30 %). Arrancar liviano después
     de cobrar y llegar con colchón al final.
   - Sobre de compras e imprevistos (plan.compras, en pesos): sale de la plata para gastar y no entra en las semanas.
     Los gastos marcados {sobre:'compras'} salen de acá; si te pasás del sobre, lo de más cuenta en la semana de ese gasto.
   Con reparto parejo y sin sobre, las semanas dan idénticas al plan de siempre.
   Por qué: después de cobrar se gasta de más y a fin de mes se llega justo (Huffman y Barenstein, 2004);
   separar la plata en partes con nombre hace gastar menos (Soman y Cheema, 2011) y los gastos «raros»
   se subestiman casi a la mitad (Sussman y Alter, 2012). */
import {num} from './util.js';

export function pesoSemana(i,n){return n<2?1:i===0?0.8:i===n-1?1.2:1}
/* El reparto recomendado en % para n semanas (de 7 días): lo que muestra la guía */
export function guiaReparto(n){
  var w=[],t=0,i;for(i=0;i<n;i++){w.push(pesoSemana(i,n));t+=w[i]}
  return w.map(function(x){return Math.round(x/t*1000)/10});
}
export function esDeCompras(g){return !!g&&g.sobre==='compras'}

export function aplicarSobres(state,pc){
  var p=state.plan,ws=pc.weeks,n=ws.length;
  var rec=p.reparto==='recomendado',vacio={reparto:rec?'recomendado':'parejo',compras:0,usado:0,queda:0};
  if(!n)return Object.assign({},pc,{sobres:vacio});
  var gastar=Math.max(0,pc.gastar);
  var C=Math.min(Math.max(0,Math.round(num(p.compras))),gastar);
  var desde=ws[0].start,hasta=ws[n-1].end,den=0;
  ws.forEach(function(w,i){den+=w.days*(rec?pesoSemana(i,n):1)});
  /* (2.70) las semanas arrancan en el punto de partida: lo que ya salió del sobre antes de esa fecha no vuelve;
     la plata de las semanas es la del punto de partida (pc.gastarDesde) menos lo que le queda al sobre */
  var usadoAntes=0;
  if(pc.gastarDesde!==undefined)state.gastos.forEach(function(g){if(esDeCompras(g)&&g.fecha>=p.inicio&&g.fecha<desde)usadoAntes+=num(g.monto)});
  usadoAntes=Math.min(C,usadoAntes);
  var base=pc.gastarDesde!==undefined?Math.max(0,pc.gastarDesde)-(C-usadoAntes):gastar-C;
  /* lo que salió del sobre de compras, en orden; lo que pasa del sobre va a la semana de ese gasto */
  var extra={},usado=usadoAntes;
  state.gastos.filter(function(g){return esDeCompras(g)&&g.fecha>=desde&&g.fecha<=hasta})
    .sort(function(a,b){return a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0})
    .forEach(function(g){
      var m=num(g.monto),entra=Math.max(0,Math.min(m,C-usado));usado+=entra;
      if(m>entra)extra[g.fecha]=(extra[g.fecha]||0)+m-entra;
    });
  var carry=0,out=ws.map(function(w,i){
    var spent=0;
    state.gastos.forEach(function(g){if(!esDeCompras(g)&&g.src!=='ajuste'&&g.fecha>=w.start&&g.fecha<=w.end)spent+=num(g.monto)});
    Object.keys(extra).forEach(function(f){if(f>=w.start&&f<=w.end)spent+=extra[f]});
    var budget=base*w.days*(rec?pesoSemana(i,n):1)/den,avail=budget+carry,left=avail-spent;
    carry=left;
    return Object.assign({},w,{budget:budget,carry:avail-budget,avail:avail,spent:spent,left:left});
  });
  return Object.assign({},pc,{weeks:out,sobres:{reparto:vacio.reparto,compras:C,usado:usado,queda:C-usado}});
}

/* Los gastos que cuentan para el día: los del sobre de compras no bajan lo de hoy, y (2.70) un «Ajuste de saldo»
   tampoco, aunque tenga la fecha de hoy: no es algo que gastaste hoy (igual baja lo que te queda de la semana) */
export function gastosDelDia(gastos){return gastos.filter(function(g){return !esDeCompras(g)&&g.src!=='ajuste'})}
