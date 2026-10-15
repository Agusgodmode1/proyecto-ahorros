/* Liquidación del sueldo (puro, sin DOM). Las reglas de horas salen del perfil (state.perfil.horas):
   - Hora normal = nominal ÷ divisor. Extra de semana = hora × multSem. Fin de semana/feriado = hora × multFin,
     que en el recibo puede venir partida en descanso trabajado (1 hora) + bono (el resto).
   - Minutos de semana del mes: se suman y se redondean (media hora, cuarto de hora o nada).
   - Las horas de un mes se cobran el mes siguiente (o ese mismo mes, según el perfil).
   Los descuentos (BPS, FONASA, FRL, IRPF) son los de la ley uruguaya y no dependen del perfil.
   Tipo de ingreso (state.perfil.ingreso.tipo):
   - 'uy': sueldo en Uruguay, el cálculo de arriba (validado con recibos: no se toca).
   - 'personalizado': sueldo + horas extra con tus reglas, menos tus propios descuentos (% o monto), sin reglas de Uruguay.
   - 'variable': independiente o comisiones; el ingreso de cada mes se carga a mano (sueldo.ingresosMes) y no hay horas extra.
   El ingreso puede ser en pesos o en dólares (ingreso.moneda); todo se pasa a pesos con la cotización de Ajustes. */
import {parse,pad} from './fechas.js';
import {num} from './util.js';
import {cotizacion} from './monedas.js';

export var TIPOS_INGRESO=[['uy','Sueldo en Uruguay'],['personalizado','Sueldo personalizado'],['variable','Independiente o variable']];
export function ingresoDe(state){
  var i=(state&&state.perfil&&state.perfil.ingreso)||{};
  return {tipo:i.tipo==='personalizado'||i.tipo==='variable'?i.tipo:'uy',moneda:i.tipo&&i.tipo!=='uy'&&i.moneda==='USD'?'USD':'UYU'};
}

/* Reglas por defecto: las de Agus, validadas con sus recibos. */
export function horasPorDefecto(){
  return {activo:true,divisor:240,multSem:2,multFin:1.5,finDividido:true,redondeo:'media',umbral:555,jornada:540,mesCobro:'siguiente',entrada:'12:00',salida:'21:00'};
}
export function reglasHoras(state){
  var r=Object.assign(horasPorDefecto(),(state.perfil&&state.perfil.horas)||{});
  /* Con ingreso variable no hay horas extra: lo que cobrás ya las incluye */
  if(ingresoDe(state).tipo==='variable')r.activo=false;
  return r;
}
function r2(x){return Math.round(x*100)/100}

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

/* Valor de cada hora según el perfil, redondeado a centésimos como en el recibo.
   heCom = extra de semana; heEsp = descanso trabajado; bonoHora = parte del bono por hora de finde. */
export function tarifas(state){
  var s=state.sueldo,h=reglasHoras(state),hora=num(s.nominal)/(num(h.divisor)||240);
  var t;
  if(h.finDividido!==false)t={hora:hora,heCom:r2(hora*num(h.multSem)),heEsp:r2(hora),bonoHora:r2(hora*(num(h.multFin)-1))};
  else t={hora:hora,heCom:r2(hora*num(h.multSem)),heEsp:r2(hora*num(h.multFin)),bonoHora:0};
  if(s.tarifaManual)Object.assign(t,{heCom:num(s.tarifaManual.heCom),heEsp:num(s.tarifaManual.heEsp),bonoHora:num(s.tarifaManual.bonoHora)});
  return t;
}

/* Mes de trabajo ('aaaa-mm'): el anterior al mes de cobro, o el mismo si así lo dice el perfil. */
export function mesTrabajo(state){
  var p=parse(state.plan.cobro),atras=reglasHoras(state).mesCobro==='mismo'?0:1;
  var d=new Date(p.getFullYear(),p.getMonth()-atras,1,12);return d.getFullYear()+'-'+pad(d.getMonth()+1);
}
export function mins(state,tipo){
  if(reglasHoras(state).activo===false)return 0;
  var t=0,mt=mesTrabajo(state);state.horas.forEach(function(h){if(h.tipo===tipo&&String(h.fecha).slice(0,7)===mt)t+=h.min});return t;
}
export function bonoTotal(state){return num(state.sueldo.bonoFijo)+tarifas(state).bonoHora*mins(state,'fin')/60}
export function pagoSem(state){
  var m=mins(state,'sem'),r=reglasHoras(state).redondeo;
  if(r==='media')return Math.floor(m/30+0.5)*30;
  if(r==='cuarto')return Math.floor(m/15+0.5)*15;
  return m;
}
/* Minutos extra de un día según la presencia: se cuenta todo lo que pasa la jornada (antes + después),
   si llega al umbral (jornada + 15 min por defecto; 15 justos ya cuentan). */
export function extraDelDia(state,presenciaMin){
  var h=reglasHoras(state);
  return presenciaMin>=num(h.umbral)&&presenciaMin>num(h.jornada)?Math.max(0,Math.round(presenciaMin-num(h.jornada))):0;
}
export function liq(state,conExtras){
  var tipo=ingresoDe(state).tipo;
  if(tipo==='personalizado')return enPesos(state,liqPersonalizado(state,conExtras));
  if(tipo==='variable')return enPesos(state,liqVariable(state));
  return liqUY(state,conExtras);
}
/* Sueldo en Uruguay: el cálculo validado, sin cambios */
function liqUY(state,conExtras){
  var s=state.sueldo,t=tarifas(state);
  return liquidar({nominal:num(s.nominal),bono:conExtras?bonoTotal(state):num(s.bonoFijo),minCom:conExtras?pagoSem(state):0,minEsp:conExtras?mins(state,'fin'):0,rateCom:t.heCom,rateEsp:t.heEsp,hijos:num(s.hijos),conyuge:!!s.conyuge,otros:num(s.otros),bpc:num(s.bpc)||6864});
}

/* Mismos campos que liquidar(), para que el resto de la app no tenga que distinguir el tipo */
function resultado(tipo,N,bono,extraCom,extraEsp,desc,detalle){
  return {tipo:tipo,bono:bono,extraCom:extraCom,extraEsp:extraEsp,N:N,fonRate:0,mont:0,fon:0,frl:0,prim:0,cred:0,irpf:0,otros:desc,liquido:N-desc,minimo:0,descuentos:detalle};
}
/* Sueldo personalizado: nominal + extras (con tus reglas), menos tus descuentos */
function liqPersonalizado(state,conExtras){
  var s=state.sueldo,t=tarifas(state);
  var extraCom=conExtras?pagoSem(state)/60*t.heCom:0,extraEsp=conExtras?mins(state,'fin')/60*t.heEsp:0,bono=conExtras?bonoTotal(state):num(s.bonoFijo);
  var N=num(s.nominal)+bono+extraCom+extraEsp,desc=0;
  var detalle=(Array.isArray(s.descuentos)?s.descuentos:[]).map(function(d){
    var m=d.tipo==='pct'?N*num(d.valor)/100:num(d.valor);desc+=m;
    return {nombre:d.nombre||'Descuento',tipo:d.tipo==='pct'?'pct':'monto',valor:num(d.valor),monto:m};
  });
  return resultado('personalizado',N,bono,extraCom,extraEsp,desc,detalle);
}
/* Mes del ingreso variable: el del cobro del plan ('aaaa-mm') */
export function mesIngreso(state){return String(state.plan.cobro).slice(0,7)}
/* Ingreso variable: lo que cargaste para ese mes; si todavía no, el ingreso esperado del perfil (estimado) */
function liqVariable(state){
  var s=state.sueldo,m=mesIngreso(state),im=s.ingresosMes||{},cargado=im[m]!==undefined&&im[m]!==null&&im[m]!=='';
  var r=resultado('variable',cargado?num(im[m]):num(s.nominal),0,0,0,0,[]);
  r.estimado=!cargado;r.mes=m;
  return r;
}
/* Ingreso en dólares: se pasa todo a pesos con la cotización de Ajustes y se guarda el original */
function enPesos(state,r){
  var ing=ingresoDe(state);r.moneda=ing.moneda;
  if(ing.moneda!=='USD')return r;
  var c=cotizacion(state);
  r.orig={N:r.N,liquido:r.liquido,otros:r.otros};
  if(!(c>0)){r.sinCotizacion=true;return r}
  r.cotiz=c;
  ['N','bono','extraCom','extraEsp','otros','liquido'].forEach(function(k){r[k]=r[k]*c});
  r.descuentos.forEach(function(d){d.monto=d.monto*c});
  return r;
}
