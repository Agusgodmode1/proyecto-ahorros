/* Ajustes → Categorías: crear, renombrar, color e ícono, ordenar, ocultar y borrar (pasando los gastos a otra). */
import * as C from '../logica/categorias.js';
import {ctx,$,esc,toast} from './comun.js';

var abierta=null,borrando=null,error='';

function editor(c){
  var n=C.cuantosGastos(ctx.state,c.nombre),esOtros=c===C.otros(ctx.state);
  var h='<div class="cat-ed stack"><div class="field"><label class="sub-l" for="cat-n">Nombre</label><input id="cat-n" type="text" maxlength="30" value="'+esc(c.nombre)+'"></div>'
    +'<div class="field"><span class="sub-l">Color</span><div class="cat-col" role="group" aria-label="Color">'+C.COLORES.map(function(x){return '<button type="button" class="sw" data-catcol="'+x+'" style="background:'+x+'" aria-pressed="'+(x===c.color)+'" aria-label="Color"></button>'}).join('')+'</div></div>'
    +'<div class="field"><span class="sub-l">Ícono</span><div class="cat-ic" role="group" aria-label="Ícono">'+C.ICONOS.map(function(x){return '<button type="button" data-catic="'+esc(x)+'" aria-pressed="'+(x===c.icono)+'">'+esc(x)+'</button>'}).join('')+'</div></div>'
    +'<div class="row-btns"><button class="btn primary" type="button" data-cata="guardar">Guardar</button>'
    +(esOtros?'':'<button class="btn" type="button" data-cata="ocultar">'+(c.oculta?'Mostrar al anotar':'Ocultar al anotar')+'</button>')
    +(esOtros?'':'<button class="btn quiet danger" type="button" data-cata="borrar">Borrar</button>')
    +'<button class="btn quiet" type="button" data-cata="cerrar">Cancelar</button></div>';
  if(esOtros)h+='<p class="note">"'+esc(c.nombre)+'" no se puede borrar ni ocultar: ahí va lo que no se reconoce. Sí podés renombrarla.</p>';
  if(borrando===c.id){
    var otras=C.lista(ctx.state).filter(function(x){return x.id!==c.id});
    h+='<div class="callout tone-coral stack"><p>'+(n?'Tiene <b>'+n+(n===1?' gasto':' gastos')+'</b>. ¿A qué categoría pasan?':'No tiene gastos.')+'</p>'
      +(n?'<select id="cat-dest" aria-label="Categoría a la que pasan los gastos">'+otras.map(function(x){return '<option value="'+esc(x.id)+'"'+(x===C.otros(ctx.state)?' selected':'')+'>'+esc(x.nombre)+'</option>'}).join('')+'</select>':'')
      +'<div class="row-btns"><button class="btn danger" type="button" data-cata="borrarya">'+(n?'Borrar y pasar los gastos':'Sí, borrar')+'</button><button class="btn quiet" type="button" data-cata="noborrar">No</button></div></div>';
  }
  if(error)h+='<p class="err">'+esc(error)+'</p>';
  return h+'</div>';
}
export function renderCategorias(){
  var el=$('#aj-cats');if(!el)return;
  var l=C.lista(ctx.state);
  el.innerHTML='<ul class="list cat-list">'+l.map(function(c,i){
    var n=C.cuantosGastos(ctx.state,c.nombre);
    return '<li class="'+(c.oculta?'cat-oculta':'')+'"><div class="cat-fila"><span class="cat-ico" style="background:'+c.color+'">'+esc(c.icono&&c.icono!=='•'?c.icono:'')+'</span>'
      +'<span class="what"><b>'+esc(c.nombre)+'</b><span class="src">'+(c.oculta?'oculta · ':'')+n+(n===1?' gasto':' gastos')+'</span></span>'
      +'<span class="cat-btns"><button class="btn quiet sm" type="button" data-catm="'+esc(c.id)+'" data-dir="-1"'+(i===0?' disabled':'')+' aria-label="Subir">↑</button><button class="btn quiet sm" type="button" data-catm="'+esc(c.id)+'" data-dir="1"'+(i===l.length-1?' disabled':'')+' aria-label="Bajar">↓</button>'
      +'<button class="btn quiet sm" type="button" data-cate="'+esc(c.id)+'">'+(abierta===c.id?'Cerrar':'Editar')+'</button></span></div>'
      +(abierta===c.id?editor(c):'')+'</li>';
  }).join('')+'</ul>'
    +'<form class="cat-nueva" id="cat-nueva" autocomplete="off"><div class="field"><label for="cat-nn" class="sub-l">Nueva categoría</label><input id="cat-nn" type="text" maxlength="30" placeholder="Ropa, mascotas, regalos…"></div><button class="btn" type="submit">Agregar</button></form>';
}
function cambio(msg){ctx.persist();ctx.renderAll();if(msg)toast(msg)}
export function initCategorias(){
  var el=$('#aj-cats');
  el.addEventListener('click',function(e){
    var st=ctx.state,b;
    if((b=e.target.closest('[data-catm]'))){C.mover(st,b.getAttribute('data-catm'),Number(b.getAttribute('data-dir')));cambio();return}
    if((b=e.target.closest('[data-cate]'))){var id=b.getAttribute('data-cate');abierta=abierta===id?null:id;borrando=null;error='';renderCategorias();return}
    if((b=e.target.closest('[data-catcol]'))){el.querySelectorAll('[data-catcol]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});return}
    if((b=e.target.closest('[data-catic]'))){el.querySelectorAll('[data-catic]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});return}
    if(!(b=e.target.closest('[data-cata]'))||!abierta)return;
    var a=b.getAttribute('data-cata'),c=C.lista(st).filter(function(x){return x.id===abierta})[0],r;error='';
    if(!c)return;
    if(a==='cerrar'){abierta=null;borrando=null;renderCategorias();return}
    if(a==='guardar'){
      var col=el.querySelector('[data-catcol][aria-pressed="true"]'),ic=el.querySelector('[data-catic][aria-pressed="true"]');
      r=C.editar(st,c.id,{nombre:$('#cat-n').value,color:col&&col.getAttribute('data-catcol'),icono:ic&&ic.getAttribute('data-catic')});
      if(!r.ok){error=r.error;renderCategorias();return}
      abierta=null;cambio('Categoría guardada');return;
    }
    if(a==='ocultar'){r=C.editar(st,c.id,{oculta:!c.oculta});if(!r.ok){error=r.error;renderCategorias();return}cambio(c.oculta?'No aparece al anotar gastos':'Vuelve a aparecer al anotar');return}
    if(a==='borrar'){borrando=c.id;renderCategorias();return}
    if(a==='noborrar'){borrando=null;renderCategorias();return}
    if(a==='borrarya'){
      var d=$('#cat-dest');r=C.borrar(st,c.id,d?d.value:null);
      if(!r.ok){error=r.error;renderCategorias();return}
      abierta=null;borrando=null;cambio('Categoría borrada'+(r.movidos?': '+r.movidos+(r.movidos===1?' gasto pasó':' gastos pasaron')+' a '+r.destino:''));
    }
  });
  el.addEventListener('submit',function(e){
    if(e.target.id!=='cat-nueva')return;
    e.preventDefault();
    var r=C.crear(ctx.state,{nombre:$('#cat-nn').value});
    if(!r.ok){toast(r.error);return}
    abierta=r.cat.id;cambio('Categoría agregada');
  });
}
