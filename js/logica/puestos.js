/* Perfiles de puesto: reglas de horas extra listas para elegir en Mi perfil (puro).
   Para sumar un puesto nuevo, agregalo acá con sus reglas (las de su recibo). */
export var PUESTOS=[
  {id:'crm',nombre:'Agente de CRM (call center)',
   detalle:'Horario de 12 a 21. Entre semana se pagan los minutos que llegás antes y los que te quedás después (desde 15 min en el día) al doble; fin de semana y feriados no laborables a 1,5.',
   horas:{activo:true,divisor:240,multSem:2,multFin:1.5,finDividido:true,redondeo:'media',umbral:555,jornada:540,mesCobro:'siguiente',entrada:'12:00',salida:'21:00',feriadoLaborable:'comun'},
   cobro:{tipo:'habil5',laborableHabil:true}}
];
export function puesto(id){for(var i=0;i<PUESTOS.length;i++)if(PUESTOS[i].id===id)return PUESTOS[i];return null}
