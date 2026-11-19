/* El libro de Hoy (2.65, puro): las cuentas que no son de plata. Los números de plata vienen siempre de ui/plan.js;
   acá solo se arma el texto (fechas, días, romanos) y la geometría (la página deformada y la vuelta de hoja). */
import {parse,diffDays,addDays,DIAL,MESL,DIA} from './fechas.js';

/* I, II, III… para las semanas, las ideas y el número de página */
export function romano(n){
  var v=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']],s='';
  n=Math.max(0,Math.floor(n));v.forEach(function(p){while(n>=p[0]){s+=p[1];n-=p[0]}});return s;
}
/* «lunes 16 de noviembre» */
export function fechaLarga(iso){var d=parse(iso);return DIAL[d.getDay()]+' '+d.getDate()+' de '+MESL[d.getMonth()]}
/* «Cobrás en 21 días» · «Hoy cobrás» · «Ya cobraste» (lo mismo que dice Hoy) */
export function cobro(t,c){
  var d=diffDays(t,c);
  if(d>1)return {lab:'Cobrás en',cifra:d+' días',dias:d};
  if(d===1)return {lab:'Cobrás',cifra:'mañana',dias:1};
  if(d===0)return {lab:'Hoy',cifra:'cobrás',dias:0};
  return {lab:'Ya',cifra:'cobraste',dias:d};
}
/* los días que quedan de la semana, como en la barra de Hoy: «hoy», y después el nombre corto de cada día (hasta 7) */
export function diasSemana(t,n){
  var d0=parse(t),o=[];n=Math.max(1,Math.min(7,n||1));
  for(var k=0;k<n;k++){var d=addDays(d0,k);o.push(k===0?'hoy':DIA[d.getDay()])}
  return o;
}
/* el día de la semana en que termina, dicho como en una carta: «el miércoles» */
export function diaNombre(iso){return DIAL[parse(iso).getDay()]}

/* ---- la página deformada: la matriz que lleva un rectángulo de w×h a los cuatro puntos q de la foto
   (arriba-izq, arriba-der, abajo-der, abajo-izq). Devuelve el texto para «transform: matrix3d(…)». ---- */
export function homografia(w,h,q){
  var src=[[0,0],[w,0],[w,h],[0,h]],A=[],b=[],i,j,k;
  for(i=0;i<4;i++){var x=src[i][0],y=src[i][1],X=q[i][0],Y=q[i][1];A.push([x,y,1,0,0,0,-x*X,-y*X]);b.push(X);A.push([0,0,0,x,y,1,-x*Y,-y*Y]);b.push(Y)}
  for(i=0;i<8;i++){
    var p=i;for(j=i+1;j<8;j++)if(Math.abs(A[j][i])>Math.abs(A[p][i]))p=j;
    var ta=A[i];A[i]=A[p];A[p]=ta;var tb=b[i];b[i]=b[p];b[p]=tb;
    for(j=i+1;j<8;j++){var f=A[j][i]/A[i][i];for(k=i;k<8;k++)A[j][k]-=f*A[i][k];b[j]-=f*b[i]}
  }
  var s=new Array(8);for(i=7;i>=0;i--){var t=b[i];for(k=i+1;k<8;k++)t-=A[i][k]*s[k];s[i]=t/A[i][i]}
  return 'matrix3d('+[s[0],s[3],0,s[6],s[1],s[4],0,s[7],0,0,1,0,s[2],s[5],0,1].map(function(v){return +v.toFixed(8)}).join(',')+')';
}

/* ---- la vuelta de hoja: la hoja (ancho W) cortada en nf franjas. Con el avance p (0 a 1), el doblez corre de la orilla
   hacia el lomo: lo que está antes del doblez queda plano; después, cada franja gira un poco más que la anterior, como si
   la hoja se enrollara sobre un cilindro de radio r. Devuelve, por franja, cuánto se corre (tx), cuánto se levanta (z) y
   su giro (th, en radianes: 0 = plana, π = dada vuelta del todo). ---- */
export function franjas(p,W,nf,r){
  p=Math.max(0,Math.min(1,p));nf=nf||16;r=r||W*.17;
  var sw=W/nf,fold=(1-p)*W-p*Math.PI*r,X=0,Z=0,o=[];
  for(var i=0;i<nf;i++){
    var s=i*sw,th=Math.max(0,Math.min(Math.PI,(s+sw/2-fold)/r));
    o.push({tx:X-s,z:Z,th:th});X+=sw*Math.cos(th);Z+=sw*Math.sin(th);
  }
  return o;
}
/* ¿al soltar el dedo, la hoja termina de pasar? Sí, si pasó un 35 % del ancho o el gesto fue rápido (px/ms, a favor) */
export function pasa(p,vel){return p>.35||vel>.45}
/* cuánto tarda en terminar sola, siguiendo la velocidad del dedo: entre 0,45 y 0,7 s */
export function duracion(p,vel,W){var v=Math.max(Math.abs(vel||0),.55);return Math.round(Math.min(700,Math.max(450,(1-p)*W/v*1.6,450*(1-p)+60)))}

/* ---- (2.66) el libro antiguo ---- */
/* un número entre 0 y 1 que sale siempre igual de los mismos dos enteros (para que nada cambie al recargar) */
export function hash2(x,y){var h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}
/* la variación chica de cada letra: giro de ±1° y corrida de la línea de ±0,6 px; sale de la palabra (k), el lugar (i) y la letra */
export function variacion(k,i,codigo){
  return {giro:+((hash2(k*31+i,codigo)-.5)*2).toFixed(2),linea:+((hash2(i*17+k,codigo+3)-.5)*1.2).toFixed(2)};
}
/* la cifra vieja tachada se ve hasta el día siguiente: ¿sigue a la vista hoy? */
export function vigente(reg,hoy){return !!(reg&&reg.f===hoy)}
