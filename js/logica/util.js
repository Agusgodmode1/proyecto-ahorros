/* Utilidades chicas compartidas (puro). */
export function num(v){var n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:0}
export function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

/* Campos de números (2.16.4): el navegador deja escribir «e» (notación científica: 1e5 = 100000), «+» y «-».
   charNoPermitido dice si un texto que se escribe en un campo numérico tiene algo de eso
   («-» solo cuenta si el campo no admite negativos). limpiarNumero deja el número listo para el campo (sin letras ni signos, con punto decimal). */
export function charNoPermitido(txt,negativos){return negativos?/[eE+]/.test(txt||''):/[eE+\-]/.test(txt||'')}
export function limpiarNumero(txt,negativos){var t=String(txt||'');var neg=negativos&&/^\s*-/.test(t);t=t.replace(/[^0-9.,]/g,'');
  /* formato uruguayo: 1.500,50 → 1500.50; 1.500 → 1500 */
  if(t.indexOf(',')>=0)t=t.replace(/\./g,'').replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(t))t=t.replace(/\./g,'');
  return (neg?'-':'')+t}
