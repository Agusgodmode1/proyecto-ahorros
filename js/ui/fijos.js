/* Pestaña Fijos: lista, vencimientos del período, pagado y sugerencias del extracto. */
import {num,uid} from '../logica/util.js';
import {fijosPeriodo,totalFijos,isPagado,marcarPagado,pagoDe,pagosDe,montoEsperado,montoDelPeriodo} from '../logica/plan.js';
import {cotizacion,aPesos} from '../logica/monedas.js';
import {ctx,$,planNow,liqNow,exAnalisis,money,usd,esc,fCorta,fLarga,titulo,tile,armar,toast,today} from './comun.js';

export var FCATS=[['Vivienda','var(--sky)'],['Servicios','var(--sun)'],['Celular e internet','var(--grape)'],['Suscripciones','var(--pink)'],['Salud','var(--mint)'],['Transporte','var(--teal)'],['Deudas y cuotas','var(--coral)'],['Educación','var(--slate)'],['Otros','var(--muted)']];
var FSUG=[['Alquiler','Vivienda'],['Gastos comunes','Vivienda'],['UTE','Servicios'],['OSE','Servicios'],['Internet','Celular e internet'],['Celular','Celular e internet'],['Netflix','Suscripciones'],['Spotify','Suscripciones'],['Gimnasio','Salud'],['Mutualista','Salud'],['Boleto STM','Transporte'],['Préstamo','Deudas y cuotas'],['Tarjeta de crédito','Deudas y cuotas']];
var fEdit=null,pagando=null,tarTocada=false;
var ES_TARJETA=/TARJETA|\bVISA\b|MASTER|\bOCA\b|CREDITO|CRÉDITO|AMEX|CREDITEL|ANDA/;
function fcatCol(c){for(var i=0;i<FCATS.length;i++)if(FCATS[i][0]===c)return FCATS[i][1];return 'var(--muted)'}

export function renderFijos(pc){
  var state=ctx.state;
  pc=pc||planNow();
  var p=state.plan,fp=fijosPeriodo(state.fijos,p.inicio,p.cobro),tot=totalFijos(state.fijos,state),L=liqNow(true);
  var pag=fp.filter(function(o){return isPagado(state,o.f.id)}).length;
  $('#fijos-sum').innerHTML='<div class="tiles">'
    +tile('tone-teal','Todos los meses',money(tot),state.fijos.length+' '+(state.fijos.length===1?'gasto fijo':'gastos fijos'))
    +tile('tone-sky','Antes de cobrar',money(pc.fijos),fp.length?fp.length+' vencen antes del '+esc(fCorta(p.cobro)):'ninguno vence antes del '+esc(fCorta(p.cobro)))
    +tile('tone-grape','Parte de tu sueldo',L.liquido>0?Math.round(tot/L.liquido*100)+'%':'—','de lo que cobrás en mano')
    +tile('tone-mint','Pagados',pag+' de '+fp.length,'en este período')
    +'</div>';
  var o='';
  if(!state.fijos.length)o='<div class="empty">Todavía no cargaste gastos fijos. Tocá una sugerencia de arriba o escribí el tuyo.</div>';
  else{
    var list=state.fijos.slice().sort(function(a,b){return num(a.dia)-num(b.dia)});
    o='<div class="card stack"><div class="sec"><h2>Tus gastos fijos</h2><p class="note">Cuando pagues uno, tocá <b>Pagar</b> y anotá cuánto pagaste de verdad. Al cerrar el mes se desmarcan solos.</p></div><ul class="list flist">';
    list.forEach(function(f){
      var oc=fp.filter(function(x){return x.f.id===f.id})[0];
      var when=oc?'vence el '+fLarga(oc.fecha):'día '+f.dia+', fuera de este período';
      var pago=oc?pagoDe(state,f.id):null,pagado=!!pago,esp=montoEsperado(state,f),ps=pagosDe(state,f.id);
      var monto=oc?montoDelPeriodo(state,f):esp;
      var sub=[esc(f.cat),esc(when)];
      if(f.variable)sub.push(ps.length?'promedio de '+Math.min(3,ps.length)+(Math.min(3,ps.length)===1?' pago':' pagos'):'cambia cada mes');
      if(f.tarjeta)sub.push('no se resta del presupuesto');
      o+='<li class="'+(pagado?'paid':'')+'"><i class="dot" style="background:'+fcatCol(f.cat)+'"></i><span class="what"><b>'+esc(f.nombre)+'</b><span class="src">'+sub.join(' · ')+'</span></span>'
        +'<span class="amt">'+(f.variable&&!(pago&&num(pago.monto)>0)?'≈ ':'')+money(monto)+(f.usd?'<small class="amt-usd">'+usd(f.usd)+'</small>':'')+'</span>'
        +'<span class="ctrl">';
      if(!oc)o+='<span class="note">No vence en este período</span>';
      else if(pagado)o+='<span class="pagado-txt">Pagado'+(num(pago.monto)>0?' '+money(num(pago.monto)):'')+(pago.fecha?' el '+esc(fCorta(pago.fecha)):'')+' <button class="linklike" type="button" data-despagar="'+esc(f.id)+'">deshacer</button></span>';
      else if(pagando===f.id)o+='<form class="pagar-form" data-pagarf="'+esc(f.id)+'" autocomplete="off"><div class="money"><span>$</span><input type="number" inputmode="decimal" min="0" step="any" value="'+Math.round(esp)+'" aria-label="Cuánto pagaste"></div><input type="date" value="'+today()+'" max="'+today()+'" aria-label="Cuándo"><button class="btn primary" type="submit">Guardar</button><button class="btn quiet" type="button" data-pagarno>Cancelar</button></form>';
      else o+='<button class="btn" type="button" data-pagar="'+esc(f.id)+'">Pagar</button>';
      o+='<span><button class="btn quiet" type="button" data-editf="'+esc(f.id)+'">Editar</button><button class="btn quiet" type="button" data-delf="'+esc(f.id)+'">Borrar</button></span></span></li>';
    });
    o+='</ul></div>';
  }
  var A=exAnalisis();
  if(A){
    var names=state.fijos.map(function(f){return f.nombre.toLowerCase()});
    var sug=A.com.filter(function(c){var k=c.k.toLowerCase();return c.fijo&&!names.some(function(n){return n.indexOf(k)>=0||k.indexOf(n)>=0})});
    if(sug.length)o+='<div class="callout tone-coral"><h2>Cobros que se repiten en tu extracto</h2><p class="note">Parecen gastos fijos. Agregalos con un toque y después ajustá el día si hace falta.</p><div class="sugs">'
      +sug.slice(0,6).map(function(c){var f=c.f.slice().sort(),dia=Number(f[f.length-1].slice(8,10));var cat=c.c==='Suscripciones'?'Suscripciones':c.c==='Servicios y cuentas'?'Servicios':'Otros';return '<button class="btn" type="button" data-sugf="'+esc(titulo(c.k))+'" data-sugm="'+Math.round(c.prom)+'" data-sugd="'+dia+'" data-sugc="'+esc(cat)+'">+ '+esc(titulo(c.k))+' · '+money(c.prom)+'</button>'}).join('')
      +'</div></div>';
  }
  $('#fijos-out').innerHTML=o;
}
function monedaFijo(u){
  var b=$('#f-mon');b.setAttribute('data-moneda',u?'USD':'UYU');b.textContent=u?'US$':'$';b.setAttribute('aria-label','Cambiar moneda: ahora en '+(u?'dólares':'pesos'));
  var c=cotizacion(ctx.state),n=$('#f-usd-nota');
  n.innerHTML=!u?'':(c?'Se paga en dólares: cada mes se pasa a pesos con el dólar de Ajustes ($ '+String(c).replace('.',',')+').':'Cargá la cotización del dólar en <button class="linklike" type="button" data-goto="ajustes">Ajustes</button>.');
}
function resetFijoForm(){
  monedaFijo(false);
  tarTocada=false;$('#f-var').checked=false;$('#f-tar').checked=false;
  fEdit=null;$('#f-nombre').value='';$('#f-monto').value='';$('#f-dia').value='';$('#f-cat').value='Otros';
  $('#fijo-form-t').textContent='Agregá un gasto fijo';$('#f-save').textContent='Agregar';$('#f-cancel').hidden=true;
}
export function initFijos(){
  $('#f-cat').innerHTML=FCATS.map(function(c){return '<option>'+esc(c[0])+'</option>'}).join('');$('#f-cat').value='Otros';
  $('#fijo-sug').innerHTML=FSUG.map(function(s){return '<button class="btn" type="button" data-fsug="'+esc(s[0])+'" data-fcat="'+esc(s[1])+'">'+esc(s[0])+'</button>'}).join('');
  $('#fijo-form').addEventListener('submit',function(e){
    e.preventDefault();
    var state=ctx.state,n=$('#f-nombre').value.trim(),m=num($('#f-monto').value),d=Math.round(num($('#f-dia').value))||1,c=$('#f-cat').value;
    var enUSD=$('#f-mon').getAttribute('data-moneda')==='USD',cot=cotizacion(state);
    if(!n){$('#f-nombre').focus();return}
    if(!(m>0)){$('#f-monto').focus();return}
    if(enUSD&&!cot){toast('Primero cargá la cotización del dólar en Ajustes');return}
    d=Math.min(31,Math.max(1,d));
    /* En dólares: se guarda el monto en dólares y su equivalente en pesos con la cotización actual */
    var monto=enUSD?aPesos(m,cot):m;
    var esVar=$('#f-var').checked,esTar=$('#f-tar').checked;
    function moneda(f){if(esVar)f.variable=true;else delete f.variable;if(esTar)f.tarjeta=true;else delete f.tarjeta;if(enUSD){f.usd=Math.round(m*100)/100;f.cotiz=cot}else{delete f.usd;delete f.cotiz}}
    if(fEdit){state.fijos.forEach(function(f){if(f.id===fEdit){f.nombre=n.slice(0,40);f.monto=monto;f.dia=d;f.cat=c;moneda(f)}})}
    else{var nf={id:uid(),nombre:n.slice(0,40),monto:monto,dia:d,cat:c};moneda(nf);state.fijos.push(nf)}
    var was=!!fEdit;resetFijoForm();ctx.persist();ctx.renderAll();toast(was?'Cambios guardados':'Gasto fijo agregado');
  });
  $('#f-cancel').addEventListener('click',resetFijoForm);
  /* Si el nombre parece una tarjeta, se marca solo como "pago de tarjeta" */
  $('#f-nombre').addEventListener('input',function(){if(tarTocada)return;$('#f-tar').checked=ES_TARJETA.test(this.value.toUpperCase())});
  $('#f-tar').addEventListener('change',function(){tarTocada=true});
  $('#f-mon').addEventListener('click',function(){monedaFijo(this.getAttribute('data-moneda')!=='USD');$('#f-monto').focus()});
  $('#p-fijos').addEventListener('click',function(e){
    var state=ctx.state;
    var s=e.target.closest('[data-fsug]');
    if(s){$('#f-nombre').value=s.getAttribute('data-fsug');$('#f-cat').value=s.getAttribute('data-fcat');$('#f-monto').focus();return}
    var ed=e.target.closest('[data-editf]');
    if(ed){var id=ed.getAttribute('data-editf'),f=state.fijos.filter(function(x){return x.id===id})[0];if(!f)return;
      fEdit=id;$('#f-nombre').value=f.nombre;$('#f-monto').value=f.usd||f.monto;monedaFijo(!!f.usd);$('#f-var').checked=!!f.variable;$('#f-tar').checked=!!f.tarjeta;tarTocada=true;$('#f-dia').value=f.dia;$('#f-cat').value=f.cat;
      $('#fijo-form-t').textContent='Editar '+f.nombre;$('#f-save').textContent='Guardar cambios';$('#f-cancel').hidden=false;
      try{$('#fijo-form').scrollIntoView({block:'center'})}catch(er){}$('#f-monto').focus();return}
    var dl=e.target.closest('[data-delf]');
    if(dl){
      if(!armar(dl))return;
      var did=dl.getAttribute('data-delf');state.fijos=state.fijos.filter(function(x){return x.id!==did});if(fEdit===did)resetFijoForm();ctx.persist();ctx.renderAll();return}
    var sg=e.target.closest('[data-sugf]');
    if(sg){state.fijos.push({id:uid(),nombre:sg.getAttribute('data-sugf').slice(0,40),monto:num(sg.getAttribute('data-sugm')),dia:Math.min(31,Math.max(1,Number(sg.getAttribute('data-sugd'))||1)),cat:sg.getAttribute('data-sugc')||'Otros'});ctx.persist();ctx.renderAll();toast('Gasto fijo agregado');return}
  });
  /* Pagar: con el monto y la fecha reales */
  $('#p-fijos').addEventListener('click',function(e){
    var b=e.target.closest('[data-pagar]');if(b){pagando=b.getAttribute('data-pagar');renderFijos();var i=$('[data-pagarf] input');if(i){i.focus();i.select()}return}
    if(e.target.closest('[data-pagarno]')){pagando=null;renderFijos();return}
    var d=e.target.closest('[data-despagar]');if(d){marcarPagado(ctx.state,d.getAttribute('data-despagar'),false);ctx.persist();ctx.renderAll();return}
  });
  $('#p-fijos').addEventListener('submit',function(e){
    var f=e.target.closest('[data-pagarf]');if(!f)return;
    e.preventDefault();
    var id=f.getAttribute('data-pagarf'),m=num(f.querySelector('input[type=number]').value),fe=f.querySelector('input[type=date]').value||today();
    if(!(m>0)){f.querySelector('input[type=number]').focus();return}
    var fx=ctx.state.fijos.filter(function(x){return x.id===id})[0];if(!fx)return;
    /* Cada pago guarda el nombre del fijo: si después lo renombrás o lo borrás, el historial no se pierde */
    marcarPagado(ctx.state,id,true,{monto:Math.round(m*100)/100,fecha:fe,nombre:fx.nombre});
    pagando=null;ctx.persist();ctx.renderAll();toast(fx.nombre+': pagado '+money(m));
  });
}
