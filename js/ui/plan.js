/* Pestaña Plan: portada con "Hoy podés gastar", anotar un gasto, plan plegable, hasta que cobres, semanas y "cuando cobres". */
import {parse,diffDays,bizRank,MESL} from '../logica/fechas.js';
import {num} from '../logica/util.js';
import {fijosPeriodo,totalFijos,proximo,hoyPodes,planCalc} from '../logica/plan.js';
import {disponible,fijosPagados,maxAhorro,previaSaldo,ajustarSaldo,deshacerAjuste} from '../logica/saldo.js';
import {mesTrabajo,mins,reglasHoras} from '../logica/sueldo.js';
import {histStats,logrosLista} from '../logica/logros.js';
import {ctx,$,today,liqNow,planNow,exAnalisis,money,esc,fCorta,fLarga,rango,fMin,cap,tile,hchip,row,toast,toastAccion} from './comun.js';
import {aguinaldo} from '../logica/aguinaldo.js';
import {aniosSinFeriados} from '../logica/avisos.js';
import {ritmoDelMes,minimoDe} from '../logica/mes.js';
import {sensibilidadDolar} from '../logica/recibos.js';
import {formGasto,initFormsGasto,leerForm,permitido,guardarGasto,borrarGasto,itemGasto,chipsFrecuentes,anotarFrecuente} from './gastos.js';
import {editarGasto} from './semanas.js';

function rankTxt(s){
  var r=bizRank(s),d=parse(s);
  return r?(r+'.º día hábil de '+MESL[d.getMonth()]):'cae en día no hábil';
}
/* Portada: lo único grande es cuánto podés gastar hoy */
function heroChips(pc){
  var state=ctx.state,L=liqNow(true),t=today(),H=hoyPodes(pc,state.gastos,t),el=$('#hoy-hero');
  var sinPlan=!(num(state.plan.monto)>0);
  if(sinPlan)el.innerHTML='<span class="hh-l">Para saber cuánto podés gastar por día</span><span class="hh-s"><button class="linklike" type="button" id="hoy-empezar">armá tu plan</button>: cuánta plata tenés y cuánto querés guardar.</span>';
  else{
    var h='<span class="hh-l">'+(H.queda<0?'Hoy te pasaste por':'Hoy podés gastar')+'</span><b class="hh-n'+(H.queda<0?' neg':'')+'">'+money(Math.abs(H.queda))+'</b>';
    if(H.dentro){
      var w=pc.weeks[H.semana],pct=w.avail>0?Math.min(100,Math.max(0,w.spent/w.avail*100)):(w.spent>0?100:0);
      h+='<span class="hh-s">'+(H.semanaQueda<0?'Esta semana te pasaste por '+money(-H.semanaQueda):'Te quedan '+money(H.semanaQueda)+' hasta el '+esc(fLarga(H.fin)))+(H.gastadoHoy>0?' · hoy gastaste '+money(H.gastadoHoy):'')+'</span>'
        +(pc.ajuste&&pc.ajuste.estado==='minimo'?'<span class="hh-s">El objetivo ya no se alcanza: esto cuida tu mínimo de '+money(pc.ajuste.minimo)+'.</span>':'')
        +(pc.ajuste&&pc.ajuste.estado==='nada'?'<span class="hh-s neg">Para tu mínimo faltan '+money(pc.ajuste.falta)+' aunque no gastes nada más.</span>':'')
        +'<span class="bar'+(w.left<0?' over':'')+'" role="img" aria-label="Gastaste el '+Math.round(pct)+'% de la semana"><i style="width:'+pct+'%"></i></span>';
    }else h+='<span class="hh-s">'+(t>=state.plan.cobro?'Ya cobraste: cerrá el mes en Logros para arrancar uno nuevo.':'Hoy está fuera de las fechas de tu plan.')+'</span>';
    h+='<button class="gasto-btn" type="button" id="gasto-abrir"><span aria-hidden="true">+</span> Anotar un gasto</button>';
    el.innerHTML=h;
  }
  /* Tres datos, siempre en la misma fila: cuándo cobrás, cuánta plata tenés y cuánto guardás */
  var d=diffDays(t,state.plan.cobro),cv=d>0?d+(d===1?' día':' días'):(d===0?'Hoy':'Ya cobraste');
  $('#hero-chips').innerHTML='<div class="hchip hc-cobro" aria-label="'+(d>0?'Cobrás en '+cv:(d===0?'Cobrás hoy':'Ya cobraste'))+'"><span>'+(d>0?'Cobrás en':'Cobro')+'</span><b>'+esc(cv)+'</b><small>'+esc(fCorta(state.plan.cobro))+'</small></div>'
    +'<button class="hchip hc-saldo" type="button" id="saldo-abrir"><span>Tenés</span><b>'+money(Math.max(0,disponible(state,pc)))+'</b><small>actualizar</small></button>'
    +'<div class="hchip"><span>Guardás</span><b>'+money(pc.ahorro)+'</b><small>este mes</small></div>';
}
/* Aviso grande cuando la meta de ahorro no se puede cumplir con la plata que tenés */
function renderAlertaMeta(pc){
  var el=$('#meta-alerta');if(!el)return;
  var st=ctx.state,p=st.plan,t=today();
  if(!(num(p.monto)>0)||t>=p.cobro){el.innerHTML='';return}
  var mx=maxAhorro(st,pc),ped=pc.ahorroPedido;
  if(ped<=mx+0.5){el.innerHTML='';return}
  var d=Math.max(0,disponible(st,pc));
  el.innerHTML='<div class="banner alerta" role="alert"><p><b>Esa meta no se puede.</b> Tenés '+money(d)+', así que lo máximo que podés guardar es '+money(mx)+' y no los '+money(ped)+' que pusiste. Bajá la meta o actualizá tu saldo si tenés más plata.</p>'
    +'<span class="row-btns">'+(p.modo==='monto'?'<button class="btn" type="button" id="meta-bajar" data-mx="'+Math.floor(mx)+'">Guardar '+money(Math.floor(mx))+'</button>':'')+'<button class="btn quiet" type="button" id="meta-plan">Cambiar la meta</button></span></div>';
}
/* Debajo de la portada: lo que gastaste hoy (o, en vista simple, tus últimos 3 gastos). Anotar se hace desde la hoja. */
function renderHoy(pc){
  var state=ctx.state,t=today(),el=$('#hoy-out');if(!el)return;
  if(!(num(state.plan.monto)>0)){el.innerHTML='';return}
  var simple=vistaSimple(),lista,tit,cuando;
  if(simple){
    lista=state.gastos.slice().reverse().sort(function(a,b){return a.fecha<b.fecha?1:a.fecha>b.fecha?-1:0}).slice(0,3);
    tit='Tus últimos gastos';
  }else{lista=state.gastos.filter(function(g){return g.fecha===t});tit='Gastaste hoy'}
  if(!lista.length){el.innerHTML=simple?'<div class="card stack hoy tone-mint"><h2>Tus últimos gastos</h2><p class="note">Todavía no anotaste ninguno. Tocá «Anotar un gasto».</p></div>':'';return}
  el.innerHTML='<div class="card stack hoy tone-mint"><h2>'+tit+'</h2><ul class="list glist">'+lista.map(function(g){return itemGasto(g,g.fecha===t?'hoy':fCorta(g.fecha))}).join('')+'</ul></div>';
}
/* Vista simple: solo lo esencial (se recuerda en este celular) */
var VS='pa-simple';
function vistaSimple(){try{return localStorage.getItem(VS)==='1'}catch(e){return false}}
function aplicarVista(){
  var s=vistaSimple(),a=$('#app'),b=$('#modo-simple');
  if(a)a.classList.toggle('simple',s);
  if(b){b.setAttribute('aria-pressed',String(s));b.textContent=s?'Vista completa':'Vista simple'}
}
/* Hoja para anotar un gasto: se abre desde el botón grande de la portada */
function abrirGasto(){
  var s=$('#gasto-sheet'),b=$('#gasto-box');if(!s||!b)return;
  b.innerHTML='<div class="sheet-top"><h2 id="gs-t">Anotar un gasto</h2><button class="btn quiet" type="button" id="gasto-x">Cerrar</button></div>'+chipsFrecuentes('q')+formGasto('q',{fecha:today(),boton:'Anotar'});
  s.hidden=false;document.documentElement.classList.add('hoja');
  setTimeout(function(){var m=$('#q-monto');if(m)m.focus()},120);
}
function cerrarGasto(){var s=$('#gasto-sheet');if(s)s.hidden=true;document.documentElement.classList.remove('hoja')}
function initGasto(){
  var s=$('#gasto-sheet');
  initFormsGasto(s);
  s.addEventListener('click',function(e){
    if(e.target===s||e.target.closest('#gasto-x')){cerrarGasto();return}
    var fr=e.target.closest('[data-frec]');if(fr){var ok=anotarFrecuente(Number(fr.getAttribute('data-frec')),today());cerrarGasto();return}
  });
  s.addEventListener('submit',function(e){
    if(!e.target.getAttribute||e.target.getAttribute('data-gform')!=='q')return;
    e.preventDefault();
    var d=leerForm(e.target);if(!d)return;
    if(!permitido(d.monto))return;
    guardarGasto(d,null);cerrarGasto();ctx.renderAll();toast('Anotado: '+money(d.monto)+(d.nota?' en '+d.nota:''));
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!s.hidden)cerrarGasto()});
  $('#hoy-hero').addEventListener('click',function(e){if(e.target.closest('#gasto-abrir'))abrirGasto()});
  var vb=$('#modo-simple');
  if(vb)vb.addEventListener('click',function(){try{localStorage.setItem(VS,vistaSimple()?'0':'1')}catch(er){}aplicarVista();ctx.renderAll()});
  aplicarVista();
}
var plegados={};/* tarjetas plegables abiertas, por id */
function foldIni(id,tono,tit,sub){return '<details class="card fold '+tono+'" data-fold="'+id+'"'+(plegados[id]?' open':'')+'><summary><span class="fold-t">'+tit+'</span><span class="fold-s">'+sub+'</span></summary><div class="stack fold-b">'}
/* La cuenta regresiva ahora es el primer dato de la fila de la portada (heroChips) */
export function renderCountdown(){}

export function renderResumen(pc){
  var state=ctx.state;
  syncMontoCampo(pc);ahorroNote();heroChips(pc);renderAlertaMeta(pc);renderHoy(pc);renderRitmo(pc);
  var sf=aniosSinFeriados(state,today()),fa=$('#fer-aviso');
  if(fa)fa.innerHTML=sf.length?'<div class="banner"><p><b>No tengo los feriados de '+sf.join(' y ')+'.</b> Sin ellos, el día de cobro puede salir mal. Actualizá la app o agregalos en Ajustes → Feriados.</p><button class="btn" type="button" data-goto="ajustes">Ir a Feriados</button></div>':'';
  var sum=$('#plan-aj-sum');if(sum)sum.textContent=num(state.plan.monto)>0?money(Math.max(0,disponible(state,pc)))+' disponibles · guardás '+money(pc.ahorro)+' · hasta el '+fCorta(state.plan.cobro):'Completá los tres pasos';
  var p=state.plan,t=today(),L=liqNow(true),fp=fijosPeriodo(state.fijos,p.inicio,p.cobro);
  /* Todo en base a la plata que tenés AHORA (la misma del botón de la portada) */
  var disp=Math.max(0,disponible(state,pc)),pagF=Math.min(pc.fijos,fijosPagados(state)),pend=Math.max(0,pc.fijos-pagF),resto=pc.gastar-pc.spentInPlan;
  var m=Math.max(1,disp),pf=Math.max(0,Math.min(100,pend/m*100)),pa=Math.max(0,Math.min(100-pf,pc.ahorro/m*100)),pg=Math.max(0,100-pf-pa);
  var dq=t>=p.cobro?pc.total:Math.max(1,diffDays(t<p.inicio?p.inicio:t,p.cobro)),pDia=t>=p.cobro?pc.daily:resto/dq;
  var h=state.ejemplo?'<div class="banner"><p><b>Estás viendo datos de ejemplo.</b> Son de muestra: no son tuyos.</p><button class="btn" type="button" data-cero>Borrar el ejemplo y crear mi perfil</button></div>':'';
  h+=foldIni('cobrar','tone-mint','Hasta que cobres',resto<0?'Te faltan '+money(-resto)+' para llegar a tu meta':'Te queda para gastar '+money(resto)+' · '+esc(rango(p.inicio,p.cobro)));
  var fsub=fp.length?fp.map(function(o){return esc(o.f.nombre)+' ('+esc(fCorta(o.fecha))+')'}).join(', '):(state.fijos.length?'ninguno vence antes de cobrar':'<button class="linklike" type="button" data-goto="fijos">cargá tus gastos fijos</button>');
  h+='<div class="receipt">'
    +row('Plata que tenés ahora',money(disp),'','según lo que anotaste · <button class="linklike" type="button" id="saldo-abrir2">actualizar</button>')
    +row('Gastos fijos que faltan pagar','− '+money(pend),'sub minus',pagF>0?'ya pagaste '+money(pagF)+(pend>0?'. Faltan: ':'')+(pend>0?fsub:''):fsub)
    +row('Lo que guardás','− '+money(pc.ahorro),'sub save','tu meta de este mes')
    +row('Te queda para gastar',money(resto),'final')+'</div>';
  if(resto<0)h+='<p class="err" style="margin-top:0">Con lo que te queda no llegás a guardar todo: te faltan '+money(-resto)+'. Bajá el ahorro o revisá los gastos.</p>';
  h+='<div><div class="split-bar" role="img" aria-label="Fijos '+Math.round(pf)+'%, ahorro '+Math.round(pa)+'%, para gastar '+Math.round(pg)+'%"><i class="split-fix" style="width:'+pf+'%"></i><i class="split-save" style="width:'+pa+'%"></i><i class="split-spend" style="width:'+pg+'%"></i></div>';
  h+='<div class="split-key">'+(pend>0?'<span><i class="dot" style="background:var(--teal)"></i>Fijos, '+Math.round(pf)+'%</span>':'')+'<span><i class="dot" style="background:var(--sun)"></i>Guardás, '+Math.round(pa)+'%</span><span><i class="dot" style="background:var(--sky)"></i>Para gastar, '+Math.round(pg)+'%</span></div></div>';
  h+='<div class="tiles">'
    +tile('tone-sky','Por semana',money(pDia*7),money(pDia)+' por día, parejo hasta cobrar')
    +tile('tone-coral','Gastaste',money(pc.spentInPlan),'de '+money(pc.gastar)+' para gastar')
    +'</div></div></details>';

  var mt=mesTrabajo(state),mtN=MESL[Number(mt.slice(5,7))-1];
  /* ("Tu mes de un vistazo" se sacó: repetía lo que ya muestran las pestañas) */
  var cw=pc.weeks.filter(function(w){return t>=w.start&&t<=w.end})[0];
  h+=foldIni('semanas','tone-sky','Semana por semana',cw?(cw.left<0?'Esta semana te pasaste por '+money(-cw.left):'Esta semana te quedan '+money(cw.left)):pc.weeks.length+' semanas')+'<p class="note">Tocá una semana para anotar gastos. Lo que sobra o falta pasa a la siguiente.</p><div class="weeks">';
  pc.weeks.forEach(function(w){
    var cur=t>=w.start&&t<=w.end,past=t>w.end,st;
    if(w.left<0)st=['bad','Te pasaste'];else if(cur)st=['now','Esta semana'];else if(past)st=['ok','Cumplida'];else st=['','Próxima'];
    var pct=w.avail>0?Math.min(100,Math.max(0,w.spent/w.avail*100)):(w.spent>0?100:0);
    h+='<button type="button" class="wk'+(cur?' cur':'')+(w.left<0?' over':'')+'" data-goto="w'+w.i+'">'
      +'<span class="wk-top"><span class="wk-t">Semana '+(w.i+1)+'</span><span class="pill '+st[0]+'">'+st[1]+'</span></span>'
      +'<span class="wk-d">'+esc(rango(w.start,w.end))+'</span>'
      +'<span class="wk-l">'+(w.left<0?'Te pasaste por':'Te quedan')+'</span><span class="wk-v">'+money(Math.abs(w.left))+'</span>'
      +'<span class="bar'+(w.left<0?' over':'')+'"><i style="width:'+pct+'%"></i></span>'
      +'<span class="wk-f">Gastaste '+money(w.spent)+' de '+money(w.avail)+'</span></button>';
  });
  h+='</div>';
  var fuera=pc.spentAll-pc.spentInPlan;
  if(Math.round(fuera)>0)h+='<p class="note">Hay '+money(fuera)+' en gastos con fecha fuera del plan. No cuentan en las semanas.</p>';
  h+='</div></details>';

  var nx=proximo(state,L);
  /* Si el aguinaldo cae en ese mes, se suma a lo libre */
  var AG=aguinaldo(state,t),conAg=AG.pago>=p.cobro&&AG.pago<nx.nc&&AG.liquido>0;
  if(conAg){nx=Object.assign({},nx,{libre:nx.libre+AG.liquido});nx.dia=nx.libre/nx.dias;nx.semana=nx.libre*7/nx.dias}
  h+=foldIni('cuando','tone-grape','Cuando cobres',nx.libre>=0?'El mes que viene: '+money(nx.semana)+' por semana':'El mes que viene te faltan '+money(-nx.libre));
  h+='<p class="lead">'+(nx.libre>=0?'El mes que viene vas a poder gastar unos <b class="c-mint">'+money(nx.semana)+' por semana</b>.':'El mes que viene no te alcanza para la meta: te faltan <b class="neg">'+money(-nx.libre)+'</b>.')+'</p>';
  h+='<div class="receipt">'
    +row(L.real?'Tu sueldo (según tu recibo)':'Tu sueldo, estimado',money(L.liquido),'','<button class="linklike" type="button" data-goto="sueldo">ver el cálculo</button>')
    +row('Gastos fijos del mes','− '+money(nx.fij),'sub minus',state.fijos.length?state.fijos.length+' cargados':'<button class="linklike" type="button" data-goto="fijos">cargalos</button>')
    +(conAg?row('Aguinaldo de '+AG.nombre,'+ '+money(AG.liquido),'sub','<button class="linklike" type="button" data-goto="sueldo">estimado</button>, antes del '+Number(AG.pago.slice(8,10))+' de '+AG.nombre):'')
    +row('Lo que vas a guardar','− '+money(nx.meta),'sub save','tu meta de ahorro')
    +row('Libre para gastar',money(nx.libre),'final')+'</div>';
  if(nx.metaPedida>nx.meta)h+='<p class="note">Tu meta de '+money(nx.metaPedida)+' es más de lo que te queda después de los fijos. Se usa '+money(nx.meta)+'.</p>';
  var sd=sensibilidadDolar(L);
  if(sd)h+='<p class="note">Cobrás en dólares y gastás en pesos: si el dólar se mueve un '+sd.pct+' %, lo que te queda libre cambia unos <b>'+money(sd.cambio)+'</b>, para arriba o para abajo.</p>';
  h+='<div class="tiles">'+tile('tone-sky','Por día',money(nx.dia),nx.dias+' días hasta el '+esc(fCorta(nx.nc)))+tile('tone-sun','Ese día tenés',money(pc.ahorro+L.liquido),'lo guardado más el sueldo')+'</div>';
  h+='<p class="note">El sueldo ya tiene descontados BPS, FONASA y FRL'+(reglasHoras(state).activo!==false?', e incluye las horas extra de '+mtN:'')+'. Si te sobra plata de las semanas, se suma.</p></div></details>';
  $('#resumen-out').innerHTML=h;
}

/* ---------- Formulario del plan ---------- */
/* El campo "¿Cuánta plata tenés?" muestra lo disponible ahora (no con lo que arrancaste), igual que el botón de la portada */
var montoSetup=false;
function syncMontoCampo(pc){
  var i=$('#in-monto');if(!i||document.activeElement===i)return;
  var p=ctx.state.plan;
  i.value=num(p.monto)>0?String(Math.max(0,disponible(ctx.state,pc))):'';
}
export function syncPlan(){
  var p=ctx.state.plan;
  /* El formulario del plan arranca plegado cuando ya está configurado */
  var aj=$('#plan-aj');if(aj)aj.open=!(num(p.monto)>0);
  syncMontoCampo();
  $('#in-inicio').value=p.inicio;$('#in-cobro').value=p.cobro;
  syncAhorro();cobroNote();
}
function cobroNote(){$('#cobro-note').textContent='Es el '+rankTxt(ctx.state.plan.cobro)+'.'}
function syncAhorro(){
  var p=ctx.state.plan,m=p.modo==='monto',otro=!(p.pct===30||p.pct===50);
  document.querySelectorAll('[data-modo]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-modo')===(m?'monto':'pct')))});
  $('#ahorro-monto-wrap').hidden=!m;$('#ahorro-pct-wrap').hidden=m;
  if(document.activeElement!==$('#in-ahorro'))$('#in-ahorro').value=p.ahorro||'';
  document.querySelectorAll('[data-ahorro]').forEach(function(b){b.setAttribute('aria-pressed',String(Number(b.getAttribute('data-ahorro'))===Math.round(num(p.ahorro))))});
  document.querySelectorAll('[data-pct]').forEach(function(b){var v=b.getAttribute('data-pct');b.setAttribute('aria-pressed',String(v==='otro'?otro:Number(v)===p.pct))});
  $('#pct-otro-wrap').hidden=!otro;$('#in-pct').value=otro?p.pct:'';
  ahorroNote();syncMinimo();
}
/* Mínimo aceptable: en pesos o en %, igual que el objetivo */
function syncMinimo(){
  var p=ctx.state.plan,i=$('#in-minimo');if(!i)return;
  $('#min-pre').textContent=p.modo==='pct'?'%':'$';
  if(document.activeElement!==i)i.value=p.minimo&&p.minimo.valor!==''&&p.minimo.valor!==null&&p.minimo.valor!==undefined?p.minimo.valor:'';
  var pc=planNow(),m=minimoDe(ctx.state,pc),n=$('#minimo-note');
  n.textContent=p.minimo&&p.minimo.valor!==''&&p.minimo.valor!==undefined&&p.minimo.valor!==null
    ?(m<pc.ahorro?'Con '+money(m)+' el mes ya cuenta como logrado; con '+money(pc.ahorro)+', llegás al objetivo.':'El mínimo no puede ser más que tu objetivo: uso '+money(pc.ahorro)+'.')
    :'Si llegás a esto, el mes ya cuenta como logrado. Lo de arriba es tu objetivo.';
}
/* Aviso a mitad de mes: ¿el ritmo alcanza para el mínimo? Se puede cerrar hasta mañana. */
var RK='pa-ritmo-oculto';
function renderRitmo(pc){
  var el=$('#ritmo-aviso');if(!el)return;
  var t=today(),r=ritmoDelMes(ctx.state,pc,t),oc=null;try{oc=localStorage.getItem(RK)}catch(e){}
  if(!r||oc===t){el.innerHTML='';return}
  var txt;
  if(r.tipo==='bien')txt='<b>Vas bien.</b> A este ritmo guardás unos '+money(r.ahorro)+', y llegás a tu objetivo de '+money(r.objetivo)+'.';
  else if(r.tipo==='minimo')txt='<b>Llegás al mínimo, no al objetivo.</b> A este ritmo guardás unos '+money(r.ahorro)+'. Para llegar a '+money(r.objetivo)+', gastá hasta '+money(r.porDiaObjetivo)+' por día.';
  else txt='<b>A este ritmo no llegás al mínimo.</b> Guardarías unos '+money(Math.max(0,r.ahorro))+' y tu mínimo es '+money(r.minimo)+'. Bajá unos '+money(r.bajar)+' por día: hasta '+money(r.porDiaMinimo)+' por día.';
  el.innerHTML='<div class="banner ritmo-'+r.tipo+'"><p>'+txt+'</p><button class="btn quiet" type="button" id="ritmo-ok">Entendido</button></div>';
}
function ahorroNote(){
  var st=ctx.state,p=st.plan,el=$('#ahorro-note');if(!el)return;
  var pc=planCalc(st),mx=maxAhorro(st,pc),d=Math.max(0,disponible(st,pc));
  el.classList.remove('err');
  if(num(p.monto)>0&&pc.ahorroPedido>mx+0.5){
    el.classList.add('err');el.style.marginTop='0';
    el.textContent='No se puede: tenés '+money(d)+' y lo máximo que podés guardar es '+money(mx)+'. Se usa ese tope hasta que bajes la meta.';
  }
  else if(p.modo==='monto'){
    el.textContent=d>0?'Es el '+(Math.round(num(p.ahorro)/d*1000)/10).toLocaleString('es-UY')+'% de lo que tenés ahora. Es tu meta del mes para la racha de logros.':'';
  }else el.textContent='';
}
function planErr(m){var e=$('#plan-err');e.textContent=m||'';e.hidden=!m}
function onPlanInput(){
  var p=ctx.state.plan,m=num($('#in-monto').value),ini=$('#in-inicio').value,cob=$('#in-cobro').value;
  if(!ini||!cob){planErr('Completá las dos fechas.');return}
  if(diffDays(ini,cob)<1){planErr('La fecha de cobro tiene que ser posterior al inicio.');return}
  if(diffDays(ini,cob)>120){planErr('El plan cubre más de 120 días. Revisá las fechas.');return}
  planErr('');
  if(montoSetup||!(num(p.monto)>0))p.monto=Math.max(0,m);
  p.inicio=ini;p.cobro=cob;
  cobroNote();ahorroNote();ctx.persist();ctx.renderAll();
}
function abrirPlan(){
  ctx.go('resumen');var aj=$('#plan-aj');aj.open=true;
  try{aj.scrollIntoView({block:'start',behavior:'smooth'})}catch(er){}
  var m=$('#in-monto');if(m)setTimeout(function(){m.focus()},300);
}
/* ---------- Actualizar saldo: decís cuánta plata tenés y la app anota la diferencia ---------- */
function saldoPrev(){
  var st=ctx.state,i=$('#saldo-in'),pv=$('#saldo-prev');if(!i||!pv)return;
  var v=i.value,p=previaSaldo(st,v===''?null:num(v),today()),d=money(Math.max(0,p.disponible)),t;
  if(v==='')t='Según lo que anotaste, tenés '+d+'. Poné lo que tenés de verdad y yo anoto la diferencia.';
  else if(p.tipo==='invalido')t='Poné cuánta plata tenés. No puede ser negativa.';
  else if(p.tipo==='fuera')t='Ya cobraste: cerrá el mes en Logros para arrancar uno nuevo.';
  else if(p.tipo==='igual')t='Coincide con lo que tenés anotado ('+d+'). No hay nada para cambiar.';
  else if(p.tipo==='monto')t='Todavía no anotaste gastos: tu plata del plan pasa de '+d+' a '+money(num(v))+' y se recalcula todo.';
  else if(p.tipo==='gasto')t='Según lo anotado tenés '+d+'. Faltan '+money(p.diff)+' de gastos: los anoto como «Ajuste de saldo» y se recalcula todo.';
  else t='Tenés '+money(p.diff)+' más de lo anotado: lo sumo a tu plata disponible y se recalcula todo.';
  pv.textContent=t;
}
function abrirSaldo(){
  var c=$('#saldo-card'),i=$('#saldo-in');if(!c||!i)return;
  if(!(num(ctx.state.plan.monto)>0)){abrirPlan();return}
  ctx.go('resumen');c.hidden=false;i.value='';saldoPrev();
  try{c.scrollIntoView({block:'center',behavior:'smooth'})}catch(er){}
  setTimeout(function(){i.focus()},250);
}
function initSaldo(){
  ctx.abrirSaldo=abrirSaldo;
  $('#saldo-in').addEventListener('input',saldoPrev);
  $('#saldo-x').addEventListener('click',function(){$('#saldo-card').hidden=true});
  $('#saldo-card').addEventListener('submit',function(e){
    e.preventDefault();
    var v=$('#saldo-in').value;
    if(!confirmarSaldo(v===''?null:num(v)))saldoPrev();
    else $('#saldo-card').hidden=true;
  });
}
/* Aplica un saldo nuevo y recalcula todo. Devuelve false si no había nada para cambiar. */
function confirmarSaldo(real){
  var st=ctx.state,p=previaSaldo(st,real,today());
  if(p.tipo==='invalido'||p.tipo==='fuera'||p.tipo==='igual')return false;
  var r=ajustarSaldo(st,real,today());
  ctx.persist();ctx.syncInputs();ctx.renderAll();
  toastAccion(r.tipo==='gasto'?'Anoté '+money(r.diff)+' de ajuste de saldo':r.tipo==='ingreso'?'Sumé '+money(r.diff)+' a tu plata disponible':'Tu plata disponible quedó en '+money(real),'Deshacer',function(){
    deshacerAjuste(ctx.state,r);ctx.persist();ctx.syncInputs();ctx.renderAll();
  });
  return true;
}
export function initPlan(){
  var pr=$('#p-resumen');
  initSaldo();
  $('#meta-alerta').addEventListener('click',function(e){
    var b=e.target.closest('#meta-bajar');
    if(b){ctx.state.plan.ahorro=Number(b.getAttribute('data-mx'))||0;ctx.persist();ctx.syncInputs();ctx.renderAll();toast('Meta bajada a '+money(ctx.state.plan.ahorro));return}
    if(e.target.closest('#meta-plan'))abrirPlan();
  });
  $('#in-ahorro').addEventListener('change',function(){
    var st=ctx.state,pc=planCalc(st),mx=maxAhorro(st,pc);
    if(num(st.plan.monto)>0&&pc.ahorroPedido>mx+0.5)toast('No se puede guardar tanto: con lo que tenés, lo máximo es '+money(mx)+'.');
  });
  pr.addEventListener('click',function(e){if(e.target.closest('#saldo-abrir2'))abrirSaldo()});
  $('#hoy-hero').addEventListener('click',function(e){if(e.target.closest('#hoy-empezar'))abrirPlan()});
  $('#hero-chips').addEventListener('click',function(e){if(e.target.closest('#saldo-abrir'))abrirSaldo()});
  initGasto();
  pr.addEventListener('toggle',function(e){var f=e.target.closest&&e.target.closest('[data-fold]');if(f&&e.target===f)plegados[f.getAttribute('data-fold')]=f.open},true);
  pr.addEventListener('click',function(e){
    var dg=e.target.closest('#hoy-out [data-delg]');if(dg){borrarGasto(dg.getAttribute('data-delg'));return}
    var eg=e.target.closest('#hoy-out [data-editg]');if(eg){var id=eg.getAttribute('data-editg'),w=ctx.state.gastos.filter(function(g){return g.id===id})[0];if(w)editarGasto(id)}
  });
  /* Con el plan armado, cambiar este campo es actualizar el saldo (igual que el botón de la portada).
     Mientras escribís por primera vez el plan, se guarda directo. */
  $('#in-monto').addEventListener('focus',function(){montoSetup=!(num(ctx.state.plan.monto)>0)});
  $('#in-monto').addEventListener('input',function(){if(montoSetup)onPlanInput()});
  $('#in-monto').addEventListener('change',function(){
    var st=ctx.state,v=this.value;
    if(montoSetup){montoSetup=false;onPlanInput();return}
    var p=previaSaldo(st,v===''?null:num(v),today());
    if(p.tipo==='fuera'){st.plan.monto=Math.max(0,num(v));ctx.persist();ctx.renderAll();return}
    if(p.tipo==='invalido')toast('Poné cuánta plata tenés. No puede ser negativa.');
    else if(p.tipo!=='igual')confirmarSaldo(num(v));
    syncMontoCampo();
  });
  $('#in-inicio').addEventListener('input',onPlanInput);
  $('#in-cobro').addEventListener('input',onPlanInput);
  $('#in-pct').addEventListener('input',function(){var v=Math.min(100,Math.max(0,Math.round(num(this.value))));ctx.state.plan.pct=v;ctx.persist();ctx.renderAll()});
  document.querySelectorAll('[data-modo]').forEach(function(b){b.addEventListener('click',function(){
    var p=ctx.state.plan,v=b.getAttribute('data-modo');
    if(v==='monto'&&p.modo!=='monto'){p.ahorro=Math.round(num(p.monto)*num(p.pct)/100)}
    if(v==='pct'&&p.modo==='monto'&&num(p.monto)>0){p.pct=Math.min(100,Math.max(0,Math.round(num(p.ahorro)/num(p.monto)*100)))}
    p.modo=v;syncAhorro();ctx.persist();ctx.renderAll();
  })});
  $('#in-minimo').addEventListener('input',function(){
    var v=this.value;ctx.state.plan.minimo=v===''?null:{valor:Math.max(0,num(v))};syncMinimo();ctx.persist();ctx.renderAll();
  });
  $('#ritmo-aviso').addEventListener('click',function(e){if(e.target.id==='ritmo-ok'){try{localStorage.setItem(RK,today())}catch(er){}$('#ritmo-aviso').innerHTML=''}});
  $('#in-ahorro').addEventListener('input',function(){ctx.state.plan.ahorro=Math.max(0,num(this.value));syncAhorro();ctx.persist();ctx.renderAll()});
  document.querySelectorAll('[data-ahorro]').forEach(function(b){b.addEventListener('click',function(){
    ctx.state.plan.ahorro=Number(b.getAttribute('data-ahorro'));$('#in-ahorro').value=ctx.state.plan.ahorro;syncAhorro();ctx.persist();ctx.renderAll();
  })});
  document.querySelectorAll('[data-pct]').forEach(function(b){b.addEventListener('click',function(){
    var p=ctx.state.plan,v=b.getAttribute('data-pct');
    if(v==='otro'){if(p.pct===30||p.pct===50){p.pct=40}$('#in-pct').value=p.pct}
    else p.pct=Number(v);
    syncAhorro();ctx.persist();ctx.renderAll();
    if(v==='otro')$('#in-pct').focus();
  })});
}
