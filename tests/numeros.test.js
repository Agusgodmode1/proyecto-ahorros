import test from 'node:test';
import assert from 'node:assert/strict';
import {charNoPermitido,limpiarNumero,num} from '../js/logica/util.js';

test('campos de números: la «e», el «+» y el «-» no se pueden escribir', function(){
  ['e','E','+','-','1e5'].forEach(function(c){assert.equal(charNoPermitido(c,false),true,c)});
  ['1','0',',','.','850'].forEach(function(c){assert.equal(charNoPermitido(c,false),false,c)});
  assert.equal(charNoPermitido('-',true),false); /* campos que admiten negativos */
  assert.equal(charNoPermitido('e',true),true);
});
test('pegar un monto con letras deja solo el número', function(){
  assert.equal(limpiarNumero('$ 1.500,50',false),'1500.50');
  assert.equal(limpiarNumero('$ 12.000',false),'12000');
  assert.equal(limpiarNumero('5e3',false),'53');
  assert.equal(limpiarNumero('-200',false),'200');
  assert.equal(limpiarNumero('-200',true),'-200');
  assert.equal(num(limpiarNumero('850 pesos',false)),850);
});
