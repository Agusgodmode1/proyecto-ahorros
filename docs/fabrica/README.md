# La fábrica: cómo pasamos de una idea a un cambio en la app

Tres roles. Cada uno trabaja en su propio chat y recibe **archivos, no la charla anterior**.

| Rol | Dónde | Recibe | Entrega |
|---|---|---|---|
| Pensador | Proyecto de claude.ai, chat nuevo que empieza con «Rol: Pensador» | Tu idea (texto, audio, captura) | Una spec con la `plantilla-spec.md` |
| Revisor | Proyecto de claude.ai, **otro** chat nuevo que empieza con «Rol: Revisor» (mejor con Opus) | Solo la spec | Lista de problemas, del más grave al más leve |
| Ejecutor | Claude Code con el repo (Fable u Opus) | La spec aprobada | Plan, código, pruebas, capturas y commit |

## Paso a paso para un cambio
1. **Pensador.** Contale qué querés. Te hace preguntas de a una y al final te da la spec completa.
2. **Revisor.** En un chat nuevo pegá solo la spec. Si encuentra problemas, llevalos al Pensador y pedile la spec corregida. Repetí hasta que el Revisor diga «Lista para ejecutar».
3. **Ejecutor.** En Claude Code pegá la spec y escribí: «Guardala en `docs/specs/` y ejecutala.» Él arma el plan en `docs/planes/`, construye por tareas, prueba, saca capturas y te avisa.
4. **Vos.** Mirás el resultado en el iPhone. Si algo no te gusta, volvés al paso 1 con un chat nuevo y la captura.

## Armar el Proyecto (una sola vez)
1. En claude.ai creá un Proyecto: «Fábrica – Libro del Ahorro».
2. En las instrucciones del Proyecto pegá el contenido de `instrucciones-proyecto.md`.
3. En los archivos del Proyecto agregá: `CLAUDE.md`, `docs/vision.md`, `docs/direccion-visual.md`, `docs/decisiones.md`, `docs/roadmap.md` y los tres archivos de esta carpeta. Si te ofrece agregarlos desde GitHub, mejor: así se mantienen al día.

## Reglas de oro
- Un chat nuevo por cada cambio y por cada revisión.
- Una spec = un cambio. Si son dos cosas, son dos specs.
- El repo es público: nunca pongas datos reales en una spec.
