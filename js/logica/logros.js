/* Historial, rachas, logros y cierre del mes (puro, sin DOM). */
import {num} from './util.js';
import {liq,reglasHoras} from './sueldo.js';
import {fijosPeriodo,isPagado,nextCobro,cfgCobro} from './plan.js';
import {aportado} from './metas.js';
import {minimoDe,nivelDe,rachaSemanas} from './mes.js';
import {liqReal} from './recibos.js';

export function mesKey(s){return s.slice(0,7)}
export function difMeses(a,b){return (Number(b.slice(0,4))-Number(a.slice(0,4)))*12+(Number(b.slice(5,7))-Number(a.slice(5,7)))}
/* Mes logrado: llegaste al mínimo (o a la meta, en los meses cerrados antes de que existiera el mínimo) */
export function histOk(x){return nivelDe(x)!=='ninguno'}
export function histObjetivo(x){return nivelDe(x)==='objetivo'&&num(x.meta)>0}
export function histExtra(x){return num(x.meta)>0&&num(x.ahorrado)>=num(x.meta)+100}
/* Racha: meses seguidos con ahorro mayor o igual a la meta. */
export function histStats(hist){
  var hs=hist.slice().sort(function(a,b){return a.k<b.k?-1:1});
  var best=0,run=0,prev=null,met=0,extra=0,tot=0,limpio=0,fok=0,sem=0,obj=0,runObj=0,bestObj=0;
  hs.forEach(function(x){
    var ok=histOk(x),ob=histObjetivo(x);
    if(ok){met++;run=(prev&&prev.ok&&difMeses(prev.k,x.k)===1)?run+1:1}else run=0;
    if(run>best)best=run;
    if(ob){obj++;runObj=(prev&&prev.ob&&difMeses(prev.k,x.k)===1)?runObj+1:1}else runObj=0;
    if(runObj>bestObj)bestObj=runObj;
    if(histExtra(x))extra++;
    tot+=num(x.ahorrado);
    if(x.conGastos&&x.semanas>0&&x.semanasOk===x.semanas)limpio++;
    if(x.fijosN>0&&x.fijosPagados===x.fijosN)fok++;
    if(x.conGastos)sem+=num(x.semanasOk);
    prev={k:x.k,ok:ok,ob:ob};
  });
  return {hs:hs,best:best,cur:(hs.length&&histOk(hs[hs.length-1]))?run:0,met:met,extra:extra,tot:tot,limpio:limpio,fok:fok,sem:sem,
    obj:obj,bestObj:bestObj,curObj:(hs.length&&histObjetivo(hs[hs.length-1]))?runObj:0};
}
export function semanasOkAhora(pc,hoy){var n=0;pc.weeks.forEach(function(w){if(hoy>w.end&&w.spent>0&&w.left>=0)n++});return n}
function reciboVal(state,k){var v=state.recibo[k];return (v===undefined||v===null||v==='')?null:num(v)}

/* Los 15 logros. A = análisis del extracto (o null). */
export function logrosLista(state,pc,hoy,A){
  var S=histStats(state.hist),L=liq(state,true),extras=L.N-num(state.sueldo.nominal);
  var fp=fijosPeriodo(state.fijos,state.plan.inicio,state.plan.cobro);
  var fijosAhora=fp.length>0&&fp.every(function(o){return isPagado(state,o.f.id)});
  var rq=reciboVal(state,'liq'),reciboOk=(rq!==null&&rq>0&&Math.abs(rq-L.liquido)<=300)?1:0;
  var det=(A&&A.hor.n>0)?1:0;
  var lista=[
    {id:'primer-cierre',ic:'flag',t:'Primer mes cerrado',d:'Cerraste tu primer mes en la app.',need:1,val:S.hs.length},
    {id:'meta-1',ic:'medal',t:'Meta cumplida',d:'Llegaste al menos al mínimo que te propusiste en un mes.',need:1,val:S.met},
    {id:'objetivo-1',ic:'star',t:'Objetivo cumplido',d:'Llegaste al objetivo de ahorro de un mes, no solo al mínimo.',need:1,val:S.obj},
    {id:'objetivo-3',ic:'flame',t:'Tres objetivos seguidos',d:'Tres meses seguidos llegando al objetivo.',need:3,val:S.bestObj},
    {id:'semanas-4',ic:'cal',t:'Un mes de semanas',d:'Cuatro semanas seguidas sin pasarte del tope.',need:4,val:rachaSemanas(state.hist,pc,hoy).mejor},
    {id:'racha-2',ic:'flame',t:'Racha de 2',d:'Dos meses seguidos cumpliendo la meta.',need:2,val:S.best},
    {id:'racha-3',ic:'flame',t:'Racha de 3',d:'Tres meses seguidos cumpliendo la meta.',need:3,val:S.best},
    {id:'racha-6',ic:'flame',t:'Medio año',d:'Seis meses seguidos cumpliendo la meta.',need:6,val:S.best},
    {id:'extra-1',ic:'star',t:'Un extra',d:'Guardaste más de lo que te propusiste en un mes.',need:1,val:S.extra},
    {id:'extra-2',ic:'star',t:'Doble extra',d:'Dos meses guardando más que la meta.',need:2,val:S.extra},
    {id:'semana',ic:'cal',t:'Semana redonda',d:'Terminaste una semana sin pasarte, con tus gastos anotados.',need:1,val:S.sem+semanasOkAhora(pc,hoy)},
    {id:'mes-limpio',ic:'check',t:'Mes sin pasarte',d:'Todas las semanas de un mes dentro del presupuesto.',need:1,val:S.limpio},
    {id:'fijos',ic:'check',t:'Fijos al día',d:'Pagaste y marcaste todos los gastos fijos del período.',need:1,val:S.fok+(fijosAhora?1:0)},
    {id:'horas',ic:'clock',t:'Horas de oro',d:'Sumaste más de $ 5.000 en extras en un mes.',need:5000,val:Math.max(0,Math.round(extras)),money:true},
    {id:'recibo',ic:'eye',t:'Ojo de halcón',d:'Comparaste tu recibo y el líquido coincidió.',need:1,val:reciboOk},
    {id:'detective',ic:'search',t:'Detective',d:'Pegaste tu extracto y encontraste tus gastos hormiga.',need:1,val:det},
    {id:'total-50',ic:'coins',t:'$ 50.000 guardados',d:'Juntaste $ 50.000 entre todos los meses cerrados.',need:50000,val:Math.round(S.tot),money:true},
    {id:'total-100',ic:'coins',t:'$ 100.000 guardados',d:'Juntaste $ 100.000 entre todos los meses cerrados.',need:100000,val:Math.round(S.tot),money:true}
  ];
  /* Un logro por cada meta con nombre */
  (state.metas||[]).forEach(function(m){
    if(num(m.objetivo)>0)lista.push({id:'meta-'+m.id,ic:'flag',t:'Meta: '+m.nombre,d:'Juntaste todo lo de tu meta «'+m.nombre+'».',need:Math.round(num(m.objetivo)),val:Math.round(aportado(m)),money:true});
  });
  /* Sin horas extra en el perfil, el logro de horas no aplica */
  if(reglasHoras(state).activo===false)lista=lista.filter(function(l){return l.id!=='horas'});
  return lista;
}
/* Marca con la fecha de hoy los logros recién alcanzados y los devuelve. */
export function nuevosLogros(state,pc,hoy,A){
  var nuevos=[];
  logrosLista(state,pc,hoy,A).forEach(function(l){if(l.val>=l.need&&!state.logros[l.id]){state.logros[l.id]=hoy;nuevos.push(l)}});
  return nuevos;
}

/* Cerrar el mes: guarda el período en el historial y arranca el siguiente
   (inicio = cobro anterior, cobro = 5.º día hábil del mes siguiente). Devuelve la fecha del nuevo cobro. */
export function cerrarMes(state,pc,ahorrado,monto){
  var p=state.plan,fp=fijosPeriodo(state.fijos,p.inicio,p.cobro);
  var ah=Math.max(0,ahorrado),k=mesKey(p.inicio),semOk=0,L=liqReal(state),seq=[];
  pc.weeks.forEach(function(w){if(w.left>=0)semOk++;if(w.spent>0)seq.push(w.left>=0)});
  var rec={k:k,desde:p.inicio,hasta:p.cobro,meta:Math.round(pc.ahorro),ahorrado:Math.round(ah),gastado:Math.round(pc.spentInPlan),presupuesto:Math.round(pc.gastar),semanas:pc.weeks.length,semanasOk:semOk,conGastos:pc.spentInPlan>0,fijosN:fp.length,fijosPagados:fp.filter(function(o){return isPagado(state,o.f.id)}).length,
    minimo:minimoDe(state,pc),semanasSeq:seq,
    /* Sueldo estimado que se cobra en este cierre: sirve para calcular el aguinaldo */
    cobro:p.cobro,nominal:Math.round(L.N*100)/100,liquido:Math.round(L.liquido*100)/100,extras:Math.round((L.N-num(state.sueldo.nominal))*100)/100};
  state.hist=state.hist.filter(function(x){return x.k!==k});state.hist.push(rec);
  var nc=nextCobro(p.cobro,cfgCobro(state));
  p.inicio=p.cobro;p.cobro=nc;if(monto>0)p.monto=Math.round(monto);
  state.recibo={};
  return nc;
}
