/* Ajustes y respaldo: exportar, importar (con resumen y confirmación), recordatorio y bienvenida. */
import {armarRespaldo,leerRespaldo,resumenDatos,diasSinRespaldo,leerCopias,migrar} from '../estado.js';
import {ctx,$,today,esc,fCorta,toast,row,money} from './comun.js';
import {cotizacion,actualizarFijosUSD} from '../logica/monedas.js';
import {csvGastos} from '../logica/csv.js';
import {catDe} from './gastos.js';
import {num} from '../logica/util.js';
import {VERSION} from '../version.js';
import {diasSinCopia} from '../logica/avisos.js';

/* ---------- Exportar ---------- */
function marcarExport(){ctx.state.meta.ultimoExport=today();ctx.persist();ctx.renderAll()}
function textoRespaldo(){return JSON.stringify(armarRespaldo(ctx.state),null,1)}
function descargar(txt,nombre,tipo){
  var url=URL.createObjectURL(new Blob([txt],{type:tipo||'application/json'})),a=document.createElement('a');
  a.href=url;a.download=nombre;document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url)},4000);
}
/* En el iPhone abre "Compartir" para guardarlo en Archivos o iCloud; si no se puede, lo descarga. */
export async function exportar(){
  var txt=textoRespaldo(),nombre='proyecto-ahorros-'+today()+'.json',file=null;
  try{file=new File([txt],nombre,{type:'application/json'})}catch(e){}
  if(file&&navigator.canShare&&navigator.share){
    var puede=false;try{puede=navigator.canShare({files:[file]})}catch(e){}
    if(puede){
      try{await navigator.share({files:[file],title:'Respaldo de Proyecto Ahorros'});marcarExport();toast('Respaldo listo');return}
      catch(e){if(e&&e.name==='AbortError')return}
    }
  }
  descargar(txt,nombre);marcarExport();toast('Respaldo descargado: '+nombre);
}
/* Planilla de gastos: abre "Compartir" en el iPhone (Guardar en Archivos, mandar por WhatsApp…) */
async function exportarCSV(cual){
  var p=ctx.state.plan,per=cual==='periodo';
  var txt=csvGastos(ctx.state.gastos,catDe,per?p.inicio:null,per?p.cobro:null);
  var n=txt.split('\r\n').length-2;
  if(n<1){toast(per?'No hay gastos en este período':'Todavía no anotaste gastos');return}
  var nombre='gastos-'+(per?p.inicio+'-al-'+p.cobro:'todos-'+today())+'.csv',file=null;
  try{file=new File([txt],nombre,{type:'text/csv'})}catch(e){}
  if(file&&navigator.canShare&&navigator.share){
    var puede=false;try{puede=navigator.canShare({files:[file]})}catch(e){}
    if(puede){try{await navigator.share({files:[file],title:'Gastos'});return}catch(e){if(e&&e.name==='AbortError')return}}
  }
  descargar(txt,nombre,'text/csv');toast('Planilla descargada: '+nombre);
}
function copiar(){
  var txt=JSON.stringify(armarRespaldo(ctx.state));
  function manual(){$('#exp-txt').value=txt;$('#exp-box').hidden=false;try{$('#exp-txt').focus();$('#exp-txt').select()}catch(e){}}
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){marcarExport();toast('Datos copiados como texto')},manual)}
    else manual();
  }catch(e){manual()}
}

/* ---------- Importar ---------- */
/* Arma el importador dentro de `el`. onConfirmar(estado) reemplaza todo y se llama solo después de que confirmás.
   Si viene onJuntar(estado), primero se ofrece juntar con lo de este teléfono (no se pierde nada). */
export function montarImportador(el,onConfirmar,textoBoton,onJuntar){
  el.innerHTML='<div class="stack imp">'
    +'<div class="row-btns"><label class="btn primary filebtn">Elegir archivo de respaldo<input type="file" class="sr-only" accept=".json,application/json,text/plain"></label></div>'
    +'<div class="field"><label class="sub-l" for="'+el.id+'-txt">O pegá el texto que copiaste</label><textarea id="'+el.id+'-txt" spellcheck="false" autocomplete="off" placeholder="{&quot;app&quot;:&quot;proyecto-ahorros&quot;, …}"></textarea></div>'
    +'<div class="row-btns"><button class="btn" type="button" data-imp="revisar">Revisar el texto</button></div>'
    +'<p class="err" role="alert" hidden></p>'
    +'<div class="imp-ok callout tone-mint" hidden></div></div>';
  var ta=el.querySelector('textarea'),err=el.querySelector('.err'),okBox=el.querySelector('.imp-ok'),pendiente=null,armado=false;
  function mostrarError(m){err.textContent=m;err.hidden=false;okBox.hidden=true;pendiente=null}
  function revisar(texto){
    err.hidden=true;
    var r=leerRespaldo(texto);
    if(!r.ok){mostrarError(r.error);return}
    pendiente=r.estado;armado=false;
    var h='<h2>Esto es lo que tiene el respaldo</h2><p>'+esc(resumenDatos(r.estado))+'.</p>'
      +(r.exportado?'<p class="note">Exportado el '+esc(fCorta(r.exportado.slice(0,10)))+' de '+esc(r.exportado.slice(0,4))+'.</p>':'');
    if(onJuntar&&ctx.state){
      h+='<p class="note">En este teléfono tenés: '+esc(resumenDatos(ctx.state))+'.</p>'
        +'<div class="stack imp-opc"><button class="btn primary" type="button" data-imp="juntar">Juntar con lo de este teléfono</button>'
        +'<p class="note">Recomendado. No se pierde nada de ninguno de los dos: si un mismo dato cambió en los dos aparatos, queda el cambio más nuevo.</p>'
        +'<button class="btn" type="button" data-imp="si">Reemplazar todo</button>'
        +'<p class="note">Borra lo de este teléfono y deja solo lo del archivo.</p>'
        +'<button class="btn quiet" type="button" data-imp="no">Cancelar</button></div>';
    }else{
      h+=(ctx.state?'<p class="note"><b>Reemplaza todo lo que hay ahora en este teléfono</b> ('+esc(resumenDatos(ctx.state))+').</p>':'')
        +'<div class="row-btns"><button class="btn primary" type="button" data-imp="si">'+esc(textoBoton||'Sí, reemplazar mis datos')+'</button><button class="btn quiet" type="button" data-imp="no">Cancelar</button></div>';
    }
    okBox.innerHTML=h;
    okBox.hidden=false;
    try{okBox.scrollIntoView({block:'nearest'})}catch(e){}
  }
  el.querySelector('input[type=file]').addEventListener('change',function(){
    var f=this.files&&this.files[0];this.value='';if(!f)return;
    if(f.size>20e6){mostrarError('El archivo es demasiado grande para ser un respaldo.');return}
    f.text().then(revisar,function(){mostrarError('No pude leer el archivo.')});
  });
  ta.addEventListener('paste',function(){setTimeout(function(){if(ta.value.trim())revisar(ta.value)},0)});
  el.addEventListener('click',function(e){
    var b=e.target.closest('[data-imp]');if(!b)return;
    var a=b.getAttribute('data-imp');
    if(a==='revisar'){if(ta.value.trim())revisar(ta.value);else{mostrarError('Pegá el texto del respaldo primero.');ta.focus()}}
    if(a==='no'){okBox.hidden=true;pendiente=null}
    if(a==='si'&&pendiente){
      /* Con dos opciones, reemplazar pide un segundo toque */
      if(onJuntar&&ctx.state&&!armado){armado=true;b.textContent='¿Seguro? Se borra lo de este teléfono';b.classList.add('danger');return}
      var st=pendiente;pendiente=null;okBox.hidden=true;ta.value='';onConfirmar(st);
    }
    if(a==='juntar'&&pendiente){var sj=pendiente;pendiente=null;okBox.hidden=true;ta.value='';onJuntar(sj)}
  });
}

/* ---------- Recordatorio suave ---------- */
var avisoOculto=false;
export function renderAvisoRespaldo(){
  var el=$('#resp-aviso');if(!el)return;
  var d=diasSinCopia(ctx.state,today());
  if(avisoOculto||d===null){el.innerHTML='';return}
  el.innerHTML='<div class="banner"><p>Hace <b>'+d+' días</b> que no guardás una copia fuera del teléfono.</p><button class="btn" type="button" id="resp-ya">Guardar una copia</button><button class="btn quiet" type="button" id="resp-luego">Después</button></div>';
}

/* ---------- Pantalla ---------- */
function renderDolar(){
  var c=cotizacion(ctx.state),f=ctx.state.monedas.fecha,i=$('#aj-dolar');
  if(document.activeElement!==i)i.value=c||'';
  $('#aj-dolar-nota').innerHTML=c?'Usás <b>1 dólar = $ '+esc(String(c).replace('.',','))+'</b>'+(f?', cargado el '+esc(fCorta(f)):'')+'. Los gastos que ya anotaste en dólares guardan la cotización de ese día; los fijos en dólares se recalculan con esta.':'Para anotar gastos y fijos en dólares. Tocá el $ al lado del monto para cambiar a US$.';
}
export function renderAjustes(estadoGuardado){
  renderDolar();
  var p=ctx.state.plan;$('#csv-periodo').textContent='Gastos del '+fCorta(p.inicio)+' al '+fCorta(p.cobro);
  var m=ctx.state.meta,d=diasSinRespaldo(ctx.state,today());
  $('#aj-export-note').innerHTML=m.ultimoExport?'Último respaldo: <b>'+esc(fCorta(m.ultimoExport))+'</b>'+(d>0?' (hace '+d+' '+(d===1?'día':'días')+')':' (hoy)')+'.':'Todavía no exportaste ningún respaldo.';
  var info=row('Versión de la app',esc(VERSION))
    +row('Tus datos',esc(resumenDatos(ctx.state)))
    +row('Dónde se guardan',estadoGuardado&&estadoGuardado.donde==='ls'?'en este navegador (modo simple)':'en este dispositivo')
    +row('Protegidos contra borrado',estadoGuardado&&estadoGuardado.persistente?'sí':'no confirmado','',estadoGuardado&&estadoGuardado.persistente?'':'iOS puede borrar datos de webs que no usás hace semanas. Instalada en la pantalla de inicio y abriéndola seguido, no pasa.');
  $('#aj-info').innerHTML=info;
}
/* ---------- Apariencia (oscuro por defecto; se guarda en este aparato) ---------- */
var TEMA='pa-tema';
function temaActual(){try{return localStorage.getItem(TEMA)||'oscuro'}catch(e){return 'oscuro'}}
export function aplicarTema(t){
  var html=document.documentElement,oscuro=t==='auto'?window.matchMedia('(prefers-color-scheme: dark)').matches:t!=='claro';
  if(t==='auto')html.removeAttribute('data-theme');else html.setAttribute('data-theme',oscuro?'dark':'light');
  var m=document.getElementById('meta-tema');if(m)m.setAttribute('content',oscuro?'#14131C':'#1A72B5');
  document.querySelectorAll('[data-tema]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-tema')===t))});
}
/* ---------- Copias automáticas ---------- */
var copias=[],copiaArmada=null;
export async function renderCopias(){
  var el=$('#aj-copias');if(!el)return;
  copias=await leerCopias();
  if(!copias.length){el.innerHTML='<p class="note">Todavía no hay copias. Se guarda una sola antes de cada actualización de la app que cambie tus datos, y antes de importar o reemplazar todo.</p>';return}
  el.innerHTML='<ul class="list">'+copias.map(function(c,i){
    var st=null;try{st=migrar(c.datos)}catch(e){}
    var f=c.fecha?new Date(c.fecha):null,cuando=f?fCorta(f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0')+'-'+String(f.getDate()).padStart(2,'0'))+' '+String(f.getHours()).padStart(2,'0')+':'+String(f.getMinutes()).padStart(2,'0'):'';
    return '<li><span class="what" style="flex-direction:column;align-items:flex-start;gap:1px"><b>'+esc(cuando)+' · '+esc(c.motivo||'copia')+'</b><span class="src">'+(st?esc(resumenDatos(st)):'no se pudo leer')+'</span></span>'
      +(st?'<button class="btn '+(copiaArmada===i?'danger':'quiet')+'" type="button" data-copia="'+i+'">'+(copiaArmada===i?'¿Seguro? Reemplaza lo de ahora':'Volver a esta')+'</button>':'')+'</li>';
  }).join('')+'</ul><p class="note">Lo que tenés ahora también queda guardado como copia antes de volver, así que podés deshacerlo.</p>';
}
export function initAjustes(reemplazar,juntarDatos){
  document.querySelectorAll('[data-csv]').forEach(function(b){b.addEventListener('click',function(){exportarCSV(b.getAttribute('data-csv'))})});
  $('#dolar-form').addEventListener('submit',function(e){
    e.preventDefault();
    var v=Math.round(num($('#aj-dolar').value)*100)/100;
    if(!(v>0)){$('#aj-dolar').focus();return}
    ctx.state.monedas={cotizacion:v,fecha:today()};
    var n=actualizarFijosUSD(ctx.state,v);
    ctx.persist();ctx.renderAll();toast('Dólar guardado'+(n?': '+n+(n===1?' fijo actualizado':' fijos actualizados'):''));
  });
  aplicarTema(temaActual());
  $('#aj-tema').addEventListener('click',function(e){
    var b=e.target.closest('[data-tema]');if(!b)return;
    var t=b.getAttribute('data-tema');try{localStorage.setItem(TEMA,t)}catch(er){}
    aplicarTema(t);
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){if(temaActual()==='auto')aplicarTema('auto')});
  $('#aj-copias').addEventListener('click',function(e){
    var b=e.target.closest('[data-copia]');if(!b)return;
    var i=Number(b.getAttribute('data-copia'));
    if(copiaArmada!==i){copiaArmada=i;renderCopias();setTimeout(function(){if(copiaArmada===i){copiaArmada=null;renderCopias()}},4000);return}
    copiaArmada=null;
    var c=copias[i];if(!c)return;
    reemplazar(migrar(c.datos),'antes de volver a una copia');toast('Listo: volviste a la copia');
  });
  $('#aj-export').addEventListener('click',exportar);
  $('#aj-copy').addEventListener('click',copiar);
  $('#exp-close').addEventListener('click',function(){$('#exp-box').hidden=true});
  montarImportador($('#aj-import'),function(st){reemplazar(st,'antes de importar un respaldo');toast('Datos importados')},null,juntarDatos);
  $('#pase-export').addEventListener('click',exportar);
  /* Abre el selector de archivos del importador; el resumen y "Juntar / Reemplazar" aparecen en esa tarjeta */
  $('#pase-importar').addEventListener('click',function(){
    var c=$('#aj-import-card'),f=c.querySelector('input[type=file]');
    if(f)f.click();
    try{c.scrollIntoView({block:'start',behavior:'smooth'})}catch(e){c.scrollIntoView()}
  });
  document.addEventListener('click',function(e){
    if(e.target.id==='resp-ya')exportar();
    if(e.target.id==='resp-luego'){avisoOculto=true;renderAvisoRespaldo()}
  });
}
