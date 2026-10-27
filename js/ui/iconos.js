/* Íconos de las categorías (2.15): dibujados en línea, en tinta, como el resto del libro. Lo guardado sigue siendo
   el emoji (state.categorias[].icono); acá cada emoji conocido se dibuja con su ícono. Uno desconocido se muestra tal cual. */
import {esc} from './comun.js';

var D={
  '\u{1F6D2}':'<path d="M3 4h2.2l2.3 10.3c.2.7.8 1.2 1.5 1.2h7.6c.7 0 1.3-.5 1.5-1.1L20 8H6.3"/><circle cx="9.5" cy="19.3" r="1.3"/><circle cx="16.5" cy="19.3" r="1.3"/>',
  '\u{1F354}':'<path d="M4.5 10.5c0-4 3.5-6 7.5-6s7.5 2 7.5 6Z"/><path d="M3.5 13.5h17"/><path d="M5 16.5h14v.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 17Z"/>',
  '\u{1F3EA}':'<path d="M3.5 9.5 5 4.5h14l1.5 5Z"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/>',
  '\u{1F68C}':'<rect x="5" y="3.5" width="14" height="14" rx="2.5"/><path d="M5 11h14M8 17.5V20M16 17.5V20M9 6.5h6"/><circle cx="8.5" cy="14.3" r=".6"/><circle cx="15.5" cy="14.3" r=".6"/>',
  '\u{1F4FA}':'<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M8.5 3 12 7l3.5-4"/>',
  '\u{1F3AE}':'<path d="M7 8h10a4 4 0 0 1 4 4.5l-.5 3a2.5 2.5 0 0 1-4.4 1.2L14.5 15h-5l-1.6 1.7a2.5 2.5 0 0 1-4.4-1.2l-.5-3A4 4 0 0 1 7 8Z"/><path d="M8 10.8v3M6.5 12.3h3"/><circle cx="15.5" cy="11.5" r=".6"/><circle cx="17" cy="13.3" r=".6"/>',
  '\u{1F4C8}':'<path d="M4 4v16h16"/><path d="m7.5 15 4-4 3 3 5-6"/>',
  '\u{1F4A1}':'<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/>',
  '\u{1F48A}':'<g transform="rotate(-45 12 12)"><rect x="4" y="8.5" width="16" height="7" rx="3.5"/><path d="M12 8.5v7"/></g>',
  '\u{1F4E6}':'<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  '\u{1F3E7}':'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5v5M17.5 9.5v5"/>',
  '\u{1F9FE}':'<path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21Z"/><path d="M9 8h6M9 12h6M9 16h3.5"/>',
  '\u{1F3E0}':'<path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  '\u{1F455}':'<path d="m8 3.5-4.5 3 2 4 2-1v11h9v-11l2 1 2-4-4.5-3c-.7 1.6-2.2 2.5-4 2.5S8.7 5.1 8 3.5Z"/>',
  '\u{1F381}':'<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12"/><path d="M12 8c-2-4-5.5-3-4-.5.6.9 2.3.5 4 .5Zm0 0c2-4 5.5-3 4-.5-.6.9-2.3.5-4 .5Z"/>',
  '✈️':'<path d="M21 15.5v-2l-8-5V4a1 1 0 0 0-2 0v4.5l-8 5v2l8-2.5V18l-2 1.5V21l3-1 3 1v-1.5L13 18v-5Z"/>',
  '\u{1F43E}':'<circle cx="6.5" cy="10" r="1.7"/><circle cx="10" cy="6.3" r="1.7"/><circle cx="14" cy="6.3" r="1.7"/><circle cx="17.5" cy="10" r="1.7"/><path d="M12 11.5c-2.5 0-5 3.5-5 5.5s1.6 3 5 3 5-1 5-3-2.5-5.5-5-5.5Z"/>',
  '\u{1F4DA}':'<path d="M4 4h4v16H4ZM8 4h4v16H8Z"/><path d="m13.5 5.2 3.9-1 4 15.5-3.9 1Z"/>',
  '☕':'<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5c-.8 1 .8 2-.1 3M12 3.5c-.8 1 .8 2-.1 3"/>',
  '\u{1F37A}':'<path d="M6 8h10v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z"/><path d="M16 10.5h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><path d="M6 8a2.5 2.5 0 0 1 3-3 3 3 0 0 1 5 0 2.5 2.5 0 0 1 2 3"/><path d="M9.5 12v5.5M12.5 12v5.5"/>',
  '\u{1F488}':'<circle cx="6.5" cy="6.5" r="2.5"/><circle cx="6.5" cy="17.5" r="2.5"/><path d="M8.6 8 20 18M8.6 16 20 6"/>',
  '\u{1F3AC}':'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18M16 3v18M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4"/>',
  '⚽':'<circle cx="12" cy="12" r="8.5"/><path d="m12 8.5 3 2.2-1.1 3.6h-3.8L9 10.7Z"/><path d="M12 8.5V3.5M15 10.7l4.5-1.5M13.9 14.3l2.6 3.9M10.1 14.3l-2.6 3.9M9 10.7 4.5 9.2"/>',
  '•':'<circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/>'
};
/* El ícono de un emoji: SVG en tinta (currentColor) si es uno de los nuestros; si no, el emoji */
export function icono(e){
  var p=D[e];
  if(!p)return e?'<span class="ic-emoji">'+esc(e)+'</span>':'';
  return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
}
export function tieneIcono(e){return !!D[e]}
var NOM={'\u{1F6D2}':'carrito','\u{1F354}':'comida','\u{1F3EA}':'almacén','\u{1F68C}':'ómnibus','\u{1F4FA}':'pantalla','\u{1F3AE}':'juegos','\u{1F4C8}':'gráfico','\u{1F4A1}':'lamparita',
  '\u{1F48A}':'remedio','\u{1F4E6}':'paquete','\u{1F3E7}':'efectivo','\u{1F9FE}':'ticket','\u{1F3E0}':'casa','\u{1F455}':'ropa','\u{1F381}':'regalo','\u2708\uFE0F':'avión',
  '\u{1F43E}':'mascota','\u{1F4DA}':'libros','\u2615':'café','\u{1F37A}':'cerveza','\u{1F488}':'tijera','\u{1F3AC}':'cine','\u26BD':'pelota','\u2022':'punto'};
export function nombreIcono(e){return NOM[e]||'ícono'}
