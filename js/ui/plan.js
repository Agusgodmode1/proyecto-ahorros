/* Pestaña Plan: portada con "Hoy podés gastar", anotar un gasto, plan plegable, hasta que cobres, semanas y "cuando cobres". */
import {parse,diffDays,bizRank,MESL,addDays,iso} from '../logica/fechas.js';
import {num} from '../logica/util.js';
import {fijosPeriodo,totalFijos,proximo,hoyPodes,planCalc,cfgCobro} from '../logica/plan.js';
import {disponible,fijosPagadosParte,maxAhorro,previaSaldo,ajustarSaldo,deshacerAjuste} from '../logica/saldo.js';
import {balanceHTML} from './fijos.js';
import {mesTrabajo,mins,reglasHoras} from '../logica/sueldo.js';
import {histStats,logrosLista} from '../logica/logros.js';
import {ctx,$,today,liqNow,planNow,exAnalisis,money,esc,fCorta,fLarga,rango,fMin,cap,tile,hchip,row,toast,toastAccion} from './comun.js';
import {aguinaldo} from '../logica/aguinaldo.js';
import {aniosSinFeriados} from '../logica/avisos.js';
import {ritmoDelMes,minimoDe} from '../logica/mes.js';
import {sensibilidadDolar} from '../logica/recibos.js';
import {formGasto,initFormsGasto,leerForm,avisoAnotado,guardarGasto,borrarGasto,itemGasto,chipsFrecuentes,anotarFrecuente,abrirHojaGasto,initHojaGasto} from './gastos.js';
import {editarGasto,resetWeekSel} from './semanas.js';
import {cicloTerminado,resumenCiclo,cerrarCiclo} from '../logica/ciclo.js';
import {abrirPostal} from './postal.js';
import {abrirLibro,polvo} from './libro.js';
import {totalApartado} from '../logica/pacto.js';
import {renderSuperv,initSuperv} from './supervivencia.js';
import {renderCobre,initCobre} from './cobre.js';
import {renderEntradas,initEntradas} from './entradas.js';
import {renderVentas,initVentas} from './ventas.js';
import {tuPlataAlcanza,semanasVentas,resumenIngresos} from '../logica/ventas.js';
import {frecDe} from '../logica/frecuencia.js';
import {periodoTxt} from '../logica/frecuencia.js';
import {irAlPacto} from './indice.js';

function rankTxt(s){
  var r=bizRank(s),d=parse(s);
  return r?(r+'.º día hábil de '+MESL[d.getMonth()]):'cae en día no hábil';
}
/* El número grande: el signo de pesos va chico, la cifra enorme */
function grande(m){var x=/^(\S{1,3})[\s\u00a0]+(.+)$/.exec(m);return x?'<span class="hh-cur">'+esc(x[1])+'</span>'+esc(x[2]):esc(m)}
/* Cuando cambia «Hoy podés gastar» (al anotar un gasto), la cifra cuenta hasta el valor nuevo (≤ 400 ms) */
var ultimoHoy=null;
function contar(el,v){
  var de=ultimoHoy;ultimoHoy=v;
  if(!el||de===null||Math.round(de)===Math.round(v))return;
  try{if(matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('discreto'))return}catch(e){}
  var t0=performance.now(),D=380;
  (function paso(t){
    var k=Math.min(1,(t-t0)/D),e=1-Math.pow(1-k,3);
    if(!el.isConnected)return;
    el.innerHTML=grande(money(de+(v-de)*e));
    if(k<1)requestAnimationFrame(paso);
  })(t0);
}
/* Franja compacta que reemplaza a la portada en las otras pestañas */
function heroMini(pc,H){
  var st=ctx.state,el=$('#hero-mini');if(!el)return;
  if(!(num(st.plan.monto)>0)){el.innerHTML='';el.hidden=true;return}
  el.hidden=false;
  /* (2.14) «Cobrás en» va solo en Hoy: acá, lo que podés gastar */
  el.innerHTML='<span class="mn-a"><small>'+(H.queda<0?'Hoy te pasaste':'Hoy podés gastar')+'</small><b'+(H.queda<0?' class="neg"':'')+'>'+money(Math.abs(H.queda))+'</b></span>';
}
/* Portada: lo único grande es cuánto podés gastar hoy */
function heroChips(pc){
  var state=ctx.state,L=liqNow(true),t=today(),H=hoyPodes(pc,state.gastos,t),el=$('#hoy-hero');
  var sinPlan=!(num(state.plan.monto)>0);
  if(sinPlan)el.innerHTML='<span class="hh-l">Para saber cuánto podés gastar por día</span><span class="hh-s"><button class="linklike" type="button" id="hoy-empezar">armá tu plan</button>: cuánta plata tenés y cuánto querés guardar.</span>';
  else{
    var h='<span class="hh-top"><span class="hh-l">'+(H.queda<0?'Hoy te pasaste por':'Hoy podés gastar')+'</span><button class="gasto-btn" type="button" id="gasto-abrir" aria-label="Anotar un gasto"><span aria-hidden="true">+</span> Gasto</button></span><b class="hh-n'+(H.queda<0?' neg':'')+'">'+grande(money(Math.abs(H.queda)))+'</b>';
    if(H.dentro){
      var w=pc.weeks[H.semana],pct=w.avail>0?Math.min(100,Math.max(0,w.spent/w.avail*100)):(w.spent>0?100:0);
      h+='<span class="hh-s">'+(H.semanaQueda<0?'Esta semana te pasaste por '+money(-H.semanaQueda):'Te quedan '+money(H.semanaQueda)+' hasta el '+esc(fLarga(H.fin)))+(H.gastadoHoy>0?' · hoy gastaste '+money(H.gastadoHoy):'')+'</span>'
        +(pc.ajuste&&pc.ajuste.estado==='minimo'?'<span class="hh-s">El objetivo ya no se alcanza: esto cuida tu mínimo de '+money(pc.ajuste.minimo)+'.</span>':'')
        +(pc.ajuste&&pc.ajuste.estado==='nada'?'<span class="hh-s neg">Para tu mínimo faltan '+money(pc.ajuste.falta)+' aunque no gastes nada más.</span>':'')
        +'<span class="bar'+(w.left<0?' over':'')+'" role="img" aria-label="Gastaste el '+Math.round(pct)+'% de la semana"><i style="width:'+pct+'%"></i></span>';
    }else h+='<span class="hh-s">'+(t>=state.plan.cobro?'Llegó el cobro: empezá tu pacto nuevo acá abajo.':'Hoy está fuera de las fechas de tu plan.')+'</span>';
    el.innerHTML=h;
    contar(el.querySelector('.hh-n'),Math.abs(H.queda));
  }
  heroMini(pc,H);
  /* Dos datos en la misma fila: cuánta plata tenés y cuánto guardás (el cobro tiene su propia tarjeta) */
  $('#hero-chips').innerHTML=''
    +'<button class="hchip hc-saldo" type="button" id="saldo-abrir"><span>Tenés</span><b>'+money(Math.max(0,disponible(state,pc)))+'</b><small>actualizar</small></button>'
    +'<button class="hchip hc-ahorro" type="button" id="ahorro-abrir"><span>Guardás '+periodoTxt(cfgCobro(state)).este+'</span><b>'+money(pc.ahorro)+'</b><small>actualizar</small></button>'
    /* (2.17) la plata apartada: se ve, pero aparte de lo que podés usar */
    +(totalApartado(state)>0?'<button class="hc-ap" type="button" id="apartado-abrir">Además tenés <b>'+money(totalApartado(state))+'</b> apartados, que no se tocan<small>ver</small></button>':'');
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
    +'<span class="row-btns">'+(p.modo==='monto'&&mx>=1?'<button class="btn" type="button" id="meta-bajar" data-mx="'+Math.floor(mx)+'">Guardar '+money(Math.floor(mx))+'</button>':'')+'<button class="btn quiet" type="button" id="meta-plan">Cambiar la meta</button></span></div>';
}
/* Fin del capítulo: el día de cobro, el libro resume el ciclo (lo ahorrado y la racha) y ofrece un pacto nuevo.
   El pacto nuevo cierra el mes en el historial (igual que «Cerrar el mes» de Logros) y vuelve a hacer las 3 preguntas. */
/* (2.25) Al cerrar: lo que entró, según cómo te entra la plata */
function finModo(st,pc,t){
  var f=frecDe(st.perfil&&st.perfil.cobro);
  if(f==='ventas'){var V=semanasVentas(st,pc,t),n=V.semanas.length,ok=V.semanas.filter(function(x){return x.cubierta}).length;
    return '<p class="fin-s">Vendiste <b>'+money(V.vendido)+'</b>'+(V.fijos>0?' y cubriste los fijos <b>'+ok+' de '+n+'</b> semanas':'')+(V.guardada>0?'; guardaste '+money(V.guardada)+' de ganancia':'')+'.</p>'}
  if(f==='jornal'){var R=resumenIngresos(st,pc,t);return '<p class="fin-s">Te entraron <b>'+money(R.total)+'</b>'+(R.veces?' en '+R.veces+(R.veces===1?' cobro':' cobros'):'')+'.</p>'}
  return '';
}
function renderCierre(pc){
  var el=$('#cierre-aviso');if(!el)return;
  var st=ctx.state,t=today();
  var fin=cicloTerminado(st,t);document.documentElement.classList.toggle('fin-ciclo',fin);
  if(!fin){el.innerHTML='';return}
  var r=resumenCiclo(st,t);
  var tit=r.cumplido?'¡Cumpliste el pacto!':r.minimoOk?'Llegaste a tu mínimo':'Se terminó este capítulo';
  el.innerHTML='<section class="fin-cap" aria-labelledby="fin-t"><p class="cap-kick">fin del capítulo</p><h2 id="fin-t">'+tit+'</h2>'
    +'<p class="fin-n">Ahorraste <b>'+money(r.ahorrado)+'</b></p>'
    +finModo(st,pc,t)
    +'<p class="fin-s">'+(r.racha>0?'Tu racha va en <b>'+r.racha+(r.racha===1?' mes':' meses')+'</b>. ':'Esta vez no sumaste a la racha: el próximo pacto es otra oportunidad. ')+'Tu meta era '+money(r.meta)+'.</p>'
    +'<div class="row-btns"><button class="btn primary" type="button" id="ciclo-nuevo">Empezar un pacto nuevo</button><button class="btn quiet" type="button" id="cierre-ir">Cerrarlo a mano en Logros</button></div></section>';
}
function pactoNuevo(){
  var st=ctx.state,r=resumenCiclo(st,today()),kc=String(st.plan.inicio||'').slice(0,7);
  abrirLibro({modo:'ciclo',estado:st,total:r.total,sobra:r.ahorrado,cobro:r.cobro,real:r.real,
    antes:function(s){cerrarCiclo(s,today())},
    listo:function(){resetWeekSel();ctx.syncInputs();ctx.persist();ctx.tab='resumen';ctx.renderAll();
      var msg='Empieza un capítulo nuevo. Tu racha va en '+r.racha+(r.racha===1?' mes.':' meses.');
      /* (2.16) el capítulo que se cerró, como imagen para compartir */
      if((ctx.state.hist||[]).some(function(x){return x.k===kc}))toastAccion(msg,'Compartir el cerrado',function(){abrirPostal(kc)});else toast(msg)},
    alCerrar:function(){}});
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
  if(!lista.length){
    var vacio='<div class="card stack hoy tone-mint"><h2>'+(simple?'Tus últimos gastos':'Todavía no anotaste gastos')+'</h2><p class="note">Tocá «+ Gasto» o el micrófono y decí, por ejemplo, «gasté 350 en un café». Cada gasto baja lo que podés gastar hoy.</p></div>';
    el.innerHTML=(simple?'':chipsFrecuentes('h'))+(simple||(!state.gastos.length&&!state.ejemplo)?vacio:'');return;
  }
  el.innerHTML=(simple?'':chipsFrecuentes('h'))+'<div class="card stack hoy tone-mint"><h2>'+tit+'</h2><ul class="list glist">'+lista.map(function(g){return itemGasto(g,g.fecha===t?'hoy':fCorta(g.fecha))}).join('')+'</ul></div>';
}
/* Vista simple: solo lo esencial (se recuerda en este celular) */
var VS='pa-simple';
function vistaSimple(){try{return localStorage.getItem(VS)==='1'}catch(e){return false}}
function aplicarVista(){
  var s=vistaSimple(),a=$('#app');
  if(a)a.classList.toggle('simple',s);
  document.querySelectorAll('[data-simple]').forEach(function(b){b.setAttribute('aria-pressed',String((b.getAttribute('data-simple')==='1')===s))});
}
/* La hoja para anotar un gasto (ui/gastos.js): se abre desde el botón grande de la portada */
function initGasto(){
  initHojaGasto();
  $('#hoy-hero').addEventListener('click',function(e){if(e.target.closest('#gasto-abrir'))abrirHojaGasto()});
  /* Hoy en versión corta (Ajustes) */
  document.addEventListener('click',function(e){var b=e.target.closest('[data-simple]');if(!b)return;try{localStorage.setItem(VS,b.getAttribute('data-simple'))}catch(er){}aplicarVista();ctx.renderAll()});
  aplicarVista();
}
var plegados={};/* tarjetas plegables abiertas, por id */
function foldIni(id,tono,tit,sub){return '<details class="card fold '+tono+'" data-fold="'+id+'"'+(plegados[id]?' open':'')+'><summary><span class="fold-t">'+tit+'</span><span class="fold-s">'+sub+'</span></summary><div class="stack fold-b">'}
/* Cuenta regresiva del cobro, con su propia tarjeta y una barra de 12 tramos */
var estrellasVistas=null,polvoDia=null;
/* (2.15) Las 12 estrellitas como una constelación, igual que el bordado de la tapa: estrellas de cinco puntas
   sobre una onda suave; las encendidas se unen con un hilo dorado y la última (hoy) brilla un poco más. */
function estrella(x,y,R){
  var p='';for(var k=0;k<10;k++){var a=(-90+k*36)*Math.PI/180,r=k%2?R*.42:R;p+=(k?'L':'M')+(x+r*Math.cos(a)).toFixed(1)+' '+(y+r*Math.sin(a)).toFixed(1)}
  return p+'Z';
}
function constelacion(on,desde){
  var pts=[],i,h='';
  for(i=0;i<12;i++)pts.push([12+i*276/11,19+8*Math.sin(i*.95+.4)]);
  if(on>1)h+='<polyline class="hilo" points="'+pts.slice(0,on).map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1)}).join(' ')+'"/>';
  for(i=0;i<12;i++){
    var lit=i<on,hoy=lit&&i===on-1;
    h+='<path class="st'+(lit?' on':'')+(hoy?' hoy':'')+(lit&&i>=desde?' nueva':'')+'"'+(lit&&i>=desde?' style="--i:'+(i-desde)+'"':'')+' d="'+estrella(pts[i][0],pts[i][1],hoy?8.5:lit?6.5:4.5)+'"/>';
  }
  return '<svg viewBox="0 0 300 38" preserveAspectRatio="xMidYMid meet">'+h+'</svg>';
}
/* (2.22) Cuando vendo no hay cobro que esperar: «Tu plata alcanza» (cuántos días te dura y si llegás al próximo pago) */
function renderAlcanza(el){
  var state=ctx.state,t=today(),r=tuPlataAlcanza(state,planNow(),t);
  if(!r){el.innerHTML='';return}
  var on=r.estrellas,desde=estrellasVistas===null?0:Math.min(estrellasVistas,on);estrellasVistas=on;
  el.classList.remove('cd-lejos','cd-cerca','cd-ya','cd-hoy');el.classList.add(r.llega?'cd-lejos':'cd-cerca','cd-alcanza');
  var P=r.pago,pago='';
  if(P)pago='<span class="cd-pago">'+(P.dias<=0?'Hoy se paga ':'Próximo pago: ')+'<b>'+esc(P.nombre)+'</b>'+(P.dias>0?', en '+P.dias+(P.dias===1?' día':' días'):'')
    +' · '+(r.falta>0?'tenés '+money(r.juntado)+' de '+money(P.monto):'ya tenés los '+money(P.monto))+'</span>'
    +'<span class="cd-est '+(r.llega?'bien':'falta')+'">'+(r.llega?'✓ Llegás '+(P.dias<=0?'a pagarlo':'al pago')+'.':r.falta>0?'Te faltan '+money(r.falta)+': cada venta te acerca.':'Te faltan '+(P.dias-r.dias)+(P.dias-r.dias===1?' día':' días')+' de plata para llegar: cada venta suma días.')+'</span>';
  el.innerHTML='<span class="cd-l">Tu plata alcanza</span><span class="cd-v"><span class="cd-n">'+r.dias+'</span><span class="cd-t">'+(r.dias===1?'día':'días')+'</span></span>'
    +'<span class="cd-seg cd-const" aria-hidden="true">'+constelacion(on,desde)+'</span>'
    +'<span class="cd-d">'+(r.hasta?'hasta el '+esc(fLarga(r.hasta)):'')+'</span>'
    +'<span class="cd-ritmo">'+(r.porDia>0?'gastando '+(r.ritmo?'como venís':'como el plan')+', ≈ '+money(r.porDia)+' por día<br>':'')+'<button class="linklike" type="button" id="cd-total">actualizar el total</button></span>'+pago;
  el.setAttribute('aria-label','Tu plata alcanza '+r.dias+(r.dias===1?' día':' días')+(r.hasta?', hasta el '+fLarga(r.hasta):'')+(P?'. Próximo pago: '+P.nombre+(P.dias>0?', en '+P.dias+' días':', hoy'):''));
}
export function renderCountdown(){
  var state=ctx.state,el=$('#countdown');if(!el)return;
  /* (2.23) por jornal tampoco hay un cobro que esperar */
  var fqc=frecDe(state.perfil&&state.perfil.cobro);
  if((fqc==='ventas'||fqc==='jornal')&&num(state.plan.monto)>0&&today()<state.plan.cobro){renderAlcanza(el);return}
  el.classList.remove('cd-alcanza');
  var t=today(),d=diffDays(t,state.plan.cobro),big,small,lab;
  if(d>0){big=String(d);small=(d===1?'día':'días');lab='Cobrás en'}
  else if(d===0){big='Hoy';small='cobrás';lab='Cobro'}
  else{big='Ya';small='cobraste';lab='Cobro'}
  var tot=diffDays(state.plan.inicio||t,state.plan.cobro),pas=diffDays(state.plan.inicio||t,t);
  var on=tot>0?Math.max(0,Math.min(12,Math.round(12*pas/tot))):0,seg='';
  if(d<=0)on=12;
  /* 12 estrellitas que se van encendiendo; solo las que se encienden ahora tienen su brillo de entrada */
  var desde=estrellasVistas===null?0:Math.min(estrellasVistas,on);estrellasVistas=on;
  seg=constelacion(on,desde);
  /* el color se calienta a medida que se acerca el cobro: lejos, oro pálido; cerca, dorado; los últimos 3 días, ámbar; el día, dorado con polvo de estrellas */
  el.classList.remove('cd-lejos','cd-cerca','cd-ya','cd-hoy');
  el.classList.add(d<=0?'cd-hoy':d<=3?'cd-ya':d<=7?'cd-cerca':'cd-lejos');
  el.innerHTML='<span class="cd-l">'+lab+'</span><span class="cd-v"><span class="cd-n'+(d>0?'':' txt')+'">'+esc(big)+'</span><span class="cd-t">'+esc(small)+'</span></span><span class="cd-seg cd-const" aria-hidden="true">'+seg+'</span><span class="cd-d">'+esc(fLarga(state.plan.cobro))+'</span>';
  if(d===0&&polvoDia!==t&&ctx.tab==='resumen'){polvoDia=t;setTimeout(function(){polvo(el.querySelector('.cd-v'),18,0)},250)}
  el.setAttribute('aria-label',(d>0?d+' '+small+' para cobrar':(d===0?'Cobrás hoy':'Ya cobraste'))+', '+fLarga(state.plan.cobro));
}

export function renderResumen(pc){
  var state=ctx.state;
  syncMontoCampo(pc);ahorroNote();heroChips(pc);renderAlertaMeta(pc);
  var sum=$('#plan-aj-sum');if(sum)sum.textContent=num(state.plan.monto)>0?money(Math.max(0,disponible(state,pc)))+' disponibles · guardás '+money(pc.ahorro)+' · hasta el '+fCorta(state.plan.cobro):'Completá los tres pasos';
  /* (2.15) la página de Hoy se dibuja solo cuando se ve: así pasar a otro capítulo no la rehace cada vez */
  if(ctx.tab!=='resumen')return;
  renderCierre(pc);renderHoy(pc);renderCobre();renderVentas(pc);renderEntradas();renderSuperv(pc);renderRitmo(pc);
  var sf=aniosSinFeriados(state,today()),fa=$('#fer-aviso');
  if(fa)fa.innerHTML=sf.length?'<div class="banner"><p><b>No tengo los feriados de '+sf.join(' y ')+'.</b> Sin ellos, el día de cobro puede salir mal. Actualizá la app o agregalos en Ajustes → Feriados.</p><button class="btn" type="button" data-goto="ajustes">Ir a Feriados</button></div>':'';
  var p=state.plan,t=today(),L=liqNow(true),fp=fijosPeriodo(state.fijos,p.inicio,p.cobro);
  /* Todo en base a la plata que tenés AHORA (la misma del botón de la portada) */
  var disp=Math.max(0,disponible(state,pc)),pagF=Math.min(pc.fijos,fijosPagadosParte(state)),pend=Math.max(0,pc.fijos-pagF),resto=pc.gastar-pc.spentInPlan;
  var m=Math.max(1,disp),pf=Math.max(0,Math.min(100,pend/m*100)),pa=Math.max(0,Math.min(100-pf,pc.ahorro/m*100)),pg=Math.max(0,100-pf-pa);
  var dq=t>=p.cobro?pc.total:Math.max(1,diffDays(t<p.inicio?p.inicio:t,p.cobro)),pDia=t>=p.cobro?pc.daily:resto/dq;
  var h=state.ejemplo?'<div class="banner"><p><b>Estás viendo datos de ejemplo.</b> Son de muestra: no son tuyos.</p><button class="btn" type="button" data-cero>Borrar el ejemplo y crear mi perfil</button></div>':'';
  /* fijos compartidos: quién te debe plata (nota al margen, con «Me pagaron») */
  var deudas=balanceHTML(true);if(deudas)h+='<div class="banner deudas">'+deudas+'</div>';
  var fqH=frecDe(state.perfil&&state.perfil.cobro),sinCobro=fqH==='jornal'||fqH==='ventas';
  h+=foldIni('cobrar','tone-mint',sinCobro?'Hasta el '+esc(fCorta(p.cobro)):'Hasta que cobres',resto<0?'Te faltan '+money(-resto)+' para llegar a tu meta':'Te queda para gastar '+money(resto)+' · '+esc(rango(p.inicio,p.cobro)));
  var fsub=fp.length?fp.map(function(o){return esc(o.f.nombre)+' ('+esc(fCorta(o.fecha))+')'}).join(', '):(state.fijos.length?(sinCobro?'ninguno vence en este pacto':'ninguno vence antes de cobrar'):'<button class="linklike" type="button" data-goto="fijos">cargá tus gastos fijos</button>');
  h+='<div class="receipt">'
    +row('Plata que tenés ahora',money(disp),'','según lo que anotaste · <button class="linklike" type="button" id="saldo-abrir2">actualizar</button>')
    +row('Gastos fijos que faltan pagar','− '+money(pend),'sub minus',pagF>0?'ya pagaste '+money(pagF)+(pend>0?'. Faltan: ':'')+(pend>0?fsub:''):fsub)
    +row('Lo que guardás','− '+money(pc.ahorro),'sub save','tu meta de '+periodoTxt(cfgCobro(state)).este)
    +row('Te queda para gastar',money(resto),'final')+'</div>';
  if(resto<0)h+='<p class="err" style="margin-top:0">Con lo que te queda no llegás a guardar todo: te faltan '+money(-resto)+'. Bajá el ahorro o revisá los gastos.</p>';
  h+='<div><div class="split-bar" role="img" aria-label="Fijos '+Math.round(pf)+'%, ahorro '+Math.round(pa)+'%, para gastar '+Math.round(pg)+'%"><i class="split-fix" style="width:'+pf+'%"></i><i class="split-save" style="width:'+pa+'%"></i><i class="split-spend" style="width:'+pg+'%"></i></div>';
  h+='<div class="split-key">'+(pend>0?'<span><i class="dot" style="background:var(--teal)"></i>Fijos, '+Math.round(pf)+'%</span>':'')+'<span><i class="dot" style="background:var(--sun)"></i>Guardás, '+Math.round(pa)+'%</span><span><i class="dot" style="background:var(--sky)"></i>Para gastar, '+Math.round(pg)+'%</span></div></div>';
  h+='<div class="tiles">'
    +tile('tone-sky','Por semana',money(pDia*7),money(pDia)+' por día, parejo hasta '+(sinCobro?'el '+esc(fCorta(p.cobro)):'cobrar')+'')
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

  /* (2.24) por jornal o cuando vendo no hay un cobro que estimar: «Cuando cobres» no va (lo que entra está en Ingresos) */
  if(sinCobro){$('#resumen-out').innerHTML=h;return}
  var nx=proximo(state,L);
  /* Si el aguinaldo cae en ese mes, se suma a lo libre */
  var AG=aguinaldo(state,t),conAg=AG.pago>=p.cobro&&AG.pago<nx.nc&&AG.liquido>0;
  if(conAg){nx=Object.assign({},nx,{libre:nx.libre+AG.liquido});nx.dia=nx.libre/nx.dias;nx.semana=nx.libre*7/nx.dias}
  var QV=periodoTxt(cfgCobro(state)).que,QVc=QV.charAt(0).toUpperCase()+QV.slice(1),parte=nx.fraccion!==1;
  h+=foldIni('cuando','tone-grape','Cuando cobres',nx.libre>=0?QVc+': '+money(nx.semana)+' por semana':QVc+' te faltan '+money(-nx.libre));
  h+='<p class="lead">'+(nx.libre>=0?QVc+' vas a poder gastar unos <b class="c-mint">'+money(nx.semana)+' por semana</b>.':QVc+' no te alcanza para la meta: te faltan <b class="neg">'+money(-nx.libre)+'</b>.')+'</p>';
  h+='<div class="receipt">'
    +row(parte?'Tu cobro, estimado (la parte del mes)':L.real?'Tu sueldo (según tu recibo)':'Tu sueldo, estimado',money(parte?nx.liquido:L.liquido),'','<button class="linklike" type="button" data-goto="sueldo">ver el cálculo</button>')
    +row(parte?'Tu parte de los fijos del mes':'Gastos fijos del mes','− '+money(nx.fij),'sub minus',state.fijos.length?state.fijos.length+' cargados':'<button class="linklike" type="button" data-goto="fijos">cargalos</button>')
    +(conAg?row('Aguinaldo de '+AG.nombre,'+ '+money(AG.liquido),'sub','<button class="linklike" type="button" data-goto="sueldo">estimado</button>, antes del '+Number(AG.pago.slice(8,10))+' de '+AG.nombre):'')
    +(nx.ingresos>0?row('Tus ingresos fijos','+ '+money(nx.ingresos),'sub','<button class="linklike" type="button" data-goto="fijos">'+(parte?'la parte del período':'ver')+'</button>'):'')
    +row('Lo que vas a guardar','− '+money(nx.meta),'sub save','tu meta de ahorro')
    +row('Libre para gastar',money(nx.libre),'final')+'</div>';
  if(nx.metaPedida>nx.meta)h+='<p class="note">Tu meta de '+money(nx.metaPedida)+' es más de lo que te queda después de los fijos. Se usa '+money(nx.meta)+'.</p>';
  var sd=sensibilidadDolar(L);
  if(sd)h+='<p class="note">Cobrás en dólares y gastás en pesos: si el dólar se mueve un '+sd.pct+' %, lo que te queda libre cambia unos <b>'+money(sd.cambio)+'</b>, para arriba o para abajo.</p>';
  h+='<div class="tiles">'+tile('tone-sky','Por día',money(nx.dia),nx.dias+' días hasta el '+esc(fCorta(nx.nc)))+tile('tone-sun','Ese día tenés',money(pc.ahorro+(parte?nx.liquido:L.liquido)),'lo guardado más el '+(parte?'cobro':'sueldo'))+'</div>';
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
  var aj=$('#plan-aj');if(aj)aj.open=false;
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
    el.textContent='No se puede: tenés '+money(d)+' y lo máximo que podés guardar es '+money(mx)+'. Bajá la meta o actualizá tu saldo si tenés más plata.';
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
/* El plan se cambia en Ajustes del pacto */
function abrirPlan(){irAlPacto('tenes')}
/* Desde «Guardás»: Ajustes del pacto, con el cursor en el ahorro */
function abrirMeta(){irAlPacto('ahorro')}
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
/* «Actualizar saldo» (desde «Tenés» o desde el aviso de un gasto): la página «¿Cuánta plata tenés hoy?» del prólogo, lista para cambiar.
   Después de cobrar (fuera del plan) se usa la tarjeta de siempre. */
function abrirSaldo(){
  var c=$('#saldo-card'),i=$('#saldo-in');if(!c||!i)return;
  if(today()<ctx.state.plan.cobro){irAlPacto('tenes');return}
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
  initSaldo();initSuperv();initCobre();initEntradas();initVentas();
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
  $('#countdown').addEventListener('click',function(e){if(e.target.closest('#cd-total'))abrirSaldo()});
  $('#hero-chips').addEventListener('click',function(e){if(e.target.closest('#apartado-abrir')){ctx.abrirPrologo('qa');return}if(e.target.closest('#saldo-abrir'))abrirSaldo();if(e.target.closest('#ahorro-abrir'))abrirMeta()});
  initGasto();
  $('#cierre-aviso').addEventListener('click',function(e){
    if(e.target.closest('#ciclo-nuevo')){pactoNuevo();return}
    if(!e.target.closest('#cierre-ir'))return;
    ctx.go('logros');setTimeout(function(){var c=$('#cierre-card');if(c)try{c.scrollIntoView({block:'start',behavior:'smooth'})}catch(er){}},120);
  });
  pr.addEventListener('toggle',function(e){var f=e.target.closest&&e.target.closest('[data-fold]');if(f&&e.target===f)plegados[f.getAttribute('data-fold')]=f.open},true);
  pr.addEventListener('click',function(e){
    var fr=e.target.closest('#hoy-out [data-frec]');if(fr){anotarFrecuente(Number(fr.getAttribute('data-frec')),today());return}
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
