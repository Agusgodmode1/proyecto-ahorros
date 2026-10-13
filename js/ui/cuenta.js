/* Ajustes → Cuenta en la nube: iniciar sesión con código, primera subida y sincronización.
   Siempre se guarda primero en el teléfono; esto sube y baja cuando hay conexión. */
import * as nube from '../nube.js';
import {migrar} from '../estado.js';
import {combinar,iguales,tieneDatos} from '../logica/sync.js';
import {ctx,$,esc,toast} from './comun.js';

var SK='pa-sync';
var paso='inicio',email='',error='',ses=null,corriendo=false,otraVez=false,timer=null,estadoNube='',canal=null,remotoInicial=null,armadoSalir=false;

function leerSK(){try{return JSON.parse(localStorage.getItem(SK))||{}}catch(e){return {}}}
function guardarSK(o){try{localStorage.setItem(SK,JSON.stringify(Object.assign(leerSK(),o)))}catch(e){}}
export function uidActivo(){var s=leerSK();return ses&&s.uid===ses.user.id?s.uid:null}
export function sesionActual(){return ses}

/* ---------- Indicador chico (arriba, al lado del engranaje) ---------- */
var TXT={ok:'Guardado en la nube',offline:'Sin conexión, se sube después',sync:'Sincronizando…',error:'No se pudo sincronizar'};
function indicador(e){
  estadoNube=e;
  var el=$('#nube');if(!el)return;
  el.hidden=!e;el.className='nube nube-'+e;
  el.querySelector('span').textContent=TXT[e]||'';
  if(ctx.tab==='ajustes')renderCuenta();
}

/* ---------- Sincronizar ---------- */
export async function sincronizar(){
  var uid=uidActivo();if(!uid)return;
  if(corriendo){otraVez=true;return}
  if(!navigator.onLine){indicador('offline');return}
  corriendo=true;indicador('sync');
  try{
    for(var i=0;i<4;i++){
      var rem=await nube.leerEstado(uid);
      var local=ctx.state,junto=rem?combinar(local,migrar(rem.datos)):local;
      var rev=rem?rem.rev:null;
      if(!rem||!iguales(junto,rem.datos)){
        rev=await nube.escribirEstado(uid,junto,rem?rem.rev:null);
        if(rev===null)continue; /* otro aparato escribió en el medio: se vuelve a juntar */
      }
      guardarSK({rev:rev,pendiente:false});
      if(!iguales(junto,ctx.state))ctx.aplicarEstado(junto);
      indicador('ok');
      return;
    }
    indicador('error');
  }catch(e){indicador(nube.esErrorDeRed(e)?'offline':'error');error=e&&e.message||'';}
  finally{corriendo=false;if(otraVez){otraVez=false;sincronizar()}}
}
/* Lo llama la app cada vez que guarda algo en el teléfono */
export function cambioLocal(){
  if(!uidActivo())return;
  guardarSK({pendiente:true});
  if(!navigator.onLine){indicador('offline');return}
  clearTimeout(timer);timer=setTimeout(sincronizar,1500);
}
async function conectar(){
  var uid=uidActivo();if(!uid)return;
  if(!canal){
    try{canal=await nube.escucharEstado(uid,function(n){if(n.rev&&n.rev!==leerSK().rev)sincronizar()})}catch(e){}
  }
  sincronizar();
}

/* ---------- Pantalla ---------- */
export function renderCuenta(){
  var el=$('#aj-cuenta');if(!el)return;
  var h='';
  if(!nube.configurada()){
    el.innerHTML='<p class="note">La cuenta en la nube todavía no está activada en esta app. Sin cuenta, todo funciona igual y queda solo en este teléfono.</p>';return;
  }
  if(ses&&uidActivo()){
    var sk=leerSK();
    h='<p>Conectado como <b>'+esc(ses.user.email||'')+'</b>.</p>'
      +'<p class="note">'+(estadoNube==='ok'?'Tus datos están guardados en la nube.':estadoNube==='offline'?'Sin conexión: los cambios se suben cuando vuelva internet.':estadoNube==='sync'?'Sincronizando…':estadoNube==='error'?'No se pudo sincronizar'+(error?': '+esc(error):'')+'. Se vuelve a intentar solo.':(sk.pendiente?'Hay cambios para subir.':''))+'</p>'
      +'<div class="row-btns"><button class="btn" type="button" data-cu="sync">Sincronizar ahora</button>'
      +'<button class="btn quiet'+(armadoSalir?' danger':'')+'" type="button" data-cu="salir">'+(armadoSalir?'¿Seguro? Tus datos quedan en este teléfono':'Cerrar sesión')+'</button></div>';
  }else if(paso==='elegir'){
    var hayRemoto=!!remotoInicial;
    h='<p>Entraste como <b>'+esc(ses.user.email||'')+'</b>.</p>';
    if(!hayRemoto)h+='<p class="note">Tu cuenta está vacía. ¿Subo los datos de este teléfono?</p><div class="row-btns"><button class="btn primary" type="button" data-cu="subir">Subir mis datos a la cuenta</button><button class="btn quiet" type="button" data-cu="cancelar">Cancelar</button></div>';
    else h+='<p class="note">Tu cuenta ya tiene datos, y este teléfono también. ¿Qué hago?</p><div class="stack" style="gap:8px">'
      +'<button class="btn primary" type="button" data-cu="juntar">Juntar los dos (recomendado)</button>'
      +'<button class="btn" type="button" data-cu="usarnube">Usar los de la cuenta (reemplaza los de este teléfono)</button>'
      +'<button class="btn" type="button" data-cu="subir">Usar los de este teléfono (reemplaza los de la cuenta)</button>'
      +'<button class="btn quiet" type="button" data-cu="cancelar">Cancelar</button></div>';
  }else if(paso==='codigo'){
    h='<p class="note">Te mandé un código de 6 dígitos a <b>'+esc(email)+'</b>. Puede tardar un minuto; mirá también en correo no deseado.</p>'
      +'<form class="stack cu-form" data-cuf="codigo"><div class="field"><label for="cu-cod" class="sub-l">Código</label><input id="cu-cod" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="123456"></div>'
      +'<div class="row-btns"><button class="btn primary" type="submit">Entrar</button><button class="btn quiet" type="button" data-cu="otro">Mandar otro código</button><button class="btn quiet" type="button" data-cu="email">Cambiar el email</button></div></form>';
  }else{
    h='<p class="note">Opcional. Guarda una copia de tus datos en la nube: si perdés el celular no perdés nada, y podés usar los mismos datos en la compu. Sin cuenta, todo sigue funcionando solo en este teléfono.</p>'
      +'<form class="stack cu-form" data-cuf="email"><div class="field"><label for="cu-email" class="sub-l">Tu email</label><input id="cu-email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" value="'+esc(email)+'" placeholder="nombre@gmail.com"></div>'
      +'<div class="row-btns"><button class="btn primary" type="submit">Mandarme un código</button></div></form>';
  }
  if(error&&!(ses&&uidActivo()))h+='<p class="err">'+esc(error)+'</p>';
  el.innerHTML=h;
}
function mensajeError(e){
  var m=String(e&&e.message||e);
  if(nube.esErrorDeRed(e))return 'No hay conexión. Probá de nuevo cuando tengas internet.';
  if(/expired|invalid|Token has/i.test(m))return 'El código no es correcto o venció. Pedí otro.';
  if(/rate|too many|seconds/i.test(m))return 'Pediste muchos códigos seguidos. Esperá un minuto y probá de nuevo.';
  return 'No se pudo: '+m;
}
async function despuesDeEntrar(){
  var uid=ses.user.id,sk=leerSK();
  if(sk.uid===uid){conectar();return}
  remotoInicial=await nube.leerEstado(uid);
  if(!remotoInicial&&!tieneDatos(ctx.state)){guardarSK({uid:uid,rev:null});paso='inicio';renderCuenta();conectar();return}
  if(remotoInicial&&!tieneDatos(ctx.state)){
    guardarSK({uid:uid,rev:remotoInicial.rev});ctx.aplicarEstado(migrar(remotoInicial.datos));paso='inicio';toast('Traje tus datos de la cuenta');conectar();return;
  }
  paso='elegir';renderCuenta();
}

export function initCuenta(){
  var el=$('#aj-cuenta');
  el.addEventListener('submit',async function(e){
    e.preventDefault();var f=e.target.getAttribute('data-cuf');error='';
    var btn=e.target.querySelector('button[type=submit]');if(btn)btn.disabled=true;
    try{
      if(f==='email'){
        email=$('#cu-email').value.trim().toLowerCase();
        if(!/^\S+@\S+\.\S+$/.test(email)){error='Escribí un email válido.';renderCuenta();return}
        await nube.pedirCodigo(email);paso='codigo';renderCuenta();
        var c=$('#cu-cod');if(c)c.focus();
      }
      if(f==='codigo'){
        var cod=$('#cu-cod').value.replace(/\D/g,'');
        if(cod.length!==6){error='El código tiene 6 dígitos.';renderCuenta();return}
        ses=await nube.verificarCodigo(email,cod);
        await despuesDeEntrar();
      }
    }catch(er){error=mensajeError(er);renderCuenta()}
  });
  el.addEventListener('click',async function(e){
    var b=e.target.closest('[data-cu]');if(!b)return;
    var a=b.getAttribute('data-cu');error='';
    try{
      if(a==='email'){paso='inicio';renderCuenta()}
      if(a==='otro'){await nube.pedirCodigo(email);toast('Te mandé otro código')}
      if(a==='sync')sincronizar();
      if(a==='salir'){
        if(!armadoSalir){armadoSalir=true;renderCuenta();setTimeout(function(){armadoSalir=false;renderCuenta()},4000);return}
        armadoSalir=false;
        if(canal){try{canal.unsubscribe()}catch(er){}canal=null}
        await nube.cerrarSesion();ses=null;guardarSK({uid:null,rev:null});paso='inicio';indicador('');renderCuenta();toast('Sesión cerrada. Tus datos siguen en este teléfono.');
      }
      if(a==='cancelar'){await nube.cerrarSesion();ses=null;paso='inicio';renderCuenta()}
      var uid=ses&&ses.user.id;
      if(a==='subir'){guardarSK({uid:uid,rev:remotoInicial?remotoInicial.rev:null});
        if(remotoInicial){var r=await nube.escribirEstado(uid,ctx.state,remotoInicial.rev);if(r===null)throw new Error('La cuenta cambió mientras tanto. Probá de nuevo.');guardarSK({rev:r})}
        paso='inicio';renderCuenta();conectar();toast('Tus datos quedaron en la cuenta')}
      if(a==='usarnube'){guardarSK({uid:uid,rev:remotoInicial.rev});ctx.aplicarEstado(migrar(remotoInicial.datos));paso='inicio';renderCuenta();conectar()}
      if(a==='juntar'){guardarSK({uid:uid,rev:remotoInicial.rev});paso='inicio';renderCuenta();conectar()}
    }catch(er){error=mensajeError(er);renderCuenta()}
  });
  window.addEventListener('online',function(){if(uidActivo())sincronizar()});
  window.addEventListener('offline',function(){if(uidActivo())indicador('offline')});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&uidActivo())sincronizar()});
}
/* Al abrir la app: si había sesión, se reconecta (la librería se carga desde el caché si no hay internet). */
export async function arrancarCuenta(){
  if(!nube.configurada()||!nube.haySesionGuardada())return;
  if(leerSK().pendiente)indicador(navigator.onLine?'sync':'offline');
  try{
    ses=await nube.sesion();
    if(ses&&uidActivo())conectar();else indicador('');
  }catch(e){if(leerSK().uid)indicador('offline')}
}
