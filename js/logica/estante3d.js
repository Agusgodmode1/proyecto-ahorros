/* La estantería 3D (2.64, puro): decide cuándo se ve la escena 3D y cuándo quedan las fotos de respaldo.
   No toca la pantalla ni Three.js: todo lo de afuera entra por `d` (así se prueba con node --test).
   La regla de fondo: ante cualquier duda, las fotos. Nunca pantalla en blanco, y el libro abre una sola vez.
   Specs: docs/specs/2026-11-13-estanteria-3d.md (reglas 2, 4, 5 y 14) y docs/specs/spec-cinematica-unica.md
   (reglas 4, 5 y 6: la escena queda en pausa mientras estás en la app, y el respaldo son fotos). */

/* La 3D tiene 4 s para estar lista (desde que se pide hasta su primer cuadro), contados solo con la app a la vista */
export var LIMITE_MS=4000;
/* Si el aviso de «se cortaron los gráficos» llega apenas se vuelve a la app, el corte fue en segundo plano
   (el iPhone suele avisar recién al volver) */
export var GRACIA_MS=1500;
/* Formas fijas de forzar cada falla, solo para probar (?forzar3d=...) */
export var FORZAR=['sinwebgl','error','lento','perdida'];
/* Marcas de la sesión (sessionStorage: duran hasta cerrar la app del todo, y sobreviven al recargar) */
export var SIN3D='pa-3d-no',REINTENTO='pa-3d-reintento';

export function forzado(search){
  var m=/[?&]forzar3d=([a-z]+)(?:&|$)/.exec(String(search||''));
  return m&&FORZAR.indexOf(m[1])>=0?m[1]:'';
}

/* d = {
     forzar,                      '' o uno de FORZAR
     quieto(), webgl(), visible() → true/false
     ahora() → ms;  temporizador(fn,ms) → función que lo cancela
     sesion: {leer(clave) → bool, poner(clave)}
     crear() → Promise<escena>;  escena = {seguir(), pausar(), perder(), liberar()}
     fundir(alTerminar)           la 3D entra con un fundido por encima de la foto
     viva()                       terminó el fundido: desde ahora se ve y se toca la 3D
     fotos(motivo,detalle)        se saca la 3D de la pantalla y quedan las fotos, ya
     entrar()                     se cortaron los gráficos en medio de «Abrir»: entrar al libro ya mismo
   } */
export function crearControl(d){
  /* nuevo → cargando → fundiendo → viva; «esperando» = reintento pendiente hasta volver a la vista;
     «fotos» = queda el respaldo; «cerrado» = se desarmó todo */
  var estado='nuevo',esc=null,intento=0,limite=null,tVuelta=null,cortes=[];
  var abriendo=false,enApp=false,rota=false;

  function marcar(){d.sesion.poner(SIN3D)}
  function soltar(){if(esc){var e=esc;esc=null;try{e.liberar()}catch(x){}}}
  function parar(){if(limite){limite.pausar();limite=null}cortes.forEach(function(c){c()});cortes=[]}
  function enCurso(){return estado==='cargando'||estado==='esperando'||estado==='fundiendo'||estado==='viva'}
  function enFondo(){return !d.visible()||(tVuelta!==null&&d.ahora()-tVuelta<GRACIA_MS)}
  function puede(){return !d.sesion.leer(SIN3D)&&!d.quieto()&&d.forzar!=='sinwebgl'&&d.webgl()}

  /* Cronómetro que solo corre con la app a la vista */
  function crearLimite(alVencer){
    var gastado=0,desde=null,corte=null;
    function seguir(){
      if(desde!==null)return;
      desde=d.ahora();
      corte=d.temporizador(function(){corte=null;alVencer()},Math.max(0,LIMITE_MS-gastado));
    }
    function pausar(){
      if(desde===null)return;
      gastado+=d.ahora()-desde;desde=null;
      if(corte){corte();corte=null}
    }
    if(d.visible())seguir();
    return {seguir:seguir,pausar:pausar,total:function(){return gastado+(desde===null?0:d.ahora()-desde)}};
  }

  /* cualquier falla deja las fotos hasta cerrar la app del todo */
  function caer(motivo,detalle){
    marcar();parar();intento++;soltar();estado='fotos';rota=false;
    d.fotos(motivo,detalle);
  }

  function cargar(){
    estado='cargando';
    var n=++intento,p;
    limite=crearLimite(function(){if(n===intento&&estado==='cargando')caer('tardó más de 4 s')});
    if(d.forzar==='error')p=Promise.reject(new Error('forzar3d=error'));
    else{
      try{p=Promise.resolve(d.crear())}catch(e){p=Promise.reject(e)}
      /* «lento»: la 3D se arma igual, pero llega después del límite y se descarta */
      if(d.forzar==='lento')p=Promise.all([p,new Promise(function(ok){d.temporizador(ok,LIMITE_MS+1500)})]).then(function(r){return r[0]});
    }
    p.then(function(e){lista(e,n)},function(err){if(n===intento&&estado==='cargando')caer('error al cargar',err)});
  }

  function lista(e,n){
    /* llegó tarde (ya quedaron las fotos o se cerró): no aparece «de golpe» */
    if(n!==intento||estado!=='cargando'){try{e.liberar()}catch(x){}return}
    esc=e;
    if(limite&&limite.total()>=LIMITE_MS){caer('tardó más de 4 s');return}
    parar();estado='fundiendo';
    if(d.visible()&&!enApp)e.seguir();
    d.fundir(function(){
      if(n!==intento||estado!=='fundiendo')return;
      estado='viva';d.viva();
      if(d.forzar==='perdida')cortes.push(d.temporizador(function(){if(esc)esc.perder()},1500));
    });
  }

  /* un único reintento por sesión: se ven las fotos mientras la escena se arma de nuevo (con el mismo límite de 4 s) */
  function reintentar(motivo){
    d.sesion.poner(REINTENTO);parar();intento++;soltar();rota=false;
    d.fotos(motivo);
    if(d.visible())cargar();else estado='esperando';
  }

  return {
    estado:function(){return estado},
    /* ¿se está viendo la 3D? (si no, mandan las fotos) */
    viva:function(){return estado==='viva'},

    iniciar:function(){
      if(estado!=='nuevo')return;
      /* la sesión ya quedó en las fotos, «reducir movimiento» o sin WebGL: la 3D ni se carga */
      if(d.sesion.leer(SIN3D)||d.quieto()){estado='fotos';return}
      if(d.forzar==='sinwebgl'||!d.webgl()){marcar();estado='fotos';return}
      cargar();
    },

    /* empieza «Abrir» (▶) / se invirtió antes de terminar (◀) */
    abrir:function(){abriendo=true},
    cancelar:function(){abriendo=false},

    /* terminó «Abrir»: el libro está abierto y se ve la app. La escena queda en pausa (no dibuja ni gasta batería),
       pero sigue en memoria para poder volver */
    enLaApp:function(){
      abriendo=false;enApp=true;
      if(esc)esc.pausar();
    },

    /* ◀ desde la app. Devuelve 'viva' si la escena sigue ahí (se invierte la animación) o 'fotos' si hay que mostrar
       la tapa fija: porque el teléfono cortó los gráficos en la pausa (único reintento), porque la escena todavía
       no se había armado nunca en esta apertura, o porque la sesión ya quedó en las fotos */
    volver:function(){
      enApp=false;
      if(estado==='viva'&&!rota){if(d.visible()&&esc)esc.seguir();return 'viva'}
      if(estado==='viva'&&rota){
        if(!d.sesion.leer(REINTENTO)&&puede())reintentar('se cortaron los gráficos con el libro abierto');
        else caer('se cortaron los gráficos con el libro abierto');
        return 'fotos';
      }
      if(estado==='nuevo'){
        if(puede())cargar();
        else{if(!d.sesion.leer(SIN3D)&&!d.quieto())marcar();estado='fotos'}
      }
      return 'fotos';
    },

    /* El teléfono cortó los gráficos (webglcontextlost) */
    perdida:function(){
      /* en medio de «Abrir»: se entra directo a ese libro */
      if(abriendo&&esc){
        if(!enFondo())marcar();
        abriendo=false;parar();intento++;soltar();estado='fotos';
        d.fotos('se cortaron los gráficos al abrir');d.entrar();return;
      }
      /* con el libro abierto la escena está en pausa: se resuelve al volver (◀) */
      if(enApp&&estado==='viva'){rota=true;return}
      /* 3D a la vista y corte en segundo plano → un único reintento por sesión */
      if(estado==='viva'&&enFondo()&&!d.sesion.leer(REINTENTO)){reintentar('se cortaron los gráficos en segundo plano');return}
      if(enCurso())caer('se cortaron los gráficos');
    },

    /* La 3D tiró un error al dibujar */
    error:function(err){
      if(abriendo&&esc){
        marcar();abriendo=false;parar();intento++;soltar();estado='fotos';
        d.fotos('error al dibujar',err);d.entrar();return;
      }
      if(enCurso())caer('error al dibujar',err);
    },

    /* La app pasó a segundo plano o volvió: la animación se pausa y se retoma */
    visibilidad:function(){
      if(d.visible()){
        tVuelta=d.ahora();
        if(estado==='esperando'){cargar();return}
        if(limite)limite.seguir();
        if(esc&&!enApp&&(estado==='fundiendo'||estado==='viva'))esc.seguir();
      }else{
        if(limite)limite.pausar();
        if(esc)esc.pausar();
      }
    },

    /* Se desarma la estantería: la 3D se detiene y libera sus recursos */
    cerrar:function(){parar();intento++;soltar();estado='cerrado'}
  };
}
