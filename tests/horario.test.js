import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extraPorHorario,tipoDeDia,minimoExtra} from '../js/logica/horario.js';
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
