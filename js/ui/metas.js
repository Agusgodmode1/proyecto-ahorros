/* Logros → Tus metas: crear metas con nombre, sumarles plata y repartir el ahorro al cerrar el mes. */
import {num,uid} from '../logica/util.js';
import {progresoMeta,repartirAhorro} from '../logica/metas.js';
import {MESL} from '../logica/fechas.js';
import {ctx,$,today,money,esc,armar,toast} from './comun.js';
import {fondoEmergencia} from '../logica/inicio.js';

function mesTxt(k){return MESL[Number(k.slice(5,7))-1]+' de '+k.slice(0,4)}
function plural(n,a,b){return n+' '+(n===1?a:b)}

export function renderMetas(){
  var el=$('#metas-out');if(!el)return;
  var ms=ctx.state.metas||[],t=today();
  if(!ms.length){
    var fe=fondoEmergencia(ctx.state);
    el.innerHTML='<p class="note">Ponele nombre y te digo cuánto te falta.</p>'
      +'<div class="meta-fondo"><b>Primero, un fondo de emergencia</b><p class="note">De 3 a 6 meses de tus gastos, para imprevistos'+(fe?': unos <b>'+money(fe)+'</b>.':'.')+'</p><button class="btn primary" type="button" id="meta-fondo">Crear mi fondo de emergencia</button></div>';
    renderCierreMetas();return;
  }
  el.innerHTML='<ul class="metas">'+ms.map(function(m){
    var p=progresoMeta(m,t),sub;
    if(p.cumplida)sub='¡Llegaste! Juntaste '+money(p.aportado)+'.';
    else{
      sub='Te faltan <b>'+money(p.falta)+'</b>';
      if(p.porMes!==null)sub+=p.mesesHasta>0?'. Para llegar en '+mesTxt(m.para)+': '+money(p.porMes)+' por mes':'. La fecha ya pasó';
      if(p.llegasEn)sub+='. A tu ritmo llegás en '+plural(p.llegasEn,'mes','meses');
      sub+='.';
    }
    return '<li class="meta'+(p.cumplida?' ok':'')+'"><div class="meta-top"><b>'+esc(m.nombre)+'</b><span>'+money(p.aportado)+' de '+money(p.objetivo)+'</span></div>'
      +'<span class="bar"><i style="width:'+Math.round(p.pct*100)+'%"></i></span>'
      +'<p class="note">'+sub+'</p>'
      +'<form class="meta-sumar" data-metaf="'+esc(m.id)+'" autocomplete="off"><div class="money"><span>$</span><input type="number" inputmode="numeric" min="0" step="any" aria-label="Cuánto sumás a '+esc(m.nombre)+'" placeholder="Sumar"></div><button class="btn" type="submit">Sumar</button><button class="btn quiet sm" type="button" data-metadel="'+esc(m.id)+'">Borrar</button></form></li>';
  }).join('')+'</ul>';
  renderCierreMetas();
}
/* En "Cerrar el mes": cuánto de lo que guardaste va a cada meta */
function renderCierreMetas(){
  var el=$('#c-metas');if(!el)return;
  var ms=(ctx.state.metas||[]).filter(function(m){return !progresoMeta(m,today()).cumplida});
  if(!ms.length){el.innerHTML='';return}
  el.innerHTML='<div class="field"><span class="lab">¿Cuánto de lo que guardaste va a cada meta?</span><div class="grid2">'
    +ms.map(function(m){var v=el.querySelector('[data-cmeta="'+m.id+'"]');return '<div class="field"><label class="sub-l" for="cm-'+esc(m.id)+'">'+esc(m.nombre)+'</label><div class="money"><span>$</span><input id="cm-'+esc(m.id)+'" data-cmeta="'+esc(m.id)+'" type="number" inputmode="numeric" min="0" step="any" value="'+(v?esc(v.value):'')+'"></div></div>'}).join('')
    +'</div><small>Opcional. Se suma a cada meta cuando cerrás el mes.</small></div>';
}
/* Lo llama "Cerrar el mes" (antes de cerrar): suma los aportes que pusiste */
export function aportarAlCerrar(ahorrado){
  var montos={};
  document.querySelectorAll("[data-cmeta]").forEach(function(i){montos[i.getAttribute("data-cmeta")]=num(i.value);i.value=""});
  return repartirAhorro(ctx.state.metas,montos,ahorrado,today(),uid);
}

export function initMetas(){
  var card=$('#metas-card'),form=$('#meta-form');
  $('#meta-nueva').addEventListener('click',function(){form.hidden=false;$('#m-nombre').focus()});
  $('#meta-cancel').addEventListener('click',function(){form.hidden=true;form.reset()});
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var n=$('#m-nombre').value.trim(),o=num($('#m-obj').value),p=$('#m-para').value;
    if(!n){$('#m-nombre').focus();return}
    if(!(o>0)){$('#m-obj').focus();return}
    ctx.state.metas.push({id:uid(),nombre:n.slice(0,40),objetivo:Math.round(o),para:/^\d{4}-\d{2}$/.test(p)?p:null,aportes:[]});
    form.reset();form.hidden=true;ctx.persist();ctx.renderAll();toast('Meta creada: '+n);
  });
  card.addEventListener('submit',function(e){
    var f=e.target.closest('[data-metaf]');if(!f)return;
    e.preventDefault();
    var v=num(f.querySelector('input').value),id=f.getAttribute('data-metaf');
    if(!(v>0)){f.querySelector('input').focus();return}
    var m=ctx.state.metas.filter(function(x){return x.id===id})[0];if(!m)return;
    m.aportes.push({id:uid(),fecha:today(),monto:Math.round(v)});
    ctx.persist();ctx.renderAll();toast('Sumaste '+money(v)+' a '+m.nombre);
  });
  card.addEventListener('click',function(e){
    if(e.target.closest('#meta-fondo')){form.hidden=false;$('#m-nombre').value='Fondo de emergencia';var fv=fondoEmergencia(ctx.state);if(fv)$('#m-obj').value=fv;$('#m-obj').focus();return}
    var b=e.target.closest('[data-metadel]');if(!b)return;
    if(!armar(b))return;
    var id=b.getAttribute('data-metadel');
    ctx.state.metas=ctx.state.metas.filter(function(x){return x.id!==id});
    ctx.persist();ctx.renderAll();
  });
}
