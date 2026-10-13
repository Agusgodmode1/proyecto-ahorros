/* Lector del extracto BROU y métricas (puro, sin DOM). Copiado tal cual del archivo original.
   Fechas dd/mm/aaaa, dd/mm, "12 oct" y aaaa-mm-dd; montos 1.234,56 o formato US; columnas débito/crédito
   o signo por la diferencia del saldo; los números de 9 dígitos o más se tapan solos. */
import {num} from './util.js';
var MESES={ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,set:9,sep:9,oct:10,nov:11,dic:12};
var CATS=[
  ['Delivery y comida',/PEDIDOS?\s?YA|RAPPI|UBER\s?EATS?|GLOVO|MC\s?DONALD|MCDONALD|BURGER|PIZZ|RESTAU|PARRILL|CAFE|PANADER|HELAD|\bKFC\b|SUBWAY|STARBUCKS|CHIVIT|SUSHI|FOOD|LOMITO/],
  ['Supermercado',/TIENDA\s?INGLESA|\bDISCO\b|DEVOTO|GEANT|MACROMERCADO|\bTATA\b|SUPERMERC|FRESH\s?MARKET|\bSUPER\b|EL DORADO|MULTIAHORRO|KINKO|\bPOCITOS\b.*SUPER/],
  ['Kiosco y almacén',/KIOSC|MAXIKIOSCO|ALMACEN|MINIMERC|\bAMPM\b|\bAM PM\b|DESPENSA|BAZAR/],
  ['Transporte',/\bUBER\b|CUTCSA|\bSTM\b|COPSA|ANCAP|PETROBRAS|DUCSA|COMBUSTIBLE|ESTACION|TAXI|CABIFY|PEAJE|BOLETO|\bCOETC\b|\bCOME\b|\bDIDI\b/],
  ['Suscripciones',/NETFLIX|SPOTIFY|DISNEY|\bHBO\b|\bMAX\b|YOUTUBE|GOOGLE|APPLE|ICLOUD|PRIME|OPENAI|CHATGPT|ANTHROPIC|CLAUDE|TWITCH|CRUNCHYROLL|PARAMOUNT|PAGO RECURR/],
  ['Juegos',/STEAM|EPIC\s?GAMES|PLAYSTATION|\bPSN\b|XBOX|BLIZZARD|BATTLE\.?NET|NINTENDO|RIOT|ROBLOX|GAMING|GAME|WOW/],
  ['Trading',/LIBERTEX|FOREX|METATRADER|BINANCE|BROKER|TRADING|FTMO|TOPSTEP|PROP\s?FIRM|CRYPTO|DEPOSITO MT|SKRILL|NETELLER/],
  ['Servicios y cuentas',/\bUTE\b|ANTEL|\bOSE\b|CLARO|MOVISTAR|DIRECTV|MONTEVIDEO\s?CABLE|NUEVO\s?SUR|ABITAB|REDPAGOS|COBRANZA|ALQUILER|GASTOS COMUNES|\bBPS\b|\bDGI\b|TRIBUTO|IMPUESTO/],
  ['Salud',/FARMACIA|SANATORIO|MEDIC|DENTAL|CASMU|MUTUAL|FARMASHOP|SAN ROQUE|\bOPTICA\b|CLINICA|LABORATORIO/],
  ['Compras online',/MERCADO\s?LIBRE|MERCADOLIBRE|AMAZON|ALIEXPRESS|TEMU|SHEIN|PAYPAL|\bEBAY\b|\bMELI\b/],
  ['Retiros y transferencias',/RETIRO|CAJERO|\bATM\b|REDBROU|TRANSF|\bTRF\b|\bP2P\b|ENVIO|GIRO|PRESTAMO/],
  ['Comisiones y cargos',/COMISION|\bIVA\b|MANTENIMIENTO|COSTO|INTERES|SELLADO|CARGO/]
];
var CAT_NAMES=CATS.map(function(c){return c[0]}).concat(['Otros']);
var STOP={COMPRA:1,COMPRAS:1,POS:1,DEBITO:1,DEB:1,PAGO:1,PAGOS:1,TARJETA:1,TRJ:1,DE:1,DEL:1,LA:1,EL:1,EN:1,CON:1,UY:1,URY:1,MVD:1,MONTEVIDEO:1,SA:1,SRL:1,VISA:1,MASTER:1,MASTERCARD:1,MAESTRO:1,CONSUMO:1,USD:1,UYU:1};

function pad(n){return (n<10?'0':'')+n}
function mk(y,m,d){
  if(y<100)y+=2000;
  if(m<1||m>12||d<1||d>31)return null;
  var t=new Date(y,m-1,d,12);
  if(t.getMonth()!==m-1)return null;
  return y+'-'+pad(m)+'-'+pad(d);
}
function maskLong(s){return s.replace(/\d{9,}/g,function(x){return '•••'+x.slice(-3)})}

/* fecha al inicio de la línea: devuelve {iso,rest} o null */
function leadDate(line,hoy){
  var m,y,rest;
  var yfix=function(mo,d){
    var hy=Number(hoy.slice(0,4)),iso=mk(hy,mo,d);
    if(iso&&iso>addD(hoy,7))iso=mk(hy-1,mo,d);
    return iso;
  };
  if((m=/^\s*(\d{4})-(\d{2})-(\d{2})\b/.exec(line))){var i1=mk(+m[1],+m[2],+m[3]);return i1?{iso:i1,rest:line.slice(m[0].length)}:null}
  if((m=/^\s*(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?(?!\d)/.exec(line))){
    var iso=m[3]?mk(+m[3],+m[2],+m[1]):yfix(+m[2],+m[1]);
    return iso?{iso:iso,rest:line.slice(m[0].length)}:null;
  }
  if((m=/^\s*(\d{1,2})\s+(?:de\s+)?(ene|feb|mar|abr|may|jun|jul|ago|set|sep|oct|nov|dic)[a-z]*\.?(?:\s+(?:de\s+)?(\d{2,4}))?/i.exec(line))){
    var mo=MESES[m[2].toLowerCase()];
    var iso2=m[3]?mk(+m[3],mo,+m[1]):yfix(mo,+m[1]);
    return iso2?{iso:iso2,rest:line.slice(m[0].length)}:null;
  }
  return null;
}
function addD(iso,n){var p=iso.split('-').map(Number),d=new Date(p[0],p[1]-1,p[2]+n,12);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function diff(a,b){var pa=a.split('-').map(Number),pb=b.split('-').map(Number);return Math.round((new Date(pb[0],pb[1]-1,pb[2],12)-new Date(pa[0],pa[1]-1,pa[2],12))/864e5)}
function dow(iso){var p=iso.split('-').map(Number);return new Date(p[0],p[1]-1,p[2],12).getDay()}

function toNum(t,us){
  var neg=/-/.test(t)||/^\(.*\)$/.test(t.trim());
  var c=t.replace(/[^\d.,]/g,'');
  if(!c)return null;
  c=us?c.replace(/,/g,''):c.replace(/\./g,'').replace(',','.');
  var n=parseFloat(c);
  if(!isFinite(n))return null;
  return neg?-n:n;
}
function detectUS(text){
  var dot=(text.match(/\d\.\d{2}(?![\d.])/g)||[]).length,com=(text.match(/\d,\d{2}(?![\d,])/g)||[]).length;
  return dot>com;
}
var NUMTOK=/^-?\(?\$?\s?\d[\d.,]*\)?-?$/;

/* une líneas con fecha pero sin importe con la siguiente (descripción partida en dos renglones) */
function unir(lines,hoy){
  var out=[];
  for(var i=0;i<lines.length;i++){
    var l=lines[i],ld=leadDate(l,hoy);
    if(ld&&!/\d[\d.,]*\)?-?\s*$/.test(ld.rest)&&i+1<lines.length&&lines[i+1].trim()&&!leadDate(lines[i+1],hoy)&&/\d[\d.,]*\s*$/.test(lines[i+1])){
      out.push(l.replace(/\s+$/,'')+' '+lines[i+1].trim());i++;
    }else out.push(l);
  }
  return out;
}
function parseRows(text,hoy,strict){
  var us=detectUS(text),lines=unir(text.split(/\r?\n/),hoy),rows=[],bad=[],dated=0,last=null,debI=-1,creI=-1;
  lines.forEach(function(raw){
    var line=raw.replace(/ /g,' ');
    if(!line.trim())return;
    var hasTab=/\t|;|\|/.test(line);
    /* encabezado con columnas débito / crédito */
    if(hasTab&&/d[eé]bito/i.test(line)&&/cr[eé]dito/i.test(line)){
      var hc=line.split(/\t|;|\|/);
      hc.forEach(function(c,i){if(/d[eé]bito/i.test(c))debI=i;if(/cr[eé]dito/i.test(c))creI=i});
      return;
    }
    var ld=leadDate(line,hoy);
    if(!ld){
      /* línea de continuación: descripción partida en dos renglones */
      if(last&&!/\d[.,]\d{2}/.test(line)&&line.trim().length<60&&!/^[\s\-=_]+$/.test(line)&&!/saldo|total|fecha|concepto|descripci/i.test(line))last.d=(last.d+' '+line.trim()).slice(0,90);
      else if(/\d[.,]\d{2}/.test(line)&&line.trim().length>8)bad.push(line.trim().slice(0,90));
      return;
    }
    dated++;
    var rest=ld.rest,nums=[],desc='',usd=/\bUSD\b|U\$S|US\$|DOLAR/i.test(line),debV=null,creV=null;
    if(hasTab){
      var cells=line.split(/\t|;|\|/).map(function(c){return c.trim()}),skipDate=true;
      cells.forEach(function(c,i){
        if(!c)return;
        if(skipDate&&leadDate(c,hoy)&&i<3){skipDate=i===0;return}
        if(NUMTOK.test(c)&&(!strict||/[.,]\d{2}\)?-?$/.test(c)||/-/.test(c))){
          var v=toNum(c,us);if(v===null)return;
          if(i===debI)debV=Math.abs(v);else if(i===creI)creV=Math.abs(v);
          nums.push(v);
        }else desc+=(desc?' ':'')+c;
      });
    }else{
      rest=rest.replace(/^\s*(?:\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?)\s+/,' ');
      for(var k=0;k<3;k++){
        var mm=/(?:^|\s)(-?\(?\$?\s?\d[\d.,]*\)?-?)\s*$/.exec(rest);
        if(!mm)break;
        var tk=mm[1];
        if(strict&&!/[.,]\d{2}\)?-?$/.test(tk))break;
        var v2=toNum(tk,us);if(v2===null)break;
        nums.unshift(v2);rest=rest.slice(0,rest.length-mm[0].length);
      }
      desc=rest.replace(/\$|\bUYU\b|\bUSD\b/gi,' ').replace(/\s+/g,' ').trim();
    }
    desc=maskLong(desc.replace(/\s+/g,' ').trim());
    if(!nums.length){bad.push(line.trim().slice(0,90));return}
    var r={f:ld.iso,d:desc||'(sin descripción)',usd:usd,nums:nums,m:null,s:null,deb:debV,cre:creV};
    rows.push(r);last=r;
  });
  return {rows:rows,bad:bad,dated:dated};
}

function leer(text,hoy,formato){
  text=String(text||'');
  var res=parseRows(text,hoy,true);
  if(res.dated&&res.rows.length<res.dated*0.5)res=parseRows(text,hoy,false);
  var rows=res.rows,dudosos=0,anyNeg=rows.some(function(r){return r.nums.some(function(n){return n<0})});
  var asc=rows.length<2||rows[0].f<=rows[rows.length-1].f;
  rows.forEach(function(r,i){
    if(r.deb!==null||r.cre!==null){
      if(r.deb)r.m=-r.deb;else if(r.cre)r.m=r.cre;else r.m=0;
      return;
    }
    var n=r.nums;
    if(formato==='neg'||formato==='pos'||n.length===1){
      r.m=formato==='pos'?-n[0]:formato==='neg'?n[0]:(anyNeg?n[0]:-Math.abs(n[0]));
      if(formato==='pos'&&n[0]<0)r.m=Math.abs(n[0]);
      return;
    }
    r.m=n[0];r.s=n[n.length-1];
  });
  /* signo por variación del saldo */
  rows.forEach(function(r,i){
    if(r.s===null)return;
    var vec=asc?rows[i-1]:rows[i+1],ok=false;
    if(vec&&vec.s!==null){
      var delta=r.s-vec.s;
      if(Math.abs(Math.abs(delta)-Math.abs(r.m))<=1.01){r.m=delta<0?-Math.abs(r.m):Math.abs(r.m);ok=true}
    }
    if(!ok){dudosos++;r.m=r.m<0?r.m:-Math.abs(r.m)}
  });
  rows.forEach(function(r){r.c=null});
  return {movs:rows,bad:res.bad,dudosos:dudosos,dated:res.dated};
}

function clave(d){
  var s=d.toUpperCase().replace(/[^A-Z0-9ÁÉÍÓÚÑ\s]/g,' ');
  var w=s.split(/\s+/).filter(function(x){return x.length>1&&!/\d/.test(x)&&!STOP[x]});
  return w.slice(0,2).join(' ')||'SIN NOMBRE';
}
function catDe(m,over){
  var k=clave(m.d);
  if(over&&over[k])return over[k];
  if(m.m>0)return 'Ingresos';
  var u=m.d.toUpperCase();
  for(var i=0;i<CATS.length;i++)if(CATS[i][1].test(u))return CATS[i][0];
  return 'Otros';
}
function suma(a){var t=0;a.forEach(function(x){t+=x});return t}
function mediana(a){if(!a.length)return 0;var b=a.slice().sort(function(x,y){return x-y}),h=b.length>>1;return b.length%2?b[h]:(b[h-1]+b[h])/2}

function analizar(movs,opt){
  opt=opt||{};
  var uyu=movs.filter(function(m){return !m.usd}),over=opt.cat||{},hor=opt.hormiga||400;
  uyu.forEach(function(m){m.k=clave(m.d);m.c=catDe(m,over)});
  var gas=uyu.filter(function(m){return m.m<0}),ing=uyu.filter(function(m){return m.m>0});
  if(!uyu.length)return null;
  var fechas=uyu.map(function(m){return m.f}).sort(),desde=fechas[0],hasta=fechas[fechas.length-1];
  var dias=Math.max(1,diff(desde,hasta)+1);
  var totG=-suma(gas.map(function(m){return m.m})),totI=suma(ing.map(function(m){return m.m}));
  var A={desde:desde,hasta:hasta,dias:dias,totG:totG,totI:totI,nG:gas.length,nI:ing.length,usdN:movs.length-uyu.length,
    porDia:totG/dias,ticket:gas.length?totG/gas.length:0,gas:gas,ing:ing};
  /* por categoría */
  var cm={};gas.forEach(function(m){var o=cm[m.c]||(cm[m.c]={n:0,t:0});o.n++;o.t-=m.m});
  A.cats=Object.keys(cm).map(function(k){return {c:k,n:cm[k].n,t:cm[k].t}}).sort(function(a,b){return b.t-a.t});
  /* por día de la semana */
  var dw=[0,1,2,3,4,5,6].map(function(i){return {i:i,n:0,t:0}});
  gas.forEach(function(m){var o=dw[dow(m.f)];o.n++;o.t-=m.m});
  A.dow=dw;
  /* por mes */
  var mm={};uyu.forEach(function(m){var k=m.f.slice(0,7),o=mm[k]||(mm[k]={k:k,g:0,i:0,n:0});if(m.m<0){o.g-=m.m;o.n++}else o.i+=m.m});
  A.meses=Object.keys(mm).sort().map(function(k){return mm[k]});
  /* por comercio */
  var cc={};gas.forEach(function(m){
    var o=cc[m.k]||(cc[m.k]={k:m.k,n:0,t:0,c:m.c,f:[],mt:[]});o.n++;o.t-=m.m;o.f.push(m.f);o.mt.push(-m.m);
  });
  A.com=Object.keys(cc).map(function(k){
    var o=cc[k],f=o.f.slice().sort(),gaps=[];
    for(var i=1;i<f.length;i++)gaps.push(diff(f[i-1],f[i]));
    o.prom=o.t/o.n;o.cada=gaps.length?mediana(gaps):0;
    var ms={};o.f.forEach(function(x){ms[x.slice(0,7)]=1});o.meses=Object.keys(ms).length;
    var mn=Math.min.apply(null,o.mt),mx=Math.max.apply(null,o.mt);
    o.fijo=o.n>=2&&o.meses>=2&&(mx-mn)<=Math.max(1,mn*0.03);
    return o;
  }).sort(function(a,b){return b.t-a.t});
  /* hormiga */
  var hm=gas.filter(function(m){return -m.m<hor});
  A.hor={umbral:hor,n:hm.length,t:-suma(hm.map(function(m){return m.m}))};
  A.hor.pct=totG?A.hor.t/totG:0;
  var hc={};hm.forEach(function(m){var o=hc[m.k]||(hc[m.k]={k:m.k,n:0,t:0});o.n++;o.t-=m.m});
  A.horCom=Object.keys(hc).map(function(k){return hc[k]}).sort(function(a,b){return b.t-a.t}).slice(0,6);
  /* grandes */
  A.grandes=gas.slice().sort(function(a,b){return a.m-b.m}).slice(0,6);
  /* ritmo tras el cobro: ingreso más grande de cada mes y gasto de los 7 días siguientes */
  var picos={};ing.forEach(function(m){var k=m.f.slice(0,7);if(!picos[k]||m.m>picos[k].m)picos[k]=m});
  var rit=[];
  Object.keys(picos).forEach(function(k){
    var p=picos[k];if(p.m<10000)return;
    var fin=addD(p.f,30),fin7=addD(p.f,7);
    if(fin>hasta)return;
    var a30=0,a7=0;
    gas.forEach(function(m){if(m.f>=p.f&&m.f<fin){a30-=m.m;if(m.f<fin7)a7-=m.m}});
    if(a30>0)rit.push({f:p.f,monto:p.m,a7:a7,a30:a30,pct:a7/a30});
  });
  A.rit=rit;
  return A;
}

export {leer,analizar,clave,catDe,CATS,CAT_NAMES,diff,addD,dow,maskLong};

/* Análisis del extracto guardado, con caché (se recalcula solo si cambia el texto o las opciones). */
var exCache={k:null,A:null};
export function analisisGuardado(ex,hoy){
  if(!ex.texto||!ex.texto.trim())return null;
  var hor=num(ex.hormiga)||400;
  var k=ex.texto.length+'|'+ex.texto.slice(0,200)+'|'+ex.texto.slice(-200)+'|'+ex.formato+'|'+hor+'|'+JSON.stringify(ex.cat)+'|'+hoy;
  if(exCache.k===k)return exCache.A;
  var r=leer(ex.texto,hoy,ex.formato),A=analizar(r.movs,{cat:ex.cat,hormiga:hor});
  exCache={k:k,A:A};return A;
}
