/* Llegar a fin de mes con un ahorro mínimo (puro). Es una capa sobre el plan de siempre (plan.js no cambia):
   - Meta del mes en dos niveles: objetivo (plan.ahorro / plan.pct, la de siempre) y mínimo aceptable
     (plan.minimo = {valor}, en pesos o en % según plan.modo). Sin mínimo, el mínimo es el objetivo.
   - Lo que sobra de una semana terminada pasa a la siguiente o va al ahorro (plan.sobrante, y cada semana
     puede tener la suya en plan.sobranteSemana[inicioDeLaSemana]).
   - Si una semana terminada se pasó, lo que te pasaste se reparte entre las semanas que quedan.
     Si ya no alcanza para el objetivo, las semanas que quedan cuidan el mínimo. */
import {diffDays} from './fechas.js';
import {num} from './util.js';

export function minimoDe(state,pc){
  var p=state.plan,m=p.minimo;
  if(!m||m.valor===''||m.valor===null||m.valor===undefined)return pc.ahorro;
  var v=p.modo==='pct'?Math.round(num(p.monto)*num(m.valor)/100):Math.round(num(m.valor));
  return Math.max(0,Math.min(v,pc.ahorro));
}
export function sobranteDe(state,w){var ps=state.plan.sobranteSemana||{};return ps[w.start]||state.plan.sobrante||'siguiente'}

/* Devuelve el plan con las semanas ajustadas, más:
   ajuste = {estado:'objetivo'|'minimo'|'nada', minimo, margen, falta, recalculo:{semana,deficit}|null, alAhorro} */
export function ajustarPlan(state,pc,hoy){
  var minimo=minimoDe(state,pc),margen=Math.max(0,pc.ahorro-minimo);
  var ws=pc.weeks.map(function(w){return Object.assign({},w)}),carry=0,alAhorro=0,recalculo=null;
  for(var i=0;i<ws.length;i++){
    var w=ws[i];
    w.carry=carry;w.avail=w.budget+carry;w.left=w.avail-w.spent;
    var terminada=w.end<hoy,resto=ws.slice(i+1),dias=0;resto.forEach(function(x){dias+=x.days});
    if(terminada&&w.left<0&&dias>0){
      /* Te pasaste: se reparte entre las semanas que quedan, según sus días */
      var deficit=-w.left;
      resto.forEach(function(x){x.budget-=deficit*x.days/dias});
      recalculo={semana:i,deficit:deficit};carry=0;
    }else if(terminada&&w.left>0&&sobranteDe(state,w)==='ahorro'){
      w.alAhorro=w.left;alAhorro+=w.left;carry=0;
    }else carry=w.left;
  }
  /* ¿Alcanza lo que queda para el objetivo? Si no, se cuida el mínimo */
  var vivas=ws.filter(function(w){return w.end>=hoy}),restante=0,diasV=0,estado='objetivo',falta=0;
  if(vivas.length){
    restante=vivas[0].carry;vivas.forEach(function(w){restante+=w.budget-w.spent;diasV+=w.days});
    if(restante<0){
      if(restante+margen>=0){
        estado='minimo';
        /* El objetivo ya no se alcanza: lo que queda se puede gastar hasta quedar justo en el mínimo */
        vivas.forEach(function(w){w.budget+=margen*w.days/diasV});
      }else{estado='nada';falta=-(restante+margen)}
      /* Recalcula disponibles con los presupuestos nuevos */
      var c=vivas[0].carry;
      vivas.forEach(function(w){w.carry=c;w.avail=w.budget+c;w.left=w.avail-w.spent;c=w.left});
    }
  }
  return Object.assign({},pc,{weeks:ws,ajuste:{estado:estado,minimo:minimo,margen:margen,falta:falta,recalculo:recalculo,alAhorro:alAhorro}});
}

/* Aviso a mitad de mes (desde el 40% del período, si anotaste gastos): ¿alcanza el ritmo para el mínimo? */
export function ritmoDelMes(state,pc,hoy){
  var p=state.plan;
  if(hoy<p.inicio||hoy>=p.cobro)return null;
  var trans=diffDays(p.inicio,hoy)+1,quedan=pc.total-trans;
  if(trans<pc.total*0.4||quedan<1)return null;
  var gastado=0,hay=false;
  state.gastos.forEach(function(g){if(g.fecha>=p.inicio&&g.fecha<=hoy){gastado+=num(g.monto);hay=true}});
  if(!hay)return null;
  var porDia=gastado/trans,proy=porDia*pc.total,ahorro=pc.ahorro+(pc.gastar-proy),minimo=minimoDe(state,pc),margen=Math.max(0,pc.ahorro-minimo);
  var r={ahorro:ahorro,objetivo:pc.ahorro,minimo:minimo,porDia:porDia,quedan:quedan};
  if(ahorro>=pc.ahorro-1){r.tipo='bien';return r}
  r.porDiaObjetivo=Math.max(0,(pc.gastar-gastado)/quedan);
  if(ahorro>=minimo-1){r.tipo='minimo';return r}
  r.tipo='mal';
  r.porDiaMinimo=Math.max(0,(pc.gastar+margen-gastado)/quedan);
  r.bajar=Math.max(0,porDia-r.porDiaMinimo);
  return r;
}

/* Resultado de un mes cerrado: 'objetivo', 'minimo' o 'ninguno' */
export function nivelDe(x){
  var ah=num(x.ahorrado),meta=num(x.meta),min=x.minimo===undefined||x.minimo===null?meta:num(x.minimo);
  if(meta>0&&ah>=meta-1)return 'objetivo';
  if(min>0?ah>=min-1:ah>0)return 'minimo';
  return 'ninguno';
}

/* Semanas seguidas dentro del tope: de los meses cerrados (en orden) y de las semanas ya terminadas de este */
export function rachaSemanas(hist,pc,hoy){
  var seq=[];
  hist.slice().sort(function(a,b){return a.k<b.k?-1:1}).forEach(function(x){
    if(Array.isArray(x.semanasSeq))seq=seq.concat(x.semanasSeq);
    else if(x.conGastos&&x.semanas>0){for(var i=0;i<x.semanas;i++)seq.push(x.semanasOk===x.semanas)}
  });
  if(pc)pc.weeks.forEach(function(w){if(w.end<hoy&&w.spent>0)seq.push(w.left>=0)});
  var run=0,best=0;seq.forEach(function(ok){run=ok?run+1:0;if(run>best)best=run});
  return {actual:run,mejor:best};
}
