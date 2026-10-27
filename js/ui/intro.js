/* La introducción de cada capítulo (2.10): el párrafo con capitular se ve completo la primera vez;
   después queda en una línea «¿Qué es esto? ▸» que lo abre. Se recuerda en este aparato (localStorage pa-intros). */
var KEY='pa-intros',vistos=null,estaVez={},abiertos={};
function leer(){if(vistos)return vistos;try{vistos=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){vistos={}}return vistos}
function marcar(id){var v=leer();if(v[id])return;v[id]=1;try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}}
export function introCapitulo(seccion,id){
  var ph=seccion&&seccion.querySelector(':scope>.panel-head');if(!ph)return;
  var p=ph.querySelector('.ph-s');if(!p)return;
  var d=ph.querySelector('.ph-intro');
  if(!d){
    d=document.createElement('details');d.className='ph-intro';d.innerHTML='<summary>¿Qué es esto?</summary>';
    p.parentNode.insertBefore(d,p);d.appendChild(p);
    d.addEventListener('toggle',function(){if(!d.classList.contains('primera'))abiertos[id]=d.open});
  }
  /* la primera vez que se abre el capítulo (en esta visita a la app) se ve entera */
  var primera=!leer()[id]||estaVez[id];
  if(primera){estaVez[id]=1;marcar(id)}
  d.classList.toggle('primera',!!primera);
  d.open=primera?true:!!abiertos[id];
}
/* «Ver el tour otra vez» también vuelve a mostrar las introducciones completas */
export function olvidarIntros(){vistos={};estaVez={};abiertos={};try{localStorage.removeItem(KEY)}catch(e){}}
