/* Ajustes → Feriados: la lista de feriados.js, con casillas para sacar los que no tomás y un formulario para agregar. */
import {FERIADOS_UY,feriadosActivos} from '../logica/feriados.js';
import {usarFeriados} from '../logica/fechas.js';
import {ctx,$,esc,fLarga,toast,today} from './comun.js';

var verTodos=false;
/* La app usa siempre la lista con tus cambios */
export function aplicarFeriados(st){
  st=st||ctx.state;var p=st.perfil||{};
  usarFeriados(feriadosActivos(st.feriados),{laborableHabil:!(p.cobro&&p.cobro.laborableHabil===false),pagoLaborable:p.horas&&p.horas.feriadoLaborable});
}

export function renderFeriados(){
  var cfg=ctx.state.feriados,quit={};cfg.quitados.forEach(function(f){quit[f]=1});
  var hoy=today();
  var lista=FERIADOS_UY.map(function(f){return {fecha:f.fecha,nombre:f.nombre,laborable:f.laborable,on:!quit[f.fecha]}})
    .concat(cfg.agregados.map(function(f){return {fecha:f.fecha,nombre:f.nombre,propio:true,on:true}}))
    .sort(function(a,b){return a.fecha<b.fecha?-1:1});
  var visibles=verTodos?lista:lista.filter(function(f){return f.fecha>=hoy}).slice(0,8);
  var h='<ul class="list fer-list">'+visibles.map(function(f){
    return '<li><label class="check"><input type="checkbox" data-fer="'+f.fecha+'"'+(f.on?' checked':'')+(f.propio?' disabled':'')+'><span><b>'+esc(fLarga(f.fecha))+' '+f.fecha.slice(0,4)+'</b> · '+esc(f.nombre)
      +(f.laborable?' <span class="src">laborable: día común</span>':'')+(f.propio?' <span class="src">agregado por vos</span>':'')+'</span></label>'
      +(f.propio?'<button class="btn quiet" type="button" data-ferdel="'+f.fecha+'">Borrar</button>':'')+'</li>';
  }).join('')+'</ul>';
  h+='<div class="row-btns"><button class="btn quiet" type="button" data-fertodos>'+(verTodos?'Ver solo los próximos':'Ver los '+lista.length+' feriados')+'</button></div>';
  h+='<form class="fer-form" id="fer-form" autocomplete="off"><div class="field"><label for="fer-f" class="sub-l">Agregar un día</label><input id="fer-f" type="date" required></div>'
    +'<div class="field"><label for="fer-n" class="sub-l">Nombre</label><input id="fer-n" type="text" maxlength="40" placeholder="Feriado de la empresa"></div>'
    +'<button class="btn" type="submit">Agregar</button></form>';
  $('#aj-feriados').innerHTML=h;
}
function cambio(){aplicarFeriados();ctx.persist();ctx.renderAll()}
export function initFeriados(){
  var el=$('#aj-feriados');
  el.addEventListener('change',function(e){
    var c=e.target.closest('[data-fer]');if(!c)return;
    var f=c.getAttribute('data-fer'),q=ctx.state.feriados.quitados.filter(function(x){return x!==f});
    if(!c.checked)q.push(f);
    ctx.state.feriados.quitados=q;cambio();
  });
  el.addEventListener('click',function(e){
    if(e.target.closest('[data-fertodos]')){verTodos=!verTodos;renderFeriados();return}
    var d=e.target.closest('[data-ferdel]');
    if(d){var f=d.getAttribute('data-ferdel');ctx.state.feriados.agregados=ctx.state.feriados.agregados.filter(function(x){return x.fecha!==f});cambio()}
  });
  el.addEventListener('submit',function(e){
    if(e.target.id!=='fer-form')return;
    e.preventDefault();
    var f=$('#fer-f').value,n=$('#fer-n').value.trim()||'Feriado';if(!f)return;
    var cfg=ctx.state.feriados;
    cfg.quitados=cfg.quitados.filter(function(x){return x!==f});
    if(!FERIADOS_UY.some(function(x){return x.fecha===f})&&!cfg.agregados.some(function(x){return x.fecha===f}))cfg.agregados.push({fecha:f,nombre:n.slice(0,40)});
    cambio();toast('Feriado agregado');
  });
}
