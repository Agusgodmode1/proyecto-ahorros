/* La postal del capítulo cerrado (2.16, puro): qué dice la imagen para compartir de un pacto cerrado (state.hist).
   Con montos o sin montos (solo el porcentaje de lo que te propusiste y las semanas): lo elige quien comparte.
   El dibujo está en ui/postal.js. */
import {num} from './util.js';
import {MESL} from './fechas.js';
import {histStats,histOk,histObjetivo} from './logros.js';

function plata(n){return '$ '+String(Math.round(Math.abs(num(n)))).replace(/\B(?=(\d{3})+(?!\d))/g,'.')}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}

/* k: el mes del pacto ('2026-10'). opt.montos: false = sin montos. Devuelve null si ese pacto no está. */
export function postal(st,k,opt){
  opt=opt||{};var montos=opt.montos!==false;
  var hs=(st&&st.hist||[]).slice().sort(function(a,b){return a.k<b.k?-1:1}),i=-1;
  hs.forEach(function(x,j){if(x.k===k)i=j});
  if(i<0)return null;
  var x=hs[i],S=histStats(hs.slice(0,i+1)),meta=num(x.meta),ah=Math.max(0,num(x.ahorrado));
  var nivel=histObjetivo(x)?'objetivo':histOk(x)?'minimo':'ninguno';
  var semanas=num(x.semanas),semOk=num(x.semanasOk),semTxt=semanas>0?semOk+' de '+semanas+' semanas dentro del plan':null;
  var d={
    mes:cap(MESL[Number(k.slice(5,7))-1]||'')+' '+k.slice(0,4),
    numero:i+1,
    kick:'capítulo cerrado · pacto n.º '+(i+1),
    sello:nivel!=='ninguno',
    titulo:nivel==='objetivo'?'Cumplí mi pacto':nivel==='minimo'?'Llegué a mi mínimo':'Cerré el capítulo',
    antes:'',cifra:'',despues:'',lineas:[],montos:montos
  };
  if(montos){
    d.antes='guardé';d.cifra=plata(ah);
    if(meta>0)d.lineas.push('mi meta era '+plata(meta));
    if(semTxt)d.lineas.push(semTxt);
  }else if(meta>0){
    d.antes='guardé el';d.cifra=Math.round(ah/meta*100)+' %';d.despues='de lo que me propuse';
    if(semTxt)d.lineas.push(semTxt);
  }else if(semTxt){
    d.cifra=semOk+' de '+semanas;d.despues='semanas dentro del plan';
  }else{
    d.cifra='✓';d.despues='un mes más con mi plan';
  }
  if(S.cur>1)d.lineas.push('racha: '+S.cur+' pactos seguidos');
  else if(S.cur===1)d.lineas.push('empieza mi racha');
  d.lineas=d.lineas.slice(0,3);
  d.archivo='capitulo-'+(MESL[Number(k.slice(5,7))-1]||'mes').normalize('NFD').replace(/[\u0300-\u036f]/g,'')+'-'+k.slice(0,4)+'.png';
  d.alt=d.kick+'. '+d.mes+'. '+d.titulo+'. '+[d.antes,d.cifra,d.despues].filter(Boolean).join(' ')+'. '+d.lineas.join('. ')+'.';
  return d;
}
