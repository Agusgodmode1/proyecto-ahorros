/* Carga por voz: micrófono flotante → texto → tarjeta para confirmar → guardar.
   Nunca guarda sin que toques "Guardar". Si el reconocimiento de voz no anda (pasa en la app instalada
   en iOS), abre un campo de texto para dictar con el micrófono del teclado. */
import {interpretar,responder,aprender,fechaTxt,FIJO_CATS} from '../logica/voz.js';
import {CAT_NAMES} from '../logica/extracto.js';
import {semanaDe,fijosPeriodo,totalFijos,isPagado,marcarPagado} from '../logica/plan.js';
import {mins,mesTrabajo,reglasHoras} from '../logica/sueldo.js';
import {diffDays,esFeriado,parse,MESL} from '../logica/fechas.js';
import {num,uid} from '../logica/util.js';
import {ctx,$,today,planNow,liqNow,money,esc,fMin,fLarga,toast} from './comun.js';

var MSG_TECLADO='Tocá el micrófono del teclado y dictá.';
var TK='pa-voz-teclado'; /* se recuerda si el reconocimiento no anda en este teléfono */
var EJEMPLOS=['gasté 850 en el súper','ayer 450 de pedidos ya','dos lucas en el kiosco','hice 20 minutos extra hoy','trabajé el sábado 6 horas y media','agregá un fijo de alquiler de 15 mil el día 1','pagué el alquiler','cuánto me queda esta semana'];
var rec=null,cancelado=false,r=null,catSugerida=null,pesosOk=true;

function SR(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function soloTeclado(){try{return localStorage.getItem(TK)==='1'}catch(e){return false}}
function marcarTeclado(v){try{if(v)localStorage.setItem(TK,'1');else localStorage.removeItem(TK)}catch(e){}}
function pintar(h){$('#voz-box').innerHTML=h}
/* Suelta el reconocimiento sin que su evento de fin pise la pantalla */
function pararRec(){if(!rec)return;rec.onend=rec.onresult=rec.onerror=null;try{rec.abort()}catch(e){}rec=null}

/* ---------- Abrir y cerrar ---------- */
function abrir(){
  cancelado=false;r=null;
  $('#voz').hidden=false;document.documentElement.classList.add('voz-abierta');
  ajustarVV();
  if(!SR()||soloTeclado()){escribir(MSG_TECLADO,'');return}
  escuchar();
}
function cerrar(){
  cancelado=true;pararRec();
  try{window.speechSynthesis&&window.speechSynthesis.cancel()}catch(e){}
  $('#voz').hidden=true;document.documentElement.classList.remove('voz-abierta');
  try{$('#mic').focus()}catch(e){}
}

/* ---------- Escuchar ---------- */
function escuchar(){
  var final='',parcial='',error=null,lang='es-UY',probeES=false;
  pintar('<div class="voz-h"><h2 id="voz-t">Te escucho…</h2><button class="btn quiet" type="button" data-v="cerrar">Cancelar</button></div>'
    +'<p class="voz-oye" id="voz-oye" aria-live="polite"><span class="muted">Decí algo como «gasté 850 en el súper».</span></p>'
    +'<div class="voz-onda" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>'
    +'<div class="row-btns"><button class="btn primary" type="button" data-v="listo">Listo</button><button class="btn quiet" type="button" data-v="teclado">Prefiero escribir</button></div>');
  function empezar(){
    var C=SR();
    try{rec=new C()}catch(e){rec=null;escribir(MSG_TECLADO,'');return}
    rec.lang=lang;rec.interimResults=true;rec.continuous=false;rec.maxAlternatives=1;
    rec.onresult=function(e){
      parcial='';
      for(var i=e.resultIndex;i<e.results.length;i++){var x=e.results[i];if(x.isFinal)final+=x[0].transcript;else parcial+=x[0].transcript}
      var el=$('#voz-oye');if(el)el.textContent=(final+parcial).trim();
    };
    rec.onerror=function(e){error=e.error||'error'};
    rec.onend=function(){
      rec=null;if(cancelado)return;
      if(error==='language-not-supported'&&!probeES){probeES=true;lang='es-ES';error=null;empezar();return}
      var txt=(final||parcial).trim();
      if(txt){entender(txt);return}
      if(error==='not-allowed')escribir('No tengo permiso para usar el micrófono. Podés darlo en Ajustes del iPhone › Safari › Micrófono. Mientras tanto: '+MSG_TECLADO.toLowerCase(),'');
      else if(error==='service-not-allowed'||error==='audio-capture'){marcarTeclado(true);escribir(MSG_TECLADO,'')}
      else if(error==='no-speech'||!error||error==='aborted')escribir('No te escuché. '+MSG_TECLADO,'');
      else escribir(MSG_TECLADO,'');
    };
    try{rec.start()}catch(e){rec=null;escribir(MSG_TECLADO,'')}
  }
  empezar();
}

/* ---------- Escribir o dictar con el teclado ---------- */
function escribir(msg,texto){
  pararRec();
  pintar('<div class="voz-h"><h2 id="voz-t">¿Qué querés anotar?</h2><button class="btn quiet" type="button" data-v="cerrar">Cancelar</button></div>'
    +(msg?'<p class="voz-msg">'+esc(msg)+'</p>':'')
    +'<form class="stack" id="voz-form" autocomplete="off"><textarea id="voz-txt" rows="2" enterkeyhint="go" autocapitalize="sentences" placeholder="gasté 850 en el súper" aria-label="Lo que querés anotar">'+esc(texto||'')+'</textarea>'
    +'<div class="row-btns"><button class="btn primary" type="submit">Entender</button>'
    +(SR()&&soloTeclado()?'<button class="btn quiet" type="button" data-v="probar">Probar con la voz otra vez</button>':'')+'</div></form>'
    +'<details class="voz-ej"><summary>Ejemplos de lo que entiendo</summary><ul class="lect">'+EJEMPLOS.map(function(e){return '<li><button class="linklike" type="button" data-ej="'+esc(e)+'">'+esc(e)+'</button></li>'}).join('')+'</ul></details>');
  var ta=$('#voz-txt');
  try{ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)}catch(e){}
}

/* ---------- Entender y confirmar ---------- */
function entender(txt){
  var st=ctx.state;
  r=interpretar(txt,{hoy:today(),fijos:st.fijos,aprendido:st.voz.cats});
  catSugerida=r.cat||null;pesosOk=!r.dolares;
  if(r.intencion==='consulta'){responderConsulta();return}
  if(r.intencion==='nada'){escribir('No entendí «'+txt+'». Corregí el texto o probá con otras palabras.',txt);return}
  if(r.intencion==='horas'&&reglasHoras(st).activo===false)r.avisos.unshift('En tu perfil dice que no hacés horas extra: se guardan, pero no suman al sueldo hasta que lo cambies en Mi perfil.');
  tarjeta();
}
function opts(lista,sel){return lista.map(function(c){return '<option'+(c===sel?' selected':'')+'>'+esc(c)+'</option>'}).join('')}
function campo(id,label,input){return '<div class="field"><label for="'+id+'" class="sub-l">'+label+'</label>'+input+'</div>'}
function moneyIn(id,v){return '<div class="money"><span>$</span><input id="'+id+'" type="number" inputmode="decimal" min="0" step="any" value="'+(v===null||v===undefined?'':v)+'"></div>'}

var TITULOS={gasto:'Gasto',fijo:'Gasto fijo nuevo',pagado:'Fijo pagado',horas:'Horas extra'};
function tarjeta(){
  var h='<div class="voz-h"><h2 id="voz-t">'+TITULOS[r.intencion]+'</h2><button class="btn quiet" type="button" data-v="cerrar">Cancelar</button></div>';
  h+='<p class="voz-dijo">Escuché: «'+esc(r.texto)+'» <button class="linklike" type="button" data-v="editar">cambiar</button></p>';
  h+='<p class="voz-res" id="vz-res"></p>';
  h+='<div class="voz-campos">';
  var hoy=today();
  if(r.intencion==='gasto'){
    h+=campo('vz-monto','¿Cuánto?',moneyIn('vz-monto',r.monto))
      +campo('vz-nota','¿En qué?','<input id="vz-nota" type="text" maxlength="60" value="'+esc(r.nota||'')+'">')
      +campo('vz-cat','Categoría','<select id="vz-cat">'+opts(CAT_NAMES,r.cat)+'</select>')
      +campo('vz-fecha','¿Qué día?','<input id="vz-fecha" type="date" max="'+hoy+'" value="'+r.fecha+'">');
  }else if(r.intencion==='fijo'){
    h+=campo('vz-nombre','¿Qué es?','<input id="vz-nombre" type="text" maxlength="40" value="'+esc(r.nombre||'')+'">')
      +campo('vz-monto','¿Cuánto por mes?',moneyIn('vz-monto',r.monto))
      +campo('vz-dia','¿Qué día se paga?','<input id="vz-dia" type="number" inputmode="numeric" min="1" max="31" step="1" value="'+r.dia+'">')
      +campo('vz-cat','Tipo','<select id="vz-cat">'+opts(FIJO_CATS,r.cat)+'</select>');
  }else if(r.intencion==='pagado'){
    var fs=ctx.state.fijos;
    h+=fs.length?campo('vz-fijo','¿Cuál pagaste?','<select id="vz-fijo">'+(r.fijoId?'':'<option value="">Elegí uno</option>')+fs.map(function(f){return '<option value="'+esc(f.id)+'"'+(f.id===r.fijoId?' selected':'')+'>'+esc(f.nombre)+' · '+esc(money(num(f.monto)))+'</option>'}).join('')+'</select>')
      :'<div class="empty">Todavía no cargaste gastos fijos. Agregalos en la pestaña Fijos.</div>';
  }else if(r.intencion==='horas'){
    h+=campo('vz-fecha','¿Qué día?','<input id="vz-fecha" type="date" max="'+hoy+'" value="'+r.fecha+'">')
      +'<div class="field"><span class="sub-l lab">¿Qué tipo de hora?</span><div class="seg" role="group" aria-label="Tipo de hora"><button type="button" data-vt="sem" aria-pressed="'+(r.tipo==='sem')+'">Entre semana</button><button type="button" data-vt="fin" aria-pressed="'+(r.tipo==='fin')+'">Finde o feriado</button></div></div>'
      +'<div class="hm">'+campo('vz-h','Horas','<input id="vz-h" type="number" inputmode="numeric" min="0" max="24" step="1" value="'+Math.floor(r.min/60)+'">')
      +campo('vz-m','Minutos','<input id="vz-m" type="number" inputmode="numeric" min="0" max="59" step="1" value="'+(r.min%60)+'">')+'</div>';
  }
  h+='</div>';
  if(r.avisos.length)h+='<ul class="voz-avisos">'+r.avisos.map(function(a){return '<li>'+esc(a)+'</li>'}).join('')+'</ul>';
  if(r.dolares&&!pesosOk)h+='<div class="row-btns"><button class="btn" type="button" data-v="pesos">El monto ya está en pesos</button></div>';
  if(r.alternativas.length)h+='<div class="voz-alt"><span class="sub-l">¿O quisiste decir…?</span><div class="sugs">'+r.alternativas.map(function(a,i){return '<button class="btn" type="button" data-alt="'+i+'">'+esc(a.etiqueta)+'</button>'}).join('')+'</div></div>';
  h+='<div class="row-btns voz-acc"><button class="btn primary" type="button" data-v="guardar" id="vz-ok">Guardar</button><button class="btn quiet" type="button" data-v="cerrar">Cancelar</button></div>';
  pintar(h);
  resumen();
}
/* Lee lo que cambiaste en la tarjeta */
function leer(){
  if(!r)return;
  var g=function(id){var e=$('#'+id);return e?e.value:null};
  if(r.intencion==='gasto'){var m=g('vz-monto');r.monto=m===''?null:num(m);r.nota=g('vz-nota').trim();r.cat=g('vz-cat');r.fecha=g('vz-fecha')||r.fecha}
  if(r.intencion==='fijo'){var m2=g('vz-monto');r.monto=m2===''?null:num(m2);r.nombre=g('vz-nombre').trim();r.dia=Math.min(31,Math.max(1,Math.round(num(g('vz-dia')))||1));r.cat=g('vz-cat')}
  if(r.intencion==='pagado'&&$('#vz-fijo')){r.fijoId=g('vz-fijo')||null}
  if(r.intencion==='horas'){r.fecha=g('vz-fecha')||r.fecha;r.min=Math.max(0,Math.round(num(g('vz-h'))))*60+Math.max(0,Math.round(num(g('vz-m'))))}
}
/* La línea de resumen: "Gasto · $ 850 · Súper · hoy, mar 13 oct · va a la Semana 1" */
function resumen(){
  var el=$('#vz-res');if(!el||!r)return;
  var hoy=today(),p=[],ok=true;
  if(r.intencion==='gasto'){
    var i=semanaDe(planNow(),r.fecha);
    p=['Gasto',r.monto?money(r.monto):'falta el monto',r.nota||'sin detalle',fechaTxt(r.fecha,hoy),i>=0?'va a la Semana '+(i+1):'queda fuera del plan'];
    ok=r.monto>0&&!!r.fecha&&r.fecha<=hoy;
  }else if(r.intencion==='fijo'){
    p=['Gasto fijo nuevo',r.nombre||'sin nombre',r.monto?money(r.monto)+' por mes':'falta el monto','día '+r.dia,r.cat];
    ok=r.monto>0&&!!r.nombre;
  }else if(r.intencion==='pagado'){
    var f=ctx.state.fijos.filter(function(x){return x.id===r.fijoId})[0];
    var fp=f?fijosPeriodo([f],ctx.state.plan.inicio,ctx.state.plan.cobro)[0]:null;
    p=['Marcar como pagado',f?f.nombre:'elegí el fijo',f?(fp?'vence el '+fLarga(fp.fecha):'no vence en este período'):'',f&&isPagado(ctx.state,f.id)?'ya estaba marcado':''];
    ok=!!f;
  }else if(r.intencion==='horas'){
    var mt=mesTrabajo(ctx.state),otroMes=r.fecha&&r.fecha.slice(0,7)!==mt;
    p=['Horas extra',fMin(r.min),r.tipo==='fin'?(esFeriado(r.fecha)?'feriado':'fin de semana o feriado'):'entre semana',fechaTxt(r.fecha,hoy),otroMes?'son de '+MESL[parse(r.fecha).getMonth()]+', no de este cobro':'se cobran el '+fLarga(ctx.state.plan.cobro)];
    ok=r.min>0&&!!r.fecha&&r.fecha<=hoy;
  }
  el.textContent=p.filter(Boolean).join(' · ');
  var b=$('#vz-ok');if(b)b.disabled=!ok||!pesosOk;
}

/* ---------- Guardar ---------- */
function guardar(){
  leer();
  var st=ctx.state,msg='';
  if(r.intencion==='gasto'){
    if(!(r.monto>0))return;
    st.gastos.push({id:uid(),fecha:r.fecha,monto:Math.round(r.monto*100)/100,nota:r.nota.slice(0,60),cat:r.cat,src:'voz'});
    if(r.nota&&catSugerida&&r.cat!==catSugerida)aprender(st.voz.cats,r.nota,r.cat);
    var i=semanaDe(planNow(),r.fecha);
    msg='Anotado: '+money(r.monto)+(r.nota?' en '+r.nota:'')+(i>=0?' · Semana '+(i+1):'');
  }else if(r.intencion==='fijo'){
    if(!(r.monto>0)||!r.nombre)return;
    st.fijos.push({id:uid(),nombre:r.nombre.slice(0,40),monto:r.monto,dia:r.dia,cat:r.cat});
    msg='Gasto fijo agregado: '+r.nombre;
  }else if(r.intencion==='pagado'){
    var f=st.fijos.filter(function(x){return x.id===r.fijoId})[0];if(!f)return;
    marcarPagado(st,f.id,true);
    msg=f.nombre+' marcado como pagado';
  }else if(r.intencion==='horas'){
    if(!(r.min>0))return;
    st.horas.push({id:uid(),fecha:r.fecha,tipo:r.tipo,min:r.min,src:'voz'});
    msg='Sumé '+fMin(r.min)+(r.tipo==='fin'?' de finde o feriado':' entre semana');
  }
  ctx.persist();ctx.renderAll();cerrar();toast(msg);
}

/* ---------- Consultas: responde en pantalla y en voz, sin guardar nada ---------- */
function datosConsulta(){
  var st=ctx.state,pc=planNow(),t=today(),L=liqNow(true);
  var i=semanaDe(pc,t),sem=null;
  if(i>=0){var w=pc.weeks[i],rem=diffDays(t,w.end)+1;sem={queda:w.left,porDia:Math.max(w.left,0)/Math.max(rem,1),fin:w.end,gastado:w.spent,tenias:w.avail}}
  return {semana:sem,liquido:L.liquido,cobro:st.plan.cobro,dias:diffDays(t,st.plan.cobro),fijosMes:totalFijos(st.fijos),fijosPeriodo:pc.fijos,
    minSem:mins(st,'sem'),minFin:mins(st,'fin'),extras:L.N-num(st.sueldo.nominal),ahorro:pc.ahorro,gastadoPlan:pc.spentInPlan,paraGastar:pc.gastar};
}
function responderConsulta(){
  var txt=responder(r.que,datosConsulta());
  pintar('<div class="voz-h"><h2 id="voz-t">Tu pregunta</h2><button class="btn quiet" type="button" data-v="cerrar">Cerrar</button></div>'
    +'<p class="voz-dijo">Escuché: «'+esc(r.texto)+'»</p><p class="voz-resp" aria-live="polite">'+esc(txt)+'</p>'
    +'<div class="row-btns"><button class="btn primary" type="button" data-v="cerrar">Listo</button><button class="btn quiet" type="button" data-v="repetir">Repetir</button></div>');
  decir(txt);
}
function decir(txt){
  try{
    var s=window.speechSynthesis;if(!s||!window.SpeechSynthesisUtterance)return;
    s.cancel();
    var u=new SpeechSynthesisUtterance(txt),vs=s.getVoices()||[];u.lang='es-UY';
    var v=vs.filter(function(x){return /^es[-_]UY/i.test(x.lang)})[0]||vs.filter(function(x){return /^es[-_](419|AR|MX|US)/i.test(x.lang)})[0]||vs.filter(function(x){return /^es/i.test(x.lang)})[0];
    if(v)u.voice=v;
    s.speak(u);
  }catch(e){}
}

/* ---------- La hoja se acomoda al teclado del iPhone ---------- */
function ajustarVV(){
  var vv=window.visualViewport,el=$('#voz');if(!vv||!el||el.hidden)return;
  el.style.setProperty('--kb',Math.max(0,window.innerHeight-(vv.offsetTop+vv.height))+'px');
  el.style.setProperty('--vvh',vv.height+'px');
}

export function initVoz(){
  $('#mic').addEventListener('click',abrir);
  if(window.visualViewport){window.visualViewport.addEventListener('resize',ajustarVV);window.visualViewport.addEventListener('scroll',ajustarVV)}
  var box=$('#voz');
  box.addEventListener('click',function(e){
    if(e.target===box){cerrar();return}
    var b=e.target.closest('[data-v],[data-alt],[data-vt],[data-ej]');if(!b)return;
    if(b.hasAttribute('data-ej')){var ta=$('#voz-txt');if(ta){ta.value=b.getAttribute('data-ej');entender(ta.value)}return}
    if(b.hasAttribute('data-vt')){leer();r.tipo=b.getAttribute('data-vt');box.querySelectorAll('[data-vt]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});resumen();return}
    if(b.hasAttribute('data-alt')){
      leer();var a=r.alternativas[Number(b.getAttribute('data-alt'))];if(!a)return;
      Object.assign(r,a.cambios);r.alternativas=r.alternativas.filter(function(x){return x!==a});
      if(r.intencion==='pagado')r.avisos=[];
      tarjeta();return;
    }
    var v=b.getAttribute('data-v');
    if(v==='cerrar')cerrar();
    if(v==='listo'){if(rec){try{rec.stop()}catch(er){}}}
    if(v==='teclado')escribir(MSG_TECLADO,'');
    if(v==='probar'){marcarTeclado(false);escuchar()}
    if(v==='editar'){escribir('',r?r.texto:'')}
    if(v==='pesos'){pesosOk=true;b.parentNode.remove();resumen()}
    if(v==='guardar')guardar();
    if(v==='repetir'){var p=box.querySelector('.voz-resp');if(p)decir(p.textContent)}
  });
  box.addEventListener('input',function(e){
    if(e.target.id==='vz-monto'&&r&&r.dolares&&!pesosOk){pesosOk=true;var pb=box.querySelector('[data-v="pesos"]');if(pb)pb.parentNode.remove()}
    if(e.target.closest('.voz-campos')){leer();resumen()}
  });
  box.addEventListener('submit',function(e){
    if(e.target.id!=='voz-form')return;
    e.preventDefault();var t=$('#voz-txt').value.trim();if(t)entender(t);
  });
  box.addEventListener('keydown',function(e){
    if(e.key==='Escape'){cerrar();return}
    if(e.target.id==='voz-txt'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();var t=e.target.value.trim();if(t)entender(t)}
  });
}
