/* Herramientas sueltas (2.26, puro, sin DOM): usar una parte del libro sin armar el pacto.
   Al abrir el libro por primera vez se elige: armar el pacto (el camino completo) o una herramienta,
   que abre directo en su capítulo y pide solo lo que necesita. Hoy, Semanas y Logros necesitan el pacto
   (sin él muestran una invitación); Fijos, Sueldo, Tarjeta y Lo guardado andan sin pacto.
   Lo que cargás en una herramienta se aprovecha después: con tu sueldo, el pacto te sugiere la fecha de cobro y el monto. */
import {num} from './util.js';
import {cobroDesde} from './plan.js';
import {liqReal} from './recibos.js';
import {facturaBase,datosFactura} from './factura.js';
import {sugerirCobro} from './pacto.js';

export var HERRAMIENTAS=[
  {id:'sueldo',t:'Calcular mi sueldo y horas extra',d:'cuánto te queda en mano',tab:'sueldo',ancla:'#sd-empezar'},
  {id:'recibo',t:'Revisar si me pagaron bien',d:'subí tu recibo',tab:'sueldo',ancla:'#sd-subir'},
  {id:'dividir',t:'Dividir gastos fijos',d:'en pareja o con otros',tab:'fijos',ancla:'#grupos-card'},
  {id:'extracto',t:'Ver en qué se me va la plata',d:'pegá o subí el extracto',tab:'gastos',ancla:'#gas-in'}
];
export function herramienta(id){for(var i=0;i<HERRAMIENTAS.length;i++)if(HERRAMIENTAS[i].id===id)return HERRAMIENTAS[i];return null}

/* ¿Ya sellaste un pacto? (el ejemplo y quien venía de antes, sí) */
export function tienePacto(st){return !!(st&&st.pacto&&st.pacto.sellado)}
/* Los capítulos que sin pacto muestran la invitación */
export function pideElPacto(tab){return tab==='resumen'||tab==='logros'||/^w\d+$/.test(String(tab))}

/* ¿Todavía no cargaste nada del sueldo? (sin sueldo, sin recibos y sin facturas) */
export function sueldoVacio(st){
  if(!st||st.ejemplo)return false;
  var s=st.sueldo||{};
  return !(num(s.nominal)>0)&&!(st.recibos||[]).length&&!datosFactura(st).facturas.length;
}

/* Cómo cobrás (la herramienta de sueldo y Ajustes del sueldo): qué cobrás cada mes, cuánto y qué día.
   d = {tipo:'uy'|'personalizado'|'factura', nominal, cobro:{tipo:'habil5'|'ultimoHabil'|'fijo', dia}}.
   Devuelve {ok, error?}. Con pacto, si cambia el día, el cobro de este pacto se recalcula (como en Mi perfil). */
export function aplicarFormaCobro(st,d,hoy){
  var n=num(d&&d.nominal),t=d&&d.tipo;
  if(t!=='uy'&&t!=='personalizado'&&t!=='factura'&&t!=='variable')return {ok:false,error:'tipo'};
  if(!(n>0))return {ok:false,error:'nominal'};
  var p=st.perfil,s=st.sueldo,c=d.cobro||{},regla={tipo:c.tipo==='ultimoHabil'||c.tipo==='fijo'?c.tipo:'habil5'};
  if(regla.tipo==='fijo')regla.dia=Math.min(31,Math.max(1,Math.round(num(c.dia))||1));
  var antes=JSON.stringify({tipo:p.cobro&&p.cobro.tipo,dia:p.cobro&&p.cobro.tipo==='fijo'?p.cobro.dia:undefined});
  var moneda=p.ingreso&&p.ingreso.moneda==='USD'&&t!=='uy'?'USD':'UYU';
  p.ingreso=t==='factura'?{tipo:'variable',factura:true,moneda:moneda}:{tipo:t,moneda:moneda};
  if(t==='factura'&&!s.factura)s.factura=facturaBase();
  if(!s.ingresosMes)s.ingresosMes={};
  s.nominal=Math.round(n*100)/100;
  p.cobro=Object.assign({},p.cobro,regla);if(regla.tipo!=='fijo')delete p.cobro.dia;
  p.hecho=true;
  if(!tienePacto(st))alDiaSinPacto(st,hoy,true);
  else if(JSON.stringify({tipo:regla.tipo,dia:regla.dia})!==antes)st.plan.cobro=cobroDesde(st.plan.inicio,p.cobro);
  return {ok:true};
}

/* Sin pacto, el plan no se usa, pero Fijos y la Tarjeta miran «hasta el cobro»: se mantiene al día con tu regla */
export function alDiaSinPacto(st,hoy,forzar){
  if(tienePacto(st)||!st.plan)return false;
  if(!forzar&&st.plan.cobro&&st.plan.cobro>hoy&&st.plan.inicio<=hoy)return false;
  st.plan.inicio=hoy;st.plan.cobro=sugerirCobro(st,hoy).fecha;
  return true;
}

/* Lo que el pacto te sugiere con lo que ya cargaste: la fecha de cobro (tu regla) y el monto (lo que te queda en mano) */
export function sugerenciaPacto(st,hoy){
  var L=null;try{L=sueldoVacio(st)?null:liqReal(st)}catch(e){L=null}
  var m=L&&num(L.liquido)>0?Math.round(num(L.liquido)):null;
  return {cobro:sugerirCobro(st,hoy).fecha,monto:m};
}
