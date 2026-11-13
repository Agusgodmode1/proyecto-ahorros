/* La estantería (2.62): una biblioteca de noche. Entre libros comunes hay dos libros mágicos que brillan; tocar uno
   lo saca del estante, lo gira y muestra su tapa. Solo transform y opacity; con «reducir movimiento», solo fundidos.
   (2.63) Encima entra con un fundido la estantería 3D (ui/escena3d.js, Three.js). La 2.62 se ve primero y queda de
   respaldo: cuándo va cada una lo decide logica/estante3d.js. Las dos entran al libro por la misma puerta: fin().
   Qué libros hay: logica/libros.js. */
import {LIBROS} from '../logica/libros.js';
import {crearControl,forzado} from '../logica/estante3d.js';

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

/* Azar con semilla: la biblioteca se ve siempre igual (no cambia de un día para otro) */
function azar(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
/* Lomos comunes, apagados, para que los dos mágicos se luzcan */
var PALETA=['#4a3124','#2f4a3a','#5b2c2c','#38405a','#6a5a3a','#2b3f4d','#51402f','#472f4a','#3a4b45','#5e4a3a','#3d2b2b','#2e3b2c'];
function comunes(n,seed){
  var r=azar(seed),h='';
  for(var i=0;i<n;i++){
    var inclina=r()<.07?(' --incl:'+(r()<.5?-1:1)*(4+Math.round(r()*3))+'deg;'):'';
    h+='<li class="es-n'+(inclina?' es-inc':'')+'" aria-hidden="true" style="--w:'+(0.7+r()*1.1).toFixed(2)+';--hh:'+Math.round(64+r()*28)+'%;--c:'+PALETA[Math.floor(r()*PALETA.length)]+';'+inclina+'"></li>';
  }
  return h;
}
function chispas(seed){
  var r=azar(seed),h='';
  for(var i=0;i<14;i++){
    var dur=3.4+r()*3.2,tam=(2.4+r()*3.6).toFixed(1);
    h+='<i class="'+(r()<.45?'es-st':'')+'" style="left:'+Math.round(-30+r()*160)+'%;bottom:'+Math.round(4+r()*92)+'%;width:'+tam+'px;height:'+tam+'px;--dx:'+Math.round((r()-.5)*54)+'px;animation-duration:'+dur.toFixed(2)+'s;animation-delay:-'+(r()*dur).toFixed(2)+'s"></i>';
  }
  return h;
}
function motas(){
  var r=azar(31),h='';
  for(var i=0;i<14;i++){
    var dur=11+r()*9;
    h+='<i style="left:'+Math.round(4+r()*46)+'%;top:'+Math.round(6+r()*78)+'%;--mx:'+Math.round(-20+r()*60)+'px;--my:'+Math.round(-30+r()*70)+'px;animation-duration:'+dur.toFixed(1)+'s;animation-delay:-'+(r()*dur).toFixed(1)+'s"></i>';
  }
  return h;
}
/* La tapa del libro: la que se ve al sacarlo del estante */
function tapaHTML(l){
  return '<span class="es-cara es-tapa-f"><span class="es-marco"></span><span class="es-polvo"></span>'
    +'<span class="es-emb2">'+EMBLEMA[l.id]+'</span><span class="es-t1">'+l.chico+'</span><span class="es-t2">'+l.grande+'</span><span class="es-brillo"></span></span>';
}
function lomoHTML(l){
  return '<span class="es-cara es-lomo-f"><span class="es-emb">'+EMBLEMA[l.id]+'</span><span class="es-banda"></span><span class="es-tit">'+l.titulo+'</span><span class="es-banda"></span></span>';
}
function magico(l,ultimo){
  var s=l.id==='solo'?7:19;
  return '<li class="es-li es-mag es-'+l.id+(ultimo===l.id?' es-ultimo':'')+'">'
    +'<button type="button" class="es-lomo'+(l.bloqueado?' es-cerrado':'')+'" data-libro="'+l.id+'" aria-label="'+(l.bloqueado?l.titulo+', '+l.voz+': todavía no se puede abrir':'Abrir '+l.titulo+', '+l.voz)+'">'
    +'<span class="es-aura"></span>'
    +'<span class="es-cuerpo">'+lomoHTML(l)+tapaHTML(l)+'</span><span class="es-chispas" aria-hidden="true">'+chispas(s)+'</span></button>'
    +'<small class="es-lema">'+l.lema+'</small></li>';
}
function biblioteca(ultimo){
  var a=LIBROS[0],b=LIBROS[1]||LIBROS[0];
  return '<div class="es-e es-e1"><ol class="es-fila">'+comunes(15,3)+'</ol></div><div class="es-tabla"></div>'
    +'<div class="es-e es-e2"><ol class="es-fila">'+comunes(5,11)+magico(a,ultimo)+comunes(6,23)+(LIBROS[1]?magico(b,ultimo)+comunes(5,41):'')+'</ol></div><div class="es-tabla"></div>'
    +'<div class="es-e es-e3"><ol class="es-fila">'+comunes(16,57)+'</ol></div><div class="es-tabla"></div>';
}

/* ---------- (2.63) la estantería 3D ---------- */
/* Three.js necesita WebGL 2. Se prueba con un lienzo aparte, que se suelta enseguida. */
function hayWebgl(){
  try{
    var g=document.createElement('canvas').getContext('webgl2');if(!g)return false;
    var x=g.getExtension('WEBGL_lose_context');if(x)x.loseContext();
    return true;
  }catch(e){return false}
}
var sesion={
  leer:function(k){try{return sessionStorage.getItem(k)==='1'}catch(e){return false}},
  poner:function(k){try{sessionStorage.setItem(k,'1')}catch(e){}}
};
/* La capa de la 3D: el lienzo va adentro. La pista, los lemas y un botón invisible por libro (44 px o más) van
   encima; la escena los acomoda sobre cada libro. Hasta que termina de aparecer no recibe toques. */
function capa3d(el){
  var c=document.createElement('div'),ls=LIBROS.filter(function(l){return !l.bloqueado}).slice(0,2);
  c.className='es-3d';c.setAttribute('aria-hidden','true');
  c.innerHTML='<p class="e3-pista">Tocá un libro</p>'
    +ls.map(function(l){return '<span class="e3-etq">'+l.lema+'</span>'}).join('')
    +ls.map(function(l){return '<button type="button" class="e3-libro" tabindex="-1" data-libro3d="'+l.id+'" aria-label="Abrir '+l.titulo+', '+l.voz+'"></button>'}).join('');
  el.appendChild(c);return c;
}

/* Muestra la estantería y espera a que se elija un libro. Devuelve su id. */
export function elegirLibro(){
  var el=document.getElementById('estante'),ultimo=ultimoLibro();
  el.innerHTML='<div class="es-fondo" aria-hidden="true"><div class="es-rayo"></div><div class="es-motas">'+motas()+'</div></div>'
    +'<div class="es-escena"><h1 class="es-h">Elegí tu libro</h1><div class="es-mueble">'+biblioteca(ultimo)+'</div>'
    +'<p class="es-aviso" id="es-aviso" role="status" aria-live="polite"></p></div><div class="es-oscuro" aria-hidden="true"></div>';
  el.hidden=false;
  if(!quieto()){
    /* entra como una cámara que se acerca despacio */
    var esc=el.querySelector('.es-escena');
    if(esc.animate)esc.animate([{opacity:0,transform:'scale(1.08)'},{opacity:1,transform:'scale(1)'}],{duration:1700,easing:'cubic-bezier(.2,.7,.2,1)'});
    el.animate([{opacity:0},{opacity:1}],{duration:700});
  }
  var f=el.querySelector('.es-ultimo .es-lomo');if(f)try{f.focus({preventScroll:true})}catch(e){}
  return new Promise(function(ok){
    var elegido=false,hecho=false,capa=null,control;
    function vis(){control.visibilidad()}
    function quitarCapa(){
      /* quien estaba con el teclado sobre un libro de la 3D sigue sobre el mismo libro en la 2.62 */
      var act=document.activeElement,con=null;
      try{if(capa&&act&&capa.contains(act)&&act.matches('[data-libro3d]:focus-visible'))con=act.getAttribute('data-libro3d')}catch(e){}
      el.classList.remove('es-con3d');if(capa){var c=capa;capa=null;c.remove()}
      var f=con&&el.querySelector('[data-libro="'+con+'"]');if(f)try{f.focus({preventScroll:true})}catch(e){}
    }
    /* La única puerta para entrar a un libro, venga de la 3D o de la 2.62: abre una sola vez y deja todo limpio */
    function fin(id){
      if(hecho)return;hecho=true;
      document.removeEventListener('visibilitychange',vis);
      control.cerrar();
      try{el.getAnimations().forEach(function(a){a.cancel()})}catch(e){}
      el.hidden=true;el.innerHTML='';el.onclick=null;capa=null;el.classList.remove('es-con3d');ok(id);
    }
    control=crearControl({
      forzar:forzado(location.search),
      quieto:quieto,webgl:hayWebgl,
      visible:function(){return document.visibilityState!=='hidden'},
      ahora:function(){return performance.now()},
      temporizador:function(fn,ms){var t=setTimeout(fn,ms);return function(){clearTimeout(t)}},
      sesion:sesion,
      crear:function(){
        quitarCapa();
        var mia=capa=capa3d(el);
        return import('./escena3d.js').then(function(m){
          return m.crearEscena({capa:mia,pista:mia.querySelector('.e3-pista'),
            etiquetas:[].slice.call(mia.querySelectorAll('.e3-etq')),botones:[].slice.call(mia.querySelectorAll('.e3-libro')),
            cancelado:function(){return hecho||capa!==mia},
            alPerder:function(){if(capa===mia)control.perdida()},
            alError:function(e){if(capa===mia)control.error(e)}});
        });
      },
      /* la 3D entra con un fundido por encima de la 2.62; mientras dura, los toques siguen siendo de la 2.62 */
      fundir:function(listo){
        var mia=capa;
        mia.animate([{opacity:0},{opacity:1}],{duration:900,easing:'ease-in-out',fill:'forwards'}).onfinish=function(){if(capa===mia)listo()};
      },
      mostrada:function(){
        /* quien venía con el teclado sobre un libro de la 2.62 sigue sobre el mismo libro en la 3D */
        var act=document.activeElement,con=null;
        try{if(act&&el.contains(act)&&act.matches('[data-libro]:focus-visible'))con=act.getAttribute('data-libro')}catch(e){}
        capa.style.opacity='1';capa.classList.add('e3-lista');capa.removeAttribute('aria-hidden');
        [].forEach.call(capa.querySelectorAll('.e3-libro'),function(b){b.removeAttribute('tabindex')});
        el.classList.add('es-con3d');
        var f=con&&capa.querySelector('[data-libro3d="'+con+'"]');if(f)try{f.focus({preventScroll:true})}catch(e){}
      },
      quitar:quitarCapa,
      salir:function(id){el.animate([{opacity:1},{opacity:0}],{duration:420,fill:'both'}).onfinish=function(){fin(id)}},
      entrar:fin,
      /* queda anotado en la consola por qué se ve la 2.62 (para revisar en Safari o en la computadora) */
      aviso:function(motivo,detalle){try{console.info('Estantería 3D → queda la 2.62: '+motivo,detalle||'')}catch(e){}}
    });
    document.addEventListener('visibilitychange',vis);
    el.onclick=function(e){
      var b3=e.target.closest('[data-libro3d]');
      if(b3){control.tocar3d(b3.getAttribute('data-libro3d'));return}
      var b=e.target.closest('[data-libro]');if(!b||elegido)return;
      var l=LIBROS.filter(function(x){return x.id===b.getAttribute('data-libro')})[0];
      if(l.bloqueado){
        document.getElementById('es-aviso').textContent='Este libro todavía se está escribiendo ✨';
        if(!quieto())b.animate([{transform:'translateX(0)'},{transform:'translateX(-5px) rotate(-1.5deg)'},{transform:'translateX(5px) rotate(1.5deg)'},{transform:'translateX(-3px)'},{transform:'translateX(0)'}],{duration:380});
        return;
      }
      /* (regla 3) si la 3D todavía no terminó de aparecer, el toque es de la 2.62 y la 3D se cancela */
      if(!control.tocar262())return;
      elegido=true;
      var entrar=function(){fin(l.id)};
      if(quieto()){el.animate([{opacity:1},{opacity:0}],{duration:260}).onfinish=entrar;return}
      sacar(el,b,l,entrar);
    };
    control.iniciar();
  });
}

/* El libro sale del estante, viaja al centro, gira y muestra su tapa; el resto de la biblioteca se apaga. */
function sacar(el,b,l,fin){
  var r=b.getBoundingClientRect(),W=window.innerWidth,H=window.innerHeight,w=r.width,h=r.height,d=h*.7;
  var ox=r.left+w/2-W/2,oy=r.top+h/2-H/2;
  var P=1000,Z=250,k=P/(P-Z),alto=Math.min(H*.58,W*.8/.7),esc=alto/h/k;
  var v=document.createElement('div');v.className='es-vuelo es-'+l.id;
  var libro=document.createElement('div');libro.className='es-vl es-mag es-'+l.id;
  libro.style.cssText='--h:'+h+'px;--d:'+d+'px;width:'+w+'px;height:'+h+'px;left:'+(W/2-w/2)+'px;top:'+(H/2-h/2)+'px';
  libro.innerHTML='<span class="es-cuerpo">'+lomoHTML(l)+tapaHTML(l)+'</span>';
  var dest=document.createElement('div');dest.className='es-destello';
  v.appendChild(dest);v.appendChild(libro);el.appendChild(v);
  var cuerpo=b.querySelector('.es-cuerpo');cuerpo.style.visibility='hidden';
  /* lo demás de la biblioteca se apaga y se acerca un poco, como una cámara */
  var mueble=el.querySelector('.es-mueble'),h1=el.querySelector('.es-h'),osc=el.querySelector('.es-oscuro');
  mueble.animate([{opacity:1,transform:'scale(1)'},{opacity:.22,transform:'scale(1.06)'}],{duration:1300,fill:'forwards',easing:'ease-out'});
  h1.animate([{opacity:1},{opacity:0}],{duration:500,fill:'forwards'});
  osc.animate([{opacity:0},{opacity:1}],{duration:1100,fill:'forwards'});
  var T=2200;
  libro.animate([
    {transform:'translate3d('+ox+'px,'+oy+'px,8px) rotateY(0deg) scale3d(1,1,1)',offset:0,easing:'cubic-bezier(.3,0,.3,1)'},
    {transform:'translate3d('+ox+'px,'+(oy-14)+'px,120px) rotateY(0deg) scale3d(1,1,1)',offset:.2,easing:'cubic-bezier(.4,.05,.2,1)'},
    {transform:'translate3d(0px,0px,'+Z+'px) rotateY(-90deg) scale3d('+esc+','+esc+','+esc+')',offset:.6,easing:'ease-in-out'},
    {transform:'translate3d(0px,-7px,'+Z+'px) rotateY(-90deg) scale3d('+(esc*1.01)+','+(esc*1.01)+','+(esc*1.01)+')',offset:.82,easing:'ease-in-out'},
    {transform:'translate3d(0px,0px,'+Z+'px) rotateY(-90deg) scale3d('+(esc*1.02)+','+(esc*1.02)+','+(esc*1.02)+')',offset:1}
  ],{duration:T,fill:'forwards'});
  /* al llegar al centro: destello y polvo de luz */
  setTimeout(function(){
    dest.animate([{opacity:0,transform:'scale(.2)'},{opacity:.9,transform:'scale(1)',offset:.35},{opacity:0,transform:'scale(1.5)'}],{duration:1100,easing:'ease-out'});
    var col=getComputedStyle(libro).getPropertyValue('--libro-brillo')||'#fff';
    for(var i=0;i<30;i++){
      var p=document.createElement('i');p.className='es-chisp';p.style.setProperty('--c',col);
      var a=Math.random()*6.283,dist=Math.min(W,H)*(.22+Math.random()*.36),tam=.6+Math.random()*1.4;
      p.style.width=p.style.height=(4+Math.random()*5)+'px';
      v.appendChild(p);
      p.animate([{opacity:0,transform:'translate(0,0) scale(.3)'},{opacity:1,transform:'translate('+(Math.cos(a)*dist*.55)+'px,'+(Math.sin(a)*dist*.55)+'px) scale('+tam+')',offset:.3},{opacity:0,transform:'translate('+(Math.cos(a)*dist)+'px,'+(Math.sin(a)*dist+30)+'px) scale(.4)'}],{duration:900+Math.random()*900,delay:Math.random()*160,easing:'ease-out',fill:'both'});
    }
  },T*.55);
  /* el brillo que recorre la tapa */
  setTimeout(function(){var br=libro.querySelector('.es-brillo');if(br)br.animate([{transform:'translateX(-120%)',opacity:1},{transform:'translateX(120%)',opacity:1}],{duration:1000,easing:'ease-in-out',fill:'both'})},T*.62);
  /* y se funde hacia la tapa del libro */
  el.animate([{opacity:1},{opacity:0}],{duration:420,delay:T-160,fill:'both'}).onfinish=fin;
}
