/* PIN opcional de 4 dígitos (puro; usa WebCrypto, que existe en el navegador y en Node).
   Nunca se guarda el PIN: solo {sal, hash} con hash = SHA-256(sal + ':' + pin), en este aparato. */
export var MIN_BLOQUEO=5*60*1000;   /* se vuelve a pedir después de 5 minutos en segundo plano */

function hex(buf){return Array.prototype.map.call(new Uint8Array(buf),function(b){return (b<16?'0':'')+b.toString(16)}).join('')}
export function pinValido(pin){return /^\d{4}$/.test(String(pin||''))}
export function nuevaSal(){var a=new Uint8Array(16);globalThis.crypto.getRandomValues(a);return hex(a)}
export async function hashPin(pin,sal){
  var datos=new TextEncoder().encode(String(sal)+':'+String(pin));
  return hex(await globalThis.crypto.subtle.digest('SHA-256',datos));
}
export async function crearPin(pin,sal){
  if(!pinValido(pin))throw new Error('El PIN tiene que ser de 4 números.');
  sal=sal||nuevaSal();
  return {v:1,sal:sal,hash:await hashPin(pin,sal)};
}
/* Compara sin cortar en el primer carácter distinto */
export async function verificarPin(pin,guardado){
  if(!guardado||!pinValido(pin))return false;
  var h=await hashPin(pin,guardado.sal),d=h.length^guardado.hash.length;
  for(var i=0;i<h.length;i++)d|=h.charCodeAt(i)^(guardado.hash.charCodeAt(i)||0);
  return d===0;
}
/* ¿Hay que pedirlo al volver? */
export function hayQuePedir(ocultaDesde,ahora){return ocultaDesde!==null&&ocultaDesde!==undefined&&ahora-ocultaDesde>=MIN_BLOQUEO}
/* Después de 5 intentos mal, esperar: 30 s, y el doble cada 5 intentos más */
export function esperaTras(fallos){return fallos<5?0:30000*Math.pow(2,Math.floor((fallos-5)/5))}
