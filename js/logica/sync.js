/* Sincronización entre aparatos (puro, sin red).
   Cada sección del estado guarda cuándo cambió (state.sync.t) y cada elemento de una lista guarda su _u.
   Los borrados quedan anotados (state.sync.borrados) para que no vuelvan a aparecer al juntar.
   Al juntar dos versiones, en cada dato gana el cambio más reciente. */

export var SECCIONES=['perfil','plan','sueldo','extracto','recibo','fijosPagos','logros','feriados','voz','meta','ejemplo','monedas'];
export var LISTAS={gastos:'id',horas:'id',fijos:'id',hist:'k',metas:'id'};

function j(x){return JSON.stringify(x===undefined?null:x)}
function sinU(o){var c=Object.assign({},o);delete c._u;return j(c)}
function base(st){
  st.sync=st.sync&&typeof st.sync==='object'?st.sync:{};
  st.sync.t=st.sync.t||{};st.sync.borrados=st.sync.borrados||{};
  return st.sync;
}

/* Compara con lo último guardado y anota qué cambió (modifica cur). */
export function marcarCambios(prev,cur,ahora){
  var s=base(cur);
  if(!prev)return cur;
  SECCIONES.forEach(function(k){if(j(prev[k])!==j(cur[k]))s.t[k]=ahora});
  Object.keys(LISTAS).forEach(function(l){
    var key=LISTAS[l],antes={};
    (prev[l]||[]).forEach(function(x){antes[x[key]]=x});
    var ahoraIds={};
    (cur[l]||[]).forEach(function(x){
      ahoraIds[x[key]]=1;
      var p=antes[x[key]];
      if(!p||sinU(p)!==sinU(x))x._u=ahora;
      else if(p._u&&!x._u)x._u=p._u;
    });
    Object.keys(antes).forEach(function(id){
      if(!ahoraIds[id]){s.borrados[l]=s.borrados[l]||{};s.borrados[l][id]=ahora}
    });
  });
  return cur;
}

/* Junta dos versiones del estado. a es la de este aparato (desempata a su favor). */
export function combinar(a,b){
  var out=JSON.parse(JSON.stringify(a)),B=JSON.parse(JSON.stringify(b));
  var sa=base(out),sb=base(B);
  SECCIONES.forEach(function(k){
    var ta=sa.t[k]||0,tb=sb.t[k]||0;
    if(tb>ta){if(k in B)out[k]=B[k];else delete out[k];sa.t[k]=tb}
  });
  Object.keys(LISTAS).forEach(function(l){
    var key=LISTAS[l],bor={};
    [sa.borrados[l]||{},sb.borrados[l]||{}].forEach(function(m){Object.keys(m).forEach(function(id){bor[id]=Math.max(bor[id]||0,m[id])})});
    var orden=[],por={};
    function poner(x){
      var id=x[key],ya=por[id];
      if(!ya){por[id]=x;orden.push(id);return}
      if((x._u||0)>(ya._u||0))por[id]=x;
    }
    (out[l]||[]).forEach(poner);(B[l]||[]).forEach(poner);
    out[l]=orden.map(function(id){return por[id]}).filter(function(x){var t=bor[x[key]];return !(t&&t>=(x._u||0))});
    if(Object.keys(bor).length)sa.borrados[l]=bor;
  });
  return out;
}

/* ¿Son el mismo estado? (sin contar el orden de las listas) */
export function iguales(a,b){
  function norm(st){
    var c=JSON.parse(JSON.stringify(st||{}));
    Object.keys(LISTAS).forEach(function(l){var k=LISTAS[l];if(Array.isArray(c[l]))c[l].sort(function(x,y){return String(x[k])<String(y[k])?-1:1})});
    return j(c);
  }
  return norm(a)===norm(b);
}

/* ¿Tiene datos cargados de verdad? (para decidir qué ofrecer al iniciar sesión) */
export function tieneDatos(st){
  if(!st)return false;
  return !!(st.gastos&&st.gastos.length||st.horas&&st.horas.length||st.fijos&&st.fijos.length||st.hist&&st.hist.length||st.perfil&&st.perfil.hecho);
}
