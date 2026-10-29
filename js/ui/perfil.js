/* Mi perfil: asistente de 4 pasos (nombre, cómo cobrás, horas extra, descuentos).
   Se usa en el primer arranque y desde Ajustes → Mi perfil. */
import {num,uid} from '../logica/util.js';
import {horasPorDefecto,tarifas,TIPOS_INGRESO} from '../logica/sueldo.js';
import {cobroDesde} from '../logica/plan.js';
import {ctx,$,today,esc,money2,fLarga,fMin} from './comun.js';
import {aplicarFeriados} from './feriados.js';
import {PUESTOS,puesto} from '../logica/puestos.js';
import {facturaBase} from '../logica/factura.js';
/* «Cobro con factura» (2.12) se elige como un tipo más; se guarda como ingreso independiente con factura:true
   (así el cálculo de siempre, en sueldo.js, lo trata como independiente: sin horas extra ni aguinaldo) */
var TIPOS=TIPOS_INGRESO.concat([['factura','Cobro con factura']]);
/* (2.26) Dos formas de cobrar, las dos por mes: sueldo (en Uruguay o con mis descuentos) o factura mensual.
   «Independiente o variable» solo se ofrece a quien ya lo tenía elegido (no se le cambia nada). */
var NOMBRE_TIPO={uy:'Sueldo en Uruguay',personalizado:'Sueldo con mis descuentos',variable:'Independiente o variable',factura:'Factura mensual'};
function tiposPara(ti){return TIPOS.filter(function(t){return t[0]!=='variable'||ti==='variable'}).map(function(t){return [t[0],NOMBRE_TIPO[t[0]]||t[1]]})}
export function nombreTipo(st){var i=st.perfil&&st.perfil.ingreso||{};return NOMBRE_TIPO[i.factura?'factura':i.tipo||'uy']}
function sinHoras(t){return t==='variable'||t==='factura'}

var d=null,paso=1,opciones=null,vio3=false;
var PASOS=['Tu nombre','Cómo cobrás','Horas extra','Descuentos'];

/* opt: {nuevo:bool, estado, alTerminar(estado), alCancelar()} */
export function abrirPerfil(n,opt){
  opciones=opt;
  var st=opt.estado,p=st.perfil,s=st.sueldo;
  d={nombre:p.nombre||'',cobro:Object.assign({tipo:'habil5',dia:30,laborableHabil:true},p.cobro),horas:Object.assign(horasPorDefecto(),{feriadoLaborable:'comun'},p.horas),
     ingreso:Object.assign({tipo:'uy',moneda:'UYU'},p.ingreso),descuentos:JSON.parse(JSON.stringify(Array.isArray(s.descuentos)?s.descuentos:[])),
     puesto:p.puesto||'otro',nominal:num(s.nominal)||'',hijos:num(s.hijos),conyuge:!!s.conyuge,otros:num(s.otros)||'',bpc:num(s.bpc)||6864,manual:!!s.tarifaManual};
  if(p.ingreso&&p.ingreso.factura)d.ingreso.tipo='factura';
  paso=n||1;vio3=false;
  $('#wiz').hidden=false;document.documentElement.classList.add('voz-abierta');
  pintar();
}
function cerrar(){$('#wiz').hidden=true;document.documentElement.classList.remove('voz-abierta')}

function hm(id,min){return '<div class="hm"><div class="field"><label for="'+id+'-h" class="sub-l">Horas</label><input id="'+id+'-h" type="number" inputmode="numeric" min="0" max="24" step="1" value="'+Math.floor(min/60)+'"></div>'
  +'<div class="field"><label for="'+id+'-m" class="sub-l">Minutos</label><input id="'+id+'-m" type="number" inputmode="numeric" min="0" max="59" step="1" value="'+(min%60)+'"></div></div>'}
function seg(nombre,val,ops){return '<div class="seg" role="group">'+ops.map(function(o){return '<button type="button" data-w="'+nombre+'" data-val="'+o[0]+'" aria-pressed="'+(String(val)===String(o[0]))+'">'+o[1]+'</button>'}).join('')+'</div>'}
function campo(id,label,input,ayuda){return '<div class="field"><label for="'+id+'">'+label+'</label>'+input+(ayuda?'<small>'+ayuda+'</small>':'')+'</div>'}
function moneyIn(id,v,usd){return '<div class="money"><span>'+(usd?'US$':'$')+'</span><input id="'+id+'" type="number" inputmode="decimal" min="0" step="any" value="'+v+'"></div>'}
var AYUDA_TIPO={uy:'Con BPS, FONASA, FRL e IRPF, como en un recibo de sueldo de Uruguay.',
  personalizado:'Ponés tu sueldo y tus descuentos a mano (en pesos o en %), sin las reglas de Uruguay.',
  variable:'Freelance o comisiones: cada mes cargás lo que cobraste y el plan usa ese valor.',
  factura:'Empresa o unipersonal que factura una vez por mes: cargás tus facturas y tus costos (BPS, FONASA, IVA, contador) y te digo cuánto te queda.'};
var NOMINAL_TXT={uy:['Sueldo nominal mensual','El sueldo antes de descuentos, sin horas extra. Lo ves en el recibo.'],
  personalizado:['Sueldo mensual, antes de tus descuentos','Si solo sabés lo que te queda en mano, ponelo acá y dejá los descuentos vacíos.'],
  variable:['¿Cuánto cobrás en un mes normal?','En mano. Lo uso hasta que cargues lo que cobraste de verdad cada mes, en la pestaña Sueldo.'],
  factura:['¿Cuánto facturás en un mes normal (sin IVA)?','Lo uso hasta que cargues las facturas de cada mes, en la pestaña Sueldo.']};
function filaDesc(x,i,usd){
  return '<li class="desc-fila"><input type="text" maxlength="30" data-desc="'+i+'" data-k="nombre" value="'+esc(x.nombre||'')+'" placeholder="Nombre (aportes, sindicato…)" aria-label="Nombre del descuento">'
    +'<div class="desc-v"><input type="number" inputmode="decimal" min="0" step="any" data-desc="'+i+'" data-k="valor" value="'+(x.valor===undefined||x.valor===''?'':x.valor)+'" aria-label="Valor del descuento">'
    +'<div class="seg" role="group" aria-label="En porcentaje o en pesos"><button type="button" data-dt="'+i+'" data-val="pct" aria-pressed="'+(x.tipo==='pct')+'">%</button><button type="button" data-dt="'+i+'" data-val="monto" aria-pressed="'+(x.tipo!=='pct')+'">'+(usd?'US$':'$')+'</button></div>'
    +'<button class="btn quiet" type="button" data-dq="'+i+'" aria-label="Quitar este descuento">Quitar</button></div></li>';
}

function pintar(){
  var h='<div class="wiz-top"><span class="note">Paso '+paso+' de '+(opciones.nuevo?7:4)+' · '+PASOS[paso-1]+'</span>'
    +(opciones.nuevo?'':'<button class="btn quiet" type="button" data-wa="cancelar">Cancelar</button>')+'</div>'
    +'<div class="wiz-dots" aria-hidden="true" style="grid-template-columns:repeat('+(opciones.nuevo?7:4)+',1fr)">'+(opciones.nuevo?[1,2,3,4,5,6,7]:[1,2,3,4]).map(function(i){return '<i class="'+(i<=paso?'on':'')+'"></i>'}).join('')+'</div>';
  if(paso===1){
    h+='<h1 id="wiz-t">¿Cómo te llamás?</h1><p class="welcome-sub">Lo uso para saludarte. Queda solo en este teléfono.</p>'
      +campo('w-nombre','Tu nombre','<input id="w-nombre" type="text" maxlength="30" autocomplete="given-name" value="'+esc(d.nombre)+'">');
  }else if(paso===2){
    var ti=d.ingreso.tipo,usd=ti!=='uy'&&d.ingreso.moneda==='USD';
    h+='<h1 id="wiz-t">¿Cómo cobrás?</h1>'
      +'<div class="field"><span class="lab">¿Qué cobrás cada mes?</span>'+seg('tipo',ti,tiposPara(ti))+'<small>'+AYUDA_TIPO[ti]+'</small></div>'
      +(ti!=='uy'?'<div class="field"><span class="lab">¿En qué moneda cobrás?</span>'+seg('moneda',d.ingreso.moneda,[['UYU','Pesos'],['USD','Dólares']])+(usd?'<small>Lo paso a pesos con la cotización del dólar que cargás en Ajustes.</small>':'')+'</div>':'')
      +campo('w-nominal',NOMINAL_TXT[ti][0],moneyIn('w-nominal',d.nominal,usd),NOMINAL_TXT[ti][1])
      +'<div class="field"><span class="lab">¿Qué día cobrás?</span>'+seg('cobro',d.cobro.tipo,[['habil5','5.º día hábil'],['ultimoHabil','Último día hábil'],['fijo','Un día fijo']])+'</div>'
      +(d.cobro.tipo==='fijo'?campo('w-dia','¿Qué día del mes?','<input id="w-dia" type="number" inputmode="numeric" min="1" max="31" step="1" value="'+(d.cobro.dia||1)+'">','Si el mes es más corto, uso el último día.'):'')
      +(d.cobro.tipo!=='fijo'?'<div class="field"><span class="lab">Los feriados laborables (Carnaval, Turismo, 12 de octubre…), ¿cuentan como día hábil para tu cobro?</span>'+seg('labhabil',d.cobro.laborableHabil!==false,[[true,'Sí, son días comunes'],[false,'No']])+'<small>En Uruguay solo 5 feriados son no laborables: 1/1, 1/5, 18/7, 25/8 y 25/12. Los demás son días comunes.</small></div>':'')
      +'<p class="note" id="w-prox"></p>';
  }else if(paso===3){
    var H=d.horas,on=H.activo!==false,variable=sinHoras(d.ingreso.tipo);
    h+='<h1 id="wiz-t">Horas extra</h1>';
    if(variable)h+='<p class="welcome-sub">'+(d.ingreso.tipo==='factura'?'Cobrando con factura no cuento horas extra: lo que facturás ya las incluye.':'Con ingreso variable no cuento horas extra: lo que cobrás cada mes ya las incluye.')+' Seguí al último paso.</p>';
    else h+='<label class="check wiz-big"><input id="w-sinhoras" type="checkbox"'+(on?'':' checked')+'> No hago horas extra</label>';
    if(on&&!variable){
      var P=puesto(d.puesto);
      h+='<div class="field"><span class="lab">¿Cuál es tu puesto?</span>'+seg('puesto',d.puesto,PUESTOS.map(function(x){return [x.id,x.nombre]}).concat([['otro','Otro (a medida)']]))
        +'<small>'+(P?esc(P.detalle)+' Ya cargué esas reglas; cambialas abajo si tu recibo dice otra cosa.':'Te dejo como sugerencia las reglas más comunes. Cambialas si tu recibo dice otra cosa.')+'</small></div>'
        +'<div class="grid2 wiz-grid">'
        +campo('w-ent','Entrás a las','<input id="w-ent" type="time" value="'+esc(H.entrada||'12:00')+'">')
        +campo('w-sal','Salís a las','<input id="w-sal" type="time" value="'+esc(H.salida||'21:00')+'">')
        +'</div>'
        +'<div class="grid2 wiz-grid">'
        +campo('w-div','Divisor de la hora normal','<input id="w-div" type="number" inputmode="numeric" min="1" step="1" value="'+H.divisor+'">','Hora normal = sueldo ÷ este número. 240 = 30 días de 8 horas.')
        +campo('w-msem','Entre semana, la hora vale','<div class="money suf"><input id="w-msem" type="number" inputmode="decimal" min="0" step="any" value="'+H.multSem+'"><span>veces</span></div>','2 = el doble de la hora normal.')
        +campo('w-mfin','Fin de semana o feriado, la hora vale','<div class="money suf"><input id="w-mfin" type="number" inputmode="decimal" min="0" step="any" value="'+H.multFin+'"><span>veces</span></div>')
        +'</div>'
        +'<div class="field"><span class="lab">En el recibo, el fin de semana viene partido en "descanso trabajado" + "bono"</span>'+seg('dividido',H.finDividido!==false,[[true,'Sí'],[false,'No']])+'</div>'
        +'<div class="field"><span class="lab">Los minutos de semana del mes se pagan</span>'+seg('redondeo',H.redondeo,[['media','A la media hora'],['cuarto','Al cuarto de hora'],['no','Sin redondear']])+'</div>'
        +campo('w-min','Entre semana, las extras cuentan desde','<div class="money suf"><input id="w-min" type="number" inputmode="numeric" min="0" max="120" step="1" value="'+Math.max(0,num(H.umbral)-num(H.jornada))+'"><span>min</span></div>','Sumando lo que llegás antes y lo que te quedás después, en el día.')
        +'<div class="field"><span class="lab">Si trabajás un feriado laborable (como el 12 de octubre), se paga como</span>'+seg('labpago',H.feriadoLaborable==='feriado'?'feriado':'comun',[['comun','Día común'],['feriado','Feriado']])+'</div>'
        +'<div class="field"><span class="lab">Las horas de un mes las cobrás</span>'+seg('mescobro',H.mesCobro,[['siguiente','El mes siguiente'],['mismo','Ese mismo mes']])+'</div>'
        +(d.manual?'<p class="voz-msg">Tenías valores por hora cargados a mano. Al guardar, se calculan con estas reglas.</p>':'')
        +'<p class="voz-res" id="w-prev"></p>';
    }
  }else if(d.ingreso.tipo==='personalizado'){
    var u=d.ingreso.moneda==='USD';
    h+='<h1 id="wiz-t">Descuentos</h1><p class="welcome-sub">Lo que te descuentan cada mes. Un % se calcula sobre todo lo que ganás (con horas extra); un monto fijo se resta igual todos los meses.</p>'
      +(d.descuentos.length?'<ul class="desc-lista">'+d.descuentos.map(function(x,i){return filaDesc(x,i,u)}).join('')+'</ul>':'<p class="note">Sin descuentos: lo que pusiste es lo que cobrás.</p>')
      +'<div class="row-btns"><button class="btn" type="button" data-dadd>Agregar un descuento</button></div>';
  }else if(d.ingreso.tipo==='factura'){
    h+='<h1 id="wiz-t">Costos</h1><p class="welcome-sub">Tus costos de cada mes (aporte a BPS, FONASA, IVA, contador) y tus facturas se cargan en la pestaña Sueldo → «Tus facturas y costos». Ahí te digo cuánto te queda.</p><p class="note">No reemplaza a tu contador: es para planificar.</p>';
  }else if(d.ingreso.tipo==='variable'){
    h+='<h1 id="wiz-t">Descuentos</h1><p class="welcome-sub">Con ingreso variable cargás lo que te queda en mano cada mes, así que no hay descuentos que calcular. Listo.</p>';
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
    +(paso<4?'<button class="btn primary" type="button" data-wa="sig">Siguiente</button>':'<button class="btn primary" type="button" data-wa="fin">'+(opciones.nuevo?'Siguiente':'Guardar')+'</button>')
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
    if($('#w-ent'))H.entrada=v('w-ent')||'12:00';if($('#w-sal'))H.salida=v('w-sal')||'21:00';
    /* La jornada sale del horario; el umbral es jornada + el mínimo de minutos extra */
    var e=String(H.entrada).split(':'),sa=String(H.salida).split(':'),jor=(Number(sa[0])*60+Number(sa[1]))-(Number(e[0])*60+Number(e[1]));
    if(jor<=0)jor+=1440;
    H.jornada=jor;H.umbral=jor+Math.max(0,Math.round(num(v('w-min'))));
  }
  if(paso===4&&d.ingreso.tipo==='personalizado')document.querySelectorAll('#wiz-box [data-desc]').forEach(function(el){
    var x=d.descuentos[Number(el.getAttribute('data-desc'))];if(!x)return;
    var k=el.getAttribute('data-k');x[k]=k==='valor'?(el.value===''?'':num(el.value)):el.value.trim().slice(0,30);
  });
  if(paso===4&&$('#w-hijos')){d.hijos=Math.max(0,Math.round(num(v('w-hijos'))));d.otros=num(v('w-otros'));d.bpc=num(v('w-bpc'))||6864;d.conyuge=$('#w-cony').checked}
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
  if(paso===2&&!(d.nominal>0)){error(d.ingreso.tipo==='variable'?'Escribí cuánto cobrás en un mes normal.':d.ingreso.tipo==='factura'?'Escribí cuánto facturás en un mes normal.':'Escribí tu sueldo.');return false}
  if(paso===3&&d.horas.activo!==false&&(!(d.horas.divisor>0)||!(d.horas.multSem>0)||!(d.horas.multFin>0))){error('Revisá el divisor y los multiplicadores.');return false}
  return true;
}
function terminar(){
  var st=opciones.estado,p=st.perfil,s=st.sueldo;
  var reglasAntes=JSON.stringify(p.horas),cobroAntes=JSON.stringify(p.cobro);
  p.nombre=d.nombre;p.cobro=d.cobro;p.horas=d.horas;p.puesto=d.puesto;p.hecho=true;
  p.ingreso=d.ingreso.tipo==='factura'?{tipo:'variable',factura:true,moneda:d.ingreso.moneda}:{tipo:d.ingreso.tipo,moneda:d.ingreso.tipo==='uy'?'UYU':d.ingreso.moneda};
  if(d.ingreso.tipo==='factura'&&!s.factura)s.factura=facturaBase();
  s.descuentos=d.descuentos.filter(function(x){return num(x.valor)>0}).map(function(x){return {id:x.id||uid(),nombre:x.nombre||'Descuento',tipo:x.tipo==='pct'?'pct':'monto',valor:num(x.valor)}});
  if(!s.ingresosMes)s.ingresosMes={};
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
    var b=e.target.closest('[data-w],[data-wa],[data-dadd],[data-dq],[data-dt]');if(!b)return;
    if(b.hasAttribute('data-w')){
      leer();
      var k=b.getAttribute('data-w'),val=b.getAttribute('data-val');
      if(k==='cobro')d.cobro.tipo=val;
      if(k==='tipo')d.ingreso.tipo=val;
      if(k==='moneda')d.ingreso.moneda=val;
      if(k==='dividido')d.horas.finDividido=val==='true';
      if(k==='redondeo')d.horas.redondeo=val;
      if(k==='mescobro')d.horas.mesCobro=val;
      if(k==='puesto'){d.puesto=val;var P=puesto(val);if(P){d.horas=Object.assign(d.horas,P.horas);d.cobro=Object.assign(d.cobro,P.cobro)}}
      if(k==='labhabil')d.cobro.laborableHabil=val==='true';
      if(k==='labpago')d.horas.feriadoLaborable=val;
      pintar();return;
    }
    /* Descuentos propios (sueldo personalizado) */
    if(b.hasAttribute('data-dadd')){leer();d.descuentos.push({id:uid(),nombre:'',tipo:'pct',valor:''});pintar();var l=document.querySelectorAll('#wiz-box [data-k="nombre"]');if(l.length)l[l.length-1].focus();return}
    if(b.hasAttribute('data-dq')){leer();d.descuentos.splice(Number(b.getAttribute('data-dq')),1);pintar();return}
    if(b.hasAttribute('data-dt')){leer();var x=d.descuentos[Number(b.getAttribute('data-dt'))];if(x)x.tipo=b.getAttribute('data-val');pintar();return}
    var a=b.getAttribute('data-wa');
    if(a==='cancelar'){cerrar();if(opciones.alCancelar)opciones.alCancelar();return}
    leer();error('');
    if(a==='atras'){paso--;pintar();return}
    if(!valida())return;
    if(a==='sig'){paso++;pintar();return}
    if(a==='fin'){
      /* Al guardar desde la mitad, controla también los pasos con datos obligatorios */
      if(!d.nombre){paso=1;pintar();error('Escribí tu nombre.');return}
      if(!(num(d.nominal)>0)){paso=2;pintar();error(d.ingreso.tipo==='variable'?'Escribí cuánto cobrás en un mes normal.':d.ingreso.tipo==='factura'?'Escribí cuánto facturás en un mes normal.':'Escribí tu sueldo.');return}
      terminar();
    }
  });
  box.addEventListener('change',function(e){
    if(e.target.id==='w-sinhoras'){leer();d.horas.activo=!e.target.checked;pintar()}
  });
  box.addEventListener('input',function(e){if(paso===3||paso===2){leer();previa()}});
}

function reglaCobro(c){c=c||{};return c.tipo==='ultimoHabil'?'el último día hábil':c.tipo==='fijo'?'el día '+(c.dia||1):'el 5.º día hábil'}
/* (2.26) En Sueldo: «Sueldo en Uruguay · cobrás el 5.º día hábil de cada mes» */
export function formaCobroTxt(st){return nombreTipo(st)+' · cobrás '+reglaCobro(st.perfil&&st.perfil.cobro)+' de cada mes'}
/* Resumen para Ajustes */
export function resumenPerfil(st){
  var p=st.perfil,H=p.horas,c=p.cobro;
  var cobro=reglaCobro(c);
  var ti=p.ingreso&&p.ingreso.factura?'factura':(p.ingreso&&p.ingreso.tipo)||'uy',nt=NOMBRE_TIPO[ti]||'Sueldo en Uruguay',tipoTxt=nt.charAt(0).toLowerCase()+nt.slice(1)+(ti!=='uy'&&p.ingreso.moneda==='USD'?', en dólares':'');
  return (p.nombre?'<b>'+esc(p.nombre)+'</b> · ':'')+tipoTxt+' · cobrás '+cobro+' · '
    +(sinHoras(ti)||H.activo===false?'sin horas extra':'hora normal = sueldo ÷ '+num(H.divisor)+', extra ×'+String(H.multSem).replace('.',',')+', finde ×'+String(H.multFin).replace('.',',')+', cuenta si pasás '+fMin(num(H.umbral)));
}

