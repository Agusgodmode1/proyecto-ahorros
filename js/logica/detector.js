/* Detector de gastos (2.13, puro, sin DOM): mira el extracto ya leído (bancos.js + extracto.js) y encuentra
   por dónde se te va la plata. Cada hallazgo dice cuánto es por mes y qué podés hacer, y se ordenan de mayor a menor.
   - suscripciones (lo que pagás por mes y por año) y las que subieron de precio;
   - compras que se repiten en el mismo lugar;
   - cobros repetidos: mismo comercio y mismo monto en menos de 48 horas;
   - comisiones, intereses, mantenimiento, seguros y recargos del banco o la tarjeta;
   - cuotas («cuota 3/6»): lo que queda por pagar;
   - un día que se disparó; retiros de efectivo; «a este ritmo» contra tu plan;
   - y los de siempre de extracto.js: gastos hormiga y cuánto se va la primera semana después de cobrar.
   Los textos se arman con el formateador de plata que le pases (money(), que respeta el modo discreto). */
import {diff,addD,dow} from './extracto.js';

function r0(x){return Math.round(x)}
function mediana(a){if(!a.length)return 0;var b=a.slice().sort(function(x,y){return x-y}),h=b.length>>1;return b.length%2?b[h]:(b[h-1]+b[h])/2}
var ESPECIALES={comision:1,interes:1,seguro:1,retiro:1,transferencia:1,cuota:1,pago:1};
/* Lo que se repite porque hace falta (el súper, la farmacia, el combustible): se muestra, pero no encabeza */
var NECESARIO={'Supermercado':1,'Salud':1,'Transporte':1,'Servicios y cuentas':1};

/* r: lo de bancos.leerMovimientos · A: lo de bancos.analizarMovimientos · opt: {planDia, hoy} */
export function detectar(r,A,opt){
  opt=opt||{};
  if(!A||!A.gas||!A.gas.length)return [];
  var out=[],gas=A.gas,dias=Math.max(7,A.dias),porMes=30/dias,nom=function(k){return r&&r.nombres&&r.nombres[k]||k};
  var grupos={};
  gas.forEach(function(m){(grupos[m.k]||(grupos[m.k]=[])).push(m)});
  Object.keys(grupos).forEach(function(k){grupos[k].sort(function(a,b){return a.f<b.f?-1:a.f>b.f?1:0})});

  /* --- suscripciones --- */
  var subs=[];
  Object.keys(grupos).forEach(function(k){
    var g=grupos[k],m0=g[0];
    if(ESPECIALES[m0.tipo])return;
    var montos=g.map(function(m){return -m.m}),meses={};g.forEach(function(m){meses[m.f.slice(0,7)]=1});
    var nm=Object.keys(meses).length,mn=Math.min.apply(null,montos),mx=Math.max.apply(null,montos),gaps=[];
    for(var i=1;i<g.length;i++)gaps.push(diff(g[i-1].f,g[i].f));
    /* una suscripción conocida puede cambiar de precio; un comercio cualquiera tiene que cobrar casi lo mismo */
    var cada=mediana(gaps),parejo=mx<=mn*(m0.sub?1.5:1.03);
    var recurrente=nm>=2&&g.length<=nm+1&&parejo&&(!gaps.length||(cada>=25&&cada<=35));
    if(!(m0.sub&&g.length<=nm+1)&&!recurrente)return;
    var ult=montos[montos.length-1],pri=montos[0];
    subs.push({k:k,nombre:nom(k),mes:ult,anual:ult*12,n:g.length,ultima:g[g.length-1].f,antes:pri,subio:ult>pri*1.02&&ult-pri>=1?ult-pri:0});
  });
  subs.sort(function(a,b){return b.mes-a.mes});
  var subK={};subs.forEach(function(s){subK[s.k]=1});
  if(subs.length){
    var ts=subs.reduce(function(t,s){return t+s.mes},0);
    out.push({id:'subs',tipo:'subs',mes:ts,anual:ts*12,items:subs});
  }
  subs.filter(function(s){return s.subio}).forEach(function(s){
    out.push({id:'subio:'+s.k+':'+s.ultima,tipo:'subio',k:s.k,nombre:s.nombre,antes:s.antes,ahora:s.mes,mes:s.subio,anual:s.subio*12,urgente:true});
  });

  /* --- compras que se repiten en el mismo lugar --- */
  Object.keys(grupos).forEach(function(k){
    var g=grupos[k];
    if(subK[k]||ESPECIALES[g[0].tipo]||g.length<4)return;
    var t=g.reduce(function(s,m){return s-m.m},0);
    var base=r&&r.cats&&r.cats[k]||g[0].c;
    out.push({id:'rep:'+k,tipo:'repetida',k:k,nombre:nom(k),n:g.length,total:t,porVez:t/g.length,mes:t*porMes,vecesMes:g.length*porMes,cat:base,necesario:!!NECESARIO[base]});
  });

  /* --- cobros repetidos: mismo comercio, mismo monto, menos de 48 h --- */
  Object.keys(grupos).forEach(function(k){
    var g=grupos[k];
    if(g[0].tipo==='retiro'||g[0].tipo==='transferencia')return;
    for(var i=1;i<g.length;i++){
      var a=g[i-1],b=g[i];
      if(Math.abs(a.m-b.m)<=0.5&&diff(a.f,b.f)<=2){
        out.push({id:'dup:'+k+':'+b.f+':'+r0(-b.m),tipo:'duplicado',k:k,nombre:nom(k),monto:-b.m,fechas:[a.f,b.f],mes:-b.m,urgente:true,unaVez:true});
        i++;
      }
    }
  });

  /* --- comisiones, intereses, seguros y recargos --- */
  var cargos=gas.filter(function(m){return m.tipo==='comision'||m.tipo==='interes'||m.tipo==='seguro'});
  if(cargos.length){
    var tc=cargos.reduce(function(s,m){return s-m.m},0),pc={};
    cargos.forEach(function(m){var o=pc[m.k]||(pc[m.k]={k:m.k,nombre:nom(m.k),n:0,total:0,tipo:m.tipo});o.n++;o.total-=m.m});
    out.push({id:'cargos:'+A.hasta.slice(0,7),tipo:'cargos',n:cargos.length,total:tc,mes:tc*porMes,anual:tc*porMes*12,
      items:Object.keys(pc).map(function(x){return pc[x]}).sort(function(a,b){return b.total-a.total}),
      intereses:cargos.some(function(m){return m.tipo==='interes'}),urgente:true});
  }

  /* --- cuotas: la última de cada compra --- */
  var cu={};
  gas.filter(function(m){return m.cuota}).forEach(function(m){
    var key=m.k+'|'+m.cuota.de+'|'+r0(-m.m),o=cu[key];
    if(!o||m.cuota.n>o.n)cu[key]={k:m.k,nombre:nom(m.k),n:m.cuota.n,de:m.cuota.de,monto:-m.m,f:m.f};
  });
  var cuotas=Object.keys(cu).map(function(x){var o=cu[x];o.quedan=o.de-o.n;o.falta=o.quedan*o.monto;return o}).sort(function(a,b){return b.falta-a.falta});
  if(cuotas.length){
    var vivas=cuotas.filter(function(c){return c.quedan>0}),tm=vivas.reduce(function(s,c){return s+c.monto},0);
    out.push({id:'cuotas:'+cuotas.map(function(c){return c.k+c.n}).join(','),tipo:'cuotas',items:cuotas,mes:tm,falta:cuotas.reduce(function(s,c){return s+c.falta},0)});
  }

  /* --- un día que se disparó --- */
  var pd={};gas.forEach(function(m){var o=pd[m.f]||(pd[m.f]={f:m.f,t:0,movs:[]});o.t-=m.m;o.movs.push(m)});
  var diasG=Object.keys(pd).map(function(x){return pd[x]}),med=mediana(diasG.map(function(d){return d.t})),plan=opt.planDia||0;
  if(diasG.length>=7){
    var top=diasG.slice().sort(function(a,b){return b.t-a.t})[0];
    if(top&&top.t>med*3&&(!plan||top.t>plan*2)){
      var mayor=top.movs.slice().sort(function(a,b){return a.m-b.m})[0];
      out.push({id:'pico:'+top.f,tipo:'pico',fecha:top.f,total:top.t,veces:med?top.t/med:0,mayor:{nombre:nom(mayor.k),monto:-mayor.m},mes:top.t-med,unaVez:true});
    }
  }

  /* --- retiros de efectivo --- */
  var ret=gas.filter(function(m){return m.tipo==='retiro'});
  if(ret.length){
    var tr=ret.reduce(function(s,m){return s-m.m},0);
    out.push({id:'retiros:'+A.hasta.slice(0,7),tipo:'retiros',n:ret.length,total:tr,mes:tr*porMes});
  }

  /* --- a este ritmo, contra tu plan --- */
  if(plan>0&&A.porDia>plan*1.05){
    out.push({id:'ritmo:'+A.hasta.slice(0,7),tipo:'ritmo',porDia:A.porDia,planDia:plan,mes:(A.porDia-plan)*30,proyeccion:A.porDia*30});
  }

  /* --- gastos hormiga (los de extracto.js) --- */
  if(A.hor&&A.hor.n>=5){
    out.push({id:'hormiga:'+A.hasta.slice(0,7),tipo:'hormiga',n:A.hor.n,umbral:A.hor.umbral,total:A.hor.t,mes:A.hor.t/A.dias*30,
      top:(A.horCom||[]).slice(0,3).map(function(o){return {nombre:nom(o.k),n:o.n,total:o.t}})});
  }

  /* --- la primera semana después de cobrar --- */
  (A.rit||[]).forEach(function(x){
    if(x.pct<0.4)return;
    out.push({id:'cobro:'+x.f,tipo:'cobro',f:x.f,pct:x.pct,a7:x.a7,a30:x.a30,mes:Math.max(0,x.a7-x.a30*7/30)});
  });

  out.sort(function(a,b){return b.mes-a.mes});
  return out;
}

/* Los textos de un hallazgo: {titulo, cifra (por mes o del cobro), detalle, consejo} */
export function textos(h,money,fecha){
  fecha=fecha||function(x){return x};
  var pm=function(v){return money(v)+' por mes'};
  switch(h.tipo){
    case 'subs':return {titulo:h.items.length===1?'Tu suscripción':'Tus '+h.items.length+' suscripciones',cifra:pm(h.mes),
      detalle:h.items.slice(0,4).map(function(s){return s.nombre}).join(', ')+(h.items.length>4?' y más':'')+': '+money(h.anual)+' por año.',
      consejo:'Fijate si usás todas. Darte de baja de una que no usás es plata que vuelve todos los meses.'};
    case 'subio':return {titulo:h.nombre+' subió',cifra:money(h.mes)+' más por mes',
      detalle:'Pasó de '+money(h.antes)+' a '+money(h.ahora)+': son '+money(h.anual)+' más por año.',
      consejo:'Revisá si te sirve un plan más barato o compartirla con alguien.'};
    case 'repetida':var app=/^(PedidosYa|Rappi|Uber Eats)$/.test(h.nombre);return {titulo:(app?'Pediste '+h.n+' veces en ':'Fuiste '+h.n+' veces a ')+h.nombre,cifra:pm(h.mes),
      detalle:money(h.total)+' en total, unos '+money(h.porVez)+' cada vez.',
      consejo:h.cat==='Supermercado'?'Una compra grande por semana, con lista, suele salir más barata que muchas chicas.'
        :h.necesario?'Hace falta, pero vale mirar si hay una opción más barata.'
        :'Si '+(app?'pedís':'vas')+' la mitad de las veces, te quedan unos '+money(h.mes/2)+' por mes para tu ahorro.'};
    case 'duplicado':return {titulo:'¿Te cobraron dos veces?',cifra:money(h.monto),
      detalle:h.nombre+': '+money(h.monto)+(h.fechas[0]===h.fechas[1]?' dos veces el '+fecha(h.fechas[0]):' el '+fecha(h.fechas[0])+' y otra vez el '+fecha(h.fechas[1]))+'.',
      consejo:'Si no fueron dos compras, reclamalo en tu banco o tarjeta: te lo tienen que devolver.'};
    case 'cargos':return {titulo:h.intereses?'Intereses y cargos del banco':'Comisiones y cargos del banco',cifra:pm(h.mes),
      detalle:h.n+(h.n===1?' cargo':' cargos')+' ('+h.items.slice(0,3).map(function(i){return i.nombre}).join(', ')+'): '+money(h.total)+'.',
      consejo:h.intereses?'Los intereses se evitan pagando el total de la tarjeta, no el mínimo.':'Preguntá en tu banco por una cuenta o tarjeta sin costo de mantenimiento.'};
    case 'cuotas':var c=h.items[0];return {titulo:h.items.length===1?'Una compra en cuotas':h.items.length+' compras en cuotas',cifra:pm(h.mes),
      detalle:c.nombre+': cuota '+c.n+' de '+c.de+(c.quedan?', te quedan '+c.quedan+' ('+money(c.falta)+')':', era la última')+'.'+(h.items.length>1?' En total te faltan '+money(h.falta)+'.':''),
      consejo:'Esa plata ya está comprometida: tenela en cuenta antes de sumar otra compra en cuotas.'};
    case 'pico':return {titulo:'Un día que se disparó',cifra:money(h.total),
      detalle:'El '+fecha(h.fecha)+' gastaste '+(h.veces>=2?Math.round(h.veces)+' veces lo de un día normal':'mucho más que un día normal')+'. Lo más grande: '+h.mayor.nombre+', '+money(h.mayor.monto)+'.',
      consejo:'No está mal si fue planeado. Si no, mirá qué lo disparó.'};
    case 'retiros':return {titulo:'Plata en efectivo',cifra:pm(h.mes),
      detalle:'Sacaste '+money(h.total)+' en '+h.n+(h.n===1?' retiro':' retiros')+'.',
      consejo:'El efectivo no aparece en el extracto: anotá en qué lo gastás para que tu plan cierre.'};
    case 'ritmo':return {titulo:'A este ritmo',cifra:money(h.mes)+' de más por mes',
      detalle:'Gastás '+money(h.porDia)+' por día y tu plan da '+money(h.planDia)+'. En un mes serían '+money(h.proyeccion)+'.',
      consejo:'Bajar '+money(h.porDia-h.planDia)+' por día te deja dentro de tu plan.'};
    case 'hormiga':return {titulo:'Gastos hormiga',cifra:pm(h.mes),
      detalle:h.n+' compras de menos de '+money(h.umbral)+' suman '+money(h.total)+'.',
      consejo:h.top.length?'Las que más se repiten: '+h.top.map(function(t){return t.nombre+' ('+t.n+')'}).join(', ')+'.':'De a poco no se notan; sumadas, sí.'};
    case 'cobro':return {titulo:'La semana después de cobrar',cifra:Math.round(h.pct*100)+' % del mes',
      detalle:'Después de cobrar el '+fecha(h.f)+' se fue '+money(h.a7)+' de '+money(h.a30)+' en 7 días.',
      consejo:'El día que cobrás, apartá lo de las semanas que vienen.'};
  }
  return {titulo:'',cifra:'',detalle:'',consejo:''};
}

/* «Por dónde se te va»: los 3 que más pesan cada mes (sin lo de una sola vez, y lo necesario después) */
export function principales(hallazgos,n){
  return hallazgos.filter(function(h){return !h.unaVez&&h.mes>0}).slice().sort(function(a,b){return (b.necesario?b.mes*0.4:b.mes)-(a.necesario?a.mes*0.4:a.mes)}).slice(0,n||3);
}
/* El aviso para Hoy: uno solo, el más importante que no descartaste.
   Primero lo que conviene saber ya (cobro repetido, algo que subió, cargos del banco); después el de más plata. */
export function avisoHoy(hallazgos,descartadas){
  var d=descartadas||{},vivos=hallazgos.filter(function(h){return !d[h.id]&&h.tipo!=='cobro'&&h.mes>0});
  var u=vivos.filter(function(h){return h.urgente});
  return u[0]||vivos[0]||null;
}

/* ---------- Datos para los dibujos ---------- */
/* Cada día del mes (aaaa-mm): {f, t, movs} */
export function porDiaDelMes(A,mes){
  var pd={};
  (A&&A.gas||[]).forEach(function(m){if(m.f.slice(0,7)!==mes)return;var o=pd[m.f]||(pd[m.f]={f:m.f,t:0,movs:[]});o.t-=m.m;o.movs.push(m)});
  return pd;
}
/* El nivel de un día contra lo que da tu plan por día: 0 nada · 1 bien (≤ 80 %) · 2 cerca (≤ 100 %) · 3 te pasaste */
export function nivelDia(t,planDia){
  if(!(t>0))return 0;
  if(!(planDia>0))return 1;
  return t<=planDia*0.8?1:t<=planDia?2:3;
}
/* Lo gastado día a día (acumulado) contra el plan, del inicio al fin: [{f, real, plan}] */
export function ritmoContraPlan(A,desde,hasta,planDia){
  var out=[],acum=0,pd={},n=Math.max(0,diff(desde,hasta));
  (A&&A.gas||[]).forEach(function(m){if(m.f>=desde&&m.f<=hasta)pd[m.f]=(pd[m.f]||0)-m.m});
  for(var i=0;i<=n;i++){var f=addD(desde,i);acum+=pd[f]||0;out.push({f:f,real:acum,plan:planDia*(i+1)})}
  return out;
}
/* Las categorías para el anillo: las 5 más grandes y «el resto» */
export function anillo(cats,max){
  max=max||5;
  var l=(cats||[]).filter(function(c){return c.t>0}),top=l.slice(0,max),resto=l.slice(max);
  if(resto.length)top.push({c:'El resto',t:resto.reduce(function(s,c){return s+c.t},0),n:resto.reduce(function(s,c){return s+c.n},0),resto:resto.map(function(c){return c.c})});
  var tot=top.reduce(function(s,c){return s+c.t},0);
  return top.map(function(c){return Object.assign({},c,{pct:tot?c.t/tot:0})});
}
export {dow};
