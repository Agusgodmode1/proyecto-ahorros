/* Sueldo → "Cargar desde la planilla del trabajo": elegís el Excel de asistencia, te elegís en la lista
   y la app calcula tus horas extra de cada día con las reglas de tu perfil. El archivo se lee en el teléfono
   y de los demás no se guarda nada (solo tu nombre, para no preguntarlo de nuevo). */
import {leerXlsx} from '../logica/xlsx.js';
import {personas,leerPlanilla,importarHoras} from '../logica/planilla.js';
import {diasDeFilas,celdasDe} from '../logica/horas-archivo.js';
import {reglasHoras,mesTrabajo} from '../logica/sueldo.js';
import {MESL} from '../logica/fechas.js';
import {uid} from '../logica/util.js';
import {ctx,$,today,esc,fMin,fLarga,toast} from './comun.js';

/* (2.53) generico: días leídos de un archivo con otro formato (otra planilla, un PDF o un texto) */
var hojas=null,quien=null,alcance='mes',res=null,error='',generico=null;

function nombreMes(k){return MESL[Number(k.slice(5,7))-1]}
function resumenDias(todos){
  var mt=mesTrabajo(ctx.state),h='';
  var dias=alcance==='mes'?todos.filter(function(d){return d.fecha.slice(0,7)===mt}):todos;
  var conExtra=dias.filter(function(d){return d.min>0}),sem=0,fin=0;
  conExtra.forEach(function(d){if(d.tipo==='fin')fin+=d.min;else sem+=d.min});
  var avisos=dias.filter(function(d){return d.aviso});
  h+='<div class="seg" role="group" aria-label="Qué cargar"><button type="button" data-plal="mes" aria-pressed="'+(alcance==='mes')+'">'+esc(nombreMes(mt))+' (se cobra el '+esc(fLarga(ctx.state.plan.cobro))+')</button><button type="button" data-plal="todo" aria-pressed="'+(alcance==='todo')+'">Todo lo que trae</button></div>';
  if(!dias.length)return h+'<p class="note">No encontré días con entrada y salida '+(alcance==='mes'?'en '+esc(nombreMes(mt)):'')+'.</p>';
  h+='<p class="lead pl-res">'+conExtra.length+' '+(conExtra.length===1?'día':'días')+' con extra: <b>'+fMin(sem)+'</b> entre semana y <b>'+fMin(fin)+'</b> de finde o feriado.</p>';
  if(avisos.length)h+='<div class="callout tone-coral"><b>Ojo con la planilla</b><ul class="lect">'+avisos.map(function(d){return '<li>'+esc(fLarga(d.fecha))+': '+esc(d.aviso)+'</li>'}).join('')+'</ul></div>';
  h+='<details><summary>Ver día por día</summary><ul class="list pl-dias">'+dias.map(function(d){
    return '<li><span class="when">'+esc(fLarga(d.fecha))+'</span><span class="what">'+esc(d.llegada)+' a '+esc(d.salida)+(d.tipo==='fin'?' <span class="pill ex">finde o feriado</span>':'')+'</span><span class="amt">'+(d.min?fMin(d.min):'—')+'</span></li>';
  }).join('')+'</ul></details>';
  var ya=ctx.state.horas.filter(function(x){return dias.some(function(d){return d.fecha===x.fecha})}).length;
  h+='<div class="row-btns"><button class="btn primary" type="button" id="pl-ok">Cargar estas horas</button></div>'
    +(ya?'<p class="note">Reemplaza '+ya+(ya===1?' registro que ya tenías':' registros que ya tenías')+' en esos días.</p>':'');
  return h;
}
export function renderPlanilla(){
  var el=$('#planilla-box');if(!el)return;
  var h='<div class="pl-top"><div><b>Cargá tus horas del mes</b><span class="note">El Excel o el PDF de asistencia: leo entrada y salida de cada día y calculo tus extras.</span></div>'
    +'<label class="btn'+(hojas||generico?'':' primary')+' filebtn">'+(hojas||generico?'Elegir otro archivo':'Elegir Excel o PDF')+'<input type="file" id="pl-file" class="sr-only" accept=".xlsx,.pdf,.csv,.txt,application/pdf,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label></div>';
  if(error)h+='<p class="err">'+esc(error)+'</p>';
  if(generico){res=generico;h+=resumenDias(res.dias);el.innerHTML=h;return}
  if(hojas){
    var ps=personas(hojas);
    h+='<div class="field"><label for="pl-quien" class="sub-l">¿Quién sos en la planilla?</label><select id="pl-quien"><option value="">Elegí tu nombre</option>'
      +ps.map(function(p){return '<option'+(p===quien?' selected':'')+'>'+esc(p)+'</option>'}).join('')+'</select></div>';
    if(quien){
      res=leerPlanilla(hojas,quien,reglasHoras(ctx.state),today());
      h+=resumenDias(res.dias);
    }
  }
  el.innerHTML=h;
}

export function initPlanilla(){
  var el=$('#planilla-box');if(!el)return;
  el.addEventListener('change',async function(e){
    if(e.target.id==='pl-file'){
      var f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
      error='';hojas=null;res=null;generico=null;renderPlanilla();
      try{
        if(f.size>15e6)throw new Error('El archivo es demasiado grande.');
        var nom=String(f.name||'').toLowerCase(),R=reglasHoras(ctx.state),filas=null;
        if(/\.pdf$/.test(nom)||f.type==='application/pdf'){
          toast('Leyendo el PDF…');
          var mod=await import('./recibos.js');filas=(await mod.textoPdf(f,15)).map(celdasDe);
        }else if(/\.(csv|txt)$/.test(nom)||/^text\//.test(f.type)){
          filas=(await f.text()).split(/\r?\n/).map(celdasDe);
        }else{
          hojas=await leerXlsx(await f.arrayBuffer());
          var ps=personas(hojas),guardado=ctx.state.perfil.planillaNombre;
          if(ps.length)quien=guardado&&ps.indexOf(guardado)>=0?guardado:(ps.length===1?ps[0]:null);
          /* otra planilla: se buscan filas con una fecha y dos horas */
          else{filas=[];hojas.forEach(function(hj){filas=filas.concat(hj.filas||[])});hojas=null}
        }
        if(filas){
          var g=diasDeFilas(filas,R,today());
          if(g.sinHorario&&!g.dias.length)throw new Error('Primero contame tu horario (en «Tu horario y cómo te pagan»): sin eso no sé cuáles son extras.');
          if(!g.dias.length)throw new Error('No encontré días con fecha, entrada y salida en este archivo.');
          generico=g;
        }
      }catch(er){hojas=null;generico=null;error=er&&er.message||'No pude leer el archivo.'}
      renderPlanilla();
    }
    if(e.target.id==='pl-quien'){quien=e.target.value||null;renderPlanilla()}
  });
  el.addEventListener('click',function(e){
    var b=e.target.closest('[data-plal]');if(b){alcance=b.getAttribute('data-plal');renderPlanilla();return}
    if(e.target.id==='pl-ok'&&res){
      var mt=mesTrabajo(ctx.state),dias=alcance==='mes'?res.dias.filter(function(d){return d.fecha.slice(0,7)===mt}):res.dias;
      var r=importarHoras(ctx.state,dias,uid);
      if(quien)ctx.state.perfil.planillaNombre=quien;
      hojas=null;res=null;generico=null;
      ctx.persist();ctx.renderAll();
      toast('Cargué '+r.nuevos+(r.nuevos===1?' día con extra':' días con extra')+' de la planilla');
    }
  });
}
