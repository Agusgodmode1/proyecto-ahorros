/* Las fotos de respaldo de la estantería (2.64): sacadas de la propia escena 3D, sin texto adentro.
   Para cada una: el archivo, la zona que nunca puede quedar afuera al recortar y dónde está cada libro
   (todo en fracciones de la foto: 0 = borde izquierdo o de arriba, 1 = borde derecho o de abajo). */
export var FOTO_W=780,FOTO_H=1688;
export var FOTOS={
  inicio:{src:'icons/escena/inicio.webp',zona:{x0:.2,y0:.3,x1:.8,y1:.7}},
  menu:{src:'icons/escena/menu.webp',zona:{x0:.1,y0:.38,x1:.9,y1:.68},
    libros:{solo:{x0:.2551,y0:.4199,x1:.332,y1:.6056},duo:{x0:.6431,y0:.4199,x1:.72,y1:.6056}}},
  tapa:{
    solo:{src:'icons/escena/tapa-solo.webp',zona:{x0:.1,y0:.24,x1:.9,y1:.84},libro:{x0:.15,y0:.27,x1:.85,y1:.74}},
    duo:{src:'icons/escena/tapa-duo.webp',zona:{x0:.1,y0:.24,x1:.9,y1:.84},libro:{x0:.15,y0:.27,x1:.85,y1:.74}}
  }
};
