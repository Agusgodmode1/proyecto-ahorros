/* Pestaña Semanas: selector, "te quedan", los 7 días, anotar y borrar gastos. */
import {parse,addDays,iso,diffDays,DIA,DIAL,MESL} from '../logica/fechas.js';
import {num,uid} from '../logica/util.js';
import {ctx,$,today,money,n0,esc,fLarga,rango,cap} from './comun.js';

var weekSel={};
export function resetWeekSel(){weekSel={}}

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
  if(over)sub='Gastaste más de lo que tenías. La diferencia se descuenta de la semana que viene.';
  else if(past)sub='La semana terminó. Lo que sobró pasó a la siguiente.';
  else sub='Podés gastar <b>'+money(perDay)+'</b> por día '+(cur?'hasta el '+DIAL[de.getDay()]:'si repartís parejo')+'.';
  h+='<div class="wk-big"><span class="wk-bl">'+(over?'Te pasaste por':'Te quedan')+'</span><span class="wk-bv'+(over?' neg':'')+'">'+money(Math.abs(w.left))+'</span><span class="wk-sub">'+sub+'</span></div>';
  h+='<div><div class="bar big'+(over?' over':'')+'" role="img" aria-label="Gastaste el '+Math.round(pct)+'% de lo disponible"><i style="width:'+pct+'%"></i></div>';
  h+='<div class="wk-legend"><span>Gastaste <b>'+money(w.spent)+'</b></span><span>Tenías <b>'+money(w.avail)+'</b>'+(Math.round(w.carry)!==0?' ('+money(w.budget)+(w.carry<0?' − ':' + ')+money(Math.abs(w.carry))+' de la semana anterior)':'')+'</span></div></div>';
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
  var opts='';for(var q=0;q<w.days;q++){var dd=iso(addDays(ds,q));opts+='<option value="'+dd+'"'+(dd===sel?' selected':'')+'>'+esc(cap(fLarga(dd)))+'</option>'}
  h+='<div class="card stack"><h2>Anotá un gasto</h2>';
  h+='<form class="addexp" id="exp-form" autocomplete="off"><div class="field"><label for="g-monto" class="sub-l">¿Cuánto?</label><div class="money"><span>$</span><input id="g-monto" type="number" inputmode="decimal" min="0" step="any" required></div></div>';
  h+='<div class="field"><label for="g-nota" class="sub-l">¿En qué?</label><input id="g-nota" type="text" maxlength="60" placeholder="almuerzo, boleto, súper"></div>';
  h+='<div class="field"><label for="g-fecha" class="sub-l">¿Qué día?</label><select id="g-fecha">'+opts+'</select></div>';
  h+='<button class="btn primary" type="submit">Anotar</button></form>';

  var items=state.gastos.filter(function(g){return g.fecha>=w.start&&g.fecha<=w.end}).sort(function(a,b){return a.fecha<b.fecha?1:a.fecha>b.fecha?-1:(a.id<b.id?1:-1)});
  h+='<div class="sec"><h3>Gastos de esta semana</h3>';
  if(!items.length)h+='<div class="empty">Todavía no anotaste gastos esta semana. Cada gasto que anotes baja lo que te queda.</div>';
  else{h+='<ul class="list">';items.forEach(function(g){h+='<li><span class="when">'+esc(fLarga(g.fecha))+'</span><span class="what">'+(g.nota?esc(g.nota):'<span class="muted">Sin detalle</span>')+(g.src==='brou'?' <span class="src">del extracto</span>':g.src==='voz'?' <span class="src">por voz</span>':'')+'</span><span class="amt">'+money(g.monto)+'</span><button class="btn quiet" type="button" data-delg="'+esc(g.id)+'" aria-label="Borrar gasto">Borrar</button></li>'});h+='</ul>'}
  h+='</div></div>';
  el.innerHTML=h;
}

export function initSemanas(){
  var p=$('#p-semana');
  p.addEventListener('change',function(e){
    if(e.target.id==='g-fecha'&&/^w\d+$/.test(ctx.tab))weekSel[Number(ctx.tab.slice(1))]=e.target.value;
  });
  p.addEventListener('submit',function(e){
    if(e.target.id!=='exp-form')return;
    e.preventDefault();
    var m=num($('#g-monto').value);
    if(!(m>0)){$('#g-monto').focus();return}
    var f=$('#g-fecha').value;
    ctx.state.gastos.push({id:uid(),fecha:f,monto:m,nota:$('#g-nota').value.trim().slice(0,60)});
    if(/^w\d+$/.test(ctx.tab))weekSel[Number(ctx.tab.slice(1))]=f;
    ctx.persist();ctx.renderAll();
    var nx=$('#g-monto');if(nx)nx.focus();
  });
  p.addEventListener('click',function(e){
    var dg=e.target.closest('[data-delg]');
    if(dg){var id=dg.getAttribute('data-delg');ctx.state.gastos=ctx.state.gastos.filter(function(x){return x.id!==id});ctx.persist();ctx.renderAll()}
  });
}
