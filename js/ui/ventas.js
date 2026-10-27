/* Cuando vendo en Hoy (2.21): la semana de quien vende por su cuenta.
   Lo vendido contra la parte de los fijos de la semana (con lo que faltó antes), si se cubrió,
   y la ganancia, con «Guardar» (la suma al ahorro, con Deshacer). Las cuentas: logica/ventas.js. */
import {num} from '../logica/util.js';
import {frecDe} from '../logica/frecuencia.js';
import {semanasVentas,guardarGanancia,deshacerGanancia} from '../logica/ventas.js';
import {ctx,$,today,money,esc,fCorta,toast,toastAccion,planNow} from './comun.js';

function rango(s){return fCorta(s.start)+(s.start===s.end?'':' – '+fCorta(s.end))}
export function renderVentas(pc){
  var el=$('#ventas');if(!el)return;
  var st=ctx.state,p=st.plan,t=today();
  if(frecDe(st.perfil&&st.perfil.cobro)!=='ventas'||!(num(p.monto)>0)||t>=p.cobro){el.innerHTML='';return}
  var r=semanasVentas(st,pc||planNow(),t),s=r.semanas[r.actual];
  if(!s){el.innerHTML='';return}
  var pct=s.meta>0?Math.min(100,Math.round(s.vendido/s.meta*100)):100;
  var h='<div class="card stack ventas"><p class="sv-kick">esta semana · '+esc(rango(s))+'</p>'
    +'<p class="vt-n"><span>Vendiste</span><b>'+money(s.vendido)+'</b></p>';
  if(s.meta>0){
    h+='<p class="note">Para los fijos de la semana: <b>'+money(s.meta)+'</b>'+(s.arrastre>0?' ('+money(s.parte)+' de esta semana + '+money(s.arrastre)+' que faltaron antes)':'')+'</p>'
      +'<span class="bar'+(s.cubierta?' ok':'')+'" role="img" aria-label="Cubriste el '+pct+' % de los fijos de la semana"><i style="width:'+pct+'%"></i></span>'
      +'<p class="vt-estado '+(s.cubierta?'bien':'falta')+'">'+(s.cubierta?'✓ Cubriste los fijos de la semana.':'Te faltan '+money(s.falta)+' para cubrirlos.')+'</p>';
  }else h+='<p class="note">No tenés fijos para esta parte del mes: todo lo que vendas es ganancia.</p>';
  if(s.ganancia>0)h+='<div class="vt-gan"><p><span>Ganancia</span><b>'+money(s.ganancia)+'</b>'+(s.guardada>0?'<small>guardaste '+money(s.guardada)+'</small>':'')+'</p>'
    +(s.porGuardar>0?'<button class="btn" type="button" data-vt="'+s.start+'">Guardar '+money(s.porGuardar)+'</button>':'')+'</div>';
  var pas=r.semanas.filter(function(x){return x.pasada});
  if(pas.length)h+='<details class="vt-pas"><summary>Semanas anteriores</summary><ul class="sv-lista">'+pas.map(function(x){
    return '<li><span>'+esc(rango(x))+'<small>vendiste '+money(x.vendido)+' · '+(x.cubierta?'fijos ✓':'faltaron '+money(x.falta))+(x.ganancia>0?' · ganancia '+money(x.ganancia):'')+'</small></span>'
      +(x.porGuardar>0?'<button class="btn quiet" type="button" data-vt="'+x.start+'">Guardar '+money(x.porGuardar)+'</button>':x.guardada>0?'<b class="vt-g">guardaste '+money(x.guardada)+'</b>':'')+'</li>'}).join('')+'</ul></details>';
  h+='<p class="note">En el mes: vendiste '+money(r.vendido)+(r.fijos>0?', los fijos son '+money(r.fijos):'')+(r.guardada>0?' y guardaste '+money(r.guardada)+' de ganancia':'')+'.</p>';
  el.innerHTML=h+'</div>';
}
export function initVentas(){
  var el=$('#ventas');if(!el)return;
  el.addEventListener('click',function(e){
    var b=e.target.closest('[data-vt]');if(!b)return;
    var u=guardarGanancia(ctx.state,b.getAttribute('data-vt'),undefined,today());
    if(!u){toast('Hoy no se puede guardar más: primero tienen que quedar cubiertos los fijos que faltan pagar.');return}
    ctx.persist();ctx.syncInputs();ctx.renderAll();
    toastAccion('Guardaste '+money(u.monto)+' de ganancia','Deshacer',function(){deshacerGanancia(ctx.state,u);ctx.persist();ctx.syncInputs();ctx.renderAll()});
  });
}
