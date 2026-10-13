import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FERIADOS_UY,feriadosActivos} from '../js/logica/feriados.js';
import {usarFeriados,isBiz,parse,pagaComoFeriado,esFeriado} from '../js/logica/fechas.js';
import {quintoHabil} from '../js/logica/plan.js';
import {interpretar} from '../js/logica/voz.js';

function con(opc){usarFeriados(feriadosActivos({}),opc)}

test('solo cinco feriados no laborables por año; el 19 de junio es laborable',function(){
  ['2026','2027'].forEach(function(y){
    var no=FERIADOS_UY.filter(function(f){return f.fecha.slice(0,4)===y&&!f.laborable}).map(function(f){return f.fecha.slice(5)});
    assert.deepEqual(no,['01-01','05-01','07-18','08-25','12-25']);
  });
  assert.ok(FERIADOS_UY.some(function(f){return f.fecha==='2026-06-19'&&f.laborable}));
});

test('5.º día hábil de abril 2026: depende de si Turismo cuenta como hábil',function(){
  con({laborableHabil:false});
  assert.equal(quintoHabil(2026,3),'2026-04-10','como hasta ahora: Turismo no es hábil');
  con({laborableHabil:true});
  assert.equal(quintoHabil(2026,3),'2026-04-07','con Turismo como día hábil');
  assert.equal(isBiz(parse('2026-05-01')),false,'un no laborable nunca es hábil');
  con();
});

test('feriado laborable trabajado: como feriado (por defecto) o como día común',function(){
  con();
  assert.equal(pagaComoFeriado('2026-10-12'),true);
  var r=interpretar('trabajé el 12 de octubre 8 horas',{hoy:'2026-10-13',fijos:[],aprendido:{}});
  assert.equal(r.intencion,'horas');assert.equal(r.tipo,'fin');
  con({pagoLaborable:'comun'});
  assert.equal(esFeriado('2026-10-12'),true);
  assert.equal(pagaComoFeriado('2026-10-12'),false);
  assert.equal(pagaComoFeriado('2026-08-25'),true,'los no laborables siempre se pagan como feriado');
  r=interpretar('trabajé el 12 de octubre 8 horas',{hoy:'2026-10-13',fijos:[],aprendido:{}});
  assert.equal(r.tipo,'sem');
  assert.ok(r.alternativas.some(function(a){return a.cambios.tipo==='fin'}),'ofrece cargarlo como feriado');
  con();
});
