/* (2.53) Horas extra desde cualquier archivo (puro): una planilla con otro formato, un PDF o un texto.
   Cada fila (o renglón) que tenga una fecha y dos horas se lee como «entrada y salida» de ese día;
   con tu horario y tus reglas se calculan los minutos extra (lo mismo que la planilla del trabajo). */
import {extraPorHorario,tipoDeDia} from './horario.js';
import {serialAFecha,horaDe} from './planilla.js';

function pad(n){return String(n).padStart(2,'0')}
/* Una celda o palabra → 'aaaa-mm-dd' o null. anio: el año que se usa si la fecha no lo trae */
export function fechaDe(v,anio){
  if(typeof v==='number'&&isFinite(v)){return v>30000&&v<80000&&v%1===0?serialAFecha(v):null}
  var s=String(v===null||v===undefined?'':v).trim(),x;
  if((x=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)))return x[1]+'-'+pad(x[2])+'-'+pad(x[3]);
  if((x=/^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?$/.exec(s))){
    var d=+x[1],m=+x[2],y=x[3]?(x[3].length===2?2000+ +x[3]:+x[3]):anio;
    if(!y||m<1||m>12||d<1||d>31)return null;
    return y+'-'+pad(m)+'-'+pad(d);
  }
  return null;
}
/* Un renglón de texto → celdas (separa por ; , tab o espacios) */
export function celdasDe(linea){return String(linea).split(/[;\t|]|\s+/).map(function(c){return c.trim()}).filter(Boolean)}
/* filas: [[celda…]…]. reglas = perfil.horas. hoy: los días futuros no cuentan.
   Devuelve {dias:[{fecha,llegada,salida,tipo,min,total}], sinHorario:bool} */
export function diasDeFilas(filas,reglas,hoy){
  var anio=Number(String(hoy||'').slice(0,4))||new Date().getFullYear(),dias={},sinHorario=false,pares=[],sabados={};
  (filas||[]).forEach(function(r){
    var fecha=null,horas=[];
    (r||[]).forEach(function(c){
      if(!fecha){var f=fechaDe(c,anio);if(f){fecha=f;return}}
      if(typeof c==='number'&&c>=1)return;
      var h=horaDe(c);if(h&&horas.length<2)horas.push(h.hm);
    });
    if(!fecha||horas.length<2||(hoy&&fecha>hoy))return;
    var dw=new Date(fecha+'T12:00:00').getDay();if(dw>=1&&dw<=5)pares.push(horas);if(dw===6)sabados[fecha]=1;
    var tipo=tipoDeDia(fecha,reglas.dias),x=extraPorHorario(reglas,horas[0],horas[1],tipo);
    if(!x){sinHorario=true;return}
    dias[fecha]={fecha:fecha,llegada:horas[0],salida:horas[1],tipo:tipo,min:x.min,total:x.total};
  });
  return {dias:Object.keys(dias).sort().map(function(k){return dias[k]}),sinHorario:sinHorario,horarioProbable:horarioProbable(pares,Object.keys(sabados).length)};
}
/* (2.55) Tu horario más probable: la entrada y la salida que más se repiten de lunes a viernes, redondeadas a la media hora.
   Con 3 días o más; de lunes a sábado si trabajaste 3 sábados o más. */
export function horarioProbable(pares,nSab){
  if(!pares||pares.length<3)return null;
  function moda(k){var c={},mejor=null;pares.forEach(function(p){var t=p[k].split(':'),m=Math.round((+t[0]*60+ +t[1])/30)*30%1440,h=pad(Math.floor(m/60))+':'+pad(m%60);c[h]=(c[h]||0)+1;if(!mejor||c[h]>c[mejor])mejor=h});return mejor}
  return {entrada:moda(0),salida:moda(1),dias:nSab>=3?'ls':'lv'};
}
