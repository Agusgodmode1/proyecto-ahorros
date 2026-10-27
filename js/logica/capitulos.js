/* Los capítulos del libro (puro, sin DOM): orden, números romanos y a qué página lleva deslizar.
   Cada semana del plan es una página del capítulo II; deslizar pasa de semana en semana. */
export var CAPITULOS=[
  {id:'resumen',n:'I',t:'Hoy',tono:'tone-sky'},
  {id:'semanas',n:'II',t:'Semanas',tono:'tone-mint'},
  {id:'fijos',n:'III',t:'Fijos',tono:'tone-teal'},
  {id:'sueldo',n:'IV',t:'Sueldo',tono:'tone-grape'},
  {id:'gastos',n:'V',t:'Tarjeta',tono:'tone-coral'},
  {id:'logros',n:'VI',t:'Logros',tono:'tone-sun'},
  {id:'guardado',n:'VII',t:'Lo guardado',corto:'Guardado',tono:'tone-mint'}
];
/* El capítulo de una pestaña: 'w2' es Semanas; 'ajustes' es Ajustes del pacto (fuera de los capítulos) */
export function capituloDe(tab){
  if(/^w\d+$/.test(tab))return CAPITULOS[1];
  for(var i=0;i<CAPITULOS.length;i++)if(CAPITULOS[i].id===tab)return CAPITULOS[i];
  return null;
}
/* Todas las páginas en orden: Hoy, cada semana, Fijos, Sueldo, Tarjeta, Logros y Lo guardado */
export function paginas(nSemanas){
  var l=['resumen'];for(var i=0;i<nSemanas;i++)l.push('w'+i);
  return l.concat(['fijos','sueldo','gastos','logros','guardado']);
}
/* La página vecina al deslizar (dir 1 = siguiente, -1 = anterior), o null en los bordes.
   Desde Hoy, la siguiente es la semana actual (no la primera) y la anterior es el prólogo (el pacto).
   Ajustes es la última página: viene después de Lo guardado. */
export function vecina(tab,dir,nSemanas,semanaActual){
  if(tab==='ajustes')return dir<0?'guardado':null;
  if(tab==='guardado'&&dir>0)return 'ajustes';
  if(tab==='resumen'&&dir<0)return 'prologo';
  if(tab==='resumen'&&dir>0)return nSemanas>0?'w'+Math.min(nSemanas-1,Math.max(0,semanaActual||0)):'fijos';
  var l=paginas(nSemanas),i=l.indexOf(tab);
  if(i<0)return null;
  var j=i+dir;
  return j>=0&&j<l.length?l[j]:null;
}

/* Números de página (el folio): el prólogo ocupa las páginas 1 a 6 (propósito, plata, lo apartado, ahorro, cobro y pacto),
   el índice la 7 y desde ahí los capítulos, una página por semana; Ajustes es la última. */
export var PROLOGO=['p1','q1','qa','q2','q3','pacto'];
export var PAG_INDICE=7;
export function numeroDePagina(tab,nSemanas){
  var i=PROLOGO.indexOf(tab);if(i>=0)return i+1;
  if(tab==='indice')return PAG_INDICE;
  var l=paginas(nSemanas).concat(['ajustes']),j=l.indexOf(tab==='semanas'?'w0':tab);
  return j<0?null:PAG_INDICE+1+j;
}
/* Nombre corto de una página, para las flechas («‹ Hoy», «Semana 2 ›») */
export function nombreDePagina(tab){
  if(tab==='prologo')return 'El pacto';
  if(tab==='ajustes')return 'Ajustes';
  if(/^w\d+$/.test(tab))return 'Semana '+(Number(tab.slice(1))+1);
  var c=capituloDe(tab);return c?c.t:'';
}
