/* La estantería (2.64): una sola cinemática, que es el menú de modos de la app.
   Estantería → libro de frente → libro abierto, siempre en la misma escena 3D (ui/escena3d.js) y con el mismo libro.
   Acá va todo lo que NO es 3D: la foto de inicio, las fotos de respaldo, los nombres de los libros (texto real),
   las zonas de toque, las flechas ◀ ▶ y el fundido hacia la app.
   - Qué pasa en cada momento: logica/cinematica.js (la línea de tiempo, que se puede invertir desde donde esté).
   - 3D o fotos: logica/estante3d.js (4 s de límite, un solo reintento, ?forzar3d=).
   - Dónde va cada foto y cada botón: logica/recorte.js y logica/fotos-escena.js.
   Con el libro abierto la escena queda en pausa y en memoria; ◀ desde la app la retoma.
   Con «reducir movimiento», sin WebGL o si la 3D falla: las mismas pantallas, con fotos fijas y fundidos.
   Solo se animan opacity y transform. Qué libros hay: logica/libros.js. */
import {LIBROS,libroDe} from '../logica/libros.js';
import {crearControl,forzado} from '../logica/estante3d.js';
import {crearCinematica,tramo} from '../logica/cinematica.js';
import {recorte,caja} from '../logica/recorte.js';
import {FOTOS,FOTO_W,FOTO_H} from '../logica/fotos-escena.js';
import {crearMedidor,aparato,mostrar,tope30} from '../logica/perf3d.js';
import {VERSION} from '../version.js';

var UL='pa-libro',DI='pa-directo',AB='pa-abrir';
function ls(k){try{return localStorage.getItem(k)}catch(e){return null}}
export function ultimoLibro(){return ls(UL)}
export function recordarLibro(id){try{localStorage.setItem(UL,id)}catch(e){}}
export function directo(){return ls(DI)==='1'}
export function setDirecto(v){try{localStorage.setItem(DI,v?'1':'0')}catch(e){}}
/* Abrir otro libro: la app arranca de nuevo, directo en ese libro (sin pasar otra vez por la estantería) */
export function pedirAbrir(id){try{sessionStorage.setItem(AB,id)}catch(e){}}
export function abrirPedido(){try{var v=sessionStorage.getItem(AB);sessionStorage.removeItem(AB);return v||''}catch(e){return ''}}
function quieto(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
/* Three.js necesita WebGL 2. Se prueba con un lienzo aparte, que se suelta enseguida. */
function hayWebgl(){
  try{
    var g=document.createElement('canvas').getContext('webgl2');if(!g)return false;
    var x=g.getExtension('WEBGL_lose_context');if(x)x.loseContext();
    return true;
  }catch(e){return false}
}
/* Las marcas de la sesión llevan la versión: una marca de una versión anterior de la app no vale para esta */
var sesion={
  leer:function(k){try{return sessionStorage.getItem(k)===VERSION}catch(e){return false}},
  poner:function(k){try{sessionStorage.setItem(k,VERSION)}catch(e){}}
};
function aviso3d(t){
  var a=document.getElementById('es-aviso3d');if(!a){a=document.createElement('p');a.id='es-aviso3d';a.className='es-aviso3d';a.addEventListener('click',function(){a.remove()});document.body.appendChild(a)}
  a.textContent=t+' Tocá para cerrar.';
}
var FLECHA='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="D" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var FUNDIDO=300,T_FOTO_A_3D=400;

/* ---------- el estado de la pantalla (una sola estantería para toda la app) ---------- */
var el=null,c=null,control=null,escena=null,lienzo=null,P={};
var w=0,h=0,vista='fotos',corriendo=false,ult=0,reloj=0,espera=null,hastaMenu=false,fotoActual='',capaFoto=0,dedo=null;
var medidor=null,primeros=[],bajo=false,perfMostrado=false,PERF=false,tiempos={t0:0,lista:0};
var ui={atras:-1,adelante:-1,rot:null,toc:null,velo:-1,abrir:null};

function montar(){
  if(el)return;
  el=document.getElementById('estante');
  var dos=LIBROS.slice(0,2);
  el.innerHTML='<img class="es-foto" alt="" aria-hidden="true" decoding="async"><img class="es-foto" alt="" aria-hidden="true" decoding="async">'
    +'<div class="es-luz" aria-hidden="true"></div>'
    +dos.map(function(l){var t=l.titulo.split(' ');return '<div class="es-rot" aria-hidden="true"><b>'+t.slice(0,2).join(' ')+' <br>'+t.slice(2).join(' ')+'</b><i>'+l.etiqueta+'</i></div>'}).join('')
    +dos.map(function(l){return '<button type="button" class="es-toque" data-libro="'+l.id+'" aria-label="'+l.titulo+', '+l.etiqueta.toLowerCase()+': sacarlo del estante" hidden></button>'}).join('')
    +'<button type="button" class="es-toque es-abrir" data-es="abrir" hidden></button>'
    +'<button type="button" class="es-flecha es-atras" data-es="atras" aria-label="Volver">'+FLECHA.replace('"D"','"M15 5l-7 7 7 7"')+'</button>'
    +'<button type="button" class="es-flecha es-adelante" data-es="adelante" aria-label="Abrir el libro">'+FLECHA.replace('"D"','"M9 5l7 7-7 7"')+'</button>'
    +'<div class="es-velo" aria-hidden="true"></div>';
  P={fotos:[].slice.call(el.querySelectorAll('.es-foto')),rot:[].slice.call(el.querySelectorAll('.es-rot')),
    toq:[].slice.call(el.querySelectorAll('.es-toque[data-libro]')),abrir:el.querySelector('.es-abrir'),
    atras:el.querySelector('.es-atras'),adelante:el.querySelector('.es-adelante'),velo:el.querySelector('.es-velo')};
  c=crearCinematica();
  try{PERF=/[?&]perf3d=1(?:&|$)/.test(location.search)}catch(e){}
  medidor=crearMedidor();
  control=crearControl({
    forzar:forzado(location.search),
    quieto:quieto,webgl:hayWebgl,
    visible:function(){return document.visibilityState!=='hidden'},
    ahora:function(){return performance.now()},
    temporizador:function(fn,ms){var t=setTimeout(fn,ms);return function(){clearTimeout(t)}},
    sesion:sesion,
    crear:crear,
    /* la 3D entra con un fundido corto por encima de la foto, que muestra lo mismo */
    fundir:function(listo){
      var mio=lienzo;
      mio.animate([{opacity:0},{opacity:1}],{duration:T_FOTO_A_3D,easing:'ease-in-out',fill:'forwards'}).onfinish=function(){if(lienzo===mio)listo()};
      /* mientras funde (la foto y la escena muestran lo mismo), se termina de preparar lo que falta */
      if(escena)try{escena.completar()}catch(e){control.error(e)}
    },
    viva:function(){
      vista='3d';lienzo.style.opacity='1';el.classList.add('es-3d');
      if(c.estado()==='foto')c.empezar();
      ubicar();interfaz();
    },
    fotos:aFotos,
    /* se cortaron los gráficos en medio de «Abrir»: entrar al libro ya mismo */
    entrar:function(){if(c.libro){c.poner('app');interfaz();abierto()}}
  });
  el.addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    var id=b.getAttribute('data-libro'),a=b.getAttribute('data-es');
    if(id)elegir(id);else if(a==='atras')atras();else if(a==='adelante'||a==='abrir')adelante();
  });
  /* toques sueltos: en la entrada, saltar al final; con la tapa de frente, tocar afuera o deslizar hacia abajo la devuelve al estante */
  el.addEventListener('pointerdown',function(e){dedo=e.target.closest('button')?null:{x:e.clientX,y:e.clientY}});
  el.addEventListener('pointerup',function(e){
    if(!dedo)return;var dx=e.clientX-dedo.x,dy=e.clientY-dedo.y;dedo=null;
    var es=c.estado();
    if(es==='entrada'){c.tocar();return}
    if(es!=='tapa')return;
    if((dy>50&&dy>Math.abs(dx)*1.4)||Math.hypot(dx,dy)<=12)atras();
  });
  el.addEventListener('pointercancel',function(){dedo=null});
  el.addEventListener('keydown',function(e){if(e.key==='Escape'&&c.estado()==='tapa'){e.preventDefault();atras()}});
  document.addEventListener('visibilitychange',function(){control.visibilidad()});
  var alCambiar=function(){if(el.hidden)return;medir();if(vista==='3d'&&escena&&!corriendo)escena.dibujar(reloj)};
  window.addEventListener('resize',alCambiar);window.addEventListener('orientationchange',function(){setTimeout(alCambiar,60)});
}

/* ---------- la escena 3D ---------- */
function crear(){
  /* un lienzo nuevo en cada intento: uno que perdió los gráficos no se puede volver a usar */
  if(lienzo)lienzo.remove();
  tiempos={t0:performance.now(),lista:0};
  var mio=lienzo=document.createElement('canvas');mio.className='es-lienzo';mio.setAttribute('aria-hidden','true');
  el.insertBefore(mio,el.querySelector('.es-luz'));
  var fuentes=Promise.resolve();
  try{fuentes=Promise.all([document.fonts.load('600 100px Fraunces'),document.fonts.load('italic 400 40px Fraunces')]).catch(function(){})}catch(e){}
  return Promise.all([import('./escena3d.js'),fuentes]).then(function(r){
    if(lienzo!==mio)throw new Error('cancelada');
    var e=r[0].crearEscena({lienzo:mio,c:c,quieto:quieto(),
      alPerder:function(){if(lienzo===mio)control.perdida()},
      alError:function(err){if(lienzo===mio)control.error(err)}});
    e.encuadre(w,h);
    /* al arrancar, primero el primer cuadro (lo que se ve en la foto de inicio); el resto se completa durante el fundido.
       Si la escena se arma con un libro ya de frente (◀ desde la app), va todo de una */
    if(c.estado()!=='foto')e.completar();
    e.dibujar(reloj);
    escena=e;tiempos.lista=Math.round(performance.now()-tiempos.t0);
    return {
      seguir:function(){if(corriendo)return;corriendo=true;ult=0;requestAnimationFrame(tic)},
      pausar:function(){corriendo=false},
      perder:function(){e.perder()},
      liberar:function(){corriendo=false;if(escena===e)escena=null;try{e.liberar()}catch(x){}if(lienzo===mio){mio.remove();lienzo=null}}
    };
  });
}
function tic(ahora){
  if(!corriendo||!escena)return;
  var real=ult?ahora-ult:0;ult=ahora;
  paso(Math.min(.05,real/1000),real);
  if(corriendo)requestAnimationFrame(tic);
}
function paso(dt,real){
  var antes=c.seg,momento=c.estado(),llego=c.avanzar(dt);
  if(llego==='tapa'&&antes==='elegir')escena.brillo(reloj+dt);
  if(llego==='tapa'&&antes==='abrir')control.cancelar();
  if(llego==='menu')ubicar();
  if(llego==='tapa'){ubicar();if(hastaMenu){hastaMenu=false;c.atras()}}
  reloj+=dt;escena.dibujar(reloj);interfaz();
  if(real){
    medidor.anotar(momento,real);
    if(primeros.length<60){
      primeros.push(real);
      /* si los primeros 60 cuadros vienen pesados se baja la resolución de 2 a 1,5; el tope de 30 cuadros por segundo
         del modo de bajo consumo no cuenta como «pesado» */
      if(primeros.length===60&&!tope30(primeros)&&primeros.reduce(function(a,b){return a+b},0)/60>19)bajo=escena.bajar();
    }
  }
  if(llego==='app'){
    if(PERF&&!perfMostrado){
      perfMostrado=true;
      mostrar(medidor.tabla(),aparato(navigator.userAgent,w,h,escena.escala(),escena.placa()),
        'La escena tardó '+tiempos.lista+' ms en armarse. '+(tope30(primeros)?'Tu iPhone está limitando a 30 cuadros por segundo (modo de bajo consumo): sacalo y repetí la medición.':bajo?'Se bajó la resolución a 1,5x por cuadros pesados.':''));
    }
    abierto();
  }
}

/* ---------- las fotos ---------- */
function claveFoto(){
  var e=c.estado();
  if(e==='foto'||e==='entrada')return 'inicio';
  if(e==='menu')return 'menu';
  return c.libro==='duo'?'tapa-duo':'tapa-solo';
}
function datosFoto(k){return k==='inicio'?FOTOS.inicio:k==='menu'?FOTOS.menu:FOTOS.tapa[k==='tapa-duo'?'duo':'solo']}
function acomodar(img,k){
  var r=recorte(w,h,FOTO_W,FOTO_H,datosFoto(k).zona);
  img.style.width=FOTO_W+'px';img.style.height=FOTO_H+'px';
  img.style.transform='translate('+r.x.toFixed(2)+'px,'+r.y.toFixed(2)+'px) scale('+r.escala.toFixed(5)+')';
  return r;
}
/* muestra la foto que corresponde al momento; con fundido si ya había otra */
function ponerFoto(conFundido){
  var k=claveFoto();
  if(k===fotoActual){acomodar(P.fotos[capaFoto],k);return}
  var vieja=P.fotos[capaFoto],nueva=P.fotos[capaFoto=1-capaFoto];
  nueva.src=datosFoto(k).src;acomodar(nueva,k);
  var ms=conFundido&&fotoActual?FUNDIDO:0;fotoActual=k;
  nueva.style.zIndex=1;vieja.style.zIndex=0;
  if(ms&&nueva.animate){nueva.style.opacity='1';nueva.animate([{opacity:0},{opacity:1}],{duration:ms,easing:'ease-in-out'}).onfinish=function(){vieja.style.opacity='0'}}
  else{nueva.style.opacity='1';vieja.style.opacity='0'}
}
/* quedan las fotos (la 3D falló, o se está armando de nuevo): se saca la 3D de la pantalla, ya */
function aFotos(motivo,detalle){
  vista='fotos';corriendo=false;el.classList.remove('es-3d');
  if(lienzo)lienzo.style.opacity='0';
  /* si estaba a mitad de un movimiento, queda en el reposo al que iba */
  var e=c.estado();
  if(e==='foto'||e==='entrada')c.poner('menu');
  else if(e==='elegir')c.poner(c.dir>0?'tapa':'menu');
  else if(e==='abrir')c.poner('tapa');
  if(c.estado()==='menu')hastaMenu=false;
  ponerFoto(true);ubicar();interfaz();
  if(c.estado()==='tapa'&&hastaMenu){hastaMenu=false;atras()}
  try{console.info('Estantería: quedan las fotos ('+motivo+')',detalle||'')}catch(x){}
  /* con ?perf3d=1 se ve en pantalla por qué no hay 3D (en el iPhone no hay consola a mano) */
  if(PERF)aviso3d('No se ve la 3D: '+motivo+(detalle&&detalle.message?' ('+detalle.message+')':'')+'. Pasaron '+Math.round(performance.now()-tiempos.t0)+' ms.');
}

/* ---------- nombres, zonas de toque, flechas y velo ---------- */
function medir(){
  w=el.clientWidth||window.innerWidth;h=el.clientHeight||window.innerHeight;
  if(escena)escena.encuadre(w,h);
  if(fotoActual)acomodar(P.fotos[capaFoto],fotoActual);
  ubicar();
}
/* los nombres y los botones siguen a su libro: se recalculan al llegar a cada reposo y cada vez que cambia el tamaño */
function ubicar(){
  var cajas=null;
  if(vista==='3d'&&escena)cajas=escena.sitios().map(function(s){return {x:s.x0,y:s.y0,w:s.x1-s.x0,h:s.y1-s.y0}});
  else{var r=recorte(w,h,FOTO_W,FOTO_H,FOTOS.menu.zona);cajas=['solo','duo'].map(function(id){return caja(r,FOTOS.menu.libros[id],0)})}
  var cx=cajas.map(function(k){return k.x+k.w/2});
  cajas.forEach(function(k,i){
    var bw=Math.max(44,k.w+14),bh=Math.max(44,k.h+10);
    P.rot[i].style.transform='translate('+Math.round(cx[i])+'px,'+Math.round(k.y+k.h+h*.012)+'px) translateX(-50%)';
    P.toq[i].style.cssText='left:'+(cx[i]-bw/2).toFixed(1)+'px;top:'+(k.y+k.h/2-bh/2).toFixed(1)+'px;width:'+bw.toFixed(1)+'px;height:'+bh.toFixed(1)+'px';
    /* si los dos libros quedan muy juntos (teléfono chico o acostado), el nombre va en dos renglones */
    P.rot[i].classList.toggle('es-angosto',Math.abs(cx[1]-cx[0])<150);
  });
  /* el libro de frente: un botón invisible encima, para abrirlo tocándolo (y con teclado o lector de pantalla) */
  if(c.estado()==='tapa'&&c.libro){
    var b=null;
    if(vista==='3d'&&escena){var q=escena.cajaLibro();if(q)b={x:q.x0,y:q.y0,w:q.x1-q.x0,h:q.y1-q.y0}}
    else b=caja(recorte(w,h,FOTO_W,FOTO_H,FOTOS.tapa[c.libro].zona),FOTOS.tapa[c.libro].libro,44);
    if(b)P.abrir.style.cssText='left:'+b.x.toFixed(1)+'px;top:'+b.y.toFixed(1)+'px;width:'+b.w.toFixed(1)+'px;height:'+b.h.toFixed(1)+'px';
  }
}
function interfaz(){
  var f=c.flechas(),r=c.rotulos(),tc=c.tocable(),e=c.estado();
  if(f.atras!==ui.atras){ui.atras=f.atras;P.atras.style.opacity=f.atras;P.atras.classList.toggle('es-viva',f.atras>0);P.atras.tabIndex=f.atras>0?0:-1}
  if(f.adelante!==ui.adelante){ui.adelante=f.adelante;P.adelante.style.opacity=f.adelante;P.adelante.classList.toggle('es-viva',f.adelante>0);P.adelante.tabIndex=f.adelante>0?0:-1}
  if(r!==ui.rot){ui.rot=r;P.rot.forEach(function(x){x.classList.toggle('es-ver',r)})}
  if(tc!==ui.toc){ui.toc=tc;P.toq.forEach(function(b){b.hidden=!tc})}
  var ab=e==='tapa'?c.libro:null;
  if(ab!==ui.abrir){ui.abrir=ab;P.abrir.hidden=!ab;if(ab)P.abrir.setAttribute('aria-label','Abrir '+libroDe(ab).titulo)}
  /* con la 3D, el fundido del final de «Abrir» sigue a la animación (y se deshace si se invierte) */
  if(vista==='3d'){var v=c.seg==='abrir'?tramo(c.p,.85,1):0;if(v!==ui.velo){ui.velo=v;P.velo.style.opacity=v}}
}
function velo(v,ms,luego){
  ui.velo=v;
  if(!ms||!P.velo.animate){P.velo.style.opacity=v;if(luego)luego();return}
  var de=parseFloat(P.velo.style.opacity)||0;P.velo.style.opacity=v;
  P.velo.animate([{opacity:de},{opacity:v}],{duration:ms,easing:'ease-in-out'}).onfinish=function(){if(luego)luego()};
}

/* ---------- lo que se puede hacer ---------- */
function elegir(id){
  if(!c.tocable())return;
  if(vista==='3d'){c.elegir(id);interfaz();return}
  c.poner('tapa',id);ponerFoto(true);ubicar();interfaz();
}
function atras(){
  var e=c.estado();
  if(vista==='3d'){if(c.atras()){if(e==='abrir')control.cancelar();interfaz()}return}
  if(e==='tapa'){c.poner('menu');ponerFoto(true);ubicar();interfaz()}
}
function adelante(){
  if(c.estado()!=='tapa')return;
  if(vista==='3d'){if(c.adelante()){control.abrir();interfaz()}return}
  /* con fotos: fundido directo a la app */
  c.poner('app');interfaz();velo(1,FUNDIDO,abierto);
}
/* terminó «Abrir»: la pantalla quedó cubierta, la escena queda en pausa y la app puede entrar */
function abierto(){
  P.velo.style.opacity='1';ui.velo=1;
  control.enLaApp();
  var f=espera;espera=null;if(f)f(c.libro);
}

/* Muestra la estantería desde el principio (foto de inicio → entrada) y espera a que se abra un libro. Devuelve su id. */
export function elegirLibro(){
  montar();
  el.hidden=false;el.style.opacity='';
  medir();ponerFoto(false);interfaz();
  return new Promise(function(ok){
    espera=ok;
    tiempos.t0=performance.now();
    control.iniciar();
    /* sin 3D: el respaldo, que ya se puede tocar */
    if(!control.viva()&&control.estado()==='fotos'){
      c.poner('menu');ponerFoto(true);ubicar();interfaz();
      if(PERF)aviso3d('No se ve la 3D: '+(quieto()?'el teléfono tiene «reducir movimiento» activado':sesion.leer('pa-3d-no')?'falló antes en esta sesión (cerrá la app del todo y volvé a abrirla)':'este navegador no tiene WebGL 2')+'.');
    }
  });
}
/* La app ya está lista debajo: la estantería se va con un fundido y queda guardada (en pausa) para poder volver */
export function soltarEstante(){
  if(!el||el.hidden)return Promise.resolve();
  return new Promise(function(ok){
    var fin=function(){el.hidden=true;el.style.opacity='';ok()};
    if(!el.animate){fin();return}
    el.animate([{opacity:1},{opacity:0}],{duration:FUNDIDO,easing:'ease-in-out'}).onfinish=fin;
  });
}
/* ◀ desde la app: la pantalla de la app se desvanece (0,3 s), el libro se cierra y queda la tapa de frente.
   op = {libro (el que está abierto), hastaMenu (seguir hasta la estantería)}. Espera a que se abra un libro y devuelve su id. */
export function volverAlEstante(op){
  montar();
  var id=op.libro;
  hastaMenu=!!op.hastaMenu;
  if(c.estado()!=='app'||c.libro!==id)c.poner('app',id);
  P.velo.style.opacity='1';ui.velo=1;
  el.hidden=false;medir();
  return new Promise(function(ok){
    espera=ok;
    var seguir=function(){
      el.style.opacity='';
      if(control.volver()==='viva'){vista='3d';c.atras();interfaz();return}
      /* sin escena (o con los gráficos cortados): la tapa fija, con un fundido */
      vista='fotos';el.classList.remove('es-3d');if(lienzo)lienzo.style.opacity='0';
      c.poner('tapa',id);ponerFoto(false);ubicar();interfaz();
      velo(0,FUNDIDO,function(){if(hastaMenu&&c.estado()==='tapa'){hastaMenu=false;atras()}});
    };
    if(!el.animate){seguir();return}
    el.animate([{opacity:0},{opacity:1}],{duration:FUNDIDO,easing:'ease-in-out'}).onfinish=seguir;
  });
}
/* ¿La estantería está a la vista? */
export function estanteAbierto(){return !!el&&!el.hidden}
