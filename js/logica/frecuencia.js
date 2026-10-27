/* Cada cuánto cobrás (2.19, puro, sin DOM). Solo fechas: no importa plan.js (plan.js la usa).
   perfil.cobro.frecuencia:
   - 'mensual' (o nada): como siempre, con tipo habil5 | ultimoHabil | fijo (plan.js).
   - 'quincenal': dos días del mes, cobro.dias = [a, b] (31 = el último día del mes).
   - 'semanal': un día de la semana, cobro.dow (0 = domingo … 6 = sábado).
   - 'jornal': cobrás por día o cuando sale; el pacto dura cobro.horizonte días y lo que cobrás se suma con «Cobré».
   - 'ventas' (2.21): vendés por tu cuenta y la plata entra a medida que sale cada pedido. El pacto es por mes
     (hasta el día cobro.diaV del mes que viene, el 1 si no elegiste), semana por semana; cada venta se suma con «Entró plata»
     y la meta es que lo vendido en la semana cubra su parte de los fijos (logica/ventas.js). */
import {iso,parse,addDays,diffDays} from './fechas.js';

export var FRECUENCIAS=[['mensual','Una vez al mes'],['quincenal','Cada 15 días'],['semanal','Cada semana'],['jornal','Por día o changas'],['ventas','Cuando vendo']];
export var DIAS_MES=365.25/12;

export function frecDe(cfg){var f=cfg&&cfg.frecuencia;return f==='quincenal'||f==='semanal'||f==='jornal'||f==='ventas'?f:'mensual'}
/* Las que se planean por mes (los fijos se descuentan como siempre, sin reserva) */
export function porMes(cfg){var f=frecDe(cfg);return f==='mensual'||f==='ventas'}
function enMes(y,m,dia){var b=new Date(y,m,1,12),last=new Date(b.getFullYear(),b.getMonth()+1,0,12).getDate();return iso(new Date(b.getFullYear(),b.getMonth(),Math.min(Math.max(1,dia),last),12))}
function diasQuincena(cfg){
  var d=Array.isArray(cfg&&cfg.dias)?cfg.dias.map(function(x){return Math.round(Number(x))}).filter(function(x){return x>=1&&x<=31}):[];
  if(d.length<2)d=[1,15];
  return d.slice(0,2).sort(function(a,b){return a-b});
}
function dowDe(cfg){var w=Math.round(Number(cfg&&cfg.dow));return w>=0&&w<=6?w:5}
function horizonteDe(cfg){var h=Math.round(Number(cfg&&cfg.horizonte));return h>=1&&h<=31?h:7}

/* Primer cobro estrictamente después de `desde`, para las frecuencias que no son mensuales */
export function cobroFrec(desde,cfg){
  var f=frecDe(cfg),p=parse(desde);
  if(f==='semanal'){var w=dowDe(cfg),d=addDays(p,1);while(d.getDay()!==w)d=addDays(d,1);return iso(d)}
  if(f==='jornal')return iso(addDays(p,horizonteDe(cfg)));
  if(f==='ventas'){var dv=Math.round(Number(cfg&&cfg.diaV))>=1?Math.min(31,Math.round(Number(cfg.diaV))):1;for(var m=0;m<3;m++){var cv=enMes(p.getFullYear(),p.getMonth()+m,dv);if(cv>desde)return cv}}
  var ds=diasQuincena(cfg);
  for(var k=0;k<3;k++)for(var i=0;i<ds.length;i++){var c=enMes(p.getFullYear(),p.getMonth()+k,ds[i]);if(c>desde)return c}
  return iso(addDays(p,15));
}
/* Qué parte de un mes es un período (para repartir los fijos y estimar el cobro) */
export function fraccionMes(cfg,desde,hasta){
  var f=frecDe(cfg);
  if(f==='mensual'||f==='ventas')return 1;
  if(f==='quincenal')return 0.5;
  return Math.max(1,diffDays(desde,hasta))/DIAS_MES;
}
/* La regla que sale del día que tocaste en el calendario: el día de la semana, la quincena o cuántos días dura */
export function reglaDesdeFecha(frec,fecha,hoy,base){
  var c=Object.assign({},base||{},{frecuencia:frecDe({frecuencia:frec})}),d=parse(fecha);
  if(c.frecuencia==='ventas')c.diaV=d.getDate();
  if(c.frecuencia==='semanal')c.dow=d.getDay();
  if(c.frecuencia==='jornal')c.horizonte=Math.max(1,Math.min(31,diffDays(hoy,fecha)));
  if(c.frecuencia==='quincenal'){
    var n=d.getDate(),last=new Date(d.getFullYear(),d.getMonth()+1,0,12).getDate(),mismo=Array.isArray(base&&base.dias)&&base.frecuencia==='quincenal';
    if(!(mismo&&diasQuincena(base).some(function(x){return Math.min(x,last)===n}))){
      /* el último día del mes va con el 15; si no, el otro cobro es 14 días antes o después (el 1 va con el 15) */
      c.dias=n>=last?[15,31]:n<=15?[n,n+14]:[n-14,n];
    }
  }
  return c;
}
/* Cómo se nombra el período en las pantallas */
export function periodoTxt(cfg){var f=frecDe(cfg);return f==='quincenal'?{este:'esta quincena',que:'la quincena que viene'}:f==='semanal'?{este:'esta semana',que:'la semana que viene'}:f==='jornal'?{este:'este pacto',que:'el próximo pacto'}:f==='ventas'?{este:'este mes',que:'el mes que viene'}:{este:'este mes',que:'el mes que viene'}}
