/* El recorte de las fotos de la estantería (2.64, puro): cómo se ajusta una foto a la pantalla y dónde caen,
   sobre esa misma foto, los botones y los nombres. Una sola cuenta para todo: si la foto se corre, los botones
   se corren con ella. Se recalcula en cada tamaño y al girar el teléfono. */

/* foto de W×H en una pantalla de w×h. zona = {x0,y0,x1,y1} (fracciones de la foto): lo que nunca puede quedar afuera.
   La foto cubre la pantalla siempre que la zona entre; si no entra (teléfono acostado), se achica hasta que entre.
   Devuelve {escala, x, y, ancho, alto}: dónde va la foto, en px de pantalla. */
export function recorte(w,h,W,H,zona){
  var z=zona||{x0:0,y0:0,x1:1,y1:1};
  var cubre=Math.max(w/W,h/H),cabe=Math.min(w/((z.x1-z.x0)*W),h/((z.y1-z.y0)*H));
  var e=Math.min(cubre,cabe),an=W*e,al=H*e;
  /* centrada en el centro de la zona, sin dejar franjas vacías mientras la foto alcance */
  function eje(lado,tam,c){
    if(tam<=lado)return (lado-tam)/2;
    var p=lado/2-c*tam;return Math.min(0,Math.max(lado-tam,p));
  }
  return {escala:e,x:eje(w,an,(z.x0+z.x1)/2),y:eje(h,al,(z.y0+z.y1)/2),ancho:an,alto:al};
}
/* un rectángulo de la foto (en fracciones) llevado a la pantalla; nunca mide menos de «minimo» px de lado (para tocar) */
export function caja(r,f,minimo){
  var m=minimo||0,x0=r.x+f.x0*r.ancho,x1=r.x+f.x1*r.ancho,y0=r.y+f.y0*r.alto,y1=r.y+f.y1*r.alto;
  var w=Math.max(m,x1-x0),h=Math.max(m,y1-y0);
  return {x:(x0+x1)/2-w/2,y:(y0+y1)/2-h/2,w:w,h:h};
}
/* ¿el rectángulo f de la foto queda entero dentro de la pantalla? */
export function entra(r,f,w,h){
  var c=caja(r,f,0);return c.x>=-.5&&c.y>=-.5&&c.x+c.w<=w+.5&&c.y+c.h<=h+.5;
}
