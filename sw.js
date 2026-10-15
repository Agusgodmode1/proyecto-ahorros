/* Service worker: guarda la app para que funcione sin internet y avisa cuando hay una versión nueva.
   CADA CAMBIO EN LA APP: subí VERSION (y la de js/version.js). Así cambia el nombre del caché y el
   teléfono descarga la versión nueva. Si agregás un archivo, sumalo a ARCHIVOS (una prueba lo controla). */
var VERSION='1.12.0';
var CACHE='ahorros-'+VERSION;
var FUENTES='ahorros-fuentes';
var ARCHIVOS=[
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/estado.js',
  'js/pwa.js',
  'js/version.js',
  'js/logica/aguinaldo.js',
  'js/logica/categorias.js',
  'js/logica/avisos.js',
  'js/logica/control.js',
  'js/logica/csv.js',
  'js/logica/extracto.js',
  'js/logica/fechas.js',
  'js/logica/frecuentes.js',
  'js/logica/horario.js',
  'js/logica/puestos.js',
  'js/logica/monedas.js',
  'js/logica/pin.js',
  'js/logica/feriados.js',
  'js/logica/logros.js',
  'js/logica/mes.js',
  'js/logica/metas.js',
  'js/logica/plan.js',
  'js/logica/recibos.js',
  'js/logica/planilla.js',
  'js/logica/sueldo.js',
  'js/logica/sync.js',
  'js/logica/util.js',
  'js/logica/voz.js',
  'js/logica/xlsx.js',
  'js/ui/categorias.js',
  'js/ui/comun.js',
  'js/ui/feriados.js',
  'js/ui/fijos.js',
  'js/ui/gastos.js',
  'js/ui/logros.js',
  'js/ui/metas.js',
  'js/ui/perfil.js',
  'js/ui/pin.js',
  'js/ui/plan.js',
  'js/ui/recibos.js',
  'js/ui/planilla.js',
  'js/ui/respaldo.js',
  'js/ui/semanas.js',
  'js/ui/sueldo.js',
  'js/ui/tarjeta.js',
  'js/ui/voz.js',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  'vendor/pdfjs-6.3.289/pdf.min.js',
  'vendor/pdfjs-6.3.289/pdf.worker.min.js'
];

self.addEventListener('install',function(e){
  /* cache:'reload' saltea el caché HTTP para bajar siempre la versión recién publicada */
  e.waitUntil(caches.open(CACHE).then(function(c){
    return c.addAll(ARCHIVOS.map(function(u){return new Request(u,{cache:'reload'})}));
  }));
  /* No se activa sola: espera a que toques "Actualizar" (salvo la primera vez, que no hay otra). */
});

self.addEventListener('message',function(e){
  if(e.data==='actualizar')self.skipWaiting();
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k.indexOf('ahorros-')===0&&k!==CACHE&&k!==FUENTES}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});

self.addEventListener('fetch',function(e){
  var req=e.request;if(req.method!=='GET')return;
  var url=new URL(req.url);
  if(url.origin===self.location.origin){
    /* La app sale del caché (funciona sin internet). Abrirla siempre muestra index.html. */
    if(req.mode==='navigate'){
      e.respondWith(caches.match('index.html').then(function(r){return r||fetch(req)}));
      return;
    }
    e.respondWith(caches.match(req,{ignoreSearch:true}).then(function(r){return r||fetch(req)}));
    return;
  }
  /* Fuentes de Google: se guardan la primera vez que hay internet; sin internet se usan las del sistema. */
  if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(FUENTES).then(function(c){
      return c.match(req).then(function(r){
        var red=fetch(req).then(function(res){if(res.ok||res.type==='opaque')c.put(req,res.clone());return res}).catch(function(){return r||Response.error()});
        return r||red;
      });
    }));
  }
});
