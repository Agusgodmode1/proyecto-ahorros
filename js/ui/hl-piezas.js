/* Las piezas del libro (2.66): lo mismo en todas las páginas (Hoy, el prólogo, Ajustes).
   Solo arman el texto de la hoja; los trazos (subrayado, óvalo, renglón) los pone ui/hoy-libro.js al armar la página. */
export function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
/* un botón: una palabra escrita y subrayada. o.a = qué hace (data-a), o.v = un valor; o.p = aprieta un botón de siempre;
   o.ex = un control de la página de siempre (ui/hl-espejo.js) */
export function b(txt,o,clase){o=o||{};return '<button class="hl-toc hl-sub'+(clase?' '+clase:'')+'" type="button"'+(o.a?' data-a="'+e(o.a)+'"':'')+(o.v!=null?' data-v="'+e(o.v)+'"':'')+(o.p?' data-p="'+e(o.p)+'"':'')+(o.ex!=null?' data-ex="'+o.ex+'"':'')+(o.lab?' aria-label="'+e(o.lab)+'"':'')+(o.off?' disabled':'')+'>'+e(txt)+'</button>'}
export function puntos(l){return l.filter(Boolean).join('<span class="hl-pt" aria-hidden="true">·</span>')}
/* elegir entre opciones: palabras separadas por «·»; la elegida, rodeada con un óvalo de tinta */
export function opciones(nombre,etiqueta,lista,elegido,extra){
  return '<p class="hl-opciones hl-nota" role="radiogroup" aria-label="'+e(etiqueta)+'">'+puntos(lista.map(function(o){
    return '<button class="hl-toc hl-op" type="button" role="radio" aria-checked="'+(String(o[0])===String(elegido))+'" data-op="'+e(nombre)+'" data-v="'+e(o[0])+'"'+(extra?' '+extra(o):'')+'>'+e(o[1])+'</button>'}))+'</p>';
}
/* un renglón para escribir (letra de 16 px o más). num_: 'UYU' o 'USD' (con su signo), 'num' (solo números), 'clave' (oculta) */
export function renglon(id,etiqueta,valor,num_,clase,ph,extra){
  var signo=num_==='UYU'||num_==='USD',numero=signo||num_==='num'||num_==='clave';
  return '<label class="hl-campo'+(clase?' '+clase:'')+'" for="'+id+'"><span class="hl-oculto">'+e(etiqueta)+'</span>'+(signo?'<span class="hl-signo" aria-hidden="true">'+(num_==='USD'?'US$':'$')+'</span>':'')
    +'<input id="'+id+'" class="hl-input'+(numero?' hl-num':'')+'" type="'+(num_==='clave'?'password':'text')+'" '+(numero?'inputmode="'+(num_==='clave'?'numeric':'decimal')+'"':'inputmode="text" autocapitalize="sentences"')+' enterkeyhint="done" autocomplete="off" spellcheck="false"'+(ph?' placeholder="'+e(ph)+'"':'')+(extra?' '+extra:'')+' value="'+e(valor==null?'':valor)+'">'
    +'</label>';
}
