# Fábrica de bots de trading

Software que lleva una idea de trading desde la ficha hasta «lista para demo», con controles que se fijan **antes** de ver resultados.
Es la versión que corre del diseño v3 (siete estaciones, torre SQLite, Sharpe deflactado, controles sintéticos).

- **Sin instalar nada:** solo Python 3.11 o más nuevo (biblioteca estándar). Sirve en la PC del trabajo.
- **Desde cero:** ningún EA, parámetro ni resultado de proyectos anteriores. Los criterios están en `criterios.toml`.
- **Sin datos reales en el repositorio** (es público). Las pruebas usan series sintéticas; tus velas van en `salida/` o en otra carpeta, nunca acá.

## Cómo se usa

Desde esta carpeta (`fabrica-bots`):

```bash
python -m fabrica calibrar
```

Fase 1: corre los controles con respuesta conocida. Tiene que decir «La fábrica distingue». Tarda menos de un minuto.

```bash
python -m fabrica ciclo --csv C:\datos\EURUSD_H1.csv
```

Corre la línea entera sobre tus velas exportadas de MT5. Las familias que sobreviven quedan **congeladas esperando tu firma**.

```bash
python -m fabrica firmar FAM-003 --nombre Agus
```

Abre el tramo reservado de esa familia (una sola vez) y corre la batería de robustez.

```bash
python -m fabrica panel
```

Genera `salida/panel.html`: abrilo con doble clic. Otros comandos: `estudiar` (regenera `estudio/`), `calidad archivo.csv`, `estado`, `exportar tendencia prueba.csv`.

Pruebas automáticas:

```bash
python -m unittest discover -s tests
```

## Qué hace cada estación

| Estación | Qué hace | Si no pasa |
|---|---|---|
| E1 Ideas | Valida la ficha: lógica en una frase, indicadores del catálogo, sin duplicados | descartada |
| E2 Ensamblado | Cada variante de la grilla es un bot; corre sus señales | fallo técnico |
| E3 Control técnico | Borra el futuro en varios puntos y recalcula: si la señal cambia, mira el futuro. Todo con stop | fallo técnico |
| E4 Rentabilidad | Backtest en entrenamiento con costos. Ventaja (PF, costos) y viabilidad (caída, racha) por separado | resultado negativo · inviable para la cuenta · datos insuficientes |
| E5 Robustez | Congela la familia, abre el tramo reservado con tu firma y corre: Sharpe deflactado con N efectivo, walk-forward, CSCV, Monte Carlo, ruido, contra el azar, vecindario | resultado negativo |
| E6 Demo | Preparada: «lista para demo». Se conecta en la Fase 3 | — |
| E7 Candidatas | Tu decisión, con el presupuesto de riesgo del portafolio | — |

Cada prueba que corre la fábrica queda registrada con su serie de retornos: de ahí sale el **N efectivo**, y por eso probar más cosas sube la vara para todas.

## Dónde hacer el backtest

1. **Filtro y robustez: este motor en Python.** Corre en cualquier PC, es determinista, guarda evidencia de cada corrida y cuenta cada prueba. Ejecuta en la apertura siguiente, con spread, comisión, deslizamiento y stop dentro de la vela.
2. **Confirmación: el probador de MT5 del bróker donde vas a operar**, con «cada tick basado en ticks reales», solo para las que pasen E5. Necesita Windows (PC de casa o VPS). Es la Fase 3.
3. **Datos: exportalos del MT5 de ese bróker.** Ver → Símbolos → pestaña Barras → elegí símbolo y H1 → Solicitar → Exportar barras. La fábrica lee ese CSV tal cual. Pedí **10 años o más**: la calibración mostró que con 3,5 años de entrenamiento una ventaja moderada no llega a la vara, y con 10 sí (ver `docs/decisiones.md`).

## Carpetas

```
criterios.toml     la vara: se escribe antes y no se toca después de ver resultados
fabrica/           el programa (datos, indicadores, estrategias, motor, validación, torre, línea, panel)
estudio/           estudio de estrategias e indicadores (se genera desde el código)
roles/             instrucciones de los roles de Claude para la Fase 2
docs/              decisiones y hoja de ruta
tests/             pruebas automáticas
salida/            base fabrica.db, evidencia por corrida y panel (no se sube a GitHub)
```
