/* Categorías de gasto editables (puro).
   state.categorias = [{id, nombre, color, icono, oculta, bases:[...]}], en el orden en que se muestran.
   bases: las categorías "de fábrica" (las del reconocedor del extracto, la nota y la voz) que caen en esta.
   Así, si renombrás "Supermercado" a "Súper" o juntás "Juegos" con "Otros", lo que se reconoce solo
   sigue yendo al lugar correcto. "Otros" no se puede borrar: es donde cae lo que no se reconoce. */
import {CAT_NAMES} from './extracto.js';

export var COLORES=['var(--coral)','var(--mint)','var(--sun)','var(--sky)','var(--grape)','var(--pink)','var(--teal)','var(--slate)','var(--bad)','var(--muted)'];
export var ICONOS=['🛒','🍔','🏪','🚌','📺','🎮','📈','💡','💊','📦','🏧','🧾','🏠','👕','🎁','✈️','🐾','📚','☕','🍺','💈','🎬','⚽','•'];
var BASE={'Delivery y comida':['var(--coral)','🍔'],'Supermercado':['var(--mint)','🛒'],'Kiosco y almacén':['var(--sun)','🏪'],'Transporte':['var(--sky)','🚌'],
  'Suscripciones':['var(--grape)','📺'],'Juegos':['var(--pink)','🎮'],'Trading':['var(--teal)','📈'],'Servicios y cuentas':['var(--slate)','💡'],'Salud':['var(--pink)','💊'],
  'Compras online':['var(--teal)','📦'],'Retiros y transferencias':['var(--slate)','🏧'],'Comisiones y cargos':['var(--bad)','🧾'],'Otros':['var(--muted)','•']};

function slug(s){return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'cat'}
function limpio(s){return String(s||'').trim().replace(/\s+/g,' ').slice(0,30)}

/* La lista de fábrica: la de siempre, en el mismo orden */
export function categoriasBase(){
  return CAT_NAMES.map(function(n){var b=BASE[n]||['var(--muted)','•'];return {id:slug(n),nombre:n,color:b[0],icono:b[1],oculta:false,bases:[n]}});
}
/* Migración: la lista de fábrica + las categorías que ya usaban tus gastos y no estaban (ningún gasto cambia) */
export function categoriasDesde(state){
  var l=categoriasBase(),nombres={};l.forEach(function(c){nombres[c.nombre]=1});
  (state.gastos||[]).forEach(function(g){
    if(g.cat&&!nombres[g.cat]&&g.cat!=='Ingresos'){nombres[g.cat]=1;l.push({id:idLibre(l,g.cat),nombre:g.cat,color:'var(--muted)',icono:'•',oculta:false,bases:[]})}
  });
  return l;
}
function idLibre(l,nombre){var b=slug(nombre),id=b,i=2;while(l.some(function(c){return c.id===id}))id=b+'-'+(i++);return id}

export function lista(state){return Array.isArray(state.categorias)&&state.categorias.length?state.categorias:categoriasBase()}
export function visibles(state){return lista(state).filter(function(c){return !c.oculta})}
export function nombresVisibles(state){return visibles(state).map(function(c){return c.nombre})}
export function porNombre(state,n){var l=lista(state);for(var i=0;i<l.length;i++)if(l[i].nombre===n)return l[i];return null}
export function otros(state){var l=lista(state);return l.filter(function(c){return c.bases.indexOf('Otros')>=0})[0]||l[l.length-1]}

/* Lo que reconoce la app (una categoría de fábrica o una que aprendió) → tu categoría de hoy */
export function nombreDe(state,detectada){
  var l=lista(state);
  for(var i=0;i<l.length;i++)if(l[i].nombre===detectada&&!l[i].oculta)return l[i].nombre;
  for(var j=0;j<l.length;j++)if(l[j].bases.indexOf(detectada)>=0&&!l[j].oculta)return l[j].nombre;
  return otros(state).nombre;
}
export function colorDe(state,n){if(n==='Ingresos')return 'var(--mint)';var c=porNombre(state,n);return c?c.color:'var(--muted)'}
export function iconoDe(state,n){var c=porNombre(state,n);return c&&c.icono&&c.icono!=='•'?c.icono:''}
export function cuantosGastos(state,n){return (state.gastos||[]).filter(function(g){return g.cat===n}).length}

/* ---------- Cambios. Devuelven {ok:true} o {ok:false,error} ---------- */
function asegurar(state){if(!Array.isArray(state.categorias)||!state.categorias.length)state.categorias=categoriasBase();return state.categorias}
function nombreValido(state,n,menosId){
  n=limpio(n);
  if(!n)return {error:'Poné un nombre.'};
  if(n==='Ingresos')return {error:'"Ingresos" está reservado para lo que entra en el extracto.'};
  if(lista(state).some(function(c){return c.id!==menosId&&c.nombre.toLowerCase()===n.toLowerCase()}))return {error:'Ya tenés una categoría con ese nombre.'};
  return {n:n};
}
export function crear(state,o){
  var l=asegurar(state),v=nombreValido(state,o.nombre);if(v.error)return {ok:false,error:v.error};
  var c={id:idLibre(l,v.n),nombre:v.n,color:COLORES.indexOf(o.color)>=0?o.color:'var(--sky)',icono:o.icono||'•',oculta:false,bases:[]};
  l.push(c);return {ok:true,cat:c};
}
/* Cambiar el nombre: también cambia en tus gastos, en lo que aprendió la voz y en el extracto */
function cambiarNombreEnDatos(state,viejo,nuevo){
  (state.gastos||[]).forEach(function(g){if(g.cat===viejo)g.cat=nuevo});
  var vc=state.voz&&state.voz.cats||{};Object.keys(vc).forEach(function(k){if(vc[k]===viejo)vc[k]=nuevo});
  var ec=state.extracto&&state.extracto.cat||{};Object.keys(ec).forEach(function(k){if(ec[k]===viejo)ec[k]=nuevo});
}
export function editar(state,id,o){
  var l=asegurar(state),c=l.filter(function(x){return x.id===id})[0];if(!c)return {ok:false,error:'No encontré esa categoría.'};
  if(o.nombre!==undefined&&limpio(o.nombre)!==c.nombre){
    var v=nombreValido(state,o.nombre,id);if(v.error)return {ok:false,error:v.error};
    cambiarNombreEnDatos(state,c.nombre,v.n);c.nombre=v.n;
  }
  if(o.color&&COLORES.indexOf(o.color)>=0)c.color=o.color;
  if(o.icono)c.icono=o.icono;
  if(o.oculta!==undefined){if(o.oculta&&c===otros(state))return {ok:false,error:'"'+c.nombre+'" no se puede ocultar: ahí va lo que no se reconoce.'};c.oculta=!!o.oculta}
  return {ok:true,cat:c};
}
export function mover(state,id,paso){
  var l=asegurar(state),i=l.findIndex(function(c){return c.id===id}),j=i+paso;
  if(i<0||j<0||j>=l.length)return {ok:false};
  var x=l[i];l[i]=l[j];l[j]=x;return {ok:true};
}
/* Borrar: los gastos de esa categoría pasan a "destino". Nunca quedan gastos sin categoría. */
export function borrar(state,id,destinoId){
  var l=asegurar(state),c=l.filter(function(x){return x.id===id})[0],d=l.filter(function(x){return x.id===destinoId})[0];
  if(!c)return {ok:false,error:'No encontré esa categoría.'};
  if(c===otros(state))return {ok:false,error:'"'+c.nombre+'" no se puede borrar: ahí va lo que no se reconoce.'};
  var n=cuantosGastos(state,c.nombre);
  if(!d||d===c){if(n)return {ok:false,error:'Elegí a qué categoría pasan sus '+n+' gastos.'};d=otros(state)}
  cambiarNombreEnDatos(state,c.nombre,d.nombre);
  c.bases.forEach(function(b){if(d.bases.indexOf(b)<0)d.bases.push(b)});
  state.categorias=l.filter(function(x){return x!==c});
  return {ok:true,movidos:n,destino:d.nombre};
}
