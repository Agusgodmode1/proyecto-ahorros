/* Contraste de la paleta del libro (WCAG AA): toda letra sobre el papel claro y sobre el papel de noche se tiene que leer.
   Lee los colores de css/papel.css: si cambiás uno y no llega, esta prueba avisa. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

var css=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'..','css','papel.css'),'utf8');
function bloque(desde){var i=css.indexOf(desde);assert.ok(i>=0,'no encuentro '+desde);var a=css.indexOf('{',i),b=css.indexOf('}',a);return css.slice(a+1,b)}
function vars(txt){var o={},re=/--([\w-]+):\s*(#[0-9A-Fa-f]{6})\b/g,m;while((m=re.exec(txt)))o[m[1]]=m[2];return o}
function lum(h){var c=[1,3,5].map(function(i){var x=parseInt(h.slice(i,i+2),16)/255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]}
function contraste(a,b){var x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}

var claro=vars(bloque('/* @papel')),nocheTxt=bloque(':root.v2[data-theme="dark"]'),noche=Object.assign({},claro,vars(nocheTxt));
var TEXTO=['ink','muted','azul','bien','ojo','mal','oro-t','naranja-t','sky','mint','teal','grape','coral','sun','bad','slate'];

[['papel claro',claro],['papel de noche',noche]].forEach(function(t){
  var nom=t[0],P=t[1];
  test(nom+': toda la letra se lee sobre el papel y su sombra (4,5:1)',function(){
    TEXTO.forEach(function(k){
      ['page','page-2'].forEach(function(f){
        var c=contraste(P[k],P[f]);
        assert.ok(c>=4.5,nom+': --'+k+' '+P[k]+' sobre --'+f+' '+P[f]+' da '+c.toFixed(2));
      });
    });
  });
  test(nom+': lo importante también se lee dentro de los recuadros (4,5:1)',function(){
    ['ink','muted','azul','bien','mal','ojo','oro-t'].forEach(function(k){
      ['surface','surface-2'].forEach(function(f){
        var c=contraste(P[k],P[f]);
        assert.ok(c>=4.5,nom+': --'+k+' '+P[k]+' sobre --'+f+' '+P[f]+' da '+c.toFixed(2));
      });
    });
  });
  test(nom+': lo elegido (la semana, el día) se lee: letra de papel sobre azul tinta (4,5:1)',function(){
    assert.ok(contraste(P['on-sel'],P.sel)>=4.5,'elegido: '+contraste(P['on-sel'],P.sel).toFixed(2));
  });
  test(nom+': los botones de acción se leen (4,5:1) y los títulos dorados grandes (3:1)',function(){
    assert.ok(contraste(P['on-cta'],P.cta)>=4.5,'texto del botón: '+contraste(P['on-cta'],P.cta).toFixed(2));
    assert.ok(contraste(P.oro,P.page)>=3,'títulos dorados: '+contraste(P.oro,P.page).toFixed(2));
  });
});

test('la tapa: estrellas y dorado se leen sobre el azul cósmico',function(){
  assert.ok(contraste(claro.estrella,claro['cosmos-3'])>=4.5);
  assert.ok(contraste(claro.fugaz,claro['cosmos-2'])>=4.5);
});

test('el papel de noche es igual por el modo del teléfono que forzado en Ajustes',function(){
  var i=css.indexOf('@media (prefers-color-scheme: dark)'),med=vars(bloque(':root.v2:not([data-theme="light"])'));
  assert.ok(i>=0);
  assert.deepEqual(med,vars(nocheTxt));
});
