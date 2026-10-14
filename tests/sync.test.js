import {test} from 'node:test';
import assert from 'node:assert/strict';
import {marcarCambios,combinar,iguales,tieneDatos,prepararGuardado,juntar,SECCIONES,LISTAS} from '../js/logica/sync.js';
import {ejemplo,defaults,migrar,armarRespaldo,leerRespaldo} from '../js/estado.js';

function copia(x){return JSON.parse(JSON.stringify(x))}
/* Simula un aparato: parte de un estado y guarda cambios en un momento dado */
function guardar(prev,cambiar,t){var cur=copia(prev);cambiar(cur);return marcarCambios(prev,cur,t)}

test('anota qué sección y qué gasto cambió',function(){
  var a=ejemplo();marcarCambios(null,a,0);
  var b=guardar(a,function(s){s.plan.monto=50000;s.gastos.push({id:'g1',fecha:'2026-10-13',monto:850})},100);
  assert.equal(b.sync.t.plan,100);
  assert.equal(b.sync.t.sueldo,undefined);
  assert.equal(b.gastos[0]._u,100);
  var c=guardar(b,function(s){s.gastos[0].monto=900},200);
  assert.equal(c.gastos[0]._u,200);
  var d=guardar(c,function(s){s.gastos=[]},300);
  assert.equal(d.sync.borrados.gastos.g1,300);
});

test('dos aparatos sin conexión: se juntan los gastos de los dos',function(){
  var base=ejemplo();marcarCambios(null,base,0);
  var cel=guardar(base,function(s){s.gastos.push({id:'cel',fecha:'2026-10-13',monto:100})},10);
  var pc=guardar(base,function(s){s.gastos.push({id:'pc',fecha:'2026-10-13',monto:200})},20);
  var m=combinar(cel,pc);
  assert.deepEqual(m.gastos.map(function(g){return g.id}).sort(),['cel','pc']);
  assert.ok(iguales(m,combinar(pc,cel)),'da lo mismo en los dos aparatos');
});

test('si el mismo dato cambió en los dos, gana el más reciente',function(){
  var base=ejemplo();base.gastos=[{id:'g',fecha:'2026-10-13',monto:100,_u:1}];marcarCambios(null,base,0);
  var cel=guardar(base,function(s){s.gastos[0].monto=111;s.plan.ahorro=5000},10);
  var pc=guardar(base,function(s){s.gastos[0].monto=222},20);
  var m=combinar(cel,pc);
  assert.equal(m.gastos[0].monto,222,'el gasto lo cambió último la compu');
  assert.equal(m.plan.ahorro,5000,'el plan solo cambió en el celular');
  var pc2=guardar(base,function(s){s.plan.ahorro=8000},30);
  assert.equal(combinar(cel,pc2).plan.ahorro,8000);
});

test('lo borrado no vuelve a aparecer, pero lo cambiado después del borrado sí queda',function(){
  var base=ejemplo();base.gastos=[{id:'g',fecha:'2026-10-13',monto:100,_u:1}];marcarCambios(null,base,0);
  var cel=guardar(base,function(s){s.gastos=[]},10);
  var pc=copia(base);
  assert.equal(combinar(pc,cel).gastos.length,0);
  assert.equal(combinar(cel,pc).gastos.length,0);
  var pc2=guardar(base,function(s){s.gastos[0].monto=500},20);
  assert.equal(combinar(cel,pc2).gastos.length,1,'se editó después de borrarlo en el otro aparato');
});

test('las horas y los meses cerrados también se juntan',function(){
  var base=ejemplo();marcarCambios(null,base,0);
  var cel=guardar(base,function(s){s.horas.push({id:'h1',fecha:'2026-10-13',tipo:'sem',min:20});s.hist.push({k:'2026-09',meta:1,ahorrado:2})},10);
  var pc=guardar(base,function(s){s.horas=s.horas.filter(function(h){return h.id!=='x1'})},20);
  var m=combinar(cel,pc);
  assert.equal(m.horas.length,10,'10 del ejemplo + 1 nueva − 1 borrada');
  assert.equal(m.hist.length,1);
});

test('el estado con datos de sincronización pasa por migrar sin perderlos',function(){
  var a=ejemplo();marcarCambios(null,a,0);
  var b=guardar(a,function(s){s.gastos.push({id:'g',fecha:'2026-10-13',monto:1})},5);
  var m=migrar(copia(b));
  assert.equal(m.sync.t.ejemplo,undefined);
  assert.equal(m.gastos[0]._u,5);
  assert.deepEqual(m.sync,b.sync);
});

test('saber si hay datos para subir',function(){
  assert.equal(tieneDatos(defaults()),false);
  assert.equal(tieneDatos(ejemplo()),true);
});

/* ---------- Pasar datos entre aparatos con un archivo ---------- */
test('el guardado marca los cambios en el estado de la app, no en una copia',function(){
  var st=defaults('2026-10-13'),ultimo=prepararGuardado(null,st,1);
  st.gastos.push({id:'g1',fecha:'2026-10-13',monto:850,nota:'Súper'});
  ultimo=prepararGuardado(ultimo,st,100);
  assert.equal(st.gastos[0]._u,100,'la marca queda en el estado de la app');
  assert.equal(ultimo.gastos[0]._u,100,'y en lo que se guarda');
  st.plan.monto=30000;
  ultimo=prepararGuardado(ultimo,st,200);
  assert.equal(st.sync.t.plan,200);
  assert.equal(st.gastos[0]._u,100,'un gasto que no cambió conserva su fecha');
  ultimo.gastos[0].monto=1;
  assert.equal(st.gastos[0].monto,850,'lo guardado es una copia aparte');
});

test('juntar dos aparatos donde cada uno agregó gastos distintos: quedan todos',function(){
  var base=defaults('2026-10-13'),u=prepararGuardado(null,base,0);
  var cel=JSON.parse(JSON.stringify(base)),uc=JSON.parse(JSON.stringify(u));
  var pc=JSON.parse(JSON.stringify(base)),up=JSON.parse(JSON.stringify(u));
  cel.gastos.push({id:'c1',fecha:'2026-10-13',monto:100,nota:'Kiosco'});prepararGuardado(uc,cel,10);
  pc.gastos.push({id:'p1',fecha:'2026-10-13',monto:200,nota:'Boleto'},{id:'p2',fecha:'2026-10-14',monto:300,nota:'Súper'});prepararGuardado(up,pc,20);
  var archivo=leerRespaldo(JSON.stringify(armarRespaldo(pc))).estado;
  var r=juntar(cel,archivo);
  assert.ok(r.cambio&&r.cambioDatos);
  assert.deepEqual(r.estado.gastos.map(function(g){return g.id}).sort(),['c1','p1','p2']);
  var vuelta=juntar(archivo,leerRespaldo(JSON.stringify(armarRespaldo(r.estado))).estado);
  assert.deepEqual(vuelta.estado.gastos.map(function(g){return g.id}).sort(),['c1','p1','p2'],'al revés queda lo mismo');
});

test('un gasto borrado en un aparato no reaparece al juntar',function(){
  var base=defaults('2026-10-13');base.gastos=[{id:'g',fecha:'2026-10-13',monto:500,nota:'Pizza'}];
  var u=prepararGuardado(null,base,0);
  var cel=JSON.parse(JSON.stringify(base));
  cel.gastos=[];prepararGuardado(u,cel,10);
  var otro=JSON.parse(JSON.stringify(base));
  assert.equal(juntar(cel,otro).estado.gastos.length,0,'en el celular, con el archivo viejo de la compu');
  assert.equal(juntar(otro,cel).estado.gastos.length,0,'en la compu, con el archivo del celular');
});

test('datos viejos sin marcas se juntan sin perder nada',function(){
  /* Así quedan los datos de antes de la 1.7.0: sin sync.t ni _u */
  var viejoCel=defaults('2026-10-13'),viejoPc=defaults('2026-10-13');
  delete viejoCel.sync;delete viejoPc.sync;
  viejoCel.gastos=[{id:'a',fecha:'2026-10-01',monto:100},{id:'comun',fecha:'2026-10-02',monto:50}];
  viejoPc.gastos=[{id:'b',fecha:'2026-10-03',monto:200},{id:'comun',fecha:'2026-10-02',monto:50}];
  viejoCel.horas=[{id:'h',fecha:'2026-10-05',tipo:'sem',min:20}];
  viejoCel.plan.monto=30000;viejoPc.plan.monto=35000;
  var cel=migrar(viejoCel),pc=migrar(viejoPc);
  var r=juntar(cel,pc).estado;
  assert.deepEqual(r.gastos.map(function(g){return g.id}).sort(),['a','b','comun']);
  assert.equal(r.horas.length,1);
  assert.equal(r.plan.monto,30000,'sin fechas de ninguno de los dos lados, queda lo de este aparato');
  /* Una sección o un gasto con fecha le gana a uno sin fecha */
  var pc2=JSON.parse(JSON.stringify(pc)),u=prepararGuardado(JSON.parse(JSON.stringify(pc)),pc2,0);
  pc2.plan.monto=40000;pc2.gastos[0].monto=999;prepararGuardado(u,pc2,50);
  var r2=juntar(cel,pc2).estado;
  assert.equal(r2.plan.monto,40000,'el plan cambiado con fecha gana');
  assert.equal(r2.gastos.filter(function(g){return g.id==='b'})[0].monto,999,'el gasto cambiado con fecha gana');
  assert.equal(r2.gastos.length,3);
});

test('juntar un archivo que ya estaba todo: no cambia nada',function(){
  var st=ejemplo(),u=prepararGuardado(null,st,0);
  st.gastos.push({id:'g',fecha:'2026-10-13',monto:1});prepararGuardado(u,st,5);
  var archivo=leerRespaldo(JSON.stringify(armarRespaldo(st))).estado;
  var r=juntar(st,archivo);
  assert.equal(r.cambio,false);assert.equal(r.cambioDatos,false);
});

test('importar con "Reemplazar todo" sigue igual: queda exactamente lo del archivo',function(){
  var st=ejemplo(),u=prepararGuardado(null,st,0);
  st.gastos.push({id:'g',fecha:'2026-10-13',monto:850,nota:'Súper'});prepararGuardado(u,st,5);
  var r=leerRespaldo(JSON.stringify(armarRespaldo(st)));
  assert.ok(r.ok);
  assert.deepEqual(r.estado,migrar(st));
  assert.equal(r.estado.gastos[st.gastos.length-1]._u,5,'las marcas viajan en el archivo');
});

test('toda parte del estado se junta (si agregás una sección nueva, sumala en sync.js)',function(){
  Object.keys(defaults()).filter(function(k){return k!=='v'&&k!=='sync'}).forEach(function(k){
    assert.ok(SECCIONES.indexOf(k)>=0||k in LISTAS,'falta en SECCIONES o LISTAS de sync.js: '+k);
  });
});
