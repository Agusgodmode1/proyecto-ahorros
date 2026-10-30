/* Notas al margen de Hoy (2.15): una sola a la vista. Primero lo que conviene saber ya («ojo»), después que son
   datos de ejemplo, quién te debe o la plata que te entró (2.30), la Tarjeta, el ritmo, el respaldo y los feriados. Si hay más de una,
   abajo dice «nota 1 de 3» con ‹ › para pasar. Cada aviso se sigue armando donde siempre; acá solo se ordenan. */
var LUGARES=['#superv','#pasar-aviso','#repaso-aviso','#entradas','#tarjeta-aviso','#resp-aviso','#ritmo-aviso','#fer-aviso','#hoy-out','#resumen-out'];
var idx=0,firma='';

function peso(b){
  if(b.classList.contains('alerta'))return 0;
  if(b.querySelector('[data-cero]'))return 1;
  if(b.classList.contains('deudas')||b.classList.contains('entrada')||b.closest('#pasar-aviso')||b.closest('#repaso-aviso'))return 2;
  if(b.closest('#tarjeta-aviso'))return 3;
  if(b.closest('#ritmo-aviso'))return 4;
  if(b.closest('#resp-aviso'))return 5;
  return 6;
}
function notas(){
  var raiz=document.getElementById('p-resumen'),l=[];if(!raiz)return l;
  LUGARES.forEach(function(s){var c=raiz.querySelector(s);if(c)[].forEach.call(c.children,function(b){if(b.classList.contains('banner'))l.push(b)})});
  return l.map(function(b,i){return {b:b,p:peso(b),i:i}}).sort(function(a,b){return a.p-b.p||a.i-b.i}).map(function(x){return x.b});
}
export function agruparNotas(){
  var l=notas(),n=l.length;
  document.querySelectorAll('#p-resumen .nota-pag').forEach(function(x){x.remove()});
  var f=l.map(function(b){return b.textContent.slice(0,48)}).join('|');
  if(f!==firma){firma=f;idx=0}
  if(idx>=n)idx=0;
  l.forEach(function(b,i){b.hidden=n>1&&i!==idx});
  if(n>1){
    var pag=document.createElement('div');pag.className='nota-pag';
    pag.innerHTML='<button type="button" data-nota="-1" aria-label="Nota anterior">‹</button><span aria-live="polite">nota '+(idx+1)+' de '+n+'</span><button type="button" data-nota="1" aria-label="Nota siguiente">›</button>';
    l[idx].appendChild(pag);
  }
}
export function initNotas(){
  var raiz=document.getElementById('p-resumen');if(!raiz)return;
  /* cada vez que aparece o se va un aviso (también los que llegan después, como el de la Tarjeta), se reordena */
  var t=null,mo=new MutationObserver(function(){clearTimeout(t);t=setTimeout(agruparNotas,0)});
  LUGARES.forEach(function(s){var c=raiz.querySelector(s);if(c)mo.observe(c,{childList:true})});
  raiz.addEventListener('click',function(e){
    var b=e.target.closest('[data-nota]');if(!b)return;
    var n=notas().length;if(!n)return;
    idx=(idx+Number(b.getAttribute('data-nota'))+n)%n;agruparNotas();
    var nb=document.querySelector('#p-resumen .nota-pag [data-nota="'+b.getAttribute('data-nota')+'"]');if(nb)try{nb.focus({preventScroll:true})}catch(x){}
  });
}
