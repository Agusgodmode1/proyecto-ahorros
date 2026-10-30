/* Capítulo III · Fijos (2.11): lo que te toca, con quién lo compartís y quién le debe a quién.
   - Arriba: «Te toca $A este mes» (solo tuyos + tu parte compartida) y el total de la casa.
   - Quién debe a quién en este período, con «Me pagaron» o «Saldar» (siempre con Deshacer).
   - Una sección por grupo (con quién y cuánto pone cada uno) y una de «Solo míos».
   - El formulario: ¿De quién es?, ¿Quién lo paga? y, si hace falta, un reparto distinto para ese fijo.
   - Con quién compartís (grupos, con plantillas), la calculadora de la casa y compartir el resumen por WhatsApp.
   Las cuentas son puras: logica/reparto.js y logica/compartidos.js. Nada sale del teléfono. */
import {num,uid} from '../logica/util.js';
import {fijosPeriodo,isPagado,marcarPagado,pagoDe,pagosDe,montoEsperado,montoDelPeriodo,parteDelPeriodo} from '../logica/plan.js';
import {cotizacion,aPesos} from '../logica/monedas.js';
import {YO,TIPOS,grupoDe,repartoDe,partesDe,miParte,quienPaga,nombreDe,proporciones,calcular,repartoBase} from '../logica/reparto.js';
import {PLANTILLAS,nuevoGrupo,balance,saldarCon,deshacerSaldo,resumenCasa,textoResumen,porcentajes} from '../logica/compartidos.js';
import {ctx,$,planNow,liqNow,exAnalisis,money,usd,esc,fCorta,fLarga,titulo,tile,armar,toast,toastAccion,today} from './comun.js';
import {fijosPagadosParte} from '../logica/saldo.js';
import {renderIngresos,initIngresos} from './ingresos.js';

export var FCATS=[['Vivienda','var(--sky)'],['Servicios','var(--sun)'],['Celular e internet','var(--grape)'],['Suscripciones','var(--pink)'],['Salud','var(--mint)'],['Transporte','var(--teal)'],['Deudas y cuotas','var(--coral)'],['Educación','var(--slate)'],['Otros','var(--muted)']];
var FSUG=[['Alquiler','Vivienda'],['UTE','Servicios'],['OSE','Servicios'],['Internet','Celular e internet'],['Celular','Celular e internet'],['Netflix','Suscripciones']];
var fEdit=null,pagando=null,tarTocada=false;
var form={paga:'yo',pagador:null,rep:null};           /* lo compartido del formulario */
var gEdit=null,gVolverAlForm=false;                    /* el grupo que se está armando o cambiando */
var calc={n:2,modo:'iguales',personas:[{nombre:'Vos',ingreso:''},{nombre:'',ingreso:''}]};
var ES_TARJETA=/TARJETA|\bVISA\b|MASTER|\bOCA\b|CREDITO|CRÉDITO|AMEX|CREDITEL|ANDA/;
function fcatCol(c){for(var i=0;i<FCATS.length;i++)if(FCATS[i][0]===c)return FCATS[i][1];return 'var(--muted)'}
function tipoTxt(t){for(var i=0;i<TIPOS.length;i++)if(TIPOS[i][0]===t)return TIPOS[i][1].toLowerCase();return 'partes iguales'}
function quienes(g){var n=g.personas.slice(1).map(function(p){return p.nombre});return 'vos y '+(n.length>1?n.slice(0,-1).join(', ')+' y '+n[n.length-1]:n[0])}
function pesos(n){return '$ '+Math.round(num(n)).toLocaleString('es-UY')} /* para el texto que se comparte (sin el modo discreto) */

/* ---------- La página ---------- */
export function renderFijos(pc){
  renderIngresos();
  var state=ctx.state;
  pc=pc||planNow();
  var p=state.plan,fp=fijosPeriodo(state.fijos,p.inicio,p.cobro),R=resumenCasa(state),L=liqNow(true);
  var pag=fp.filter(function(o){return isPagado(state,o.f.id)}).length;
  /* Te toca */
  $('#fijos-sum').innerHTML='<div class="card stack toca"><span class="cd-l">Te toca este mes</span><b class="toca-n">'+money(R.teToca)+'</b>'
    +(R.hayCompartidos?'<p class="toca-d"><span>solo tuyos <b>'+money(R.soloMios)+'</b></span><span>tu parte compartida <b>'+money(R.parteCompartida)+'</b></span></p><p class="note">Total de la casa: <b>'+money(R.totalCasa)+'</b></p>':'<p class="note">'+state.fijos.length+' '+(state.fijos.length===1?'gasto fijo':'gastos fijos')+(state.fijos.length?', todos solo tuyos':'')+'.</p>')
    +'</div><div class="tiles">'
    /* (2.15) lo que falta pagar antes de cobrar, en lugar de repetir el total */
    +tile('tone-sky','Falta pagar',money(Math.max(0,pc.fijos-Math.min(pc.fijos,fijosPagadosParte(state)))),fp.length?(fp.length===state.fijos.length?'todos vencen':fp.length+' vencen')+' antes del '+esc(fCorta(p.cobro)):'ninguno vence antes del '+esc(fCorta(p.cobro)))
    +tile('tone-mint','Pagados',pag+' de '+fp.length,'en este período')
    +(L.liquido>0?tile('tone-grape','Parte de tu cobro',Math.round(R.teToca/L.liquido*100)+'%','de lo que cobrás en mano'):'')
    +'</div>';
  /* (2.30) sin ningún fijo, nada de ceros: solo el formulario */
  if(!state.fijos.length)$('#fijos-sum').innerHTML='';
  renderBalance();
  /* las secciones: una por grupo y «Solo míos» */
  var o='';
  if(!state.fijos.length){
    o='<div class="empty">Todavía no cargaste gastos fijos.</div>';
    /* (2.30) el formulario va plegado; la primera vez, sin ningún fijo, se abre solo */
    var fc=$('#fijo-form-card');if(fc&&!fc.getAttribute('data-auto')){fc.setAttribute('data-auto','1');fc.open=true}
  }
  else{
    var orden=function(a,b){return num(a.dia)-num(b.dia)};
    R.grupos.forEach(function(x){
      if(!x.fijos.length)return;
      var g=x.grupo;
      o+='<div class="card stack fgrupo"><div class="sec"><h2>'+esc(g.nombre)+'</h2><p class="note">Con '+esc(quienes(g).replace(/^vos y /,''))+' · '+esc(tipoTxt((g.reparto||{}).tipo))+'</p></div>'
        +'<p class="pone">Cada mes pone: '+g.personas.map(function(pe){return '<span>'+esc(nombreDe(g,pe.id))+' <b>'+money(x.porPersona[pe.id]||0)+'</b></span>'}).join('')+'</p>'
        +'<ul class="list flist">'+x.fijos.slice().sort(orden).map(function(f){return itemFijo(f,fp)}).join('')+'</ul>'
        +'<div class="row-btns"><button class="btn quiet" type="button" data-compartir="'+esc(g.id)+'">Compartir el resumen</button></div></div>';
    });
    var solos=state.fijos.filter(function(f){return !grupoDe(state,f)});
    if(solos.length)o+='<div class="card stack"><div class="sec"><h2>'+(R.hayCompartidos?'Solo míos':'Tus gastos fijos')+'</h2><p class="note">Cuando pagues uno, tocá <b>Pagar</b>.</p></div><ul class="list flist">'
      +solos.slice().sort(orden).map(function(f){return itemFijo(f,fp)}).join('')+'</ul></div>';
  }
  var A=exAnalisis();
  if(A){
    var names=state.fijos.map(function(f){return f.nombre.toLowerCase()});
    /* los retiros, las transferencias y las cuotas se repiten, pero no son gastos fijos */
    var noFijo={};(A.gas||[]).forEach(function(m){if(m.tipo==='retiro'||m.tipo==='transferencia'||m.cuota)noFijo[m.k]=1});
    var sug=A.com.filter(function(c){var k=c.k.toLowerCase();return c.fijo&&!noFijo[c.k]&&!names.some(function(n){return n.indexOf(k)>=0||k.indexOf(n)>=0})});
    if(sug.length)o+='<div class="callout tone-coral"><h2>En tu extracto parecen fijos</h2><p class="note">Agregalos con un toque.</p><div class="sugs">'
      +sug.slice(0,6).map(function(c){var f=c.f.slice().sort(),dia=Number(f[f.length-1].slice(8,10)),nom=A.nombres&&A.nombres[c.k]||titulo(c.k);var cat=c.c==='Suscripciones'?'Suscripciones':c.c==='Servicios y cuentas'?'Servicios':'Otros';return '<button class="btn" type="button" data-sugf="'+esc(nom)+'" data-sugm="'+Math.round(c.prom)+'" data-sugd="'+dia+'" data-sugc="'+esc(cat)+'">+ '+esc(nom)+' · '+money(c.prom)+'</button>'}).join('')
      +'</div></div>';
  }
  $('#fijos-out').innerHTML=o;
  renderGrupos();
  opcionesGrupo();
  if(!$('#calc-in').innerHTML)renderCalc();
}

/* Un fijo en la lista: qué es, cuándo vence, tu parte (y el total) y los botones */
function itemFijo(f,fp){
  var state=ctx.state,g=grupoDe(state,f),quien=quienPaga(state,f);
  var oc=fp.filter(function(x){return x.f.id===f.id})[0];
  var when=oc?'vence el '+fLarga(oc.fecha):'día '+f.dia+', fuera de este período';
  var pago=oc?pagoDe(state,f.id):null,pagado=!!pago,esp=montoEsperado(state,f),ps=pagosDe(state,f.id);
  var total=oc?montoDelPeriodo(state,f):esp,parte=g?(oc?parteDelPeriodo(state,f):miParte(state,f,esp)):total;
  var sub=[esc(f.cat),esc(when)];
  if(f.variable)sub.push(ps.length?'promedio de '+Math.min(3,ps.length)+(Math.min(3,ps.length)===1?' pago':' pagos'):'cambia cada mes');
  if(f.tarjeta)sub.push('no se resta del presupuesto');
  if(g)sub.push(quien==='yo'?'pagás vos y te devuelven':quien==='cada'?'cada uno paga su parte':'lo paga '+esc(nombreDe(g,f.pagador||g.personas[1].id)));
  var aprox=f.variable&&!(pago&&num(pago.monto)>0)?'≈ ':'';
  var h='<li class="'+(pagado?'paid':'')+'"><i class="dot" style="background:'+fcatCol(f.cat)+'"></i><span class="what"><b>'+esc(f.nombre)+'</b><span class="src">'+sub.join(' · ')+'</span></span>'
    +'<span class="amt">'+(g?'<small class="amt-l">te toca</small>':'')+aprox+money(parte)+(g?'<small class="amt-de">de '+aprox+money(total)+'</small>':'')+(f.usd?'<small class="amt-usd">'+usd(f.usd)+'</small>':'')+'</span>'
    +'<span class="ctrl">';
  if(!oc)h+='<span class="note">No vence en este período</span>';
  else if(pagado){
    var txt=!g?'Pagado'+(num(pago.monto)>0?' '+money(num(pago.monto)):''):quien==='yo'?'Pagaste '+money(num(pago.monto)):quien==='cada'?'Pagaste tu parte, '+money(parte):'Le diste '+money(parte)+' a '+esc(nombreDe(g,f.pagador||g.personas[1].id));
    h+='<span class="pagado-txt">'+txt+(pago.fecha?' el '+esc(fCorta(pago.fecha)):'')+' <button class="linklike" type="button" data-despagar="'+esc(f.id)+'">deshacer</button></span>';
  }else if(pagando===f.id){
    var pide=!g||quien==='yo'?{l:'Cuánto pagaste (el total)',v:esp}:quien==='cada'?{l:'Cuánto pagaste de tu parte',v:miParte(state,f,esp)}:{l:'Cuánto le diste a '+nombreDe(g,f.pagador||g.personas[1].id),v:miParte(state,f,esp)};
    h+='<form class="pagar-form" data-pagarf="'+esc(f.id)+'" autocomplete="off"><div class="money"><span>$</span><input type="number" inputmode="decimal" min="0" step="any" value="'+Math.round(pide.v)+'" aria-label="'+esc(pide.l)+'"></div><input type="date" value="'+today()+'" max="'+today()+'" aria-label="Cuándo"><button class="btn primary" type="submit">Guardar</button><button class="btn quiet" type="button" data-pagarno>Cancelar</button></form>';
  }else h+='<button class="btn" type="button" data-pagar="'+esc(f.id)+'">'+(!g||quien==='yo'?'Pagar':quien==='cada'?'Pagué mi parte':'Le di mi parte')+'</button>';
  h+='<span><button class="btn quiet" type="button" data-editf="'+esc(f.id)+'">Editar</button><button class="btn quiet" type="button" data-delf="'+esc(f.id)+'">Borrar</button></span></span></li>';
  return h;
}

/* Quién debe a quién (también lo usa Hoy, como nota al margen) */
export function balanceHTML(soloQueTeDeben){
  var b=balance(ctx.state,today()).filter(function(x){return !soloQueTeDeben||x.monto>0});
  if(!b.length)return '';
  return b.map(function(x){
    var k=esc(x.grupo.id+'|'+x.persona.id),qué=x.fijos.map(function(o){return o.fijo.nombre}).join(', ');
    return x.monto>0
      ?'<div class="deuda te-debe"><p><b>'+esc(x.persona.nombre)+'</b> te debe <b class="plata">'+money(x.monto)+'</b><small>'+esc(qué)+' · '+esc(x.grupo.nombre)+'</small></p><button class="btn" type="button" data-mepagaron="'+k+'">Me pagaron</button></div>'
      :'<div class="deuda le-debes"><p>Le debés <b>'+money(-x.monto)+'</b> a <b>'+esc(x.persona.nombre)+'</b><small>'+esc(qué)+' · '+esc(x.grupo.nombre)+'</small></p><button class="btn" type="button" data-saldar="'+k+'">Saldar</button></div>';
  }).join('');
}
function renderBalance(){
  var h=balanceHTML(false);
  $('#fijos-balance').innerHTML=h?'<div class="card stack balance"><div class="sec"><h2>Este período</h2><p class="note">Lo que pagaron unos por otros, hasta el '+esc(fCorta(ctx.state.plan.cobro))+'.</p></div>'+h+'</div>':'';
}

/* ---------- Con quién compartís ---------- */
function renderGrupos(){
  var state=ctx.state,gs=state.grupos||[],h='<p class="note">Armá un grupo con quienes compartís gastos. Los nombres quedan solo en este teléfono.</p>';
  var ds=$('#dividir-s');if(ds)ds.textContent=gs.length?gs.map(function(g){return g.nombre}).join(', '):'en pareja, con amigos o en la casa';
  if(gEdit){$('#grupos-card').innerHTML=h+editorGrupo();pintarPorcentajes();return}
  if(gs.length)h+='<ul class="list glist-g">'+gs.map(function(g){
    var n=state.fijos.filter(function(f){return f.grupo===g.id}).length;
    return '<li><span class="what"><b>'+esc(g.nombre)+'</b><span class="src">'+esc(quienes(g))+' · '+esc(tipoTxt((g.reparto||{}).tipo))+' · '+n+(n===1?' fijo':' fijos')+'</span></span>'
      +'<span><button class="btn quiet" type="button" data-gedit="'+esc(g.id)+'">Editar</button><button class="btn quiet" type="button" data-gdel="'+esc(g.id)+'">Borrar</button></span></li>';
  }).join('')+'</ul>';
  h+='<div class="field"><span class="lab">Grupo nuevo</span><div class="sugs">'+PLANTILLAS.map(function(t){return '<button class="btn" type="button" data-plantilla="'+t.id+'">'+esc(t.t)+'</button>'}).join('')+'</div></div>';
  $('#grupos-card').innerHTML=h;
}
function editorGrupo(){
  var g=gEdit,t=(g.reparto||{}).tipo||'iguales';
  var campo=t==='ingresos'?'Gana por mes':t==='pct'?'Porcentaje':t==='montos'?'Pone por mes':'';
  var h='<form class="gedit stack" data-geform autocomplete="off"><div class="field"><label for="ge-nombre" class="sub-l">Nombre del grupo</label><input id="ge-nombre" type="text" maxlength="30" value="'+esc(g.nombre)+'" placeholder="Casa, depto, plataformas"></div>'
    +'<div class="field"><span class="sub-l">¿Cómo se reparte?</span><div class="opciones" role="radiogroup" aria-label="Cómo se reparte">'+TIPOS.map(function(x){return '<button type="button" role="radio" data-getipo="'+x[0]+'" aria-checked="'+(x[0]===t)+'">'+esc(x[1])+'</button>'}).join('')+'</div></div>'
    +'<div class="field"><span class="sub-l">Personas'+(campo?' · '+campo:'')+'</span><div class="ge-pers">';
  g.personas.forEach(function(p,i){
    var val=t==='ingresos'?p.ingreso:t==='pct'?(g.reparto.pct||{})[p.id]:t==='montos'?(g.reparto.montos||{})[p.id]:null;
    h+='<div class="ge-p">'+(p.id===YO?'<span class="ge-yo">Vos</span>':'<input type="text" maxlength="24" data-gep-nombre="'+i+'" value="'+esc(p.nombre)+'" aria-label="Nombre de la persona '+(i+1)+'">')
      +(campo?'<div class="money"><span>'+(t==='pct'?'%':'$')+'</span><input type="number" inputmode="decimal" min="0" step="any" data-gep-val="'+i+'" value="'+(val!=null&&val!==''?esc(val):'')+'" aria-label="'+esc(campo)+' de '+esc(p.id===YO?'vos':p.nombre)+'"></div>':'')
      +(p.id!==YO&&g.personas.length>2?'<button class="btn quiet" type="button" data-gep-quitar="'+i+'" aria-label="Quitar a '+esc(p.nombre)+'">Quitar</button>':'')+'</div>';
  });
  h+='</div><button class="btn quiet" type="button" data-gep-mas>+ Sumar una persona</button></div>'
    +'<p class="note ge-prev" id="ge-prev" aria-live="polite"></p>'
    +'<div class="row-btns"><button class="btn primary" type="submit">Guardar el grupo</button><button class="btn quiet" type="button" data-gecancel>Cancelar</button></div></form>';
  return h;
}
function pintarPorcentajes(){
  var el=$('#ge-prev');if(!el||!gEdit)return;
  var pc=porcentajes(gEdit);
  el.innerHTML='Cada uno pone: '+gEdit.personas.map(function(p){return '<b>'+esc(p.id===YO?'vos':p.nombre||'?')+'</b> '+String(pc[p.id]).replace('.',',')+' %'}).join(' · ');
}
function guardarGrupo(){
  var state=ctx.state,g=gEdit;
  g.nombre=(g.nombre||'').trim().slice(0,30)||'Casa';
  g.personas.forEach(function(p,i){if(p.id!==YO)p.nombre=(p.nombre||'').trim().slice(0,24)||'Persona '+(i+1)});
  var i=-1;(state.grupos||[]).forEach(function(x,k){if(x.id===g.id)i=k});
  if(!state.grupos)state.grupos=[];
  if(i>=0)state.grupos[i]=g;else state.grupos.push(g);
  /* si se quitó a alguien que pagaba un fijo, lo paga el primero que queda */
  state.fijos.forEach(function(f){if(f.grupo===g.id&&f.paga==='otro'&&!g.personas.some(function(p){return p.id===f.pagador}))f.pagador=g.personas[1].id});
  var volver=gVolverAlForm;gEdit=null;gVolverAlForm=false;
  ctx.persist();ctx.renderAll();toast('Grupo «'+g.nombre+'» guardado');
  if(volver){$('#f-grupo').value=g.id;cambioGrupo();$('#fijo-form-card').open=true;try{$('#fijo-form-card').scrollIntoView({block:'start'})}catch(e){}}
}

/* ---------- El formulario: ¿de quién es? y ¿quién lo paga? ---------- */
function opcionesGrupo(){
  var sel=$('#f-grupo'),v=sel.value,gs=ctx.state.grupos||[];
  sel.innerHTML='<option value="">Solo mío</option>'+gs.map(function(g){return '<option value="'+esc(g.id)+'">'+esc(g.nombre)+' ('+esc(quienes(g))+')</option>'}).join('')+'<option value="+">+ Compartirlo con alguien nuevo</option>';
  sel.value=gs.some(function(g){return g.id===v})?v:'';
  pintarCompartido();
}
function grupoForm(){var id=$('#f-grupo').value;return (ctx.state.grupos||[]).filter(function(g){return g.id===id})[0]||null}
function cambioGrupo(){
  var g=grupoForm();
  if($('#f-grupo').value==='+'){$('#f-grupo').value='';gEdit=nuevoGrupo('Casa',2);gVolverAlForm=true;renderGrupos();$('#dividir-d').open=true;try{$('#grupos-card').scrollIntoView({block:'start'})}catch(e){}var n=$('[data-gep-nombre="1"]');if(n){n.select();n.focus()}return}
  if(g&&(!form.pagador||!g.personas.some(function(p){return p.id===form.pagador})))form.pagador=g.personas[1].id;
  pintarCompartido();
}
function pintarCompartido(){
  var g=grupoForm(),box=$('#f-comp');box.hidden=!g;if(!g)return;
  document.querySelectorAll('[data-fpaga]').forEach(function(b){b.setAttribute('aria-checked',String(b.getAttribute('data-fpaga')===form.paga))});
  var ps=$('#f-pagador');ps.innerHTML=g.personas.slice(1).map(function(p){return '<option value="'+esc(p.id)+'">'+esc(p.nombre)+'</option>'}).join('');
  if(form.pagador)ps.value=form.pagador;$('#f-pagador-box').hidden=form.paga!=='otro';
  /* reparto distinto para este fijo */
  var r=form.rep,t=r?r.tipo:null,h='<div class="opciones" role="radiogroup" aria-label="Reparto de este fijo"><button type="button" role="radio" data-frep="" aria-checked="'+(!r)+'">Como el grupo ('+esc(tipoTxt((g.reparto||{}).tipo))+')</button>'
    +TIPOS.map(function(x){return '<button type="button" role="radio" data-frep="'+x[0]+'" aria-checked="'+(t===x[0])+'">'+esc(x[1])+'</button>'}).join('')+'</div>';
  if(r&&(t==='pct'||t==='montos'))h+=g.personas.map(function(p){var v=(r[t]||{})[p.id];return '<label class="ge-p"><span>'+esc(p.id===YO?'Vos':p.nombre)+'</span><div class="money"><span>'+(t==='pct'?'%':'$')+'</span><input type="number" inputmode="decimal" min="0" step="any" data-frepv="'+esc(p.id)+'" value="'+(v!=null?esc(v):'')+'"></div></label>'}).join('');
  if(r&&t==='ingresos')h+='<p class="note">Usa lo que gana cada uno según el grupo («Editar» en Dividir con otros).</p>';
  $('#f-rep-in').innerHTML=h;$('#f-rep').open=!!r;
  pintarParte();
}
function pintarParte(){
  var g=grupoForm(),el=$('#f-parte');if(!g||!el)return;
  var m=num($('#f-monto').value);if($('#f-mon').getAttribute('data-moneda')==='USD')m=aPesos(m,cotizacion(ctx.state));
  if(!(m>0)){el.textContent='';return}
  var ps=partesDe(ctx.state,{grupo:g.id,reparto:form.rep},m);
  el.innerHTML='Te toca <b>'+money(ps[YO])+'</b> de '+money(m)+' · '+g.personas.slice(1).map(function(p){return esc(p.nombre)+' '+money(ps[p.id])}).join(' · ');
}
function monedaFijo(u){
  var b=$('#f-mon');b.setAttribute('data-moneda',u?'USD':'UYU');b.textContent=u?'US$':'$';b.setAttribute('aria-label','Cambiar moneda: ahora en '+(u?'dólares':'pesos'));
  var c=cotizacion(ctx.state),n=$('#f-usd-nota');
  n.innerHTML=!u?'':(c?'Se paga en dólares: cada mes se pasa a pesos con el dólar de Ajustes ($ '+String(c).replace('.',',')+').':'Cargá la cotización del dólar en <button class="linklike" type="button" data-goto="ajustes">Ajustes</button>.');
}
function resetFijoForm(){
  monedaFijo(false);
  tarTocada=false;$('#f-var').checked=false;$('#f-tar').checked=false;
  fEdit=null;$('#f-nombre').value='';$('#f-monto').value='';$('#f-dia').value='';$('#f-cat').value='Otros';$('#f-grupo').value='';
  form={paga:'yo',pagador:null,rep:null};pintarCompartido();
  $('#fijo-form-t').textContent='+ Agregar un gasto fijo';$('#fijo-sug-box').hidden=false;$('#f-save').textContent='Agregar';$('#f-cancel').hidden=true;
}

/* ---------- Calculadora de la casa (no guarda nada) ---------- */
function renderCalc(){
  var h='<div class="field"><label for="cc-monto" class="sub-l">¿Cuánto hay que dividir?</label><div class="money"><span>$</span><input id="cc-monto" type="number" inputmode="decimal" min="0" step="any" placeholder="0"></div></div>'
    +'<div class="field"><span class="sub-l">¿Entre cuántos?</span><div class="cc-n"><button class="btn" type="button" data-ccn="-1" aria-label="Uno menos">−</button><b id="cc-n">'+calc.n+'</b><button class="btn" type="button" data-ccn="1" aria-label="Uno más">+</button></div></div>'
    +'<div class="seg" role="group" aria-label="Cómo dividir"><button type="button" data-ccmodo="iguales" aria-pressed="'+(calc.modo==='iguales')+'">Partes iguales</button><button type="button" data-ccmodo="ingresos" aria-pressed="'+(calc.modo==='ingresos')+'">Según lo que gana cada uno</button></div>'
    +'<div id="cc-pers" class="stack"></div><div id="cc-res" class="cc-res" aria-live="polite"></div>'
    +'<div class="row-btns"><button class="btn primary" type="button" data-ccguardar>Guardarlo como fijo compartido</button></div>';
  $('#calc-in').innerHTML=h;pintarCalcPersonas();pintarCalc();
}
function pintarCalcPersonas(){
  while(calc.personas.length<calc.n)calc.personas.push({nombre:'',ingreso:''});
  calc.personas.length=calc.n;
  $('#cc-pers').innerHTML=calc.modo!=='ingresos'?'':calc.personas.map(function(p,i){return '<div class="ge-p">'+(i===0?'<span class="ge-yo">Vos</span>':'<input type="text" maxlength="24" data-ccnom="'+i+'" value="'+esc(p.nombre)+'" placeholder="Persona '+(i+1)+'" aria-label="Nombre de la persona '+(i+1)+'">')+'<div class="money"><span>$</span><input type="number" inputmode="decimal" min="0" step="any" data-ccing="'+i+'" value="'+esc(p.ingreso)+'" placeholder="gana por mes" aria-label="Lo que gana '+(i===0?'vos':'la persona '+(i+1))+'"></div></div>'}).join('');
  $('#cc-n').textContent=calc.n;
}
function pintarCalc(){
  var m=num(($('#cc-monto')||{}).value),el=$('#cc-res');if(!el)return;
  if(!(m>0)){el.innerHTML='<p class="note">Poné un monto y te digo cuánto pone cada uno.</p>';return}
  var r=calcular(m,calc.personas.map(function(p,i){return {nombre:i===0?'Vos':p.nombre||'Persona '+(i+1),ingreso:p.ingreso}}),calc.modo);
  el.innerHTML='<ul class="list">'+r.map(function(x){return '<li><span class="what"><b>'+esc(x.nombre)+'</b><span class="src">'+String(Math.round(x.pct*1000)/10).replace('.',',')+' %</span></span><span class="amt">'+money(x.monto)+'</span></li>'}).join('')+'</ul>';
}
function guardarCalc(){
  var state=ctx.state,m=num($('#cc-monto').value);if(!(m>0)){$('#cc-monto').focus();return}
  /* un grupo con esa cantidad de personas, o uno nuevo con estos nombres */
  var g=(state.grupos||[]).filter(function(x){return x.personas.length===calc.n})[0];
  if(!g){g=nuevoGrupo('Casa',calc.n,calc.personas.slice(1).map(function(p){return p.nombre}));if(calc.modo==='ingresos'){g.reparto.tipo='ingresos';g.personas.forEach(function(p,i){p.ingreso=num(calc.personas[i].ingreso)})}if(!state.grupos)state.grupos=[];state.grupos.push(g);ctx.persist();ctx.renderAll()}
  resetFijoForm();$('#f-monto').value=Math.round(m*100)/100;$('#f-grupo').value=g.id;form.pagador=g.personas[1].id;
  if(calc.modo==='ingresos'&&(g.reparto||{}).tipo!=='ingresos')form.rep={tipo:'ingresos',pct:{},montos:{}};
  pintarCompartido();$('#fijo-form-card').open=true;try{$('#fijo-form-card').scrollIntoView({block:'start'})}catch(e){}$('#f-nombre').focus();
  toast('Ponele un nombre y el día, y guardalo');
}

/* ---------- Compartir el resumen (hoja de compartir del iPhone, o se copia) ---------- */
function compartir(gid){
  var g=(ctx.state.grupos||[]).filter(function(x){return x.id===gid})[0];if(!g)return;
  var tx=textoResumen(ctx.state,gid,pesos);if(!tx)return;
  if(navigator.share){navigator.share({title:'Gastos de '+g.nombre,text:tx}).catch(function(){});return}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(tx).then(function(){toast('Copié el resumen: pegalo en WhatsApp')},function(){toast('No pude copiarlo')});return}
  toast('Este navegador no puede compartir');
}

/* «Me pagaron» y «Saldar» (desde Fijos y desde Hoy), siempre con Deshacer */
function saldo(k){
  var pr=k.split('|'),st=ctx.state,r=saldarCon(st,pr[0],pr[1],today());
  if(!r.hechos.length)return;
  ctx.persist();ctx.renderAll();
  toastAccion(r.neto>=0?'Listo: '+money(r.neto)+' volvieron a «Tenés»':'Listo: le diste '+money(-r.neto),'Deshacer',function(){deshacerSaldo(ctx.state,r);ctx.persist();ctx.renderAll()});
}

export function initFijos(){
  initIngresos();
  $('#f-cat').innerHTML=FCATS.map(function(c){return '<option>'+esc(c[0])+'</option>'}).join('');$('#f-cat').value='Otros';
  $('#fijo-sug').innerHTML=FSUG.map(function(s){return '<button class="btn" type="button" data-fsug="'+esc(s[0])+'" data-fcat="'+esc(s[1])+'">'+esc(s[0])+'</button>'}).join('');
  $('#fijo-form').addEventListener('submit',function(e){
    e.preventDefault();
    var state=ctx.state,n=$('#f-nombre').value.trim(),m=num($('#f-monto').value),d=Math.round(num($('#f-dia').value))||1,c=$('#f-cat').value;
    var enUSD=$('#f-mon').getAttribute('data-moneda')==='USD',cot=cotizacion(state),g=grupoForm();
    if(!n){$('#f-nombre').focus();return}
    if(!(m>0)){$('#f-monto').focus();return}
    if(enUSD&&!cot){toast('Primero cargá la cotización del dólar en Ajustes');return}
    d=Math.min(31,Math.max(1,d));
    /* En dólares: se guarda el monto en dólares y su equivalente en pesos con la cotización actual */
    var monto=enUSD?aPesos(m,cot):m;
    var esVar=$('#f-var').checked,esTar=$('#f-tar').checked;
    function datos(f){
      if(esVar)f.variable=true;else delete f.variable;if(esTar)f.tarjeta=true;else delete f.tarjeta;
      if(enUSD){f.usd=Math.round(m*100)/100;f.cotiz=cot}else{delete f.usd;delete f.cotiz}
      /* compartido: con quién, quién paga y (si hace falta) un reparto propio */
      if(g){f.grupo=g.id;f.paga=form.paga;if(form.paga==='otro')f.pagador=form.pagador||g.personas[1].id;else delete f.pagador;if(form.rep)f.reparto=JSON.parse(JSON.stringify(form.rep));else delete f.reparto}
      else{delete f.grupo;delete f.paga;delete f.pagador;delete f.reparto}
    }
    if(fEdit){state.fijos.forEach(function(f){if(f.id===fEdit){f.nombre=n.slice(0,40);f.monto=monto;f.dia=d;f.cat=c;datos(f)}})}
    else{var nf={id:uid(),nombre:n.slice(0,40),monto:monto,dia:d,cat:c};datos(nf);state.fijos.push(nf)}
    var was=!!fEdit;resetFijoForm();ctx.persist();ctx.renderAll();toast(was?'Cambios guardados':'Gasto fijo agregado');
  });
  $('#f-cancel').addEventListener('click',resetFijoForm);
  /* Si el nombre parece una tarjeta, se marca solo como "pago de tarjeta" */
  $('#f-nombre').addEventListener('input',function(){if(tarTocada)return;$('#f-tar').checked=ES_TARJETA.test(this.value.toUpperCase())});
  $('#f-tar').addEventListener('change',function(){tarTocada=true});
  $('#f-mon').addEventListener('click',function(){monedaFijo(this.getAttribute('data-moneda')!=='USD');pintarParte();$('#f-monto').focus()});
  $('#f-monto').addEventListener('input',pintarParte);
  $('#f-grupo').addEventListener('change',cambioGrupo);
  $('#f-pagador').addEventListener('change',function(){form.pagador=this.value});
  var P=$('#p-fijos');
  P.addEventListener('click',function(e){
    var state=ctx.state;
    var fp=e.target.closest('[data-fpaga]');if(fp){form.paga=fp.getAttribute('data-fpaga');pintarCompartido();return}
    var fr=e.target.closest('[data-frep]');if(fr){var t=fr.getAttribute('data-frep');form.rep=t?{tipo:t,pct:{},montos:{}}:null;pintarCompartido();return}
    var s=e.target.closest('[data-fsug]');
    if(s){$('#f-nombre').value=s.getAttribute('data-fsug');$('#f-cat').value=s.getAttribute('data-fcat');$('#f-monto').focus();return}
    var ed=e.target.closest('[data-editf]');
    if(ed){var id=ed.getAttribute('data-editf'),f=state.fijos.filter(function(x){return x.id===id})[0];if(!f)return;
      fEdit=id;$('#f-nombre').value=f.nombre;$('#f-monto').value=f.usd||f.monto;monedaFijo(!!f.usd);$('#f-var').checked=!!f.variable;$('#f-tar').checked=!!f.tarjeta;tarTocada=true;$('#f-dia').value=f.dia;$('#f-cat').value=f.cat;
      var g=grupoDe(state,f);$('#f-grupo').value=g?g.id:'';form={paga:g?quienPaga(state,f):'yo',pagador:f.pagador||(g?g.personas[1].id:null),rep:f.reparto?JSON.parse(JSON.stringify(f.reparto)):null};pintarCompartido();
      $('#fijo-form-t').textContent='Cambiar «'+f.nombre+'»';$('#fijo-sug-box').hidden=true;$('#f-save').textContent='Guardar cambios';$('#f-cancel').hidden=false;$('#fijo-form-card').open=true;
      try{$('#fijo-form-card').scrollIntoView({block:'start'})}catch(er){}$('#f-monto').focus();return}
    var dl=e.target.closest('[data-delf]');
    if(dl){
      if(!armar(dl))return;
      var did=dl.getAttribute('data-delf'),borrado=state.fijos.filter(function(x){return x.id===did})[0],pos=state.fijos.indexOf(borrado);
      state.fijos=state.fijos.filter(function(x){return x.id!==did});if(fEdit===did)resetFijoForm();ctx.persist();ctx.renderAll();
      if(borrado)toastAccion('Borraste '+borrado.nombre,'Deshacer',function(){ctx.state.fijos.splice(Math.min(pos,ctx.state.fijos.length),0,borrado);ctx.persist();ctx.renderAll()});
      return}
    var sg=e.target.closest('[data-sugf]');
    if(sg){state.fijos.push({id:uid(),nombre:sg.getAttribute('data-sugf').slice(0,40),monto:num(sg.getAttribute('data-sugm')),dia:Math.min(31,Math.max(1,Number(sg.getAttribute('data-sugd'))||1)),cat:sg.getAttribute('data-sugc')||'Otros'});ctx.persist();ctx.renderAll();toast('Gasto fijo agregado');return}
    var cp=e.target.closest('[data-compartir]');if(cp){compartir(cp.getAttribute('data-compartir'));return}
    /* grupos */
    var pl=e.target.closest('[data-plantilla]');
    if(pl){var t2=PLANTILLAS.filter(function(x){return x.id===pl.getAttribute('data-plantilla')})[0];gEdit=nuevoGrupo(t2.id==='pareja'?'Casa':t2.id==='medida'?'':'Depto',t2.n);if(t2.id==='medida')gEdit.nombre='';renderGrupos();var nn=$(t2.id==='medida'?'#ge-nombre':'[data-gep-nombre="1"]');if(nn){nn.focus();if(nn.select)nn.select()}return}
    var ge=e.target.closest('[data-gedit]');if(ge){var gg=(state.grupos||[]).filter(function(x){return x.id===ge.getAttribute('data-gedit')})[0];if(gg){gEdit=JSON.parse(JSON.stringify(gg));if(!gEdit.reparto)gEdit.reparto=repartoBase();renderGrupos()}return}
    var gd=e.target.closest('[data-gdel]');
    if(gd){if(!armar(gd))return;
      var gid=gd.getAttribute('data-gdel'),antes=JSON.parse(JSON.stringify({grupos:state.grupos,fijos:state.fijos}));
      state.grupos=state.grupos.filter(function(x){return x.id!==gid});
      state.fijos.forEach(function(f){if(f.grupo===gid){delete f.grupo;delete f.paga;delete f.pagador;delete f.reparto}});
      ctx.persist();ctx.renderAll();
      toastAccion('Borraste el grupo: sus fijos quedaron como solo tuyos','Deshacer',function(){ctx.state.grupos=antes.grupos;ctx.state.fijos=antes.fijos;ctx.persist();ctx.renderAll()});return}
    var gt=e.target.closest('[data-getipo]');if(gt&&gEdit){gEdit.reparto=Object.assign(repartoBase(),gEdit.reparto,{tipo:gt.getAttribute('data-getipo')});renderGrupos();return}
    if(e.target.closest('[data-gep-mas]')&&gEdit){gEdit.personas.push({id:uid(),nombre:'Persona '+(gEdit.personas.length+1),ingreso:0});renderGrupos();var u=$('[data-gep-nombre="'+(gEdit.personas.length-1)+'"]');if(u){u.focus();u.select()}return}
    var gq=e.target.closest('[data-gep-quitar]');if(gq&&gEdit){gEdit.personas.splice(Number(gq.getAttribute('data-gep-quitar')),1);renderGrupos();return}
    if(e.target.closest('[data-gecancel]')){gEdit=null;gVolverAlForm=false;renderGrupos();return}
    /* calculadora */
    var cn=e.target.closest('[data-ccn]');if(cn){calc.n=Math.max(2,Math.min(8,calc.n+Number(cn.getAttribute('data-ccn'))));pintarCalcPersonas();pintarCalc();return}
    var cm=e.target.closest('[data-ccmodo]');if(cm){calc.modo=cm.getAttribute('data-ccmodo');document.querySelectorAll('[data-ccmodo]').forEach(function(b){b.setAttribute('aria-pressed',String(b===cm))});pintarCalcPersonas();pintarCalc();return}
    if(e.target.closest('[data-ccguardar]')){guardarCalc();return}
  });
  P.addEventListener('input',function(e){
    var t=e.target;
    if(gEdit){
      if(t.id==='ge-nombre'){gEdit.nombre=t.value;return}
      if(t.hasAttribute('data-gep-nombre')){gEdit.personas[Number(t.getAttribute('data-gep-nombre'))].nombre=t.value;pintarPorcentajes();return}
      if(t.hasAttribute('data-gep-val')){var i=Number(t.getAttribute('data-gep-val')),p=gEdit.personas[i],tp=gEdit.reparto.tipo;
        if(tp==='ingresos')p.ingreso=num(t.value);else{gEdit.reparto[tp]=Object.assign({},gEdit.reparto[tp]);gEdit.reparto[tp][p.id]=num(t.value)}pintarPorcentajes();return}
    }
    if(t.hasAttribute('data-frepv')&&form.rep){form.rep[form.rep.tipo]=Object.assign({},form.rep[form.rep.tipo]);form.rep[form.rep.tipo][t.getAttribute('data-frepv')]=num(t.value);pintarParte();return}
    if(t.id==='cc-monto'){pintarCalc();return}
    if(t.hasAttribute('data-ccnom')){calc.personas[Number(t.getAttribute('data-ccnom'))].nombre=t.value;pintarCalc();return}
    if(t.hasAttribute('data-ccing')){calc.personas[Number(t.getAttribute('data-ccing'))].ingreso=t.value;pintarCalc();return}
  });
  P.addEventListener('submit',function(e){if(e.target.matches('[data-geform]')){e.preventDefault();guardarGrupo()}},true);
  /* Pagar: con el monto y la fecha reales (en un compartido, el total o tu parte según quién paga) */
  P.addEventListener('click',function(e){
    var b=e.target.closest('[data-pagar]');if(b){pagando=b.getAttribute('data-pagar');renderFijos();var i=$('[data-pagarf] input');if(i){i.focus();i.select()}return}
    if(e.target.closest('[data-pagarno]')){pagando=null;renderFijos();return}
    var d=e.target.closest('[data-despagar]');if(d){marcarPagado(ctx.state,d.getAttribute('data-despagar'),false);ctx.persist();ctx.renderAll();return}
  });
  P.addEventListener('submit',function(e){
    var f=e.target.closest('[data-pagarf]');if(!f)return;
    e.preventDefault();
    var state=ctx.state,id=f.getAttribute('data-pagarf'),m=num(f.querySelector('input[type=number]').value),fe=f.querySelector('input[type=date]').value||today();
    if(!(m>0)){f.querySelector('input[type=number]').focus();return}
    var fx=state.fijos.filter(function(x){return x.id===id})[0];if(!fx)return;
    var g=grupoDe(state,fx),quien=quienPaga(state,fx),datos;
    /* Cada pago guarda el nombre del fijo: si después lo renombrás o lo borrás, el historial no se pierde */
    if(!g)datos={monto:Math.round(m*100)/100,fecha:fe,nombre:fx.nombre};
    else if(quien==='yo')datos={monto:Math.round(m*100)/100,parte:miParte(state,fx,m),fecha:fe,nombre:fx.nombre,paga:'yo'};
    else{var fr=miParte(state,fx,100000)/100000;datos={monto:fr>0?Math.round(m/fr*100)/100:m,parte:Math.round(m*100)/100,fecha:fe,nombre:fx.nombre,paga:quien}}
    marcarPagado(state,id,true,datos);
    pagando=null;ctx.persist();ctx.renderAll();toast(fx.nombre+': '+(quien==='otro'&&g?'le diste '+money(m):'pagado '+money(m)));
  });
  /* Me pagaron / Saldar: también desde la nota al margen de Hoy */
  document.addEventListener('click',function(e){
    var mp=e.target.closest('[data-mepagaron]');if(mp){saldo(mp.getAttribute('data-mepagaron'));return}
    var sd=e.target.closest('[data-saldar]');if(sd){saldo(sd.getAttribute('data-saldar'))}
  });
}
