/* Modo supervivencia (2.18, puro, sin DOM).
   Cuando la plata no da ni para lo básico hasta el cobro (menos de DIA_BAJO por día aunque no guardes nada),
   la meta del pacto cambia: ya no es ahorrar, es llegar. El plan es el mismo (plan.js no cambia); esto es una capa encima:
   - enSupervivencia: ¿da menos de DIA_BAJO por día sin ahorro?
   - sugerencias de ahorro: «Nada esta vez» o «Algo simbólico».
   - estadoSupervivencia: lo que se ve en Hoy (por día, por semana, hasta cuándo te alcanza a tu ritmo, fijos que faltan).
   - Plata que te va a entrar antes de cobrar (state.plan.esperado [{id, fecha, monto, nota}]): no cuenta hasta que llega;
     al tocar «Me entró» se suma a tu plata (con Deshacer). Así el plan nunca cuenta con plata que todavía no tenés. */
import {num,uid} from './util.js';
import {diffDays,addDays,parse,iso} from './fechas.js';
import {fijosPendientes} from './saldo.js';
import {DIA_BAJO} from './pacto.js';

/* Por debajo de esto por día (sin ahorro) se entra en modo supervivencia. Es el mismo umbral del aviso «es poco» del pacto. */
export var DIA_SUPERV=DIA_BAJO;

export function enSupervivencia(total,fijos,dias){
  var t=num(total)-num(fijos);
  return num(total)>0&&t/Math.max(1,num(dias))<DIA_SUPERV;
}
/* Lo simbólico: un 2 % redondeado a $ 10 (como mínimo $ 10 si alcanza para algo) */
export function ahorroSimbolico(total,fijos){
  var t=Math.max(0,num(total)-num(fijos));if(t<100)return 0;
  return Math.max(10,Math.floor(t*0.02/10)*10);
}
export function atajosSupervivencia(total,fijos){
  var s=ahorroSimbolico(total,fijos),l=[{monto:0,t:'Nada esta vez'}];
  if(s>0)l.push({monto:s,t:'Algo simbólico'});
  return l;
}

/* ---------- La plata que te va a entrar ---------- */
function fechaOk(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&iso(parse(s))===s}
export function normEsperado(l){
  if(!Array.isArray(l))return [];
  return l.filter(function(x){return x&&typeof x==='object'&&num(x.monto)>0&&fechaOk(x.fecha)})
    .map(function(x){return {id:String(x.id||uid()),fecha:x.fecha,monto:Math.round(num(x.monto)),nota:String(x.nota||'').trim().slice(0,40)}})
    .sort(function(a,b){return a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0});
}
/* Valida y anota. Devuelve {ok, error?, item?} */
export function agregarEsperado(st,d,hoy){
  var p=st.plan,m=Math.round(num(d&&d.monto)),f=d&&d.fecha;
  if(!(m>0))return {ok:false,error:'monto'};
  if(!fechaOk(f))return {ok:false,error:'fecha'};
  if(f<hoy)return {ok:false,error:'pasada'};
  if(f>=p.cobro)return {ok:false,error:'despues'};
  var it={id:uid(),fecha:f,monto:m,nota:String(d.nota||'').trim().slice(0,40)};
  p.esperado=normEsperado((p.esperado||[]).concat([it]));
  return {ok:true,item:it};
}
/* «Me entró»: se suma a tu plata (lo que entró de verdad, que puede ser distinto de lo esperado) */
export function recibirEsperado(st,id,real){
  var p=st.plan,l=normEsperado(p.esperado),it=l.filter(function(x){return x.id===id})[0];if(!it)return null;
  var m=real===undefined||real===null||real===''?it.monto:Math.round(num(real));if(!(m>=0))m=it.monto;
  var u={item:it,montoAntes:num(p.monto),entro:m};
  p.esperado=l.filter(function(x){return x.id!==id});
  p.monto=Math.round((num(p.monto)+m)*100)/100;
  return u;
}
/* «No va a entrar»: se borra sin tocar tu plata */
export function quitarEsperado(st,id){
  var p=st.plan,l=normEsperado(p.esperado),it=l.filter(function(x){return x.id===id})[0];if(!it)return null;
  p.esperado=l.filter(function(x){return x.id!==id});
  return {item:it,montoAntes:num(p.monto),entro:0};
}
export function deshacerEsperado(st,u){
  var p=st.plan;p.monto=u.montoAntes;
  p.esperado=normEsperado((p.esperado||[]).filter(function(x){return x.id!==u.item.id}).concat([u.item]));
}

/* ---------- Lo que se ve en Hoy ----------
   null si no corresponde (sin plan, después del cobro o con plata suficiente).
   ritmo: lo que gastaste por día desde que empezó el plan (con 3 días o más y algún gasto).
   alcanza: a ese ritmo, hasta qué día te alcanza (o si llegás al cobro). */
export function estadoSupervivencia(st,pc,hoy){
  var p=st.plan;
  if(!(num(p.monto)>0)||hoy>=p.cobro)return null;
  var desde=hoy<p.inicio?p.inicio:hoy,dias=Math.max(1,diffDays(desde,p.cobro));
  var resto=pc.gastar-pc.spentInPlan;
  if(!enSupervivencia(resto+pc.ahorro,0,dias))return null;
  var r={dias:dias,resto:resto,ahorro:pc.ahorro,porDia:Math.max(0,resto)/dias,fijosPend:fijosPendientes(st,pc)};
  r.porSemana=Math.min(Math.max(0,resto),r.porDia*7);
  var pasados=hoy>=p.inicio?diffDays(p.inicio,hoy)+1:0,gastado=0,hay=false;
  st.gastos.forEach(function(g){if(g.fecha>=p.inicio&&g.fecha<=hoy){gastado+=num(g.monto);hay=true}});
  r.ritmo=pasados>=3&&hay?gastado/pasados:null;
  if(r.ritmo>0){
    var n=Math.floor(Math.max(0,resto)/r.ritmo);
    r.alcanza=n>=dias?{llega:true,dias:n}:{llega:false,dias:n,hasta:iso(addDays(parse(desde),Math.max(0,n-1)))};
  }else r.alcanza=null;
  var l=normEsperado(p.esperado);
  r.esperado=l;r.llego=l.filter(function(x){return x.fecha<=hoy});
  r.totalEsperado=0;l.forEach(function(x){r.totalEsperado+=x.monto});
  return r;
}
