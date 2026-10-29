/* Índice del libro: tabla de contenidos en papel, con el número de página de cada capítulo y una cinta en el que está abierto.
   Desde acá se va al prólogo (que es donde se cambia el pacto) o se cierra el libro.
   ctx.abrirPrologo(pagina, editar) y ctx.cerrarLibro() los pone app.js. */
import {hoyPodes,curWeek} from '../logica/plan.js';
import {histStats} from '../logica/logros.js';
import {resumenGuardado} from '../logica/guardado.js';
import {CAPITULOS,capituloDe,numeroDePagina} from '../logica/capitulos.js';
import {ctx,$,today,planNow,liqNow,money,esc,fCorta} from './comun.js';
import {buscarGastos} from '../logica/buscar.js';
import {nombreDe} from '../logica/categorias.js';
import {abrirHojaGasto} from './gastos.js';
import {tienePacto} from '../logica/herramientas.js';
import {listaHerrHTML,irHerramienta} from './herramientas.js';

function quieto(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}

/* Lo que dice cada renglón debajo del título (una pista de lo que hay en el capítulo) */
function pista(id,pc){
  var st=ctx.state,t=today();
  /* (2.26) sin pacto, Hoy, Semanas y Logros todavía no tienen nada que mostrar */
  if(!tienePacto(st)&&(id==='resumen'||id==='semanas'||id==='logros'))return 'con tu pacto';
  try{
    if(id==='resumen'){var H=hoyPodes(pc,st.gastos,t);return H.queda<0?'te pasaste '+money(-H.queda):'podés gastar '+money(H.queda)}
    if(id==='semanas')return pc.weeks.length?'semana '+(curWeek(pc,t)+1)+' de '+pc.weeks.length:'';
    if(id==='fijos')return st.fijos.length?st.fijos.length+(st.fijos.length===1?' fijo':' fijos'):'sin cargar';
    if(id==='sueldo'){var L=liqNow(true);return L.liquido>0?'cobrás ≈ '+money(L.liquido):'cargá tu sueldo'}
    if(id==='gastos')return st.extracto.texto&&st.extracto.texto.trim()?'extracto cargado':'sin extracto';
    if(id==='guardado'){var G=resumenGuardado(st,t);return G.total>0?'guardaste '+money(G.total):'tu fondo y tus metas'}
    if(id==='logros'){var S=histStats(st.hist);return S.cur>0?'racha de '+S.cur+(S.cur===1?' mes':' meses'):S.hs.length+(S.hs.length===1?' mes cerrado':' meses cerrados')}
  }catch(e){}
  return '';
}
function renglon(ir,n,t,sub,pag,cls,actual){
  return '<li class="'+(cls||'')+(actual?' actual':'')+'"><button type="button" class="ix-i" '+ir+(actual?' aria-current="page"':'')+'>'
    +'<span class="ix-n">'+n+'</span><span class="ix-t">'+esc(t)+(sub?'<small>'+sub+'</small>':'')+'</span><span class="ix-dots" aria-hidden="true"></span><span class="ix-p">'+pag+'</span><i class="ix-cinta" aria-hidden="true"></i></button></li>';
}
export function abrirIndice(){
  var box=$('#indice-box'),el=$('#indice'),st=ctx.state,pc=planNow(),n=pc.weeks.length,actual=capituloDe(ctx.tab),hay=tienePacto(st);
  var h='<div class="lb-cab"><span class="lb-cap">el libro del ahorro</span><button class="lb-link" type="button" data-ix="cerrar">Volver</button></div>'
    +'<h1 class="lb-h" id="ix-t">Índice</h1>'
    /* (2.15) buscar un gasto: por la nota, la categoría, el monto o la fecha */
    +'<div class="ix-buscar"><label class="sr-only" for="ix-q">Buscar un gasto</label><input id="ix-q" type="search" enterkeyhint="search" autocomplete="off" placeholder="Buscar un gasto: café, súper, 350, 12/10…"></div>'
    +'<div id="ix-res" aria-live="polite"></div><ol class="ix-list">'
    +renglon('data-ix="prologo"','·',hay?'Prólogo y pacto':'Armar mi pacto',hay?'sellado el '+esc(fCorta(st.pacto.sellado)):'son 3 preguntas',numeroDePagina('p1',n),'ix-pro',false);
  CAPITULOS.forEach(function(c){
    var on=!!actual&&actual.id===c.id;
    h+=renglon('data-ix-go="'+c.id+'"',c.n,c.t,pista(c.id,pc),numeroDePagina(c.id==='semanas'?'w0':c.id,n),c.tono,on);
  });
  h+=renglon('data-ix-go="ajustes"','✦','Ajustes','perfil, apariencia y respaldo',numeroDePagina('ajustes',n),'ix-aj',ctx.tab==='ajustes')+'</ol>'
    /* (2.26) las herramientas sueltas, siempre a mano */
    +'<h2 class="ix-sec">Herramientas sueltas</h2>'+listaHerrHTML('ix-herr','data-ixh')
    +'<div class="lb-acc ix-acc"><button class="lb-btn" type="button" data-ix="prologo">'+(hay?'Ir al prólogo':'Armar mi pacto')+'</button><button class="lb-btn" type="button" data-ix="tapa">Cerrar el libro</button></div>'
    +'<p class="lb-folio">— '+numeroDePagina('indice',n)+' —</p>';
  box.innerHTML=h;el.hidden=false;document.documentElement.classList.add('voz-abierta');
  if(!quieto())box.animate([{transform:'perspective(1400px) rotate3d(-.16,1,0,-30deg) translateX(-4%)',opacity:0},{transform:'perspective(1400px) rotate3d(-.16,1,0,1.5deg)',opacity:1,offset:.8},{transform:'none',opacity:1}],{duration:420,easing:'cubic-bezier(.3,.6,.2,1)'});
  var b=box.querySelector('[aria-current]')||box.querySelector('[data-ix="cerrar"]');try{b.focus({preventScroll:true})}catch(e){}
}
/* Lo que encontró: tocar un gasto lo abre para corregirlo */
var encontrados=[];
function buscar(q){
  var el=$('#ix-res'),lista=$('#indice-box .ix-list');if(!el)return;
  var r=buscarGastos(ctx.state.gastos,q,{nombreCat:function(c){return c?nombreDe(ctx.state,c):''},max:40});encontrados=r.lista;
  if(lista)lista.hidden=!!q.trim();
  if(!q.trim()){el.innerHTML='';return}
  el.innerHTML=r.n?'<p class="ix-res-t">'+r.n+(r.n===1?' gasto':' gastos')+' · '+money(r.total)+(r.n>r.lista.length?' (los '+r.lista.length+' más nuevos)':'')+'</p><ul class="ix-res">'
    +r.lista.map(function(g,i){return '<li><button type="button" data-ixg="'+i+'"><span class="ix-rf">'+esc(fCorta(g.fecha))+'</span><span class="ix-rn">'+esc(g.nota||'Sin detalle')+(g.cat?'<small>'+esc(nombreDe(ctx.state,g.cat))+'</small>':'')+'</span><b>'+money(g.monto)+'</b></button></li>'}).join('')+'</ul>'
    :'<p class="ix-res-t">No encontré gastos con «'+esc(q.trim())+'».</p>';
}
function cerrarIndice(fn){
  var el=$('#indice'),box=$('#indice-box');
  document.documentElement.classList.remove('voz-abierta');
  var fin=function(){el.hidden=true;if(fn)fn()};
  if(el.hidden){fin();return}
  if(quieto())fin();else box.animate([{opacity:1},{opacity:0,transform:'translateX(-4%)'}],{duration:200,fill:'forwards'}).onfinish=fin;
}

/* Desde «Tenés» o «Guardás» de Hoy: la página de esa pregunta del prólogo, ya lista para cambiar */
export function irAlPacto(campo){ctx.abrirPrologo(campo==='ahorro'?'q2':'q1',campo==='ahorro'?'q2':'q1')}

export function initIndice(){
  var el=$('#indice');
  $('#indice-abrir').addEventListener('click',abrirIndice);
  el.addEventListener('click',function(e){
    if(e.target===el){cerrarIndice();return}
    var gs=e.target.closest('[data-ixg]');if(gs){var gg=encontrados[Number(gs.getAttribute('data-ixg'))];if(gg)cerrarIndice(function(){abrirHojaGasto({gasto:gg})});return}
    var hx=e.target.closest('[data-ixh]');if(hx){var hid=hx.getAttribute('data-h');cerrarIndice(function(){irHerramienta(hid)});return}
    var g=e.target.closest('[data-ix-go]');if(g){var id=g.getAttribute('data-ix-go');cerrarIndice(function(){ctx.go(id,{abanico:true})});return}
    var b=e.target.closest('[data-ix]');if(!b)return;
    var a=b.getAttribute('data-ix');
    if(a==='cerrar')cerrarIndice();
    if(a==='prologo')cerrarIndice(function(){ctx.abrirPrologo('p1')});
    if(a==='tapa')cerrarIndice(function(){ctx.cerrarLibro()});
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!el.hidden)cerrarIndice()});
  el.addEventListener('input',function(e){if(e.target.id==='ix-q')buscar(e.target.value)});
}
