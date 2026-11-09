import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fechaDe,celdasDe,diasDeFilas} from '../js/logica/horas-archivo.js';
import {asiTePagan,ultimoRecibo,veredicto,estadoDelMes,reciboRaro,liqReal} from '../js/logica/recibos.js';
import {mesTrabajo} from '../js/logica/sueldo.js';
import {liq} from '../js/logica/sueldo.js';
import {ejemplo} from '../js/estado.js';

/* Reglas inventadas: de 9 a 18, ×2, desde el primer minuto */
var R={activo:true,entrada:'09:00',salida:'18:00',dias:'lv',jornada:540,umbral:540,multSem:2,multFin:1.5,divisor:240,redondeo:'no'};

test('(2.53) fechas en cualquier forma',function(){
  assert.equal(fechaDe('05/10/2026',2026),'2026-10-05');
  assert.equal(fechaDe('5-10-26',2026),'2026-10-05');
  assert.equal(fechaDe('2026-10-05',2000),'2026-10-05');
  assert.equal(fechaDe('05/10',2026),'2026-10-05','sin año usa el de hoy');
  assert.equal(fechaDe(46300,2026)!==null,true,'número de fecha de Excel');
  assert.equal(fechaDe('13:30',2026),null);
  assert.equal(fechaDe('32/10/2026',2026),null);
});

test('(2.53) horas desde un PDF o un texto: fecha + entrada + salida',function(){
  var lineas=['Asistencia de octubre','Lunes 05/10/2026 08:45 18:20 9:35','Martes 06/10/2026 09:00 18:00','Miércoles 07/10/2026 Licencia','Sábado 10/10/2026 10:00 14:00','12/12/2026 09:00 20:00'];
  var r=diasDeFilas(lineas.map(celdasDe),R,'2026-11-01');
  assert.equal(r.dias.length,3,'el día de licencia y el futuro no cuentan');
  var d5=r.dias.filter(function(d){return d.fecha==='2026-10-05'})[0];
  assert.equal(d5.llegada,'08:45');assert.equal(d5.salida,'18:20');assert.equal(d5.min,35,'15 min antes y 20 después');
  assert.equal(r.dias.filter(function(d){return d.fecha==='2026-10-06'})[0].min,0);
  var sab=r.dias.filter(function(d){return d.fecha==='2026-10-10'})[0];
  assert.equal(sab.tipo,'fin');assert.equal(sab.min,240,'el sábado cuenta entero');
});

test('(2.53) horas desde una planilla de Excel con otro formato (números de Excel)',function(){
  var filas=[['Fecha','Entrada','Salida'],[46300,0.375,0.78125]];
  var r=diasDeFilas(filas,R,'2030-01-01');
  assert.equal(r.dias.length,1);assert.equal(r.dias[0].llegada,'09:00');assert.equal(r.dias[0].salida,'18:45');
});

test('(2.53) sin horario no inventa nada',function(){
  var r=diasDeFilas([['05/10/2026','08:00','19:00']],{activo:true,dias:'lv'},'2026-11-01');
  assert.equal(r.dias.length,0);assert.equal(r.sinHorario,true);
});

test('(2.53) así te pagan: la hora, la extra y los descuentos del último recibo',function(){
  var s=ejemplo();
  s.recibos=[{id:'a',mes:'2026-09',moneda:'UYU',nominal:48000,haberes:52000,aportes:7800,fonasa:2340,irpf:1500,liquido:40360,horasCant:10,horasMonto:4000}];
  var A=asiTePagan(s);
  assert.equal(A.mes,'2026-09');
  assert.equal(A.extra.valor,400);assert.equal(A.extra.deRecibo,true);
  assert.ok(A.hora>0);
  assert.equal(A.descuentos[0].pct,15,'BPS 15 % de lo que ganás');
  assert.equal(A.descuentos[1].pct,4.5);
  assert.equal(A.enMano,77.6);
  assert.equal(asiTePagan(Object.assign({},s,{recibos:[]})),null);
});

test('(2.53) sin horas cargadas de ese mes, el veredicto usa las horas que dice el recibo',function(){
  var s=ejemplo();s.recibos=[];s.horas=[];
  var sm=estadoDelMes(s,'2026-09');sm=Object.assign({},sm,{horas:[{id:'x',fecha:'2026-09-15',tipo:'sem',min:360}]});
  var est=liq(sm,true);
  var v=veredicto(s,{mes:'2026-09',moneda:'UYU',haberes:est.N,liquido:est.liquido,horasCant:6,horasMonto:est.extraCom});
  assert.equal(v.usoRecibo,true);
  assert.equal(v.tipo,'bien','con las 6 h del recibo da bien, no «de más»');
});

test('(2.54) un recibo mal leído no da veredicto ni cambia lo que vas a cobrar',function(){
  var s=ejemplo();
  var malo={id:'m',mes:mesTrabajo(s),moneda:'UYU',nominal:391,haberes:7099,aportes:8844,irpf:58959,liquido:47404};
  assert.ok(reciboRaro(malo));
  s.recibos=[malo];
  assert.equal(veredicto(s,malo).tipo,'raro');
  assert.equal(asiTePagan(s),null);
  assert.equal(liqReal(s).real,undefined,'sigue la estimación');
  assert.equal(reciboRaro({haberes:52500,aportes:7875,irpf:1234,nominal:45000,liquido:41000}),null);
});

test('(2.55) sin horario, la planilla sugiere el tuyo: lo que más se repite, a la media hora',function(){
  var filas=[['02/11/2026','11:55','21:05'],['03/11/2026','12:02','21:20'],['04/11/2026','12:00','21:00'],['05/11/2026','12:10','20:58']];
  var r=diasDeFilas(filas,{activo:true,dias:'lv'},'2026-11-30');
  assert.equal(r.dias.length,0);assert.equal(r.sinHorario,true);
  assert.deepEqual(r.horarioProbable,{entrada:'12:00',salida:'21:00',dias:'lv'});
});

/* (2.56.1) una hora extra mal leída no se muestra: se usan tus reglas, y los descuentos sin leer van en «Resto» */
import {revisarCampos as rc2} from '../js/logica/lector-recibo.js';
test('hora extra absurda: se descarta y los descuentos suman', async function(){
  var {asiTePagan:asi}=await import('../js/logica/recibos.js');
  var c={nominal:48000,haberes:50000,liquido:40000,aportes:7500,horasCant:350,horasMonto:2100};
  var d=rc2(c);assert.equal(c.horasCant,null);assert.ok(d.length);
  var st={perfil:{ingreso:{tipo:'uy'},horas:{multSem:2,multFin:1.5,divisor:240,entrada:'09:00',salida:'18:00'}},sueldo:{nominal:48000},horas:[],recibos:[{id:'r',mes:'2026-10',nominal:48000,haberes:50000,liquido:40000,aportes:7500,horasCant:350,horasMonto:2100}]};
  var A=asi(st);
  assert.equal(A.extra.deRecibo,false);assert.equal(A.extra.valor,400);assert.equal(A.extra.mult,2);
  var tot=A.descuentos.reduce(function(x,y){return x+y.monto},0);assert.equal(tot,10000);
  assert.equal(A.descuentos[A.descuentos.length-1].nombre,'Resto de descuentos');
});
