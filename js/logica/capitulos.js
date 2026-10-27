/* Los capítulos del libro (puro, sin DOM): orden, números romanos y a qué página lleva deslizar.
   Cada semana del plan es una página del capítulo II; deslizar pasa de semana en semana. */
export var CAPITULOS=[
  {id:'resumen',n:'I',t:'Hoy',tono:'tone-sky'},
  {id:'semanas',n:'II',t:'Semanas',tono:'tone-mint'},
  {id:'fijos',n:'III',t:'Fijos',tono:'tone-teal'},
  {id:'sueldo',n:'IV',t:'Sueldo',tono:'tone-grape'},
  {id:'gastos',n:'V',t:'Tarjeta',tono:'tone-coral'},
  {id:'logros',n:'VI',t:'Logros',tono:'tone-sun'}
];
/* El capítulo de una pestaña: 'w2' es Semanas; 'ajustes' es Ajustes del pacto (fuera de los capítulos) */
export function capituloDe(tab){
  if(/^w\d+$/.test(tab))return CAPITULOS[1];
  for(var i=0;i<CAPITULOS.length;i++)if(CAPITULOS[i].id===tab)return CAPITULOS[i];
  return null;
}
/* Todas las páginas en orden: Hoy, cada semana, Fijos, Sueldo, Tarjeta, Logros */
export function paginas(nSemanas){
  var l=['resumen'];for(var i=0;i<nSemanas;i++)l.push('w'+i);
  return l.concat(['fijos','sueldo','gastos','logros']);
}
/* La página vecina al deslizar (dir 1 = siguiente, -1 = anterior), o null en los bordes.
   Desde Hoy, la siguiente es la semana actual (no la primera). */
export function vecina(tab,dir,nSemanas,semanaActual){
  if(tab==='ajustes')return null;
  if(tab==='resumen'&&dir>0)return nSemanas>0?'w'+Math.min(nSemanas-1,Math.max(0,semanaActual||0)):'fijos';
  var l=paginas(nSemanas),i=l.indexOf(tab);
  if(i<0)return null;
  var j=i+dir;
  return j>=0&&j<l.length?l[j]:null;
}
