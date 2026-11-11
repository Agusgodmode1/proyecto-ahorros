/* Modo pareja (2.59, puro): dos personas que llevan la plata desde un solo teléfono.
   state.pareja guarda lo de la otra persona con la misma forma que lo tuyo (perfil, sueldo, recibos, horas, plantillasRecibo).
   estadoDe() arma «el estado visto desde» una persona: así todas las cuentas que ya existen sirven para las dos sin copiarlas. */
import {liqReal,reciboRaro} from './recibos.js';
import {liq} from './sueldo.js';
import {cobroDesde} from './plan.js';
import {num} from './util.js';

export var GRUPO='g-pareja';
/* lo que cambia de una persona a la otra («recibo» es el formulario de comparar a mano) */
export var CLAVES=['perfil','sueldo','recibos','horas','plantillasRecibo','recibo'];
/* (2.61) pacto: 'juntos' (una meta) | 'dividido' (cada uno guarda su parte); cuentas: los gastos compartidos (logica/cuentas.js) */
export function parejaVacia(){return {activa:false,nombre:'',perfil:null,sueldo:null,recibos:[],horas:[],plantillasRecibo:{},recibo:{},pacto:'juntos',cuentas:[]}}
export function hayPareja(state){return !!(state&&state.pareja&&state.pareja.activa&&state.pareja.perfil)}
export function nombrePareja(state){return String((state.pareja&&state.pareja.nombre)||'').trim()||'Tu pareja'}

/* base = defaults(): la otra persona arranca sin horario y sin sueldo (se completan con su recibo) */
export function activarPareja(state,nombre,base){
  var p=state.pareja=Object.assign(parejaVacia(),state.pareja||{});
  if(!p.perfil)p.perfil={ingreso:base.perfil.ingreso,cobro:base.perfil.cobro,horas:base.perfil.horas};
  if(!p.sueldo)p.sueldo=base.sueldo;
  if(nombre!==undefined)p.nombre=String(nombre||'').trim().slice(0,30);
  p.activa=true;return p;
}

/* 'yo' → el estado tal cual. 'pareja' → un objeto nuevo con lo de la otra persona en su lugar; lo que se le escribe
   (st.recibos=…, st.sueldo.nominal=…) queda en state.pareja. Con `hoy`, plan.cobro es SU próximo cobro. */
export function estadoDe(state,quien,hoy){
  if(quien!=='pareja'||!state.pareja||!state.pareja.perfil)return state;
  var p=state.pareja,v=Object.assign({},state,{ejemplo:false});
  CLAVES.forEach(function(k){Object.defineProperty(v,k,{enumerable:true,configurable:true,get:function(){return p[k]},set:function(x){p[k]=x}})});
  if(hoy)v.plan=Object.assign({},state.plan,{cobro:cobroDesde(hoy,p.perfil.cobro)});
  return v;
}

function sinNada(S){return !S.ejemplo&&!S.sueldo.aMano&&!(S.recibos||[]).some(function(r){return !reciboRaro(r)})}
/* Cuánto va a cobrar cada una y qué día, el total y el % que aporta cada una (enteros que suman 100) */
export function juntos(state,hoy){
  var ps=['yo','pareja'].map(function(q){
    var S=estadoDe(state,q,hoy),cero=sinNada(S),L=cero?null:liqReal(S),E=L&&(L.estimado||L);
    return {quien:q,nombre:q==='yo'?'Vos':nombrePareja(state),cobro:S.plan.cobro,sinRecibo:cero,
      cobra:L?Math.max(0,num(L.liquido)):0,extras:E?Math.max(0,num(E.liquido)-num(liq(S,false).liquido)):0};
  });
  var total=ps[0].cobra+ps[1].cobra,a=total>0?Math.round(ps[0].cobra/total*100):50;
  ps[0].pct=a;ps[1].pct=100-a;
  return {personas:ps,total:total};
}

/* Fijos: el grupo «En pareja» se crea solo y el ingreso de cada persona sale de juntos() (ingresoAuto). Devuelve true si cambió algo. */
export function sincronizarGrupo(state,hoy){
  if(!hayPareja(state))return false;
  var J=juntos(state,hoy),cambio=false;
  if(!Array.isArray(state.grupos))state.grupos=[];
  var g=state.grupos.filter(function(x){return x.id===GRUPO})[0];
  if(!g){g={id:GRUPO,nombre:'En pareja',personas:[{id:'yo',nombre:'Vos',ingreso:0,ingresoAuto:true},{id:'pareja',nombre:J.personas[1].nombre,ingreso:0,ingresoAuto:true}],reparto:{tipo:'ingresos',pct:{},montos:{}}};state.grupos.push(g);cambio=true}
  g.personas.forEach(function(x){
    var j=x.id==='yo'?J.personas[0]:x.id==='pareja'?J.personas[1]:null;if(!j)return;
    if(x.id==='pareja'&&x.nombre!==j.nombre){x.nombre=j.nombre;cambio=true}
    if(x.ingresoAuto&&num(x.ingreso)!==Math.round(j.cobra)){x.ingreso=Math.round(j.cobra);cambio=true}
  });
  return cambio;
}
