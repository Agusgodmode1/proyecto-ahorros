/* Metas con nombre (puro): "Viaje a Brasil · $ 60.000 · para 2027-03".
   Cada meta guarda sus aportes; el progreso, lo que falta y a qué ritmo llegás salen de ahí. */
import {num} from './util.js';

export function aportado(m){var t=0;(m.aportes||[]).forEach(function(a){t+=num(a.monto)});return Math.round(t*100)/100}
function mesesEntre(a,b){return (Number(b.slice(0,4))-Number(a.slice(0,4)))*12+(Number(b.slice(5,7))-Number(a.slice(5,7)))}

/* hoy = 'aaaa-mm-dd'. Devuelve todo lo que la pantalla necesita mostrar. */
export function progresoMeta(m,hoy){
  var ap=aportado(m),obj=Math.max(0,num(m.objetivo)),falta=Math.max(0,obj-ap),mesHoy=hoy.slice(0,7);
  var r={aportado:ap,objetivo:obj,falta:falta,pct:obj>0?Math.min(1,ap/obj):0,cumplida:obj>0&&ap>=obj,porMes:null,mesesHasta:null,ritmo:0,llegasEn:null};
  /* Para llegar a tiempo: lo que falta repartido en los meses que quedan (contando este) */
  if(m.para&&/^\d{4}-\d{2}$/.test(m.para)){
    r.mesesHasta=mesesEntre(mesHoy,m.para)+1;
    r.porMes=r.mesesHasta>0?falta/r.mesesHasta:falta;
  }
  /* A tu ritmo: lo aportado desde el primer aporte, por mes */
  var fs=(m.aportes||[]).map(function(a){return String(a.fecha).slice(0,7)}).sort();
  if(fs.length&&ap>0){
    var meses=Math.max(1,mesesEntre(fs[0],mesHoy)+1);
    r.ritmo=ap/meses;
    r.llegasEn=r.cumplida?0:Math.ceil(falta/r.ritmo);
  }
  return r;
}
/* Al cerrar el mes: reparte lo ahorrado entre metas. montos = {idMeta: monto}. Devuelve cuántas metas recibieron.
   No reparte más de lo ahorrado (si te pasás, se recorta en el orden de las metas). */
export function repartirAhorro(metas,montos,ahorrado,fecha,nuevoId){
  var resto=Math.max(0,num(ahorrado)),n=0;
  metas.forEach(function(m){
    var v=Math.min(resto,Math.max(0,Math.round(num(montos[m.id]))));
    if(!(v>0))return;
    m.aportes=m.aportes||[];m.aportes.push({id:nuevoId(),fecha:fecha,monto:v});resto-=v;n++;
  });
  return n;
}
