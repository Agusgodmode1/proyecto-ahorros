/* Tour guiado: globos paso a paso sobre la pantalla real. Se muestra la primera vez y se repite desde Ajustes.
   Lo que ya se vio queda en este aparato (localStorage pa-tour), no en los datos. */
import {ctx,$} from './comun.js';

var KEY='pa-tour';
export function marcarTour(){try{localStorage.setItem(KEY,'pendiente')}catch(e){}}
export function tourPendiente(){try{return localStorage.getItem(KEY)==='pendiente'}catch(e){return false}}
function hecho(){try{localStorage.setItem(KEY,'hecho')}catch(e){}}

var PASOS=[
  {tab:'resumen',sel:'#countdown',t:'Cobrás en',x:'Los días que faltan para volver a cobrar. Es lo primero que ves al abrir el libro.'},
  {tab:'resumen',sel:'#hoy-hero .hh-n',t:'Hoy podés gastar',x:'Lo que podés gastar hoy sin tocar tu ahorro. Cada gasto que anotás lo baja, y lo que no gastás pasa a mañana.'},
  {tab:'resumen',sel:'#gasto-abrir',t:'Anotar un gasto',x:'Tocá «+ Gasto» y poné cuánto fue y en qué. Nada más. Si te olvidaste de uno, podés anotarlo con la fecha de ayer.'},
  {tab:'resumen',sel:'#hero-chips',t:'Tenés y Guardás',x:'«Tenés» es tu plata de hoy y «Guardás», tu meta. Tocá cualquiera para cambiar tu pacto: se recalcula todo.'},
  {tab:'resumen',sel:'#indice-abrir',t:'El índice',x:'Todos los capítulos del libro, con una cinta en el que tenés abierto. También podés deslizar a los costados para pasar de capítulo.'},
  {tab:'semanas',sel:'.tab[data-tab^="w"]',t:'Capítulo II · Semanas',x:'Cada semana es una página, con su presupuesto. Lo que sobra o falta pasa a la siguiente.'},
  {tab:'fijos',sel:'.tab[data-tab="fijos"]',t:'Capítulo III · Fijos',x:'Tus gastos de todos los meses (alquiler, celular, internet). Se descuentan antes de calcular cuánto podés gastar.'},
  {tab:'sueldo',sel:'.tab[data-tab="sueldo"]',t:'Capítulo IV · Sueldo',x:'Cuánto te queda en mano, con tus horas extra. Podés cargar tu recibo y la app lo controla.'},
  {tab:'gastos',sel:'.tab[data-tab="gastos"]',t:'Capítulo V · Tarjeta',x:'Pegá el extracto de tu tarjeta y lo comparo con lo que anotaste. Acá están las categorías.'},
  {tab:'logros',sel:'.tab[data-tab="logros"]',t:'Capítulo VI · Logros',x:'Tus metas, tus rachas y tus meses ahorrados.'},
  {tab:'resumen',sel:'.mic',t:'Anotar con la voz',x:'Tocá el micrófono y decí, por ejemplo, «gasté 350 en un café». Siempre te pido confirmar antes de guardar.'}
];
var i=0,corre=false;

function el(){return $('#tour')}
function cerrar(){
  var t=el();if(t)t.remove();corre=false;hecho();window.removeEventListener('resize',ubicar);
  if(ctx.tab!=='resumen')ctx.go('resumen');
}
function visible(n){if(!n)return false;var r=n.getBoundingClientRect();return r.width>0&&r.height>0}
function mostrar(dir){
  var p=PASOS[i];
  if(ctx.tab!==p.tab&&!(p.tab==='semanas'&&/^w\d+$/.test(ctx.tab)))ctx.go(p.tab);
  setTimeout(function(){
    var n=document.querySelector(p.sel);
    if(!visible(n)){i+=dir;if(i<0)i=0;if(i>=PASOS.length){cerrar();return}mostrar(dir);return}
    if(!n.closest('.tabs')&&!n.closest('.mic')){try{n.scrollIntoView({block:'center'})}catch(e){}}
    pintar();
    setTimeout(ubicar,60);
  },90);
}
function pintar(){
  var p=PASOS[i],t=el();
  if(!t){t=document.createElement('div');t.id='tour';t.className='tour';t.setAttribute('role','dialog');t.setAttribute('aria-modal','true');t.setAttribute('aria-label','Tour de la app');document.body.appendChild(t)}
  t.innerHTML='<div class="tour-hl" id="tour-hl"></div><div class="tour-bx" id="tour-bx"><span class="tour-n">'+(i+1)+' de '+PASOS.length+'</span><h2>'+p.t+'</h2><p>'+p.x+'</p>'
    +'<div class="row-btns"><button class="btn quiet" type="button" data-tour="saltear">Saltear</button><span class="tour-sp"></span>'
    +(i>0?'<button class="btn" type="button" data-tour="atras">Atrás</button>':'')+'<button class="btn primary" type="button" data-tour="sig">'+(i===PASOS.length-1?'Listo':'Siguiente')+'</button></div></div>';
}
function ubicar(){
  var p=PASOS[i],n=document.querySelector(p.sel),hl=$('#tour-hl'),bx=$('#tour-bx');
  if(!n||!hl||!bx)return;
  var r=n.getBoundingClientRect(),m=6,vw=window.innerWidth,vh=window.innerHeight;
  hl.style.left=(r.left-m)+'px';hl.style.top=(r.top-m)+'px';hl.style.width=(r.width+2*m)+'px';hl.style.height=(r.height+2*m)+'px';
  var w=Math.min(340,vw-24);bx.style.width=w+'px';
  var left=Math.min(Math.max(12,r.left+r.width/2-w/2),vw-w-12);bx.style.left=left+'px';
  var h=bx.offsetHeight,abajo=r.top+r.height/2>vh/2;
  var top=abajo?Math.max(12,r.top-m-h-14):Math.min(vh-h-12,r.bottom+m+14);
  bx.style.top=top+'px';
}
export function iniciarTour(){
  if(corre)return;
  corre=true;i=0;mostrar(1);
  window.addEventListener('resize',ubicar);
}
export function initTour(){
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-tour]');if(!b)return;
    var a=b.getAttribute('data-tour');
    if(a==='saltear'){cerrar();return}
    if(a==='atras'){i=Math.max(0,i-1);mostrar(-1);return}
    if(a==='sig'){if(i>=PASOS.length-1){cerrar();return}i++;mostrar(1)}
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&corre)cerrar()});
}
/* La primera vez: cuando no hay otra pantalla encima, arranca solo */
export function tourSiPendiente(){
  if(corre||!tourPendiente()||!ctx.booted)return;
  var tapa=['#bienvenida','#wiz','#cfg','#pin'].some(function(s){var x=$(s);return x&&!x.hidden});
  if(tapa)return;
  setTimeout(function(){if(!corre&&tourPendiente())iniciarTour()},700);
}
