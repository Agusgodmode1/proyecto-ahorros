import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extraPorHorario,tipoDeDia,minimoExtra,tieneHorario,aplicarHorario,aplicarPago} from '../js/logica/horario.js';
import {puesto} from '../js/logica/puestos.js';
import {usarFeriados} from '../js/logica/fechas.js';
import {FERIADOS_UY} from '../js/logica/feriados.js';

var R=puesto('crm').horas;
test('entre semana: se suman los minutos de antes y de después',function(){
  var x=extraPorHorario(R,'11:45','21:15','sem');
  assert.equal(x.antes,15);assert.equal(x.despues,15);assert.equal(x.min,30);
  x=extraPorHorario(R,'11:50','21:20','sem');
  assert.equal(x.min,30,'10 antes + 20 después = 30');
  x=extraPorHorario(R,'11:55','21:10','sem');
  assert.equal(x.min,15,'15 justos ya cuentan');
  x=extraPorHorario(R,'11:55','21:09','sem');
  assert.equal(x.min,0,'14 en total no cuentan');assert.equal(x.total,14);
  x=extraPorHorario(R,'12:10','21:20','sem');
  assert.equal(x.min,20,'llegar tarde no resta: cuentan los 20 de después');
  assert.equal(minimoExtra(R),15);
});
test('fin de semana o feriado: el turno entero',function(){
  var x=extraPorHorario(R,'09:00','15:30','fin');
  assert.equal(x.min,390);
});
test('el tipo de día sale solo de la fecha',function(){
  usarFeriados(FERIADOS_UY);
  assert.equal(tipoDeDia('2026-10-17'),'fin','sábado');
  assert.equal(tipoDeDia('2026-10-14'),'sem');
  assert.equal(tipoDeDia('2026-10-12'),'sem','12/10 es laborable: día común');
  assert.equal(tipoDeDia('2026-08-25'),'fin','25/8 no es laborable');
});

test('(2.26) tu horario: entrás, salís y de lunes a viernes o a sábado',function(){
  var h={entrada:'',salida:'',umbral:0,jornada:0};
  assert.equal(tieneHorario(h),false);
  assert.equal(aplicarHorario(h,{entrada:'',salida:'18:00'}).ok,false);
  assert.equal(aplicarHorario(h,{entrada:'09:00',salida:'18:00',dias:'ls'}).ok,true);
  assert.equal(h.jornada,540);assert.equal(h.umbral,540,'sin mínimo elegido, desde el primer minuto');assert.equal(h.dias,'ls');
  assert.equal(extraPorHorario(h,'08:50','18:05','sem').min,15);
  assert.equal(tipoDeDia('2026-10-17','ls'),'sem','el sábado es un día común si trabajás de lunes a sábado');
  assert.equal(tipoDeDia('2026-10-17','lv'),'fin');assert.equal(tipoDeDia('2026-10-18','ls'),'fin','el domingo, no');
  /* turno que pasa la medianoche */
  aplicarHorario(h,{entrada:'22:00',salida:'06:00'});assert.equal(h.jornada,480);
});
test('(2.26) cómo te las pagan: entre semana, fin de semana y feriados, y desde cuántos minutos',function(){
  var h={entrada:'09:00',salida:'18:00',jornada:540,umbral:540,multSem:2,multFin:2};
  assert.equal(aplicarPago(h,{multSem:1.5,multFin:2.5,desde:15}).ok,true);
  assert.equal(h.multSem,1.5);assert.equal(h.multFin,2.5);assert.equal(h.umbral,555);assert.equal(minimoExtra(h),15);
  assert.equal(aplicarPago(h,{multSem:0}).error,'multSem');assert.equal(aplicarPago(h,{desde:-3}).error,'desde');
  /* cambiar el horario conserva el mínimo */
  aplicarHorario(h,{entrada:'10:00',salida:'19:00'});assert.equal(minimoExtra(h),15);
});
