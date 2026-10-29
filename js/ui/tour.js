/* Tour guiado: globos paso a paso sobre la pantalla real. Se muestra la primera vez y se repite desde Ajustes.
   Lo que ya se vio queda en este aparato (localStorage pa-tour), no en los datos. */
import {ctx,$} from './comun.js';

var KEY='pa-tour';
export function marcarTour(){try{localStorage.setItem(KEY,'pendiente')}catch(e){}}
export function tourPendiente(){try{return localStorage.getItem(KEY)==='pendiente'}catch(e){return false}}
function hecho(){try{localStorage.setItem(KEY,'hecho')}catch(e){}}

/* (2.30) Cuatro pasos: lo que se usa todos los días. El resto se descubre al hojear. */
var PASOS=[
  {tab:'resumen',sel:'#hoy-hero .hh-n',t:'Hoy podés gastar',x:'Lo que podés gastar hoy sin tocar tu ahorro.'},
  {tab:'resumen',sel:'#gasto-abrir',t:'Anotá un gasto',x:'Tocá «+ Gasto»: cuánto y en qué. Nada más.'},
  {tab:'resumen',sel:window.innerWidth<1100?'.fl-sig':'#pie',t:'Pasá de página',x:'Deslizá o tocá las flechas. La cinta de arriba es el índice.'},
  {tab:'resumen',sel:'.mic',t:'O decilo',x:'Tocá el micrófono y decí «gasté 350 en un café». Siempre te pido confirmar.'}
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
  var tapa=['#wiz','#pin','#libro','#lb-hojas','#indice'].some(function(s){var x=$(s);return x&&!x.hidden});
  if(tapa)return;
  setTimeout(function(){if(!corre&&tourPendiente())iniciarTour()},700);
}
