/* Capítulo IV · Ingresos (2.24): para quien cobra por día o cuando vende, en lugar del sueldo.
   Lo que entró en el pacto semana a semana, el promedio, la mejor semana, lo que se guardó solo,
   cada entrada (con Borrar y Deshacer) y los ingresos fijos. Las cuentas: resumenIngresos (logica/ventas.js). */
import {num} from '../logica/util.js';
import {frecDe} from '../logica/frecuencia.js';
import {resumenIngresos,semanasVentas,quitarEntrada,deshacerQuitarEntrada} from '../logica/ventas.js';
import {normIngresos,totalIngresosMes} from '../logica/ingresos.js';
import {ctx,$,today,money,esc,fCorta,toastAccion,planNow,tile} from './comun.js';

export function esIngresos(st){var f=frecDe(st&&st.perfil&&st.perfil.cobro);return f==='jornal'||f==='ventas'}
function rango(a,b){return fCorta(a)+(a===b?'':' – '+fCorta(b))}

export function renderIngresosVer(pc){
  var panel=$('#p-sueldo'),el=$('#ingresos-ver');if(!panel||!el)return;
  var st=ctx.state,on=esIngresos(st);
  panel.classList.toggle('solo-ingresos',on);el.hidden=!on;
  if(!on){el.innerHTML='';return}
  pc=pc||planNow();
  var t=today(),f=frecDe(st.perfil.cobro),r=resumenIngresos(st,pc,t),V=f==='ventas'?semanasVentas(st,pc,t):null,mx=0;
  r.semanas.forEach(function(x){if(x.entro>mx)mx=x.entro});
  var h='<div class="panel-head"><h2 class="ph-t">Tus ingresos</h2><p class="ph-s">'+(f==='ventas'?'Lo que vendiste en este pacto, semana a semana: lo que entró, si cubrió los fijos y la ganancia.':'Lo que cobraste en este pacto, semana a semana.')+' Cada '+(f==='ventas'?'venta':'cobro')+' se anota en Hoy con «'+(f==='ventas'?'Entró plata':'Cobré')+'».</p></div>';
  h+='<div class="card stack ing-res"><div class="tiles">'
    +tile('tone-sky','En este pacto',money(r.total),r.veces+(r.veces===1?' entrada':' entradas'))
    +tile('tone-sky','Por semana',money(r.promedio),'en promedio')+'</div>'
    +(r.mejor?'<p class="note">Tu mejor semana: <b>'+esc(rango(r.mejor.start,r.mejor.end))+'</b>, con '+money(r.mejor.entro)+'.</p>':'')
    +(r.guardadoSolo>0?'<p class="note ing-auto">Se guardaron solos <b>'+money(r.guardadoSolo)+'</b> (el '+String(Math.round(num(st.pacto.pct)*1000)/10).replace('.',',')+' % de cada cobro).</p>':'')
    +(V&&V.guardada>0?'<p class="note ing-auto">Guardaste <b>'+money(V.guardada)+'</b> de ganancia.</p>':'')+'</div>';
  /* semana a semana, con barras */
  h+='<div class="card stack"><h2>Semana a semana</h2><ul class="ing-sem">'+r.semanas.map(function(x){
    var v=V?V.semanas[x.i]:null,w=mx>0?Math.round(x.entro/mx*100):0,fut=!x.pasada&&!x.actual;
    return '<li class="'+(x.actual?'actual':'')+(fut?' fut':'')+'"><span class="ing-r">'+esc(rango(x.start,x.end))+(x.actual?' · esta semana':'')+'</span>'
      +'<span class="ing-b" aria-hidden="true"><i style="width:'+w+'%"></i></span><b>'+(fut?'—':money(x.entro))+'</b>'
      +(v&&!fut?'<small>'+(v.meta>0?(v.cubierta?'fijos ✓':'faltaron '+money(v.falta)):'sin fijos esta semana')+(v.ganancia>0?' · ganancia '+money(v.ganancia):'')+'</small>':'')+'</li>'}).join('')+'</ul></div>';
  /* cada entrada */
  h+='<div class="card stack"><h2>Lo que entró</h2>'+(r.entradas.length?'<ul class="list ing-lista2">'+r.entradas.slice(0,30).map(function(e){
    return '<li><span class="when">'+esc(fCorta(e.fecha))+'</span><span class="what">'+(e.nota?esc(e.nota):(f==='ventas'?'Venta':'Cobro'))+(num(e.g)>0?'<small>guardaste '+money(e.g)+'</small>':'')+'</span><b>'+money(e.monto)+'</b>'
      +'<button class="btn quiet" type="button" data-qent="'+esc(e.id)+'" aria-label="Borrar esta entrada">Borrar</button></li>'}).join('')+'</ul>'
    :'<p class="note">Todavía no anotaste nada. Cuando te entre plata, tocá «'+(f==='ventas'?'Entró plata':'Cobré')+'» en Hoy.</p>')+'</div>';
  /* ingresos fijos */
  var ifj=normIngresos(st.ingresosFijos);
  h+='<div class="card stack"><h2>Ingresos fijos</h2>'+(ifj.length?'<p class="note">Además te entran '+money(totalIngresosMes(st))+' por mes: '+ifj.map(function(x){return esc(x.nombre)+' (el '+x.dia+')'}).join(', ')+'. El día que toca, te pregunto en Hoy.</p>'
    :'<p class="note">Si todos los meses te entra algo fijo (una ayuda, un alquiler que cobrás), anotalo y te pregunto en Hoy el día que llega.</p>')
    +'<div class="row-btns"><button class="btn" type="button" data-goto="fijos">'+(ifj.length?'Cambiarlos':'Anotar ingresos fijos')+'</button></div></div>';
  el.innerHTML=h;
}
export function initIngresosVer(){
  var el=$('#ingresos-ver');if(!el)return;
  el.addEventListener('click',function(e){
    var b=e.target.closest('[data-qent]');if(!b)return;
    var u=quitarEntrada(ctx.state,b.getAttribute('data-qent'));if(!u)return;
    ctx.persist();ctx.syncInputs();ctx.renderAll();
    toastAccion('Borré '+money(u.entrada.monto)+' de lo que entró','Deshacer',function(){deshacerQuitarEntrada(ctx.state,u);ctx.persist();ctx.syncInputs();ctx.renderAll()});
  });
}
