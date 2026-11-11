/* La estantería (2.60): la pantalla de inicio con los lomos de los libros. Tocar uno lo saca del estante.
   Solo transform y opacity; con «reducir movimiento», solo fundidos. Qué libros hay: logica/libros.js. */
import {LIBROS} from '../logica/libros.js';

var UL='pa-libro',DI='pa-directo',VER='pa-estante';
function ls(k){try{return localStorage.getItem(k)}catch(e){return null}}
export function ultimoLibro(){return ls(UL)}
export function recordarLibro(id){try{localStorage.setItem(UL,id)}catch(e){}}
export function directo(){return ls(DI)==='1'}
export function setDirecto(v){try{localStorage.setItem(DI,v?'1':'0')}catch(e){}}
/* «Cambiar de libro»: al recargar se muestra la estantería aunque esté «abrir directo» */
export function pedirEstante(){try{sessionStorage.setItem(VER,'1')}catch(e){}}
export function estantePedido(){try{var v=sessionStorage.getItem(VER)==='1';sessionStorage.removeItem(VER);return v}catch(e){return false}}
function quieto(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}

var EMBLEMA={
  solo:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18 10 12 8 6M10 12l7-2 2 6" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><g fill="currentColor"><circle cx="5" cy="18" r="1.6"/><circle cx="10" cy="12" r="2"/><circle cx="8" cy="6" r="1.4"/><circle cx="17" cy="10" r="1.6"/><circle cx="19" cy="16" r="1.3"/></g></svg>',
  duo:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15Q12 6 18 9" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><path d="M6 11.2l1.1 2.7 2.7 1.1-2.7 1.1L6 18.8l-1.1-2.7L2.2 15l2.7-1.1zM18 5.6l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="currentColor"/></svg>'
};
function lomo(l,ultimo){
  return '<li class="es-li"><button type="button" class="es-lomo es-'+l.id+(l.bloqueado?' es-cerrado':'')+(ultimo===l.id?' es-ultimo':'')+'" data-libro="'+l.id+'"'
    +' aria-label="'+(l.bloqueado?l.titulo+', '+l.voz+': todavía no se puede abrir':'Abrir '+l.titulo+', '+l.voz)+'">'
    +'<span class="es-emb">'+EMBLEMA[l.id]+'</span><span class="es-banda"></span><span class="es-tit">'+l.titulo+'</span><span class="es-banda"></span></button>'
    +'<small class="es-lema">'+l.lema+'</small></li>';
}
/* Muestra la estantería y espera a que se elija un libro. Devuelve su id. */
export function elegirLibro(){
  var el=document.getElementById('estante'),ultimo=ultimoLibro();
  el.innerHTML='<h1 class="es-h">Elegí tu libro</h1><ol class="es-fila">'+LIBROS.map(function(l){return lomo(l,ultimo)}).join('')+'</ol><div class="es-tabla" aria-hidden="true"></div>'
    +'<p class="es-aviso" id="es-aviso" role="status" aria-live="polite"></p>';
  el.hidden=false;
  if(!quieto())el.animate([{opacity:0},{opacity:1}],{duration:320});
  var f=el.querySelector('.es-ultimo');if(f)try{f.focus({preventScroll:true})}catch(e){}
  return new Promise(function(ok){
    var elegido=false;
    el.onclick=function(e){
      var b=e.target.closest('[data-libro]');if(!b||elegido)return;
      var l=LIBROS.filter(function(x){return x.id===b.getAttribute('data-libro')})[0];
      if(l.bloqueado){
        document.getElementById('es-aviso').textContent='Este libro todavía se está escribiendo ✨';
        if(!quieto())b.animate([{transform:'translateX(0)'},{transform:'translateX(-5px) rotate(-1.5deg)'},{transform:'translateX(5px) rotate(1.5deg)'},{transform:'translateX(-3px)'},{transform:'translateX(0)'}],{duration:380});
        return;
      }
      elegido=true;
      var fin=function(){el.hidden=true;el.innerHTML='';el.onclick=null;ok(l.id)};
      if(quieto()){el.animate([{opacity:1},{opacity:0}],{duration:260}).onfinish=fin;return}
      /* el libro sale del estante hacia adelante y gira hasta mostrar la tapa; los demás se apagan */
      el.querySelectorAll('.es-li').forEach(function(li){if(!li.contains(b))li.animate([{opacity:1},{opacity:.15}],{duration:400,fill:'forwards'})});
      b.style.animation='none';
      b.animate([{transform:'perspective(900px) translateY(0) translateZ(0) rotateY(0)'},{transform:'perspective(900px) translateY(-26px) translateZ(60px) rotateY(0)',offset:.4},{transform:'perspective(900px) translateY(-26px) translateZ(120px) rotateY(-90deg)'}],{duration:700,easing:'cubic-bezier(.4,.1,.2,1)',fill:'forwards'});
      el.animate([{opacity:1},{opacity:1,offset:.75},{opacity:0}],{duration:820}).onfinish=fin;
    };
  });
}
