/* Feriados de Uruguay 2026 y 2027 (puro). Se pueden quitar o agregar desde Ajustes → Feriados.
   laborable:true = feriado "laborable" por ley (Reyes, Carnaval, Turismo, 19/4, 18/5, 12/10, 2/11).
   Los que la ley traslada al lunes ya están corridos (18/5/2027 → 17/5 y 12/10/2027 → 11/10).
   Para sumar un año, agregá sus fechas acá. */
export var FERIADOS_UY=[
  {fecha:'2026-01-01',nombre:'Año Nuevo'},
  {fecha:'2026-01-06',nombre:'Reyes',laborable:true},
  {fecha:'2026-02-16',nombre:'Carnaval',laborable:true},
  {fecha:'2026-02-17',nombre:'Carnaval',laborable:true},
  {fecha:'2026-03-30',nombre:'Semana de Turismo',laborable:true},
  {fecha:'2026-03-31',nombre:'Semana de Turismo',laborable:true},
  {fecha:'2026-04-01',nombre:'Semana de Turismo',laborable:true},
  {fecha:'2026-04-02',nombre:'Semana de Turismo',laborable:true},
  {fecha:'2026-04-03',nombre:'Semana de Turismo',laborable:true},
  {fecha:'2026-04-19',nombre:'Desembarco de los 33 Orientales',laborable:true},
  {fecha:'2026-05-01',nombre:'Día de los Trabajadores'},
  {fecha:'2026-05-18',nombre:'Batalla de Las Piedras',laborable:true},
  {fecha:'2026-06-19',nombre:'Natalicio de Artigas'},
  {fecha:'2026-07-18',nombre:'Jura de la Constitución'},
  {fecha:'2026-08-25',nombre:'Declaratoria de la Independencia'},
  {fecha:'2026-10-12',nombre:'Día de la Diversidad Cultural',laborable:true},
  {fecha:'2026-11-02',nombre:'Día de los Difuntos',laborable:true},
  {fecha:'2026-12-25',nombre:'Navidad'},
  {fecha:'2027-01-01',nombre:'Año Nuevo'},
  {fecha:'2027-01-06',nombre:'Reyes',laborable:true},
  {fecha:'2027-02-08',nombre:'Carnaval',laborable:true},
  {fecha:'2027-02-09',nombre:'Carnaval',laborable:true},
  {fecha:'2027-03-22',nombre:'Semana de Turismo',laborable:true},
  {fecha:'2027-03-23',nombre:'Semana de Turismo',laborable:true},
  {fecha:'2027-03-24',nombre:'Semana de Turismo',laborable:true},
  {fecha:'2027-03-25',nombre:'Semana de Turismo',laborable:true},
  {fecha:'2027-03-26',nombre:'Semana de Turismo',laborable:true},
  {fecha:'2027-04-19',nombre:'Desembarco de los 33 Orientales',laborable:true},
  {fecha:'2027-05-01',nombre:'Día de los Trabajadores'},
  {fecha:'2027-05-17',nombre:'Batalla de Las Piedras',laborable:true},
  {fecha:'2027-06-19',nombre:'Natalicio de Artigas'},
  {fecha:'2027-07-18',nombre:'Jura de la Constitución'},
  {fecha:'2027-08-25',nombre:'Declaratoria de la Independencia'},
  {fecha:'2027-10-11',nombre:'Día de la Diversidad Cultural',laborable:true},
  {fecha:'2027-11-02',nombre:'Día de los Difuntos',laborable:true},
  {fecha:'2027-12-25',nombre:'Navidad'}
];

/* Lista final: la de arriba, sin los que quitaste y con los que agregaste (state.feriados). */
export function feriadosActivos(cfg){
  cfg=cfg||{};
  var quit={};(cfg.quitados||[]).forEach(function(f){quit[f]=1});
  var out=FERIADOS_UY.filter(function(f){return !quit[f.fecha]}).map(function(f){return {fecha:f.fecha,nombre:f.nombre,laborable:!!f.laborable}});
  (cfg.agregados||[]).forEach(function(f){if(f&&/^\d{4}-\d{2}-\d{2}$/.test(f.fecha)&&!out.some(function(x){return x.fecha===f.fecha}))out.push({fecha:f.fecha,nombre:f.nombre||'Feriado',propio:true})});
  return out.sort(function(a,b){return a.fecha<b.fecha?-1:1});
}
