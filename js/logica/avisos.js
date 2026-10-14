/* Cosas que vencen solas (puro): feriados cargados por año y valor de la BPC. */
import {feriadosActivos} from './feriados.js';

/* Años (de hoy y del próximo cobro) que no tienen ningún feriado cargado */
export function aniosSinFeriados(state,hoy){
  var lista=feriadosActivos(state.feriados),anios={};
  lista.forEach(function(f){anios[f.fecha.slice(0,4)]=1});
  var pedir=[hoy.slice(0,4)];
  if(state.plan&&state.plan.cobro)pedir.push(String(state.plan.cobro).slice(0,4));
  return pedir.filter(function(y,i){return pedir.indexOf(y)===i&&!anios[y]});
}
/* ¿Hay que revisar la BPC? Cambia cada enero: avisa si el año en que la confirmaste quedó atrás. */
export function revisarBPC(state,hoy){
  var y=Number(hoy.slice(0,4)),a=Number(state.sueldo&&state.sueldo.bpcAnio)||0;
  return a>0&&a<y;
}
