/* Precisión del cálculo del sueldo (2.12, puro): cuánto confiar en «Vas a cobrar» y qué falta para afinarlo.
   Niveles: 0 aproximado · 1 bueno · 2 muy bueno · 3 exacto. Sube con lo que vas cargando.
   Devuelve {nivel, nombre, margen (en pesos, más o menos), falta (qué hacer para subir) | null}. */
import {num} from './util.js';
import {MESL} from './fechas.js';
import {mesTrabajo,ingresoDe,reglasHoras,mesIngreso} from './sueldo.js';
import {reciboDe,compararRecibo} from './recibos.js';
import {esFactura,datosFactura,totalCostos} from './factura.js';

export var NIVELES=['aproximado','bueno','muy bueno','exacto'];
function mesTxt(k){return MESL[Number(String(k).slice(5,7))-1]}
function res(n,liquido,falta){var m=[.08,.03,.01,0][n];return {nivel:n,nombre:NIVELES[n],margen:Math.round(num(liquido)*m/100)*100,falta:falta}}

export function precision(state,L){
  var liquido=L?L.liquido:0,s=state.sueldo,p=state.perfil||{};
  if(esFactura(state)){
    var F=datosFactura(state),mes=mesIngreso(state),hay=F.facturas.some(function(f){return String(f.fecha||f.mes||'').slice(0,7)===mes});
    if(hay&&totalCostos(F)>0)return res(3,liquido,null);
    if(totalCostos(F)>0)return res(1,liquido,'cargá las facturas de '+mesTxt(mes));
    return res(0,liquido,'cargá tus costos de cada mes (BPS, FONASA, IVA, contador)');
  }
  var tipo=ingresoDe(state).tipo;
  if(tipo==='variable'){
    var m=mesIngreso(state),im=s.ingresosMes||{};
    return im[m]!==undefined&&im[m]!==''?res(3,liquido,null):res(0,liquido,'cargá lo que cobraste en '+mesTxt(m));
  }
  var mt=mesTrabajo(state),r=reciboDe(state,mt);
  if(r&&num(r.liquido)>0)return res(3,liquido,null);
  var falta='sumá el recibo de '+mesTxt(mt);
  if(!(num(s.nominal)>0))return res(0,liquido,'cargá tu sueldo en Ajustes del sueldo');
  /* un recibo anterior que coincide (o el perfil validado con recibos) */
  var otros=(state.recibos||[]).filter(function(x){return x.mes<mt}).sort(function(a,b){return a.mes<b.mes?1:-1});
  if(tipo==='uy'&&(p.recibosAgus||(otros[0]&&Math.abs(num(compararRecibo(state,otros[0]).liquidoDif))<=300)))return res(2,liquido,falta);
  if(p.hecho||otros.length)return res(1,liquido,otros.length?falta:'sumá un recibo para comparar');
  var R=reglasHoras(state);
  return res(0,liquido,R.activo!==false?'confirmá cómo te pagan las horas extra con un recibo':'sumá un recibo para comparar');
}
