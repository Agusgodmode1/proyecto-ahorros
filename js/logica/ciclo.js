/* Fin del ciclo (puro, sin DOM): cuando llega el día de cobro, el libro cierra el capítulo.
   - resumenCiclo: lo que ahorraste (todo lo que no gastaste), si cumpliste el pacto, cómo queda tu racha
     y con cuánto empezarías el pacto nuevo (lo que te quedó + el cobro estimado).
   - cerrarCiclo: guarda el mes en el historial (cerrarMes, igual que «Cerrar el mes» de Logros).
   Después la pantalla sella el pacto nuevo con sellarPacto (logica/pacto.js). */
import {num} from './util.js';
import {planCalc,nextCobro,cfgCobro} from './plan.js';
import {frecDe,fraccionMes} from './frecuencia.js';
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
  var S=histStats(c.hist),L=liqReal(st),cfg=cfgCobro(st),f=frecDe(cfg);
  /* (2.19) el cobro que viene: por quincena o por semana, la parte del sueldo del mes; por jornal, lo que cobres (cero) */
  var cobro=f==='jornal'||f==='ventas'?0:Math.max(0,Math.round(num(L&&L.liquido)*fraccionMes(cfg,st.plan.cobro,nextCobro(st.plan.cobro,cfg))));
  return {ahorrado:ahorrado,meta:meta,minimo:minimo,cumplido:ahorrado>=meta,minimoOk:ahorrado>=minimo,racha:S.cur,
    gastado:Math.round(pc.spentInPlan),cobro:cobro,real:!!(L&&L.real),total:ahorrado+cobro};
}
/* Guarda el ciclo en el historial. La plata del plan la pone después el pacto nuevo. */
export function cerrarCiclo(st,hoy){
  var pc=ajustarPlan(st,planCalc(st),hoy),r=resumenCiclo(st,hoy);
  /* (2.19) sin cobro mensual hay varios pactos en un mes: el historial es por mes, así que se suman */
  var k=String(st.plan.inicio||'').slice(0,7),antes=frecDe(cfgCobro(st))!=='mensual'?(st.hist||[]).filter(function(x){return x.k===k})[0]:null;
  cerrarMes(st,pc,r.ahorrado,0);
  if(antes){var nuevo=st.hist.filter(function(x){return x.k===k})[0];if(nuevo)sumarCierre(nuevo,antes)}
  return r;
}

/* Suma al cierre de este pacto el que ya había en el mismo mes */
var SUMAN=['meta','ahorrado','gastado','presupuesto','semanas','semanasOk','fijosN','fijosPagados','minimo','nominal','liquido','extras'];
export function sumarCierre(rec,antes){
  SUMAN.forEach(function(c){if(typeof rec[c]==='number'||typeof antes[c]==='number')rec[c]=Math.round((num(rec[c])+num(antes[c]))*100)/100});
  if(antes.desde&&(!rec.desde||antes.desde<rec.desde))rec.desde=antes.desde;
  rec.conGastos=!!(rec.conGastos||antes.conGastos);
  if(Array.isArray(antes.semanasSeq))rec.semanasSeq=antes.semanasSeq.concat(rec.semanasSeq||[]);
  rec.pactos=(Math.round(num(antes.pactos))||1)+1;
  return rec;
}
