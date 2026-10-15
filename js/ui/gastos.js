/* Anotar, editar y borrar gastos. Lo usan Semanas y Plan.
   La categoría se sugiere sola a partir de la nota (el mismo clasificador que la voz) y aprende si la corregís. */
import {categoriaGasto,aprender} from '../logica/voz.js';
import {num,uid} from '../logica/util.js';
import {cotizacion,gastoUSD,aPesos} from '../logica/monedas.js';
import {frecuentes} from '../logica/frecuentes.js';
import {ctx,esc,money,usd,toastAccion,toast,fCorta,today} from './comun.js';
import {nombresVisibles,nombreDe,colorDe} from '../logica/categorias.js';

/* La categoría que sugiere la nota, ya pasada a tu lista de categorías */
export function sugerir(nota){var st=ctx.state;return nombreDe(st,categoriaGasto(nota||'',st&&st.voz.cats))}
/* Categoría de un gasto: la guardada o, en gastos viejos sin categoría, la que sale de la nota. */
export function catDe(g){return g.cat||sugerir(g.nota)}
export function catColor(c){return colorDe(ctx.state,c)}
/* Opciones del selector: tus categorías visibles (y la del gasto, si la ocultaste después) */
function opcionesCat(actual){var l=nombresVisibles(ctx.state);if(actual&&l.indexOf(actual)<0)l=l.concat([actual]);return l}

/* Formulario. p = prefijo de ids; o = {fechas:[[iso,texto]], fecha, gasto (si se edita), boton} */
export function formGasto(p,o){
  var g=o.gasto||{},cat=g.id?catDe(g):sugerir(''),enUSD=!!g.usd;
  /* La moneda se cambia tocando el símbolo: $ ↔ US$ */
  var h='<form class="gform" data-gform="'+p+'" data-moneda="'+(enUSD?'USD':'UYU')+'"'+(g.cotiz?' data-cotiz="'+esc(g.cotiz)+'"':'')+' autocomplete="off">'
    +'<div class="field f-monto"><label for="'+p+'-monto" class="sub-l">¿Cuánto?</label><div class="money"><button type="button" class="mon-btn" data-mon aria-label="Cambiar moneda: ahora en '+(enUSD?'dólares':'pesos')+'">'+(enUSD?'US$':'$')+'</button><input id="'+p+'-monto" type="number" inputmode="decimal" min="0" step="any" required value="'+(g.id?esc(enUSD?g.usd:g.monto):'')+'"></div><small class="usd-nota" data-usdnota></small></div>'
    +'<div class="field f-cat"><label for="'+p+'-cat" class="sub-l">Categoría</label><select id="'+p+'-cat" data-sugerida="'+esc(cat)+'"'+(g.id?' data-tocada="1"':'')+'>'+opcionesCat(cat).map(function(c){return '<option'+(c===cat?' selected':'')+'>'+esc(c)+'</option>'}).join('')+'</select></div>'
    +'<div class="field f-nota"><label for="'+p+'-nota" class="sub-l">¿En qué?</label><input id="'+p+'-nota" type="text" maxlength="60" placeholder="almuerzo, boleto, súper" value="'+esc(g.nota||'')+'"></div>';
  if(o.fechas&&o.fechas.length)h+='<div class="field f-fecha"><label for="'+p+'-fecha" class="sub-l">¿Qué día?</label><select id="'+p+'-fecha">'+o.fechas.map(function(f){return '<option value="'+f[0]+'"'+(f[0]===(g.fecha||o.fecha)?' selected':'')+'>'+esc(f[1])+'</option>'}).join('')+'</select></div>';
  else h+='<input type="hidden" id="'+p+'-fecha" value="'+esc(g.fecha||o.fecha)+'">';
  h+='<div class="row-btns f-btn"><button class="btn primary" type="submit">'+esc(o.boton||(g.id?'Guardar cambios':'Anotar'))+'</button>'
    +(g.id?'<button class="btn quiet" type="button" data-gcancel="'+p+'">Cancelar</button>':'')+'</div></form>';
  return h;
}

/* Debajo del monto en dólares: cuánto es en pesos con la cotización */
function notaUSD(f){
  var el=f.querySelector('[data-usdnota]');if(!el)return;
  if(f.getAttribute('data-moneda')!=='USD'){el.textContent='';return}
  var p=f.getAttribute('data-gform'),cot=num(f.getAttribute('data-cotiz'))||cotizacion(ctx.state),m=num(f.querySelector('#'+p+'-monto').value);
  if(!cot){el.innerHTML='Cargá la cotización del dólar en <button class="linklike" type="button" data-goto="ajustes">Ajustes</button>.';return}
  el.textContent=(m>0?'= '+money(aPesos(m,cot))+' · ':'')+'dólar a '+String(cot).replace('.',',')+(ctx.state.monedas.fecha&&!f.getAttribute('data-cotiz')?' ('+fCorta(ctx.state.monedas.fecha)+')':'');
}
/* Mientras escribís la nota, la categoría se sugiere sola (si no la elegiste a mano). */
export function initFormsGasto(raiz){
  raiz.addEventListener('click',function(e){
    var b=e.target.closest('[data-mon]');if(!b)return;
    var f=b.closest('[data-gform]'),u=f.getAttribute('data-moneda')!=='USD';
    f.setAttribute('data-moneda',u?'USD':'UYU');b.textContent=u?'US$':'$';b.setAttribute('aria-label','Cambiar moneda: ahora en '+(u?'dólares':'pesos'));
    notaUSD(f);var p=f.getAttribute('data-gform'),m=f.querySelector('#'+p+'-monto');if(m)m.focus();
  });
  raiz.addEventListener('input',function(e){
    var f=e.target.closest('[data-gform]');if(!f)return;
    var p=f.getAttribute('data-gform');
    if(e.target.id===p+'-monto'){notaUSD(f);return}
    if(e.target.id!==p+'-nota')return;
    var sel=f.querySelector('#'+p+'-cat');if(!sel||sel.getAttribute('data-tocada')==='1')return;
    var c=sugerir(e.target.value);
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
  var sel=q('cat'),d={monto:Math.round(m*100)/100,nota:q('nota').value.trim().slice(0,60),cat:sel.value,sugerida:sugerir(q('nota').value),fecha:q('fecha').value};
  if(f.getAttribute('data-moneda')==='USD'){
    /* Un gasto que ya estaba en dólares conserva su cotización; uno nuevo usa la de hoy */
    var cot=num(f.getAttribute('data-cotiz'))||cotizacion(ctx.state);
    if(!cot){toast('Primero cargá la cotización del dólar en Ajustes');return null}
    Object.assign(d,gastoUSD(m,cot));
  }
  return d;
}

/* Guarda un gasto nuevo o cambia uno existente. Si corregiste la categoría, la app la aprende. */
export function guardarGasto(d,editId){
  var st=ctx.state;
  if(d.nota&&d.cat!==d.sugerida)aprender(st.voz.cats,d.nota,d.cat);
  var id=editId||uid();
  if(editId){
    st.gastos.forEach(function(g){if(g.id===editId){g.monto=d.monto;g.nota=d.nota;g.cat=d.cat;g.fecha=d.fecha;
      if(d.usd){g.usd=d.usd;g.cotiz=d.cotiz}else{delete g.usd;delete g.cotiz}}});
  }else{var g={id:id,fecha:d.fecha,monto:d.monto,nota:d.nota,cat:d.cat};if(d.usd){g.usd=d.usd;g.cotiz=d.cotiz}st.gastos.push(g)}
  ctx.persist();
  return id;
}

/* ---------- Gastos frecuentes: un toque y queda anotado ---------- */
export function chipsFrecuentes(p){
  var f=frecuentes(ctx.state.gastos,today(),4);
  if(!f.length)return '';
  return '<div class="frec" role="group" aria-label="Gastos frecuentes"><span class="sub-l">Con un toque</span><div class="frec-b">'
    +f.map(function(x,i){return '<button class="chip-g" type="button" data-frec="'+i+'" data-frecp="'+p+'"><b>'+esc(x.nota)+'</b><span>'+(x.usd?usd(x.usd):money(x.monto))+'</span></button>'}).join('')+'</div></div>';
}
/* Anota el frecuente número i en la fecha dada y ofrece "Deshacer" */
export function anotarFrecuente(i,fecha){
  var x=frecuentes(ctx.state.gastos,today(),4)[i];if(!x)return;
  var d={nota:x.nota,cat:x.cat||sugerir(x.nota),fecha:fecha||today()};d.sugerida=d.cat;
  if(x.usd){var cot=cotizacion(ctx.state);if(!cot){toast('Primero cargá la cotización del dólar en Ajustes');return}Object.assign(d,gastoUSD(x.usd,cot))}
  else d.monto=x.monto;
  var id=guardarGasto(d,null);ctx.renderAll();
  toastAccion('Anotado: '+(x.usd?usd(x.usd):money(d.monto))+' en '+x.nota,'Deshacer',function(){
    ctx.state.gastos=ctx.state.gastos.filter(function(g){return g.id!==id});ctx.persist();ctx.renderAll();
  });
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
  return '<li><div class="gi-main"><i class="dot" style="background:'+catColor(c)+'"></i><span class="gi-nota">'+(g.nota?esc(g.nota):'<span class="muted">Sin detalle</span>')+'</span><span class="amt">'+money(g.monto)+(g.usd?'<small class="amt-usd">'+usd(g.usd)+'</small>':'')+'</span></div>'
    +'<div class="gi-sub"><span class="src">'+esc(cuando)+' · '+esc(c)+(g.src==='brou'?' · del extracto':g.src==='voz'?' · por voz':'')+'</span>'
    +'<span class="gbtns"><button class="btn quiet sm" type="button" data-editg="'+esc(g.id)+'" aria-label="Editar gasto">Editar</button><button class="btn quiet sm" type="button" data-delg="'+esc(g.id)+'" aria-label="Borrar gasto">Borrar</button></span></div></li>';
}
