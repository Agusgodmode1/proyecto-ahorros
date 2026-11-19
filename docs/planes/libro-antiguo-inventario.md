# Libro antiguo: inventario (fase 0)

Todo lo que hoy se puede abrir desde el libro individual, a dónde va en el libro y con qué pieza.
Las piezas son las de la sección 2 del pedido: **cambiar un dato** (tachar y escribir debajo, «anotar · dejar»), **palabra subrayada** (botón), **opciones con óvalo** («10 % · 20 % · 30 %»), **renglón** (campo de texto), **capítulo** (una pregunta o un bloque por página, termina en Hoy), **«¿Lo tachamos?»** (borrar, con «deshacer»).

Arriba, sobre la mesa, siempre: **ocultar · herramientas · ajustes · volver**.

## Lo que se saca (pedido)
| Hoy | Qué pasa |
|---|---|
| Índice (pág. v) | Se saca. «herramientas» de arriba lo reemplaza. |
| Notas al margen (pág. iv) | Se saca la página. Las notas que **hacen algo** se mudan (ver «Para decidir», punto 1). |
| Consejos y Seis ideas (págs. viii–ix) | Se sacan. «parejo · optimizado» ya está en Tus semanas. |
| «Ya lo pasé» (separá tu ahorro) | Se saca. |

## Fase 1: las cuatro páginas
| Lo de hoy (archivo) | Dónde va | Pieza |
|---|---|---|
| i Hoy: «actualizar» lo que tenés (`#saldo-card`, ui/plan.js) | pág. i, ahí mismo | cambiar un dato |
| i Hoy: «anotar un gasto» (hoja `#gasto-sheet`, ui/gastos.js): monto, en qué (categorías), nota, día | pág. i: la mitad de abajo se vuelve el renglón del gasto mientras escribís | renglón numérico + categorías con óvalo + renglón para la nota + «hoy · ayer · otro día» |
| i Hoy: frecuentes de un toque y «Gastaste hoy» con corregir y borrar (`#hoy-out`) | pág. i, debajo de «Hoy gastaste» | palabras subrayadas; corregir = cambiar un dato; borrar = «¿Lo tachamos?» |
| ii Tus semanas: parejo · optimizado | pág. ii | opciones con óvalo |
| ii Tocar una semana → capítulo de la semana (`#p-semana`, ui/semanas.js): los 7 días, sus gastos, anotar y borrar | **capítulo «Semana II»**: una página por semana, cada día con sus gastos en columnas de libro de cuentas, termina en Hoy | igual que la pág. i |
| iii Tu plata: actualizar Tenés y Guardás; apartado | pág. iii | cambiar un dato |
| iv Tu plan y Cuando cobres: «ver fijos», «ver tu cobro» | pág. iv (las dos juntas) | palabras subrayadas que llevan a los capítulos de la fase 3 (hasta entonces abren lo de hoy) |
| Micrófono flotante (ui/voz.js) | pág. i: la palabra «dictar» al lado de «anotar»; lo que entendió se escribe en los renglones del gasto y espera «anotar» | palabra subrayada (sin ícono) |
| Aviso «Borraste… Deshacer» (`#toast`, la píldora oscura) | una línea escrita al pie de la hoja: «tachaste el café · deshacer» | palabra subrayada |
| Modo discreto | igual que ahora | mancha de tinta |

## Fase 2: el prólogo y Ajustes
| Lo de hoy | Dónde va | Pieza |
|---|---|---|
| Prólogo: elegir camino (armar el pacto, una herramienta, importar, ejemplo) | capítulo «Prólogo», pág. 1 | palabras subrayadas |
| ¿Cuánta plata tenés? (pesos, «tengo dólares» + cotización) | pág. 2 | renglones numéricos; «sin dólares · con dólares» con óvalo |
| Plata apartada (monto, qué es, nota, quitar) | pág. 3 | renglones + opciones con óvalo + «¿Lo tachamos?» |
| ¿Cuánto querés guardar? (hoy: **deslizador** y atajos) | pág. 4 | escribir la cifra + opciones «10 % · 20 % · 30 %» |
| ¿Cuándo cobrás? (hoy: calendario con botones) | pág. 5 | el mes escrito como calendario a tinta; el día elegido con óvalo |
| El pacto: sellar | pág. 6, termina en Hoy | palabra subrayada «sellar» |
| Fin del capítulo (el día de cobro: pacto nuevo, `#cierre-aviso`) | pág. i ese día, y sigue al capítulo «Prólogo» | palabras subrayadas |
| Ajustes → Tu libro (tus libros, abrir directo) | capítulo «Ajustes», una página por bloque | opciones con óvalo |
| Ajustes → Tu pacto (plata hasta cobrar, guardar monto o %, mínimo, desde, cobrás el) | Ajustes | cambiar un dato, opciones con óvalo |
| Ajustes → Mi perfil (4 pasos: nombre, cómo cobrás, horas extra, descuentos; ui/perfil.js) | Ajustes, una página por paso | renglones y opciones con óvalo |
| Ajustes → Tus gastos (anotar o no) y Categorías (crear, renombrar, color, ordenar, ocultar, borrar; hoy en Tarjeta) | Ajustes | renglones, opciones con óvalo, «¿Lo tachamos?» |
| Ajustes → En pareja (nombre, qué día cobra, borrar) | Ajustes | renglones, «¿Lo tachamos?» |
| Ajustes → Sonido (sí/no y **deslizador** de volumen) | Ajustes | «sin sonido · bajo · medio · alto» con óvalo |
| Ajustes → Privacidad (discreto, PIN) | Ajustes | opciones con óvalo; el PIN, renglón numérico |
| Pantalla del PIN al abrir (ui/pin.js) | una hoja: «Escribí tu clave» sobre un renglón | renglón numérico |
| Ajustes → Dólar y Feriados (ui/feriados.js) | Ajustes | cambiar un dato; cada feriado con «lo tomo · no lo tomo» |
| Ajustes → Tus datos: pasar a otro aparato, Excel, exportar, importar (con resumen), copias, empezar de cero | Ajustes | palabras subrayadas; empezar de cero con «¿Lo tachamos?» |
| Ajustes → Sobre la app, repetir el recorrido | Ajustes | texto y palabra subrayada |
| Recorrido de bienvenida (ui/tour.js, globos sobre la pantalla) | ver «Para decidir», punto 3 | |
| Aviso de versión nueva (`#upd`) | una línea escrita sobre la mesa: «hay una hoja nueva · ponerla» | palabra subrayada |

## Fase 3: Herramientas (lo que abre «herramientas»)
| Lo de hoy | Dónde va | Pieza |
|---|---|---|
| Menú de herramientas y buscar un gasto (ui/indice.js) | una página «Herramientas» con la lista escrita y un renglón «buscar un gasto» | palabras subrayadas + renglón |
| Sueldo y horas extra (ui/sueldo.js): recibo estimado, valor de la hora, cargar horas a mano, registro, horario y tasas, aguinaldo | capítulo «Tu sueldo», un bloque por página; cifras como libro de cuentas | cambiar un dato, renglones, opciones con óvalo, «¿Lo tachamos?» |
| Planilla del trabajo (ui/planilla.js, elegir el Excel) | dentro de «Tu sueldo» | palabra subrayada (el iPhone abre su selector de archivos) |
| Recibos: subir PDF, pegar, a mano, «¿Te pagaron bien?» (ui/recibos.js, ui/lector.js) | capítulo «Tus recibos» | renglones; lo que encontró, renglón por renglón, con «anotar · dejar» |
| Facturas y costos (ui/factura.js), si cobrás con factura | capítulo «Tus facturas» | igual que recibos |
| Tarjeta y extracto (ui/tarjeta.js, tarjeta-ver.js): pegar o subir, gráficos, cobros dobles, agregar faltantes | capítulo «Tu tarjeta»; los gráficos dibujados a pluma | renglón grande para pegar, palabras subrayadas |
| Fijos (ui/fijos.js): lista, agregar, de quién es, quién paga, reparto, dividir, «Me pagaron»/«Saldar» (ui/cuentas.js), otros cobros del mes (ui/ingresos.js) | capítulo «Tus fijos» | cambiar un dato, opciones con óvalo, «¿Lo tachamos?» |
| Lo guardado (ui/guardado.js, ui/metas.js): fondo, metas, sumarles plata | capítulo «Lo guardado» | cambiar un dato, renglones |
| Logros (ui/logros.js): racha, cerrar el mes, historial, meses anteriores; la postal para compartir (ui/postal.js) | capítulo «Tus logros» | palabras subrayadas (la postal sigue siendo una imagen que el iPhone comparte) |

## Para decidir (necesito tu visto bueno)
1. **Notas que hacen algo.** Al sacar «Notas al margen», estas funciones se quedarían sin lugar. Propongo mudarlas así:
   - Fin del capítulo (pacto nuevo) → pág. i, ese día.
   - «Esa meta no se puede» (bajar la meta) → pág. iv, Tu plan, en rojo.
   - Cierre de la semana (lo que sobró: «a la semana que viene · al ahorro») → pág. ii, debajo de esa semana.
   - Plata que entra antes del cobro («Me entró») → pág. iii, Tu plata.
   - Te deben («Me pagaron») → capítulo Fijos (ya existe ahí).
   - Datos de ejemplo («borrar el ejemplo y crear mi perfil») → pág. i, una línea chica.
   - Las que solo recuerdan (recibo, respaldo, feriados, tarjeta, ritmo, plata justa) → se dejan de mostrar en Hoy; la función sigue en su capítulo.
2. **Cuántas herramientas en la fase 3.** Tu pedido nombra sueldo, recibos y tarjeta, pero «herramientas» también abre **Fijos, Lo guardado y Logros**. Para cumplir la prueba final (no llegar nunca a la interfaz vieja), propongo hacerlas también en la fase 3, o en una fase 4 aparte.
3. **El recorrido de bienvenida** (los globos) no tiene sentido sobre un libro. Propongo reemplazarlo por una página «¿Cómo se usa este libro?» al final de Ajustes.
4. **Íconos de las categorías.** Hoy cada categoría tiene ícono y color. En el libro irían solo con el nombre y un punto de su color hecho a pluma. El ícono queda guardado (no se pierde), pero desde el libro no se podría elegir.
5. **Lo que muestra el iPhone** (elegir un archivo, compartir la postal, el teclado) es del sistema y no se puede vestir de libro.
