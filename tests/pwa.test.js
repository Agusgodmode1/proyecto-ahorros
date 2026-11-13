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

/* La estantería 3D tiene que andar sin internet: Three.js entero y todo lo que la app importa, guardado por el service worker. */
var THREE_DIR='vendor/three-r187';
test('el service worker guarda toda la carpeta de Three.js',function(){
  var enSW=archivosSW();
  var js=listar(THREE_DIR).filter(function(f){return /\.js$/.test(f)});
  assert.ok(js.length>=16,'la carpeta de Three.js está completa');
  js.forEach(function(f){assert.ok(enSW.indexOf(f)>=0,'falta en ARCHIVOS de sw.js: '+f)});
});

function importados(f){
  var txt=fs.readFileSync(path.join(raiz,f),'utf8'),re=/(?:\bfrom|\bimport)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g,m,out=[];
  while((m=re.exec(txt)))out.push(path.posix.normalize(path.posix.join(path.posix.dirname(f),m[1])));
  return out;
}
test('todo lo que la app importa (también la escena 3D y sus complementos) está en ARCHIVOS',function(){
  var enSW=archivosSW(),vistos={},cola=['js/app.js'];
  while(cola.length){
    var f=cola.pop();if(vistos[f])continue;vistos[f]=true;
    assert.ok(fs.existsSync(path.join(raiz,f)),'se importa un archivo que no existe: '+f);
    assert.ok(enSW.indexOf(f)>=0,'se importa pero falta en ARCHIVOS de sw.js: '+f);
    importados(f).forEach(function(x){cola.push(x)});
  }
  assert.ok(vistos['js/ui/escena3d.js'],'la escena 3D se carga desde la app');
  assert.ok(vistos[THREE_DIR+'/three.core.js']&&vistos[THREE_DIR+'/addons/shaders/CopyShader.js'],'se siguen los imports hasta Three.js');
});

test('Three.js no depende de un importmap ni de internet',function(){
  listar(THREE_DIR).filter(function(f){return /\.js$/.test(f)}).forEach(function(f){
    var txt=fs.readFileSync(path.join(raiz,f),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
    assert.ok(!/from\s*['"]three['"/]/.test(txt),'import sin ruta relativa en '+f);
    assert.ok(!/['"]https?:\/\/[^'"]+\.(js|wasm|png|jpg|hdr|woff2?)['"]/.test(txt)||/three\.(core|module)\.js$/.test(f),'archivo de internet en '+f);
  });
  var escena=fs.readFileSync(path.join(raiz,'js/ui/escena3d.js'),'utf8');
  assert.ok(!/https?:\/\//.test(escena),'la escena no pide nada a internet');
  assert.ok(!/TextureLoader|GLTFLoader|FontLoader|\.load\(/.test(escena),'la escena no descarga texturas, modelos ni fuentes: las genera');
});

test('el manifest tiene lo que pide iOS y Android',function(){
  var m=JSON.parse(fs.readFileSync(path.join(raiz,'manifest.webmanifest'),'utf8'));
  assert.equal(m.name,'Proyecto Ahorros');
  assert.equal(m.short_name,'Ahorros');
  assert.equal(m.display,'standalone');
  assert.ok(m.icons.some(function(i){return i.purpose==='maskable'}));
  m.icons.forEach(function(i){assert.ok(fs.existsSync(path.join(raiz,i.src)),i.src)});
});
