/* La estantería 3D (2.63, puro): decide cuándo se muestra la 3D y cuándo queda la estantería mágica 2.62 de respaldo.
   No toca la pantalla ni Three.js: todo lo de afuera entra por `d` (así se prueba con node --test).
   La regla de fondo: ante cualquier duda, la 2.62. Nunca pantalla en blanco, y el libro abre una sola vez.
   Spec: docs/specs/2026-11-13-estanteria-3d.md (las «reglas» de los comentarios son las de ahí). */

/* Regla 2: la 3D tiene 4 s para estar lista, contados solo con la app a la vista */
export var LIMITE_MS=4000;
/* Si el aviso de «se cortaron los gráficos» llega apenas se vuelve a la app, el corte fue en segundo plano
   (el iPhone suele avisar recién al volver) */
export var GRACIA_MS=1500;
/* Regla 14: formas fijas de forzar cada falla, solo para probar (?forzar3d=...) */
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
     crear() → Promise<escena>;  escena = {seguir(), pausar(), elegir(id,alTerminar), perder(), liberar()}
     fundir(alTerminar)           la 3D entra con fundido por encima de la 2.62
     mostrada()                   terminó el fundido: desde ahora los toques son de la 3D
     quitar()                     saca la 3D de la pantalla y deja la 2.62 a la vista, ya
     salir(id)                    la 3D terminó su animación: fundir y entrar al libro
     entrar(id)                   entrar al libro ya mismo, sin animación
     aviso(motivo,detalle)        opcional: por qué quedó la 2.62 (para la consola)
   } */
export function crearControl(d){
  /* nuevo → cargando → fundiendo → mostrada → abriendo → entrando → cerrado; «esperando» = reintento pendiente hasta volver
     a la vista; «respaldo» = queda la 2.62 */
  var estado='nuevo',esc=null,intento=0,elegido=null,limite=null,tVuelta=null,cortes=[];

  function marcar(){d.sesion.poner(SIN3D)}
  function soltar(){if(esc){var e=esc;esc=null;try{e.liberar()}catch(x){}}}
  function parar(){if(limite){limite.pausar();limite=null}cortes.forEach(function(c){c()});cortes=[]}
  function enCurso(){return estado==='cargando'||estado==='esperando'||estado==='fundiendo'||estado==='mostrada'}
  function enFondo(){return !d.visible()||(tVuelta!==null&&d.ahora()-tVuelta<GRACIA_MS)}

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

  /* Regla 2: cualquier falla deja la 2.62 hasta cerrar la app del todo */
  function caer(motivo,detalle){
    marcar();parar();intento++;soltar();estado='respaldo';
    d.quitar();
    if(d.aviso)d.aviso(motivo,detalle);
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
    /* llegó tarde (ya se cayó a la 2.62, se tocó un libro o se cerró): no aparece «de golpe» */
    if(n!==intento||estado!=='cargando'){try{e.liberar()}catch(x){}return}
    esc=e;
    if(limite&&limite.total()>=LIMITE_MS){caer('tardó más de 4 s');return}
    parar();estado='fundiendo';
    if(d.visible())e.seguir();
    d.fundir(function(){
      if(n!==intento||estado!=='fundiendo')return;
      estado='mostrada';d.mostrada();
      if(d.forzar==='perdida')cortes.push(d.temporizador(function(){if(esc)esc.perder()},1500));
    });
  }

  return {
    estado:function(){return estado},

    iniciar:function(){
      if(estado!=='nuevo')return;
      /* regla 6: la sesión ya quedó en la 2.62 */
      if(d.sesion.leer(SIN3D)){estado='respaldo';return}
      /* «reducir movimiento»: la 3D ni se carga */
      if(d.quieto()){estado='respaldo';return}
      if(d.forzar==='sinwebgl'||!d.webgl()){marcar();estado='respaldo';return}
      cargar();
    },

    /* Regla 3: un toque en la 2.62 antes de que la 3D termine de aparecer cancela la 3D por toda la sesión.
       Devuelve true si el toque es de la 2.62. */
    tocar262:function(){
      if(estado==='cargando'||estado==='esperando'||estado==='fundiendo')caer('se tocó un libro antes');
      return estado==='respaldo';
    },

    /* Un toque en un libro de la 3D ya mostrada. Devuelve true si lo tomó. */
    tocar3d:function(id){
      if(estado!=='mostrada'||!esc)return false;
      estado='abriendo';elegido=id;
      esc.elegir(id,function(){if(estado==='abriendo'){estado='entrando';d.salir(id)}});
      return true;
    },

    /* El teléfono cortó los gráficos (webglcontextlost) */
    perdida:function(){
      /* regla 5: con un libro ya tocado, se entra directo a ese libro */
      if(estado==='abriendo'){if(!enFondo())marcar();estado='entrando';d.entrar(elegido);return}
      /* regla 4: 3D mostrada y corte en segundo plano → un único reintento por sesión */
      if(estado==='mostrada'&&enFondo()&&!d.sesion.leer(REINTENTO)){
        d.sesion.poner(REINTENTO);parar();intento++;soltar();d.quitar();
        if(d.visible())cargar();else estado='esperando';
        return;
      }
      if(enCurso())caer('se cortaron los gráficos');
    },

    /* La 3D tiró un error al dibujar */
    error:function(err){
      if(estado==='abriendo'){marcar();estado='entrando';d.entrar(elegido);return}
      if(enCurso())caer('error al dibujar',err);
    },

    /* La app pasó a segundo plano o volvió (regla 10: la animación se pausa y se retoma) */
    visibilidad:function(){
      if(d.visible()){
        tVuelta=d.ahora();
        if(estado==='esperando'){cargar();return}
        if(limite)limite.seguir();
        if(esc&&(estado==='fundiendo'||estado==='mostrada'||estado==='abriendo'||estado==='entrando'))esc.seguir();
      }else{
        if(limite)limite.pausar();
        if(esc)esc.pausar();
      }
    },

    /* Se entró a un libro (o se desarmó la estantería): la 3D se detiene y libera sus recursos */
    cerrar:function(){parar();intento++;soltar();estado='cerrado'}
  };
}
