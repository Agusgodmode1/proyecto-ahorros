/* Simula el service worker (sw.js) con un caché y una red de mentira: instalación, uso sin internet,
   cambio de versión y botón "Actualizar". */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

var raiz=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
var codigo=fs.readFileSync(path.join(raiz,'sw.js'),'utf8');
var BASE='https://agus.github.io/ahorros/sw.js';
function abs(u){return new URL(typeof u==='string'?u:u.url,BASE).href}

function montar(){
  var red={online:true,pedidos:[]};
  var almacen=new Map();
  function cache(){
    var m=new Map();
    return {
      put:async function(req,res){m.set(abs(req),await res.text())},
      match:async function(req,o){
        var u=abs(req);if(o&&o.ignoreSearch)u=u.split('?')[0];
        return m.has(u)?new Response(m.get(u)):undefined;
      },
      addAll:async function(reqs){for(var r of reqs){var res=await falsoFetch(r);if(!res.ok)throw new Error('404 '+r.url);await this.put(r,res)}},
      keys:async function(){return [...m.keys()]}
    };
  }
  var caches={
    open:async function(n){if(!almacen.has(n))almacen.set(n,cache());return almacen.get(n)},
    keys:async function(){return [...almacen.keys()]},
    delete:async function(n){return almacen.delete(n)},
    match:async function(req,o){for(var c of almacen.values()){var r=await c.match(req,o);if(r)return r}}
  };
  async function falsoFetch(req){
    var u=abs(req);red.pedidos.push(u);
    if(!red.online)throw new TypeError('Sin internet');
    return new Response('red:'+u.replace('https://agus.github.io/ahorros/',''));
  }
  var oyentes={},estado={skip:0,claim:0};
  class Req extends Request{constructor(u,o){super(abs(u),o)}}
  var self={location:new URL(BASE),addEventListener:function(t,f){oyentes[t]=f},skipWaiting:function(){estado.skip++},clients:{claim:async function(){estado.claim++}}};
  vm.runInNewContext(codigo,{self:self,caches:caches,fetch:falsoFetch,Request:Req,Response:Response,URL:URL,Promise:Promise});
  async function evento(tipo,datos){
    var ev=Object.assign({waitUntil:function(p){ev.p=p},respondWith:function(p){ev.p=p}},datos||{});
    oyentes[tipo](ev);
    return ev.p===undefined?undefined:await ev.p;
  }
  function pedir(url,modo){return evento('fetch',{request:{method:'GET',url:abs(url),mode:modo||'cors'}})}
  return {red:red,almacen:almacen,caches:caches,evento:evento,pedir:pedir,estado:estado,version:/var VERSION='([^']+)'/.exec(codigo)[1]};
}

test('al instalarse guarda todos los archivos en un caché con el nombre de la versión',async function(){
  var sw=montar();
  await sw.evento('install');
  var c=sw.almacen.get('ahorros-'+sw.version);
  assert.ok(c,'existe el caché de la versión');
  var keys=await c.keys();
  assert.ok(keys.includes('https://agus.github.io/ahorros/js/app.js'));
  assert.ok(keys.includes('https://agus.github.io/ahorros/index.html'));
  assert.equal(sw.estado.skip,0,'no se activa sola: espera a "Actualizar"');
});

test('sin internet la app abre desde el caché',async function(){
  var sw=montar();
  await sw.evento('install');await sw.evento('activate');
  sw.red.online=false;
  var r=await sw.pedir('js/logica/sueldo.js?x=1');
  assert.equal(await r.text(),'red:js/logica/sueldo.js');
  var nav=await sw.pedir('https://agus.github.io/ahorros/?source=pwa','navigate');
  assert.equal(await nav.text(),'red:index.html');
});

test('una versión nueva borra el caché viejo pero conserva las fuentes',async function(){
  var sw=montar();
  await sw.caches.open('ahorros-0.0.1');await sw.caches.open('ahorros-fuentes');await sw.caches.open('otra-cosa');
  await sw.evento('install');await sw.evento('activate');
  var ks=await sw.caches.keys();
  assert.ok(!ks.includes('ahorros-0.0.1'));
  assert.ok(ks.includes('ahorros-fuentes'));
  assert.ok(ks.includes('otra-cosa'),'no toca cachés ajenos');
  assert.equal(sw.estado.claim,1);
});

test('tocar "Actualizar" activa la versión que estaba esperando',async function(){
  var sw=montar();
  await sw.evento('message',{data:'actualizar'});
  assert.equal(sw.estado.skip,1);
});

test('las fuentes de Google se guardan y sirven sin internet',async function(){
  var sw=montar();
  var url='https://fonts.googleapis.com/css2?family=Figtree';
  var r1=await sw.pedir(url);assert.ok(r1);
  await new Promise(function(ok){setTimeout(ok,0)});
  sw.red.online=false;
  var r2=await sw.pedir(url);
  assert.equal(await r2.text(),'red:'+url);
});
