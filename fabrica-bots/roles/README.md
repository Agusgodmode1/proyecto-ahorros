# Roles de Claude en la línea (Fase 2)

Cada rol es una instrucción fija para Claude Code en modo sin pantalla (`claude -p`). La torre le da **una tarea por vez**
(tabla `tareas` de `salida/fabrica.db`) y el rol entrega archivos; **el estado lo cambia la torre, nunca el agente**.

| Rol | Toma | Entrega | No puede |
|---|---|---|---|
| Investigador | «buscar ideas de …» | Fichas nuevas en `fabrica/estrategias.py` (lógica en una frase, indicadores del catálogo, grilla chica) | Mirar resultados del tramo reservado |
| Ensamblador | Una ficha aprobada | La función de la regla y, en Fase 3, el EA en MQL5 desde la plantilla | Tocar `criterios.toml` |
| Auditor | Un bot con fallo técnico | Explicación y arreglo del motivo (mira el futuro, sin stop, no compila) | Cambiar la regla para que gane |
| Analista | Un ciclo cerrado | Lecciones y tareas nuevas en la cola | Proponer ajustes por un resultado puntual |

Ejemplo de una vuelta, desde la carpeta `fabrica-bots`:

```bash
claude -p "$(cat roles/investigador.md)" --allowedTools "Read,Edit,Bash(python -m unittest*)"
```
