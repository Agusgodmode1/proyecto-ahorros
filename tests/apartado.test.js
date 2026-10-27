/* La plata apartada (2.17): lo que tenés pero no es para gastar. Números inventados. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validarPacto,cuentaPacto,sellarPacto,normApartado,totalApartado,totalLibre,apartadoPorTipo,previaApartado,aplicarApartado,deshacerApartado} from '../js/logica/pacto.js';
import {defaults,migrar,VERSION_ESTADO} from '../js/estado.js';
import {disponible} from '../js/logica/saldo.js';
import {planCalc} from '../js/logica/plan.js';

var HOY='2026-10-26',COBRO='2026-11-25';
function nuevo(){return defaults(HOY)}
var AP=[{id:'a',tipo:'ahorro',monto:8000},{id:'b',tipo:'ajena',monto:2000,nota:'  de mi hermana  '}];

test('la lista apartada queda prolija',function(){
  var l=normApartado([{tipo:'raro',monto:'1500.4'},{monto:0},{monto:-3},null,{tipo:'ahorro',monto:200,nota:'x'.repeat(80)}]);
  assert.equal(l.length,2);
  assert.equal(l[0].tipo,'reserva','un tipo desconocido pasa a «para algo puntual»');
  assert.equal(l[0].monto,1500);assert.equal(l[1].nota.length,40);
  assert.deepEqual(normApartado('nada'),[]);
  assert.equal(totalApartado(AP),10000);
  assert.equal(totalLibre(30000,AP),20000);assert.equal(totalLibre(5000,AP),0);
});

test('sin nada apartado, el pacto da idéntico que antes',function(){
  var a=cuentaPacto(nuevo(),{total:30000,ahorro:3000,cobro:COBRO},HOY);
  var b=cuentaPacto(nuevo(),{total:30000,ahorro:3000,cobro:COBRO,apartado:[]},HOY);
  assert.deepEqual(a,b);assert.equal(a.total,30000);assert.equal(a.gastar,27000);
});

test('lo apartado no entra en el plan',function(){
  var c=cuentaPacto(nuevo(),{total:30000,ahorro:3000,cobro:COBRO,apartado:AP},HOY);
  assert.equal(c.bruto,30000);assert.equal(c.apartado,10000);assert.equal(c.total,20000);
  assert.equal(c.gastar,17000);assert.equal(c.porDia,17000/30);
  assert.equal(c.pct,3000/20000,'el porcentaje es sobre lo que podés usar');
});

test('no se puede apartar más de lo que tenés ni todo',function(){
  var v=validarPacto(nuevo(),{total:5000,ahorro:0,cobro:COBRO,apartado:AP},HOY);
  assert.equal(v.ok,false);assert.equal(v.errores.apartado,'mas');
  v=validarPacto(nuevo(),{total:10000,ahorro:0,cobro:COBRO,apartado:AP},HOY);
  assert.equal(v.errores.apartado,'todo');
});

test('el ahorro no pasa de lo que queda para usar',function(){
  var v=validarPacto(nuevo(),{total:30000,ahorro:25000,cobro:COBRO,apartado:AP},HOY);
  assert.equal(v.ok,false);assert.ok(v.errores.ahorro);
  assert.equal(validarPacto(nuevo(),{total:30000,ahorro:20000,cobro:COBRO,apartado:AP},HOY).ok,true);
});

test('sellar guarda solo lo usable en el plan y lo apartado en el pacto',function(){
  var st=nuevo(),v=sellarPacto(st,{total:30000,ahorro:3000,cobro:COBRO,apartado:AP},HOY);
  assert.equal(v.ok,true);
  assert.equal(st.plan.monto,20000);assert.equal(totalApartado(st),10000);
  assert.equal(st.pacto.apartado[1].nota,'de mi hermana');
  assert.deepEqual(apartadoPorTipo(st),{ahorro:8000,reserva:0,ajena:2000});
  assert.equal(disponible(st,planCalc(st)),20000);
});

test('apartar más a mitad del pacto saca plata de lo que podés usar, y se deshace',function(){
  var st=nuevo();sellarPacto(st,{total:30000,ahorro:3000,cobro:COBRO,apartado:AP},HOY);
  st.gastos.push({id:'g',fecha:HOY,monto:1000,cat:'Otros'});
  var nueva=AP.concat([{id:'c',tipo:'reserva',monto:4000,nota:'dentista'}]);
  var v=aplicarApartado(st,nueva);
  assert.equal(v.ok,true);assert.equal(v.diff,4000);
  assert.equal(st.plan.monto,16000);assert.equal(totalApartado(st),14000);
  assert.equal(disponible(st,planCalc(st)),15000);
  deshacerApartado(st,v.deshacer);
  assert.equal(st.plan.monto,20000);assert.equal(totalApartado(st),10000);
});

test('liberar plata apartada la suma a lo que podés usar',function(){
  var st=nuevo();sellarPacto(st,{total:30000,ahorro:3000,cobro:COBRO,apartado:AP},HOY);
  var v=aplicarApartado(st,[AP[0]]);
  assert.equal(v.diff,-2000);assert.equal(st.plan.monto,22000);
});

test('no se puede apartar más de lo disponible hoy',function(){
  var st=nuevo();sellarPacto(st,{total:30000,ahorro:3000,cobro:COBRO,apartado:AP},HOY);
  st.gastos.push({id:'g',fecha:HOY,monto:15000,cat:'Otros'});
  var v=previaApartado(st,AP.concat([{tipo:'reserva',monto:6000}]));
  assert.equal(v.ok,false);assert.equal(v.max,5000);
  var antes=JSON.stringify(st);aplicarApartado(st,AP.concat([{tipo:'reserva',monto:6000}]));
  assert.equal(JSON.stringify(st),antes,'si no se puede, no toca nada');
});

test('apartar baja el ahorro si ya no entra',function(){
  var st=nuevo();sellarPacto(st,{total:30000,ahorro:15000,cobro:COBRO,apartado:[]},HOY);
  var v=aplicarApartado(st,[{tipo:'ajena',monto:20000}]);
  assert.equal(v.ok,true);assert.equal(st.plan.monto,10000);assert.equal(st.plan.ahorro,10000);
  deshacerApartado(st,v.deshacer);assert.equal(st.plan.ahorro,15000);
});

test('migración v19: quien ya usaba la app arranca sin nada apartado',function(){
  assert.equal(VERSION_ESTADO,19);
  var d=defaults(HOY);d.v=18;delete d.pacto.apartado;d.plan.monto=20000;
  var s=migrar(d);
  assert.deepEqual(s.pacto.apartado,[]);assert.equal(s.plan.monto,20000);
  d.pacto.apartado=[{tipo:'ahorro',monto:'500'},{monto:0}];
  assert.deepEqual(migrar(d).pacto.apartado,[{id:'ap0',tipo:'ahorro',monto:500,nota:''}]);
});
