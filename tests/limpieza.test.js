// La 2.69 borra lo que dejó el libro de tinta y no toca lo demás (js/logica/limpieza.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {limpiarRestos} from '../js/logica/limpieza.js';

function almacen(o){return {d:Object.assign({},o),getItem(k){return k in this.d?this.d[k]:null},removeItem(k){delete this.d[k]}}}
test('borra la cifra tachada del libro y deja «pa-voz-teclado»',()=>{
  const a=almacen({'pa-hl-tachado':'{"tenes":{"v":900,"f":"2026-11-20"}}','pa-voz-teclado':'1','pa-tour':'hecho'});
  assert.deepEqual(limpiarRestos(a),['pa-hl-tachado']);
  assert.equal(a.getItem('pa-hl-tachado'),null);
  assert.equal(a.getItem('pa-voz-teclado'),'1');
  assert.equal(a.getItem('pa-tour'),'hecho');
});
test('la segunda vez ya no hay nada para borrar',()=>{
  const a=almacen({'pa-voz-teclado':'1'});
  assert.deepEqual(limpiarRestos(a),[]);
  assert.equal(a.getItem('pa-voz-teclado'),'1');
});
test('si el almacenamiento no anda (modo privado), no rompe el arranque',()=>{
  assert.deepEqual(limpiarRestos({getItem(){throw new Error('no')},removeItem(){}}),[]);
});
