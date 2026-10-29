/* Horas extra a partir del horario del día (puro).
   Entre semana: se suman los minutos que llegaste antes y los que te quedaste después de tu horario;
   el día cuenta si ese total llega al mínimo del perfil (15 justos ya cuentan si el mínimo es 15).
   Fin de semana o feriado no laborable: cuenta el turno entero.
   (2.26) El horario es el de cada uno (perfil.horas.entrada, salida y dias: 'lv' de lunes a viernes, 'ls' de lunes a
   sábado): no se supone ninguno. Sin horario, entre semana no hay cuenta posible (extraPorHorario da null). */
import {parse,pagaComoFeriado} from './fechas.js';

export function aMin(hhmm){var m=/^(\d{1,2}):(\d{2})/.exec(String(hhmm||''));return m?Number(m[1])*60+Number(m[2]):null}
function vacio(x){return x===undefined||x===null||x===''||!isFinite(Number(x))}
export function minimoExtra(reglas){return vacio(reglas.umbral)||vacio(reglas.jornada)?15:Math.max(0,Number(reglas.umbral)-Number(reglas.jornada))}
/* 'sem' o 'fin' según el día: domingo, feriado que se paga como feriado o sábado (si no trabajás los sábados) */
export function tipoDeDia(fecha,dias){var d=parse(fecha).getDay();return d===0||(d===6&&dias!=='ls')||pagaComoFeriado(fecha)?'fin':'sem'}
/* ¿Ya sé tu horario? */
export function tieneHorario(reglas){return aMin(reglas&&reglas.entrada)!==null&&aMin(reglas&&reglas.salida)!==null}
/* Tu horario (2.26): entrás, salís y qué días. La jornada sale del horario; el mínimo de minutos extra se conserva. */
export function aplicarHorario(h,d){
  var en=aMin(d&&d.entrada),sa=aMin(d&&d.salida);
  if(en===null||sa===null)return {ok:false,error:'horario'};
  var jor=sa-en;if(jor<=0)jor+=24*60;
  var min=tieneHorario(h)?minimoExtra(h):0;
  h.entrada=String(d.entrada).slice(0,5);h.salida=String(d.salida).slice(0,5);h.dias=d.dias==='ls'?'ls':'lv';
  h.jornada=jor;h.umbral=jor+min;
  return {ok:true};
}
/* Cómo te pagan las extras (2.26): entre semana (×), fin de semana y feriados (×) y desde cuántos minutos cuentan */
export function aplicarPago(h,d){
  var ms=Number(d&&d.multSem),mf=Number(d&&d.multFin),de=d&&d.desde;
  if(d&&d.multSem!==undefined){if(!(ms>0&&ms<=10))return {ok:false,error:'multSem'};h.multSem=ms}
  if(d&&d.multFin!==undefined){if(!(mf>0&&mf<=10))return {ok:false,error:'multFin'};h.multFin=mf}
  if(de!==undefined){var m=Math.round(Number(de));if(!(m>=0&&m<=240))return {ok:false,error:'desde'};h.umbral=(Number(h.jornada)||0)+m}
  return {ok:true};
}

/* reglas: perfil.horas (entrada, salida, umbral, jornada). Devuelve {antes, despues, total, min, cuenta, turno} */
export function extraPorHorario(reglas,llegada,salida,tipo){
  var ll=aMin(llegada),sa=aMin(salida);
  if(ll===null||sa===null)return null;
  if(sa<=ll)sa+=24*60; /* salida después de medianoche */
  var turno=sa-ll;
  if(tipo==='fin')return {antes:0,despues:0,total:turno,min:turno,cuenta:turno>0,turno:turno};
  var en=aMin(reglas.entrada),sl=aMin(reglas.salida);
  if(en===null||sl===null)return null; /* sin tu horario no sé qué es extra */
  var antes=Math.max(0,en-ll),despues=Math.max(0,sa-sl),total=antes+despues,cuenta=total>0&&total>=minimoExtra(reglas);
  return {antes:antes,despues:despues,total:total,min:cuenta?total:0,cuenta:cuenta,turno:turno};
}
