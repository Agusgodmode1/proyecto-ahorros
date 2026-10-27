/* Fijos compartidos (2.11): reparto, redondeo, quién debe a quién, «Me pagaron» y que nada cambie con todo «Solo mío».
   Nombres y números inventados. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planCalc,fijosPeriodoTotal,totalFijos,montoEsperado,marcarPagado,parteDelPeriodo} from '../js/logica/plan.js';
import {disponible,fijosPagados,fijosPendientes,maxAhorro} from '../js/logica/saldo.js';
import {YO,proporciones,repartir,partesDe,miParte,calcular} from '../js/logica/reparto.js';
import {balance,mePagaron,leDiMiParte,saldarCon,deshacerSaldo,resumenCasa,textoResumen,nuevoGrupo} from '../js/logica/compartidos.js';
import {migrar,ejemplo,VERSION_ESTADO} from '../js/estado.js';

function base(){
  return {plan:{monto:42000,modo:'monto',ahorro:6000,pct:30,inicio:'2026-10-20',cobro:'2026-11-06',minimo:null,sobrante:'siguiente',sobranteSemana:{}},
   gastos:[{id:'a',fecha:'2026-10-21',monto:1200,nota:'Súper'},{id:'b',fecha:'2026-10-26',monto:350,nota:'Café'},{id:'c',fecha:'2026-10-28',monto:2100,nota:'Farmacia'}],
   fijos:[{id:'f1',nombre:'Alquiler',monto:18000,dia:1,cat:'Vivienda'},{id:'f2',nombre:'UTE',monto:2400,dia:25,cat:'Servicios',variable:true},
     {id:'f3',nombre:'Tarjeta',monto:9000,dia:28,cat:'Deudas y cuotas',tarjeta:true},{id:'f4',nombre:'Spotify',monto:400,dia:22,cat:'Suscripciones',usd:10,cotiz:40},
     {id:'f5',nombre:'Gimnasio',monto:1500,dia:15,cat:'Salud'}],
   fijosPagos:{'2026-10-06':{f2:{monto:2100,fecha:'2026-09-25'}},'2026-09-05':{f2:{monto:2700,fecha:'2026-08-25'}},'2026-11-06':{f4:{monto:400,fecha:'2026-10-22',nombre:'Spotify'},f2:{monto:2550,fecha:'2026-10-25',nombre:'UTE'}}},
   grupos:[],sueldo:{nominal:42000},perfil:{},hist:[]};
}
var casa={id:'g1',nombre:'Casa',personas:[{id:YO,nombre:'Vos',ingreso:60000},{id:'s',nombre:'Sofi',ingreso:40000}],reparto:{tipo:'iguales',pct:{},montos:{}}};

test('con todo «Solo mío» el plan da exactamente lo mismo que antes (los números de la versión 2.10)',function(){
  var st=base(),pc=planCalc(st);
  assert.equal(pc.gastar,15050);assert.equal(pc.ahorro,6000);assert.equal(pc.fijos,20950);
  assert.equal(pc.weeks[0].left,4647.058823529412);assert.equal(pc.weeks[1].left,8744.117647058823);
  assert.equal(fijosPeriodoTotal(st),20950);assert.equal(totalFijos(st.fijos,st),22350);
  assert.equal(disponible(st,pc),35400);assert.equal(fijosPagados(st),2950);assert.equal(fijosPendientes(st,pc),18000);assert.equal(maxAhorro(st,pc),17400);
  assert.equal(montoEsperado(st,st.fijos[1]),2450);
  /* y un grupo que no usa ningún fijo tampoco cambia nada */
  st.grupos=[casa];var pc2=planCalc(st);assert.equal(pc2.gastar,15050);assert.equal(disponible(st,pc2),35400);
});

test('cada tipo de reparto: iguales, según lo que gana cada uno, porcentajes y montos fijos',function(){
  var g=JSON.parse(JSON.stringify(casa));
  assert.deepEqual(proporciones(g,{tipo:'iguales'}),{yo:.5,s:.5});
  assert.deepEqual(proporciones(g,{tipo:'ingresos'}),{yo:.6,s:.4});
  assert.deepEqual(proporciones(g,{tipo:'pct',pct:{yo:70,s:30}}),{yo:.7,s:.3});
  var m=proporciones(g,{tipo:'montos',montos:{yo:15000,s:5000}});assert.equal(m.yo,.75);assert.equal(m.s,.25);
  /* sin datos para repartir (ingresos en cero), parejo */
  g.personas.forEach(function(p){p.ingreso=0});assert.deepEqual(proporciones(g,{tipo:'ingresos'}),{yo:.5,s:.5});
  /* en un fijo: el reparto propio del fijo manda sobre el del grupo */
  var st=base();st.grupos=[casa];
  var f={id:'x',nombre:'Alquiler',monto:20000,dia:1,grupo:'g1'};
  assert.deepEqual(partesDe(st,f,20000),{yo:10000,s:10000});
  f.reparto={tipo:'ingresos'};assert.deepEqual(partesDe(st,f,20000),{yo:12000,s:8000});
  assert.equal(miParte(st,{id:'y',monto:900},900),900);
});

test('redondeo: las partes siempre suman exactamente el total',function(){
  [[1000,3],[1001,3],[999.99,3],[22000,3],[690,3],[1,3],[7,4],[2600,2]].forEach(function(c){
    var props={};for(var i=0;i<c[1];i++)props[i===0?YO:'p'+i]=1/c[1];
    var r=repartir(c[0],props),s=Object.keys(r).reduce(function(t,k){return t+r[k]},0);
    assert.equal(Math.round(s*100)/100,c[0],'reparte '+c[0]+' entre '+c[1]);
  });
  assert.deepEqual(repartir(1000,{yo:1/3,a:1/3,b:1/3}),{yo:334,a:333,b:333});
  var r=repartir(2600,{yo:.6,s:.4});assert.equal(r.yo+r.s,2600);
  var c=calcular(1000,[{nombre:'Vos',ingreso:30000},{nombre:'Ana',ingreso:20000}],'ingresos');
  assert.equal(c[0].monto,600);assert.equal(c[1].monto,400);assert.equal(c[1].nombre,'Ana');
});

test('pagás vos todo: «Tenés» baja por el total, Sofi te debe su parte y «Me pagaron» la devuelve (con Deshacer)',function(){
  var st=base();st.grupos=[casa];
  st.fijos[0]=Object.assign(st.fijos[0],{grupo:'g1',paga:'yo'});   /* alquiler 18000, mitad y mitad */
  var pc=planCalc(st);
  assert.equal(pc.fijos,20950-9000,'el presupuesto usa tu parte');
  var antes=disponible(st,pc);
  marcarPagado(st,'f1',true,{monto:18000,parte:9000,fecha:'2026-11-01',nombre:'Alquiler',paga:'yo'});
  assert.equal(disponible(st,planCalc(st)),antes-18000,'pagaste el total');
  var b=balance(st,'2026-11-02');
  assert.equal(b.length,1);assert.equal(b[0].persona.nombre,'Sofi');assert.equal(b[0].monto,9000);
  assert.equal(fijosPendientes(st,planCalc(st)),0,'tu parte del alquiler ya está pagada (y los demás de este período también)');
  var r=mePagaron(st,'g1','s','2026-11-03');
  assert.equal(r.monto,9000);assert.equal(disponible(st,planCalc(st)),antes-9000,'lo que te devolvieron vuelve a «Tenés»');
  assert.equal(balance(st,'2026-11-03').length,0);
  deshacerSaldo(st,r);
  assert.equal(disponible(st,planCalc(st)),antes-18000);assert.equal(balance(st,'2026-11-03')[0].monto,9000);
});

test('lo paga otro: desde que vence le debés tu parte; «Saldar» anota que se la diste (sale de «Tenés») y se puede deshacer',function(){
  var st=base();st.grupos=[casa];
  st.fijos[4]=Object.assign(st.fijos[4],{grupo:'g1',paga:'otro',pagador:'s'});  /* gimnasio 1500, vence el 15 */
  st.plan.inicio='2026-10-10';
  assert.equal(balance(st,'2026-10-14').length,0,'todavía no venció');
  var b=balance(st,'2026-10-16');assert.equal(b[0].monto,-750);assert.equal(b[0].persona.nombre,'Sofi');
  var antes=disponible(st,planCalc(st));
  var r=leDiMiParte(st,'g1','s','2026-10-16');
  assert.equal(r.monto,750);assert.equal(disponible(st,planCalc(st)),antes-750);assert.equal(balance(st,'2026-10-16').length,0);
  deshacerSaldo(st,r);assert.equal(disponible(st,planCalc(st)),antes);
});

test('un fijo variable compartido usa el promedio de los totales y tu parte de ese promedio',function(){
  var st=base();st.grupos=[casa];
  st.fijos[1]=Object.assign(st.fijos[1],{grupo:'g1',paga:'cada',reparto:{tipo:'ingresos'}});
  delete st.fijosPagos['2026-11-06'].f2;
  assert.equal(montoEsperado(st,st.fijos[1]),2400,'promedio de 2100 y 2700');
  assert.equal(parteDelPeriodo(st,st.fijos[1]),1440,'el 60 % que te toca');
  /* cada uno paga su parte: anotás la tuya */
  marcarPagado(st,'f2',true,{monto:2500,parte:1500,fecha:'2026-10-25',nombre:'UTE',paga:'cada'});
  assert.equal(parteDelPeriodo(st,st.fijos[1]),1500);
  assert.equal(fijosPagados(st),400+1500);
  assert.equal(balance(st,'2026-10-26').length,0,'cada uno pagó lo suyo: nadie le debe a nadie');
});

test('la tarjeta compartida sigue sin contarse dos veces y los fijos en dólares se reparten en pesos',function(){
  var st=base();st.grupos=[casa];
  st.fijos[2].grupo='g1';st.fijos[3]=Object.assign(st.fijos[3],{grupo:'g1'});
  var pc=planCalc(st);
  assert.equal(pc.fijos,20950-200,'Spotify: tu mitad de $ 400; la tarjeta no cuenta');
});

test('resumen de la casa y el texto para mandar por WhatsApp',function(){
  var st=base();st.grupos=[casa];st.fijos[0]=Object.assign(st.fijos[0],{grupo:'g1'});
  var r=resumenCasa(st);
  assert.equal(r.teToca,totalFijos(st.fijos,st));assert.equal(r.parteCompartida,9000);assert.equal(r.soloMios,2450+400+1500);
  assert.equal(r.totalCasa,18000+2450+400+1500);assert.ok(r.hayCompartidos);
  var tx=textoResumen(st,'g1',function(n){return '$'+Math.round(n)});
  assert.match(tx,/Alquiler \$18000, a cada uno \$9000/);assert.match(tx,/Total: \$18000/);
});

test('v14 → v15: los fijos de antes quedan «Solo míos» y no se pierde nada',function(){
  var v14={v:14,plan:base().plan,gastos:base().gastos,fijos:base().fijos,fijosPagos:base().fijosPagos,pacto:{sellado:'2026-10-20',numero:1,usd:0}};
  var st=migrar(v14);
  assert.equal(st.v,VERSION_ESTADO);assert.deepEqual(st.grupos,[]);
  assert.deepEqual(st.fijos,v14.fijos);assert.deepEqual(st.fijosPagos,v14.fijosPagos);
  assert.equal(planCalc(st).fijos,20950);
});

test('los datos de ejemplo traen fijos compartidos en pareja y entre 3, con quién debe a quién',function(){
  var st=ejemplo('2026-10-27');
  assert.equal(st.grupos.length,2);assert.equal(st.grupos[1].personas.length,3);
  var b=balance(st,'2026-10-27');
  var sofi=b.filter(function(x){return x.persona.nombre==='Sofi'})[0],leo=b.filter(function(x){return x.persona.nombre==='Leo'})[0];
  assert.equal(sofi.monto,11000-Math.round(2600*45000/81000),'Sofi te debe la mitad del alquiler; vos le debés tu parte de UTE');
  assert.equal(leo.monto,-230);
  assert.ok(nuevoGrupo('Depto',3).personas.length===3);
});

test('«Me pagaron» con alguien a quien también le debías: pasa de mano solo la diferencia, y se puede deshacer',function(){
  var st=ejemplo('2026-10-27'),pc=planCalc(st),antes=disponible(st,pc);
  var r=saldarCon(st,'g-casa','p-sofi','2026-10-27');
  var ute=Math.round(2600*45000/81000);
  assert.equal(r.neto,11000-ute);
  assert.equal(disponible(st,planCalc(st)),antes+11000-ute,'vuelve la mitad del alquiler y sale tu parte de UTE');
  assert.equal(balance(st,'2026-10-27').filter(function(x){return x.persona.nombre==='Sofi'}).length,0);
  deshacerSaldo(st,r);
  assert.equal(disponible(st,planCalc(st)),antes);
  assert.equal(balance(st,'2026-10-27').filter(function(x){return x.persona.nombre==='Sofi'})[0].monto,11000-ute);
});
