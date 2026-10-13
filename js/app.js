/* Arranque, pestañas y render general. */
import {curWeek} from './logica/plan.js';
import {defaults,migrar,leerGuardado,guardar} from './estado.js';
import {ctx,$,today,planNow,toast,ICON} from './ui/comun.js';
import {renderCountdown,renderResumen,syncPlan,initPlan} from './ui/plan.js';
import {renderWeek,initSemanas} from './ui/semanas.js';
import {renderSueldo,syncSueldo,initSueldo} from './ui/sueldo.js';
import {renderGastos,syncGastos,initTarjeta} from './ui/tarjeta.js';
import {renderFijos,initFijos} from './ui/fijos.js';
import {renderLogros,evalLogros,initLogros} from './ui/logros.js';

/* ---------- Guardado ---------- */
var timer=null;
function setStatus(m){var el=$('#save-status');if(el)el.textContent=m}
function persist(){setStatus('Guardando…');clearTimeout(timer);timer=setTimeout(flush,450)}
function flush(){
  if(guardar(JSON.parse(JSON.stringify(ctx.state))))setStatus('Guardado en este navegador.');
  else setStatus('No se pudo guardar. Los datos se pierden al cerrar la página.');
}

/* ---------- Pestañas ---------- */
var TABS=[['resumen','Plan','tone-sky','plan'],['semanas','Semanas','tone-mint','semanas'],['fijos','Fijos','tone-teal','fijos'],['sueldo','Sueldo','tone-grape','sueldo'],['gastos','Tarjeta','tone-coral','gastos'],['logros','Logros','tone-sun','logros']];
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
}

/* ---------- Render general ---------- */
function renderAll(){
  var pc=planNow();
  if(/^w\d+$/.test(ctx.tab)&&Number(ctx.tab.slice(1))>=pc.weeks.length)ctx.tab='resumen';
  evalLogros(pc);
  renderCountdown();renderTabs(pc);showPanels();renderResumen(pc);renderWeek(pc);renderSueldo();
  if(ctx.tab==='gastos')renderGastos();
  if(ctx.tab==='fijos')renderFijos(pc);
  if(ctx.tab==='logros')renderLogros(pc);
}
function go(t){
  if(t==='semanas')t='w'+curWeek(planNow(),today());
  ctx.tab=t;renderAll();
  var m=document.querySelector('main');
  if(m&&m.getBoundingClientRect().top<0){try{m.scrollIntoView({block:'start'})}catch(e){}}
}
function syncInputs(){syncPlan();syncSueldo();syncGastos()}

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
  $('#exp-datos').addEventListener('click',function(){
    var txt=JSON.stringify({app:'proyecto-ahorros',exportado:new Date().toISOString(),datos:ctx.state});
    function manual(){$('#exp-txt').value=txt;$('#exp-box').hidden=false;try{$('#exp-txt').focus();$('#exp-txt').select()}catch(e){}}
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){toast('Datos copiados. Pegalos en la app nueva.')},manual)}
      else manual();
    }catch(e){manual()}
  });
  $('#exp-close').addEventListener('click',function(){$('#exp-box').hidden=true});
}

/* ---------- Arranque ---------- */
ctx.persist=persist;ctx.renderAll=renderAll;ctx.go=go;ctx.syncInputs=syncInputs;
var guardado=leerGuardado();
ctx.state=guardado?migrar(guardado):defaults();
guiaInit();initGlobal();initPlan();initSemanas();initSueldo();initTarjeta();initFijos();initLogros();
ctx.booted=true;
syncInputs();renderAll();
setStatus('Se guarda solo en este navegador.');
