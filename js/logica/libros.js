/* La estantería (2.60, puro): la app son varios libros y cada uno guarda sus datos en su propio lugar del teléfono.
   «solo» es el libro de siempre (su lugar no se movió: quien ya usaba la app no migra nada); «duo» es El Pacto de los Dos. */
export var LIBROS=[
  {id:'solo',titulo:'El Libro del Ahorro',lema:'Modo Lobo Solitario',voz:'modo lobo solitario',chico:'el libro del',grande:'Ahorro',frase:'Para que guardes algo, por más mínimo que sea'},
  {id:'duo',titulo:'El Pacto de los Dos',lema:'Ahorro en Dúo',voz:'ahorro en dúo',chico:'el pacto de los',grande:'Dos',frase:'Lo que es de los dos, se cuida entre los dos'}
];
export function libroDe(id){return LIBROS.filter(function(l){return l.id===id})[0]||null}
/* Solo se abre un libro que existe y no está bloqueado; cualquier otra cosa es el de siempre */
export function libroValido(id){var l=libroDe(id);return l&&!l.bloqueado?l.id:'solo'}
/* Dónde vive cada libro: la clave del estado y la de sus copias en IndexedDB, y la del respaldo en localStorage */
export function claves(id){
  var l=libroValido(id);
  return l==='solo'?{estado:'principal',copias:'copias',ls:'proyecto-ahorros-v1'}:{estado:l,copias:'copias-'+l,ls:'proyecto-ahorros-v1-'+l};
}
/* Respaldo completo: todos los libros que tengan algo, cada uno aparte */
export function respaldoCompleto(porLibro,ahora){
  var libros={};Object.keys(porLibro||{}).forEach(function(k){if(porLibro[k]&&libroValido(k)===k)libros[k]=porLibro[k]});
  return {app:'proyecto-ahorros',exportado:(ahora||new Date()).toISOString(),libros:libros};
}
/* De un respaldo (de un libro o completo), lo que le toca a este libro: {datos} o {error} */
export function parteDelRespaldo(o,id){
  if(!o||typeof o!=='object'||!o.libros)return {datos:o};
  var d=o.libros[libroValido(id)];
  return d?{datos:{app:o.app,exportado:o.exportado,datos:d}}:{error:'Este respaldo no trae nada de '+libroDe(libroValido(id)).titulo+'.'};
}
