/* Gastos que se repiten solos (2.16, puro): el boleto de todos los días, el gimnasio de cada semana, la cuota del club
   de cada mes. Al anotar un gasto podés elegir «se repite» y después se anota solo cada vez que toca, hasta hoy
   (nunca a futuro). Se puede pausar o borrar. Son gastos de verdad (src:'repite'): si un día no lo gastaste, lo borrás.
   state.repetidos = [{id, nota, monto, cat, usd?, cotiz?, cada:'dia'|'semana'|'mes', desde, ultimo, pausa}] */
import {num,uid} from './util.js';

export var CADA=[['dia','cada día'],['semana','cada semana'],['mes','cada mes']];
export function textoCada(c){for(var i=0;i<CADA.length;i++)if(CADA[i][0]===c)return CADA[i][1];return ''}
function pad(n){return (n<10?'0':'')+n}
function d(s){var p=String(s).split('-').map(Number);return new Date(p[0],p[1]-1,p[2],12)}
function iso(x){return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate())}
/* La vez n (0 = la primera, el día que lo anotaste) */
export function vez(r,n){
  var b=d(r.desde);
  if(r.cada==='dia')return iso(new Date(b.getFullYear(),b.getMonth(),b.getDate()+n,12));
  if(r.cada==='semana')return iso(new Date(b.getFullYear(),b.getMonth(),b.getDate()+7*n,12));
  var y=b.getFullYear(),m=b.getMonth()+n,fin=new Date(y,m+1,0,12).getDate();
  return iso(new Date(y,m,Math.min(b.getDate(),fin),12));
}
/* Las fechas que faltan anotar: después de la última anotada y hasta hoy. Si no abriste la app en mucho tiempo,
   solo las de los últimos `dias` días (62): lo de antes no se inventa. */
export function fechasDebidas(r,hoy,dias){
  dias=dias||62;var out=[];
  if(!r||!r.desde||!/^(dia|semana|mes)$/.test(r.cada))return out;
  var h=d(hoy),min=iso(new Date(h.getFullYear(),h.getMonth(),h.getDate()-dias+1,12));
  for(var n=0;n<20000;n++){
    var f=vez(r,n);
    if(f>hoy)break;
    if(r.ultimo&&f<=r.ultimo)continue;
    if(f<min)continue;
    out.push(f);
  }
  return out;
}
/* Anota lo que toca. Devuelve los gastos nuevos (para avisar y poder deshacer). */
export function aplicarRepetidos(state,hoy){
  var nuevos=[];
  (state.repetidos||[]).forEach(function(r){
    if(r.pausa)return;
    var fs=fechasDebidas(r,hoy);
    fs.forEach(function(f){
      /* id fijo (repetido + fecha): si dos aparatos lo anotan solo, al juntar los datos queda uno */
      var g={id:'rep-'+r.id+'-'+f,fecha:f,monto:num(r.monto),nota:r.nota||'',cat:r.cat,src:'repite',rep:r.id};
      if(r.usd){g.usd=r.usd;g.cotiz=r.cotiz}
      state.gastos.push(g);nuevos.push(g);
    });
    if(fs.length)r.ultimo=fs[fs.length-1];
  });
  return nuevos;
}
/* Desde un gasto recién anotado: ese gasto es la primera vez */
export function nuevoRepetido(g,cada){
  var r={id:uid(),nota:g.nota||'',monto:num(g.monto),cat:g.cat,cada:cada,desde:g.fecha,ultimo:g.fecha,pausa:false};
  if(g.usd){r.usd=g.usd;r.cotiz=g.cotiz}
  return r;
}
