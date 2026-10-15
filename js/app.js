/* Arranque, pestañas y render general. */
import {curWeek} from './logica/plan.js';
import {migrar,cargar,guardar,pedirPersistencia,defaults,necesitaMigrar,guardarCopia,resumenDatos} from './estado.js';
import {ctx,$,today,planNow,ICON,discreto,setDiscreto,toast} from './ui/comun.js';
import {renderCountdown,renderResumen,syncPlan,initPlan} from './ui/plan.js';
import {renderWeek,initSemanas} from './ui/semanas.js';
import {renderSueldo,syncSueldo,initSueldo} from './ui/sueldo.js';
import {renderGastos,syncGastos,initTarjeta} from './ui/tarjeta.js';
import {renderFijos,initFijos} from './ui/fijos.js';
import {renderLogros,evalLogros,initLogros} from './ui/logros.js';
import {renderAjustes,renderAvisoRespaldo,initAjustes,mostrarBienvenida,renderCopias} from './ui/respaldo.js';
import {registrarSW} from './pwa.js';
import {initVoz} from './ui/voz.js';
import {abrirPerfil,initPerfil,resumenPerfil} from './ui/perfil.js';
import {aplicarFeriados,renderFeriados,initFeriados} from './ui/feriados.js';
import {prepararGuardado,juntar} from './logica/sync.js';
import {renderCategorias,initCategorias} from './ui/categorias.js';
import {renderRecibos,initRecibos} from './ui/recibos.js';

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
  var n=ctx.state.perfil.nombre;$('#saludo').textContent=n?'Hola, '+n:'Hola';
  /* Con el perfil hecho, la explicación del encabezado ya no hace falta y deja lugar a lo importante */
  var hs=document.querySelector('.hero-sub');if(hs)hs.hidden=!!ctx.state.perfil.hecho;
  var st=ctx.state;document.documentElement.classList.toggle('en-uso',!st.ejemplo&&!!st.perfil.hecho&&(st.gastos.length+st.horas.length+st.hist.length)>3);
  renderCountdown();renderTabs(pc);showPanels();renderAvisoRespaldo();renderResumen(pc);renderWeek(pc);renderSueldo();
  if(ctx.tab==='sueldo')renderRecibos();
  if(ctx.tab==='gastos')renderGastos();
  if(ctx.tab==='fijos')renderFijos(pc);
  if(ctx.tab==='logros')renderLogros(pc);
  if(ctx.tab==='ajustes'){renderAjustes(guardado);renderFeriados();renderCategorias();
    document.querySelectorAll('[data-sobrante]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-sobrante')===(ctx.state.plan.sobrante||'siguiente')))});renderCopias();$('#aj-perfil').innerHTML=resumenPerfil(ctx.state)}
}
function go(t){
  if(t==='semanas')t='w'+curWeek(planNow(),today());
  ctx.tab=t;renderAll();
  var m=document.querySelector('main');
  if(m&&m.getBoundingClientRect().top<0){try{m.scrollIntoView({block:'start'})}catch(e){}}
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
    /* Borrar los datos de ejemplo y crear el perfil (dos toques) */
    var c=e.target.closest('[data-cero]');
    if(c){
      if(c.getAttribute('data-armed')!=='1'){c.setAttribute('data-armed','1');c.textContent='¿Seguro? Se borra todo lo de ejemplo';return}
      var meta=ctx.state.meta,nuevo=defaults();nuevo.meta=meta;
      abrirPerfil(1,{nuevo:true,estado:nuevo,alTerminar:function(st){reemplazar(st,'antes de borrar los datos de ejemplo')},alCancelar:function(){renderAll()}});
    }
  });
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
}
/* ---------- Arranque ---------- */
function arrancar(st){
  ctx.state=st;aplicarFeriados();fijarUltimo();
  if(!st.meta.creado){st.meta.creado=today();persist()}
  try{var t=localStorage.getItem(TK);if(t)ctx.tab=t}catch(e){}
  guiaInit();initGlobal();initPlan();initSemanas();initSueldo();initTarjeta();initFijos();initLogros();initAjustes(reemplazar,juntarDatos);initVoz();initFeriados();initCategorias();initRecibos();
  marcarDiscreto();
  ctx.booted=true;
  $('#app').hidden=false;
  syncInputs();renderAll();
}
ctx.persist=persist;ctx.renderAll=renderAll;ctx.go=go;ctx.syncInputs=syncInputs;

(async function boot(){
  initPerfil();
  registrarSW(function(){return ctx.state?flush():null});
  pedirPersistencia().then(function(p){guardado.persistente=p});
  var d=await cargar();
  /* Antes de pasar los datos a la forma nueva, se guarda una copia tal cual estaban */
  if(necesitaMigrar(d))await guardarCopia(d,'antes de actualizar la app');
  if(d){arrancar(migrar(d));setStatus('Se guarda en este dispositivo.');return}
  mostrarBienvenida(function(st){arrancar(st);flush()});
})();
