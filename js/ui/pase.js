/* Pasar de página (2.9): una hoja de papel que se da vuelta de verdad.
   - Dos capas: la página nueva ya está debajo (viva) y encima gira una COPIA LIVIANA de la que se va
     (solo lo que se ve: sin los capítulos ocultos y con lo que queda fuera de la pantalla reemplazado por un hueco del mismo alto).
     Nunca se desvanece a transparente.
   - La hoja tiene dos tramos (cerca del lomo y hacia el borde) para que se curve; el eje va inclinado a mitad de camino
     (la esquina de abajo se levanta primero); cada cara tiene su luz y su sombra según el ángulo; el dorso es papel
     (o, en la doble página, la página nueva que viene del otro lado) y se oscurece al pasar los 90°.
   - Sobre la página de abajo se proyecta una sombra que crece hasta la mitad del giro y después se va.
   - Todo es transform y opacity. Las animaciones se arman muestreando el ángulo (así todo queda sincronizado).
   - Si tocás de nuevo durante el giro, el giro termina al instante (terminar()).
   No sabe nada de la app: app.js y libro.js le pasan qué copiar y qué hacer al cambiar. */
import {sonar} from './sonido.js';

function quieto(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
var A=.62;          /* el tramo de cerca del lomo mide el 62 % de la hoja */
var actual=null;    /* el giro que está en curso (uno solo a la vez) */

/* ---------- La copia liviana de una página ---------- */
/* Copia el elemento con lo que se ve entre «arriba» y «abajo» (en px de la pantalla).
   Lo oculto no se copia; lo que queda afuera se reemplaza por una caja vacía del mismo alto (con su id y clases, así la grilla no cambia). */
export function copiaVisible(el,arriba,abajo,nivel){
  var c=el.cloneNode(false);nivel=nivel||0;
  for(var k=el.firstChild;k;k=k.nextSibling){
    if(k.nodeType!==1){c.appendChild(k.cloneNode(false));continue}
    if(k.hidden||k.tagName==='SCRIPT'||k.tagName==='TEMPLATE'||k.tagName==='DIALOG')continue;
    var r=k.getBoundingClientRect();
    if(r.height>0&&(r.bottom<arriba-40||r.top>abajo+40)){
      var h=k.cloneNode(false);h.textContent='';h.style.height=r.height+'px';h.style.minHeight='0';h.style.overflow='hidden';h.style.visibility='hidden';c.appendChild(h);
    }else if(nivel<4&&k.children.length&&r.height>(abajo-arriba)*.6)c.appendChild(copiaVisible(k,arriba,abajo,nivel+1));
    else c.appendChild(k.cloneNode(true));
  }
  if(!nivel){
    c.removeAttribute('id');c.classList.add('giro-copia');
    c.querySelectorAll('[name]').forEach(function(x){x.removeAttribute('name')});
    c.querySelectorAll('[autofocus]').forEach(function(x){x.removeAttribute('autofocus')});
  }
  return c;
}

/* ---------- La forma del giro ---------- */
function suave(s){return s<.5?4*s*s*s:1-Math.pow(-2*s+2,3)/2}
/* ángulo (0 = plana sobre la derecha, 180 = dada vuelta sobre la izquierda) → estilos de cada pieza */
function pose(H,g,sentido){
  var s=Math.sin(g*Math.PI/180),inc=(.16*s).toFixed(3),curva=16*s*sentido;  /* el borde va adelante en el sentido del giro */
  var W=H.W,xb=W*Math.cos(g*Math.PI/180);
  return {
    a:'rotate3d('+(-inc)+',1,0,'+(-g).toFixed(2)+'deg)',
    b:'rotate3d(0,1,0,'+(-curva).toFixed(2)+'deg)',
    luzA:(.55*s).toFixed(3),luzB:(.8*Math.min(1,s+Math.abs(curva)/40)).toFixed(3),
    osc:(g>90?.18+.42*s:0).toFixed(3),
    sombra:'translateX('+xb.toFixed(1)+'px) scaleX('+(g>90?-1:1)+')',sombraO:(.6*s).toFixed(3),
    bajoO:(.14*s).toFixed(3)
  };
}
function aplicar(H,p){
  H.a.style.transform=p.a;H.b.style.transform=p.b;
  H.luzA.style.opacity=p.luzA;H.luzB.style.opacity=p.luzB;
  H.oscA.style.opacity=p.osc;H.oscB.style.opacity=p.osc;
  H.sombra.style.transform=p.sombra;H.sombra.style.opacity=p.sombraO;H.oscuro.style.opacity=p.bajoO;
}

/* ---------- Armar la hoja ----------
   o = {padre, caja:{left,top,width,height} (la hoja apoyada a la derecha del lomo; el lomo es caja.left),
        frente: nodo (lo que se ve con la hoja plana a la derecha), dorso: nodo|null (lo que se ve dada vuelta; null = papel),
        bajos: [{caja, nodo}] (copias quietas que tapan lo de abajo hasta que la hoja se apoya),
        papel: clase del fondo de papel de las caras, z: z-index} */
function armar(o){
  var c=o.caja,W=c.width,H=c.height,wa=Math.round(W*A),wb=W-wa;
  var raiz=document.createElement('div');raiz.className='giro';raiz.setAttribute('aria-hidden','true');
  if(o.z)raiz.style.zIndex=o.z;
  var html='';
  (o.bajos||[]).forEach(function(b,i){html+='<div class="giro-bajo '+(o.papel||'')+'" data-i="'+i+'" style="left:'+b.caja.left+'px;top:'+b.caja.top+'px;width:'+b.caja.width+'px;height:'+b.caja.height+'px"></div>'});
  var zona=o.zona||c;
  /* la zona de abajo (recorta la sombra que la hoja proyecta) y el eje con la hoja */
  html+='<div class="giro-zona" style="left:'+zona.left+'px;top:'+zona.top+'px;width:'+zona.width+'px;height:'+zona.height+'px"><i class="giro-oscuro"></i>'
    +'<i class="giro-sombra" style="left:'+(c.left-zona.left)+'px;width:'+Math.round(W*.42)+'px"></i></div>'
    +'<div class="giro-eje" style="left:'+c.left+'px;top:'+c.top+'px;width:'+W+'px;height:'+H+'px;perspective-origin:0 50%">'
    +'<div class="giro-a" style="width:'+(wa+1)+'px">'
      +'<div class="giro-cara f '+(o.papel||'')+'"><div class="giro-in"></div><i class="giro-luz"></i></div>'
      +'<div class="giro-cara d '+(o.dorso?o.papel||'':'giro-dorso')+'"><div class="giro-in"></div><i class="giro-osc"></i></div>'
      +'<div class="giro-b" style="left:'+wa+'px;width:'+wb+'px">'
        +'<div class="giro-cara f '+(o.papel||'')+'"><div class="giro-in"></div><i class="giro-luz"></i></div>'
        +'<div class="giro-cara d '+(o.dorso?o.papel||'':'giro-dorso')+'"><div class="giro-in"></div><i class="giro-osc"></i></div>'
      +'</div></div></div>';
  raiz.innerHTML=html;
  (o.bajos||[]).forEach(function(b,i){raiz.querySelector('.giro-bajo[data-i="'+i+'"]').appendChild(b.nodo)});
  var a=raiz.querySelector('.giro-a'),b=raiz.querySelector('.giro-b');
  var fa=a.querySelector(':scope>.f>.giro-in'),da=a.querySelector(':scope>.d>.giro-in'),fb=b.querySelector(':scope>.f>.giro-in'),db=b.querySelector(':scope>.d>.giro-in');
  /* el frente, partido en los dos tramos */
  if(o.frente){var f2=o.frente.cloneNode(true);fa.appendChild(o.frente);fb.appendChild(f2);fb.style.left=(-wa)+'px'}
  /* el dorso: el tramo de cerca del lomo muestra la parte de la derecha de lo que hay del otro lado */
  if(o.dorso){var d2=o.dorso.cloneNode(true);da.appendChild(o.dorso);da.style.left=(-(W-wa))+'px';db.appendChild(d2)}
  [].forEach.call(raiz.children,function(x){x.inert=true});
  raiz.querySelectorAll('.giro-in').forEach(function(x){x.style.width=W+'px';x.style.height=H+'px'});
  o.padre.appendChild(raiz);
  return {raiz:raiz,a:a,b:b,W:W,luzA:a.querySelector(':scope>.f>.giro-luz'),luzB:b.querySelector(':scope>.f>.giro-luz'),
    oscA:a.querySelector(':scope>.d>.giro-osc'),oscB:b.querySelector(':scope>.d>.giro-osc'),
    sombra:raiz.querySelector('.giro-sombra'),oscuro:raiz.querySelector('.giro-oscuro')};
}

/* Anima de un ángulo a otro (muestreando: todas las piezas van juntas). asentar: rebote final de 2° como máximo. */
function animar(H,desde,hasta,dur,sentido,asentar,listo,demora){
  var N=Math.max(8,Math.round(dur/22)),cuadros={a:[],b:[],luzA:[],luzB:[],osc:[],sombra:[],oscuro:[]};
  var fin=asentar?.84:1;
  for(var i=0;i<=N;i++){
    var t=i/N,g;
    if(t<=fin)g=desde+(hasta-desde)*suave(t/fin);
    else g=hasta+(hasta>desde?-1:1)*2*Math.sin(Math.PI*(t-fin)/(1-fin));
    var p=pose(H,Math.max(0,Math.min(182,g)),sentido);
    cuadros.a.push({transform:p.a});cuadros.b.push({transform:p.b});cuadros.luzA.push({opacity:p.luzA});cuadros.luzB.push({opacity:p.luzB});
    cuadros.osc.push({opacity:p.osc});cuadros.sombra.push({transform:p.sombra,opacity:p.sombraO});cuadros.oscuro.push({opacity:p.bajoO});
  }
  var op={duration:dur,delay:demora||0,easing:'linear',fill:'forwards'},anims=[
    H.a.animate(cuadros.a,op),H.b.animate(cuadros.b,op),H.luzA.animate(cuadros.luzA,op),H.luzB.animate(cuadros.luzB,op),
    H.oscA.animate(cuadros.osc,op),H.oscB.animate(cuadros.osc,op),H.sombra.animate(cuadros.sombra,op),H.oscuro.animate(cuadros.oscuro,op)];
  H.anims=anims;
  anims[0].onfinish=function(){aplicar(H,pose(H,hasta,sentido));anims.forEach(function(x){x.cancel()});H.anims=null;listo()};
}

/* Termina al instante el giro que esté en curso (deja todo como al final) */
export function terminar(){
  var g=actual;actual=null;
  if(!g)return;
  (g.extra||[]).concat(g.H?[g.H]:[]).forEach(function(H){if(H.anims)H.anims.forEach(function(x){x.onfinish=null;x.cancel()})});
  if(g.alFinal)g.alFinal();
  if(g.H)g.H.raiz.remove();
}
export function girando(){return !!actual}

/* ---------- Un giro completo (flechas, índice, prólogo) ----------
   o = armar(o) + {sentido: 1 (la hoja se va a la izquierda) | -1 (vuelve la anterior), dur, alFinal, sonido} */
export function girar(o){
  terminar();
  var n=o.blancas||0,dur=o.dur||(n?(o.sentido>0?520:430):(o.sentido>0?520:560));
  var desde=o.sentido>0?0:180,hasta=o.sentido>0?180:0,extra=[];
  var H=armar(o),g={H:H,alFinal:o.alFinal,extra:extra};actual=g;
  aplicar(H,pose(H,desde,o.sentido));
  /* el abanico: hojas en blanco (las páginas del medio) que pasan rápido, con el mismo giro;
     van arriba de lo que tapa la página de abajo y debajo de la hoja de verdad */
  var eje=H.raiz.querySelector(':scope>.giro-eje');
  for(var i=0;i<n;i++){
    var B=armar({padre:H.raiz,caja:o.caja,zona:o.zona,papel:o.papel});H.raiz.insertBefore(B.raiz,eje);
    aplicar(B,pose(B,desde,o.sentido));extra.push(B);
    animar(B,desde,hasta,320,o.sentido,false,function(){},o.sentido>0?110+i*95:i*90);
  }
  if(o.sonido!==false){sonar('hoja',{dur:dur/1000,fuerza:.55});for(var k=0;k<n;k++)setTimeout(function(){sonar('hoja',{dur:.3,fuerza:.3})},o.sentido>0?110+k*95:k*90)}
  /* tocar durante el giro lo termina al instante */
  H.raiz.style.pointerEvents='auto';H.raiz.addEventListener('pointerdown',function(){if(actual===g)terminar()},{once:true});
  animar(H,desde,hasta,dur,o.sentido,o.asentar!==false&&(o.sentido<0||o.dorso),function(){if(actual===g)terminar()},o.sentido<0&&n?n*90:0);
  return g;
}

/* ---------- Con el dedo ----------
   empezar(o) arma la hoja; mover(px) la lleva (el borde de la hoja sigue al dedo);
   soltar(velocidad px/ms) decide: si pasa, termina el giro; si no, vuelve y llama a o.volver(). */
export function empezar(o){
  terminar();
  var H=armar(o),W=H.W,s=o.sentido,g={H:H,alFinal:o.alFinal,ang:s>0?0:180};actual=g;
  aplicar(H,pose(H,g.ang,s));
  g.mover=function(dx){
    /* hacia adelante el borde arranca a la derecha (cos = 1 + dx/W); hacia atrás, la hoja asoma desde el lomo (cos = dx/W) */
    var c=s>0?1+Math.min(0,dx)/W:Math.max(0,dx)/W;
    g.ang=Math.acos(Math.max(-1,Math.min(1,c)))*180/Math.PI;
    aplicar(H,pose(H,g.ang,s));
  };
  g.soltar=function(pasa,vel){
    var hasta=pasa?(s>0?180:0):(s>0?0:180),resto=Math.abs(hasta-g.ang);
    /* la velocidad manda: un gesto rápido termina rápido; siempre con un final suave */
    var dur=Math.max(170,Math.min(460,resto/180*520/Math.max(.6,Math.min(2.4,Math.abs(vel||0)*2.2))));
    if(pasa)sonar('hoja',{dur:dur/1000,fuerza:Math.min(1,.35+Math.abs(vel||0)*.8)});
    if(!pasa)g.alFinal=o.volver;
    animar(H,g.ang,hasta,dur,s,!pasa||s<0,function(){if(actual===g)terminar()});
  };
  return g;
}
