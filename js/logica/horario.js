/* Horas extra a partir del horario del día (puro).
   Entre semana: se suman los minutos que llegaste antes y los que te quedaste después de tu horario;
   el día cuenta si ese total llega al mínimo del perfil (por defecto 15 min; 15 justos ya cuentan).
   Fin de semana o feriado no laborable: cuenta el turno entero. */
import {parse,pagaComoFeriado} from './fechas.js';

export function aMin(hhmm){var m=/^(\d{1,2}):(\d{2})/.exec(String(hhmm||''));return m?Number(m[1])*60+Number(m[2]):null}
export function minimoExtra(reglas){return Math.max(0,(Number(reglas.umbral)||555)-(Number(reglas.jornada)||540))}
/* 'sem' o 'fin' según el día: sábado, domingo o feriado que se paga como feriado */
export function tipoDeDia(fecha){var d=parse(fecha).getDay();return d===0||d===6||pagaComoFeriado(fecha)?'fin':'sem'}

/* reglas: perfil.horas (entrada, salida, umbral, jornada). Devuelve {antes, despues, total, min, cuenta, turno} */
export function extraPorHorario(reglas,llegada,salida,tipo){
  var ll=aMin(llegada),sa=aMin(salida);
  if(ll===null||sa===null)return null;
  if(sa<=ll)sa+=24*60; /* salida después de medianoche */
  var turno=sa-ll;
  if(tipo==='fin')return {antes:0,despues:0,total:turno,min:turno,cuenta:turno>0,turno:turno};
  var en=aMin(reglas.entrada||'12:00'),sl=aMin(reglas.salida||'21:00');
  var antes=Math.max(0,en-ll),despues=Math.max(0,sa-sl),total=antes+despues,cuenta=total>0&&total>=minimoExtra(reglas);
  return {antes:antes,despues:despues,total:total,min:cuenta?total:0,cuenta:cuenta,turno:turno};
}
