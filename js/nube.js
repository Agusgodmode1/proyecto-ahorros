/* Conexión con Supabase: inicio de sesión con código por email y lectura/escritura del estado personal.
   La librería se carga recién cuando hace falta (y queda guardada para usarla sin internet). */
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
import {VERSION_ESTADO} from './estado.js';

var LIB='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm';
var AUTH_KEY='pa-auth';
var cliente=null,cargando=null;

export function configurada(){return !!(SUPABASE_URL&&SUPABASE_ANON_KEY)}
/* ¿Hay una sesión guardada en este aparato? (sin cargar la librería) */
export function haySesionGuardada(){try{return !!localStorage.getItem(AUTH_KEY)}catch(e){return false}}

export function cli(){
  if(cliente)return Promise.resolve(cliente);
  if(!cargando)cargando=import(LIB).then(function(m){
    cliente=m.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:AUTH_KEY}});
    return cliente;
  }).catch(function(e){cargando=null;throw e});
  return cargando;
}

/* ---------- Inicio de sesión con código de 6 dígitos ---------- */
export async function pedirCodigo(email){
  var c=await cli();
  var r=await c.auth.signInWithOtp({email:email,options:{shouldCreateUser:true}});
  if(r.error)throw r.error;
}
export async function verificarCodigo(email,codigo){
  var c=await cli();
  var r=await c.auth.verifyOtp({email:email,token:codigo,type:'email'});
  if(r.error)throw r.error;
  return r.data.session;
}
export async function sesion(){
  var c=await cli();
  var r=await c.auth.getSession();
  return r.data&&r.data.session||null;
}
export async function cerrarSesion(){var c=await cli();await c.auth.signOut({scope:'local'})}

/* ---------- Estado personal ---------- */
export async function leerEstado(uid){
  var c=await cli();
  var r=await c.from('estado_personal').select('datos,rev,updated_at').eq('user_id',uid).maybeSingle();
  if(r.error)throw r.error;
  return r.data;
}
/* Escribe solo si nadie escribió en el medio (rev). Devuelve la rev nueva, o null si hubo choque. */
export async function escribirEstado(uid,datos,revPrevia){
  var c=await cli(),r;
  if(revPrevia===null||revPrevia===undefined){
    r=await c.from('estado_personal').insert({user_id:uid,datos:datos,version:VERSION_ESTADO,rev:1}).select('rev');
    if(r.error){if(r.error.code==='23505')return null;throw r.error}
  }else{
    r=await c.from('estado_personal').update({datos:datos,version:VERSION_ESTADO,rev:revPrevia+1}).eq('user_id',uid).eq('rev',revPrevia).select('rev');
    if(r.error)throw r.error;
    if(!r.data||!r.data.length)return null;
  }
  return r.data[0].rev;
}
/* Avisa cuando el estado cambia desde otro aparato. */
export async function escucharEstado(uid,cb){
  var c=await cli();
  return c.channel('estado-'+uid)
    .on('postgres_changes',{event:'*',schema:'public',table:'estado_personal',filter:'user_id=eq.'+uid},function(p){cb(p.new||{})})
    .subscribe();
}
export function esErrorDeRed(e){
  var m=String(e&&(e.message||e.name)||e);
  return !navigator.onLine||/fetch|network|Failed to|Load failed|NetworkError|import/i.test(m);
}
