/* La postal del capítulo cerrado (2.16): una imagen para compartir cuando cerrás un pacto. Una página del libro
   sobre el cosmos, con el mes, el sello y lo que guardaste (o, sin montos, el porcentaje y las semanas).
   Se dibuja en un canvas en el teléfono, siempre en papel claro, y se comparte con la hoja del sistema
   (navigator.share con el archivo) o se guarda. Lo que dice sale de logica/postal.js. */
import {postal} from '../logica/postal.js';
import {ctx,$,discreto,toast} from './comun.js';

var W=1080,H=1350;
function azar(s){return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function estrella(c,x,y,R,r){c.beginPath();for(var i=0;i<10;i++){var a=-Math.PI/2+i*Math.PI/5,q=i%2?r:R;c.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}c.closePath()}
/* achica la letra hasta que el texto entre en `max` px */
function ajustar(c,txt,peso,fam,size,max){var s=size;c.font=peso+' '+s+'px '+fam;while(c.measureText(txt).width>max&&s>24){s-=4;c.font=peso+' '+s+'px '+fam}return s}
function sello(c,x,y,r,ok){
  c.save();c.translate(x,y);
  if(ok){
    c.rotate(-8*Math.PI/180);
    /* lacre: borde un poco irregular, brillo arriba a la izquierda, dos aros y el ✓ */
    c.beginPath();for(var i=0;i<=56;i++){var a=i/56*Math.PI*2,q=r+(i%2?3:-2)+Math.sin(i*1.7)*2.5;c.lineTo(Math.cos(a)*q,Math.sin(a)*q)}c.closePath();
    var g=c.createRadialGradient(-r*.3,-r*.35,r*.08,0,0,r*1.05);g.addColorStop(0,'#F6A770');g.addColorStop(.45,'#D9682A');g.addColorStop(.85,'#9E3C1C');g.addColorStop(1,'#6E2510');
    c.shadowColor='rgba(90,30,11,.35)';c.shadowBlur=18;c.shadowOffsetY=6;c.fillStyle=g;c.fill();c.shadowColor='transparent';
    c.lineWidth=4;c.strokeStyle='rgba(90,30,11,.32)';c.beginPath();c.arc(0,0,r*.7,0,Math.PI*2);c.stroke();
    c.lineWidth=3;c.strokeStyle='rgba(255,217,184,.38)';c.beginPath();c.arc(0,0,r*.77,0,Math.PI*2);c.stroke();
    c.strokeStyle='#FFE9D6';c.lineWidth=12;c.lineCap='round';c.lineJoin='round';
    c.beginPath();c.moveTo(-r*.32,r*.02);c.lineTo(-r*.08,r*.26);c.lineTo(r*.36,-r*.26);c.stroke();
  }else{
    /* sin sello: la estampa marcada a lápiz, con una estrellita */
    c.setLineDash([10,9]);c.strokeStyle='rgba(28,36,64,.4)';c.lineWidth=3;c.beginPath();c.arc(0,0,r*.8,0,Math.PI*2);c.stroke();c.setLineDash([]);
    c.fillStyle='#A87A1F';estrella(c,0,0,r*.3,r*.13);c.fill();
  }
  c.restore();
}

export async function dibujarPostal(d){
  try{await Promise.all(['600 90px Fraunces','600 34px Nunito','500 32px Nunito'].map(function(f){return document.fonts.load(f)}))}catch(e){}
  var cv=document.createElement('canvas');cv.width=W;cv.height=H;var c=cv.getContext('2d'),i;
  /* el cosmos que rodea al libro */
  var g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#070B24');g.addColorStop(.55,'#0E1640');g.addColorStop(1,'#1B2A6B');c.fillStyle=g;c.fillRect(0,0,W,H);
  var n=c.createRadialGradient(860,170,0,860,170,560);n.addColorStop(0,'rgba(75,63,168,.55)');n.addColorStop(1,'rgba(75,63,168,0)');c.fillStyle=n;c.fillRect(0,0,W,H);
  n=c.createRadialGradient(170,1230,0,170,1230,520);n.addColorStop(0,'rgba(56,182,255,.18)');n.addColorStop(1,'rgba(56,182,255,0)');c.fillStyle=n;c.fillRect(0,0,W,H);
  var rnd=azar(7+d.numero*31);
  for(i=0;i<180;i++){var x=rnd()*W,y=rnd()*H,r=.5+rnd()*rnd()*2.4;c.globalAlpha=.25+rnd()*.7;c.fillStyle=rnd()<.06?'#FFD27A':'#F4F1FF';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()}
  c.globalAlpha=1;
  /* la página, con el canto de las hojas de abajo */
  var px=90,py=118,pw=900,ph=1112;
  rr(c,px+12,py+12,pw,ph,26);c.fillStyle='#B89D6B';c.fill();
  rr(c,px+6,py+6,pw,ph,26);c.fillStyle='#E4D3AE';c.fill();
  c.save();c.shadowColor='rgba(0,0,0,.45)';c.shadowBlur=50;c.shadowOffsetY=18;rr(c,px,py,pw,ph,26);c.fillStyle='#F6ECD6';c.fill();c.restore();
  var pg=c.createLinearGradient(px,0,px+pw,0);pg.addColorStop(0,'#E6D7B5');pg.addColorStop(.07,'#F6ECD6');pg.addColorStop(.85,'#FBF5E7');pg.addColorStop(1,'#F1E4C7');
  rr(c,px,py,pw,ph,26);c.fillStyle=pg;c.fill();
  c.strokeStyle='rgba(168,122,31,.55)';c.lineWidth=2;rr(c,px+30,py+30,pw-60,ph-60,14);c.stroke();
  c.strokeStyle='rgba(168,122,31,.22)';c.lineWidth=1.5;rr(c,px+40,py+40,pw-80,ph-80,10);c.stroke();
  /* el texto */
  var cx=W/2;c.textAlign='center';c.textBaseline='alphabetic';
  c.fillStyle='#4A5170';ajustar(c,d.kick,'600','Nunito, sans-serif',32,700);c.fillText(d.kick,cx,226);
  c.fillStyle='#1C2440';ajustar(c,d.mes,'600','Fraunces, Georgia, serif',92,720);c.fillText(d.mes,cx,322);
  c.strokeStyle='#A87A1F';c.lineWidth=2;c.beginPath();c.moveTo(cx-170,372);c.lineTo(cx-24,372);c.moveTo(cx+24,372);c.lineTo(cx+170,372);c.stroke();
  c.fillStyle='#A87A1F';estrella(c,cx,372,12,5);c.fill();
  sello(c,cx,510,90,d.sello);
  c.fillStyle='#1C2440';ajustar(c,d.titulo,'600','Fraunces, Georgia, serif',58,760);c.fillText(d.titulo,cx,684);
  var y=748;
  if(d.antes){c.fillStyle='#4A5170';c.font='600 34px Nunito, sans-serif';c.fillText(d.antes,cx,y);y+=22}
  c.fillStyle='#326739';var s=ajustar(c,d.cifra,'600','Fraunces, Georgia, serif',150,740);y+=Math.round(s*.78);c.fillText(d.cifra,cx,y);
  if(d.despues){y+=54;c.fillStyle='#4A5170';c.font='600 34px Nunito, sans-serif';c.fillText(d.despues,cx,y)}
  if(d.lineas.length){
    y+=50;c.strokeStyle='rgba(28,36,64,.16)';c.lineWidth=1.5;c.beginPath();c.moveTo(cx-190,y);c.lineTo(cx+190,y);c.stroke();
    y+=8;c.fillStyle='#4A5170';
    d.lineas.forEach(function(l){y+=48;ajustar(c,l,'500','Nunito, sans-serif',32,720);c.fillText(l,cx,y)});
  }
  /* el pie: el nombre del libro entre dos estrellitas */
  var pie='El Libro del Ahorro',fy=py+ph-64;
  c.fillStyle='#765616';c.font='600 34px Fraunces, Georgia, serif';c.fillText(pie,cx,fy);
  var pw2=c.measureText(pie).width/2;c.fillStyle='#A87A1F';estrella(c,cx-pw2-30,fy-11,9,4);c.fill();estrella(c,cx+pw2+30,fy-11,9,4);c.fill();
  return cv;
}

/* ---------- la hoja para ver y compartir ---------- */
var k=null,montos=true,blob=null,url=null,nombre='capitulo.png',turno=0;
function puedeCompartir(f){try{return !!(navigator.canShare&&navigator.share&&navigator.canShare({files:[f]}))}catch(e){return false}}
async function pintar(){
  var d=postal(ctx.state,k,{montos:montos}),img=$('#ps-img');if(!d||!img)return;
  var mio=++turno;
  $('#postal-sheet').querySelectorAll('[data-ps-m]').forEach(function(b){b.setAttribute('aria-pressed',String((b.getAttribute('data-ps-m')==='1')===montos))});
  var cv=await dibujarPostal(d);if(mio!==turno)return;
  var b=await new Promise(function(r){cv.toBlob(r,'image/png')});if(mio!==turno||!b)return;
  blob=b;nombre=d.archivo;
  if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(b);
  img.src=url;img.alt=d.alt;
  var a=$('#ps-bajar');a.href=url;a.setAttribute('download',nombre);
  /* con la hoja del sistema (iPhone) se comparte y desde ahí se guarda en Fotos; si no hay, se baja el archivo */
  var sh=$('#ps-compartir'),ok=puedeCompartir(new File([b],nombre,{type:'image/png'}));
  sh.hidden=!ok;a.hidden=ok;$('#postal-sheet .ps-nota').hidden=!ok;
}
export function abrirPostal(clave){
  var s=$('#postal-sheet');if(!s||!postal(ctx.state,clave))return;
  k=clave;montos=!discreto.on;
  s.hidden=false;document.documentElement.classList.add('hoja');
  pintar();
  var x=s.querySelector('[data-ps-x]');if(x)try{x.focus({preventScroll:true})}catch(e){}
}
function cerrar(){
  var s=$('#postal-sheet');if(s)s.hidden=true;document.documentElement.classList.remove('hoja');turno++;
}
export function initPostal(){
  var s=$('#postal-sheet');if(!s)return;
  s.addEventListener('click',function(e){
    if(e.target===s||e.target.closest('[data-ps-x]')){cerrar();return}
    var m=e.target.closest('[data-ps-m]');if(m){montos=m.getAttribute('data-ps-m')==='1';pintar();return}
    if(e.target.closest('#ps-compartir')&&blob){
      var f=new File([blob],nombre,{type:'image/png'});
      navigator.share({files:[f],title:'Mi capítulo cerrado'}).catch(function(err){if(err&&err.name!=='AbortError')toast('No se pudo compartir: mantené el dedo sobre la imagen para guardarla')});
    }
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!s.hidden)cerrar()});
}
