/* Cuentas entre los dos (2.61, puro): gastos compartidos al estilo «quién pagó y de quién era».
   state.pareja.cuentas: [{id, fecha, nota, monto, paga:'yo'|'pareja', de:'conjunto'|'yo'|'pareja', parte}]
   · parte = lo que te toca a VOS de ese gasto, en pesos, fijado al anotarlo (si después cambia el reparto, lo viejo no se mueve).
   · un saldo es {tipo:'saldo', monto, paga}: plata que uno le pasó al otro para quedar a mano.
   El balance es positivo si tu pareja te debe y negativo si le debés vos. */
import {num} from './util.js';
function r2(x){return Math.round(x*100)/100}
/* Lo que te toca a vos de un gasto: todo si era tuyo, nada si era de tu pareja, y tu parte del reparto si era de los dos */
export function parteMia(monto,de,pctYo){
  var m=num(monto);if(de==='yo')return r2(m);if(de==='pareja')return 0;
  var p=num(pctYo);if(!(p>=0&&p<=1))p=.5;return r2(m*p);
}
export function nuevoGasto(d,pctYo){
  var m=r2(num(d.monto));
  if(!(m>0))return {ok:false,error:'Poné cuánto fue.'};
  var paga=d.paga==='pareja'?'pareja':'yo',de=d.de==='yo'||d.de==='pareja'?d.de:'conjunto';
  if(paga===de)return {ok:false,error:'Si lo pagó quien lo usó, no hay nada que dividir.'};
  return {ok:true,gasto:{id:d.id,fecha:d.fecha,nota:String(d.nota||'').trim().slice(0,60),monto:m,paga:paga,de:de,parte:parteMia(m,de,pctYo)}};
}
export function balance(cuentas){
  var s=0;(cuentas||[]).forEach(function(c){
    var m=num(c.monto);
    if(c.tipo==='saldo'){s+=c.paga==='yo'?m:-m;return}
    s+=c.paga==='yo'?m-num(c.parte):-num(c.parte);
  });
  return r2(s);
}
/* «Saldar»: el que debe le pasa al otro justo lo que falta. Devuelve el movimiento, o null si ya están a mano. */
export function saldar(cuentas,d){
  var b=balance(cuentas);if(Math.abs(b)<0.01)return null;
  return {id:d.id,fecha:d.fecha,tipo:'saldo',monto:Math.abs(b),paga:b>0?'pareja':'yo'};
}
/* Lo gastado en conjunto y cuánto puso cada uno de su bolsillo (sin contar los saldos) */
export function resumen(cuentas){
  var r={total:0,yo:0,pareja:0};
  (cuentas||[]).forEach(function(c){if(c.tipo==='saldo')return;var m=num(c.monto);r.total+=m;r[c.paga==='pareja'?'pareja':'yo']+=m});
  return {total:r2(r.total),yo:r2(r.yo),pareja:r2(r.pareja)};
}
/* El ahorro del pacto: juntos (una sola meta) o dividido (cada uno guarda su parte) */
export function ahorroDe(ahorro,pctYo,modo){
  var a=num(ahorro);if(modo!=='dividido')return {juntos:a};
  var p=num(pctYo);if(!(p>=0&&p<=1))p=.5;var yo=Math.round(a*p);return {yo:yo,pareja:Math.round(a)-yo};
}
