import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VERSION} from '../js/version.js';

var raiz=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
var sw=fs.readFileSync(path.join(raiz,'sw.js'),'utf8');
function archivosSW(){
  var lista=/var ARCHIVOS=\[([\s\S]*?)\];/.exec(sw)[1];
  return lista.match(/'[^']+'/g).map(function(s){return s.slice(1,-1)});
}
function listar(dir){
  return fs.readdirSync(path.join(raiz,dir),{withFileTypes:true}).flatMap(function(d){
    var p=dir+'/'+d.name;return d.isDirectory()?listar(p):[p];
  });
}

test('la versión de sw.js es igual a la de js/version.js',function(){
  assert.equal(/var VERSION='([^']+)'/.exec(sw)[1],VERSION);
});

test('el service worker guarda todos los archivos de la app',function(){
  var enSW=archivosSW();
  var hacen=['index.html','manifest.webmanifest'].concat(listar('css'),listar('js'),listar('icons'));
  hacen.forEach(function(f){assert.ok(enSW.indexOf(f)>=0,'falta en ARCHIVOS de sw.js: '+f)});
  enSW.filter(function(f){return f!=='./'}).forEach(function(f){assert.ok(fs.existsSync(path.join(raiz,f)),'no existe: '+f)});
});

test('el manifest tiene lo que pide iOS y Android',function(){
  var m=JSON.parse(fs.readFileSync(path.join(raiz,'manifest.webmanifest'),'utf8'));
  assert.equal(m.name,'Proyecto Ahorros');
  assert.equal(m.short_name,'Ahorros');
  assert.equal(m.display,'standalone');
  assert.ok(m.icons.some(function(i){return i.purpose==='maskable'}));
  m.icons.forEach(function(i){assert.ok(fs.existsSync(path.join(raiz,i.src)),i.src)});
});
