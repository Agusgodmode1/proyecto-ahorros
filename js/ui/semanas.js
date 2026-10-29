/* Pestaña Semanas: selector, "te quedan", los 7 días, anotar y borrar gastos. */
import {parse,addDays,iso,diffDays,DIA,DIAL,MES} from '../logica/fechas.js';
import {ctx,$,today,planNow,money,n0,esc,fLarga,rango,cap,toast,toastAccion} from './comun.js';
import {sobranteDe} from '../logica/mes.js';
import {semanaDe} from '../logica/plan.js';
import {borrarGasto,renglonGasto,abrirHojaGasto,diasHasta} from './gastos.js';

/* La página de cada semana (2.10): el resumen entra entero en la pantalla del teléfono, sin scrollear.
   - Encabezado en una línea («Semana 2 · 27 oct – 2 nov» y el chip de esta semana).
   - Un bloque apilado: Te quedan (grande), Por día y Gastaste, con una barra fina.
   - La tira de días: debajo de cada día, una barrita de color (bien / cerca / te pasaste) y el monto.
   - «+ Gasto en esta semana» abre la misma hoja de Hoy (ui/gastos.js) con los días de la semana hasta hoy.
   - Los gastos en renglones de una línea; «¿De dónde sale?» explica el presupuesto. */
var abiertoDe={};
export function resetWeekSel(){}
function rangoLargo(a,b){var x=parse(a),y=parse(b),g='\u2009–\u2009';return x.getMonth()===y.getMonth()?x.getDate()+g+y.getDate()+' '+MES[y.getMonth()]:x.getDate()+' '+MES[x.getMonth()]+g+y.getDate()+' '+MES[y.getMonth()]}
/* Los días que se pueden elegir al anotar o corregir un gasto de esta semana */
function diasDeSemana(w){var d=diasHasta(w.start,w.end);return d.length?d:[[w.start,cap(fLarga(w.start))]]}
/* Corregir un gasto (desde Hoy o desde una semana): la hoja con el gasto cargado */
export function editarGasto(id){
  var g=ctx.state.gastos.filter(function(x){return x.id===id})[0];if(!g)return;
  var pc=planNow(),i=semanaDe(pc,g.fecha),w=i>=0?pc.weeks[i]:null;
  abrirHojaGasto({gasto:g,fechas:w?diasDeSemana(w):null});
}

export function renderWeek(pc){
  var state=ctx.state,tab=ctx.tab,el=$('#p-semana');
  if(!/^w\d+$/.test(tab)){el.innerHTML='';return}
  var i=Number(tab.slice(1)),w=pc.weeks[i];if(!w)return;
  var t=today(),cur=t>=w.start&&t<=w.end,past=t>w.end,fut=t<w.start;
  var rem=cur?diffDays(t,w.end)+1:w.days;
  var perDay=past?null:Math.max(w.left,0)/Math.max(rem,1);
  var pct=w.avail>0?Math.min(100,Math.max(0,w.spent/w.avail*100)):(w.spent>0?100:0);
  var over=w.left<0,dayAllow=w.budget/w.days,ult=i===pc.weeks.length-1;
  var ds=parse(w.start);
  var h='<div class="panel-head"><h2 class="ph-t">Semanas</h2><p class="ph-s">Cada semana tiene su presupuesto: lo que sobra pasa a la siguiente.</p></div>';
  h+='<div class="wkpick" role="group" aria-label="Elegir semana">';
  pc.weeks.forEach(function(x){h+='<button type="button" class="wkp" data-goto="w'+x.i+'" aria-pressed="'+(x.i===i)+'"><b>Semana '+(x.i+1)+'</b><span>'+esc(rango(x.start,x.end))+'</span></button>'});
  h+='</div>';

  var pill=over?'<span class="pill bad">Te pasaste</span>':cur?'<span class="pill now">esta semana</span>':past?'<span class="pill ok">cumplida</span>':'<span class="pill">próxima</span>';
  h+='<div class="card stack wk-res"><div class="wk-cab"><h2>Semana '+(i+1)+' <span class="wk-rango">· '+esc(rangoLargo(w.start,w.end))+'</span></h2>'+pill+'</div>';
  /* La semana después de una que se pasó: cuánto bajó el día */
  var rc=pc.ajuste&&pc.ajuste.recalculo;
  if(cur&&rc&&rc.semana===i-1)h+='<p class="wk-aviso">La semana pasada te pasaste '+money(rc.deficit)+'; el resto baja a '+money(perDay)+' por día.</p>';
  h+='<div class="wk-big"><span class="wk-bl">'+(over?'Te pasaste por':past?'Te sobró':'Te quedan')+'</span><span class="wk-bv'+(over?' neg':'')+'">'+money(Math.abs(w.left))+'</span></div>';
  h+='<div class="wk-dos">'+(past?'<span><small>Tenías</small><b>'+money(w.avail)+'</b></span>':'<span><small>Por día'+(cur?' hasta el '+DIAL[parse(w.end).getDay()]:'')+'</small><b class="plata">'+money(perDay)+'</b></span>')
    +'<span><small>Gastaste</small><b>'+money(w.spent)+'</b></span></div>';
  h+='<div class="bar fina'+(over?' over':'')+'" role="img" aria-label="Gastaste el '+Math.round(pct)+' % de lo que tenías"><i style="width:'+pct+'%"></i></div>';
  /* la tira de días */
  h+='<div class="days" style="grid-template-columns:repeat('+w.days+',minmax(0,1fr))" role="list" aria-label="Lo que gastaste cada día">';
  for(var k=0;k<w.days;k++){
    var d=addDays(ds,k),di=iso(d),sd=0;
    state.gastos.forEach(function(g){if(g.fecha===di)sd+=g.monto});
    var r=dayAllow>0?sd/dayAllow:(sd>0?2:0),est=sd<=0?'':r>1.0001?'mal':r>.8?'cerca':'bien';
    var cls='day'+(di===t?' today':'')+(di>t?' fut':'')+(sd>0?' has':'')+(est==='mal'?' over':'');
    h+='<div class="'+cls+'" role="listitem" aria-label="'+esc(DIAL[d.getDay()]+' '+d.getDate())+(sd>0?': '+money(sd)+(est==='mal'?', te pasaste':est==='cerca'?', cerca del límite':', bien'):(di>t?'':': sin gastos'))+'">'
      +'<div class="w">'+DIA[d.getDay()]+'</div><div class="n">'+d.getDate()+'</div>'
      +'<i class="db'+(est?' '+est:'')+'" style="--p:'+Math.min(100,Math.round(r*100))+'%"></i><div class="s">'+(sd>0?n0(sd):'')+'</div></div>';
  }
  h+='</div>';
  if(past&&!over&&w.left+(w.alAhorro||0)>0&&!ult){var so=sobranteDe(state,w);
    h+='<div class="field"><span class="sub-l">Lo que sobró de esta semana</span><div class="seg" role="group" aria-label="A dónde va lo que sobró"><button type="button" data-sobsem="'+w.start+'" data-val="siguiente" aria-pressed="'+(so!=='ahorro')+'">A la semana siguiente</button><button type="button" data-sobsem="'+w.start+'" data-val="ahorro" aria-pressed="'+(so==='ahorro')+'">Al ahorro</button></div></div>'}
  /* ¿De dónde sale? */
  var sub;
  if(over)sub=past&&!ult?'Gastaste más de lo que tenías. La diferencia se repartió entre las semanas que quedan.':'Gastaste más de lo que tenías.'+(ult?'':' La diferencia se reparte entre las semanas que quedan cuando termine.');
  else if(past)sub=w.alAhorro?'La semana terminó. Lo que sobró ('+money(w.alAhorro)+') fue al ahorro.':'La semana terminó. Lo que sobró pasó a la siguiente.';
  else sub='Si repartís parejo, podés gastar '+money(perDay)+' por día.';
  h+='<details class="wk-de" data-wkde="'+i+'"'+(abiertoDe[i]?' open':'')+'><summary>¿De dónde sale?</summary><div class="wk-de-in">'
    +'<p>Esta semana tenías <b>'+money(w.avail)+'</b>'+(Math.round(w.carry)!==0?': '+money(w.budget)+' de su parte del plan '+(w.carry<0?'menos ':'más ')+money(Math.abs(w.carry))+(w.carry<0?' que te pasaste':' que sobró')+' de la semana anterior':', su parte del plan')+'.</p>'
    +'<p>'+sub+' Cada día alcanza para <b>'+money(dayAllow)+'</b>.</p>'
    +'<p class="wk-ley"><span><i class="db bien"></i>bien</span><span><i class="db cerca"></i>cerca del límite</span><span><i class="db mal"></i>te pasaste</span></p></div></details>';
  h+='</div>';

  /* los gastos de la semana */
  var items=state.gastos.filter(function(g){return g.fecha>=w.start&&g.fecha<=w.end}).sort(function(a,b){return a.fecha<b.fecha?1:a.fecha>b.fecha?-1:(a.id<b.id?1:-1)});
  h+='<div class="card stack" id="g-card"><div class="sec-h"><h2>Gastos de la semana</h2></div>';
  if(!fut)h+='<button class="btn primary wk-mas" type="button" data-gsem="'+i+'"><span aria-hidden="true">+</span> Gasto en esta semana</button>';
  if(!items.length)h+='<div class="empty">'+(fut?'Esta semana todavía no empezó.':'Todavía no anotaste gastos esta semana. Cada gasto que anotes baja lo que te queda.')+'</div>';
  else h+='<ul class="list glist gl-1">'+items.map(renglonGasto).join('')+'</ul>';
  h+='</div>';
  el.innerHTML=h;
}

export function initSemanas(){
  var p=$('#p-semana');
  /* Lo que sobra: por defecto (Ajustes) y semana por semana */
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-sobrante]');
    if(b){ctx.state.plan.sobrante=b.getAttribute('data-sobrante');ctx.persist();ctx.renderAll();toast(ctx.state.plan.sobrante==='ahorro'?'Lo que sobre de cada semana va al ahorro':'Lo que sobre pasa a la semana siguiente');return}
    var s=e.target.closest('[data-sobsem]');
    if(s){var pl=ctx.state.plan;pl.sobranteSemana=Object.assign({},pl.sobranteSemana);pl.sobranteSemana[s.getAttribute('data-sobsem')]=s.getAttribute('data-val');ctx.persist();ctx.renderAll()}
  });
  p.addEventListener('toggle',function(e){var d=e.target;if(d.matches&&d.matches('[data-wkde]'))abiertoDe[d.getAttribute('data-wkde')]=d.open},true);
  p.addEventListener('click',function(e){
    var m=e.target.closest('[data-gsem]');
    if(m){var w=planNow().weeks[Number(m.getAttribute('data-gsem'))];if(!w)return;var f=diasDeSemana(w),t=today();
      abrirHojaGasto({titulo:'Gasto de la semana',fechas:f,fecha:f.some(function(x){return x[0]===t})?t:f[f.length-1][0]});return}
    var dg=e.target.closest('[data-delg]');if(dg){borrarGasto(dg.getAttribute('data-delg'));return}
    var eg=e.target.closest('[data-editg]');if(eg){editarGasto(eg.getAttribute('data-editg'));return}
  });
}
