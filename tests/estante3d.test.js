// La lógica que decide entre la escena 3D y las fotos de respaldo (js/logica/estante3d.js).
// Specs: docs/specs/2026-11-13-estanteria-3d.md (reglas 2, 4, 5, 14) y docs/specs/spec-cinematica-unica.md (reglas 4, 5, 6).
import test from 'node:test';
import assert from 'node:assert/strict';
import {crearControl,forzado,LIMITE_MS,GRACIA_MS,SIN3D,REINTENTO} from '../js/logica/estante3d.js';

/* Un mundo de mentira: reloj a mano, sesión en memoria y una escena que anota lo que le piden */
function mundo(op){
  op=op||{};
  var t=0,timers=[],marcas=Object.assign({},op.marcas),log=[],pend=[],escenas=[];
  var M={
    log:log,marcas:marcas,escenas:escenas,visible:true,
    pasar:function(ms){
      var fin=t+ms;
      for(;;){var prox=timers.filter(function(x){return x.t<=fin}).sort(function(a,b){return a.t-b.t})[0];if(!prox)break;t=prox.t;timers.splice(timers.indexOf(prox),1);prox.fn()}
      t=fin;
    },
    /* la escena termina de armarse */
    llega:async function(){var p=pend.shift();var e={log:[],seguir:function(){this.log.push('seguir')},pausar:function(){this.log.push('pausar')},perder:function(){this.log.push('perder')},liberar:function(){this.log.push('liberar')}};escenas.push(e);p.ok(e);await null;await null;return e},
    falla:async function(){pend.shift().mal(new Error('no'));await null;await null},
    fundido:null
  };
  M.d={
    forzar:op.forzar||'',
    quieto:function(){return !!op.quieto},webgl:function(){return op.webgl!==false},visible:function(){return M.visible},
    ahora:function(){return t},
    temporizador:function(fn,ms){var x={t:t+ms,fn:fn};timers.push(x);return function(){var i=timers.indexOf(x);if(i>=0)timers.splice(i,1)}},
    sesion:{leer:function(k){return !!marcas[k]},poner:function(k){marcas[k]=true}},
    crear:function(){log.push('crear');return new Promise(function(ok,mal){pend.push({ok:ok,mal:mal})})},
    fundir:function(fin){log.push('fundir');M.fundido=fin},
    viva:function(){log.push('viva')},
    fotos:function(m){log.push('fotos: '+m)},
    entrar:function(){log.push('entrar')}
  };
  M.c=crearControl(M.d);
  /* atajo: deja la 3D a la vista */
  M.viva=async function(){M.c.iniciar();var e=await M.llega();M.fundido();return e};
  return M;
}

test('forzado() solo acepta los cuatro valores',function(){
  assert.equal(forzado('?forzar3d=lento'),'lento');assert.equal(forzado('?a=1&forzar3d=perdida&b=2'),'perdida');
  assert.equal(forzado('?forzar3d=otra'),'');assert.equal(forzado(''),'');
});
test('camino normal: carga, funde sobre la foto y queda viva',async function(){
  var M=mundo();M.c.iniciar();assert.equal(M.c.estado(),'cargando');
  var e=await M.llega();assert.equal(M.c.estado(),'fundiendo');assert.deepEqual(e.log,['seguir']);
  M.fundido();assert.equal(M.c.estado(),'viva');assert.ok(M.c.viva());assert.deepEqual(M.log,['crear','fundir','viva']);
});
test('sin WebGL: quedan las fotos por toda la sesión y la 3D ni se pide',function(){
  var M=mundo({webgl:false});M.c.iniciar();
  assert.equal(M.c.estado(),'fotos');assert.ok(M.marcas[SIN3D]);assert.deepEqual(M.log,[]);
});
test('?forzar3d=sinwebgl hace lo mismo',function(){
  var M=mundo({forzar:'sinwebgl'});M.c.iniciar();assert.equal(M.c.estado(),'fotos');assert.ok(M.marcas[SIN3D]);
});
test('reducir movimiento: fotos, sin marcar la sesión',function(){
  var M=mundo({quieto:true});M.c.iniciar();assert.equal(M.c.estado(),'fotos');assert.ok(!M.marcas[SIN3D]);assert.deepEqual(M.log,[]);
});
test('si la sesión ya quedó en las fotos, la 3D no vuelve a aparecer',function(){
  var m={};m[SIN3D]=true;var M=mundo({marcas:m});M.c.iniciar();assert.equal(M.c.estado(),'fotos');assert.deepEqual(M.log,[]);
});
test('error al cargar: fotos por toda la sesión',async function(){
  var M=mundo();M.c.iniciar();await M.falla();
  assert.equal(M.c.estado(),'fotos');assert.ok(M.marcas[SIN3D]);assert.deepEqual(M.log,['crear','fotos: error al cargar']);
});
test('?forzar3d=error',async function(){
  var M=mundo({forzar:'error'});M.c.iniciar();await null;await null;assert.equal(M.c.estado(),'fotos');
});
test('más de 4 s: se cancela, quedan las fotos y si la escena llega tarde se descarta',async function(){
  var M=mundo();M.c.iniciar();M.pasar(LIMITE_MS);
  assert.equal(M.c.estado(),'fotos');assert.ok(M.marcas[SIN3D]);
  var e=await M.llega();assert.deepEqual(e.log,['liberar']);assert.equal(M.c.estado(),'fotos');assert.ok(M.log.indexOf('fundir')<0);
});
test('los 4 s solo corren con la app a la vista',async function(){
  var M=mundo();M.c.iniciar();M.pasar(3000);
  M.visible=false;M.c.visibilidad();M.pasar(60000);assert.equal(M.c.estado(),'cargando');
  M.visible=true;M.c.visibilidad();M.pasar(900);assert.equal(M.c.estado(),'cargando');
  M.pasar(200);assert.equal(M.c.estado(),'fotos');
});
test('la entrada de 2,6 s no cuenta: una vez lista, el límite ya no corre',async function(){
  var M=mundo();await M.viva();M.pasar(LIMITE_MS*3);assert.equal(M.c.estado(),'viva');
});
test('?forzar3d=lento: la escena se arma pero llega después del límite',async function(){
  var M=mundo({forzar:'lento'});M.c.iniciar();M.pasar(LIMITE_MS);assert.equal(M.c.estado(),'fotos');
});
test('en segundo plano la escena se pausa y al volver sigue',async function(){
  var M=mundo(),e=await M.viva();
  M.visible=false;M.c.visibilidad();M.visible=true;M.c.visibilidad();
  assert.deepEqual(e.log,['seguir','pausar','seguir']);
});
test('al abrir un libro la escena queda en pausa y en memoria; ◀ la retoma',async function(){
  var M=mundo(),e=await M.viva();
  M.c.abrir();M.c.enLaApp();
  assert.deepEqual(e.log,['seguir','pausar']);assert.ok(e.log.indexOf('liberar')<0,'no se libera');
  M.visible=false;M.c.visibilidad();M.visible=true;M.c.visibilidad();
  assert.deepEqual(e.log,['seguir','pausar','pausar'],'en la app no vuelve a dibujar aunque la app vuelva a la vista');
  assert.equal(M.c.volver(),'viva');assert.deepEqual(e.log,['seguir','pausar','pausar','seguir']);
});
test('gráficos cortados con el libro abierto: al tocar ◀ se ve la tapa fija y hay un único reintento',async function(){
  var M=mundo(),e=await M.viva();
  M.c.abrir();M.c.enLaApp();M.c.perdida();
  assert.equal(M.c.estado(),'viva','no pasa nada hasta que se vuelve');
  assert.equal(M.c.volver(),'fotos');assert.ok(M.marcas[REINTENTO]);assert.ok(!M.marcas[SIN3D]);
  assert.deepEqual(e.log.slice(-1),['liberar']);assert.equal(M.c.estado(),'cargando');
  var e2=await M.llega();M.fundido();assert.equal(M.c.estado(),'viva');assert.deepEqual(e2.log,['seguir']);
  assert.deepEqual(M.log,['crear','fundir','viva','fotos: se cortaron los gráficos con el libro abierto','crear','fundir','viva']);
});
test('si el reintento no llega en 4 s, el resto de la sesión sigue en las fotos',async function(){
  var M=mundo();await M.viva();M.c.enLaApp();M.c.perdida();M.c.volver();
  M.pasar(LIMITE_MS);assert.equal(M.c.estado(),'fotos');assert.ok(M.marcas[SIN3D]);
});
test('un segundo corte con el libro abierto ya no reintenta',async function(){
  var m={};m[REINTENTO]=true;var M=mundo({marcas:m});await M.viva();M.c.enLaApp();M.c.perdida();
  assert.equal(M.c.volver(),'fotos');assert.equal(M.c.estado(),'fotos');assert.ok(M.marcas[SIN3D]);
});
test('corte en segundo plano con la estantería a la vista: un único reintento, con las fotos mientras tanto',async function(){
  var M=mundo(),e=await M.viva();
  M.visible=false;M.c.visibilidad();M.c.perdida();
  assert.equal(M.c.estado(),'esperando');assert.ok(M.marcas[REINTENTO]);assert.deepEqual(e.log.slice(-1),['liberar']);
  M.visible=true;M.c.visibilidad();assert.equal(M.c.estado(),'cargando');
  await M.llega();M.fundido();assert.equal(M.c.estado(),'viva');
});
test('el aviso del corte que llega apenas se vuelve a la app también cuenta como segundo plano',async function(){
  var M=mundo();await M.viva();
  M.visible=false;M.c.visibilidad();M.visible=true;M.c.visibilidad();M.pasar(GRACIA_MS-100);M.c.perdida();
  assert.equal(M.c.estado(),'cargando');assert.ok(!M.marcas[SIN3D]);
});
test('corte con la app a la vista: fotos por toda la sesión',async function(){
  var M=mundo();await M.viva();M.pasar(GRACIA_MS+10);M.c.perdida();
  assert.equal(M.c.estado(),'fotos');assert.ok(M.marcas[SIN3D]);
});
test('corte en medio de «Abrir»: se entra directo al libro, una sola vez',async function(){
  var M=mundo(),e=await M.viva();M.pasar(5000);
  M.c.abrir();M.c.perdida();M.c.perdida();
  assert.equal(M.log.filter(function(x){return x==='entrar'}).length,1);
  assert.equal(M.c.estado(),'fotos');assert.ok(M.marcas[SIN3D]);assert.deepEqual(e.log.slice(-1),['liberar']);
});
test('error al dibujar en medio de «Abrir»: también entra directo',async function(){
  var M=mundo();await M.viva();M.c.abrir();M.c.error(new Error('x'));
  assert.ok(M.log.indexOf('entrar')>=0);assert.equal(M.c.estado(),'fotos');
});
test('si «Abrir» se invirtió, un corte ya no entra al libro',async function(){
  var M=mundo();await M.viva();M.pasar(5000);M.c.abrir();M.c.cancelar();M.c.perdida();
  assert.ok(M.log.indexOf('entrar')<0);assert.equal(M.c.estado(),'fotos');
});
test('error al dibujar con la estantería a la vista: fotos',async function(){
  var M=mundo();await M.viva();M.c.error(new Error('x'));assert.equal(M.c.estado(),'fotos');assert.ok(M.marcas[SIN3D]);
});
test('◀ desde la app sin escena armada (se abrió directo el último libro): tapa fija y la 3D se carga recién ahí',async function(){
  var M=mundo();M.c.enLaApp();
  assert.equal(M.c.volver(),'fotos');assert.equal(M.c.estado(),'cargando');
  await M.llega();M.fundido();assert.equal(M.c.estado(),'viva');assert.ok(!M.marcas[REINTENTO],'no gasta el reintento');
});
test('◀ desde la app sin escena y sin WebGL: fotos',function(){
  var M=mundo({webgl:false});M.c.enLaApp();assert.equal(M.c.volver(),'fotos');assert.equal(M.c.estado(),'fotos');assert.deepEqual(M.log,[]);
});
test('?forzar3d=perdida: a los 1,5 s de verse, la escena pierde los gráficos',async function(){
  var M=mundo({forzar:'perdida'}),e=await M.viva();M.pasar(1500);assert.deepEqual(e.log.slice(-1),['perder']);
});
test('cerrar() suelta la escena',async function(){
  var M=mundo(),e=await M.viva();M.c.cerrar();assert.deepEqual(e.log.slice(-1),['liberar']);assert.equal(M.c.estado(),'cerrado');
});
