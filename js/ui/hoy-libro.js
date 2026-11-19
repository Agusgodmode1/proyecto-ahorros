/* El libro individual (2.65; libro antiguo desde 2.66): el libro abierto sobre una mesa, a la luz de una vela.
   Cuatro páginas: i Hoy · ii Tus semanas · iii Tu plata · iv Tu plan, y el capítulo de una semana cuando la abrís.
   Todo se hace en la hoja, escrito a tinta: nada de ventanas encima.
   - Los números NO se calculan acá: ui/plan.js los pasa con ctx.libroHoy(datos), o salen de las mismas funciones de logica/.
   - Cambiar un dato: la cifra vieja se tacha, aparece un renglón para escribir y «anotar · dejar». La tachada se ve chica
     hasta el día siguiente (se recuerda en este aparato, no en los datos).
   - Anotar, corregir y tachar gastos usa ui/gastos.js (lo mismo que la página de siempre); el «deshacer» es una línea al pie.
   - Lo que todavía no se pasó al libro (herramientas, ajustes, el prólogo) se abre como siempre.
   Una página por pantalla; si algo no entra, sigue en la página siguiente (nunca hay scroll). Solo el libro «solo». */
import {ctx,$,money,usd,discreto,anota,planNow,today,toast,toastAccion} from './comun.js';
import {libroEnUso} from '../estado.js';
import {recorte} from '../logica/recorte.js';
import {FONDOS} from '../logica/fondos-hoy.js';
import {romano,fechaLarga,cobro,diasSemana,diaNombre,homografia,franjas,pasa,duracion,variacion,vigente,hash2} from '../logica/hoy-libro.js';
import {planCalc} from '../logica/plan.js';
import {disponible,maxAhorro} from '../logica/saldo.js';
import {aplicarAjuste,deshacerAjustePacto} from '../logica/pacto.js';
import {normEsperado,recibirEsperado,quitarEsperado,deshacerEsperado} from '../logica/supervivencia.js';
import {cotizacion,gastoUSD} from '../logica/monedas.js';
import {nombresVisibles,nombreDe} from '../logica/categorias.js';
import {interpretar} from '../logica/voz.js';
import {reglasHoras} from '../logica/sueldo.js';
import {frecuentes} from '../logica/frecuentes.js';
import {parse,addDays,iso,diffDays,DIA,MES} from '../logica/fechas.js';
import {num} from '../logica/util.js';
import {cicloTerminado} from '../logica/ciclo.js';
import {sugerir,catDe,guardarGasto,avisoAnotado,anotarFrecuente,borrarGasto,diasHasta} from './gastos.js';
import {confirmarSaldo,textoSaldo} from './plan.js';
import {e,b,puntos,opciones,renglon} from './hl-piezas.js';
import {espejo,tocar,escribir,confirmar} from './hl-espejo.js';
import {prologoPos,prologoPasar} from './libro.js';

var raiz=document.documentElement,el=null,vista=null,mesa=null,img=null,luz=null,PAGS=[],n=1,geo=null,datos=null,G=null;
var clasico=false,auto=false,ultimo=null;
/* lo que se está escribiendo en la hoja, el gasto por tachar, la semana abierta, lo que dice el pie, lo recién escrito */
var edit=null,tachar=null,semana=null,pie=null,recien=null,anchoArmado=0;
/* (2.66) los capítulos que el libro lee de la página de siempre (ui/hl-espejo.js): el prólogo, Ajustes y el perfil */
var capArmada=null,EX=[],EXraiz=null,capVieja=null,marcaVieja=null,idxViejo=0,irPrimera=false,trasFoco=false,reloj=null;
function quieto(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(x){return false}}
function azar(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- la tinta ferrogálica: baldosas de tinta despareja (más cargada en unos lugares, más aguada en otros) ---------- */
function ruido(x,y,p){var xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),m=function(k){return((k%p)+p)%p};
  var a=hash2(m(xi),m(yi)),b=hash2(m(xi+1),m(yi)),c=hash2(m(xi),m(yi+1)),d=hash2(m(xi+1),m(yi+1));return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function rgb(hex){hex=String(hex).trim().replace('#','');return [0,2,4].map(function(i){return parseInt(hex.slice(i,i+2),16)||0})}
function baldosa(base,agua,contraste){
  var N=160,c=document.createElement('canvas');c.width=c.height=N;var g=c.getContext('2d'),im=g.createImageData(N,N),d=im.data;
  for(var y=0;y<N;y++)for(var x=0;x<N;x++){
    var v=Math.min(1,Math.max(0,.5+contraste*((ruido(x/40,y/40,4)-.5)*1.5+(ruido(x/11,y/11,14)-.5)*.7)+(ruido(x/2.2,y/2.2,72)>.82?-.2:0))),i=(y*N+x)*4;
    d[i]=agua[0]+(base[0]-agua[0])*v;d[i+1]=agua[1]+(base[1]-agua[1])*v;d[i+2]=agua[2]+(base[2]-agua[2])*v;d[i+3]=255}
  g.putImageData(im,0,0);return 'url('+c.toDataURL('image/png')+')'}
function tintas(){
  var cs=getComputedStyle(raiz),T=function(k){return rgb(cs.getPropertyValue('--hl-'+k))};
  [['tinta',1],['suave',.9],['fuerte',.9],['rojo',1],['oro',1.2],['cargada',1.4]].forEach(function(t){
    raiz.style.setProperty('--hl-t-'+t[0],baldosa(T(t[0]),T(t[0]+'-agua'),t[1]))});
}

/* ---------- la mano: cada palabra con su carga de tinta (unas más cargadas, otras más claras); cada letra con su variación
   chica y fija (±1° de giro, ±0,6 px de línea, logica/hoy-libro.js): no cambia al recargar ---------- */
var semilla=0;
function vestir(s,k){var r=azar(k*7919+13);s.style.setProperty('--carga',(.92+r()*.08).toFixed(3));s.style.setProperty('--dy',((r()-.5)*.6).toFixed(2)+'px');s.style.setProperty('--g',((r()-.5)*.6).toFixed(2)+'deg')}
function letras(w,k){
  var t=w.textContent;w.textContent='';
  for(var i=0;i<t.length;i++){var ch=t[i];if(ch===' '||ch===' '){w.appendChild(document.createTextNode(ch));continue}
    var l=document.createElement('span'),v=variacion(k,i,ch.charCodeAt(0)),h3=hash2(k+i*101,7);
    l.className='hl-l';l.textContent=ch;
    l.style.cssText='--lr:'+v.giro+'deg;--ly:'+v.linea+'px;--li:'+i+';--bx:'+Math.round(h3*160)+'px;--by:'+Math.round(hash2(i,k)*160)+'px';
    w.appendChild(l)}}
function aPluma(nodo){
  if(nodo.nodeType===3){
    if(!nodo.textContent.trim())return;
    var f=document.createDocumentFragment();
    nodo.textContent.split(/(\s+)/).forEach(function(t){if(!t)return;if(/^\s+$/.test(t)){f.appendChild(document.createTextNode(' '));return}
      var s=document.createElement('span');s.className='hl-w';s.textContent=t;var k=++semilla+hash2(t.length,t.charCodeAt(0))*1e4|0;vestir(s,k);letras(s,k);f.appendChild(s)});
    nodo.parentNode.replaceChild(f,nodo)}
  else if(nodo.nodeType===1){
    var tg=nodo.tagName.toLowerCase();if(tg==='svg'||tg==='input'||tg==='textarea')return;
    if(nodo.classList.contains('hl-m')){var k2=++semilla;vestir(nodo,k2);letras(nodo,k2);return}
    [].slice.call(nodo.childNodes).forEach(aPluma)}}

/* ---------- trazos de pluma: subrayado, tachadura, renglón, óvalo y la mancha del modo discreto ---------- */
function linea(sem,grueso){
  var r=azar(sem),k=5,arr=[],aba=[];
  for(var i=0;i<=k;i++){var x=1+98*i/k,y=5+(r()-.5)*3.4,g=(.5+1.5*Math.pow(Math.sin(Math.PI*(i/k)),.7))*(.7+r()*.6)*(grueso||1);arr.push([x,y-g/2]);aba.push([x,y+g/2])}
  return arr.map(function(q,i){return i?'S '+(q[0]-8).toFixed(1)+' '+(q[1]+(r()-.5)*1.6).toFixed(1)+', '+q[0].toFixed(1)+' '+q[1].toFixed(1):'M '+q[0].toFixed(1)+' '+q[1].toFixed(1)}).join(' ')
    +' '+aba.reverse().map(function(q){return 'L '+q[0].toFixed(1)+' '+q[1].toFixed(1)}).join(' ')+'z';
}
function trazo(sem,rojo){return '<svg class="hl-trazo" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="'+linea(sem)+'" style="fill:var('+(rojo?'--hl-trazo-rojo':'--hl-trazo')+')"/></svg>'}
function tachadura(sem){return '<svg class="hl-tacha" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="'+linea(sem,.8)+'" style="fill:var(--hl-trazo)" transform="rotate(-3 50 5)"/></svg>'}
function renglonSvg(sem){return '<svg class="hl-raya" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="'+linea(sem,.45)+'" style="fill:var(--hl-trazo)"/></svg>'}
/* el óvalo de tinta alrededor de lo elegido: una vuelta y un poco más, que no cierra justo */
function ovalo(sem){
  var r=azar(sem),p=[],k=26,i;for(i=0;i<=k;i++){var a=-2.3+i/k*7.1,rx=50+(r()-.5)*3,ry=45+(r()-.5)*3;p.push([50+Math.cos(a)*rx,50+Math.sin(a)*ry])}
  var d='M'+p[0][0].toFixed(1)+' '+p[0][1].toFixed(1);for(i=1;i<p.length-1;i++){var q=p[i+1];d+=' Q'+p[i][0].toFixed(1)+' '+p[i][1].toFixed(1)+' '+((p[i][0]+q[0])/2).toFixed(1)+' '+((p[i][1]+q[1])/2).toFixed(1)}
  return '<svg class="hl-ovalo" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="'+d+'" fill="none" style="stroke:var(--hl-trazo)" stroke-width="2.2" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
}
function mancha(sem){
  var r=azar(sem),k=22,pts=[],i;
  for(i=0;i<k;i++){var a=i/k*6.283,rad=.78+r()*.22+(r()<.16?.16:0);pts.push([50+Math.cos(a)*46*rad,50+Math.sin(a)*42*rad])}
  var d='M'+((pts[0][0]+pts[k-1][0])/2).toFixed(1)+' '+((pts[0][1]+pts[k-1][1])/2).toFixed(1);
  for(i=0;i<k;i++){var p=pts[i],q=pts[(i+1)%k];d+=' Q'+p[0].toFixed(1)+' '+p[1].toFixed(1)+' '+((p[0]+q[0])/2).toFixed(1)+' '+((p[1]+q[1])/2).toFixed(1)}
  var gotas='';for(i=0;i<3;i++){var b=r()*6.283;gotas+='<ellipse cx="'+(50+Math.cos(b)*49).toFixed(1)+'" cy="'+(50+Math.sin(b)*47).toFixed(1)+'" rx="'+(1+r()*1.6).toFixed(1)+'" ry="'+(2+r()*3).toFixed(1)+'"/>'}
  var c=getComputedStyle(raiz),c1=c.getPropertyValue('--hl-cargada').trim(),c2=c.getPropertyValue('--hl-tinta-agua').trim();
  var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><radialGradient id="g"><stop offset=".5" stop-color="'+c1+'"/><stop offset="1" stop-color="'+c2+'"/></radialGradient></defs><g fill="url(#g)"><path d="'+d+'z"/>'+gotas+'</g></svg>';
  return 'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")'}
var MANCHAS=null;
var FLOR='<svg class="hl-adorno" viewBox="0 0 220 24" aria-hidden="true"><use href="#hl-floritura"/></svg>',ADORNITO='<svg class="hl-adornito" viewBox="0 0 100 18" aria-hidden="true"><use href="#hl-adornito"/></svg>';
var MANO='<svg class="hl-mano" viewBox="0 0 26 14" aria-hidden="true"><g fill="none" style="stroke:var(--hl-trazo-rojo)" stroke-width="1.1" stroke-linejoin="round"><path d="M1 4.2 L5.4 3.8 L5.6 10.6 L1.2 10.2z"/><path d="M5.6 4.2 C 7.6 3, 9.6 2.6, 12 3.4 L 23.4 3.6 C 25 3.7, 25 5.5, 23.4 5.6 L 14.4 5.8 C 15.6 6.4, 15.6 7.6, 14.2 7.8 C 15.4 8.4, 15.2 9.6, 13.8 9.8 C 14.6 10.6, 14 11.6, 12.6 11.6 L 8.6 11.4 C 7.2 11.4, 6.2 11, 5.6 10.4z"/><path d="M14.4 5.8 L 11.6 5.9 M14.2 7.8 L 11.4 7.9 M13.8 9.8 L 11 9.8" stroke-width=".8" stroke-linecap="round"/></g></svg>';

/* ---------- las cifras tachadas que se ven hasta mañana (en este aparato) ---------- */
var TK='pa-hl-tachado';
function tachados(){try{var o=JSON.parse(localStorage.getItem(TK)||'{}');return o&&typeof o==='object'?o:{}}catch(x){return {}}}
function anotarTachado(clave,v){var o=tachados(),t=today();Object.keys(o).forEach(function(k){if(!vigente(o[k],t))delete o[k]});o[clave]={v:v,f:t};try{localStorage.setItem(TK,JSON.stringify(o))}catch(x){}}
function tachadoDe(clave){var r=tachados()[clave];return vigente(r,today())?r.v:null}

/* ---------- las piezas de la hoja ---------- */
/* una cifra (en discreto, una mancha); «nuevo» marca la que se acaba de escribir (se escribe de a una letra) */
function m(v,clase,nuevo){return '<span class="hl-cifra '+(clase||'hl-fuerte')+'"'+(nuevo?' data-nuevo="'+e(nuevo)+'"':'')+'><span class="hl-m">'+e(money(v))+'</span></span>'}
function mm(v){return '<span class="hl-m">'+e(money(v))+'</span>'}
/* la cifra de antes, chica y tachada (hasta mañana) */
function viejo(clave){var v=tachadoDe(clave);return v==null?'':' <span class="hl-antes hl-nota hl-suave" aria-label="antes: '+e(money(v))+'"><span class="hl-m">'+e(money(v))+'</span></span>'}
function error(){return edit&&edit.err?'<p class="hl-nota hl-cur hl-rojo hl-err" role="alert">'+e(edit.err)+'</p>':''}
function acciones(si,no){return '<p class="hl-acciones hl-nota">'+puntos([b(si||'anotar',{a:'anotar'}),b(no||'dejar',{a:'dejar'})])+'</p>'}

/* ---------- cambiar un dato: la cifra vieja tachada y un renglón debajo ---------- */
function formDato(lab,valor){
  return '<div class="hl-form" data-form="'+edit.tipo+'"><p class="hl-renglon">'+e(lab)+' <span class="hl-cifra hl-fuerte hl-tachada"><span class="hl-m">'+e(money(valor))+'</span>'+tachadura(71)+'</span></p>'
    +renglon('hl-in-valor','¿Cuánto '+(edit.tipo==='ahorro'?'querés guardar':'tenés ahora')+'?',edit.valor,'UYU')
    +'<p class="hl-nota hl-cur hl-suave hl-guia" aria-live="polite">'+(edit.err?'':e(edit.nota||''))+'</p>'
    +error()+acciones()+'</div>';
}
/* ---------- anotar o corregir un gasto ---------- */
function diasDe(f){var t=today(),ay=iso(addDays(parse(t),-1)),an=iso(addDays(parse(t),-2));
  if(f)return f.map(function(x){var d=parse(x[0]);return [x[0],x[0]===t?'hoy':x[0]===ay?'ayer':DIA[d.getDay()]+' '+d.getDate()]});
  return [[t,'hoy'],[ay,'ayer'],[an,'anteayer']]}
function formGasto(){
  var st=ctx.state,E=edit,cats=nombresVisibles(st);if(E.cat&&cats.indexOf(E.cat)<0)cats=cats.concat([E.cat]);
  var h='<div class="hl-form" data-form="gasto">';
  if(E.id){var g=gastoDe(E.id);if(g)h+='<p class="hl-renglon">Corregir '+(g.nota?'«'+e(g.nota)+'» ':'')+'<span class="hl-cifra hl-fuerte hl-tachada"><span class="hl-m">'+e(money(g.monto))+'</span>'+tachadura(73)+'</span></p>'}
  h+=renglon('hl-in-monto','¿Cuánto gastaste?',E.monto,E.moneda,null,'¿cuánto?');
  if(cotizacion(st)>0||E.moneda==='USD')h+=opciones('moneda','En qué moneda',[['UYU','pesos'],['USD','dólares']],E.moneda);
  h+=renglon('hl-in-nota','¿En qué?',E.nota,null,'hl-campo-texto','¿en qué?');
  /* las cinco categorías que más usás (y la elegida); «otras» muestra todas */
  var todas=cats;if(!E.todas){var usos={},desde=iso(addDays(parse(today()),-90));st.gastos.forEach(function(g){if(g.fecha>=desde){var c=catDe(g);usos[c]=(usos[c]||0)+1}});
    cats=cats.slice().sort(function(a,c){return (usos[c]||0)-(usos[a]||0)}).slice(0,5);if(E.cat&&cats.indexOf(E.cat)<0)cats[cats.length-1]=E.cat;cats=todas.filter(function(c){return cats.indexOf(c)>=0})}
  h+=opciones('cat','Categoría',cats.map(function(c){return [c,c.toLowerCase()]}),E.cat).replace(/<\/p>$/,(!E.todas&&todas.length>cats.length?'<span class="hl-pt" aria-hidden="true">·</span>'+b('ver todas',{a:'cats-todas',lab:'Ver todas las categorías'}):'')+'</p>');
  h+=opciones('fecha','Qué día',E.fechas,E.fecha);
  if(num(st.plan.compras)>0||E.sobre)h+=opciones('sobre','De qué plata',[['','de la semana'],['compras','del sobre de compras']],E.sobre||'');
  return h+error()+acciones(E.id?'corregir':'anotar')+'</div>';
}
function formDictar(){
  return '<div class="hl-form" data-form="dictar"><p class="hl-nota hl-cur hl-suave">'+(edit.oye?'te escucho…':'decilo o escribilo: «gasté 850 en el súper»')+'</p>'
    +renglon('hl-in-dicta','Lo que gastaste',edit.texto,null,'hl-campo-texto')
    +error()+(edit.mic?'<p class="hl-nota">'+b('usar el micrófono de siempre',{p:'#mic'})+'</p>':'')+acciones('entender','dejar')+'</div>';
}
function gastoDe(id){return ctx.state.gastos.filter(function(g){return g.id===id})[0]||null}
/* un gasto en el libro de cuentas: qué, a la izquierda; cuánto, a la derecha. Tocarlo lo corrige; al lado, «tachar» */
function filaGasto(g){
  if(tachar===g.id)return '<li class="hl-fila"><span class="hl-q">¿Lo tachamos?</span><span class="hl-nota">'+puntos([b('sí',{a:'tachar-si',v:g.id}),b('no',{a:'tachar-no'})])+'</span></li>';
  var nuevo=recien==='g:'+g.id;
  return '<li class="hl-fila"><button class="hl-toc hl-q" type="button" data-a="corregir" data-v="'+e(g.id)+'" aria-label="Corregir '+e(g.nota||'el gasto')+', '+e(money(g.monto))+'">'+(g.nota?e(g.nota):'<span class="hl-cur hl-suave">sin detalle</span>')+'</button>'
    +'<span class="hl-cifra hl-fuerte"'+(nuevo?' data-nuevo="1"':'')+'><span class="hl-m">'+e(g.usd?usd(g.usd):money(g.monto))+'</span></span>'+viejo('g:'+g.id)
    +'<button class="hl-toc hl-sub hl-nota hl-tachar" type="button" data-a="tachar" data-v="'+e(g.id)+'" aria-label="Tachar '+e(g.nota||'el gasto')+'">tachar</button></li>';
}

/* ---------- las páginas ---------- */
function capitulos(D){
  var k=capActual();if(k)return capEspejo(k);
  var H=D.hoy.H,t=D.hoy.t,st=ctx.state,C=[],x=[];
  /* ---- i · Hoy ---- */
  var neg=H.queda<0,co=cobro(t,D.hoy.cobro),aqui=edit&&edit.donde==='hoy';
  /* mientras escribís un gasto, lo de hoy queda en una línea (así el renglón entra en la misma hoja) */
  if(aqui&&edit.tipo!=='tenes')x.push('<p class="hl-renglon'+(neg?' hl-rojo':'')+'">'+(neg?'Hoy te pasaste por ':'Hoy podés gastar ')+m(Math.abs(H.queda),neg?'hl-rojo':'hl-fuerte')+'</p>');
  else{
    x.push('<p'+(neg?' class="hl-rojo"':'')+'>'+(neg?'Hoy te pasaste por':'Hoy podés gastar')+'</p>');
    x.push('<p class="hl-heroe '+(neg?'hl-rojo':'hl-cargada')+'" data-gotas="1"><span class="hl-m">'+e(money(Math.abs(H.queda)))+'</span></p>');
  }
  if(aqui){x.push(edit.tipo==='gasto'?formGasto():edit.tipo==='dictar'?formDictar():formDato('Tenés',D.plata.tenes))}
  else{
    x.push('<p class="hl-nota">'+(D.hoy.anota?puntos([b('anotar un gasto',{a:'gasto'}),b('dictar',{a:'dictar',lab:'Dictar un gasto'})]):b('actualizar',{a:'tenes',v:'hoy',lab:'Actualizar cuánta plata tenés'}))+'</p>');
    x.push(FLOR);
    x.push('<p class="hl-renglon">'+e(co.lab)+' <span class="hl-cifra hl-oro" data-gotas="1" style="position:relative">'+e(co.cifra)+'</span></p>'
      +'<p class="hl-nota hl-cur hl-suave">el '+e(fechaLarga(D.hoy.cobro))+'</p>');
    var resto=D.hoy.resto;
    x.push('<p class="hl-renglon hl-bloque'+(resto<0?' hl-rojo':'')+'">'+(resto<0?'Te pasaste del plan por ':'Hasta el cobro, ')+m(Math.abs(resto),resto<0?'hl-rojo':'hl-fuerte')+'</p>');
    /* el día de cobro: se terminó el capítulo (el pacto nuevo, por ahora, como siempre) */
    if(cicloTerminado(st,t)){var ft=$('#fin-t'),fn=document.querySelector('#cierre-aviso .fin-n');
      x.push(FLOR,'<h2 class="hl-titulo hl-rojo">'+e(ft?ft.textContent:'Se terminó este capítulo')+'</h2>'+(fn?'<p class="hl-renglon">'+e(fn.textContent)+'</p>':'')
        +'<p class="hl-nota hl-bloque">'+puntos([b('empezar un pacto nuevo',{p:'#ciclo-nuevo'}),b('cerrarlo a mano',{p:'#cierre-ir'})])+'</p>')}
    else if(H.dentro){
      x.push(FLOR);
      x.push('<h2 class="hl-titulo hl-rojo">Esta semana</h2>'+ADORNITO);
      var mismo=Math.round(H.semanaQueda)===Math.round(resto);
      if(H.semanaQueda<0)x.push('<p class="hl-renglon hl-rojo">Esta semana te pasaste por '+m(-H.semanaQueda,'hl-rojo')+'</p>');
      else if(!mismo)x.push('<p class="hl-renglon">Te quedan '+m(H.semanaQueda)+' hasta el '+e(diaNombre(H.fin))+'</p>');
      var aj=D.hoy.ajuste;
      if(aj&&aj.estado==='minimo')x.push('<p class="hl-nota hl-cur hl-suave hl-bloque">El objetivo ya no se alcanza: esto cuida tu mínimo de '+mm(aj.minimo)+'.</p>');
      if(aj&&aj.estado==='nada')x.push('<p class="hl-nota hl-cur hl-rojo hl-bloque">Para tu mínimo faltan '+mm(aj.falta)+' aunque no gastes nada más.</p>');
      x.push('<p class="hl-dias hl-nota hl-suave" aria-label="Los días que quedan de la semana">'+diasSemana(t,H.dias).map(function(d,i){return i?'<span>'+e(d)+'</span>':'<span class="hl-hoy hl-fuerte">'+e(d)+'</span>'}).join('<span aria-hidden="true">·</span>')+'</p>');
    }else x.push('<p class="hl-nota hl-cur hl-suave hl-bloque">Hoy está fuera de las fechas de tu plan.</p>');
    /* lo anotado hoy, como en un libro de cuentas; y lo de siempre, con un toque */
    if(D.hoy.anota){
      var hoyG=st.gastos.filter(function(g){return g.fecha===t});
      if(hoyG.length)x.push('<p class="hl-cabeza hl-libro hl-suave hl-bloque">anotado hoy</p><ol class="hl-libroc">'+hoyG.map(filaGasto).join('')+'</ol>');
      var fr=frecuentes(st.gastos,t,3);
      if(fr.length)x.push('<p class="hl-nota hl-bloque"><span class="hl-cur hl-suave">con un toque: </span>'+puntos(fr.map(function(f,i){return b(f.nota+' '+(f.usd?usd(f.usd):money(f.monto)),{a:'frecuente',v:i,lab:'Anotar '+f.nota+', '+(f.usd?usd(f.usd):money(f.monto))})}))+'</p>');
    }
  }
  C.push({id:'hoy',titulo:'',bloques:x,min:.04});

  /* ---- ii · Tus semanas ---- */
  var S=D.semanas,pc=planNow(),ay=iso(addDays(parse(t),-1)),ps=st.plan.sobranteSemana||{};
  if(S&&S.ws.length){
    x=[];
    if(S.varias)x.push(opciones('reparto','Cómo repartir',[['parejo','parejo'],['recomendado','optimizado']],S.rec?'recomendado':'parejo')
      +'<p class="hl-nota hl-cur hl-suave">'+(S.rec?'menos al principio, más al final':'igual todos los días')+'</p>');
    S.ws.forEach(function(w){
      var W=pc.weeks[w.i],repaso=W&&w.i<pc.weeks.length-1&&(W.end===t||W.end===ay)&&W.left>0&&!ps[W.start];
      x.push('<ol class="hl-cuentas"><li><button class="hl-sem hl-toc" type="button" data-a="semana" data-v="'+w.i+'" aria-label="Semana '+(w.i+1)+', '+e(w.fechas)+': '+e(money(w.budget))+', '+e(w.lab)+'. Abrirla">'
        +'<span class="hl-rom hl-libro">'+romano(w.i+1)+'</span>'+(w.cur?MANO:'')+'<span>'+e(w.fechas)+'</span>'
        +'<span class="hl-cifra '+(w.past?'hl-suave':'hl-fuerte')+'"><span class="hl-m">'+e(money(w.budget))+'</span></span>'
        +'<span class="hl-det hl-nota '+(w.over?'hl-rojo':'hl-suave')+'">'+(w.pct!=null?w.pct+' % · ':'')+e(w.lab)+(w.cur?' · hoy':'')+'</span></button></li></ol>'
        +(repaso?'<p class="hl-nota hl-cur hl-bloque">Te '+(W.end===t?'van sobrando':'sobraron')+' '+mm(W.left)+'. ¿A dónde van?</p>'
          +opciones('sobsem','A dónde va lo que sobró',[['siguiente','a la semana que viene'],['ahorro','al ahorro']],null,function(o){return 'data-sobsem="'+e(W.start)+'" data-val="'+e(o[0])+'"'}):''));
    });
    C.push({id:'semanas',titulo:'Tus semanas',bloques:x});
  }

  /* ---- iii · Tu plata ---- */
  var P=D.plata;x=[];
  if(edit&&edit.donde==='plata')x.push(edit.tipo==='ahorro'?formDato('Guardás',P.ahorro):formDato('Tenés',P.tenes));
  else{
    x.push('<div class="hl-cta"><p class="hl-par"><span>Tenés</span>'+m(P.tenes,'hl-fuerte','tenes')+viejo('tenes')+'</p><p class="hl-nota hl-der">'+b('actualizar',{a:'tenes',v:'plata',lab:'Actualizar lo que tenés'})+'</p></div>'
      +(P.cuando&&P.cuando!=='actualizar'?'<p class="hl-nota hl-cur hl-suave hl-izq">'+e(P.cuando)+'</p>':''));
    x.push('<div class="hl-cta hl-bloque"><p class="hl-par"><span>Guardás</span>'+m(P.ahorro,'hl-fuerte','ahorro')+viejo('ahorro')+'</p><p class="hl-nota hl-der">'+b('actualizar',{a:'ahorro',lab:'Actualizar lo que guardás'})+'</p></div>');
    if(P.apartado>0)x.push('<div class="hl-cta hl-bloque"><p class="hl-par"><span>Apartado</span>'+m(P.apartado)+'</p><p class="hl-nota hl-der"><span class="hl-cur hl-suave">no se toca · </span>'+b('ver',{p:'#apartado-abrir'})+'</p></div>');
    /* la plata que entra antes del cobro: «¿Te entraron?» (de «Otros cobros del mes», en Fijos) */
    if(num(st.plan.monto)>0&&t<st.plan.cobro)normEsperado(st.plan.esperado).filter(function(q){return q.fecha<=t}).forEach(function(q){
      x.push(FLOR,'<p class="hl-renglon">¿Te entraron '+mm(q.monto)+'?'+(q.nota?' <span class="hl-cur hl-suave">'+e(q.nota)+'</span>':'')+'</p>'
        +'<p class="hl-nota">'+puntos([b('me entró',{a:'entro',v:q.id}),b('no',{a:'noentro',v:q.id})])+'</p>');
    });
  }
  if(st.ejemplo&&!(edit&&edit.donde==='plata'))x.push(FLOR,'<p class="hl-nota hl-cur hl-suave">Son datos de ejemplo · <button class="hl-toc hl-sub" type="button" data-cero>borrarlos</button></p>');
  C.push({id:'plata',titulo:'Tu plata',bloques:x});

  /* ---- iv · Tu plan (y cuando cobres) ---- */
  var T=D.plan;
  if(T){
    x=['<p class="hl-nota hl-cur hl-suave">en qué se reparte tu plata del pacto</p>',
      '<div class="hl-cuenta"><p class="hl-par"><span>Para los fijos</span>'+m(T.fijos)+'</p><p class="hl-par hl-nota hl-suave"><span>'+(!T.hayFijos?'sin cargar':T.pend>0?'faltan pagar '+mm(T.pend):T.fijos>0?'todos pagos':'ninguno antes del cobro')+'</span>'+b(T.hayFijos?'ver':'cargar',{a:'ir',v:'fijos',lab:T.hayFijos?'Ver tus fijos':'Cargar tus fijos'})+'</p>'
      +'<p class="hl-par"><span>Guardás</span>'+m(T.ahorro)+'</p>'
      +'<p class="hl-par"><span>Para gastar</span>'+m(T.gastar)+'</p><p class="hl-par hl-nota hl-suave"><span>ya gastaste</span>'+mm(T.gastaste)+'</p>'
      +'<p class="hl-par hl-suma"><span>En total</span>'+m(T.total)+'</p></div>'];
    if(T.resto<0)x.push('<p class="hl-nota hl-cur hl-rojo hl-bloque">Te pasaste '+mm(-T.resto)+': no llegás a guardar todo.</p>');
    if(Math.round(T.fuera)>0)x.push('<p class="hl-nota hl-cur hl-suave hl-bloque">'+mm(T.fuera)+' en gastos fuera de las fechas del plan no cuentan.</p>');
    /* «Esa meta no se puede» */
    var pl=st.plan,pcc=planCalc(st);
    if(num(pl.monto)>0&&t<pl.cobro){var mx=maxAhorro(st,pcc);if(pcc.ahorroPedido>mx+.5)
      x.push('<p class="hl-nota hl-cur hl-rojo hl-bloque">Esa meta no se puede: con lo que tenés, lo máximo es '+mm(mx)+'.</p>'
        +'<p class="hl-nota">'+puntos([pl.modo==='monto'&&mx>=1?b('guardar '+money(Math.floor(mx)),{a:'meta-bajar',v:Math.floor(mx)}):'',b('cambiar la meta',{a:'ahorro'})])+'</p>')}
    var K=T.cobrar;
    if(K){
      x.push(FLOR,'<p class="hl-cabeza hl-centro hl-libro hl-suave">cuando cobres</p>'+(!K.real||K.aguinaldo?'<p class="hl-nota hl-cur hl-suave">'+(K.real?'':'estimado')+(K.aguinaldo?(K.real?'':', ')+'con aguinaldo':'')+'</p>':'')
        +'<div class="hl-cuenta"><p class="hl-par"><span>Vas a cobrar</span>'+m(K.entra)+'</p>'
        +'<p class="hl-par"><span>Fijos del mes</span>'+m(K.fijos)+'</p>'
        +'<p class="hl-par"><span>Tu meta</span>'+m(K.meta)+'</p>'+(K.metaPedida>K.meta?'<p class="hl-par hl-nota hl-suave"><span>no entra '+mm(K.metaPedida)+'</span></p>':'')
        +'<p class="hl-par hl-suma"><span>Para gastar</span>'+m(Math.max(0,K.libre))+'</p><p class="hl-par hl-nota hl-suave"><span>'+(K.libre>0?mm(K.semana)+' por semana':'no alcanza')+'</span>'+b('ver tu cobro',{a:'ir',v:'sueldo'})+'</p></div>');
      if(K.libre<0)x.push('<p class="hl-nota hl-cur hl-rojo hl-bloque">No te alcanza para la meta: faltan '+mm(-K.libre)+'.</p>');
      if(K.extra)x.push('<p class="hl-nota hl-cur hl-suave hl-bloque">Este mes llevás '+mm(K.extra)+' de horas extra.</p>');
    }
    C.push({id:'plan',titulo:'Tu plan',bloques:x});
  }

  /* ---- la semana abierta: su capítulo ---- */
  if(semana!=null&&pc.weeks[semana])C.push(capSemana(pc,semana,t));
  return C;
}
function rangoCorto(a,b){var x=parse(a),y=parse(b);if(a===b)return x.getDate()+' '+MES[x.getMonth()];return x.getMonth()===y.getMonth()?x.getDate()+'–'+y.getDate()+' '+MES[y.getMonth()]:x.getDate()+' '+MES[x.getMonth()]+' – '+y.getDate()+' '+MES[y.getMonth()]}
function diasDeSemana(w){var d=diasHasta(w.start,w.end);return d.length?d:[[w.start,w.start]]}
function capSemana(pc,i,t){
  var w=pc.weeks[i],st=ctx.state,cur=t>=w.start&&t<=w.end,past=t>w.end,fut=t<w.start,over=w.left<0,ult=i===pc.weeks.length-1;
  var rem=cur?diffDays(t,w.end)+1:w.days,perDay=past?null:fut?w.budget/Math.max(w.days,1):Math.max(w.left,0)/Math.max(rem,1),x=[];
  x.push('<p class="hl-nota hl-cur hl-suave">'+e(rangoCorto(w.start,w.end))+(cur?' · esta semana':past?' · ya pasó':' · todavía no empezó')+'</p>');
  x.push('<div class="hl-cuenta"><p class="hl-par'+(over?' hl-rojo':'')+'"><span>'+(fut&&!over?'Para gastar':over?'Te pasaste por':past?'Te sobró':'Te quedan')+'</span>'+m(fut&&!over?w.budget:Math.abs(w.left),over?'hl-rojo':'hl-fuerte')+'</p>'
    +(past?'<p class="hl-par"><span>Tenías</span>'+m(w.avail)+'</p>':'<p class="hl-par"><span>Por día'+(cur?' hasta el '+e(diaNombre(w.end)):'')+'</span>'+m(perDay)+'</p>')
    +'<p class="hl-par"><span>Gastaste</span>'+m(w.spent)+'</p></div>');
  if(past&&!over&&w.left+(w.alAhorro||0)>0&&!ult){var so=(st.plan.sobranteSemana||{})[w.start]||st.plan.sobrante||'siguiente';
    x.push('<p class="hl-nota hl-cur hl-bloque">Lo que sobró:</p>'+opciones('sobsem','A dónde va lo que sobró',[['siguiente','a la semana siguiente'],['ahorro','al ahorro']],so==='ahorro'?'ahorro':'siguiente',function(o){return 'data-sobsem="'+e(w.start)+'" data-val="'+e(o[0])+'"'}))}
  if(anota()){
    if(edit&&edit.donde==='semana')x.push(edit.tipo==='dictar'?formDictar():formGasto());
    else if(!fut)x.push('<p class="hl-nota hl-bloque">'+puntos([b('anotar un gasto',{a:'gasto',v:'semana'}),b('dictar',{a:'dictar',v:'semana',lab:'Dictar un gasto'})])+'</p>');
    var items=st.gastos.filter(function(g){return g.fecha>=w.start&&g.fecha<=w.end}).sort(function(a,c){return a.fecha<c.fecha?1:a.fecha>c.fecha?-1:(a.id<c.id?1:-1)});
    var dia=null;
    items.forEach(function(g){
      if(g.fecha!==dia){dia=g.fecha;var d=parse(dia);x.push('<p class="hl-cabeza hl-libro hl-suave hl-bloque">'+e((dia===t?'hoy':DIA[d.getDay()])+' '+d.getDate())+'</p>')}
      x.push('<ol class="hl-libroc">'+filaGasto(g)+'</ol>');
    });
    if(!items.length&&!fut)x.push('<p class="hl-nota hl-cur hl-suave hl-bloque">Todavía no anotaste gastos esta semana.</p>');
  }
  x.push('<p class="hl-nota hl-bloque">'+b('volver a Hoy',{a:'volver-hoy'})+'</p>');
  return {id:'semana',titulo:'Semana '+romano(i+1),bloques:x};
}

/* ---------- (2.66) los capítulos leídos de la página de siempre: el prólogo, Ajustes y el perfil ---------- */
function prologoAbierto(){var h=$('#lb-hojas');return !!h&&!h.hidden&&raiz.classList.contains('lb-en-libro')}
function perfilAbierto(){var w=$('#wiz');return !!w&&!w.hidden&&libroEnUso()==='solo'}
function capActual(){return perfilAbierto()?'perfil':prologoAbierto()?'prologo':ctx.ajustesEnLibro&&datos?'ajustes':null}
/* el sello del pacto, a tinta roja */
var SELLO='<svg class="hl-sello" viewBox="0 0 120 120" aria-hidden="true"><g fill="none" style="stroke:var(--hl-trazo-rojo)" stroke-linecap="round"><circle cx="60" cy="60" r="52" stroke-width="3"/><circle cx="60" cy="60" r="44" stroke-width="1.4"/></g>'
  +'<path d="M60 34 L66 52 L85 52 L70 63 L76 82 L60 70 L44 82 L50 63 L35 52 L54 52Z" style="fill:var(--hl-trazo-rojo)" opacity=".9"/></svg>';
function especialProl(x,api){
  /* el cobro: el mes, y sus días como palabras (el elegido con el óvalo; los que ya pasaron no están) */
  if(x.classList.contains('lb-cal')){
    var mes=x.querySelector('.lb-cal-h b'),fila=[];
    [['-1','mes anterior'],['1','mes siguiente']].forEach(function(d){var y=x.querySelector('[data-lb="mes"][data-d="'+d[0]+'"]');if(y&&!y.disabled)fila.push(b(d[1],{ex:api.ctrl({el:y,tipo:'btn'})}))});
    api.poner('<p class="hl-cabeza hl-centro hl-libro">'+e(mes?mes.textContent:'')+'</p>'+(fila.length?'<p class="hl-acciones hl-nota">'+puntos(fila)+'</p>':''));
    /* los días cerca del sugerido (o del elegido); cualquier otro, escribiendo el número */
    var dias=[].filter.call(x.querySelectorAll('.lb-dia'),function(y){return !y.disabled}),ref=x.querySelector('.lb-dia[aria-pressed="true"]')||x.querySelector('.lb-dia.sug')||dias[0],i0=Math.max(0,dias.indexOf(ref)-3);
    var sel=null,lista=dias.slice(i0,i0+7).map(function(y){var k=api.ctrl({el:y,tipo:'btn'});if(y.getAttribute('aria-pressed')==='true')sel='x'+k;var dl=y.getAttribute('aria-label')||'';return ['x'+k,dl.split(' ')[0].slice(0,3)+' '+y.textContent.trim()]});
    if(lista.length)api.poner(opciones('ex','El día que cobrás',lista,sel));
    var kd=api.ctrl({tipo:'dia',el:x,dias:dias});
    api.poner('<p class="hl-nota hl-cur hl-suave">otro día de '+e(mes?mes.textContent.split(' ')[0]:'este mes')+':</p>'+renglon('hl-ex-'+kd,'Otro día del mes','','num',null,'día',' data-ex="'+kd+'"'));
    return true;
  }
  /* la firma: con el pacto sellado, el sello a tinta roja */
  if(x.classList.contains('lb-firma')){var t=x.querySelector('.lb-sellado');if(x.querySelector('.lb-sello.puesto'))api.poner('<div class="hl-firma">'+SELLO+(t&&t.textContent?'<p class="hl-nota hl-cur">'+e(t.textContent)+'</p>':'')+'</div>');return true}
  /* el deslizador del ahorro no va: está el renglón y las opciones */
  if(x.classList.contains('lb-rango'))return true;
  return false;
}
function capEspejo(k){
  EX=[];
  if(k==='prologo'){
    var pos=prologoPos(),pag=document.querySelector('#lb-pila .lb-pag:last-child'),C=[];
    var r=pag?espejo(pag,{ctrls:EX,saltar:'.lb-folio,.lb-brote,.lb-cal-ley,.lb-cap,.lb-letra-in>#lb-letra-plan:empty',especial:especialProl}):{bloques:[]};
    EXraiz=pag;
    for(var i=0;i<pos.total;i++)C.push({id:'pro-'+i,titulo:'',bloques:i===pos.idx?r.bloques:[],cabeza:pos.modo==='ciclo'?'pacto nuevo':'prólogo'});
    return C;
  }
  if(k==='perfil'){var box=$('#wiz-box'),r2=espejo(box,{ctrls:EX,saltar:'.wiz-dots'});EXraiz=box;return [{id:'perfil',titulo:'Mi perfil',bloques:r2.bloques,cabeza:'mi perfil'}]}
  /* Ajustes: un capítulo por grupo («Tu libro», «Sonido»…); las categorías van con «Tus gastos» */
  var aj=$('#p-ajustes'),G0=[],act=null;EXraiz=aj;
  [].forEach.call(aj.children,function(x){
    if(x.matches('.panel-head,.aj-ind'))return;
    if(x.matches('h3.aj-grupo')){act={id:'aj-'+G0.length,titulo:x.textContent.trim(),el:[]};G0.push(act);return}
    if(x.id==='aj-g-app'){act={id:'aj-'+G0.length,titulo:'Sobre la app',el:[]};G0.push(act)}
    if(!act){act={id:'aj-0',titulo:'Ajustes',el:[]};G0.push(act)}
    act.el.push(x);
    if(x.id==='aj-anotar'){var c=$('#aj-cats');if(c)act.el.push(c)}
  });
  var C2=G0.map(function(g){
    var falso={childNodes:g.el,ownerDocument:document,querySelector:function(q){return aj.querySelector(q)||document.querySelector(q)}};
    var r=espejo(falso,{ctrls:EX,forzar:'#plan-aj-casa',saltar:'#aj-tour,.field:has(.cat-ic),.cat-ic,#exp-close,#aj-g-app>h2,.aj-sobre>h2'});
    if(g.id==='aj-0')r.bloques.push('<p class="hl-nota">'+b('¿cómo se usa este libro?',{a:'cap',v:'aj-como'})+'</p>');
    return {id:g.id,titulo:g.titulo,bloques:r.bloques,cabeza:'ajustes'};
  });
  C2.push({id:'aj-como',titulo:'Cómo se usa este libro',cabeza:'ajustes',bloques:[
    '<p class="hl-renglon">Pasá la hoja con el dedo, o tocando la esquina de abajo.</p>',
    '<p class="hl-renglon hl-bloque">Lo subrayado se toca. Lo que tiene un óvalo es lo elegido.</p>',
    '<p class="hl-renglon hl-bloque">Para cambiar una cifra, tocá «actualizar»: la vieja se tacha y escribís la nueva.</p>',
    '<p class="hl-renglon hl-bloque">Arriba, sobre la mesa: ocultar los montos, herramientas, ajustes y volver.</p>',
    FLOR,'<p class="hl-nota">'+b('volver a Hoy',{a:'aj-cerrar'})+'</p>']});
  return C2;
}
function abrirAjustes(){parar();edit=null;tachar=null;ctx.ajustesEnLibro=true;irPrimera=true;ctx.renderAll()}
function cerrarAjustes(){ctx.ajustesEnLibro=false;irPrimera=true;ctx.renderAll()}
/* la página de siempre cambió (otra pregunta, un botón, un aviso): se vuelve a leer; si cambió de pregunta, se pasa la hoja */
function programar(){clearTimeout(reloj);reloj=setTimeout(refrescar,50)}
function refrescar(){
  montar();mostrar();if(!activo())return;
  var a=document.activeElement;if(a&&el.contains(a)&&a.matches('.hl-input')){trasFoco=true;return}
  if(G){pendiente=true;return}
  var k=capActual(),pos=k==='prologo'?prologoPos():null,tit=$('#wiz-t');
  var marca=(k||'hoy')+':'+(pos?pos.idx:k==='perfil'?(tit?tit.textContent:''):'');
  var pasa=!el.hidden&&PAGS.length&&k&&k===capVieja&&marcaVieja!=null&&marca!==marcaVieja&&(k==='prologo'||k==='perfil');
  var dir=pos?(pos.idx>=idxViejo?1:-1):1,pre=pasa?{viejo:limpiaIds(vista.cloneNode(true)),geo:geo}:null;
  if(k!==capVieja)irPrimera=true;
  capVieja=k;marcaVieja=marca;idxViejo=pos?pos.idx:0;
  armar();
  if(pre){
    if(quieto()||!pre.geo){pre.viejo.className='hl-vista hl-viejo';mesa.appendChild(pre.viejo);if(pre.viejo.animate)pre.viejo.animate([{opacity:1},{opacity:0}],{duration:300}).onfinish=function(){pre.viejo.remove()};else pre.viejo.remove();return}
    var g=crearGiro(dir,pre);if(g){G=g;animar(g,0,1,600,terminar(g,true))}
  }
}

/* ---------- armar el libro ---------- */
function montar(){
  if(el)return;
  el=document.createElement('div');el.className='hl';el.id='hoy-libro';el.hidden=true;
  el.innerHTML='<div class="hl-vista"><img class="hl-fondo" alt="" aria-hidden="true"><div class="hl-luz" aria-hidden="true"></div><div class="hl-pags"></div></div>'
    +'<nav class="hl-acc" aria-label="Acciones">'+['<button type="button" data-p="#discreto" class="hl-ocultar">ocultar</button>','<button type="button" data-p="#herr-abrir">herramientas</button>','<button type="button" data-a="ajustes" class="hl-ajustes">ajustes</button>','<button type="button" data-p="#libro-cerrar">volver</button>'].join('<span class="hl-pt" aria-hidden="true">·</span>')+'</nav>'
    +'<button class="hl-esq" type="button" data-esq="-1" aria-label="Volver una página"></button><button class="hl-esq" type="button" data-esq="1" aria-label="Pasar la hoja"></button>'
    +'<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'
    +'<g id="hl-floritura" style="fill:var(--hl-trazo)"><path d="M4 12.8 C 26 11, 44 5.6, 62 9.6 C 72 11.8, 80 16, 90 13.4 C 82 17.8, 71 14.8, 61 11.8 C 44 7.4, 26 13.6, 4 12.8z"/><path d="M216 11.6 C 194 12.4, 176 6.8, 158 9.4 C 148 11.2, 140 15.2, 130 13.6 C 138 17.2, 149 14.2, 159 11.4 C 176 8.4, 194 12.6, 216 11.6z"/><path d="M62 9.6 C 64 3.2, 74 2.6, 75 8 C 75.6 12, 69.6 12.6, 69.4 9 C 69.4 7.4, 71.2 6.8, 71.8 8 C 71.2 7.6, 70.4 8, 70.6 9 C 71 11, 74 10.4, 73.8 8 C 73.4 4.4, 66 4.6, 62 9.6z"/><path d="M158 9.4 C 156 3.2, 146 2.6, 145 8 C 144.4 12, 150.4 12.6, 150.6 9 C 150.6 7.4, 148.8 6.8, 148.2 8 C 148.8 7.6, 149.6 8, 149.4 9 C 149 11, 146 10.4, 146.2 8 C 146.6 4.4, 154 4.6, 158 9.4z"/><path d="M110 5.4 C 112.4 9, 114.4 10.6, 117.4 12 C 114.4 13.4, 112.4 15, 110 18.6 C 107.6 15, 105.6 13.4, 102.6 12 C 105.6 10.6, 107.6 9, 110 5.4z" style="fill:var(--hl-trazo-oro)"/><circle cx="97" cy="12.8" r="1.3"/><circle cx="123" cy="12.4" r="1.2"/></g>'
    +'<g id="hl-adornito" style="fill:var(--hl-trazo-rojo)"><path d="M6 10 C 20 9, 30 5.4, 40 8.6 C 44 9.8, 46 11.6, 48 11 C 44 13.4, 38 10.8, 32 10 C 22 8.8, 14 11, 6 10z"/><path d="M94 9.6 C 80 10.4, 70 6, 60 8.4 C 56 9.4, 54 11.2, 52 10.8 C 56 13, 62 10.6, 68 10 C 78 9, 86 10.6, 94 9.6z"/><path d="M50 4.4 C 51.6 7, 53 8.2, 55 9.4 C 53 10.6, 51.6 11.8, 50 14.4 C 48.4 11.8, 47 10.6, 45 9.4 C 47 8.2, 48.4 7, 50 4.4z" style="fill:var(--hl-trazo-oro)"/></g>'
    +'</defs></svg>';
  document.body.appendChild(el);
  var v=document.createElement('button');v.className='hl-volver';v.id='hl-volver';v.type='button';v.hidden=true;v.textContent='Volver al libro';
  v.addEventListener('click',function(){salirClasico()});document.body.appendChild(v);
  mesa=el;vista=el.querySelector('.hl-vista');img=el.querySelector('.hl-fondo');luz=el.querySelector('.hl-luz');
  tintas();MANCHAS=[3,11,19,29,41].map(mancha);
  el.addEventListener('click',clic);
  el.addEventListener('input',escribe);
  el.addEventListener('change',function(ev){var t=ev.target;if(t.matches('.hl-input[data-ex]'))escribir(EX,t.getAttribute('data-ex'),t.value,true)});
  el.addEventListener('keydown',function(ev){if(ev.key==='Enter'&&ev.target.matches('.hl-input[data-ex]')){ev.preventDefault();var ki=ev.target.getAttribute('data-ex');ev.target.blur();trasFoco=false;confirmar(EX,ki,EXraiz);programar();return}if(ev.key==='Enter'&&ev.target.matches('.hl-input')){ev.preventDefault();accion('anotar',null)}if(ev.key==='Escape'&&edit){ev.preventDefault();accion('dejar',null)}});
  el.addEventListener('focusin',function(){setTimeout(subir,60)});
  el.addEventListener('focusout',function(){setTimeout(function(){subir();if(trasFoco&&!(el.contains(document.activeElement)&&document.activeElement.matches('.hl-input'))){trasFoco=false;programar()}},60)});
  if(window.visualViewport)visualViewport.addEventListener('resize',subir);
  el.querySelectorAll('[data-esq]').forEach(function(x){x.addEventListener('click',function(){if(!arrastro)ir(n+Number(x.getAttribute('data-esq')))})});
  iniciarDedo();
  /* (al abrirse el teclado cambia el alto: no se rearma, se corre la mesa para que el renglón quede a la vista) */
  addEventListener('resize',function(){if(activo()&&!G&&!(edit&&mesa.clientWidth===anchoArmado))armar()});
  addEventListener('orientationchange',function(){setTimeout(function(){if(activo()&&!G)armar()},80)});
  document.addEventListener('keydown',function(ev){if(!activo()||G||edit||ev.target.matches&&ev.target.matches('input,textarea'))return;if(ev.key==='ArrowRight')ir(n+1);if(ev.key==='ArrowLeft')ir(n-1)});
  /* lo que pide la página clásica: el formulario de «lo que tenés» (si lo abre otra parte de la app) y el tour */
  var mo=new MutationObserver(function(){revisar()});
  var sc=$('#saldo-card');if(sc)mo.observe(sc,{attributes:true,attributeFilter:['hidden']});
  mo.observe(document.body,{childList:true});
  /* el aviso con «deshacer» se escribe al pie de la hoja */
  /* (2.66) Ajustes: si cambia la página de siempre, se vuelve a leer */
  var oa=new MutationObserver(function(){if(capActual()==='ajustes')programar()});
  ['#p-ajustes','#aj-cats'].forEach(function(q){var x=$(q);if(x)oa.observe(x,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','aria-pressed','disabled','class','open']})});
  var ts=$('#toast');if(ts)new MutationObserver(leerAviso).observe(ts,{attributes:true,attributeFilter:['hidden'],childList:true,characterData:true,subtree:true});
}
/* el teclado tapa la parte de abajo: la mesa sube lo justo para que el renglón se vea */
function subir(){
  if(!vista)return;var a=document.activeElement,d=0;
  if(a&&el.contains(a)&&a.matches('.hl-input')){var alto=window.visualViewport?visualViewport.height:innerHeight,r=a.getBoundingClientRect(),cur=parseFloat(vista.dataset.sube||'0');
    d=Math.max(0,r.bottom+cur+24-alto);}
  vista.dataset.sube=String(d);vista.style.transform=d?'translateY('+(-d).toFixed(0)+'px)':'';
}
function leerAviso(){
  var ts=$('#toast');if(!ts)return;
  if(ts.hidden){if(pie){pie=null;ponerPie()}return}
  var bt=ts.querySelector('button'),sp=ts.querySelector('span');
  pie={txt:(bt?(sp?sp.textContent:''):ts.textContent).trim(),btn:bt?bt.textContent.trim():''};ponerPie();
}
function ponerPie(){
  if(!el)return;el.querySelectorAll('.hl-pie').forEach(function(x){x.remove()});
  var pg=PAGS[n-1];if(!pie||!pg||!pie.txt)return;
  var p=document.createElement('p');p.className='hl-pie hl-nota hl-cur';p.setAttribute('role','status');
  p.innerHTML=e(pie.txt)+(pie.btn?' · <button class="hl-toc hl-sub" type="button" data-a="pie">'+e(pie.btn.toLowerCase())+'</button>':'');
  pg.appendChild(p);aPluma(p);p.querySelectorAll('.hl-sub').forEach(function(x){x.insertAdjacentHTML('beforeend',trazo(301,false))});
  if(discreto.on)p.querySelectorAll('.hl-w').forEach(function(w){if(/\d/.test(w.textContent)){w.classList.add('hl-m','hl-tapada');w.style.setProperty('--mancha',MANCHAS[0])}});
  curvar(pg,pg.offsetWidth);
}

/* ---------- los toques ---------- */
function clic(ev){
  var x=ev.target.closest('button');if(!x||!el.contains(x))return;
  var op=x.getAttribute('data-op');
  if(op==='ex'){tocarEx(x.getAttribute('data-v'));return}
  if(op){elegir(op,x.getAttribute('data-v'),x);return}
  if(x.hasAttribute('data-ex')){tocarEx(x.getAttribute('data-ex'));return}
  var a=x.getAttribute('data-a');
  if(a){accion(a,x.getAttribute('data-v'));return}
  if(x.hasAttribute('data-cero'))return;  /* lo maneja app.js (borrar el ejemplo) */
  var p=x.getAttribute('data-p'),dest=p?document.querySelector(p):null;
  if(dest)dest.click();
}
/* un control de la página de siempre (algunos se quedan en el libro: Ajustes y su «volver a Hoy») */
function tocarEx(v){
  var m=/^[xcrs]?(\d+)/.exec(String(v)),c=m&&EX[Number(m[1])];if(!c)return;
  if(c.el.matches('[data-goto="ajustes"],[data-ix-go="ajustes"]')){abrirAjustes();return}
  tocar(EX,v);
}
function escribe(ev){
  var t=ev.target;if(t.matches('.hl-input[data-ex]')){escribir(EX,t.getAttribute('data-ex'),t.value,false);return}
  if(!edit)return;
  if(t.id==='hl-in-valor'){edit.valor=t.value;if(edit.tipo==='tenes'&&!(anota()&&today()<ctx.state.plan.cobro)){var g=el.querySelector('.hl-guia');if(g)g.textContent=t.value===''?'':textoSaldo(String(num(t.value)))}}
  if(t.id==='hl-in-monto')edit.monto=t.value;
  if(t.id==='hl-in-nota'){edit.nota=t.value;if(!edit.catTocada){var c=sugerir(t.value);if(c!==edit.cat){edit.cat=c;pintarOpcion('cat',c)}}}
  if(t.id==='hl-in-dicta')edit.texto=t.value;
}
/* mover el óvalo sin rearmar la hoja (así el teclado no se cierra) */
function pintarOpcion(op,v){
  el.querySelectorAll('.hl-pag.hl-ver [data-op="'+op+'"]').forEach(function(x){var si=x.getAttribute('data-v')===String(v);x.setAttribute('aria-checked',String(si));var o=x.querySelector('.hl-ovalo');if(o&&!si)o.remove();if(si&&!o)x.insertAdjacentHTML('beforeend',ovalo(11+v.length*7))});
}
function elegir(op,v,x){
  if(op==='reparto'){var r=document.querySelector('#sem-hoy [data-reparto="'+v+'"]');if(r)r.click();return}
  if(op==='sobsem')return; /* lo maneja ui/semanas.js (data-sobsem) */
  if(!edit)return;
  if(op==='cat'){edit.cat=v;edit.catTocada=true}
  if(op==='fecha')edit.fecha=v;
  if(op==='sobre')edit.sobre=v;
  if(op==='moneda'){edit.moneda=v;var s=el.querySelector('.hl-pag.hl-ver .hl-signo');if(s)s.textContent=v==='USD'?'US$':'$'}
  pintarOpcion(op,v);
}
function gastoNuevo(donde){
  var t=today(),f=null,fecha=t;
  if(donde==='semana'){var w=planNow().weeks[semana];if(w){f=diasDeSemana(w);fecha=f.some(function(q){return q[0]===t})?t:f[f.length-1][0]}}
  return {tipo:'gasto',donde:donde,monto:'',nota:'',cat:sugerir(''),catTocada:false,fecha:fecha,fechas:diasDe(f),moneda:'UYU',sobre:''};
}
function accion(a,v){
  var st=ctx.state,t=today(),A,D;
  if(a==='tenes'||a==='ahorro'){
    A=actuales();edit={tipo:a,donde:a==='ahorro'?'plata':(v||'plata'),valor:'',nota:a==='ahorro'?'lo máximo que podés guardar: '+money(A.max):''};
    if(a==='tenes'&&!(anota()&&t<st.plan.cobro))edit.nota=textoSaldo('');
    rearmarYEscribir('hl-in-valor');return}
  if(a==='gasto'){edit=gastoNuevo(v==='semana'?'semana':'hoy');rearmarYEscribir('hl-in-monto');return}
  if(a==='corregir'){var g=gastoDe(v);if(!g)return;var w=planNow().weeks.filter(function(q){return g.fecha>=q.start&&g.fecha<=q.end})[0];
    var fs=w?diasDeSemana(w):[[g.fecha,g.fecha]];if(!fs.some(function(q){return q[0]===g.fecha}))fs=[[g.fecha,g.fecha]].concat(fs);
    edit={tipo:'gasto',id:g.id,donde:PAGS[n-1]&&PAGS[n-1].dataset.cap==='semana'?'semana':'hoy',monto:String(g.usd||g.monto),nota:g.nota||'',cat:catDe(g),catTocada:true,fecha:g.fecha,fechas:diasDe(fs),moneda:g.usd?'USD':'UYU',sobre:g.sobre||''};
    rearmarYEscribir('hl-in-monto');return}
  if(a==='dictar'){edit={tipo:'dictar',donde:v==='semana'?'semana':'hoy',texto:''};escuchar();return}
  if(a==='dejar'){parar();edit=null;armar();return}
  if(a==='anotar'){
    if(!edit)return;
    if(edit.tipo==='dictar'){entender();return}
    if(edit.tipo==='gasto'){guardarG();return}
    guardarDato();return}
  if(a==='cats-todas'){if(edit){edit.todas=true;armar()}return}
  if(a==='tachar'){tachar=v;armar();return}
  if(a==='tachar-no'){tachar=null;armar();return}
  if(a==='tachar-si'){tachar=null;borrarGasto(v);return}
  if(a==='frecuente'){anotarFrecuente(Number(v),t);return}
  if(a==='semana'){semana=Number(v);edit=null;armar();var k=PAGS.findIndex(function(pg){return pg.dataset.cap==='semana'});if(k>=0)ir(k+1);return}
  if(a==='volver-hoy'){semana=null;edit=null;fundido(1);setTimeout(function(){if(!G)armar()},320);return}
  if(a==='ir'){if(v==='ajustes'){abrirAjustes();return}if(ctx.go)ctx.go(v);return}
  if(a==='ajustes'){if(capActual()==='ajustes')cerrarAjustes();else abrirAjustes();return}
  if(a==='aj-cerrar'){cerrarAjustes();return}
  if(a==='cap'){var kc=PAGS.findIndex(function(pg){return pg.dataset.cap===v});if(kc>=0)ir(kc+1);return}
  if(a==='meta-bajar'){st.plan.ahorro=Number(v)||0;ctx.persist();ctx.syncInputs();ctx.renderAll();toast('Meta bajada a '+money(st.plan.ahorro));return}
  if(a==='entro'||a==='noentro'){
    var cambio=function(){ctx.persist();ctx.syncInputs();ctx.renderAll()},u;
    if(a==='entro'){u=recibirEsperado(st,v,null);if(!u)return;cambio();toastAccion('Sumé '+money(u.entro)+' a tu plata','Deshacer',function(){deshacerEsperado(ctx.state,u);cambio()});return}
    u=quitarEsperado(st,v);if(!u)return;cambio();toastAccion('Listo, no lo sumo','Deshacer',function(){deshacerEsperado(ctx.state,u);cambio()});return}
  if(a==='pie'){
    var ts=$('#toast'),bt=ts&&ts.querySelector('button');if(!bt)return;
    /* «Actualizar saldo» (después de un gasto que te dejó en rojo): se hace acá, en la hoja */
    if(/actualizar/i.test(bt.textContent)){ts.hidden=true;fundido(PAGS.findIndex(function(pg){return pg.dataset.cap==='plata'})+1);accion('tenes','plata');return}
    bt.click();return}
}
function actuales(){var st=ctx.state,pc=planCalc(st);return {tenes:Math.round(Math.max(0,disponible(st,pc))),ahorro:Math.round(pc.ahorro),cobro:st.plan.cobro,max:Math.floor(maxAhorro(st,pc))}}
/* arma la hoja con el renglón y pone el cursor (en el iPhone, el teclado solo aparece si es en el mismo toque) */
function rearmarYEscribir(id){
  tachar=null;armar();
  var i=el.querySelector('#'+id);if(!i)return;
  var k=PAGS.indexOf(i.closest('.hl-pag'));if(k>=0&&k+1!==n){n=k+1;acomodar()}
  try{i.focus({preventScroll:true})}catch(x){i.focus()}
}
function guardarDato(){
  var st=ctx.state,E=edit,t=today(),v=String(E.valor).trim();
  if(v===''||!(num(v)>=0)){E.err=E.tipo==='ahorro'?'Escribí cuánto querés guardar.':'Escribí cuánta plata tenés.';rearmarYEscribir('hl-in-valor');return}
  var N=Math.round(num(v)),A=actuales(),antes=E.tipo==='ahorro'?A.ahorro:A.tenes;
  /* como el prólogo (pacto): con gastos anotados y antes del cobro, o al cambiar lo que guardás */
  if(E.tipo==='ahorro'||(anota()&&t<st.plan.cobro)){
    var r=aplicarAjuste(st,{tenes:E.tipo==='tenes'?N:A.tenes,ahorro:E.tipo==='ahorro'?N:A.ahorro,cobro:A.cobro},t);
    if(!r.ok){var k=Object.keys(r.errores)[0],ms=k?r.errores[k]:'';E.err=ms==='max'?'Con esa plata, lo máximo que podés guardar es '+money(Math.floor(r.maxAhorro))+'.':(ms||'No se puede.');rearmarYEscribir('hl-in-valor');return}
    anotarTachado(E.tipo,antes);recien=E.tipo;edit=null;
    ctx.persist();ctx.syncInputs();ctx.renderAll();
    toastAccion('Listo: ≈ '+money(r.porDia)+' por día hasta que cobres','Deshacer',function(){deshacerAjustePacto(ctx.state,r.deshacer);ctx.persist();ctx.syncInputs();ctx.renderAll()});
    return}
  /* sin anotar gastos: lo de todos los días (ui/plan.js, igual que la página de siempre) */
  recien='tenes';edit=null;anotarTachado('tenes',antes);
  if(!confirmarSaldo(N)){recien=null;edit={tipo:'tenes',donde:E.donde,valor:v,nota:'',err:textoSaldo(String(N))};rearmarYEscribir('hl-in-valor')}
}
function guardarG(){
  var st=ctx.state,E=edit,mo=num(E.monto);
  if(!(mo>0)){E.err='Escribí cuánto gastaste.';rearmarYEscribir('hl-in-monto');return}
  var d={monto:Math.round(mo*100)/100,nota:String(E.nota||'').trim().slice(0,60),cat:E.cat,fecha:E.fecha};d.sugerida=sugerir(d.nota);
  if(E.sobre==='compras')d.sobre='compras';
  if(E.moneda==='USD'){var g0=E.id?gastoDe(E.id):null,cot=(g0&&num(g0.cotiz))||cotizacion(st);if(!cot){E.err='Primero cargá la cotización del dólar en Ajustes.';armar();return}Object.assign(d,gastoUSD(mo,cot))}
  var era=E.id,ant=era?gastoDe(era):null;if(ant&&Math.round(ant.monto)!==Math.round(d.monto))anotarTachado('g:'+era,ant.monto);
  var id=guardarGasto(d,era);recien='g:'+id;edit=null;ctx.renderAll();
  if(era){toast('Listo: corregido');return}
  avisoAnotado(id,'Anotado: '+money(d.monto)+(d.nota?' en '+d.nota:''));
}
/* ---------- dictar: la voz del teléfono (o el micrófono del teclado) escribe en el renglón; nada se guarda sin «anotar» ---------- */
var rec=null;
function SR(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function parar(){if(!rec)return;rec.onend=rec.onresult=rec.onerror=null;try{rec.abort()}catch(x){}rec=null}
function escuchar(){
  var C=SR(),solo=false;try{solo=localStorage.getItem('pa-voz-teclado')==='1'}catch(x){}
  /* el renglón queda listo en el mismo toque (así el iPhone abre el teclado, que también tiene micrófono) */
  edit.oye=!!C&&!solo;rearmarYEscribir('hl-in-dicta');
  if(!edit.oye)return;
  try{rec=new C()}catch(x){rec=null;sinVoz();return}
  var fin='',porVoz=false;rec.lang='es-UY';rec.interimResults=true;rec.continuous=false;
  rec.onresult=function(ev){var par='';for(var i=ev.resultIndex;i<ev.results.length;i++){var r=ev.results[i];if(r.isFinal)fin+=r[0].transcript;else par+=r[0].transcript}
    var tx=(fin+par).trim();if(!tx||!edit)return;porVoz=true;edit.texto=tx;var inp=el.querySelector('#hl-in-dicta');if(inp)inp.value=tx};
  rec.onerror=function(ev){var er=ev&&ev.error;if(er==='service-not-allowed'||er==='audio-capture'){try{localStorage.setItem('pa-voz-teclado','1')}catch(x){}}};
  rec.onend=function(){rec=null;if(!edit||edit.tipo!=='dictar')return;if(porVoz&&String(edit.texto).trim()){entender();return}sinVoz()};
  try{rec.start()}catch(x){rec=null;sinVoz()}
}
/* sin voz: queda el renglón para escribir (o dictar con el micrófono del teclado) */
function sinVoz(){if(!edit||edit.tipo!=='dictar')return;edit.oye=false;var g=el.querySelector('[data-form="dictar"] .hl-nota');if(g)g.textContent='decilo con el micrófono del teclado o escribilo: «gasté 850 en el súper»'}
function entender(){
  parar();var st=ctx.state,E=edit,txt=String(E.texto||'').trim();
  if(!txt){E.err='Decí o escribí qué gastaste.';rearmarYEscribir('hl-in-dicta');return}
  var r=interpretar(txt,{hoy:today(),fijos:st.fijos,aprendido:st.voz.cats,horas:reglasHoras(st)});
  if(r.intencion==='gasto'&&num(r.monto)>0){
    var g=gastoNuevo(E.donde),cot=cotizacion(st);
    g.monto=String(r.monto);g.nota=r.nota||'';if(r.cat){g.cat=nombreDe(st,r.cat);g.catTocada=true}else g.cat=sugerir(g.nota);
    if(r.fecha&&g.fechas.some(function(q){return q[0]===r.fecha}))g.fecha=r.fecha;
    if(r.dolares&&cot>0)g.moneda='USD';
    edit=g;rearmarYEscribir('hl-in-monto');return}
  E.err=r.intencion==='nada'?'No entendí «'+txt+'». Probá con otras palabras.':'Acá anoto gastos. Horas, fijos y preguntas, por ahora, con el micrófono de siempre.';
  E.mic=r.intencion!=='nada';rearmarYEscribir('hl-in-dicta');
}

function entrarClasico(manual){clasico=true;auto=!manual;mostrar()}
function salirClasico(){clasico=false;auto=false;mostrar()}
function tourAbierto(){var t=document.querySelector('.tour');return !!(t&&!t.hidden&&t.offsetParent!==null)}
function revisar(){
  var sc=$('#saldo-card'),abierto=!!(sc&&!sc.hidden);
  if(abierto&&!clasico){clasico=true;auto=true}
  else if(!abierto&&clasico&&auto){clasico=false;auto=false}
  mostrar();
}
/* el libro se ve en Hoy del libro «solo», con el pacto armado, y cuando la página clásica no hace falta */
function activo(){
  var k=capActual();if((k==='prologo'||k==='perfil')&&!tourAbierto())return true;
  return !!datos&&ctx.tab==='resumen'&&libroEnUso()==='solo'&&!clasico&&!tourAbierto()
    &&!document.querySelector('#hoja.sin-pacto,.sin-pacto#hoja')&&!!ctx.state&&!document.getElementById('app').hidden;
}
function mostrar(){
  if(!el)return;
  var a=activo(),v=$('#hl-volver');
  if(v)v.hidden=!(clasico&&ctx.tab==='resumen'&&libroEnUso()==='solo');
  raiz.classList.toggle('hoy-libro',a);
  var k=a?capActual():null;raiz.classList.toggle('hl-wiz',k==='perfil');el.classList.toggle('hl-sinacc',k==='prologo'||k==='perfil');
  var aj=el.querySelector('.hl-ajustes');if(aj)aj.textContent=k==='ajustes'?'hoy':'ajustes';
  if(!a&&ctx.tab!=='resumen'&&ctx.ajustesEnLibro)ctx.ajustesEnLibro=false;
  if(a&&el.hidden){el.hidden=false;conLetras()}
  else if(!a&&!el.hidden){el.hidden=true;parar();edit=null;tachar=null}
}

/* reparte cada capítulo en páginas: si un bloque no entra, sigue en la página siguiente (con el mismo título) */
function armar(){
  if((!datos&&!capActual())||G)return;
  var pags=el.querySelector('.hl-pags'),cap=PAGS[n-1]&&PAGS[n-1].dataset.cap;
  pags.innerHTML='';PAGS=[];semilla=0;
  var w=mesa.clientWidth,h=mesa.clientHeight,s=Math.min(1,Math.max(.85,.85+(w-320)/70*.15));raiz.style.setProperty('--s',s.toFixed(3));anchoArmado=w;
  var tam={izq:medidas('izq',w,h),der:medidas('der',w,h)},fecha=fechaLarga(today());
  function nueva(c,sigue){
    var k=PAGS.length+1,lado=k%2?'der':'izq',pg=document.createElement('article');
    pg.className='hl-pag hl-mide';pg.dataset.cap=c.id;pg.dataset.lado=lado;pg.dataset.n=k;
    pg.style.width=tam[lado].pw+'px';pg.style.height=tam[lado].ph+'px';pg.style.setProperty('--a',String(c.min||.3));
    pg.setAttribute('aria-label','Página '+romano(k).toLowerCase()+(c.titulo?': '+c.titulo:''));
    /* el encabezado corrido: a la izquierda, el libro; a la derecha, el día */
    pg.insertAdjacentHTML('beforeend','<p class="hl-corrido hl-libro hl-suave" aria-hidden="'+(c.id==='hoy'?'false':'true')+'">'+e(lado==='izq'?'el libro del ahorro':c.cabeza||fecha)+'</p>');
    if(c.titulo)pg.insertAdjacentHTML('beforeend','<h2 class="hl-titulo hl-rojo">'+e(c.titulo)+'</h2>'+ADORNITO+(sigue?'<p class="hl-nota hl-cur hl-suave">sigue</p>':''));
    [].slice.call(pg.childNodes).forEach(aPluma);
    pags.appendChild(pg);PAGS.push(pg);return pg;
  }
  var C=capitulos(datos);if(!C.length)return;
  C.forEach(function(c){
    var pg=nueva(c,false),puestos=0;
    c.bloques.forEach(function(html){
      var tmp=document.createElement('div');tmp.innerHTML=html;var nodos=[].slice.call(tmp.childNodes);
      nodos.forEach(function(x){pg.appendChild(x)});nodos.forEach(aPluma);
      if(sobra(pg)>0&&puestos>0){nodos.forEach(function(x){x.remove()});pg=nueva(c,true);nodos.forEach(function(x){pg.appendChild(x)});puestos=0}
      puestos++;
    });
  });
  /* número de página, subrayados, renglones, óvalos, manchas, gotas */
  PAGS.forEach(function(pg,i){pg.insertAdjacentHTML('beforeend','<p class="hl-folio hl-libro hl-suave">— '+romano(i+1).toLowerCase()+' —</p>');pg.classList.remove('hl-mide')});
  pags.querySelectorAll('.hl-sub').forEach(function(x,i){x.insertAdjacentHTML('beforeend',trazo(50+i*13,!!x.closest('.hl-rojo')))});
  pags.querySelectorAll('.hl-campo').forEach(function(x,i){x.insertAdjacentHTML('beforeend',renglonSvg(91+i*7))});
  pags.querySelectorAll('.hl-op[aria-checked="true"]').forEach(function(x){x.insertAdjacentHTML('beforeend',ovalo(11+x.getAttribute('data-v').length*7))});
  pags.querySelectorAll('.hl-antes .hl-m').forEach(function(x,i){x.insertAdjacentHTML('afterend',tachadura(201+i))});
  var tapado=discreto.on;
  pags.querySelectorAll('.hl-m').forEach(function(x,i){x.style.setProperty('--mancha',MANCHAS[i%MANCHAS.length]);x.classList.toggle('hl-tapada',tapado);if(tapado){x.setAttribute('role','img');x.setAttribute('aria-label','monto oculto')}});
  pags.querySelectorAll('[data-gotas]').forEach(function(x,i){if(tapado)return;[[.93,.2,3.2],[.06,.86,2.2]].forEach(function(g,j){var d=document.createElement('span');d.className='hl-gota';d.setAttribute('aria-hidden','true');var r=g[2]*(i?.65:1);d.style.cssText='left:'+(g[0]*100)+'%;top:'+(g[1]*100)+'%;width:calc('+r+'px*var(--s));height:calc('+(r*.86).toFixed(2)+'px*var(--s))';x.appendChild(d)})});
  /* lo recién anotado se escribe de a una letra (unos 0,4 s) */
  if(recien){pags.querySelectorAll('[data-nuevo="'+recien+'"],[data-nuevo="1"]').forEach(function(x){var ls=x.querySelectorAll('.hl-l');x.style.setProperty('--nl',String(Math.max(1,ls.length)));x.classList.add('hl-escribe')});recien=null}
  var oc=el.querySelector('.hl-ocultar');oc.textContent=tapado?'mostrar':'ocultar';oc.setAttribute('aria-pressed',String(tapado));
  /* se queda en la misma página (o, si cambió de lugar, en el primer lugar de su capítulo) */
  if(!(PAGS[n-1]&&PAGS[n-1].dataset.cap===cap)){var k=cap?PAGS.findIndex(function(pg){return pg.dataset.cap===cap}):-1;n=k>=0?k+1:Math.min(Math.max(1,n),PAGS.length)}
  if(n>PAGS.length)n=PAGS.length;
  var kA=capActual();if(kA!==capArmada){irPrimera=true;capArmada=kA}
  if(irPrimera){n=1;irPrimera=false}
  /* el prólogo: la hoja de la pregunta que está abierta */
  if(capActual()==='prologo'){var pp=prologoPos(),kp=PAGS.findIndex(function(pg){return pg.dataset.cap==='pro-'+pp.idx});if(kp>=0&&!(PAGS[n-1]&&PAGS[n-1].dataset.cap==='pro-'+pp.idx))n=kp+1}
  ultimo=datos;acomodar();
}
function medidas(lado,w,h){
  var F=FONDOS[lado][h/w>1.92?'alto':'corto'],r=caja(F,lado,w,h),q=F[lado].map(function(p){return [r.x+p[0]*r.ancho,r.y+p[1]*r.alto]});
  return {pw:+(((q[1][0]-q[0][0])+(q[2][0]-q[3][0]))/2).toFixed(1),ph:+(((q[3][1]-q[0][1])+(q[2][1]-q[1][1]))/2).toFixed(1),q:q,r:r,F:F,esc:(q[1][0]-q[0][0])/(((q[1][0]-q[0][0])+(q[2][0]-q[3][0]))/2)};
}
function caja(F,lado,w,h){
  var q0=F[lado],xs=q0.map(function(p){return p[0]}),ys=q0.map(function(p){return p[1]});
  return recorte(w,h,F.w,F.h,{x0:Math.max(0,Math.min.apply(0,xs)-.02),y0:Math.max(0,Math.min.apply(0,ys)-.07),x1:Math.min(1,Math.max.apply(0,xs)+.02),y1:Math.min(1,Math.max.apply(0,ys)+.012)});
}
/* pone la página n a la vista: la foto de ese lado, la página deformada sobre ella, el aire y la curva hacia el lomo */
function acomodar(){
  var w=mesa.clientWidth,h=mesa.clientHeight,pg=PAGS[n-1];if(!pg)return;
  var lado=pg.dataset.lado,M=medidas(lado,w,h),F=M.F,r=M.r;
  if(img.getAttribute('src')!==F.src)img.src=F.src;
  img.style.width=F.w+'px';img.style.height=F.h+'px';img.style.transform='translate('+r.x.toFixed(2)+'px,'+r.y.toFixed(2)+'px) scale('+r.escala.toFixed(5)+')';
  var ve=F.llama.x>0&&F.llama.x<1;luz.style.display=ve?'':'none';luz.style.left=(r.x+F.llama.x*r.ancho).toFixed(1)+'px';luz.style.top=(r.y+F.llama.y*r.alto).toFixed(1)+'px';luz.style.setProperty('--r',(r.ancho/9).toFixed(1));
  PAGS.forEach(function(p){var si=p===pg;p.classList.toggle('hl-ver',si);if(si)p.removeAttribute('inert');else p.setAttribute('inert','')});
  pg.style.transform=homografia(M.pw,M.ph,M.q);
  aire(pg,M.ph,pg.dataset.cap==='hoy'?.04:.1);curvar(pg,M.pw);ponerPie();
  var ad=el.querySelector('[data-esq="1"]'),at=el.querySelector('[data-esq="-1"]'),q=M.q;
  ad.style.left=(Math.min(w,q[2][0])-50).toFixed(1)+'px';ad.style.top=(Math.min(h,q[2][1])-50).toFixed(1)+'px';ad.hidden=n>=PAGS.length;
  at.style.left=(Math.max(0,q[3][0])-6).toFixed(1)+'px';at.style.top=(Math.min(h,q[3][1])-50).toFixed(1)+'px';at.hidden=n<=1;
  geo={q:q,w:w,h:h};
}
/* cuánto se pasa lo escrito del margen de abajo de la página (el navegador no lo cuenta como desborde: se mide a mano) */
function sobra(pg){
  var fin=0,lim=pg.clientHeight-parseFloat(getComputedStyle(pg).paddingBottom);
  [].forEach.call(pg.children,function(x){if(x.classList.contains('hl-folio')||x.classList.contains('hl-pie')||typeof x.offsetTop!=='number')return;fin=Math.max(fin,x.offsetTop+x.offsetHeight)}); /* (los adornos son SVG: no tienen offsetTop) */
  return fin-lim;
}
/* nada de scroll: si sobra lugar, más aire entre bloques; si falta, menos (la letra no cambia) */
function aire(pg,h,min){
  var a=1;pg.style.setProperty('--a','1');
  while(sobra(pg)>0&&a>min){a-=.06;pg.style.setProperty('--a',a.toFixed(2))}
}
/* la hoja se hunde hacia el lomo: el renglón baja y se inclina con ella */
function curvar(pag,w){
  var izq=pag.dataset.lado==='izq',A=.034*w,S=.17;
  pag.querySelectorAll('.hl-w,.hl-m').forEach(function(x){
    var px=x.offsetWidth/2,nd=x;while(nd&&nd!==pag){px+=nd.offsetLeft;nd=nd.offsetParent}
    var s=Math.max(0,izq?1-px/w:px/w),dy=A*Math.exp(-Math.pow(s/S,2)),pend=-2*s/(S*S)*dy/w*(izq?-1:1);
    x.style.setProperty('--cy',dy.toFixed(2)+'px');x.style.setProperty('--cg',(Math.atan(pend)*57.3).toFixed(2)+'deg')})}

/* ---------- la vuelta de hoja ---------- */
var NF=16,PI=Math.PI;
function limpiaIds(x){x.removeAttribute('id');x.querySelectorAll('[id]').forEach(function(y){y.removeAttribute('id')});return x}
function crearGiro(dir,pre){
  var destino=n+dir;if(!pre&&(destino<1||destino>PAGS.length))return null;
  var g0=pre?pre.geo:geo,viejo=pre?pre.viejo:limpiaIds(vista.cloneNode(true)),q=g0.q,W0=g0.w,H0=g0.h,desde=n;
  var xL=Math.min(q[0][0],q[3][0]),xR=Math.max(q[1][0],q[2][0]),yT=Math.min(q[0][1],q[1][1]),yB=Math.max(q[2][1],q[3][1]),W=xR-xL,H=yB-yT,sw=W/NF;
  var yt=function(x){return q[0][1]+(q[1][1]-q[0][1])*(x-q[0][0])/(q[1][0]-q[0][0])},yb=function(x){return q[3][1]+(q[2][1]-q[3][1])*(x-q[3][0])/(q[2][0]-q[3][0])};
  if(!pre){n=destino;acomodar()}
  var base=limpiaIds(viejo.cloneNode(true));base.className='hl-vista hl-viejo';base.querySelectorAll('.hl-pag').forEach(function(x){x.remove()});
  base.style.clipPath="path(evenodd,'M0 0H"+W0+"V"+H0+"H0Z M"+q.map(function(p){return p[0].toFixed(1)+' '+p[1].toFixed(1)}).join(' L')+"Z')";
  var giro=document.createElement('div');giro.className='hl-giro';var tiras=[];
  for(var i=0;i<NF;i++){
    var x0=xL+i*sw,x1=x0+sw+.7,f=document.createElement('div');f.className='hl-franja';
    f.style.cssText='left:'+x0.toFixed(2)+'px;top:'+yT.toFixed(2)+'px;width:'+(x1-x0).toFixed(2)+'px;height:'+H.toFixed(2)+'px;transform-origin:'+(dir>0?'0':'100%')+' 50%';
    var cara=document.createElement('div'),reves=document.createElement('div');reves.className='hl-reves';
    cara.style.clipPath='polygon(0 '+(yt(x0)-yT).toFixed(1)+'px,100% '+(yt(x1)-yT).toFixed(1)+'px,100% '+(yb(x1)-yT).toFixed(1)+'px,0 '+(yb(x0)-yT).toFixed(1)+'px)';
    reves.style.clipPath='polygon(0 '+(yt(x1)-yT).toFixed(1)+'px,100% '+(yt(x0)-yT).toFixed(1)+'px,100% '+(yb(x0)-yT).toFixed(1)+'px,0 '+(yb(x1)-yT).toFixed(1)+'px)';
    var c1=i?viejo.cloneNode(true):viejo;c1.className='hl-copia';c1.style.cssText='left:'+(-x0).toFixed(2)+'px;top:'+(-yT).toFixed(2)+'px;width:'+W0+'px;height:'+H0+'px';
    /* el dorso: la misma hoja espejada y lavada con el color del papel: el texto de atrás apenas se adivina */
    var c2=c1.cloneNode(true);c2.style.transform='scaleX(-1)';c2.style.transformOrigin=(x0+(x1-x0)/2).toFixed(2)+'px 0';
    var tono=document.createElement('div');tono.className='hl-tono';var brillo=document.createElement('div');brillo.className='hl-brillo';var tono2=document.createElement('div');tono2.className='hl-tono';var lav=document.createElement('div');lav.className='hl-lavado';
    cara.append(c1,tono,brillo);reves.append(c2,lav,tono2);f.append(cara,reves);giro.appendChild(f);tiras.push({f:f,tono:tono,brillo:brillo,tono2:tono2});
  }
  if(dir<0)tiras.reverse();
  var sombra=document.createElement('div');sombra.className='hl-sombra-giro';
  sombra.style.cssText='left:0;top:'+yT.toFixed(1)+'px;width:'+(W*.42).toFixed(1)+'px;height:'+H.toFixed(1)+'px;background:linear-gradient('+(dir>0?90:270)+'deg,rgba(14,6,2,.62),rgba(14,6,2,.22) 35%,rgba(14,6,2,0))';
  mesa.append(base,sombra,giro);
  var R=W*.17;
  function pintar(p){
    var fs=franjas(p,W,NF,R),fold=(1-p)*W-p*PI*R;
    fs.forEach(function(s,i){var t=tiras[i],th=s.th,tx=dir>0?s.tx:-s.tx;
      t.f.style.transform='translate3d('+tx.toFixed(2)+'px,0,'+s.z.toFixed(2)+'px) rotateY('+(dir>0?-th:th).toFixed(4)+'rad)';
      t.tono.style.opacity=(th<PI/2?.42*th/(PI/2):0).toFixed(3);t.brillo.style.opacity=(th>0&&th<PI*.6?.32*Math.sin(th*1.6):0).toFixed(3);
      t.tono2.style.opacity=(th>PI/2?.4*(1-(th-PI/2)/(PI/2)):0).toFixed(3)});
    var fx=dir>0?xL+Math.max(0,fold):xR-Math.max(0,fold)-W*.42;
    sombra.style.transform='translateX('+fx.toFixed(1)+'px)';sombra.style.opacity=(Math.sin(Math.max(0,Math.min(1,p))*PI)*.95).toFixed(3);
    base.style.opacity=(1-Math.max(0,Math.min(1,p))).toFixed(3);
  }
  pintar(0);
  return {dir:dir,desde:desde,W:W,pintar:pintar,fin:function(){[base,sombra,giro].forEach(function(x){x.remove()})}};
}
function animar(g,p0,p1,dur,alFin){
  var t0=performance.now(),ease=function(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
  requestAnimationFrame(function tic(now){var t=Math.min(1,(now-t0)/dur);g.pintar(p0+(p1-p0)*ease(t));if(t<1)requestAnimationFrame(tic);else alFin()});
}
function terminar(g,ok){return function(){g.fin();if(!ok){n=g.desde;acomodar()}G=null;if(pendiente){pendiente=false;armar()}}}
var pendiente=false;
function ir(destino){
  if(G||destino===n)return;
  /* en el prólogo, pasar a otra pregunta es lo mismo que tocar «seguir» o «atrás» (valida lo que escribiste) */
  var kc=capActual();
  if(kc==='prologo'&&!(PAGS[destino-1]&&PAGS[n-1]&&PAGS[destino-1].dataset.cap===PAGS[n-1].dataset.cap)){prologoPasar(destino>n?1:-1);return}
  if(destino<1||destino>PAGS.length)return;
  if(edit){parar();edit=null;armar()}
  if(quieto()||Math.abs(destino-n)>1){fundido(destino);return}
  var g=crearGiro(destino>n?1:-1);if(!g)return;G=g;animar(g,0,1,600,terminar(g,true));
}
function fundido(destino){
  if(destino<1||destino>PAGS.length)return;
  var viejo=limpiaIds(vista.cloneNode(true));viejo.className='hl-vista hl-viejo';n=destino;acomodar();mesa.appendChild(viejo);
  if(!viejo.animate){viejo.remove();return}
  viejo.animate([{opacity:1},{opacity:0}],{duration:300,easing:'ease-in-out'}).onfinish=function(){viejo.remove()};
}
/* con el dedo: la hoja se levanta y acompaña al dedo; al soltar, termina o vuelve (mientras escribís, no) */
var toque=null,arrastro=false;
function iniciarDedo(){
  mesa.addEventListener('pointerdown',function(ev){if(G||edit||ev.target.closest('.hl-acc,input'))return;try{getSelection().removeAllRanges()}catch(x){}toque={x:ev.clientX,y:ev.clientY,id:ev.pointerId,pts:[[ev.clientX,performance.now()]]};arrastro=false});
  mesa.addEventListener('pointermove',function(ev){
    if(!toque||ev.pointerId!==toque.id)return;var dx=ev.clientX-toque.x,dy=ev.clientY-toque.y;
    toque.pts.push([ev.clientX,performance.now()]);if(toque.pts.length>8)toque.pts.shift();
    if(!arrastro){
      if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.2)return;
      var dir=dx<0?1:-1;
      /* en el prólogo, otra pregunta: se pasa al soltar, como «seguir» o «atrás» */
      if(capActual()==='prologo'&&!(PAGS[n-1+dir]&&PAGS[n-1+dir].dataset.cap===PAGS[n-1].dataset.cap)){toque.prol=dir;arrastro=true;return}
      if(n+dir<1||n+dir>PAGS.length){toque=null;return}
      arrastro=true;try{mesa.setPointerCapture(ev.pointerId)}catch(x){}
      if(quieto()){toque.quieto=dir;return}
      G=crearGiro(dir);if(!G){toque=null;return}
    }
    if(G)G.pintar(Math.max(0,-G.dir*dx)/G.W);
  });
  function soltar(ev){
    if(!toque||ev.pointerId!==toque.id)return;var t=toque;toque=null;
    if(!arrastro)return;setTimeout(function(){arrastro=false},0);
    if(t.prol){if(Math.abs(ev.clientX-t.x)>50)prologoPasar(t.prol);return}
    if(t.quieto){fundido(n+t.quieto);return}
    var g=G;if(!g)return;
    var a=t.pts[0],z=t.pts[t.pts.length-1],v=(z[0]-a[0])/Math.max(1,z[1]-a[1]),dx=ev.clientX-t.x,p=Math.max(0,Math.min(1,-g.dir*dx/g.W));
    if(pasa(p,-g.dir*v))animar(g,p,1,duracion(p,v,g.W),terminar(g,true));
    else animar(g,p,0,Math.max(160,Math.min(450,p*g.W/.7)),terminar(g,false));
  }
  mesa.addEventListener('pointerup',soltar);mesa.addEventListener('pointercancel',soltar);
}

/* ---------- lo que llama ui/plan.js ---------- */
export function initHoyLibro(){
  ctx.libroHoy=function(D){
    if(D)datos=D;
    if(!D&&ctx.tab!=='resumen'){clasico=false;auto=false}
    montar();
    /* después de que la app termina de dibujar Hoy */
    requestAnimationFrame(function(){mostrar();if(activo())conLetras()});
  };
}
/* se arma con la letra ya cargada (si no, las medidas salen con la letra de reemplazo) y una sola vez por cada dibujo de Hoy;
   mientras escribís en un renglón no se rearma (se perdería lo escrito y el teclado) */
function conLetras(){
  var ya=function(){if(!activo())return;if(G){pendiente=true;return}if(edit&&PAGS.length&&el.contains(document.activeElement))return;if(ultimo!==datos||!PAGS.length||capActual())armar()};
  if(document.fonts&&document.fonts.load)Promise.all([document.fonts.load('400 20px "IM Fell English"'),document.fonts.load('italic 400 20px "IM Fell English"'),document.fonts.load('400 20px "IM Fell SC"')]).catch(function(){}).then(ya);else ya();
}

/* (2.66) el prólogo y el perfil pueden abrirse antes de que haya datos (la primera vez): el libro los vigila desde el arranque */
(function(){
  function vigilar(){
    var mo=new MutationObserver(function(){if(prologoAbierto()||perfilAbierto()||capVieja==='prologo'||capVieja==='perfil'||capArmada==='prologo'||capArmada==='perfil')programar()});
    ['lb-hojas','wiz'].forEach(function(id){var x=document.getElementById(id);if(x)mo.observe(x,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','aria-pressed','disabled','class','open']})});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',vigilar);else vigilar();
})();
