/* Fechas y días hábiles (puro, sin DOM).
   Los feriados vienen de feriados.js; la app llama a usarFeriados() con la lista que editaste en Ajustes
   y con las opciones del perfil:
   - laborableHabil: los feriados laborables cuentan como día hábil (para el día de cobro).
   - pagoLaborable: 'feriado' o 'comun', cómo se paga un feriado laborable trabajado. */
import {FERIADOS_UY} from './feriados.js';

var HOL={},OPC={laborableHabil:false,pagoLaborable:'feriado'};
export function usarFeriados(lista,opc){
  HOL={};lista.forEach(function(f){if(typeof f==='string')HOL[f]={laborable:false};else HOL[f.fecha]={laborable:!!f.laborable}});
  opc=opc||{};
  OPC={laborableHabil:!!opc.laborableHabil,pagoLaborable:opc.pagoLaborable==='comun'?'comun':'feriado'};
}
usarFeriados(FERIADOS_UY);

export var MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
export var MESL=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'];
export var DIA=['dom','lun','mar','mié','jue','vie','sáb'];
export var DIAL=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

export function pad(n){return (n<10?'0':'')+n}
export function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
export function parse(s){var p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2],12)}
export function addDays(d,n){var x=new Date(d.getTime());x.setDate(x.getDate()+n);return x}
export function diffDays(a,b){return Math.round((parse(b)-parse(a))/864e5)}
export function esFeriado(s){return !!HOL[s]}
export function esLaborable(s){return !!(HOL[s]&&HOL[s].laborable)}
/* ¿Trabajar ese día se paga como feriado? (todos los no laborables; los laborables, según el perfil) */
export function pagaComoFeriado(s){var h=HOL[s];return !!h&&!(h.laborable&&OPC.pagoLaborable==='comun')}
export function isBiz(d){var w=d.getDay();if(w===0||w===6)return false;var h=HOL[iso(d)];return !h||(h.laborable&&OPC.laborableHabil)}
export function bizRank(s){
  var d=parse(s);if(!isBiz(d))return null;
  var n=0;for(var i=1;i<=d.getDate();i++){if(isBiz(new Date(d.getFullYear(),d.getMonth(),i,12)))n++}
  return n;
}
export function hoyISO(){return iso(new Date())}
