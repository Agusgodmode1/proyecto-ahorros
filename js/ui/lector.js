/* Lector de cualquier recibo (2.12): un PDF, el texto pegado (en el iPhone: en la foto del recibo, mantené apretado
   el texto → Copiar → pegar) o un ejemplo. Muestra lo que encontró («Encontré: sueldo…, horas extra ×2 sobre…»),
   deja corregir cada renglón y pregunta con opciones simples lo que no está claro (cómo te pagan las horas extra).
   Recién al confirmar lo guarda: en tu perfil (si querés) y como el recibo real de ese mes.
   Las cuentas son puras (logica/lector-recibo.js). El PDF nunca se guarda. */
import {num,uid} from '../logica/util.js';
import {MESL} from '../logica/fechas.js';
import {leer,deducirHoras,propuesta,desglose,aprenderConcepto,renglonesDeTexto,tipoDocumento,CONCEPTOS} from '../logica/lector-recibo.js';
import {mesTrabajo,reglasHoras,ingresoDe} from '../logica/sueldo.js';
import {precision} from '../logica/precision.js';
import {liqReal} from '../logica/recibos.js';
import {esFactura} from '../logica/factura.js';
import {ctx,$,money,money2,esc,cap,toast} from './comun.js';

/* Documentos INVENTADOS para probar sin datos propios */
export var EJ_RECIBO='Panadería La Espiga S.R.L.   RUT: 21.555666.0017\nRECIBO DE SUELDO - Setiembre 2026\nFuncionario: Ejemplo Ejemplar\nConcepto                 Cant.     Haberes     Descuentos\nSueldo básico            30        42.000,00\nHoras extras comunes      6,00      2.100,00\nPresentismo                         1.500,00\nMontepío 15%                                     6.840,00\nFONASA 4,5%                                      2.052,00\nFRL 0,1%                                            45,60\nIRPF                                               820,00\nTotal haberes                       45.600,00\nTotal descuentos                                 9.757,60\nLíquido a cobrar                    35.842,40';
export var EJ_FACTURA='e-Factura   Serie A  Nº 000321\nRUT Emisor: 21 987654 0011\nRazón social: Estudio Ejemplo\nRazón social comprador: Panadería La Espiga\nFecha: 12/10/2026\nMoneda: UYU\nDiseño de etiquetas      1      18.000,00  18.000,00\nSubtotal gravado tasa básica           18.000,00\nIVA tasa básica 22%                     3.960,00\nTotal a pagar                          21.960,00';

var S=null;   /* {lineas, fuente, L, H, cambios:{i:id}, resp:{mult, minutos, redondeo, feriado}, mes} */
var pegar=false;
export function lectorAbierto(){return !!S}
function mesTxt(k){return cap(MESL[Number(k.slice(5,7))-1])+' '+k.slice(0,4)}
function multTxt(m){return m===2?'Al doble (×2)':m===1.5?'Una vez y media (×1,5)':'×'+String(m).replace('.',',')}

/* ---------- La entrada: PDF, texto o ejemplo ---------- */
export function lectorHTML(){
  if(S)return propuestaHTML();
  return entradaHTML();
}
/* (2.14) «Subí tu recibo de sueldo», arriba de todo en Sueldo: lo lee, muestra cómo te pagan y pregunta lo que no está claro */
export function subirHTML(hayEsteMes){
  if(S)return '<div class="sec"><h2>Así te pagan</h2><p class="note">Lo leí en tu teléfono. Revisá que esté bien; si un renglón no es lo que dice, corregilo y lo recuerdo para la próxima.</p></div>'+propuestaHTML();
  return '<div class="sec"><h2>'+(hayEsteMes?'¿Te llegó otro recibo?':'Subí tu recibo de sueldo')+'</h2><p class="note">'
    +(hayEsteMes?'Subilo y lo sumo a tus recibos: cada uno manda sobre la estimación de ese mes.':'Lo leo, te muestro cómo te pagan cada cosa (tu hora, las extras y cada descuento) y, si tengo dudas, te pregunto. Con eso hago todas las cuentas.')+'</p></div>'+entradaHTML();
}
function entradaHTML(){
  return '<div class="lector stack"><div class="row-btns"><label class="btn primary filebtn">Leer un PDF<input type="file" class="sr-only" accept="application/pdf,.pdf" id="lec-pdf"></label>'
    +'<button class="btn" type="button" data-lec="pegar" aria-expanded="'+pegar+'">Pegar el texto</button><button class="btn" type="button" data-reca="manual">Cargar a mano</button></div>'
    +(pegar?'<div class="field"><label for="lec-texto" class="sub-l">El texto del recibo</label><textarea id="lec-texto" rows="7" placeholder="En el iPhone: abrí la foto del recibo, mantené apretado el texto, tocá Copiar y pegalo acá."></textarea></div>'
      +'<div class="row-btns"><button class="btn primary" type="button" data-lec="leer">Leer</button></div>':'')
    +'<p class="note">Se lee en este teléfono y no se guarda: solo los números que confirmes. ¿Sin un recibo a mano? <button class="linklike" type="button" data-lec="ejemplo">Probalo con uno de ejemplo</button>.</p></div>';
}

/* ---------- Leer ---------- */
export function procesar(lineas,fuente){
  var st=ctx.state;
  if(tipoDocumento(lineas)==='factura'){
    S=null;pegar=false;
    if(esFactura(st)){toast('Es una factura: la cargo en «Tus facturas y costos»');document.dispatchEvent(new CustomEvent('factura-leida',{detail:lineas}));return}
    toast('Eso parece una factura. Si cobrás con factura, elegí «Cobro con factura» en Mi perfil.');ctx.renderAll();return;
  }
  var L=leer(lineas,st.plantillasRecibo);
  if(L.sinTexto||!L.renglones.length){S=null;toast(L.sinTexto?'Ese PDF es una imagen: no tiene texto. Probá pegando el texto o cargalo a mano.':'No reconocí renglones de un recibo. Cargalo a mano.');ctx.renderAll();return}
  var R=reglasHoras(st),H=deducirHoras(L,R);
  S={lineas:lineas,fuente:fuente,L:L,H:H,cambios:{},mes:L.mes||mesTrabajo(st),
     resp:{mult:H&&H.mult?H.mult:null,minutos:Math.max(0,num(R.umbral)-num(R.jornada)),redondeo:R.redondeo||'media',feriado:H&&H.feriado&&H.feriado.mult!==num(R.multFin)?H.feriado.mult:null}};
  pegar=false;ctx.renderAll();
  var el=$('#lec-prop');if(el)try{el.scrollIntoView({block:'start',behavior:'smooth'})}catch(e){}
}
/* Re-lee con lo que corregiste (sin guardar todavía lo aprendido) */
function releer(){
  var pl=JSON.parse(JSON.stringify(ctx.state.plantillasRecibo||{}));
  Object.keys(S.cambios).forEach(function(i){var r=S.L.renglones.filter(function(x){return String(x.i)===String(i)})[0]||S.base[i];if(r)aprenderConcepto(pl,S.L.empleador,r,S.cambios[i])});
  S.L=leer(S.lineas,pl);S.H=deducirHoras(S.L,reglasHoras(ctx.state));
  if(S.H&&S.H.mult&&!S.resp.mult)S.resp.mult=S.H.mult;
  return pl;
}

/* ---------- La propuesta ---------- */
function opcionesConcepto(sel){
  var grupos=[['haber','Lo que ganás'],['descuento','Lo que te descuentan'],['total','Totales'],['info','Informativo']];
  return grupos.map(function(g){return '<optgroup label="'+g[1]+'">'+CONCEPTOS.filter(function(c){return c[2]===g[0]}).map(function(c){return '<option value="'+c[0]+'"'+(c[0]===sel?' selected':'')+'>'+esc(c[1])+'</option>'}).join('')+'</optgroup>'}).join('');
}
function pregunta(clave,titulo,ops,actual){
  return '<div class="field lec-q"><span class="sub-l">'+esc(titulo)+'</span><div class="opciones" role="radiogroup" aria-label="'+esc(titulo)+'">'
    +ops.map(function(o){return '<button type="button" role="radio" data-lecq="'+clave+'" data-val="'+esc(o[0])+'" aria-checked="'+(String(o[0])===String(actual))+'">'+esc(o[1])+'</button>'}).join('')+'</div></div>';
}
function propuestaHTML(){
  var L=S.L,H=S.H,R=reglasHoras(ctx.state),moneyR=function(n){return money(n)};
  var hx=H&&S.resp.mult?{mult:S.resp.mult,hora:H.valorHora/S.resp.mult,seguro:true,feriado:S.resp.feriado?{mult:S.resp.feriado}:null}:H;
  /* (2.14) el desglose de cómo te pagan, renglón por renglón */
  var D=desglose(L,hx),nf=function(x){return String(Math.round(num(x)*100)/100).replace('.',',')};
  var fila=function(n,sub,m,neg){return '<li><span class="dg-n">'+esc(n)+(sub?'<small>'+sub+'</small>':'')+'</span><b>'+(neg?'− ':'')+money2(m)+'</b></li>'};
  var h='<div class="lec-prop stack" id="lec-prop">';
  if(D.gana.length||D.descuentos.length){
    h+='<div class="desglose"><p class="dg-h">lo que ganás</p><ul class="dg-l">'
      +D.gana.map(function(g){
        var sub='';
        if(g.id==='basico')sub='por mes'+(D.hora?' · tu hora vale '+money2(D.hora):'');
        else if(g.id==='horasExtra'&&g.cantidad)sub=nf(g.cantidad)+' h × '+money2(g.porHora)+(D.mult?' · '+multTxt(D.mult).toLowerCase()+' de tu hora':'');
        else if(g.cantidad)sub='cantidad '+nf(g.cantidad);
        return fila(g.nombre,sub,g.monto);
      }).join('')+'</ul>'
      +(D.haberes?'<p class="dg-t"><span>Ganás en total</span><b>'+money2(D.haberes)+'</b></p>':'')
      +(D.descuentos.length?'<p class="dg-h">lo que te descuentan</p><ul class="dg-l">'+D.descuentos.map(function(d){return fila(d.nombre,d.pct!=null?nf(d.pct)+' % de lo que ganás':'',d.monto,true)}).join('')+'</ul>':'')
      +(D.totDescuentos?'<p class="dg-t"><span>Te descuentan en total</span><b>− '+money2(D.totDescuentos)+'</b></p>':'')
      +(D.liquido?'<p class="dg-fin"><span>Te queda en mano</span><b>'+money2(D.liquido)+'</b></p>':'')+'</div>';
  }else{
    var enc=propuesta(L,hx,moneyR).map(function(x){return esc(x.texto)}).join(', ');
    h+='<p class="lec-enc"><b>Encontré:</b> '+(enc||'no reconocí los valores principales')+'.</p>';
  }
  h+='<p class="note">'+(L.cuadra?'<span class="ok-t">✓ La cuenta cierra:</span> lo que ganás − lo que te descuentan = lo que te queda.':'<span class="ojo-t">Ojo:</span> lo que ganás ('+money(L.totales.haberes)+') − los descuentos ('+money(L.totales.descuentos)+') no da lo que cobrás ('+money(L.totales.liquido)+'). Revisá los renglones.')+'</p>'
    +'<div class="field"><label for="lec-mes" class="sub-l">Es el recibo de</label><input id="lec-mes" type="month" value="'+esc(S.mes)+'"></div>'
    +'<details class="lec-ren"><summary>Ver los '+L.renglones.length+' renglones y corregir</summary><ul class="list">'
    +L.renglones.map(function(r){return '<li><div class="lec-r"><select data-lecr="'+r.i+'" aria-label="Qué es: '+esc(r.linea.slice(0,40))+'">'+opcionesConcepto(r.id)+'</select><b>'+money(r.importe)+'</b></div><small>'+esc(r.linea.replace(/\s+/g,' ').slice(0,70))+(r.cantidad?' · cantidad '+String(r.cantidad).replace('.',','):'')+(r.aprendido?' · aprendido':'')+'</small></li>'}).join('')
    +'</ul></details>';
  /* lo que no está claro, con opciones simples */
  if(H)h+='<p class="dg-h">antes de hacer las cuentas, contame</p>';
  if(H&&H.opciones&&H.opciones.length>1)h+=pregunta('mult','¿Te pagan las horas extra '+(H.opciones.indexOf(2)>=0?'al doble':'así')+'? (cada hora extra vale '+money2(H.valorHora)+')',H.opciones.map(function(m){return [m,multTxt(m)]}),S.resp.mult);
  else if(H&&H.sinCoincidencia)h+='<p class="note">La hora extra vale '+money2(H.valorHora)+', pero no coincide con ninguna regla común. Revisá el sueldo básico o cargá las reglas en Mi perfil.</p>';
  if(H){
    var mins=[0,15,30];if(mins.indexOf(S.resp.minutos)<0)mins.push(S.resp.minutos);
    h+=pregunta('minutos','En el día, ¿desde cuántos minutos cuentan las extras?',mins.map(function(m){return [m,m?'Desde '+m+' minutos':'Desde el primer minuto']}),S.resp.minutos)
      +pregunta('redondeo','Los minutos del mes, ¿cómo se pagan?',[['media','A la media hora'],['cuarto','Al cuarto de hora'],['no','Sin redondear']],S.resp.redondeo);
    if(H.feriado&&H.feriado.mult!==num(R.multFin))h+=pregunta('feriado','Los feriados, ¿te los pagan ×'+String(H.feriado.mult).replace('.',',')+'?',[[H.feriado.mult,'Sí, ×'+String(H.feriado.mult).replace('.',',')],['','No, como el finde (×'+String(R.multFin).replace('.',',')+')']],S.resp.feriado||'');
  }
  var P=precision(Object.assign({},ctx.state,{recibos:[{mes:S.mes,liquido:L.campos.liquido,moneda:'UYU'}]}),{liquido:num(L.campos.liquido)});
  h+='<p class="note">Es una estimación: guardado este recibo, el cálculo de '+esc(mesTxt(S.mes).toLowerCase())+' queda <b>'+P.nombre+'</b>'+(P.margen?' (± '+money(P.margen)+')':'')+'. Los demás meses se calculan con las reglas que confirmes.</p>'
    +'<div class="row-btns"><button class="btn primary" type="button" data-lec="guardar-todo">Listo: usar este recibo para mis cálculos</button><button class="btn" type="button" data-lec="guardar-recibo">Solo guardar el recibo de '+esc(MESL[Number(S.mes.slice(5,7))-1])+'</button><button class="btn quiet" type="button" data-lec="cancelar">Cancelar</button></div></div>';
  return h;
}

/* ---------- Guardar ---------- */
function guardar(enPerfil){
  var st=ctx.state,pl=releer(),L=S.L,c=L.campos,mes=($('#lec-mes')||{}).value||S.mes;
  if(!/^\d{4}-\d{2}$/.test(mes)){toast('Elegí de qué mes es el recibo');return}
  if(!(num(c.liquido)>0)){toast('No encontré el líquido: cargalo a mano');return}
  st.plantillasRecibo=pl;
  var r={id:uid(),mes:mes,moneda:ingresoDe(st).moneda,empleador:L.empleador,fuente:S.fuente};
  ['nominal','haberes','aportes','fonasa','irpf','otros','liquido','horasCant','horasMonto'].forEach(function(k){if(c[k]!=null)r[k]=Math.round(num(c[k])*100)/100});
  st.recibos=(st.recibos||[]).filter(function(x){return x.mes!==mes});st.recibos.push(r);
  if(enPerfil){
    var H=S.H,h=st.perfil.horas=Object.assign({},st.perfil.horas);
    if(c.nominal)st.sueldo.nominal=c.nominal;
    if(H&&H.valorHora&&S.resp.mult){var bas=num(c.nominal)||0;h.multSem=S.resp.mult;if(bas>0)h.divisor=Math.round(bas*S.resp.mult/H.valorHora);h.activo=true}
    if(H){h.umbral=num(h.jornada||540)+num(S.resp.minutos);h.redondeo=S.resp.redondeo;if(S.resp.feriado)h.multFeriado=num(S.resp.feriado);else delete h.multFeriado}
    h.preguntado=true;
    st.sueldo.tarifaManual=null;
  }
  S=null;ctx.persist();ctx.renderAll();
  toast('Guardé el recibo de '+MESL[Number(mes.slice(5,7))-1]+' de '+mes.slice(0,4)+(enPerfil?' y actualicé tu perfil':'')+'. Ahora cobrás ≈ '+money(liqReal(st).liquido));
}

export function initLector(){
  var raiz=$('#p-sueldo');
  raiz.addEventListener('click',function(e){
    var b=e.target.closest('[data-lec]');
    if(b){
      var a=b.getAttribute('data-lec');
      if(a==='pegar'){pegar=!pegar;ctx.renderAll();var t=$('#lec-texto');if(t)t.focus();return}
      if(a==='leer'){var tx=($('#lec-texto')||{}).value||'';if(!tx.trim()){toast('Pegá el texto del recibo');return}procesar(renglonesDeTexto(tx),'texto');return}
      if(a==='ejemplo'){procesar(renglonesDeTexto(EJ_RECIBO),'ejemplo');return}
      if(a==='cancelar'){S=null;ctx.renderAll();return}
      if(a==='guardar-todo'){guardar(true);return}
      if(a==='guardar-recibo'){guardar(false);return}
    }
    var q=e.target.closest('[data-lecq]');
    if(q&&S){var k=q.getAttribute('data-lecq'),v=q.getAttribute('data-val');S.resp[k]=k==='redondeo'?v:(v===''?null:num(v));ctx.renderAll();return}
  });
  raiz.addEventListener('change',async function(e){
    if(e.target.matches&&e.target.matches('[data-lecr]')&&S){S.cambios[e.target.getAttribute('data-lecr')]=e.target.value;S.base=S.base||{};S.L.renglones.forEach(function(r){S.base[r.i]=r});releer();ctx.renderAll();return}
    if(e.target.id==='lec-mes'&&S){S.mes=e.target.value;return}
    if(e.target.id!=='lec-pdf')return;
    var f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
    toast('Leyendo el PDF…');
    try{var mod=await import('./recibos.js');procesar(await mod.textoPdf(f),'pdf')}
    catch(er){toast(/password/i.test(String(er&&er.name||er))?'Ese PDF tiene contraseña: no lo puedo leer. Cargalo a mano.':'No pude leer ese PDF. Probá pegando el texto o cargalo a mano.')}
  });
}
