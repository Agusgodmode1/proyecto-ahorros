/* Buscar gastos (2.15). Gastos inventados. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buscarGastos} from '../js/logica/buscar.js';

var G=[
  {id:'a',fecha:'2026-10-02',monto:350,nota:'Café con Ana',cat:'Delivery y comida'},
  {id:'b',fecha:'2026-10-12',monto:1350,nota:'Súper Tata',cat:'Supermercado'},
  {id:'c',fecha:'2026-10-20',monto:890,nota:'Farmacia',cat:'Salud'},
  {id:'d',fecha:'2026-09-30',monto:350,nota:'cafe',cat:'Delivery y comida'},
  {id:'e',fecha:'2026-10-21',monto:4000,nota:'Pasaje',cat:'Transporte',usd:100}
];
test('busca por la nota sin importar tildes ni mayúsculas, de la más nueva a la más vieja',function(){
  var r=buscarGastos(G,'CAFÉ');
  assert.deepEqual(r.lista.map(function(g){return g.id}),['a','d']);
  assert.equal(r.n,2);assert.equal(r.total,700);
});
test('busca por la categoría y por varias palabras a la vez',function(){
  assert.deepEqual(buscarGastos(G,'super').lista.map(function(g){return g.id}),['b']);
  assert.deepEqual(buscarGastos(G,'cafe ana').lista.map(function(g){return g.id}),['a']);
  assert.deepEqual(buscarGastos(G,'salud').lista.map(function(g){return g.id}),['c']);
});
test('un número busca el monto y «12/10» la fecha',function(){
  assert.deepEqual(buscarGastos(G,'350').lista.map(function(g){return g.id}),['b','a','d']);
  assert.deepEqual(buscarGastos(G,'$ 1.350').lista.map(function(g){return g.id}),['b']);
  assert.deepEqual(buscarGastos(G,'12/10').lista.map(function(g){return g.id}),['b']);
  assert.deepEqual(buscarGastos(G,'02/10').lista.map(function(g){return g.id}),['a']);
});
test('los dólares y lo vacío',function(){
  assert.deepEqual(buscarGastos(G,'dolares').lista.map(function(g){return g.id}),['e']);
  assert.equal(buscarGastos(G,'   ').n,0);
  assert.equal(buscarGastos([],'cafe').n,0);
  assert.equal(buscarGastos(G,'cafe',{max:1}).lista.length,1);
});
