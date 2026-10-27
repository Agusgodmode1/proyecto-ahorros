/* El pacto (puro, sin DOM): los tres datos con los que arranca el libro.
   - total: con cuánta plata empezás (pesos + dólares × cotización).
   - ahorro: cuánto de eso querés guardar.
   - cobro: qué día volvés a cobrar.
   Los tres viven en state.plan (monto, ahorro, cobro), igual que siempre: ningún número se guarda dos veces.
   state.pacto solo anota cuándo se selló, cuántos pactos llevás y si parte de la plata era en dólares. */
import {num} from './util.js';
import {iso,parse,addDays,diffDays,esFeriado,esLaborable,bizRank} from './fechas.js';
import {planCalc,cobroDesde,cfgCobro,totalFijos} from './plan.js';
import {frecDe,fraccionMes,reglaDesdeFecha,porMes} from './frecuencia.js';
import {disponible,maxAhorro,ajustarSaldo,deshacerAjuste} from './saldo.js';

/* Por debajo de esto por día se avisa (sin bloquear): es poco para el día a día */
export var DIA_BAJO=300;

export function pactoBase(){return {sellado:null,numero:0,usd:0,apartado:[]}}

/* ---------- La plata apartada (2.17) ----------
   De lo que tenés, una parte puede no ser para gastar: ahorro que ya tenías, plata para algo puntual
   (una deuda, una compra, un viaje) o plata de otra persona. Vive en state.pacto.apartado
   [{id, tipo, monto, nota}] y NO entra en el plan: plan.monto es solo lo que se puede usar.
   Cuando decís cuánta plata tenés (el total, como lo ves en el banco), se descuenta sola. */
export var TIPOS_APARTADO=[
  {id:'ahorro',t:'Ahorro que ya tenía',c:'Mi ahorro'},
  {id:'reserva',t:'Para algo puntual',c:'Para pagar algo',ej:'una deuda, una compra, un viaje'},
  {id:'ajena',t:'Plata de otra persona',c:'De otra persona'}
];
function tipoOk(t){for(var i=0;i<TIPOS_APARTADO.length;i++)if(TIPOS_APARTADO[i].id===t)return t;return 'reserva'}
/* Deja la lista prolija: solo montos positivos, tipos conocidos, nota corta, pesos redondeados */
export function normApartado(l){
  if(!Array.isArray(l))return [];
  return l.map(function(x,i){x=x&&typeof x==='object'?x:{};return {id:String(x.id||('ap'+i)),tipo:tipoOk(x.tipo),monto:Math.round(Math.max(0,num(x.monto))),nota:String(x.nota||'').trim().slice(0,40)}})
    .filter(function(x){return x.monto>0});
}
/* Total apartado: de una lista o del estado */
export function totalApartado(x){
  var l=Array.isArray(x)?x:(x&&x.pacto&&x.pacto.apartado)||[],t=0;
  l.forEach(function(a){t+=Math.max(0,num(a&&a.monto))});return Math.round(t);
}
/* Lo apartado por tipo: {ahorro, reserva, ajena} */
export function apartadoPorTipo(st){
  var r={ahorro:0,reserva:0,ajena:0};
  normApartado(st&&st.pacto&&st.pacto.apartado).forEach(function(a){r[a.tipo]+=a.monto});return r;
}
/* Lo que queda para el plan: el total menos lo apartado (nunca negativo) */
export function totalLibre(total,apartado){return Math.max(0,Math.round(num(total))-totalApartado(normApartado(apartado)))}

/* Pesos + dólares a la cotización que pusiste, redondeado a pesos */
export function totalPacto(pesos,usd,cotiz){
  var t=Math.max(0,num(pesos))+(num(usd)>0&&num(cotiz)>0?num(usd)*num(cotiz):0);
  return Math.round(t);
}

/* El cobro que te propone el libro: con el perfil de sueldo, su regla (5.º día hábil, último hábil o día fijo);
   sin perfil, el 5.º día hábil. Solo cuentan los feriados no laborables (fechas.js). */
export function sugerirCobro(st,hoy,frec){
  /* (2.23) con la regla que elegiste en «¿Cómo te entra la plata?» */
  if(frec&&typeof frec==='object'){
    var c=frec,fq=frecDe(c),f=cobroDesde(hoy,fq==='mensual'?Object.assign({tipo:'habil5'},c):c);
    if(fq==='ventas'&&diffDays(hoy,f)<7)f=cobroDesde(f,c);
    return {fecha:f,perfil:true,tipo:c.tipo||'habil5',frecuencia:fq};
  }
  var conPerfil=!!(st&&st.perfil&&st.perfil.hecho),guardada=frecDe(st&&st.perfil&&st.perfil.cobro);
  frec=frec?frecDe({frecuencia:frec}):guardada;
  /* (2.19) otra frecuencia: la regla guardada si es la misma; si no, la de por defecto (viernes, 1 y 15, una semana) */
  var cfg=frec!=='mensual'?(guardada===frec?cfgCobro(st):{frecuencia:frec}):conPerfil?Object.assign({},cfgCobro(st),{frecuencia:'mensual'}):{tipo:'habil5'};
  if(frec==='semanal'&&guardada!=='semanal')cfg.dow=parse(hoy).getDay(); /* sin saber el día: dentro de una semana */
  var fecha=cobroDesde(hoy,cfg);
  /* (2.21) cuando vendo: hasta el 1 del mes que viene; si faltan menos de 7 días, hasta el 1 del otro (un pacto de pocos días no sirve) */
  if(frec==='ventas'&&diffDays(hoy,fecha)<7)fecha=cobroDesde(fecha,cfg);
  return {fecha:fecha,perfil:conPerfil||guardada===frec&&frec!=='mensual',tipo:cfg.tipo||'habil5',frecuencia:frec};
}

/* ---------- Los fijos cuando no cobrás por mes (2.19) ----------
   Cobrando cada semana, cada 15 días o por jornal, cada pacto aparta su parte de los fijos del mes
   (un alquiler de $ 20.000 son unos $ 4.600 por semana) en «Para los fijos», dentro de lo apartado.
   Cuando un fijo vence en el pacto, se paga primero con esa reserva. Mensual: nada cambia. */
export var RESERVA_FIJOS='res-fijos';
export function reservaFijos(st,frec,apartado,desde,hasta,vencen){
  var f=frecDe({frecuencia:frec}),r=0;
  (Array.isArray(apartado)?apartado:[]).forEach(function(a){if(a&&a.id===RESERVA_FIJOS)r+=Math.max(0,num(a.monto))});
  if(porMes({frecuencia:f})||!(st.fijos||[]).length)return {parte:0,usa:0,reserva:r,queda:r};
  var parte=Math.round(totalFijos(st.fijos,st)*fraccionMes({frecuencia:f},desde,hasta)),usa=Math.min(r,Math.max(0,num(vencen)));
  return {parte:parte,usa:usa,reserva:r,queda:r-usa+parte};
}

/* Copia del estado con el pacto puesto, para hacer las cuentas sin tocar el original */
/* ---------- Lo que se carga en el prólogo (2.23): pagos fijos e ingresos fijos nuevos ---------- */
export function normFijosNuevos(l){
  if(!Array.isArray(l))return [];
  return l.filter(function(x){return x&&num(x.monto)>0}).map(function(x,i){return {id:String(x.id||('fn'+i)),nombre:String(x.nombre||'Gasto fijo').trim().slice(0,40)||'Gasto fijo',monto:Math.round(num(x.monto)),dia:Math.min(31,Math.max(1,Math.round(num(x.dia))||1)),cat:String(x.cat||'Otros')}});
}
export function normIngresosNuevos(l){
  if(!Array.isArray(l))return [];
  return l.filter(function(x){return x&&num(x.monto)>0}).map(function(x,i){return {id:String(x.id||('in'+i)),nombre:String(x.nombre||'Ingreso').trim().slice(0,40)||'Ingreso',monto:Math.round(num(x.monto)),dia:Math.min(31,Math.max(1,Math.round(num(x.dia))||1))}});
}
/* El estado con los fijos que estás cargando en el prólogo, para hacer las cuentas */
function conFijos(st,d){var n=normFijosNuevos(d&&d.fijos);return n.length?Object.assign({},st,{fijos:(st.fijos||[]).concat(n)}):st}
function frecPacto(st,d){return d&&d.cobroCfg?frecDe(d.cobroCfg):d&&d.frecuencia?d.frecuencia:frecDe(st.perfil&&st.perfil.cobro)}
function conPacto(st,d,hoy){
  var plan=Object.assign({},st.plan,{monto:Math.max(0,num(d.total)),modo:'monto',ahorro:Math.max(0,Math.round(num(d.ahorro))),inicio:hoy,cobro:d.cobro});
  return Object.assign({},st,{plan:plan,gastos:[]});
}
function fechaOk(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&iso(parse(s))===s}

/* Lo que se ve al instante: cuánto queda para gastar, por día y por cuántos días.
   Los fijos que vencen antes de cobrar se descuentan primero (con un pacto nuevo y fijos ya cargados). */
export function cuentaPacto(st,d,hoy){
  st=conFijos(st,d);
  var bruto=Math.max(0,num(d.total)),apartado=totalApartado(normApartado(d.apartado)),total=Math.max(0,bruto-apartado),cobro=fechaOk(d.cobro)&&d.cobro>hoy?d.cobro:sugerirCobro(st,hoy,d.cobroCfg).fecha;
  var pc=planCalc(conPacto(st,{total:total,ahorro:d.ahorro,cobro:cobro},hoy));
  var rf=reservaFijos(st,frecPacto(st,d),normApartado(d.apartado),hoy,cobro,pc.fijos);
  total=Math.max(0,total+rf.usa-rf.parte);
  var maxAhorro=Math.max(0,total-pc.fijos),ahorro=Math.min(Math.max(0,Math.round(num(d.ahorro))),maxAhorro);
  var gastar=Math.max(0,total-pc.fijos-ahorro);
  return {total:total,bruto:bruto,apartado:apartado,reserva:rf,ahorro:ahorro,pct:total>0?ahorro/total:0,fijos:pc.fijos,maxAhorro:maxAhorro,gastar:gastar,dias:pc.total,porDia:gastar/pc.total,cobro:cobro,
    /* (2.18) aunque no guardes nada, da menos de DIA_BAJO por día: modo supervivencia */
    supervivencia:total>0&&(total-pc.fijos)/Math.max(1,pc.total)<DIA_BAJO};
}

/* Valida los tres datos. Devuelve {ok, errores:{total?,ahorro?,cobro?}, avisos:[texto], cuenta}.
   Los errores frenan; los avisos son amables y no bloquean. */
export function validarPacto(st,d,hoy){
  var e={},avisos=[],total=num(d.total),ahorro=num(d.ahorro);
  if(!(total>0))e.total='Escribí con cuánta plata empezás: tiene que ser más que cero.';
  if(d.ahorro===''||d.ahorro===null||d.ahorro===undefined||!isFinite(ahorro)||ahorro<0)e.ahorro='Elegí cuánto querés ahorrar (puede ser poquito).';
  var ap=totalApartado(normApartado(d.apartado));
  /* 'mas' = lo apartado pasa lo que tenés; 'todo' = no queda nada para el plan (la pantalla arma el texto con money()) */
  if(!e.total&&ap>0&&ap>=total)e.apartado=ap>total?'mas':'todo';
  var libre=Math.max(0,total-ap);
  if(!e.ahorro&&!e.apartado&&total>0&&ahorro>libre)e.ahorro=ap>0?'No podés ahorrar más de lo que te queda para usar: como mucho, todo eso.':'No podés ahorrar más de lo que tenés: como mucho, todo.';
  if(!fechaOk(d.cobro))e.cobro='Elegí qué día volvés a cobrar.';
  else if(d.cobro<=hoy)e.cobro='El día de cobro tiene que ser después de hoy.';
  var c=cuentaPacto(st,d,hoy);
  if(!e.ahorro&&!e.total&&!e.apartado&&ahorro>c.maxAhorro+0.5)e.ahorro='fijos'; /* la pantalla dice el máximo con money() */
  if(!e.total&&!e.ahorro&&!e.cobro&&!e.apartado){
    if(ahorro<0.5)avisos.push('cero');
    if(c.porDia<DIA_BAJO)avisos.push('bajo');
  }
  return {ok:!Object.keys(e).length,errores:e,avisos:avisos,cuenta:c};
}

/* Paso del control deslizante del ahorro: fino con poca plata, de a $ 100 con más */
export function pasoAhorro(total){var t=num(total);return t>=20000?100:t>=2000?50:10}
/* Atajos 10, 20 y 30 % del total, redondeados al paso */
export function atajosPacto(total){
  var t=num(total),p=pasoAhorro(t);if(!(t>0))return [];
  return [10,20,30].map(function(pct){return {pct:pct,monto:Math.round(t*pct/100/p)*p}});
}

/* Sella el pacto: pasa los tres datos al plan (que es de donde sale todo) y anota el sello.
   El plan arranca hoy. Si había dólares, la cotización queda como la del día en Ajustes. */
export function sellarPacto(st,d,hoy){
  var v=validarPacto(st,d,hoy);if(!v.ok)return v;
  var p=st.plan;
  p.monto=v.cuenta.total;p.modo='monto';p.ahorro=Math.round(v.cuenta.ahorro);p.inicio=hoy;p.cobro=d.cobro;
  /* (2.18) de la plata que esperabas, sigue la que todavía no llegó y entra antes de este cobro */
  p.esperado=(Array.isArray(p.esperado)?p.esperado:[]).filter(function(x){return x&&x.fecha>=hoy&&x.fecha<d.cobro});
  /* (2.20) de los ingresos fijos respondidos, quedan solo los de hoy en adelante */
  p.vistos=(Array.isArray(p.vistos)?p.vistos:[]).filter(function(id){return String(id).slice(-10)>=hoy});
  if(!st.pacto)st.pacto=pactoBase();
  /* (2.19) la reserva para los fijos: lo que tenía, menos lo que se usa para pagar los que vencen, más la parte de este pacto */
  var rf=v.cuenta.reserva,ap=normApartado(d.apartado).filter(function(a){return a.id!==RESERVA_FIJOS});
  if(rf.queda>0)ap.push({id:RESERVA_FIJOS,tipo:'reserva',monto:Math.round(rf.queda),nota:'para los fijos'});
  st.pacto.apartado=ap;
  /* (2.23) los pagos fijos y los ingresos fijos que cargaste en el prólogo */
  normFijosNuevos(d.fijos).forEach(function(f,i){f.id='f'+Date.now().toString(36)+i;st.fijos.push(f)});
  normIngresosNuevos(d.ingresos).forEach(function(x,i){x.id='i'+Date.now().toString(36)+i;st.ingresosFijos=(st.ingresosFijos||[]).concat([x])});
  /* (2.23) cómo te entra la plata: la regla que elegiste; por jornal, el plan dura hasta el día que tocaste */
  if(d.cobroCfg&&st.perfil){
    var cc=Object.assign({},st.perfil.cobro,d.cobroCfg),fc=frecDe(cc);cc.frecuencia=fc;
    if(fc==='jornal')cc.horizonte=Math.max(1,Math.min(31,diffDays(hoy,d.cobro)));
    st.perfil.cobro=cc;
  }
  /* (2.19) cada cuánto cobrás: la regla sale del día que tocaste */
  else if(d.frecuencia&&st.perfil){var fr=frecDe({frecuencia:d.frecuencia});st.perfil.cobro=fr==='mensual'?Object.assign({},st.perfil.cobro,{frecuencia:'mensual'}):reglaDesdeFecha(fr,d.cobro,hoy,st.perfil.cobro)}
  /* (2.21) lo vendido y la ganancia guardada son de cada pacto */
  p.entradas=[];p.ganancia={};
  /* (2.22) el gasto por día con el que arrancó el pacto: la vara de «Tu plata alcanza» hasta que haya gastos */
  p.porDiaBase=Math.round(v.cuenta.porDia*100)/100;
  /* (2.23) por jornal, la parte de cada cobro que guardás la elegís en el prólogo */
  st.pacto.pct=d.pctCobro!==undefined&&d.pctCobro!==null&&d.pctCobro!==''?Math.max(0,Math.min(1,num(d.pctCobro)/100)):v.cuenta.total>0?Math.round(v.cuenta.ahorro/v.cuenta.total*1000)/1000:0;
  st.pacto.sellado=hoy;st.pacto.numero=(Math.round(num(st.pacto.numero))||0)+1;
  st.pacto.usd=num(d.usd)>0&&num(d.cotiz)>0?Math.round(num(d.usd)*100)/100:0;
  if(st.pacto.usd&&st.monedas){st.monedas.cotizacion=num(d.cotiz);st.monedas.fecha=hoy}
  return v;
}

/* Quien ya usaba la app no ve el prólogo: su plan de siempre pasa a ser su pacto, sellado el día que empezó. */
export function pactoDesdePlan(st,hoy){
  var p=st.plan||{};
  return {sellado:fechaOk(p.inicio)?p.inicio:hoy,numero:1,usd:0,apartado:[]};
}

/* Calendario del mes (para elegir el cobro): semanas de lunes a domingo, con huecos (null) al principio y al final.
   Cada día: {fecha, dia, pasado, hoy, feriado (solo los no laborables), habil (n.º de día hábil o null)} */
export function mesCalendario(y,m,hoy){
  var b=new Date(y,m,1,12);y=b.getFullYear();m=b.getMonth();
  var lead=(b.getDay()+6)%7,celdas=[],d=b;
  for(var i=0;i<lead;i++)celdas.push(null);
  while(d.getMonth()===m){
    var s=iso(d);
    celdas.push({fecha:s,dia:d.getDate(),pasado:s<=hoy,hoy:s===hoy,feriado:esFeriado(s)&&!esLaborable(s),habil:bizRank(s)});
    d=addDays(d,1);
  }
  while(celdas.length%7)celdas.push(null);
  var semanas=[];for(var k=0;k<celdas.length;k+=7)semanas.push(celdas.slice(k,k+7));
  return {y:y,m:m,semanas:semanas};
}

/* Texto corto de días: "1 día", "23 días" */
export function diasTxt(a,b){var n=diffDays(a,b);return n+' '+(n===1?'día':'días')}

/* ---------- Ajustes del pacto: cambiar los tres datos a mitad de camino ----------
   d = {tenes, ahorro, cobro}. «tenes» es la plata que tenés de verdad hoy: si es distinta de lo anotado,
   pasa por ajustarSaldo (gasto «Ajuste de saldo» o plata que entró), igual que «Actualizar saldo».
   Topes: nunca negativo y el ahorro no pasa de lo que podés guardar (tenés − fijos que faltan pagar). */
function copia(x){return JSON.parse(JSON.stringify(x))}
/* Los pagos de los fijos se guardan por fecha de cobro: si cambia el cobro, pasan a la fecha nueva */
function moverPagos(st,de,a){
  if(de===a||!st.fijosPagos||!st.fijosPagos[de]||st.fijosPagos[a])return false;
  st.fijosPagos[a]=st.fijosPagos[de];delete st.fijosPagos[de];return true;
}
export function previaAjuste(st,d,hoy){
  var e={},tenes=num(d.tenes),ahorro=num(d.ahorro);
  if(d.tenes===''||d.tenes===null||d.tenes===undefined||!isFinite(tenes)||tenes<0)e.tenes='Poné cuánta plata tenés hoy. No puede ser negativa.';
  if(d.ahorro===''||d.ahorro===null||d.ahorro===undefined||!isFinite(ahorro)||ahorro<0)e.ahorro='Poné cuánto querés guardar (puede ser cero).';
  if(!fechaOk(d.cobro))e.cobro='Elegí qué día cobrás.';
  else if(d.cobro<=hoy)e.cobro='El día de cobro tiene que ser después de hoy.';
  else if(d.cobro<=st.plan.inicio)e.cobro='El día de cobro tiene que ser después del inicio del plan.';
  else if(diffDays(st.plan.inicio,d.cobro)>120)e.cobro='El plan cubriría más de 120 días. Revisá la fecha.';
  var c=copia(st);
  if(!e.cobro){moverPagos(c,c.plan.cobro,d.cobro);c.plan.cobro=d.cobro}
  if(!e.tenes)ajustarSaldo(c,tenes,hoy);
  var mx=maxAhorro(c,planCalc(c));
  if(!e.ahorro&&ahorro>mx+0.5)e.ahorro='max'; /* la pantalla dice el máximo con money() */
  c.plan.modo='monto';c.plan.ahorro=Math.round(Math.min(Math.max(0,ahorro),mx));
  var pc=planCalc(c),resto=pc.gastar-pc.spentInPlan,dias=Math.max(1,diffDays(hoy<c.plan.inicio?c.plan.inicio:hoy,c.plan.cobro));
  return {ok:!Object.keys(e).length,errores:e,maxAhorro:mx,disponible:disponible(c,pc),gastar:resto,porDia:resto/dias,dias:dias,bajo:resto/dias<DIA_BAJO};
}
/* Aplica el ajuste y devuelve lo necesario para «Deshacer» (en v.deshacer). Si no es válido, no toca nada. */
export function aplicarAjuste(st,d,hoy){
  var v=previaAjuste(st,d,hoy);if(!v.ok)return v;
  var p=st.plan,u={cobro:p.cobro,ahorro:p.ahorro,modo:p.modo,movio:false};
  u.movio=moverPagos(st,p.cobro,d.cobro);p.cobro=d.cobro;
  u.saldo=ajustarSaldo(st,num(d.tenes),hoy);
  p.modo='monto';p.ahorro=Math.round(num(d.ahorro));
  v.deshacer=u;return v;
}
export function deshacerAjustePacto(st,u){
  var p=st.plan;
  if(u.saldo)deshacerAjuste(st,u.saldo);
  if(u.movio)moverPagos(st,p.cobro,u.cobro);
  p.cobro=u.cobro;p.ahorro=u.ahorro;p.modo=u.modo;
}

/* ---------- Cambiar lo apartado a mitad del pacto (2.17) ----------
   Apartar más saca esa plata de lo que podés usar; liberar algo la suma. El total que tenés no cambia.
   No se puede apartar más de lo que tenés disponible hoy. */
export function previaApartado(st,lista){
  var nueva=normApartado(lista),antes=totalApartado(st),despues=totalApartado(nueva),diff=despues-antes;
  var pc=planCalc(st),disp=disponible(st,pc);
  if(diff>0&&diff>disp+0.5)return {ok:false,error:'max',max:Math.max(0,Math.floor(disp)),diff:diff,lista:nueva};
  return {ok:true,diff:diff,lista:nueva,total:despues};
}
export function aplicarApartado(st,lista){
  var v=previaApartado(st,lista);if(!v.ok)return v;
  if(!st.pacto)st.pacto=pactoBase();
  v.deshacer={lista:copia(st.pacto.apartado||[]),monto:st.plan.monto,ahorro:st.plan.ahorro};
  st.pacto.apartado=v.lista;st.plan.monto=Math.max(0,Math.round((num(st.plan.monto)-v.diff)*100)/100);
  /* si quedó un ahorro más grande de lo que se puede, se baja al máximo */
  var mx=maxAhorro(st,planCalc(st));if(st.plan.modo==='monto'&&num(st.plan.ahorro)>mx)st.plan.ahorro=Math.floor(mx);
  return v;
}
export function deshacerApartado(st,u){if(!st.pacto)st.pacto=pactoBase();st.pacto.apartado=u.lista;st.plan.monto=u.monto;st.plan.ahorro=u.ahorro}

/* ---------- «Cobré» (2.19, cobro por jornal) y «Entró plata» (2.21, cuando vendo) ----------
   Lo que cobrás se suma a tu plata. Por jornal se guarda solo el mismo porcentaje del pacto (state.pacto.pct);
   cuando vendo no: la ganancia se guarda semana a semana (logica/ventas.js).
   Cada entrada queda anotada en state.plan.entradas [{id, fecha, monto, nota}] para sumar lo vendido por semana. */
export function cobreJornal(st,monto,hoy,nota){
  var x=Math.round(num(monto));if(!(x>0))return null;
  var p=st.plan,ventas=frecDe(st.perfil&&st.perfil.cobro)==='ventas';
  var pct=ventas?0:Math.max(0,Math.min(1,num(st.pacto&&st.pacto.pct))),g=Math.round(x*pct);
  var e={id:'en'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),fecha:hoy||p.inicio,monto:x,nota:String(nota||'').trim().slice(0,40)};
  var u={monto:p.monto,ahorro:p.ahorro,modo:p.modo,cobro:x,guarda:g,entrada:e.id};
  p.monto=Math.round((num(p.monto)+x)*100)/100;
  if(p.modo==='monto')p.ahorro=Math.round(num(p.ahorro))+g;
  p.entradas=(Array.isArray(p.entradas)?p.entradas:[]).concat([e]);
  return u;
}
export function deshacerCobre(st,u){var p=st.plan;p.monto=u.monto;p.ahorro=u.ahorro;p.modo=u.modo;p.entradas=(p.entradas||[]).filter(function(e){return e.id!==u.entrada})}
