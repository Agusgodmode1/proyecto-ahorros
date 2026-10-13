/* Exportar gastos a una planilla (puro). Formato para Excel en español:
   separador ";", coma decimal, fechas dd/mm/aaaa y UTF-8 con BOM (así los tildes se ven bien). */
function dec(n){return (Math.round(Number(n)*100)/100).toFixed(2).replace('.',',')}
function celda(v){var s=String(v===undefined||v===null?'':v);return /[";\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function fecha(iso){var p=String(iso).split('-');return p[2]+'/'+p[1]+'/'+p[0]}
var ORIGEN={brou:'extracto',voz:'voz'};

/* gastos: lista; catDe(g): categoría de cada gasto; desde/hasta (opcionales, 'aaaa-mm-dd', incluidos) */
export function csvGastos(gastos,catDe,desde,hasta){
  var filas=[['Fecha','Monto en pesos','Moneda','Monto original','Cotización','Categoría','Nota','Origen']];
  (gastos||[]).filter(function(g){return (!desde||g.fecha>=desde)&&(!hasta||g.fecha<=hasta)})
    .slice().sort(function(a,b){return a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0})
    .forEach(function(g){
      filas.push([fecha(g.fecha),dec(g.monto),g.usd?'USD':'UYU',dec(g.usd||g.monto),g.usd?dec(g.cotiz):'',catDe(g),g.nota||'',ORIGEN[g.src]||'a mano']);
    });
  return '﻿'+filas.map(function(f){return f.map(celda).join(';')}).join('\r\n')+'\r\n';
}
