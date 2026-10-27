/* Buscar gastos (2.15, puro): por la nota, la categoría, el monto o la fecha. Cada palabra tiene que aparecer
   (sin importar tildes ni mayúsculas). Un número busca el monto («350» encuentra $ 350 y $ 1.350) y «12/10» la fecha.
   Devuelve {lista:[gasto…] de la más nueva a la más vieja (hasta `max`), n (cuántos en total), total (la suma)}. */
import {num} from './util.js';

function norm(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}
function fechaCorta(f){var p=String(f||'').split('-');return p.length===3?Number(p[2])+'/'+Number(p[1]):''}
export function buscarGastos(gastos,q,opt){
  opt=opt||{};
  var t=norm(q).trim();if(!/[a-z0-9ñ]/.test(t))return {lista:[],n:0,total:0};
  var pal=t.split(/\s+/).filter(function(p){return /[a-z0-9ñ]/.test(p)}),nombreCat=opt.nombreCat||function(c){return c||''};
  var hits=(gastos||[]).filter(function(g){
    var txt=norm((g.nota||'')+' '+nombreCat(g.cat)+(g.usd?' usd dolares':'')),monto=String(Math.round(num(g.monto))),fecha=fechaCorta(g.fecha);
    return pal.every(function(p){
      if(/^\d{1,2}\/\d{1,2}$/.test(p))return fecha===p.replace(/^0/,'').replace(/\/0/,'/');
      var pn=p.replace(/[$.]/g,'').replace(',','.');
      if(/^\d+(\.\d+)?$/.test(pn))return monto.indexOf(String(Math.round(Number(pn))))>=0||txt.indexOf(p)>=0;
      return txt.indexOf(p)>=0;
    });
  }).sort(function(a,b){return a.fecha<b.fecha?1:a.fecha>b.fecha?-1:0});
  var total=0;hits.forEach(function(g){total+=num(g.monto)});
  return {lista:hits.slice(0,opt.max||50),n:hits.length,total:Math.round(total*100)/100};
}
