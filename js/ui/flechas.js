/* Flechas para pasar de página (2.14, pedido de Agus): dos puntas de papel discretas en los bordes de la pantalla,
   siempre a mano en el teléfono (en la compu ya están las flechas grandes del pie). Deslizar sigue andando igual.
   - En los capítulos: la página anterior y la siguiente (desde Hoy hacia atrás, el pacto).
   - En el prólogo: las mismas que «‹ Atrás» y «Seguir»; desde la primera página hacia atrás, la tapa cerrada.
   - En la tapa: la de adelante abre el libro.
   Van afuera de #hoja (un transform en un padre las movería). Se esconden con el teclado, con una hoja abierta
   y mientras escribís o editás; mientras bajás por la página se ven más tenues. */
var o=null,el=null,ant=null,sig=null,quieta=null;

function visible(x){return x&&!x.hidden}
function pagLibro(){return document.querySelector('#lb-pila .lb-pag:last-child')}
/* Qué hace cada punta ahora: {fn, nombre} o null */
function destinos(){
  var libro=document.getElementById('libro'),hojas=document.getElementById('lb-hojas');
  if(visible(libro)){
    var t=libro.querySelector('.lb-libro');
    return {ant:null,sig:t&&!libro.querySelector('.lb-imp:not([hidden])')?{fn:function(){t.click()},nombre:'Abrir el libro'}:null};
  }
  if(visible(hojas)){
    var p=pagLibro();if(!p)return {ant:null,sig:null};
    var a=p.querySelector('[data-lb="atras"]'),s=p.querySelector('[data-lb="sig"]')||p.querySelector('[data-lb="cerrar-libro"]');
    return {ant:a?{fn:function(){a.click()},nombre:a.getAttribute('aria-label')||a.textContent.trim()}:null,
      sig:s?{fn:function(){s.click()},nombre:s.textContent.replace('›','').trim()}:null};
  }
  var d=o.capitulos();
  return {ant:d.ant?{fn:function(){o.ir(d.ant)},nombre:'Página anterior: '+d.antNom}:null,sig:d.sig?{fn:function(){o.ir(d.sig)},nombre:'Página siguiente: '+d.sigNom}:null};
}
export function actualizarFlechas(){
  if(!el)return;
  var d=destinos();
  ant.hidden=!d.ant;sig.hidden=!d.sig;
  if(d.ant)ant.setAttribute('aria-label',d.ant.nombre);
  if(d.sig)sig.setAttribute('aria-label',d.sig.nombre);
}
/* opt: {capitulos() → {ant, sig, antNom, sigNom}, ir(destino)} */
export function initFlechas(opt){
  o=opt;el=document.getElementById('flechas');if(!el)return;
  ant=el.querySelector('.fl-ant');sig=el.querySelector('.fl-sig');
  el.addEventListener('click',function(e){
    var b=e.target.closest('.fl');if(!b)return;
    var d=destinos(),x=b===ant?d.ant:d.sig;
    if(x)x.fn();
    setTimeout(actualizarFlechas,0);
  });
  /* el prólogo y la tapa cambian solos: se miran sus cambios */
  var mo=new MutationObserver(function(){clearTimeout(quieta);quieta=setTimeout(actualizarFlechas,30)});
  ['libro','lb-hojas'].forEach(function(id){var x=document.getElementById(id);if(x)mo.observe(x,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true})});
  /* mientras bajás por la página, más tenues; con un campo abierto (teclado), escondidas */
  var t=null,raiz=document.documentElement;
  window.addEventListener('scroll',function(){raiz.classList.add('fl-mueve');clearTimeout(t);t=setTimeout(function(){raiz.classList.remove('fl-mueve')},450)},{passive:true});
  document.addEventListener('focusin',function(e){if(e.target.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,select'))raiz.classList.add('fl-escribe')});
  document.addEventListener('focusout',function(){setTimeout(function(){var a=document.activeElement;if(!a||!a.matches('input,textarea,select'))raiz.classList.remove('fl-escribe')},60)});
  actualizarFlechas();
}
