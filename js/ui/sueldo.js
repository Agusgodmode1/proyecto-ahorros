/* Pestaña Sueldo: recibo estimado, valor de cada hora, registro de horas y "¿Te pagaron bien?". */
import {parse,MESL} from '../logica/fechas.js';
import {num,uid} from '../logica/util.js';
import {mesTrabajo,mins,pagoSem,tarifas,reglasHoras,extraDelDia,ingresoDe,mesIngreso} from '../logica/sueldo.js';
import {ctx,$,today,liqNow,planNow,money,money2,usd,pctTxt,veces,fmtH,esc,fLarga,fMin,tile,row,cap,toast,armar} from './comun.js';
import {renderResumen} from './plan.js';
import {aguinaldo,salarioVacacional} from '../logica/aguinaldo.js';
import {extraPorHorario,tipoDeDia,minimoExtra} from '../logica/horario.js';
import {renderPlanilla,initPlanilla} from './planilla.js';
import {revisarBPC} from '../logica/avisos.js';

var tipoSel='sem',confirmClear=false;
var REDTXT={media:' y se pagan redondeados a la media hora',cuarto:' y se pagan redondeados al cuarto de hora',no:' y se pagan sin redondear'};

export function renderSueldo(){
  var state=ctx.state,s=state.sueldo,L=liqNow(true),L0=liqNow(false),mc=mins(state,'sem'),me=mins(state,'fin');
  var bpc=num(s.bpc)||6864,nom=num(s.nominal),t=tarifas(state),R=reglasHoras(state),hn=t.hora,finH=t.heEsp+t.bonoHora,conHoras=R.activo!==false;
  var desc=L.mont+L.fon+L.frl+L.irpf+L.otros,extras=L.N-nom;
  var ing=ingresoDe(state),uy=ing.tipo==='uy';
  /* Lo que es solo del sueldo en Uruguay: aguinaldo, BPC, control del recibo y descuentos de ley */
  $('#aguinaldo-card').hidden=!uy;$('#card-control').hidden=!uy;
  ['s-otros','s-hijos','s-conyuge','s-bpc'].forEach(function(id){var f=$('#'+id).closest('.field');if(f)f.hidden=!uy});
  var fb=$('#s-bonofijo').closest('.field');if(fb)fb.hidden=ing.tipo==='variable';
  var ln=document.querySelector('label[for="s-nominal"]');if(ln)ln.textContent=ing.tipo==='variable'?'Lo que cobrás en un mes normal (en mano)':ing.tipo==='personalizado'?'Sueldo mensual, antes de tus descuentos':'Sueldo nominal mensual';
  /* Sin horas extra, el control del recibo no pregunta por horas */
  ['r-heh','r-hem','r-des','r-fer'].forEach(function(id){var f=$('#'+id).closest('.field');if(f)f.hidden=!conHoras});
  if(!uy){renderOtroIngreso(L,conHoras);return}
  var ban='';
  if(state.ejemplo)ban='<div class="banner"><p><b>Estás viendo valores de ejemplo.</b> Sueldo, valor de las horas y registro de tiempo son de muestra. Borralos y creá tu perfil cuando quieras.</p><button class="btn" type="button" data-cero>Borrar el ejemplo y crear mi perfil</button></div>';
  $('#ej-banner').innerHTML=ban;

  $('#sueldo-hero').innerHTML='<div class="card pay-hero"><div class="ph-main"><span class="tile-l" style="color:var(--grape-ink)">Vas a cobrar, más o menos</span><b class="pay-big">'+money(L.liquido)+'</b><span class="tile-h">El '+esc(fLarga(state.plan.cobro))+', ya con los descuentos. '+(conHoras?'Las horas extra te suman <b>'+money(L.liquido-L0.liquido)+'</b> en mano.':'')+'</span></div><div class="tiles">'
    +tile('tone-sky','Sueldo base',money(nom),'el mismo todos los meses')
    +(conHoras?tile('tone-mint','Extras de este mes','+ '+money(extras),'horas extra, descanso y bono'):tile('tone-mint','Bono','+ '+money(extras),'bono fijo del mes'))
    +tile('tone-coral','Descuentos','− '+money(desc),'BPS, FONASA y FRL'+(L.irpf>0?' e IRPF':''))
    +'</div></div>';

  $('#sueldo-rates').innerHTML='<div class="rates">'
    +'<div class="rate tone-sky"><span class="rate-k">Hora extra entre semana</span><b class="rate-v">'+money2(t.heCom)+'</b>'+(hn>0?'<span class="rate-x">'+veces(t.heCom/hn)+' tu hora</span>':'')+'<p>Los minutos que llegás antes o te quedás. Se suman en el mes'+REDTXT[R.redondeo]+'.</p></div>'
    +'<div class="rate tone-sun"><span class="rate-k">Hora de fin de semana o feriado</span><b class="rate-v">'+money2(finH)+'</b>'+(hn>0?'<span class="rate-x">'+veces(finH/hn)+' tu hora</span>':'')+'<p>'+(t.bonoHora>0?'En el recibo viene partida: '+money2(t.heEsp)+' en <i>descanso trabajado</i> y '+money2(t.bonoHora)+' dentro del <i>bono</i>.':'Todo el turno se paga a este valor.')+'</p></div>'
    +'<div class="rate tone-slate"><span class="rate-k">Tu hora normal</span><b class="rate-v">'+money2(hn)+'</b><span class="rate-x">sueldo ÷ '+num(R.divisor)+'</span><p>'+(num(R.divisor)===240?'30 días de 8 horas. ':'')+'Es la base para calcular todo lo demás.</p></div>'
    +'</div>';

  var pagoH=pagoSem(state)/60,rd=(Math.round(pagoSem(state))!==Math.round(mc))?', se pagan '+fmtH(pagoH)+' h':'';
  var h='<div class="card receipt"><div class="sec-h"><h2>Recibo estimado</h2><span class="note">así debería verse el tuyo</span></div>';
  h+='<h3 class="rg rg-plus">Lo que ganás</h3>';
  h+=row('Sueldo mensual',money(nom));
  var bonoH=conHoras&&t.bonoHora>0;
  if(conHoras){
    h+=row('Horas extras entre semana',money(L.extraCom),'sub',fMin(mc)+rd+' × '+money2(t.heCom));
    h+=row('Descanso y feriado trabajado',money(L.extraEsp),'sub',fMin(me)+' × '+money2(t.heEsp));
  }
  if(bonoH||num(s.bonoFijo)>0)h+=row('Bono',money(L.bono),'sub',(bonoH?fMin(me)+' × '+money2(t.bonoHora):'')+(num(s.bonoFijo)>0?(bonoH?' + ':'')+money(num(s.bonoFijo))+' fijo':''));
  h+=row('Total ganado (nominal)',money(L.N),'tot');
  h+='<h3 class="rg rg-minus">Lo que te descuentan</h3>';
  h+=row('Jubilación, BPS (15%)','− '+money(L.mont),'sub minus');
  h+=row('Salud, FONASA ('+pctTxt(L.fonRate)+')','− '+money(L.fon),'sub minus');
  h+=row('Fondo de Reconversión Laboral (0,1%)','− '+money(L.frl),'sub minus');
  var irSub=L.irpf>0?'':(L.prim>0?'los créditos por aportes cubren el impuesto':'no pagás: ganás menos de '+money(L.minimo));
  h+=row('IRPF','− '+money(L.irpf),'sub minus',irSub);
  if(L.otros>0)h+=row('Otros descuentos','− '+money(L.otros),'sub minus');
  h+=row('Total descuentos','− '+money(desc),'tot minus');
  h+=row('Lo que cobrás',money(L.liquido),'final');
  h+='<p class="note" style="margin-top:6px">'+(state.perfil.recibosAgus?'Es una estimación hecha con tus recibos de junio a septiembre. Los descuentos dan igual y el bono puede variar unos $50 a $250. ':'Es una estimación con las reglas de tu perfil y los descuentos de Uruguay. ')+'No incluye aguinaldo ni salario vacacional.</p>';
  h+='<details><summary>Cómo se calcula</summary><p class="note">Se suman sueldo, horas extra, descanso trabajado y bono para tener el nominal. Tu hora normal es sueldo ÷ '+num(R.divisor)+'. La hora extra de semana vale '+fmtH(num(R.multSem))+' veces la normal y se paga con los minutos del mes'+REDTXT[R.redondeo]+'. Cada hora de fin de semana o feriado vale '+fmtH(num(R.multFin))+' veces la normal'+(R.finDividido!==false?': una hora como descanso trabajado y el resto en el bono':'')+'. Después se descuenta 15% de jubilación, FONASA (3% hasta 2,5 BPC, 4,5% por encima, +1,5% si tenés hijos a cargo, +2% por cónyuge sin cobertura) y 0,1% de FRL, como en tus recibos. El IRPF usa la escala mensual de la DGI (no pagás hasta 7 BPC = '+money(7*bpc)+') y se le resta un crédito de 14% de los aportes (8% si el nominal pasa 15 BPC).</p></details></div>';
  $('#sueldo-out').innerHTML=h;
  $('#sec-rates').hidden=!conHoras;$('#card-horas').hidden=!conHoras;
  $('#s-tarifas').textContent=s.tarifaManual?'Usás valores cargados a mano: semana '+money2(t.heCom)+', descanso '+money2(t.heEsp)+', bono '+money2(t.bonoHora)+' por hora.'
    :(conHoras?'Salen de tu sueldo y tu perfil: hora normal '+money2(hn)+', extra de semana '+money2(t.heCom)+', finde o feriado '+money2(finH)+'.':'En tu perfil dice que no hacés horas extra.');
  $('#horas-nota').innerHTML='Tu horario es de <b>'+esc(R.entrada||'12:00')+' a '+esc(R.salida||'21:00')+'</b>. Entre semana se suman los minutos que llegás antes y los que te quedás después (cuentan desde '+fMin(Math.max(0,num(R.umbral)-num(R.jornada)))+' en el día). Fin de semana y feriados no laborables: el turno entero.';
  renderLog(mc,me,L);renderCtrl();renderAguinaldo();renderPlanilla();
  /* La BPC cambia cada enero */
  var y=today().slice(0,4);
  $('#bpc-aviso').innerHTML=revisarBPC(state,today())?'<div class="banner"><p><b>¿Cambió la BPC?</b> Estamos en '+y+' y estás usando la de '+esc(String(s.bpcAnio))+' ('+money(bpc)+'). Cada enero el BPS publica un valor nuevo, y cambia los tramos del IRPF.</p><div class="row-btns"><button class="btn" type="button" id="bpc-ir">Cargar la nueva</button><button class="btn quiet" type="button" id="bpc-igual">Sigue igual</button></div></div>':'';
  $('#bpc-nota').textContent='Valor de '+(s.bpcAnio||y)+'. Cambia cada enero: actualizala cuando el BPS publique la nueva.';
}
/* ---------- Sueldo personalizado e ingreso variable ---------- */
function enMoneda(L,v){return L.moneda==='USD'&&L.cotiz?' <span class="src">('+usd(v/L.cotiz)+')</span>':''}
function renderOtroIngreso(L,conHoras){
  var state=ctx.state,s=state.sueldo,variable=L.tipo==='variable',nom=num(s.nominal);
  var ban=state.ejemplo?'<div class="banner"><p><b>Estás viendo valores de ejemplo.</b> Borralos y creá tu perfil cuando quieras.</p><button class="btn" type="button" data-cero>Borrar el ejemplo y crear mi perfil</button></div>':'';
  if(L.sinCotizacion)ban+='<div class="banner"><p><b>Cobrás en dólares y falta la cotización.</b> Cargala en Ajustes → Dólar para pasar tu ingreso a pesos. Mientras tanto uso el número tal cual.</p><button class="btn" type="button" data-goto="ajustes">Ir a Ajustes</button></div>';
  $('#ej-banner').innerHTML=ban;$('#bpc-aviso').innerHTML='';
  var mesN=MESL[Number(String(L.mes||mesIngreso(state)).slice(5,7))-1];
  var sub=variable?(L.estimado?'Todavía no cargaste lo de '+mesN+': uso lo que cobrás en un mes normal.':'Lo que cargaste para '+mesN+'.'):'El '+esc(fLarga(state.plan.cobro))+', con tus descuentos.';
  $('#sueldo-hero').innerHTML='<div class="card pay-hero"><div class="ph-main"><span class="tile-l" style="color:var(--grape-ink)">'+(variable?'Vas a cobrar este mes':'Vas a cobrar, más o menos')+'</span><b class="pay-big">'+money(L.liquido)+'</b><span class="tile-h">'+sub+(L.moneda==='USD'&&L.orig?' Son '+usd(L.orig.liquido)+(L.cotiz?' a $ '+String(L.cotiz).replace('.',',')+' el dólar':'')+'.':'')+'</span></div>'
    +(variable?'':'<div class="tiles">'+tile('tone-sky','Sueldo',money(L.N-L.bono-L.extraCom-L.extraEsp),'antes de descuentos')
      +(conHoras||L.bono>0?tile('tone-mint','Extras de este mes','+ '+money(L.bono+L.extraCom+L.extraEsp),conHoras?'horas extra y bono':'bono fijo'):'')
      +tile('tone-coral','Tus descuentos','− '+money(L.otros),L.descuentos.length?L.descuentos.length+(L.descuentos.length===1?' descuento':' descuentos'):'no cargaste descuentos')+'</div>')+'</div>';
  var h;
  if(variable){
    var im=s.ingresosMes||{},meses=Object.keys(im).sort().reverse(),m=L.mes;
    h='<div class="card stack"><div class="sec"><h2>Lo que cobraste</h2><p class="note">Cargá lo que te quedó en mano cada mes'+(L.moneda==='USD'?', en dólares':'')+'. El plan usa el del mes en que cobrás ('+mesN+').</p></div>'
      +'<form class="ing-form" id="ing-form" autocomplete="off"><div class="field"><label for="ing-mes" class="sub-l">Mes</label><input id="ing-mes" type="month" value="'+m+'"></div>'
      +'<div class="field"><label for="ing-monto" class="sub-l">En mano</label><div class="money"><span>'+(L.moneda==='USD'?'US$':'$')+'</span><input id="ing-monto" type="number" inputmode="decimal" min="0" step="any" value="'+(im[m]!==undefined?im[m]:'')+'"></div></div>'
      +'<button class="btn primary" type="submit">Guardar</button></form>'
      +(meses.length?'<ul class="list">'+meses.map(function(k){return '<li><span class="what"><b>'+esc(cap(MESL[Number(k.slice(5,7))-1]))+' '+k.slice(0,4)+'</b></span><span class="amt">'+(L.moneda==='USD'?usd(num(im[k])):money(num(im[k])))+'</span><button class="btn quiet" type="button" data-ingdel="'+esc(k)+'">Borrar</button></li>'}).join('')+'</ul>':'<div class="empty">Todavía no cargaste ningún mes.</div>')
      +'<p class="note">Lo que cobrás en un mes normal ('+(L.moneda==='USD'?usd(nom):money(nom))+') se cambia en Ajustes → Mi perfil.</p></div>';
  }else{
    h='<div class="card receipt"><div class="sec-h"><h2>Tu recibo</h2><span class="note">con tus descuentos</span></div>';
    h+='<h3 class="rg rg-plus">Lo que ganás</h3>'+row('Sueldo mensual',money(L.N-L.bono-L.extraCom-L.extraEsp));
    if(conHoras){h+=row('Horas extras entre semana',money(L.extraCom),'sub');h+=row('Fin de semana y feriados',money(L.extraEsp),'sub')}
    if(L.bono>0)h+=row('Bono',money(L.bono),'sub');
    h+=row('Total ganado',money(L.N),'tot');
    h+='<h3 class="rg rg-minus">Lo que te descuentan</h3>';
    h+=L.descuentos.length?L.descuentos.map(function(d){return row(esc(d.nombre)+(d.tipo==='pct'?' ('+String(d.valor).replace('.',',')+'%)':''),'− '+money(d.monto),'sub minus')}).join(''):'<p class="note">No cargaste descuentos.</p>';
    if(L.descuentos.length)h+=row('Total descuentos','− '+money(L.otros),'tot minus');
    h+=row('Lo que cobrás',money(L.liquido)+enMoneda(L,L.liquido),'final');
    h+='<div class="row-btns" style="margin-top:8px"><button class="btn" type="button" data-perfil="4">Cambiar mis descuentos</button></div></div>';
  }
  $('#sueldo-out').innerHTML=h;
  $('#sec-rates').hidden=true;$('#card-horas').hidden=!conHoras;
  if(conHoras){var mc=mins(state,'sem'),me=mins(state,'fin');renderLog(mc,me,L);renderPlanilla()}
  $('#s-tarifas').textContent=conHoras?'Salen de tu sueldo y tu perfil.':'Sin horas extra.';
}
/* Aguinaldo y salario vacacional (estimados) */
var MESC=['ene','feb','mar','abr','may','jun','jul','ago','set','oct','nov','dic'];
function renderAguinaldo(){
  var el=$('#aguinaldo-out');if(!el)return;
  var A=aguinaldo(ctx.state,today()),fp=A.pago.split('-');
  var h='<div class="sec-h"><h2>Aguinaldo de '+A.nombre+'</h2><span class="note">antes del '+Number(fp[2])+' de '+A.nombre+'</span></div>'
    +'<div class="ag-n"><b>'+money(A.liquido)+'</b><span>en mano, más o menos</span></div>'
    +'<details><summary>Cómo se calcula</summary><div class="receipt" style="margin-top:10px">'
    +A.meses.map(function(x){return row(MESC[Number(x.k.slice(5,7))-1]+' '+x.k.slice(0,4),money(x.nominal),'sub',x.fuente==='cierre'?'del mes cerrado':x.fuente==='actual'?'este mes, con tus extras':'estimado con tu sueldo')}).join('')
    +row('Total del semestre',money(A.total),'tot')
    +row('Aguinaldo (÷ 12)',money(A.bruto))
    +row('Aportes (jubilación, FONASA y FRL)','− '+money(A.aportes.total),'sub minus')
    +row('En mano',money(A.liquido),'final')+'</div>'
    +(A.estimados?'<p class="note" style="margin-top:8px">'+A.estimados+(A.estimados===1?' mes está estimado':' meses están estimados')+' con tu sueldo base. Cuando cierres cada mes en Logros, se usa lo que ganaste de verdad.</p>':'')
    +'</details>';
  el.innerHTML=h;
  var d=$('#sv-dias');if(document.activeElement!==d)d.value=num(ctx.state.sueldo.diasLicencia)||'';
  renderVacacional();
}
function renderVacacional(){
  var dias=num(ctx.state.sueldo.diasLicencia),o=$('#sv-out');
  if(!(dias>0)){o.textContent='Poné los días y te calculo el salario vacacional.';return}
  var V=salarioVacacional(ctx.state,dias);
  o.innerHTML='Salario vacacional: <b>'+money(V.liquido)+'</b> en mano ('+money(V.jornal)+' por día × '+dias+(V.irpf>0?', menos '+money(V.irpf)+' de IRPF':'')+').';
}
function renderLog(mc,me,L){
  var state=ctx.state;
  var mt=mesTrabajo(state),mtN=MESL[Number(mt.slice(5,7))-1];
  var pagoH=pagoSem(state)/60,finTot=L.extraEsp+tarifas(state).bonoHora*me/60;
  var h='<p class="note">Horas de <b>'+mtN+'</b>: se cobran el '+esc(fLarga(state.plan.cobro))+'.</p>';
  h+='<div class="totals"><div class="tot-chip tone-sky"><span>Entre semana</span><b>'+fMin(mc)+'</b><small>se pagan '+fmtH(pagoH)+' h, '+money(L.extraCom)+'</small></div>'
    +'<div class="tot-chip tone-sun"><span>Fin de semana y feriado</span><b>'+fMin(me)+'</b><small>'+money(finTot)+' entre descanso y bono</small></div></div>';
  var all=state.horas.slice().sort(function(a,b){return a.fecha<b.fecha?1:a.fecha>b.fecha?-1:(a.id<b.id?1:-1)});
  var list=all.filter(function(x){return x.fecha.slice(0,7)===mt}),otros=all.filter(function(x){return x.fecha.slice(0,7)!==mt});
  function item(x){
    var dw=parse(x.fecha).getDay(),lab=x.tipo==='fin'?((dw>=1&&dw<=5)?'Feriado':'Fin de semana'):'Entre semana';
    return '<li><span class="when">'+esc(fLarga(x.fecha))+'</span><span class="what"><span class="pill '+(x.tipo==='fin'?'ex':'now')+'">'+lab+'</span>'+(x.ej?' <span class="src">ejemplo</span>':'')+(x.src==='excel'?' <span class="src">del Excel</span>':'')+(x.src==='planilla'?' <span class="src">'+esc(x.llegada||'')+' a '+esc(x.salida||'')+' · planilla</span>':'')+'</span><span class="amt">'+fMin(x.min)+'</span><button class="btn quiet" type="button" data-delh="'+esc(x.id)+'" aria-label="Borrar registro">Borrar</button></li>';
  }
  if(!list.length)h+='<div class="empty">Todavía no sumaste horas extra de '+mtN+'. Elegí el tipo y el día, y tocá un botón de arriba.</div>';
  else h+='<div class="logbox"><ul class="list">'+list.map(item).join('')+'</ul></div>';
  if(otros.length)h+='<details><summary>Horas de otros meses ('+otros.length+')</summary><p class="note">No cuentan para este cobro. Las de un mes se cobran a principios del mes siguiente.</p><ul class="list">'+otros.map(item).join('')+'</ul></details>';
  if(all.length)h+=confirmClear?'<div class="hm"><span class="note">¿Borrar todas las horas cargadas?</span><button class="btn danger" type="button" id="log-clear-yes">Sí, borrar todo</button><button class="btn quiet" type="button" id="log-clear-no">Cancelar</button></div>':'<div><button class="btn quiet" type="button" id="log-clear">Borrar todas las horas</button></div>';
  $('#log-out').innerHTML=h;
}

/* ---------- Control del recibo ---------- */
var RID={sue:'r-sue',heh:'r-heh',hem:'r-hem',des:'r-des',fer:'r-fer',bon:'r-bon',hab:'r-hab',dto:'r-dto',liq:'r-liq'};
function reciboVal(k){var v=ctx.state.recibo[k];return (v===undefined||v===null||v==='')?null:num(v)}
function renderCtrl(){
  var el=$('#ctrl-out');if(!el)return;
  var state=ctx.state,s=state.sueldo,L=liqNow(true),R={},any=false;
  Object.keys(RID).forEach(function(k){R[k]=reciboVal(k);if(R[k]!==null)any=true});
  if(!any){el.innerHTML='';return}
  var esp={sue:num(s.nominal),heh:pagoSem(state)/60,hem:L.extraCom,esp:L.extraEsp,bon:L.bono,hab:L.N,dto:L.mont+L.fon+L.frl+L.irpf+L.otros,liq:L.liquido};
  var finReal=(R.des!==null||R.fer!==null)?(R.des||0)+(R.fer||0):null;
  var rows=[
    {l:'Sueldo mensual',e:esp.sue,r:R.sue,t1:1,t2:1},
    {l:'Horas extras (cantidad)',e:esp.heh,r:R.heh,t1:0.01,t2:0.01,h:true},
    {l:'Horas extras (importe)',e:esp.hem,r:R.hem,t1:2,t2:60},
    {l:'Descanso + feriado trabajado',e:esp.esp,r:finReal,t1:2,t2:120},
    {l:'Bono',e:esp.bon,r:R.bon,t1:2,t2:250},
    {l:'Total haberes',e:esp.hab,r:R.hab,t1:5,t2:300},
    {l:'Total descuentos',e:esp.dto,r:R.dto,t1:5,t2:100},
    {l:'Líquido',e:esp.liq,r:R.liq,t1:5,t2:300}
  ].filter(function(x){return x.r!==null});
  var bad=[],h='<div class="scroll"><table style="min-width:480px"><thead><tr><th>Concepto</th><th class="r">Calculado</th><th class="r">Recibo</th><th class="r">Diferencia</th><th></th></tr></thead><tbody>';
  rows.forEach(function(x){
    var d=x.r-x.e,a=Math.abs(d),st=a<=x.t1?['ok','igual']:(a<=x.t2?['ex','cerca']:['bad','revisar']);
    if(st[0]==='bad')bad.push({x:x,d:d});
    var fe=x.h?x.e.toLocaleString('es-UY',{maximumFractionDigits:2}):money(x.e),fr=x.h?x.r.toLocaleString('es-UY',{maximumFractionDigits:2}):money(x.r),fd=x.h?(d>0?'+':'')+d.toLocaleString('es-UY',{maximumFractionDigits:2}):(d>=0.5?'+':'')+money(d);
    h+='<tr><td>'+x.l+'</td><td class="r num">'+fe+'</td><td class="r num">'+fr+'</td><td class="r num'+(st[0]==='bad'?' neg':'')+'">'+(a<0.005?'0':fd)+'</td><td><span class="pill '+st[0]+'">'+st[1]+'</span></td></tr>';
  });
  h+='</tbody></table></div>';
  var msg=[];
  var lq=rows.filter(function(x){return x.l==='Líquido'})[0];
  if(lq){var dl=lq.r-lq.e;
    if(Math.abs(dl)<=lq.t1)msg.push('El líquido coincide con lo calculado. Te pagaron bien.');
    else if(Math.abs(dl)<=lq.t2)msg.push('El líquido difiere en '+money(Math.abs(dl))+' '+(dl>0?'a tu favor':'en contra')+'. Entra en el margen normal del modelo (el bono es lo menos preciso).');
    else msg.push('El líquido difiere en <b>'+money(Math.abs(dl))+'</b> '+(dl>0?'a tu favor':'en contra')+'. Conviene revisar el recibo.');}
  bad.forEach(function(b){
    var x=b.x;
    if(x.l==='Horas extras (cantidad)')msg.push('Te pagaron '+x.r.toLocaleString('es-UY')+' h y yo esperaba '+x.e.toLocaleString('es-UY')+' h con tus minutos ('+fMin(mins(state,'sem'))+'). Revisá si el Excel de asistencia tiene días sin cargar o mal escritos.');
    else if(x.l==='Descanso + feriado trabajado')msg.push('Descanso y feriado: el recibo dice '+money(x.r)+' y esperaba '+money(x.e)+' por '+fMin(mins(state,'fin'))+' de fin de semana y feriado. Puede faltar un día o contarse como día común.');
    else if(x.l==='Horas extras (importe)'&&R.heh!==null&&R.heh>0){var vh=x.r/R.heh;msg.push('El valor hora del recibo da '+money(vh)+' y debería ser '+money(tarifas(state).heCom)+'.')}
  });
  if(msg.length)h+='<ul class="lect" style="margin-top:12px">'+msg.map(function(m){return '<li>'+m+'</li>'}).join('')+'</ul>';
  el.innerHTML=h;
}
function syncRecibo(){Object.keys(RID).forEach(function(k){var e=$('#'+RID[k]);if(e&&document.activeElement!==e)e.value=(ctx.state.recibo[k]===undefined?'':ctx.state.recibo[k])})}

/* ---------- Formularios ---------- */
export function syncSueldo(){
  var s=ctx.state.sueldo;
  $('#s-nominal').value=s.nominal||'';$('#s-bonofijo').value=s.bonoFijo||'';
  $('#s-otros').value=s.otros||'';$('#s-hijos').value=s.hijos||'';$('#s-conyuge').checked=!!s.conyuge;$('#s-bpc').value=s.bpc||'';
  document.querySelectorAll('[data-tipo]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-tipo')===tipoSel))});
  if(!$('#l-fecha').value){$('#l-fecha').value=today();elegirTipo(tipoDeDia(today()))}
  var R=reglasHoras(ctx.state);
  if(!$('#l-lleg').value)$('#l-lleg').value=R.entrada||'12:00';
  if(!$('#l-sal').value)$('#l-sal').value=R.salida||'21:00';
  horNota();
  syncRecibo();
}
function onSueldoInput(){
  var s=ctx.state.sueldo;
  s.nominal=num($('#s-nominal').value);s.bonoFijo=num($('#s-bonofijo').value);
  s.otros=num($('#s-otros').value);s.hijos=Math.max(0,Math.round(num($('#s-hijos').value)));s.conyuge=$('#s-conyuge').checked;
  var nb=num($('#s-bpc').value)||6864;if(nb!==num(s.bpc))s.bpcAnio=Number(today().slice(0,4));s.bpc=nb;
  ctx.persist();renderSueldo();renderResumen(planNow());
}
function addHoras(min){
  if(!(min>0))return;
  var f=$('#l-fecha').value||today();
  ctx.state.horas.push({id:uid(),fecha:f,tipo:tipoSel,min:Math.round(min)});
  confirmClear=false;ctx.persist();renderSueldo();renderResumen(planNow());
}
function elegirTipo(t){tipoSel=t;document.querySelectorAll('[data-tipo]').forEach(function(x){x.setAttribute('aria-pressed',String(x.getAttribute('data-tipo')===t))})}
function calcHorario(){return extraPorHorario(reglasHoras(ctx.state),$('#l-lleg').value,$('#l-sal').value,tipoSel)}
/* Debajo de las horas: qué se va a sumar */
function horNota(){
  var el=$('#l-hor-nota'),b=$('#l-hor-add'),x=calcHorario(),R=reglasHoras(ctx.state);
  if(!x){el.textContent='Poné la hora de llegada y de salida.';b.disabled=true;b.textContent='Sumar';return}
  if(tipoSel==='fin'){el.innerHTML='Fin de semana o feriado: cuenta el turno entero, <b>'+fMin(x.min)+'</b>.';b.disabled=!x.min;b.textContent='Sumar '+fMin(x.min);return}
  var p=[];if(x.antes)p.push('llegaste '+fMin(x.antes)+' antes');if(x.despues)p.push('te quedaste '+fMin(x.despues)+' después');
  if(!x.total){el.textContent='Tu horario es de '+(R.entrada||'12:00')+' a '+(R.salida||'21:00')+': así no suma extra.';b.disabled=true;b.textContent='Sumar';return}
  el.innerHTML=cap(p.join(' y '))+(x.cuenta?': suma <b>'+fMin(x.min)+'</b> de extra.':'. Son '+fMin(x.total)+' y cuentan desde '+fMin(minimoExtra(R))+' en el día: no suma.');
  b.disabled=!x.cuenta;b.textContent=x.cuenta?'Sumar '+fMin(x.min):'Sumar';
}
export function initSueldo(){
  initPlanilla();
  $('#bpc-aviso').addEventListener('click',function(e){
    if(e.target.id==='bpc-igual'){ctx.state.sueldo.bpcAnio=Number(today().slice(0,4));ctx.persist();renderSueldo()}
    if(e.target.id==='bpc-ir'){var d=$('#s-bpc').closest('details');if(d)d.open=true;var i=$('#s-bpc');try{i.scrollIntoView({block:'center'})}catch(er){}i.focus();i.select()}
  });
  $('#sv-dias').addEventListener('input',function(){ctx.state.sueldo.diasLicencia=Math.max(0,Math.min(60,Math.round(num(this.value))));ctx.persist();renderVacacional()});
  ['s-nominal','s-bonofijo','s-otros','s-hijos','s-conyuge','s-bpc'].forEach(function(id){$('#'+id).addEventListener('input',onSueldoInput);$('#'+id).addEventListener('change',onSueldoInput)});
  document.querySelectorAll('[data-tipo]').forEach(function(b){b.addEventListener('click',function(){elegirTipo(b.getAttribute('data-tipo'));horNota()})});
  $('#quick').addEventListener('click',function(e){var b=e.target.closest('[data-min]');if(b)addHoras(Number(b.getAttribute('data-min')))});
  $('#l-add').addEventListener('click',function(){
    var m=Math.max(0,Math.round(num($('#l-h').value)))*60+Math.max(0,Math.round(num($('#l-m').value)));
    if(m>0){addHoras(m);$('#l-h').value='';$('#l-m').value=''}
  });
  /* Por horario: el día y la hora de llegada y salida; la app calcula los minutos extra */
  $('#l-fecha').addEventListener('change',function(){if(this.value){elegirTipo(tipoDeDia(this.value));horNota()}});
  ['l-lleg','l-sal'].forEach(function(id){$('#'+id).addEventListener('input',horNota)});
  $('#l-hor-add').addEventListener('click',function(){
    var x=calcHorario();if(!x||!x.min)return;
    addHoras(x.min);toast('Sumé '+fMin(x.min)+(tipoSel==='fin'?' de finde o feriado':' de extra'));
    var R=reglasHoras(ctx.state);$('#l-lleg').value=R.entrada||'12:00';$('#l-sal').value=R.salida||'21:00';horNota();
  });
  Object.keys(RID).forEach(function(k){$('#'+RID[k]).addEventListener('input',function(){ctx.state.recibo[k]=this.value;ctx.persist();renderCtrl()})});
  $('#r-clear').addEventListener('click',function(){ctx.state.recibo={};syncRecibo();ctx.persist();renderCtrl()});
  /* Ingreso variable: lo que cobraste cada mes */
  $('#p-sueldo').addEventListener('submit',function(e){
    if(e.target.id!=='ing-form')return;
    e.preventDefault();
    var m=$('#ing-mes').value,v=$('#ing-monto').value;
    if(!/^\d{4}-\d{2}$/.test(m)){$('#ing-mes').focus();return}
    if(v===''||!(num(v)>=0)){$('#ing-monto').focus();return}
    var s=ctx.state.sueldo;s.ingresosMes=Object.assign({},s.ingresosMes);s.ingresosMes[m]=Math.round(num(v)*100)/100;
    ctx.persist();ctx.renderAll();toast('Guardado lo de '+MESL[Number(m.slice(5,7))-1]);
  });
  $('#p-sueldo').addEventListener('click',function(e){
    var state=ctx.state;
    var di=e.target.closest('[data-ingdel]');
    if(di){if(!armar(di))return;var k=di.getAttribute('data-ingdel'),im=Object.assign({},state.sueldo.ingresosMes);delete im[k];state.sueldo.ingresosMes=im;ctx.persist();ctx.renderAll();return}
    var dh=e.target.closest('[data-delh]');
    if(dh){var hid=dh.getAttribute('data-delh');state.horas=state.horas.filter(function(x){return x.id!==hid});ctx.persist();renderSueldo();renderResumen(planNow());return}
    if(e.target.id==='log-clear'){confirmClear=true;renderSueldo();return}
    if(e.target.id==='log-clear-no'){confirmClear=false;renderSueldo();return}
    if(e.target.id==='log-clear-yes'){confirmClear=false;state.horas=[];ctx.persist();renderSueldo();renderResumen(planNow())}
  });
}
