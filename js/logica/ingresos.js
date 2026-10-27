/* Ingresos fijos (2.20, puro, sin DOM): lo que te entra todos los meses además del sueldo
   (la plata que te da un familiar, un alquiler que cobrás, una pensión, una beca).
   state.ingresosFijos [{id, nombre, monto, dia}]. Igual que la plata que te va a entrar (supervivencia.js):
   no cuenta hasta que llega. En cada pacto se anotan solos en state.plan.esperado con id «if-<id>-<fecha>»;
   el día que toca, Hoy pregunta «¿Te entró?». Lo que ya respondiste queda en state.plan.vistos (así no vuelve). */
import {num,uid} from './util.js';
import {diaEn} from './plan.js';
import {parse} from './fechas.js';
import {normEsperado} from './supervivencia.js';

export function normIngresos(l){
  if(!Array.isArray(l))return [];
  return l.filter(function(x){return x&&typeof x==='object'&&num(x.monto)>0})
    .map(function(x){return {id:String(x.id||uid()),nombre:String(x.nombre||'Ingreso').trim().slice(0,40)||'Ingreso',monto:Math.round(num(x.monto)),dia:Math.min(31,Math.max(1,Math.round(num(x.dia))||1))}});
}
export function totalIngresosMes(st){var t=0;normIngresos(st&&st.ingresosFijos).forEach(function(x){t+=x.monto});return t}

/* Los que caen entre desde (incluido) y hasta (excluido), como los fijos */
export function ingresosPeriodo(st,desde,hasta){
  var out=[],a=parse(desde),b=parse(hasta);
  normIngresos(st.ingresosFijos).forEach(function(x){
    var cur=new Date(a.getFullYear(),a.getMonth(),1,12),end=new Date(b.getFullYear(),b.getMonth(),1,12);
    while(cur<=end){var f=diaEn(cur.getFullYear(),cur.getMonth(),x.dia);if(f>=desde&&f<hasta)out.push({ing:x,fecha:f});cur=new Date(cur.getFullYear(),cur.getMonth()+1,1,12)}
  });
  return out.sort(function(x,y){return x.fecha<y.fecha?-1:1});
}
export function idIngreso(x,fecha){return 'if-'+x.id+'-'+fecha}

/* Anota en «te va a entrar» los ingresos fijos del pacto que todavía no estén ni respondidos. Devuelve los nuevos. */
export function programarIngresos(st){
  var p=st.plan;if(!(num(p.monto)>0)||!p.inicio||!p.cobro)return [];
  var esp=normEsperado(p.esperado),ya={},nuevos=[];
  esp.forEach(function(e){ya[e.id]=1});(p.vistos||[]).forEach(function(id){ya[id]=1});
  ingresosPeriodo(st,p.inicio,p.cobro).forEach(function(o){
    var id=idIngreso(o.ing,o.fecha);if(ya[id])return;
    var it={id:id,fecha:o.fecha,monto:o.ing.monto,nota:o.ing.nombre,fijo:o.ing.id};esp.push(it);nuevos.push(it);
  });
  if(nuevos.length)p.esperado=normEsperado(esp);
  return nuevos;
}
/* Al cambiar o borrar un ingreso fijo: lo que todavía no llegó se vuelve a anotar con los datos nuevos */
export function reprogramar(st){
  var p=st.plan;p.esperado=normEsperado(p.esperado).filter(function(e){return !e.fijo});
  return programarIngresos(st);
}
