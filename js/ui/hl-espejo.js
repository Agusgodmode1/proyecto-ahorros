/* El espejo del libro (2.66): lee una página de siempre (el prólogo, Ajustes, el perfil…) y la escribe a tinta.
   La página de siempre queda escondida y sigue haciendo todo (las cuentas, guardar, validar): el libro solo cambia
   cómo se ve y dónde se toca. Cada pieza de tinta recuerda su control de siempre (ctrls[k]):
   - un botón  → una palabra subrayada que lo aprieta;
   - un grupo de botones con aria-pressed (o un select, o una casilla) → opciones con el óvalo en la elegida;
   - un deslizador → «bajo · medio · alto»; un campo → un renglón que escribe en el campo de siempre.
   Devuelve los bloques (cada uno entra entero en una página) y los controles. */
import {e,b,puntos,opciones,renglon} from './hl-piezas.js';

var SIMB=/^[\s‹›«»+↑↓×✕·•⌫<>…›‹-]*$/;
function oculto(x){return x.hidden||x.getAttribute('aria-hidden')==='true'||x.classList.contains('sr-only')&&!/^(INPUT|LABEL)$/.test(x.tagName)}
/* el texto que se lee, sin los controles */
export function texto(x){
  var o=[];(function r(n){
    if(n.nodeType===3){o.push(n.textContent);return}
    if(n.nodeType!==1)return;
    if(/^(BUTTON|INPUT|SELECT|TEXTAREA|SCRIPT|STYLE|svg|A)$/i.test(n.tagName)||n.hidden||n.getAttribute('aria-hidden')==='true')return;
    o.push(' ');[].forEach.call(n.childNodes,r);o.push(' ');
  })(x);
  return o.join('').replace(/\s+/g,' ').replace(/\s([.,:;])/g,'$1').trim();
}
function interactivo(x){return !!x.querySelector('button,input,select,textarea,a[href]')}
function minuscula(t){return t&&/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(t)?t.charAt(0).toLowerCase()+t.slice(1):t}
function nombreBoton(x){
  var bb=x.querySelector('b'),sm=x.querySelector('small');if(!sm||!bb||sm.parentNode!==bb.parentNode)bb=null;  /* (título y aclaración juntos: solo el título) */var t=bb?texto(bb):[].map.call(x.childNodes,function(n){return n.nodeType===3?n.textContent:n.nodeType===1?texto(n):''}).join(' ').replace(/\s+/g,' ').trim();  /* (un botón con título y aclaración: solo el título) */if(!t||SIMB.test(t))t=x.getAttribute('aria-label')||'';
  return minuscula(t.replace(/^[‹+·✦•\s]+/,'').replace(/[\s·]*[›»]$/,'').trim());
}
function etiquetaDe(c,raiz,soloVisible){
  var t='',id=c.id;
  if(id){var l=raiz.ownerDocument.querySelector('label[for="'+id.replace(/"/g,'')+'"]');if(l)t=texto(l)}
  if(!t){var lb=c.closest('label');if(lb)t=texto(lb)}
  return t||(soloVisible?'':c.getAttribute('aria-label')||'');
}
function esGrupo(x){
  if(!x.matches('.seg,[role=group],.lb-chips,.cat-col'))return false;
  var bs=x.querySelectorAll('button');return bs.length>0&&[].every.call(bs,function(y){return y.hasAttribute('aria-pressed')});
}
/* raiz: el elemento a leer. o.saltar: lo que no va (selector); o.forzar: contenedores escondidos que sí van;
   o.especial(x,api): para piezas propias (devuelve true si ya la escribió) */
export function espejo(raiz,o){  /* (o.ctrls: para juntar los controles de varias lecturas) */
  o=o||{};var out=[],ctrls=o.ctrls||[],fila=[];
  function ctrl(c){ctrls.push(c);return ctrls.length-1}
  function cerrar(){if(fila.length){out.push('<p class="hl-acciones hl-nota">'+puntos(fila)+'</p>');fila=[]}}
  function poner(h){cerrar();out.push(h)}
  var ultimo='';
  function texto_(t,nota){if(t)ultimo=t;if(t)poner('<p class="'+(nota?'hl-nota hl-cur hl-suave':'hl-renglon')+'">'+e(t)+'</p>')}
  function grupo(g){
    var bs=[].filter.call(g.querySelectorAll('button'),function(y){return !y.hidden}),sel=null;
    var lab=g.getAttribute('aria-label')||'',ll=g.getAttribute('aria-labelledby');if(ll){var l=raiz.ownerDocument.getElementById(ll);if(l)lab=texto(l)}
    var lista=bs.map(function(y){var k=ctrl({el:y,tipo:'btn'});if(y.getAttribute('aria-pressed')==='true')sel='x'+k;return ['x'+k,nombreBoton(y)]});
    poner(opciones('ex',lab||'Elegí',lista,sel));
  }
  function campo(c,lab){
    var t=c.type,k;
    if(t==='hidden')return;
    var visible=lab||etiquetaDe(c,raiz,true);lab=lab||etiquetaDe(c,raiz);
    /* una casilla: la pregunta y «sí · no» en el mismo renglón */
    if(t==='checkbox'||t==='radio'){k=ctrl({el:c,tipo:'chk'});poner('<div class="hl-chk"><p class="hl-renglon">'+e(lab)+'</p>'+opciones('ex',lab,[['c'+k+':1','sí'],['c'+k+':0','no']],'c'+k+':'+(c.checked?1:0))+'</div>');return}
    if(t==='range'){
      k=ctrl({el:c,tipo:'rng'});var mn=Number(c.min||0),mx=Number(c.max||100),st=Number(c.step||1),v=Number(c.value);
      var pasos=[[.25,'bajo'],[.55,'medio'],[.85,'alto']].map(function(p){return [Math.round((mn+(mx-mn)*p[0])/st)*st,p[1]]});
      var cerca=pasos.reduce(function(a,p){return Math.abs(p[0]-v)<Math.abs(a[0]-v)?p:a});
      texto_(lab,false);poner(opciones('ex',lab,pasos.map(function(p){return ['r'+k+':'+p[0],p[1]]}),'r'+k+':'+cerca[0]));return}
    if(t==='file'){k=ctrl({el:c,tipo:'file'});fila.push(b(minuscula(lab||'elegir un archivo'),{ex:k}));return}
    if(c.tagName==='SELECT'){
      k=ctrl({el:c,tipo:'sel'});texto_(lab,false);
      poner(opciones('ex',lab,[].map.call(c.options,function(op){return ['s'+k+':'+op.value,minuscula(op.textContent.trim())]}),'s'+k+':'+c.value));return}
    k=ctrl({el:c,tipo:'in'});
    /* el «$» o «US$» de adelante va con el renglón; lo de atrás («%», «veces», «min»), también */
    var pa=c.parentElement,pre=pa&&pa.matches('.money,.lb-monto')?pa.querySelector(':scope>span:first-child'):null,suf=pa&&pa.matches('.money,.lb-monto')?pa.querySelector(':scope>input~span'):null;
    var mon=pre&&/\$/.test(pre.textContent)?(/US/.test(pre.textContent)?'USD':'UYU'):null;
    var tipo=mon||(t==='number'?'num':t==='password'?'clave':null),h=renglon('hl-ex-'+k,lab||'Escribí',c.value,tipo,c.tagName==='TEXTAREA'?'hl-campo-texto':null,c.placeholder||'',' data-ex="'+k+'"');
    if(/^(time|date|month)$/.test(t))h=h.replace('type="text"','type="'+t+'"');
    if(suf)h=h.replace('</label>','<span class="hl-signo" aria-hidden="true">'+e(suf.textContent.trim())+'</span></label>');
    if(visible&&ultimo.indexOf(visible)>=0)visible='';
    poner((visible?'<p class="hl-nota hl-cur hl-suave">'+e(visible)+'</p>':'')+h);
  }
  function andar(x){
    if(x.nodeType===3){var tt=x.textContent.replace(/\s+/g,' ').trim();if(tt)texto_(tt,false);return}
    if(x.nodeType!==1)return;
    if(o.forzar&&x.matches(o.forzar)){[].forEach.call(x.children,andar);return}
    if(oculto(x)||o.saltar&&x.matches(o.saltar))return;
    var tg=x.tagName;
    if(o.especial&&o.especial(x,{poner:poner,ctrl:ctrl,fila:fila,cerrar:cerrar,andar:andar}))return;
    /* un dibujo (un gráfico con su descripción): se copia y se pinta a pluma */
    if(x.getAttribute('role')==='img'&&x.querySelector&&(tg.toLowerCase()==='svg'||x.querySelector('svg'))){poner('<div class="hl-graf" role="img" aria-label="'+e(x.getAttribute('aria-label')||'')+'">'+x.outerHTML.replace(/\s(id|role|aria-label)="[^"]*"/g,'')+'</div>');return}
    /* una imagen dibujada (la postal): va como imagen */
    if(tg==='CANVAS'){try{poner('<img class="hl-postal" alt="La postal" src="'+x.toDataURL('image/png')+'">')}catch(er){}return}
    if(/^(SCRIPT|STYLE|TEMPLATE|svg|SVG)$/.test(tg))return;
    if(tg==='SPAN'&&x.parentElement&&x.parentElement.matches('.money,.lb-monto')&&!interactivo(x))return;
    /* una lista sin botones (el pacto, un resumen): como un libro de cuentas, lo que es a la izquierda y la cifra a la derecha */
    if((tg==='UL'||tg==='OL')&&!interactivo(x)){
      var filas=[].filter.call(x.children,function(li){return !oculto(li)}).map(function(li){
        var sp=li.querySelector(':scope>span'),bv=li.querySelector(':scope>b');
        if(!sp||!bv)return '<p class="hl-renglon">'+e(texto(li))+'</p>';
        var sm=bv.querySelector('small'),val=[].filter.call(bv.childNodes,function(n){return n!==sm}).map(function(n){return n.nodeType===3?n.textContent:texto(n)}).join(' ').replace(/\s+/g,' ').trim();
        return '<p class="hl-par"><span>'+e(texto(sp))+'</span><span class="hl-cifra hl-fuerte">'+e(val)+'</span></p>'+(sm?'<p class="hl-par hl-nota hl-cur hl-suave"><span></span><span>'+e(texto(sm))+'</span></p>':'');
      });
      if(filas.length)poner('<div class="hl-cuenta">'+filas.join('')+'</div>');return;
    }
    /* una imagen (la postal) va como imagen; un enlace (guardar la imagen) es una palabra más */
    if(tg==='IMG'){if(x.getAttribute('src'))poner('<img class="hl-postal" alt="'+e(x.alt||'')+'" src="'+e(x.src)+'">');return}
    if(tg==='A'&&x.hasAttribute('href')){var na=nombreBoton(x);if(na)fila.push(b(na,{ex:ctrl({el:x,tipo:'btn'})}));return}
    if(tg==='BUTTON'){if(x.disabled)return;var n=nombreBoton(x);if(n)fila.push(b(n,{ex:ctrl({el:x,tipo:'btn'})}));return}
    if(tg==='INPUT'||tg==='SELECT'||tg==='TEXTAREA'){campo(x);return}
    if(tg==='LABEL'){
      var f=x.querySelector('input[type=file]');if(f){campo(f,texto(x));return}
      var c=x.querySelector('input,select,textarea');if(c){campo(c,texto(x));return}
      if(x.htmlFor&&raiz.querySelector('#'+x.htmlFor.replace(/([^\w-])/g,'\\$1')))return;  /* (el renglón ya lleva su etiqueta) */
    }
    /* un desplegable: cerrado, es una palabra que lo abre (como en la app); abierto, su contenido y la palabra para cerrarlo */
    if(tg==='DETAILS'){var su=x.querySelector(':scope>summary'),ts=su?minuscula(texto(su).split(' · ')[0]):'';
      if(su&&!x.open){fila.push(b(ts+' ▸',{ex:ctrl({el:su,tipo:'btn'})}));return}
      if(su)poner('<p class="hl-cabeza hl-centro hl-libro hl-suave hl-bloque">'+b(ts+' ▾',{ex:ctrl({el:su,tipo:'btn'})})+'</p>');
      [].forEach.call(x.children,function(y){if(y.tagName!=='SUMMARY')andar(y)});cerrar();return}
    if(/^H[1-6]$/.test(tg)){var th=texto(x);if(th)poner(tg==='H1'||x.classList.contains('aj-grupo')?'<h2 class="hl-titulo hl-rojo">'+e(th)+'</h2>':'<p class="hl-cabeza hl-centro hl-libro hl-bloque">'+e(th)+'</p>');return}
    if(esGrupo(x)){grupo(x);return}
    if(!interactivo(x)&&!x.querySelector('h1,h2,h3,h4,p,div,ul,ol,img')){var tx=texto(x);if(tx)texto_(tx,x.matches('.note,small,.src,.lb-p.chico,.welcome-sub,.voz-msg,.lb-p')||!!x.closest('small,.note'));return}
    /* un renglón de una lista (una categoría, una copia, un feriado): todo junto, en la misma página */
    if(tg==='LI'){cerrar();var antes=out.length;[].forEach.call(x.childNodes,andar);cerrar();var partes=out.splice(antes);if(partes.length)out.push('<div class="hl-item">'+partes.join('')+'</div>');return}
    [].forEach.call(x.childNodes,andar);
    if(/^(DIV|FORM|SECTION|UL|OL|P|LI|NAV)$/.test(tg))cerrar();
  }
  [].forEach.call(raiz.childNodes,andar);cerrar();
  return {bloques:out,ctrls:ctrls};
}
/* lo que hace tocar una pieza del espejo (op: el valor de data-v de la opción, o el número de un botón) */
export function tocar(ctrls,v){
  var m=/^([xcrs])(\d+)(?::(.*))?$/.exec(String(v));
  if(!m){var c0=ctrls[Number(v)];if(c0)return activar(c0,null);return false}
  var c=ctrls[Number(m[2])];if(!c)return false;return activar(c,m[3]);
}
function activar(c,val){
  var el=c.el,ev=function(t){el.dispatchEvent(new Event(t,{bubbles:true}))};
  if(c.tipo==='btn'||c.tipo==='file'){el.click();return true}
  if(c.tipo==='chk'){var q=val==='1';if(el.checked!==q)el.click();return true}
  if(c.tipo==='rng'||c.tipo==='sel'){el.value=val;ev('input');ev('change');return true}
  return false;
}
/* lo que escribís en un renglón del espejo va al campo de siempre */
/* (un día del mes escrito a mano: aprieta ese día del calendario de siempre) */
function elegirDia(c,valor){var n=String(parseInt(valor,10));var y=c.dias.filter(function(d){return d.textContent.trim()===n})[0];if(y){y.click();return true}return false}
export function escribir(ctrls,k,valor,final){
  var c=ctrls[Number(k)];if(c&&c.tipo==='dia'){if(final&&valor)elegirDia(c,valor);return}
  if(!c||c.tipo!=='in')return;var el=c.el;
  el.value=valor;el.dispatchEvent(new Event('input',{bubbles:true}));
  if(final)el.dispatchEvent(new Event('change',{bubbles:true}));
}
/* «Enter» en un renglón: lo que haría la página de siempre (mandar el formulario o tocar su botón principal) */
export function confirmar(ctrls,k,raiz){
  var c=ctrls[Number(k)];if(!c)return;var el=c.el;
  if(c.tipo==='dia'){var i=document.getElementById('hl-ex-'+k);if(i&&i.value)elegirDia(c,i.value);return}
  el.dispatchEvent(new Event('change',{bubbles:true}));
  if(el.form){var s=el.form.querySelector('[type=submit],button:not([type])');if(s){s.click();return}}
  var p=raiz&&raiz.querySelector('.lb-btn.si,[data-lb="sig"],[data-lb="guardar"],[data-wa="sig"],[data-wa="fin"]');if(p)p.click();
}
