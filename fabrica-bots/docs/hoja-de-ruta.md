# Hoja de ruta

## Hecho
- **Fase 1 · Calibración con controles.** `python -m fabrica calibrar`: ventaja plantada (A), azar (B), azar optimizado (C), ventaja menor que los costos (D), mercado sin ventaja (E) y reproducibilidad (F). Con `--amplia N` mide falsos positivos y potencia en N mercados por tipo.
- **Estaciones E1 a E5** con los cuatro motivos de cierre, registro de todas las pruebas, familias congeladas y tramo reservado con firma.
- **Estudio:** 12 estrategias en 7 familias y 19 indicadores (`estudio/`).
- **Panel** HTML generado desde la base.

## Lo que sigue, en orden
1. **Fase 0 · Tu firma en los criterios.** Leé `criterios.toml`, cambiá lo que quieras y poné tu nombre en `[firma]`. Elegí bróker, activos y cuenta objetivo (saldo, lote mínimo) para el perfil de costos.
2. **Datos reales.** Exportá del MT5 del bróker 10 años o más en H1 de 3 a 5 activos (por ejemplo dos pares mayores, un índice y oro). Guardalos fuera del repositorio. Corré `calidad` y después `ciclo` con cada uno.
3. **Fase 2 · Claude en la línea.** Un orquestador que toma tareas de la tabla `tareas`, llama a `claude -p` con el rol (`roles/`) y corre el ciclo. El Analista ya encola tareas.
4. **Fase 3 · MT5.** Plantilla única de EA en MQL5 que escribe sus propios CSV de señales y operaciones; el Ensamblador la completa por ficha; E3 suma la conciliación EA ↔ Python señal por señal; E6 corre en una demo nueva y compara la curva contra la banda Monte Carlo (`validacion.banda_montecarlo`).
5. **Viabilidad con lote mínimo.** Cuando esté el bróker: cuántas operaciones superan el riesgo máximo con el lote mínimo, para mandar a «estacionada» lo que tiene ventaja pero no entra en la cuenta.
6. **E7 · Dossier y presupuesto de riesgo** con la correlación entre candidatas.
