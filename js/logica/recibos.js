/* Recibos de sueldo guardados mes a mes y lectura del texto de un PDF (puro, sin DOM ni red).
   state.recibos = [{id, mes:'aaaa-mm' (mes trabajado), moneda:'UYU'|'USD', cotiz, nominal, haberes, aportes, fonasa,
                     irpf, otros, liquido, horasCant, horasMonto, empleador, fuente:'manual'|'pdf'}]
   state.plantillasRecibo = {empleador: {campo: 'texto de la etiqueta'}}: lo que corregiste en un PDF de ese empleador.
   El PDF nunca se guarda: solo los valores que confirmás. */
import {num} from './util.js';
import {mesTrabajo,pagoSem} from './sueldo.js';
import {liqCompleta as liq} from './liquidacion.js';
import {esFactura} from './factura.js';

export var CAMPOS=[
  ['nominal','Sueldo básico'],['haberes','Total haberes'],['aportes','Aporte jubilatorio'],['fonasa','FONASA'],
  ['irpf','IRPF'],['otros','Otros descuentos'],['liquido','Líquido a cobrar'],['horasCant','Horas extra (cantidad)'],['horasMonto','Horas extra (importe)']
];
var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'];
function sinTildes(s){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}

/* ---------- Montos: "47.954,63" (Uruguay) o "47,954.63" (inglés) ---------- */
export function parseMonto(s){
  var t=String(s||'').replace(/[$\s]|US|UYU|U\$S/gi,'');
  var neg=/^-|-$|^\(.*\)$/.test(t);t=t.replace(/[()\-]/g,'');
  if(!/\d/.test(t))return null;
  var n;
  if(/,\d{1,2}$/.test(t))n=parseFloat(t.replace(/\./g,'').replace(',','.'));
  else if(/\.\d{1,2}$/.test(t)&&!/^\d{1,3}(\.\d{3})+$/.test(t))n=parseFloat(t.replace(/,/g,''));
  else n=parseFloat(t.replace(/[.,]/g,''));
  if(!isFinite(n))return null;
  return neg?-n:n;
}
var NUM=/-?\(?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?\)?|-?\(?\d+[.,]\d{1,2}\)?|\b\d{2,}\b/g;
export function montosDe(linea){return (String(linea).match(NUM)||[]).map(parseMonto).filter(function(n){return n!==null})}

/* ---------- Del PDF a renglones: [{str, x, y}] → ['texto del renglón', …] (de arriba hacia abajo) ---------- */
export function renglones(items,tol){
  tol=tol||3;
  var it=items.filter(function(i){return String(i.str).trim()}).slice().sort(function(a,b){return b.y-a.y||a.x-b.x}),filas=[];
  it.forEach(function(i){
    var f=filas.filter(function(r){return Math.abs(r.y-i.y)<=tol})[0];
    if(!f){f={y:i.y,items:[]};filas.push(f)}
    f.items.push(i);
  });
  return filas.map(function(f){return f.items.sort(function(a,b){return a.x-b.x}).map(function(i){return String(i.str).trim()}).join('  ')});
}

/* ---------- Etiquetas conocidas (y sus variantes) ---------- */
var ETIQ={
  liquido:/liquido a cobrar|liquido a percibir|neto a cobrar|neto a percibir|total liquido|^\s*liquido\b|\bliquido\s*:/,
  haberes:/total (de )?haberes|total (de )?remuneraciones|total remunerativo|total bruto|total ganado|total nominal/,
  aportes:/aporte jubilatorio|montepio|jubilatorio|aporte bps|aportes? personal(es)?/,
  fonasa:/fonasa|seguro (nacional )?de salud|snis/,
  irpf:/irpf|impuesto a la renta|retencion irpf/,
  frl:/\bfrl\b|reconversion laboral/,
  descuentos:/total (de )?descuentos|total retenciones|total deducciones/,
  horas:/horas? extras?|hs\.? extras?|extras comunes/,
  nominal:/sueldo (basico|base|mensual|nominal)|^\s*sueldo\b|salario (basico|base)/
};
/* empleador: el RUT si aparece; si no, el primer renglón con letras */
export function empleadorDe(lineas){
  for(var i=0;i<lineas.length;i++){var m=/r\.?u\.?t\.?[:\s.]*([\d.\s-]{9,})/i.exec(lineas[i]);if(m)return 'rut:'+m[1].replace(/\D/g,'')}
  for(var j=0;j<lineas.length;j++){var l=lineas[j].trim();if(/[a-záéíóúñ]{3,}/i.test(l)&&!/recibo|liquidacion|sueldo/i.test(sinTildes(l)))return 'nombre:'+sinTildes(l).replace(/\s+/g,' ').slice(0,40)}
  return 'sin-nombre';
}
export function mesDe(lineas){
  var t=sinTildes(lineas.join(' ')).replace('septiembre','setiembre');
  for(var i=0;i<12;i++){var m=new RegExp(MESES[i]+'\\s*(?:de\\s*|/|-)?\\s*(20\\d\\d)').exec(t);if(m)return m[1]+'-'+(i<9?'0':'')+(i+1)}
  var n=/\b(0?[1-9]|1[0-2])\s*\/\s*(20\d\d)\b/.exec(t);if(n)return n[2]+'-'+(n[1].length<2?'0':'')+n[1];
  return null;
}
/* Etiqueta de un renglón: el texto sin los números (para guardar en la plantilla) */
export function etiquetaDe(linea){return sinTildes(linea).replace(NUM,' ').replace(/[$:.\-]/g,' ').replace(/\s+/g,' ').trim()}

/* Lee un recibo: devuelve {campos:{campo:{valor, linea}}, empleador, mes, sinTexto} */
export function leerRecibo(lineas,plantillas){
  var texto=lineas.join(' ').replace(/\s+/g,'');
  var out={campos:{},empleador:empleadorDe(lineas),mes:mesDe(lineas),sinTexto:texto.length<20};
  if(out.sinTexto)return out;
  var P=(plantillas||{})[out.empleador]||{};
  function poner(campo,valor,linea){if(valor!==null&&valor!==undefined&&!out.campos[campo])out.campos[campo]={valor:valor,linea:linea}}
  /* 1) lo que aprendió de este empleador */
  Object.keys(P).forEach(function(campo){
    for(var i=0;i<lineas.length;i++){var ns=montosDe(lineas[i]);if(ns.length&&etiquetaDe(lineas[i]).indexOf(P[campo])>=0){poner(campo,ns[ns.length-1],lineas[i]);break}}
  });
  /* 2) etiquetas conocidas: el último número del renglón (la columna del importe) */
  var frl=0,desc=null;
  lineas.forEach(function(l){
    var n=sinTildes(l),ns=montosDe(l);if(!ns.length)return;
    var ult=ns[ns.length-1];
    if(ETIQ.descuentos.test(n)){if(desc===null)desc={valor:ult,linea:l};return}
    if(ETIQ.liquido.test(n)&&!ETIQ.irpf.test(n)){poner('liquido',ult,l);return}
    if(ETIQ.haberes.test(n)){poner('haberes',ult,l);return}
    if(ETIQ.irpf.test(n)){poner('irpf',ult,l);return}
    if(ETIQ.fonasa.test(n)){poner('fonasa',ult,l);return}
    if(ETIQ.frl.test(n)){frl+=ult;return}
    if(ETIQ.aportes.test(n)){poner('aportes',ult,l);return}
    if(ETIQ.horas.test(n)){poner('horasMonto',ult,l);if(ns.length>1)poner('horasCant',ns[0],l);return}
    if(ETIQ.nominal.test(n)){poner('nominal',ult,l)}
  });
  /* Otros descuentos: el FRL más lo que falte para llegar al total de descuentos */
  if(!out.campos.otros){
    var c=out.campos,conocidos=['aportes','fonasa','irpf'].reduce(function(t,k){return t+(c[k]?c[k].valor:0)},0);
    if(desc){var resto=Math.round((desc.valor-conocidos)*100)/100;if(resto>0.005)poner('otros',resto,desc.linea)}
    else if(frl>0)poner('otros',frl,'FRL');
  }
  return out;
}
/* El usuario corrigió un campo: se guarda la etiqueta del renglón donde está ese valor, para el mes que viene */
export function aprenderPlantilla(plantillas,empleador,campo,valor,lineas){
  for(var i=0;i<lineas.length;i++){
    if(montosDe(lineas[i]).some(function(n){return Math.abs(n-valor)<0.005})){
      var e=etiquetaDe(lineas[i]);if(!e)return false;
      plantillas[empleador]=Object.assign({},plantillas[empleador]);plantillas[empleador][campo]=e;return true;
    }
  }
  return false;
}

/* ---------- Recibos guardados ---------- */
export function enPesosRecibo(r,v){return r.moneda==='USD'?num(v)*num(r.cotiz):num(v)}
export function reciboDe(state,mes){var l=state.recibos||[];for(var i=0;i<l.length;i++)if(l[i].mes===mes)return l[i];return null}
/* Lo que cobrás: el recibo real del mes trabajado si lo cargaste; si no, la estimación de siempre */
export function liqReal(state){
  var est=liq(state,true);if(esFactura(state))return est;
  var r=reciboDe(state,mesTrabajo(state));
  if(!r||!(num(r.liquido)>0))return est;
  var hab=num(r.haberes)>0?enPesosRecibo(r,r.haberes):est.N;
  return Object.assign({},est,{N:hab,liquido:enPesosRecibo(r,r.liquido),real:true,recibo:r,estimado:est});
}
/* Comparar el recibo con lo que calcula el perfil, renglón por renglón.
   Devuelve {filas:[{campo,concepto,calculado,recibo,dif,estado}], explica:{concepto,dif}|null, liquidoDif} */
export function compararRecibo(state,r){
  var est=liq(state,true),h=pagoSem(state)/60;
  var defs=[
    ['haberes','Total haberes',est.N,5,300],['aportes','Aporte jubilatorio',est.mont,5,60],['fonasa','FONASA',est.fon,5,60],
    ['irpf','IRPF',est.irpf,5,100],['otros','Otros descuentos',est.frl+est.otros,5,60],['horasMonto','Horas extra (importe)',est.extraCom,2,60],
    ['horasCant','Horas extra (cantidad)',h,0.01,0.01],['liquido','Líquido',est.liquido,5,300]
  ];
  var filas=defs.filter(function(d){return r[d[0]]!==undefined&&r[d[0]]!==null&&r[d[0]]!==''}).map(function(d){
    var rv=d[0]==='horasCant'?num(r[d[0]]):enPesosRecibo(r,r[d[0]]),dif=rv-d[2],a=Math.abs(dif);
    return {campo:d[0],concepto:d[1],calculado:d[2],recibo:rv,dif:dif,estado:a<=d[3]?'igual':a<=d[4]?'cerca':'revisar'};
  });
  var lq=filas.filter(function(f){return f.campo==='liquido'})[0],explica=null;
  if(lq&&lq.estado!=='igual'){
    /* El renglón cuyo efecto en el líquido más se parece a la diferencia (los descuentos restan).
       Las horas extra van antes que el total de haberes: son más específicas. */
    var orden=['horasMonto','aportes','fonasa','irpf','otros','haberes'];
    orden.forEach(function(c){
      var f=filas.filter(function(x){return x.campo===c})[0];if(!f||Math.abs(f.dif)<=0.5)return;
      var efecto=['aportes','fonasa','irpf','otros'].indexOf(c)>=0?-f.dif:f.dif;
      if(!explica||Math.abs(efecto-lq.dif)<Math.abs(explica.efecto-lq.dif))explica={concepto:f.concepto,dif:f.dif,efecto:efecto};
    });
  }
  return {filas:filas,explica:explica,liquidoDif:lq?lq.dif:null};
}
/* Nominal real de cada mes (para el aguinaldo): {'aaaa-mm': haberes en pesos} */
export function nominalesReales(state){
  var o={};(state.recibos||[]).forEach(function(r){if(num(r.haberes)>0)o[r.mes]=enPesosRecibo(r,r.haberes)});return o;
}
/* Si cobrás en dólares y gastás en pesos: cuánto cambia lo que te queda si el dólar se mueve ±5 % */
export function sensibilidadDolar(L){
  var usd=L.moneda==='USD'||(L.recibo&&L.recibo.moneda==='USD');
  if(!usd||L.sinCotizacion)return null;
  return {pct:5,cambio:Math.round(L.liquido*0.05)};
}
