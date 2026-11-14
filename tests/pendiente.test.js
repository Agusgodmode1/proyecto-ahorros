// «Algo sin guardar» al cerrar el libro (js/logica/pendiente.js). Spec: docs/specs/spec-cinematica-unica.md, Regla 8.
import test from 'node:test';
import assert from 'node:assert/strict';
import {crearPendientes} from '../js/logica/pendiente.js';

function campo(valor,visible){return {valor:valor,visible:visible!==false}}
var vivo=function(c){return c};

test('sin escribir nada no hay nada pendiente',function(){
  assert.equal(crearPendientes().hay(vivo),false);
});
test('un formulario a medio llenar queda pendiente',function(){
  var p=crearPendientes(),monto=campo('850');p.tocar(monto);p.tocar(monto);
  assert.equal(p.hay(vivo),true);
});
test('lo que la app ya guardó no queda pendiente (campos que se guardan solos, o el formulario confirmado)',function(){
  var p=crearPendientes(),c=campo('30');p.tocar(c);p.guardado();
  assert.equal(p.hay(vivo),false);
});
test('si se escribe de nuevo después de guardar, vuelve a quedar pendiente',function(){
  var p=crearPendientes(),c=campo('30');p.tocar(c);p.guardado();p.tocar(c);
  assert.equal(p.hay(vivo),true);
});
test('un campo que se vació o que ya no está a la vista no cuenta',function(){
  var p=crearPendientes(),a=campo('  '),b=campo('hola',false);p.tocar(a);p.tocar(b);
  assert.equal(p.hay(vivo),false);
  b.visible=true;assert.equal(p.hay(vivo),false,'lo que dejó de verse se olvida');
});
test('cancelar el cierre no pierde nada: preguntar no cambia lo anotado',function(){
  var p=crearPendientes(),c=campo('nota');p.tocar(c);
  assert.equal(p.hay(vivo),true);assert.equal(p.hay(vivo),true);assert.equal(c.valor,'nota');
});
