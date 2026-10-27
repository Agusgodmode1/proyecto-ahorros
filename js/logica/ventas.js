/* Cuando vendo (2.21, puro, sin DOM): para quien vende por su cuenta y cobra a medida que sale cada pedido.
   El pacto es por mes y se mira semana a semana:
   - lo vendido: las entradas de la semana (state.plan.entradas, que anota «Entró plata»);
   - la meta: que lo vendido cubra la parte de los fijos de esa semana (los fijos del pacto repartidos por días),
     más lo que faltó en las semanas que ya terminaron;
   - lo que pasa de la meta es ganancia, y se puede guardar (state.plan.ganancia {inicioDeSemana: monto}),
     que la suma al ahorro del pacto. Así el ahorro sale de lo que sobra, nunca de lo que hace falta para los fijos. */
import {num} from './util.js';
import {maxAhorro} from './saldo.js';
import {planCalc} from './plan.js';

export function normEntradas(l){
  if(!Array.isArray(l))return [];
  return l.filter(function(x){return x&&typeof x==='object'&&num(x.monto)>0&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.fecha||''))})
    .map(function(x){return {id:String(x.id||''),fecha:x.fecha,monto:Math.round(num(x.monto)),nota:String(x.nota||'').trim().slice(0,40)}});
}
export function normGanancia(o){
  var r={};if(!o||typeof o!=='object'||Array.isArray(o))return r;
  Object.keys(o).forEach(function(k){if(/^\d{4}-\d{2}-\d{2}$/.test(k)&&num(o[k])>0)r[k]=Math.round(num(o[k]))});return r;
}

export function semanasVentas(st,pc,hoy){
  var p=st.plan,ent=normEntradas(p.entradas),gan=normGanancia(p.ganancia),F=Math.max(0,num(pc.fijos)),dias=Math.max(1,pc.total);
  var arrastre=0,out=[],actual=-1,tv=0,tg=0,tgu=0;
  pc.weeks.forEach(function(w,i){
    var vendido=0,lista=[];
    ent.forEach(function(e){if(e.fecha>=w.start&&e.fecha<=w.end){vendido+=e.monto;lista.push(e)}});
    var parte=Math.round(F*w.days/dias),pasada=w.end<hoy,esta=hoy>=w.start&&hoy<=w.end,futura=w.start>hoy;
    var meta=parte+(futura?0:arrastre),falta=Math.max(0,meta-vendido),ganancia=Math.max(0,vendido-meta),guardada=gan[w.start]||0;
    out.push({i:i,start:w.start,end:w.end,dias:w.days,vendido:vendido,entradas:lista,parte:parte,arrastre:futura?0:arrastre,meta:meta,falta:falta,
      cubierta:meta<=0||vendido>=meta,ganancia:ganancia,guardada:guardada,porGuardar:Math.max(0,ganancia-guardada),pasada:pasada,actual:esta});
    if(esta)actual=i;
    if(pasada)arrastre=falta;
    tv+=vendido;tg+=ganancia;tgu+=guardada;
  });
  return {semanas:out,actual:actual,fijos:F,vendido:tv,ganancia:tg,guardada:tgu};
}

/* Guardar la ganancia de una semana: pasa al ahorro del pacto (como mucho lo que se puede guardar hoy) */
export function guardarGanancia(st,start,monto,hoy){
  var p=st.plan,pc=planCalc(st),r=semanasVentas(st,pc,hoy),w=r.semanas.filter(function(x){return x.start===start})[0];
  if(!w)return null;
  var m=Math.min(Math.round(num(monto===undefined?w.porGuardar:monto)),w.porGuardar,Math.floor(maxAhorro(st,pc)-num(pc.ahorro)));
  if(!(m>0))return null;
  var u={start:start,antes:normGanancia(p.ganancia)[start]||0,ahorro:p.ahorro,modo:p.modo,monto:m};
  p.ganancia=normGanancia(p.ganancia);p.ganancia[start]=u.antes+m;
  if(p.modo!=='monto'){p.ahorro=Math.round(pc.ahorro);p.modo='monto'}
  p.ahorro=Math.round(num(p.ahorro))+m;
  return u;
}
export function deshacerGanancia(st,u){
  var p=st.plan;p.ganancia=normGanancia(p.ganancia);
  if(u.antes>0)p.ganancia[u.start]=u.antes;else delete p.ganancia[u.start];
  p.ahorro=u.ahorro;p.modo=u.modo;
}
