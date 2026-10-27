/* «Cobré» en Hoy (2.19): para quien cobra por día o cuando sale (perfil.cobro.frecuencia = 'jornal').
   Lo que cobrás se suma a tu plata y se guarda solo el mismo porcentaje del pacto. Las cuentas: cobreJornal (logica/pacto.js). */
import {num} from '../logica/util.js';
import {frecDe} from '../logica/frecuencia.js';
import {cobreJornal,deshacerCobre} from '../logica/pacto.js';
import {tuPlataAlcanza} from '../logica/ventas.js';
import {polvo} from './libro.js';
import {ctx,$,today,money,toast,toastAccion,planNow} from './comun.js';

export function renderCobre(){
  var el=$('#cobre');if(!el)return;
  var st=ctx.state,p=st.plan;
  var f=frecDe(st.perfil&&st.perfil.cobro);
  if((f!=='jornal'&&f!=='ventas')||!(num(p.monto)>0)||today()>=p.cobro){el.innerHTML='';return}
  var pct=Math.round(num(st.pacto&&st.pacto.pct)*1000)/10,v=f==='ventas';
  el.innerHTML='<form class="card stack cobre" id="cobre-form" autocomplete="off"><h2>'+(v?'¿Entró plata?':'¿Cobraste hoy?')+'</h2>'
    +'<p class="note">'+(v?'Anotá cada venta o pedido cobrado: se suma a lo que tenés y a lo vendido de la semana.':'Sumalo acá: '+(pct>0?'guardo el '+String(pct).replace('.',',')+' % (lo mismo que en tu pacto) y el resto':'todo')+' pasa a lo que podés gastar.')+'</p>'
    +'<div class="cobre-fila"><div class="money"><span>$</span><input id="cobre-in" type="number" inputmode="decimal" min="0" step="any" aria-label="'+(v?'Cuánto entró':'Cuánto cobraste')+'" placeholder="0"></div>'
    +'<button class="btn" type="submit">'+(v?'Entró plata':'Cobré')+'</button></div>'
    +(v?'<input id="cobre-nota" type="text" maxlength="40" aria-label="De qué (opcional)" placeholder="de qué (opcional): pedido de Marta">':'')+'</form>';
}
export function initCobre(){
  var el=$('#cobre');if(!el)return;
  el.addEventListener('submit',function(e){
    if(e.target.id!=='cobre-form')return;e.preventDefault();
    var ventas=frecDe(ctx.state.perfil&&ctx.state.perfil.cobro)==='ventas',a=ventas?tuPlataAlcanza(ctx.state,planNow(),today()):null;
    var n=$('#cobre-nota'),u=cobreJornal(ctx.state,$('#cobre-in').value,today(),n?n.value:'');
    if(!u){toast('Poné cuánto cobraste.');return}
    ctx.persist();ctx.syncInputs();ctx.renderAll();
    /* (2.22) cada venta suma días: «+3 días» con polvo de estrellas sobre «Tu plata alcanza» */
    var mas=0;if(a){var b=tuPlataAlcanza(ctx.state,planNow(),today());mas=b?b.dias-a.dias:0}
    if(mas>0){var cd=$('#countdown .cd-v');if(cd){var x=document.createElement('span');x.className='cd-mas';x.textContent='+'+mas+(mas===1?' día':' días');cd.appendChild(x);setTimeout(function(){x.remove()},2200);polvo(cd,12,0)}}
    toastAccion((mas>0?'+'+mas+(mas===1?' día':' días')+' de plata. ':'')+'Sumé '+money(u.cobro)+(u.guarda>0?' y guardé '+money(u.guarda):''),'Deshacer',function(){deshacerCobre(ctx.state,u);ctx.persist();ctx.syncInputs();ctx.renderAll()});
  });
}
