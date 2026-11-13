/* La estantería 3D (2.63): cuándo va la 3D y cuándo la 2.62 de respaldo. Todo simulado, sin pantalla ni Three.js. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {crearControl,forzado,LIMITE_MS,GRACIA_MS,SIN3D,REINTENTO} from '../js/logica/estante3d.js';

var tic=function(){return new Promise(function(ok){setImmediate(ok)})};

/* Un teléfono de mentira: reloj a mano, visibilidad, sesión y una escena que anota lo que le piden */
function montar(op){
  op=op||{};
  var m={t:0,visible:true,timers:[],marcas:Object.assign({},op.marcas),log:[],escenas:[],pedidos:[]};
  m.avanzar=function(ms){
    var fin=m.t+ms;
    for(;;){
      var prox=m.timers.filter(function(x){return x.en<=fin}).sort(function(a,b){return a.en-b.en})[0];
      if(!prox)break;
      m.timers.splice(m.timers.indexOf(prox),1);m.t=prox.en;prox.fn();
    }
    m.t=fin;
  };
  m.ocultar=function(){m.visible=false;m.c.visibilidad()};
  m.volver=function(){m.visible=true;m.c.visibilidad()};
  function escena(){
    var e={corre:false,libre:false,elegido:null,fin:null,
      seguir:function(){e.corre=true},pausar:function(){e.corre=false},
      elegir:function(id,fin){e.elegido=id;e.fin=fin},
      perder:function(){m.log.push('perder');m.c.perdida()},
      liberar:function(){e.libre=true;e.corre=false}};
    m.escenas.push(e);return e;
  }
  /* cada crear() queda pendiente hasta que la prueba lo resuelve con m.llega() o m.falla() */
  m.llega=async function(){var p=m.pedidos.shift(),e=escena();p.ok(e);await tic();return e};
  m.falla=async function(){m.pedidos.shift().mal(new Error('no pude'));await tic()};
  m.fundido=null;
  m.c=crearControl({
    forzar:op.forzar||'',
    quieto:function(){return !!op.quieto},
    webgl:function(){return op.webgl!==false},
    visible:function(){return m.visible},
    ahora:function(){return m.t},
    temporizador:function(fn,ms){var x={fn:fn,en:m.t+ms};m.timers.push(x);return function(){var i=m.timers.indexOf(x);if(i>=0)m.timers.splice(i,1)}},
    sesion:{leer:function(k){return !!m.marcas[k]},poner:function(k){m.marcas[k]=true}},
    crear:function(){m.log.push('crear');return new Promise(function(ok,mal){m.pedidos.push({ok:ok,mal:mal})})},
    fundir:function(fin){m.log.push('fundir');m.fundido=fin},
    mostrada:function(){m.log.push('mostrada')},
    quitar:function(){m.log.push('quitar')},
    salir:function(id){m.log.push('salir:'+id)},
    entrar:function(id){m.log.push('entrar:'+id)}
  });
  /* atajo: la 3D cargó bien y terminó de aparecer */
  m.mostrar=async function(){m.c.iniciar();var e=await m.llega();m.fundido();return e};
  return m;
}
function veces(m,que){return m.log.filter(function(x){return x===que}).length}

test('?forzar3d= solo acepta los cuatro valores fijos',function(){
  assert.equal(forzado('?forzar3d=sinwebgl'),'sinwebgl');
  assert.equal(forzado('?a=1&forzar3d=perdida'),'perdida');
  assert.equal(forzado('?forzar3d=lento&x=2'),'lento');
  assert.equal(forzado('?forzar3d=error'),'error');
  assert.equal(forzado('?forzar3d=otra'),'');
  assert.equal(forzado('?forzar3d=errores'),'');
  assert.equal(forzado(''),'');
  assert.equal(forzado(undefined),'');
});

test('camino normal: se ve la 2.62, la 3D entra con fundido y recién después recibe los toques',async function(){
  var m=montar();
  m.c.iniciar();
  assert.equal(m.c.estado(),'cargando');
  var e=await m.llega();
  assert.equal(m.c.estado(),'fundiendo');
  assert.ok(e.corre,'la animación ya corre durante el fundido');
  assert.equal(m.c.tocar3d('solo'),false,'durante el fundido la 3D no recibe toques');
  m.fundido();
  assert.equal(m.c.estado(),'mostrada');
  assert.deepEqual(m.log,['crear','fundir','mostrada']);
  assert.equal(m.c.tocar3d('duo'),true);
  assert.equal(e.elegido,'duo');
  assert.equal(m.c.tocar3d('solo'),false,'un solo libro por vez');
  e.fin();
  assert.deepEqual(m.log.slice(-1),['salir:duo']);
  m.c.cerrar();
  assert.ok(e.libre,'al entrar al libro la 3D libera sus recursos (regla 10)');
  assert.ok(!m.marcas[SIN3D],'la sesión sigue con 3D: al volver a la estantería se repite el arranque (regla 6)');
});

test('sin WebGL: queda la 2.62 y la 3D ni se carga',function(){
  var m=montar({webgl:false});
  m.c.iniciar();
  assert.equal(m.c.estado(),'respaldo');
  assert.equal(veces(m,'crear'),0);
  var f=montar({forzar:'sinwebgl'});f.c.iniciar();
  assert.equal(f.c.estado(),'respaldo');assert.equal(veces(f,'crear'),0);
});

test('«reducir movimiento»: ni se carga la 3D',function(){
  var m=montar({quieto:true});
  m.c.iniciar();
  assert.equal(m.c.estado(),'respaldo');
  assert.equal(veces(m,'crear'),0);
  assert.equal(m.c.tocar262(),true);
});

test('error al cargar: queda la 2.62 por toda la sesión',async function(){
  var m=montar();
  m.c.iniciar();await m.falla();
  assert.equal(m.c.estado(),'respaldo');
  assert.ok(m.marcas[SIN3D]);
  var f=montar({forzar:'error'});f.c.iniciar();await tic();
  assert.equal(f.c.estado(),'respaldo');assert.equal(veces(f,'crear'),0);
  /* regla 6: al volver a la estantería en la misma sesión, se queda en la 2.62 */
  var otra=montar({marcas:m.marcas});otra.c.iniciar();
  assert.equal(otra.c.estado(),'respaldo');assert.equal(veces(otra,'crear'),0);
});

test('error al dibujar con la 3D mostrada: pasa a la 2.62',async function(){
  var m=montar(),e=await m.mostrar();
  m.c.error();
  assert.equal(m.c.estado(),'respaldo');
  assert.ok(e.libre);assert.equal(veces(m,'quitar'),1);assert.ok(m.marcas[SIN3D]);
});

test('más de 4 s: queda la 2.62 y la 3D que llega tarde no aparece de golpe',async function(){
  var m=montar();
  m.c.iniciar();
  m.avanzar(LIMITE_MS-1);assert.equal(m.c.estado(),'cargando');
  m.avanzar(1);assert.equal(m.c.estado(),'respaldo');
  var e=await m.llega();
  assert.ok(e.libre,'la escena tardía se descarta');
  assert.equal(veces(m,'fundir'),0);
  assert.ok(m.marcas[SIN3D]);
});

test('los 4 s se cuentan solo con la app a la vista',async function(){
  var m=montar();
  m.c.iniciar();
  m.avanzar(3000);m.ocultar();
  m.avanzar(60000);assert.equal(m.c.estado(),'cargando','en segundo plano el reloj no corre');
  m.volver();
  m.avanzar(999);assert.equal(m.c.estado(),'cargando');
  m.avanzar(1);assert.equal(m.c.estado(),'respaldo');
});

test('si la escena llega justo pasado el límite (el teléfono estaba trabado), igual cuenta como lenta',async function(){
  var m=montar();
  m.c.iniciar();
  m.t=LIMITE_MS+200; /* el reloj avanzó pero el temporizador todavía no pudo correr */
  var e=await m.llega();
  assert.equal(m.c.estado(),'respaldo');assert.ok(e.libre);assert.equal(veces(m,'fundir'),0);
});

test('?forzar3d=lento: a los 4 s queda la 2.62 y la 3D no aparece después',async function(){
  var m=montar({forzar:'lento'});
  m.c.iniciar();
  var e=await m.llega(); /* la escena está, pero se entrega tarde */
  assert.equal(m.c.estado(),'cargando');
  m.avanzar(LIMITE_MS);assert.equal(m.c.estado(),'respaldo');
  m.avanzar(5000);await tic();await tic();
  assert.ok(e.libre);assert.equal(veces(m,'fundir'),0);
});

test('regla 3: tocar un libro de la 2.62 durante la carga cancela la 3D por toda la sesión',async function(){
  var m=montar();
  m.c.iniciar();
  assert.equal(m.c.tocar262(),true);
  assert.equal(m.c.estado(),'respaldo');
  assert.ok(m.marcas[SIN3D]);
  var e=await m.llega();
  assert.ok(e.libre);assert.equal(veces(m,'fundir'),0,'la 3D no aparece encima');
  m.avanzar(10000);assert.equal(m.c.estado(),'respaldo');
});

test('regla 3: tocar durante el fundido de entrada también es de la 2.62 y cancela la 3D',async function(){
  var m=montar();
  m.c.iniciar();var e=await m.llega();
  assert.equal(m.c.tocar262(),true);
  assert.ok(e.libre);assert.equal(veces(m,'quitar'),1);
  m.fundido(); /* el fundido termina igual: no pasa nada */
  assert.equal(m.c.estado(),'respaldo');assert.equal(veces(m,'mostrada'),0);
  assert.equal(m.c.tocar3d('solo'),false);
});

test('con la 3D ya mostrada, la 2.62 no recibe toques',async function(){
  var m=montar();await m.mostrar();
  assert.equal(m.c.tocar262(),false);
  assert.equal(m.c.estado(),'mostrada');
});

test('gráficos perdidos con la app a la vista: directo a la 2.62, sin reintento',async function(){
  var m=montar(),e=await m.mostrar();
  m.avanzar(GRACIA_MS+1);
  m.c.perdida();
  assert.equal(m.c.estado(),'respaldo');
  assert.equal(veces(m,'crear'),1,'no reintenta');
  assert.ok(e.libre);assert.ok(m.marcas[SIN3D]);assert.ok(!m.marcas[REINTENTO]);
});

test('?forzar3d=perdida: se pierden los gráficos después de mostrarse y queda la 2.62',async function(){
  var m=montar({forzar:'perdida'});await m.mostrar();
  m.avanzar(1500);
  assert.deepEqual(m.log,['crear','fundir','mostrada','perder','quitar']);
  assert.equal(m.c.estado(),'respaldo');
});

test('regla 4: gráficos cortados en segundo plano → un único reintento con el mismo límite',async function(){
  var m=montar(),e1=await m.mostrar();
  m.ocultar();assert.ok(!e1.corre,'en segundo plano la animación se pausa');
  m.avanzar(600000);
  m.c.perdida();
  assert.equal(m.c.estado(),'esperando');assert.ok(e1.libre);assert.equal(veces(m,'quitar'),1,'mientras tanto se ve la 2.62');
  assert.equal(veces(m,'crear'),1,'no recrea nada hasta volver');
  m.volver();
  assert.equal(m.c.estado(),'cargando');assert.equal(veces(m,'crear'),2);
  var e2=await m.llega();m.fundido();
  assert.equal(m.c.estado(),'mostrada');assert.ok(e2.corre);
  assert.ok(m.marcas[REINTENTO]);assert.ok(!m.marcas[SIN3D]);
  /* se vuelven a perder los gráficos, otra vez en segundo plano: ya no hay reintento */
  m.ocultar();m.c.perdida();m.volver();
  assert.equal(m.c.estado(),'respaldo');assert.equal(veces(m,'crear'),2);assert.ok(m.marcas[SIN3D]);
});

test('regla 4: el iPhone avisa del corte recién al volver → también es «en segundo plano»',async function(){
  var m=montar();await m.mostrar();
  m.ocultar();m.avanzar(60000);m.volver();
  m.avanzar(200);m.c.perdida();
  assert.equal(m.c.estado(),'cargando');assert.equal(veces(m,'crear'),2);
});

test('regla 4: si el reintento tarda más de 4 s o falla, queda la 2.62',async function(){
  var m=montar();await m.mostrar();
  m.ocultar();m.c.perdida();m.volver();
  m.avanzar(LIMITE_MS);
  assert.equal(m.c.estado(),'respaldo');assert.ok(m.marcas[SIN3D]);
  var f=montar();await f.mostrar();
  f.ocultar();f.c.perdida();f.volver();await f.falla();
  assert.equal(f.c.estado(),'respaldo');
});

test('regla 4: el reintento es uno por sesión, aunque se haya vuelto a la estantería',async function(){
  var m=montar({marcas:{[REINTENTO]:true}});await m.mostrar();
  m.ocultar();m.c.perdida();m.volver();
  assert.equal(m.c.estado(),'respaldo');assert.equal(veces(m,'crear'),1);
});

test('regla 4: tocar un libro de la 2.62 mientras se reintenta cancela la 3D',async function(){
  var m=montar();await m.mostrar();
  m.ocultar();m.c.perdida();
  assert.equal(m.c.tocar262(),true,'esperando el regreso');
  m.volver();
  assert.equal(m.c.estado(),'respaldo');assert.equal(veces(m,'crear'),1);
});

test('gráficos perdidos durante la carga o el fundido: 2.62, sin reintento',async function(){
  var m=montar();m.c.iniciar();await m.llega();
  m.ocultar();m.c.perdida();
  assert.equal(m.c.estado(),'respaldo','el reintento es solo si la 3D estaba mostrada');
});

test('regla 5: gráficos perdidos en medio de la animación de abrir → entra directo a ese libro',async function(){
  var m=montar(),e=await m.mostrar();
  m.avanzar(GRACIA_MS+1);
  m.c.tocar3d('duo');
  m.c.perdida();
  assert.deepEqual(m.log.slice(-1),['entrar:duo']);
  assert.equal(veces(m,'quitar'),0,'no vuelve a la estantería');
  e.fin(); /* la animación ya no importa */
  m.c.cerrar();
  e.fin();
  assert.equal(m.log.filter(function(x){return /^(entrar|salir):/.test(x)}).length,1,'el libro abre una sola vez');
});

test('regla 10: en segundo plano la animación se pausa y al volver se retoma',async function(){
  var m=montar(),e=await m.mostrar();
  assert.ok(e.corre);
  m.ocultar();assert.ok(!e.corre);
  m.volver();assert.ok(e.corre);
  assert.equal(m.c.estado(),'mostrada');
});

test('cerrar a mitad de la carga descarta la escena que llegue después',async function(){
  var m=montar();m.c.iniciar();m.c.cerrar();
  var e=await m.llega();
  assert.ok(e.libre);assert.equal(veces(m,'fundir'),0);
  m.avanzar(10000);assert.equal(m.c.estado(),'cerrado');
  assert.ok(!m.marcas[SIN3D]);
});
