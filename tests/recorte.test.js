// El recorte de las fotos del respaldo (js/logica/recorte.js). Spec: docs/specs/spec-cinematica-unica.md, Regla 6:
// los botones tienen que quedar siempre sobre los libros, a 320 px, a 390 px, en horizontal y después de girar.
import test from 'node:test';
import assert from 'node:assert/strict';
import {recorte,caja,entra} from '../js/logica/recorte.js';
import {FOTOS,FOTO_W,FOTO_H} from '../js/logica/fotos-escena.js';

var PANTALLAS=[[320,568],[390,844],[430,932],[844,390],[568,320],[768,1024],[1200,800]];

test('en vertical la foto cubre toda la pantalla',function(){
  [[320,568],[390,844],[430,932]].forEach(function(p){
    var r=recorte(p[0],p[1],FOTO_W,FOTO_H,FOTOS.menu.zona);
    assert.ok(r.x<=.5&&r.y<=.5&&r.x+r.ancho>=p[0]-.5&&r.y+r.alto>=p[1]-.5,'cubre '+p.join('×'));
  });
});
test('la zona segura nunca queda afuera, en ninguna pantalla',function(){
  PANTALLAS.forEach(function(p){
    [FOTOS.menu,FOTOS.tapa.solo,FOTOS.tapa.duo,FOTOS.inicio].forEach(function(f){
      var r=recorte(p[0],p[1],FOTO_W,FOTO_H,f.zona);
      assert.ok(entra(r,f.zona,p[0],p[1]),f.src+' en '+p.join('×'));
    });
  });
});
test('los dos libros del menú quedan enteros, sin pisarse, y sus botones miden 44 px o más',function(){
  PANTALLAS.forEach(function(p){
    var r=recorte(p[0],p[1],FOTO_W,FOTO_H,FOTOS.menu.zona),L=FOTOS.menu.libros;
    var a=caja(r,L.solo,44),b=caja(r,L.duo,44);
    assert.ok(entra(r,L.solo,p[0],p[1])&&entra(r,L.duo,p[0],p[1]),'se ven en '+p.join('×'));
    assert.ok(a.w>=44&&a.h>=44&&b.w>=44&&b.h>=44,'44 px en '+p.join('×'));
    assert.ok(a.x+a.w<=b.x+.5,'no se pisan en '+p.join('×'));
  });
});
test('el botón de cada libro cae sobre su libro (el centro del botón es el centro del libro)',function(){
  PANTALLAS.forEach(function(p){
    var r=recorte(p[0],p[1],FOTO_W,FOTO_H,FOTOS.menu.zona);
    ['solo','duo'].forEach(function(id){
      var f=FOTOS.menu.libros[id],c=caja(r,f,44),cx=r.x+(f.x0+f.x1)/2*r.ancho,cy=r.y+(f.y0+f.y1)/2*r.alto;
      assert.ok(Math.abs(c.x+c.w/2-cx)<.01&&Math.abs(c.y+c.h/2-cy)<.01);
    });
  });
});
test('al girar el teléfono se recalcula: el libro de la tapa sigue entero',function(){
  ['solo','duo'].forEach(function(id){
    var f=FOTOS.tapa[id];
    [[390,844],[844,390]].forEach(function(p){
      var r=recorte(p[0],p[1],FOTO_W,FOTO_H,f.zona);
      assert.ok(entra(r,f.libro,p[0],p[1]),id+' en '+p.join('×'));
    });
  });
});
test('si la zona no entra cubriendo, la foto se achica y queda centrada',function(){
  var r=recorte(800,200,780,1688,{x0:.2,y0:.3,x1:.8,y1:.7});
  assert.ok(Math.abs(r.alto*.4-200)<.01,'la zona ocupa todo el alto');
  assert.ok(Math.abs((r.x+r.ancho/2)-400)<.01,'centrada a lo ancho');
});
