/* Lector de extractos de cualquier banco, tarjeta o billetera de Uruguay (2.13, puro, sin DOM).
   Se apoya en extracto.js (el lector original, que no cambia):
   - reconoce de dónde viene por el encabezado: BROU, Itaú, Santander, Scotiabank, BBVA, HSBC; tarjetas OCA,
     Cabal, Creditel, Anda; billeteras Prex, Midinero, Mercado Pago. Si no, queda «genérico» y se lee igual;
   - en una tarjeta de crédito los cargos vienen en positivo (y los pagos en negativo): se leen así solos;
   - las planillas (CSV o Excel) se leen como tabla: adivina qué columna es la fecha, el detalle y el importe
     (o débito y crédito). Si no está seguro pregunta, y lo recuerda por banco (extracto.columnas[banco]);
   - limpia el nombre del comercio ("POS COMPRA 4521 TATA SUC 12 MVD" → "Tata") con un diccionario de
     comercios uruguayos que además dice la categoría;
   - marca cuotas ("cuota 3/6"), comisiones, intereses, seguros, recargos, retiros de efectivo y transferencias. */
import * as EX from './extracto.js';

function sinTildes(s){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'')}
function pad(n){return (n<10?'0':'')+n}

/* ---------- De dónde viene ---------- */
/* [id, nombre, tipo, cómo aparece en el encabezado] · tipo: banco | tarjeta | billetera */
export var BANCOS=[
  ['brou','BROU','banco',/\bE-?BROU\b|\bBROU\b|BANCO\s+(DE\s+LA\s+)?REPUBLICA/i],
  ['itau','Itaú','banco',/\bITAU\b/i],
  ['santander','Santander','banco',/\bSANTANDER\b/i],
  ['scotia','Scotiabank','banco',/\bSCOTIA\s?BANK\b|\bSCOTIA\b/i],
  ['bbva','BBVA','banco',/\bBBVA\b/i],
  ['hsbc','HSBC','banco',/\bHSBC\b/i],
  ['oca','OCA','tarjeta',/\bOCA\b(?!\s*\d)|TARJETA\s+OCA\b/i],
  ['cabal','Cabal','tarjeta',/\bCABAL\b/i],
  ['creditel','Creditel','tarjeta',/\bCREDITEL\b/i],
  ['anda','Anda','tarjeta',[/\bANDA\b/,/ASOCIACION NACIONAL DE AFILIADOS|TARJETA\s+ANDA\b/i]],
  ['prex','Prex','billetera',/\bPREX\b/i],
  ['midinero','Midinero','billetera',/\bMI\s?DINERO\b/i],
  ['mercadopago','Mercado Pago','billetera',/MERCADO\s?PAGO|RELEASE_DATE|TRANSACTION_NET_AMOUNT/i]
];
export var GENERICO={id:'generico',nombre:'tu banco',tipo:'banco'};
/* Un resumen de tarjeta de crédito (aunque lo emita un banco) */
var ES_TARJETA=/ESTADO DE CUENTA DE TARJETA|RESUMEN DE (CUENTA DE )?TARJETA|TARJETA DE CREDITO|PAGO MINIMO|LIMITE DE CREDITO|FECHA DE CIERRE/i;
var CON_FECHA=/^\s*(\d{1,2}[\/.-]\d{1,2}([\/.-]\d{2,4})?\b|\d{4}-\d{2}-\d{2}|\d{1,2}\s+(de\s+)?(ene|feb|mar|abr|may|jun|jul|ago|set|sep|oct|nov|dic))/i;

/* El encabezado: lo que viene antes del primer movimiento (así un «PAGO OCA» de la lista no confunde) */
function encabezado(texto){
  var out=[];
  String(texto||'').split(/\r?\n/).some(function(x){
    if(!x.trim())return false;
    if(CON_FECHA.test(x))return true;
    out.push(x);return out.length>=10;
  });
  return sinTildes(out.join('\n')).slice(0,900);
}
function busca(re,h){var l=Array.isArray(re)?re:[re],m=null;l.forEach(function(r){var x=r.exec(h);if(x&&(!m||x.index<m.index))m=x});return m}
/* Devuelve {id, nombre, tipo, tarjeta:bool} */
export function detectarBanco(texto){
  var h=encabezado(texto),mejor=null,pos=1e9;
  BANCOS.forEach(function(b){var m=busca(b[3],h);if(m&&m.index<pos){pos=m.index;mejor=b}});
  var t=mejor?{id:mejor[0],nombre:mejor[1],tipo:mejor[2]}:Object.assign({},GENERICO);
  t.tarjeta=t.tipo==='tarjeta'||ES_TARJETA.test(h);
  return t;
}
export function bancoPorId(id){var b=BANCOS.filter(function(x){return x[0]===id})[0];return b?{id:b[0],nombre:b[1],tipo:b[2],tarjeta:b[2]==='tarjeta'}:Object.assign({tarjeta:false},GENERICO)}
/* Cómo leer el signo: lo que eligió la persona manda; en automático, una tarjeta trae los cargos en positivo */
export function formatoPara(banco,formato){return formato&&formato!=='auto'?formato:banco.tarjeta?'pos':'auto'}

/* ---------- Planillas (CSV, TSV o Excel) ---------- */
/* Separa una línea de CSV respetando las comillas */
function celdasCsv(l,sep){
  var out=[],cur='',q=false;
  for(var i=0;i<l.length;i++){
    var c=l[i];
    if(q){if(c==='"'){if(l[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}
    else if(c==='"')q=true;
    else if(c===sep){out.push(cur.trim());cur=''}
    else cur+=c;
  }
  out.push(cur.trim());
  return out;
}
var COLS={
  fecha:/^(fecha|date|fec\.?|f\.?\s?mov|dia)\b|^fecha\s|release_date|fecha_|^fecha$/i,
  detalle:/descrip|detalle|concepto|referencia(?!_id)|comercio|establecimiento|transaction_type|glosa|movimiento|^nombre/i,
  monto:/^(importe|monto|valor|amount|total|pesos|\$|importe \$|importe uyu|monto uyu)\b|net_amount|^importe|^monto/i,
  debito:/d[eé]bito|^debe$|^cargos?$|egreso|^salida/i,
  credito:/cr[eé]dito|^haber$|abono|ingreso|^entrada/i,
  saldo:/saldo|balance/i,
  moneda:/^moneda|^divisa|currency/i
};
function tipoColumna(c){
  c=sinTildes(String(c||'')).trim();if(!c||c.length>40)return null;
  if(COLS.saldo.test(c))return 'saldo';
  if(COLS.moneda.test(c))return 'moneda';
  if(COLS.fecha.test(c))return 'fecha';
  if(COLS.debito.test(c))return 'debito';
  if(COLS.credito.test(c))return 'credito';
  if(COLS.monto.test(c))return 'monto';
  if(COLS.detalle.test(c))return 'detalle';
  return null;
}
/* ¿El texto es una planilla con títulos? (CSV con ; , | o tabuladores) Devuelve {sep, cab, filas:[[…]], n} o null.
   Sin una fila de títulos con «fecha» no es planilla: lo lee el lector de siempre, línea por línea. */
export function tablaDe(texto){
  var lineas=String(texto||'').split(/\r?\n/).filter(function(l){return l.trim()});
  if(lineas.length<2)return null;
  var seps=[';','\t','|',','];
  for(var i=0;i<Math.min(15,lineas.length);i++){
    for(var s=0;s<seps.length;s++){
      var c=celdasCsv(lineas[i],seps[s]);if(c.length<3)continue;
      var tipos=c.map(tipoColumna).filter(Boolean);
      if(tipos.indexOf('fecha')>=0&&tipos.length>=2){
        var filas=lineas.map(function(l){return celdasCsv(l,seps[s])});
        return {sep:seps[s],cab:i,filas:filas,n:c.length};
      }
    }
  }
  return null;
}
/* Filas de una hoja de Excel (valores) → misma forma que tablaDe */
export function tablaDeFilas(filas){
  var f=filas.map(function(r){return (r||[]).map(function(v){return v===null||v===undefined?'':v})}).filter(function(r){return r.some(function(v){return String(v).trim()})});
  var cab=-1;
  for(var i=0;i<Math.min(15,f.length);i++){
    var tipos=f[i].map(tipoColumna).filter(Boolean);
    if(tipos.indexOf('fecha')>=0&&tipos.length>=2){cab=i;break}
  }
  return {sep:'\t',cab:cab,filas:f,n:f.reduce(function(m,r){return Math.max(m,r.length)},0)};
}
/* Una planilla de Excel pasada a texto (con tabuladores), para guardarla como el extracto */
export function filasATexto(filas){
  return filas.map(function(r){return (r||[]).map(function(v){
    if(v===null||v===undefined)return '';
    if(typeof v==='number')return String(v);
    return String(v).replace(/[\t\r\n]+/g,' ').trim();
  }).join('\t')}).filter(function(l){return l.replace(/\t/g,'').trim()}).join('\n');
}

/* Fecha de una celda: dd/mm/aaaa, dd-mm-aaaa, aaaa-mm-dd (con hora o sin), "12 oct 2026" o número de Excel */
export function fechaCelda(v,hoy){
  if(typeof v==='number'||/^\d{5}(\.\d+)?$/.test(String(v).trim())){
    var n=Number(v);if(n<20000||n>80000)return null;
    var d=new Date(Date.UTC(1899,11,30)+Math.floor(n)*864e5);
    return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate());
  }
  var s=String(v||'').trim(),m;
  if((m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s)))return valida(+m[1],+m[2],+m[3]);
  var r=EX.leer(s+'  x  1,00',hoy||'2100-01-01','neg').movs[0];
  return r&&r.f||null;
}
function valida(y,m,d){var t=new Date(y,m-1,d,12);return t.getMonth()===m-1&&t.getDate()===d?y+'-'+pad(m)+'-'+pad(d):null}
/* Importe de una celda: 1.234,56 · 1,234.56 · -1234.56 · (1.234,56) · $ 1.234 · 1234,5- */
export function montoCelda(v){
  if(typeof v==='number')return isFinite(v)?v:null;
  var s=String(v||'').trim();if(!s||!/\d/.test(s))return null;
  if(/[a-z]{3,}/i.test(s.replace(/\b(uyu|usd|u\$s|us\$)\b/ig,'')))return null;
  if(/^\d{1,4}[\/.-]\d{1,2}[\/.-]\d{1,4}$|\d:\d\d/.test(s))return null;
  var neg=/^\(.*\)$/.test(s)||/-\s*\$?\s*\d/.test(s)||/\d\s*-$/.test(s)||/−/.test(s);
  var c=s.replace(/[^\d.,]/g,'');if(!c)return null;
  var ip=c.lastIndexOf('.'),ic=c.lastIndexOf(',');
  if(ip>=0&&ic>=0)c=ip>ic?c.replace(/,/g,''):c.replace(/\./g,'').replace(',','.');
  else if(ic>=0)c=/,\d{1,2}$/.test(c)?c.replace(/\./g,'').replace(',','.'):c.replace(/,/g,'');
  else if(ip>=0&&!/\.\d{1,2}$/.test(c))c=c.replace(/\./g,'');
  var n=parseFloat(c);if(!isFinite(n))return null;
  return neg?-n:n;
}
/* Qué columna es cada cosa. Devuelve {cols:{fecha,detalle,monto,debito,credito,saldo,moneda}, seguro:bool} */
export function adivinarColumnas(T,hoy){
  var cols={fecha:-1,detalle:-1,monto:-1,debito:-1,credito:-1,saldo:-1,moneda:-1};
  if(T.cab>=0){
    T.filas[T.cab].forEach(function(c,i){var t=tipoColumna(c);if(t&&cols[t]<0)cols[t]=i});
  }
  var porTitulo=cols.fecha>=0&&cols.detalle>=0&&(cols.monto>=0||(cols.debito>=0&&cols.credito>=0));
  var datos=T.filas.slice(T.cab+1).slice(0,40),n=T.n;
  /* lo que no dicen los títulos, por el contenido */
  if(cols.fecha<0)for(var i=0;i<n;i++){
    var ok=datos.filter(function(r){return fechaCelda(r[i],hoy)}).length;
    if(ok>=datos.length*0.7){cols.fecha=i;break}
  }
  var numericas=[];
  for(var j=0;j<n;j++){
    if(j===cols.fecha||j===cols.detalle||j===cols.saldo||j===cols.moneda)continue;
    var nn=datos.filter(function(r){return montoCelda(r[j])!==null}).length,vacias=datos.filter(function(r){return !String(r[j]===undefined?'':r[j]).trim()}).length;
    if(nn&&nn+vacias>=datos.length*0.8)numericas.push(j);
  }
  if(cols.monto<0&&cols.debito<0&&cols.credito<0&&numericas.length===1)cols.monto=numericas[0];
  if(cols.detalle<0){
    var mx=0;
    for(var k=0;k<n;k++){
      if(k===cols.fecha||numericas.indexOf(k)>=0)continue;
      var letras=datos.reduce(function(t,r){return t+(String(r[k]||'').match(/[a-z]/gi)||[]).length},0);
      if(letras>mx){mx=letras;cols.detalle=k}
    }
  }
  var tiene=cols.fecha>=0&&cols.detalle>=0&&(cols.monto>=0||cols.debito>=0||cols.credito>=0);
  /* seguro solo si lo dicen los títulos; si lo adiviné por el contenido, se pregunta (con eso ya elegido) */
  return {cols:cols,seguro:tiene&&T.cab>=0&&porTitulo,tiene:tiene};
}
/* Firma de los títulos: para recordar las columnas de cada banco solo si la planilla es la misma */
export function firma(T){return T.cab>=0?T.filas[T.cab].map(function(c){return sinTildes(String(c)).toLowerCase().trim()}).join('|').slice(0,200):'n'+T.n}
/* La planilla → texto de una línea por movimiento que entiende extracto.js (gasto con signo menos) */
export function tablaATexto(T,cols,banco,hoy){
  var out=[],tarjeta=banco&&banco.tarjeta;
  T.filas.slice(T.cab+1).forEach(function(r){
    var f=fechaCelda(r[cols.fecha],hoy);if(!f)return;
    var d=String(r[cols.detalle]===undefined?'':r[cols.detalle]).replace(/[\t\r\n]+/g,' ').trim(),m=null;
    if(cols.monto>=0){m=montoCelda(r[cols.monto]);if(m!==null&&tarjeta)m=-m}
    else{
      var db=cols.debito>=0?montoCelda(r[cols.debito]):null,cr=cols.credito>=0?montoCelda(r[cols.credito]):null;
      if(db!==null&&db!==0)m=-Math.abs(db);else if(cr!==null&&cr!==0)m=Math.abs(cr);
    }
    if(m===null||m===0)return;
    var usd=cols.moneda>=0&&/usd|us\$|u\$s|dolar/i.test(String(r[cols.moneda]||''));
    out.push(f+'\t'+(d||'(sin descripción)')+(usd?' USD':'')+'\t'+(m<0?'-':'')+Math.abs(m).toFixed(2).replace('.',','));
  });
  return out.join('\n');
}

/* ---------- El nombre del comercio ---------- */
/* [cómo aparece, nombre, categoría de fábrica (la de extracto.js), es suscripción] — nombres de comercios
   conocidos de Uruguay. La categoría se puede corregir en Tarjeta y se recuerda. */
export var COMERCIOS=[
  [/TA-?TA\b|\bTATA\b/,'Tata','Supermercado'],[/\bDISCO\b/,'Disco','Supermercado'],[/DEVOTO/,'Devoto','Supermercado'],
  [/GEANT/,'Géant','Supermercado'],[/TIENDA\s?INGLESA/,'Tienda Inglesa','Supermercado'],[/MACRO\s?MERCADO/,'Macro Mercado','Supermercado'],
  [/EL\s?DORADO/,'El Dorado','Supermercado'],[/KINKO/,'Kinko','Supermercado'],[/MULTI\s?AHORRO/,'Multi Ahorro','Supermercado'],
  [/FRESH\s?MARKET/,'Fresh Market','Supermercado'],[/\bFRIGO\b/,'Frigo','Supermercado'],[/SUPER\s?TIGRE|\bTIGRE\b/,'Tigre','Supermercado'],
  [/PEDIDOS\s?YA/,'PedidosYa','Delivery y comida'],[/RAPPI/,'Rappi','Delivery y comida'],[/MC\s?DONALD/,'McDonald\'s','Delivery y comida'],
  [/BURGER\s?KING/,'Burger King','Delivery y comida'],[/SUBWAY/,'Subway','Delivery y comida'],[/STARBUCKS/,'Starbucks','Delivery y comida'],
  [/LA\s?PASIVA/,'La Pasiva','Delivery y comida'],[/\bKFC\b/,'KFC','Delivery y comida'],[/PIZZA\s?BY\s?THE\s?METER|PIZZERIA/,'Pizzería','Delivery y comida'],
  [/\bAMPM\b|\bAM\s?PM\b/,'AM PM','Kiosco y almacén'],[/\bKIOSCO|MAXIKIOSCO/,'Kiosco','Kiosco y almacén'],[/ALMACEN/,'Almacén','Kiosco y almacén'],
  [/\bANCAP\b/,'Ancap','Transporte'],[/PETROBRAS|\bDISA\b/,'Disa','Transporte'],[/\bAXION\b/,'Axion','Transporte'],
  [/UBER\s?EATS?/,'Uber Eats','Delivery y comida'],[/\bUBER\b/,'Uber','Transporte'],[/CABIFY/,'Cabify','Transporte'],[/\bDIDI\b/,'DiDi','Transporte'],
  [/\bSTM\b|RECARGA\s?STM|CUTCSA/,'STM','Transporte'],[/PEAJE|TELEPEAJE/,'Telepeaje','Transporte'],
  [/NETFLIX/,'Netflix','Suscripciones',1],[/SPOTIFY/,'Spotify','Suscripciones',1],[/DISNEY/,'Disney+','Suscripciones',1],
  [/\bHBO\b|\bMAX\.COM\b|HBOMAX|\bMAX\b/,'Max','Suscripciones',1],[/YOUTUBE/,'YouTube Premium','Suscripciones',1],
  [/ICLOUD|APPLE\.COM\/BILL|APPLE\s?COM\s?BILL/,'iCloud','Suscripciones',1],[/APPLE\s?MUSIC/,'Apple Music','Suscripciones',1],
  [/PRIME\s?VIDEO|AMAZON\s?PRIME/,'Prime Video','Suscripciones',1],[/PARAMOUNT/,'Paramount+','Suscripciones',1],
  [/OPENAI|CHATGPT/,'ChatGPT','Suscripciones',1],[/ANTHROPIC|CLAUDE\.AI/,'Claude','Suscripciones',1],[/GOOGLE\s?ONE/,'Google One','Suscripciones',1],
  [/CRUNCHYROLL/,'Crunchyroll','Suscripciones',1],[/TWITCH/,'Twitch','Suscripciones',1],[/DIRECTV/,'DirecTV','Servicios y cuentas',1],
  [/\bGYM\b|GIMNASIO|SPORT\s?CLUB|SMART\s?FIT/,'Gimnasio','Otros',1],
  [/STEAM/,'Steam','Juegos'],[/PLAYSTATION|\bPSN\b/,'PlayStation','Juegos'],[/XBOX/,'Xbox','Juegos'],[/NINTENDO/,'Nintendo','Juegos'],
  [/\bUTE\b/,'UTE','Servicios y cuentas'],[/ANTEL/,'Antel','Servicios y cuentas'],[/\bOSE\b/,'OSE','Servicios y cuentas'],
  [/\bCLARO\b/,'Claro','Servicios y cuentas'],[/MOVISTAR/,'Movistar','Servicios y cuentas'],[/ABITAB/,'Abitab','Servicios y cuentas'],
  [/RED\s?PAGOS/,'Redpagos','Servicios y cuentas'],[/GASTOS\s?COMUNES/,'Gastos comunes','Servicios y cuentas'],
  [/FARMASHOP/,'Farmashop','Salud'],[/SAN\s?ROQUE/,'San Roque','Salud'],[/FARMACIA/,'Farmacia','Salud'],[/CASMU/,'CASMU','Salud'],
  [/ESPANOLA|ASOC\.?\s?ESPANOLA/,'Española','Salud'],[/MEDICA\s?URUGUAYA|\bMUCAM\b/,'Médica Uruguaya','Salud'],
  [/MERCADO\s?LIBRE|MERCADOLIBRE|\bMELI\b/,'Mercado Libre','Compras online'],[/AMAZON/,'Amazon','Compras online'],
  [/ALIEXPRESS/,'AliExpress','Compras online'],[/\bTEMU\b/,'Temu','Compras online'],[/SHEIN/,'Shein','Compras online'],
  [/\bZARA\b/,'Zara','Otros'],[/\bH\s?&\s?M\b/,'H&M','Otros'],[/MOVIE\s?CENTER|LIFE\s?CINEMAS|\bCINE/,'Cine','Otros'],
  [/MONTEVIDEO\s?SHOPPING|TRES\s?CRUCES|PUNTA\s?CARRETAS\s?SHOPPING|NUEVOCENTRO/,'Shopping','Otros']
];
/* Nombres genéricos: dan la categoría, pero el nombre sale del detalle («Kiosco El Pepe») */
var GENERICOS={'Kiosco':1,'Almacén':1,'Farmacia':1,'Pizzería':1,'Gimnasio':1,'Cine':1,'Shopping':1};
/* Lo que no es un comercio: se marca aparte (y la categoría sale de acá) */
var TIPOS=[
  ['pago',/SU PAGO|PAGO (DE )?(LA )?TARJETA|PAGO RECIBIDO|GRACIAS POR SU PAGO/,null],
  ['cuota',/\bCUOTA|\bCTA\.?\s?\d{1,2}\s?\/\s?\d{1,2}\b|\bC\.\s?\d{1,2}\s?\/\s?\d{1,2}\b/,null],
  ['interes',/INTERES|\bMORA\b|FINANCIACION|RECARGO/,'Comisiones y cargos'],
  ['seguro',/\bSEGURO|\bPOLIZA/,'Comisiones y cargos'],
  ['comision',/COMISION|MANTENIMIENTO|CARGO\s?(FIJO|MENSUAL|ADMIN|POR)|COSTO\s?(DE\s?)?(CUENTA|TARJETA|EMISION|RENOVACION)|ANUALIDAD|MEMBRESIA\s?TARJ|IVA\s?S\/?\s?COM|IMPUESTO\s?DEB|SELLADO|ENVIO\s?DE\s?ESTADO/,'Comisiones y cargos'],
  ['retiro',/RETIRO|CAJERO|\bATM\b|REDBROU|BANRED|EXTRACCION|EFECTIVO/,'Retiros y transferencias'],
  ['transferencia',/TRANSF|\bTRF\b|\bP2P\b|ENVIO\s?DE\s?DINERO|DEPOSITO|GIRO\b/,'Retiros y transferencias']
];
/* (2.15) Los cargos del banco con nombres claros, en oraciones (no «Comisión Mantenimiento Cuenta») */
var CLAROS=[
  [/MANTENIMIENTO|COSTO\s?(DE\s?)?CUENTA|CARGO\s?(FIJO|MENSUAL)/,'Mantenimiento de la cuenta'],
  [/\bIVA\b/,'IVA de la comisión'],
  [/ANUALIDAD|MEMBRESIA|RENOVACION|EMISION/,'Costo anual de la tarjeta'],
  [/ENVIO\s?DE\s?ESTADO/,'Envío del estado de cuenta'],
  [/\bMORA\b/,'Intereses por atraso'],
  [/INTERES|FINANCIACION/,'Intereses de la tarjeta'],
  [/RECARGO/,'Recargo'],
  [/SEGURO\s?(DE\s?)?VIDA/,'Seguro de vida'],
  [/SEGURO|POLIZA/,'Seguro'],
  [/IMPUESTO\s?DEB/,'Impuesto a los débitos'],
  [/SELLADO/,'Sellado'],
  [/COMISION/,'Comisión del banco']
];
var MP_ANTES=/^(MERPAGO|MERCADOPAGO|MP|DLO|DLOCAL|PAYPAL|SQ|PAYU|EBANX|NUVEI)\s?\*\s?/;
var RUIDO=/\b(POS|COMPRAS?|COMPRA CON TARJETA|CON TARJETA|DEB(ITO)?|AUT(OMATICO)?|DEB\.|TRJ|TARJ(ETA)?|VISA|MASTER(CARD)?|MAESTRO|ELECTRON|CABAL|CONSUMO|EXTERIOR|CONTACTLESS|NFC|QR|PAGO|PAGOS|ONLINE|WEB|RECURRENTE|RECURR|SUSCRIPCION|PLAN|MENSUAL|CREDITO|DEBITO|UYU|USD|U\$S|US\$|UY|URY|URUGUAY|MVD|MONTEVIDEO|CANELONES|MALDONADO|PUNTA DEL ESTE|PDE|CIUDAD DE LA COSTA|SALTO|PAYSANDU|COLONIA|RIVERA|SA|SRL|LTDA|INC|LLC|COM|WWW)\b/g;
var ACENTOS={Comision:'Comisión',Interes:'Interés',Intereses:'Intereses',Credito:'Crédito',Debito:'Débito',Deposito:'Depósito',Envio:'Envío',Poliza:'Póliza',
  Financiacion:'Financiación',Emision:'Emisión',Renovacion:'Renovación',Cafe:'Café',Panaderia:'Panadería',Farmacia:'Farmacia',Almacen:'Almacén',Electronica:'Electrónica',Republica:'República',Iva:'IVA'};
function titular(s){return s.toLowerCase().replace(/(^|[\s\-\/&])([a-zñ])/g,function(m,a,b){return a+b.toUpperCase()}).replace(/[A-Za-zñ]+/g,function(w){return ACENTOS[w]||w})}
/* Devuelve {nombre, cat (de fábrica o null), sub (suscripción conocida), tipo (null | cuota | interes | …), cuota:{n,de}} */
export function comercio(desc){
  var u=sinTildes(String(desc||'')).toUpperCase(),r={nombre:'',cat:null,sub:false,tipo:null,cuota:null};
  var mc=/(?:CUOTA|CTA\.?|C\.)\s?0?(\d{1,2})\s?(?:\/|DE)\s?0?(\d{1,2})\b/.exec(u)||/\b0?(\d{1,2})\s?DE\s?0?(\d{1,2})\s?CUOTAS\b/.exec(u);
  if(mc&&+mc[1]>=1&&+mc[2]>=2&&+mc[1]<=+mc[2])r.cuota={n:+mc[1],de:+mc[2]};
  for(var t=0;t<TIPOS.length;t++)if(TIPOS[t][1].test(u)){r.tipo=TIPOS[t][0];if(TIPOS[t][2])r.cat=TIPOS[t][2];break}
  if(r.cuota)r.tipo='cuota';
  for(var i=0;i<COMERCIOS.length;i++)if(COMERCIOS[i][0].test(u)){
    r.nombre=GENERICOS[COMERCIOS[i][1]]?'':COMERCIOS[i][1];
    if(r.tipo!=='interes'&&r.tipo!=='seguro'&&r.tipo!=='comision'){r.cat=COMERCIOS[i][2];r.sub=!!COMERCIOS[i][3]}
    break;
  }
  if(!r.nombre){
    var s=u.replace(/•+\d*/g,' ').replace(MP_ANTES,'');
    if(s.indexOf('*')>0)s=s.split('*')[0];
    if(r.tipo==='transferencia')s=s.replace(/\b(TRANSF(ERENCIA)?|TRF|P2P|ENVIO DE DINERO|DEPOSITO|GIRO|RECIBIDA|ENVIADA|A|DE|POR|CTA|CUENTA|BROU|ITAU|SANTANDER|BBVA|HSBC|SCOTIA)\b/g,' ');
    s=s.replace(/(?:CUOTA|CTA\.?|C\.)\s?\d{1,2}\s?(?:\/|DE)\s?\d{1,2}/g,' ')
      .replace(/\b\d{1,2}[\/.-]\d{1,2}([\/.-]\d{2,4})?\b/g,' ').replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g,' ')
      .replace(/\b(SUC(URSAL)?|LOCAL|LOC|NRO|NO|N|TERM|TERMINAL|REF|COD|ID|OP|TRX|AUT)\.?\s?#?\d+\b/g,' ')
      .replace(/[X*]{2,}\d+/g,' ').replace(/#\d+/g,' ').replace(/\b\d+\b/g,' ')
      .replace(/[^A-ZÑ0-9&'\s-]/g,' ').replace(RUIDO,' ').replace(/\s[.-]+\s/g,' ').replace(/\s+/g,' ').trim();
    var w=s.split(' ').filter(function(x){return x.replace(/[.\-']/g,'').length>1}).slice(0,3);
    r.nombre=w.length?titular(w.join(' ')):(r.tipo==='comision'?'Comisión':r.tipo==='retiro'?'Retiro de efectivo':'Sin nombre');
  }
  if(r.tipo==='comision'||r.tipo==='interes'||r.tipo==='seguro')for(var c=0;c<CLAROS.length;c++)if(CLAROS[c][0].test(u)){r.nombre=CLAROS[c][1];break}
  if(r.tipo==='retiro')r.nombre='Retiro de efectivo';
  if(r.tipo==='pago')r.nombre='Pago de la tarjeta';
  if(r.tipo==='transferencia')r.nombre=r.nombre&&r.nombre!=='Sin nombre'?'Transferencia · '+r.nombre:'Transferencia';
  return r;
}

/* ---------- Leer todo ---------- */
/* opt: {formato, columnas (extracto.columnas), banco (id elegido a mano)}.
   Devuelve lo de EX.leer más {banco, tabla:{T, cols, seguro, firma} | null, nombres:{clave:nombre}, cats:{clave:cat}}.
   Cada movimiento queda con d = nombre limpio (en mayúsculas, para la clave), o = detalle original, tipo, cuota, sub. */
export function leerMovimientos(texto,hoy,opt){
  opt=opt||{};
  var banco=opt.banco?bancoPorId(opt.banco):detectarBanco(texto),tabla=null,fuente=String(texto||''),formato=formatoPara(banco,opt.formato);
  var T=tablaDe(fuente);
  if(T){
    var fi=firma(T),rec=opt.columnas&&opt.columnas[banco.id],adiv=adivinarColumnas(T,hoy);
    var cols=rec&&rec.firma===fi?Object.assign({},adiv.cols,rec.cols):adiv.cols,seguro=adiv.seguro||!!(rec&&rec.firma===fi);
    tabla={T:T,cols:cols,seguro:seguro,firma:fi};
    if(cols.fecha>=0&&cols.detalle>=0&&(cols.monto>=0||cols.debito>=0||cols.credito>=0)){
      var bt=Object.assign({},banco,{tarjeta:formato==='pos'});
      fuente=tablaATexto(T,cols,bt,hoy);formato='neg';
    }
  }
  var r=EX.leer(fuente,hoy,formato),nombres={},cats={};
  r.movs.forEach(function(m){
    var c=comercio(m.d);
    m.o=m.d;m.tipo=c.tipo;m.cuota=c.cuota;m.sub=c.sub;
    m.d=sinTildes(c.nombre).toUpperCase();
    var k=EX.clave(m.d);
    if(!nombres[k])nombres[k]=c.nombre;
    if(c.cat&&m.m<0&&!cats[k])cats[k]=c.cat;
  });
  r.banco=banco;r.tabla=tabla;r.nombres=nombres;r.cats=cats;
  return r;
}
/* El análisis de siempre (extracto.js), con los nombres limpios y las categorías del diccionario.
   Lo que corregiste a mano (ex.cat) manda sobre el diccionario. */
export function analizarMovimientos(r,ex,mapa){
  var over=Object.assign({},r.cats,ex&&ex.cat||{});
  var A=EX.analizar(r.movs,{cat:over,hormiga:Number(ex&&ex.hormiga)||400,mapa:mapa});
  if(A)A.nombres=r.nombres;
  return A;
}
