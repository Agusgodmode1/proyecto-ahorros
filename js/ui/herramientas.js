/* Herramientas sueltas en pantalla (2.26): la lista (con su ícono de línea) que se ve en «¿Qué querés hacer?»,
   en la invitación de Hoy, Semanas y Logros cuando todavía no hay pacto y en el índice. Las cuentas: logica/herramientas.js. */
import {HERRAMIENTAS,herramienta} from '../logica/herramientas.js';
import {ctx,$,esc,abrirDetalle} from './comun.js';

var IC={
  sueldo:'<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 7h8M8 11h2M12 11h0M16 11h0M8 15h2M12 15h0M16 15h0M8 18.5h8"/>',
  recibo:'<path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21Z"/><path d="m9 11 2 2 4-4"/><path d="M9 16.5h6"/>',
  dividir:'<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M3 20c0-3 2.2-5 5-5s5 2 5 5M11 20c0-3 2.2-5 5-5s5 2 5 5"/>',
  extracto:'<rect x="3" y="5" width="15" height="11" rx="2"/><path d="M3 9h15"/><circle cx="17" cy="16" r="3.5"/><path d="m19.5 18.5 2 2"/>'
};
export function iconoHerr(id){
  return '<svg class="herr-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(IC[id]||'')+'</svg>';
}
/* La lista: un botón por herramienta (attr = 'data-lb="herr"' en el libro, 'data-herr' en la app) */
export function listaHerrHTML(cls,attr){
  return '<ul class="herr-l '+(cls||'')+'">'+HERRAMIENTAS.map(function(h){
    return '<li><button type="button" '+attr+' data-h="'+h.id+'">'+iconoHerr(h.id)+'<span><b>'+esc(h.t)+'</b><small>'+esc(h.d)+'</small></span><i aria-hidden="true">›</i></button></li>';
  }).join('')+'</ul>';
}
/* Ir a la herramienta: su capítulo y, ya dibujado, la parte que importa (abierta si es un desplegable) */
export function mostrarHerramienta(id){
  var h=herramienta(id);if(!h)return;
  var el=$(h.ancla);if(!el||el.hidden||el.offsetParent===null)return;
  abrirDetalle(el);
  try{el.scrollIntoView({block:'start',behavior:'smooth'})}catch(e){el.scrollIntoView()}
}
export function irHerramienta(id,alLlegar){
  var h=herramienta(id);if(!h)return;
  ctx.go(h.tab);
  setTimeout(function(){mostrarHerramienta(id);if(alLlegar)alLlegar()},ctx.tab===h.tab?650:50);
}
