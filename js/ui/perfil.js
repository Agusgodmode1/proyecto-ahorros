/* Mi perfil: asistente de 4 pasos (nombre, cómo cobrás, horas extra, descuentos).
   Se usa en el primer arranque y desde Ajustes → Mi perfil. */
import {num} from '../logica/util.js';
import {horasPorDefecto,tarifas} from '../logica/sueldo.js';
import {cobroDesde} from '../logica/plan.js';
import {ctx,$,today,esc,money2,fLarga,fMin} from './comun.js';
import {aplicarFeriados} from './feriados.js';

var d=null,paso=1,opciones=null,vio3=false;
var PASOS=['Tu nombre','Cómo cobrás','Horas extra','Descuentos'];

/* opt: {nuevo:bool, estado, alTerminar(estado), alCancelar()} */
export function abrirPerfil(n,opt){
  opciones=opt;
  var st=opt.estado,p=st.perfil,s=st.sueldo;
  d={nombre:p.nombre||'',cobro:Object.assign({tipo:'habil5',dia:30,laborableHabil:false},p.cobro),horas:Object.assign(horasPorDefecto(),{feriadoLaborable:'feriado'},p.horas),
     nominal:num(s.nominal)||'',hijos:num(s.hijos),conyuge:!!s.conyuge,otros:num(s.otros)||'',bpc:num(s.bpc)||6864,manual:!!s.tarifaManual};
  paso=n||1;vio3=false;
  $('#wiz').hidden=false;document.documentElement.classList.add('voz-abierta');
  pintar();
}
function cerrar(){$('#wiz').hidden=true;document.documentElement.classList.remove('voz-abierta')}

function hm(id,min){return '<div class="hm"><div class="field"><label for="'+id+'-h" class="sub-l">Horas</label><input id="'+id+'-h" type="number" inputmode="numeric" min="0" max="24" step="1" value="'+Math.floor(min/60)+'"></div>'
  +'<div class="field"><label for="'+id+'-m" class="sub-l">Minutos</label><input id="'+id+'-m" type="number" inputmode="numeric" min="0" max="59" step="1" value="'+(min%60)+'"></div></div>'}
function seg(nombre,val,ops){return '<div class="seg" role="group">'+ops.map(function(o){return '<button type="button" data-w="'+nombre+'" data-val="'+o[0]+'" aria-pressed="'+(String(val)===String(o[0]))+'">'+o[1]+'</button>'}).join('')+'</div>'}
function campo(id,label,input,ayuda){return '<div class="field"><label for="'+id+'">'+label+'</label>'+input+(ayuda?'<small>'+ayuda+'</small>':'')+'</div>'}
function moneyIn(id,v){return '<div class="money"><span>$</span><input id="'+id+'" type="number" inputmode="decimal" min="0" step="any" value="'+v+'"></div>'}

function pintar(){
  var h='<div class="wiz-top"><span class="note">Paso '+paso+' de 4 · '+PASOS[paso-1]+'</span>'
    +(opciones.nuevo?'':'<button class="btn quiet" type="button" data-wa="cancelar">Cancelar</button>')+'</div>'
    +'<div class="wiz-dots" aria-hidden="true">'+[1,2,3,4].map(function(i){return '<i class="'+(i<=paso?'on':'')+'"></i>'}).join('')+'</div>';
  if(paso===1){
    h+='<h1 id="wiz-t">¿Cómo te llamás?</h1><p class="welcome-sub">Lo uso para saludarte. Queda solo en este teléfono.</p>'
      +campo('w-nombre','Tu nombre','<input id="w-nombre" type="text" maxlength="30" autocomplete="given-name" value="'+esc(d.nombre)+'">');
  }else if(paso===2){
    h+='<h1 id="wiz-t">¿Cómo cobrás?</h1>'
      +campo('w-nominal','Sueldo nominal mensual',moneyIn('w-nominal',d.nominal),'El sueldo antes de descuentos, sin horas extra. Lo ves en el recibo.')
      +'<div class="field"><span class="lab">¿Qué día cobrás?</span>'+seg('cobro',d.cobro.tipo,[['habil5','5.º día hábil'],['ultimoHabil','Último día hábil'],['fijo','Un día fijo']])+'</div>'
      +(d.cobro.tipo==='fijo'?campo('w-dia','¿Qué día del mes?','<input id="w-dia" type="number" inputmode="numeric" min="1" max="31" step="1" value="'+(d.cobro.dia||1)+'">','Si el mes es más corto, uso el último día.'):'')
      +(d.cobro.tipo!=='fijo'?'<div class="field"><span class="lab">Los feriados laborables (Carnaval, Turismo, 12 de octubre…), ¿cuentan como día hábil para tu cobro?</span>'+seg('labhabil',!!d.cobro.laborableHabil,[[false,'No'],[true,'Sí']])+'<small>Si no sabés, fijate qué día cobraste un mes con feriados al principio, como abril (Turismo).</small></div>':'')
      +'<p class="note" id="w-prox"></p>';
  }else if(paso===3){
    var H=d.horas,on=H.activo!==false;
    h+='<h1 id="wiz-t">Horas extra</h1>'
      +'<label class="check wiz-big"><input id="w-sinhoras" type="checkbox"'+(on?'':' checked')+'> No hago horas extra</label>';
    if(on){
      h+='<p class="note">Te dejo como sugerencia las reglas más comunes. Cambialas si tu recibo dice otra cosa.</p>'
        +'<div class="grid2 wiz-grid">'
        +campo('w-div','Divisor de la hora normal','<input id="w-div" type="number" inputmode="numeric" min="1" step="1" value="'+H.divisor+'">','Hora normal = sueldo ÷ este número. 240 = 30 días de 8 horas.')
        +campo('w-msem','Entre semana, la hora vale','<div class="money suf"><input id="w-msem" type="number" inputmode="decimal" min="0" step="any" value="'+H.multSem+'"><span>veces</span></div>','2 = el doble de la hora normal.')
        +campo('w-mfin','Fin de semana o feriado, la hora vale','<div class="money suf"><input id="w-mfin" type="number" inputmode="decimal" min="0" step="any" value="'+H.multFin+'"><span>veces</span></div>')
        +'</div>'
        +'<div class="field"><span class="lab">En el recibo, el fin de semana viene partido en "descanso trabajado" + "bono"</span>'+seg('dividido',H.finDividido!==false,[[true,'Sí'],[false,'No']])+'</div>'
        +'<div class="field"><span class="lab">Los minutos de semana del mes se pagan</span>'+seg('redondeo',H.redondeo,[['media','A la media hora'],['cuarto','Al cuarto de hora'],['no','Sin redondear']])+'</div>'
        +'<div class="grid2 wiz-grid"><div class="field"><span class="lab">Un día cuenta como extra si estás más de</span>'+hm('w-umb',num(H.umbral))+'</div>'
        +'<div class="field"><span class="lab">y se cuenta lo que pasa de</span>'+hm('w-jor',num(H.jornada))+'</div></div>'
        +'<div class="field"><span class="lab">Si trabajás un feriado laborable (como el 12 de octubre), se paga como</span>'+seg('labpago',H.feriadoLaborable==='comun'?'comun':'feriado',[['feriado','Feriado'],['comun','Día común']])+'</div>'
        +'<div class="field"><span class="lab">Las horas de un mes las cobrás</span>'+seg('mescobro',H.mesCobro,[['siguiente','El mes siguiente'],['mismo','Ese mismo mes']])+'</div>'
        +(d.manual?'<p class="voz-msg">Tenías valores por hora cargados a mano. Al guardar, se calculan con estas reglas.</p>':'')
        +'<p class="voz-res" id="w-prev"></p>';
    }
  }else{
    h+='<h1 id="wiz-t">Descuentos</h1><p class="welcome-sub">Para calcular cuánto te queda en mano: BPS, FONASA, FRL e IRPF.</p>'
      +'<div class="grid2 wiz-grid">'
      +campo('w-hijos','Hijos menores de 18 a cargo','<input id="w-hijos" type="number" inputmode="numeric" min="0" max="10" step="1" value="'+(d.hijos||0)+'">')
      +campo('w-otros','Otros descuentos fijos',moneyIn('w-otros',d.otros),'Sindicato, préstamo o una cuota del recibo.')
      +campo('w-bpc','Valor de la BPC',moneyIn('w-bpc',d.bpc),'BPC 2026: $ 6.864. Cambiala si el BPS publica otro valor.')
      +'</div>'
      +'<label class="check wiz-big"><input id="w-cony" type="checkbox"'+(d.conyuge?' checked':'')+'> Tengo cónyuge o concubino/a sin cobertura de salud propia (suma 2% al FONASA)</label>';
  }
  h+='<p class="err" id="w-err" role="alert" hidden></p><div class="row-btns wiz-acc">'
    +(paso>1?'<button class="btn" type="button" data-wa="atras">Atrás</button>':(opciones.nuevo&&opciones.alCancelar?'<button class="btn quiet" type="button" data-wa="cancelar">Volver</button>':''))
    +(paso<4?'<button class="btn primary" type="button" data-wa="sig">Siguiente</button>':'<button class="btn primary" type="button" data-wa="fin">'+(opciones.nuevo?'Listo, empezar':'Guardar')+'</button>')
    +(!opciones.nuevo&&paso<4?'<button class="btn quiet" type="button" data-wa="fin">Guardar</button>':'')+'</div>';
  $('#wiz-box').innerHTML=h;if(paso===3)vio3=true;
  previa();
  $('#wiz').scrollTop=0;
  var f=$('#wiz-box input[type=text],#wiz-box input[type=number]');if(f&&paso===1)try{f.focus()}catch(e){}
}
function v(id){var e=$('#'+id);return e?e.value:null}
function leerHM(id){return Math.max(0,Math.round(num(v(id+'-h'))))*60+Math.max(0,Math.round(num(v(id+'-m'))))}
/* Lee lo que hay en la pantalla del paso actual */
function leer(){
  if(paso===1)d.nombre=v('w-nombre').trim().slice(0,30);
  if(paso===2){d.nominal=num(v('w-nominal'));if(d.cobro.tipo==='fijo'&&$('#w-dia'))d.cobro.dia=Math.min(31,Math.max(1,Math.round(num(v('w-dia')))||1))}
  if(paso===3&&d.horas.activo!==false&&$('#w-div')){
    var H=d.horas;
    H.divisor=num(v('w-div'))||240;H.multSem=num(v('w-msem'));H.multFin=num(v('w-mfin'));
    H.umbral=leerHM('w-umb');H.jornada=leerHM('w-jor');
  }
  if(paso===4){d.hijos=Math.max(0,Math.round(num(v('w-hijos'))));d.otros=num(v('w-otros'));d.bpc=num(v('w-bpc'))||6864;d.conyuge=$('#w-cony').checked}
}
function previa(){
  if(paso===2){var el=$('#w-prox');if(el){
    /* Calcula con las opciones que estás eligiendo y después vuelve a las guardadas */
    var st=opciones.estado;aplicarFeriados({feriados:st.feriados,perfil:{cobro:d.cobro,horas:d.horas}});
    var f=cobroDesde(today(),d.cobro);aplicarFeriados(ctx.state||st);
    el.textContent='Tu próximo cobro sería el '+fLarga(f)+'.'}}
  if(paso===3){
    var el2=$('#w-prev');if(!el2)return;
    var t=tarifas({sueldo:{nominal:num(d.nominal)},perfil:{horas:d.horas}});
    el2.textContent=num(d.nominal)>0?'Con estas reglas: hora normal '+money2(t.hora)+' · extra de semana '+money2(t.heCom)+' · finde o feriado '+money2(t.heEsp+t.bonoHora)+'.':'Cargá tu sueldo en el paso 2 para ver cuánto vale cada hora.';
  }
}
function error(m){var e=$('#w-err');e.textContent=m;e.hidden=!m}
function valida(){
  if(paso===1&&!d.nombre){error('Escribí tu nombre.');return false}
  if(paso===2&&!(d.nominal>0)){error('Escribí tu sueldo nominal.');return false}
  if(paso===3&&d.horas.activo!==false&&(!(d.horas.divisor>0)||!(d.horas.multSem>0)||!(d.horas.multFin>0))){error('Revisá el divisor y los multiplicadores.');return false}
  return true;
}
function terminar(){
  var st=opciones.estado,p=st.perfil,s=st.sueldo;
  var reglasAntes=JSON.stringify(p.horas),cobroAntes=JSON.stringify(p.cobro);
  p.nombre=d.nombre;p.cobro=d.cobro;p.horas=d.horas;p.hecho=true;
  s.nominal=num(d.nominal);s.hijos=d.hijos;s.conyuge=d.conyuge;s.otros=num(d.otros);s.bpc=d.bpc;
  if(s.tarifaManual&&vio3)s.tarifaManual=null;
  aplicarFeriados(st);
  if(opciones.nuevo){st.plan.inicio=today();st.plan.cobro=cobroDesde(today(),d.cobro)}
  else if(JSON.stringify(d.cobro)!==cobroAntes)st.plan.cobro=cobroDesde(st.plan.inicio,d.cobro);
  cerrar();opciones.alTerminar(st);
}

export function initPerfil(){
  var box=$('#wiz');
  box.addEventListener('click',function(e){
    var b=e.target.closest('[data-w],[data-wa]');if(!b)return;
    if(b.hasAttribute('data-w')){
      leer();
      var k=b.getAttribute('data-w'),val=b.getAttribute('data-val');
      if(k==='cobro')d.cobro.tipo=val;
      if(k==='dividido')d.horas.finDividido=val==='true';
      if(k==='redondeo')d.horas.redondeo=val;
      if(k==='mescobro')d.horas.mesCobro=val;
      if(k==='labhabil')d.cobro.laborableHabil=val==='true';
      if(k==='labpago')d.horas.feriadoLaborable=val;
      pintar();return;
    }
    var a=b.getAttribute('data-wa');
    if(a==='cancelar'){cerrar();if(opciones.alCancelar)opciones.alCancelar();return}
    leer();error('');
    if(a==='atras'){paso--;pintar();return}
    if(!valida())return;
    if(a==='sig'){paso++;pintar();return}
    if(a==='fin'){
      /* Al guardar desde la mitad, controla también los pasos con datos obligatorios */
      if(!d.nombre){paso=1;pintar();error('Escribí tu nombre.');return}
      if(!(num(d.nominal)>0)){paso=2;pintar();error('Escribí tu sueldo nominal.');return}
      terminar();
    }
  });
  box.addEventListener('change',function(e){
    if(e.target.id==='w-sinhoras'){leer();d.horas.activo=!e.target.checked;pintar()}
  });
  box.addEventListener('input',function(e){if(paso===3||paso===2){leer();previa()}});
}

/* Resumen para Ajustes */
export function resumenPerfil(st){
  var p=st.perfil,H=p.horas,c=p.cobro;
  var cobro=c.tipo==='ultimoHabil'?'el último día hábil':c.tipo==='fijo'?'el día '+c.dia:'el 5.º día hábil';
  return (p.nombre?'<b>'+esc(p.nombre)+'</b> · ':'')+'cobrás '+cobro+' · '
    +(H.activo===false?'sin horas extra':'hora normal = sueldo ÷ '+num(H.divisor)+', extra ×'+String(H.multSem).replace('.',',')+', finde ×'+String(H.multFin).replace('.',',')+', cuenta si pasás '+fMin(num(H.umbral)));
}

