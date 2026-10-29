/* Capítulo V · Tarjeta, lo pesado (2.13): se carga recién al abrir el capítulo (o, si hay extracto, cuando el
   teléfono está libre, para el aviso de Hoy). Lee el extracto de cualquier banco (logica/bancos.js), busca por
   dónde se te va la plata (logica/detector.js) y lo dibuja (ui/graficos.js). El extracto nunca suma gastos solo:
   se compara con lo que anotaste y vos elegís qué agregar (logica/control.js). */
import {diffDays,DIAL,MESL} from '../logica/fechas.js';
import {num,uid} from '../logica/util.js';
import {addD} from '../logica/extracto.js';
import {leerMovimientos,analizarMovimientos,filasATexto,firma} from '../logica/bancos.js';
import {detectar,textos,avisoHoy as elegirAviso,principales,porDiaDelMes,nivelDia,ritmoContraPlan,anillo} from '../logica/detector.js';
import {cruzar,hormigas} from '../logica/control.js';
import {nombresVisibles,nombreDe,colorDe} from '../logica/categorias.js';
import {ctx,$,today,planNow,money,esc,fCorta,cap,titulo,tile,toast,exHook,colorCat} from './comun.js';
import {catDe} from './gastos.js';
import {anilloHTML,calendarioHTML,diaHTML,porDondeHTML,ticketHTML,mesAMesSVG,ritmoSVG,lectura,fechaCorta} from './graficos.js';

var cache={k:null,v:null},faltan=[],vista={an:-1,mes:null,dia:null,cols:null,colsAbierto:false,serie:null};
var TIPO_TXT={banco:'cuenta',tarjeta:'tarjeta',billetera:'billetera'};

function mapa(c){return nombreDe(ctx.state,c)}
function planDia(){var p=ctx.state.plan,pd=Math.max(1,diffDays(p.inicio,p.cobro));return planNow().gastar/pd}
/* Todo lo del extracto, una sola vez por cambio (texto, cómo vienen los montos, categorías, columnas…) */
export function analisis(){
  var st=ctx.state,ex=st.extracto;
  if(!ex.texto||!ex.texto.trim())return null;
  /* (2.15) la clave es barata: no recalcula el plan (eso se hace solo si cambió algo) */
  var pl=st.plan,fx=0;(st.fijos||[]).forEach(function(f){fx+=Number(f.monto)||0});
  var k=[ex.texto.length,ex.texto.slice(0,300),ex.texto.slice(-300),ex.formato,ex.hormiga,JSON.stringify(ex.cat),JSON.stringify(ex.columnas||{}),today(),
    (st.categorias||[]).map(function(c){return c.nombre+(c.oculta?'-':'+')+c.bases.join(',')}).join(';'),pl.monto,pl.ahorro,pl.modo,pl.pct,pl.inicio,pl.cobro,fx,(st.fijos||[]).length,(st.grupos||[]).length].join('|');
  if(cache.k===k)return cache.v;
  var r=leerMovimientos(ex.texto,today(),{formato:ex.formato,columnas:ex.columnas}),A=analizarMovimientos(r,ex,mapa);
  var H=A?detectar(r,A,{planDia:planDia()}):[];
  cache={k:k,v:{r:r,A:A,H:H}};
  return cache.v;
}
/* Logros y Fijos usan el mismo análisis (con los nombres limpios) en cuanto este módulo está cargado */
exHook.f=function(){var x=analisis();return x&&x.A};

function nombre(x){return function(k){return x.r.nombres[k]||titulo(k)}}
function txt(h,x){var t=textos(h,money,fCorta);return t}
function catSelect(k,cur,nom){
  var l=nombresVisibles(ctx.state);if(l.indexOf(cur)<0)l=l.concat([cur]);
  return '<span class="cat-cell"><i class="dot" style="background:'+colorCat(colorDe(ctx.state,cur))+'"></i><select class="cat-sel" data-catk="'+esc(k)+'" aria-label="Categoría de '+esc(nom)+'">'+l.map(function(c){return '<option'+(c===cur?' selected':'')+'>'+esc(c)+'</option>'}).join('')+'</select></span>';
}
function bars(items,fmt){
  var mx=0;items.forEach(function(x){if(x.v>mx)mx=x.v});
  return '<div class="stack" style="gap:10px">'+items.map(function(x){
    var w=mx?Math.max(2,Math.round(x.v/mx*100)):0;
    return '<div class="bar-row"><span class="bar-l">'+esc(x.l)+'</span><span class="bar-track"><span class="bar-fill'+(x.dim?' dim':'')+'" style="width:'+w+'%"></span></span><span class="bar-v">'+fmt(x)+'</span></div>';
  }).join('')+'</div>';
}

/* ---------- ¿Qué columna es cada cosa? (planillas) ---------- */
var CAMPOS=[['fecha','Fecha'],['detalle','Detalle'],['monto','Importe (uno solo, con signo)'],['debito','Débito (lo que sale)'],['credito','Crédito (lo que entra)']];
function columnasHTML(x){
  var T=x.r.tabla.T,cols=vista.cols||x.r.tabla.cols,cab=T.filas[T.cab]||[],ej=T.filas.slice(T.cab+1,T.cab+4);
  var op=function(c){return '<option value="-1">(ninguna)</option>'+cab.map(function(t,i){return '<option value="'+i+'"'+(cols[c]===i?' selected':'')+'>'+esc(String(t||'columna '+(i+1)).slice(0,30))+(ej[0]&&ej[0][i]!==undefined&&String(ej[0][i]).trim()?' · '+esc(String(ej[0][i]).slice(0,18)):'')+'</option>'}).join('')};
  return '<div class="card stack tone-sky" id="gas-cols"><div class="sec"><h2>¿Qué columna es cada cosa?</h2><p class="note">'+(x.r.tabla.seguro?'Así leí tu planilla. Si algo no cierra, cambialo.':'No estoy seguro de cómo viene tu planilla. Revisá cada columna y tocá «Listo»: la próxima vez que traigas una de '+esc(x.r.banco.nombre)+' la leo sola.')+'</p></div>'
    +'<div class="grid2">'+CAMPOS.map(function(c){return '<div class="field"><label class="sub-l" for="gcol-'+c[0]+'">'+c[1]+'</label><select id="gcol-'+c[0]+'" data-gcol="'+c[0]+'">'+op(c[0])+'</select></div>'}).join('')+'</div>'
    +'<p class="note">Con «Importe» alcanza; si tu banco separa lo que sale y lo que entra, elegí «Débito» y «Crédito».</p>'
    +'<div class="row-btns"><button class="btn primary" type="button" data-gcols="ok">Listo, recordalo</button>'+(x.r.tabla.seguro?'<button class="btn quiet" type="button" data-gcols="cerrar">Cerrar</button>':'')+'</div></div>';
}

/* ---------- La página ---------- */
export function render(){
  var state=ctx.state,ex=state.extracto,out=$('#gas-out'),st=$('#gas-stat'),inD=$('#gas-in-d');
  var x=analisis();
  if(!x){st.textContent='';if(inD)inD.textContent='Pegalo o elegí el archivo';out.innerHTML=vacio();return}
  var r=x.r,A=x.A,nom=nombre(x);
  if(!A){
    st.innerHTML='<b>No pude leer movimientos.</b> Cada línea tiene que tener la fecha (por ejemplo 09/10/2026), el detalle y el importe.'+(r.tabla?'':' Si es una planilla, probá elegir el archivo.');
    out.innerHTML=r.tabla?columnasHTML(x):'';if(inD)inD.textContent='No pude leerlo';return;
  }
  var de=r.banco.id!=='generico'?' de <b>'+esc(r.banco.nombre)+'</b> ('+(r.banco.tarjeta?'tarjeta':TIPO_TXT[r.banco.tipo])+')':'';
  var s='Leí <b>'+r.movs.length+' movimientos</b>'+de+' del '+esc(fCorta(A.desde))+' al '+esc(fCorta(A.hasta))+'.';
  if(r.bad.length)s+=' No entendí '+r.bad.length+' línea'+(r.bad.length>1?'s':'')+'.';
  if(r.dudosos)s+=' En '+r.dudosos+' no supe si era gasto o ingreso y lo conté como gasto; si no cierra, cambiá «Cómo vienen los montos» (en Más opciones).';
  if(A.usdN)s+=' Dejé afuera '+A.usdN+' en dólares.';
  if(r.tabla&&r.tabla.seguro&&!vista.colsAbierto)s+=' <button class="linklike" type="button" data-gcols="abrir">¿Leí mal las columnas?</button>';
  st.innerHTML=s+(r.bad.length?'<details class="sub-d"><summary>Ver las líneas que no entendí</summary><div class="muted mono-l">'+r.bad.slice(0,8).map(esc).join('<br>')+'</div></details>':'');
  if(inD)inD.textContent=(r.banco.id!=='generico'?r.banco.nombre+' · ':'')+r.movs.length+' movimientos · '+fCorta(A.desde)+' al '+fCorta(A.hasta);
  var h='';
  if(r.tabla&&(!r.tabla.seguro||vista.colsAbierto))h+=columnasHTML(x);
  var H=x.H,P=principales(H,3),pd=planDia(),rit=H.filter(function(hh){return hh.tipo==='ritmo'})[0];
  /* (2.15) un índice para no perderse en una página larga */
  var ind=[['tj-ritmo','Ritmo',pd>0],['tj-pdv','Por dónde',P.length],['tj-an','Categorías',1],['tj-cals','Calendario',1],['tj-subs','Suscripciones',H.some(function(hh){return hh.tipo==='subs'})],
    ['tj-todo','Encontré',H.length>P.length],['tj-rit','Mes a mes',1],['control-card','Control',1],['tj-com','Comercios',1]].filter(function(z){return z[2]});
  h+='<nav class="tj-ind" aria-label="Partes de la Tarjeta" data-nodeslizar>'+ind.map(function(z){return '<button type="button" data-tjir="'+z[0]+'">'+z[1]+'</button>'}).join('')+'</nav>';
  /* (2.15) «a este ritmo», aparte: es el resumen de todo */
  if(pd>0)h+='<div class="tj-ritmo'+(rit?' mal':'')+'" id="tj-ritmo"><p class="tj-ritmo-t">A este ritmo</p><p>Gastás <b>'+money(A.porDia)+'</b> por día y tu plan da <b>'+money(pd)+'</b>'
    +(rit?': <b class="mal-t">'+money(rit.mes)+' de más</b> por mes. Bajá '+money(A.porDia-pd)+' por día.':': <b class="bien-t">vas dentro de tu plan</b>.')+'</p></div>';

  /* Por dónde se te va */
  if(P.length)h+='<section class="card stack tj-pdv" id="tj-pdv"><div class="sec"><h2>Por dónde se te va</h2><p class="note">Lo que más pesa cada mes, a este ritmo.</p></div>'+porDondeHTML(P,function(hh){return txt(hh,x)})+'</section>';

  /* En qué gastaste: el anillo */
  var an=anillo(A.cats,5).map(function(c){return Object.assign(c,{color:c.resto?'color-mix(in srgb,var(--cat-muted) 45%,transparent)':colorCat(colorDe(state,c.c))})});
  if(vista.an>=an.length)vista.an=-1;
  h+='<section class="card stack tj-an" id="tj-an"><div class="sec"><h2>En qué gastaste</h2><p class="note">Tocá una categoría para ver cuánto es.</p></div><div id="tj-anillo">'+anilloHTML(an,A.totG,money,{sel:vista.an,sub:'en '+A.dias+(A.dias===1?' día':' días')})+'</div></section>';

  /* Tu mes, día por día */
  var meses=A.meses.map(function(m){return m.k});
  if(!vista.mes||meses.indexOf(vista.mes)<0)vista.mes=meses[meses.length-1];
  h+='<section class="card stack tj-cal" id="tj-cals"><div class="sec"><h2>Tu mes, día por día</h2><p class="note">Cada día contra lo que da tu plan.</p></div><div id="tj-cal">'+calHTML(x)+'</div><div id="cal-dia" aria-live="polite">'+diaHTML(vista.dia,vista.dia?porDiaDelMes(A,vista.dia.slice(0,7))[vista.dia]:null,money,nom)+'</div></section>';

  /* Suscripciones, como un ticket */
  var subs=H.filter(function(hh){return hh.tipo==='subs'})[0];
  if(subs)h+='<section class="card stack tj-subs" id="tj-subs"><div class="sec"><h2>Lo que pagás todos los meses</h2><p class="note">Si alguna no la usás, darte de baja es plata que vuelve cada mes.</p></div>'+ticketHTML(subs,money)+'</section>';

  /* Además encontré: lo urgente primero, después de lo que más pesa a lo que menos (sin repetir los 3 de arriba) */
  var resto=H.filter(function(hh){return P.indexOf(hh)<0}),urg=resto.filter(function(hh){return hh.urgente});
  resto=urg.concat(resto.filter(function(hh){return !hh.urgente}));
  var item=function(hh){var t=txt(hh,x);return '<li class="hall-i'+(hh.urgente?' urg':'')+'"><p class="hall-t"><b>'+esc(t.titulo)+'</b><span>'+esc(t.cifra)+'</span></p><p class="hall-d">'+esc(t.detalle)+'</p><p class="hall-c">'+esc(t.consejo)+'</p></li>'};
  if(resto.length)h+='<section class="card stack tj-todo" id="tj-todo"><div class="sec"><h2>'+(P.length?'Además encontré':'Lo que encontré')+'</h2></div><ul class="hall">'
    +resto.slice(0,3).map(item).join('')+'</ul>'
    +(resto.length>3?'<details class="sub-d"><summary>Ver '+(resto.length-3===1?'uno más':'los otros '+(resto.length-3))+'</summary><ul class="hall">'+resto.slice(3).map(item).join('')+'</ul></details>':'')+'</section>';

  /* Mes a mes y tu ritmo contra tu plan */
  var serie=serieRitmo(A,pd);vista.serie=serie;
  if(A.meses.length>1||serie)h+='<section class="card stack tj-rit" id="tj-rit">'
    +(serie?'<div class="sec"><h2>Tu ritmo contra tu plan</h2><p class="note">'+esc(serie.nota)+' Deslizá el dedo para ver cada día.</p></div>'+ritmoSVG(serie.p,money):'')
    +(A.meses.length>1?'<div class="sec"><h2>Mes a mes</h2><p class="note">Lo que gastaste cada mes del extracto.</p></div>'+mesAMesSVG(A.meses,money):'')+'</section>';

  /* Lo que anotaste vs. el extracto */
  h+=controlHTML(A,nom);

  /* Más detalle: comercios (acá se corrige la categoría), días, hormiga, grandes */
  h+=detalleHTML(x,nom,pd);
  out.innerHTML=h;
}
function vacio(){
  return '';
}
function calHTML(x){
  var A=x.A,pd=planDia(),meses=A.meses.map(function(m){return m.k});
  return calendarioHTML(vista.mes,porDiaDelMes(A,vista.mes),pd,money,{nivel:function(t){return nivelDia(t,pd)},sel:vista.dia,meses:meses,desde:A.desde,hasta:A.hasta,hoy:today()});
}
function serieRitmo(A,pd){
  if(!(pd>0))return null;
  var p=ctx.state.plan,t=today(),desde=p.inicio>A.desde?p.inicio:A.desde,hasta=[A.hasta,p.cobro,t].sort()[0],nota;
  if(desde<=hasta&&diffDays(desde,hasta)>=2)nota='Desde el '+fCorta(p.inicio)+'.';
  else{hasta=A.hasta;desde=addD(hasta,-29);if(desde<A.desde)desde=A.desde;nota='Los últimos días del extracto, contra lo que da tu plan por día.'}
  if(diffDays(desde,hasta)<2)return null;
  return {p:ritmoContraPlan(A,desde,hasta,pd),nota:nota};
}
function controlHTML(A,nom){
  var state=ctx.state,plan=state.plan;
  var desde=plan.inicio>A.desde?plan.inicio:A.desde,hasta=plan.cobro<A.hasta?plan.cobro:A.hasta;
  if(desde>hasta){faltan=[];return '<div class="empty">El extracto no tiene movimientos dentro de las fechas de tu plan ('+esc(fCorta(plan.inicio))+' al '+esc(fCorta(plan.cobro))+').</div>'}
  var C=cruzar(A.gas.map(function(m){return {f:m.f,monto:Math.round(-m.m*100)/100,d:m.d,k:m.k,c:m.c}}),state.gastos,desde,hasta);
  faltan=C.faltan;
  var tf=0;C.faltan.forEach(function(m){tf+=m.monto});
  var h='<div class="card stack tone-mint" id="control-card"><div class="sec"><h2>Lo que anotaste vs. el extracto</h2><p class="note">Del '+esc(fCorta(desde))+' al '+esc(fCorta(hasta))+'. El extracto no suma nada solo: vos elegís qué agregar.</p></div>'
    +'<div class="tiles">'+tile('tone-mint','Coincide',String(C.coinciden.length),'anotado y en el extracto')+tile('tone-coral','No lo anotaste',String(C.faltan.length),C.faltan.length?money(tf):'todo al día')+tile('tone-sky','Solo anotado',String(C.soloAnotados.length),'efectivo u otra tarjeta')+'</div>';
  if(C.faltan.length)h+='<div class="sec"><div class="sec-h"><h3 class="sub-h">En el extracto pero no lo anotaste</h3>'+(C.faltan.length>1?'<button class="btn" type="button" data-falta="todos">Agregar los '+C.faltan.length+'</button>':'')+'</div>'+(function(){
      /* (2.30) los 3 primeros a la vista; el resto, plegado */
      var li=function(m,i){return '<li><span class="when">'+esc(fCorta(m.f))+'</span><span class="what">'+esc(nom(m.k))+'</span><span class="amt">'+money(m.monto)+'</span><button class="btn quiet sm" type="button" data-falta="'+i+'">Agregar</button></li>'};
      var l=C.faltan.map(li);
      return '<ul class="list">'+l.slice(0,3).join('')+'</ul>'+(l.length>3?'<details class="sub-d"><summary>Ver los otros '+(l.length-3)+'</summary><ul class="list">'+l.slice(3).join('')+'</ul></details>':'');
    })()+'</div>';
  if(C.soloAnotados.length)h+='<details class="sub-d"><summary>Anotado pero no está en el extracto ('+C.soloAnotados.length+')</summary><p class="note">Puede ser efectivo u otra tarjeta. Es solo para que lo veas.</p><ul class="list">'
    +C.soloAnotados.map(function(g){return '<li><span class="when">'+esc(fCorta(g.fecha))+'</span><span class="what">'+esc(g.nota||'Sin detalle')+'</span><span class="amt">'+money(g.monto)+'</span></li>'}).join('')+'</ul></details>';
  if(C.coinciden.length)h+='<details class="sub-d"><summary>Coincide ('+C.coinciden.length+')</summary><ul class="list">'
    +C.coinciden.map(function(y){return '<li><span class="when">'+esc(fCorta(y.mov.f))+'</span><span class="what">'+esc(nom(y.mov.k))+' <span class="src">= '+esc(y.gasto.nota||'tu gasto')+(y.dias?', '+y.dias+(y.dias===1?' día':' días')+' de diferencia':'')+'</span></span><span class="amt">'+money(y.mov.monto)+'</span></li>'}).join('')+'</ul></details>';
  return h+'</div>';
}
function detalleHTML(x,nom,pd){
  var state=ctx.state,ex=state.extracto,A=x.A,h='';
  h+='<details class="card sdes" data-tjd="comercios" id="tj-com"><summary><span class="sdes-t">Comercios y categorías</span><span class="sdes-d">Dónde gastaste más · acá corregís la categoría</span></summary><div class="sdes-in stack">'
    +'<p class="note">Si la categoría no es la correcta, cambiala: lo recuerdo para la próxima.</p><ul class="list com-l">'
    +A.com.slice(0,15).map(function(c){
      var rit=c.fijo?'<span class="pill ex">cobro fijo</span>':(c.n>=3&&c.cada>0?'cada ~'+Math.round(c.cada)+' días':'');
      return '<li class="com-i"><span class="what"><b>'+esc(nom(c.k))+'</b><span class="src">'+c.n+(c.n===1?' vez':' veces')+' · '+money(c.prom)+' promedio'+(rit?' · '+rit:'')+'</span></span><span class="amt">'+money(c.t)+'</span>'+catSelect(c.k,c.c,nom(c.k))+'</li>';
    }).join('')+'</ul></div></details>';
  var orden=[1,2,3,4,5,6,0],dmx=0;A.dow.forEach(function(d){if(d.t>dmx)dmx=d.t});
  h+='<details class="card sdes" data-tjd="numeros"><summary><span class="sdes-t">Los números del extracto</span><span class="sdes-d">'+esc(money(A.totG))+' gastado · '+esc(money(A.porDia))+' por día</span></summary><div class="sdes-in stack">'
    +'<div class="tiles">'+tile('tone-coral','Gastaste',money(A.totG),'del '+esc(fCorta(A.desde))+' al '+esc(fCorta(A.hasta)))+tile('tone-mint','Entró',money(A.totI),A.nI+' '+(A.nI===1?'ingreso':'ingresos'))
    +tile('tone-sky','Por día',money(A.porDia),pd>0?'tu plan permite '+money(pd):'')+tile('tone-sun','Compra promedio',money(A.ticket),A.nG+' compras')+'</div>'
    +'<h3 class="sub-h">Por día de la semana</h3>'+bars(orden.map(function(i){var d=A.dow[i];return {l:cap(DIAL[i]),v:d.t,n:d.n,dim:!(d.t===dmx&&dmx>0)}}),function(y){return '<b>'+money(y.v)+'</b> · '+y.n+' compras'})
    +(A.grandes.length?'<h3 class="sub-h">Los gastos más grandes</h3><ul class="list">'+A.grandes.map(function(m){return '<li><span class="when">'+esc(fCorta(m.f))+'</span><span class="what">'+esc(nom(m.k))+'</span><span class="amt">'+money(-m.m)+'</span></li>'}).join('')+'</ul>':'');
  var mesH=A.hasta.slice(0,7),um=num(ex.hormiga)||400;
  var hx=hormigas(A.gas.map(function(m){return {fecha:m.f,monto:-m.m,grupo:nom(m.k)}}),mesH,um);
  var ha=hormigas(state.gastos.map(function(g){return {fecha:g.fecha,monto:g.monto,grupo:catDe(g)}}),mesH,um);
  if(hx.length||ha.length){
    var item=function(o){return '<li><span class="what"><b>'+o.n+' × '+esc(o.grupo)+'</b><span class="src">'+money(o.total)+' en '+MESL[Number(mesH.slice(5,7))-1]+' · '+money(o.anual)+' en un año a este ritmo</span></span></li>'};
    h+='<h3 class="sub-h">Gastos hormiga de '+MESL[Number(mesH.slice(5,7))-1]+'</h3><p class="note">Compras de menos de '+money(um)+' que se repiten 3 veces o más.</p>'
      +(hx.length?'<ul class="list">'+hx.slice(0,6).map(item).join('')+'</ul>':'')
      +(ha.length?'<p class="note">En lo que anotaste, por categoría:</p><ul class="list">'+ha.slice(0,6).map(item).join('')+'</ul>':'');
  }
  return h+'</div></details>';
}

/* ---------- El aviso de Hoy (una nota al margen, de a una, que se puede descartar) ---------- */
export function avisoHoy(){
  var el=$('#tarjeta-aviso');if(!el)return;
  var x=analisis(),st=ctx.state;
  var a=x&&x.A?elegirAviso(x.H,st.extracto.descartadas):null;
  if(!a){el.innerHTML='';return}
  var t=txt(a,x);
  el.innerHTML='<div class="banner tj-aviso'+(a.urgente?' alerta':'')+'"><p><b>'+esc(t.titulo)+'</b> '+esc(t.detalle)+'</p><div class="row-btns"><button class="btn" type="button" data-goto="gastos">Ver en Tarjeta</button><button class="btn quiet" type="button" data-tav="'+esc(a.id)+'">Ya lo vi</button></div></div>';
}
export function descartar(id){
  var ex=ctx.state.extracto;if(!ex.descartadas||typeof ex.descartadas!=='object')ex.descartadas={};
  ex.descartadas[id]=today();ctx.persist();avisoHoy();
}

/* ---------- Toques ---------- */
function agregarFaltantes(lista){
  var st=ctx.state,x=analisis(),nom=x?nombre(x):titulo;
  lista.forEach(function(m){st.gastos.push({id:uid(),fecha:m.f,monto:m.monto,nota:nom(m.k).slice(0,60),cat:m.c&&m.c!=='Ingresos'?m.c:undefined,src:'brou'})});
  ctx.persist();ctx.renderAll();
  toast(lista.length===1?'Agregado: '+money(lista[0].monto)+' de '+nom(lista[0].k):'Agregaste '+lista.length+' gastos del extracto');
}
export function click(e){
  var b,x=analisis();
  if((b=e.target.closest('[data-falta]'))){
    var v=b.getAttribute('data-falta');
    if(v==='todos')agregarFaltantes(faltan.slice());else if(faltan[Number(v)])agregarFaltantes([faltan[Number(v)]]);
    return true;
  }
  if(!x||!x.A)return false;
  if((b=e.target.closest('[data-tjir]'))){
    var dest=document.getElementById(b.getAttribute('data-tjir'));
    if(dest){if(dest.tagName==='DETAILS')dest.open=true;var y=dest.getBoundingClientRect().top+window.scrollY-64;try{window.scrollTo({top:y,behavior:'smooth'})}catch(x2){window.scrollTo(0,y)}}
    return true;
  }
  if((b=e.target.closest('[data-anillo]'))){
    var i=Number(b.getAttribute('data-anillo'));vista.an=vista.an===i?-1:i;
    var an=anillo(x.A.cats,5).map(function(c){return Object.assign(c,{color:c.resto?'color-mix(in srgb,var(--cat-muted) 45%,transparent)':colorCat(colorDe(ctx.state,c.c))})});
    $('#tj-anillo').innerHTML=anilloHTML(an,x.A.totG,money,{sel:vista.an,sub:'en '+x.A.dias+(x.A.dias===1?' día':' días')});
    var nb=$('#tj-anillo [data-anillo="'+i+'"]');if(nb)nb.focus();
    return true;
  }
  if((b=e.target.closest('[data-calmes]'))){
    var m=b.getAttribute('data-calmes');if(!m)return true;
    vista.mes=m;vista.dia=null;$('#tj-cal').innerHTML=calHTML(x);$('#cal-dia').innerHTML=diaHTML(null,null,money,nombre(x));
    var nav=$('#tj-cal [data-calmes="'+m+'"]')||$('#tj-cal .cal-nav:not([disabled])');if(nav)nav.focus();
    return true;
  }
  if((b=e.target.closest('[data-cald]'))){
    var d=b.getAttribute('data-cald');vista.dia=vista.dia===d?null:d;
    $('#tj-cal').innerHTML=calHTML(x);
    $('#cal-dia').innerHTML=diaHTML(vista.dia,vista.dia?porDiaDelMes(x.A,vista.dia.slice(0,7))[vista.dia]:null,money,nombre(x));
    var nd=$('#tj-cal [data-cald="'+d+'"]');if(nd)nd.focus();
    return true;
  }
  if((b=e.target.closest('[data-gcols]'))){
    var a=b.getAttribute('data-gcols'),ex=ctx.state.extracto;
    if(a==='abrir'){vista.colsAbierto=true;vista.cols=null;render();var c=$('#gas-cols');if(c)c.scrollIntoView({block:'start'});return true}
    if(a==='cerrar'){vista.colsAbierto=false;vista.cols=null;render();return true}
    if(a==='ok'&&x.r.tabla){
      if(!ex.columnas||typeof ex.columnas!=='object')ex.columnas={};
      ex.columnas[x.r.banco.id]={firma:x.r.tabla.firma,cols:Object.assign({},x.r.tabla.cols,vista.cols||{})};
      vista.cols=null;vista.colsAbierto=false;ctx.persist();render();toast('Listo: la próxima planilla de '+x.r.banco.nombre+' la leo sola');
      return true;
    }
  }
  return false;
}
export function change(e){
  var s=e.target.closest('.cat-sel');
  if(s){ctx.state.extracto.cat[s.getAttribute('data-catk')]=s.value;ctx.persist();render();return true}
  var g=e.target.closest('[data-gcol]'),x=analisis();
  if(g&&x&&x.r.tabla){
    vista.cols=Object.assign({},vista.cols||x.r.tabla.cols);vista.cols[g.getAttribute('data-gcol')]=Number(g.value);
    /* se ve enseguida cómo queda (sin guardar hasta «Listo») */
    var ex=ctx.state.extracto,prev=ex.columnas;
    ex.columnas=Object.assign({},prev);ex.columnas[x.r.banco.id]={firma:x.r.tabla.firma,cols:vista.cols};
    cache.k=null;render();ex.columnas=prev;cache.k=null;
    return true;
  }
  return false;
}
/* El dibujo del ritmo: el dedo (o el mouse) elige el día */
export function puntero(e){
  var g=e.target.closest&&e.target.closest('.rit-g');if(!g||!vista.serie)return;
  var p=vista.serie.p,bb=g.getBoundingClientRect(),f=Math.max(0,Math.min(1,(e.clientX-bb.left)/bb.width)),i=Math.round(f*(p.length-1));
  var lin=g.querySelector('.rit-x'),xx=(4+(p.length>1?i/(p.length-1):0)*312).toFixed(1);
  if(lin){lin.removeAttribute('hidden');lin.setAttribute('x1',xx);lin.setAttribute('x2',xx)}
  var l=g.parentNode.querySelector('.rit-lee');if(l)l.innerHTML=lectura(p[i],money);
}

/* ---------- Traer el archivo: PDF, CSV o Excel (se lee en el teléfono y no se guarda) ---------- */
function decodificar(buf){
  var t=new TextDecoder('utf-8').decode(buf);
  if(t.indexOf('�')>=0){try{t=new TextDecoder('windows-1252').decode(buf)}catch(e){}}
  return t.replace(/^﻿/,'');
}
export async function archivo(file){
  var n=String(file.name||'').toLowerCase(),texto='';
  if(/\.xls$/.test(n))throw new Error('Ese Excel es del formato viejo (.xls). Abrilo y guardalo como .xlsx o CSV, y probá de nuevo.');
  if(/\.pdf$/.test(n)||file.type==='application/pdf'){
    var R=await import('./recibos.js');
    texto=(await R.textoPdf(file,15)).join('\n');
  }else if(/\.xlsx$/.test(n)||/spreadsheetml/.test(file.type)){
    var X=await import('../logica/xlsx.js'),hojas=await X.leerXlsx(await file.arrayBuffer());
    var h=hojas.slice().sort(function(a,b){return b.filas.length-a.filas.length})[0];
    if(!h)throw new Error('El Excel está vacío.');
    texto=filasATexto(h.filas);
  }else texto=decodificar(await file.arrayBuffer());
  texto=texto.replace(/\d{9,}/g,function(y){return '•••'+y.slice(-3)});
  if(texto.length>150000)texto=texto.slice(0,150000);
  if(!texto.trim())throw new Error('No encontré texto en el archivo. Si es una foto o un PDF escaneado, no lo puedo leer: bajá el CSV o el Excel desde tu banco.');
  return texto;
}
