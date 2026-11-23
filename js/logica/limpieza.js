/* Limpieza de restos (2.69, puro): lo que dejaron en este aparato versiones que ya no están.
   El libro de tinta (2.65 a 2.68, descartado) guardaba la cifra tachada del día en «pa-hl-tachado».
   «pa-voz-teclado» ya existía antes y se queda. Se llama al arrancar; si no hay nada, no hace nada. */
export var RESTOS=['pa-hl-tachado'];
export function limpiarRestos(almacen){
  var borradas=[];
  RESTOS.forEach(function(k){try{if(almacen.getItem(k)!==null){almacen.removeItem(k);borradas.push(k)}}catch(e){}});
  return borradas;
}
