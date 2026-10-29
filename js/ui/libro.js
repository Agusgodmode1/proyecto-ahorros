/* El Libro del Ahorro: la tapa en 3D (se abre y se cierra), el prólogo y el pacto.
   El prólogo son las primeras 5 páginas del libro (2.26): el propósito, las 3 preguntas (¿con cuánta plata empezás?,
   ¿cuánto querés guardar?, ¿qué día cobrás?) y el pacto. Cada página: una pregunta, una línea de ayuda y el botón.
   Los pagos fijos se cargan en Fijos; la plata apartada, en la letra chica del pacto (hojear, E.edit='qa').
   Modos:
   - 'nuevo': la primera vez. Tapa (con importar o ver el ejemplo) → apertura → «¿Qué querés hacer?» (2.26: el pacto o una
     herramienta suelta, o.alHerramienta) → las páginas del prólogo → «Sellar el pacto». Con o.sinTapa (armar el pacto
     después de usar una herramienta) arranca directo en la primera página, con «Ahora no» para volver.
   - 'ciclo': al cobrar. Solo las 3 preguntas y el pacto nuevo; o.antes(estado) cierra el ciclo justo antes de sellar.
   - 'hojear': ya hay datos. Las mismas páginas muestran tus valores de hoy, con «Cambiar» para corregirlos en el lugar.
   - 'tapa': «Cerrar el libro». La tapa se cierra (la apertura al revés, más rápida) y al tocarla se abre de nuevo en Hoy.
   La apertura completa (~2,5 s) se saltea con un toque. Las cuentas son puras (logica/pacto.js).
   Solo se animan transform y opacity (Web Animations). Con «reducir movimiento», solo fundidos. */
import {num} from '../logica/util.js';
import {parse,diffDays,MESL,DIAL} from '../logica/fechas.js';
import {cotizacion} from '../logica/monedas.js';
import {planCalc} from '../logica/plan.js';
import {disponible,maxAhorro} from '../logica/saldo.js';
import {totalPacto,validarPacto,cuentaPacto,sellarPacto,sugerirCobro,atajosPacto,pasoAhorro,mesCalendario,previaAjuste,aplicarAjuste,deshacerAjustePacto,TIPOS_APARTADO,normApartado,totalApartado,totalLibre,previaApartado,aplicarApartado,deshacerApartado} from '../logica/pacto.js';
import {PROLOGO} from '../logica/capitulos.js';
import {atajosSupervivencia} from '../logica/supervivencia.js';
import {aplicarFeriados} from './feriados.js';
import {montarImportador} from './respaldo.js';
import {marcarTour} from './tour.js';
import {listaHerrHTML} from './herramientas.js';
import {$,today,money,usd,esc,toastAccion,ctx} from './comun.js';
import {sonar} from './sonido.js';
import {girar,terminar as terminarPase} from './pase.js';
import {costuraHTML,bordadoHTML,tituloHTML,guardasHTML,montarTapa,soltarTapa,tapaQuieta,fueArrastre,avivar} from './tapa.js';

export var TITULO='El Libro del Ahorro';
var T=22; /* grosor del libro en px (igual que --lb-t) */
function quieto(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
function fLarga(s){var d=parse(s);return DIAL[d.getDay()]+' '+d.getDate()+' de '+MESL[d.getMonth()]}

/* El texto aparece como tinta: palabra por palabra */
function tinta(t){var i=0;return t.split(' ').map(function(w){return '<span class="w" style="--i:'+(i++)+'">'+w+'</span>'}).join(' ')}

var ORLA='<svg class="lb-orla" viewBox="0 0 120 14" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M2 7h46M72 7h46"/><path d="M60 1l6 6-6 6-6-6Z"/><circle cx="60" cy="7" r="1.6" fill="currentColor"/></svg>';
/* Sello de lacre (naranja ladrillo, con el brote del ahorro grabado) */
var SELLO='<svg class="lb-sello" viewBox="0 0 160 160" aria-hidden="true"><defs>'
  +'<radialGradient id="lb-lacre" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#F6A770"/><stop offset=".35" stop-color="#D9682A"/><stop offset=".8" stop-color="#9E3C1C"/><stop offset="1" stop-color="#6E2510"/></radialGradient></defs>'
  +'<path fill="url(#lb-lacre)" d="M80 6c9 0 12 7 20 9s16-3 22 3 1 14 6 21 13 8 14 17-6 12-6 21 7 14 2 22-14 5-20 11-5 15-14 18-14-4-23-4-15 8-23 4-4-13-11-18-17-3-21-11 4-14 2-22-11-11-9-20 11-10 15-17 0-15 7-20 15 0 22-4S70 6 80 6Z"/>'
  +'<circle cx="80" cy="80" r="46" fill="none" stroke="#5A1E0B" stroke-width="2.5" opacity=".5"/>'
  +'<circle cx="80" cy="80" r="40" fill="none" stroke="#FFD9B8" stroke-width="1" opacity=".5"/>'
  +'<g fill="none" stroke="#5A1E0B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".75"><path d="M80 106V70"/><path d="M80 84c-13 0-22-8-24-19 13 0 22 7 24 19Z"/><path d="M80 76c11 0 19-6 21-16-11 0-19 6-21 16Z"/><path d="M64 108h32"/></g>'
  +'</svg>';

/* El sellito del ex libris: el mismo lacre, en chico */
var SELLITO=SELLO.split('lb-lacre').join('lb-lacre-c').replace('class="lb-sello"','class="lb-sellito"');
/* El brote que crece con cada respuesta: 0 tierra · 1 tallo · 2 primera hoja · 3 segunda hoja y yema · 4 flor · 5 la estrella que le cayó */
var PETALOS=[0,60,120,180,240,300].map(function(a){return '<ellipse cx="32" cy="16.4" rx="3.1" ry="5.2" transform="rotate('+a+' 32 22)"/>'}).join('');
function broteHTML(e){
  return '<svg class="lb-brote" viewBox="0 0 64 72" data-e="'+e+'" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">'
    +'<path class="b0" d="M12 66h40M22 66c3-4 17-4 20 0"/>'
    +'<g class="b1"><path d="M32 65V48"/><path class="hoja" d="M32 52c-4 0-7-2-8-6 4 0 7 2 8 6Z"/><path class="hoja" d="M32 50c4 0 7-2 8-6-4 0-7 2-8 6Z"/></g>'
    +'<g class="b2"><path d="M32 51V38"/><path class="hoja" d="M32 50c-9 0-15-4-17-12 9 0 15 4 17 12Z"/></g>'
    +'<g class="b3"><path d="M32 39V27"/><path class="hoja" d="M32 42c8 0 13-4 15-11-8 0-13 4-15 11Z"/><circle class="yema" cx="32" cy="24.5" r="3.2"/></g>'
    +'<g class="b4"><g class="petalos">'+PETALOS+'</g><circle class="centro" cx="32" cy="22" r="3.4"/></g>'
    +'<g class="b5"><path class="lucero" d="M32 0l1.5 3.5L37 5l-3.5 1.5L32 10l-1.5-3.5L27 5l3.5-1.5Z"/></g>'
    +'</svg>';
}
var ESTRELLA='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 0l2.6 7.4L20 10l-7.4 2.6L10 20l-2.6-7.4L0 10l7.4-2.6Z" fill="#FFD27A"/><circle cx="10" cy="10" r="2.4" fill="#FFF7E0"/></svg>';

/* ---------- Tapa ---------- */
function htmlPortada(opciones){
  var hojas='';for(var i=0;i<3;i++)hojas+='<div class="lb-hoja"><i></i><i></i></div>';
  return '<button class="lb-link lb-saltar" type="button" data-lb="saltar" hidden>Saltar</button>'
    +'<div class="lb-escena"><div class="lb-cam"><div class="lb-gira"><div class="lb-libro" role="button" tabindex="0" aria-label="Abrir el libro" data-lb="abrir">'
    +'<div class="lb-sombra"></div><div class="lb-contra"></div><div class="lb-bloque"></div>'
    +'<div class="lb-canto lb-canto-d"></div><div class="lb-canto lb-canto-a"></div>'+hojas
    +'<div class="lb-lomo"></div>'
    /* la tela, de atrás para adelante: nebulosas, galaxia, estrellas lejanas y cercanas, la estrella fugaz, la trama,
       la costura, las estrellas bordadas y el título (cada capa se mueve apenas distinto al arrastrar: data-k) */
    +'<div class="lb-tapa"><div class="lb-tapa-f">'
    +'<i class="lb-capa" data-k="3"><i class="lb-neb"></i><i class="lb-neb b"></i></i>'
    +'<i class="lb-capa" data-k="4"><i class="lb-gal"><i class="lb-gal-gira"></i><i class="lb-gal-luz"></i></i></i>'
    +'<i class="lb-capa" data-k="2"><i class="lb-astros b"></i></i>'
    +'<i class="lb-capa" data-k="6"><i class="lb-astros a"></i><i class="lb-fugaz"></i></i>'
    +'<i class="lb-trama"></i><i class="lb-velo"></i>'+costuraHTML()
    +'<div class="lb-tapa-in"><div class="lb-bordado-w" data-k="8">'+bordadoHTML()+'</div>'
    +'<div class="lb-tit-w" data-k="11"><h1 class="lb-tit"><small>el libro del</small>'+tituloHTML()+'<span class="sr-only">Ahorro</span></h1><p class="lb-lema">Para que guardes algo, por más mínimo que sea</p></div></div></div>'
    +'<div class="lb-tapa-d">'+guardasHTML()+'</div></div>'
    +'<div class="lb-broche"><b></b></div>'
    +'</div></div></div></div>'
    +'<p class="lb-toca">Tocá el libro para abrirlo</p>'
    +(opciones?'<div class="lb-otros"><button class="lb-link" type="button" data-lb="importar">Ya tenía datos: importarlos</button><button class="lb-link" type="button" data-lb="ejemplo">Solo mirar, con datos de ejemplo</button></div>'
      +'<p class="lb-nota">Lo que escribas queda solo en este teléfono: no hay cuentas ni servidores.</p>'
      +'<div class="lb-imp" id="lb-imp" hidden role="dialog" aria-modal="true" aria-labelledby="lb-imp-t"><h2 id="lb-imp-t">Traer tus datos</h2><p class="lb-p">Elegí un archivo de respaldo exportado desde esta app, o pegá el texto que copiaste con <b>Copiar como texto</b>.</p><div id="lb-import"></div><div class="lb-acc"><button class="lb-btn" type="button" data-lb="imp-x">Volver al libro</button></div></div>'
      :'');
}

/* La apertura: el libro se levanta, se abre el broche, la tapa gira sobre la bisagra (rebota y asienta),
   pasan tres hojas en cascada y la cámara se acerca a la página. Con rev, lo mismo al revés y más rápido (el cierre). */
var anims=[],D_ABRE=2500,K_CIERRE=1.7;
function animar(el,kf,o,rev){
  o=Object.assign({fill:'forwards',delay:0},o);
  if(rev){var fin=o.delay+o.duration;o.delay=(D_ABRE-fin)/K_CIERRE;o.duration/=K_CIERRE;o.direction='reverse';o.fill='both'}
  var a=el.animate(kf,o);anims.push(a);return a;
}
function moverLibro(mesa,listo,rev){
  var L=mesa.querySelector('.lb-libro'),cam=mesa.querySelector('.lb-cam'),tapa=mesa.querySelector('.lb-tapa'),bro=mesa.querySelector('.lb-broche');
  var W=L.offsetWidth,D=D_ABRE,hecho=false;
  var saltar=mesa.querySelector('[data-lb="saltar"]');saltar.hidden=false;
  mesa.querySelectorAll('.lb-toca,.lb-otros,.lb-nota').forEach(function(x){x.style.animation='none';x.style.visibility='hidden'});
  function fin(){
    if(hecho)return;hecho=true;
    anims.forEach(function(a){try{a.finish()}catch(e){}});
    if(rev){anims.forEach(function(a){a.cancel()});saltar.hidden=true;tapaQuieta(mesa);mesa.querySelectorAll('.lb-toca,.lb-otros,.lb-nota').forEach(function(x){x.style.animation='';x.style.visibility=''})}
    anims=[];listo();
  }
  soltarTapa(mesa);
  if(!rev){setTimeout(function(){sonar('broche')},300);avivar(mesa)}
  var T0='rotateX(24deg) rotateY(-14deg) rotateZ(3deg)';
  animar(L,[
    {transform:T0+' translateZ(0)',offset:0},
    {transform:T0+' translateZ(34px)',offset:.14,easing:'cubic-bezier(.3,.7,.3,1)'},
    {transform:'rotateX(12deg) rotateY(0deg) rotateZ(0deg) translateZ(34px)',offset:.6,easing:'ease-in-out'},
    {transform:'rotateX(0deg) rotateY(0deg) rotateZ(0deg) translateZ(0)',offset:1}
  ],{duration:D},rev);
  animar(bro,[{transform:'translateZ('+(T+1.5)+'px)',opacity:1},{transform:'translateZ('+(T+1.5)+'px) translateX(22px) rotateY(70deg)',opacity:0}],{duration:320,delay:300,easing:'cubic-bezier(.5,0,.7,.4)'},rev);
  animar(tapa,[
    {transform:'translateZ('+T+'px) rotateY(0deg)',offset:0,easing:'cubic-bezier(.42,0,.36,1)'},
    {transform:'translateZ('+T+'px) rotateY(-186deg)',offset:.72,easing:'ease-out'},
    {transform:'translateZ('+T+'px) rotateY(-176deg)',offset:.88,easing:'ease-in-out'},
    {transform:'translateZ('+T+'px) rotateY(-180deg)',offset:1}
  ],{duration:1050,delay:520},rev);
  mesa.querySelectorAll('.lb-hoja').forEach(function(h,i){
    var z=T-2.4+i*.6;
    animar(h,[{transform:'translateZ('+z+'px) rotateY(0deg)'},{transform:'translateZ('+(T+.5+i*.4)+'px) rotateY(-178deg)'}],{duration:620,delay:1080+i*150,easing:'cubic-bezier(.45,.05,.35,1)'},rev);
  });
  animar(cam,[
    {transform:'translateX(0) scale(1)',offset:0},
    {transform:'translateX(0) scale(1)',offset:.2,easing:'ease-in-out'},
    {transform:'translateX('+W*.35+'px) scale(.7)',offset:.55,easing:'ease-in-out'},
    {transform:'translateX('+W*.35+'px) scale(.7)',offset:.74,easing:'cubic-bezier(.5,0,.3,1)'},
    {transform:'translateX(0) scale(2.6)',offset:1}
  ],{duration:D},rev);
  var a=animar(mesa,[{opacity:1,offset:0},{opacity:1,offset:.86},{opacity:0,offset:1}],{duration:D},rev);
  a.onfinish=fin;
  saltar.onclick=function(e){e.stopPropagation();fin()};
  mesa.addEventListener('pointerdown',function sk(e){if(e.target.closest('.lb-saltar'))return;mesa.removeEventListener('pointerdown',sk);fin()});
}

/* ---------- Páginas ---------- */
var o=null,st=null,D=null,idx=0,PAGS=[],vista=null,E=null,broteVisto=0;
function hojear(){return o&&o.modo==='hojear'}
/* Hasta dónde creció el brote en cada página (en hojear ya está todo contestado y el pacto, sellado) */
function etapa(id){
  if(id==='q1')return hojear()||total()>0?1:0;
  return id==='q2'?2:id==='q3'?3:id==='pacto'?(hojear()?5:4):0;
}
function crecer(){
  var b=q('.lb-brote');if(!b)return;
  var t=etapa(PAGS[idx]);broteVisto=t;
  if(String(t)===b.getAttribute('data-e'))return;
  requestAnimationFrame(function(){requestAnimationFrame(function(){b.setAttribute('data-e',t)})});
}
/* Ex libris: «Este libro pertenece a…», con una línea para escribir el nombre si todavía no está */
function exLibrisHTML(){
  var n=st.perfil&&st.perfil.nombre||'';
  var nombre=hojear()&&n?'<b>'+esc(n)+'</b>'
    :'<input id="lb-nombre" type="text" autocomplete="given-name" autocapitalize="words" enterkeyhint="done" maxlength="30" placeholder="tu nombre" aria-label="Tu nombre" value="'+esc(D.nombre!=null?D.nombre:n)+'">';
  return '<div class="lb-exlibris">'+SELLITO+'<p><small>ex libris</small><span>Este libro pertenece a</span>'+nombre+'</p></div>';
}
/* Lo que el libro sabe hoy (modo hojear): la plata que tenés, lo que guardás y el cobro */
function actuales(){var pc=planCalc(st);return {tenes:Math.round(Math.max(0,disponible(st,pc))),ahorro:Math.round(pc.ahorro),cobro:st.plan.cobro,max:Math.floor(maxAhorro(st,pc))}}

function pagHTML(id){
  var ciclo=o.modo==='ciclo',n=PROLOGO.indexOf(id)+1;
  var folio=n>0?'<p class="lb-folio">— '+n+' —</p>':'';
  var conBrote=id==='q1'||id==='q2'||id==='q3';
  var cab='<div class="lb-cab'+(conBrote?' con-brote':'')+'"><span class="lb-cap">'+(ciclo?'pacto nuevo':id==='que'?'el libro del ahorro':id==='pacto'?'el pacto':'prólogo')+'</span>'
    +(conBrote?broteHTML(Math.min(broteVisto,3)):'')
    +(hojear()||ciclo||o.sinTapa?'<button class="lb-link" type="button" data-lb="cerrar-libro">'+(ciclo||o.sinTapa?'Ahora no':'Ir a Hoy')+'</button>':conBrote?'<span></span>':'')+'</div>';
  var atras=idx>0?'<button class="lb-btn chico" type="button" data-lb="atras" aria-label="Página anterior">‹ Atrás</button>'
    :(hojear()&&o.alTapa?'<button class="lb-btn chico" type="button" data-lb="atras" aria-label="Cerrar el libro: la tapa">‹ La tapa</button>':'');
  var sig='<button class="lb-btn si" type="button" data-lb="sig">'+(id==='p1'?(hojear()?'Pasar la página':'Empezar'):'Seguir')+'</button>';
  var acc='<div class="lb-acc">'+atras+sig+'</div>',h='';
  if(id==='que'){
    /* (2.26) ¿Qué querés hacer?: el pacto completo o una herramienta suelta, sin llenar nada más */
    h='<h1 class="lb-h lb-tinta" id="lb-h">'+tinta('¿Qué querés hacer?')+'</h1>'
      +'<button class="lb-camino" type="button" data-lb="sig"><span><b>Armar mi pacto de ahorro</b><small>Cuánto podés gastar cada día hasta que cobres. Unos 2 minutos.</small></span><i aria-hidden="true">›</i></button>'
      +'<p class="lb-o">O usá una herramienta suelta, sin llenar nada más:</p>'
      +listaHerrHTML('lb-herr','data-lb="herr"');
  }else if(id==='p1'){
    h=exLibrisHTML()+'<h1 class="lb-h lb-tinta" id="lb-h">'+tinta('Este libro tiene un solo propósito')+'</h1>'
      +'<p class="lb-cita">que generes un ahorro, por más mínimo que sea.</p>'+ORLA+acc;
  }else if(hojear()&&id!=='pacto'&&E.edit!==id){
    h=vistaHTML(id)+acc;
  }else if(id==='q1'){
    var ed=hojear();
    h='<h1 class="lb-h lb-tinta" id="lb-h">'+tinta(ed?'¿Cuánta plata tenés hoy?':'¿Con cuánta plata empezás?')+'</h1>'
      +'<p class="lb-p">'+(ciclo?'Lo que te quedó más tu cobro'+(o.real?'':' estimado')+'. Cambialo si tenés otra cifra.'
        :ed?'Si gastaste algo sin anotarlo, poné lo que tenés de verdad.'
        :'Solo la que podés gastar: lo que ya tenés ahorrado no va acá.')+'</p>'
      +'<div class="lb-campo"><label for="lb-pesos">Tengo hoy</label><div class="lb-monto"><span>$</span><input id="lb-pesos" type="number" inputmode="decimal" min="0" step="any" placeholder="0" value="'+esc(D.pesos)+'"></div></div>'
      +(!ed&&!ciclo&&o.sugerencia&&o.sugerencia.monto?'<div class="lb-chips" role="group" aria-label="Sugerencia"><button class="lb-chip" type="button" data-lb="sug-monto" data-val="'+o.sugerencia.monto+'">Lo que cobrás: '+money(o.sugerencia.monto)+'</button></div>':'')
      +'<label class="lb-check"><input type="checkbox" id="lb-conusd"'+(D.conUsd?' checked':'')+'> También tengo dólares</label>'
      +'<div class="lb-dos" id="lb-usd-box"'+(D.conUsd?'':' hidden')+'>'
      +'<div class="lb-campo"><label for="lb-usd">Dólares</label><div class="lb-monto chico"><span>US$</span><input id="lb-usd" type="number" inputmode="decimal" min="0" step="any" placeholder="0" value="'+esc(D.usd)+'"></div></div>'
      +'<div class="lb-campo"><label for="lb-cotiz">1 dólar son</label><div class="lb-monto chico"><span>$</span><input id="lb-cotiz" type="number" inputmode="decimal" min="0" step="any" placeholder="40,00" value="'+esc(D.cotiz)+'"></div></div></div>'
      +'<p class="lb-total" id="lb-total" aria-live="polite"></p>'
      +(ed?'<p class="lb-queda" id="lb-queda" aria-live="polite"></p>':'')
      +'<p class="lb-err" id="lb-err" role="alert" hidden></p>'+(ed?accEdit():acc);
  }else if(id==='q2'){
    var ed2=hojear(),tot=ed2?actuales().tenes:total(),mx=ed2?actuales().max:Math.round(tot),paso=pasoAhorro(tot),sv=!ed2&&superD();
    var at=(sv?atajosSupervivencia(tot,cuentaPacto(st,datos(),today()).fijos).map(function(a){return {monto:a.monto,pct:null,t:a.t}}):atajosPacto(tot)).filter(function(a){return a.monto<=mx});
    h='<h1 class="lb-h lb-tinta" id="lb-h">'+tinta('¿Cuánto querés guardar?')+'</h1>'
      +'<p class="lb-p">'+(sv?'Esta vez la meta es llegar al cobro: cero también vale.':'Por más mínimo que sea. '+(ed2?'Hoy tenés':'Empezás con')+' <b>'+money(tot)+'</b>.')+'</p>'
      +'<div class="lb-campo"><div class="lb-pct"><label for="lb-ahorro" class="lb-l">Quiero guardar</label><b id="lb-pct-n"></b></div>'
      +'<div class="lb-monto chico"><span>$</span><input id="lb-ahorro" type="number" inputmode="numeric" min="0" step="1" value="'+esc(D.ahorro)+'"></div></div>'
      +'<input class="lb-rango" id="lb-rango" type="range" min="0" max="'+Math.max(0,mx)+'" step="'+paso+'" value="'+Math.min(Math.round(num(D.ahorro)),Math.max(0,mx))+'" aria-label="Cuánto querés ahorrar">'
      +(at.length?'<div class="lb-chips" role="group" aria-label="Atajos">'+at.map(function(a){return '<button class="lb-chip" type="button" data-lb="atajo" data-val="'+a.monto+'">'+(a.t?esc(a.t)+(a.monto?' · '+money(a.monto):''):a.pct+' %')+'</button>'}).join('')+'</div>':'')
      +'<p class="lb-queda" id="lb-queda" aria-live="polite"></p>'
      +'<div id="lb-avisos"></div>'
      +'<p class="lb-err" id="lb-err" role="alert" hidden></p>'+(ed2?accEdit():acc);
  }else if(id==='q3'){
    var sg=sugerirCobro(st,today());
    h='<h1 class="lb-h lb-tinta" id="lb-h">'+tinta('¿Qué día cobrás?')+'</h1>'
      +'<p class="lb-p">Te marqué el <b>'+esc(fLarga(sg.fecha))+'</b>. Si esta vez es otro, tocalo.</p>'
      +'<div class="lb-cal" id="lb-cal"></div>'
      +'<p class="lb-queda" id="lb-cobro-txt" aria-live="polite"></p>'
      +'<p class="lb-err" id="lb-err" role="alert" hidden></p>'+(hojear()?accEdit():acc);
  }else if(id==='pacto'){
    /* (2.26) lo apartado se cambia desde la letra chica del pacto */
    h=hojear()?(E.edit==='qa'?apartadoHTML():pactoActualHTML()):pactoNuevoHTML();
  }
  return '<div class="lb-pag-in">'+cab+h+folio+'</div>';
}
function accEdit(){return '<div class="lb-acc"><button class="lb-btn chico" type="button" data-lb="cancelar">Cancelar</button><button class="lb-btn si" type="button" data-lb="guardar">Guardar</button></div>'}
/* Modo hojear: la pregunta con tu respuesta de hoy y «Cambiar» */
function vistaHTML(id){
  var A=actuales(),p=st.plan,h,val,nota;
  if(id==='q1'){var apV=totalApartado(st);h='¿Cuánta plata tenés hoy?';val=money(A.tenes);nota='Lo que te queda según lo que anotaste.'+(apV>0?' Aparte tenés '+money(apV)+' apartados.':'')}
  else if(id==='q2'){h='¿Cuánto querés guardar?';val=money(A.ahorro);nota=num(p.monto)>0?'El '+pctTxt(A.ahorro/Math.max(1,num(p.monto)))+' de lo que tenías al empezar.':''}
  else{var dd=diffDays(today(),p.cobro);h='¿Qué día cobrás?';val=esc(fLarga(p.cobro));nota=dd>0?'Faltan '+dd+(dd===1?' día.':' días.'):'Ya llegó el día de cobro.'}
  return '<h1 class="lb-h lb-tinta" id="lb-h">'+tinta(h)+'</h1>'
    +'<p class="lb-valor '+(id==='q1'?'plata':id==='q2'?'guardado':'fecha')+'" id="lb-valor">'+val+'</p>'
    +'<p class="lb-p">'+esc(nota)+'</p>'
    +'<div class="lb-acc"><button class="lb-btn" type="button" data-lb="cambiar">Cambiar</button></div>'+ORLA;
}
function pactoNuevoHTML(){
  var v=validarPacto(st,datos(),today()),c=v.cuenta,dias=diffDays(today(),D.cobro);
  var atras='<button class="lb-btn chico" type="button" data-lb="atras" aria-label="Página anterior">‹ Atrás</button>';
  return '<h1 class="lb-h lb-tinta" id="lb-h">'+tinta('El pacto')+'</h1>'
    +'<p class="lb-p">Las reglas de tu desafío, día por día hasta que cobres.</p>'
    +'<ul class="lb-pacto">'
    +'<li><span>Empiezo con</span><b>'+money(c.total)+(D.conUsd&&num(D.usd)>0?'<small>incluye '+usd(num(D.usd))+' a '+money(num(D.cotiz))+'</small>':'')+'</b></li>'
    +'<li class="ah"><span>Guardo</span><b>'+money(c.ahorro)+'<small>el '+pctTxt(c.pct)+' del total</small></b></li>'
    +'<li><span>Cobro el</span><b>'+esc(fLarga(D.cobro))+'<small>dentro de '+dias+' '+(dias===1?'día':'días')+'</small></b></li>'
    +(c.fijos>0?'<li><span>Gastos fijos</span><b>− '+money(c.fijos)+'</b></li>':'')
    +'<li class="tot"><span>Para gastar</span><b>'+money(c.gastar)+'<small>≈ '+money(c.porDia)+' por día</small></b></li>'
    +'</ul>'
    +(c.fijos>0||(st.fijos||[]).length?'':'<p class="lb-p chico">¿Pagás alquiler, luz o internet? Después cargalos en Fijos.</p>')
    +avisosHTML(v)
    +'<div class="lb-firma" id="lb-firma"><div class="lb-flor">'+broteHTML(Math.min(broteVisto,3))+'</div>'+SELLO+'<p class="lb-sellado" id="lb-sellado"></p></div>'
    +'<div class="lb-acc" id="lb-acc-pacto">'+atras+'<button class="lb-btn si" type="button" data-lb="sellar">Sellar el pacto</button></div>';
}
/* El pacto de hoy, ya sellado, con la letra chica (porcentaje, mínimo, fechas y lo que sobra de cada semana) */
function pactoActualHTML(){
  var A=actuales(),p=st.plan,pc=planCalc(st),dd=Math.max(1,diffDays(today()<p.inicio?p.inicio:today(),p.cobro)),resto=pc.gastar-pc.spentInPlan;
  var sob=p.sobrante||'siguiente',apT=totalApartado(st);
  return '<h1 class="lb-h lb-tinta" id="lb-h">'+tinta('Tu pacto')+'</h1>'
    +'<p class="lb-p">'+(st.pacto&&st.pacto.sellado?'Lo sellaste el '+esc(fLarga(st.pacto.sellado))+(st.pacto.numero>1?' (pacto n.º '+st.pacto.numero+')':'')+'.':'El plan que venís usando.')+' Para cambiar algo, volvé a esa pregunta.</p>'
    +'<ul class="lb-pacto">'
    +'<li><span>Tengo hoy</span><b>'+money(A.tenes)+'</b></li>'
    +'<li class="ah"><span>Guardo</span><b>'+money(A.ahorro)+'</b></li>'
    +'<li><span>Cobro el</span><b>'+esc(fLarga(p.cobro))+'</b></li>'
    +'<li class="tot"><span>Para gastar</span><b>'+money(Math.max(0,resto))+'<small>≈ '+money(Math.max(0,resto)/dd)+' por día</small></b></li></ul>'
    +'<div class="lb-firma"><div class="lb-flor">'+broteHTML(Math.min(broteVisto,4))+'</div>'+SELLO.replace('class="lb-sello"','class="lb-sello puesto"')+'</div>'
    +'<details class="lb-letra"><summary>La letra chica del pacto</summary>'
    +'<div class="lb-letra-in"><div class="lb-campo"><span class="lb-l">Lo que sobra de cada semana</span><div class="lb-chips" role="group" aria-label="Qué hacer con lo que sobra">'
    +'<button class="lb-chip" type="button" data-sobrante="siguiente" aria-pressed="'+(sob!=='ahorro')+'">Pasa a la semana siguiente</button><button class="lb-chip" type="button" data-sobrante="ahorro" aria-pressed="'+(sob==='ahorro')+'">Va al ahorro</button></div></div>'
    /* (2.26) la plata apartada: tuya, pero no para gastar (ya no es una pregunta del prólogo) */
    +'<div class="lb-campo"><span class="lb-l">Plata apartada</span><p class="lb-p chico">'+(apT>0?money(apT)+' que no entran en el plan.':'Si una parte de tu plata no es para gastar, apartala.')+'</p>'
    +'<div><button class="lb-btn chico" type="button" data-lb="cambiar-ap">'+(apT>0?'Cambiar lo apartado':'Apartar algo')+'</button></div></div>'
    +'<div id="lb-letra-plan"></div></div></details>'
    +'<div class="lb-acc"><button class="lb-btn chico" type="button" data-lb="atras" aria-label="Página anterior">‹ Atrás</button><button class="lb-btn si" type="button" data-lb="cerrar-libro">Ir a Hoy ›</button></div>';
}
/* El formulario de las opciones del plan vive en Ajustes (#plan-aj-casa) y se presta a la letra chica mientras está abierta */
function prestarLetra(){var s=q('#lb-letra-plan'),f=$('#plan-aj');if(s&&f){s.appendChild(f);f.open=true}}
function devolverLetra(){var c=$('#plan-aj-casa'),f=$('#plan-aj');if(c&&f&&f.parentNode!==c){f.open=false;c.appendChild(f)}}

function pctTxt(r){return (Math.round(r*1000)/10).toLocaleString('es-UY')+' %'}
function avisosHTML(v){
  var h='';
  if(v.cuenta&&v.cuenta.supervivencia)return '<p class="lb-aviso suave lb-superv"><b>Ojo:</b> te quedarían '+money(v.cuenta.porDia)+' por día. Esta vez la meta es llegar al cobro.</p>';
  if(v.avisos.indexOf('bajo')>=0)h+='<p class="lb-aviso">Te quedarían '+money(v.cuenta.porDia)+' por día. Es poco: si querés, bajá el ahorro.</p>';
  if(v.avisos.indexOf('cero')>=0)h+='<p class="lb-aviso suave">Con cero también se puede, pero probá con un poquito.</p>';
  return h;
}
function total(){return totalPacto(D.pesos,D.conUsd?D.usd:0,D.conUsd?D.cotiz:0)}
/* (2.26) La primera pregunta es solo la plata que podés gastar; lo apartado que ya tenías (pacto nuevo al cobrar) va aparte */
function apartadoD(){return D.hayAp?totalApartado(normApartado(D.ap)):0}
function datos(){return {total:total()+apartadoD(),usd:D.conUsd?D.usd:0,cotiz:D.conUsd?D.cotiz:0,ahorro:D.ahorro,cobro:D.cobro,apartado:D.hayAp?D.ap:[]}}
/* Modo hojear: los tres datos de hoy, con lo que estás cambiando */
function datosAjuste(){var A=actuales(),id=E.edit;return {tenes:id==='q1'?total():A.tenes,ahorro:id==='q2'?num(D.ahorro):A.ahorro,cobro:id==='q3'?D.cobro:A.cobro}}
function errAjuste(v){var k=Object.keys(v.errores)[0];if(!k)return '';var m=v.errores[k];return m==='max'?'Con esa plata, lo máximo que podés guardar es '+money(Math.floor(v.maxAhorro))+'.':m}
function q(sel){return document.querySelector('#lb-pila .lb-pag:last-child '+sel)}
function error(m){var e=q('#lb-err');if(e){e.textContent=m||'';e.hidden=!m}}

/* ---------- Modo supervivencia (2.18): aunque no guardes nada, da menos de lo mínimo por día ---------- */
function superD(){return cuentaPacto(st,Object.assign({},datos(),{ahorro:0}),today()).supervivencia}

/* ---------- La plata apartada (2.17; desde 2.26 se cambia en la letra chica del pacto) ---------- */
var nAp=0;
function filaAp(){return {id:'ap'+Date.now().toString(36)+(nAp++),tipo:'ahorro',monto:'',nota:''}}
function filaApHTML(a,i){
  return '<div class="lb-ap" data-i="'+i+'">'
    +'<div class="lb-chips" role="group" aria-label="Qué es esta plata">'+TIPOS_APARTADO.map(function(t){return '<button class="lb-chip" type="button" data-lb="ap-tipo" data-i="'+i+'" data-t="'+t.id+'" aria-pressed="'+(a.tipo===t.id)+'">'+esc(t.c)+'</button>'}).join('')+'</div>'
    +'<div class="lb-ap-fila"><div class="lb-monto chico"><span>$</span><input class="lb-ap-monto" type="number" inputmode="decimal" min="0" step="any" placeholder="0" aria-label="Monto apartado" data-i="'+i+'" value="'+esc(a.monto)+'"></div>'
    +'<button class="lb-link" type="button" data-lb="ap-quitar" data-i="'+i+'">Quitar</button></div>'
    +'<input class="lb-ap-nota" type="text" maxlength="40" enterkeyhint="done" placeholder="'+(a.tipo==='ajena'?'¿de quién? (opcional)':a.tipo==='reserva'?'¿para qué? (opcional)':'una nota (opcional)')+'" aria-label="Nota" data-i="'+i+'" value="'+esc(a.nota)+'">'
    +'</div>';
}
function apartadoHTML(){
  return '<h1 class="lb-h lb-tinta" id="lb-h">'+tinta('Lo que tenés apartado')+'</h1>'
    +'<p class="lb-p">Plata tuya que no es para gastar: no entra en el plan.</p>'
    +'<div id="lb-ap-lista" class="lb-ap-lista">'+D.ap.map(filaApHTML).join('')
    +'<button class="lb-btn chico lb-ap-mas" type="button" data-lb="ap-mas">+ Otra parte apartada</button></div>'
    +'<p class="lb-queda" id="lb-ap-queda" aria-live="polite"></p>'
    +'<p class="lb-err" id="lb-err" role="alert" hidden></p>'+accEdit();
}
function leerAp(el){
  var i=Number(el.getAttribute('data-i'));if(!D.ap[i])return;
  if(el.classList.contains('lb-ap-monto'))D.ap[i].monto=el.value;
  if(el.classList.contains('lb-ap-nota'))D.ap[i].nota=el.value;
}
function redibujarAp(foco){
  var l=q('#lb-ap-lista');if(!l)return;
  irA(idx,0);
  if(foco){var f=q(foco);if(f)try{f.focus({preventScroll:false})}catch(e){}}
}
function vivoAp(){
  var el=q('#lb-ap-queda');if(!el)return;
  var v=previaApartado(st,D.ap),d=Math.max(0,disponible(st,planCalc(st))-v.diff);
  el.innerHTML=v.ok?(v.diff>0?'Apartás <b>'+money(v.diff)+'</b> más: para usar te quedan <b>'+money(d)+'</b>.':v.diff<0?'Liberás <b>'+money(-v.diff)+'</b>: para usar vas a tener <b>'+money(d)+'</b>.':'No cambia lo que podés usar.'):'';
  error(v.ok?'':'Hoy podés apartar como mucho '+money(v.max)+' más: es lo que tenés disponible.');
}
function guardarApartado(){
  var v=aplicarApartado(st,D.ap);
  if(!v.ok){error('Hoy podés apartar como mucho '+money(v.max)+' más: es lo que tenés disponible.');return}
  E.edit=null;
  if(o.alApartado)o.alApartado();
  irA(idx,0);
  if(v.diff)toastAccion(v.diff>0?'Apartaste '+money(v.diff)+' más':'Liberaste '+money(-v.diff),'Deshacer',function(){deshacerApartado(st,v.deshacer);if(o.alApartado)o.alApartado();if(libroAbierto())irA(idx,0)});
}

/* Lo que se recalcula mientras escribís */
function vivoQ1(){
  var t=q('#lb-total');if(!t)return;
  t.innerHTML=D.conUsd&&num(D.usd)>0&&num(D.cotiz)>0?'En total '+(hojear()?'tenés':'empezás con')+' <b>'+money(total())+'</b>':'';
  var b=q('.lb-brote');if(b&&!hojear()){b.setAttribute('data-e',String(etapa('q1')));broteVisto=etapa('q1')}
  if(hojear())vivoAjuste();
}
function vivoAjuste(){
  var v=previaAjuste(st,datosAjuste(),today()),el=q('#lb-queda');
  if(el)el.innerHTML=v.ok?'Te quedan <b>'+money(v.gastar)+'</b> para gastar, <span class="n">≈ '+money(v.porDia)+' por día</span> durante '+v.dias+' '+(v.dias===1?'día':'días')+'.':'';
  error(errAjuste(v));return v;
}
function vivoQ2(desdeRango){
  var r=q('#lb-rango'),a=q('#lb-ahorro');if(!r)return;
  var tot=hojear()?actuales().tenes:total(),mx=num(r.max);
  if(desdeRango){D.ahorro=r.value;a.value=r.value}else{r.value=String(Math.min(num(D.ahorro),mx))}
  r.style.setProperty('--v',(mx>0?Math.min(100,num(r.value)/mx*100):0)+'%');
  q('#lb-pct-n').textContent=pctTxt(tot>0?num(D.ahorro)/tot:0);
  document.querySelectorAll('#lb-pila .lb-pag:last-child [data-lb="atajo"]').forEach(function(b){b.setAttribute('aria-pressed',String(num(b.getAttribute('data-val'))===num(D.ahorro)))});
  if(hojear()){vivoAjuste();return}
  var c=cuentaPacto(st,datos(),today()),v=validarPacto(st,datos(),today());
  q('#lb-queda').innerHTML='Te quedan <b>'+money(c.gastar)+'</b> para gastar, <span class="n">≈ '+money(c.porDia)+' por día</span> hasta el '+esc(fLarga(c.cobro))+'.';
  q('#lb-avisos').innerHTML=v.errores.ahorro?'':avisosHTML(v);
  if(v.errores.ahorro)error(v.errores.ahorro==='fijos'?'Con tus gastos fijos, lo máximo que podés ahorrar es '+money(Math.floor(c.maxAhorro))+'.':v.errores.ahorro);else error('');
}
function pintarCal(){
  var box=q('#lb-cal');if(!box)return;
  var c=mesCalendario(D.mes[0],D.mes[1],today()),hoy=parse(today()),sg=sugerirCobro(st,today()).fecha;
  var antes=c.y*12+c.m<=hoy.getFullYear()*12+hoy.getMonth();
  var h='<div class="lb-cal-h"><button type="button" data-lb="mes" data-d="-1" aria-label="Mes anterior"'+(antes?' disabled':'')+'>‹</button><b>'+MESL[c.m]+' '+c.y+'</b><button type="button" data-lb="mes" data-d="1" aria-label="Mes siguiente">›</button></div>'
    +'<table role="grid" aria-label="'+MESL[c.m]+' '+c.y+'"><thead><tr>'+['lu','ma','mi','ju','vi','sá','do'].map(function(d){return '<th scope="col">'+d+'</th>'}).join('')+'</tr></thead><tbody>';
  c.semanas.forEach(function(s){
    h+='<tr>'+s.map(function(d){
      if(!d)return '<td></td>';
      var cls='lb-dia'+(d.feriado?' fer':'')+(d.fecha===sg?' sug':'')+(d.hoy?' hoy':'');
      return '<td><button type="button" class="'+cls+'" data-lb="dia" data-f="'+d.fecha+'" aria-pressed="'+(d.fecha===D.cobro)+'"'+(d.pasado?' disabled':'')+' aria-label="'+esc(fLarga(d.fecha))+(d.feriado?', feriado':'')+(d.fecha===sg?', sugerido':'')+'">'+d.dia+'</button></td>';
    }).join('')+'</tr>';
  });
  h+='</tbody></table><div class="lb-cal-ley"><span><i class="s"></i>sugerido</span><span><i class="f"></i>feriado no laborable</span></div>';
  box.innerHTML=h;
  var t=q('#lb-cobro-txt'),n=D.cobro?diffDays(today(),D.cobro):0;
  if(t)t.innerHTML=D.cobro&&n>0?'Cobrás el <b>'+esc(fLarga(D.cobro))+'</b>: <span class="n">faltan '+n+' '+(n===1?'día':'días')+'</span>.':'Tocá el día en que cobrás.';
  if(hojear())error(errAjuste(previaAjuste(st,datosAjuste(),today())));
}
function leer(){
  var g=function(id){var e=q('#'+id);return e?e.value:null};
  if(g('lb-nombre')!==null)D.nombre=g('lb-nombre');
  if(g('lb-pesos')!==null)D.pesos=g('lb-pesos');
  if(g('lb-usd')!==null)D.usd=g('lb-usd');
  if(g('lb-cotiz')!==null)D.cotiz=g('lb-cotiz');
  if(g('lb-ahorro')!==null)D.ahorro=g('lb-ahorro');
}
/* ¿Se puede pasar de esta página? (nuevo y ciclo) */
function valida(id){
  if(hojear())return true;
  var v=validarPacto(st,datos(),today());
  if(id==='q1'){
    if(D.conUsd&&num(D.usd)>0&&!(num(D.cotiz)>0)){error('Escribí a cuánto está el dólar.');return false}
    if(v.errores.total){error(v.errores.total);return false}
    if(D.ahorro===null||D.ahorro===''){var at=atajosPacto(total());D.ahorro=superD()?'0':at.length?String(at[0].monto):'0'}
    if(num(D.ahorro)>total())D.ahorro=String(Math.floor(total()));
  }
  if(id==='q2'&&v.errores.ahorro){error(v.errores.ahorro==='fijos'?'Con tus gastos fijos, lo máximo que podés ahorrar es '+money(Math.floor(v.cuenta.maxAhorro))+'.':v.errores.ahorro);return false}
  if(id==='q3'&&v.errores.cobro){error(v.errores.cobro);return false}
  return true;
}
/* Modo hojear: «Cambiar» abre la pregunta con tus datos; «Guardar» recalcula todo y reescribe los números */
function empezarEdicion(id){
  var A=actuales(),c=parse(st.plan.cobro);
  E.edit=id;D.pesos=String(Math.round(A.tenes));D.ap=JSON.parse(JSON.stringify((st.pacto&&st.pacto.apartado)||[]));D.hayAp=D.ap.length?true:null;
  /* (2.26) lo apartado se edita en la página del pacto (la letra chica) */
  if(id==='qa'){D.hayAp=true;if(!D.ap.length)D.ap=[filaAp()]}
  D.conUsd=false;D.usd='';D.ahorro=String(A.ahorro);D.cobro=A.cobro;D.mes=[c.getFullYear(),c.getMonth()];
  irA(PAGS.indexOf(id==='qa'?'pacto':id),0);
  var f=q(id==='q1'?'#lb-pesos':id==='q2'?'#lb-ahorro':id==='qa'?'.lb-ap-monto':'.lb-dia[aria-pressed="true"]');if(f)try{f.focus({preventScroll:true});if(f.select)f.select()}catch(e){}
}
function guardarEdicion(){
  if(E.edit==='qa'){guardarApartado();return}
  var v=aplicarAjuste(st,datosAjuste(),today());
  if(!v.ok){error(errAjuste(v));return}
  E.edit=null;
  if(o.alGuardar)o.alGuardar(v);
  irA(idx,0);
  /* reescritura: el número nuevo aparece como tinta fresca */
  var val=q('#lb-valor');
  if(val&&!quieto())val.animate([{opacity:0,transform:'translateY(6px) scale(.98)'},{opacity:1,transform:'none'}],{duration:420,easing:'cubic-bezier(.2,.7,.2,1)'});
}

/* Pasar la hoja dentro del prólogo (2.9, ui/pase.js): hacia adelante, la de ahora gira sobre el lomo y descubre la nueva,
   que ya está debajo; hacia atrás, la anterior vuelve desde la izquierda y se apoya sobre la de ahora.
   dir 0 = la misma página, redibujada (al cambiar o guardar un dato). */
function cajaDe(el){var r=el.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height}}
function fotoPag(pag){
  var c=pag.cloneNode(true),a=pag.querySelector('.lb-pag-in'),b=c.querySelector('.lb-pag-in');
  c.removeAttribute('aria-labelledby');c.querySelectorAll('[name]').forEach(function(x){x.removeAttribute('name')});
  if(a&&b&&a.scrollTop){b.style.height='auto';b.style.minHeight='100%';b.style.overflow='visible';b.style.transform='translateY('+(-a.scrollTop)+'px)'}
  return c;
}
function irA(i,dir){
  var pila=$('#lb-pila'),vieja=pila.querySelector('.lb-pag:last-child'),nueva=document.createElement('section');
  terminarPase();devolverLetra();
  idx=i;nueva.className='lb-pag';nueva.setAttribute('aria-labelledby','lb-h');
  pila.querySelectorAll('#lb-h').forEach(function(x){x.removeAttribute('id')});
  nueva.innerHTML=pagHTML(PAGS[idx]);
  pila.appendChild(nueva);
  montarPagina();
  if(!vieja)return;
  if(dir===0){vieja.remove();return}
  vieja.style.zIndex='2';vieja.setAttribute('aria-hidden','true');
  if(quieto()){
    sonar('hoja');
    nueva.animate([{opacity:0},{opacity:1}],{duration:180});
    vieja.animate([{opacity:1},{opacity:0}],{duration:180,fill:'forwards'}).onfinish=function(){vieja.remove()};
    return;
  }
  var caja=cajaDe(pila);
  if(dir>0){var f=fotoPag(vieja);vieja.remove();girar({padre:$('#lb-hojas'),caja:caja,frente:f,sentido:1,z:3})}
  else girar({padre:$('#lb-hojas'),caja:caja,frente:fotoPag(nueva),sentido:-1,z:3,alFinal:function(){vieja.remove()}});
}
function montarPagina(){
  var id=PAGS[idx];
  crecer();
  if(id==='pacto'&&hojear()){if(E.edit==='qa')vivoAp();else prestarLetra();return}
  if(hojear()&&E.edit!==id)return;
  if(id==='q1')vivoQ1();
  if(id==='q2')vivoQ2(false);
  if(id==='q3')pintarCal();
  /* El teclado se abre en el monto (en iOS solo si viene de un toque) */
  var f=q('#lb-pesos');
  if(f&&!D.pesos)try{f.focus({preventScroll:true})}catch(e){}
}

/* El sello: se estampa con un leve temblor y una lluvia corta de polvo de estrellas dorado */
function estampar(){
  var s=$('#lb-firma .lb-sello'),pag=$('#lb-pila .lb-pag:last-child'),firma=$('#lb-firma');
  s.classList.add('puesto');setTimeout(function(){sonar('sello')},300);
  if(quieto()){s.animate([{opacity:0},{opacity:1}],{duration:250});return 250}
  s.animate([
    {opacity:0,transform:'scale(1.9) rotate(-20deg)',easing:'cubic-bezier(.55,0,.8,.3)'},
    {opacity:1,transform:'scale(.9) rotate(-8deg)',offset:.62,easing:'ease-out'},
    {opacity:1,transform:'scale(1.03) rotate(-8deg)',offset:.82},
    {opacity:1,transform:'scale(1) rotate(-8deg)'}
  ],{duration:520});
  pag.animate([{transform:'none'},{transform:'translate(1.5px,1px)'},{transform:'translate(-1.5px,-.5px)'},{transform:'translate(1px,0)'},{transform:'none'}],{duration:220,delay:320});
  polvo(firma,14,330);
  return 600;
}
/* Al sellar, a la flor le cae una estrella */
function caeEstrella(){
  var flor=q('.lb-flor'),b=q('.lb-brote');if(!flor||!b)return;
  if(quieto()){b.setAttribute('data-e','5');return}
  var e=document.createElement('i');e.className='lb-cae';e.innerHTML=ESTRELLA;flor.appendChild(e);
  e.animate([{transform:'translate(70px,-260px) rotate(-200deg) scale(.5)',opacity:0},{opacity:1,offset:.12},{transform:'translate(0,0) rotate(0deg) scale(1)',opacity:1}],{duration:950,easing:'cubic-bezier(.45,0,.8,.45)'}).onfinish=function(){
    e.remove();b.setAttribute('data-e','5');sonar('estrella');polvo(flor,10,0);
  };
}
/* Polvo de estrellas dorado (también lo usan los logros) */
export function polvo(donde,n,demora){
  if(!donde||quieto())return;
  for(var k=0;k<n;k++){
    var c=document.createElement('i');c.className='lb-chispa';donde.appendChild(c);
    var ang=k/n*Math.PI*2+Math.random()*.4,dist=60+Math.random()*50;
    c.animate([{opacity:0,transform:'translate(0,0) scale(.6)'},{opacity:1,transform:'translate('+Math.cos(ang)*dist*.5+'px,'+Math.sin(ang)*dist*.5+'px) scale(1)',offset:.3},{opacity:0,transform:'translate('+Math.cos(ang)*dist+'px,'+(Math.sin(ang)*dist+24)+'px) scale(.3)'}],{duration:700,delay:demora||0,easing:'ease-out',fill:'forwards'}).onfinish=function(){this.effect.target.remove()};
  }
}

function cerrarTodo(dir){
  var h=$('#lb-hojas'),m=$('#libro');
  devolverLetra();
  document.documentElement.classList.remove('voz-abierta','lb-abierto');
  var fin=function(){h.hidden=true;h.innerHTML='';m.hidden=true;m.innerHTML=''};
  if(h.hidden||quieto()){fin();return}
  var pag=h.querySelector('.lb-pag:last-child');
  terminarPase();
  if(dir>0&&pag){
    /* la última hoja gira sobre el lomo y descubre la página de hoy, que ya está debajo */
    var caja=cajaDe(pag),f=fotoPag(pag);
    $('#lb-pila').innerHTML='';h.classList.add('lb-transp');
    girar({padre:h,caja:caja,frente:f,sentido:1,z:3,alFinal:function(){h.classList.remove('lb-transp');fin()}});
    return;
  }
  h.animate([{opacity:1},{opacity:0}],{duration:280,fill:'forwards'}).onfinish=fin;
}
/* Desde la primera página del prólogo hacia atrás: el libro se cierra y queda la tapa */
function aLaTapa(){
  var f=o.alTapa,h=$('#lb-hojas');
  devolverLetra();terminarPase();
  h.hidden=true;h.innerHTML='';h.classList.remove('lb-transp');
  f();
}
function abrirHojas(pagina,dir){
  var h=$('#lb-hojas');
  h.innerHTML='<div class="lb-pila" id="lb-pila"></div>';h.hidden=false;
  irA(Math.max(0,PAGS.indexOf(pagina||PAGS[0])),1);
  if(!quieto()){
    var pag=h.querySelector('.lb-pag');
    if(dir<0&&pag){
      /* desde Hoy hacia atrás: la hoja del pacto vuelve desde la izquierda y se apoya sobre la página de hoy */
      var pila=$('#lb-pila');h.classList.add('lb-transp');pila.style.visibility='hidden';
      girar({padre:h,caja:cajaDe(pila),frente:fotoPag(pag),sentido:-1,z:3,alFinal:function(){h.classList.remove('lb-transp');pila.style.visibility=''}});
    }else h.animate([{opacity:0},{opacity:1}],{duration:260});
  }
  $('#libro').hidden=true;
}

/* opt: {modo:'nuevo'|'hojear'|'ciclo'|'tapa', estado, pagina, editar, dir,
         listo(estado), alImportar(estado), alEjemplo(), alCerrar(dir), alGuardar(v), alApartado(), antes(estado)} */
export function abrirLibro(opt){
  o=opt;st=opt.estado;vista='portada';E={edit:null};
  aplicarFeriados(st);
  var sg=sugerirCobro(st,today()),c=parse(sg.fecha);
  D={nombre:null,pesos:'',usd:'',cotiz:cotizacion(st)?String(cotizacion(st)):'',conUsd:false,ahorro:null,cobro:sg.fecha,mes:[c.getFullYear(),c.getMonth()],hayAp:null,ap:[]};
  broteVisto=0;
  PAGS=o.modo==='ciclo'?PROLOGO.slice(1):(o.modo==='nuevo'&&o.alHerramienta?['que']:[]).concat(PROLOGO);
  var m=$('#libro');
  document.documentElement.classList.add('voz-abierta','lb-abierto');
  if(o.modo==='ciclo'){D.ap=JSON.parse(JSON.stringify((st.pacto&&st.pacto.apartado)||[]));D.hayAp=D.ap.length?true:null;D.pesos=String(Math.round(num(o.total))||'');D.ahorro=String(Math.round(num(st.plan.ahorro))||'');vista='hojas';abrirHojas();return}
  if(o.modo==='nuevo'&&o.sinTapa){vista='hojas';abrirHojas(PAGS[0],1);return}
  if(o.modo==='hojear'){vista='hojas';var pg=o.editar||o.pagina||'p1';if(pg==='qa')pg='pacto';broteVisto=Math.max(0,etapa(pg)-1);abrirHojas(pg,o.dir||1);if(o.editar)empezarEdicion(o.editar);return}
  m.innerHTML=htmlPortada(!!o.alEjemplo);m.hidden=false;m.style.opacity='';
  tapaQuieta(m);montarTapa(m);
  if(o.alEjemplo)montarImportador($('#lb-import'),function(e){cerrarTodo();o.alImportar(e)},'Usar estos datos');
  /* «Cerrar el libro»: la tapa se cierra (la apertura al revés) y queda esperando un toque */
  if(o.modo==='tapa'){
    if(quieto())m.animate([{opacity:0},{opacity:1}],{duration:250});
    else{vista='cerrando';moverLibro(m,function(){vista='portada'},true)}
  }
}
/* ¿Está abierto el libro (tapa o prólogo)? */
export function libroAbierto(){var h=$('#lb-hojas'),m=$('#libro');return (h&&!h.hidden)||(m&&!m.hidden)}

export function initLibro(){
  var m=$('#libro'),h=$('#lb-hojas');
  function abrir(){
    if(vista!=='portada')return;
    if(fueArrastre())return; /* arrastrar el dedo sobre la tapa mueve la luz, no abre */
    vista='abriendo';
    var luego=function(){vista='hojas';if(o.modo==='tapa'){cerrarTodo();if(o.listo)o.listo();return}abrirHojas()};
    if(quieto()){m.animate([{opacity:1},{opacity:0}],{duration:250,fill:'forwards'}).onfinish=luego;return}
    moverLibro(m,luego);
  }
  m.addEventListener('click',function(e){
    var b=e.target.closest('[data-lb]');if(!b)return;
    var a=b.getAttribute('data-lb');
    if(a==='abrir')abrir();
    if(a==='importar'){$('#lb-imp').hidden=false}
    if(a==='imp-x'){$('#lb-imp').hidden=true}
    if(a==='ejemplo'){cerrarTodo();o.alEjemplo()}
  });
  m.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('lb-libro')){e.preventDefault();abrir()}});
  h.addEventListener('input',function(e){
    var id=e.target.id;leer();
    if(id==='lb-pesos'||id==='lb-usd'||id==='lb-cotiz'){error('');vivoQ1()}
    if(id==='lb-rango')vivoQ2(true);
    if(e.target.closest('.lb-ap')){leerAp(e.target);error('');vivoAp()}
    if(id==='lb-ahorro')vivoQ2(false);
  });
  h.addEventListener('change',function(e){
    if(e.target.id==='lb-nombre'&&hojear()){var nm=e.target.value.trim().slice(0,30);if(nm){st.perfil.nombre=nm;if(o.alNombre)o.alNombre();irA(idx,0)}return}
    if(e.target.id==='lb-conusd'){D.conUsd=e.target.checked;q('#lb-usd-box').hidden=!D.conUsd;vivoQ1();if(D.conUsd)try{q('#lb-usd').focus()}catch(x){}}
  });
  h.addEventListener('click',function(e){
    var b=e.target.closest('[data-lb]');if(!b||b.closest('[aria-hidden="true"]'))return;
    var a=b.getAttribute('data-lb');leer();
    if(a==='sig'){if(!valida(PAGS[idx]))return;if(idx<PAGS.length-1)irA(idx+1,1);return}
    if(a==='atras'){if(idx>0){E.edit=null;irA(idx-1,-1)}else if(hojear()&&o.alTapa)aLaTapa();return}
    if(a==='cambiar'){empezarEdicion(PAGS[idx]);return}
    if(a==='herr'){var hid=b.getAttribute('data-h');cerrarTodo(1);o.alHerramienta(st,hid);return}
    if(a==='sug-monto'){D.pesos=b.getAttribute('data-val');var ip=q('#lb-pesos');if(ip)ip.value=D.pesos;error('');vivoQ1();return}
    if(a==='cambiar-ap'){empezarEdicion('qa');return}
    if(a==='ap-tipo'){var ft=Number(b.getAttribute('data-i'));if(D.ap[ft])D.ap[ft].tipo=b.getAttribute('data-t');redibujarAp();return}
    if(a==='ap-mas'){D.ap.push(filaAp());redibujarAp('.lb-ap:last-of-type .lb-ap-monto');return}
    if(a==='ap-quitar'){D.ap.splice(Number(b.getAttribute('data-i')),1);redibujarAp();return}
    if(a==='cancelar'){E.edit=null;irA(idx,0);return}
    if(a==='guardar'){guardarEdicion();return}
    if(a==='atajo'){D.ahorro=b.getAttribute('data-val');q('#lb-ahorro').value=D.ahorro;vivoQ2(false);return}
    if(a==='mes'){var d=new Date(D.mes[0],D.mes[1]+Number(b.getAttribute('data-d')),1,12);D.mes=[d.getFullYear(),d.getMonth()];pintarCal();return}
    if(a==='dia'){D.cobro=b.getAttribute('data-f');error('');pintarCal();return}
    if(a==='cerrar-libro'){cerrarTodo(1);if(o.alCerrar)o.alCerrar(1);return}
    if(a==='sellar'){
      var v=validarPacto(st,datos(),today());
      if(v.ok&&o.antes)o.antes(st);
      if(v.ok)v=sellarPacto(st,datos(),today());
      var nm=String(D.nombre||'').trim();if(v.ok&&nm&&st.perfil)st.perfil.nombre=nm.slice(0,30);
      if(!v.ok){var k=Object.keys(v.errores)[0];irA(PAGS.indexOf(k==='total'||k==='apartado'?'q1':k==='ahorro'?'q2':'q3'),-1);return}
      var t=estampar();
      $('#lb-acc-pacto').innerHTML='';
      setTimeout(function(){
        var s=$('#lb-sellado');s.textContent='Pacto sellado el '+fLarga(st.pacto.sellado)+'.';s.classList.add('ver');
        caeEstrella();
        $('#lb-acc-pacto').innerHTML='<button class="lb-btn si" type="button" data-lb="empezar">Ir a la página de hoy</button>';
        try{$('#lb-acc-pacto button').focus({preventScroll:true})}catch(x){}
      },t);
      return;
    }
    if(a==='empezar'){if(o.modo==='nuevo')marcarTour();cerrarTodo(1);o.listo(st)}
  });
  /* La letra chica: lo que sobra de cada semana (el cambio lo hace Semanas); acá solo se marca el elegido */
  h.addEventListener('click',function(e){
    if(!e.target.closest('[data-sobrante]'))return;
    setTimeout(function(){h.querySelectorAll('[data-sobrante]').forEach(function(x){x.setAttribute('aria-pressed',String(x.getAttribute('data-sobrante')===(st.plan.sobrante||'siguiente')))})},0);
  });
  /* Deslizar para pasar de página (no desde un campo, el calendario, el deslizador ni la letra chica).
     En hojear, hacia adelante desde el pacto se vuelve a Hoy. */
  var x0=null,y0=0;
  h.addEventListener('pointerdown',function(e){x0=e.target.closest('input,textarea,select,.lb-cal,.lb-rango,.lb-letra')?null:e.clientX;y0=e.clientY});
  h.addEventListener('pointerup',function(e){
    if(x0===null)return;var dx=e.clientX-x0,dy=e.clientY-y0;x0=null;
    if(Math.abs(dx)<70||Math.abs(dy)>Math.abs(dx)*.6)return;
    var pag=$('#lb-pila .lb-pag:last-child');if(!pag||E.edit)return;
    if(dx<0&&hojear()&&idx===PAGS.length-1){cerrarTodo(1);if(o.alCerrar)o.alCerrar(1);return}
    var btn=pag.querySelector(dx<0?'[data-lb="sig"]':'[data-lb="atras"]');if(btn)btn.click();
  });
  /* En segundo plano, nada se mueve */
  document.addEventListener('visibilitychange',function(){document.documentElement.classList.toggle('lb-pausa',document.visibilityState==='hidden')});
}
