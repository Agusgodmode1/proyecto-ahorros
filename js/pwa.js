/* Registro del service worker y aviso "Hay una versión nueva · Actualizar". */

/* antesDeRecargar: guarda los cambios pendientes antes de pasar a la versión nueva. */
export function registrarSW(antesDeRecargar){
  if(!('serviceWorker' in navigator))return;
  var pidio=false,recargando=false;
  navigator.serviceWorker.addEventListener('controllerchange',function(){
    /* La primera instalación también dispara este evento: solo recargamos si tocaste "Actualizar". */
    if(pidio&&!recargando){recargando=true;location.reload()}
  });
  navigator.serviceWorker.register('sw.js').then(function(reg){
    function avisar(w){
      var el=document.getElementById('upd');if(!el)return;
      el.hidden=false;
      el.querySelector('button').onclick=async function(){
        this.disabled=true;this.textContent='Actualizando…';
        try{await antesDeRecargar()}catch(e){}
        pidio=true;w.postMessage('actualizar');
      };
    }
    if(reg.waiting&&navigator.serviceWorker.controller)avisar(reg.waiting);
    reg.addEventListener('updatefound',function(){
      var w=reg.installing;if(!w)return;
      w.addEventListener('statechange',function(){if(w.state==='installed'&&navigator.serviceWorker.controller)avisar(w)});
    });
    /* Busca versiones nuevas cada vez que volvés a abrir la app. */
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')reg.update().catch(function(){})});
  }).catch(function(){});
}
