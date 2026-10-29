/* Plata que entra antes del cobro (2.20; desde 2.30 solo el día que llega, como nota al margen en Hoy).
   Viene de «Otros cobros del mes» en Fijos (logica/ingresos.js). No cuenta hasta que tocás «Me entró». */
import {num} from '../logica/util.js';
import {normEsperado,recibirEsperado,quitarEsperado,deshacerEsperado} from '../logica/supervivencia.js';
import {programarIngresos} from '../logica/ingresos.js';
import {ctx,$,today,money,esc,toast,toastAccion} from './comun.js';

function notaHTML(x){
  return '<div class="banner entrada" data-svid="'+esc(x.id)+'"><p><b>¿Te entraron los '+money(x.monto)+'?</b>'+(x.nota?' '+esc(x.nota)+'.':'')+'</p>'
    +'<div class="sv-recibir"><div class="money"><span>$</span><input type="number" inputmode="decimal" min="0" step="any" aria-label="Cuánto te entró" value="'+x.monto+'" data-svmonto></div>'
    +'<button class="btn" type="button" data-ent="entro">Me entró</button><button class="btn quiet" type="button" data-ent="no">No</button></div></div>';
}

export function renderEntradas(){
  var el=$('#entradas');if(!el)return;
  var st=ctx.state,p=st.plan,t=today();
  if(!(num(p.monto)>0)||t>=p.cobro){el.innerHTML='';return}
  if(programarIngresos(st).length)ctx.persist();
  el.innerHTML=normEsperado(p.esperado).filter(function(x){return x.fecha<=t}).map(notaHTML).join('');
}
function cambio(){ctx.persist();ctx.syncInputs();ctx.renderAll()}
export function initEntradas(){
  var el=$('#entradas');if(!el)return;
  el.addEventListener('click',function(e){
    var b=e.target.closest('[data-ent]');if(!b)return;
    var li=b.closest('[data-svid]'),id=li&&li.getAttribute('data-svid'),u;
    if(b.getAttribute('data-ent')==='entro'){
      var inp=li.querySelector('[data-svmonto]'),v=inp?inp.value:'';
      if(v!==''&&!(num(v)>=0)){toast('Poné cuánto te entró.');return}
      u=recibirEsperado(ctx.state,id,v===''?null:num(v));if(!u)return;
      cambio();toastAccion('Sumé '+money(u.entro)+' a tu plata','Deshacer',function(){deshacerEsperado(ctx.state,u);cambio()});return;
    }
    u=quitarEsperado(ctx.state,id);if(!u)return;
    cambio();toastAccion('Listo, no lo sumo','Deshacer',function(){deshacerEsperado(ctx.state,u);cambio()});
  });
}
