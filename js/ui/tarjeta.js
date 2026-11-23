/* Capítulo V · Tarjeta: traer el extracto (pegado o en archivo) y ver por dónde se te va la plata.
   Acá queda solo lo liviano (los campos y los toques). Lo pesado (el lector de bancos, el detector y los dibujos)
   está en tarjeta-ver.js y se carga recién al abrir el capítulo, o cuando el teléfono está libre si hay un
   extracto (para el aviso de Hoy). */
import {num} from '../logica/util.js';
import {ctx,$,toast} from './comun.js';

var gasTimer=null,gasConfirm=false,V=null,cargando=null,inTocado=false;
function cargar(){
  if(V)return Promise.resolve(V);
  return cargando||(cargando=import('./tarjeta-ver.js').then(function(m){V=m;return m}).catch(function(e){cargando=null;throw e}));
}
function hayTexto(){var t=ctx.state.extracto.texto;return !!(t&&t.trim())}

export function renderGastos(){
  var d=$('#gas-in');
  if(d&&!inTocado)d.open=!hayTexto();
  /* (2.30) «Borrar extracto» solo cuando hay uno */
  var cb=$('#gas-clear-box');if(cb)cb.hidden=!hayTexto();
  if(V){V.render();return}
  if(!hayTexto()){$('#gas-stat').textContent='';$('#gas-out').innerHTML='';return}
  $('#gas-out').innerHTML='<div class="empty" aria-busy="true">Leyendo tu extracto…</div>';
  cargar().then(function(m){if(ctx.tab==='gastos')m.render()}).catch(function(){$('#gas-out').innerHTML='<div class="empty">No pude abrir esta parte. Revisá la conexión la primera vez y probá de nuevo.</div>'});
}
/* Hoy: una nota al margen con lo más importante que encontró el detector (si hay extracto) */
var avisoPedido=false;
export function renderAvisoTarjeta(){
  var el=$('#tarjeta-aviso');if(!el)return;
  if(!hayTexto()){el.innerHTML='';return}
  if(V){V.avisoHoy();return}
  if(avisoPedido)return;
  avisoPedido=true;
  var ir=function(){cargar().then(function(m){m.avisoHoy()}).catch(function(){})};
  if('requestIdleCallback' in window)requestIdleCallback(ir,{timeout:4000});else setTimeout(ir,1500);
}
/* (2.15) con el teléfono libre se deja lista la Tarjeta (el módulo y la cuenta del extracto): así la primera vez
   que pasás a ese capítulo no hay pausa */
export function precargarTarjeta(){
  if(!hayTexto()||V)return;
  var ir=function(){cargar().then(function(m){m.analisis()}).catch(function(){})};
  if('requestIdleCallback' in window)requestIdleCallback(ir,{timeout:5000});else setTimeout(ir,2500);
}
export function syncGastos(){
  var ex=ctx.state.extracto;
  if($('#gas-txt').value!==ex.texto)$('#gas-txt').value=ex.texto;
  $('#gas-fmt').value=ex.formato;$('#gas-hor').value=ex.hormiga||'';
}
export function initTarjeta(){
  $('#gas-txt').addEventListener('input',function(){
    var t=this.value;
    if(t.length>150000){t=t.slice(0,150000);this.value=t}
    t=t.replace(/\d{9,}/g,function(x){return '•••'+x.slice(-3)});
    ctx.state.extracto.texto=t;
    clearTimeout(gasTimer);gasTimer=setTimeout(function(){ctx.persist();renderGastos()},350);
  });
  $('#gas-fmt').addEventListener('change',function(){ctx.state.extracto.formato=this.value;ctx.persist();renderGastos()});
  $('#gas-hor').addEventListener('input',function(){ctx.state.extracto.hormiga=num(this.value);ctx.persist();renderGastos()});
  $('#gas-clear').addEventListener('click',function(){
    if(!gasConfirm){gasConfirm=true;this.textContent='¿Seguro? Tocá de nuevo para borrar';return}
    gasConfirm=false;this.textContent='Borrar extracto';
    ctx.state.extracto.texto='';ctx.state.extracto.cat={};ctx.state.extracto.descartadas={};syncGastos();ctx.persist();inTocado=false;renderGastos();
    var a=$('#tarjeta-aviso');if(a)a.innerHTML='';
  });
  var d=$('#gas-in');if(d)d.addEventListener('toggle',function(){if(d.open===hayTexto())inTocado=true});
  $('#gas-file').addEventListener('change',function(){
    var f=this.files&&this.files[0],inp=this;if(!f)return;
    $('#gas-stat').textContent='Leyendo el archivo…';
    cargar().then(function(m){return m.archivo(f)}).then(function(texto){
      var ex=ctx.state.extracto;ex.texto=texto;ex.descartadas={};
      syncGastos();ctx.persist();inTocado=false;renderGastos();
      toast('Listo: leí el archivo en tu teléfono');
    }).catch(function(e){$('#gas-stat').textContent=e&&e.message?e.message:'No pude leer ese archivo.'}).then(function(){inp.value=''});
  });
  $('#p-gastos').addEventListener('change',function(e){if(V)V.change(e)});
  $('#p-gastos').addEventListener('click',function(e){if(V)V.click(e)});
  $('#p-gastos').addEventListener('pointerdown',function(e){if(V)V.puntero(e)});
  $('#p-gastos').addEventListener('pointermove',function(e){if(V)V.puntero(e)});
  /* Hoy: «Ya lo vi» descarta el aviso (no vuelve a aparecer ese mismo) */
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-tav]');if(!b||!V)return;
    V.descartar(b.getAttribute('data-tav'));
  });
}
