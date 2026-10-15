/* Pestaña Tarjeta: pegar el extracto del BROU, métricas y pasar los gastos a las semanas. */
import {diffDays,DIAL,MESL} from '../logica/fechas.js';
import {num} from '../logica/util.js';
import * as EX from '../logica/extracto.js';
import {ctx,$,today,planNow,money,esc,fCorta,cap,titulo,tile,toast} from './comun.js';
import {nombresVisibles,nombreDe,colorDe} from '../logica/categorias.js';
function mapa(c){return nombreDe(ctx.state,c)}
import {cruzar,hormigas} from '../logica/control.js';
import {catDe} from './gastos.js';
import {uid} from '../logica/util.js';
var faltan=[];

var gasTimer=null,gasConfirm=false;
export var CATCOL={'Delivery y comida':'var(--coral)','Supermercado':'var(--mint)','Kiosco y almacén':'var(--sun)','Transporte':'var(--sky)','Suscripciones':'var(--grape)','Juegos':'var(--pink)','Trading':'var(--teal)','Servicios y cuentas':'var(--slate)','Salud':'var(--pink)','Compras online':'var(--teal)','Retiros y transferencias':'var(--slate)','Comisiones y cargos':'var(--bad)','Otros':'var(--muted)','Ingresos':'var(--mint)'};
function bars(items,fmt){
  var mx=0;items.forEach(function(x){if(x.v>mx)mx=x.v});
  return '<div class="stack" style="gap:10px">'+items.map(function(x){
    var w=mx?Math.max(2,Math.round(x.v/mx*100)):0;
    return '<div class="bar-row"><span class="bar-l">'+(x.c?'<i class="dot" style="background:'+x.c+'"></i>':'')+esc(x.l)+'</span><span class="bar-track"><span class="bar-fill'+(x.dim?' dim':'')+'" style="width:'+w+'%'+(x.c?';background:'+x.c:'')+'"></span></span><span class="bar-v">'+fmt(x)+'</span></div>';
  }).join('')+'</div>';
}
function catSelect(k,cur){
  return '<span class="cat-cell"><i class="dot" style="background:'+colorDe(ctx.state,cur)+'"></i><select class="cat-sel" data-catk="'+esc(k)+'" aria-label="Categoría de '+esc(titulo(k))+'">'+(nombresVisibles(ctx.state).indexOf(cur)<0?nombresVisibles(ctx.state).concat([cur]):nombresVisibles(ctx.state)).map(function(c){return '<option'+(c===cur?' selected':'')+'>'+esc(c)+'</option>'}).join('')+'</select></span>';
}
export function renderGastos(){
  var state=ctx.state,ex=state.extracto,out=$('#gas-out'),st=$('#gas-stat');
  if(!ex.texto.trim()){st.textContent='';out.innerHTML='<div class="empty">Cuando pegues el extracto, acá vas a ver cuánto gastaste, en qué categorías, qué días gastás más y qué gastos chicos se van sumando.</div>';return}
  var r=EX.leer(ex.texto,today(),ex.formato),A=EX.analizar(r.movs,{cat:ex.cat,hormiga:num(ex.hormiga)||400,mapa:mapa});
  if(!A){
    st.innerHTML='<b>No pude leer movimientos.</b> Cada línea tiene que empezar con la fecha (por ejemplo 09/10/2026) y terminar con el importe.';
    out.innerHTML='';return;
  }
  var s='Leí <b>'+r.movs.length+' movimientos</b> del '+esc(fCorta(A.desde))+' al '+esc(fCorta(A.hasta))+'.';
  if(r.bad.length)s+=' No entendí '+r.bad.length+' línea'+(r.bad.length>1?'s':'')+'.';
  if(r.dudosos)s+=' En '+r.dudosos+' no supe si era gasto o ingreso y lo conté como gasto; si no cierra, cambiá "Cómo vienen los montos".';
  if(A.usdN)s+=' Dejé afuera '+A.usdN+' en dólares.';
  st.innerHTML=s+(r.bad.length?'<details style="margin-top:6px"><summary>Ver las líneas que no entendí</summary><div class="muted" style="font-size:12.5px;overflow-wrap:anywhere;font-family:ui-monospace,Menlo,monospace">'+r.bad.slice(0,8).map(esc).join('<br>')+'</div></details>':'');
  var h='';
  var plan=state.plan,pd=Math.max(1,diffDays(plan.inicio,plan.cobro)),planDia=planNow().gastar/pd;
  h+='<div class="tiles">'
    +tile('tone-coral','Gastaste',money(A.totG),'del '+esc(fCorta(A.desde))+' al '+esc(fCorta(A.hasta)))
    +tile('tone-mint','Entró',money(A.totI),A.nI+' '+(A.nI===1?'ingreso':'ingresos'))
    +tile('tone-sky','Por día',money(A.porDia),'tu plan permite '+money(planDia))
    +tile('tone-sun','Compra promedio',money(A.ticket),A.nG+' compras')
    +'</div>';
  var L=[],topC=A.cats[0],dmax=A.dow.slice().sort(function(a,b){return b.t-a.t})[0];
  if(topC&&A.totG)L.push('Lo que más pesa es <b>'+esc(topC.c)+'</b>: '+money(topC.t)+', el '+Math.round(topC.t/A.totG*100)+'% de lo que gastaste.');
  if(dmax&&dmax.t&&A.totG)L.push('El día que más gastás es el <b>'+DIAL[dmax.i]+'</b> ('+Math.round(dmax.t/A.totG*100)+'% del total).');
  if(A.hor.n)L.push('Los gastos de menos de '+money(A.hor.umbral)+' son <b>'+A.hor.n+' compras</b> y suman '+money(A.hor.t)+'. A este ritmo son unos <b>'+money(A.hor.t/A.dias*30)+' por mes</b>.');
  A.rit.forEach(function(x){L.push('Después de cobrar el '+esc(fCorta(x.f))+' gastaste el <b>'+Math.round(x.pct*100)+'%</b> del mes en la primera semana ('+money(x.a7)+' de '+money(x.a30)+').')});
  if(A.porDia>planDia&&planDia>0)L.push('Gastás más por día de lo que permite tu plan: '+money(A.porDia)+' contra '+money(planDia)+'.');
  var fijos=A.com.filter(function(c){return c.fijo});
  if(fijos.length)L.push('Cobros fijos que se repiten: '+fijos.slice(0,4).map(function(c){return esc(titulo(c.k))+' ('+money(c.prom)+')'}).join(', ')+'.');
  if(L.length)h+='<div class="callout"><h2>Lo que se ve</h2><ul class="lect">'+L.map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul></div>';
  h+='<div class="card stack"><h2>Por categoría</h2>'+bars(A.cats.map(function(c){return {l:c.c,v:c.t,n:c.n,c:colorDe(ctx.state,c.c)}}),function(x){return '<b>'+money(x.v)+'</b> · '+Math.round(x.v/A.totG*100)+'%'})+'</div>';
  var dmx=0;A.dow.forEach(function(d){if(d.t>dmx)dmx=d.t});
  var orden=[1,2,3,4,5,6,0];
  h+='<div class="card stack"><h2>Por día de la semana</h2>'+bars(orden.map(function(i){var d=A.dow[i];return {l:cap(DIAL[i]),v:d.t,n:d.n,dim:!(d.t===dmx&&dmx>0)}}),function(x){return '<b>'+money(x.v)+'</b> · '+x.n+' compras'})+'</div>';
  if(A.meses.length>1){
    h+='<div class="card stack"><h2>Mes a mes</h2><div class="scroll"><table style="min-width:420px"><thead><tr><th>Mes</th><th class="r">Gastaste</th><th class="r">Entró</th><th class="r">Compras</th></tr></thead><tbody>'
      +A.meses.map(function(m){var mo=Number(m.k.slice(5,7))-1;return '<tr><td>'+cap(MESL[mo])+' '+m.k.slice(0,4)+'</td><td class="r">'+money(m.g)+'</td><td class="r">'+money(m.i)+'</td><td class="r">'+m.n+'</td></tr>'}).join('')+'</tbody></table></div></div>';
  }
  h+='<div class="card stack"><div class="sec"><h2>Dónde se va la plata</h2><p class="note">Los comercios donde más gastaste. Si la categoría no es la correcta, cambiala y todo se recalcula.</p></div><div class="scroll"><table style="min-width:600px"><thead><tr><th>Comercio</th><th>Categoría</th><th class="r">Veces</th><th class="r">Total</th><th class="r">Promedio</th><th>Cada cuánto</th></tr></thead><tbody>'
    +A.com.slice(0,12).map(function(c){
      var rit=c.fijo?'<span class="pill ex">cobro fijo</span>':(c.n>=3&&c.cada>0?'cada ~'+Math.round(c.cada)+' días':'');
      return '<tr><td>'+esc(titulo(c.k))+'</td><td>'+catSelect(c.k,c.c)+'</td><td class="r">'+c.n+'</td><td class="r"><b>'+money(c.t)+'</b></td><td class="r">'+money(c.prom)+'</td><td>'+rit+'</td></tr>';
    }).join('')+'</tbody></table></div></div>';
  var mesH=A.hasta.slice(0,7),um=num(ex.hormiga)||400;
  var hx=hormigas(A.gas.map(function(m){return {fecha:m.f,monto:-m.m,grupo:titulo(m.k)}}),mesH,um);
  var ha=hormigas(state.gastos.map(function(g){return {fecha:g.fecha,monto:g.monto,grupo:catDe(g)}}),mesH,um);
  if(hx.length||ha.length){
    var item=function(o){return '<li><span class="what"><b>'+o.n+' × '+esc(o.grupo)+'</b><span class="src">'+money(o.total)+' en '+MESL[Number(mesH.slice(5,7))-1]+' · '+money(o.anual)+' en un año a este ritmo</span></span></li>'};
    h+='<div class="card stack"><div class="sec"><h2>Gastos hormiga</h2><p class="note">Compras de menos de '+money(um)+' que se repiten 3 veces o más en '+MESL[Number(mesH.slice(5,7))-1]+'. De a poco no se notan; sumadas, sí.</p></div>'
      +(hx.length?'<h3 class="sub-h">En el extracto, por comercio</h3><ul class="list">'+hx.slice(0,6).map(item).join('')+'</ul>':'')
      +(ha.length?'<h3 class="sub-h">En lo que anotaste, por categoría</h3><ul class="list">'+ha.slice(0,6).map(item).join('')+'</ul>':'')+'</div>';
  }
  if(A.grandes.length){
    h+='<div class="card stack"><h2>Los gastos más grandes</h2><div class="scroll"><table style="min-width:360px"><tbody>'
      +A.grandes.map(function(m){return '<tr><td class="muted">'+esc(fCorta(m.f))+'</td><td>'+esc(titulo(m.k))+'</td><td class="r"><b>'+money(-m.m)+'</b></td></tr>'}).join('')+'</tbody></table></div></div>';
  }
  var desde=plan.inicio>A.desde?plan.inicio:A.desde,hasta=plan.cobro<A.hasta?plan.cobro:A.hasta;
  if(desde<=hasta){
    var C=cruzar(A.gas.map(function(m){return {f:m.f,monto:Math.round(-m.m*100)/100,d:m.d,k:m.k,c:m.c}}),state.gastos,desde,hasta);
    faltan=C.faltan;
    var tf=0;C.faltan.forEach(function(m){tf+=m.monto});
    h+='<div class="card stack tone-mint" id="control-card"><div class="sec"><h2>Lo que anotaste vs. el extracto</h2><p class="note">Del '+esc(fCorta(desde))+' al '+esc(fCorta(hasta))+'. Cada movimiento se busca entre tus gastos (mismo monto, hasta 3 días de diferencia). El extracto no suma nada solo: vos elegís qué agregar.</p></div>'
      +'<div class="tiles">'+tile('tone-mint','Coincide',String(C.coinciden.length),'anotado y en el extracto')+tile('tone-coral','No lo anotaste',String(C.faltan.length),C.faltan.length?money(tf):'todo al día')+tile('tone-sky','Solo anotado',String(C.soloAnotados.length),'efectivo u otra tarjeta')+'</div>';
    if(C.faltan.length)h+='<div class="sec"><div class="sec-h"><h3 class="sub-h">En el extracto pero no lo anotaste</h3>'+(C.faltan.length>1?'<button class="btn" type="button" data-falta="todos">Agregar los '+C.faltan.length+'</button>':'')+'</div><ul class="list">'
      +C.faltan.map(function(m,i){return '<li><span class="when">'+esc(fCorta(m.f))+'</span><span class="what">'+esc(titulo(m.k))+'</span><span class="amt">'+money(m.monto)+'</span><button class="btn quiet sm" type="button" data-falta="'+i+'">Agregar</button></li>'}).join('')+'</ul></div>';
    if(C.soloAnotados.length)h+='<details><summary>Anotado pero no está en el extracto ('+C.soloAnotados.length+')</summary><p class="note">Puede ser efectivo u otra tarjeta. Es solo para que lo veas.</p><ul class="list">'
      +C.soloAnotados.map(function(g){return '<li><span class="when">'+esc(fCorta(g.fecha))+'</span><span class="what">'+esc(g.nota||'Sin detalle')+'</span><span class="amt">'+money(g.monto)+'</span></li>'}).join('')+'</ul></details>';
    if(C.coinciden.length)h+='<details><summary>Coincide ('+C.coinciden.length+')</summary><ul class="list">'
      +C.coinciden.map(function(x){return '<li><span class="when">'+esc(fCorta(x.mov.f))+'</span><span class="what">'+esc(titulo(x.mov.k))+' <span class="src">= '+esc(x.gasto.nota||'tu gasto')+(x.dias?', '+x.dias+(x.dias===1?' día':' días')+' de diferencia':'')+'</span></span><span class="amt">'+money(x.mov.monto)+'</span></li>'}).join('')+'</ul></details>';
    h+='</div>';
  }else{faltan=[];h+='<div class="empty">El extracto no tiene movimientos dentro de las fechas de tu plan ('+esc(fCorta(plan.inicio))+' al '+esc(fCorta(plan.cobro))+').</div>'}
  out.innerHTML=h;
}
/* Agregar como gasto lo que estaba en el extracto y no anotaste (uno o todos). Nunca duplica: solo los que faltan. */
function agregarFaltantes(lista){
  var st=ctx.state;
  lista.forEach(function(m){st.gastos.push({id:uid(),fecha:m.f,monto:m.monto,nota:titulo(m.k).slice(0,60),cat:m.c&&m.c!=='Ingresos'?m.c:undefined,src:'brou'})});
  ctx.persist();ctx.renderAll();
  toast(lista.length===1?'Agregado: '+money(lista[0].monto)+' de '+titulo(lista[0].k):'Agregaste '+lista.length+' gastos del extracto');
}
export function syncGastos(){
  var ex=ctx.state.extracto;
  if($('#gas-txt').value!==ex.texto)$('#gas-txt').value=ex.texto;
  $('#gas-fmt').value=ex.formato;$('#gas-hor').value=ex.hormiga||'';
}
export function initTarjeta(){
  $('#gas-txt').addEventListener('input',function(){
    var t=this.value;
    if(t.length>150000){t=t.slice(0,150000);this.value=t}
    t=t.replace(/\d{9,}/g,function(x){return '•••'+x.slice(-3)});
    ctx.state.extracto.texto=t;
    clearTimeout(gasTimer);gasTimer=setTimeout(function(){ctx.persist();renderGastos()},350);
  });
  $('#gas-fmt').addEventListener('change',function(){ctx.state.extracto.formato=this.value;ctx.persist();renderGastos()});
  $('#gas-hor').addEventListener('input',function(){ctx.state.extracto.hormiga=num(this.value);ctx.persist();renderGastos()});
  $('#gas-clear').addEventListener('click',function(){
    if(!gasConfirm){gasConfirm=true;this.textContent='¿Seguro? Tocá de nuevo para borrar';return}
    gasConfirm=false;this.textContent='Borrar extracto';
    ctx.state.extracto.texto='';ctx.state.extracto.cat={};syncGastos();ctx.persist();renderGastos();
  });
  $('#p-gastos').addEventListener('change',function(e){
    var s=e.target.closest('.cat-sel');if(!s)return;
    ctx.state.extracto.cat[s.getAttribute('data-catk')]=s.value;ctx.persist();renderGastos();
  });
  $('#p-gastos').addEventListener('click',function(e){
    var b=e.target.closest('[data-falta]');if(!b)return;
    var v=b.getAttribute('data-falta');
    if(v==='todos')agregarFaltantes(faltan.slice());else if(faltan[Number(v)])agregarFaltantes([faltan[Number(v)]]);
  });
}
