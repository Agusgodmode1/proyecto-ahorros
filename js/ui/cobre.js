/* «Cobré» en Hoy (2.19): para quien cobra por día o cuando sale (perfil.cobro.frecuencia = 'jornal').
   Lo que cobrás se suma a tu plata y se guarda solo el mismo porcentaje del pacto. Las cuentas: cobreJornal (logica/pacto.js). */
import {num} from '../logica/util.js';
import {frecDe} from '../logica/frecuencia.js';
import {cobreJornal,deshacerCobre} from '../logica/pacto.js';
import {ctx,$,today,money,toast,toastAccion} from './comun.js';

export function renderCobre(){
  var el=$('#cobre');if(!el)return;
  var st=ctx.state,p=st.plan;
  if(frecDe(st.perfil&&st.perfil.cobro)!=='jornal'||!(num(p.monto)>0)||today()>=p.cobro){el.innerHTML='';return}
  var pct=Math.round(num(st.pacto&&st.pacto.pct)*1000)/10;
  el.innerHTML='<form class="card stack cobre" id="cobre-form" autocomplete="off"><h2>¿Cobraste hoy?</h2>'
    +'<p class="note">Sumalo acá: '+(pct>0?'guardo el '+String(pct).replace('.',',')+' % (lo mismo que en tu pacto) y el resto':'todo')+' pasa a lo que podés gastar.</p>'
    +'<div class="cobre-fila"><div class="money"><span>$</span><input id="cobre-in" type="number" inputmode="decimal" min="0" step="any" aria-label="Cuánto cobraste" placeholder="0"></div>'
    +'<button class="btn" type="submit">Cobré</button></div></form>';
}
export function initCobre(){
  var el=$('#cobre');if(!el)return;
  el.addEventListener('submit',function(e){
    if(e.target.id!=='cobre-form')return;e.preventDefault();
    var u=cobreJornal(ctx.state,$('#cobre-in').value);
    if(!u){toast('Poné cuánto cobraste.');return}
    ctx.persist();ctx.syncInputs();ctx.renderAll();
    toastAccion('Sumé '+money(u.cobro)+(u.guarda>0?' y guardé '+money(u.guarda):''),'Deshacer',function(){deshacerCobre(ctx.state,u);ctx.persist();ctx.syncInputs();ctx.renderAll()});
  });
}
