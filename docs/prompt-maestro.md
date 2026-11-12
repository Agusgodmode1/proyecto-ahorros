# Plantilla para pedidos grandes

Agus no tiene que escribir esto: puede mandar un audio o un texto desordenado y Claude lo convierte en esta estructura, se la muestra en pocas líneas para que la corrija, y recién ahí programa.

## Cómo usarla (para Claude)
1. Leé `CLAUDE.md`, `docs/vision.md`, `docs/decisiones.md` y `docs/roadmap.md`. No releas la conversación entera ni todo `referencia-tecnica.md`.
2. Ordená el pedido de Agus en los campos de abajo. Lo que falte, asumilo razonablemente y marcalo como «supuesto»; preguntá solo si es algo caro de rehacer.
3. Mostrale el resultado a Agus en menos de 15 líneas. Si dice que sí (o no contesta), ejecutá.
4. Trabajá en tareas chicas con un commit cada una; `node --test` en verde antes de cada commit.
5. Al terminar: actualizá `docs/roadmap.md`, `docs/decisiones.md` y la sección de `referencia-tecnica.md` que cambió.

## Campos
- **Objetivo:** qué tiene que poder hacer o sentir la persona al terminar (una o dos frases).
- **Alcance:** qué pantallas o herramientas se tocan y cuáles NO.
- **Cómo se ve y se siente:** referencias, palabras clave, qué evitar.
- **Reglas que no se rompen:** datos locales, sin dependencias, lógica validada intacta, sin datos reales.
- **Casos a probar:** 3 a 5 situaciones concretas (ej. «sin recibo», «fin de mes», «iPhone chico de 320 px»).
- **Cómo sabemos que quedó bien:** pruebas en verde, revisión visual a 390 y 320 px, y qué debería ver Agus en su iPhone.
- **Fuera de alcance:** lo que se anota en el roadmap pero no se hace ahora.
