/* Estado de la app: valores por defecto, migraciones, guardado en IndexedDB y respaldo.
   Todo queda en el teléfono: no hay servidor ni cuentas. */
import {extractoEjemplo} from './logica/extracto-ejemplo.js';
import {num} from './logica/util.js';
import {iso,parse,usarFeriados} from './logica/fechas.js';
import {cobroDesde,fechaCobro} from './logica/plan.js';
import {feriadosActivos} from './logica/feriados.js';
import {monedasBase} from './logica/monedas.js';
import {horasPorDefecto} from './logica/sueldo.js';
import {categoriasBase,categoriasDesde} from './logica/categorias.js';
import {pactoBase,pactoDesdePlan,normApartado} from './logica/pacto.js';
import {normEsperado} from './logica/supervivencia.js';
import {normIngresos} from './logica/ingresos.js';

/* Subí este número cuando cambie la forma del estado y agregá el paso en migrar().
   v1–v3: archivo HTML · v4: voz y meta · v5: perfil propio y feriados editables · v6: sincronización
   v7: opciones de feriados laborables en el perfil · v8: metas, dólares y días de licencia
   v9: año en que confirmaste la BPC (para avisar cada enero); pagos de fijos con monto real
   v10: tipo de ingreso y moneda en el perfil; descuentos propios e ingresos de cada mes en el sueldo
   v11: categorías de gasto editables (state.categorias)
   v12: plan.minimo (mínimo aceptable), plan.sobrante y plan.sobranteSemana (a dónde va lo que sobra)
   v13: recibos de sueldo guardados mes a mes (state.recibos) y plantillas por empleador para leer PDFs
   v14: el pacto del Libro del Ahorro (state.pacto: cuándo se selló); quien ya usaba la app lo tiene sellado
   v15: fijos compartidos: state.grupos (con quién compartís y cómo se reparte); cada fijo puede tener grupo, reparto,
        paga y pagador; los pagos guardan el total, tu parte y lo que te devolvieron. Los fijos de antes quedan como «Solo míos».
   v16: Sueldo ordenado: perfil.horas.preguntado («¿hay horas extra?» se pregunta una sola vez; quien ya armó su perfil no la ve),
        perfil.horas.multFeriado (opcional, p. ej. ×2,5), perfil.ingreso.factura y sueldo.factura (cobro con factura).
   v19: la plata apartada (state.pacto.apartado [{id, tipo, monto, nota}]): lo que tenés pero no es para gastar.
        Quien ya usaba la app arranca sin nada apartado (nada cambia en las cuentas).
   v20: modo supervivencia: la plata que te va a entrar antes de cobrar (state.plan.esperado [{id, fecha, monto, nota}]).
        No cuenta hasta que llega. Quien ya usaba la app arranca sin nada esperado.
   v21: ingresos fijos (state.ingresosFijos [{id, nombre, monto, dia}]) y state.plan.vistos (los ya respondidos).
        Quien ya usaba la app arranca sin ingresos fijos (nada cambia en las cuentas).
   v22: cuando vendo: lo que entró en el pacto (state.plan.entradas [{id, fecha, monto, nota}]) y la ganancia guardada
        por semana (state.plan.ganancia {inicio: monto}). Quien ya usaba la app arranca sin nada (nada cambia).
   v23: una sola forma de cobrar, por mes (sueldo o factura). Quien cobraba cada 15 días, cada semana, por jornal o cuando
        vendía pasa a mensual (la regla de su perfil, o el 5.º día hábil). Su plata, su pacto (hasta su fecha), sus gastos,
        su historial y lo que anotó que entró quedan igual.
   v24: el horario de cada uno (perfil.horas.entrada, salida y dias 'lv' | 'ls'). Alguien nuevo arranca sin horario;
        a quien ya usaba la app se le completan las reglas que tenía (las de siempre), así sus cuentas dan idéntico. */
export var VERSION_ESTADO=26;

function hoyISO(){return iso(new Date())}
/* Feriados: por defecto solo cuentan los 5 no laborables (1/1, 1/5, 18/7, 25/8, 25/12).
   cobro.laborableHabil: los feriados laborables (Carnaval, Turismo, 12/10…) son días hábiles para el cobro.
   horas.feriadoLaborable: un feriado laborable trabajado se paga como día 'comun' o como 'feriado'. */
/* (2.26) Horas extra de alguien nuevo: sin horario (lo pide Sueldo → Horas extra) y reglas comunes (la hora extra al doble,
   desde el primer minuto, sin redondear). Las reglas de antes, que eran las de Agus, son el puesto «Agente de CRM». */
export function horasNuevas(){return {activo:true,divisor:240,multSem:2,multFin:2,finDividido:false,redondeo:'no',umbral:0,jornada:0,mesCobro:'siguiente',entrada:'',salida:'',dias:'lv',feriadoLaborable:'comun',preguntado:false}}
/* Las que tenía todo el mundo hasta la 2.25 (se conservan al migrar: nada cambia en las cuentas de nadie) */
function horasDeAntes(){return Object.assign(horasPorDefecto(),{feriadoLaborable:'comun',preguntado:false,dias:'lv'})}
export function perfilBase(){return {nombre:'',hecho:false,ingreso:{tipo:'uy',moneda:'UYU'},cobro:{tipo:'habil5',dia:30,laborableHabil:true},horas:horasNuevas(),recibosAgus:false}}
/* descuentos: los del sueldo personalizado [{id,nombre,tipo:'pct'|'monto',valor}].
   ingresosMes: lo que cobraste cada mes con ingreso variable {'aaaa-mm': monto}. */
function sueldoBase(){return {nominal:0,bonoFijo:0,hijos:0,conyuge:false,otros:0,bpc:6864,bpcAnio:new Date().getFullYear(),tarifaManual:null,diasLicencia:0,descuentos:[],ingresosMes:{}}}

/* Instalación nueva: en blanco. El plan arranca hoy y va hasta el próximo cobro. */
export function defaults(hoy){
  hoy=hoy||hoyISO();
  return {
    v:VERSION_ESTADO,ejemplo:false,
    perfil:perfilBase(),
    plan:{monto:0,modo:'monto',ahorro:0,pct:30,inicio:hoy,cobro:cobroDesde(hoy,{tipo:'habil5'}),minimo:null,sobrante:'siguiente',sobranteSemana:{},esperado:[],vistos:[],reparto:'parejo',compras:0},
    gastos:[],
    sueldo:sueldoBase(),
    extracto:{texto:'',formato:'auto',hormiga:400,cat:{},columnas:{},descartadas:{}}, /* columnas: por banco, qué columna es cada cosa (planillas); descartadas: avisos de Hoy que ya viste */
    recibo:{},
    fijos:[],fijosPagos:{},hist:[],logros:{},
    horas:[],
    feriados:{quitados:[],agregados:[]}, /* cambios a la lista de feriados.js */
    voz:{cats:{}},                       /* palabra dicha → categoría que corregiste */
    meta:{creado:null,ultimoExport:null},/* fechas aaaa-mm-dd */
    sync:{t:{},borrados:{}},             /* cuándo cambió cada cosa, para juntar aparatos (logica/sync.js) */
    metas:[],                            /* {id,nombre,objetivo,para:'aaaa-mm',aportes:[{id,fecha,monto}]} */
    monedas:monedasBase(),               /* cotización del dólar que cargás en Ajustes */
    categorias:categoriasBase(),         /* categorías de gasto, editables en Ajustes (logica/categorias.js) */
    recibos:[],                          /* recibos de sueldo confirmados, mes a mes (logica/recibos.js) */
    plantillasRecibo:{},                 /* por empleador: qué renglón del PDF es cada campo */
    pacto:pactoBase(),                   /* {sellado:fecha|null, numero, usd}: los datos del pacto viven en plan */
    grupos:[],                           /* con quién compartís fijos (logica/reparto.js y compartidos.js) */
    repetidos:[],                        /* gastos que se repetían solos (2.16, se sacó en 2.30: se conserva lo guardado) */
    ingresosFijos:[]                     /* (2.20) lo que te entra todos los meses además del sueldo (logica/ingresos.js) */
  };
}

/* Datos de base de las versiones 1 a 4 (con números de ejemplo). Sirven de base al migrar esos datos y para los datos de ejemplo. */
/* Números inventados: los datos reales de cada persona viven solo en su teléfono, nunca en el código. */
var EXCEL=[
  {id:'x1',fecha:'2026-10-01',tipo:'sem',min:30,src:'excel'},
  {id:'x2',fecha:'2026-10-02',tipo:'sem',min:15,src:'excel'},
  {id:'x3',fecha:'2026-10-03',tipo:'fin',min:360,src:'excel'},
  {id:'x4',fecha:'2026-10-05',tipo:'sem',min:15,src:'excel'},
  {id:'x5',fecha:'2026-10-06',tipo:'sem',min:30,src:'excel'},
  {id:'x6',fecha:'2026-10-07',tipo:'sem',min:15,src:'excel'},
  {id:'x7',fecha:'2026-10-08',tipo:'sem',min:20,src:'excel'},
  {id:'x8',fecha:'2026-10-09',tipo:'sem',min:15,src:'excel'},
  {id:'x9',fecha:'2026-10-10',tipo:'fin',min:360,src:'excel'},
  {id:'x10',fecha:'2026-10-11',tipo:'fin',min:300,src:'excel'}
];
function legado(){
  return {
    plan:{monto:36000,modo:'monto',ahorro:9000,pct:30,inicio:'2026-10-12',cobro:'2026-11-09',reparto:'parejo',compras:3000},
    sueldo:{nominal:45000,bonoFijo:0,bonoHora:93.75,heCom:375,heEsp:187.5,hijos:0,conyuge:false,otros:0,bpc:6864,redondeo:true},
    horas:EXCEL.map(function(h){return Object.assign({},h)})
  };
}
/* "Empezar con datos de ejemplo": el sueldo y las horas de octubre de Agus, marcados como ejemplo. */
export function ejemplo(hoy){
  var s=defaults(hoy),L=legado();
  s.ejemplo=true;
  s.perfil.hecho=true;
  /* el ejemplo es el puesto de CRM: horario de 12 a 21 y sus reglas */
  s.perfil.horas=horasDeAntes();s.perfil.puesto='crm';
  s.plan=L.plan;
  s.plan.cobro=fechaCobro(2026,10,s.perfil.cobro); /* 5.º día hábil de noviembre con la regla actual */
  s.sueldo.nominal=L.sueldo.nominal;
  s.horas=L.horas.map(function(h){return Object.assign(h,{ej:true})});
  s.pacto=pactoDesdePlan(s,hoy||hoyISO());
  /* Fijos de ejemplo (2.11): solo tuyos, compartidos en pareja y entre 3 (nombres y números inventados) */
  s.grupos=[
    {id:'g-casa',nombre:'Casa',personas:[{id:'yo',nombre:'Vos',ingreso:45000},{id:'p-sofi',nombre:'Sofi',ingreso:36000}],reparto:{tipo:'iguales',pct:{},montos:{}}},
    {id:'g-amigos',nombre:'Plataformas',personas:[{id:'yo',nombre:'Vos',ingreso:0},{id:'p-leo',nombre:'Leo',ingreso:0},{id:'p-juli',nombre:'Juli',ingreso:0}],reparto:{tipo:'iguales',pct:{},montos:{}}}
  ];
  s.fijos=[
    {id:'ej-alq',nombre:'Alquiler',monto:22000,dia:15,cat:'Vivienda',grupo:'g-casa',paga:'yo'},
    {id:'ej-ute',nombre:'UTE',monto:2600,dia:20,cat:'Servicios',variable:true,grupo:'g-casa',paga:'otro',pagador:'p-sofi',reparto:{tipo:'ingresos',pct:{},montos:{}}},
    {id:'ej-int',nombre:'Internet',monto:1900,dia:18,cat:'Celular e internet',grupo:'g-casa',paga:'cada'},
    {id:'ej-net',nombre:'Netflix',monto:690,dia:16,cat:'Suscripciones',grupo:'g-amigos',paga:'otro',pagador:'p-leo'},
    {id:'ej-cel',nombre:'Celular',monto:1100,dia:25,cat:'Celular e internet'}
  ];
  s.perfil.horas.preguntado=true;
  /* un recibo de ejemplo del mes anterior (inventado), para ver «¿Te pagaron bien?» */
  s.recibos=[{id:'ej-rec',mes:'2026-09',moneda:'UYU',nominal:45000,haberes:47812.5,aportes:7171.88,fonasa:2151.56,irpf:0,otros:47.81,liquido:38441.25,horasCant:7.5,horasMonto:2812.5,fuente:'ejemplo'}];
  /* el boleto de hoy, para ver «Gastaste hoy» */
  s.gastos=[{id:'ej-hoy',fecha:hoy||hoyISO(),monto:50,nota:'Boleto',cat:'Transporte'}];
  /* un extracto de ejemplo (inventado) para ver el detector de la Tarjeta */
  s.extracto.texto=extractoEjemplo();
  var k=s.plan.cobro;s.fijosPagos={};s.fijosPagos[k]={'ej-alq':{monto:22000,parte:11000,fecha:'2026-10-15',nombre:'Alquiler',paga:'yo'}};
  return s;
}
function obj(o){return (o&&typeof o==='object'&&!Array.isArray(o))?o:{}}
function r2(x){return Math.round(x*100)/100}

/* Lleva cualquier estado guardado (de cualquier versión) a la forma actual. */
export function migrar(d){
  var x=JSON.parse(JSON.stringify(d)),vx=x.v||1,antes=vx<5;
  var base=defaults(),old=legado();
  var viejo=vx<4&&(x.ejemplo===true||vx<2);
  var state={v:VERSION_ESTADO,ejemplo:antes?false:!!x.ejemplo,
    perfil:perfilBase(),
    plan:Object.assign({},antes?old.plan:base.plan,x.plan||{}),
    gastos:Array.isArray(x.gastos)?x.gastos:[],
    sueldo:Object.assign({},antes?old.sueldo:base.sueldo,viejo?{}:(x.sueldo||{})),
    extracto:Object.assign({},base.extracto,x.extracto||{}),
    recibo:obj(x.recibo),
    fijos:Array.isArray(x.fijos)?x.fijos:[],
    fijosPagos:obj(x.fijosPagos),
    hist:Array.isArray(x.hist)?x.hist:[],
    logros:obj(x.logros),
    horas:viejo?old.horas:(Array.isArray(x.horas)?x.horas:(antes?old.horas:[])),
    feriados:{quitados:Array.isArray(obj(x.feriados).quitados)?x.feriados.quitados:[],agregados:Array.isArray(obj(x.feriados).agregados)?x.feriados.agregados:[]},
    voz:{cats:obj(obj(x.voz).cats)},
    meta:Object.assign({},base.meta,obj(x.meta)),
    sync:{t:obj(obj(x.sync).t),borrados:obj(obj(x.sync).borrados)},
    metas:Array.isArray(x.metas)?x.metas:[],
    monedas:Object.assign(monedasBase(),obj(x.monedas)),
    categorias:Array.isArray(x.categorias)&&x.categorias.length?x.categorias:null,
    recibos:Array.isArray(x.recibos)?x.recibos:[],
    plantillasRecibo:obj(x.plantillasRecibo),
    pacto:Object.assign(pactoBase(),obj(x.pacto)),
    /* v15: sin grupos, todos los fijos son solo tuyos (nada cambia en las cuentas) */
    grupos:Array.isArray(x.grupos)?x.grupos:[],
    /* v18: sin gastos que se repiten solos (nada cambia) */
    repetidos:Array.isArray(x.repetidos)?x.repetidos:[],
    /* v21: sin ingresos fijos (nada cambia) */
    ingresosFijos:normIngresos(x.ingresosFijos)};
  /* v14: a quien ya usaba la app no se le muestra el prólogo: su plan pasa a ser su pacto */
  if(vx<14&&!state.pacto.sellado)state.pacto=pactoDesdePlan(state,hoyISO());
  /* v19: la plata apartada, siempre como lista prolija (sin nada apartado, nada cambia) */
  state.pacto.apartado=normApartado(state.pacto.apartado);
  /* v20: la plata que te va a entrar, siempre como lista prolija */
  state.plan.esperado=normEsperado(state.plan.esperado);
  state.plan.vistos=Array.isArray(state.plan.vistos)?state.plan.vistos.map(String):[];
  /* v11: las categorías de siempre pasan a ser tu lista, más las que ya usaban tus gastos. Ningún gasto cambia. */
  if(!state.categorias)state.categorias=categoriasDesde(state);
  /* v12: sin mínimo (vale lo mismo que el objetivo) y lo que sobra pasa a la semana siguiente, como siempre */
  if(state.plan.minimo===undefined)state.plan.minimo=null;
  if(state.plan.sobrante!=='ahorro')state.plan.sobrante='siguiente';
  state.plan.sobranteSemana=obj(state.plan.sobranteSemana);
  /* v25-26: el reparto del mes (parejo o recomendado; el colchón de 2.39 se sacó) y el sobre de compras */
  state.plan.reparto=state.plan.reparto==='recomendado'?'recomendado':'parejo';delete state.plan.colchon;
  state.plan.compras=Math.max(0,Math.round(num(state.plan.compras)));
  if(state.sueldo.diasLicencia===undefined)state.sueldo.diasLicencia=0;
  /* v9: la BPC guardada hasta ahora es la de 2026 */
  if(vx<9&&!x.sueldo||vx<9&&!x.sueldo.bpcAnio)state.sueldo.bpcAnio=2026;
  if(!(x.plan&&x.plan.modo)){state.plan.modo='monto';state.plan.ahorro=Math.round(num(state.plan.monto)*num(state.plan.pct)/100)}
  if(vx<3&&!viejo&&num(state.sueldo.bonoFijo)===2000)state.sueldo.bonoFijo=0;
  if(!state.extracto.cat||typeof state.extracto.cat!=='object')state.extracto.cat={};
  /* v17: el lector de bancos recuerda las columnas de cada planilla y los avisos de Hoy que ya viste (el texto no cambia) */
  state.extracto.columnas=obj(state.extracto.columnas);state.extracto.descartadas=obj(state.extracto.descartadas);
  /* Horas del Excel: el archivo las sumaba si faltaban. Acá se hace una sola vez, al migrar desde el archivo,
     para que si borrás una no vuelva a aparecer. */
  if(vx<4){
    var ids={};state.horas.forEach(function(h){ids[h.id]=1});
    old.horas.forEach(function(h){if(!ids[h.id])state.horas.push(h)});
  }
  if(antes){
    /* v5: las reglas de horas pasan al perfil. Los datos de antes son de Agus. */
    var s=state.sueldo,p=state.perfil,hora=num(s.nominal)/240;
    p.nombre='Agus';p.hecho=true;p.recibosAgus=true;p.horas=horasDeAntes();
    p.horas.redondeo=s.redondeo===false?'no':'media';
    /* Si había cambiado a mano el valor de las horas, se respeta */
    if(Math.abs(num(s.heCom)-r2(hora*2))>0.005||Math.abs(num(s.heEsp)-r2(hora))>0.005||Math.abs(num(s.bonoHora)-r2(hora*0.5))>0.005)
      s.tarifaManual={heCom:num(s.heCom),heEsp:num(s.heEsp),bonoHora:num(s.bonoHora)};
    else s.tarifaManual=null;
    delete s.heCom;delete s.heEsp;delete s.bonoHora;delete s.redondeo;
  }else{
    var xp=obj(x.perfil);
    state.perfil=Object.assign(perfilBase(),xp,{ingreso:Object.assign(perfilBase().ingreso,obj(xp.ingreso)),cobro:Object.assign(perfilBase().cobro,obj(xp.cobro)),horas:Object.assign(vx<24?horasDeAntes():perfilBase().horas,obj(xp.horas))});
  }
  /* v10: hasta ahora todos cobraban sueldo en Uruguay, en pesos */
  if(!Array.isArray(state.sueldo.descuentos))state.sueldo.descuentos=[];
  state.sueldo.ingresosMes=obj(state.sueldo.ingresosMes);
  if(vx<7)corregirCobroV7(state);
  /* v23: siempre por mes. Sale lo que armaba las otras formas de cobrar; lo demás no cambia */
  var cc=state.perfil.cobro;
  if(cc){['frecuencia','dias','dow','horizonte','diaV'].forEach(function(k){delete cc[k]});if(['habil5','ultimoHabil','fijo'].indexOf(cc.tipo)<0)cc.tipo='habil5'}
  if(state.pacto)delete state.pacto.pct;
  delete state.plan.porDiaBase;
  /* v16: «¿hay horas extra?» ya está contestado para quien armó su perfil o cargó horas */
  if(vx<16&&state.perfil.horas&&obj(obj(x.perfil).horas).preguntado===undefined)state.perfil.horas.preguntado=!!(state.perfil.hecho||state.perfil.recibosAgus||state.horas.length);
  /* Los datos que venían de los recibos de Agus son del puesto de CRM */
  if(state.perfil.recibosAgus&&!state.perfil.puesto)state.perfil.puesto='crm';
  /* v24: los días de trabajo (de lunes a viernes, como se contaba hasta ahora) */
  if(state.perfil.horas&&state.perfil.horas.dias!=='ls')state.perfil.horas.dias='lv';
  return state;
}
/* v7: los feriados laborables pasan a ser días comunes. Si la fecha de cobro guardada era la que daba
   la regla vieja (laborables como no hábiles), se recalcula con la nueva. Una fecha puesta a mano no se toca. */
function corregirCobroV7(state){
  var c=state.perfil.cobro,p=state.plan;
  if(!c||c.tipo==='fijo'||!p||!/^\d{4}-\d{2}-\d{2}$/.test(String(p.cobro)))return;
  var lista=feriadosActivos(state.feriados),d=parse(p.cobro),y=d.getFullYear(),m=d.getMonth();
  try{
    usarFeriados(lista,{laborableHabil:false});
    var vieja=fechaCobro(y,m,c);
    usarFeriados(lista,{laborableHabil:c.laborableHabil!==false});
    var nueva=fechaCobro(y,m,c);
    if(p.cobro===vieja&&nueva!==vieja&&(!p.inicio||nueva>p.inicio))p.cobro=nueva;
  }finally{usarFeriados(lista,{laborableHabil:c.laborableHabil!==false,pagoLaborable:state.perfil.horas&&state.perfil.horas.feriadoLaborable})}
}

/* ---------- Respaldo ---------- */
export function armarRespaldo(state,ahora){
  return {app:'proyecto-ahorros',exportado:(ahora||new Date()).toISOString(),datos:state};
}
var CLAVES=['plan','gastos','sueldo','extracto','recibo','fijos','fijosPagos','hist','logros','horas'];
/* Acepta { app:'proyecto-ahorros', exportado, datos:{...} } o directamente el objeto de estado.
   Devuelve {ok:true, estado, exportado} o {ok:false, error}. */
export function leerRespaldo(texto){
  var o;
  try{o=JSON.parse(String(texto||'').replace(/^﻿/,'').trim())}
  catch(e){return {ok:false,error:'No es un respaldo válido: el texto no está completo o no es JSON.'}}
  if(!o||typeof o!=='object'||Array.isArray(o))return {ok:false,error:'No es un respaldo válido.'};
  var datos=o,exportado=null;
  if(o.app!==undefined||o.datos!==undefined){
    if(o.app!=='proyecto-ahorros')return {ok:false,error:'Este archivo no es de Proyecto Ahorros.'};
    datos=o.datos;exportado=o.exportado||null;
  }
  if(!datos||typeof datos!=='object'||!CLAVES.some(function(k){return k in datos}))return {ok:false,error:'El respaldo no tiene datos de la app.'};
  return {ok:true,estado:migrar(datos),exportado:exportado};
}
function plural(n,uno,varios){return n+' '+(n===1?uno:varios)}
export function resumenDatos(st){
  var p=[plural(st.gastos.length,'gasto','gastos'),plural(st.horas.length,'registro de horas','registros de horas'),plural(st.fijos.length,'fijo','fijos'),plural(st.hist.length,'mes cerrado','meses cerrados'),plural(Object.keys(st.logros).length,'logro','logros')];
  if(st.extracto.texto&&st.extracto.texto.trim())p.push('un extracto pegado');
  return p.join(', ');
}
/* Días desde el último respaldo (o desde que empezaste a usar la app). null si no se sabe. */
export function diasSinRespaldo(state,hoy){
  var ref=state.meta.ultimoExport||state.meta.creado;if(!ref)return null;
  var a=ref.split('-').map(Number),b=hoy.split('-').map(Number);
  return Math.round((new Date(b[0],b[1]-1,b[2],12)-new Date(a[0],a[1]-1,a[2],12))/864e5);
}

/* ---------- Guardado: un solo documento en IndexedDB ---------- */
var DB='proyecto-ahorros',STORE='estado',KEY='principal',LS='proyecto-ahorros-v1',dbP=null;
function abrir(){
  return new Promise(function(ok,mal){
    if(typeof indexedDB==='undefined'){mal(new Error('Sin IndexedDB'));return}
    var r=indexedDB.open(DB,1);
    r.onupgradeneeded=function(){r.result.createObjectStore(STORE)};
    r.onsuccess=function(){var d=r.result;d.onclose=function(){dbP=null};d.onversionchange=function(){d.close();dbP=null};ok(d)};
    r.onerror=function(){mal(r.error)};
    r.onblocked=function(){mal(new Error('IndexedDB bloqueada'))};
  });
}
/* Empezar de cero (2.14): borra la base del teléfono (con las copias) y lo de la app en localStorage,
   menos las preferencias del aparato que se pasen en «conservar» (tema, sonido…). */
export async function borrarTodo(conservar){
  conservar=conservar||[];
  if(dbP){try{(await dbP).close()}catch(e){}dbP=null}
  try{await new Promise(function(ok){var q=indexedDB.deleteDatabase(DB);q.onsuccess=q.onerror=q.onblocked=function(){ok()}})}catch(e){}
  try{Object.keys(localStorage).forEach(function(k){if(/^pa-|^proyecto-ahorros/.test(k)&&conservar.indexOf(k)<0)localStorage.removeItem(k)})}catch(e){}
}
/* iOS a veces cierra la conexión con la app en segundo plano: si falla, se reabre una vez. */
async function conDB(fn){
  for(var i=0;i<2;i++){
    try{if(!dbP)dbP=abrir();return await fn(await dbP)}
    catch(e){dbP=null;if(i===1)throw e}
  }
}
function leerLS(){try{var r=localStorage.getItem(LS);return r?JSON.parse(r):null}catch(e){return null}}
function guardarLS(o){try{localStorage.setItem(LS,JSON.stringify(o));return true}catch(e){return false}}

function leerClave(k){
  return conDB(function(db){return new Promise(function(ok,mal){
    var q=db.transaction(STORE).objectStore(STORE).get(k);
    q.onsuccess=function(){ok(q.result||null)};q.onerror=function(){mal(q.error)};
  })});
}
function escribirClave(k,o){
  return conDB(function(db){return new Promise(function(ok,mal){
    var tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(o,k);
    tx.oncomplete=function(){ok()};tx.onerror=function(){mal(tx.error)};tx.onabort=function(){mal(tx.error)};
  })});
}

export async function cargar(){
  try{return (await leerClave(KEY))||leerLS()}
  catch(e){return leerLS()}
}
/* Devuelve 'idb', 'ls' (respaldo en localStorage) o false si no se pudo guardar. */
export async function guardar(o){
  try{await escribirClave(KEY,o);return 'idb'}
  catch(e){return guardarLS(o)?'ls':false}
}

/* ---------- Copias automáticas ----------
   Antes de actualizar la forma de los datos (migrar), de importar un respaldo o de reemplazar todo,
   se guarda una copia de lo que había. Quedan las 3 más nuevas, en este teléfono. */
var COPIAS='copias',MAX_COPIAS=3;
export function agregarCopia(lista,datos,motivo,ahora){
  var l=Array.isArray(lista)?lista.slice():[];
  l.unshift({fecha:(ahora||new Date()).toISOString(),motivo:motivo||'',v:(datos&&datos.v)||1,datos:JSON.parse(JSON.stringify(datos))});
  return l.slice(0,MAX_COPIAS);
}
/* ¿Hay que guardar una copia antes de migrar? (datos de una versión anterior) */
export function necesitaMigrar(d){return !!d&&(d.v||1)<VERSION_ESTADO}
export async function leerCopias(){try{var l=await leerClave(COPIAS);return Array.isArray(l)?l:[]}catch(e){return []}}
export async function guardarCopia(datos,motivo){
  if(!datos)return false;
  try{await escribirClave(COPIAS,agregarCopia(await leerCopias(),datos,motivo));return true}catch(e){return false}
}
/* Pide al navegador que no borre los datos aunque falte espacio. */
export async function pedirPersistencia(){
  try{
    if(!(navigator.storage&&navigator.storage.persist))return null;
    if(await navigator.storage.persisted())return true;
    return await navigator.storage.persist();
  }catch(e){return null}
}
