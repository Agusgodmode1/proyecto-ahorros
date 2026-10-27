/* Índice del libro (tabla de contenidos con cintas) y Ajustes del pacto (los tres datos, con topes y «Deshacer»). */
import {parse,MESL,DIAL} from '../logica/fechas.js';
import {hoyPodes,curWeek} from '../logica/plan.js';
import {disponible} from '../logica/saldo.js';
import {histStats} from '../logica/logros.js';
import {CAPITULOS,capituloDe} from '../logica/capitulos.js';
import {previaAjuste,aplicarAjuste,deshacerAjustePacto} from '../logica/pacto.js';
import {ctx,$,today,planNow,liqNow,money,esc,fCorta,toastAccion} from './comun.js';

function quieto(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
function fLarga(s){var d=parse(s);return DIAL[d.getDay()]+' '+d.getDate()+' de '+MESL[d.getMonth()]}

/* ---------- Índice ---------- */
/* Lo que dice cada renglón a la derecha (como el número de página de un índice) */
function pista(id,pc){
  var st=ctx.state,t=today();
  try{
    if(id==='resumen'){var H=hoyPodes(pc,st.gastos,t);return H.queda<0?'te pasaste '+money(-H.queda):'podés gastar '+money(H.queda)}
    if(id==='semanas')return pc.weeks.length?'semana '+(curWeek(pc,t)+1)+' de '+pc.weeks.length:'';
    if(id==='fijos')return st.fijos.length?st.fijos.length+(st.fijos.length===1?' fijo':' fijos'):'sin cargar';
    if(id==='sueldo'){var L=liqNow(true);return L.liquido>0?'cobrás ≈ '+money(L.liquido):'cargá tu sueldo'}
    if(id==='gastos')return st.extracto.texto&&st.extracto.texto.trim()?'extracto cargado':'sin extracto';
    if(id==='logros'){var S=histStats(st.hist);return S.cur>0?'racha de '+S.cur+(S.cur===1?' mes':' meses'):S.hs.length+(S.hs.length===1?' mes cerrado':' meses cerrados')}
  }catch(e){}
  return '';
}
export function abrirIndice(){
  var box=$('#indice-box'),el=$('#indice'),st=ctx.state,pc=planNow(),actual=capituloDe(ctx.tab);
  var h='<div class="lb-cab"><span class="lb-cap">el libro del ahorro</span><button class="lb-link" type="button" data-ix="cerrar">Cerrar</button></div>'
    +'<h1 class="lb-h" id="ix-t">Índice</h1><ol class="ix-list">'
    +'<li><button type="button" class="ix-i" data-ix="prologo"><span class="ix-n">·</span><span class="ix-t">Prólogo y pacto</span><span class="ix-dots" aria-hidden="true"></span><span class="ix-p">'+(st.pacto&&st.pacto.sellado?'sellado el '+esc(fCorta(st.pacto.sellado)):'releer')+'</span></button></li>';
  CAPITULOS.forEach(function(c){
    var on=actual&&actual.id===c.id;
    h+='<li class="'+c.tono+(on?' actual':'')+'"><button type="button" class="ix-i" data-ix-go="'+c.id+'"'+(on?' aria-current="page"':'')+'><span class="ix-n">'+c.n+'</span><span class="ix-t">'+esc(c.t)+'</span><span class="ix-dots" aria-hidden="true"></span><span class="ix-p">'+pista(c.id,pc)+'</span><i class="ix-cinta" aria-hidden="true"></i></button></li>';
  });
  h+='<li class="ix-aj'+(ctx.tab==='ajustes'?' actual':'')+'"><button type="button" class="ix-i" data-ix-go="ajustes"><span class="ix-n">✦</span><span class="ix-t">Ajustes del pacto</span><span class="ix-dots" aria-hidden="true"></span><span class="ix-p">perfil y respaldo</span><i class="ix-cinta" aria-hidden="true"></i></button></li></ol>'
    +'<p class="lb-folio">Deslizá a los costados para pasar de capítulo.</p>';
  box.innerHTML=h;el.hidden=false;document.documentElement.classList.add('voz-abierta');
  if(!quieto())box.animate([{transform:'perspective(1400px) rotateY(-14deg) translateX(-3%)',opacity:0},{transform:'none',opacity:1}],{duration:340,easing:'cubic-bezier(.3,.6,.2,1)'});
  var b=box.querySelector('[aria-current]')||box.querySelector('[data-ix="cerrar"]');try{b.focus({preventScroll:true})}catch(e){}
}
function cerrarIndice(fn){
  var el=$('#indice'),box=$('#indice-box');
  document.documentElement.classList.remove('voz-abierta');
  var fin=function(){el.hidden=true;if(fn)fn()};
  if(el.hidden){fin();return}
  if(quieto())fin();else box.animate([{opacity:1},{opacity:0,transform:'translateX(-4%)'}],{duration:200,fill:'forwards'}).onfinish=fin;
}

/* ---------- Ajustes del pacto ---------- */
var tocado=false;
function leerPacto(){return {tenes:$('#pa-tenes').value,ahorro:$('#pa-ahorro').value,cobro:$('#pa-cobro').value}}
/* Llena el formulario con los datos actuales (salvo que lo estés editando) */
export function renderPacto(){
  var st=ctx.state,p=st.plan,pc=planNow(),t=today(),n=$('#pa-nota');if(!n)return;
  var fuera=t>=p.cobro,card=$('#pacto-card');
  n.innerHTML=(st.pacto&&st.pacto.sellado?'Sellado el '+esc(fLarga(st.pacto.sellado))+(st.pacto.numero>1?' (tu pacto n.º '+st.pacto.numero+')':'')+'. ':'')
    +(fuera?'<b>Ya llegó el día de cobro:</b> empezá un pacto nuevo desde el capítulo Hoy.':'Cambiá lo que quieras y tocá «Guardar el pacto».');
  card.classList.toggle('cerrado',fuera);
  $('#pacto-form').hidden=fuera;
  if(fuera||tocado)return;
  $('#pa-tenes').value=String(Math.round(Math.max(0,disponible(st,pc))));
  $('#pa-ahorro').value=String(Math.round(pc.ahorro));
  $('#pa-cobro').value=p.cobro;$('#pa-cobro').min=t;
  previa();
}
function previa(){
  var st=ctx.state,v=previaAjuste(st,leerPacto(),today()),el=$('#pa-prev'),er=$('#pa-err');
  var msg=Object.keys(v.errores).map(function(k){return v.errores[k]==='max'?'Con esa plata, lo máximo que podés guardar es '+money(Math.floor(v.maxAhorro))+'.':v.errores[k]})[0]||'';
  er.textContent=msg;er.hidden=!msg;
  el.innerHTML=v.ok?'Te quedan <b>'+money(v.gastar)+'</b> para gastar: ≈ <b>'+money(v.porDia)+' por día</b> durante '+v.dias+' '+(v.dias===1?'día':'días')+'.'+(v.bajo?' <span class="pa-ojo">Es poco por día, pero podés seguir.</span>':''):'';
  $('#pa-ok').disabled=!v.ok;
  return v;
}
function guardarPacto(){
  var st=ctx.state,v=aplicarAjuste(st,leerPacto(),today());
  if(!v.ok){previa();return}
  tocado=false;ctx.persist();ctx.syncInputs();ctx.renderAll();
  toastAccion('Pacto actualizado: ≈ '+money(v.porDia)+' por día','Deshacer',function(){
    deshacerAjustePacto(ctx.state,v.deshacer);tocado=false;ctx.persist();ctx.syncInputs();ctx.renderAll();
  });
}
/* Desde «Tenés» o «Guardás» de Hoy: lleva al pacto con el cursor en el campo */
export function irAlPacto(campo){
  ctx.go('ajustes');
  var c=$('#pacto-card');if(c)try{c.scrollIntoView({block:'start'})}catch(e){}
  var i=$(campo==='ahorro'?'#pa-ahorro':'#pa-tenes');
  if(i&&!i.closest('[hidden]'))try{i.focus({preventScroll:true});i.select()}catch(e){}
}

export function initIndice(){
  var el=$('#indice');
  $('#indice-abrir').addEventListener('click',abrirIndice);
  el.addEventListener('click',function(e){
    if(e.target===el){cerrarIndice();return}
    var g=e.target.closest('[data-ix-go]');if(g){var id=g.getAttribute('data-ix-go');cerrarIndice(function(){ctx.go(id)});return}
    var b=e.target.closest('[data-ix]');if(!b)return;
    var a=b.getAttribute('data-ix');
    if(a==='cerrar')cerrarIndice();
    if(a==='prologo')cerrarIndice(function(){var r=$('#aj-prologo');if(r)r.click()});
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!el.hidden)cerrarIndice()});
  var f=$('#pacto-form');
  f.addEventListener('input',function(){tocado=true;previa()});
  f.addEventListener('submit',function(e){e.preventDefault();guardarPacto()});
  $('#pa-reset').addEventListener('click',function(){tocado=false;renderPacto()});
}
