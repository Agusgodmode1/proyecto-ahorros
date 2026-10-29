/* Planilla de asistencia del trabajo (puro). Formato del equipo de CRM:
   cada hoja es un mes; hay bloques que empiezan con una fila "Name | PW | Location | fecha | | fecha | …"
   seguida de "Check-In | Check-Out" por día, y una fila por persona con la hora de entrada y de salida.
   Con esas horas y las reglas de tu perfil se calculan los minutos extra de cada día.
   Si la planilla trae su propio bloque de horas extra por día, se compara y se avisa si no coincide. */
import {extraPorHorario,tipoDeDia} from './horario.js';
var SIN_HORARIO='Para contar las extras de entre semana necesito tu horario (en Horas extra).';
import {pad} from './fechas.js';

function limpio(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase().replace(/\s+/g,' ')}
/* Número de fecha de Excel → 'aaaa-mm-dd' */
export function serialAFecha(n){var d=new Date(Date.UTC(1899,11,30)+Math.floor(n)*864e5);return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate())}
function esFecha(v){return typeof v==='number'&&v>30000&&v<80000}
/* Hora de una celda → {hm:'HH:MM', corregida} o null si no es una hora ("not working", "Annual Leave"…) */
export function horaDe(v){
  if(typeof v==='number'&&isFinite(v)){var fr=v%1;if(v>=1&&fr===0)return null;var m=Math.round(fr*1440)%1440;return {hm:pad(Math.floor(m/60))+':'+pad(m%60),corregida:false}}
  var s=String(v===null||v===undefined?'':v).trim(),x=/^(\d{1,2})\s*([:;.,h])\s*(\d{2})$/i.exec(s);
  if(!x||+x[1]>23||+x[3]>59)return null;
  return {hm:pad(+x[1])+':'+x[3],corregida:x[2]!==':'};
}
function minDe(v){var h=horaDe(v);if(!h)return null;var p=h.hm.split(':');return +p[0]*60+ +p[1]}

/* Bloques de entrada/salida de una hoja: [{fila, fechas:[{col, fecha}]}] */
function bloques(filas){
  var out=[];
  for(var i=0;i<filas.length-1;i++){
    var r=filas[i]||[],sig=filas[i+1]||[];
    if(limpio(r[0])!=='name')continue;
    var fechas=[];
    for(var c=3;c<r.length;c++)if(esFecha(r[c])&&limpio(sig[c])==='check-in')fechas.push({col:c,fecha:serialAFecha(r[c])});
    if(fechas.length)out.push({fila:i,fechas:fechas});
  }
  return out;
}
/* Bloque de horas extra que trae la planilla: fila "Name" con fechas en columnas seguidas y "Total Regular Hours…" */
function bloqueExtras(filas){
  for(var i=0;i<filas.length;i++){
    var r=filas[i]||[];
    if(limpio(r[0])!=='name'||!r.some(function(x){return /total regular hours/.test(limpio(x))}))continue;
    var fechas=[];for(var c=3;c<r.length;c++)if(esFecha(r[c]))fechas.push({col:c,fecha:serialAFecha(r[c])});
    return {fila:i,fechas:fechas};
  }
  return null;
}
function filaDe(filas,desde,nombre){
  for(var i=desde+1;i<filas.length;i++){var r=filas[i]||[];if(limpio(r[0])==='name')return null;if(limpio(r[0])===nombre)return r}
  return null;
}

/* Nombres de las personas que aparecen en la planilla (para elegir quién sos) */
export function personas(hojas){
  var vistos={},out=[];
  hojas.forEach(function(h){bloques(h.filas).forEach(function(b){
    for(var i=b.fila+2;i<h.filas.length;i++){
      var n=(h.filas[i]||[])[0];if(limpio(n)==='name')break;
      if(n&&typeof n==='string'&&!vistos[limpio(n)]){vistos[limpio(n)]=1;out.push(n.trim())}
    }
  })});
  return out.sort(function(a,b){return a.localeCompare(b,'es')});
}

/* Lee los días de una persona. reglas = perfil.horas; hoy = 'aaaa-mm-dd' (los días futuros no cuentan).
   Devuelve {dias:[{fecha,llegada,salida,tipo,min,total,planilla,aviso}], ausencias:[{fecha,motivo}], avisos:[]} */
export function leerPlanilla(hojas,nombre,reglas,hoy){
  var quien=limpio(nombre),dias={},ausencias={},avisos=[];
  hojas.forEach(function(h){
    var ext=bloqueExtras(h.filas),filaExt=ext?filaDe(h.filas,ext.fila,quien):null,extPorFecha={};
    if(filaExt)ext.fechas.forEach(function(f){var m=minDe(filaExt[f.col]);if(m!==null)extPorFecha[f.fecha]=m});
    bloques(h.filas).forEach(function(b){
      var r=filaDe(h.filas,b.fila+1,quien);if(!r)return;
      b.fechas.forEach(function(f){
        if(hoy&&f.fecha>hoy)return;
        var e=horaDe(r[f.col]),s=horaDe(r[f.col+1]);
        if(!e||!s){
          var t=[r[f.col],r[f.col+1]].filter(function(x){return typeof x==='string'&&x.trim()})[0];
          if(t)ausencias[f.fecha]={fecha:f.fecha,motivo:t.trim()};
          else if((r[f.col]!==undefined&&r[f.col]!==null)||(r[f.col+1]!==undefined&&r[f.col+1]!==null))avisos.push('El '+f.fecha+' no pude leer la entrada o la salida.');
          return;
        }
        var tipo=tipoDeDia(f.fecha,reglas.dias),x=extraPorHorario(reglas,e.hm,s.hm,tipo);
        if(!x){if(avisos.indexOf(SIN_HORARIO)<0)avisos.push(SIN_HORARIO);return}
        var d={fecha:f.fecha,llegada:e.hm,salida:s.hm,tipo:tipo,min:x.min,total:x.total};
        if(e.corregida||s.corregida)d.aviso='En la planilla la hora está mal escrita ('+(e.corregida?r[f.col]:r[f.col+1])+'); la leí como '+(e.corregida?e.hm:s.hm)+'.';
        if(extPorFecha[f.fecha]!==undefined){
          d.planilla=extPorFecha[f.fecha];
          if(d.planilla!==d.min&&!d.aviso)d.aviso='La planilla dice '+d.planilla+' min y con tu entrada y salida son '+d.min+'.';
          else if(d.planilla!==d.min)d.aviso+=' La planilla calculó '+d.planilla+' min; con la hora bien son '+d.min+'.';
        }
        dias[f.fecha]=d;delete ausencias[f.fecha];
      });
    });
  });
  var lista=Object.keys(dias).sort().map(function(k){return dias[k]});
  return {dias:lista,ausencias:Object.keys(ausencias).sort().map(function(k){return ausencias[k]}),avisos:avisos};
}

/* Pone en el estado las horas de la planilla: reemplaza lo que había cargado en esos días. Devuelve cuántos. */
export function importarHoras(state,dias,uid){
  var fechas={};dias.forEach(function(d){fechas[d.fecha]=1});
  var antes=state.horas.length;
  state.horas=state.horas.filter(function(h){return !fechas[h.fecha]});
  var quitados=antes-state.horas.length,nuevos=0;
  dias.forEach(function(d){if(d.min>0){state.horas.push({id:uid(),fecha:d.fecha,tipo:d.tipo,min:d.min,src:'planilla',llegada:d.llegada,salida:d.salida});nuevos++}});
  return {nuevos:nuevos,quitados:quitados};
}
