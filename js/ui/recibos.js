/* Sueldo → Tus recibos: cargarlos a mano o leerlos de un PDF (en el teléfono), confirmarlos y compararlos.
   El PDF nunca sale del teléfono ni se guarda: solo los valores que confirmás. */
import {num,uid} from '../logica/util.js';
import {MESL} from '../logica/fechas.js';
import {CAMPOS,leerRecibo,renglones,aprenderPlantilla,compararRecibo,enPesosRecibo} from '../logica/recibos.js';
import {mesTrabajo,ingresoDe} from '../logica/sueldo.js';
import {cotizacion} from '../logica/monedas.js';
import {ctx,$,money,usd,esc,cap,toast,armar} from './comun.js';
import {lectorHTML,lectorAbierto} from './lector.js';

var PDFJS='../../vendor/pdfjs-6.3.289/';
var edit=null,abierto=null; /* edit = {datos, fuente, lineas, detectado, empleador} */
function mesTxt(k){return cap(MESL[Number(k.slice(5,7))-1])+' '+k.slice(0,4)}
function fmt(r,v){return r.moneda==='USD'?usd(num(v)):money(num(v))}

/* ---------- PDF → renglones de texto (pdf.js, guardado dentro de la app) ---------- */
var lib=null;
async function pdfjs(){
  if(!lib){
    lib=await import(PDFJS+'pdf.min.js');
    lib.GlobalWorkerOptions.workerSrc=new URL(PDFJS+'pdf.worker.min.js',import.meta.url).href;
  }
  return lib;
}
export async function textoPdf(file,max){
  var L=await pdfjs(),doc=await L.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise,items=[];
  for(var p=1;p<=Math.min(doc.numPages,max||3);p++){
    var pg=await doc.getPage(p),tc=await pg.getTextContent();
    /* Las páginas se apilan hacia abajo para que el orden de los renglones siga siendo de arriba a abajo */
    tc.items.forEach(function(it){items.push({str:it.str,x:it.transform[4],y:it.transform[5]-p*100000})});
  }
  try{doc.destroy()}catch(e){}
  return renglones(items);
}

/* ---------- Formulario (carga a mano y confirmación del PDF) ---------- */
function formRecibo(){
  var d=edit.datos,usdM=d.moneda==='USD',det=edit.detectado||{};
  var h='<form class="stack rec-form" id="rec-form" autocomplete="off">'
    +(edit.fuente==='pdf'?'<p class="voz-msg">Revisá cada valor: al lado ves el renglón del PDF de donde lo saqué. Corregí lo que esté mal; la próxima vez lo leo solo.</p>':'')
    +'<div class="grid2"><div class="field"><label for="rec-mes" class="sub-l">Mes trabajado</label><input id="rec-mes" type="month" value="'+esc(d.mes||'')+'" required></div>'
    +'<div class="field"><span class="sub-l">Moneda</span><div class="seg" role="group" aria-label="Moneda del recibo"><button type="button" data-recmon="UYU" aria-pressed="'+(!usdM)+'">Pesos</button><button type="button" data-recmon="USD" aria-pressed="'+usdM+'">Dólares</button></div>'
    +(usdM?'<small>'+(cotizacion(ctx.state)?'Se pasa a pesos a '+String(d.cotiz||cotizacion(ctx.state)).replace('.',',')+' el dólar.':'Cargá la cotización del dólar en Ajustes.')+'</small>':'')+'</div></div>'
    +'<div class="grid2 rec-campos">'+CAMPOS.map(function(c){
      var k=c[0],v=d[k]===undefined||d[k]===null?'':d[k],cant=k==='horasCant';
      return '<div class="field"><label for="rec-'+k+'" class="sub-l">'+esc(c[1])+'</label>'
        +(cant?'<input id="rec-'+k+'" data-rec="'+k+'" type="number" inputmode="decimal" min="0" step="any" value="'+v+'">'
          :'<div class="money"><span>'+(usdM?'US$':'$')+'</span><input id="rec-'+k+'" data-rec="'+k+'" type="number" inputmode="decimal" min="0" step="any" value="'+v+'"></div>')
        +(det[k]?'<small class="rec-de">de: «'+esc(det[k].linea.replace(/\s+/g,' ').slice(0,60))+'»</small>':(edit.fuente==='pdf'?'<small class="rec-de">no lo encontré en el PDF</small>':''))+'</div>';
    }).join('')+'</div>'
    +'<div class="row-btns"><button class="btn primary" type="submit">Guardar el recibo</button><button class="btn quiet" type="button" data-reca="cancelar">Cancelar</button></div></form>';
  return h;
}
function leerForm(){
  var d=edit.datos;d.mes=$('#rec-mes').value;
  document.querySelectorAll('[data-rec]').forEach(function(i){d[i.getAttribute('data-rec')]=i.value===''?null:Math.round(num(i.value)*100)/100});
}

/* ---------- Comparación ---------- */
function comparacion(r){
  var c=compararRecibo(ctx.state,r),EST={igual:['ok','igual'],cerca:['ex','cerca'],revisar:['bad','revisar']};
  var h='<div class="scroll"><table style="min-width:420px"><thead><tr><th>Concepto</th><th class="r">Calculado</th><th class="r">Recibo</th><th></th></tr></thead><tbody>'
    +c.filas.map(function(f){var e=EST[f.estado],h1=f.campo==='horasCant';
      return '<tr><td>'+esc(f.concepto)+'</td><td class="r">'+(h1?String(Math.round(f.calculado*100)/100).replace('.',','):money(f.calculado))+'</td><td class="r">'+(h1?String(f.recibo).replace('.',','):money(f.recibo))+'</td><td><span class="pill '+e[0]+'">'+e[1]+'</span></td></tr>'}).join('')
    +'</tbody></table></div>';
  if(c.liquidoDif!==null){
    var a=Math.abs(c.liquidoDif);
    h+='<p class="note">'+(a<=5?'El líquido coincide con lo calculado: te pagaron bien.':'El líquido difiere en <b>'+money(a)+'</b> '+(c.liquidoDif>0?'a tu favor':'en contra')+'.'+(c.explica?' Lo que más lo explica: <b>'+esc(c.explica.concepto)+'</b> ('+(c.explica.dif>0?'+':'−')+money(Math.abs(c.explica.dif))+').':''))+'</p>';
  }
  return h;
}

export function renderRecibos(){
  var el=$('#recibos-out');if(!el)return;
  var st=ctx.state,l=(st.recibos||[]).slice().sort(function(a,b){return a.mes<b.mes?1:-1}),mt=mesTrabajo(st);
  var h='';
  if(edit)h+=formRecibo();
  else h+=lectorHTML();
  if(l.length)h+='<ul class="list rec-lista">'+l.map(function(r){
    var abiertoEste=abierto===r.id;
    return '<li><div class="rec-fila"><span class="what"><b>'+esc(mesTxt(r.mes))+(r.mes===mt?' · este cobro':'')+'</b><span class="src">Líquido '+fmt(r,r.liquido)+(r.moneda==='USD'?' = '+money(enPesosRecibo(r,r.liquido)):'')+(r.fuente==='pdf'?' · del PDF':'')+'</span></span>'
      +'<span class="cat-btns"><button class="btn quiet sm" type="button" data-recver="'+esc(r.id)+'">'+(abiertoEste?'Cerrar':'Comparar')+'</button><button class="btn quiet sm" type="button" data-receditar="'+esc(r.id)+'">Editar</button><button class="btn quiet sm" type="button" data-recdel="'+esc(r.id)+'">Borrar</button></span></div>'
      +(abiertoEste?comparacion(r):'')+'</li>';
  }).join('')+'</ul>';
  else if(!edit&&!lectorAbierto())h+='<div class="empty">Todavía no guardaste recibos. Cada recibo que guardes pasa a ser lo que cobraste ese mes (para el plan y el aguinaldo).</div>';
  el.innerHTML=h;
}

export function initRecibos(){
  var el=$('#recibos-out');
  el.addEventListener('click',function(e){
    var b;
    if((b=e.target.closest('[data-reca]'))){
      var a=b.getAttribute('data-reca');
      if(a==='manual'){edit={datos:{mes:mesTrabajo(ctx.state),moneda:ingresoDe(ctx.state).moneda},fuente:'manual'};renderRecibos();var m=$('#rec-nominal');if(m)m.focus()}
      if(a==='cancelar'){edit=null;renderRecibos()}
      return;
    }
    if((b=e.target.closest('[data-recmon]'))){leerForm();edit.datos.moneda=b.getAttribute('data-recmon');renderRecibos();return}
    if((b=e.target.closest('[data-recver]'))){var id=b.getAttribute('data-recver');abierto=abierto===id?null:id;renderRecibos();return}
    if((b=e.target.closest('[data-receditar]'))){var r=ctx.state.recibos.filter(function(x){return x.id===b.getAttribute('data-receditar')})[0];if(r){edit={datos:Object.assign({},r),fuente:'manual'};renderRecibos()}return}
    if((b=e.target.closest('[data-recdel]'))){
      if(!armar(b))return;
      var did=b.getAttribute('data-recdel');ctx.state.recibos=ctx.state.recibos.filter(function(x){return x.id!==did});ctx.persist();ctx.renderAll();
    }
  });
  el.addEventListener('change',async function(e){
    if(e.target.id!=='rec-pdf')return;
    var f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
    toast('Leyendo el PDF…');
    try{
      var lineas=await textoPdf(f),r=leerRecibo(lineas,ctx.state.plantillasRecibo);
      if(r.sinTexto){
        toast('Ese PDF es una imagen escaneada: no tiene texto para leer. Cargalo a mano.');
        edit={datos:{mes:mesTrabajo(ctx.state),moneda:ingresoDe(ctx.state).moneda},fuente:'manual'};renderRecibos();return;
      }
      var d={mes:r.mes||mesTrabajo(ctx.state),moneda:ingresoDe(ctx.state).moneda};
      Object.keys(r.campos).forEach(function(k){d[k]=r.campos[k].valor});
      edit={datos:d,fuente:'pdf',lineas:lineas,detectado:r.campos,empleador:r.empleador};
      renderRecibos();
      var n=Object.keys(r.campos).length;toast(n?'Encontré '+n+' valores. Revisalos antes de guardar.':'No reconocí los valores: completalos a mano.');
    }catch(er){
      toast(/password/i.test(String(er&&er.name||er))?'Ese PDF tiene contraseña: no lo puedo leer. Cargalo a mano.':'No pude leer ese PDF. Cargalo a mano.');
      edit={datos:{mes:mesTrabajo(ctx.state),moneda:ingresoDe(ctx.state).moneda},fuente:'manual'};renderRecibos();
    }
  });
  el.addEventListener('submit',function(e){
    if(e.target.id!=='rec-form')return;
    e.preventDefault();leerForm();
    var d=edit.datos,st=ctx.state;
    if(!/^\d{4}-\d{2}$/.test(d.mes||'')){$('#rec-mes').focus();return}
    if(!(num(d.liquido)>0)){$('#rec-liquido').focus();toast('Falta el líquido');return}
    if(d.moneda==='USD'){var c=num(d.cotiz)||cotizacion(st);if(!c){toast('Primero cargá la cotización del dólar en Ajustes');return}d.cotiz=c}else delete d.cotiz;
    /* Lo que corregiste del PDF queda como plantilla de ese empleador */
    var aprendidos=0;
    if(edit.fuente==='pdf'){
      st.plantillasRecibo=st.plantillasRecibo||{};
      CAMPOS.forEach(function(c){
        var k=c[0],dv=edit.detectado[k];
        if(d[k]!==null&&d[k]!==undefined&&(!dv||Math.abs(dv.valor-d[k])>0.005)&&aprenderPlantilla(st.plantillasRecibo,edit.empleador,k,d[k],edit.lineas))aprendidos++;
      });
      d.empleador=edit.empleador;d.fuente='pdf';
    }else if(!d.fuente)d.fuente='manual';
    var r=Object.assign({},d,{id:d.id||uid()});
    st.recibos=(st.recibos||[]).filter(function(x){return x.id!==r.id&&x.mes!==r.mes});st.recibos.push(r);
    edit=null;abierto=r.id;ctx.persist();ctx.renderAll();
    toast('Recibo de '+mesTxt(r.mes)+' guardado'+(aprendidos?'. Aprendí '+aprendidos+(aprendidos===1?' campo':' campos')+' de este empleador.':''));
  });
}
