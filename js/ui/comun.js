/* Contexto compartido entre vistas y helpers de formato/HTML. */
import {iso,parse,MES,DIA} from '../logica/fechas.js';
import {planCalc} from '../logica/plan.js';
import {liq} from '../logica/sueldo.js';
import {analisisGuardado} from '../logica/extracto.js';

/* ctx.state es el estado actual; app.js completa persist, renderAll y go. */
export var ctx={state:null,tab:'resumen',booted:false,persist:function(){},renderAll:function(){},go:function(){},syncInputs:function(){}};

export function today(){return iso(new Date())}
export function planNow(){return planCalc(ctx.state)}
export function liqNow(conExtras){return liq(ctx.state,conExtras)}
export function exAnalisis(){return analisisGuardado(ctx.state.extracto,today())}

var fmtN;
try{fmtN=new Intl.NumberFormat('es-UY',{maximumFractionDigits:0,useGrouping:'always'})}catch(e){fmtN=new Intl.NumberFormat('es-UY',{maximumFractionDigits:0})}
/* Modo discreto: tapa todos los montos de la pantalla (se recuerda en este aparato). */
var DK='pa-discreto';
export var discreto={on:false};
try{discreto.on=localStorage.getItem(DK)==='1'}catch(e){}
export function setDiscreto(v){discreto.on=!!v;try{if(v)localStorage.setItem(DK,'1');else localStorage.removeItem(DK)}catch(e){}}
var TAPA='•••';
export function n0(n){return discreto.on?TAPA:fmtN.format(Math.abs(Math.round(n)))}
export function money(n){return discreto.on?'$ '+TAPA:(Math.round(n)<0?'−':'')+'$ '+n0(n)}
export function money2(n){return discreto.on?'$ '+TAPA:(n<0?'−':'')+'$ '+Math.abs(n).toLocaleString('es-UY',{minimumFractionDigits:2,maximumFractionDigits:2})}
export function usd(n){return discreto.on?'US$ '+TAPA:'US$ '+(Math.round(n*100)/100).toLocaleString('es-UY',{maximumFractionDigits:2})}
export function pctTxt(r){return (r*100).toLocaleString('es-UY',{maximumFractionDigits:3})+'%'}
export function veces(x){return (Math.round(x*10)/10).toLocaleString('es-UY')+' veces'}
export function fmtH(h){return h.toLocaleString('es-UY',{maximumFractionDigits:2})}
export function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
export function fCorta(s){var d=parse(s);return d.getDate()+' '+MES[d.getMonth()]}
export function fLarga(s){var d=parse(s);return DIA[d.getDay()]+' '+d.getDate()+' '+MES[d.getMonth()]}
export function rango(a,b){var x=parse(a),y=parse(b);return x.getMonth()===y.getMonth()?x.getDate()+'–'+y.getDate()+' '+MES[y.getMonth()]:fCorta(a)+'–'+fCorta(b)}
export function fMin(m){var h=Math.floor(m/60),r=Math.round(m%60);if(h===0)return r+' min';return h+' h '+(r<10?'0':'')+r+' min'}
export function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
export function titulo(k){return k.toLowerCase().replace(/(^|\s)\S/g,function(c){return c.toUpperCase()})}
export function $(s){return document.querySelector(s)}

export function tile(tone,l,v,hint){return '<div class="tile '+tone+'"><span class="tile-l">'+l+'</span><b class="tile-v">'+v+'</b>'+(hint?'<span class="tile-h">'+hint+'</span>':'')+'</div>'}
export function hchip(l,v){return '<div class="hchip"><span>'+l+'</span><b>'+v+'</b></div>'}
export function row(l,v,cls,sub){return '<div class="row '+(cls||'')+'"><span class="l">'+l+(sub?'<small>'+sub+'</small>':'')+'</span><span class="d"></span><span class="v">'+v+'</span></div>'}

/* Botón "Borrar" en dos toques: el primero pide confirmación durante 3,5 s. */
export function armar(b){
  if(b.getAttribute('data-armed')==='1')return true;
  b.setAttribute('data-armed','1');b.textContent='¿Seguro?';b.classList.add('danger');
  setTimeout(function(){if(b.isConnected){b.setAttribute('data-armed','0');b.textContent='Borrar';b.classList.remove('danger')}},3500);
  return false;
}

export function toast(m){
  var el=$('#toast');if(!el)return;
  el.textContent=m;el.hidden=false;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
  clearTimeout(toast.t);toast.t=setTimeout(function(){el.hidden=true},4200);
}
/* Aviso con un botón (por ejemplo "Deshacer"). Dura 6 segundos. */
export function toastAccion(m,etiqueta,fn){
  var el=$('#toast');if(!el)return;
  el.innerHTML='<span>'+esc(m)+'</span><button class="toast-btn" type="button">'+esc(etiqueta)+'</button>';
  el.querySelector('button').onclick=function(){clearTimeout(toast.t);el.hidden=true;fn()};
  el.hidden=false;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
  clearTimeout(toast.t);toast.t=setTimeout(function(){el.hidden=true},6000);
}

export var ICON={
  plan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="6" rx="7" ry="2.8" fill="none"/><path d="M5 6v4.5c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8V6M5 10.5V15c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8v-4.5M5 15v3.2C5 19.8 8.1 21 12 21s7-1.2 7-2.8V15" fill="none"/></svg>',
  semanas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="none"/><path d="M3.5 10h17M8 3v4M16 3v4" fill="none"/><path d="M8 14h2M14 14h2M8 17h2" fill="none"/></svg>',
  sueldo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2.2" fill="none"/><circle cx="12" cy="12" r="2.7" fill="none"/><path d="M6 9.5v5M18 9.5v5" fill="none"/></svg>',
  fijos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2.2" fill="none"/><path d="M9 8h6M9 12h6M9 16h3.5" fill="none"/></svg>',
  logros:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" fill="none"/><path d="M16 5.5h3V7a3 3 0 0 1-3 3M8 5.5H5V7a3 3 0 0 0 3 3M12 13v4M8.5 20.5h7M10 17h4" fill="none"/></svg>',
  gastos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h16" fill="none"/><rect x="5.5" y="11" width="3" height="7" rx="1" fill="none"/><rect x="10.5" y="5.5" width="3" height="12.5" rx="1" fill="none"/><rect x="15.5" y="13.5" width="3" height="4.5" rx="1" fill="none"/></svg>'
};
