import {test} from 'node:test';
import assert from 'node:assert/strict';
import {proximoAguinaldo,aguinaldo,salarioVacacional,tasaMarginal} from '../js/logica/aguinaldo.js';
import {defaults} from '../js/estado.js';

test('qué aguinaldo viene y qué meses cuenta',function(){
  assert.deepEqual(proximoAguinaldo('2026-10-13'),{pago:'2026-12-20',nombre:'diciembre',meses:['2026-06','2026-07','2026-08','2026-09','2026-10','2026-11']});
  assert.deepEqual(proximoAguinaldo('2026-03-01').meses,['2025-12','2026-01','2026-02','2026-03','2026-04','2026-05']);
  assert.equal(proximoAguinaldo('2026-03-01').pago,'2026-06-30');
  assert.equal(proximoAguinaldo('2026-12-21').pago,'2027-06-30','pasado el 20 de diciembre viene el de junio');
});

test('aguinaldo: semestre ÷ 12, con los meses cerrados y el resto estimado',function(){
  var s=defaults('2026-10-13');s.sueldo.nominal=48000;s.perfil.horas.activo=false;
  s.plan.cobro='2026-11-06';
  s.hist=[{k:'2026-08',cobro:'2026-09-07',nominal:54000},{k:'2026-09',cobro:'2026-10-07',nominal:51000}];
  var a=aguinaldo(s,'2026-10-13');
  assert.equal(a.pago,'2026-12-20');
  assert.deepEqual(a.meses.map(function(x){return x.fuente}),['estimado','estimado','cierre','cierre','actual','estimado']);
  assert.equal(a.total,48000*4+54000+51000,'agosto y setiembre de los cierres, octubre el actual y el resto estimado');
  assert.equal(Math.round(a.bruto),Math.round((48000*4+54000+51000)/12));
  assert.equal(a.estimados,3);
  /* aportes: 15% + FONASA (4,5% arriba de 2,5 BPC) + 0,1% */
  assert.equal(Math.round(a.liquido),Math.round(a.bruto*(1-0.15-0.045-0.001)));
});

test('salario vacacional: jornal líquido × días, solo IRPF a la tasa marginal',function(){
  var s=defaults('2026-10-13');s.sueldo.nominal=48000;s.perfil.horas.activo=false;
  var v=salarioVacacional(s,20);
  var jornal=(48000*(1-0.15-0.045-0.001))/30;
  assert.equal(Math.round(v.jornal),Math.round(jornal));
  assert.equal(v.tasa,0,'48.000 no pasa de 7 BPC (48.048)');
  assert.equal(Math.round(v.liquido),Math.round(jornal*20));
  assert.equal(tasaMarginal(60000,6864),0.10);
  assert.equal(tasaMarginal(80000,6864),0.15);
});
