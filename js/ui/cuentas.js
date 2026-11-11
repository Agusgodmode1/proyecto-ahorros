/* En pareja (2.61): «Los dos» en Hoy y las cuentas entre los dos en Fijos (quién pagó, de quién era, saldar). Cuentas: logica/cuentas.js. */
import {ctx,$,today,money,esc,fCorta,toast,toastAccion,planNow} from './comun.js';
import {uid} from '../logica/util.js';
import {hayPareja,nombrePareja,juntos,GRUPO} from '../logica/pareja.js';
import {proporciones} from '../logica/reparto.js';
import {nuevoGasto,balance,saldar,resumen,ahorroDe,parteMia} from '../logica/cuentas.js';

var F={paga:'yo',de:'conjunto'},todas=false;
/* tu parte de lo que es de los dos: la del grupo «En pareja» de Fijos (una sola regla para todo) */
function pctYo(){var g=(ctx.state.grupos||[]).filter(function(x){return x.id===GRUPO})[0];return g?proporciones(g).yo:.5}
function saldoTxt(b,n){return Math.abs(b)<0.5?'Están a mano 🤝':b>0?esc(n)+' te debe <b class="plata">'+money(b)+'</b>':'Le debés <b class="neg">'+money(-b)+'</b> a '+esc(n)}

/* Hoy: los dos de un vistazo (cuándo cobra y cuánto cada uno, el ahorro del pacto y cómo están las cuentas) */
export function renderDuoHoy(){
  var el=$('#duo-hoy');if(!el)return;
  var st=ctx.state;if(!hayPareja(st)){el.innerHTML='';return}
  var J=juntos(st,today()),n=nombrePareja(st),p=pctYo(),A=ahorroDe(planNow().ahorro,p,st.pareja.pacto),b=balance(st.pareja.cuentas);
  function col(x,i){var g=A.juntos===undefined?(i?A.pareja:A.yo):null;
    return '<div class="duo-c duo-'+x.quien+'"><span class="duo-n">'+esc(x.nombre)+'</span><b>'+money(x.cobra)+'</b><small>'+(x.sinRecibo?'falta su recibo':(i?'cobra':'cobrás')+' el '+esc(fCorta(x.cobro)))+'</small>'
      +(g!==null?'<small class="duo-g">'+(i?'guarda':'guardás')+' '+money(g)+'</small>':'')+'</div>'}
  el.innerHTML='<section class="duo-hoy" aria-label="Los dos"><h2 class="duo-t">Los dos</h2><div class="duo">'+J.personas.map(col).join('')+'</div>'
    +'<p class="duo-j">'+(A.juntos!==undefined?'Guardan juntos <b>'+money(A.juntos)+'</b>':'Pacto dividido: '+J.personas[0].pct+' % / '+J.personas[1].pct+' % de lo que entra')+' · '+saldoTxt(b,n)+'</p>'
    +'<div class="row-btns"><button class="btn quiet" type="button" data-goto="fijos">Anotar un gasto de los dos</button></div></section>';
}

function fila(c,n){
  if(c.tipo==='saldo')return '<li class="cu-li cu-saldo"><span class="cu-f">'+esc(fCorta(c.fecha))+'</span><span class="cu-n">'+(c.paga==='yo'?'Le pasaste a '+esc(n):esc(n)+' te pasó')+'<small>para quedar a mano</small></span><b>'+money(c.monto)+'</b><button class="btn quiet" type="button" data-cudel="'+esc(c.id)+'" aria-label="Borrar este saldo">Borrar</button></li>';
  var de=c.de==='conjunto'?'de los dos · te tocan '+money(c.parte):c.de==='yo'?'era tuyo':'era de '+esc(n);
  return '<li class="cu-li"><span class="cu-f">'+esc(fCorta(c.fecha))+'</span><span class="cu-n">'+esc(c.nota||'Sin detalle')+'<small>pagó '+(c.paga==='yo'?'vos':esc(n))+' · '+de+'</small></span><b>'+money(c.monto)+'</b><button class="btn quiet" type="button" data-cudel="'+esc(c.id)+'" aria-label="Borrar '+esc(c.nota||'este gasto')+'">Borrar</button></li>';
}
function previa(){
  var el=$('#cu-prev');if(!el)return;var m=Number($('#cu-monto').value)||0,n=nombrePareja(ctx.state);
  if(!(m>0)){el.textContent='';return}
  var r=nuevoGasto({monto:m,paga:F.paga,de:F.de},pctYo());
  if(!r.ok){el.textContent=r.error;return}
  var mia=parteMia(m,F.de,pctYo()),suya=m-mia,d=F.paga==='yo'?suya:-mia;
  el.innerHTML='A vos te tocan <b>'+money(mia)+'</b> y a '+esc(n)+' <b>'+money(suya)+'</b>. '+(d>0?esc(n)+' te debe '+money(d)+'.':'Le debés '+money(-d)+'.');
}
function seg(attr,ops,val,lab){return '<div class="seg" role="group" aria-label="'+lab+'">'+ops.map(function(o){return '<button type="button" '+attr+'="'+o[0]+'" aria-pressed="'+(o[0]===val)+'">'+esc(o[1])+'</button>'}).join('')+'</div>'}
/* Fijos: la calculadora que guarda. Quién pagó, de quién era y cómo quedan. */
export function renderCuentas(){
  var el=$('#cuentas-card');if(!el)return;
  var st=ctx.state;if(!hayPareja(st)){el.hidden=true;el.innerHTML='';return}
  var ac=document.activeElement;if(el.innerHTML&&ac&&el.contains(ac)&&ac.matches('input'))return; /* no se redibuja mientras escribís */
  var n=nombrePareja(st),L=(st.pareja.cuentas||[]).slice().reverse(),b=balance(L),R=resumen(L),p=Math.round(pctYo()*100);
  el.hidden=false;
  el.innerHTML='<div class="sec"><h2>Cuentas entre los dos</h2><p class="note">Anotá lo que paga uno y es de los dos: yo llevo quién le debe a quién.</p></div>'
    +'<p class="cu-bal">'+saldoTxt(b,n)+'</p>'
    +(Math.abs(b)>=0.5?'<div class="row-btns"><button class="btn primary" type="button" id="cu-saldar">'+(b>0?'Me pagó: saldar':'Le pagué: saldar')+'</button></div>':'')
    +'<form class="cu-form stack" id="cu-form" autocomplete="off">'
    +'<div class="grid2"><div class="field"><label for="cu-monto" class="sub-l">¿Cuánto fue?</label><div class="money"><span>$</span><input id="cu-monto" type="number" inputmode="decimal" min="0" step="any" placeholder="0"></div></div>'
    +'<div class="field"><label for="cu-nota" class="sub-l">¿En qué?</label><input id="cu-nota" type="text" maxlength="60" placeholder="Súper, salida, regalo…"></div></div>'
    +'<div class="field"><span class="sub-l">¿Quién pagó?</span>'+seg('data-cupaga',[['yo','Vos'],['pareja',n]],F.paga,'Quién pagó')+'</div>'
    +'<div class="field"><span class="sub-l">¿De quién era?</span>'+seg('data-cude',[['conjunto','De los dos'],['yo','Mío'],['pareja','De '+n]],F.de,'De quién era')+'</div>'
    +'<p class="note cu-prev" id="cu-prev" aria-live="polite"></p>'
    +'<div class="row-btns"><button class="btn" type="submit">Anotar</button></div></form>'
    +'<p class="note">Lo de los dos se reparte '+p+' % / '+(100-p)+' %, como el grupo «En pareja» de acá abajo.</p>'
    +(L.length?'<p class="note cu-res">Gastaron juntos <b>'+money(R.total)+'</b>: vos pusiste '+money(R.yo)+' y '+esc(n)+' '+money(R.pareja)+'.</p><ul class="cu-lista">'+L.slice(0,todas?200:5).map(function(c){return fila(c,n)}).join('')+'</ul>'
      +(L.length>5&&!todas?'<button class="linklike" type="button" id="cu-todas">Ver los '+L.length+'</button>':''):'');
}
function cambio(){ctx.persist();ctx.renderAll()}
export function initCuentas(){
  var el=$('#cuentas-card');if(!el)return;
  el.addEventListener('input',function(e){if(e.target.id==='cu-monto')previa()});
  el.addEventListener('submit',function(e){
    if(e.target.id!=='cu-form')return;e.preventDefault();
    var p=ctx.state.pareja,r=nuevoGasto({id:uid(),fecha:today(),monto:$('#cu-monto').value,nota:$('#cu-nota').value,paga:F.paga,de:F.de},pctYo());
    if(!r.ok){toast(r.error);return}
    p.cuentas=(p.cuentas||[]).concat([r.gasto]);if(document.activeElement)document.activeElement.blur();cambio();
    toastAccion('Anotado: '+money(r.gasto.monto)+(r.gasto.nota?' en '+r.gasto.nota:''),'Deshacer',function(){p.cuentas=p.cuentas.filter(function(x){return x.id!==r.gasto.id});cambio()});
  });
  el.addEventListener('click',function(e){
    var p=ctx.state.pareja,b;
    if((b=e.target.closest('[data-cupaga]'))){F.paga=b.getAttribute('data-cupaga');marcar('data-cupaga',F.paga);previa();return}
    if((b=e.target.closest('[data-cude]'))){F.de=b.getAttribute('data-cude');marcar('data-cude',F.de);previa();return}
    if(e.target.closest('#cu-todas')){todas=true;renderCuentas();return}
    if(e.target.closest('#cu-saldar')){
      var s=saldar(p.cuentas,{id:uid(),fecha:today()});if(!s)return;
      p.cuentas=p.cuentas.concat([s]);cambio();
      toastAccion('Listo: quedaron a mano','Deshacer',function(){p.cuentas=p.cuentas.filter(function(x){return x.id!==s.id});cambio()});return}
    if((b=e.target.closest('[data-cudel]'))){
      var id=b.getAttribute('data-cudel'),antes=p.cuentas.slice();
      p.cuentas=antes.filter(function(x){return String(x.id)!==id});cambio();
      toastAccion('Borrado','Deshacer',function(){p.cuentas=antes;cambio()});
    }
  });
  function marcar(a,v){el.querySelectorAll('['+a+']').forEach(function(x){x.setAttribute('aria-pressed',String(x.getAttribute(a)===v))})}
  /* el tipo de pacto se elige en Ajustes */
  document.addEventListener('click',function(e){var b=e.target.closest('[data-pjpacto]');if(!b||!ctx.state.pareja)return;ctx.state.pareja.pacto=b.getAttribute('data-pjpacto');cambio()});
}
