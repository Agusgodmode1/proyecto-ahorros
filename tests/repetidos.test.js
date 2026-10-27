/* Gastos que se repiten solos (2.16). Datos inventados. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fechasDebidas,aplicarRepetidos,nuevoRepetido,vez,textoCada} from '../js/logica/repetidos.js';

test('cada día: se anota solo hasta hoy, nunca a futuro y nunca dos veces',function(){
  var st={gastos:[{id:'g0',fecha:'2026-10-20',monto:50,nota:'Boleto',cat:'Transporte'}],repetidos:[]};
  st.repetidos.push(nuevoRepetido(st.gastos[0],'dia'));
  var n=aplicarRepetidos(st,'2026-10-23');
  assert.deepEqual(n.map(function(g){return g.fecha}),['2026-10-21','2026-10-22','2026-10-23']);
  assert.ok(n.every(function(g){return g.src==='repite'&&g.monto===50&&g.nota==='Boleto'&&g.rep===st.repetidos[0].id}));
  assert.equal(st.gastos.length,4);
  assert.equal(aplicarRepetidos(st,'2026-10-23').length,0,'abrir la app otra vez el mismo día no duplica');
  assert.equal(aplicarRepetidos(st,'2026-10-24').length,1);
});
test('cada semana y cada mes (el 31 cae el último día de los meses más cortos)',function(){
  var s={cada:'semana',desde:'2026-10-05',ultimo:'2026-10-05'};
  assert.deepEqual(fechasDebidas(s,'2026-10-26'),['2026-10-12','2026-10-19','2026-10-26']);
  var m={cada:'mes',desde:'2026-01-31',ultimo:'2026-01-31'};
  assert.deepEqual(fechasDebidas(m,'2026-04-30'),['2026-02-28','2026-03-31','2026-04-30']);
  assert.equal(vez(m,13),'2027-02-28');
});
test('en pausa no se anota; lo roto no rompe nada',function(){
  var st={gastos:[],repetidos:[{id:'r',nota:'Gimnasio',monto:900,cat:'Otros',cada:'semana',desde:'2026-10-01',ultimo:'2026-10-01',pausa:true}]};
  assert.equal(aplicarRepetidos(st,'2026-12-01').length,0);
  assert.deepEqual(fechasDebidas({cada:'nunca',desde:'2026-10-01'},'2026-12-01'),[]);
  assert.deepEqual(fechasDebidas(null,'2026-12-01'),[]);
  assert.equal(aplicarRepetidos({gastos:[]},'2026-12-01').length,0);
});
test('si no abriste la app en mucho tiempo, solo se anotan los últimos dos meses (lo de antes no se inventa)',function(){
  var r={cada:'dia',desde:'2025-01-01',ultimo:'2025-01-01'},f=fechasDebidas(r,'2026-10-27');
  assert.equal(f.length,62);assert.equal(f[0],'2026-08-27');assert.equal(f[61],'2026-10-27');
  assert.equal(textoCada('semana'),'cada semana');
});

test('el id del gasto anotado solo es fijo: dos aparatos no lo duplican al juntar', () => {
  const r = { id: 'r1', nota: 'Boleto', monto: 50, cat: 'Transporte', cada: 'dia', desde: '2026-10-25', ultimo: '2026-10-25', pausa: false };
  const a = { gastos: [], repetidos: [Object.assign({}, r)] }, b = { gastos: [], repetidos: [Object.assign({}, r)] };
  aplicarRepetidos(a, '2026-10-27'); aplicarRepetidos(b, '2026-10-27');
  assert.deepEqual(a.gastos.map(g => g.id), ['rep-r1-2026-10-26', 'rep-r1-2026-10-27']);
  assert.deepEqual(a.gastos.map(g => g.id), b.gastos.map(g => g.id));
});
