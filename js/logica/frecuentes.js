/* Gastos frecuentes (puro): lo que más anotaste en los últimos 60 días, para cargarlo con un toque.
   Se agrupa por la nota (sin tildes ni mayúsculas) y se propone el monto que más repetiste. */
import {claveVoz} from './voz.js';
import {parse,addDays,iso} from './fechas.js';

export function frecuentes(gastos,hoy,max){
  max=max||4;
  var desde=iso(addDays(parse(hoy),-60)),g={};
  (gastos||[]).forEach(function(x){
    if(!x||!x.nota||x.fecha<desde||x.fecha>hoy)return;
    var k=claveVoz(x.nota);if(!k)return;
    var o=g[k]||(g[k]={n:0,ult:null,montos:{}});
    o.n++;
    if(!o.ult||x.fecha>=o.ult.fecha)o.ult=x;
    var m=Math.round(x.usd?x.usd*100:x.monto);o.montos[m]=(o.montos[m]||0)+1;
  });
  return Object.keys(g).map(function(k){
    var o=g[k],u=o.ult,ultM=Math.round(u.usd?u.usd*100:u.monto),best=ultM,bn=o.montos[ultM];
    Object.keys(o.montos).forEach(function(m){if(o.montos[m]>bn){bn=o.montos[m];best=Number(m)}});
    var r={clave:k,nota:u.nota,cat:u.cat||null,n:o.n};
    if(u.usd)r.usd=best/100;else r.monto=best;
    return r;
  }).filter(function(r){return r.n>=2})
    .sort(function(a,b){return b.n-a.n||(a.nota<b.nota?-1:1)})
    .slice(0,max);
}
