import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pinValido,crearPin,verificarPin,hashPin,hayQuePedir,esperaTras,MIN_BLOQUEO} from '../js/logica/pin.js';

test('el PIN se guarda con hash y sal, nunca en texto plano',async function(){
  var g=await crearPin('1234');
  assert.equal(g.hash.length,64,'SHA-256 en hexadecimal');
  assert.equal(g.sal.length,32);
  assert.ok(JSON.stringify(g).indexOf('1234')<0,'el PIN no aparece en lo guardado');
  var g2=await crearPin('1234');
  assert.notEqual(g.hash,g2.hash,'con otra sal, el mismo PIN da otro hash');
});

test('el hash es SHA-256 de sal:pin',async function(){
  /* SHA-256("abc:0000") calculado aparte, con el módulo crypto de Node */
  assert.equal(await hashPin('0000','abc'),'dce4ce5ef48a8bd6f025c188ac9fedb595fa6707151a67870e079caa674fc2e9');
});

test('verificar: el correcto pasa, el resto no',async function(){
  var g=await crearPin('4821');
  assert.equal(await verificarPin('4821',g),true);
  assert.equal(await verificarPin('4822',g),false);
  assert.equal(await verificarPin('482',g),false);
  assert.equal(await verificarPin('abcd',g),false);
  assert.equal(await verificarPin('4821',null),false);
});

test('solo 4 números',async function(){
  assert.ok(pinValido('0007'));assert.ok(!pinValido('12345'));assert.ok(!pinValido('12a4'));assert.ok(!pinValido(''));
  await assert.rejects(crearPin('12'));
});

test('se vuelve a pedir después de 5 minutos en segundo plano',function(){
  assert.equal(MIN_BLOQUEO,300000);
  assert.equal(hayQuePedir(null,1e9),false);
  assert.equal(hayQuePedir(1000,1000+299999),false);
  assert.equal(hayQuePedir(1000,1000+300000),true);
});

test('después de 5 intentos mal hay que esperar, cada vez más',function(){
  assert.equal(esperaTras(4),0);assert.equal(esperaTras(5),30000);assert.equal(esperaTras(9),30000);assert.equal(esperaTras(10),60000);
});
