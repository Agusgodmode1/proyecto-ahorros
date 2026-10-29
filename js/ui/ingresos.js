/* Otros cobros del mes en el capítulo Fijos (2.20 «Ingresos fijos»; desde 2.30 un desplegable): cargar, cambiar
   y borrar lo que te entra todos los meses además del sueldo. El día que llega, Hoy pregunta «¿Te entraron?». Las cuentas: logica/ingresos.js. Al cambiar algo, lo que todavía no llegó se vuelve a anotar. */
import {num,uid} from '../logica/util.js';
import {normIngresos,totalIngresosMes,reprogramar} from '../logica/ingresos.js';
import {ctx,$,money,esc,toast,toastAccion} from './comun.js';

var editando=null,abierto=false;
export function renderIngresos(){
  var el=$('#ingresos-fijos');if(!el)return;
  var st=ctx.state,l=normIngresos(st.ingresosFijos),x=editando?l.filter(function(i){return i.id===editando})[0]:null;
  var h='<details class="card fold ing-card" id="ing-d"'+(abierto||editando?' open':'')+'><summary><span class="fold-t">Otros cobros del mes</span><span class="fold-s">'
    +(l.length?money(totalIngresosMes(st))+' por mes':'una pensión, un alquiler que cobrás…')+'</span></summary><div class="stack fold-b">'
    +'<p class="note">Cuenta recién cuando llega: ese día te pregunto en Hoy.</p>';
  if(l.length)h+='<ul class="ap-lista ing-lista">'+l.map(function(i){return '<li><span>'+esc(i.nombre)+'<small>el '+i.dia+' de cada mes</small></span><b>'+money(i.monto)+'</b>'
      +'<span class="ing-acc"><button class="btn quiet" type="button" data-ing="editar" data-id="'+esc(i.id)+'">Cambiar</button><button class="btn quiet" type="button" data-ing="borrar" data-id="'+esc(i.id)+'">Borrar</button></span></li>'}).join('')
    +(l.length>1?'<li class="tot"><span>Por mes</span><b>'+money(totalIngresosMes(st))+'</b></li>':'')+'</ul>';
  h+='<form class="stack" id="ing-form" autocomplete="off"><h3 class="sv-h3">'+(x?'Cambiar «'+esc(x.nombre)+'»':'Agregar un cobro')+'</h3>'
    +'<div class="field"><label for="ing-nombre" class="sub-l">¿Qué es?</label><input id="ing-nombre" type="text" maxlength="40" placeholder="Ayuda de mi hijo, alquiler que cobro, pensión" value="'+(x?esc(x.nombre):'')+'"></div>'
    +'<div class="field"><label for="ing-monto" class="sub-l">¿Cuánto por mes?</label><div class="money"><span>$</span><input id="ing-monto" type="number" inputmode="decimal" min="0" step="any" value="'+(x?x.monto:'')+'"></div></div>'
    +'<div class="field"><label for="ing-dia" class="sub-l">¿Qué día te entra, más o menos?</label><input id="ing-dia" type="number" inputmode="numeric" min="1" max="31" step="1" placeholder="5" value="'+(x?x.dia:'')+'"></div>'
    +'<p class="note err" id="ing-err" hidden></p>'
    +'<div class="row-btns"><button class="btn" type="submit">'+(x?'Guardar':'Agregar')+'</button>'+(x?'<button class="btn quiet" type="button" data-ing="cancelar">Cancelar</button>':'')+'</div></form></div></details>';
  el.innerHTML=h;
}
function cambio(){reprogramar(ctx.state);ctx.persist();ctx.syncInputs();ctx.renderAll()}
export function initIngresos(){
  var el=$('#ingresos-fijos');if(!el)return;
  el.addEventListener('click',function(e){
    var b=e.target.closest('[data-ing]');if(!b)return;
    var a=b.getAttribute('data-ing'),id=b.getAttribute('data-id'),st=ctx.state;
    if(a==='cancelar'){editando=null;renderIngresos();return}
    if(a==='editar'){editando=id;renderIngresos();var n=$('#ing-monto');if(n)n.focus();return}
    if(a==='borrar'){
      var antes=JSON.parse(JSON.stringify(st.ingresosFijos||[])),x=(st.ingresosFijos||[]).filter(function(i){return i.id===id})[0];
      st.ingresosFijos=(st.ingresosFijos||[]).filter(function(i){return i.id!==id});if(editando===id)editando=null;cambio();
      toastAccion('Borré «'+(x?x.nombre:'el ingreso')+'»','Deshacer',function(){ctx.state.ingresosFijos=antes;cambio()});
    }
  });
  el.addEventListener('toggle',function(e){if(e.target.id==='ing-d')abierto=e.target.open},true);
  el.addEventListener('submit',function(e){
    if(e.target.id!=='ing-form')return;e.preventDefault();
    var nom=$('#ing-nombre').value.trim(),m=num($('#ing-monto').value),d=Math.round(num($('#ing-dia').value)),er=$('#ing-err');
    var msg=!nom?'Escribí qué es.':!(m>0)?'Poné cuánto te entra por mes.':!(d>=1&&d<=31)?'Poné un día del 1 al 31.':'';
    if(msg){er.textContent=msg;er.hidden=false;return}
    var st=ctx.state;st.ingresosFijos=normIngresos(st.ingresosFijos);
    if(editando){st.ingresosFijos.forEach(function(i){if(i.id===editando){i.nombre=nom;i.monto=Math.round(m);i.dia=d}})}
    else st.ingresosFijos.push({id:uid(),nombre:nom,monto:Math.round(m),dia:d});
    var era=editando;editando=null;cambio();toast(era?'Listo, lo cambié':'Anotado: el día que llegue te pregunto en Hoy.');
  });
}
