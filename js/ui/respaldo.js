/* Ajustes y respaldo: exportar, importar (con resumen y confirmación), recordatorio y bienvenida. */
import {armarRespaldo,leerRespaldo,resumenDatos,diasSinRespaldo,defaults} from '../estado.js';
import {ctx,$,today,esc,fCorta,toast,row} from './comun.js';
import {VERSION} from '../version.js';

/* ---------- Exportar ---------- */
function marcarExport(){ctx.state.meta.ultimoExport=today();ctx.persist();ctx.renderAll()}
function textoRespaldo(){return JSON.stringify(armarRespaldo(ctx.state),null,1)}
function descargar(txt,nombre){
  var url=URL.createObjectURL(new Blob([txt],{type:'application/json'})),a=document.createElement('a');
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
function copiar(){
  var txt=JSON.stringify(armarRespaldo(ctx.state));
  function manual(){$('#exp-txt').value=txt;$('#exp-box').hidden=false;try{$('#exp-txt').focus();$('#exp-txt').select()}catch(e){}}
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){marcarExport();toast('Datos copiados como texto')},manual)}
    else manual();
  }catch(e){manual()}
}

/* ---------- Importar ---------- */
/* Arma el importador dentro de `el`. onConfirmar(estado) se llama solo después de que confirmás. */
export function montarImportador(el,onConfirmar,textoBoton){
  el.innerHTML='<div class="stack imp">'
    +'<div class="row-btns"><label class="btn primary filebtn">Elegir archivo de respaldo<input type="file" class="sr-only" accept=".json,application/json,text/plain"></label></div>'
    +'<div class="field"><label class="sub-l" for="'+el.id+'-txt">O pegá el texto que copiaste</label><textarea id="'+el.id+'-txt" spellcheck="false" autocomplete="off" placeholder="{&quot;app&quot;:&quot;proyecto-ahorros&quot;, …}"></textarea></div>'
    +'<div class="row-btns"><button class="btn" type="button" data-imp="revisar">Revisar el texto</button></div>'
    +'<p class="err" role="alert" hidden></p>'
    +'<div class="imp-ok callout tone-mint" hidden></div></div>';
  var ta=el.querySelector('textarea'),err=el.querySelector('.err'),okBox=el.querySelector('.imp-ok'),pendiente=null;
  function mostrarError(m){err.textContent=m;err.hidden=false;okBox.hidden=true;pendiente=null}
  function revisar(texto){
    err.hidden=true;
    var r=leerRespaldo(texto);
    if(!r.ok){mostrarError(r.error);return}
    pendiente=r.estado;
    okBox.innerHTML='<h2>Esto es lo que tiene el respaldo</h2><p>'+esc(resumenDatos(r.estado))+'.</p>'
      +(r.exportado?'<p class="note">Exportado el '+esc(fCorta(r.exportado.slice(0,10)))+' de '+esc(r.exportado.slice(0,4))+'.</p>':'')
      +(ctx.state?'<p class="note"><b>Reemplaza todo lo que hay ahora en este teléfono</b> ('+esc(resumenDatos(ctx.state))+').</p>':'')
      +'<div class="row-btns"><button class="btn primary" type="button" data-imp="si">'+esc(textoBoton||'Sí, reemplazar mis datos')+'</button><button class="btn quiet" type="button" data-imp="no">Cancelar</button></div>';
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
    if(a==='si'&&pendiente){var st=pendiente;pendiente=null;okBox.hidden=true;ta.value='';onConfirmar(st)}
  });
}

/* ---------- Recordatorio suave ---------- */
var avisoOculto=false;
export function renderAvisoRespaldo(){
  var el=$('#resp-aviso');if(!el)return;
  var d=diasSinRespaldo(ctx.state,today());
  if(avisoOculto||d===null||d<=14){el.innerHTML='';return}
  el.innerHTML='<div class="banner"><p>Hace <b>'+d+' días</b> que no guardás un respaldo. Tus datos viven solo en este teléfono.</p><button class="btn" type="button" id="resp-ya">Exportar ahora</button><button class="btn quiet" type="button" id="resp-luego">Después</button></div>';
}

/* ---------- Pantalla ---------- */
export function renderAjustes(estadoGuardado){
  var m=ctx.state.meta,d=diasSinRespaldo(ctx.state,today());
  $('#aj-export-note').innerHTML=m.ultimoExport?'Último respaldo: <b>'+esc(fCorta(m.ultimoExport))+'</b>'+(d>0?' (hace '+d+' '+(d===1?'día':'días')+')':' (hoy)')+'.':'Todavía no exportaste ningún respaldo.';
  var info=row('Versión de la app',esc(VERSION))
    +row('Tus datos',esc(resumenDatos(ctx.state)))
    +row('Dónde se guardan',estadoGuardado&&estadoGuardado.donde==='ls'?'en este navegador (modo simple)':'en este dispositivo')
    +row('Protegidos contra borrado',estadoGuardado&&estadoGuardado.persistente?'sí':'no confirmado','',estadoGuardado&&estadoGuardado.persistente?'':'iOS puede borrar datos de webs que no usás hace semanas. Instalada en la pantalla de inicio y abriéndola seguido, no pasa.');
  $('#aj-info').innerHTML=info;
}
export function initAjustes(reemplazar){
  $('#aj-export').addEventListener('click',exportar);
  $('#aj-copy').addEventListener('click',copiar);
  $('#exp-close').addEventListener('click',function(){$('#exp-box').hidden=true});
  montarImportador($('#aj-import'),function(st){reemplazar(st);toast('Datos importados')});
  document.addEventListener('click',function(e){
    if(e.target.id==='resp-ya')exportar();
    if(e.target.id==='resp-luego'){avisoOculto=true;renderAvisoRespaldo()}
  });
}

/* ---------- Bienvenida (primer arranque, sin datos) ---------- */
export function mostrarBienvenida(listo){
  var el=$('#bienvenida');el.hidden=false;
  $('#bv-importar').addEventListener('click',function(){$('#bv-imp-wrap').hidden=false;this.hidden=true});
  montarImportador($('#bv-import'),function(st){el.hidden=true;listo(st)},'Usar estos datos');
  $('#bv-ejemplo').addEventListener('click',function(){el.hidden=true;var st=defaults();listo(st)});
}
