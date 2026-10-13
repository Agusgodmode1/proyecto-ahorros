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

test('5.º día hábil de abril 2026: Turismo es laborable y cuenta como día hábil',function(){
  con();
  assert.equal(quintoHabil(2026,3),'2026-04-07','por defecto: solo cortan los no laborables');
  con({laborableHabil:false});
  assert.equal(quintoHabil(2026,3),'2026-04-10','si en el perfil se elige que no cuentan');
  assert.equal(isBiz(parse('2026-05-01')),false,'un no laborable nunca es hábil');
  con();
});

test('feriado laborable trabajado: día común (por defecto) o como feriado',function(){
  con();
  assert.equal(esFeriado('2026-10-12'),true);
  assert.equal(pagaComoFeriado('2026-10-12'),false);
  assert.equal(pagaComoFeriado('2026-08-25'),true,'los no laborables siempre se pagan como feriado');
  var r=interpretar('trabajé el 12 de octubre 9 horas 30',{hoy:'2026-10-13',fijos:[],aprendido:{}});
  assert.equal(r.intencion,'horas');assert.equal(r.tipo,'sem');assert.equal(r.min,30,'solo lo que pasa la jornada de 9 h');
  assert.ok(r.alternativas.some(function(a){return a.cambios.tipo==='fin'&&a.cambios.min===570}),'ofrece cargarlo como feriado');
  r=interpretar('trabajé el 25 de agosto 6 horas',{hoy:'2026-10-13',fijos:[],aprendido:{}});
  assert.equal(r.tipo,'fin');assert.equal(r.min,360,'un no laborable trabajado se paga entero como feriado');
  con({pagoLaborable:'feriado'});
  r=interpretar('trabajé el 12 de octubre 8 horas',{hoy:'2026-10-13',fijos:[],aprendido:{}});
  assert.equal(r.tipo,'fin');assert.equal(r.min,480);
  con();
});

test('al actualizar (v6 → v7) el cobro guardado con la regla vieja se corrige',async function(){
  var {defaults,migrar}=await import('../js/estado.js');
  var s=defaults('2026-10-13');s.v=6;delete s.perfil.cobro.laborableHabil;delete s.perfil.horas.feriadoLaborable;
  s.plan.inicio='2026-10-07';s.plan.cobro='2026-11-09';
  var m=migrar(s);
  assert.equal(m.plan.cobro,'2026-11-06','el 2/11 es laborable: el 5.º día hábil es el viernes 6');
  s.plan.cobro='2026-11-12';
  assert.equal(migrar(s).plan.cobro,'2026-11-12','una fecha puesta a mano no se toca');
  s.plan.cobro='2026-11-09';s.perfil.cobro={tipo:'fijo',dia:9};
  assert.equal(migrar(s).plan.cobro,'2026-11-09','con día fijo no cambia');
  con();
});
