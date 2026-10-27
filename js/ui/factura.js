/* Sueldo → Tus facturas y costos (2.12): cobro con factura (unipersonal o profesional).
   El régimen, tus costos de cada mes (BPS, FONASA, IVA, contador, otros) y las facturas de cada mes:
   leídas de un PDF, del texto pegado o a mano. Te queda ≈ lo facturado sin IVA − tus costos.
   No reemplaza a tu contador: es para planificar. Las cuentas son puras (logica/factura.js). */
import {num} from '../logica/util.js';
import {MESL} from '../logica/fechas.js';
import {REGIMENES,COSTOS,datosFactura,liqFactura,leerFactura,nuevaFactura,sinIva,revisarCostos,totalCostos} from '../logica/factura.js';
import {renglonesDeTexto} from '../logica/lector-recibo.js';
import {mesIngreso} from '../logica/sueldo.js';
import {cotizacion} from '../logica/monedas.js';
import {ctx,$,today,money,usd,esc,cap,fCorta,toast,toastAccion} from './comun.js';
import {EJ_FACTURA} from './lector.js';

var form=null,pegar=false;  /* form = la factura que se está cargando */
function mesTxt(k){return MESL[Number(k.slice(5,7))-1]+' '+k.slice(0,4)}
var AYUDA={general:'Cobrás IVA 22 %: ese IVA no es tuyo. En «IVA a pagar» poné lo que pagás a DGI después de descontar el IVA de tus compras (si no sabés, dejalo en 0).',
  minimo:'No cobrás IVA. En «IVA a pagar o IVA mínimo» poné el monto fijo que pagás cada mes.',
  monotributo:'No cobrás IVA. Poné el monotributo entero en «Aporte a BPS» (cubre BPS e IVA).',
  nose:'Si no sabés tu régimen, preguntale a tu contador. Mientras tanto, cargá lo que pagás cada mes.'};

function formHTML(){
  var f=form,u=f.moneda==='USD';
  return '<form class="stack fac-form" id="fac-form" autocomplete="off"><div class="grid2">'
    +'<div class="field"><label for="fac-fecha" class="sub-l">Fecha</label><input id="fac-fecha" type="date" value="'+esc(f.fecha||today())+'"></div>'
    +'<div class="field"><label for="fac-cli" class="sub-l">Cliente</label><input id="fac-cli" type="text" maxlength="40" value="'+esc(f.cliente||'')+'" placeholder="opcional"></div>'
    +'<div class="field"><span class="sub-l">Moneda</span><div class="seg" role="group" aria-label="Moneda"><button type="button" data-facmon="UYU" aria-pressed="'+(!u)+'">Pesos</button><button type="button" data-facmon="USD" aria-pressed="'+u+'">Dólares</button></div></div>'
    +'<div class="field"><label for="fac-neto" class="sub-l">Neto (sin IVA)</label><div class="money"><span>'+(u?'US$':'$')+'</span><input id="fac-neto" type="number" inputmode="decimal" min="0" step="any" value="'+(f.neto!=null?f.neto:'')+'"></div></div>'
    +'<div class="field"><label for="fac-iva" class="sub-l">IVA</label><div class="money"><span>'+(u?'US$':'$')+'</span><input id="fac-iva" type="number" inputmode="decimal" min="0" step="any" value="'+(f.iva!=null?f.iva:'')+'"></div></div>'
    +'<div class="field"><label for="fac-total" class="sub-l">Total</label><div class="money"><span>'+(u?'US$':'$')+'</span><input id="fac-total" type="number" inputmode="decimal" min="0" step="any" value="'+(f.total!=null?f.total:'')+'"></div></div>'
    +'</div>'+(f.rut?'<p class="note">'+esc(f.tipo||'Factura')+' · RUT '+esc(f.rut)+'</p>':'')
    +'<div class="row-btns"><button class="btn primary" type="submit">Guardar la factura</button><button class="btn quiet" type="button" data-fac="cancelar">Cancelar</button></div></form>';
}
export function renderFactura(){
  var el=$('#factura-out');if(!el)return;
  var st=ctx.state,F=datosFactura(st),mes=mesIngreso(st),L=liqFactura(st,mes),cot=cotizacion(st);
  var h='<p class="note">No reemplaza a tu contador: es para planificar.</p>';
  if(revisarCostos(st,today()))h+='<div class="banner"><p><b>¿Cambiaron tus costos este año?</b> Los aportes y el IVA mínimo cambian cada enero. Estás usando los de '+esc(String(F.anio))+'.</p><div class="row-btns"><button class="btn" type="button" data-fac="igual">Siguen igual</button></div></div>';
  h+='<div class="fac-res"><p><span>Facturaste'+(L.estimado?' (un mes normal)':' en '+esc(mesTxt(mes)))+'</span><b>'+money(L.N)+'</b></p><p><span>Tus costos</span><b>− '+money(L.otros)+'</b></p><p class="fin"><span>Te queda</span><b>≈ '+money(L.liquido)+'</b></p></div>';
  /* régimen */
  h+='<div class="field"><span class="sub-l">Tu régimen</span><div class="opciones" role="radiogroup" aria-label="Tu régimen">'+REGIMENES.map(function(r){return '<button type="button" role="radio" data-facreg="'+r[0]+'" aria-checked="'+(F.regimen===r[0])+'">'+esc(r[1])+'</button>'}).join('')+'</div><small>'+esc(AYUDA[F.regimen]||AYUDA.nose)+'</small></div>';
  /* costos */
  h+='<div class="field"><span class="sub-l">Tus costos de cada mes</span><div class="grid2 fac-costos">'+COSTOS.map(function(c){return '<div class="field"><label for="fac-c-'+c[0]+'" class="sub-l">'+esc(c[1])+'</label><div class="money"><span>$</span><input id="fac-c-'+c[0]+'" data-faccosto="'+c[0]+'" type="number" inputmode="decimal" min="0" step="any" value="'+(num(F.costos[c[0]])||'')+'"></div></div>'}).join('')+'</div><small>Cambian cada año: en enero te pregunto si siguen igual.</small></div>';
  /* facturas del mes */
  var fs=F.facturas.slice().sort(function(a,b){return String(a.fecha)<String(b.fecha)?1:-1});
  h+='<div class="sec"><h3>Tus facturas</h3><p class="note">El plan usa las de '+esc(mesTxt(mes))+'. Si todavía no cargaste ninguna, uso lo que facturás en un mes normal.</p></div>';
  if(form)h+=formHTML();
  else h+='<div class="row-btns"><label class="btn primary filebtn">Leer una factura (PDF)<input type="file" class="sr-only" accept="application/pdf,.pdf" id="fac-pdf"></label><button class="btn" type="button" data-fac="pegar">Pegar el texto</button><button class="btn" type="button" data-fac="mano">A mano</button></div>'
    +(pegar?'<div class="field"><label for="fac-texto" class="sub-l">El texto de la factura</label><textarea id="fac-texto" rows="6"></textarea></div><div class="row-btns"><button class="btn primary" type="button" data-fac="leer">Leer</button></div>':'')
    +'<p class="note">¿Querés ver cómo funciona? <button class="linklike" type="button" data-fac="ejemplo">Probalo con una factura de ejemplo</button>.</p>';
  if(fs.length)h+='<ul class="list">'+fs.map(function(f){var mesF=String(f.fecha||f.mes||'').slice(0,7);
    return '<li><span class="what"><b>'+esc(f.cliente||f.tipo||'Factura')+'</b><span class="src">'+(f.fecha?esc(fCorta(f.fecha)):'')+(mesF===mes?' · este cobro':'')+' · sin IVA '+money(sinIva(f,F.regimen,cot))+'</span></span><span class="amt">'+(f.moneda==='USD'?usd(num(f.total)||num(f.neto)):money(num(f.total)||num(f.neto)))+'</span><button class="btn quiet" type="button" data-facdel="'+esc(f.id)+'">Borrar</button></li>'}).join('')+'</ul>';
  el.innerHTML=h;
  var d=$('#sd-factura-d');if(d)d.textContent='te queda ≈ '+money(L.liquido)+(L.estimado?'':' en '+mesTxt(mes));
}
function guardarF(){
  var st=ctx.state,F=datosFactura(st);
  var f=Object.assign({},form,{fecha:$('#fac-fecha').value||today(),cliente:$('#fac-cli').value.trim()||null,neto:$('#fac-neto').value===''?null:num($('#fac-neto').value),iva:$('#fac-iva').value===''?null:num($('#fac-iva').value),total:$('#fac-total').value===''?null:num($('#fac-total').value)});
  if(!(num(f.neto)>0||num(f.total)>0)){$('#fac-total').focus();toast('Falta el monto');return}
  if(f.moneda==='USD'&&!cotizacion(st)){toast('Primero cargá la cotización del dólar en Ajustes');return}
  F.facturas=F.facturas.concat([nuevaFactura(f,cotizacion(st))]);st.sueldo.factura=F;
  form=null;ctx.persist();ctx.renderAll();toast('Factura guardada');
}
function leida(lineas){var r=leerFactura(lineas);form=r;pegar=false;var sd=$('#sd-factura');if(sd)sd.open=true;renderFactura();var f=$('#fac-form');if(f)try{f.scrollIntoView({block:'center'})}catch(e){}toast('Revisá los números y guardala')}
export function initFactura(){
  var el=$('#factura-out');if(!el)return;
  document.addEventListener('factura-leida',function(e){leida(e.detail)});
  el.addEventListener('click',function(e){
    var st=ctx.state,b;
    if((b=e.target.closest('[data-facreg]'))){var F=datosFactura(st);F.regimen=b.getAttribute('data-facreg');st.sueldo.factura=F;ctx.persist();ctx.renderAll();return}
    if((b=e.target.closest('[data-facmon]'))){form.moneda=b.getAttribute('data-facmon');['neto','iva','total'].forEach(function(k){var i=$('#fac-'+k);if(i)form[k]=i.value===''?null:num(i.value)});renderFactura();return}
    if((b=e.target.closest('[data-facdel]'))){var F2=datosFactura(st),id=b.getAttribute('data-facdel'),x=F2.facturas.filter(function(f){return f.id===id})[0];F2.facturas=F2.facturas.filter(function(f){return f.id!==id});st.sueldo.factura=F2;ctx.persist();ctx.renderAll();
      toastAccion('Borraste la factura','Deshacer',function(){var F3=datosFactura(ctx.state);F3.facturas.push(x);ctx.state.sueldo.factura=F3;ctx.persist();ctx.renderAll()});return}
    if(!(b=e.target.closest('[data-fac]')))return;
    var a=b.getAttribute('data-fac');
    if(a==='mano'){form={moneda:'UYU',fecha:today()};renderFactura();$('#fac-total').focus()}
    if(a==='pegar'){pegar=!pegar;renderFactura();var t=$('#fac-texto');if(t)t.focus()}
    if(a==='leer'){var tx=($('#fac-texto')||{}).value||'';if(tx.trim())leida(renglonesDeTexto(tx))}
    if(a==='ejemplo')leida(renglonesDeTexto(EJ_FACTURA));
    if(a==='cancelar'){form=null;renderFactura()}
    if(a==='igual'){var F4=datosFactura(st);F4.anio=Number(today().slice(0,4));st.sueldo.factura=F4;ctx.persist();ctx.renderAll()}
  });
  el.addEventListener('input',function(e){
    var k=e.target.getAttribute&&e.target.getAttribute('data-faccosto');if(!k)return;
    var st=ctx.state,F=datosFactura(st);F.costos[k]=num(e.target.value);if(!F.anio)F.anio=Number(today().slice(0,4));st.sueldo.factura=F;ctx.persist();
    var L=liqFactura(st,mesIngreso(st)),r=el.querySelector('.fac-res .fin b');if(r)r.textContent='≈ '+money(L.liquido);
  });
  el.addEventListener('change',async function(e){
    if(e.target.id!=='fac-pdf')return;
    var f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
    toast('Leyendo la factura…');
    try{var mod=await import('./recibos.js');leida(await mod.textoPdf(f))}catch(er){toast('No pude leer ese PDF. Probá pegando el texto o cargala a mano.')}
  });
  el.addEventListener('submit',function(e){if(e.target.id==='fac-form'){e.preventDefault();guardarF()}});
}
