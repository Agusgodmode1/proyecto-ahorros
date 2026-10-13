/* Anotar, editar y borrar gastos. Lo usan Semanas y Plan.
   La categoría se sugiere sola a partir de la nota (el mismo clasificador que la voz) y aprende si la corregís. */
import {CAT_NAMES} from '../logica/extracto.js';
import {categoriaGasto,aprender} from '../logica/voz.js';
import {num,uid} from '../logica/util.js';
import {ctx,esc,money,toastAccion} from './comun.js';
import {CATCOL} from './tarjeta.js';

export var CATS_GASTO=CAT_NAMES.filter(function(c){return c!=='Ingresos'});

/* Categoría de un gasto: la guardada o, en gastos viejos sin categoría, la que sale de la nota. */
export function catDe(g){return g.cat||categoriaGasto(g.nota||'',ctx.state&&ctx.state.voz.cats)}
export function catColor(c){return CATCOL[c]||'var(--muted)'}

/* Formulario. p = prefijo de ids; o = {fechas:[[iso,texto]], fecha, gasto (si se edita), boton} */
export function formGasto(p,o){
  var g=o.gasto||{},cat=g.id?catDe(g):'Otros';
  var h='<form class="gform" data-gform="'+p+'" autocomplete="off">'
    +'<div class="field f-monto"><label for="'+p+'-monto" class="sub-l">¿Cuánto?</label><div class="money"><span>$</span><input id="'+p+'-monto" type="number" inputmode="decimal" min="0" step="any" required value="'+(g.id?esc(g.monto):'')+'"></div></div>'
    +'<div class="field f-cat"><label for="'+p+'-cat" class="sub-l">Categoría</label><select id="'+p+'-cat" data-sugerida="'+esc(cat)+'"'+(g.id?' data-tocada="1"':'')+'>'+CATS_GASTO.map(function(c){return '<option'+(c===cat?' selected':'')+'>'+esc(c)+'</option>'}).join('')+'</select></div>'
    +'<div class="field f-nota"><label for="'+p+'-nota" class="sub-l">¿En qué?</label><input id="'+p+'-nota" type="text" maxlength="60" placeholder="almuerzo, boleto, súper" value="'+esc(g.nota||'')+'"></div>';
  if(o.fechas&&o.fechas.length)h+='<div class="field f-fecha"><label for="'+p+'-fecha" class="sub-l">¿Qué día?</label><select id="'+p+'-fecha">'+o.fechas.map(function(f){return '<option value="'+f[0]+'"'+(f[0]===(g.fecha||o.fecha)?' selected':'')+'>'+esc(f[1])+'</option>'}).join('')+'</select></div>';
  else h+='<input type="hidden" id="'+p+'-fecha" value="'+esc(g.fecha||o.fecha)+'">';
  h+='<div class="row-btns f-btn"><button class="btn primary" type="submit">'+esc(o.boton||(g.id?'Guardar cambios':'Anotar'))+'</button>'
    +(g.id?'<button class="btn quiet" type="button" data-gcancel="'+p+'">Cancelar</button>':'')+'</div></form>';
  return h;
}

/* Mientras escribís la nota, la categoría se sugiere sola (si no la elegiste a mano). */
export function initFormsGasto(raiz){
  raiz.addEventListener('input',function(e){
    var f=e.target.closest('[data-gform]');if(!f)return;
    var p=f.getAttribute('data-gform');if(e.target.id!==p+'-nota')return;
    var sel=f.querySelector('#'+p+'-cat');if(!sel||sel.getAttribute('data-tocada')==='1')return;
    var c=categoriaGasto(e.target.value,ctx.state.voz.cats);
    sel.value=c;sel.setAttribute('data-sugerida',c);
  });
  raiz.addEventListener('change',function(e){
    var f=e.target.closest('[data-gform]');if(!f)return;
    var p=f.getAttribute('data-gform');if(e.target.id===p+'-cat')e.target.setAttribute('data-tocada','1');
  });
}

/* Lee el formulario. Devuelve null si falta el monto. */
export function leerForm(f){
  var p=f.getAttribute('data-gform'),q=function(s){return f.querySelector('#'+p+'-'+s)};
  var m=num(q('monto').value);
  if(!(m>0)){q('monto').focus();return null}
  var sel=q('cat');
  return {monto:Math.round(m*100)/100,nota:q('nota').value.trim().slice(0,60),cat:sel.value,sugerida:categoriaGasto(q('nota').value,ctx.state.voz.cats),fecha:q('fecha').value};
}

/* Guarda un gasto nuevo o cambia uno existente. Si corregiste la categoría, la app la aprende. */
export function guardarGasto(d,editId){
  var st=ctx.state;
  if(d.nota&&d.cat!==d.sugerida)aprender(st.voz.cats,d.nota,d.cat);
  if(editId){
    st.gastos.forEach(function(g){if(g.id===editId){g.monto=d.monto;g.nota=d.nota;g.cat=d.cat;g.fecha=d.fecha}});
  }else st.gastos.push({id:uid(),fecha:d.fecha,monto:d.monto,nota:d.nota,cat:d.cat});
  ctx.persist();
}

/* Borra y ofrece "Deshacer" durante unos segundos. */
export function borrarGasto(id){
  var st=ctx.state,i=-1;
  st.gastos.forEach(function(g,k){if(g.id===id)i=k});
  if(i<0)return;
  var g=st.gastos[i];
  st.gastos.splice(i,1);ctx.persist();ctx.renderAll();
  toastAccion('Borraste '+money(g.monto)+(g.nota?' de '+g.nota:''),'Deshacer',function(){
    if(!ctx.state.gastos.some(function(x){return x.id===g.id}))ctx.state.gastos.splice(Math.min(i,ctx.state.gastos.length),0,g);
    ctx.persist();ctx.renderAll();
  });
}

/* Renglón de la lista de gastos: arriba qué y cuánto; abajo cuándo, categoría y los botones */
export function itemGasto(g,cuando){
  var c=catDe(g);
  return '<li><div class="gi-main"><i class="dot" style="background:'+catColor(c)+'"></i><span class="gi-nota">'+(g.nota?esc(g.nota):'<span class="muted">Sin detalle</span>')+'</span><span class="amt">'+money(g.monto)+'</span></div>'
    +'<div class="gi-sub"><span class="src">'+esc(cuando)+' · '+esc(c)+(g.src==='brou'?' · del extracto':g.src==='voz'?' · por voz':'')+'</span>'
    +'<span class="gbtns"><button class="btn quiet sm" type="button" data-editg="'+esc(g.id)+'" aria-label="Editar gasto">Editar</button><button class="btn quiet sm" type="button" data-delg="'+esc(g.id)+'" aria-label="Borrar gasto">Borrar</button></span></div></li>';
}
