/* Anotar, editar y borrar gastos. Lo usan Semanas y Plan.
   La categoría se sugiere sola a partir de la nota (el mismo clasificador que la voz) y aprende si la corregís. */
import {categoriaGasto,aprender} from '../logica/voz.js';
import {num,uid} from '../logica/util.js';
import {cotizacion,gastoUSD,aPesos} from '../logica/monedas.js';
import {frecuentes} from '../logica/frecuentes.js';
import {ctx,$,esc,money,usd,toastAccion,toast,fCorta,today,cap,fLarga,colorCat} from './comun.js';
import {parse,addDays,iso,DIA} from '../logica/fechas.js';
import {nombresVisibles,nombreDe,colorDe} from '../logica/categorias.js';
import {disponible} from '../logica/saldo.js';

/* La categoría que sugiere la nota, ya pasada a tu lista de categorías */
export function sugerir(nota){var st=ctx.state;return nombreDe(st,categoriaGasto(nota||'',st&&st.voz.cats))}
/* Categoría de un gasto: la guardada o, en gastos viejos sin categoría, la que sale de la nota. */
export function catDe(g){return g.cat||sugerir(g.nota)}
export function catColor(c){return colorCat(colorDe(ctx.state,c))}
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

/* Un gasto real siempre se anota (es un hecho, aunque no "entre" en lo disponible).
   Después de guardarlo: si te dejó en negativo, avisa y ofrece "Actualizar saldo"; si no, ofrece "Deshacer". */
export function avisoAnotado(id,texto){
  var st=ctx.state,d=num(st.plan.monto)>0?disponible(st):0;
  if(num(st.plan.monto)>0&&d<-0.5){
    toastAccion('Anotado. Gastaste '+money(-d)+' más de la plata que tenías anotada.','Actualizar saldo',function(){ctx.abrirSaldo()});
    return;
  }
  toastAccion(texto,'Deshacer',function(){
    ctx.state.gastos=ctx.state.gastos.filter(function(g){return g.id!==id});ctx.persist();ctx.renderAll();
  });
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
  avisoAnotado(id,'Anotado: '+(x.usd?usd(x.usd):money(d.monto))+' en '+x.nota);
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
    +'<div class="gi-sub"><span class="src">'+esc(cuando)+' · '+esc(c)+(g.src==='brou'?' · del extracto':g.src==='voz'?' · por voz':g.src==='ajuste'?' · ajuste de saldo':'')+'</span>'
    +'<span class="gbtns"><button class="btn quiet sm" type="button" data-editg="'+esc(g.id)+'" aria-label="Editar gasto">Editar</button><button class="btn quiet sm" type="button" data-delg="'+esc(g.id)+'" aria-label="Borrar gasto">Borrar</button></span></div></li>';
}

/* Renglón de una línea (Semanas): qué · día · monto, con corregir y borrar (borrar ofrece «Deshacer») */
var LAPIZ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M13.5 6.5l4 4"/></svg>';
var TACHO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
export function renglonGasto(g){
  var c=catDe(g),d=parse(g.fecha),qué=g.nota?esc(g.nota):'<span class="muted">Sin detalle</span>';
  /* todo el renglón se toca para corregir; al lado, borrar */
  return '<li class="gl1"><button class="gl-e" type="button" data-editg="'+esc(g.id)+'" aria-label="Corregir: '+esc((g.nota||'sin detalle')+', '+DIA[d.getDay()]+' '+d.getDate()+', '+money(g.monto))+'">'
    +'<i class="dot" style="background:'+catColor(c)+'"></i><span class="gl-q">'+qué+'</span><span class="gl-d">'+DIA[d.getDay()]+' '+d.getDate()+'</span>'
    +'<b class="amt">'+money(g.monto)+'</b>'+LAPIZ+'</button>'
    +'<button class="gl-b" type="button" data-delg="'+esc(g.id)+'" aria-label="Borrar '+esc(g.nota||'el gasto')+'">'+TACHO+'</button></li>';
}

/* ---------- La hoja para anotar (o corregir) un gasto: la misma desde Hoy y desde cada semana ----------
   o = {fechas:[[iso,texto]] (los días que se pueden elegir), fecha (la elegida), gasto (si se corrige), titulo} */
var hojaEdit=null;
function diasRecientes(){var t=today(),ay=iso(addDays(parse(t),-1)),an=iso(addDays(parse(t),-2));return [[t,'Hoy'],[ay,'Ayer'],[an,'Anteayer, '+fCorta(an)]]}
/* Los días de una semana que ya pasaron o son hoy (los de más adelante no se pueden elegir) */
export function diasHasta(inicio,fin){
  var t=today(),ay=iso(addDays(parse(t),-1)),r=[];
  for(var d=parse(inicio),k=0;k<14;k++,d=addDays(d,1)){var x=iso(d);if(x>fin||x>t)break;r.push([x,x===t?'Hoy':x===ay?'Ayer, '+fLarga(x):cap(fLarga(x))])}
  return r;
}
export function abrirHojaGasto(o){
  var s=$('#gasto-sheet'),b=$('#gasto-box');if(!s||!b)return;
  o=o||{};var g=o.gasto||null,fechas=o.fechas&&o.fechas.length?o.fechas:diasRecientes();
  if(g&&!fechas.some(function(f){return f[0]===g.fecha}))fechas=[[g.fecha,cap(fLarga(g.fecha))]].concat(fechas);
  hojaEdit=g?g.id:null;
  b.innerHTML='<div class="sheet-top"><h2 id="gs-t">'+esc(g?'Corregir el gasto':o.titulo||'Anotar un gasto')+'</h2><button class="btn quiet" type="button" id="gasto-x">Cerrar</button></div>'
    +(g?'':chipsFrecuentes('q'))
    +formGasto('q',{fecha:g?g.fecha:o.fecha||fechas[0][0],fechas:fechas,gasto:g,boton:g?'Guardar cambios':'Anotar'});
  s.hidden=false;document.documentElement.classList.add('hoja');
  /* En iPhone el teclado solo aparece si el foco se pone en el mismo toque (sin esperar) */
  var m=$('#q-monto');if(m)try{m.focus({preventScroll:true});if(g)m.select()}catch(e){m.focus()}
}
export function cerrarHojaGasto(){var s=$('#gasto-sheet');if(s)s.hidden=true;hojaEdit=null;document.documentElement.classList.remove('hoja')}
export function initHojaGasto(){
  var s=$('#gasto-sheet');if(!s)return;
  initFormsGasto(s);
  s.addEventListener('click',function(e){
    if(e.target===s||e.target.closest('#gasto-x')||e.target.closest('[data-gcancel="q"]')){cerrarHojaGasto();return}
    var fr=e.target.closest('[data-frec]');if(fr){var fe=$('#q-fecha');anotarFrecuente(Number(fr.getAttribute('data-frec')),fe?fe.value:today());cerrarHojaGasto();return}
  });
  s.addEventListener('submit',function(e){
    if(!e.target.getAttribute||e.target.getAttribute('data-gform')!=='q')return;
    e.preventDefault();
    var d=leerForm(e.target);if(!d)return;
    var era=hojaEdit,id=guardarGasto(d,era);
    cerrarHojaGasto();ctx.renderAll();
    if(era){toast('Listo: corregido');return}
    var li=document.querySelector('#hoy-out [data-delg="'+id+'"],#p-semana [data-delg="'+id+'"]');if(li&&li.closest('li'))li.closest('li').classList.add('tinta-nueva');
    avisoAnotado(id,'Anotado: '+money(d.monto)+(d.nota?' en '+d.nota:''));
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!s.hidden)cerrarHojaGasto()});
}
