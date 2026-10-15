/* La tarjeta como control de lo anotado (puro). El extracto nunca suma gastos solo: se compara con lo que anotaste.
   - cruzar: cada movimiento del extracto se empareja con un gasto anotado del mismo monto y fecha cercana (±3 días),
     uno a uno (si hay dos montos iguales el mismo día, cada uno se empareja con un gasto distinto).
   - hormigas: gastos chicos que se repiten en el mes, por comercio (extracto) o por categoría (lo anotado). */
import {num} from './util.js';

function dias(a,b){
  var pa=a.split('-').map(Number),pb=b.split('-').map(Number);
  return Math.round(Math.abs(new Date(pb[0],pb[1]-1,pb[2],12)-new Date(pa[0],pa[1]-1,pa[2],12))/864e5);
}
/* movs: [{f:'aaaa-mm-dd', monto:>0, d:'descripción', k:'COMERCIO'}]; gastos: lo anotado [{id,fecha,monto}].
   desde/hasta: solo se cruza lo de ese rango. Devuelve {coinciden:[{mov,gasto,dias}], faltan:[mov], soloAnotados:[gasto]} */
export function cruzar(movs,gastos,desde,hasta,tol){
  tol=tol===undefined?3:tol;
  var M=movs.filter(function(m){return m.f>=desde&&m.f<=hasta}).slice().sort(function(a,b){return a.f<b.f?-1:a.f>b.f?1:b.monto-a.monto});
  var G=gastos.filter(function(g){return g.fecha>=desde&&g.fecha<=hasta&&g.src!=='ajuste'}),usado={},out={coinciden:[],faltan:[],soloAnotados:[]};
  M.forEach(function(m){
    var mejor=null,md=99;
    G.forEach(function(g){
      if(usado[g.id]||Math.abs(num(g.monto)-m.monto)>0.5)return;
      var d=dias(m.f,g.fecha);
      if(d<=tol&&d<md){mejor=g;md=d}
    });
    if(mejor){usado[mejor.id]=1;out.coinciden.push({mov:m,gasto:mejor,dias:md})}
    else out.faltan.push(m);
  });
  out.soloAnotados=G.filter(function(g){return !usado[g.id]});
  return out;
}

/* Gastos hormiga del mes: chicos (menos del umbral) y repetidos (3 o más) del mismo comercio o categoría.
   items: [{fecha, monto, grupo}] · mes: 'aaaa-mm' · Devuelve [{grupo, n, total, anual}] de mayor a menor. */
export function hormigas(items,mes,umbral,minVeces){
  umbral=umbral||400;minVeces=minVeces||3;
  var g={};
  items.forEach(function(x){
    if(String(x.fecha).slice(0,7)!==mes||!(num(x.monto)>0)||num(x.monto)>=umbral||!x.grupo)return;
    var o=g[x.grupo]||(g[x.grupo]={grupo:x.grupo,n:0,total:0});o.n++;o.total+=num(x.monto);
  });
  return Object.keys(g).map(function(k){var o=g[k];o.total=Math.round(o.total*100)/100;o.anual=Math.round(o.total*12);return o})
    .filter(function(o){return o.n>=minVeces}).sort(function(a,b){return b.total-a.total});
}
