/* El Libro del Ahorro: la portada en 3D que se abre, el prólogo y el pacto (las 3 preguntas).
   - La apertura completa (~2,5 s) se ve la primera vez o al releer el prólogo; un toque la saltea.
   - Una pregunta por página. Las cuentas y validaciones son puras (logica/pacto.js).
   - Solo se animan transform y opacity (Web Animations). Con «reducir movimiento», solo fundidos. */
import {num} from '../logica/util.js';
import {parse,diffDays,MESL,DIAL} from '../logica/fechas.js';
import {cotizacion} from '../logica/monedas.js';
import {totalPacto,validarPacto,cuentaPacto,sellarPacto,sugerirCobro,atajosPacto,pasoAhorro,mesCalendario} from '../logica/pacto.js';
import {aplicarFeriados} from './feriados.js';
import {montarImportador} from './respaldo.js';
import {marcarTour} from './tour.js';
import {$,today,money,usd,esc} from './comun.js';

export var TITULO='El Libro del Ahorro';
var T=22; /* grosor del libro en px (igual que --lb-t) */
function quieto(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
function fLarga(s){var d=parse(s);return DIAL[d.getDay()]+' '+d.getDate()+' de '+MESL[d.getMonth()]}

/* El texto aparece como tinta: palabra por palabra */
function tinta(t){var i=0;return t.split(' ').map(function(w){return '<span class="w" style="--i:'+(i++)+'">'+w+'</span>'}).join(' ')}

var ORN='<svg class="lb-orn" viewBox="0 0 120 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  +'<path d="M60 52V24"/><path d="M60 34c-10 0-17-6-19-15 10 0 17 5 19 15Z"/><path d="M60 28c9 0 15-5 17-13-9 0-15 5-17 13Z"/>'
  +'<circle cx="60" cy="54" r="7"/><path d="M57.5 54h5M60 51.5v5" stroke-width="1.2"/><path d="M6 54h40M74 54h40"/><path d="M10 50l4 4-4 4-4-4ZM110 50l4 4-4 4-4-4Z" stroke-width="1.1"/></svg>';
var ORLA='<svg class="lb-orla" viewBox="0 0 120 14" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M2 7h46M72 7h46"/><path d="M60 1l6 6-6 6-6-6Z"/><circle cx="60" cy="7" r="1.6" fill="currentColor"/></svg>';
/* Sello de lacre en lima: borde irregular, anillo y el brote del ahorro */
var SELLO='<svg class="lb-sello" viewBox="0 0 160 160" aria-hidden="true"><defs>'
  +'<radialGradient id="lb-lacre" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#eaff9e"/><stop offset=".35" stop-color="#c6f432"/><stop offset=".8" stop-color="#7d9c14"/><stop offset="1" stop-color="#4c6209"/></radialGradient></defs>'
  +'<path fill="url(#lb-lacre)" d="M80 6c9 0 12 7 20 9s16-3 22 3 1 14 6 21 13 8 14 17-6 12-6 21 7 14 2 22-14 5-20 11-5 15-14 18-14-4-23-4-15 8-23 4-4-13-11-18-17-3-21-11 4-14 2-22-11-11-9-20 11-10 15-17 0-15 7-20 15 0 22-4S70 6 80 6Z"/>'
  +'<circle cx="80" cy="80" r="46" fill="none" stroke="#3f520a" stroke-width="2.5" opacity=".55"/>'
  +'<circle cx="80" cy="80" r="40" fill="none" stroke="#f3ffc9" stroke-width="1" opacity=".45"/>'
  +'<g fill="none" stroke="#2f3d07" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".8"><path d="M80 106V70"/><path d="M80 84c-13 0-22-8-24-19 13 0 22 7 24 19Z"/><path d="M80 76c11 0 19-6 21-16-11 0-19 6-21 16Z"/><path d="M64 108h32"/></g>'
  +'</svg>';

/* ---------- Portada ---------- */
function htmlPortada(nuevo){
  var hojas='';for(var i=0;i<3;i++)hojas+='<div class="lb-hoja"><i></i><i></i></div>';
  return '<button class="lb-link lb-saltar" type="button" data-lb="saltar" hidden>Saltar</button>'
    +'<div class="lb-escena"><div class="lb-cam"><div class="lb-libro" role="button" tabindex="0" aria-label="Abrir el libro" data-lb="abrir">'
    +'<div class="lb-sombra"></div><div class="lb-contra"></div><div class="lb-bloque"></div>'
    +'<div class="lb-canto lb-canto-d"></div><div class="lb-canto lb-canto-a"></div>'+hojas
    +'<div class="lb-lomo"></div>'
    +'<div class="lb-tapa"><div class="lb-tapa-f"><i class="lb-esq a"></i><i class="lb-esq b"></i><i class="lb-esq c"></i><i class="lb-esq d"></i>'
    +ORN+'<h1 class="lb-tit"><small>el libro del</small><span class="lb-tit-g" data-t="Ahorro">Ahorro</span></h1><p class="lb-lema">Para que guardes algo, por más mínimo que sea</p></div>'
    +'<div class="lb-tapa-d"></div></div>'
    +'<div class="lb-broche"><b></b></div>'
    +'</div></div></div>'
    +'<p class="lb-toca">Tocá el libro para abrirlo</p>'
    +(nuevo?'<div class="lb-otros"><button class="lb-link" type="button" data-lb="importar">Ya tenía datos: importarlos</button><button class="lb-link" type="button" data-lb="ejemplo">Solo mirar, con datos de ejemplo</button></div>'
      +'<p class="lb-nota">Lo que escribas queda solo en este teléfono: no hay cuentas ni servidores.</p>'
      +'<div class="lb-imp" id="lb-imp" hidden role="dialog" aria-modal="true" aria-labelledby="lb-imp-t"><h2 id="lb-imp-t">Traer tus datos</h2><p class="lb-p">Elegí un archivo de respaldo exportado desde esta app, o pegá el texto que copiaste con <b>Copiar como texto</b>.</p><div id="lb-import"></div><div class="lb-acc"><button class="lb-btn" type="button" data-lb="imp-x">Volver al libro</button></div></div>'
      :'<div class="lb-otros"><button class="lb-link" type="button" data-lb="cerrar">Volver sin abrir</button></div>');
}

/* La apertura: el libro se levanta, se abre el broche, la tapa gira sobre la bisagra (rebota y asienta),
   pasan tres hojas en cascada y la cámara se acerca a la página derecha. */
var anims=[];
function animar(el,kf,o){var a=el.animate(kf,Object.assign({fill:'forwards'},o));anims.push(a);return a}
function abrirAnimado(mesa,listo){
  var L=mesa.querySelector('.lb-libro'),cam=mesa.querySelector('.lb-cam'),tapa=mesa.querySelector('.lb-tapa'),bro=mesa.querySelector('.lb-broche');
  var W=L.offsetWidth,D=2500,hecho=false;
  var saltar=mesa.querySelector('[data-lb="saltar"]');saltar.hidden=false;
  mesa.querySelectorAll('.lb-toca,.lb-otros,.lb-nota').forEach(function(x){x.style.animation='none';x.style.visibility='hidden'});
  function fin(){if(hecho)return;hecho=true;anims.forEach(function(a){try{a.finish()}catch(e){}});anims=[];listo()}
  var T0='rotateX(24deg) rotateY(-14deg) rotateZ(3deg)';
  animar(L,[
    {transform:T0+' translateZ(0)',offset:0},
    {transform:T0+' translateZ(34px)',offset:.14,easing:'cubic-bezier(.3,.7,.3,1)'},
    {transform:'rotateX(12deg) rotateY(0deg) rotateZ(0deg) translateZ(34px)',offset:.6,easing:'ease-in-out'},
    {transform:'rotateX(0deg) rotateY(0deg) rotateZ(0deg) translateZ(0)',offset:1}
  ],{duration:D});
  animar(bro,[{transform:'translateZ('+(T+1.5)+'px)',opacity:1},{transform:'translateZ('+(T+1.5)+'px) translateX(22px) rotateY(70deg)',opacity:0}],{duration:320,delay:300,easing:'cubic-bezier(.5,0,.7,.4)'});
  animar(tapa,[
    {transform:'translateZ('+T+'px) rotateY(0deg)',offset:0,easing:'cubic-bezier(.42,0,.36,1)'},
    {transform:'translateZ('+T+'px) rotateY(-186deg)',offset:.72,easing:'ease-out'},
    {transform:'translateZ('+T+'px) rotateY(-176deg)',offset:.88,easing:'ease-in-out'},
    {transform:'translateZ('+T+'px) rotateY(-180deg)',offset:1}
  ],{duration:1050,delay:520});
  mesa.querySelectorAll('.lb-hoja').forEach(function(h,i){
    var z=T-2.4+i*.6;
    animar(h,[{transform:'translateZ('+z+'px) rotateY(0deg)'},{transform:'translateZ('+(T+.5+i*.4)+'px) rotateY(-178deg)'}],{duration:620,delay:1080+i*150,easing:'cubic-bezier(.45,.05,.35,1)'});
  });
  animar(cam,[
    {transform:'translateX(0) scale(1)',offset:0},
    {transform:'translateX(0) scale(1)',offset:.2,easing:'ease-in-out'},
    {transform:'translateX('+W*.35+'px) scale(.7)',offset:.55,easing:'ease-in-out'},
    {transform:'translateX('+W*.35+'px) scale(.7)',offset:.74,easing:'cubic-bezier(.5,0,.3,1)'},
    {transform:'translateX(0) scale(2.6)',offset:1}
  ],{duration:D});
  var a=animar(mesa,[{opacity:1,offset:0},{opacity:1,offset:.86},{opacity:0,offset:1}],{duration:D});
  a.onfinish=fin;
  saltar.onclick=function(e){e.stopPropagation();fin()};
  mesa.addEventListener('pointerdown',function sk(e){if(e.target.closest('.lb-saltar'))return;mesa.removeEventListener('pointerdown',sk);fin()});
}

/* ---------- Páginas ---------- */
var o=null,st=null,D=null,idx=0,PAGS=[],vista=null;

function pagHTML(id){
  var n=PAGS.length,folio='<p class="lb-folio">— '+(idx+1)+' de '+n+' —</p>';
  var ciclo=o.modo==='ciclo',cab='<div class="lb-cab"><span class="lb-cap">'+(ciclo?'pacto nuevo':id==='pacto'||id==='actual'?'el pacto':'prólogo')+'</span>'
    +(o.modo==='releer'||ciclo?'<button class="lb-link" type="button" data-lb="cerrar-libro">'+(ciclo?'Ahora no':'Cerrar el libro')+'</button>':'')+'</div>';
  var h='',atras=idx>0?'<button class="lb-btn chico" type="button" data-lb="atras" aria-label="Página anterior">‹ Atrás</button>':'';
  if(id==='p1'){
    h='<h1 class="lb-h lb-tinta" id="lb-h">'+tinta('Este libro tiene un solo propósito')+'</h1>'
      +'<p class="lb-cita">que generes un ahorro, por más mínimo que sea.</p>'+ORLA
      +'<p class="lb-p lb-cap-ini">No es un libro para leer: es un libro para usar. Cada día te dice cuánto podés gastar sin tocar lo que guardás, y cuántos días faltan para volver a cobrar.</p>'
      +'<div class="lb-acc"><button class="lb-btn si" type="button" data-lb="sig">Pasar la página</button></div>';
  }else if(id==='p2'){
    h='<h1 class="lb-h lb-tinta" id="lb-h">'+tinta('Para armar tu plan necesito saber <em>tres</em> cosas')+'</h1>'
      +'<ol class="lb-tres"><li><span>1</span>Con cuánta plata empezás</li><li><span>2</span>Cuánto de eso querés ahorrar</li><li><span>3</span>Qué día volvés a cobrar</li></ol>'
      +'<p class="lb-p">Te lleva un minuto. Lo que escribas en este libro queda <b>solo en este teléfono</b>.</p>'
      +'<div class="lb-acc">'+atras+'<button class="lb-btn si" type="button" data-lb="sig">'+(o.modo==='releer'?'Pasar la página':'Empezar')+'</button></div>';
  }else if(id==='q1'){
    h='<h1 class="lb-h lb-tinta" id="lb-h">'+tinta('¿Con cuánta plata empezás el desafío?')+'</h1>'
      +'<p class="lb-p">'+(ciclo?'Te puse lo que te quedó del pacto anterior ('+money(o.sobra)+') más tu cobro '+(o.real?'':'estimado ')+'('+money(o.cobro)+'). Cambialo por lo que tengas de verdad.':'Todo lo que tenés hoy, en la cuenta y en efectivo.')+'</p>'
      +'<div class="lb-campo"><label for="lb-pesos">Tengo hoy</label><div class="lb-monto"><span>$</span><input id="lb-pesos" type="number" inputmode="decimal" min="0" step="any" placeholder="0" value="'+esc(D.pesos)+'"></div></div>'
      +'<label class="lb-check"><input type="checkbox" id="lb-conusd"'+(D.conUsd?' checked':'')+'> También tengo dólares</label>'
      +'<div class="lb-dos" id="lb-usd-box"'+(D.conUsd?'':' hidden')+'>'
      +'<div class="lb-campo"><label for="lb-usd">Dólares</label><div class="lb-monto chico"><span>US$</span><input id="lb-usd" type="number" inputmode="decimal" min="0" step="any" placeholder="0" value="'+esc(D.usd)+'"></div></div>'
      +'<div class="lb-campo"><label for="lb-cotiz">1 dólar son</label><div class="lb-monto chico"><span>$</span><input id="lb-cotiz" type="number" inputmode="decimal" min="0" step="any" placeholder="40,00" value="'+esc(D.cotiz)+'"></div></div></div>'
      +'<p class="lb-total" id="lb-total" aria-live="polite"></p>'
      +'<p class="lb-err" id="lb-err" role="alert" hidden></p>'
      +'<div class="lb-acc">'+atras+'<button class="lb-btn si" type="button" data-lb="sig">Seguir</button></div>';
  }else if(id==='q2'){
    var tot=total(),paso=pasoAhorro(tot),at=atajosPacto(tot);
    h='<h1 class="lb-h lb-tinta" id="lb-h">'+tinta('¿Cuánto de eso querés ahorrar?')+'</h1>'
      +'<p class="lb-p">Por más mínimo que sea. Empezás con <b>'+money(tot)+'</b>.</p>'
      +'<div class="lb-campo"><div class="lb-pct"><label for="lb-ahorro" class="lb-l">Quiero guardar</label><b id="lb-pct-n"></b></div>'
      +'<div class="lb-monto chico"><span>$</span><input id="lb-ahorro" type="number" inputmode="numeric" min="0" step="1" value="'+esc(D.ahorro)+'"></div></div>'
      +'<input class="lb-rango" id="lb-rango" type="range" min="0" max="'+Math.round(tot)+'" step="'+paso+'" value="'+Math.min(Math.round(num(D.ahorro)),Math.round(tot))+'" aria-label="Cuánto querés ahorrar">'
      +(at.length?'<div class="lb-chips" role="group" aria-label="Atajos">'+at.map(function(a){return '<button class="lb-chip" type="button" data-lb="atajo" data-val="'+a.monto+'">'+a.pct+' %</button>'}).join('')+'</div>':'')
      +'<p class="lb-queda" id="lb-queda" aria-live="polite"></p>'
      +'<div id="lb-avisos"></div>'
      +'<p class="lb-err" id="lb-err" role="alert" hidden></p>'
      +'<div class="lb-acc">'+atras+'<button class="lb-btn si" type="button" data-lb="sig">Seguir</button></div>';
  }else if(id==='q3'){
    var sg=sugerirCobro(st,today());
    h='<h1 class="lb-h lb-tinta" id="lb-h">'+tinta('¿Qué día volvés a cobrar?')+'</h1>'
      +'<p class="lb-p">'+(sg.perfil?'Según tu perfil, cobrás el <b>'+esc(fLarga(sg.fecha))+'</b>. Si esta vez es otro día, tocalo.'
        :'Te marqué el <b>5.º día hábil</b> del mes (contando solo los feriados no laborables). Si cobrás otro día, tocalo.')+'</p>'
      +'<div class="lb-cal" id="lb-cal"></div>'
      +'<p class="lb-queda" id="lb-cobro-txt" aria-live="polite"></p>'
      +'<p class="lb-err" id="lb-err" role="alert" hidden></p>'
      +'<div class="lb-acc">'+atras+'<button class="lb-btn si" type="button" data-lb="sig">Seguir</button></div>';
  }else if(id==='pacto'){
    var v=validarPacto(st,datos(),today()),c=v.cuenta,dias=diffDays(today(),D.cobro);
    h='<h1 class="lb-h lb-tinta" id="lb-h">'+tinta('El pacto')+'</h1>'
      +'<p class="lb-p">Estas son las reglas de tu desafío. Con esto armo tu plan, día por día, hasta que cobres.</p>'
      +'<ul class="lb-pacto">'
      +'<li><span>Empiezo con</span><b>'+money(c.total)+(D.conUsd&&num(D.usd)>0?'<small>incluye '+usd(num(D.usd))+' a '+money(num(D.cotiz))+'</small>':'')+'</b></li>'
      +'<li class="ah"><span>Guardo</span><b>'+money(c.ahorro)+'<small>el '+pctTxt(c.pct)+' del total</small></b></li>'
      +'<li><span>Cobro el</span><b>'+esc(fLarga(D.cobro))+'<small>dentro de '+dias+' '+(dias===1?'día':'días')+'</small></b></li>'
      +(c.fijos>0?'<li><span>Gastos fijos</span><b>− '+money(c.fijos)+'</b></li>':'')
      +'<li class="tot"><span>Para gastar</span><b>'+money(c.gastar)+'<small>≈ '+money(c.porDia)+' por día</small></b></li></ul>'
      +avisosHTML(v)
      +'<div class="lb-firma" id="lb-firma">'+SELLO+'<p class="lb-sellado" id="lb-sellado"></p></div>'
      +'<div class="lb-acc" id="lb-acc-pacto">'+atras+'<button class="lb-btn si" type="button" data-lb="sellar">Sellar el pacto</button></div>';
  }else if(id==='actual'){
    var p=st.plan,pc=cuentaPacto(st,{total:p.monto,ahorro:p.modo==='monto'?p.ahorro:Math.round(num(p.monto)*num(p.pct)/100),cobro:p.cobro},p.inicio);
    h='<h1 class="lb-h lb-tinta" id="lb-h">'+tinta('Tu pacto')+'</h1>'
      +'<p class="lb-p">'+(st.pacto&&st.pacto.sellado?'Lo sellaste el '+esc(fLarga(st.pacto.sellado))+'.':'Este es el plan que venís usando.')+'</p>'
      +'<ul class="lb-pacto"><li><span>Empezaste con</span><b>'+money(num(p.monto))+'</b></li>'
      +'<li class="ah"><span>Guardás</span><b>'+money(pc.ahorro)+'</b></li>'
      +'<li><span>Cobrás el</span><b>'+esc(fLarga(p.cobro))+'</b></li></ul>'
      +'<div class="lb-firma">'+SELLO.replace('class="lb-sello"','class="lb-sello puesto"')+'</div>'
      +'<p class="lb-p">Para cambiar estos datos, entrá a <b>Ajustes → Mis datos</b>.</p>'
      +'<div class="lb-acc">'+atras+'<button class="lb-btn si" type="button" data-lb="cerrar-libro">Cerrar el libro</button></div>';
  }
  return '<div class="lb-pag-in">'+cab+h+folio+'</div>';
}
function pctTxt(r){return (Math.round(r*1000)/10).toLocaleString('es-UY')+' %'}
function avisosHTML(v){
  var h='';
  if(v.avisos.indexOf('bajo')>=0)h+='<p class="lb-aviso">Te quedarían '+money(v.cuenta.porDia)+' por día. Es poco: si querés, bajá un poco el ahorro. Igual podés seguir.</p>';
  if(v.avisos.indexOf('cero')>=0)h+='<p class="lb-aviso suave">Con cero también se puede empezar, pero este libro existe para que guardes algo. ¿Y si probás con un poquito?</p>';
  return h;
}
function total(){return totalPacto(D.pesos,D.conUsd?D.usd:0,D.conUsd?D.cotiz:0)}
function datos(){return {total:total(),usd:D.conUsd?D.usd:0,cotiz:D.conUsd?D.cotiz:0,ahorro:D.ahorro,cobro:D.cobro}}
function error(m){var e=$('#lb-err');if(e){e.textContent=m||'';e.hidden=!m}}

/* Lo que se recalcula mientras escribís */
function vivoQ1(){
  var t=$('#lb-total');if(!t)return;
  t.innerHTML=D.conUsd&&num(D.usd)>0&&num(D.cotiz)>0?'En total empezás con <b>'+money(total())+'</b>':'';
}
function vivoQ2(desdeRango){
  var tot=total(),r=$('#lb-rango'),a=$('#lb-ahorro');if(!r)return;
  if(desdeRango){D.ahorro=r.value;a.value=r.value}else{r.value=String(Math.min(num(D.ahorro),tot))}
  r.style.setProperty('--v',(tot>0?Math.min(100,num(r.value)/tot*100):0)+'%');
  var c=cuentaPacto(st,datos(),today()),v=validarPacto(st,datos(),today());
  $('#lb-pct-n').textContent=pctTxt(c.pct);
  $('#lb-queda').innerHTML='Te quedan <b>'+money(c.gastar)+'</b> para gastar, <span class="n">≈ '+money(c.porDia)+' por día</span> hasta el '+esc(fLarga(c.cobro))+'.';
  $('#lb-avisos').innerHTML=v.errores.ahorro?'':avisosHTML(v);
  if(v.errores.ahorro)error(v.errores.ahorro==='fijos'?'Con tus gastos fijos, lo máximo que podés ahorrar es '+money(Math.floor(c.maxAhorro))+'.':v.errores.ahorro);else error('');
  document.querySelectorAll('[data-lb="atajo"]').forEach(function(b){b.setAttribute('aria-pressed',String(num(b.getAttribute('data-val'))===num(D.ahorro)))});
}
function pintarCal(){
  var box=$('#lb-cal');if(!box)return;
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
  var t=$('#lb-cobro-txt'),n=D.cobro?diffDays(today(),D.cobro):0;
  if(t)t.innerHTML=D.cobro&&n>0?'Cobrás el <b>'+esc(fLarga(D.cobro))+'</b>: <span class="n">faltan '+n+' '+(n===1?'día':'días')+'</span>.':'Tocá el día en que cobrás.';
}
function leer(){
  var g=function(id){var e=$('#'+id);return e?e.value:null};
  if(g('lb-pesos')!==null)D.pesos=g('lb-pesos');
  if(g('lb-usd')!==null)D.usd=g('lb-usd');
  if(g('lb-cotiz')!==null)D.cotiz=g('lb-cotiz');
  if(g('lb-ahorro')!==null)D.ahorro=g('lb-ahorro');
}
/* ¿Se puede pasar de esta página? */
function valida(id){
  var v=validarPacto(st,datos(),today());
  if(id==='q1'){
    if(D.conUsd&&num(D.usd)>0&&!(num(D.cotiz)>0)){error('Escribí a cuánto está el dólar.');return false}
    if(v.errores.total){error(v.errores.total);return false}
    if(D.ahorro===null||D.ahorro===''){var at=atajosPacto(total());D.ahorro=at.length?String(at[0].monto):'0'}
    if(num(D.ahorro)>total())D.ahorro=String(Math.floor(total()));
  }
  if(id==='q2'&&v.errores.ahorro){error(v.errores.ahorro==='fijos'?'Con tus gastos fijos, lo máximo que podés ahorrar es '+money(Math.floor(v.cuenta.maxAhorro))+'.':v.errores.ahorro);return false}
  if(id==='q3'&&v.errores.cobro){error(v.errores.cobro);return false}
  return true;
}

/* Pasar la hoja: la de ahora gira desde el lomo (≤22°) y se va; la nueva aparece detrás */
function irA(i,dir){
  var pila=$('#lb-pila'),vieja=pila.querySelector('.lb-pag'),nueva=document.createElement('section');
  idx=i;nueva.className='lb-pag';nueva.setAttribute('aria-labelledby','lb-h');
  if(vieja)vieja.querySelector('#lb-h')&&vieja.querySelector('#lb-h').removeAttribute('id');
  nueva.innerHTML=pagHTML(PAGS[idx]);
  pila.appendChild(nueva);
  montarPagina();
  if(vieja){
    vieja.style.zIndex='2';vieja.setAttribute('aria-hidden','true');
    var dur=quieto()?180:400;
    var sale=quieto()?[{opacity:1},{opacity:0}]:dir>0?[{transform:'rotateY(0)',opacity:1},{transform:'rotateY(-22deg) translateX(-4%)',opacity:0}]:[{transform:'translateX(0)',opacity:1},{transform:'translateX(6%)',opacity:0}];
    var entra=quieto()?[{opacity:0},{opacity:1}]:dir>0?[{transform:'translateX(2%) scale(.985)',opacity:.4},{transform:'none',opacity:1}]:[{transform:'rotateY(-22deg) translateX(-4%)',opacity:0},{transform:'none',opacity:1}];
    nueva.animate(entra,{duration:dur,easing:'cubic-bezier(.3,.6,.2,1)'});
    vieja.animate(sale,{duration:dur,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}).onfinish=function(){vieja.remove()};
  }
}
function montarPagina(){
  var id=PAGS[idx];
  if(id==='q1')vivoQ1();
  if(id==='q2')vivoQ2(false);
  if(id==='q3')pintarCal();
  /* El teclado se abre en el monto (en iOS solo si viene de un toque) */
  var f=document.querySelector('.lb-pag:last-child #lb-pesos');
  if(f&&!D.pesos)try{f.focus({preventScroll:true})}catch(e){}
}

/* El sello: se estampa con un leve temblor y unas pocas chispas */
function estampar(){
  var s=$('#lb-firma .lb-sello'),pag=$('#lb-pila .lb-pag:last-child'),firma=$('#lb-firma');
  s.classList.add('puesto');
  if(quieto()){s.animate([{opacity:0},{opacity:1}],{duration:250});return 250}
  s.animate([
    {opacity:0,transform:'scale(1.9) rotate(-20deg)',easing:'cubic-bezier(.55,0,.8,.3)'},
    {opacity:1,transform:'scale(.9) rotate(-8deg)',offset:.62,easing:'ease-out'},
    {opacity:1,transform:'scale(1.03) rotate(-8deg)',offset:.82},
    {opacity:1,transform:'scale(1) rotate(-8deg)'}
  ],{duration:520});
  pag.animate([{transform:'none'},{transform:'translate(1.5px,1px)'},{transform:'translate(-1.5px,-.5px)'},{transform:'translate(1px,0)'},{transform:'none'}],{duration:220,delay:320});
  for(var k=0;k<10;k++){
    var c=document.createElement('i');c.className='lb-chispa';firma.appendChild(c);
    var ang=k/10*Math.PI*2+Math.random()*.4,dist=70+Math.random()*40;
    c.animate([{opacity:0,transform:'translate(0,0) scale(.6)'},{opacity:1,transform:'translate('+Math.cos(ang)*dist*.5+'px,'+Math.sin(ang)*dist*.5+'px) scale(1)',offset:.3},{opacity:0,transform:'translate('+Math.cos(ang)*dist+'px,'+Math.sin(ang)*dist+'px) scale(.3)'}],{duration:640,delay:330,easing:'ease-out',fill:'forwards'}).onfinish=function(){this.effect.target.remove()};
  }
  return 600;
}

function cerrarTodo(){
  var h=$('#lb-hojas'),m=$('#libro');
  document.documentElement.classList.remove('voz-abierta','lb-abierto');
  var fin=function(){h.hidden=true;h.innerHTML='';m.hidden=true;m.innerHTML=''};
  if(!h.hidden&&!quieto())h.animate([{opacity:1},{opacity:0}],{duration:300,fill:'forwards'}).onfinish=fin;else fin();
}

function abrirHojas(){
  var h=$('#lb-hojas');
  h.innerHTML='<div class="lb-pila" id="lb-pila"></div>';h.hidden=false;
  idx=0;irA(0,1);
  h.animate([{opacity:0},{opacity:1}],{duration:quieto()?200:320});
  $('#libro').hidden=true;
}

/* opt: {modo:'nuevo'|'releer'|'ciclo', estado, listo(estado), alImportar(estado), alEjemplo(), alCerrar(), antes(estado)}
   'ciclo' (pacto nuevo al cobrar): sin portada ni prólogo, solo las 3 preguntas; total precargado (o.total = o.sobra + o.cobro)
   y o.antes(estado) se llama justo antes de sellar (cierra el ciclo anterior). */
export function abrirLibro(opt){
  o=opt;st=opt.estado;vista='portada';
  aplicarFeriados(st);
  var sg=sugerirCobro(st,today()),c=parse(sg.fecha);
  D={pesos:'',usd:'',cotiz:cotizacion(st)?String(cotizacion(st)):'',conUsd:false,ahorro:null,cobro:sg.fecha,mes:[c.getFullYear(),c.getMonth()]};
  PAGS=o.modo==='releer'?['p1','p2','actual']:o.modo==='ciclo'?['q1','q2','q3','pacto']:['p1','p2','q1','q2','q3','pacto'];
  var m=$('#libro');
  if(o.modo==='ciclo'){
    D.pesos=String(Math.round(num(o.total))||'');D.ahorro=String(Math.round(num(st.plan.ahorro))||'');
    document.documentElement.classList.add('voz-abierta','lb-abierto');vista='hojas';abrirHojas();return;
  }
  m.innerHTML=htmlPortada(!!o.alEjemplo);m.hidden=false;m.style.opacity='';
  document.documentElement.classList.add('voz-abierta','lb-abierto');
  if(o.alEjemplo)montarImportador($('#lb-import'),function(e){cerrarTodo();o.alImportar(e)},'Usar estos datos');
}

export function initLibro(){
  var m=$('#libro'),h=$('#lb-hojas');
  function abrir(){
    if(vista!=='portada')return;vista='abriendo';
    if(quieto()){m.animate([{opacity:1},{opacity:0}],{duration:250,fill:'forwards'}).onfinish=function(){vista='hojas';abrirHojas()};return}
    abrirAnimado(m,function(){vista='hojas';abrirHojas()});
  }
  m.addEventListener('click',function(e){
    var b=e.target.closest('[data-lb]');if(!b)return;
    var a=b.getAttribute('data-lb');
    if(a==='abrir')abrir();
    if(a==='importar'){$('#lb-imp').hidden=false}
    if(a==='imp-x'){$('#lb-imp').hidden=true}
    if(a==='ejemplo'){cerrarTodo();o.alEjemplo()}
    if(a==='cerrar'){cerrarTodo();if(o.alCerrar)o.alCerrar()}
  });
  m.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('lb-libro')){e.preventDefault();abrir()}});
  h.addEventListener('input',function(e){
    var id=e.target.id;leer();
    if(id==='lb-pesos'||id==='lb-usd'||id==='lb-cotiz'){error('');vivoQ1()}
    if(id==='lb-rango')vivoQ2(true);
    if(id==='lb-ahorro')vivoQ2(false);
  });
  h.addEventListener('change',function(e){
    if(e.target.id==='lb-conusd'){D.conUsd=e.target.checked;$('#lb-usd-box').hidden=!D.conUsd;vivoQ1();if(D.conUsd)try{$('#lb-usd').focus()}catch(x){}}
  });
  h.addEventListener('click',function(e){
    var b=e.target.closest('[data-lb]');if(!b||b.closest('[aria-hidden="true"]'))return;
    var a=b.getAttribute('data-lb');leer();
    if(a==='sig'){if(!valida(PAGS[idx]))return;if(idx<PAGS.length-1)irA(idx+1,1);return}
    if(a==='atras'){if(idx>0)irA(idx-1,-1);return}
    if(a==='atajo'){D.ahorro=b.getAttribute('data-val');$('#lb-ahorro').value=D.ahorro;vivoQ2(false);return}
    if(a==='mes'){var d=new Date(D.mes[0],D.mes[1]+Number(b.getAttribute('data-d')),1,12);D.mes=[d.getFullYear(),d.getMonth()];pintarCal();return}
    if(a==='dia'){D.cobro=b.getAttribute('data-f');error('');pintarCal();return}
    if(a==='cerrar-libro'){cerrarTodo();if(o.alCerrar)o.alCerrar();return}
    if(a==='sellar'){
      var v=validarPacto(st,datos(),today());
      if(v.ok&&o.antes)o.antes(st);
      if(v.ok)v=sellarPacto(st,datos(),today());
      if(!v.ok){var k=Object.keys(v.errores)[0];irA(PAGS.indexOf(k==='total'?'q1':k==='ahorro'?'q2':'q3'),-1);return}
      var t=estampar();
      $('#lb-acc-pacto').innerHTML='';
      setTimeout(function(){
        var s=$('#lb-sellado');s.textContent='Pacto sellado el '+fLarga(st.pacto.sellado)+'.';s.classList.add('ver');
        $('#lb-acc-pacto').innerHTML='<button class="lb-btn si" type="button" data-lb="empezar">Ir a la página de hoy</button>';
        try{$('#lb-acc-pacto button').focus({preventScroll:true})}catch(x){}
      },t);
      return;
    }
    if(a==='empezar'){if(o.modo==='nuevo')marcarTour();cerrarTodo();o.listo(st)}
  });
  /* Deslizar para pasar de página (no desde un campo ni desde el deslizador) */
  var x0=null,y0=0;
  h.addEventListener('pointerdown',function(e){x0=e.target.closest('input,textarea,.lb-cal,.lb-rango')?null:e.clientX;y0=e.clientY});
  h.addEventListener('pointerup',function(e){
    if(x0===null)return;var dx=e.clientX-x0,dy=e.clientY-y0;x0=null;
    if(Math.abs(dx)<70||Math.abs(dy)>Math.abs(dx)*.6)return;
    var pag=$('#lb-pila .lb-pag:last-child');if(!pag)return;
    var btn=pag.querySelector(dx<0?'[data-lb="sig"]':'[data-lb="atras"]');if(btn)btn.click();
  });
  /* En segundo plano, nada se mueve */
  document.addEventListener('visibilitychange',function(){document.documentElement.classList.toggle('lb-pausa',document.visibilityState==='hidden')});
}
