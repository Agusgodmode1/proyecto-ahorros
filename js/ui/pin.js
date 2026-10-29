/* Bloqueo con PIN (opcional). Se pide al abrir la app y al volver después de 5 minutos.
   El PIN es de este aparato: se guarda en localStorage como {sal, hash}, nunca en texto plano,
   y no viaja en los respaldos. Funciona junto con el modo discreto, sin reemplazarlo. */
import {pinValido,crearPin,verificarPin,hayQuePedir,esperaTras} from '../logica/pin.js';
import {$,esc,toast} from './comun.js';

var PK='pa-pin',FK='pa-pin-fallos';
var escrito='',resolver=null,modo='pedir',ocultaDesde=null,armadoBorrar=false;

function leerJSON(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}
export function pinGuardado(){var p=leerJSON(PK);return p&&p.hash&&p.sal?p:null}
export function pinActivo(){return !!pinGuardado()}
function fallos(){return leerJSON(FK)||{n:0,hasta:0}}
function setFallos(f){try{localStorage.setItem(FK,JSON.stringify(f))}catch(e){}}

/* ---------- Pantalla de bloqueo ---------- */
function pintar(msg){
  var box=$('#pin-box');if(!box)return;
  if(modo==='olvido'){
    box.innerHTML='<h1 id="pin-t">¿Olvidaste el PIN?</h1>'
      +'<p class="welcome-sub">Como la app no tiene cuentas, nadie puede recuperarlo: la única salida es <b>borrar todos los datos de este teléfono</b>.</p>'
      +'<p class="note">Si tenés un respaldo (el archivo de "Llevar mis datos a otro aparato" o de "Exportar mis datos"), después de borrar elegí <b>Importar mis datos</b> y lo traés de vuelta.</p>'
      +'<div class="stack" style="gap:10px"><button class="btn danger" type="button" data-pin="borrar">'+(armadoBorrar?'¿Seguro? Se borra todo lo de este teléfono':'Borrar los datos de este teléfono')+'</button>'
      +'<button class="btn quiet" type="button" data-pin="volver">Volver</button></div>';
    return;
  }
  var f=fallos(),espera=Math.max(0,f.hasta-Date.now());
  box.innerHTML='<span class="welcome-sun" aria-hidden="true"></span><h1 id="pin-t">Ingresá tu PIN</h1>'
    +'<div class="pin-dots" aria-label="'+escrito.length+' de 4 números">'+[0,1,2,3].map(function(i){return '<i class="'+(i<escrito.length?'on':'')+'"></i>'}).join('')+'</div>'
    +'<p class="pin-msg" role="alert">'+esc(msg||(espera?'Esperá '+Math.ceil(espera/1000)+' segundos para probar de nuevo.':''))+'</p>'
    +'<div class="pin-teclas">'+['1','2','3','4','5','6','7','8','9','','0','⌫'].map(function(k){
      return k===''?'<span></span>':'<button type="button" class="pin-k" data-pink="'+k+'"'+(espera?' disabled':'')+' aria-label="'+(k==='⌫'?'Borrar':k)+'">'+k+'</button>'}).join('')+'</div>'
    +'<button class="btn quiet" type="button" data-pin="olvide">Olvidé el PIN</button>';
}
async function tecla(k){
  if(k==='⌫'){escrito=escrito.slice(0,-1);pintar();return}
  if(escrito.length>=4||Date.now()<fallos().hasta)return;
  escrito+=k;pintar();
  if(escrito.length<4)return;
  var ok=await verificarPin(escrito,pinGuardado());escrito='';
  if(ok){setFallos({n:0,hasta:0});cerrar();return}
  var f=fallos();f.n++;f.hasta=Date.now()+esperaTras(f.n);setFallos(f);
  pintar('PIN incorrecto.');
  if(f.hasta>Date.now())setTimeout(function(){pintar()},f.hasta-Date.now()+50);
}
function cerrar(){
  $('#pin').hidden=true;document.documentElement.classList.remove('pin-tapa','voz-abierta');
  var r=resolver;resolver=null;if(r)r();
}
/* Muestra el bloqueo; la promesa se cumple cuando ponés el PIN correcto */
export function pedirPin(){
  return new Promise(function(ok){
    resolver=ok;escrito='';modo='pedir';armadoBorrar=false;
    $('#pin').hidden=false;document.documentElement.classList.add('pin-tapa','voz-abierta');pintar();
  });
}
async function borrarTodo(){
  try{await new Promise(function(ok){var q=indexedDB.deleteDatabase('proyecto-ahorros');q.onsuccess=q.onerror=q.onblocked=function(){ok()}})}catch(e){}
  try{Object.keys(localStorage).forEach(function(k){if(/^pa-|^proyecto-ahorros/.test(k)&&k!=='pa-tema')localStorage.removeItem(k)})}catch(e){}
  location.reload();
}
export function initPin(){
  var el=$('#pin');
  el.addEventListener('click',function(e){
    var b=e.target.closest('[data-pink],[data-pin]');if(!b)return;
    if(b.hasAttribute('data-pink')){tecla(b.getAttribute('data-pink'));return}
    var a=b.getAttribute('data-pin');
    if(a==='olvide'){modo='olvido';armadoBorrar=false;pintar()}
    if(a==='volver'){modo='pedir';pintar()}
    if(a==='borrar'){if(!armadoBorrar){armadoBorrar=true;pintar();return}borrarTodo()}
  });
  document.addEventListener('keydown',function(e){
    if(el.hidden||modo!=='pedir')return;
    if(/^\d$/.test(e.key)){tecla(e.key);e.preventDefault()}
    else if(e.key==='Backspace'){tecla('⌫');e.preventDefault()}
  });
  /* En segundo plano se tapa (así no se ve en el selector de apps); al volver, si pasaron 5 minutos, pide el PIN */
  document.addEventListener('visibilitychange',function(){
    if(!pinActivo())return;
    if(document.visibilityState==='hidden'){if(el.hidden){ocultaDesde=Date.now();document.documentElement.classList.add('pin-tapa')}}
    else if(el.hidden){
      if(hayQuePedir(ocultaDesde,Date.now()))pedirPin();else document.documentElement.classList.remove('pin-tapa');
      ocultaDesde=null;
    }
  });
}

/* ---------- Ajustes → Bloqueo con PIN ---------- */
var paso=null,nuevo='';
export function renderAjustesPin(){
  var el=$('#aj-pin');if(!el)return;
  var on=pinActivo(),h='';
  if(!paso){
    h='<p class="note">'+(on?'Está activado: se pide al abrir la app y al volver después de 5 minutos.':'Un PIN de 4 números para abrir la app, solo en este teléfono.')+'</p>'
      +'<div class="row-btns">'+(on?'<button class="btn" type="button" data-ajpin="cambiar">Cambiar el PIN</button><button class="btn quiet" type="button" data-ajpin="sacar">Sacar el PIN</button>':'<button class="btn primary" type="button" data-ajpin="activar">Activar el PIN</button>')+'</div>';
  }else{
    var t={actual:'Tu PIN actual',nuevo:'El PIN nuevo (4 números)',repetir:'Repetí el PIN nuevo'}[paso];
    h='<form class="pin-form" id="aj-pin-form" autocomplete="off"><div class="field"><label for="aj-pin-i" class="sub-l">'+t+'</label>'
      +'<input id="aj-pin-i" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off"></div>'
      +'<div class="row-btns"><button class="btn primary" type="submit">Seguir</button><button class="btn quiet" type="button" data-ajpin="cancelar">Cancelar</button></div></form>';
  }
  el.innerHTML=h;
  var i=$('#aj-pin-i');if(i)i.focus();
}
var objetivo=null; /* 'activar' | 'cambiar' | 'sacar' */
export function initAjustesPin(){
  var el=$('#aj-pin');
  el.addEventListener('click',function(e){
    var b=e.target.closest('[data-ajpin]');if(!b)return;
    var a=b.getAttribute('data-ajpin');
    if(a==='cancelar'){paso=null;objetivo=null;nuevo=''}
    else{objetivo=a;paso=a==='activar'?'nuevo':'actual'}
    renderAjustesPin();
  });
  el.addEventListener('submit',async function(e){
    if(e.target.id!=='aj-pin-form')return;
    e.preventDefault();
    var v=$('#aj-pin-i').value.trim();
    if(!pinValido(v)){toast('Tienen que ser 4 números');return}
    if(paso==='actual'){
      if(!(await verificarPin(v,pinGuardado()))){toast('Ese no es tu PIN');$('#aj-pin-i').value='';return}
      if(objetivo==='sacar'){try{localStorage.removeItem(PK)}catch(er){}paso=null;objetivo=null;renderAjustesPin();toast('PIN sacado');return}
      paso='nuevo';renderAjustesPin();return;
    }
    if(paso==='nuevo'){nuevo=v;paso='repetir';renderAjustesPin();return}
    if(paso==='repetir'){
      if(v!==nuevo){toast('No coinciden. Probá de nuevo.');paso='nuevo';nuevo='';renderAjustesPin();return}
      try{localStorage.setItem(PK,JSON.stringify(await crearPin(v)))}catch(er){toast('No se pudo guardar el PIN');return}
      nuevo='';paso=null;objetivo=null;renderAjustesPin();toast('PIN guardado');
    }
  });
}
