import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/logica/categorias.js';
import {defaults,migrar,VERSION_ESTADO} from '../js/estado.js';
import {categoriaGasto} from '../js/logica/voz.js';
import {leer,analizar} from '../js/logica/extracto.js';

function base(){
  var s=defaults('2026-10-13');
  s.gastos=[{id:'a',fecha:'2026-10-13',monto:850,nota:'súper',cat:'Supermercado'},{id:'b',fecha:'2026-10-13',monto:300,nota:'steam',cat:'Juegos'},{id:'c',fecha:'2026-10-13',monto:100,nota:'sin cat'}];
  s.voz.cats={'feria':'Supermercado'};
  s.extracto.cat={'TIENDA INGLESA':'Supermercado'};
  return s;
}
function idDe(s,n){return C.porNombre(s,n).id}

test('la lista inicial es la de siempre, en el mismo orden',function(){
  var n=C.lista(defaults()).map(function(c){return c.nombre});
  assert.equal(n[0],'Delivery y comida');assert.equal(n[n.length-1],'Otros');
  assert.ok(n.indexOf('Supermercado')>=0&&n.indexOf('Trading')>=0);
});

test('renombrar: cambian los gastos, lo aprendido y el extracto; lo que se reconoce sigue yendo ahí',function(){
  var s=base(),r=C.editar(s,idDe(s,'Supermercado'),{nombre:'Súper'});
  assert.ok(r.ok);
  assert.equal(s.gastos[0].cat,'Súper');
  assert.equal(s.voz.cats.feria,'Súper');
  assert.equal(s.extracto.cat['TIENDA INGLESA'],'Súper');
  assert.equal(C.nombreDe(s,categoriaGasto('disco',{})),'Súper','"Disco" se reconoce como supermercado y va a Súper');
  assert.equal(C.editar(s,idDe(s,'Súper'),{nombre:'otros'}).ok,false,'no se repiten nombres');
});

test('borrar una categoría con gastos los pasa a la que elijas, nunca quedan huérfanos',function(){
  var s=base(),r=C.borrar(s,idDe(s,'Juegos'));
  assert.equal(r.ok,false,'sin destino no deja borrar si tiene gastos');
  r=C.borrar(s,idDe(s,'Juegos'),idDe(s,'Suscripciones'));
  assert.ok(r.ok);assert.equal(r.movidos,1);
  assert.equal(s.gastos[1].cat,'Suscripciones');
  assert.equal(C.porNombre(s,'Juegos'),null);
  assert.equal(C.nombreDe(s,'Juegos'),'Suscripciones','lo que antes se reconocía como Juegos ahora va a Suscripciones');
  assert.ok(s.gastos.every(function(g){return !g.cat||C.porNombre(s,g.cat)}),'todo gasto tiene una categoría que existe');
});

test('borrar una categoría sin gastos no pide destino; "Otros" no se puede borrar ni ocultar',function(){
  var s=base();
  assert.ok(C.borrar(s,idDe(s,'Trading')).ok);
  assert.equal(C.borrar(s,idDe(s,'Otros'),idDe(s,'Salud')).ok,false);
  assert.equal(C.editar(s,idDe(s,'Otros'),{oculta:true}).ok,false);
});

test('ocultar: no se ofrece al anotar y lo que se reconoce ahí cae en "Otros"',function(){
  var s=base();C.editar(s,idDe(s,'Trading'),{oculta:true});
  assert.ok(C.nombresVisibles(s).indexOf('Trading')<0);
  assert.equal(C.nombreDe(s,'Trading'),'Otros');
});

test('crear, ordenar y cambiar color e ícono',function(){
  var s=base(),r=C.crear(s,{nombre:'  Mascotas  '});
  assert.ok(r.ok);assert.equal(r.cat.nombre,'Mascotas');
  assert.equal(C.crear(s,{nombre:'mascotas'}).ok,false);
  assert.equal(C.crear(s,{nombre:'Ingresos'}).ok,false);
  var l=C.lista(s),ult=l[l.length-1].id;
  C.mover(s,ult,-1);assert.equal(C.lista(s)[l.length-2].id,ult);
  C.editar(s,ult,{color:'var(--sun)',icono:'🐾'});
  assert.equal(C.colorDe(s,'Mascotas'),'var(--sun)');assert.equal(C.iconoDe(s,'Mascotas'),'🐾');
});

test('migración v10 → v11: tus categorías de siempre y ningún gasto cambia',function(){
  var s=base();s.v=10;delete s.categorias;s.gastos.push({id:'d',fecha:'2026-10-13',monto:5,nota:'x',cat:'Mi categoría vieja'});
  var antes=JSON.stringify(s.gastos),m=migrar(s);
  assert.equal(m.v,VERSION_ESTADO);
  assert.equal(JSON.stringify(m.gastos),antes);
  assert.ok(C.porNombre(m,'Supermercado'));
  assert.ok(C.porNombre(m,'Mi categoría vieja'),'una categoría que ya usabas queda en la lista');
  assert.deepEqual(migrar(m).categorias,m.categorias,'no cambia al volver a abrir');
});

test('el extracto usa tu lista de categorías',function(){
  var s=base();C.editar(s,idDe(s,'Supermercado'),{nombre:'Súper'});
  var r=leer('09/10/2026  COMPRA POS DISCO  1.890,50  12.800,00\n10/10/2026  FARMASHOP  350,00  12.450,00','2026-10-13','auto');
  var A=analizar(r.movs,{mapa:function(c){return C.nombreDe(s,c)}});
  var cats=A.cats.map(function(c){return c.c}).sort();
  assert.deepEqual(cats,['Salud','Súper']);
});
