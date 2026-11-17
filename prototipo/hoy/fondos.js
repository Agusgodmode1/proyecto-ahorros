/* Los fondos de Hoy: imágenes sacadas de la escena (render.html) y dónde quedó cada cosa en ellas, en fracciones de la
   imagen (0 = borde izquierdo o de arriba, 1 = derecho o de abajo). De cada página, sus cuatro esquinas:
   arriba-izquierda, arriba-derecha, abajo-derecha y abajo-izquierda. */
export const FONDOS={
  alto:{src:'fondo-alto.webp?v=9',w:780,h:1688,llama:{x:0.7706,y:0.1725},
    izq:[[0.0462,0.2929],[0.5,0.2929],[0.5,0.9261],[0.0134,0.9261]],der:[[0.5,0.2913],[0.9546,0.2913],[0.9875,0.9255],[0.5,0.9255]]},
  corto:{src:'fondo-corto.webp?v=9',w:640,h:1136,llama:{x:0.7698,y:0.0698},
    izq:[[0.0475,0.2167],[0.5,0.2167],[0.5,0.9841],[0.0149,0.9841]],der:[[0.5,0.2147],[0.9532,0.2147],[0.986,0.9833],[0.5,0.9833]]}
};
