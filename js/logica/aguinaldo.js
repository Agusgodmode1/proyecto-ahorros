/* Aguinaldo y salario vacacional (puro). Estimaciones con las reglas de Uruguay:
   - Aguinaldo = lo ganado (nominal, con extras) en el semestre ÷ 12. Dic–may se paga antes del 30 de junio;
     jun–nov, antes del 20 de diciembre. Paga aportes como el sueldo (15% jubilación, FONASA y 0,1% FRL).
     El IRPF no se descuenta al cobrarlo (si ganás más de 10 BPC se adelanta en el sueldo de cada mes).
   - Salario vacacional = jornal líquido (sueldo menos aportes, ÷ 30) × días de licencia.
     No paga aportes; solo IRPF, a tu tasa marginal.
   Los meses que ya cerraste usan el sueldo guardado al cerrarlos; el que estás trabajando, el de hoy con tus extras;
   los demás se estiman con tu sueldo base. */
import {num} from './util.js';
import {liq,mesTrabajo,reglasHoras} from './sueldo.js';
import {pad} from './fechas.js';
import {nominalesReales} from './recibos.js';

function mk(y,m){var d=new Date(y,m-1,1,12);return d.getFullYear()+'-'+pad(d.getMonth()+1)}
/* Próximo aguinaldo a cobrar desde hoy: {pago, nombre, meses:['aaaa-mm' ×6]} */
export function proximoAguinaldo(hoy){
  var y=Number(hoy.slice(0,4)),m=Number(hoy.slice(5,7)),d=Number(hoy.slice(8,10)),mesesDe=function(y0,m0){var a=[];for(var i=0;i<6;i++)a.push(mk(y0,m0+i));return a};
  if(m<=6)return {pago:y+'-06-30',nombre:'junio',meses:mesesDe(y-1,12)};
  if(m<12||d<=20)return {pago:y+'-12-20',nombre:'diciembre',meses:mesesDe(y,6)};
  return {pago:(y+1)+'-06-30',nombre:'junio',meses:mesesDe(y,12)};
}
/* Mes trabajado que se pagó en un cierre (el anterior al cobro, o el mismo según el perfil) */
function mesDeCierre(state,r){
  if(!r.cobro)return null;
  var atras=reglasHoras(state).mesCobro==='mismo'?0:1;
  return mk(Number(r.cobro.slice(0,4)),Number(r.cobro.slice(5,7))-atras);
}
function aportes(N,fonRate){var mont=N*0.15,fon=N*fonRate,frl=N*0.001;return {mont:mont,fon:fon,frl:frl,total:mont+fon+frl}}

export function aguinaldo(state,hoy){
  var A=proximoAguinaldo(hoy),porMes={};
  (state.hist||[]).forEach(function(r){var k=mesDeCierre(state,r);if(k&&num(r.nominal)>0)porMes[k]={nominal:num(r.nominal),fuente:'cierre'}});
  /* Los recibos que cargaste mandan sobre todo lo demás */
  var reales=nominalesReales(state);Object.keys(reales).forEach(function(k){porMes[k]={nominal:reales[k],fuente:'recibo'}});
  var L=liq(state,true),actual=mesTrabajo(state),base=num(state.sueldo.nominal)+num(state.sueldo.bonoFijo);
  if(!porMes[actual])porMes[actual]={nominal:L.N,fuente:'actual'};
  var meses=A.meses.map(function(k){var x=porMes[k]||{nominal:base,fuente:'estimado'};return {k:k,nominal:Math.round(x.nominal*100)/100,fuente:x.fuente}});
  var total=0;meses.forEach(function(x){total+=x.nominal});
  var bruto=total/12,ap=aportes(bruto,L.fonRate);
  return {pago:A.pago,nombre:A.nombre,meses:meses,total:total,bruto:bruto,aportes:ap,liquido:bruto-ap.total,
    estimados:meses.filter(function(x){return x.fuente==='estimado'}).length};
}

/* Tasa marginal del IRPF para un nominal mensual (la misma escala que el sueldo) */
export function tasaMarginal(N,bpc){
  var cuts=[0,7,10,15,30,50,75,115],rates=[0,.10,.15,.24,.25,.27,.31,.36],t=0;
  for(var i=0;i<cuts.length;i++)if(N>cuts[i]*bpc)t=rates[i];
  return t;
}
export function salarioVacacional(state,dias){
  dias=Math.max(0,Math.round(num(dias)));
  var s=state.sueldo,N=num(s.nominal)+num(s.bonoFijo),bpc=num(s.bpc)||6864,L=liq(state,false);
  var jornal=(N-aportes(N,L.fonRate).total)/30,bruto=jornal*dias,tasa=tasaMarginal(N,bpc),irpf=bruto*tasa;
  return {dias:dias,jornal:jornal,bruto:bruto,tasa:tasa,irpf:irpf,liquido:bruto-irpf};
}
