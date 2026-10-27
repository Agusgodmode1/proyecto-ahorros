/* Arranque, pestañas y render general. */
import {curWeek} from './logica/plan.js';
import {migrar,cargar,guardar,pedirPersistencia,defaults,ejemplo,necesitaMigrar,guardarCopia,resumenDatos} from './estado.js';
import {ctx,$,today,planNow,ICON,discreto,setDiscreto,toast} from './ui/comun.js';
import {renderCountdown,renderResumen,syncPlan,initPlan} from './ui/plan.js';
import {renderWeek,initSemanas} from './ui/semanas.js';
import {renderSueldo,syncSueldo,initSueldo} from './ui/sueldo.js';
import {renderGastos,syncGastos,initTarjeta} from './ui/tarjeta.js';
import {renderFijos,initFijos} from './ui/fijos.js';
import {renderLogros,evalLogros,initLogros} from './ui/logros.js';
import {renderAjustes,renderAvisoRespaldo,initAjustes,renderCopias} from './ui/respaldo.js';
import {registrarSW} from './pwa.js';
import {initVoz} from './ui/voz.js';
import {abrirPerfil,initPerfil,resumenPerfil} from './ui/perfil.js';
import {abrirInicio,initInicio} from './ui/inicio.js';
import {abrirLibro,initLibro} from './ui/libro.js';
import {initIndice,renderPacto} from './ui/indice.js';
import {CAPITULOS,capituloDe,vecina} from './logica/capitulos.js';
import {DIAL,MESL,parse} from './logica/fechas.js';
import {initTour,iniciarTour,tourSiPendiente} from './ui/tour.js';
import {aplicarFeriados,renderFeriados,initFeriados} from './ui/feriados.js';
import {prepararGuardado,juntar} from './logica/sync.js';
import {renderCategorias,initCategorias} from './ui/categorias.js';
import {renderRecibos,initRecibos} from './ui/recibos.js';
import {pinActivo,pedirPin,initPin,renderAjustesPin,initAjustesPin} from './ui/pin.js';

/* ---------- Guardado en IndexedDB ---------- */
var timer=null,saving=false,pending=false,guardado={donde:null,persistente:null};
/* Lo último guardado: contra eso se anota qué cambió y cuándo (para juntar datos de dos aparatos). */
var ultimo=null;
function fijarUltimo(){ultimo=JSON.parse(JSON.stringify(ctx.state))}
function setStatus(m){var el=$('#save-status');if(el)el.textContent=m}
function persist(){setStatus('Guardando…');clearTimeout(timer);timer=setTimeout(flush,450)}
async function flush(){
  clearTimeout(timer);timer=null;
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
    h+='<button class="tab lomo '+c.tono+'" role="tab" type="button" data-tab="'+id+'" aria-selected="'+sel+'" aria-label="Capítulo '+c.n+': '+c.t+'"><span class="lomo-n" aria-hidden="true">'+c.n+'</span><span class="lomo-t">'+c.t+'</span></button>';
  });
  $('#tablist').innerHTML=h;
}
/* El encabezado de cada capítulo («capítulo II · semanas») */
var PANELES={resumen:'#p-resumen',fijos:'#p-fijos',sueldo:'#p-sueldo',gastos:'#p-gastos',logros:'#p-logros',ajustes:'#p-ajustes'};
function marcarCapitulos(){
  Object.keys(PANELES).concat(['semanas']).forEach(function(k){
    var el=$(k==='semanas'?'#p-semana':PANELES[k]),c=capituloDe(k);
    if(el)el.setAttribute('data-cap',c?'capítulo '+c.n+' · '+c.t.toLowerCase():'fuera de los capítulos');
  });
  var d=parse(today()),k=$('#cap-hoy');
  if(k)k.textContent='capítulo I · '+DIAL[d.getDay()]+' '+d.getDate()+' de '+MESL[d.getMonth()];
}
function showPanels(){
  var tab=ctx.tab;marcarCapitulos();
  document.documentElement.setAttribute('data-vista',tab==='resumen'?'plan':'otra');
  $('#p-resumen').hidden=tab!=='resumen';
  $('#p-semana').hidden=!/^w\d+$/.test(tab);
  $('#p-sueldo').hidden=tab!=='sueldo';
  $('#p-gastos').hidden=tab!=='gastos';
  $('#p-fijos').hidden=tab!=='fijos';
  $('#p-logros').hidden=tab!=='logros';
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
  renderCountdown();renderTabs(pc);showPanels();renderAvisoRespaldo();renderResumen(pc);renderWeek(pc);renderSueldo();
  if(ctx.tab==='sueldo')renderRecibos();
  if(ctx.tab==='gastos')renderGastos();
  if(ctx.tab==='fijos')renderFijos(pc);
  if(ctx.tab==='logros')renderLogros(pc);
  if(ctx.tab==='ajustes'){renderPacto();renderAjustes(guardado);renderFeriados();renderCategorias();renderAjustesPin();
    document.querySelectorAll('[data-sobrante]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-sobrante')===(ctx.state.plan.sobrante||'siguiente')))});renderCopias();$('#aj-perfil').innerHTML=resumenPerfil(ctx.state)}
  tourSiPendiente();
}
/* Orden de las páginas, para saber si pasar la hoja hacia adelante o hacia atrás */
function orden(t){
  if(/^w\d+$/.test(t))return 1+Number(t.slice(1))/100;
  var i=['resumen','semanas','fijos','sueldo','gastos','logros','ajustes'].indexOf(t);return i<0?9:i;
}
function quieto(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
/* Pasar la hoja: la página nueva entra girando apenas desde el lomo (≤ 22°), 380 ms */
function pasarHoja(dir){
  var m=document.querySelector('main');if(!m||!m.animate)return;
  if(quieto()){m.animate([{opacity:.4},{opacity:1}],{duration:180});return}
  m.animate(dir>0?[{transform:'perspective(1600px) translateX(28px) rotateY(-14deg)',opacity:.35},{transform:'none',opacity:1}]
    :[{transform:'perspective(1600px) translateX(-28px) rotateY(10deg)',opacity:.35},{transform:'none',opacity:1}],
    {duration:380,easing:'cubic-bezier(.25,.7,.25,1)',transformOrigin:'left center'});
}
function go(t){
  if(t==='semanas')t='w'+curWeek(planNow(),today());
  var antes=ctx.tab;
  ctx.tab=t;renderAll();
  if(antes!==t)pasarHoja(orden(t)>=orden(antes)?1:-1);
  var m=document.querySelector('main');
  if(m&&m.getBoundingClientRect().top<0){try{m.scrollIntoView({block:'start'})}catch(e){}}
}
/* Deslizar a los costados pasa de capítulo (y de semana en semana dentro de Semanas).
   No se activa desde campos, listas que se deslizan, ni con una hoja abierta. */
function initDeslizar(){
  var x0=null,y0=0,t0=0;
  var NO='input,textarea,select,.guia-grid,.frec-b,.wkpick,.days,.tablist,.sugs,.seg,.lb-rango,[data-nodeslizar]';
  document.addEventListener('pointerdown',function(e){
    var enMain=e.target.closest('main,.hero');
    x0=(!enMain||e.target.closest(NO)||e.pointerType==='mouse'&&e.button!==0)?null:e.clientX;y0=e.clientY;t0=Date.now();
  },{passive:true});
  document.addEventListener('pointerup',function(e){
    if(x0===null||!ctx.state)return;var dx=e.clientX-x0,dy=e.clientY-y0;x0=null;
    if(Math.abs(dx)<80||Math.abs(dy)>Math.abs(dx)*.5||Date.now()-t0>900)return;
    if(document.documentElement.classList.contains('voz-abierta')||document.documentElement.classList.contains('hoja'))return;
    var pc=planNow(),n=vecina(ctx.tab,dx<0?1:-1,pc.weeks.length,curWeek(pc,today()));
    if(n)go(n);
  },{passive:true});
  document.addEventListener('pointercancel',function(){x0=null});
}
function syncInputs(){syncPlan();syncSueldo();syncGastos()}

/* Reemplaza todos los datos (importar un respaldo, volver a una copia, borrar el ejemplo).
   Antes guarda una copia de lo que había, para poder volver atrás. */
async function reemplazar(st,motivo){
  if(ctx.state)await guardarCopia(JSON.parse(JSON.stringify(ctx.state)),motivo||'antes de reemplazar tus datos');
  if(!st.meta.creado)st.meta.creado=today();
  ctx.state=st;ctx.tab='resumen';aplicarFeriados();fijarUltimo();
  syncInputs();renderAll();flush();
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
function guiaInit(){
  /* La guía arranca oculta si ya venís usando la app (salvo que la hayas vuelto a abrir).
     A alguien nuevo se le muestra hasta que toque "Entendido". */
  var st=ctx.state,usada=!!st&&!st.ejemplo&&(st.gastos.length>3||st.hist.length>0||st.horas.length>3);
  var hide=false;try{var g=localStorage.getItem(GK);hide=g==='1'||(g===null&&usada)}catch(e){}
  $('#guia').hidden=hide;$('#guia-show').hidden=!hide;
  document.querySelectorAll('[data-icon]').forEach(function(el){el.innerHTML=ICON[el.getAttribute('data-icon')]||''});
  $('#guia-ok').addEventListener('click',function(){$('#guia').hidden=true;$('#guia-show').hidden=false;try{localStorage.setItem(GK,'1')}catch(e){}});
  $('#guia-show').addEventListener('click',function(){$('#guia').hidden=false;$('#guia-show').hidden=true;try{localStorage.setItem(GK,'0')}catch(e){}go('resumen')});
}

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
    if(e.target.closest('#aj-datos'))abrirInicio({nuevo:false,estado:ctx.state,alTerminar:function(){syncInputs();persist();renderAll();toast('Listo: se recalculó todo')}});
    if(e.target.closest('#aj-tour'))iniciarTour();
    if(e.target.closest('#aj-prologo'))abrirLibro({modo:'releer',estado:ctx.state,alCerrar:function(){}});
    /* Borrar los datos de ejemplo y crear el perfil (dos toques) */
    var c=e.target.closest('[data-cero]');
    if(c){
      if(c.getAttribute('data-armed')!=='1'){c.setAttribute('data-armed','1');c.textContent='¿Seguro? Se borra todo lo de ejemplo';return}
      var meta=ctx.state.meta,nuevo=defaults();nuevo.meta=meta;
      /* Perfil nuevo: el libro arranca de cero, con el prólogo y el pacto */
      abrirLibro({modo:'nuevo',estado:nuevo,listo:function(st){reemplazar(st,'antes de borrar los datos de ejemplo')},alCerrar:function(){renderAll()}});
    }
  });
  document.addEventListener('click',function(e){var d=e.target.closest('[data-discreto]');if(d){setDiscreto(d.getAttribute('data-discreto')==='1');marcarDiscreto();renderAll()}});
  /* Modo discreto: un toque tapa o muestra todos los montos */
  $('#discreto').addEventListener('click',function(){setDiscreto(!discreto.on);marcarDiscreto();renderAll();toast(discreto.on?'Montos ocultos':'Montos visibles')});
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='hidden')flushPendiente();
    else if(ctx.state)renderAll(); /* al volver otro día, se actualizan "hoy" y la cuenta regresiva */
  });
  window.addEventListener('pagehide',flushPendiente);
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
  try{var t=localStorage.getItem(TK);if(t)ctx.tab=t}catch(e){}
  guiaInit();initGlobal();initPlan();initSemanas();initSueldo();initTarjeta();initFijos();initLogros();initAjustes(reemplazar,juntarDatos);initVoz();initFeriados();initCategorias();initRecibos();initAjustesPin();
  marcarDiscreto();
  ctx.booted=true;
  $('#app').hidden=false;
  syncInputs();renderAll();
}
ctx.persist=persist;ctx.renderAll=renderAll;ctx.go=go;ctx.syncInputs=syncInputs;

(async function boot(){
  initPerfil();initInicio();initTour();initPin();initLibro();initIndice();initDeslizar();
  registrarSW(function(){return ctx.state?flush():null});
  pedirPersistencia().then(function(p){guardado.persistente=p});
  var d=await cargar();
  /* Antes de pasar los datos a la forma nueva, se guarda una copia tal cual estaban */
  if(necesitaMigrar(d))await guardarCopia(d,'antes de actualizar la app');
  /* Con PIN, primero el PIN: los datos no se muestran hasta ponerlo bien */
  if(d&&pinActivo())await pedirPin();
  if(d){arrancar(migrar(d));setStatus('Se guarda en este dispositivo.');return}
  /* Primera vez: el libro cerrado. Al abrirlo, el prólogo y las tres preguntas del pacto. */
  function listo(st){arrancar(st);flush()}
  abrirLibro({modo:'nuevo',estado:defaults(),listo:listo,alImportar:listo,alEjemplo:function(){listo(ejemplo())}});
})();
