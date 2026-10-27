/* Repartir un fijo compartido (2.11, puro). Lo usan plan.js (tu parte entra en el presupuesto) y compartidos.js.
   state.grupos: [{id, nombre, personas:[{id, nombre, ingreso}], reparto:{tipo, pct:{id:%}, montos:{id:$}}}]
   - 'yo' es siempre la primera persona de cada grupo (vos).
   - tipo: 'iguales' (partes iguales), 'ingresos' (según lo que gana cada uno), 'pct' (porcentajes a mano), 'montos' (montos fijos por persona).
   Cada fijo puede tener grupo (sin grupo = solo tuyo) y su propio reparto (si no, usa el del grupo).
   Las partes SIEMPRE suman el total: se reparte en pesos enteros (o en centésimos si el total los tiene). */
import {num} from './util.js';

export var YO='yo';
export var TIPOS=[['iguales','Partes iguales'],['ingresos','Según lo que gana cada uno'],['pct','Porcentajes a mano'],['montos','Montos fijos por persona']];
export function repartoBase(){return {tipo:'iguales',pct:{},montos:{}}}

export function grupoDe(state,f){
  if(!f||!f.grupo)return null;
  var g=(state&&state.grupos||[]).filter(function(x){return x.id===f.grupo})[0];
  return g&&Array.isArray(g.personas)&&g.personas.length>1?g:null;
}
export function repartoDe(state,f){
  var g=grupoDe(state,f);if(!g)return null;
  return f.reparto&&f.reparto.tipo?f.reparto:(g.reparto||repartoBase());
}
/* Qué parte del total pone cada uno: {id: fracción}, que suman 1 */
export function proporciones(grupo,reparto){
  var ps=grupo.personas,r=reparto||grupo.reparto||repartoBase(),w={},s=0;
  ps.forEach(function(p){
    var v=r.tipo==='ingresos'?num(p.ingreso):r.tipo==='pct'?num((r.pct||{})[p.id]):r.tipo==='montos'?num((r.montos||{})[p.id]):1;
    w[p.id]=Math.max(0,v);s+=w[p.id];
  });
  var out={};
  ps.forEach(function(p){out[p.id]=s>0?w[p.id]/s:1/ps.length});
  return out;
}
/* Reparte un total según las proporciones: las partes suman exactamente el total (método del resto mayor; si empata, primero vos) */
export function repartir(total,props){
  var ids=Object.keys(props),u=Number.isInteger(Math.round(total*100)/100)?1:.01,c=Math.round(total/u),out={},usado=0,restos=[];
  ids.forEach(function(id,i){var x=c*props[id],b=Math.floor(x+1e-9);out[id]=b;usado+=b;restos.push({id:id,r:x-b,i:i})});
  restos.sort(function(a,b){return b.r-a.r||a.i-b.i});
  for(var k=0;k<c-usado&&k<restos.length;k++)out[restos[k].id]++;
  ids.forEach(function(id){out[id]=Math.round(out[id]*u*100)/100});
  return out;
}
/* Las partes de un fijo para un total dado: {id: monto}. Solo tuyo: {yo: total}. */
export function partesDe(state,f,total){
  var g=grupoDe(state,f);if(!g){var o={};o[YO]=num(total);return o}
  return repartir(num(total),proporciones(g,repartoDe(state,f)));
}
export function miParte(state,f,total){var p=partesDe(state,f,total);return p[YO]!=null?p[YO]:num(total)}
/* ¿Quién lo paga? 'yo' (pagás todo y te devuelven), 'cada' (cada uno su parte) u 'otro' (lo paga otro y le das tu parte) */
export function quienPaga(state,f){return grupoDe(state,f)?(f.paga==='cada'||f.paga==='otro'?f.paga:'yo'):'yo'}
export function nombreDe(grupo,id){if(id===YO)return 'Vos';var p=(grupo&&grupo.personas||[]).filter(function(x){return x.id===id})[0];return p?p.nombre:'Alguien'}

/* Calculadora de la casa (no guarda nada): dividir un monto entre N personas, por partes iguales o según lo que gana cada uno */
export function calcular(total,personas,modo){
  var g={personas:personas.map(function(p,i){return {id:i===0?YO:'p'+i,nombre:p.nombre||(i===0?'Vos':'Persona '+(i+1)),ingreso:num(p.ingreso)}})};
  var partes=repartir(num(total),proporciones(g,{tipo:modo==='ingresos'?'ingresos':'iguales'}));
  return g.personas.map(function(p){return {id:p.id,nombre:p.nombre,monto:partes[p.id],pct:num(total)>0?partes[p.id]/num(total):0}});
}
