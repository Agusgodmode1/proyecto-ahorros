/* Capítulo VII · Lo guardado: lo que juntaste pacto a pacto, el fondo de emergencia (con su avance como sello)
   y tus metas (la tarjeta de metas de siempre, ui/metas.js). Las cuentas son puras (logica/guardado.js). */
import {MESL} from '../logica/fechas.js';
import {resumenGuardado} from '../logica/guardado.js';
import {renderMetas} from './metas.js';
import {ctx,$,today,money,esc} from './comun.js';
import {TIPOS_APARTADO,normApartado,totalApartado} from '../logica/pacto.js';
import {abrirPostal} from './postal.js';

function mesTxt(k){return MESL[Number(k.slice(5,7))-1]+' '+k.slice(0,4)}
function plural(n,a,b){return n+' '+(n===1?a:b)}
var CONSEJO={
  fondo:'<b>Primero, tu fondo de emergencia;</b> después, tus metas.',
  metas:'<b>Tu fondo de emergencia ya está:</b> lo que guardes puede ir a tus metas.',
  listo:'<b>Primero, un fondo de emergencia;</b> después, tus metas.'
};

/* La plata apartada (2.17): lo que tenés pero no entra en el plan, con el ahorro que ya tenías primero */
function apartadoHTML(){
  var l=normApartado(ctx.state.pacto&&ctx.state.pacto.apartado),t=totalApartado(l),nom={};
  if(!t)return '';
  TIPOS_APARTADO.forEach(function(x){nom[x.id]=x.t});
  l.sort(function(a,b){return (a.tipo==='ahorro'?0:1)-(b.tipo==='ahorro'?0:1)});
  return '<div class="card stack guard-ap"><h2>Lo que tenés apartado</h2>'
    +'<p class="note">Es tuyo o lo tenés vos, pero no entra en el plan: no se gasta.</p>'
    +'<ul class="ap-lista">'+l.map(function(a){return '<li><span>'+esc(nom[a.tipo])+(a.nota?'<small>'+esc(a.nota)+'</small>':'')+'</span><b>'+money(a.monto)+'</b></li>'}).join('')
    +(l.length>1?'<li class="tot"><span>En total</span><b>'+money(t)+'</b></li>':'')+'</ul>'
    +'<div class="row-btns"><button class="btn" type="button" data-ap-cambiar>Cambiar lo apartado</button></div></div>';
}

export function renderGuardado(){
  var top=$('#guardado-top'),pac=$('#guardado-pactos');if(!top)return;
  var r=resumenGuardado(ctx.state,today()),h='';
  h+='<div class="card guard-tot"><span class="cd-l">Guardaste en total</span>'+(r.total>0||r.pactos.length?'<b class="guard-n">'+money(r.total)+'</b>':'<b class="guard-n vacio">Todavía nada</b>')
    +'<span class="note">'+(r.pactos.length?'en '+plural(r.pactos.length,'pacto cerrado','pactos cerrados')+' · el último, '+money(r.ultimo.ahorrado):'Cuando cobres, lo que no gastaste se suma acá.')+'</span></div>';
  h+=apartadoHTML();
  h+='<div class="banner"><p>'+CONSEJO[r.paso]+'</p></div>';
  if(r.fondo){
    var f=r.fondo,pct=Math.round(f.pct*100);
    h+='<div class="card stack guard-fondo"><h2>Tu fondo de emergencia</h2><div class="fondo">'
      +'<div class="anillo'+(f.completo?' lleno':'')+'" role="img" aria-label="Tenés el '+pct+' % del fondo" style="--p:'+pct+'%"><span>'+(f.completo?'✓':pct+' %')+'</span></div>'
      +'<div><p class="note">Tenés <b>'+money(f.tiene)+'</b> de <b>'+money(f.objetivo)+'</b>.</p>'
      +'<p class="note">'+(f.completo?'¡Listo! Te cubre unos 3 meses.':(f.id?'':'3 meses de lo que gastás. ')+'Te faltan '+money(f.falta)+(f.pactos?': a tu ritmo, unos '+plural(f.pactos,'pacto','pactos'):'')+'.')+'</p></div></div>'
      +(f.completo?'':'<div class="row-btns">'+(f.id?'<button class="btn primary" type="button" data-fondo-sumar="'+esc(f.id)+'">Sumar al fondo</button>':'<button class="btn primary" type="button" data-fondo-crear>Crear mi fondo de emergencia</button>')+'</div>')
      +'</div>';
  }
  top.innerHTML=h;
  /* (2.16) tocar un pacto abre su postal para compartir */
  pac.innerHTML=r.pactos.length?'<div class="card stack"><h2>Pacto por pacto</h2><p class="note">Tocá un pacto para compartirlo como imagen.</p><ul class="pactos">'+r.pactos.slice(0,12).map(function(p){
    return '<li><button type="button" class="pac-b" data-postal="'+esc(p.k)+'" aria-label="Compartir el capítulo de '+mesTxt(p.k)+'"><span class="mini-sello'+(p.ok?'':' no')+'" aria-hidden="true">'+(p.ok?'✓':'—')+'</span><span>'+mesTxt(p.k)+'<small>'+(p.meta>0?'meta '+money(p.meta)+' · ':'')+(p.ok?'cumplido':'no llegó')+'</small></span><b>'+money(p.ahorrado)+'</b>'
      +'<svg class="pac-sh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M8 7.5 12 3.5l4 4"/><path d="M8 10.5H6.5A1.5 1.5 0 0 0 5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5H16"/></svg></button></li>';
  }).join('')+'</ul></div>':'';
  renderMetas();
}

export function initGuardado(){
  var el=$('#p-guardado');if(!el)return;
  el.addEventListener('click',function(e){
    var po=e.target.closest('[data-postal]');if(po){abrirPostal(po.getAttribute('data-postal'));return}
    if(e.target.closest('[data-ap-cambiar]')){ctx.abrirPrologo('pacto','qa');return}
    if(e.target.closest('[data-fondo-crear]')){
      var form=$('#meta-form'),r=resumenGuardado(ctx.state,today());if(!form)return;
      form.hidden=false;$('#m-nombre').value='Fondo de emergencia';if(r.fondo)$('#m-obj').value=Math.round(r.fondo.objetivo);
      try{form.scrollIntoView({block:'center',behavior:'smooth'})}catch(x){}
      $('#m-obj').focus();return;
    }
    var s=e.target.closest('[data-fondo-sumar]');
    if(s){
      var f=document.querySelector('[data-metaf="'+s.getAttribute('data-fondo-sumar')+'"]');if(!f)return;
      try{f.scrollIntoView({block:'center',behavior:'smooth'})}catch(x){}
      var i=f.querySelector('input');if(i)i.focus();
    }
  });
}
