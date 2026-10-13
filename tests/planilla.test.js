import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {leerXlsx} from '../js/logica/xlsx.js';
import {personas,leerPlanilla,importarHoras,horaDe} from '../js/logica/planilla.js';
import {puesto} from '../js/logica/puestos.js';
import {usarFeriados} from '../js/logica/fechas.js';
import {FERIADOS_UY} from '../js/logica/feriados.js';

var archivo=path.join(path.dirname(fileURLToPath(import.meta.url)),'fixtures','asistencia-ejemplo.xlsx');
var R=puesto('crm').horas;

test('lee el Excel de asistencia: personas, días y horas extra',async function(){
  usarFeriados(FERIADOS_UY);
  var h=await leerXlsx(fs.readFileSync(archivo));
  assert.equal(h[0].nombre,'Octubre');
  assert.deepEqual(personas(h),['Ana Ejemplo','Beto Prueba']);
  var r=leerPlanilla(h,'ana ejemplo',R,'2026-10-13');
  assert.deepEqual(r.dias.map(function(d){return d.fecha+' '+d.llegada+'-'+d.salida+' '+d.tipo+' '+d.min}),[
    '2026-10-01 11:45-21:05 sem 20',
    '2026-10-02 11:45-21:00 sem 15',
    '2026-10-03 11:00-17:30 fin 390',
    '2026-10-08 11:45-21:05 sem 20']);
  assert.deepEqual(r.ausencias,[{fecha:'2026-10-04',motivo:'not working'}]);
  var d8=r.dias[3];
  assert.equal(d8.planilla,0,'la planilla calculó 0 por la hora mal escrita');
  assert.match(d8.aviso,/21;05/);
  assert.equal(r.dias[0].planilla,20);assert.equal(r.dias[0].aviso,undefined,'si coincide no avisa');
});

test('horas escritas de varias formas',function(){
  assert.equal(horaDe(0.4895833333333333).hm,'11:45');
  assert.deepEqual(horaDe('21;05'),{hm:'21:05',corregida:true});
  assert.deepEqual(horaDe('12.00'),{hm:'12:00',corregida:true});
  assert.equal(horaDe('not working'),null);
  assert.equal(horaDe(46296),null,'una fecha sola no es una hora');
});

test('importar reemplaza lo cargado en esos días y guarda solo los días con extra',function(){
  var st={horas:[{id:'a',fecha:'2026-10-12',tipo:'fin',min:560},{id:'b',fecha:'2026-09-30',tipo:'sem',min:30}]};
  var n=0,r=importarHoras(st,[{fecha:'2026-10-12',llegada:'11:40',salida:'21:00',tipo:'sem',min:20},{fecha:'2026-10-13',llegada:'12:00',salida:'21:00',tipo:'sem',min:0}],function(){return 'n'+(n++)});
  assert.deepEqual(r,{nuevos:1,quitados:1});
  assert.equal(st.horas.length,2);
  assert.deepEqual(st.horas[1],{id:'n0',fecha:'2026-10-12',tipo:'sem',min:20,src:'planilla',llegada:'11:40',salida:'21:00'});
});
