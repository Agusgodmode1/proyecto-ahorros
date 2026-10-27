/* Arranque, pestañas y render general. */
import {curWeek} from './logica/plan.js';
import {charNoPermitido,limpiarNumero} from './logica/util.js';
import {migrar,cargar,guardar,pedirPersistencia,defaults,ejemplo,necesitaMigrar,guardarCopia,resumenDatos,borrarTodo} from './estado.js';
import {ctx,$,today,planNow,ICON,discreto,setDiscreto,toast,toastAccion,money} from './ui/comun.js';
import {deshacerAjustePacto} from './logica/pacto.js';
import {sonar,sonidoOn,setSonido,volumen,setVolumen} from './ui/sonido.js';
import {renderCountdown,renderResumen,syncPlan,initPlan} from './ui/plan.js';
import {renderWeek,initSemanas} from './ui/semanas.js';
import {renderSueldo,syncSueldo,initSueldo} from './ui/sueldo.js';
import {renderGastos,syncGastos,initTarjeta,renderAvisoTarjeta,precargarTarjeta} from './ui/tarjeta.js';
import {renderFijos,initFijos} from './ui/fijos.js';
import {renderLogros,evalLogros,initLogros} from './ui/logros.js';
import {renderAjustes,renderAvisoRespaldo,initAjustes,renderCopias,exportar} from './ui/respaldo.js';
import {registrarSW} from './pwa.js';
import {initVoz} from './ui/voz.js';
import {abrirPerfil,initPerfil,resumenPerfil} from './ui/perfil.js';
import {abrirLibro,initLibro} from './ui/libro.js';
import {copiaVisible,girar,empezar,terminar as terminarPase} from './ui/pase.js';
import {introCapitulo,olvidarIntros} from './ui/intro.js';
import {initIndice} from './ui/indice.js';
import {initFlechas,actualizarFlechas} from './ui/flechas.js';
import {initNotas,agruparNotas} from './ui/notas.js';
import {renderGuardado,initGuardado} from './ui/guardado.js';
import {initPostal} from './ui/postal.js';
import {CAPITULOS,capituloDe,vecina,numeroDePagina,nombreDePagina} from './logica/capitulos.js';
import {DIAL,MESL,parse} from './logica/fechas.js';
import {initTour,iniciarTour,tourSiPendiente} from './ui/tour.js';
import {aplicarFeriados,renderFeriados,initFeriados} from './ui/feriados.js';
import {prepararGuardado,juntar} from './logica/sync.js';
import {aplicarRepetidos} from './logica/repetidos.js';
import {renderCategorias,initCategorias} from './ui/categorias.js';
import {renderRecibos,initRecibos} from './ui/recibos.js';
import {pinActivo,pedirPin,initPin,renderAjustesPin,initAjustesPin} from './ui/pin.js';

/* ---------- Guardado en IndexedDB ---------- */
var timer=null,saving=false,pending=false,borrando=false,guardado={donde:null,persistente:null};
/* Lo último guardado: contra eso se anota qué cambió y cuándo (para juntar datos de dos aparatos). */
var ultimo=null;
function fijarUltimo(){ultimo=JSON.parse(JSON.stringify(ctx.state))}
function setStatus(m){var el=$('#save-status');if(el)el.textContent=m}
function persist(){if(borrando)return;setStatus('Guardando…');clearTimeout(timer);timer=setTimeout(flush,450)}
async function flush(){
  clearTimeout(timer);timer=null;
  if(borrando)return;
  if(saving){pending=true;return}
  saving=true;
  try{
    var datos=prepararGuardado(ultimo,ctx.state,Date.now());
    var r=await guardar(datos);
    if(r)ultimo=datos;
    guardado.donde=r;
    setStatus(r?'Guardado en este dispositivo.':'No se pudo guardar. Exportá un respaldo para no perder los datos.');
  }finally{
    saving=false;
    if(pending){pending=false;flush()}
  }
}
/* Si la app pasa a segundo plano con cambios sin guardar, se guardan ya. */
function flushPendiente(){if(timer)flush()}

/* ---------- Pestañas ---------- */
/* Capítulos: la barra de abajo son los lomos (marcapáginas) del libro, con su número romano */
var TK='pa-tab';
function renderTabs(pc){
  var tab=ctx.tab,cw='w'+curWeek(pc,today()),h='',isW=/^w\d+$/.test(tab);
  CAPITULOS.forEach(function(c){
    var id=c.id==='semanas'?(isW?tab:cw):c.id;
    var sel=c.id==='semanas'?isW:tab===c.id;
    h+='<button class="tab lomo '+c.tono+'" role="tab" type="button" data-tab="'+id+'" aria-selected="'+sel+'" aria-label="Capítulo '+c.n+': '+c.t+'"><span class="lomo-n" aria-hidden="true">'+c.n+'</span><span class="lomo-t">'+(c.corto||c.t)+'</span></button>';
  });
  $('#tablist').innerHTML=h;
}
/* El encabezado de cada capítulo («capítulo II · semanas») */
var PANELES={resumen:'#p-resumen',fijos:'#p-fijos',sueldo:'#p-sueldo',gastos:'#p-gastos',logros:'#p-logros',guardado:'#p-guardado',ajustes:'#p-ajustes'};
function marcarCapitulos(){
  Object.keys(PANELES).concat(['semanas']).forEach(function(k){
    var el=$(k==='semanas'?'#p-semana':PANELES[k]),c=capituloDe(k);
    if(el)el.setAttribute('data-cap',c?'capítulo '+c.n+' · '+c.t.toLowerCase():'fuera de los capítulos');
  });
  var d=parse(today()),k=$('#cap-hoy');
  if(k)k.textContent='capítulo I · '+DIAL[d.getDay()]+' '+d.getDate()+' de '+MESL[d.getMonth()];
}
/* Pie de página: flecha a la página anterior, el folio y flecha a la siguiente (en las esquinas, donde llega el pulgar) */
function renderPie(pc){
  var el=$('#pie');if(!el)return;
  var n=pc.weeks.length,cw=curWeek(pc,today()),ant=vecina(ctx.tab,-1,n,cw),sig=vecina(ctx.tab,1,n,cw);
  el.innerHTML=(ant?'<button class="flecha ant" type="button" data-pie="'+ant+'" aria-label="Página anterior: '+nombreDePagina(ant)+'"><span aria-hidden="true">‹</span><small>'+nombreDePagina(ant)+'</small></button>':'<span class="flecha-v"></span>')
    +'<span class="folio">— '+(numeroDePagina(ctx.tab,n)||'')+' —</span>'
    +(sig?'<button class="flecha sig" type="button" data-pie="'+sig+'" aria-label="Página siguiente: '+nombreDePagina(sig)+'"><small>'+nombreDePagina(sig)+'</small><span aria-hidden="true">›</span></button>':'<span class="flecha-v"></span>');
}
function showPanels(){
  var tab=ctx.tab;marcarCapitulos();
  /* la vista va en la hoja (y no en <html>): así la copia que gira al pasar de página conserva la suya */
  /* (2.15) solo en la hoja: cambiarlo en <html> obligaba a recalcular los estilos de todo el documento */
  var vista=tab==='resumen'?'plan':'otra';hojaEl().setAttribute('data-vista',vista);
  $('#p-resumen').hidden=tab!=='resumen';
  $('#p-semana').hidden=!/^w\d+$/.test(tab);
  $('#p-sueldo').hidden=tab!=='sueldo';
  $('#p-gastos').hidden=tab!=='gastos';
  $('#p-fijos').hidden=tab!=='fijos';
  $('#p-logros').hidden=tab!=='logros';
  $('#p-guardado').hidden=tab!=='guardado';
  $('#p-ajustes').hidden=tab!=='ajustes';
}

/* ---------- Render general ---------- */
function renderAll(){
  var pc=planNow();
  if(/^w\d+$/.test(ctx.tab)&&Number(ctx.tab.slice(1))>=pc.weeks.length)ctx.tab='resumen';
  try{localStorage.setItem(TK,ctx.tab)}catch(e){}
  evalLogros(pc);
  var n=ctx.state.perfil.nombre;$('#saludo').textContent=n?'Hola, '+n:'Hola';
  /* Con el perfil hecho, la explicación del encabezado ya no hace falta y deja lugar a lo importante */
  var hs=document.querySelector('.hero-sub');if(hs)hs.hidden=!!ctx.state.perfil.hecho;
  var st=ctx.state;document.documentElement.classList.toggle('en-uso',!st.ejemplo&&!!st.perfil.hecho&&(st.gastos.length+st.horas.length+st.hist.length)>3);
  renderCountdown();renderTabs(pc);showPanels();renderAvisoRespaldo();renderResumen(pc);
  /* (2.15) cada capítulo se dibuja solo cuando se ve (pasar de página no rehace los que están ocultos) */
  if(ctx.tab==='resumen'){renderAvisoTarjeta();agruparNotas()}
  if(/^w\d+$/.test(ctx.tab))renderWeek(pc);
  if(ctx.tab==='sueldo'){renderSueldo();renderRecibos()}
  if(ctx.tab==='gastos'){renderGastos();renderCategorias()}
  if(ctx.tab==='fijos')renderFijos(pc);
  if(ctx.tab==='logros')renderLogros(pc);
  if(ctx.tab==='guardado')renderGuardado();
  renderPie(pc);actualizarFlechas();
  /* la introducción del capítulo: completa la primera vez, después en una línea */
  var capA=capituloDe(ctx.tab);if(capA&&capA.id!=="resumen")introCapitulo($(capA.id==="semanas"?"#p-semana":PANELES[capA.id]),capA.id);else if(ctx.tab==='ajustes')introCapitulo($('#p-ajustes'),'ajustes');
  if(ctx.tab==='ajustes'){renderAjustes(guardado);renderFeriados();renderAjustesPin();marcarSonido();
    document.querySelectorAll('[data-sobrante]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-sobrante')===(ctx.state.plan.sobrante||'siguiente')))});renderCopias();$('#aj-perfil').innerHTML=resumenPerfil(ctx.state)}
  tourSiPendiente();
}
/* Orden de las páginas, para saber si pasar la hoja hacia adelante o hacia atrás */
function orden(t){
  if(/^w\d+$/.test(t))return 1+Number(t.slice(1))/100;
  var i=['resumen','semanas','fijos','sueldo','gastos','logros','guardado','ajustes'].indexOf(t);return i<0?9:i;
}
function quieto(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
/* Pasar la hoja (2.9, ui/pase.js): la página nueva ya queda debajo y encima gira una copia liviana de la que se va.
   En pantallas de doble página (≥ 1100 px) gira la mitad derecha sobre el pliegue: su dorso es la página que viene.
   Con «reducir movimiento», un fundido corto, sin giro. */
function hojaEl(){return document.getElementById('hoja')}
function cajaPagina(){
  var r=$('#app').getBoundingClientRect(),top=Math.max(0,r.top),bot=Math.min(window.innerHeight,r.bottom);
  return {left:r.left,top:top,width:r.width,height:Math.max(1,bot-top)};
}
/* La foto de la hoja (lo que se ve dentro de «caja»), lista para ponerla en una cara */
function fotoHoja(caja){
  var h=hojaEl(),hr=h.getBoundingClientRect(),box=document.createElement('div');box.className='giro-pag';
  var c=copiaVisible(h,caja.top,caja.top+caja.height);
  c.style.cssText='position:absolute;margin:0;left:'+(hr.left-caja.left)+'px;top:'+(hr.top-caja.top)+'px;width:'+hr.width+'px';
  box.appendChild(c);return box;
}
function mitades(c){var w=c.width/2;return {izq:{left:c.left,top:c.top,width:w,height:c.height},der:{left:c.left+w,top:c.top,width:w,height:c.height}}}
/* Saca las fotos, llama a cambiar() (que dibuja la página nueva) y devuelve cómo armar la hoja que gira */
function prepararHoja(dir,cambiar,blancas){
  var c0=cajaPagina(),o={padre:$('#app'),papel:'giro-papel',z:4,sentido:dir,blancas:blancas||0};
  if(window.innerWidth<1100){
    if(dir>0){o.frente=fotoHoja(c0);cambiar();o.caja=c0}
    else{var bajo=fotoHoja(c0);cambiar();o.caja=cajaPagina();o.frente=fotoHoja(o.caja);o.bajos=[{caja:c0,nodo:bajo}]}
  }else{
    var m0=mitades(c0);
    if(dir>0){o.frente=fotoHoja(m0.der);var izqVieja=fotoHoja(m0.izq);cambiar();o.dorso=fotoHoja(mitades(cajaPagina()).izq);o.caja=m0.der;o.bajos=[{caja:m0.izq,nodo:izqVieja}]}
    else{var derVieja=fotoHoja(m0.der);o.dorso=fotoHoja(m0.izq);cambiar();var m1=mitades(cajaPagina());o.frente=fotoHoja(m1.der);o.caja=m1.der;o.bajos=[{caja:m0.der,nodo:derVieja}]}
    o.zona=c0;
  }
  return o;
}
function pasarA(t,dir,blancas){
  var cambiar=function(){
    ctx.tab=t;renderAll();
    var m=document.querySelector('main');if(m&&m.getBoundingClientRect().top<0){try{window.scrollTo(0,0)}catch(e){}}
  };
  var h=hojaEl();
  if(quieto()||!h.animate){terminarPase();cambiar();sonar('hoja');if(h.animate)h.animate([{opacity:.3},{opacity:1}],{duration:200});return}
  terminarPase();
  girar(prepararHoja(dir,cambiar,blancas));
}
function go(t,opt){
  if(t==='prologo'){abrirPrologo('pacto',null,-1);return}
  if(t==='semanas')t='w'+curWeek(planNow(),today());
  var antes=ctx.tab,dir=orden(t)>=orden(antes)?1:-1;
  if(antes===t){terminarPase();renderAll();return}
  /* desde el índice, si el salto es lejos, pasan varias hojas en abanico (el mismo giro, ≤ 700 ms) */
  var lejos=opt&&opt.abanico&&Math.abs(Math.floor(orden(t))-Math.floor(orden(antes)))>1;
  pasarA(t,dir,lejos?3:0);
}
/* El prólogo con tus datos (modo hojear): se llega deslizando hacia atrás desde Hoy, desde el índice o desde «Tenés» y «Guardás» */
function abrirPrologo(pagina,editar,dir){
  abrirLibro({modo:'hojear',estado:ctx.state,pagina:pagina,editar:editar,dir:dir||1,
    alGuardar:function(v){
      persist();syncInputs();renderAll();
      toastAccion('Listo: ≈ '+money(v.porDia)+' por día hasta que cobres','Deshacer',function(){deshacerAjustePacto(ctx.state,v.deshacer);persist();syncInputs();renderAll()});
    },
    alApartado:function(){persist();syncInputs();renderAll()},
    alCerrar:function(){if(ctx.tab!=='resumen'){ctx.tab='resumen';renderAll()}},
    /* desde la primera página del prólogo, hacia atrás: la tapa cerrada (al tocarla se abre en Hoy) */
    alTapa:function(){cerrarLibro()}});
}
/* «Cerrar el libro»: la tapa se cierra; al tocarla se abre de nuevo en Hoy */
function cerrarLibro(){
  abrirLibro({modo:'tapa',estado:ctx.state,listo:function(){ctx.tab='resumen';renderAll();window.scrollTo(0,0);entrada()}});
}
/* Al abrir: una transición corta (< 600 ms) hasta la página del día */
function entrada(){
  if(quieto()||!$('#app').animate)return;
  $('#app').animate([{opacity:0},{opacity:1}],{duration:320});
  hojaEl().animate([{transform:'perspective(1600px) rotateY(-8deg) scale(.985)',opacity:.4},{transform:'none',opacity:1}],{duration:480,easing:'cubic-bezier(.22,.7,.25,1)'});
}
/* Deslizar a los costados pasa la hoja: la hoja sigue al dedo (con su curva y su sombra) y debajo ya está la página que viene.
   Al soltar manda la velocidad: un gesto rápido la pasa aunque hayas recorrido poco; si no llegó (~28 %), vuelve.
   En los bordes del libro resiste. Desde campos, listas que se deslizan u hojas abiertas no se activa. */
function initDeslizar(){
  var x0=null,y0=0,modo=null,dx=0,W=1,dest=null,h=null,arr=null,antes=null,scroll0=0,muestras=[];
  var NO='input,textarea,select,.guia-grid,.frec-b,.wkpick,.days,.tablist,.sugs,.seg,.lb-rango,[data-nodeslizar]';
  function bloqueado(){var c=document.documentElement.classList;return c.contains('voz-abierta')||c.contains('hoja')}
  /* sin página al lado (o hacia el prólogo): la hoja de verdad apenas gira y vuelve */
  function resistir(p){
    var ang=p<0?p*22:p*10,tx=p<0?p*W*.08:p*W*.4;
    h.style.transform='perspective(1600px) translateX('+tx.toFixed(1)+'px) rotate3d(-.16,1,0,'+ang.toFixed(2)+'deg)';
  }
  function limpiar(){if(!h)return;h.style.transform='';h.classList.remove('hojeando')}
  function irSinGiro(t){
    ctx.tab=t;renderAll();
    var m=document.querySelector('main');if(m&&m.getBoundingClientRect().top<0){try{window.scrollTo(0,0)}catch(e){}}
  }
  document.addEventListener('pointerdown',function(e){
    var enPase=e.target.closest('.giro');if(enPase)terminarPase();
    var enHoja=e.target.closest('#hoja')||enPase;
    x0=(!ctx.state||!enHoja||e.target.closest(NO)||e.pointerType==='mouse'||bloqueado())?null:e.clientX;
    y0=e.clientY;modo=null;dx=0;muestras=[];
  },{passive:true});
  document.addEventListener('pointermove',function(e){
    if(x0===null)return;
    dx=e.clientX-x0;var dy=e.clientY-y0;
    muestras.push({x:e.clientX,t:performance.now()});if(muestras.length>8)muestras.shift();
    if(!modo){
      if(Math.abs(dx)<10&&Math.abs(dy)<10)return;
      if(Math.abs(dy)>Math.abs(dx)*.8){x0=null;return}
      h=hojaEl();W=Math.min(h.offsetWidth||1,window.innerWidth);
      var pc=planNow();dest=vecina(ctx.tab,dx<0?1:-1,pc.weeks.length,curWeek(pc,today()));
      if(dest&&dest!=='prologo'&&!quieto()){
        antes=ctx.tab;scroll0=window.scrollY;
        var o=prepararHoja(dx<0?1:-1,function(){irSinGiro(dest)});
        o.volver=function(){irSinGiro(antes);try{window.scrollTo(0,scroll0)}catch(x){}};
        if(window.innerWidth>=1100)W=o.caja.width;
        arr=empezar(o);modo='hoja';
      }else{modo='borde';h.classList.add('hojeando')}
    }
    if(modo==='hoja')arr.mover(dx);
    else if(!quieto()){var p=Math.max(-1,Math.min(1,dx/W));if(!dest)p*=.18;resistir(p)}
  },{passive:true});
  function velocidad(){
    var n=muestras.length;if(n<2||performance.now()-muestras[n-1].t>80)return 0; /* si te quedaste quieto antes de soltar, es lento */
    var a=muestras[0],b=muestras[n-1];for(var i=0;i<n;i++)if(b.t-muestras[i].t<=100){a=muestras[i];break}
    return (b.x-a.x)/Math.max(1,b.t-a.t);
  }
  function soltar(cancelado){
    if(x0===null)return;x0=null;
    var v=cancelado?0:velocidad(),hacia=dx<0?-1:1;
    var pasa=!cancelado&&!!dest&&(Math.abs(dx)>W*.28||Math.abs(v)>.35&&v*hacia>0&&Math.abs(dx)>24);
    if(modo==='hoja'){arr.soltar(pasa,v);arr=null;return}
    if(modo!=='borde')return;
    var desde=h.style.transform||'none';
    if(pasa){limpiar();go(dest);return}
    if(!quieto())h.animate([{transform:desde},{transform:'none'}],{duration:240,easing:'cubic-bezier(.3,.7,.3,1)'});
    limpiar();
  }
  document.addEventListener('pointerup',function(){soltar(false)},{passive:true});
  document.addEventListener('pointercancel',function(){soltar(true)},{passive:true});
}
function syncInputs(){syncPlan();syncSueldo();syncGastos()}
/* (2.16) Los gastos que se repiten solos: se anotan los que tocaron hasta hoy (al abrir y al volver a la app) */
function repetirSolos(){
  if(!ctx.state)return;
  var n=aplicarRepetidos(ctx.state,today());if(!n.length)return;
  persist();
  if(ctx.booted)toast(n.length===1?'Se anotó solo: '+(n[0].nota||'un gasto que se repite')+' '+money(n[0].monto):'Se anotaron solos '+n.length+' gastos que se repiten')
}

/* Reemplaza todos los datos (importar un respaldo, volver a una copia, borrar el ejemplo).
   Antes guarda una copia de lo que había, para poder volver atrás. */
async function reemplazar(st,motivo){
  if(ctx.state)await guardarCopia(JSON.parse(JSON.stringify(ctx.state)),motivo||'antes de reemplazar tus datos');
  if(!st.meta.creado)st.meta.creado=today();
  ctx.state=st;ctx.tab='resumen';aplicarFeriados();fijarUltimo();
  syncInputs();renderAll();precargarTarjeta();flush();
  window.scrollTo(0,0);
}

/* Junta los datos de un archivo de otro aparato con los de este, sin perder nada de ninguno. */
async function juntarDatos(delArchivo){
  /* Primero se anota lo último que cambiaste acá, para que compita con su fecha real */
  if(ultimo)prepararGuardado(ultimo,ctx.state,Date.now());
  var r=juntar(ctx.state,delArchivo);
  if(!r.cambio){toast('Ya tenías todo lo de ese archivo');return}
  await reemplazar(r.estado,'antes de juntar con otro aparato');
  toast(r.cambioDatos?'Listo: juntaste los datos. Ahora tenés '+resumenDatos(r.estado)+'.':'Ya tenías todo lo de ese archivo');
}

/* ---------- Guía ---------- */
var GK='pa-guia-oculta';
/* (La guía «Cómo usar esta página» se reemplazó por el índice del libro; quedan los íconos con data-icon) */
function guiaInit(){
  document.querySelectorAll('[data-icon]').forEach(function(el){el.innerHTML=ICON[el.getAttribute('data-icon')]||''});
}

/* Campos de números: no dejar escribir «e», «+» ni «-» (el navegador los acepta por la notación científica).
   Va al cargar el módulo (no en initGlobal) para que también cuide el prólogo, que se abre antes del arranque. */
(function guardarNumeros(){
  function negOk(el){var m=el.getAttribute('min');return !(m!==null&&Number(m)>=0)}
  function esNum(el){return el&&el.tagName==='INPUT'&&el.type==='number'}
  document.addEventListener('keydown',function(e){if(esNum(e.target)&&e.key&&e.key.length===1&&!e.ctrlKey&&!e.metaKey&&charNoPermitido(e.key,negOk(e.target)))e.preventDefault()},true);
  document.addEventListener('beforeinput',function(e){if(esNum(e.target)&&e.data&&charNoPermitido(e.data,negOk(e.target)))e.preventDefault()},true);
  document.addEventListener('paste',function(e){
    if(!esNum(e.target))return;var t=(e.clipboardData||window.clipboardData);t=t&&t.getData('text');
    if(t&&limpiarNumero(t,negOk(e.target))!==t.trim()){e.preventDefault();e.target.value=limpiarNumero(t,negOk(e.target));e.target.dispatchEvent(new Event('input',{bubbles:true}))}
  },true);
})();

/* ---------- Eventos globales ---------- */
function initGlobal(){
  $('#tablist').addEventListener('click',function(e){var b=e.target.closest('[data-tab]');if(b)go(b.getAttribute('data-tab'))});
  $('#tablist').addEventListener('keydown',function(e){
    if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
    var tabs=Array.prototype.slice.call(document.querySelectorAll('.tab')),i=tabs.indexOf(document.activeElement);
    if(i<0)return;
    var n=tabs[(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];
    go(n.getAttribute('data-tab'));
    var nn=document.querySelector('.tab[aria-selected="true"]');if(nn)nn.focus();
    e.preventDefault();
  });
  document.addEventListener('click',function(e){
    var g=e.target.closest('[data-goto]');if(g)go(g.getAttribute('data-goto'));
    /* Mi perfil, en el paso que corresponda */
    var pf=e.target.closest('[data-perfil]');
    if(pf)abrirPerfil(Number(pf.getAttribute('data-perfil'))||1,{nuevo:false,estado:ctx.state,alTerminar:function(){syncInputs();persist();renderAll()}});
    /* Mis datos (plata de hoy, meta y fijos) y el tour, desde Ajustes */
    if(e.target.closest('#aj-tour')){olvidarIntros();iniciarTour()}
    if(e.target.closest('#aj-prologo'))abrirPrologo('p1');
    var pie=e.target.closest('[data-pie]');if(pie)go(pie.getAttribute('data-pie'));
    /* (2.15) el índice de Ajustes: va a cada sección */
    var aji=e.target.closest('[data-ajir]');
    if(aji){var dst=document.getElementById(aji.getAttribute('data-ajir'));if(dst){var yy=dst.getBoundingClientRect().top+window.scrollY-70;try{window.scrollTo({top:yy,behavior:'smooth'})}catch(x){window.scrollTo(0,yy)}}return}
    /* Empezar de cero (Ajustes): primero pregunta y ofrece bajar un respaldo; después borra todo y vuelve a la tapa */
    if(e.target.closest('#cero-1')){$('#cero-conf').hidden=false;$('#cero-1-box').hidden=true;try{$('#cero-resp').focus()}catch(x){}return}
    if(e.target.closest('#cero-no')){$('#cero-conf').hidden=true;$('#cero-1-box').hidden=false;return}
    if(e.target.closest('#cero-resp')){exportar();return}
    if(e.target.closest('#cero-si')){
      borrando=true;clearTimeout(timer);timer=null;
      var bs=e.target.closest('#cero-si');bs.disabled=true;bs.textContent='Borrando…';
      borrarTodo(['pa-tema','pa-sonido','pa-volumen']).then(function(){location.reload()});
      return;
    }
    /* Borrar los datos de ejemplo y crear el perfil (dos toques) */
    var c=e.target.closest('[data-cero]');
    if(c){
      if(c.getAttribute('data-armed')!=='1'){c.setAttribute('data-armed','1');c.textContent='¿Seguro? Se borra todo lo de ejemplo';return}
      var meta=ctx.state.meta,nuevo=defaults();nuevo.meta=meta;
      /* Perfil nuevo: el libro arranca de cero, con el prólogo y el pacto */
      abrirLibro({modo:'nuevo',estado:nuevo,listo:function(st){reemplazar(st,'antes de borrar los datos de ejemplo')},alCerrar:function(){renderAll()}});
    }
  });
  /* el volumen: se escucha la hoja al soltar el control */
  document.addEventListener('input',function(e){if(e.target.id==='aj-volumen'){setVolumen(Number(e.target.value)/100);e.target.style.setProperty('--v',e.target.value+'%')}});
  document.addEventListener('change',function(e){if(e.target.id==='aj-volumen')sonar('hoja',{dur:.45,fuerza:.55})});
  document.addEventListener('click',function(e){var so=e.target.closest('[data-sonido]');if(so){setSonido(so.getAttribute('data-sonido')==='1');marcarSonido();sonar('hoja');toast(sonidoOn()?'Sonido prendido':'Sin sonido')}});
  document.addEventListener('click',function(e){var d=e.target.closest('[data-discreto]');if(d){setDiscreto(d.getAttribute('data-discreto')==='1');marcarDiscreto();renderAll()}});
  /* Modo discreto: un toque tapa o muestra todos los montos */
  $('#discreto').addEventListener('click',function(){setDiscreto(!discreto.on);marcarDiscreto();renderAll();toast(discreto.on?'Montos ocultos':'Montos visibles')});
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='hidden')flushPendiente();
    else if(ctx.state){repetirSolos();renderAll()} /* al volver otro día, se actualizan "hoy", la cuenta regresiva y lo que se repite */
  });
  window.addEventListener('pagehide',flushPendiente);
}

function marcarSonido(){
  document.querySelectorAll('[data-sonido]').forEach(function(b){b.setAttribute('aria-pressed',String((b.getAttribute('data-sonido')==='1')===sonidoOn()))});
  var v=$('#aj-volumen');if(v){v.value=String(Math.round(volumen()*100));v.style.setProperty('--v',v.value+'%');$('#aj-vol-box').hidden=!sonidoOn()}
}
function marcarDiscreto(){
  var b=$('#discreto');b.setAttribute('aria-pressed',String(discreto.on));b.setAttribute('aria-label',discreto.on?'Mostrar los montos':'Ocultar los montos');
  document.documentElement.classList.toggle('discreto',discreto.on);
  document.querySelectorAll('[data-discreto]').forEach(function(x){x.setAttribute('aria-pressed',String((x.getAttribute('data-discreto')==='1')===discreto.on))});
}
/* ---------- Arranque ---------- */
function arrancar(st){
  ctx.state=st;aplicarFeriados();fijarUltimo();
  if(!st.meta.creado){st.meta.creado=today();persist()}
  var rs=aplicarRepetidos(st,today());if(rs.length)persist();
  try{var t=localStorage.getItem(TK);if(t)ctx.tab=t}catch(e){}
  initNotas();
  guiaInit();initGlobal();initPlan();initSemanas();initSueldo();initTarjeta();initFijos();initLogros();initAjustes(reemplazar,juntarDatos);initGuardado();initVoz();initFeriados();initCategorias();initRecibos();initAjustesPin();initPostal();
  marcarDiscreto();
  ctx.booted=true;
  $('#app').hidden=false;
  syncInputs();renderAll();precargarTarjeta();
  if(rs.length)setTimeout(function(){toast(rs.length===1?'Se anotó solo: '+(rs[0].nota||'un gasto que se repite')+' '+money(rs[0].monto):'Se anotaron solos '+rs.length+' gastos que se repiten')},900);
  /* Al abrir: una transición corta (< 600 ms) hasta la página del día */
  /* (en #app solo opacidad: la barra y el micrófono son fijos y no pueden moverse con la hoja) */
  entrada();
}
ctx.persist=persist;ctx.renderAll=renderAll;ctx.go=go;ctx.syncInputs=syncInputs;ctx.abrirPrologo=abrirPrologo;ctx.cerrarLibro=cerrarLibro;

(async function boot(){
  initPerfil();initTour();initPin();initLibro();initIndice();initDeslizar();
  initFlechas({ir:function(d){go(d)},capitulos:function(){
    if(!ctx.state)return {};
    var pc=planNow(),n=pc.weeks.length,cw=curWeek(pc,today()),a=vecina(ctx.tab,-1,n,cw),s=vecina(ctx.tab,1,n,cw);
    return {ant:a,sig:s,antNom:a==='prologo'?'el pacto':a&&nombreDePagina(a),sigNom:s&&nombreDePagina(s)};
  }});
  registrarSW(function(){return ctx.state?flush():null});
  pedirPersistencia().then(function(p){guardado.persistente=p});
  var d=await cargar();
  /* Antes de pasar los datos a la forma nueva, se guarda una copia tal cual estaban */
  if(necesitaMigrar(d))await guardarCopia(d,'antes de actualizar la app');
  /* Con PIN, primero el PIN: los datos no se muestran hasta ponerlo bien */
  if(d&&pinActivo())await pedirPin();
  /* Ya migrados, se guardan enseguida: así la copia «antes de actualizar» se hace una sola vez */
  if(d){var mig=necesitaMigrar(d);arrancar(migrar(d));if(mig)flush();setStatus('Se guarda en este dispositivo.');return}
  /* Primera vez: el libro cerrado. Al abrirlo, el prólogo y las tres preguntas del pacto. */
  function listo(st){arrancar(st);flush()}
  abrirLibro({modo:'nuevo',estado:defaults(),listo:listo,alImportar:listo,alEjemplo:function(){listo(ejemplo())}});
})();
