/* Lector de cualquier recibo (2.12, puro): lee los renglones de un recibo de sueldo uruguayo
   (del PDF, de un texto pegado o escrito a mano), clasifica cada renglón y deduce cómo te pagan las horas extra.
   - Cada renglón con un importe se clasifica como haber, descuento, total o informativo con un diccionario
     de conceptos de recibos uruguayos. Lo que corregiste queda aprendido por empleador (plantillasRecibo[empleador].conceptos).
   - Si el recibo trae cantidad e importe de horas extra, calcula cuánto vale la hora extra, la compara con tu hora común
     y deduce el multiplicador (×1,5, ×2, ×2,5…) y el divisor (sueldo ÷ 200, ÷ 240 o las horas del recibo).
     Si hay más de una posibilidad, devuelve las opciones para preguntar.
   - Nada se guarda solo: la pantalla muestra la propuesta y recién al confirmar se pasa al perfil y a los recibos.
   Todo es una estimación: los ejemplos y las pruebas usan números inventados. */
import {num} from './util.js';
import {montosDe,parseMonto,empleadorDe,mesDe} from './recibos.js';

function sinTildes(s){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}

/* Diccionario: [id, nombre, clase, expresión]. El orden importa (lo más específico primero). */
export var CONCEPTOS=[
  ['totHaberes','Total haberes','total',/total\s*(de\s*)?haberes|total\s*(de\s*)?remuneraciones|total\s*remunerativo|total\s*bruto|total\s*ganado|total\s*nominal|nominal\s*total|subtotal\s*haberes/],
  ['totDescuentos','Total descuentos','total',/total\s*(de\s*)?descuentos|total\s*(de\s*)?retenciones|total\s*deducciones/],
  ['liquido','Líquido','total',/liquido|neto\s*a\s*(cobrar|percibir)|total\s*a\s*cobrar|a\s*cobrar|neto\s*cobrado/],
  ['irpf','IRPF','descuento',/irpf|impuesto\s*a\s*la\s*renta/],
  ['fonasa','FONASA','descuento',/fonasa|snis|seguro\s*(nacional\s*)?de\s*salud/],
  ['frl','FRL','descuento',/\bfrl\b|reconversion\s*laboral/],
  ['bps','Aporte jubilatorio (BPS)','descuento',/montepio|aporte\s*jubilatorio|jubilatorio|aporte\s*bps|\bbps\b|aportes?\s*personal(es)?/],
  ['sindicato','Cuota sindical','descuento',/sindica|gremial/],
  ['retencion','Retención judicial','descuento',/retencion\s*judicial|pension\s*alimenticia|embargo/],
  ['anticipo','Anticipo','descuento',/anticipo|adelanto|\bvale\b/],
  ['prestamo','Préstamo o cuota','descuento',/prestamo|credito|\bcuota\b|\banda\b|cooperativa|creditel/],
  ['faltas','Faltas','descuento',/faltas?\b|inasistencias?|ausencias?/],
  ['seguroVida','Seguro','descuento',/seguro\s*(de\s*)?vida|seguro\s*colectivo/],
  ['vacacional','Salario vacacional','haber',/salario\s*vacacional|\bvacacional/],
  ['aguinaldo','Aguinaldo','haber',/aguinaldo|sueldo\s*anual\s*complementario|\bsac\b/],
  ['horasExtra','Horas extra','haber',/horas?\s*extras?|\bhs\.?\s*extras?|\bh\.?\s*e\.?\b|extras?\s*(comunes|dobles|al\s*doble)/],
  ['nocturnidad','Nocturnidad','haber',/nocturnidad|horas?\s*nocturnas?/],
  ['feriado','Feriado trabajado','haber',/feriado/],
  ['descanso','Descanso trabajado','haber',/descanso/],
  ['presentismo','Presentismo','haber',/presentismo|asiduidad|puntualidad/],
  ['comisiones','Comisiones','haber',/comision/],
  ['bono','Bono o premio','haber',/bono|premio|incentivo|gratificacion|\bplus\b|productividad/],
  ['licencia','Licencia','haber',/licencia/],
  ['antiguedad','Antigüedad','haber',/antiguedad|prima\s*por/],
  ['horasMes','Horas del mes','info',/horas\s*(mensuales|del\s*mes|de\s*trabajo|liquidadas|normales)|carga\s*horaria/],
  ['dias','Días trabajados','info',/dias\s*(trabajados|liquidados|del\s*mes)?\b|\bjornales\s*trabajados/],
  ['valorHora','Valor hora','info',/valor\s*(de\s*la\s*)?hora|precio\s*hora/],
  ['bpc','BPC','info',/\bbpc\b/],
  ['basico','Sueldo básico','haber',/sueldo|salario|jornales?|remuneracion\s*basica|haber\s*basico/]
];
export function concepto(id){for(var i=0;i<CONCEPTOS.length;i++)if(CONCEPTOS[i][0]===id)return {id:id,nombre:CONCEPTOS[i][1],clase:CONCEPTOS[i][2]};return {id:'otro',nombre:'Otro',clase:'info'}}
/* La etiqueta de un renglón (sin números): con ella se recuerda lo que corregiste */
export function etiqueta(l){return sinTildes(l).replace(/[\d.,%$()\-]+/g,' ').replace(/[:/]/g,' ').replace(/\s+/g,' ').trim()}
var FECHA=/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre|periodo:?)\s*(de\s*)?(19|20)\d\d\b|\b\d{1,2}\s*\/\s*(19|20)\d\d\b|\b(19|20)\d\d-\d\d(-\d\d)?\b/g;
var ENCABEZADO=/^(concepto|descripcion|detalle|codigo)\b|haberes\s+descuentos|unidades?\s+importe/;

/* ¿Qué documento es? 'recibo' (de sueldo), 'factura' (e-Factura / e-Ticket) o 'otro' */
export function tipoDocumento(lineas){
  var t=sinTildes(lineas.join(' '));
  var f=(/e-?\s?factura|e-?\s?ticket|\bcfe\b|comprobante\s*fiscal|rut\s*(del\s*)?emisor|rut\s*comprador|tipo\s*de\s*cfe/.test(t)?2:0)+(/\biva\b/.test(t)?1:0)+(/razon\s*social/.test(t)?1:0);
  var r=(/recibo\s*de\s*(sueldo|haberes|salario)|liquidacion\s*de\s*(haberes|sueldo)/.test(t)?2:0)+(/montepio|fonasa|aporte\s*jubilatorio|\bbps\b/.test(t)?2:0)+(/liquido|haberes/.test(t)?1:0);
  if(r>=2&&r>=f)return 'recibo';
  if(f>=2)return 'factura';
  return r?'recibo':'otro';
}

/* Clasifica los renglones. aprendido = {etiqueta: id} (lo que corregiste para ese empleador) */
export function clasificar(lineas,aprendido){
  var out=[];aprendido=aprendido||{};
  lineas.forEach(function(l,i){
    /* los años de las fechas («octubre 2026», «09/2026») no son importes */
    var n=sinTildes(l).replace(FECHA,' '),ns=montosDe(n);
    if(!ns.length||ENCABEZADO.test(n.trim()))return;
    var et=etiqueta(l),id=aprendido[et],ap=!!id;
    if(!id)for(var k=0;k<CONCEPTOS.length;k++)if(CONCEPTOS[k][3].test(n)){id=CONCEPTOS[k][0];break}
    if(!id)return;
    var c=concepto(id),importe=ns[ns.length-1],cant=null;l=String(l);
    /* cantidad: el primer número cuando hay más de uno (horas, días); los % no cuentan */
    var sinPct=n.replace(/\d+[.,]?\d*\s*%/g,' '),ns2=(sinPct.match(/\d+(?:[.,]\d+)*/g)||[]).map(parseMonto).filter(function(v){return v!==null});
    if(ns2.length>1&&/^(horasExtra|nocturnidad|feriado|descanso|dias|faltas)$/.test(id))cant=ns2[0];
    if(/^(horasMes|dias|bpc|valorHora)$/.test(id)&&ns.length===1)cant=ns[0];
    out.push({i:i,linea:l,etiqueta:et,id:id,nombre:c.nombre,clase:c.clase,cantidad:cant,importe:Math.abs(importe),aprendido:ap});
  });
  return out;
}

/* Lee un recibo entero: {tipo, empleador, mes, renglones, totales, cuadra, campos} */
export function leer(lineas,plantillas){
  lineas=(lineas||[]).map(function(l){return String(l)}).filter(function(l){return l.trim()});
  var emp=empleadorDe(lineas),P=(plantillas||{})[emp]||{},R=clasificar(lineas,P.conceptos);
  function primero(id){return R.filter(function(r){return r.id===id})[0]||null}
  function suma(clase){return Math.round(R.filter(function(r){return r.clase===clase}).reduce(function(t,r){return t+r.importe},0)*100)/100}
  var tH=primero('totHaberes'),tD=primero('totDescuentos'),lq=primero('liquido');
  var haberes=tH?tH.importe:suma('haber'),descuentos=tD?tD.importe:suma('descuento'),liquido=lq?lq.importe:Math.round((haberes-descuentos)*100)/100;
  /* ¿cierra la cuenta? haberes − descuentos = líquido (con un margen de $ 2) */
  var cuadra=Math.abs(haberes-descuentos-liquido)<=2;
  var hx=primero('horasExtra'),bas=primero('basico'),bps=primero('bps'),fon=primero('fonasa'),irpf=primero('irpf');
  var conocidos=(bps?bps.importe:0)+(fon?fon.importe:0)+(irpf?irpf.importe:0);
  var campos={nominal:bas?bas.importe:null,haberes:haberes||null,aportes:bps?bps.importe:null,fonasa:fon?fon.importe:null,irpf:irpf?irpf.importe:null,
    otros:descuentos>conocidos+0.005?Math.round((descuentos-conocidos)*100)/100:null,liquido:liquido||null,
    horasCant:hx&&hx.cantidad?hx.cantidad:null,horasMonto:hx?hx.importe:null};
  return {tipo:tipoDocumento(lineas),empleador:emp,mes:mesDe(lineas),renglones:R,totales:{haberes:haberes,descuentos:descuentos,liquido:liquido},cuadra:cuadra,campos:campos,sinTexto:lineas.join('').replace(/\s/g,'').length<20};
}

/* Cuánto vale tu hora extra y cómo te la pagan.
   Devuelve null si no hay datos; si no: {valorHora, hora, divisor, mult, seguro, opciones:[mult…], feriado:{mult}|null} */
var DIVISORES=[240,200,192,208];
var MULTS=[1.5,2,2.5,3];
export function deducirHoras(lectura,actual){
  var R=lectura.renglones,bas=R.filter(function(r){return r.id==='basico'})[0],hx=R.filter(function(r){return r.id==='horasExtra'&&r.cantidad>0&&r.importe>0})[0];
  if(!bas||!hx)return null;
  var hm=R.filter(function(r){return r.id==='horasMes'&&r.cantidad>0})[0],ds=DIVISORES.slice();
  if(hm&&ds.indexOf(hm.cantidad)<0)ds.unshift(hm.cantidad);
  var valor=hx.importe/hx.cantidad,cand=[];
  ds.forEach(function(d){MULTS.forEach(function(m){var e=bas.importe/d*m,err=Math.abs(valor-e)/valor;if(err<0.006)cand.push({divisor:d,mult:m,err:err})})});
  if(!cand.length)return {valorHora:valor,hora:null,divisor:null,mult:null,seguro:false,opciones:[],sinCoincidencia:true,feriado:null};
  /* si el recibo dice cuántas horas tiene el mes, ese es el divisor; si no, preferimos lo que ya tenías en el perfil
     y, si empata, el error más chico */
  if(hm){var conHm=cand.filter(function(c){return c.divisor===hm.cantidad});if(conHm.length)cand=conHm}
  var a=actual||{};
  cand.sort(function(x,y){var px=(x.divisor===num(a.divisor)?-.001:0)+(x.mult===num(a.multSem)?-.001:0),py=(y.divisor===num(a.divisor)?-.001:0)+(y.mult===num(a.multSem)?-.001:0);return (x.err+px)-(y.err+py)});
  var best=cand[0],mults=[];cand.forEach(function(c){if(mults.indexOf(c.mult)<0)mults.push(c.mult)});
  var hora=bas.importe/best.divisor;
  /* el feriado (si viene con cantidad): cuántas veces la hora */
  var fe=R.filter(function(r){return r.id==='feriado'&&r.cantidad>0&&r.importe>0})[0],fer=null;
  if(fe){var mf=fe.importe/fe.cantidad/hora;fer={mult:Math.round(mf*4)/4,valorHora:fe.importe/fe.cantidad}}
  return {valorHora:valor,hora:hora,divisor:best.divisor,mult:best.mult,seguro:mults.length===1&&(cand.length===1||best.err<0.002),opciones:mults,feriado:fer};
}

/* La propuesta para confirmar: «Encontré: sueldo $45.000 mensual, horas extra ×2 sobre $187,50, BPS 15 %, FONASA 4,5 %…»
   money da el formato de los montos. Devuelve [{clave, texto}] */
export function propuesta(lectura,horas,money){
  var c=lectura.campos,t=lectura.totales,out=[];
  function pct(v){return String(Math.round(v/t.haberes*1000)/10).replace('.',',')+' %'}
  if(c.nominal)out.push({clave:'nominal',texto:'sueldo '+money(c.nominal)+' mensual'});
  if(horas&&horas.mult)out.push({clave:'horas',texto:'horas extra ×'+String(horas.mult).replace('.',',')+' sobre '+money(horas.hora)+(horas.seguro?'':' (a confirmar)')});
  if(horas&&horas.feriado)out.push({clave:'feriado',texto:'feriados ×'+String(horas.feriado.mult).replace('.',',')});
  if(c.aportes&&t.haberes)out.push({clave:'aportes',texto:'BPS '+pct(c.aportes)});
  if(c.fonasa&&t.haberes)out.push({clave:'fonasa',texto:'FONASA '+pct(c.fonasa)});
  if(c.irpf)out.push({clave:'irpf',texto:'IRPF '+money(c.irpf)});
  if(c.liquido)out.push({clave:'liquido',texto:'líquido '+money(c.liquido)});
  return out;
}

/* Cómo te pagan, renglón por renglón (2.14): lo que ganás, lo que te descuentan (con su % de lo que ganás) y lo que te queda.
   horas: {mult, hora} (lo que dedujo deducirHoras o lo que contestaste) para explicar las horas extra.
   Devuelve {gana:[{id,nombre,monto,cantidad,porHora}], descuentos:[{id,nombre,monto,pct}], haberes, totDescuentos, liquido, cuadra, hora} */
export function desglose(lectura,horas){
  var t=lectura.totales,gana=[],desc=[];
  lectura.renglones.forEach(function(r){
    if(r.clase==='haber'){
      var g={id:r.id,nombre:r.nombre,monto:r.importe,cantidad:r.cantidad||null,porHora:null};
      if(r.id==='horasExtra'&&r.cantidad>0)g.porHora=Math.round(r.importe/r.cantidad*100)/100;
      gana.push(g);
    }else if(r.clase==='descuento')desc.push({id:r.id,nombre:r.nombre,monto:r.importe,pct:t.haberes?Math.round(r.importe/t.haberes*1000)/10:null});
  });
  return {gana:gana,descuentos:desc,haberes:t.haberes,totDescuentos:t.descuentos,liquido:lectura.campos.liquido,cuadra:lectura.cuadra,
    hora:horas&&horas.hora?Math.round(horas.hora*100)/100:null,mult:horas&&horas.mult||null};
}

/* Cuánto confiar en la lectura: 'alta' si cierra la cuenta y encontró sueldo y líquido; 'media' si falta algo; 'baja' si no cierra */
export function confianza(lectura){
  var c=lectura.campos;
  if(lectura.cuadra&&c.nominal&&c.liquido)return 'alta';
  if(c.liquido&&(c.nominal||c.haberes))return 'media';
  return 'baja';
}
/* Corregir un renglón: se recuerda para ese empleador (la etiqueta del renglón → el concepto) */
export function aprenderConcepto(plantillas,empleador,renglon,id){
  plantillas[empleador]=Object.assign({},plantillas[empleador]);
  plantillas[empleador].conceptos=Object.assign({},plantillas[empleador].conceptos);
  plantillas[empleador].conceptos[renglon.etiqueta]=id;
}
/* Texto pegado (o escrito) → renglones */
export function renglonesDeTexto(t){return String(t||'').replace(/\r/g,'').split('\n').map(function(l){return l.replace(/\t+/g,'  ').trim()}).filter(Boolean)}
