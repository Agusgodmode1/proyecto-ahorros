/* La tapa de tela (2.8): una galaxia espiral en la tela, costura a la vista, estrellas bordadas con la forma del brote,
   el título en dorado estampado con un brillo que sigue al dedo, capas con profundidad y guardas con un mapa de estrellas.
   - La galaxia se dibuja UNA sola vez en un canvas; después solo se anima con transform y opacity (gira con CSS).
   - Lo que sigue al dedo (brillo y capas) se mueve en un requestAnimationFrame que solo corre mientras hay algo que mover.
   - Con «reducir movimiento», todo queda quieto. Todo color de la tela sale de las variables de papel.css. */

function quieto(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
/* Azar con semilla: la tapa sale siempre igual */
function azar(s){return function(){s|=0;s=s+0x6D2B79F5|0;var t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function campana(r){return (r()+r()+r()-1.5)/1.5}

/* ---------- La galaxia (canvas, se dibuja una vez) ---------- */
function halo(c,x,y,rad,rgb,a){var g=c.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,'rgba('+rgb+','+a+')');g.addColorStop(1,'rgba('+rgb+',0)');c.fillStyle=g;c.beginPath();c.arc(x,y,rad,0,7);c.fill()}
var COL={blanco:'255,244,222',celeste:'56,182,255',cobalto:'47,96,255',profundo:'18,56,166',violeta:'124,92,255',hielo:'205,228,255'};
export function dibujarGalaxia(cv,lado){
  var dpr=Math.min(2,window.devicePixelRatio||1),S=Math.max(64,Math.round(lado*dpr));
  cv.width=S;cv.height=S;
  var c=cv.getContext('2d');if(!c)return;
  var R=S/2,r=azar(11),u=S/600;
  c.translate(R,R);c.globalCompositeOperation='lighter';
  halo(c,0,0,R*.98,COL.profundo,.42);
  halo(c,0,0,R*.62,COL.cobalto,.16);
  halo(c,0,0,R*.34,COL.celeste,.16);
  /* dos brazos espirales: estrellas sueltas y nubes de gas a lo largo de cada brazo */
  for(var b=0;b<2;b++){
    for(var i=0;i<1900;i++){
      var t=Math.pow(r(),.8),ang=b*Math.PI+t*3.4*Math.PI,rad=R*(.06+.88*t),ab=(.022+.085*t)*R;
      var x=Math.cos(ang)*rad+campana(r)*ab,y=Math.sin(ang)*rad+campana(r)*ab;
      var tono=t<.18?(r()<.6?COL.blanco:COL.hielo):t<.55?(r()<.7?COL.celeste:COL.hielo):(r()<.65?COL.cobalto:COL.celeste);
      if(t>.3&&r()<.13)tono=COL.violeta;
      var tam=(.5+1.7*Math.pow(r(),4))*u*1.6;
      c.fillStyle='rgba('+tono+','+(.35+.6*r()).toFixed(2)+')';c.beginPath();c.arc(x,y,tam,0,7);c.fill();
      if(i%8===0)halo(c,x,y,R*(.03+.05*t),t>.45&&r()<.35?COL.violeta:COL.celeste,.09);
      if(i%140===0&&t>.25)halo(c,x,y,R*.025,COL.blanco,.5);
    }
  }
  /* estrellas sueltas entre los brazos */
  for(var k=0;k<380;k++){var a=r()*7,d=R*Math.sqrt(r())*.95;c.fillStyle='rgba('+COL.hielo+','+(.15+.4*r()).toFixed(2)+')';c.beginPath();c.arc(Math.cos(a)*d,Math.sin(a)*d,(.4+.8*r())*u*1.4,0,7);c.fill()}
  /* núcleo blanco cálido */
  halo(c,0,0,R*.26,COL.blanco,.38);
  halo(c,0,0,R*.12,COL.blanco,.75);
  halo(c,0,0,R*.045,'255,255,255',1);
}

/* ---------- Costura: lomo cosido a la japonesa, puntada corrida, esquineros de tela ----------
   La tapa siempre mide 100 × 138 (la proporción de --lb-h), así que el dibujo escala parejo. */
var AGUJEROS=[11,40,69,98,127];
function hilo(d,ancho,dash){
  var da=dash?' stroke-dasharray="'+dash+'"':'';
  return '<path d="'+d+'" stroke="#02061c" stroke-opacity=".55" stroke-width="'+(ancho+.25)+'" transform="translate(.28 .4)"'+da+'/>'
    +'<path d="'+d+'" class="h" stroke-width="'+ancho+'"'+da+'/>'
    +'<path d="'+d+'" stroke="#FFF6DC" stroke-opacity=".5" stroke-width="'+(ancho*.32).toFixed(2)+'" transform="translate(-.1 -.16)"'+da+'/>';
}
export function costuraHTML(){
  var lomo='M5.2 '+AGUJEROS[0]+'V'+AGUJEROS[AGUJEROS.length-1]+'M5.2 '+AGUJEROS[0]+'V-2M5.2 '+AGUJEROS[AGUJEROS.length-1]+'V140'
    +AGUJEROS.map(function(y){return 'M5.2 '+y+'H-2'}).join('');
  var esq=function(d,linea){return '<path d="'+d+'" fill="url(#lb-tela-esq)"/><path d="'+d+'" fill="url(#lb-esq-luz)"/>'+hilo(linea,.5,'1.7 1.2')};
  return '<svg class="lb-costura" viewBox="0 0 100 138" preserveAspectRatio="none" aria-hidden="true" fill="none" stroke-linecap="round"><defs>'
    +'<pattern id="lb-tela-esq" width="1.4" height="1.4" patternUnits="userSpaceOnUse"><rect width="1.4" height="1.4" class="t1"/><path d="M0 .35h1.4M.35 0v1.4" stroke="#1d3a9e" stroke-width=".45" stroke-opacity=".75"/></pattern>'
    +'<linearGradient id="lb-esq-luz" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6f8ff0" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>'
    +'<linearGradient id="lb-lomo-sombra" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset=".85" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs>'
    /* la bisagra del lomo: más oscura, con un surco */
    +'<rect x="0" y="0" width="11" height="138" fill="url(#lb-lomo-sombra)"/>'
    +'<path d="M11 0V138" stroke="#02061c" stroke-opacity=".5" stroke-width=".55"/><path d="M11.55 0V138" stroke="#8fa8ff" stroke-opacity=".16" stroke-width=".35"/>'
    +AGUJEROS.map(function(y){return '<circle cx="5.2" cy="'+y+'" r=".85" fill="#02061c" fill-opacity=".8"/>'}).join('')
    +hilo(lomo,.95)
    /* puntada corrida alrededor de la tapa */
    +hilo('M15 6.5H92.5Q94 6.5 94 8V130Q94 131.5 92.5 131.5H15Q13.5 131.5 13.5 130V8Q13.5 6.5 15 6.5Z',.6,'2.4 1.5')
    /* esquineros de tela en las dos esquinas del canto */
    +esq('M84 0H100V16Z','M86.6 0L100 13.4')+esq('M84 138H100V122Z','M86.6 138L100 124.6')
    +'</svg>';
}

/* ---------- Estrellas bordadas en hilo dorado, unidas con puntadas: la constelación del brote ---------- */
var EST={A:[60,70],B:[60,53],C:[60,39],D:[60,23],E:[44,45],F:[29,27],K:[48,33],G:[76,35],H:[93,15],L:[75,22]};
export function bordadoHTML(){
  function p(k){return EST[k].join(' ')}
  function lin(ks){return 'M'+ks.map(p).join('L')}
  var trazos=lin(['A','B','C','D'])+lin(['B','E','F','K','C'])+lin(['C','G','H','L','D'])+'M46 74L74 74';
  var grandes=['A','B','C','D','F','H'],chicas=['E','K','G','L'];
  function estrella(k,s){return '<use href="#lb-pt" transform="translate('+p(k)+') scale('+s+')"/>'}
  return '<svg class="lb-bordado" viewBox="0 0 120 80" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round"><defs>'
    +'<g id="lb-pt"><path d="M0-3.8V3.8M-3.8 0H3.8M-2.3-2.3L2.3 2.3M-2.3 2.3L2.3-2.3" stroke="#02061c" stroke-opacity=".6" stroke-width="1.5" transform="translate(.45 .6)"/>'
    +'<path d="M0-3.8V3.8M-3.8 0H3.8" class="h" stroke-width="1.3"/><path d="M-2.3-2.3L2.3 2.3M-2.3 2.3L2.3-2.3" class="h" stroke-width=".95"/>'
    +'<circle r="1.05" fill="#FFF3D2"/></g></defs>'
    +hiloB(trazos)
    +grandes.map(function(k){return estrella(k,k==='D'?1.35:1.15)}).join('')+chicas.map(function(k){return estrella(k,.62)}).join('')
    +'</svg>';
}
function hiloB(d){
  return '<path d="'+d+'" stroke="#02061c" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="3.3 2.1" transform="translate(.45 .6)"/>'
    +'<path d="'+d+'" class="h" stroke-width="1.15" stroke-dasharray="3.3 2.1"/>'
    +'<path d="'+d+'" stroke="#FFF6DC" stroke-opacity=".55" stroke-width=".4" stroke-dasharray="3.3 2.1" transform="translate(-.18 -.26)"/>';
}

/* ---------- El título en dorado estampado: el brillo es una franja recortada con la forma de las letras ---------- */
export function tituloHTML(){
  var t='<text x="100" y="47" text-anchor="middle" class="lb-foil-t"';
  return '<svg class="lb-foil" viewBox="0 0 200 60" aria-hidden="true"><defs>'
    +'<linearGradient id="lb-oro-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFEBB0"/><stop offset=".42" stop-color="#E9BC5C"/><stop offset=".72" stop-color="#B98632"/><stop offset="1" stop-color="#ECC874"/></linearGradient>'
    +'<linearGradient id="lb-brillo-f" x1="0" x2="1"><stop offset="0" stop-color="#FFFBEA" stop-opacity="0"/><stop offset=".5" stop-color="#FFFBEA" stop-opacity=".95"/><stop offset="1" stop-color="#FFFBEA" stop-opacity="0"/></linearGradient>'
    +'<clipPath id="lb-tit-clip">'+t+'>Ahorro</text></clipPath></defs>'
    +t.replace('x="100" y="47"','x="100.7" y="48.3"')+' fill="#02061c" fill-opacity=".6">Ahorro</text>'
    +t+' fill="url(#lb-oro-f)">Ahorro</text>'
    +'<g clip-path="url(#lb-tit-clip)"><g transform="skewX(-22)"><rect class="lb-brillo" x="-40" y="0" width="38" height="60" fill="url(#lb-brillo-f)"/></g></g>'
    +'</svg>';
}

/* ---------- Las guardas: el mapa de estrellas de la cara interna de la tapa ---------- */
var GUARDAS=null;
export function guardasHTML(){
  if(GUARDAS)return GUARDAS;
  var r=azar(23),h='',cx=50,cy=69;
  for(var i=0;i<150;i++){var x=r()*100,y=r()*138;h+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(.15+.5*Math.pow(r(),3)).toFixed(2)+'" fill="'+(r()<.25?'#9DB4FF':'#EEF0FF')+'" fill-opacity="'+(.35+.6*r()).toFixed(2)+'"/>'}
  var red='';
  [16,30,44,58].forEach(function(rr,j){red+='<circle cx="'+cx+'" cy="'+cy+'" r="'+rr+'"'+(j===2?' stroke-dasharray="1 1.4"':'')+'/>'});
  for(var a=0;a<12;a++){var g=a*Math.PI/6;red+='<path d="M'+(cx+Math.cos(g)*7).toFixed(1)+' '+(cy+Math.sin(g)*7).toFixed(1)+'L'+(cx+Math.cos(g)*62).toFixed(1)+' '+(cy+Math.sin(g)*62).toFixed(1)+'"/>'}
  /* tres constelaciones y el brote en el centro, en dorado */
  var cons=[[[18,22],[26,17],[33,24],[30,33],[21,31]],[[70,108],[78,100],[86,104],[92,96]],[[74,24],[82,30],[80,40],[88,44]],[[14,104],[20,112],[28,110],[32,120]]];
  var c2='';
  cons.forEach(function(k){c2+='<path d="M'+k.map(function(p){return p.join(' ')}).join('L')+'"/>';k.forEach(function(p){c2+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r=".9" fill="#F3D488" stroke="none"/>'})});
  var brote='<path d="M50 80V60M50 72L42 66L36 58M50 64L57 60L63 52"/><circle cx="50" cy="58" r="1.3" fill="#F3D488" stroke="none"/><circle cx="36" cy="58" r="1" fill="#F3D488" stroke="none"/><circle cx="63" cy="52" r="1" fill="#F3D488" stroke="none"/><circle cx="50" cy="80" r="1" fill="#F3D488" stroke="none"/>';
  GUARDAS='<svg class="lb-guardas" viewBox="0 0 100 138" preserveAspectRatio="none" aria-hidden="true">'
    +'<defs><radialGradient id="lb-g-fondo" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#1A3FA8"/><stop offset=".55" stop-color="#0F2470"/><stop offset="1" stop-color="#081133"/></radialGradient></defs>'
    +'<rect width="100" height="138" fill="url(#lb-g-fondo)"/>'
    +'<g fill="none" stroke="#E2B65A" stroke-opacity=".28" stroke-width=".25">'+red+'</g>'
    +'<ellipse cx="50" cy="69" rx="52" ry="20" transform="rotate(-24 50 69)" fill="none" stroke="#9DB4FF" stroke-opacity=".35" stroke-width=".3" stroke-dasharray="1.6 1.2"/>'
    +h
    +'<g fill="none" stroke="#E2B65A" stroke-opacity=".8" stroke-width=".4" stroke-linecap="round" stroke-linejoin="round">'+c2+brote+'</g>'
    +'<rect x="6" y="6" width="88" height="126" rx="1.5" fill="none" stroke="#E2B65A" stroke-opacity=".45" stroke-width=".35"/>'
    +'</svg>';
  return GUARDAS;
}

/* ---------- Montar: dibuja la galaxia y engancha el dedo ---------- */
var estado=null;
export function montarTapa(mesa){
  var gal=mesa.querySelector('.lb-gal-gira');
  if(gal&&!gal.querySelector('canvas')){
    var cv=document.createElement('canvas');cv.setAttribute('aria-hidden','true');
    gal.appendChild(cv);dibujarGalaxia(cv,gal.offsetWidth||300);
  }
  if(estado&&estado.mesa===mesa)return;
  estado={mesa:mesa,nx:0,ny:0,tx:0,ty:0,on:false,raf:0,movido:false,x0:0,y0:0,capas:[]};
  if(quieto())return;
  var S=estado,escena=mesa.querySelector('.lb-escena');
  function capas(){S.capas=[].map.call(mesa.querySelectorAll('[data-k]'),function(el){return {el:el,k:Number(el.getAttribute('data-k'))}});S.gira=mesa.querySelector('.lb-gira');S.brillo=mesa.querySelector('.lb-brillo')}
  capas();
  function apuntar(e){
    var b=escena.getBoundingClientRect();if(!b.width)return;
    S.tx=Math.max(-1,Math.min(1,(e.clientX-(b.left+b.width/2))/(b.width*.75)));
    S.ty=Math.max(-1,Math.min(1,(e.clientY-(b.top+b.height/2))/(b.height*.75)));
    if(Math.abs(e.clientX-S.x0)+Math.abs(e.clientY-S.y0)>10)S.movido=true;
    if(!S.raf)S.raf=requestAnimationFrame(cuadro);
  }
  function cuadro(){
    S.raf=0;
    if(document.documentElement.classList.contains('lb-pausa'))return;
    S.nx+=(S.tx-S.nx)*.14;S.ny+=(S.ty-S.ny)*.14;
    var x=S.nx,y=S.ny;
    S.capas.forEach(function(c){c.el.style.transform='translate3d('+(x*c.k).toFixed(2)+'px,'+(y*c.k*.8).toFixed(2)+'px,0)'});
    if(S.gira)S.gira.style.transform='rotateY('+(x*7).toFixed(2)+'deg) rotateX('+(-y*6).toFixed(2)+'deg)';
    /* el brillo del dorado sigue al dedo: de una punta a la otra del título */
    if(S.brillo&&S.on)S.brillo.style.transform='translateX('+((x+1)/2*270).toFixed(1)+'px)';
    if(Math.abs(S.tx-S.nx)>.002||Math.abs(S.ty-S.ny)>.002)S.raf=requestAnimationFrame(cuadro);
    else if(!S.on){S.capas.forEach(function(c){c.el.style.transform=''});if(S.gira)S.gira.style.transform=''}
  }
  mesa.addEventListener('pointerdown',function(e){
    if(!e.target.closest('.lb-escena')||mesa.dataset.vista==='mov')return;
    capas();S.on=true;S.movido=false;S.x0=e.clientX;S.y0=e.clientY;mesa.classList.add('sigue');apuntar(e);
  });
  mesa.addEventListener('pointermove',function(e){if(S.on||e.pointerType==='mouse'&&mesa.dataset.vista!=='mov'){if(!S.on&&e.pointerType==='mouse'){S.x0=e.clientX;S.y0=e.clientY}apuntar(e)}});
  function soltar(){
    if(!S.on)return;S.on=false;S.tx=0;S.ty=0;
    if(S.brillo)S.brillo.style.transform='';
    mesa.classList.remove('sigue');
    if(!S.raf)S.raf=requestAnimationFrame(cuadro);
  }
  mesa.addEventListener('pointerup',soltar);mesa.addEventListener('pointercancel',soltar);
  mesa.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse'){S.tx=0;S.ty=0;if(!S.raf)S.raf=requestAnimationFrame(cuadro)}});
}
/* ¿El último toque sobre la tapa fue un arrastre? (entonces no abre el libro) */
export function fueArrastre(){var m=!!(estado&&estado.movido);if(estado)estado.movido=false;return m}
/* Antes de abrir: las capas vuelven a su lugar (la apertura mueve el libro entero) */
export function soltarTapa(mesa){
  if(!estado||estado.mesa!==mesa)return;
  estado.on=false;estado.tx=estado.ty=estado.nx=estado.ny=0;
  if(estado.raf){cancelAnimationFrame(estado.raf);estado.raf=0}
  mesa.classList.remove('sigue');mesa.dataset.vista='mov';
  mesa.querySelectorAll('[data-k],.lb-gira,.lb-brillo').forEach(function(el){el.style.transform=''});
}
export function tapaQuieta(mesa){if(mesa)delete mesa.dataset.vista}
/* Al abrir: la galaxia se aviva un instante (más luz y un giro más rápido) */
export function avivar(mesa){
  if(quieto())return;
  var g=mesa.querySelector('.lb-gal-gira'),luz=mesa.querySelector('.lb-gal-luz');
  var a=g&&g.getAnimations?g.getAnimations()[0]:null;
  if(a){try{a.updatePlaybackRate?a.updatePlaybackRate(14):a.playbackRate=14}catch(e){}
    setTimeout(function(){try{a.updatePlaybackRate?a.updatePlaybackRate(1):a.playbackRate=1}catch(e){}},1300)}
  if(luz)luz.animate([{opacity:0},{opacity:1,offset:.35},{opacity:0}],{duration:1500,easing:'ease-in-out'});
}
