/* Capítulo VII · Lo guardado (puro, sin DOM): lo que juntaste pacto a pacto y qué hacer con eso.
   - pactos: cada ciclo cerrado (state.hist), del más nuevo al más viejo, con lo ahorrado y si llegaste.
   - fondo: el fondo de emergencia. Si tenés una meta que se llama «…emergencia…», su objetivo y sus aportes;
     si no, el objetivo sugerido (3 meses de gastos, fondoEmergencia) y nada juntado todavía.
   - metas: las otras metas, con su avance.
   - paso: qué conviene hacer ahora con lo guardado: 'fondo' (primero), 'metas' (después) o 'listo'. */
import {num} from './util.js';
import {histStats,histOk} from './logros.js';
import {progresoMeta} from './metas.js';
import {fondoEmergencia} from './inicio.js';

export function esFondo(m){return /emergencia/i.test(String(m&&m.nombre||''))}

export function resumenGuardado(st,hoy){
  var S=histStats(st.hist||[]);
  var pactos=S.hs.slice().reverse().map(function(x){return {k:x.k,ahorrado:Math.round(num(x.ahorrado)),meta:Math.round(num(x.meta)),ok:histOk(x)}});
  var ult=pactos.slice(0,3),prom=0;ult.forEach(function(p){prom+=p.ahorrado});prom=ult.length?prom/ult.length:0;
  var fm=(st.metas||[]).filter(esFondo)[0]||null;
  var objetivo=fm&&num(fm.objetivo)>0?num(fm.objetivo):fondoEmergencia(st),fondo=null;
  if(objetivo){
    var tiene=fm?progresoMeta(fm,hoy).aportado:0,falta=Math.max(0,objetivo-tiene);
    fondo={id:fm?fm.id:null,objetivo:objetivo,tiene:tiene,falta:falta,pct:Math.min(1,tiene/objetivo),completo:falta<=0,
      pactos:falta>0&&prom>0?Math.ceil(falta/prom):null};
  }
  var metas=(st.metas||[]).filter(function(m){return !esFondo(m)}).map(function(m){
    var p=progresoMeta(m,hoy);
    return {id:m.id,nombre:m.nombre,objetivo:p.objetivo,tiene:p.aportado,pct:p.pct,cumplida:p.cumplida,para:m.para||null};
  });
  var paso=fondo&&!fondo.completo?'fondo':metas.some(function(m){return !m.cumplida})?'metas':'listo';
  return {total:Math.round(S.tot),pactos:pactos,ultimo:pactos[0]||null,promedio:Math.round(prom),fondo:fondo,metas:metas,paso:paso};
}
