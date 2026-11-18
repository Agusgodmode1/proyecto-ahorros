/* Hoy del libro individual (2.65): el libro abierto sobre una mesa, a la luz de una vela, escrito a mano.
   Es una capa por encima de la página Hoy de siempre, que sigue armándose debajo, igual que antes:
   - Los números NO se calculan acá: ui/plan.js los anota mientras arma Hoy y los pasa con ctx.libroHoy(datos).
   - Los botones NO hacen nada por su cuenta: aprietan el botón de siempre de la página clásica (o van al capítulo).
   - Los avisos que aparecen a veces (fin del capítulo, meta, ejemplo, cierre de semana, feriados…) se copian como
     «notas al margen», con sus mismos botones. Si un aviso tiene un formulario, «abrir» muestra la página clásica.
   - Si algo pide la página clásica (actualizar lo que tenés, el tour), el libro se aparta y vuelve solo al terminar.
   Una página por pantalla; si algo no entra, sigue en la página siguiente (nunca hay scroll). Se pasa la hoja con el dedo
   o tocando las esquinas. Solo el libro «solo» (El Libro del Ahorro); el Pacto de los Dos sigue con su página. */
import {ctx,$,money,discreto} from './comun.js';
import {libroEnUso} from '../estado.js';
import {recorte} from '../logica/recorte.js';
import {FONDOS} from '../logica/fondos-hoy.js';
import {romano,fechaLarga,cobro,diasSemana,diaNombre,homografia,franjas,pasa,duracion} from '../logica/hoy-libro.js';

var raiz=document.documentElement,el=null,vista=null,mesa=null,img=null,luz=null,PAGS=[],n=1,geo=null,datos=null,G=null;
var clasico=false,auto=false,proxies=[],ultimo=null;
function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function quieto(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(x){return false}}
function azar(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(x,y){var h=(Math.imul(x,374761393)+Math.imul(y,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}

/* ---------- la tinta: baldosas de tinta despareja (más cargada en unos lugares, más aguada en otros) ---------- */
function ruido(x,y,p){var xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),m=function(k){return((k%p)+p)%p};
  var a=hash(m(xi),m(yi)),b=hash(m(xi+1),m(yi)),c=hash(m(xi),m(yi+1)),d=hash(m(xi+1),m(yi+1));return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function rgb(hex){hex=String(hex).trim().replace('#','');return [0,2,4].map(function(i){return parseInt(hex.slice(i,i+2),16)||0})}
function baldosa(base,agua,contraste){
  var N=160,c=document.createElement('canvas');c.width=c.height=N;var g=c.getContext('2d'),im=g.createImageData(N,N),d=im.data;
  for(var y=0;y<N;y++)for(var x=0;x<N;x++){
    var v=Math.min(1,Math.max(0,.5+contraste*((ruido(x/40,y/40,4)-.5)*1.5+(ruido(x/11,y/11,14)-.5)*.7)+(ruido(x/2.2,y/2.2,72)>.82?-.2:0))),i=(y*N+x)*4;
    d[i]=agua[0]+(base[0]-agua[0])*v;d[i+1]=agua[1]+(base[1]-agua[1])*v;d[i+2]=agua[2]+(base[2]-agua[2])*v;d[i+3]=255}
  g.putImageData(im,0,0);return 'url('+c.toDataURL('image/png')+')'}
function tintas(){
  var cs=getComputedStyle(raiz),T=function(k){return rgb(cs.getPropertyValue('--hl-'+k))};
  [['sepia',1],['suave',.9],['fuerte',.9],['rojo',1],['oro',1.3],['cargada',1.5]].forEach(function(t){
    raiz.style.setProperty('--hl-t-'+t[0],baldosa(T(t[0]),T(t[0]+'-agua'),t[1]))});
}

/* ---------- la mano: cada palabra con su carga de tinta y un pelo corrida; cada letra con una variación chica y fija
   (±1,2° de giro, ±0,8 px de altura, ±3 % de tamaño), que sale de la letra y su lugar: no cambia al recargar ---------- */
var semilla=0;
function vestir(s,k){var r=azar(k*7919+13);s.style.setProperty('--carga',(.86+r()*.14).toFixed(2));s.style.setProperty('--dy',((r()-.5)*1.5).toFixed(2)+'px');s.style.setProperty('--g',((r()-.5)*1.7).toFixed(2)+'deg')}
function letras(w,k){
  var t=w.textContent;w.textContent='';
  for(var i=0;i<t.length;i++){var ch=t[i];if(ch===' '||ch===' '){w.appendChild(document.createTextNode(ch));continue}
    var l=document.createElement('span'),h1=hash(k*31+i,ch.charCodeAt(0)),h2=hash(i*17+k,ch.charCodeAt(0)+3),h3=hash(k+i*101,7);
    l.className='hl-l';l.textContent=ch;
    l.style.cssText='--lr:'+((h1-.5)*2.4).toFixed(2)+'deg;--ly:'+((h2-.5)*1.6).toFixed(2)+'px;--le:'+(.97+h3*.06).toFixed(3)+';--sk:'+(.25+h1*.7).toFixed(2)+'px;--bx:'+Math.round(h2*160)+'px;--by:'+Math.round(h3*160)+'px';
    w.appendChild(l)}}
function aPluma(nodo){
  if(nodo.nodeType===3){
    if(!nodo.textContent.trim())return;
    var f=document.createDocumentFragment();
    nodo.textContent.split(/(\s+)/).forEach(function(t){if(!t)return;if(/^\s+$/.test(t)){f.appendChild(document.createTextNode(' '));return}
      var s=document.createElement('span');s.className='hl-w';s.textContent=t;var k=++semilla+hash(t.length,t.charCodeAt(0))*1e4|0;vestir(s,k);letras(s,k);f.appendChild(s)});
    nodo.parentNode.replaceChild(f,nodo)}
  else if(nodo.nodeType===1&&nodo.tagName.toLowerCase()!=='svg'){
    if(nodo.classList.contains('hl-m')){var k2=++semilla;vestir(nodo,k2);letras(nodo,k2);return}
    [].slice.call(nodo.childNodes).forEach(aPluma)}}

/* ---------- trazos de pluma: subrayados irregulares, la mancha del modo discreto ---------- */
function trazo(sem,rojo){
  var r=azar(sem),k=5,arr=[],aba=[];
  for(var i=0;i<=k;i++){var x=1+98*i/k,y=5+(r()-.5)*3.4,g=(.5+1.5*Math.pow(Math.sin(Math.PI*(i/k)),.7))*(.7+r()*.6);arr.push([x,y-g/2]);aba.push([x,y+g/2])}
  var d=arr.map(function(q,i){return i?'S '+(q[0]-8).toFixed(1)+' '+(q[1]+(r()-.5)*1.6).toFixed(1)+', '+q[0].toFixed(1)+' '+q[1].toFixed(1):'M '+q[0].toFixed(1)+' '+q[1].toFixed(1)}).join(' ')
    +' '+aba.reverse().map(function(q){return 'L '+q[0].toFixed(1)+' '+q[1].toFixed(1)}).join(' ');
  return '<svg class="hl-trazo" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="'+d+'z" style="fill:var('+(rojo?'--hl-trazo-rojo':'--hl-trazo')+')"/></svg>'}
function mancha(sem){
  var r=azar(sem),k=22,pts=[],i;
  for(i=0;i<k;i++){var a=i/k*6.283,rad=.78+r()*.22+(r()<.16?.16:0);pts.push([50+Math.cos(a)*46*rad,50+Math.sin(a)*42*rad])}
  var d='M'+((pts[0][0]+pts[k-1][0])/2).toFixed(1)+' '+((pts[0][1]+pts[k-1][1])/2).toFixed(1);
  for(i=0;i<k;i++){var p=pts[i],q=pts[(i+1)%k];d+=' Q'+p[0].toFixed(1)+' '+p[1].toFixed(1)+' '+((p[0]+q[0])/2).toFixed(1)+' '+((p[1]+q[1])/2).toFixed(1)}
  var gotas='';for(i=0;i<3;i++){var b=r()*6.283;gotas+='<ellipse cx="'+(50+Math.cos(b)*49).toFixed(1)+'" cy="'+(50+Math.sin(b)*47).toFixed(1)+'" rx="'+(1+r()*1.6).toFixed(1)+'" ry="'+(2+r()*3).toFixed(1)+'"/>'}
  var c=getComputedStyle(raiz),c1=c.getPropertyValue('--hl-cargada').trim(),c2=c.getPropertyValue('--hl-sepia-agua').trim();
  var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><radialGradient id="g"><stop offset=".5" stop-color="'+c1+'"/><stop offset="1" stop-color="'+c2+'"/></radialGradient></defs><g fill="url(#g)"><path d="'+d+'z"/>'+gotas+'</g></svg>';
  return 'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")'}
var MANCHAS=null;
var FLOR='<svg class="hl-adorno" viewBox="0 0 220 24" aria-hidden="true"><use href="#hl-floritura"/></svg>',ADORNITO='<svg class="hl-adornito" viewBox="0 0 100 18" aria-hidden="true"><use href="#hl-adornito"/></svg>';
var MANO='<svg class="hl-mano" viewBox="0 0 26 14" aria-hidden="true"><g fill="none" style="stroke:var(--hl-trazo-rojo)" stroke-width="1.1" stroke-linejoin="round"><path d="M1 4.2 L5.4 3.8 L5.6 10.6 L1.2 10.2z"/><path d="M5.6 4.2 C 7.6 3, 9.6 2.6, 12 3.4 L 23.4 3.6 C 25 3.7, 25 5.5, 23.4 5.6 L 14.4 5.8 C 15.6 6.4, 15.6 7.6, 14.2 7.8 C 15.4 8.4, 15.2 9.6, 13.8 9.8 C 14.6 10.6, 14 11.6, 12.6 11.6 L 8.6 11.4 C 7.2 11.4, 6.2 11, 5.6 10.4z"/><path d="M14.4 5.8 L 11.6 5.9 M14.2 7.8 L 11.4 7.9 M13.8 9.8 L 11 9.8" stroke-width=".8" stroke-linecap="round"/></g></svg>';

/* ---------- lo que se escribe: una plata, un botón que aprieta el de siempre, un capítulo ---------- */
function m(v,clase){return '<span class="hl-cifra '+(clase||'hl-fuerte')+'"><span class="hl-m">'+e(money(v))+'</span></span>'}
function mm(v){return '<span class="hl-m">'+e(money(v))+'</span>'}
/* un botón del libro: «p» aprieta un botón de la página clásica; «go» va a un capítulo; «ir» pasa a una página del libro */
function b(txt,o,clase){return '<button class="hl-toc hl-sub'+(clase?' '+clase:'')+'" type="button"'+(o.p?' data-p="'+e(o.p)+'"':'')+(o.go?' data-go="'+e(o.go)+'"':'')+(o.c?' data-c="1"':'')+(o.lab?' aria-label="'+e(o.lab)+'"':'')+'>'+e(txt)+'</button>'}

function capitulos(D){
  var H=D.hoy.H,t=D.hoy.t,C=[],x=[];
  /* ---- i · Hoy ---- */
  var neg=H.queda<0,co=cobro(t,D.hoy.cobro);
  x.push('<p class="hl-encab hl-nota hl-libro hl-suave">'+e(fechaLarga(t))+'</p>');
  x.push('<p'+(neg?' class="hl-rojo"':'')+'>'+(neg?'Hoy te pasaste por':'Hoy podés gastar')+'</p>');
  x.push('<p class="hl-heroe '+(neg?'hl-rojo':'hl-cargada')+'" data-gotas="1"><span class="hl-m">'+e(money(Math.abs(H.queda)))+'</span></p>');
  x.push('<p class="hl-nota">'+(D.hoy.anota?b('anotar un gasto',{p:'#gasto-abrir'}):b('actualizar',{p:'#tengo-abrir',lab:'Actualizar cuánta plata tenés'}))+'</p>');
  x.push(FLOR);
  x.push('<p class="hl-renglon">'+e(co.lab)+' <span class="hl-cifra hl-oro" data-gotas="1" style="position:relative">'+e(co.cifra)+'</span></p>'
    +'<p class="hl-nota hl-suave">el '+e(fechaLarga(D.hoy.cobro))+'</p>');
  var resto=D.hoy.resto;
  x.push('<p class="hl-renglon hl-bloque'+(resto<0?' hl-rojo':'')+'">'+(resto<0?'Te pasaste del plan por ':'Hasta el cobro, ')+m(Math.abs(resto),resto<0?'hl-rojo':'hl-fuerte')+'</p>');
  if(H.dentro){
    x.push(FLOR);
    x.push('<h2 class="hl-titulo hl-rojo">Esta semana</h2>'+ADORNITO);
    var mismo=Math.round(H.semanaQueda)===Math.round(resto);
    if(H.semanaQueda<0)x.push('<p class="hl-renglon hl-rojo">Esta semana te pasaste por '+m(-H.semanaQueda,'hl-rojo')+'</p>');
    else if(!mismo)x.push('<p class="hl-renglon">Te quedan '+m(H.semanaQueda)+' hasta el '+e(diaNombre(H.fin))+'</p>');
    if(H.gastadoHoy>0)x.push('<p class="hl-renglon">Hoy gastaste '+m(H.gastadoHoy)+'</p>');
    var aj=D.hoy.ajuste;
    if(aj&&aj.estado==='minimo')x.push('<p class="hl-nota hl-cur hl-suave hl-bloque">El objetivo ya no se alcanza: esto cuida tu mínimo de '+mm(aj.minimo)+'.</p>');
    if(aj&&aj.estado==='nada')x.push('<p class="hl-nota hl-cur hl-rojo hl-bloque">Para tu mínimo faltan '+mm(aj.falta)+' aunque no gastes nada más.</p>');
    x.push('<p class="hl-dias hl-nota hl-suave" aria-label="Los días que quedan de la semana">'+diasSemana(t,H.dias).map(function(d,i){return i?'<span>'+e(d)+'</span>':'<span class="hl-hoy hl-sub hl-fuerte">'+e(d)+'</span>'}).join('<span aria-hidden="true">·</span>')+'</p>');
  }else x.push('<p class="hl-nota hl-cur hl-suave hl-bloque">'+(t>=D.hoy.cobro?'Llegó el cobro: empezá tu pacto nuevo en las notas.':'Hoy está fuera de las fechas de tu plan.')+'</p>');
  C.push({id:'hoy',titulo:'',bloques:x,min:.04});

  /* ---- Tus semanas ---- */
  var S=D.semanas;
  if(S&&S.ws.length){
    x=[];
    if(S.varias)x.push('<div class="hl-modo hl-nota" role="group" aria-label="Cómo repartir">'+b('parejo',{p:'#sem-hoy [data-reparto="parejo"]'},'hl-opcion '+(S.rec?'hl-suave':'hl-fuerte'))+'<span class="hl-suave" aria-hidden="true">·</span>'+b('optimizado',{p:'#sem-hoy [data-reparto="recomendado"]'},'hl-opcion '+(S.rec?'hl-fuerte':'hl-suave'))+'</div>'
      +'<p class="hl-nota hl-cur hl-suave">'+(S.rec?'menos al principio, más al final':'igual todos los días')+'</p>');
    S.ws.forEach(function(w){
      x.push('<ol class="hl-cuentas"><li><button class="hl-sem hl-toc" type="button" data-go="w'+w.i+'" aria-label="Semana '+(w.i+1)+', '+e(w.fechas)+': '+e(money(w.budget))+', '+e(w.lab)+'. Ver sus gastos">'
        +'<span class="hl-rom hl-libro">'+romano(w.i+1)+'</span>'+(w.cur?MANO:'')+'<span>'+e(w.fechas)+'</span>'
        +'<span class="hl-cifra '+(w.past?'hl-suave':'hl-fuerte')+'"><span class="hl-m">'+e(money(w.budget))+'</span></span>'
        +'<span class="hl-det hl-nota '+(w.over?'hl-rojo':'hl-suave')+'">'+(w.pct!=null?w.pct+' % · ':'')+e(w.lab)+(w.cur?' · hoy':'')+'</span></button></li></ol>');
    });
    C.push({id:'semanas',titulo:'Tus semanas',bloques:x});
  }

  /* ---- Tu plata ---- */
  var P=D.plata;
  x=['<p class="hl-renglon">Tenés '+m(P.tenes)+' · '+b('actualizar',{p:'#saldo-abrir',lab:'Actualizar lo que tenés'},'hl-nota')+'</p>'
    +(P.cuando&&P.cuando!=='actualizar'?'<p class="hl-nota hl-cur hl-suave">'+e(P.cuando)+'</p>':''),
    '<p class="hl-renglon hl-bloque">Guardás '+m(P.ahorro,'hl-oro')+' · '+b('actualizar',{p:'#ahorro-abrir',lab:'Actualizar lo que guardás'},'hl-nota')+'</p>'];
  if(P.apartado>0)x.push('<p class="hl-renglon hl-bloque">Además tenés '+m(P.apartado)+' apartados, que no se tocan · '+b('ver',{p:'#apartado-abrir'},'hl-nota')+'</p>');
  C.push({id:'plata',titulo:'Tu plata',bloques:x});

  /* ---- Notas al margen: los avisos de Hoy, con sus mismos botones ---- */
  var notas=avisos();
  if(notas.length)C.push({id:'notas',titulo:'Notas al margen',bloques:notas});

  /* ---- Índice (los números de página se ponen después de repartir) ---- */
  C.push({id:'indice',titulo:'Índice',bloques:['<nav class="hl-indice" aria-label="Índice">'
    +(notas.length?'<button class="hl-entrada hl-toc" type="button" data-cap="notas"><span>Notas al margen</span><span class="hl-libro hl-suave" data-num="notas"></span></button>':'')
    +'<button class="hl-entrada hl-toc" type="button" data-cap="plan"><span>Tu plan</span><span class="hl-libro hl-suave" data-num="plan"></span></button>'
    +'<button class="hl-entrada hl-toc" type="button" data-cap="consejos"><span>Consejos para ahorrar</span><span class="hl-libro hl-suave" data-num="consejos"></span></button></nav>']});

  /* ---- Tu plan ---- */
  var T=D.plan;
  if(T){
    x=['<p class="hl-nota hl-cur hl-suave">en qué se reparte tu plata del pacto</p><p class="hl-renglon hl-bloque">'+m(T.total)+' en total</p>',FLOR,
      '<p class="hl-renglon">'+m(T.fijos)+' para los fijos</p><p class="hl-nota hl-suave">'+(!T.hayFijos?'sin cargar':T.pend>0?'faltan pagar '+mm(T.pend):T.fijos>0?'todos pagos':'ninguno antes del cobro')+' · '+b(T.hayFijos?'ver fijos':'cargar fijos',{go:'fijos'})+'</p>',
      '<p class="hl-renglon hl-bloque">'+m(T.ahorro,'hl-oro')+' que guardás</p><p class="hl-nota hl-suave">'+(T.ahorro>0?'hasta el '+e(fechaLarga(T.cobro).replace(/^\S+ /,'')):'nada todavía')+'</p>',
      '<p class="hl-renglon hl-bloque">'+m(T.gastar)+' para gastar</p><p class="hl-nota hl-suave">ya gastaste '+mm(T.gastaste)+'</p>'];
    if(T.resto<0)x.push('<p class="hl-nota hl-cur hl-rojo hl-bloque">Te pasaste '+mm(-T.resto)+': no llegás a guardar todo.</p>');
    if(Math.round(T.fuera)>0)x.push('<p class="hl-nota hl-cur hl-suave hl-bloque">'+mm(T.fuera)+' en gastos fuera de las fechas del plan no cuentan.</p>');
    C.push({id:'plan',titulo:'Tu plan',bloques:x});
    var K=T.cobrar;
    if(K){
      x=['<p class="hl-nota hl-cur hl-suave">'+(K.real?'':'estimado')+(K.aguinaldo?(K.real?'':', ')+'con aguinaldo':'')+'</p><p class="hl-renglon hl-bloque">Vas a cobrar '+m(K.entra)+'</p>',FLOR,
        '<p class="hl-renglon">'+m(K.fijos)+' para los fijos del mes</p>',
        '<p class="hl-renglon hl-bloque">'+m(K.meta,'hl-oro')+' para tu meta</p>'+(K.metaPedida>K.meta?'<p class="hl-nota hl-suave">no entra '+mm(K.metaPedida)+'</p>':''),
        '<p class="hl-renglon hl-bloque">'+m(Math.max(0,K.libre))+' para gastar</p><p class="hl-nota hl-suave">'+(K.libre>0?mm(K.semana)+' por semana':'no alcanza')+'</p>'];
      if(K.libre<0)x.push('<p class="hl-nota hl-cur hl-rojo hl-bloque">No te alcanza para la meta: faltan '+mm(-K.libre)+'.</p>');
      if(K.dolar)x.push('<p class="hl-nota hl-cur hl-suave hl-bloque">Si el dólar se mueve un '+e(K.dolar.pct)+' %, lo libre cambia ≈ '+mm(K.dolar.cambio)+'.</p>');
      if(K.extra)x.push('<p class="hl-nota hl-cur hl-suave hl-bloque">Este mes llevás '+mm(K.extra)+' de horas extra.</p>');
      x.push('<p class="hl-nota hl-bloque">'+b('ver tu cobro',{go:'sueldo'})+'</p>');
      C.push({id:'cobrar',titulo:'Cuando cobres',bloques:x});
    }
  }
  /* ---- Consejos para ahorrar ---- */
  var J=D.consejos;
  if(J){
    C.push({id:'consejos',titulo:'Consejos para ahorrar',bloques:['<p class="hl-nota hl-cur hl-suave">un mes optimizado, semana por semana</p>'
      +'<ol class="hl-mes" aria-label="Cómo repartir el mes">'+J.pcts.map(function(p,i){return '<li><span class="hl-libro hl-rom2">'+romano(i+1)+'</span><span>'+e(J.pal[i])+', <span class="hl-cifra hl-fuerte">'+Math.round(p)+' %</span></span></li>'}).join('')+'</ol>',
      FLOR,'<p class="hl-nota hl-cur hl-suave">Con «optimizado», tus semanas<br>se reparten así.</p>']});
    C.push({id:'ideas',titulo:'Seis ideas rápidas',bloques:J.ideas.map(function(d,i){return '<ol class="hl-ideas"><li><span class="hl-libro hl-rom2 hl-fuerte">'+romano(i+1)+'</span><span>'+e(d[0])+' '+e(d[1])+'</span></li></ol>'})});
  }
  return C;
}

/* ---------- los avisos de la página clásica, como notas al margen ----------
   Hoy muestra una sola nota a la vez (ui/notas.js esconde las otras): acá van todas, en el mismo orden de importancia. */
var LUGARES=['#superv','#pasar-aviso','#recibo-aviso','#repaso-aviso','#entradas','#tarjeta-aviso','#resp-aviso','#ritmo-aviso','#fer-aviso','#hoy-out','#resumen-out'];
var ENTEROS=['#superv','#entradas','#hoy-out'];  /* acá también cuenta lo que no es un aviso (una tarjeta, la lista de gastos de hoy) */
function peso(x){
  if(x.closest('#cierre-aviso'))return -2;if(x.closest('#meta-alerta')||x.classList.contains('alerta'))return -1;
  if(x.querySelector('[data-cero]'))return 1;
  if(x.classList.contains('deudas')||x.classList.contains('entrada')||x.closest('#recibo-aviso')||x.closest('#pasar-aviso')||x.closest('#repaso-aviso'))return 2;
  if(x.closest('#tarjeta-aviso'))return 3;if(x.closest('#ritmo-aviso'))return 4;if(x.closest('#resp-aviso'))return 5;return 6;
}
function textoDe(raizN){
  var o=[];(function rec(x){
    if(x.nodeType===3){o.push(x.textContent);return}
    if(x.nodeType!==1)return;var tg=x.tagName.toLowerCase();
    if(tg==='button'||tg==='svg'||tg==='input'||tg==='select'||tg==='textarea'||x.getAttribute('aria-hidden')==='true'||x.classList.contains('nota-pag')||(x!==raizN&&x.hidden))return;
    o.push(' ');  /* entre elemento y elemento, un espacio (si no, «$ 11.000Alquiler») */
    [].forEach.call(x.childNodes,rec);
  })(raizN);
  return o.join('').replace(/\s+/g,' ').trim();
}
function avisos(){
  proxies=[];var l=[];
  ['#cierre-aviso','#meta-alerta','#duo-hoy'].forEach(function(s){var c=$(s);if(c)[].forEach.call(c.children,function(x){l.push(x)})});
  LUGARES.forEach(function(s){var c=document.querySelector('#p-resumen '+s);if(!c)return;
    [].forEach.call(c.children,function(x){if(x.classList.contains('banner')||(ENTEROS.indexOf(s)>=0&&!x.classList.contains('nota-pag')))l.push(x)})});
  l=l.map(function(x,i){return {x:x,p:peso(x),i:i}}).sort(function(a,c){return a.p-c.p||a.i-c.i}).map(function(o){return o.x});
  var notas=[];
  l.forEach(function(c){
    var txt=textoDe(c);if(!txt)return;
    var complejo=!!c.querySelector('input,select,textarea,form,details,canvas,.glist,.chips');
    if(complejo&&txt.length>170)txt=txt.slice(0,160).replace(/\s+\S*$/,'')+'…';
    var botones=complejo?[]:[].slice.call(c.querySelectorAll('button,a[href]')).filter(function(x){return !x.closest('.nota-pag')&&!x.closest('[hidden]:not(.banner)')&&x.textContent.trim()});
    var bs=botones.map(function(x){proxies.push(x);return '<button class="hl-toc hl-sub" type="button" data-px="'+(proxies.length-1)+'">'+e(x.textContent.replace(/\s+/g,' ').trim())+'</button>'});
    if(complejo){proxies.push(c);bs=['<button class="hl-toc hl-sub" type="button" data-px="'+(proxies.length-1)+'" data-c="1">abrir</button>']}
    notas.push('<aside class="hl-margen hl-rojo"><p>'+e(txt)+'</p>'+(bs.length?'<p class="hl-acciones hl-nota">'+bs.join('<span aria-hidden="true">·</span>')+'</p>':'')+'</aside>');
  });
  return notas;
}

/* ---------- armar el libro ---------- */
function montar(){
  if(el)return;
  el=document.createElement('div');el.className='hl';el.id='hoy-libro';el.hidden=true;
  el.innerHTML='<div class="hl-vista"><img class="hl-fondo" alt="" aria-hidden="true"><div class="hl-luz" aria-hidden="true"></div><div class="hl-pags"></div></div>'
    +'<nav class="hl-acc" aria-label="Acciones"><button type="button" data-p="#discreto" class="hl-ocultar">ocultar</button><span class="hl-pt" aria-hidden="true">·</span><button type="button" data-p="#libro-cerrar">volver</button><span class="hl-pt" aria-hidden="true">·</span><button type="button" data-go="ajustes">ajustes</button></nav>'
    +'<button class="hl-esq" type="button" data-esq="-1" aria-label="Volver una página"></button><button class="hl-esq" type="button" data-esq="1" aria-label="Pasar la hoja"></button>'
    +'<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'
    +'<g id="hl-floritura" style="fill:var(--hl-trazo)"><path d="M4 12.8 C 26 11, 44 5.6, 62 9.6 C 72 11.8, 80 16, 90 13.4 C 82 17.8, 71 14.8, 61 11.8 C 44 7.4, 26 13.6, 4 12.8z"/><path d="M216 11.6 C 194 12.4, 176 6.8, 158 9.4 C 148 11.2, 140 15.2, 130 13.6 C 138 17.2, 149 14.2, 159 11.4 C 176 8.4, 194 12.6, 216 11.6z"/><path d="M62 9.6 C 64 3.2, 74 2.6, 75 8 C 75.6 12, 69.6 12.6, 69.4 9 C 69.4 7.4, 71.2 6.8, 71.8 8 C 71.2 7.6, 70.4 8, 70.6 9 C 71 11, 74 10.4, 73.8 8 C 73.4 4.4, 66 4.6, 62 9.6z"/><path d="M158 9.4 C 156 3.2, 146 2.6, 145 8 C 144.4 12, 150.4 12.6, 150.6 9 C 150.6 7.4, 148.8 6.8, 148.2 8 C 148.8 7.6, 149.6 8, 149.4 9 C 149 11, 146 10.4, 146.2 8 C 146.6 4.4, 154 4.6, 158 9.4z"/><path d="M110 5.4 C 112.4 9, 114.4 10.6, 117.4 12 C 114.4 13.4, 112.4 15, 110 18.6 C 107.6 15, 105.6 13.4, 102.6 12 C 105.6 10.6, 107.6 9, 110 5.4z" style="fill:var(--hl-trazo-oro)"/><circle cx="97" cy="12.8" r="1.3"/><circle cx="123" cy="12.4" r="1.2"/></g>'
    +'<g id="hl-adornito" style="fill:var(--hl-trazo-rojo)"><path d="M6 10 C 20 9, 30 5.4, 40 8.6 C 44 9.8, 46 11.6, 48 11 C 44 13.4, 38 10.8, 32 10 C 22 8.8, 14 11, 6 10z"/><path d="M94 9.6 C 80 10.4, 70 6, 60 8.4 C 56 9.4, 54 11.2, 52 10.8 C 56 13, 62 10.6, 68 10 C 78 9, 86 10.6, 94 9.6z"/><path d="M50 4.4 C 51.6 7, 53 8.2, 55 9.4 C 53 10.6, 51.6 11.8, 50 14.4 C 48.4 11.8, 47 10.6, 45 9.4 C 47 8.2, 48.4 7, 50 4.4z"/></g>'
    +'</defs></svg>';
  document.body.appendChild(el);
  var v=document.createElement('button');v.className='hl-volver';v.id='hl-volver';v.type='button';v.hidden=true;v.textContent='Volver al libro';
  v.addEventListener('click',function(){salirClasico()});document.body.appendChild(v);
  mesa=el;vista=el.querySelector('.hl-vista');img=el.querySelector('.hl-fondo');luz=el.querySelector('.hl-luz');
  tintas();MANCHAS=[3,11,19,29,41].map(mancha);
  el.addEventListener('click',clic);
  el.querySelectorAll('[data-esq]').forEach(function(x){x.addEventListener('click',function(){if(!arrastro)ir(n+Number(x.getAttribute('data-esq')))})});
  iniciarDedo();
  addEventListener('resize',function(){if(activo()&&!G)armar()});
  addEventListener('orientationchange',function(){setTimeout(function(){if(activo()&&!G)armar()},80)});
  document.addEventListener('keydown',function(ev){if(!activo()||G)return;if(ev.key==='ArrowRight')ir(n+1);if(ev.key==='ArrowLeft')ir(n-1)});
  /* lo que pide la página clásica: el formulario de «lo que tenés» y el tour */
  var mo=new MutationObserver(function(){revisar()});
  var sc=$('#saldo-card');if(sc)mo.observe(sc,{attributes:true,attributeFilter:['hidden']});
  mo.observe(document.body,{childList:true});
}
function clic(ev){
  var x=ev.target.closest('button');if(!x||!el.contains(x))return;
  var px=x.getAttribute('data-px'),p=x.getAttribute('data-p'),go=x.getAttribute('data-go'),cap=x.getAttribute('data-cap');
  if(cap){var k=PAGS.findIndex(function(pg){return pg.dataset.cap===cap});if(k>=0)ir(k+1);return}
  if(go){if(ctx.go)ctx.go(go);return}
  var dest=px!=null?proxies[+px]:p?document.querySelector(p):null;
  if(!dest)return;
  if(x.getAttribute('data-c')){entrarClasico(true);var bn=dest.closest('.banner');if(bn)bn.hidden=false;if(dest.tagName!=='BUTTON'){try{dest.scrollIntoView({block:'center'})}catch(er){}return}}
  dest.click();
  /* algunas notas se descartan sin volver a dibujar Hoy (p. ej. «Ya lo vi»): se rearma el libro en la misma página */
  setTimeout(function(){if(activo()&&!G&&ultimo===datos)armar()},120);
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
  return !!datos&&ctx.tab==='resumen'&&libroEnUso()==='solo'&&!clasico&&!tourAbierto()
    &&!document.querySelector('#hoja.sin-pacto,.sin-pacto#hoja')&&!!ctx.state&&!document.getElementById('app').hidden;
}
function mostrar(){
  if(!el)return;
  var a=activo(),v=$('#hl-volver');
  if(v)v.hidden=!(clasico&&ctx.tab==='resumen'&&libroEnUso()==='solo');
  raiz.classList.toggle('hoy-libro',a);
  if(a&&el.hidden){el.hidden=false;conLetras()}
  else if(!a&&!el.hidden){el.hidden=true}
}

/* reparte cada capítulo en páginas: si un bloque no entra, sigue en la página siguiente (con el mismo título) */
function armar(){
  if(!datos||G)return;
  var pags=el.querySelector('.hl-pags'),cap=PAGS[n-1]&&PAGS[n-1].dataset.cap;
  pags.innerHTML='';PAGS=[];semilla=0;
  var w=mesa.clientWidth,h=mesa.clientHeight,s=Math.min(1,Math.max(.85,.85+(w-320)/70*.15));raiz.style.setProperty('--s',s.toFixed(3));
  var tam={izq:medidas('izq',w,h),der:medidas('der',w,h)};
  function nueva(c,sigue){
    var k=PAGS.length+1,lado=k%2?'der':'izq',pg=document.createElement('article');
    pg.className='hl-pag hl-mide';pg.dataset.cap=c.id;pg.dataset.lado=lado;pg.dataset.n=k;
    pg.style.width=tam[lado].pw+'px';pg.style.height=tam[lado].ph+'px';pg.style.setProperty('--a',String(c.min||.3));
    pg.setAttribute('aria-label','Página '+romano(k).toLowerCase()+(c.titulo?': '+c.titulo:''));
    if(c.titulo){pg.insertAdjacentHTML('beforeend','<h2 class="hl-titulo hl-rojo">'+e(c.titulo)+'</h2>'+ADORNITO+(sigue?'<p class="hl-nota hl-cur hl-suave">sigue</p>':''));[].slice.call(pg.childNodes).forEach(aPluma)}
    pags.appendChild(pg);PAGS.push(pg);return pg;
  }
  var C=capitulos(datos);
  C.forEach(function(c){
    var pg=nueva(c,false),puestos=0;
    c.bloques.forEach(function(html){
      var tmp=document.createElement('div');tmp.innerHTML=html;var nodos=[].slice.call(tmp.childNodes);
      nodos.forEach(function(x){pg.appendChild(x)});nodos.forEach(aPluma);
      if(sobra(pg)>0&&puestos>0){nodos.forEach(function(x){x.remove()});pg=nueva(c,true);nodos.forEach(function(x){pg.appendChild(x)});puestos=0}
      puestos++;
    });
  });
  /* número de página, índice, subrayados, manchas, gotas */
  PAGS.forEach(function(pg,i){pg.insertAdjacentHTML('beforeend','<p class="hl-folio hl-libro hl-suave">— '+romano(i+1).toLowerCase()+' —</p>');pg.classList.remove('hl-mide')});
  pags.querySelectorAll('[data-num]').forEach(function(x){var k=PAGS.findIndex(function(pg){return pg.dataset.cap===x.getAttribute('data-num')});x.textContent=k>=0?romano(k+1).toLowerCase():''});
  pags.querySelectorAll('.hl-sub').forEach(function(x,i){x.insertAdjacentHTML('beforeend',trazo(50+i*13,!!x.closest('.hl-rojo')))});
  var tapado=discreto.on;
  pags.querySelectorAll('.hl-m').forEach(function(x,i){x.style.setProperty('--mancha',MANCHAS[i%MANCHAS.length]);x.classList.toggle('hl-tapada',tapado);if(tapado){x.setAttribute('role','img');x.setAttribute('aria-label','monto oculto')}});
  pags.querySelectorAll('[data-gotas]').forEach(function(x,i){if(tapado)return;[[.93,.2,3.2],[.06,.86,2.2]].forEach(function(g,j){var d=document.createElement('span');d.className='hl-gota';d.setAttribute('aria-hidden','true');var r=g[2]*(i?.65:1);d.style.cssText='left:'+(g[0]*100)+'%;top:'+(g[1]*100)+'%;width:calc('+r+'px*var(--s));height:calc('+(r*.86).toFixed(2)+'px*var(--s))';x.appendChild(d)})});
  var oc=el.querySelector('.hl-ocultar');oc.textContent=tapado?'mostrar':'ocultar';oc.setAttribute('aria-pressed',String(tapado));
  /* se queda en la misma página (o, si cambió de lugar, en el primer lugar de su capítulo) */
  if(!(PAGS[n-1]&&PAGS[n-1].dataset.cap===cap)){var k=cap?PAGS.findIndex(function(pg){return pg.dataset.cap===cap}):-1;n=k>=0?k+1:Math.min(Math.max(1,n),PAGS.length)}
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
  aire(pg,M.ph,pg.dataset.cap==='hoy'?.04:.2);curvar(pg,M.pw);
  var ad=el.querySelector('[data-esq="1"]'),at=el.querySelector('[data-esq="-1"]'),q=M.q;
  ad.style.left=(Math.min(w,q[2][0])-50).toFixed(1)+'px';ad.style.top=(Math.min(h,q[2][1])-50).toFixed(1)+'px';ad.hidden=n>=PAGS.length;
  at.style.left=(Math.max(0,q[3][0])-6).toFixed(1)+'px';at.style.top=(Math.min(h,q[3][1])-50).toFixed(1)+'px';at.hidden=n<=1;
  geo={q:q,w:w,h:h};
}
/* cuánto se pasa lo escrito del margen de abajo de la página (el navegador no lo cuenta como desborde: se mide a mano) */
function sobra(pg){
  var fin=0,lim=pg.clientHeight-parseFloat(getComputedStyle(pg).paddingBottom);
  [].forEach.call(pg.children,function(x){if(x.classList.contains('hl-folio')||typeof x.offsetTop!=='number')return;fin=Math.max(fin,x.offsetTop+x.offsetHeight)}); /* (los adornos son SVG: no tienen offsetTop) */
  return fin-lim;
}
/* nada de scroll: si sobra lugar, más aire entre bloques; si falta, menos (la letra no cambia) */
function aire(pg,h,min){
  var a=1;pg.style.setProperty('--a','1');
  while(sobra(pg)>0&&a>min){a-=.06;pg.style.setProperty('--a',a.toFixed(2))}
  /* la última línea baja un poco con la curva de la hoja: se la deja lejos del número de página */
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
function crearGiro(dir){
  var destino=n+dir;if(destino<1||destino>PAGS.length)return null;
  var viejo=limpiaIds(vista.cloneNode(true)),q=geo.q,W0=geo.w,H0=geo.h,desde=n;
  var xL=Math.min(q[0][0],q[3][0]),xR=Math.max(q[1][0],q[2][0]),yT=Math.min(q[0][1],q[1][1]),yB=Math.max(q[2][1],q[3][1]),W=xR-xL,H=yB-yT,sw=W/NF;
  var yt=function(x){return q[0][1]+(q[1][1]-q[0][1])*(x-q[0][0])/(q[1][0]-q[0][0])},yb=function(x){return q[3][1]+(q[2][1]-q[3][1])*(x-q[3][0])/(q[2][0]-q[3][0])};
  n=destino;acomodar();
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
  if(G||destino===n||destino<1||destino>PAGS.length)return;
  if(quieto()||Math.abs(destino-n)>1){fundido(destino);return}
  var g=crearGiro(destino>n?1:-1);if(!g)return;G=g;animar(g,0,1,600,terminar(g,true));
}
function fundido(destino){
  var viejo=limpiaIds(vista.cloneNode(true));viejo.className='hl-vista hl-viejo';n=destino;acomodar();mesa.appendChild(viejo);
  if(!viejo.animate){viejo.remove();return}
  viejo.animate([{opacity:1},{opacity:0}],{duration:300,easing:'ease-in-out'}).onfinish=function(){viejo.remove()};
}
/* con el dedo: la hoja se levanta y acompaña al dedo; al soltar, termina o vuelve */
var toque=null,arrastro=false;
function iniciarDedo(){
  mesa.addEventListener('pointerdown',function(ev){if(G||ev.target.closest('.hl-acc'))return;try{getSelection().removeAllRanges()}catch(x){}toque={x:ev.clientX,y:ev.clientY,id:ev.pointerId,pts:[[ev.clientX,performance.now()]]};arrastro=false});
  mesa.addEventListener('pointermove',function(ev){
    if(!toque||ev.pointerId!==toque.id)return;var dx=ev.clientX-toque.x,dy=ev.clientY-toque.y;
    toque.pts.push([ev.clientX,performance.now()]);if(toque.pts.length>8)toque.pts.shift();
    if(!arrastro){
      if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.2)return;
      var dir=dx<0?1:-1;if(n+dir<1||n+dir>PAGS.length){toque=null;return}
      arrastro=true;try{mesa.setPointerCapture(ev.pointerId)}catch(x){}
      if(quieto()){toque.quieto=dir;return}
      G=crearGiro(dir);if(!G){toque=null;return}
    }
    if(G)G.pintar(Math.max(0,-G.dir*dx)/G.W);
  });
  function soltar(ev){
    if(!toque||ev.pointerId!==toque.id)return;var t=toque;toque=null;
    if(!arrastro)return;setTimeout(function(){arrastro=false},0);
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
    /* después de que la app termina de dibujar Hoy (los avisos se completan después de renderResumen) */
    requestAnimationFrame(function(){mostrar();if(activo())conLetras()});
  };
}
/* se arma con la letra ya cargada (si no, las medidas salen con la letra de reemplazo) y una sola vez por cada dibujo de Hoy */
function conLetras(){
  var ya=function(){if(!activo())return;if(G){pendiente=true;return}if(ultimo!==datos||!PAGS.length)armar()};
  if(document.fonts&&document.fonts.load)Promise.all([document.fonts.load('400 20px Charm'),document.fonts.load('400 20px "IM Fell SC"')]).catch(function(){}).then(ya);else ya();
}
