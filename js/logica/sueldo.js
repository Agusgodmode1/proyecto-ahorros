/* Liquidación del sueldo (puro, sin DOM). Reglas validadas con los recibos reales: no cambiarlas.
   - Hora normal = nominal ÷ 240. Extra de semana = doble (heCom). Fin de semana/feriado = heEsp + bonoHora.
   - Minutos de semana del mes: se suman y se redondean a la media hora más cercana.
   - Las horas de un mes se cobran el 5.º día hábil del mes siguiente (mesTrabajo). */
import {parse,pad} from './fechas.js';
import {num} from './util.js';

export function irpfPrimario(N,bpc){
  var cuts=[0,7,10,15,30,50,75,115],rates=[0,.10,.15,.24,.25,.27,.31,.36],t=0;
  for(var i=0;i<cuts.length;i++){
    var lo=cuts[i]*bpc,hi=i+1<cuts.length?cuts[i+1]*bpc:Infinity;
    if(N>lo)t+=(Math.min(N,hi)-lo)*rates[i];
  }
  return t;
}
export function liquidar(o){
  var extraCom=o.minCom/60*o.rateCom,extraEsp=o.minEsp/60*o.rateEsp,bono=o.bono||0;
  var N=o.nominal+bono+extraCom+extraEsp;
  var base=N<=2.5*o.bpc?0.03:0.045;
  var fr=base+(o.hijos>0?0.015:0)+(o.conyuge?0.02:0);
  var mont=N*0.15,fon=N*fr,frl=N*0.001;
  var prim=irpfPrimario(N,o.bpc);
  var c=N<15*o.bpc?0.14:0.08;
  var cred=c*(mont+fon+frl);
  var irpf=Math.max(0,prim-cred);
  var liq=N-mont-fon-frl-irpf-o.otros;
  return {bono:bono,extraCom:extraCom,extraEsp:extraEsp,N:N,fonRate:fr,mont:mont,fon:fon,frl:frl,prim:prim,cred:cred,irpf:irpf,otros:o.otros,liquido:liq,minimo:7*o.bpc};
}

/* Mes de trabajo: el anterior al mes de cobro ('aaaa-mm'). */
export function mesTrabajo(plan){var p=parse(plan.cobro),d=new Date(p.getFullYear(),p.getMonth()-1,1,12);return d.getFullYear()+'-'+pad(d.getMonth()+1)}
export function mins(state,tipo){var t=0,mt=mesTrabajo(state.plan);state.horas.forEach(function(h){if(h.tipo===tipo&&String(h.fecha).slice(0,7)===mt)t+=h.min});return t}
export function bonoTotal(state){var s=state.sueldo;return num(s.bonoFijo)+num(s.bonoHora)*mins(state,'fin')/60}
export function pagoSem(state){
  var m=mins(state,'sem');
  if(state.sueldo.redondeo===false)return m;
  return Math.floor((m/60)*2+0.5)/2*60;
}
export function liq(state,conExtras){
  var s=state.sueldo;
  return liquidar({nominal:num(s.nominal),bono:conExtras?bonoTotal(state):num(s.bonoFijo),minCom:conExtras?pagoSem(state):0,minEsp:conExtras?mins(state,'fin'):0,rateCom:num(s.heCom),rateEsp:num(s.heEsp),hijos:num(s.hijos),conyuge:!!s.conyuge,otros:num(s.otros),bpc:num(s.bpc)||6864});
}
