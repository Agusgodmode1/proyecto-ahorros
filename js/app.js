/* Arranque, pestañas y render general. */
import {curWeek} from './logica/plan.js';
import {migrar,cargar,guardar,pedirPersistencia} from './estado.js';
import {ctx,$,today,planNow,ICON} from './ui/comun.js';
import {renderCountdown,renderResumen,syncPlan,initPlan} from './ui/plan.js';
import {renderWeek,initSemanas} from './ui/semanas.js';
import {renderSueldo,syncSueldo,initSueldo} from './ui/sueldo.js';
import {renderGastos,syncGastos,initTarjeta} from './ui/tarjeta.js';
import {renderFijos,initFijos} from './ui/fijos.js';
import {renderLogros,evalLogros,initLogros} from './ui/logros.js';
import {renderAjustes,renderAvisoRespaldo,initAjustes,mostrarBienvenida} from './ui/respaldo.js';
import {registrarSW} from './pwa.js';
import {initVoz} from './ui/voz.js';

/* ---------- Guardado en IndexedDB ---------- */
var timer=null,saving=false,pending=false,guardado={donde:null,persistente:null};
function setStatus(m){var el=$('#save-status');if(el)el.textContent=m}
function persist(){setStatus('Guardando…');clearTimeout(timer);timer=setTimeout(flush,450)}
async function flush(){
  clearTimeout(timer);timer=null;
  if(saving){pending=true;return}
  saving=true;
  try{
    var r=await guardar(JSON.parse(JSON.stringify(ctx.state)));
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
var TABS=[['resumen','Plan','tone-sky','plan'],['semanas','Semanas','tone-mint','semanas'],['fijos','Fijos','tone-teal','fijos'],['sueldo','Sueldo','tone-grape','sueldo'],['gastos','Tarjeta','tone-coral','gastos'],['logros','Logros','tone-sun','logros']];
var TK='pa-tab';
function renderTabs(pc){
  var tab=ctx.tab,cw='w'+curWeek(pc,today()),h='',isW=/^w\d+$/.test(tab);
  TABS.forEach(function(t){
    var id=t[0]==='semanas'?(isW?tab:cw):t[0];
    var sel=t[0]==='semanas'?isW:tab===t[0];
    h+='<button class="tab '+t[2]+'" role="tab" type="button" data-tab="'+id+'" aria-selected="'+sel+'">'+ICON[t[3]]+'<span>'+t[1]+'</span></button>';
  });
  $('#tablist').innerHTML=h;
}
function showPanels(){
  var tab=ctx.tab;
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
  renderCountdown();renderTabs(pc);showPanels();renderAvisoRespaldo();renderResumen(pc);renderWeek(pc);renderSueldo();
  if(ctx.tab==='gastos')renderGastos();
  if(ctx.tab==='fijos')renderFijos(pc);
  if(ctx.tab==='logros')renderLogros(pc);
  if(ctx.tab==='ajustes')renderAjustes(guardado);
}
function go(t){
  if(t==='semanas')t='w'+curWeek(planNow(),today());
  ctx.tab=t;renderAll();
  var m=document.querySelector('main');
  if(m&&m.getBoundingClientRect().top<0){try{m.scrollIntoView({block:'start'})}catch(e){}}
}
function syncInputs(){syncPlan();syncSueldo();syncGastos()}

/* Reemplaza todos los datos (importar un respaldo). */
function reemplazar(st){
  if(!st.meta.creado)st.meta.creado=today();
  ctx.state=st;ctx.tab='resumen';
  syncInputs();renderAll();flush();
  window.scrollTo(0,0);
}

/* ---------- Guía ---------- */
var GK='pa-guia-oculta';
function guiaInit(){
  var hide=false;try{hide=localStorage.getItem(GK)==='1'}catch(e){}
  $('#guia').hidden=hide;$('#guia-show').hidden=!hide;
  document.querySelectorAll('[data-icon]').forEach(function(el){el.innerHTML=ICON[el.getAttribute('data-icon')]||''});
  $('#guia-ok').addEventListener('click',function(){$('#guia').hidden=true;$('#guia-show').hidden=false;try{localStorage.setItem(GK,'1')}catch(e){}});
  $('#guia-show').addEventListener('click',function(){$('#guia').hidden=false;$('#guia-show').hidden=true;try{localStorage.removeItem(GK)}catch(e){}go('resumen')});
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
  });
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='hidden')flushPendiente();
    else if(ctx.state)renderAll(); /* al volver otro día, se actualizan "hoy" y la cuenta regresiva */
  });
  window.addEventListener('pagehide',flushPendiente);
}

/* ---------- Arranque ---------- */
function arrancar(st){
  ctx.state=st;
  if(!st.meta.creado){st.meta.creado=today();persist()}
  try{var t=localStorage.getItem(TK);if(t)ctx.tab=t}catch(e){}
  guiaInit();initGlobal();initPlan();initSemanas();initSueldo();initTarjeta();initFijos();initLogros();initAjustes(reemplazar);initVoz();
  ctx.booted=true;
  $('#app').hidden=false;
  syncInputs();renderAll();
}
ctx.persist=persist;ctx.renderAll=renderAll;ctx.go=go;ctx.syncInputs=syncInputs;

(async function boot(){
  registrarSW(function(){return ctx.state?flush():null});
  pedirPersistencia().then(function(p){guardado.persistente=p});
  var d=await cargar();
  if(d){arrancar(migrar(d));setStatus('Se guarda en este dispositivo.');return}
  mostrarBienvenida(function(st){arrancar(st);flush()});
})();
