/* Fechas y días hábiles (puro, sin DOM).
   FERIADOS es la única lista de feriados de la app: para sumar uno, agregalo acá (aaaa-mm-dd). */
export var FERIADOS=['2026-10-12','2026-11-02','2026-12-25','2027-01-01','2027-01-06','2027-11-02'];
var HOL={};FERIADOS.forEach(function(f){HOL[f]=1});

export var MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
export var MESL=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'];
export var DIA=['dom','lun','mar','mié','jue','vie','sáb'];
export var DIAL=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

export function pad(n){return (n<10?'0':'')+n}
export function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
export function parse(s){var p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2],12)}
export function addDays(d,n){var x=new Date(d.getTime());x.setDate(x.getDate()+n);return x}
export function diffDays(a,b){return Math.round((parse(b)-parse(a))/864e5)}
export function esFeriado(s){return !!HOL[s]}
export function isBiz(d){var w=d.getDay();return w!==0&&w!==6&&!HOL[iso(d)]}
export function bizRank(s){
  var d=parse(s);if(!isBiz(d))return null;
  var n=0;for(var i=1;i<=d.getDate();i++){if(isBiz(new Date(d.getFullYear(),d.getMonth(),i,12)))n++}
  return n;
}
export function hoyISO(){return iso(new Date())}
