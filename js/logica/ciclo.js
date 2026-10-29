/* Fin del ciclo (puro, sin DOM): cuando llega el día de cobro, el libro cierra el capítulo.
   - resumenCiclo: lo que ahorraste (todo lo que no gastaste), si cumpliste el pacto, cómo queda tu racha
     y con cuánto empezarías el pacto nuevo (lo que te quedó + el cobro estimado).
   - cerrarCiclo: guarda el mes en el historial (cerrarMes, igual que «Cerrar el mes» de Logros).
   Después la pantalla sella el pacto nuevo con sellarPacto (logica/pacto.js). */
import {num} from './util.js';
import {planCalc} from './plan.js';
import {maxAhorro} from './saldo.js';
import {ajustarPlan,minimoDe} from './mes.js';
import {cerrarMes,histStats} from './logros.js';
import {liqReal} from './recibos.js';

export function cicloTerminado(st,hoy){return !st.ejemplo&&num(st.plan.monto)>0&&hoy>=st.plan.cobro}

export function resumenCiclo(st,hoy){
  var pc=ajustarPlan(st,planCalc(st),hoy);
  var ahorrado=Math.max(0,Math.round(maxAhorro(st,pc))),meta=Math.round(pc.ahorro),minimo=Math.round(minimoDe(st,pc));
  /* La racha como quedaría al cerrar (sin tocar el original) */
  var c=JSON.parse(JSON.stringify(st));cerrarMes(c,pc,ahorrado,0);
  var S=histStats(c.hist),L=liqReal(st),cobro=Math.max(0,Math.round(num(L&&L.liquido)));
  return {ahorrado:ahorrado,meta:meta,minimo:minimo,cumplido:ahorrado>=meta,minimoOk:ahorrado>=minimo,racha:S.cur,
    gastado:Math.round(pc.spentInPlan),cobro:cobro,real:!!(L&&L.real),total:ahorrado+cobro};
}
/* Guarda el ciclo en el historial. La plata del plan la pone después el pacto nuevo. */
export function cerrarCiclo(st,hoy){
  var pc=ajustarPlan(st,planCalc(st),hoy),r=resumenCiclo(st,hoy);
  cerrarMes(st,pc,r.ahorrado,0);
  return r;
}
