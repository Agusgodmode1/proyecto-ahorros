/* Fijos compartidos (2.11, puro): quién debe a quién en este período, «Me pagaron», «Saldar» y el resumen de la casa.
   El reparto (cuánto pone cada uno) está en reparto.js. Nada sale del teléfono: los nombres y lo que gana cada uno quedan acá. */
import {num,uid} from './util.js';
import {fijosPeriodo,pagoDe,montoDelPeriodo,montoEsperado,marcarPagado,cuentaEnPresupuesto,totalFijos} from './plan.js';
import {YO,grupoDe,partesDe,miParte,quienPaga,nombreDe,repartoBase,proporciones,repartir} from './reparto.js';

export var PLANTILLAS=[{id:'pareja',t:'En pareja',n:2},{id:'tres',t:'Somos 3',n:3},{id:'cuatro',t:'Somos 4',n:4},{id:'medida',t:'A medida',n:2}];
export function nuevoGrupo(nombre,n,nombres){
  var ps=[{id:YO,nombre:'Vos',ingreso:0}];
  for(var i=1;i<Math.max(2,n||2);i++)ps.push({id:uid(),nombre:(nombres&&nombres[i-1])||'Persona '+(i+1),ingreso:0});
  return {id:uid(),nombre:String(nombre||'Casa').slice(0,30),personas:ps,reparto:repartoBase()};
}
function periodo(state){return fijosPeriodo(state.fijos,state.plan.inicio,state.plan.cobro)}
function devuelto(p,id){var d=p&&p.devuelto&&p.devuelto[id];return d?num(d.monto):0}

/* Quién debe a quién en este período: [{grupo, persona, monto (> 0: te debe; < 0: le debés), fijos:[{fijo, monto}]}]
   - Pagaste vos todo: cada uno te debe su parte, menos lo que ya te devolvió.
   - Lo paga otro: desde el día que vence, le debés tu parte hasta que anotes que se la diste. */
export function balance(state,hoy){
  var m={};
  periodo(state).forEach(function(o){
    var f=o.f,g=grupoDe(state,f);if(!g)return;
    var quien=quienPaga(state,f),p=pagoDe(state,f.id);
    if(quien==='yo'&&p){
      var partes=partesDe(state,f,montoDelPeriodo(state,f));
      g.personas.forEach(function(pe){
        if(pe.id===YO)return;var falta=Math.round((num(partes[pe.id])-devuelto(p,pe.id))*100)/100;
        if(falta>0.5)sumar(m,g,pe,falta,f);
      });
    }else if(quien==='otro'&&!p&&o.fecha<=hoy){
      var pe=g.personas.filter(function(x){return x.id===f.pagador})[0]||g.personas[1];
      sumar(m,g,pe,-miParte(state,f,montoDelPeriodo(state,f)),f);
    }
  });
  return Object.keys(m).map(function(k){return m[k]}).filter(function(x){return Math.abs(x.monto)>0.5}).sort(function(a,b){return Math.abs(b.monto)-Math.abs(a.monto)});
}
function sumar(m,g,pe,monto,f){var k=g.id+'|'+pe.id;if(!m[k])m[k]={grupo:g,persona:pe,monto:0,fijos:[]};m[k].monto=Math.round((m[k].monto+monto)*100)/100;m[k].fijos.push({fijo:f,monto:monto})}

/* «Me pagaron»: lo que te debía esa persona en este período vuelve a «Tenés». Devuelve cómo deshacerlo. */
export function mePagaron(state,grupoId,personaId,hoy){
  var hechos=[];
  periodo(state).forEach(function(o){
    var f=o.f,g=grupoDe(state,f);if(!g||g.id!==grupoId||quienPaga(state,f)!=='yo')return;
    var p=pagoDe(state,f.id);if(!p)return;
    var parte=num(partesDe(state,f,montoDelPeriodo(state,f))[personaId]),falta=Math.round((parte-devuelto(p,personaId))*100)/100;
    if(falta<=0.5)return;
    var antes=p.devuelto&&p.devuelto[personaId]?Object.assign({},p.devuelto[personaId]):null;
    p.devuelto=Object.assign({},p.devuelto);p.devuelto[personaId]={monto:Math.round(parte*100)/100,fecha:hoy};
    hechos.push({tipo:'devuelto',k:state.plan.cobro,id:f.id,persona:personaId,antes:antes,monto:falta});
  });
  return {tipo:'devuelto',hechos:hechos,monto:hechos.reduce(function(t,h){return t+h.monto},0)};
}
/* «Saldar» lo que le debés a quien pagó: anota que le diste tu parte (sale de «Tenés»). */
export function leDiMiParte(state,grupoId,personaId,hoy){
  var hechos=[];
  periodo(state).forEach(function(o){
    var f=o.f,g=grupoDe(state,f);if(!g||g.id!==grupoId||quienPaga(state,f)!=='otro'||o.fecha>hoy)return;
    var pag=g.personas.filter(function(x){return x.id===f.pagador})[0]||g.personas[1];
    if(pag.id!==personaId||pagoDe(state,f.id))return;
    var total=montoDelPeriodo(state,f),parte=miParte(state,f,total);
    marcarPagado(state,f.id,true,{monto:total,parte:parte,fecha:hoy,nombre:f.nombre,paga:'otro'});
    hechos.push({tipo:'di',k:state.plan.cobro,id:f.id,monto:parte});
  });
  return {tipo:'di',hechos:hechos,monto:hechos.reduce(function(t,h){return t+h.monto},0)};
}
/* «Me pagaron» o «Saldar» con una persona: se cierran las dos puntas (lo que te debía y lo que le debías)
   y pasa de mano solo la diferencia: neto > 0 vuelve a «Tenés»; neto < 0 sale. */
export function saldarCon(state,grupoId,personaId,hoy){
  var a=mePagaron(state,grupoId,personaId,hoy),b=leDiMiParte(state,grupoId,personaId,hoy);
  return {tipo:'neto',hechos:a.hechos.concat(b.hechos),neto:Math.round((a.monto-b.monto)*100)/100,teDevolvio:a.monto,leDiste:b.monto};
}
export function deshacerSaldo(state,r){
  r.hechos.forEach(function(h){
    var m=state.fijosPagos[h.k];if(!m||!m[h.id])return;
    if((h.tipo||r.tipo)==='di'){delete m[h.id];return}
    var p=m[h.id];p.devuelto=Object.assign({},p.devuelto);
    if(h.antes)p.devuelto[h.persona]=h.antes;else delete p.devuelto[h.persona];
  });
}

/* Lo que te toca de los fijos y de la casa (todos los meses, con los variables en su promedio):
   {teToca, soloMios, parteCompartida, totalCasa, grupos:[{grupo, total, tuParte, porPersona:{id:monto}, fijos:[f]}], hayCompartidos} */
export function resumenCasa(state){
  var soloMios=0,parte=0,casa=0,gs={};
  (state.grupos||[]).forEach(function(g){gs[g.id]={grupo:g,total:0,tuParte:0,porPersona:{},fijos:[]}});
  (state.fijos||[]).forEach(function(f){
    if(!cuentaEnPresupuesto(f))return;
    var tot=montoEsperado(state,f),g=grupoDe(state,f);
    if(!g){soloMios+=tot;return}
    var ps=partesDe(state,f,tot),x=gs[g.id];
    x.total+=tot;x.tuParte+=num(ps[YO]);x.fijos.push(f);parte+=num(ps[YO]);casa+=tot;
    Object.keys(ps).forEach(function(id){x.porPersona[id]=Math.round(((x.porPersona[id]||0)+ps[id])*100)/100});
  });
  var lista=Object.keys(gs).map(function(k){return gs[k]});
  return {teToca:Math.round((soloMios+parte)*100)/100,soloMios:soloMios,parteCompartida:parte,totalCasa:Math.round((casa+soloMios)*100)/100,
    grupos:lista,hayCompartidos:lista.some(function(x){return x.fijos.length>0})};
}
/* El texto para mandar por WhatsApp: «Este mes: alquiler $20.000, a cada uno $10.000…» (money da el formato de los montos) */
export function textoResumen(state,grupoId,money){
  var r=resumenCasa(state),x=r.grupos.filter(function(g){return g.grupo.id===grupoId})[0];if(!x||!x.fijos.length)return '';
  var g=x.grupo,iguales=(g.reparto||{}).tipo==='iguales';
  var lin=x.fijos.map(function(f){
    var tot=montoEsperado(state,f),ps=partesDe(state,f,tot),ids=Object.keys(ps);
    var mismo=ids.every(function(id){return Math.abs(ps[id]-ps[ids[0]])<1});
    return '• '+f.nombre+' '+(f.variable?'≈ ':'')+money(tot)+(mismo?', a cada uno '+money(ps[ids[0]]):': '+ids.map(function(id){return nombreDe(g,id)+' '+money(ps[id])}).join(', '));
  });
  var tot='Total: '+money(x.total)+(iguales?' · a cada uno '+money(x.total/g.personas.length):' · '+g.personas.map(function(p){return nombreDe(g,p.id)+' '+money(x.porPersona[p.id]||0)}).join(', '));
  return g.nombre+' · este mes\n'+lin.join('\n')+'\n'+tot;
}
/* Cuánto pone cada uno de un grupo, en porcentaje (para mostrar el reparto) */
export function porcentajes(grupo){var p=proporciones(grupo,grupo.reparto);var o={};Object.keys(p).forEach(function(k){o[k]=Math.round(p[k]*1000)/10});return o}
export {repartir,totalFijos};
