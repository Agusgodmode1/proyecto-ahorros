/* Pestaña Plan: portada con "Hoy podés gastar", anotar un gasto, plan plegable, hasta que cobres, semanas y "cuando cobres". */
import {gastosDelDia,pesoSemana,guiaReparto} from '../logica/sobres.js';
import {parse,diffDays,bizRank,MESL,addDays,iso,DIA} from '../logica/fechas.js';
import {num} from '../logica/util.js';
import {fijosPeriodo,totalFijos,proximo,hoyPodes,planCalc,semanaDe} from '../logica/plan.js';
import {disponible,fijosPagadosParte,maxAhorro,previaSaldo,ajustarSaldo,deshacerAjuste} from '../logica/saldo.js';
import {balanceHTML} from './fijos.js';
import {mesTrabajo,mins,reglasHoras,ingresoDe} from '../logica/sueldo.js';
import {reciboDe} from '../logica/recibos.js';
import {esFactura} from '../logica/factura.js';
import {tieneHorario} from '../logica/horario.js';
import {histStats,logrosLista} from '../logica/logros.js';
import {ctx,$,today,liqNow,planNow,anota,exAnalisis,money,esc,fCorta,fLarga,rango,fMin,cap,tile,hchip,row,toast,toastAccion} from './comun.js';
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
import {renderSuperv} from './supervivencia.js';
import {renderEntradas,initEntradas} from './entradas.js';
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
  var state=ctx.state,L=liqNow(true),t=today(),H=hoyPodes(pc,gastosDelDia(state.gastos),t),el=$('#hoy-hero');
  var sinPlan=!(num(state.plan.monto)>0);
  if(sinPlan)el.innerHTML='<span class="hh-l">Para saber cuánto podés gastar por día</span><span class="hh-s"><button class="linklike" type="button" id="hoy-empezar">armá tu plan</button>: cuánta plata tenés y cuánto querés guardar.</span>';
  else{
    /* (2.41) arriba de todo, lo que te queda para gastar hasta el cobro (lo mismo que «Tu plan») */
    var resto=pc.gastar-pc.spentInPlan;
    var h='<span class="hh-cobro'+(resto<0?' neg':'')+'"><span>'+(resto<0?'Te pasaste del plan por':'Para gastar hasta el cobro')+'</span><b>'+money(Math.abs(resto))+'</b></span>'
      +'<span class="hh-top"><span class="hh-l">'+(H.queda<0?'Hoy te pasaste por':'Hoy podés gastar')+'</span>'+(anota()?'<button class="gasto-btn" type="button" id="gasto-abrir" aria-label="Anotar un gasto"><span aria-hidden="true">+</span> Gasto</button>':'<button class="gasto-btn" type="button" id="tengo-abrir" aria-label="Actualizar cuánta plata tenés">Actualizar</button>')+'</span><b class="hh-n'+(H.queda<0?' neg':'')+'">'+grande(money(Math.abs(H.queda)))+'</b>';
    if(H.dentro){
      var w=pc.weeks[H.semana],pct=w.avail>0?Math.min(100,Math.max(0,w.spent/w.avail*100)):(w.spent>0?100:0);
      /* (2.47) si la semana termina con el cobro, «te quedan» repetiría el número de arriba */
      var mismo=Math.round(H.semanaQueda)===Math.round(resto),sq=H.semanaQueda<0?'Esta semana te pasaste por '+money(-H.semanaQueda):mismo?'':'Esta semana te quedan '+money(H.semanaQueda)+' hasta el '+esc(fLarga(H.fin));
      var hg=H.gastadoHoy>0?(sq?' · hoy':'Hoy')+' gastaste '+money(H.gastadoHoy):'';
      if(sq||hg)h+='<span class="hh-s">'+sq+hg+'</span>';
      h+=''
        +(pc.ajuste&&pc.ajuste.estado==='minimo'?'<span class="hh-s">El objetivo ya no se alcanza: esto cuida tu mínimo de '+money(pc.ajuste.minimo)+'.</span>':'')
        +(pc.ajuste&&pc.ajuste.estado==='nada'?'<span class="hh-s neg">Para tu mínimo faltan '+money(pc.ajuste.falta)+' aunque no gastes nada más.</span>':'')
        +barraDias(H);
    }else h+='<span class="hh-s">'+(t>=state.plan.cobro?'Llegó el cobro: empezá tu pacto nuevo acá abajo.':'Hoy está fuera de las fechas de tu plan.')+'</span>';
    el.innerHTML=h;
    contar(el.querySelector('.hh-n'),Math.abs(H.queda));
    if(H.dentro)animarBarra(el,H);
  }
  heroMini(pc,H);
  /* Dos datos en la misma fila: cuánta plata tenés y cuánto guardás (el cobro tiene su propia tarjeta) */
  $('#hero-chips').innerHTML=''
    +'<button class="hchip hc-saldo" type="button" id="saldo-abrir"><span>Tenés</span><b>'+money(Math.max(0,disponible(state,pc)))+'</b><small>'+(anota()?'actualizar':cuando(state.plan.saldoFecha,t))+'</small></button>'
    +'<button class="hchip hc-ahorro" type="button" id="ahorro-abrir"><span>Guardás</span><b>'+money(pc.ahorro)+'</b><small>actualizar</small></button>'
    /* (2.17) la plata apartada: se ve, pero aparte de lo que podés usar */
    +(totalApartado(state)>0?'<button class="hc-ap" type="button" id="apartado-abrir">Además tenés <b>'+money(totalApartado(state))+'</b> apartados, que no se tocan<small>ver</small></button>':'');
}
/* (2.45) cuándo actualizaste lo que tenés, para el «Tenés» */
function cuando(f,t){
  if(!f||f<ctx.state.plan.inicio)return 'actualizar';
  var n=diffDays(f,t);return n<=0?'al día de hoy':n===1?'de ayer':'de hace '+n+' días';
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
function renderCierre(pc){
  var el=$('#cierre-aviso');if(!el)return;
  var st=ctx.state,t=today();
  var fin=cicloTerminado(st,t);document.documentElement.classList.toggle('fin-ciclo',fin);
  if(!fin){el.innerHTML='';return}
  var r=resumenCiclo(st,t);
  var tit=r.cumplido?'¡Cumpliste el pacto!':r.minimoOk?'Llegaste a tu mínimo':'Se terminó este capítulo';
  el.innerHTML='<section class="fin-cap" aria-labelledby="fin-t"><p class="cap-kick">fin del capítulo</p><h2 id="fin-t">'+tit+'</h2>'
    +'<p class="fin-n">Ahorraste <b>'+money(r.ahorrado)+'</b></p>'
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
/* Debajo de la portada: los frecuentes de un toque y lo que gastaste hoy. Anotar se hace desde la hoja. */
function renderHoy(pc){
  var state=ctx.state,t=today(),el=$('#hoy-out');if(!el)return;
  if(!(num(state.plan.monto)>0)||!anota()){el.innerHTML='';return}
  var lista=state.gastos.filter(function(g){return g.fecha===t});
  if(!lista.length){
    var vacio='<div class="card stack hoy tone-mint"><h2>Todavía no anotaste gastos</h2></div>';
    el.innerHTML=chipsFrecuentes('h')+(!state.gastos.length&&!state.ejemplo?vacio:'');return;
  }
  el.innerHTML=chipsFrecuentes('h')+'<div class="card stack hoy tone-mint"><h2>Gastaste hoy</h2><ul class="list glist">'+lista.map(function(g){return itemGasto(g,'hoy')}).join('')+'</ul></div>';
}
/* La hoja para anotar un gasto (ui/gastos.js): se abre desde el botón grande de la portada */
function initGasto(){
  initHojaGasto();
  $('#hoy-hero').addEventListener('click',function(e){if(e.target.closest('#gasto-abrir'))abrirHojaGasto();if(e.target.closest('#tengo-abrir'))abrirSaldo()});
  /* (2.30) «Hoy en versión corta» se sacó: Hoy ya es corto. Se borra la preferencia vieja. */
  try{localStorage.removeItem('pa-simple')}catch(e){}
}
var plegados={};/* tarjetas plegables abiertas, por id */
/* (2.51) Los primeros 7 días después de cobrar, si falta el recibo de lo que te pagaron: «¿Llegó tu recibo?» */
function avisoRecibo(state,t){
  var ing=ingresoDe(state);if(esFactura(state)||ing.tipo==='variable'||!(state.pacto&&state.pacto.sellado))return '';
  var ini=state.plan.inicio;if(!ini||t<ini||diffDays(ini,t)>7)return '';
  var mt=mesTrabajo(state),y=Number(mt.slice(0,4)),m=Number(mt.slice(5,7)),pagado=m===1?(y-1)+'-12':y+'-'+String(m-1).padStart(2,'0');
  if(reciboDe(state,pagado))return '';
  try{if(localStorage.getItem('pa-recibo-no')===pagado)return ''}catch(e){}
  return '<div class="banner"><p><b>¿Llegó tu recibo de '+MESL[Number(pagado.slice(5,7))-1]+'?</b> Subilo y te digo si te pagaron bien.</p><div class="row-btns"><button class="btn" type="button" data-sdtab-ir="control">Subir recibo</button><button class="btn quiet" type="button" data-recibo-no="'+pagado+'">Ahora no</button></div></div>';
}
/* (2.47) Una barra con tres partes (fijos, guardás, para gastar) y su leyenda en columnas */
function reparto(tit,total,partes){
  var tot=Math.max(1,partes.reduce(function(x,o){return x+Math.max(0,o.v)},0));
  return '<div class="tp"><p class="tp-tot"><span>'+tit+'</span><b>'+money(total)+'</b></p>'
    +'<div class="tp-bar" role="img" aria-label="'+partes.map(function(o){return o.n+' '+Math.round(Math.max(0,o.v)/tot*100)+' por ciento'}).join(', ')+'">'
    +partes.map(function(o){return o.v>0?'<i class="'+o.k+'" style="flex-grow:'+(o.v/tot).toFixed(4)+'"></i>':''}).join('')+'</div>'
    +'<ul class="tp-key">'+partes.map(function(o){return '<li class="'+o.k+'"><span><i aria-hidden="true"></i>'+o.n+'</span><b>'+money(Math.max(0,o.v))+'</b><small>'+o.s+'</small></li>'}).join('')+'</ul></div>';
}
function foldIni(id,tono,tit,sub){return '<details class="card fold '+tono+'" data-fold="'+id+'"'+(plegados[id]?' open':'')+'><summary><span class="fold-t">'+tit+'</span><span class="fold-s">'+sub+'</span></summary><div class="stack fold-b">'}
/* Cuenta regresiva del cobro, con su propia tarjeta y una barra de 12 tramos */
var polvoDia=null;
/* (2.15) Las 12 estrellitas como una constelación, igual que el bordado de la tapa: estrellas de cinco puntas
   sobre una onda suave; las encendidas se unen con un hilo dorado y la última (hoy) brilla un poco más. */
function estrella(x,y,R){
  var p='';for(var k=0;k<10;k++){var a=(-90+k*36)*Math.PI/180,r=k%2?R*.42:R;p+=(k?'L':'M')+(x+r*Math.cos(a)).toFixed(1)+' '+(y+r*Math.sin(a)).toFixed(1)}
  return p+'Z';
}
/* (2.38) El camino al cobro: una curva de estrellas que termina en el cobro (una estrella grande con su aro)
   y un cometa que va por el camino según los días que pasaron. La primera vez que ves Hoy en el día
   (y cada vez que tocás el recuadro) el cometa viaja desde el principio y el número cuenta hacia atrás. */
var CM_X0=10,CM_X1=278,CM_N=11;
function cmY(f){return 24+9*Math.sin(f*5.6+.5)}
function cmPt(f){return [CM_X0+f*(CM_X1-CM_X0),cmY(f)]}
function cmLinea(f0,f1){var o=[],n=Math.max(2,Math.ceil((f1-f0)*60));for(var k=0;k<=n;k++){var q=cmPt(f0+(f1-f0)*k/n);o.push(q[0].toFixed(1)+','+q[1].toFixed(1))}return o.join(' ')}
function caminoSVG(){
  var h='<defs><linearGradient id="cm-g" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="0"><stop offset="0" stop-color="currentColor" stop-opacity="0"/><stop offset="1" stop-color="currentColor" stop-opacity=".9"/></linearGradient>'
    +'<radialGradient id="cm-h"><stop offset="0" stop-color="#FFF8E6"/><stop offset=".35" stop-color="currentColor" stop-opacity=".85"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>';
  h+='<polyline class="cm-ruta" points="'+cmLinea(0,1)+'"/><polyline class="cm-hecho" points=""/>';
  for(var i=0;i<CM_N;i++){var q=cmPt(i/CM_N);h+='<path class="cm-st" data-f="'+(i/CM_N).toFixed(3)+'" d="'+estrella(q[0],q[1],4.6)+'"/>'}
  var m=cmPt(1);
  h+='<g class="cm-meta"><circle cx="'+m[0].toFixed(1)+'" cy="'+m[1].toFixed(1)+'" r="11"/><path d="'+estrella(m[0],m[1],8)+'"/></g>';
  h+='<polyline class="cm-cola" points="" stroke="url(#cm-g)"/><g class="cm-cabeza"><circle r="9" fill="url(#cm-h)"/><circle r="2.6" class="cm-nucleo"/></g>';
  return '<svg viewBox="0 0 300 44" preserveAspectRatio="xMidYMid meet">'+h+'</svg>';
}
function ponerCometa(el,f){
  var sv=el.querySelector('.cd-const svg');if(!sv)return;
  f=Math.max(0,Math.min(1,f));var c=cmPt(f),c0=Math.max(0,f-.16);
  sv.querySelector('.cm-hecho').setAttribute('points',f>0?cmLinea(0,f):'');
  sv.querySelector('.cm-cola').setAttribute('points',f>0.005?cmLinea(c0,f):'');
  var g=sv.querySelector('#cm-g');if(g){g.setAttribute('x1',cmPt(c0)[0].toFixed(1));g.setAttribute('x2',c[0].toFixed(1))}
  sv.querySelector('.cm-cabeza').setAttribute('transform','translate('+c[0].toFixed(1)+' '+c[1].toFixed(1)+')');
  sv.querySelectorAll('.cm-st').forEach(function(s){s.classList.toggle('on',Number(s.getAttribute('data-f'))<=f+.001)});
  sv.classList.toggle('cm-llego',f>=.999);
}
var cmVisto=null,cmAnim=0;
function viajeCometa(el,f,d,tot){
  var n=el.querySelector('.cd-n');cancelAnimationFrame(cmAnim);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){ponerCometa(el,f);return}
  var dur=Math.max(900,Math.min(1800,600+f*1400)),t0=null,desdeN=d>0&&tot-d>=3?tot:null;
  var paso=function(ts){
    if(t0===null)t0=ts;var k=Math.min(1,(ts-t0)/dur),e=1-Math.pow(1-k,3);
    ponerCometa(el,f*e);
    if(n&&desdeN!==null)n.textContent=String(Math.round(desdeN+(d-desdeN)*e));
    if(k<1)cmAnim=requestAnimationFrame(paso);else if(f>=.999)el.classList.add('cm-brilla');
  };
  cmAnim=requestAnimationFrame(paso);
}
export function renderCountdown(){
  var state=ctx.state,el=$('#countdown');if(!el)return;
  var t=today(),d=diffDays(t,state.plan.cobro),big,small,lab;
  if(d>0){big=String(d);small=(d===1?'día':'días');lab='Cobrás en'}
  else if(d===0){big='Hoy';small='cobrás';lab='Cobro'}
  else{big='Ya';small='cobraste';lab='Cobro'}
  var tot=diffDays(state.plan.inicio||t,state.plan.cobro),pas=diffDays(state.plan.inicio||t,t);
  var f=d<=0?1:tot>0?Math.max(0,Math.min(1,pas/tot)):0;
  /* el color se calienta a medida que se acerca el cobro: lejos, oro pálido; cerca, dorado; los últimos 3 días, ámbar; el día, dorado con polvo de estrellas */
  el.classList.remove('cd-lejos','cd-cerca','cd-ya','cd-hoy','cm-brilla');
  el.classList.add(d<=0?'cd-hoy':d<=3?'cd-ya':d<=7?'cd-cerca':'cd-lejos');
  el.innerHTML='<span class="cd-l">'+lab+'</span><span class="cd-v"><span class="cd-n'+(d>0?'':' txt')+'">'+esc(big)+'</span><span class="cd-t">'+esc(small)+'</span></span><span class="cd-seg cd-const" aria-hidden="true">'+caminoSVG()+'</span><span class="cd-d">'+esc(fLarga(state.plan.cobro))+'</span>';
  el.dataset.f=f;el.dataset.d=d;el.dataset.tot=tot;
  var clave=t+'|'+state.plan.cobro;
  if(ctx.tab==='resumen'&&cmVisto!==clave){cmVisto=clave;ponerCometa(el,0);viajeCometa(el,f,d,tot)}
  else{ponerCometa(el,f);if(f>=.999)el.classList.add('cm-brilla')}
  if(d===0&&polvoDia!==t&&ctx.tab==='resumen'){polvoDia=t;setTimeout(function(){polvo(el.querySelector('.cd-v'),18,0)},250)}
  el.setAttribute('aria-label',(d>0?d+' '+small+' para cobrar':(d===0?'Cobrás hoy':'Ya cobraste'))+', '+fLarga(state.plan.cobro)+'.');
}

/* (2.34) Las semanas del plan en Hoy: «Semana 2 · 2 nov – 8 nov» y lo que te queda (o te pasaste / sobró).
   Las cuentas son las de siempre (pc.weeks); la semana de hoy va marcada y tocar una abre su página. */
/* (2.40) «Consejos para ahorrar en el mes»: un desplegable al final de Hoy con la guía de cómo repartir la plata
   semana a semana (en % y en pesos con tu plan), la elección Parejo / Optimizado y el sobre de compras e imprevistos.
   La cuenta, en logica/sobres.js. */
var sobAbiertos={};
function consejosHoy(pc,t){
  var S=pc.sobres||{},ws=pc.weeks,hay=ws.length>0,n,rec=S.reparto==='recomendado';
  /* la guía es un mes de ejemplo de 4 semanas; el modo optimizado aplica lo mismo a tus semanas, según sus días */
  var pcts=guiaReparto(4),fmt=function(x){return String(Math.round(x))+' %'};n=4;
  /* (2.46) cada barra con su porcentaje y una palabra: se entiende de un vistazo */
  var pal=['liviano','compras','compras','colchón'];
  var cols=pcts.map(function(x,i){
    return '<li class="cj-c" style="flex-grow:'+x.toFixed(2)+'"><b>'+fmt(x)+'</b><i aria-hidden="true"></i><span>Sem. '+(i+1)+'</span><em>'+pal[i]+'</em></li>';
  }).join('');
  var tips='';
  var C=S.compras||0,f=C>0?Math.max(0,Math.min(1,S.queda/C)):0;
  var sobre=hay&&anota()?'<details class="sob" data-sob="compras"'+(sobAbiertos.compras?' open':'')+'><summary><span class="sob-n"><b>Sobre de compras e imprevistos</b><small>'+(C>0?'te quedan '+money(S.queda)+' de '+money(C):'un regalo, el dentista, algo que se rompe')+'</small>'
    +(C>0?'<span class="sob-bar" aria-hidden="true"><i style="transform:scaleX('+f.toFixed(3)+')"></i></span>':'')+'</span><b class="sob-v'+(C>0?' plata':' sob-armar')+'">'+(C>0?money(S.queda):'Armar')+'</b></summary>'
    +'<div class="sob-in"><p class="note">Lo que no es de todos los días sale de acá y no de la semana. Lo que no uses queda como ahorro.</p>'
    +'<form class="sob-f" data-sobf autocomplete="off"><div class="money"><span>$</span><input id="sob-monto" type="number" inputmode="numeric" min="0" step="100" value="'+(C||'')+'" placeholder="3000" aria-label="Plata para el sobre de compras"></div><button class="btn quiet" type="submit">Guardar</button></form>'
    +(C>0?'<button class="btn quiet sob-g" type="button" data-sobgasto><span aria-hidden="true">+</span> Compra del sobre</button>':'')+'</div></details>':'';
  var mas='<ul class="cj-tips cj-cortos">'
    +'<li><b>Al cobrar:</b> separá el ahorro.</li>'
    +'<li><b>Primero</b> pagá los fijos.</li>'
    +(anota()?'<li><b>Anotá</b> cada gasto al toque.</li>':'<li><b>Actualizá</b> cada vez que entrás.</li>')
    +'<li><b>¿Compra no planeada?</b> Esperá un día.</li>'
    +'<li><b>Al súper,</b> con lista.</li>'
    +'<li><b>El domingo,</b> mirá cuánto sobró.</li></ul>';
  return '<details class="consejos" data-sob="consejos"'+(sobAbiertos.consejos?' open':'')+'><summary><span class="cj-t">Consejos para ahorrar</span><span class="cj-s">el reparto del mes y 6 ideas rápidas</span></summary>'
    +'<div class="cj-in"><h3 class="cj-h">Un mes optimizado</h3><ol class="cj-guia" aria-label="Reparto optimizado: '+pcts.map(function(x,i){return 'semana '+(i+1)+', '+fmt(x)}).join('; ')+'">'+cols+'</ol>'
    +tips+sobre+mas+'</div></details>';
}
/* El día que empieza el pacto (y los 3 siguientes): separar el ahorro de verdad, mejor en UI */
function avisoPasar(pc,t){
  var p=ctx.state.plan;
  if(!(pc.ahorro>0)||t<p.inicio||diffDays(p.inicio,t)>3||p.ahorroPasado===p.cobro)return '';
  return '<div class="banner"><p><b>Separá tu ahorro hoy:</b> pasá '+money(pc.ahorro)+' a otra cuenta, así no se mezcla.</p><button class="btn" type="button" data-pasado>Ya lo pasé</button></div>';
}
/* El último día de cada semana (y el siguiente): ¿lo que sobra va a la semana que viene o al ahorro? */
function avisoRepaso(pc,t){
  var ay=iso(addDays(parse(t),-1)),ps=ctx.state.plan.sobranteSemana||{},n=pc.weeks.length,w=null;
  pc.weeks.forEach(function(x,i){if(i<n-1&&(x.end===t||x.end===ay)&&x.left>0&&!ps[x.start])w=x});
  if(!w)return '';
  return '<div class="banner"><p><b>Cierre de la semana '+(w.i+1)+':</b> te '+(w.end===t?'van sobrando':'sobraron')+' '+money(w.left)+'. ¿A dónde van?</p>'
    +'<div class="row-btns"><button class="btn" type="button" data-sobsem="'+w.start+'" data-val="siguiente">A la semana que viene</button><button class="btn" type="button" data-sobsem="'+w.start+'" data-val="ahorro">Al ahorro</button></div></div>';
}
function initSobres(){
  var el=$('#consejos-hoy');if(!el)return;
  el.addEventListener('toggle',function(e){var d=e.target;if(d.matches&&d.matches('[data-sob]'))sobAbiertos[d.getAttribute('data-sob')]=d.open},true);
  el.addEventListener('click',function(e){
    var c=e.target.closest('[data-reparto]');
    if(c){cambiarReparto(c.getAttribute('data-reparto'));return}
    if(e.target.closest('[data-sobgasto]')){abrirHojaGasto({titulo:'Compra del sobre',sobre:true});return}
  });
  el.addEventListener('submit',function(e){
    if(!e.target.matches('[data-sobf]'))return;e.preventDefault();
    var st=ctx.state,pc=planCalc(st),max=Math.max(0,Math.floor(pc.gastar)),v=Math.max(0,Math.round(num($('#sob-monto').value)));
    var tope=v>max;if(tope)v=max;
    st.plan.compras=v;ctx.persist();ctx.renderAll();
    toast(tope?'El sobre no puede pasar tu plata para gastar: queda en '+money(v):v?'Listo: sobre de '+money(v):'Listo: sin sobre de compras');
  });
  var pr=$('#p-resumen');if(pr)pr.addEventListener('click',function(e){
    if(!e.target.closest('[data-pasado]'))return;
    ctx.state.plan.ahorroPasado=ctx.state.plan.cobro;ctx.persist();ctx.renderAll();toast('Bien: tu ahorro ya está aparte');
  });
}

/* (2.41) Semana por semana como carrusel: una ficha por semana con lo que podés gastar;
   la elegida muestra su detalle debajo. Arriba, «Parejo / Optimizado» cambia el reparto (con Deshacer). */
/* (2.42) qué parte del total para gastar le toca a cada semana; redondeado para que siempre sume 100 */
function porcentajes(ws){
  var tot=0;ws.forEach(function(w){tot+=Math.max(0,w.budget)});if(!(tot>0))return ws.map(function(){return 0});
  var raw=ws.map(function(w){return Math.max(0,w.budget)/tot*100}),base=raw.map(Math.floor),falta=100-base.reduce(function(a,b){return a+b},0);
  raw.map(function(x,i){return [x-base[i],i]}).sort(function(a,b){return b[0]-a[0]}).slice(0,falta).forEach(function(x){base[x[1]]++});
  return base;
}
function fechasSemana(w){return w.start===w.end?fCorta(w.start):rango(w.start,w.end)}
/* (2.44) Cada ficha: lo que la semana tiene para gastar (así se ve el reparto) y cómo va. Tocarla abre esa semana. */
function fichaSemana(w,t,pct){
  var cur=t>=w.start&&t<=w.end,past=t>w.end,over=w.left<0;
  var lab=over?'te pasaste '+money(-w.left):past?'sobró '+money(w.left):cur?'te quedan '+money(w.left):money(w.budget/Math.max(1,w.days))+' por día';
  return '<button type="button" class="sem-c'+(cur?' actual':'')+(past?' pasada':'')+'" data-goto="w'+w.i+'"'+(cur?' aria-current="date"':'')
    +' aria-label="Semana '+(w.i+1)+', '+esc(fechasSemana(w))+': '+money(w.budget)+' para gastar, '+lab+(pct!=null?', '+pct+' por ciento del mes':'')+'. Ver sus gastos">'
    +(pct!=null?'<span class="sem-c-pct" aria-hidden="true">'+pct+' %</span>':'')
    +'<span class="sem-c-n" aria-hidden="true">Semana '+(w.i+1)+(cur?' <i>hoy</i>':'')+'</span>'
    +'<small aria-hidden="true">'+esc(fechasSemana(w))+'</small>'
    +'<b class="'+(past?'':'plata')+'" aria-hidden="true">'+money(w.budget)+'</b>'
    +'<small class="'+(over?'neg':'')+'" aria-hidden="true">'+lab+'</small></button>';
}
function semanasHoy(pc,t){
  if(!pc.weeks.length)return '';
  var rec=(pc.sobres&&pc.sobres.reparto)==='recomendado',varias=pc.weeks.length>1;
  var seg=varias?'<div class="seg sem-rep" role="group" aria-label="Cómo se reparte tu plata entre las semanas">'
    +'<button type="button" data-reparto="parejo" aria-pressed="'+!rec+'">Parejo</button><button type="button" data-reparto="recomendado" aria-pressed="'+rec+'">Optimizado</button></div>':'';
  var pp=varias?porcentajes(pc.weeks):[];
  return '<section class="sem-hoy" aria-labelledby="sem-hoy-t"><h2 class="plan-h" id="sem-hoy-t">Tus semanas</h2>'+seg
    +(varias?'<p class="note sem-rep-n">'+(rec?'Menos al principio, más al final.':'Igual todos los días.')+' Tocá una para verla.</p>':'')
    +'<div class="sem-car" role="list" aria-label="Tus semanas" data-nodeslizar>'+pc.weeks.map(function(x,k){return '<div class="sem-li" role="listitem">'+fichaSemana(x,t,varias?pp[k]:null)+'</div>'}).join('')+'</div></section>';
}
function quieto(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
/* centra la semana de hoy en el carrusel sin mover la página */
function centrarFicha(el,suave){
  var car=el.querySelector('.sem-car'),f=car&&(car.querySelector('[aria-current]')||car.querySelector('.sem-c:not(.pasada)')||car.lastElementChild);if(!f)return;
  var x=f.offsetLeft-(car.clientWidth-f.offsetWidth)/2;
  try{car.scrollTo({left:Math.max(0,x),behavior:suave&&!quieto()?'smooth':'auto'})}catch(e){car.scrollLeft=Math.max(0,x)}
}
function redibujarSemanas(el,antes){
  var car=el.querySelector('.sem-car'),sl=car?car.scrollLeft:0;
  el.innerHTML=semanasHoy(planNow(),today());
  var nc=el.querySelector('.sem-car');if(nc)nc.scrollLeft=sl;
  if(quieto()||!antes)return;
  el.querySelectorAll('.sem-c b').forEach(function(b,k){if(antes[k]!==b.textContent&&b.animate)b.animate([{opacity:.2,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:320,delay:k*30,easing:'cubic-bezier(.2,.7,.2,1)'})});
}
/* Parejo / Optimizado, con Deshacer */
function cambiarReparto(v){
  if(ctx.state.plan.reparto===v||(!ctx.state.plan.reparto&&v==='parejo'))return;
  var el=$('#sem-hoy'),antes=el?[].map.call(el.querySelectorAll('.sem-c b'),function(b){return b.textContent}):null;
  ctx.state.plan.reparto=v;ctx.persist();ctx.renderAll();if(el)redibujarSemanas(el,antes);
  toastAccion(v==='recomendado'?'Listo: semanas con reparto optimizado':'Listo: cada semana tiene lo mismo','Deshacer',function(){ctx.state.plan.reparto=v==='recomendado'?'parejo':'recomendado';ctx.persist();ctx.renderAll()});
}
function initSemHoy(){
  var el=$('#sem-hoy');if(!el)return;
  el.addEventListener('click',function(e){
    var r=e.target.closest('[data-reparto]');if(r)cambiarReparto(r.getAttribute('data-reparto'));
  });
}

/* (2.37) La barra de los días: un tramo por día hasta el fin de la semana.
   El de hoy se vacía a medida que gastás; los que vienen están llenos (cada uno vale lo mismo que hoy). */
var barraAntes=null;
function barraDias(H){
  var A=H.porDia,n=Math.max(1,Math.min(7,H.dias||1)),hoyF=A>0?Math.max(0,Math.min(1,H.queda/A)):0;
  var fut=n>1&&A>0?Math.max(0,Math.min(1,(H.semanaQueda-Math.max(H.queda,0))/((n-1)*A))):1;
  var d0=parse(today()),h='';
  for(var k=0;k<n;k++){
    var d=addDays(d0,k),f=k===0?hoyF:fut;
    h+='<span class="bd'+(k===0?' hoy':'')+(k===0&&H.queda<0?' over':'')+'"><i style="transform:scaleX('+f.toFixed(3)+')"></i><small>'+(k===0?'hoy':DIA[d.getDay()])+'</small></span>';
  }
  var lab='Hoy te quedan '+money(Math.max(0,H.queda))+' de '+money(Math.max(0,A))+(n>1?'; después, '+money(fut*A)+' por día hasta el '+fLarga(H.fin):'');
  return '<span class="bdias" role="img" aria-label="'+esc(lab)+'" style="--n:'+n+'">'+h+'</span>';
}
function animarBarra(el,H){
  var i=el.querySelector('.bd.hoy>i');if(!i)return;
  var A=H.porDia,nuevo=A>0?Math.max(0,Math.min(1,H.queda/A)):0,desde=barraAntes===null?1:barraAntes;barraAntes=nuevo;
  if(Math.abs(desde-nuevo)<.001||!i.animate||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  i.animate([{transform:'scaleX('+desde+')'},{transform:'scaleX('+nuevo+')'}],{duration:700,easing:'cubic-bezier(.2,.8,.2,1)'});
}

export function renderResumen(pc){
  var state=ctx.state;
  syncMontoCampo(pc);ahorroNote();heroChips(pc);renderAlertaMeta(pc);
  var sum=$('#plan-aj-sum');if(sum)sum.textContent=num(state.plan.monto)>0?money(Math.max(0,disponible(state,pc)))+' disponibles · guardás '+money(pc.ahorro)+' · hasta el '+fCorta(state.plan.cobro):'Completá los tres pasos';
  /* (2.15) la página de Hoy se dibuja solo cuando se ve: así pasar a otro capítulo no la rehace cada vez */
  if(ctx.tab!=='resumen')return;
  renderCierre(pc);renderHoy(pc);renderEntradas();renderSuperv(pc);renderRitmo(pc);
  /* (2.35) Semana por semana, justo debajo de «Hoy podés gastar»: cada semana con lo que te queda; tocarla abre su detalle. */
  var sh=$('#sem-hoy');if(sh){var scl=sh.querySelector('.sem-car'),sl0=scl?scl.scrollLeft:null;sh.innerHTML=semanasHoy(pc,today());var nc=sh.querySelector('.sem-car');if(nc&&sl0)nc.scrollLeft=sl0;else centrarFicha(sh,false)}
  /* (2.39) los sobres del mes y dos recordatorios: separar el ahorro al cobrar y el cierre de cada semana */
  var so=$('#consejos-hoy');if(so)so.innerHTML=consejosHoy(pc,today());
  var pa=$('#pasar-aviso');if(pa)pa.innerHTML=avisoPasar(pc,today());
  /* (2.56) ya no se pide el recibo de cada mes: alcanza con uno */var ra=$('#recibo-aviso');if(ra)ra.innerHTML='';
  var rp=$('#repaso-aviso');if(rp)rp.innerHTML=avisoRepaso(pc,today());
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
  /* (2.47) «Tu plan» de un vistazo: una barra con en qué se reparte tu plata (fijos, guardás, para gastar)
     y, si sé tu cobro, la misma barra para cuando cobres. Las tres partes siempre suman el total. */
  h+=foldIni('plan','tone-mint','Tu plan','en qué se reparte tu plata'+(L.liquido>0?' y cuando cobres':''));
  var gas=Math.max(0,pc.gastar);
  h+=reparto('Tu plata del pacto',pc.fijos+pc.ahorro+gas,[
    {k:'f',n:'Fijos',v:pc.fijos,s:!state.fijos.length?'sin cargar':pend>0?'faltan '+money(pend):'todos pagos'},
    {k:'a',n:'Guardás',v:pc.ahorro,s:pc.ahorro>0?'hasta el '+fCorta(p.cobro):'nada todavía'},
    {k:'g',n:'Para gastar',v:gas,s:'gastaste '+money(pc.spentInPlan)}]);
  if(resto<0)h+='<p class="err tp-n">Te pasaste '+money(-resto)+': no llegás a guardar todo.</p>';
  var fuera=pc.spentAll-pc.spentInPlan;
  if(Math.round(fuera)>0)h+='<p class="note tp-n">'+money(fuera)+' en gastos fuera de las fechas del plan no cuentan.</p>';
  h+='<div class="row-btns tp-ir">'+(state.fijos.length?'<button class="btn quiet" type="button" data-goto="fijos">Ver fijos</button>':'<button class="btn quiet" type="button" data-goto="fijos">Cargar fijos</button>')+'</div>';
  /* Cuando cobres: solo si ya sé cuánto cobrás */
  if(L.liquido>0){
    var nx=proximo(state,L);
    var AG=aguinaldo(state,t),conAg=AG.pago>=p.cobro&&AG.pago<nx.nc&&AG.liquido>0;
    if(conAg){nx=Object.assign({},nx,{libre:nx.libre+AG.liquido});nx.dia=nx.libre/nx.dias;nx.semana=nx.libre*7/nx.dias}
    var entra=L.liquido+(conAg?AG.liquido:0)+(nx.ingresos||0);
    h+='<div class="tp-sep"></div>';
    h+=reparto((L.real?'Cuando cobres':'Cuando cobres, estimado')+(conAg?' (con aguinaldo)':''),entra,[
      {k:'f',n:'Fijos',v:nx.fij,s:'del mes'},
      {k:'a',n:'Guardás',v:nx.meta,s:nx.metaPedida>nx.meta?'no entra '+money(nx.metaPedida):'tu meta'},
      {k:'g',n:'Para gastar',v:Math.max(0,nx.libre),s:nx.libre>0?money(nx.semana)+' por semana':'no alcanza'}]);
    if(nx.libre<0)h+='<p class="err tp-n">No te alcanza para la meta: faltan '+money(-nx.libre)+'.</p>';
    var sd=sensibilidadDolar(L);
    if(sd)h+='<p class="note tp-n">Si el dólar se mueve un '+sd.pct+' %, lo libre cambia ≈ '+money(sd.cambio)+'.</p>';
    /* (2.51) lo que llevás de horas extra este mes (ya está dentro de lo que vas a cobrar) */
    var Rh=reglasHoras(state);
    if(Rh.activo!==false&&tieneHorario(Rh)){var ext=(L.estimado||L).liquido-liqNow(false).liquido;if(ext>0)h+='<p class="note tp-n">Este mes llevás <b>+ '+money(ext)+'</b> de horas extra.</p>'}
    h+='<div class="row-btns tp-ir"><button class="btn quiet" type="button" data-goto="sueldo">Ver tu cobro</button></div>';
  }
  h+='</div></details>';
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
  var sa=!anota(),des=p.desde?(p.desde===p.hasta?(p.desde===today()?'hoy':'el '+fCorta(p.desde)):'entre el '+fCorta(p.desde)+' y el '+fCorta(p.hasta)):'';
  if(sa&&v==='')t='La última vez tenías '+d+'. Poné lo que tenés ahora en la cuenta y en efectivo.';
  else if(sa&&p.tipo==='gasto')t='Gastaste '+money(p.diff)+' ('+des+'). Se recalcula todo.';
  else if(sa&&p.tipo==='igual')t='Es lo mismo que la última vez: no gastaste nada.';
  else if(sa&&p.tipo==='monto')t='Tu plata pasa de '+d+' a '+money(num(v))+' y se recalcula todo.';
  else if(sa&&p.tipo==='ingreso')t='Tenés '+money(p.diff)+' más: lo sumo a tu plata y se recalcula todo.';
  else if(v==='')t='Según lo que anotaste, tenés '+d+'. Poné lo que tenés de verdad y yo anoto la diferencia.';
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
  if(anota()&&today()<ctx.state.plan.cobro){irAlPacto('tenes');return}
  /* (2.45) sin anotar gastos, es la acción de todos los días: se abre acá mismo */
  if(ctx.tab!=='resumen')ctx.go('resumen');c.hidden=false;i.value='';saldoPrev();
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
  if(p.tipo==='invalido'||p.tipo==='fuera')return false;
  if(p.tipo==='igual'&&anota())return false;
  var r=ajustarSaldo(st,real,today());
  ctx.persist();ctx.syncInputs();ctx.renderAll();
  if(r.tipo==='igual'){toast('Listo: no gastaste nada desde la última vez');return true}
  toastAccion(r.tipo==='gasto'?(anota()?'Anoté '+money(r.diff)+' de ajuste de saldo':'Listo: gastaste '+money(r.diff)+'. Ya recalculé tu día.'):r.tipo==='ingreso'?'Sumé '+money(r.diff)+' a tu plata disponible':'Tu plata disponible quedó en '+money(real),'Deshacer',function(){
    deshacerAjuste(ctx.state,r);ctx.persist();ctx.syncInputs();ctx.renderAll();
  });
  return true;
}
export function initPlan(){
  initSemHoy();initSobres();
  var pr=$('#p-resumen');
  initSaldo();initEntradas();
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
  $('#hero-chips').addEventListener('click',function(e){if(e.target.closest('#apartado-abrir')){ctx.abrirPrologo('pacto','qa');return}if(e.target.closest('#saldo-abrir'))abrirSaldo();if(e.target.closest('#ahorro-abrir'))abrirMeta()});
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
