/* Entender frases habladas (puro, sin DOM, sin internet). Todo con reglas.
   interpretar('gasté 850 en el súper', {hoy:'2026-10-13', fijos:[...], aprendido:{...}}) devuelve
   {intencion:'gasto'|'fijo'|'pagado'|'horas'|'consulta'|'nada', ...datos, avisos:[], alternativas:[]}.
   Nunca guarda nada: la pantalla muestra una tarjeta y vos confirmás. */
import {parse,iso,addDays,esFeriado,pagaComoFeriado,MES,MESL,DIA,DIAL} from './fechas.js';
import {CATS} from './extracto.js';

export function sinTildes(s){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'')}
export function claveVoz(s){return sinTildes(String(s).toLowerCase()).replace(/[^a-z0-9ñ\s]/g,' ').replace(/\s+/g,' ').trim()}

/* ---------- Palabras ---------- */
var UNI={cero:0,un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,
  dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiun:21,veintiuno:21,veintiuna:21,veintidos:22,veintitres:23,veinticuatro:24,
  veinticinco:25,veintiseis:26,veintisiete:27,veintiocho:28,veintinueve:29};
var DEC={treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90};
var CEN={cien:100,ciento:100,doscientos:200,doscientas:200,trescientos:300,trescientas:300,cuatrocientos:400,cuatrocientas:400,quinientos:500,quinientas:500,
  seiscientos:600,seiscientas:600,setecientos:700,setecientas:700,ochocientos:800,ochocientas:800,novecientos:900,novecientas:900};
var DIAS={domingo:0,lunes:1,martes:2,miercoles:3,jueves:4,viernes:5,sabado:6};
var MESES={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
var DOLAR={dolares:1,dolar:1,usd:1,verdes:1};
/* Palabras que no forman parte de la nota del gasto */
var RELLENO=('gaste gastamos gasto gastos gastado gastaste pague pago pagamos pagado compre compramos compra compras saque puse fueron fue son es en el la los las lo de del al '
  +'un una unos unas por para con me mi mis y que pesos peso dolares dolar usd verdes plata anota anotame anotar agrega agregame agregar agregue suma sumame sumar registra '
  +'carga cargame cargar hoy ayer anteayer antier ya se le a o tuve salio salieron costo cuesta ahi eso esto nuevo nueva otro otra gastito gastitos').split(' ');
var RELLENO_FIJO=RELLENO.concat('fijo fija fijos mes meses mensual mensuales todos cada dia dias'.split(' '));

/* Cómo se muestra la nota cuando se reconoce el nombre */
var NOMBRES={'super':'Súper','supermercado':'Supermercado','pedidos ya':'Pedidos Ya','pedidosya':'Pedidos Ya','mcdonalds':"McDonald's",'mc donalds':"McDonald's",
  'mcdonald s':"McDonald's",'tienda inglesa':'Tienda Inglesa','ute':'UTE','ose':'OSE','stm':'STM','ancap':'ANCAP','antel':'Antel','netflix':'Netflix','spotify':'Spotify',
  'rappi':'Rappi','uber':'Uber','disco':'Disco','devoto':'Devoto','tata':'Tata','farmashop':'Farmashop','steam':'Steam','playstation':'PlayStation','boleto stm':'Boleto STM'};
/* Además del diccionario del extracto (CATS), palabras que se dicen y no aparecen en el extracto */
var CATS_VOZ=[
  ['Transporte',/\bNAFTA\b|\bBONDI\b|\bOMNIBUS\b|\bTAXIS?\b|\bPASAJES?\b|\bGASOIL\b/],
  ['Delivery y comida',/ALMUERZO|\bCENA\b|COMIDA|BIZCOCHO|EMPANADA|HAMBURGUES|MILANESA|DESAYUNO|MERIENDA|\bCAFES?\b|\bBAR\b|DELIVERY|PEDIDO/],
  ['Salud',/FARMA|REMEDIO|MEDICAMENTO|DOCTOR|DENTISTA|PASTILLA/],
  ['Kiosco y almacén',/QUIOSCO|CIGARRO|PUCHO|ALFAJOR/],
  ['Supermercado',/VERDULERIA|CARNICERIA|\bFERIA\b|COMPRAS DEL MES/],
  ['Juegos',/\bPLAY\b|JUEGO/]
];
/* Tipos de gasto fijo (los mismos de la pestaña Fijos) */
export var FIJO_CATS=['Vivienda','Servicios','Celular e internet','Suscripciones','Salud','Transporte','Deudas y cuotas','Educación','Otros'];
var FIJO_REGLAS=[
  ['Vivienda',/ALQUILER|GASTOS COMUNES|EXPENSAS|HIPOTECA|VIVIENDA/],
  ['Celular e internet',/INTERNET|CELULAR|ANTEL|CLARO|MOVISTAR|TELEFONO|FIBRA|\bCABLE\b/],
  ['Servicios',/\bUTE\b|\bOSE\b|\bGAS\b|\bAGUA\b|\bLUZ\b|CONTRIBUCION|IMPUESTO|TRIBUTO/],
  ['Suscripciones',/NETFLIX|SPOTIFY|DISNEY|\bHBO\b|\bMAX\b|YOUTUBE|PRIME|ICLOUD|APPLE|GOOGLE|CHATGPT|CLAUDE|CRUNCHYROLL|PARAMOUNT|SUSCRIPCION|STEAM|XBOX|PLAYSTATION|\bPSN\b/],
  ['Salud',/GIMNASIO|\bGYM\b|MUTUALISTA|MUTUAL|EMERGENCIA|SEGURO|SALUD|CASMU|MEDICA/],
  ['Transporte',/BOLETO|\bSTM\b|NAFTA|TRANSPORTE|ESTACIONAMIENTO|GARAGE|PEAJE/],
  ['Deudas y cuotas',/PRESTAMO|CUOTA|TARJETA|CREDITO|DEUDA/],
  ['Educación',/FACULTAD|\bFACU\b|CURSO|\bUTU\b|COLEGIO|ESCUELA|INGLES|CLASES|UNIVERSIDAD/]
];

/* ---------- Texto → palabras ---------- */
export function tokenizar(texto){
  var t=String(texto||'').toLowerCase()
    .replace(/u\s?\$\s?s|us\s?\$|u\$d/g,' dolares ')
    .replace(/\$/g,' ');
  var out=[],re=/\d+(?:[.,:]\d+)*|[a-záéíóúüñ']+/g,m;
  while((m=re.exec(t))){var o=m[0].replace(/'/g,'');out.push({o:o,n:sinTildes(o)})}
  return out;
}
function numDigitos(s){
  if(!/^\d/.test(s))return null;
  if(/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s))return parseFloat(s.replace(/\./g,'').replace(',','.'));
  if(/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s))return parseFloat(s.replace(/,/g,''));
  if(/^\d+,\d{1,2}$/.test(s))return parseFloat(s.replace(',','.'));
  if(/^\d+(\.\d{1,2})?$/.test(s))return parseFloat(s);
  return null;
}
/* Lee un número que empieza en t[i]: "850", "1.200", "mil doscientos", "15 mil", "dos lucas", "media luca". */
export function leerNumero(t,i){
  var total=0,cur=0,tiene=false,ult=null,j=i;
  while(j<t.length){
    var w=t[j].n,d=numDigitos(w),sig=t[j+1]&&t[j+1].n;
    if(d!==null){if(tiene&&ult!=='mil')break;cur+=d;tiene=true;ult='dig';j++;continue}
    if(w==='media'&&!tiene&&(sig==='luca'||sig==='lucas')){total+=500;tiene=true;ult='mil';j+=2;continue}
    if(w in UNI){if(tiene&&ult!=='mil'&&ult!=='cen'&&ult!=='y')break;cur+=UNI[w];tiene=true;ult='uni';j++;continue}
    if(w in DEC){if(tiene&&ult!=='mil'&&ult!=='cen')break;cur+=DEC[w];tiene=true;ult='dec';j++;continue}
    if(w==='y'&&ult==='dec'&&sig&&(sig in UNI)&&UNI[sig]<10){ult='y';j++;continue}
    if(w in CEN){if(tiene&&ult!=='mil')break;cur+=CEN[w];tiene=true;ult='cen';j++;continue}
    if(w==='mil'||w==='luca'||w==='lucas'){if(ult==='mil')break;total+=(cur||1)*1000;cur=0;tiene=true;ult='mil';j++;continue}
    break;
  }
  if(!tiene)return null;
  /* "un", "una" sueltos no son números ("un fijo"), salvo "una hora", "un minuto" */
  if(j-i===1&&/^(un|una|uno)$/.test(t[i].n)&&!/^(hora|horas|minuto|minutos|cuarto)$/.test(t[j]&&t[j].n||''))return null;
  return {v:total+cur,i:i,fin:j};
}

/* ---------- Fechas ---------- */
function ultimoDiaSemana(hoy,dow){var d=parse(hoy),k=(d.getDay()-dow+7)%7;return iso(addDays(d,-k))}
function fechaDia(hoy,dia,mes){
  var h=parse(hoy),y=h.getFullYear(),m=mes?mes-1:h.getMonth();
  function arma(yy,mm){var last=new Date(yy,mm+1,0,12).getDate();return iso(new Date(yy,mm,Math.min(dia,last),12))}
  var f=arma(y,m);
  if(f>hoy)f=mes?arma(y-1,m):arma(m===0?y-1:y,m===0?11:m-1);
  return f;
}
/* Busca la fecha dicha. Devuelve {fecha, usados:{índices}, explicita, futuro} */
function leerFecha(t,hoy){
  var u={},fecha=null,futuro=false;
  for(var i=0;i<t.length&&!fecha;i++){
    var w=t[i].n;
    if(w==='hoy'){fecha=hoy;u[i]=1;break}
    if(w==='ayer'){
      if(i>=2&&t[i-1].n==='de'&&t[i-2].n==='antes'){fecha=iso(addDays(parse(hoy),-2));u[i]=u[i-1]=u[i-2]=1}
      else{fecha=iso(addDays(parse(hoy),-1));u[i]=1}
      break;
    }
    if(w==='anteayer'||w==='antier'){fecha=iso(addDays(parse(hoy),-2));u[i]=1;break}
    if(w==='manana'&&!(t[i+1]&&t[i+1].n==='de')){futuro=true;u[i]=1;continue}
    if(w in DIAS){
      fecha=ultimoDiaSemana(hoy,DIAS[w]);u[i]=1;
      if(i>0&&/^(el|este|esta)$/.test(t[i-1].n))u[i-1]=1;
      if(t[i+1]&&t[i+1].n==='pasado'){u[i+1]=1;if(fecha===hoy)fecha=iso(addDays(parse(hoy),-7))}
      break;
    }
    /* "el 10", "el día 10", "10 de octubre", "el 10 de octubre" */
    var j=i,pre=false;
    if(t[j].n==='el'){j++;pre=true}
    if(t[j]&&t[j].n==='dia'){j++;pre=true}
    var nd=t[j]?leerNumero(t,j):null;
    if(nd&&nd.v>=1&&nd.v<=31&&nd.v===Math.round(nd.v)){
      var k=nd.fin,mes=null;
      if(t[k]&&t[k].n==='de'&&t[k+1]&&(t[k+1].n in MESES)){mes=MESES[t[k+1].n];k+=2}
      var luego=t[nd.fin]&&t[nd.fin].n;
      if((pre||mes)&&!/^(pesos|peso|dolares|lucas|luca|mil|minutos|minuto|horas|hora|min|h|hs)$/.test(luego||'')){
        fecha=fechaDia(hoy,nd.v,mes);for(var q=i;q<k;q++)u[q]=1;break;
      }
    }
  }
  return {fecha:fecha,usados:u,futuro:futuro};
}

/* ---------- Duraciones ---------- */
function esHora(w){return /^(hora|horas|h|hs)$/.test(w)}
function esMin(w){return /^(minuto|minutos|min|mins)$/.test(w)}
/* "20 minutos", "media hora", "una hora", "6 horas y media", "6 y media", "9 horas 20", "6:30" */
function leerDuracion(t,i,flojo){
  var w=t[i].n,a=t[i+1]&&t[i+1].n,b=t[i+2]&&t[i+2].n,c=t[i+3]&&t[i+3].n;
  var hm=/^(\d{1,2}):(\d{2})$/.exec(w);
  if(hm)return {min:+hm[1]*60+ +hm[2],fin:i+1+(esHora(a)?1:0)};
  if(w==='media'&&esHora(a))return {min:30,fin:i+2};
  if(w==='cuarto'&&a==='de'&&esHora(b))return {min:15,fin:i+3};
  if(esHora(w)&&a==='y'&&b==='media')return {min:90,fin:i+3};
  var n=leerNumero(t,i);if(!n)return null;
  var j=n.fin,x=t[j]&&t[j].n;
  if(n.v===1&&x==='cuarto'&&t[j+1]&&t[j+1].n==='de'&&t[j+2]&&esHora(t[j+2].n))return {min:15,fin:j+3};
  if(esMin(x))return {min:n.v,fin:j+1};
  if(esHora(x)){
    var min=n.v*60;j++;
    var y=t[j]&&t[j].n,z=t[j+1]&&t[j+1].n;
    if(y==='y'&&z==='media')return {min:min+30,fin:j+2};
    if(y==='y'&&z==='cuarto')return {min:min+15,fin:j+2};
    var k=y==='y'?j+1:j,m=t[k]?leerNumero(t,k):null;
    if(m&&m.v<60){var e=m.fin+(t[m.fin]&&esMin(t[m.fin].n)?1:0);return {min:min+m.v,fin:e}}
    return {min:min,fin:j};
  }
  if(flojo&&x==='y'&&t[j+1]&&t[j+1].n==='media'&&n.v<=24)return {min:n.v*60+30,fin:j+2};
  return null;
}

/* ---------- Categorías ---------- */
export function categoriaGasto(nota,aprendido){
  var k=claveAprendida(nota);if(!k)return 'Otros';
  aprendido=aprendido||{};
  if(aprendido[k])return aprendido[k];
  var ws=k.split(' ');for(var i=0;i<ws.length;i++)if(ws[i].length>2&&aprendido[ws[i]])return aprendido[ws[i]];
  var u=claveVoz(nota).toUpperCase();
  for(var c=0;c<CATS.length;c++)if(CATS[c][1].test(u))return CATS[c][0];
  for(var v=0;v<CATS_VOZ.length;v++)if(CATS_VOZ[v][1].test(u))return CATS_VOZ[v][0];
  return 'Otros';
}
export function categoriaFijo(nombre){
  var u=claveVoz(nombre).toUpperCase();
  for(var i=0;i<FIJO_REGLAS.length;i++)if(FIJO_REGLAS[i][1].test(u))return FIJO_REGLAS[i][0];
  return 'Otros';
}
/* Guarda lo que corregiste: la próxima vez esa palabra va a esa categoría.
   La clave es la nota sin palabras de relleno ("lo de Juan" y "Juan" son lo mismo). */
function claveAprendida(s){return claveVoz(s).split(' ').filter(function(w){return w&&RELLENO.indexOf(w)<0}).join(' ')}
export function aprender(aprendido,nota,cat){var k=claveAprendida(nota);if(k)aprendido[k]=cat;return aprendido}
function nombreLindo(tokens){
  var o=tokens.map(function(x){return x.o}).join(' ').trim();if(!o)return '';
  var k=claveVoz(o);if(NOMBRES[k])return NOMBRES[k];
  return o.charAt(0).toUpperCase()+o.slice(1);
}

/* ---------- Interpretar ---------- */
function hay(t,re){return t.some(function(x){return re.test(x.n)})}
function frase(t){return ' '+t.map(function(x){return x.n}).join(' ')+' '}
function numeros(t,usados){
  var out=[];
  for(var i=0;i<t.length;i++){
    if(usados[i])continue;
    var n=leerNumero(t,i);
    if(n){var libre=true;for(var q=n.i;q<n.fin;q++)if(usados[q])libre=false;
      if(libre){out.push(n);i=n.fin-1}}
  }
  return out;
}
function resto(t,usados,relleno){
  var out=[];
  t.forEach(function(x,i){
    if(usados[i])return;
    if(x.n==='ya'&&i>0&&/^pedidos?$/.test(t[i-1].n)){out.push(x);return}
    if(relleno.indexOf(x.n)>=0)return;
    if(/^\d/.test(x.n))return;
    out.push(x);
  });
  return out;
}
function marcar(usados,n){for(var q=n.i;q<n.fin;q++)usados[q]=1}
export function buscarFijo(fijos,texto){
  var k=claveVoz(texto);if(!k||!fijos)return null;
  var mejor=null,pts=0;
  fijos.forEach(function(f){
    var n=claveVoz(f.nombre);if(!n)return;
    var p=0;
    if(k===n)p=100;else if(k.indexOf(n)>=0||n.indexOf(k)>=0)p=50+Math.min(n.length,k.length);
    else n.split(' ').forEach(function(w){if(w.length>2&&k.split(' ').indexOf(w)>=0)p+=10+w.length});
    if(p>pts){pts=p;mejor=f}
  });
  return mejor;
}

export function interpretar(texto,opt){
  opt=opt||{};
  var hoy=opt.hoy,t=tokenizar(texto),f=frase(t),r={texto:String(texto||'').trim(),avisos:[],alternativas:[]};
  if(!t.length){r.intencion='nada';return r}
  var dolares=hay(t,/^(dolares|dolar|usd|verdes)$/);

  /* Consulta: "cuánto me queda esta semana", "cuánto voy a cobrar", "cuánto llevo gastado" */
  if(/ cuanto | cuanta | cuantos | cuantas /.test(f)||/^ que me queda/.test(f)||/\?\s*$/.test(r.texto)){
    r.intencion='consulta';
    /* (2.25) por jornal o cuando vendo no hay cobro: «cuánto me falta» es cuánto te alcanza, y «cuánto vendí» lo que entró */
    if(opt.entradas&&/ vend| entr| cobre | cobramos | gane /.test(f))r.que='entro';
    else if(opt.entradas&&(/ falta|faltan | alcanza| dura /.test(f)))r.que='alcanza';
    else if(/ falta|faltan /.test(f)&&/ cobr/.test(f))r.que='dias';
    else if(/ cobr| sueldo | liquido /.test(f))r.que='cobro';
    else if(/ fijo/.test(f))r.que='fijos';
    else if(/ extra| horas /.test(f))r.que='horas';
    else if(/ ahorr| guard/.test(f))r.que='ahorro';
    else if(/ gastad| gaste | llevo | gastando /.test(f))r.que=/ semana /.test(f)?'gastado-semana':'gastado';
    else if(/ hoy | por dia | al dia /.test(f))r.que='dia';
    else r.que='semana';
    return r;
  }

  /* Gasto fijo nuevo: "agregá un gasto fijo de alquiler de 15 mil el día 1", "netflix 450 por mes el 10" */
  if(/ fij[oa]s? | por mes | al mes | mensual| todos los meses | cada mes /.test(f)){
    var uf={},dia=null;
    for(var i=0;i<t.length&&dia===null;i++){
      var j=i;
      if(/^(el|los|cada|todos)$/.test(t[j].n)){j++;if(t[j]&&t[j].n==='los')j++}
      if(t[j]&&/^dias?$/.test(t[j].n))j++;
      if(j===i)continue;
      var nd=t[j]?leerNumero(t,j):null;
      if(nd&&nd.v>=1&&nd.v<=31&&!/^(pesos|peso|mil|lucas|luca)$/.test(t[nd.fin]&&t[nd.fin].n||'')){dia=nd.v;for(var q=i;q<nd.fin;q++)uf[q]=1}
    }
    var ns=numeros(t,uf),monto=null;
    ns.forEach(function(n){if(monto===null||n.v>monto.v)monto=n});
    if(monto)marcar(uf,monto);
    var nom=nombreLindo(resto(t,uf,RELLENO_FIJO));
    r.intencion='fijo';r.nombre=nom;r.monto=monto?monto.v:null;r.dia=dia||1;r.cat=categoriaFijo(nom);
    if(!dia)r.avisos.push('No dijiste qué día se paga: puse el 1.');
    if(monto===null)r.avisos.push('No entendí el monto.');
    if(dolares)r.avisos.push('Dijiste dólares. Confirmá el monto en pesos.');
    r.dolares=dolares;
    ns.forEach(function(n){if(n!==monto)r.alternativas.push({etiqueta:'$ '+fmtNum(n.v)+' por mes',cambios:{monto:n.v}})});
    return r;
  }

  var fe=leerFecha(t,hoy),usados=Object.assign({},fe.usados);
  var fecha=fe.fecha||hoy;
  if(fe.futuro&&!fe.fecha)r.avisos.push('No se pueden cargar cosas a futuro: puse hoy.');

  /* Horas extra: "hice 20 minutos extra hoy", "trabajé el sábado 6 horas y media" */
  var claveHoras=hay(t,/^(extra|extras|trabaje|trabajo|trabajamos|quede|quedo|hice|feriado|turno|labure)$/);
  var dur=null;
  for(var d=0;d<t.length&&!dur;d++){
    if(usados[d])continue;
    var x=leerDuracion(t,d,claveHoras);
    if(x){dur=x;for(var q2=d;q2<x.fin;q2++)usados[q2]=1}
  }
  if(dur&&!hay(t,/^(pesos|peso|lucas|luca)$/)){
    var dijoFeriado=hay(t,/^feriado$/),dw=parse(fecha).getDay(),esF=esFeriado(fecha),fer=esF&&pagaComoFeriado(fecha);
    r.intencion='horas';r.fecha=fecha;r.min=Math.round(dur.min);
    r.tipo=(dw===0||dw===6||fer||(dijoFeriado&&!esF))?'fin':'sem';
    r.feriado=fer;
    if(fer)r.avisos.push('El '+fechaCorta(fecha)+' es feriado: se paga como fin de semana o feriado.');
    else if(esF&&dw>=1&&dw<=5){
      /* Es un día común: si dijiste el turno entero, cuenta solo lo que pasa la jornada (como "por presencia") */
      var R=Object.assign({umbral:555,jornada:540},opt.horas||{}),total=r.min;
      if(total>=4*60){r.min=total>=R.umbral?Math.max(0,Math.round(total-R.jornada)):0;r.presencia=total}
      r.avisos.push('El '+fechaCorta(fecha)+' es feriado laborable: se paga como un día común.'+(r.presencia?' Estuviste '+fmtMin(total)+(r.min>0?', así que suma '+fmtMin(r.min)+' de extra.':', no pasa de la jornada: no suma extra.'):''));
      r.alternativas.push({etiqueta:'Como feriado',cambios:{tipo:'fin',min:total}});
    }
    else if(dijoFeriado)r.avisos.push('El '+fechaCorta(fecha)+' no está en la lista de feriados. Lo cargo como feriado igual; cambialo si no corresponde.');
    if(r.min>16*60)r.avisos.push('Son más de 16 horas: revisá el tiempo.');
    if(r.tipo==='fin'&&!esF&&!dijoFeriado&&dw>=1&&dw<=5)r.alternativas.push({etiqueta:'Entre semana',cambios:{tipo:'sem'}});
    return r;
  }

  var ns2=numeros(t,usados),monto2=null;
  ns2.forEach(function(n){if(monto2===null||n.v>monto2.v)monto2=n});
  if(monto2)marcar(usados,monto2);
  var notaToks=resto(t,usados,RELLENO),nota=nombreLindo(notaToks);
  var pago=hay(t,/^(pague|pagamos|pagado|pago|abone|abonamos|abonado)$/);
  var fijo=buscarFijo(opt.fijos,notaToks.map(function(x){return x.o}).join(' '));

  /* (2.25) Plata que entró, por jornal o cuando vendo: "vendí 1200 de empanadas", "me entraron 1500", "cobré 800" */
  if(opt.entradas&&monto2&&hay(t,/^(vendi|vendimos|vendio|cobre|cobramos|entro|entraron|gane|ganamos|ingreso|ingresaron|hice|hicimos)$/)&&!pago){
    var ENT=/^(vendi|vendimos|vendio|cobre|cobramos|me|nos|entro|entraron|gane|ganamos|ingreso|ingresaron|hice|hicimos|plata|pesos|hoy|ayer)$/;
    r.intencion='entrada';r.monto=monto2.v;r.fecha=fecha;
    r.nota=nombreLindo(notaToks.filter(function(x){return !ENT.test(x.n)}));
    return r;
  }
  /* Fijo pagado: "pagué el alquiler", "ya pagué UTE" */
  if(pago&&!monto2){
    r.intencion='pagado';r.dicho=nota;r.fijoId=fijo?fijo.id:null;r.nombre=fijo?fijo.nombre:nota;
    if(!fijo)r.avisos.push(nota?'No encontré un gasto fijo que se llame "'+nota+'".':'No entendí qué fijo pagaste.');
    return r;
  }

  /* Gasto */
  var gastoClaro=monto2||hay(t,/^(gaste|gastamos|compre|compramos|pague|pagamos|saque)$/)||categoriaGasto(nota,opt.aprendido)!=='Otros';
  if(!gastoClaro){r.intencion='nada';return r}
  r.intencion='gasto';r.monto=monto2?monto2.v:null;r.fecha=fecha;r.nota=nota;r.cat=categoriaGasto(nota,opt.aprendido);r.dolares=dolares;
  if(dolares)r.avisos.push('Dijiste dólares. Confirmá el monto en pesos.');
  if(r.monto===null)r.avisos.push('No entendí el monto.');
  ns2.forEach(function(n){
    if(n===monto2)return;
    r.alternativas.push({etiqueta:'$ '+fmtNum(n.v)+' en vez de $ '+fmtNum(monto2.v),cambios:{monto:n.v}});
    if(!fe.fecha&&n.v>=1&&n.v<=31&&n.v===Math.round(n.v))r.alternativas.push({etiqueta:'Fue el día '+n.v,cambios:{fecha:fechaDia(hoy,n.v,null)}});
  });
  /* "el 10" leído como fecha sin otro monto: puede ser el monto */
  if(r.monto===null&&fe.fecha&&fe.fecha!==hoy){
    var nd2=null;for(var i2 in fe.usados){var nn=leerNumero(t,+i2);if(nn){nd2=nn;break}}
    if(nd2)r.alternativas.push({etiqueta:'$ '+fmtNum(nd2.v)+' hoy',cambios:{monto:nd2.v,fecha:hoy}});
  }
  if(pago&&fijo)r.alternativas.push({etiqueta:'Marcar '+fijo.nombre+' como pagado',cambios:{intencion:'pagado',fijoId:fijo.id,nombre:fijo.nombre}});
  return r;
}

/* ---------- Textos ---------- */
export function fmtNum(n){return Math.round(n).toLocaleString('es-UY')}
export function fechaTxt(f,hoy){
  var d=parse(f),base=DIA[d.getDay()]+' '+d.getDate()+' '+MES[d.getMonth()];
  if(f===hoy)return 'hoy, '+base;
  if(hoy&&f===iso(addDays(parse(hoy),-1)))return 'ayer, '+base;
  return base;
}
function fmtMin(m){var h=Math.floor(m/60),r=Math.round(m%60);return h?h+' h'+(r?' '+r+' min':''):r+' min'}
function fechaCorta(f){var d=parse(f);return DIA[d.getDay()]+' '+d.getDate()+' '+MES[d.getMonth()]}
function fechaLarga(f){var d=parse(f);return DIAL[d.getDay()]+' '+d.getDate()+' de '+MESL[d.getMonth()]}
function pesos(n){return fmtNum(n)+' pesos'}
function durTxt(m){var h=Math.floor(m/60),r=Math.round(m%60);return h?(h+(h===1?' hora':' horas')+(r?' y '+r+' minutos':'')):r+' minutos'}

/* Respuesta a una consulta. d trae los números ya calculados por la app. */
export function responder(que,d){
  switch(que){
    case 'alcanza':return !d.alcanza?'Todavía no tenés un plan armado.':'Tu plata alcanza '+d.alcanza.dias+(d.alcanza.dias===1?' día':' días')+(d.alcanza.hasta?', hasta el '+fechaLarga(d.alcanza.hasta):'')+'.'+(d.alcanza.pago?' Tu próximo pago es '+d.alcanza.pago.nombre+(d.alcanza.pago.dias>0?', en '+d.alcanza.pago.dias+(d.alcanza.pago.dias===1?' día':' días'):', hoy')+(d.alcanza.llega?': llegás.':'.'):'');
    case 'entro':return 'En este pacto te entraron '+pesos(d.entro||0)+(d.entroVeces?' en '+d.entroVeces+(d.entroVeces===1?' vez':' veces'):'')+'.';
    case 'cobro':return 'Vas a cobrar unos '+pesos(d.liquido)+' el '+fechaLarga(d.cobro)+'.';
    case 'dias':return d.dias>0?'Faltan '+d.dias+(d.dias===1?' día':' días')+' para cobrar: el '+fechaLarga(d.cobro)+'.':d.dias===0?'Cobrás hoy.':'Ya cobraste: cerrá el mes en Logros.';
    case 'fijos':return 'Tus gastos fijos suman '+pesos(d.fijosMes)+' por mes. Antes de cobrar vencen '+pesos(d.fijosPeriodo)+'.';
    case 'horas':return 'Este mes llevás '+durTxt(d.minSem)+' entre semana y '+durTxt(d.minFin)+' de fin de semana o feriado. Suman unos '+pesos(d.extras)+' antes de descuentos.';
    case 'ahorro':return 'Tu meta es guardar '+pesos(d.ahorro)+' hasta el '+fechaLarga(d.cobro)+'.';
    case 'gastado':return 'Llevás gastados '+pesos(d.gastadoPlan)+' de '+pesos(d.paraGastar)+' que tenés hasta cobrar.';
    case 'gastado-semana':return d.semana?'Esta semana llevás gastados '+pesos(d.semana.gastado)+' de '+pesos(d.semana.tenias)+'.':'Hoy está fuera de las fechas del plan.';
    case 'dia':
      if(!d.semana)return 'Hoy está fuera de las fechas del plan.';
      return d.semana.queda<0?'Esta semana te pasaste por '+pesos(-d.semana.queda)+'. Hoy mejor no gastar.':'Hoy podés gastar unos '+pesos(d.semana.porDia)+'.';
    default:
      if(!d.semana)return 'Hoy está fuera de las fechas del plan.';
      if(d.semana.queda<0)return 'Esta semana te pasaste por '+pesos(-d.semana.queda)+'. Se descuenta de la semana que viene.';
      return 'Esta semana te quedan '+pesos(d.semana.queda)+': unos '+pesos(d.semana.porDia)+' por día hasta el '+DIAL[parse(d.semana.fin).getDay()]+'.';
  }
}

