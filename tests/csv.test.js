import {test} from 'node:test';
import assert from 'node:assert/strict';
import {csvGastos} from '../js/logica/csv.js';

test('CSV para Excel en español: ; coma decimal, BOM y comillas cuando hace falta',function(){
  var g=[{fecha:'2026-10-14',monto:2010,usd:50,cotiz:40.2,nota:'Steam',cat:'Juegos',src:'voz'},
         {fecha:'2026-10-13',monto:850.5,nota:'Súper; feria',cat:'Supermercado'},
         {fecha:'2026-09-01',monto:100,nota:'viejo',cat:'Otros'}];
  var c=csvGastos(g,function(x){return x.cat},'2026-10-01','2026-10-31');
  assert.equal(c.charCodeAt(0),0xFEFF);
  var l=c.slice(1).trim().split('\r\n');
  assert.equal(l.length,3,'encabezado + 2 gastos del período');
  assert.equal(l[0],'Fecha;Monto en pesos;Moneda;Monto original;Cotización;Categoría;Nota;Origen');
  assert.equal(l[1],'13/10/2026;850,50;UYU;850,50;;Supermercado;"Súper; feria";a mano');
  assert.equal(l[2],'14/10/2026;2010,00;USD;50,00;40,20;Juegos;Steam;voz');
});
