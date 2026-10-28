/* Cuando vendo (2.21, puro, sin DOM): para quien vende por su cuenta y cobra a medida que sale cada pedido.
   El pacto es por mes y se mira semana a semana:
   - lo vendido: las entradas de la semana (state.plan.entradas, que anota «Entró plata»);
   - la meta: que lo vendido cubra la parte de los fijos de esa semana (los fijos del pacto repartidos por días),
     más lo que faltó en las semanas que ya terminaron;
   - lo que pasa de la meta es ganancia, y se puede guardar (state.plan.ganancia {inicioDeSemana: monto}),
     que la suma al ahorro del pacto. Así el ahorro sale de lo que sobra, nunca de lo que hace falta para los fijos. */
import {num} from './util.js';
import {maxAhorro,disponible} from './saldo.js';
import {planCalc,fijosPeriodo,cuentaEnPresupuesto,isPagado,parteDelPeriodo,montoEsperado} from './plan.js';
import {diffDays,addDays,parse,iso} from './fechas.js';
import {miParte} from './reparto.js';

export function normEntradas(l){
  if(!Array.isArray(l))return [];
  return l.filter(function(x){return x&&typeof x==='object'&&num(x.monto)>0&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.fecha||''))})
    .map(function(x){var o={id:String(x.id||''),fecha:x.fecha,monto:Math.round(num(x.monto)),nota:String(x.nota||'').trim().slice(0,40)};if(num(x.g)>0)o.g=Math.round(num(x.g));return o});
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

/* ---------- «Tu plata alcanza» (2.22) ----------
   Quien cobra cuando vende no tiene un día de cobro que esperar: lo que importa es cuántos días le dura la plata
   y si llega al próximo pago fuerte. En lugar de «Cobrás en», Hoy muestra:
   - dias: cuántos días te alcanza lo que tenés para el día a día (sin los fijos que faltan ni lo guardado),
     gastando a tu ritmo (lo que gastaste por día en el pacto, con 3 días o más) o, si todavía no hay, al del plan al sellar;
   - pago: el próximo fijo sin pagar ({nombre, monto, fecha, dias}) y cuánto ya tenés para él (juntado);
   - llega: si la plata del día a día dura hasta ese pago y el pago está cubierto;
   - estrellas: de 12, cuántas encender (los días cubiertos sobre los días hasta el pago). */

export function ritmoGasto(st,hoy){
  var p=st.plan;if(!p.inicio||hoy<p.inicio)return null;
  var pasados=diffDays(p.inicio,hoy)+1,g=0,hay=false;
  (st.gastos||[]).forEach(function(x){if(x.fecha>=p.inicio&&x.fecha<=hoy&&x.src!=='ajuste'){g+=num(x.monto);hay=true}});
  return pasados>=3&&hay?g/pasados:null;
}
export function proximoPago(st,hoy){
  var p=st.plan,hasta=iso(addDays(parse(hoy),62)),mejor=null;
  fijosPeriodo(st.fijos||[],hoy,hasta).forEach(function(o){
    if(mejor||!cuentaEnPresupuesto(o.f))return;
    var enPacto=o.fecha>=p.inicio&&o.fecha<p.cobro;
    if(enPacto&&isPagado(st,o.f.id))return;
    var m=enPacto?parteDelPeriodo(st,o.f):miParte(st,o.f,montoEsperado(st,o.f));
    if(!(m>0))return;
    mejor={id:o.f.id,nombre:o.f.nombre||'Gasto fijo',monto:Math.round(m),fecha:o.fecha,dias:Math.max(0,diffDays(hoy,o.fecha))};
  });
  return mejor;
}
export function tuPlataAlcanza(st,pc,hoy){
  var p=st.plan;if(!(num(p.monto)>0))return null;
  /* sin gastos todavía, el ritmo del plan al sellar (plan.porDiaBase): así una venta suma días en lugar de subir el gasto por día */
  var resto=Math.max(0,pc.gastar-pc.spentInPlan),ritmo=ritmoGasto(st,hoy),base=num(p.porDiaBase),porDia=ritmo>0?ritmo:base>0?base:pc.daily>0?pc.daily:0;
  var dias=porDia>0?Math.floor(resto/porDia):0;
  var r={resto:resto,porDia:porDia,ritmo:ritmo,dias:dias,hasta:dias>0?iso(addDays(parse(hoy),dias-1)):null,tenes:Math.max(0,disponible(st,pc))};
  var pago=proximoPago(st,hoy);r.pago=pago;
  if(pago){
    r.juntado=Math.min(pago.monto,r.tenes);r.falta=Math.max(0,pago.monto-r.juntado);
    r.llega=dias>=pago.dias&&r.falta<=0;
    r.estrellas=pago.dias<=0?12:Math.max(0,Math.min(12,Math.round(12*Math.min(1,dias/pago.dias))));
    if(r.falta>0)r.estrellas=Math.min(r.estrellas,11);
  }else{r.llega=true;r.estrellas=Math.max(0,Math.min(12,Math.round(12*Math.min(1,dias/30))))}
  return r;
}

/* ---------- Ingresos (2.24): el capítulo IV para quien cobra por día o cuando vende ----------
   Lo que entró en el pacto, semana a semana, el promedio de las semanas que ya pasaron (o la de hoy), la mejor semana
   y lo que se guardó solo (por jornal, la parte de cada cobro). */
export function resumenIngresos(st,pc,hoy){
  var ent=normEntradas(st.plan.entradas),sem=[],tot=0,auto=0;
  pc.weeks.forEach(function(w,i){
    var v=0,n=0;ent.forEach(function(e){if(e.fecha>=w.start&&e.fecha<=w.end){v+=e.monto;n++}});
    sem.push({i:i,start:w.start,end:w.end,entro:v,veces:n,pasada:w.end<hoy,actual:hoy>=w.start&&hoy<=w.end});
  });
  ent.forEach(function(e){tot+=e.monto;auto+=num(e.g)});
  var vistas=sem.filter(function(x){return x.pasada||x.actual}),prom=0;
  vistas.forEach(function(x){prom+=x.entro});prom=vistas.length?prom/vistas.length:0;
  var mejor=null;sem.forEach(function(x){if(x.entro>0&&(!mejor||x.entro>mejor.entro))mejor=x});
  return {semanas:sem,total:tot,veces:ent.length,promedio:Math.round(prom),mejor:mejor,guardadoSolo:auto,
    entradas:ent.slice().sort(function(a,b){return a.fecha<b.fecha?1:a.fecha>b.fecha?-1:0})};
}
/* Borrar una entrada anotada por error: sale de tu plata (y lo que se había guardado de ella, del ahorro) */
export function quitarEntrada(st,id){
  var p=st.plan,l=normEntradas(p.entradas),e=l.filter(function(x){return x.id===id})[0];if(!e)return null;
  var u={entrada:e,monto:p.monto,ahorro:p.ahorro};
  p.entradas=l.filter(function(x){return x.id!==id});
  p.monto=Math.max(0,Math.round((num(p.monto)-e.monto)*100)/100);
  if(num(e.g)>0&&p.modo==='monto')p.ahorro=Math.max(0,Math.round(num(p.ahorro))-num(e.g));
  return u;
}
export function deshacerQuitarEntrada(st,u){var p=st.plan;p.monto=u.monto;p.ahorro=u.ahorro;p.entradas=normEntradas(p.entradas).concat([u.entrada])}
