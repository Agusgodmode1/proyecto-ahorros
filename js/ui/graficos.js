/* Los dibujos de la Tarjeta (2.13): SVG y HTML propios, sin librerías. Se cargan solo al abrir el capítulo.
   Todo monto pasa por el formateador que se recibe (money(), que respeta el modo discreto), también los textos
   para lectores de pantalla. Colores: los de tus categorías; bien / cerca / te pasaste con su texto; la tinta
   para lo gastado y el azul para lo que da tu plan (la jerarquía del libro). */
import {esc} from './comun.js';

var DIAS=['lu','ma','mi','ju','vi','sá','do'];
var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
var MESC=['ene','feb','mar','abr','may','jun','jul','ago','set','oct','nov','dic'];
var NOM_DIA=['dom','lun','mar','mié','jue','vie','sáb'];
function pad(n){return (n<10?'0':'')+n}
function diaSem(iso){var p=iso.split('-').map(Number);return new Date(p[0],p[1]-1,p[2],12).getDay()}
export function fechaCorta(iso){return NOM_DIA[diaSem(iso)]+' '+Number(iso.slice(8,10))+' '+MESC[Number(iso.slice(5,7))-1]}
function pct(x){return Math.round(x*100)+' %'}

/* ---------- Anillo de categorías, con el total en el centro ---------- */
/* items: [{c, t, n, pct, color}] (de detector.anillo) · sel: índice elegido o -1 */
export function anilloHTML(items,total,money,o){
  o=o||{};
  var R=46,C=2*Math.PI*R,gap=items.length>1?1.6:0,ini=0,sel=o.sel===undefined?-1:o.sel;
  var segs=items.map(function(it,i){
    var largo=Math.max(0.01,it.pct*C-gap),s='<circle class="an-seg'+(sel>=0&&sel!==i?' dim':'')+'" data-i="'+i+'" cx="60" cy="60" r="'+R+'" style="stroke:'+it.color+'" stroke-dasharray="'+largo.toFixed(2)+' '+(C-largo).toFixed(2)+'" stroke-dashoffset="'+(-ini).toFixed(2)+'"><title>'+esc(it.c)+': '+esc(money(it.t))+', '+pct(it.pct)+'</title></circle>';
    ini+=it.pct*C;return s;
  }).join('');
  var x=sel>=0?items[sel]:null;
  var alt='Gastaste '+money(total)+'. '+items.map(function(it){return it.c+' '+pct(it.pct)}).join(', ')+'.';
  return '<div class="anillo-fig">'
    +'<div class="an-ring" role="img" aria-label="'+esc(alt)+'"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="an-fondo" cx="60" cy="60" r="'+R+'"/><g transform="rotate(-90 60 60)">'+segs+'</g></svg>'
    +'<div class="an-c" aria-hidden="true"><span class="an-l">'+esc(x?x.c:'gastaste')+'</span><b class="an-v">'+esc(money(x?x.t:total))+'</b><span class="an-s">'+esc(x?pct(x.pct)+' · '+x.n+(x.n===1?' compra':' compras'):(o.sub||''))+'</span></div></div>'
    +'<ul class="an-ley">'+items.map(function(it,i){
      return '<li><button type="button" data-anillo="'+i+'" aria-pressed="'+(sel===i)+'"><i class="dot" style="background:'+it.color+'"></i><span class="an-n">'+esc(it.c)+'</span><b>'+esc(money(it.t))+'</b><span class="an-p">'+pct(it.pct)+'</span></button></li>';
    }).join('')+'</ul></div>';
}

/* ---------- El mes en un calendario: cada día, cuánto contra tu plan ---------- */
/* pd: {iso:{t, movs}} · nivel(t) → 0..3 · sel: iso elegido · meses: lista de 'aaaa-mm' para pasar de mes */
export function calendarioHTML(mes,pd,planDia,money,o){
  o=o||{};
  var y=Number(mes.slice(0,4)),m=Number(mes.slice(5,7)),dias=new Date(y,m,0).getDate(),off=(new Date(y,m-1,1,12).getDay()+6)%7;
  var i=o.meses?o.meses.indexOf(mes):-1,ant=i>0?o.meses[i-1]:null,sig=o.meses&&i>=0&&i<o.meses.length-1?o.meses[i+1]:null;
  var nombre=MESES[m-1]+' '+y,celdas='',cuenta=[0,0,0,0];
  for(var k=0;k<off;k++)celdas+='<span class="cal-v" aria-hidden="true"></span>';
  for(var d=1;d<=dias;d++){
    var iso=y+'-'+pad(m)+'-'+pad(d),x=pd[iso],t=x?x.t:0,n=o.nivel(t),ancho=planDia>0?Math.min(100,Math.round(t/planDia*100)):(t>0?60:0);
    cuenta[n]++;
    var fuera=o.desde&&iso<o.desde||o.hasta&&iso>o.hasta;
    var lab=fechaCorta(iso)+': '+(fuera?'fuera del extracto':t>0?'gastaste '+money(t)+' en '+x.movs.length+(x.movs.length===1?' movimiento':' movimientos')+(n===3?', te pasaste':n===2?', cerca de tu límite':''):'sin gastos');
    celdas+='<button type="button" class="cal-d n'+n+(fuera?' fuera':'')+(o.hoy===iso?' hoy':'')+'" data-cald="'+iso+'" aria-pressed="'+(o.sel===iso)+'" aria-label="'+esc(lab)+'"'+(fuera?' disabled':'')+'><span>'+d+'</span><i style="width:'+ancho+'%"></i></button>';
  }
  var alt=nombre+': '+cuenta[1]+' días bien, '+cuenta[2]+' cerca de tu límite y '+cuenta[3]+' que te pasaste.';
  var h='<div class="cal" aria-label="'+esc(alt)+'" role="group">'
    +'<div class="cal-h"><button type="button" class="cal-nav" data-calmes="'+(ant||'')+'" aria-label="Mes anterior"'+(ant?'':' disabled')+'>‹</button><b>'+nombre+'</b><button type="button" class="cal-nav" data-calmes="'+(sig||'')+'" aria-label="Mes siguiente"'+(sig?'':' disabled')+'>›</button></div>'
    +'<div class="cal-sem" aria-hidden="true">'+DIAS.map(function(x){return '<span>'+x+'</span>'}).join('')+'</div>'
    +'<div class="cal-g">'+celdas+'</div>'
    +'<p class="cal-ley"><span><i class="n1"></i>bien</span><span><i class="n2"></i>cerca</span><span><i class="n3"></i>te pasaste</span>'+(planDia>0?'<span class="cal-ref">contra '+esc(money(planDia))+' por día</span>':'')+'</p>'
    +'</div>';
  return h;
}
/* Lo que gastaste un día (debajo del calendario) */
export function diaHTML(iso,x,money,nombre){
  if(!iso)return '<p class="note cal-hint">Tocá un día para ver qué gastaste.</p>';
  if(!x)return '<p class="note"><b>'+esc(fechaCorta(iso))+'</b>: no gastaste nada.</p>';
  return '<div class="cal-dia-in"><p class="cal-dia-t"><b>'+esc(fechaCorta(iso))+'</b><span>'+esc(money(x.t))+'</span></p><ul class="list">'
    +x.movs.slice().sort(function(a,b){return a.m-b.m}).map(function(m){return '<li><span class="what">'+esc(nombre(m.k))+'</span><span class="amt">'+esc(money(-m.m))+'</span></li>'}).join('')+'</ul></div>';
}

/* ---------- Por dónde se te va: los 3 que más pesan ---------- */
export function porDondeHTML(lista,txt){
  return '<ol class="pdv">'+lista.map(function(h,i){
    var t=txt(h);
    return '<li class="pdv-c"><span class="pdv-i" aria-hidden="true">'+(i+1)+'</span><div class="pdv-b"><p class="pdv-t">'+esc(t.titulo)+'</p><p class="pdv-m">'+esc(t.cifra)+'</p><p class="pdv-x">'+esc(t.consejo)+'</p></div></li>';
  }).join('')+'</ol>';
}

/* ---------- Las suscripciones, como un ticket ---------- */
export function ticketHTML(h,money){
  return '<div class="ticket"><p class="tk-h">tus suscripciones</p><ul class="tk-l">'
    +h.items.map(function(s){return '<li><span class="tk-n">'+esc(s.nombre)+(s.subio?' <small class="tk-sub">subió '+esc(money(s.subio))+'</small>':'')+'</span><i aria-hidden="true"></i><b>'+esc(money(s.mes))+'</b></li>'}).join('')
    +'</ul><p class="tk-t"><span>por mes</span><b>'+esc(money(h.mes))+'</b></p><p class="tk-a"><span>en un año</span><b>'+esc(money(h.anual))+'</b></p></div>';
}

/* ---------- Mes a mes: columnas finas, una por mes ---------- */
export function mesAMesSVG(meses,money){
  var W=320,H=168,top=26,base=H-26,n=meses.length,mx=0;meses.forEach(function(m){if(m.g>mx)mx=m.g});
  var paso=W/n,ancho=Math.min(24,paso*0.5),cols='',anios=meses[0].k.slice(0,4)!==meses[n-1].k.slice(0,4);
  meses.forEach(function(m,i){
    var h=mx?Math.max(2,(m.g/mx)*(base-top)):2,x=paso*i+paso/2-ancho/2,y=base-h,r=Math.min(4,h),ult=i===n-1;
    var mes=MESC[Number(m.k.slice(5,7))-1]+(anios&&(i===0||m.k.slice(5,7)==='01')?' '+m.k.slice(0,4):'');
    cols+='<g class="mm-c'+(ult?' ult':'')+'"><path d="M'+x.toFixed(1)+' '+base+'V'+(y+r).toFixed(1)+'q0 -'+r+' '+r+' -'+r+'h'+(ancho-2*r).toFixed(1)+'q'+r+' 0 '+r+' '+r+'V'+base+'Z"><title>'+esc(mes)+': '+esc(money(m.g))+'</title></path>'
      +'<text class="mm-v" x="'+(x+ancho/2).toFixed(1)+'" y="'+(y-7).toFixed(1)+'" text-anchor="middle">'+esc(money(m.g))+'</text>'
      +'<text class="mm-m" x="'+(x+ancho/2).toFixed(1)+'" y="'+(base+18)+'" text-anchor="middle">'+esc(mes)+'</text></g>';
  });
  var alt='Lo que gastaste cada mes: '+meses.map(function(m){return MESES[Number(m.k.slice(5,7))-1]+' '+money(m.g)}).join(', ')+'.';
  return '<svg class="mm" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(alt)+'"><line class="g-base" x1="0" x2="'+W+'" y1="'+base+'" y2="'+base+'"/>'+cols+'</svg>';
}

/* ---------- Tu ritmo contra tu plan: lo gastado acumulado y lo que da el plan ---------- */
/* serie: [{f, real, plan}] */
export function ritmoSVG(serie,money){
  var W=320,H=180,izq=4,der=W-4,arr=16,base=H-28,n=serie.length,mx=1;
  serie.forEach(function(p){mx=Math.max(mx,p.real,p.plan)});
  var X=function(i){return izq+(n>1?i/(n-1):0)*(der-izq)},Y=function(v){return base-(v/mx)*(base-arr)};
  var lin=function(k){return serie.map(function(p,i){return (i?'L':'M')+X(i).toFixed(1)+' '+Y(p[k]).toFixed(1)}).join('')};
  var u=serie[n-1],paso=u.real>u.plan,area='M'+X(0).toFixed(1)+' '+base+serie.map(function(p,i){return 'L'+X(i).toFixed(1)+' '+Y(p.real).toFixed(1)}).join('')+'L'+X(n-1).toFixed(1)+' '+base+'Z';
  var alt='Del '+fechaCorta(serie[0].f)+' al '+fechaCorta(u.f)+' gastaste '+money(u.real)+'; tu plan daba '+money(u.plan)+'. '+(paso?'Te pasaste por '+money(u.real-u.plan)+'.':'Vas '+money(u.plan-u.real)+' por debajo.');
  return '<div class="rit" data-nodeslizar><svg class="rit-g" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(alt)+'">'
    +'<line class="g-grid" x1="0" x2="'+W+'" y1="'+Y(mx/2).toFixed(1)+'" y2="'+Y(mx/2).toFixed(1)+'"/><text class="mm-m" x="'+izq+'" y="'+(Y(mx/2)-6).toFixed(1)+'">'+esc(money(mx/2))+'</text><line class="g-base" x1="0" x2="'+W+'" y1="'+base+'" y2="'+base+'"/>'
    +'<path class="rit-area" d="'+area+'"/>'
    +'<path class="rit-plan" d="'+lin('plan')+'"/><path class="rit-real" d="'+lin('real')+'"/>'
    +'<line class="rit-x" x1="0" x2="0" y1="'+arr+'" y2="'+base+'" hidden/>'
    +'<circle class="rit-fin '+(paso?'mal':'bien')+'" cx="'+X(n-1).toFixed(1)+'" cy="'+Y(u.real).toFixed(1)+'" r="5"/>'
    +'<text class="mm-m" x="'+izq+'" y="'+(base+18)+'">'+esc(fechaCorta(serie[0].f))+'</text><text class="mm-m" x="'+der+'" y="'+(base+18)+'" text-anchor="end">'+esc(fechaCorta(u.f))+'</text>'
    +'</svg>'
    +'<p class="rit-ley"><span><i class="k-real"></i>lo que gastaste</span><span><i class="k-plan"></i>lo que da tu plan</span></p>'
    +'<p class="rit-lee" aria-live="polite">'+lectura(u,money)+'</p></div>';
}
export function lectura(p,money){
  var paso=p.real>p.plan;
  return '<b>'+esc(fechaCorta(p.f))+'</b> · gastaste '+esc(money(p.real))+' · tu plan daba '+esc(money(p.plan))+' · <span class="'+(paso?'mal-t':'bien-t')+'">'+(paso?'te pasaste por '+esc(money(p.real-p.plan)):'vas bien, '+esc(money(p.plan-p.real))+' abajo')+'</span>';
}
