/* La liquidación completa (2.12, puro): lo de sueldo.js (validado con recibos reales: NO se toca) más lo que se sumó después.
   - Cobro con factura (factura.js): lo facturado sin IVA menos tus costos del mes.
   - Feriados con su propio valor (perfil.horas.multFeriado, por ejemplo ×2,5): solo si lo configuraste
     (lo deduce el lector de recibos o lo elegís). Sin esa regla el resultado es idéntico al de sueldo.js. */
import {num} from './util.js';
import {pagaComoFeriado} from './fechas.js';
import {liq,liquidar,tarifas,bonoTotal,pagoSem,mins,mesTrabajo,reglasHoras,ingresoDe,mesIngreso} from './sueldo.js';
import {esFactura,liqFactura} from './factura.js';

/* Minutos de finde o feriado del mes trabajado que caen en un feriado que se paga como tal */
export function minutosFeriado(state){
  var t=0,mt=mesTrabajo(state);
  (state.horas||[]).forEach(function(h){if(h.tipo==='fin'&&String(h.fecha).slice(0,7)===mt&&pagaComoFeriado(h.fecha))t+=num(h.min)});
  return t;
}
export function liqCompleta(state,conExtras){
  if(esFactura(state))return liqFactura(state,mesIngreso(state));
  var L=liq(state,conExtras),R=reglasHoras(state),mf=num(R.multFeriado);
  if(!conExtras||!(mf>0)||ingresoDe(state).tipo!=='uy'||R.activo===false)return L;
  var fm=minutosFeriado(state),t=tarifas(state),extra=fm/60*t.hora*(mf-num(R.multFin));
  if(!(extra>0.005))return L;
  /* lo mismo que hace sueldo.js para el sueldo en Uruguay, con la diferencia del feriado dentro del bono */
  var s=state.sueldo;
  var L2=liquidar({nominal:num(s.nominal),bono:bonoTotal(state)+extra,minCom:pagoSem(state),minEsp:mins(state,'fin'),rateCom:t.heCom,rateEsp:t.heEsp,hijos:num(s.hijos),conyuge:!!s.conyuge,otros:num(s.otros),bpc:num(s.bpc)||6864});
  L2.feriadoExtra=extra;
  return L2;
}
