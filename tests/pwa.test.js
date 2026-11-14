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
  assert.deepEqual(js.map(function(f){return path.posix.basename(f)}).sort(),['three.core.js','three.module.js'],'solo el núcleo: la escena no usa complementos');
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
  assert.ok(vistos['js/ui/escena3d-texturas.js']&&vistos['js/ui/escena3d-libro.js']&&vistos['js/logica/cinematica.js'],'con sus piezas');
  assert.ok(vistos[THREE_DIR+'/three.core.js'],'se siguen los imports hasta Three.js');
});

test('Three.js no depende de un importmap ni de internet',function(){
  listar(THREE_DIR).filter(function(f){return /\.js$/.test(f)}).forEach(function(f){
    var txt=fs.readFileSync(path.join(raiz,f),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
    assert.ok(!/from\s*['"]three['"/]/.test(txt),'import sin ruta relativa en '+f);
    assert.ok(!/['"]https?:\/\/[^'"]+\.(js|wasm|png|jpg|hdr|woff2?)['"]/.test(txt)||/three\.(core|module)\.js$/.test(f),'archivo de internet en '+f);
  });
  ['js/ui/escena3d.js','js/ui/escena3d-texturas.js','js/ui/escena3d-libro.js'].forEach(function(f){
    var escena=fs.readFileSync(path.join(raiz,f),'utf8');
    assert.ok(!/https?:\/\//.test(escena),f+' no pide nada a internet');
    assert.ok(!/TextureLoader|GLTFLoader|FontLoader|\.load\(/.test(escena),f+' no descarga texturas, modelos ni fuentes: las genera');
  });
});

test('el manifest tiene lo que pide iOS y Android',function(){
  var m=JSON.parse(fs.readFileSync(path.join(raiz,'manifest.webmanifest'),'utf8'));
  assert.equal(m.name,'Proyecto Ahorros');
  assert.equal(m.short_name,'Ahorros');
  assert.equal(m.display,'standalone');
  assert.ok(m.icons.some(function(i){return i.purpose==='maskable'}));
  m.icons.forEach(function(i){assert.ok(fs.existsSync(path.join(raiz,i.src)),i.src)});
});

/* (2.64) La cinemática única: una sola estantería, sin restos de la 2.62 ni de la tapa vieja */
test('las 4 fotos de respaldo existen, pesan menos de 150 KB y están en ARCHIVOS',function(){
  var enSW=archivosSW();
  ['inicio','menu','tapa-solo','tapa-duo'].forEach(function(n){
    var f='icons/escena/'+n+'.webp';
    assert.ok(fs.existsSync(path.join(raiz,f)),'falta '+f);
    assert.ok(fs.statSync(path.join(raiz,f)).size<150*1024,f+' pesa más de 150 KB');
    assert.ok(enSW.indexOf(f)>=0,'falta en ARCHIVOS: '+f);
  });
});
test('las fuentes de la escena (Fraunces) se guardan para usar sin internet',function(){
  var enSW=archivosSW();
  assert.ok(enSW.some(function(f){return /fraunces.*normal\.woff2$/.test(f)})&&enSW.some(function(f){return /fraunces.*italic\.woff2$/.test(f)}));
});
test('no quedan restos de la estantería 2.62 ni de la tapa vieja',function(){
  assert.ok(!fs.existsSync(path.join(raiz,'js/ui/tapa.js')),'js/ui/tapa.js se eliminó');
  var css=['css/app.css','css/libro.css','css/papel.css'].map(function(f){return fs.readFileSync(path.join(raiz,f),'utf8')}).join('\n');
  ['.es-mueble','.es-lomo','.es-chispas','.es-vuelo','.e3-libro','.lb-tapa-f','.lb-broche','.lb-gal'].forEach(function(c){assert.ok(css.indexOf(c)<0,'queda CSS viejo: '+c)});
  var js=listar('js').map(function(f){return fs.readFileSync(path.join(raiz,f),'utf8')}).join('\n');
  ['es-mueble','moverLibro','htmlPortada','abrirSola','pedirEstante'].forEach(function(c){assert.ok(js.indexOf(c)<0,'queda código viejo: '+c)});
});
