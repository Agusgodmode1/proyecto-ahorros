/* ¿Hay algo escrito sin guardar? (2.64, puro). Para «cerrar el libro» sin perder nada:
   cada vez que se escribe en un campo se anota; cada vez que la app guarda, se olvida todo lo anotado
   (lo que se guarda solo al escribir nunca queda pendiente). Lo que sigue anotado, a la vista y con algo escrito,
   es un formulario o una edición a medio hacer. */
export function crearPendientes(){
  var tocados=[];
  return {
    /* se escribió en este campo */
    tocar:function(campo){if(campo&&tocados.indexOf(campo)<0)tocados.push(campo)},
    /* la app guardó: lo escrito hasta acá ya está confirmado */
    guardado:function(){tocados=[]},
    /* vivo(campo) → {visible, valor}: cómo está ese campo ahora */
    hay:function(vivo){
      tocados=tocados.filter(function(c){var v=vivo(c);return !!(v&&v.visible)});
      return tocados.some(function(c){return String(vivo(c).valor==null?'':vivo(c).valor).trim()!==''});
    }
  };
}
