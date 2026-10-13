/* Dólares (puro). La cotización la cargás a mano en Ajustes (state.monedas).
   Cada gasto en dólares guarda su monto en pesos (monto), el original (usd) y la cotización de ese día (cotiz):
   así cambiar la cotización después no cambia el pasado y todas las cuentas siguen en pesos. */
import {num} from './util.js';

export function monedasBase(){return {cotizacion:0,fecha:null}}
export function cotizacion(state){var m=state&&state.monedas;return m&&num(m.cotizacion)>0?num(m.cotizacion):0}
export function aPesos(usd,cot){return Math.round(num(usd)*num(cot)*100)/100}
/* Gasto en dólares listo para guardar */
export function gastoUSD(usd,cot){return {monto:aPesos(usd,cot),usd:Math.round(num(usd)*100)/100,cotiz:num(cot)}}
/* Al cambiar la cotización, los gastos fijos en dólares (que se pagan cada mes) se recalculan con la nueva.
   Los gastos ya anotados no se tocan. Devuelve cuántos fijos cambiaron. */
export function actualizarFijosUSD(state,cot){
  var n=0;
  (state.fijos||[]).forEach(function(f){if(num(f.usd)>0){f.monto=aPesos(f.usd,cot);f.cotiz=num(cot);n++}});
  return n;
}
