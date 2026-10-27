/* Cobro con factura (unipersonal o profesional, 2.12, puro).
   - Lee e-Facturas y e-Tickets de DGI (texto del PDF o pegado): RUT, fecha, neto, IVA, total y moneda.
   - Régimen: 'minimo' (IVA mínimo, literal E: no cobrás IVA), 'monotributo' (un pago que cubre BPS e IVA),
     'general' (cobrás IVA 22 %: no es tuyo) o 'nose'.
   - Costos de cada mes que cargás vos: aporte a BPS, FONASA, IVA a pagar (o IVA mínimo), contador y otros.
     Cambian cada año: en enero se pregunta si siguen igual (como la BPC). Nada está escrito en el código.
   - La cuenta: te queda ≈ lo facturado (sin el IVA que cobrás) − aportes − impuestos − costos.
   No reemplaza a tu contador: es para planificar.
   En el estado: perfil.ingreso = {tipo:'variable', factura:true, moneda} (para el cálculo de siempre es un ingreso
   independiente: sin horas extra ni aguinaldo) y sueldo.factura = {regimen, costos, anio, facturas:[…]}. */
import {num,uid} from './util.js';
import {parseMonto,montosDe} from './recibos.js';
import {cotizacion} from './monedas.js';

function sinTildes(s){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}
export var REGIMENES=[['minimo','IVA mínimo (literal E)'],['monotributo','Monotributo'],['general','Régimen general (IVA 22 %)'],['nose','No sé']];
export var COSTOS=[['bps','Aporte a BPS'],['fonasa','FONASA'],['iva','IVA a pagar o IVA mínimo'],['contador','Contador'],['otros','Otros']];
export function facturaBase(){return {regimen:'nose',costos:{bps:0,fonasa:0,iva:0,contador:0,otros:0},anio:null,facturas:[]}}
export function esFactura(state){var i=state&&state.perfil&&state.perfil.ingreso;return !!(i&&i.factura)}
export function datosFactura(state){var f=state&&state.sueldo&&state.sueldo.factura;return f&&typeof f==='object'?Object.assign(facturaBase(),f,{costos:Object.assign(facturaBase().costos,f.costos||{}),facturas:Array.isArray(f.facturas)?f.facturas:[]}):facturaBase()}

/* ---------- Leer una e-Factura / e-Ticket ---------- */
function ultimo(l){var ns=montosDe(String(l).replace(/\d+([.,]\d+)?\s*%/g,' '));return ns.length?ns[ns.length-1]:null}
export function leerFactura(lineas){
  var t=sinTildes(lineas.join('\n')),r={tipo:/e-?\s?ticket/.test(t)?'e-Ticket':/e-?\s?factura/.test(t)?'e-Factura':'Factura',rut:null,fecha:null,neto:null,iva:null,total:null,moneda:'UYU',cliente:null};
  /* RUT del emisor: el primero que aparece (12 dígitos) */
  var mr=/r\.?u\.?t\.?\s*(?:del\s*)?(?:emisor)?\s*[:\-]?\s*([\d.\s-]{11,16})/.exec(t);if(mr){var d=mr[1].replace(/\D/g,'');if(d.length>=11)r.rut=d.slice(0,12)}
  var mf=/(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d\d)/.exec(t),mi=/(20\d\d)-(\d\d)-(\d\d)/.exec(t);
  if(mi)r.fecha=mi[1]+'-'+mi[2]+'-'+mi[3];else if(mf)r.fecha=mf[3]+'-'+('0'+mf[2]).slice(-2)+'-'+('0'+mf[1]).slice(-2);
  if(/moneda\s*:?\s*(usd|us\$|dolar)|\bus\$|\busd\b|u\$s/.test(t))r.moneda='USD';
  lineas.forEach(function(l){
    var n=sinTildes(l),mc=/raz[oó]n\s*social\s*(?:del\s*)?(?:comprador|cliente|receptor)\s*:?\s*(.+)$|^\s*cliente\s*:\s*(.+)$/i.exec(String(l));
    if(mc&&!r.cliente){r.cliente=(mc[1]||mc[2]).trim().slice(0,40);return}
    var v=ultimo(l);if(v===null)return;
    if(/\biva\b/.test(n)&&!/sin\s*iva|exento|total/.test(n)){if(r.iva===null)r.iva=v;return}
    if(/total\s*(a\s*pagar|general|factura)?\b|importe\s*total|monto\s*total/.test(n)&&!/sub\s*total|subtotal/.test(n)){r.total=v;return}
    if(/sub\s*total|subtotal|neto|gravado|monto\s*no\s*gravado|importe\s*neto/.test(n)){if(r.neto===null)r.neto=v;return}
  });
  /* lo que falte, de lo que sí está */
  if(r.total!==null&&r.iva!==null&&r.neto===null)r.neto=Math.round((r.total-r.iva)*100)/100;
  if(r.neto!==null&&r.iva!==null&&r.total===null)r.total=Math.round((r.neto+r.iva)*100)/100;
  /* solo el total: no se sabe si trae IVA (en el régimen general sí); lo decide el régimen al hacer la cuenta */
  return r;
}

/* ---------- Lo que te queda ---------- */
/* Lo facturado, sin el IVA que cobrás (en pesos). En el régimen general el IVA no es tuyo; en los demás no cobrás IVA. */
export function sinIva(fac,regimen,cot){
  var v=regimen==='general'?(num(fac.neto)||num(fac.total)/1.22):(num(fac.neto)||num(fac.total));
  return fac.moneda==='USD'?v*(num(fac.cotiz)||num(cot)||0):v;
}
export function totalCostos(F){var t=0;Object.keys(F.costos).forEach(function(k){t+=num(F.costos[k])});return t}
/* El mes (aaaa-mm): lo facturado ese mes, o lo de un mes normal (sueldo.nominal) si todavía no cargaste facturas */
export function liqFactura(state,mes){
  var F=datosFactura(state),cot=cotizacion(state),fs=F.facturas.filter(function(f){return String(f.fecha||f.mes||'').slice(0,7)===mes});
  var facturado=fs.length?fs.reduce(function(t,f){return t+sinIva(f,F.regimen,cot)},0):num(state.sueldo.nominal);
  var costos=totalCostos(F),detalle=COSTOS.map(function(c){return {nombre:c[1],tipo:'monto',valor:num(F.costos[c[0]]),monto:num(F.costos[c[0]])}}).filter(function(d){return d.monto>0});
  return {tipo:'factura',bono:0,extraCom:0,extraEsp:0,N:facturado,fonRate:0,mont:0,fon:0,frl:0,prim:0,cred:0,irpf:0,otros:costos,
    liquido:facturado-costos,minimo:0,descuentos:detalle,estimado:!fs.length,mes:mes,facturas:fs,regimen:F.regimen,moneda:'UYU'};
}
/* Una factura leída o escrita a mano, lista para guardar */
export function nuevaFactura(d,cot){
  var f={id:uid(),fecha:d.fecha||null,mes:d.mes||(d.fecha?String(d.fecha).slice(0,7):null),rut:d.rut||null,cliente:d.cliente||null,tipo:d.tipo||'Factura',
    neto:d.neto!=null?Math.round(num(d.neto)*100)/100:null,iva:d.iva!=null?Math.round(num(d.iva)*100)/100:null,total:d.total!=null?Math.round(num(d.total)*100)/100:null,moneda:d.moneda==='USD'?'USD':'UYU'};
  if(f.moneda==='USD')f.cotiz=num(cot)||null;
  return f;
}
/* Aviso de enero: los aportes y el IVA mínimo cambian cada año */
export function revisarCostos(state,hoy){
  if(!esFactura(state))return false;
  var F=datosFactura(state),y=Number(String(hoy).slice(0,4));
  return totalCostos(F)>0&&!!F.anio&&F.anio<y;
}
export {parseMonto};
