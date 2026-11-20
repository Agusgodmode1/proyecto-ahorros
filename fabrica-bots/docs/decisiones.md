# Decisiones de la fábrica

Lo que ya se decidió. No se vuelve a discutir salvo que aparezca evidencia nueva de la calibración.

- **20/11/2026 · Python sin dependencias.** Solo biblioteca estándar (3.11+) para que corra en la PC del trabajo sin instalar nada. SQLite es la única fuente de verdad.
- **20/11/2026 · El motor ejecuta en la apertura siguiente.** La señal se decide al cierre de t y se opera en t+1, con spread, comisión, deslizamiento y stop dentro de la vela (si hay hueco, se llena peor). Tras un stop no se reentra en el mismo sentido hasta que la señal cambie.
- **20/11/2026 · Resultados en R.** 1R es la distancia del stop al entrar. Así se comparan estrategias con stops distintos y el riesgo por operación (1%) se aplica aparte.
- **20/11/2026 · E3 compara contra el futuro borrado.** Mientras no haya EA en MQL5, el «gemelo» de E3 es la misma estrategia recalculada con los datos cortados en varios puntos: si la señal cambia, mira el futuro. La conciliación EA ↔ Python se suma en la Fase 3.
- **20/11/2026 · El Sharpe deflactado se mide en entrenamiento.** Ahí ocurre la selección entre muchas pruebas. El tramo reservado se juzga aparte, con PF y cantidad mínima de operaciones.
- **20/11/2026 · V de la fórmula = 1/(T−1) («nula»).** Con la varianza entre pruebas («transversal»), la calibración rechazó la ventaja plantada del Control A (DSR 0,70 con PF fuera de muestra 3,0): esa varianza mezcla diferencias reales entre familias con azar. 1/(T−1) es lo que varía un Sharpe por puro azar. Con este cambio: 6 de 6 controles bien y 0 aprobadas en los 8 mercados sin ventaja de la calibración. Las dos se guardan en cada veredicto.
- **20/11/2026 · N efectivo por agrupamiento.** Dos pruebas con correlación ≥ 0,5 en sus retornos diarios cuentan como una. Se guarda también la razón de participación N²/Σρ² como control.
- **20/11/2026 · PBO es informativo.** Cuando todas las variantes de una familia son parecidas, la PBO ronda 0,5 aunque la ventaja sea real. Decide la probabilidad de que la elegida pierda fuera de muestra (CSCV).
- **20/11/2026 · Hacen falta 10 años de datos.** Con 5 años (3,5 de entrenamiento) la fábrica detectó la tendencia plantada 3 de 4 veces y la reversión 0 de 4; con 10 años, 3 de 3 y 2 de 3, y siguió sin aprobar nada en mercados sin ventaja. La vara de 0,95 queda; lo que se pide es más historia.
- **20/11/2026 · Dónde backtestear.** Filtro y robustez en este motor; confirmación con ticks reales en el MT5 del bróker objetivo solo para las que pasen E5; datos exportados de ese mismo MT5.
