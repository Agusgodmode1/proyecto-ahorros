/* Registro del service worker y aviso "Hay una versión nueva · Actualizar". */

/* antesDeRecargar: guarda los cambios pendientes antes de pasar a la versión nueva. */
var REG=null;
/* (2.52) «Buscar una versión nueva» desde Ajustes: devuelve 'nueva' si hay una esperando, 'al-dia' si no, 'sin' si no se pudo */
export async function buscarVersion(){
  if(!REG)return 'sin';
  try{await REG.update()}catch(e){return 'sin'}
  await new Promise(function(r){setTimeout(r,1500)});
  if(REG.waiting||REG.installing){var el=document.getElementById('upd');if(el)el.hidden=false;return 'nueva'}
  return 'al-dia';
}
export function registrarSW(antesDeRecargar){
  if(!('serviceWorker' in navigator))return;
  var pidio=false,recargando=false;
  navigator.serviceWorker.addEventListener('controllerchange',function(){
    /* La primera instalación también dispara este evento: solo recargamos si tocaste "Actualizar". */
    if(pidio&&!recargando){recargando=true;location.reload()}
  });
  navigator.serviceWorker.register('sw.js').then(function(reg){
    REG=reg;
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
    /* (2.52) y también al abrirla y cada media hora con la app abierta (en el iPhone el aviso a veces no llegaba) */
    reg.update().catch(function(){});
    setInterval(function(){if(document.visibilityState==='visible')reg.update().catch(function(){})},30*60*1000);
  }).catch(function(){});
}
