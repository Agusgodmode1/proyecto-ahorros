// El libro de Hoy (js/logica/hoy-libro.js): fechas, romanos, la página deformada y la vuelta de hoja.
import test from 'node:test';
import assert from 'node:assert/strict';
import {romano,fechaLarga,cobro,diasSemana,diaNombre,homografia,franjas,pasa,duracion} from '../js/logica/hoy-libro.js';

test('números romanos',()=>{
  assert.deepEqual([1,2,3,4,5,6,9,12,40].map(romano),['I','II','III','IV','V','VI','IX','XII','XL']);
  assert.equal(romano(0),'');
});
test('la fecha del encabezado y el día en que termina la semana',()=>{
  assert.equal(fechaLarga('2026-11-16'),'lunes 16 de noviembre');
  assert.equal(diaNombre('2026-11-18'),'miércoles');
});
test('«Cobrás en» dice lo mismo que Hoy en todos los casos',()=>{
  assert.deepEqual(cobro('2026-11-16','2026-12-07'),{lab:'Cobrás en',cifra:'21 días',dias:21});
  assert.equal(cobro('2026-12-06','2026-12-07').cifra,'mañana');
  assert.deepEqual(cobro('2026-12-07','2026-12-07'),{lab:'Hoy',cifra:'cobrás',dias:0});
  assert.equal(cobro('2026-12-08','2026-12-07').cifra,'cobraste');
});
test('los días que quedan de la semana, como la barra de Hoy (hasta 7)',()=>{
  assert.deepEqual(diasSemana('2026-11-16',3),['hoy','mar','mié']);
  assert.equal(diasSemana('2026-11-16',12).length,7);
  assert.deepEqual(diasSemana('2026-11-16',0),['hoy']);
});
test('la página deformada lleva cada esquina a su lugar en la foto',()=>{
  const q=[[12,30],[300,34],[310,500],[5,490]],m=homografia(280,450,q).slice(9,-1).split(',').map(Number);
  /* matrix3d en columnas: aplicar a cada esquina del rectángulo */
  const ap=(x,y)=>{const X=m[0]*x+m[4]*y+m[12],Y=m[1]*x+m[5]*y+m[13],W=m[3]*x+m[7]*y+m[15];return [X/W,Y/W]};
  [[0,0],[280,0],[280,450],[0,450]].forEach((p,i)=>{const r=ap(p[0],p[1]);assert.ok(Math.abs(r[0]-q[i][0])<.01&&Math.abs(r[1]-q[i][1])<.01,'esquina '+i)});
});
test('la vuelta de hoja: plana al empezar, dada vuelta al terminar, y siempre curvada de a poco',()=>{
  const W=330;
  assert.ok(franjas(0,W).every(f=>f.th===0&&Math.abs(f.tx)<1e-9&&f.z===0),'al empezar, plana');
  assert.ok(franjas(1,W).every(f=>Math.abs(f.th-Math.PI)<1e-9),'al terminar, del todo dada vuelta');
  for(const p of [.15,.35,.5,.75]){
    const fs=franjas(p,W);assert.equal(fs.length,16);
    for(let i=1;i<fs.length;i++)assert.ok(fs[i].th>=fs[i-1].th,'cada franja gira un poco más que la anterior');
    assert.ok(fs.some(f=>f.th>0&&f.th<Math.PI),'hay un doblez (no gira rígida)');
  }
});
test('al soltar: termina si pasó un 35 % o el gesto fue rápido; si no, vuelve',()=>{
  assert.equal(pasa(.36,0),true);assert.equal(pasa(.2,.6),true);assert.equal(pasa(.2,.1),false);
});
test('la vuelta automática dura entre 0,45 y 0,7 s',()=>{
  for(const p of [0,.2,.5,.9])for(const v of [0,.3,1,3]){const d=duracion(p,v,330);assert.ok(d>=450&&d<=700,p+' '+v+' → '+d)}
});
