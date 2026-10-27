/* Modo supervivencia en Hoy (2.18): la tarjeta que aparece cuando la plata no da ni para lo básico hasta el cobro.
   La meta pasa a ser llegar: cuánto tenés por semana y por día, hasta cuándo te alcanza a tu ritmo, qué pagar primero
   y la plata que te va a entrar antes de cobrar (no cuenta hasta que tocás «Me entró»). Las cuentas: logica/supervivencia.js. */
import {num} from '../logica/util.js';
import {iso,addDays,parse} from '../logica/fechas.js';
import {estadoSupervivencia,agregarEsperado,recibirEsperado,quitarEsperado,deshacerEsperado} from '../logica/supervivencia.js';
import {ctx,$,today,money,esc,fLarga,toast,toastAccion,planNow} from './comun.js';

var formAbierto=false;

function entradaHTML(x,llego){
  if(llego)return '<li class="sv-llego" data-svid="'+esc(x.id)+'"><p><b>¿Te entraron los '+money(x.monto)+'?</b><small>'+(x.nota?esc(x.nota)+' · ':'')+'era para el '+esc(fLarga(x.fecha))+'</small></p>'
    +'<div class="sv-recibir"><div class="money"><span>$</span><input type="number" inputmode="decimal" min="0" step="any" aria-label="Cuánto te entró" value="'+x.monto+'" data-svmonto></div>'
    +'<button class="btn" type="button" data-sv="entro">Me entró</button></div>'
    +'<button class="btn quiet" type="button" data-sv="no">No va a entrar</button></li>';
  return '<li data-svid="'+esc(x.id)+'"><span>'+esc(fLarga(x.fecha))+(x.nota?'<small>'+esc(x.nota)+'</small>':'')+'</span><b>'+money(x.monto)+'</b><button class="btn quiet sv-x" type="button" data-sv="no" aria-label="Quitar">Quitar</button></li>';
}
function formHTML(){
  var p=ctx.state.plan,t=today(),max=iso(addDays(parse(p.cobro),-1));
  return '<form class="sv-form stack" id="sv-form" autocomplete="off"'+(formAbierto?'':' hidden')+'>'
    +'<div class="field"><label for="sv-monto">¿Cuánto?</label><div class="money"><span>$</span><input id="sv-monto" type="number" inputmode="decimal" min="0" step="any"></div></div>'
    +'<div class="field"><label for="sv-fecha">¿Qué día, más o menos?</label><input id="sv-fecha" type="date" min="'+t+'" max="'+max+'" value="'+t+'"></div>'
    +'<div class="field"><label for="sv-nota">¿De qué? (opcional)</label><input id="sv-nota" type="text" maxlength="40" placeholder="una changa, me devuelven, aguinaldo…"></div>'
    +'<p class="note err" id="sv-err" hidden></p>'
    +'<div class="row-btns"><button class="btn" type="submit">Anotar</button><button class="btn quiet" type="button" data-sv="cerrar">Cancelar</button></div></form>';
}

export function renderSuperv(pc){
  var el=$('#superv');if(!el)return;
  var st=ctx.state,t=today(),r=estadoSupervivencia(st,pc,t);
  if(!r){el.innerHTML='';return}
  var h='<div class="card stack superv"><p class="sv-kick">modo supervivencia</p>'
    +'<h2>La meta de este pacto es llegar al cobro</h2>'
    +'<p class="note">Con poca plata y '+r.dias+(r.dias===1?' día':' días')+' por delante, lo importante no es guardar: es no quedarte sin nada. Mirá la semana, no el día.</p>'
    +'<ul class="sv-datos"><li><span>Esta semana</span><b>'+money(r.porSemana)+'</b></li><li><span>Por día</span><b>'+money(r.porDia)+'</b></li></ul>';
  if(r.alcanza)h+='<p class="note sv-ritmo">'+(r.alcanza.llega?'<b>A tu ritmo llegás.</b> Venís gastando '+money(r.ritmo)+' por día.'
    :'<b>A tu ritmo ('+money(r.ritmo)+' por día) te alcanza '+(r.alcanza.dias<1?'hasta hoy':'hasta el '+esc(fLarga(r.alcanza.hasta)))+'.</b> Para llegar, unos '+money(r.porDia)+' por día.')+'</p>';
  h+='<ol class="sv-orden">'
    +(r.fijosPend>0?'<li><b>Primero, los fijos.</b> Te faltan pagar '+money(r.fijosPend)+'; ya están descontados.</li>':'')
    +'<li><b>'+(r.fijosPend>0?'Después':'Primero')+', lo de todos los días:</b> comida, transporte, salud.</li>'
    +'<li><b>Lo demás espera</b> hasta que cobres.</li></ol>';
  var llego=r.llego,luego=r.esperado.filter(function(x){return x.fecha>t});
  if(llego.length)h+='<ul class="sv-lista">'+llego.map(function(x){return entradaHTML(x,true)}).join('')+'</ul>';
  if(luego.length)h+='<div class="stack" style="gap:6px"><h3 class="sv-h3">Te va a entrar</h3><p class="note">No la cuento hasta que llegue.</p><ul class="sv-lista">'+luego.map(function(x){return entradaHTML(x,false)}).join('')+'</ul></div>';
  h+=(formAbierto?'':'<div class="row-btns"><button class="btn" type="button" data-sv="abrir">+ Me va a entrar plata</button></div>')+formHTML()+'</div>';
  el.innerHTML=h;
}
function cambio(){ctx.persist();ctx.syncInputs();ctx.renderAll()}
function deshacible(msg,u){toastAccion(msg,'Deshacer',function(){deshacerEsperado(ctx.state,u);cambio()})}

export function initSuperv(){
  var el=$('#superv');if(!el)return;
  el.addEventListener('click',function(e){
    var b=e.target.closest('[data-sv]');if(!b)return;
    var a=b.getAttribute('data-sv'),li=b.closest('[data-svid]'),id=li&&li.getAttribute('data-svid');
    if(a==='abrir'){formAbierto=true;renderSuperv(planNow());var m=$('#sv-monto');if(m)m.focus();return}
    if(a==='cerrar'){formAbierto=false;cambio();return}
    if(a==='entro'){
      var inp=li.querySelector('[data-svmonto]'),v=inp?inp.value:'';
      if(v!==''&&!(num(v)>=0)){toast('Poné cuánto te entró.');return}
      var u=recibirEsperado(ctx.state,id,v===''?null:num(v));if(!u)return;
      cambio();deshacible('Sumé '+money(u.entro)+' a tu plata',u);return;
    }
    if(a==='no'){var u2=quitarEsperado(ctx.state,id);if(!u2)return;cambio();deshacible('Lo saqué de lo que te va a entrar',u2)}
  });
  el.addEventListener('submit',function(e){
    if(e.target.id!=='sv-form')return;
    e.preventDefault();
    var r=agregarEsperado(ctx.state,{monto:$('#sv-monto').value,fecha:$('#sv-fecha').value,nota:$('#sv-nota').value},today());
    if(!r.ok){
      var er=$('#sv-err');er.hidden=false;
      er.textContent=r.error==='monto'?'Poné cuánto te va a entrar.':r.error==='pasada'?'Elegí hoy o un día que viene.':r.error==='despues'?'Si entra el día que cobrás o después, ya no es para este pacto.':'Elegí qué día.';
      return;
    }
    formAbierto=false;cambio();toast('Anotado. Cuando te entre, tocá «Me entró» y se suma.');
  });
}
