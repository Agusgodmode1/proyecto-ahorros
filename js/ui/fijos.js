/* Pestaña Fijos: lista, vencimientos del período, pagado y sugerencias del extracto. */
import {num,uid} from '../logica/util.js';
import {fijosPeriodo,totalFijos,isPagado,marcarPagado} from '../logica/plan.js';
import {ctx,$,planNow,liqNow,exAnalisis,money,esc,fCorta,fLarga,titulo,tile,armar,toast} from './comun.js';

export var FCATS=[['Vivienda','var(--sky)'],['Servicios','var(--sun)'],['Celular e internet','var(--grape)'],['Suscripciones','var(--pink)'],['Salud','var(--mint)'],['Transporte','var(--teal)'],['Deudas y cuotas','var(--coral)'],['Educación','var(--slate)'],['Otros','var(--muted)']];
var FSUG=[['Alquiler','Vivienda'],['Gastos comunes','Vivienda'],['UTE','Servicios'],['OSE','Servicios'],['Internet','Celular e internet'],['Celular','Celular e internet'],['Netflix','Suscripciones'],['Spotify','Suscripciones'],['Gimnasio','Salud'],['Mutualista','Salud'],['Boleto STM','Transporte'],['Préstamo','Deudas y cuotas'],['Tarjeta de crédito','Deudas y cuotas']];
var fEdit=null;
function fcatCol(c){for(var i=0;i<FCATS.length;i++)if(FCATS[i][0]===c)return FCATS[i][1];return 'var(--muted)'}

export function renderFijos(pc){
  var state=ctx.state;
  pc=pc||planNow();
  var p=state.plan,fp=fijosPeriodo(state.fijos,p.inicio,p.cobro),tot=totalFijos(state.fijos),L=liqNow(true);
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
    o='<div class="card stack"><div class="sec"><h2>Tus gastos fijos</h2><p class="note">Marcá cada uno cuando lo pagues. Al cerrar el mes se desmarcan solos.</p></div><ul class="list flist">';
    list.forEach(function(f){
      var oc=fp.filter(function(x){return x.f.id===f.id})[0];
      var when=oc?'vence el '+fLarga(oc.fecha):'día '+f.dia+', fuera de este período';
      var pagado=!!oc&&isPagado(state,f.id);
      o+='<li class="'+(pagado?'paid':'')+'"><i class="dot" style="background:'+fcatCol(f.cat)+'"></i><span class="what"><b>'+esc(f.nombre)+'</b><span class="src">'+esc(f.cat)+' · '+esc(when)+'</span></span><span class="amt">'+money(num(f.monto))+'</span>'
        +'<span class="ctrl">'+(oc?'<label class="paybox"><input type="checkbox" data-payf="'+esc(f.id)+'"'+(pagado?' checked':'')+'> Pagado</label>':'<span class="note">No vence en este período</span>')
        +'<span><button class="btn quiet" type="button" data-editf="'+esc(f.id)+'">Editar</button><button class="btn quiet" type="button" data-delf="'+esc(f.id)+'">Borrar</button></span></span></li>';
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
function resetFijoForm(){
  fEdit=null;$('#f-nombre').value='';$('#f-monto').value='';$('#f-dia').value='';$('#f-cat').value='Otros';
  $('#fijo-form-t').textContent='Agregá un gasto fijo';$('#f-save').textContent='Agregar';$('#f-cancel').hidden=true;
}
export function initFijos(){
  $('#f-cat').innerHTML=FCATS.map(function(c){return '<option>'+esc(c[0])+'</option>'}).join('');$('#f-cat').value='Otros';
  $('#fijo-sug').innerHTML=FSUG.map(function(s){return '<button class="btn" type="button" data-fsug="'+esc(s[0])+'" data-fcat="'+esc(s[1])+'">'+esc(s[0])+'</button>'}).join('');
  $('#fijo-form').addEventListener('submit',function(e){
    e.preventDefault();
    var state=ctx.state,n=$('#f-nombre').value.trim(),m=num($('#f-monto').value),d=Math.round(num($('#f-dia').value))||1,c=$('#f-cat').value;
    if(!n){$('#f-nombre').focus();return}
    if(!(m>0)){$('#f-monto').focus();return}
    d=Math.min(31,Math.max(1,d));
    if(fEdit){state.fijos.forEach(function(f){if(f.id===fEdit){f.nombre=n.slice(0,40);f.monto=m;f.dia=d;f.cat=c}})}
    else state.fijos.push({id:uid(),nombre:n.slice(0,40),monto:m,dia:d,cat:c});
    var was=!!fEdit;resetFijoForm();ctx.persist();ctx.renderAll();toast(was?'Cambios guardados':'Gasto fijo agregado');
  });
  $('#f-cancel').addEventListener('click',resetFijoForm);
  $('#p-fijos').addEventListener('click',function(e){
    var state=ctx.state;
    var s=e.target.closest('[data-fsug]');
    if(s){$('#f-nombre').value=s.getAttribute('data-fsug');$('#f-cat').value=s.getAttribute('data-fcat');$('#f-monto').focus();return}
    var ed=e.target.closest('[data-editf]');
    if(ed){var id=ed.getAttribute('data-editf'),f=state.fijos.filter(function(x){return x.id===id})[0];if(!f)return;
      fEdit=id;$('#f-nombre').value=f.nombre;$('#f-monto').value=f.monto;$('#f-dia').value=f.dia;$('#f-cat').value=f.cat;
      $('#fijo-form-t').textContent='Editar '+f.nombre;$('#f-save').textContent='Guardar cambios';$('#f-cancel').hidden=false;
      try{$('#fijo-form').scrollIntoView({block:'center'})}catch(er){}$('#f-monto').focus();return}
    var dl=e.target.closest('[data-delf]');
    if(dl){
      if(!armar(dl))return;
      var did=dl.getAttribute('data-delf');state.fijos=state.fijos.filter(function(x){return x.id!==did});if(fEdit===did)resetFijoForm();ctx.persist();ctx.renderAll();return}
    var sg=e.target.closest('[data-sugf]');
    if(sg){state.fijos.push({id:uid(),nombre:sg.getAttribute('data-sugf').slice(0,40),monto:num(sg.getAttribute('data-sugm')),dia:Math.min(31,Math.max(1,Number(sg.getAttribute('data-sugd'))||1)),cat:sg.getAttribute('data-sugc')||'Otros'});ctx.persist();ctx.renderAll();toast('Gasto fijo agregado');return}
  });
  $('#p-fijos').addEventListener('change',function(e){
    var c=e.target.closest('[data-payf]');if(!c)return;
    marcarPagado(ctx.state,c.getAttribute('data-payf'),c.checked);
    ctx.persist();ctx.renderAll();
  });
}
