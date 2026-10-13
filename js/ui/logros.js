/* Pestaña Logros: racha, cerrar el mes, logros, historial y meses anteriores. */
import {pad,diffDays,MESL} from '../logica/fechas.js';
import {num} from '../logica/util.js';
import {nextCobro} from '../logica/plan.js';
import {histStats,histOk,histExtra,logrosLista,nuevosLogros,cerrarMes,mesKey} from '../logica/logros.js';
import {ctx,$,today,planNow,liqNow,exAnalisis,money,esc,fCorta,fLarga,cap,tile,armar,toast,ICON} from './comun.js';
import {resetWeekSel} from './semanas.js';

var SV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
var ICONL={
  flame:SV+'<path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.3 2.4-5.2 3.6-8 .3 2 1.4 3.2 2.6 3.7C12 7.6 13.3 5 15 3c.4 3.4 3.5 5.6 3.5 10.3 0 4.4-2.8 7.7-6.5 7.7Z" fill="none"/></svg>',
  medal:SV+'<circle cx="12" cy="14.5" r="5.5" fill="none"/><path d="M8.6 10 6 3h4l2 4.2L14 3h4l-2.6 7" fill="none"/></svg>',
  star:SV+'<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z" fill="none"/></svg>',
  check:SV+'<circle cx="12" cy="12" r="8.5" fill="none"/><path d="m8.5 12.2 2.4 2.4 4.8-5" fill="none"/></svg>',
  clock:SV+'<circle cx="12" cy="12" r="8.5" fill="none"/><path d="M12 7.5V12l3 2" fill="none"/></svg>',
  search:SV+'<circle cx="11" cy="11" r="6" fill="none"/><path d="m20 20-4.6-4.6" fill="none"/></svg>',
  flag:SV+'<path d="M5 21V4M5 4h11l-2 4 2 4H5" fill="none"/></svg>',
  eye:SV+'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" fill="none"/><circle cx="12" cy="12" r="3" fill="none"/></svg>',
  coins:ICON.plan,cal:ICON.semanas
};
var cDirtyA=false,cDirtyM=false;
function mesNombre(k){return cap(MESL[Number(k.slice(5,7))-1])+' '+k.slice(0,4)}

/* Al desbloquear: el logro queda guardado con la fecha y aparece un aviso. */
export function evalLogros(pc){
  if(!ctx.booted)return;
  var nuevos=nuevosLogros(ctx.state,pc,today(),exAnalisis());
  if(nuevos.length){ctx.persist();toast(nuevos.length===1?'Nuevo logro: '+nuevos[0].t:'Desbloqueaste '+nuevos.length+' logros nuevos')}
}
export function renderLogros(pc){
  var state=ctx.state;
  pc=pc||planNow();
  var S=histStats(state.hist),list=logrosLista(state,pc,today(),exAnalisis()),L=liqNow(true);
  var un=list.filter(function(l){return state.logros[l.id]||l.val>=l.need}).length;
  $('#logros-top').innerHTML='<div class="card streak">'
    +'<div class="st-main"><span class="st-ic">'+ICONL.flame+'</span><div class="st-txt"><span class="tile-l" style="color:var(--sun-ink)">Racha actual</span><b class="st-n">'+S.cur+' '+(S.cur===1?'mes':'meses')+'</b><span class="tile-h">'+(S.cur>0?'Cerrá el próximo mes cumpliendo la meta y llegás a '+(S.cur+1)+'.':'Cumplí la meta de este mes y arrancás tu racha.')+'</span></div></div>'
    +'<div class="tiles">'+tile('tone-sun','Mejor racha',S.best+' '+(S.best===1?'mes':'meses'),'meses seguidos')+tile('tone-mint','Meses cumplidos',S.met+' de '+S.hs.length,'meses cerrados')+tile('tone-sky','Guardado en total',money(S.tot),'en meses cerrados')+tile('tone-grape','Logros',un+' de '+list.length,'desbloqueados')+'</div></div>';
  var p=state.plan,d=diffDays(today(),p.cobro),nc=nextCobro(p.cobro);
  $('#cierre-note').innerHTML='Tu meta de este período es <b>'+money(pc.ahorro)+'</b>. '+(d>0?'Lo ideal es cerrarlo el día que cobrás, el '+esc(fLarga(p.cobro))+' (faltan '+d+' '+(d===1?'día':'días')+').':'Ya cobraste: es buen momento para cerrarlo.')+' Al cerrar se guarda en tu historial y el plan arranca de nuevo del '+esc(fCorta(p.cobro))+' al '+esc(fCorta(nc))+'.';
  var ia=$('#c-ahorrado'),im=$('#c-monto');
  if(!cDirtyA&&document.activeElement!==ia)ia.value=Math.round(pc.ahorro)||'';
  if(!cDirtyM&&document.activeElement!==im)im.value=Math.round(L.liquido)||'';
  var sobra=pc.gastar-pc.spentInPlan;
  $('#c-hint').textContent=pc.spentInPlan>0&&sobra>0?'Te puse tu meta. Del presupuesto de las semanas te sobran '+money(sobra)+': si no los gastás, sumalos.':'Te puse tu meta. Si guardaste más, cambialo y ganás el logro de ahorro extra.';
  var g='<div class="sec"><div class="sec-h"><h2>Tus logros</h2><span class="note">'+un+' de '+list.length+' desbloqueados</span></div><div class="logros">';
  list.forEach(function(l){
    var ok=!!state.logros[l.id]||l.val>=l.need,pr=Math.min(1,l.val/l.need);
    g+='<div class="logro'+(ok?' on':'')+'"><span class="lg-ic">'+ICONL[l.ic]+'</span><b>'+esc(l.t)+'</b><span class="lg-d">'+esc(l.d)+'</span>'
      +(ok?'<span class="lg-st">Desbloqueado'+(state.logros[l.id]?' el '+esc(fCorta(state.logros[l.id])):'')+'</span>'
          :'<span class="bar"><i style="width:'+Math.round(pr*100)+'%"></i></span><span class="lg-st">'+(l.money?money(Math.min(l.val,l.need))+' de '+money(l.need):Math.min(l.val,l.need)+' de '+l.need)+'</span>')+'</div>';
  });
  g+='</div></div>';
  g+='<div class="card stack"><div class="sec"><h2>Historial</h2><p class="note">Cada mes cerrado. La racha cuenta meses seguidos con la meta cumplida.</p></div>';
  if(!S.hs.length)g+='<div class="empty">Todavía no cerraste ningún mes. Cuando cobres, cerrá el mes acá arriba. Si ya venías ahorrando, cargá los meses anteriores abajo.</div>';
  else{
    g+='<ul class="list">';
    S.hs.slice().reverse().forEach(function(x){
      var ok=histOk(x),ex=histExtra(x);
      g+='<li><span class="what" style="flex-direction:column;align-items:flex-start;gap:1px"><b>'+esc(mesNombre(x.k))+'</b><span class="src">Meta '+money(num(x.meta))+' · guardaste '+money(num(x.ahorrado))+'</span></span><span class="pill '+(ex?'ex':ok?'ok':'bad')+'">'+(ex?'Con extra':ok?'Cumplida':'No llegó')+'</span><button class="btn quiet" type="button" data-delhist="'+esc(x.k)+'">Borrar</button></li>';
    });
    g+='</ul>';
  }
  g+='</div>';
  $('#logros-out').innerHTML=g;
}
function doCierre(){
  var nc=cerrarMes(ctx.state,planNow(),num($('#c-ahorrado').value),num($('#c-monto').value));
  resetWeekSel();cDirtyA=false;cDirtyM=false;
  $('#c-confirm').hidden=true;$('#c-cerrar').hidden=false;
  ctx.syncInputs();ctx.persist();ctx.renderAll();
  toast('Mes cerrado. Tu plan nuevo va hasta el '+fCorta(nc)+'.');
}
export function initLogros(){
  $('#c-ahorrado').addEventListener('input',function(){cDirtyA=true});
  $('#c-monto').addEventListener('input',function(){cDirtyM=true});
  $('#c-cerrar').addEventListener('click',function(){this.hidden=true;$('#c-confirm').hidden=false});
  $('#c-no').addEventListener('click',function(){$('#c-confirm').hidden=true;$('#c-cerrar').hidden=false});
  $('#c-si').addEventListener('click',doCierre);
  $('#h-mes').innerHTML=MESL.map(function(m,i){return '<option value="'+pad(i+1)+'">'+cap(m)+'</option>'}).join('');
  var y=Number(today().slice(0,4)),ys='';for(var a=y;a>=y-2;a--)ys+='<option>'+a+'</option>';$('#h-anio').innerHTML=ys;
  var pm=new Date();pm.setMonth(pm.getMonth()-1);$('#h-mes').value=pad(pm.getMonth()+1);$('#h-anio').value=String(pm.getFullYear());
  $('#h-add').addEventListener('click',function(){
    var state=ctx.state,k=$('#h-anio').value+'-'+$('#h-mes').value,me=num($('#h-meta').value),ah=num($('#h-ahorrado').value),er=$('#h-err');
    if(!(me>0)&&!(ah>0)){er.textContent='Poné cuánto te habías propuesto guardar y cuánto guardaste.';er.hidden=false;return}
    if(k>=mesKey(state.plan.inicio)){er.textContent='Ese mes es el actual o uno futuro. Para este mes usá "Cerrar el mes".';er.hidden=false;return}
    er.hidden=true;
    state.hist=state.hist.filter(function(x){return x.k!==k});
    state.hist.push({k:k,meta:Math.round(me),ahorrado:Math.round(ah),manual:true});
    $('#h-meta').value='';$('#h-ahorrado').value='';
    ctx.persist();ctx.renderAll();toast(mesNombre(k)+' agregado al historial');
  });
  $('#p-logros').addEventListener('click',function(e){
    var b=e.target.closest('[data-delhist]');if(!b)return;
    if(!armar(b))return;
    var k=b.getAttribute('data-delhist');ctx.state.hist=ctx.state.hist.filter(function(x){return x.k!==k});ctx.persist();ctx.renderAll();
  });
}
