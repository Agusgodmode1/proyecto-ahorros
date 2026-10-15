/* Configuración inicial guiada (plata de hoy, meta de ahorro, gastos fijos) y "Mis datos".
   Una pregunta por pantalla, con barra de progreso. Todo se guarda en el mismo estado que usa el resto de la app:
   al terminar se recalcula todo. */
import {num,uid} from '../logica/util.js';
import {diffDays} from '../logica/fechas.js';
import {planCalc} from '../logica/plan.js';
import {disponible,ajustarSaldo,previaSaldo} from '../logica/saldo.js';
import {liq} from '../logica/sueldo.js';
import {atajosMeta,resumenInicio} from '../logica/inicio.js';
import {abrirPerfil} from './perfil.js';
import {marcarTour} from './tour.js';
import {ctx,$,today,money,esc,fLarga} from './comun.js';

var TIT=['Plata de hoy','Tu meta de ahorro','Gastos fijos'];
var o=null,st=null,paso=1,D={saldo:'',meta:''};

function cerrar(){$('#cfg').hidden=true;document.documentElement.classList.remove('voz-abierta')}
function moneyIn(id,v){return '<div class="money"><span>$</span><input id="'+id+'" type="number" inputmode="decimal" min="0" step="any" value="'+esc(v)+'"></div>'}
function liquido(){try{return liq(st,false).liquido||0}catch(e){return 0}}

/* opt: {nuevo, estado, alAtras(), alTerminar(estado), alCancelar()} */
export function abrirInicio(opt){
  o=opt;st=opt.estado;paso=1;
  if(o.nuevo)D={saldo:'',meta:''};
  else{
    var pc=planCalc(st),p=st.plan;
    D={saldo:String(Math.round(Math.max(0,disponible(st,pc)))),meta:String(Math.round(p.modo==='monto'?num(p.ahorro):num(p.monto)*num(p.pct)/100))};
  }
  $('#cfg').hidden=false;document.documentElement.classList.add('voz-abierta');
  pintar();
}
function leer(){
  var s=$('#c-saldo'),m=$('#c-meta');
  if(s)D.saldo=s.value;if(m)D.meta=m.value;
}
function error(m){var e=$('#c-err');if(e){e.textContent=m||'';e.hidden=!m}}
function pintar(){
  var N=o.nuevo?7:3,k=(o.nuevo?4:0)+paso,fin=paso===4,h;
  h='<div class="wiz-top"><span class="note">'+(fin?'Listo':'Paso '+k+' de '+N+' · '+TIT[paso-1])+'</span>'
    +(o.nuevo?'':'<button class="btn quiet" type="button" data-ca="cancelar">Cancelar</button>')+'</div>'
    +'<div class="wiz-dots" aria-hidden="true" style="grid-template-columns:repeat('+N+',1fr)">'+Array.apply(null,Array(N)).map(function(_,i){return '<i class="'+(fin||i<k?'on':'')+'"></i>'}).join('')+'</div>';
  if(paso===1){
    h+='<h1 id="cfg-t">¿Cuánta plata tenés hoy?</h1><p class="welcome-sub">'+(o.nuevo?'Sumá lo que tenés en la cuenta y en efectivo. Con eso armo tu plan hasta que cobres el '+esc(fLarga(st.plan.cobro))+'.':'Poné lo que tenés de verdad ahora. Lo que ya anotaste se recalcula solo.')+'</p>'
      +'<div class="field"><label for="c-saldo" class="sub-l">Tengo hoy</label>'+moneyIn('c-saldo',D.saldo)+'</div>';
  }else if(paso===2){
    var at=atajosMeta(liquido());
    h+='<h1 id="cfg-t">¿Cuánto querés ahorrar este mes?</h1><p class="welcome-sub">Elegí un atajo o escribí tu monto. Lo podés cambiar cuando quieras.</p>'
      +(at.length?'<div class="seg" role="group" aria-label="Atajos de ahorro">'+at.map(function(a){return '<button type="button" data-ca="atajo" data-val="'+a.monto+'" aria-pressed="'+(num(D.meta)===a.monto)+'">'+a.pct+' % · '+money(a.monto)+'</button>'}).join('')+'</div><small class="note">Es el 10, 20 o 30 % de lo que cobrás.</small>':'')
      +'<div class="field"><label for="c-meta" class="sub-l">Quiero ahorrar</label>'+moneyIn('c-meta',D.meta)+'<small id="c-meta-nota"></small></div>';
  }else if(paso===3){
    h+='<h1 id="cfg-t">Tus gastos fijos</h1><p class="welcome-sub">Alquiler, celular, internet… Los descuento antes de calcular cuánto podés gastar. Es opcional: los podés cargar después.</p>';
    if(st.fijos.length)h+='<ul class="list cfg-fijos">'+st.fijos.map(function(f,i){return '<li><div class="gi-main"><span class="gi-nota">'+esc(f.nombre)+'</span><span class="amt">'+money(num(f.monto))+'</span></div><div class="gi-sub"><span class="src">el día '+esc(f.dia)+'</span><button class="btn sm quiet" type="button" data-ca="delf" data-i="'+i+'">Quitar</button></div></li>'}).join('')+'</ul>';
    h+='<div class="cfg-fform"><div class="field"><label for="c-fn" class="sub-l">¿Qué es?</label><input id="c-fn" type="text" maxlength="40" placeholder="Alquiler, celular, internet"></div>'
      +'<div class="field"><label for="c-fm" class="sub-l">¿Cuánto por mes?</label>'+moneyIn('c-fm','')+'</div>'
      +'<div class="field"><label for="c-fd" class="sub-l">¿Qué día se paga?</label><input id="c-fd" type="number" inputmode="numeric" min="1" max="31" step="1" placeholder="10"></div>'
      +'<button class="btn" type="button" data-ca="addf">Agregar este gasto fijo</button></div>';
  }else{
    var R=resumenInicio(st,num(D.saldo),num(D.meta));
    h+='<h1 id="cfg-t">Tu plan está listo</h1>'
      +'<div class="cfg-res"><span class="cfg-l">Te queda para gastar</span><b class="cfg-n">'+money(R.gastar)+'</b><span class="cfg-s">'+money(R.porDia)+' por día durante '+R.dias+' '+(R.dias===1?'día':'días')+', hasta el '+esc(fLarga(st.plan.cobro))+'</span></div>'
      +'<div class="receipt">'
      +'<div class="row"><span class="l">Plata de hoy</span><span class="d"></span><span class="v">'+money(num(D.saldo))+'</span></div>'
      +'<div class="row sub minus"><span class="l">Gastos fijos</span><span class="d"></span><span class="v">− '+money(R.fijos)+'</span></div>'
      +'<div class="row sub save"><span class="l">Lo que ahorrás</span><span class="d"></span><span class="v">− '+money(Math.min(num(D.meta),Math.max(0,R.maxAhorro)))+'</span></div></div>';
    if(!R.ok)h+='<div class="banner alerta" role="alert"><p><b>Esa meta no se puede.</b> Tenés '+money(num(D.saldo))+' y, después de los fijos, lo máximo que podés ahorrar es '+money(R.metaPosible)+'. Te propongo esa.</p></div>';
  }
  h+='<p class="err" id="c-err" role="alert" hidden></p><div class="row-btns wiz-acc">';
  if(paso>1&&paso<4)h+='<button class="btn" type="button" data-ca="atras">Atrás</button>';
  else if(paso===1&&o.nuevo&&o.alAtras)h+='<button class="btn" type="button" data-ca="atras">Atrás</button>';
  if(paso===4){
    var Rr=resumenInicio(st,num(D.saldo),num(D.meta));
    if(!Rr.ok)h+='<button class="btn" type="button" data-ca="meta">Cambiar la meta</button><button class="btn primary" type="button" data-ca="posible">Usar '+money(Rr.metaPosible)+(o.nuevo?' e ir a mi plan':'')+'</button>';
    else h+='<button class="btn" type="button" data-ca="atras4">Atrás</button><button class="btn primary" type="button" data-ca="fin">'+(o.nuevo?'Ir a mi plan':'Guardar')+'</button>';
  }else h+='<button class="btn primary" type="button" data-ca="sig">'+(paso===3&&!st.fijos.length?'Lo cargo después':'Siguiente')+'</button>';
  h+='</div>';
  $('#cfg-box').innerHTML=h;$('#cfg').scrollTop=0;
  if(paso===2)notaMeta();
  var f=$('#cfg-box input[type=number]');if(f&&(paso===1||paso===2))try{f.focus()}catch(e){}
}
/* Mientras escribís la meta: avisa si no se puede */
function notaMeta(){
  var n=$('#c-meta-nota');if(!n)return;
  leer();
  var s=num(D.saldo),m=num(D.meta);
  if(m>0&&s>0&&m>s){n.className='err';n.textContent='Tenés '+money(s)+': no podés ahorrar más que eso. Probá con '+money(Math.floor(s))+' o menos.'}
  else{n.className='';n.textContent=m>0&&s>0?'Es el '+(Math.round(m/s*1000)/10).toLocaleString('es-UY')+' % de lo que tenés hoy.':''}
  document.querySelectorAll('#cfg-box [data-ca="atajo"]').forEach(function(b){b.setAttribute('aria-pressed',String(num(b.getAttribute('data-val'))===m))});
}
function valida(){
  if(paso===1&&(D.saldo===''||!(num(D.saldo)>0))){error('Escribí cuánta plata tenés hoy.');return false}
  if(paso===2&&!(num(D.meta)>0)){error('Escribí cuánto querés ahorrar este mes.');return false}
  return true;
}
function aplicar(meta){
  var p=st.plan,real=Math.max(0,num(D.saldo));
  if(o.nuevo){p.monto=Math.round(real);p.inicio=today()}
  else{
    var pv=previaSaldo(st,real,today());
    if(pv.tipo==='fuera')p.monto=Math.round(real);
    else if(pv.tipo!=='igual'&&pv.tipo!=='invalido')ajustarSaldo(st,real,today());
  }
  p.modo='monto';p.ahorro=Math.round(Math.max(0,meta));
  cerrar();o.alTerminar(st);
}
export function initInicio(){
  var box=$('#cfg');
  box.addEventListener('input',function(e){if(paso===2&&e.target.id==='c-meta')notaMeta()});
  box.addEventListener('click',function(e){
    var b=e.target.closest('[data-ca]');if(!b)return;
    var a=b.getAttribute('data-ca');
    if(a==='cancelar'){cerrar();if(o.alCancelar)o.alCancelar();return}
    leer();error('');
    if(a==='atajo'){D.meta=b.getAttribute('data-val');var m=$('#c-meta');if(m)m.value=D.meta;notaMeta();return}
    if(a==='addf'){
      var n=($('#c-fn').value||'').trim(),m2=num($('#c-fm').value),d=Math.min(31,Math.max(1,Math.round(num($('#c-fd').value))||1));
      if(!n){error('Escribí qué es el gasto.');return}
      if(!(m2>0)){error('Escribí cuánto es por mes.');return}
      st.fijos.push({id:uid(),nombre:n.slice(0,40),monto:m2,dia:d,cat:'Otros'});pintar();return;
    }
    if(a==='delf'){st.fijos.splice(Number(b.getAttribute('data-i')),1);pintar();return}
    if(a==='atras'){
      if(paso===1){cerrar();if(o.alAtras)o.alAtras();return}
      paso--;pintar();return;
    }
    if(a==='atras4'){paso=3;pintar();return}
    if(a==='meta'){paso=2;pintar();return}
    if(a==='sig'){if(!valida())return;paso++;pintar();return}
    if(a==='posible'){aplicar(resumenInicio(st,num(D.saldo),num(D.meta)).metaPosible);return}
    if(a==='fin'){aplicar(num(D.meta))}
  });
}
/* Primera vez: perfil (4 pasos) y luego esta configuración (3 pasos), en un solo recorrido de 7 pasos */
export function flujoNuevo(estado,listo,alCancelar){
  function perfil(n){abrirPerfil(n,{nuevo:true,estado:estado,alCancelar:alCancelar,alTerminar:function(){config()}})}
  function config(){abrirInicio({nuevo:true,estado:estado,alAtras:function(){perfil(4)},alTerminar:function(s){marcarTour();listo(s)}})}
  perfil(1);
}
