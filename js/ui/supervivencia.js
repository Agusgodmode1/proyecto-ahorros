/* Modo supervivencia en Hoy (2.18; desde 2.30 una sola nota al margen «ojo»): aparece cuando la plata no da ni para
   lo básico hasta el cobro. Dice cuánto tenés por día y, a tu ritmo, hasta cuándo te alcanza. Las cuentas: logica/supervivencia.js. */
import {estadoSupervivencia} from '../logica/supervivencia.js';
import {ctx,$,today,money,esc,fLarga} from './comun.js';

export function renderSuperv(pc){
  var el=$('#superv');if(!el)return;
  var r=estadoSupervivencia(ctx.state,pc,today());
  if(!r){el.innerHTML='';return}
  var a=r.alcanza&&!r.alcanza.llega?' A tu ritmo te alcanza '+(r.alcanza.dias<1?'hasta hoy':'hasta el '+esc(fLarga(r.alcanza.hasta)))+'.':'';
  el.innerHTML='<div class="banner alerta"><p>La meta es llegar al cobro: tenés <b>'+money(r.porDia)+' por día</b>.'+a+'</p></div>';
}
