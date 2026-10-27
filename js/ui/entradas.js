/* «Te va a entrar» en Hoy (2.20): la plata que esperás antes de cobrar, para todos.
   Viene de dos lados: los ingresos fijos (se anotan solos en cada pacto, logica/ingresos.js) y lo que anotás a mano
   en el modo supervivencia. No cuenta hasta que llega: el día que toca, pregunta «¿Te entró?». */
import {num} from '../logica/util.js';
import {normEsperado,recibirEsperado,quitarEsperado,deshacerEsperado} from '../logica/supervivencia.js';
import {programarIngresos} from '../logica/ingresos.js';
import {ctx,$,today,money,esc,fLarga,toast,toastAccion} from './comun.js';

function filaHTML(x,llego){
  if(llego)return '<li class="sv-llego" data-svid="'+esc(x.id)+'"><p><b>¿Te entraron los '+money(x.monto)+'?</b><small>'+(x.nota?esc(x.nota)+' · ':'')+'era para el '+esc(fLarga(x.fecha))+'</small></p>'
    +'<div class="sv-recibir"><div class="money"><span>$</span><input type="number" inputmode="decimal" min="0" step="any" aria-label="Cuánto te entró" value="'+x.monto+'" data-svmonto></div>'
    +'<button class="btn" type="button" data-ent="entro">Me entró</button></div>'
    +'<button class="btn quiet" type="button" data-ent="no">'+(x.fijo?'No lo sumes':'No va a entrar')+'</button></li>';
  return '<li data-svid="'+esc(x.id)+'"><span>'+esc(fLarga(x.fecha))+(x.nota?'<small>'+esc(x.nota)+'</small>':'')+'</span><b>'+money(x.monto)+'</b>'
    +(x.fijo?'':'<button class="btn quiet sv-x" type="button" data-ent="no" aria-label="Quitar">Quitar</button>')+'</li>';
}

export function renderEntradas(){
  var el=$('#entradas');if(!el)return;
  var st=ctx.state,p=st.plan,t=today();
  if(!(num(p.monto)>0)||t>=p.cobro){el.innerHTML='';return}
  if(programarIngresos(st).length)ctx.persist();
  var l=normEsperado(p.esperado);
  if(!l.length){el.innerHTML='';return}
  var llego=l.filter(function(x){return x.fecha<=t}),luego=l.filter(function(x){return x.fecha>t}),tot=0;
  luego.forEach(function(x){tot+=x.monto});
  var h='<div class="card stack entradas">';
  if(llego.length)h+='<ul class="sv-lista">'+llego.map(function(x){return filaHTML(x,true)}).join('')+'</ul>';
  if(luego.length)h+='<div class="stack" style="gap:6px"><h2 class="sv-h3">Te va a entrar '+money(tot)+'</h2><p class="note">Antes de cobrar. No lo cuento hasta que llegue: ese día te pregunto.</p><ul class="sv-lista">'+luego.map(function(x){return filaHTML(x,false)}).join('')+'</ul></div>';
  el.innerHTML=h+'</div>';
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
