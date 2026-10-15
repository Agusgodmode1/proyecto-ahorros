/* Pestaña Semanas: selector, "te quedan", los 7 días, anotar y borrar gastos. */
import {parse,addDays,iso,diffDays,DIA,DIAL,MESL} from '../logica/fechas.js';
import {ctx,$,today,planNow,money,n0,esc,fLarga,rango,cap,toast} from './comun.js';
import {sobranteDe} from '../logica/mes.js';
import {semanaDe} from '../logica/plan.js';
import {formGasto,initFormsGasto,leerForm,permitido,guardarGasto,borrarGasto,itemGasto,chipsFrecuentes,anotarFrecuente} from './gastos.js';

var weekSel={},editId=null;
export function resetWeekSel(){weekSel={};editId=null}
/* Abre la semana del gasto con el formulario en modo edición */
export function editarGasto(id){
  var g=ctx.state.gastos.filter(function(x){return x.id===id})[0];if(!g)return;
  var i=semanaDe(planNow(),g.fecha);if(i<0)return;
  editId=id;ctx.go('w'+i);
  var c=$('#g-card');if(c)try{c.scrollIntoView({block:'start'})}catch(e){}
}

export function renderWeek(pc){
  var state=ctx.state,tab=ctx.tab,el=$('#p-semana');
  if(!/^w\d+$/.test(tab)){el.innerHTML='';return}
  var i=Number(tab.slice(1)),w=pc.weeks[i];if(!w)return;
  var t=today(),cur=t>=w.start&&t<=w.end,past=t>w.end;
  var rem=cur?diffDays(t,w.end)+1:w.days;
  var perDay=past?null:Math.max(w.left,0)/Math.max(rem,1);
  var pct=w.avail>0?Math.min(100,Math.max(0,w.spent/w.avail*100)):(w.spent>0?100:0);
  var over=w.left<0,dayAllow=w.budget/w.days;
  var ds=parse(w.start),de=parse(w.end);
  var h='<div class="panel-head"><h2 class="ph-t">Semanas</h2><p class="ph-s">Anotá lo que gastás cada día. Cada semana tiene su presupuesto y lo que sobra pasa a la siguiente.</p></div>';
  h+='<div class="wkpick" role="group" aria-label="Elegir semana">';
  pc.weeks.forEach(function(x){h+='<button type="button" class="wkp" data-goto="w'+x.i+'" aria-pressed="'+(x.i===i)+'"><b>Semana '+(x.i+1)+'</b><span>'+esc(rango(x.start,x.end))+'</span></button>'});
  h+='</div>';

  var tit='Del '+DIAL[ds.getDay()]+' '+ds.getDate()+(ds.getMonth()!==de.getMonth()?' de '+MESL[ds.getMonth()]:'')+' al '+DIAL[de.getDay()]+' '+de.getDate()+' de '+MESL[de.getMonth()];
  var pill=over?'<span class="pill bad">Te pasaste</span>':cur?'<span class="pill now">Esta semana</span>':past?'<span class="pill ok">Cumplida</span>':'<span class="pill">Próxima</span>';
  h+='<div class="card stack"><div class="sec-h"><h2>'+esc(tit)+'</h2>'+pill+'</div>';
  var sub;
  var ult=i===pc.weeks.length-1;
  if(over)sub=past&&!ult?'Gastaste más de lo que tenías. La diferencia se repartió entre las semanas que quedan.':'Gastaste más de lo que tenías.'+(ult?'':' La diferencia se reparte entre las semanas que quedan cuando termine.');
  else if(past)sub=w.alAhorro?'La semana terminó. Lo que sobró ('+money(w.alAhorro)+') fue al ahorro.':'La semana terminó. Lo que sobró pasó a la siguiente.';
  else sub='Podés gastar <b>'+money(perDay)+'</b> por día '+(cur?'hasta el '+DIAL[de.getDay()]:'si repartís parejo')+'.';
  /* La semana después de una que se pasó: cuánto bajó el día */
  var rc=pc.ajuste&&pc.ajuste.recalculo;
  if(cur&&rc&&rc.semana===i-1)h+='<p class="wk-aviso">La semana pasada te pasaste '+money(rc.deficit)+'; el resto baja a '+money(perDay)+' por día.</p>';
  h+='<div class="wk-big"><span class="wk-bl">'+(over?'Te pasaste por':'Te quedan')+'</span><span class="wk-bv'+(over?' neg':'')+'">'+money(Math.abs(w.left))+'</span><span class="wk-sub">'+sub+'</span></div>';
  h+='<div><div class="bar big'+(over?' over':'')+'" role="img" aria-label="Gastaste el '+Math.round(pct)+'% de lo disponible"><i style="width:'+pct+'%"></i></div>';
  h+='<div class="wk-legend"><span>Gastaste <b>'+money(w.spent)+'</b></span><span>Tenías <b>'+money(w.avail)+'</b>'+(Math.round(w.carry)!==0?' ('+money(w.budget)+(w.carry<0?' − ':' + ')+money(Math.abs(w.carry))+' de la semana anterior)':'')+'</span></div></div>';
  if(past&&!over&&w.left+(w.alAhorro||0)>0&&!ult){var so=sobranteDe(state,w);
    h+='<div class="field"><span class="sub-l">Lo que sobró de esta semana</span><div class="seg" role="group" aria-label="A dónde va lo que sobró"><button type="button" data-sobsem="'+w.start+'" data-val="siguiente" aria-pressed="'+(so!=='ahorro')+'">A la semana siguiente</button><button type="button" data-sobsem="'+w.start+'" data-val="ahorro" aria-pressed="'+(so==='ahorro')+'">Al ahorro</button></div></div>'}
  h+='<div class="days" style="grid-template-columns:repeat('+w.days+',minmax(0,1fr))">';
  for(var k=0;k<w.days;k++){
    var d=addDays(ds,k),di=iso(d),sd=0;
    state.gastos.forEach(function(g){if(g.fecha===di)sd+=g.monto});
    var cls='day'+(di===t?' today':'')+(sd>0?' has':'')+(sd>dayAllow+0.5?' over':'');
    h+='<div class="'+cls+'"><div class="w">'+DIA[d.getDay()]+'</div><div class="n">'+d.getDate()+'</div><div class="s">'+(sd>0?n0(sd):'')+'</div></div>';
  }
  h+='</div>';
  h+='<p class="note">Cada día alcanza para <b>'+money(dayAllow)+'</b>. Debajo de cada día ves lo que gastaste: en verde si estás bien, en rojo si te pasaste.</p></div>';

  var sel=weekSel[i];if(!sel||sel<w.start||sel>w.end)sel=cur?t:w.start;
  var ed=editId?state.gastos.filter(function(g){return g.id===editId})[0]:null;if(!ed)editId=null;
  var fechas=[];for(var q=0;q<w.days;q++){var dd=iso(addDays(ds,q));fechas.push([dd,cap(fLarga(dd))])}
  /* Si el gasto que editás es de otra fecha, también se puede dejar en su día */
  if(ed&&!fechas.some(function(f){return f[0]===ed.fecha}))fechas.unshift([ed.fecha,cap(fLarga(ed.fecha))]);
  h+='<div class="card stack" id="g-card"><h2>'+(ed?'Editar gasto':'Anotá un gasto')+'</h2>'+(ed?'':chipsFrecuentes('g'));
  h+=formGasto('g',{fechas:fechas,fecha:sel,gasto:ed});

  var items=state.gastos.filter(function(g){return g.fecha>=w.start&&g.fecha<=w.end}).sort(function(a,b){return a.fecha<b.fecha?1:a.fecha>b.fecha?-1:(a.id<b.id?1:-1)});
  h+='<div class="sec"><h3>Gastos de esta semana</h3>';
  if(!items.length)h+='<div class="empty">Todavía no anotaste gastos esta semana. Cada gasto que anotes baja lo que te queda.</div>';
  else{h+='<ul class="list glist">';items.forEach(function(g){h+=itemGasto(g,fLarga(g.fecha))});h+='</ul>'}
  h+='</div></div>';
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
  initFormsGasto(p);
  p.addEventListener('change',function(e){
    if(e.target.id==='g-fecha'&&/^w\d+$/.test(ctx.tab)&&!editId)weekSel[Number(ctx.tab.slice(1))]=e.target.value;
  });
  p.addEventListener('submit',function(e){
    if(e.target.getAttribute('data-gform')!=='g')return;
    e.preventDefault();
    var d=leerForm(e.target);if(!d)return;
    if(!editId&&!permitido(d.monto))return;
    var era=editId;guardarGasto(d,editId);editId=null;
    if(/^w\d+$/.test(ctx.tab)&&!era)weekSel[Number(ctx.tab.slice(1))]=d.fecha;
    ctx.renderAll();
    if(era)toast('Cambios guardados');else{var nx=$('#g-monto');if(nx)nx.focus()}
  });
  p.addEventListener('click',function(e){
    var fr=e.target.closest('[data-frec]');if(fr){var fe=$('#g-fecha');anotarFrecuente(Number(fr.getAttribute('data-frec')),fe?fe.value:today());return}
    var dg=e.target.closest('[data-delg]');
    if(dg){var id=dg.getAttribute('data-delg');if(id===editId)editId=null;borrarGasto(id);return}
    var eg=e.target.closest('[data-editg]');
    if(eg){editId=eg.getAttribute('data-editg');ctx.renderAll();var c=$('#g-card');if(c)try{c.scrollIntoView({block:'start',behavior:'smooth'})}catch(er){}var m=$('#g-monto');if(m)m.focus();return}
    if(e.target.closest('[data-gcancel="g"]')){editId=null;ctx.renderAll()}
  });
}
