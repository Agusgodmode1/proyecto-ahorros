# Estudio de estrategias

Generado desde `fabrica/estrategias.py`. Cada ficha es una **familia**: todas sus variantes de la grilla se prueban y **todas cuentan** para la vara estadística (N efectivo). Por eso las grillas son chicas a propósito.

## Familias y por qué podrían funcionar

| Familia | Idea | Por qué existiría la ventaja | Dónde suele funcionar | Dónde falla |
|---|---|---|---|---|
| momento | Ir a favor del retorno reciente | El retorno pasado predice levemente el futuro (efecto documentado en décadas de datos). | Carteras de varios activos y horizontes de semanas. | Giros bruscos (choques de momento). |
| reversión | Apostar a que el exceso se deshace | Movimientos muy concentrados suelen deshacerse en parte (liquidez, sobrerreacción). | Laterales, pares que oscilan, horarios tranquilos. | Tendencias fuertes: el precio sigue yéndose y el stop salta. |
| ruptura | Entrar cuando se rompe un rango | Romper un máximo de semanas revela un desequilibrio que tarda en absorberse. | Después de períodos de compresión; activos con noticias. | Rupturas falsas; necesita stop y paciencia. |
| régimen | Elegir la regla según el mercado | Medir si el mercado va derecho o va y viene, y usar la regla que corresponde. | Activos que alternan tendencia y lateral. | El detector llega tarde al cambio de régimen. |
| tendencia | Seguir lo que ya se mueve | Los precios con impulso siguen un tiempo en la misma dirección (gente que llega tarde, coberturas, flujos lentos). | Mercados con regímenes largos: divisas mayores en H4/D1, índices, materias primas. | En laterales: muchas pérdidas chicas seguidas. |
| volatilidad | Esperar la expansión | La volatilidad se agrupa: tras un período quieto suele venir uno amplio. | Antes de noticias o aperturas de sesión. | Expansiones que van y vuelven. |

## Las fichas del catálogo

### T01 · Cruce de medias exponenciales

- **Familia:** tendencia
- **Lógica de mercado:** Los precios con impulso tienden a seguir en la misma dirección un tiempo; la media rápida sobre la lenta lo detecta.
- **Indicadores:** ema, atr
- **Entrada:** Comprado si la exponencial rápida está arriba de la lenta, vendido si está abajo.
- **Salida:** Al cruzarse al revés o en el stop de 4 ATR. Stop inicial a 4 ATR(14).
- **Grilla:** rapida ∈ [10, 20, 40]; lenta ∈ [100, 200, 400] → 9 variantes
- **Referencia:** Seguimiento de tendencia clásico (Covel, Hurst/Ooi/Pedersen).

### T02 · Ruptura de Donchian

- **Familia:** ruptura
- **Lógica de mercado:** Romper el máximo de varias semanas indica un desequilibrio que suele continuar.
- **Indicadores:** donchian, atr
- **Entrada:** Cierre arriba del máximo de n velas (o abajo del mínimo).
- **Salida:** Ruptura del canal corto en contra o stop. Stop inicial a 4 ATR(14).
- **Grilla:** entrada ∈ [55, 120, 240]; salida ∈ [20, 60] → 6 variantes
- **Referencia:** Reglas tipo Tortugas (Faith).

### T03 · Momento de serie de tiempo

- **Familia:** momento
- **Lógica de mercado:** El retorno pasado de un activo predice levemente el futuro en horizontes de días a meses.
- **Indicadores:** roc, adx, atr
- **Entrada:** A favor del signo de la tasa de cambio, si el ADX supera el mínimo.
- **Salida:** Cuando cambia el signo o el ADX cae. Stop inicial a 4 ATR(14).
- **Grilla:** largo ∈ [48, 120, 240, 480]; adx_min ∈ [0, 20] → 8 variantes
- **Referencia:** Moskowitz, Ooi y Pedersen (2012).

### T04 · MACD con filtro de tendencia

- **Familia:** tendencia
- **Lógica de mercado:** El cruce del MACD capta aceleraciones; el filtro de la media de 200 evita ir contra el fondo.
- **Indicadores:** macd, ema, atr
- **Entrada:** Línea MACD sobre su señal (y precio sobre la media de 200 si hay filtro).
- **Salida:** Cruce al revés o stop. Stop inicial a 4 ATR(14).
- **Grilla:** rapida ∈ [12, 48]; lenta ∈ [26, 104]; senal ∈ [9]; filtro ∈ [0, 1] → 8 variantes

### T05 · Supertrend

- **Familia:** tendencia
- **Lógica de mercado:** Un piso móvil a k ATR deja correr las tendencias y corta cuando el precio lo rompe.
- **Indicadores:** supertrend, atr
- **Entrada:** En la dirección del Supertrend.
- **Salida:** Cuando se da vuelta o stop. Stop inicial a 4 ATR(14).
- **Grilla:** n ∈ [10, 30]; k ∈ [3.0, 5.0, 8.0] → 6 variantes

### R01 · RSI en extremos

- **Familia:** reversión
- **Lógica de mercado:** Tras una racha de subas o bajas muy concentrada, parte del movimiento se deshace.
- **Indicadores:** rsi, atr
- **Entrada:** Compra con RSI bajo el umbral, vende sobre 100 − umbral.
- **Salida:** Cuando el RSI cruza 50 o stop. Stop inicial a 2 ATR(14).
- **Grilla:** n ∈ [7, 14]; bajo ∈ [20, 30] → 4 variantes
- **Referencia:** Connors y Alvarez, reversión de corto plazo.

### R02 · Vuelta desde la banda de Bollinger

- **Familia:** reversión
- **Lógica de mercado:** Los cierres fuera de dos desvíos son poco frecuentes y tienden a volver a la media.
- **Indicadores:** bollinger, atr
- **Entrada:** Cierre bajo la banda inferior (o sobre la superior).
- **Salida:** Al tocar la media o stop. Stop inicial a 2 ATR(14).
- **Grilla:** n ∈ [20, 50]; k ∈ [2.0, 2.5] → 4 variantes

### R03 · Puntaje z contra la media

- **Familia:** reversión
- **Lógica de mercado:** Si el precio oscila alrededor de un valor justo, alejarse varios desvíos es una oportunidad de vuelta.
- **Indicadores:** zscore, atr
- **Entrada:** z menor que −umbral compra, mayor que +umbral vende.
- **Salida:** Cuando z vuelve a 0 o stop. Stop inicial a 2 ATR(14).
- **Grilla:** n ∈ [24, 48, 96]; entrada ∈ [1.5, 2.0] → 6 variantes

### R04 · Retroceso en tendencia

- **Familia:** momento
- **Lógica de mercado:** Dentro de una tendencia los retrocesos cortos se compran: se entra a favor con mejor precio.
- **Indicadores:** estocastico, ema, atr
- **Entrada:** Tendencia alcista y el estocástico sale de sobreventa (y al revés).
- **Salida:** Estocástico en el otro extremo, fin de la tendencia o stop. Stop inicial a 3 ATR(14).
- **Grilla:** n ∈ [14, 28]; tendencia ∈ [100, 200] → 4 variantes

### V01 · Ruptura tras compresión

- **Familia:** volatilidad
- **Lógica de mercado:** La volatilidad se alterna: después de un período quieto suele venir uno amplio.
- **Indicadores:** bollinger, keltner, atr
- **Entrada:** Bollinger dentro de Keltner en las últimas 5 velas y cierre fuera de la banda.
- **Salida:** Vuelta a la media o stop. Stop inicial a 3 ATR(14).
- **Grilla:** n ∈ [20, 40]; keltner ∈ [1.5, 2.0] → 4 variantes
- **Referencia:** «Squeeze» de Carter.

### V02 · Ruptura del canal de Keltner

- **Familia:** volatilidad
- **Lógica de mercado:** Un cierre a varios ATR de la media marca una expansión que tiende a seguir.
- **Indicadores:** keltner, atr
- **Entrada:** Cierre arriba de la banda superior (o abajo de la inferior).
- **Salida:** Vuelta a la media o stop. Stop inicial a 3 ATR(14).
- **Grilla:** n ∈ [20, 50]; k ∈ [1.5, 2.5] → 4 variantes

### G01 · Cambio de régimen por eficiencia

- **Familia:** régimen
- **Lógica de mercado:** Cuando el mercado avanza derecho conviene seguirlo; cuando va y viene, conviene revertir.
- **Indicadores:** eficiencia, ema, zscore, atr
- **Entrada:** Eficiencia alta: a favor de la media de 50. Baja: puntaje z de 48 en ±1,5.
- **Salida:** Cuando cambia la condición o stop. Stop inicial a 3 ATR(14).
- **Grilla:** n ∈ [24, 96]; umbral ∈ [0.3, 0.5] → 4 variantes

**Total:** 12 fichas, 67 bots por ciclo.

## Controles de calibración

No son estrategias para operar: tienen la respuesta correcta conocida y sirven para comprobar que la fábrica distingue.

| Id | Control | Qué prueba |
|---|---|---|
| C01 | Entradas al azar | Ninguna: entra por sorteo. Sirve para ver si la fábrica rechaza lo que no tiene ventaja. |
| C02 | Contra la última vela | Va contra la vela anterior. Solo gana antes de costos si hay reversión de una vela. |
| C03 | Azar optimizado | Ninguna: se prueban 200 sorteos y se elige el mejor en entrenamiento. Debe caer en robustez. |

## Ideas para las próximas fichas (Investigador)

- Sesiones: ruptura del rango asiático en la apertura de Londres (necesita velas con horario del bróker).
- Estacionalidad intradía y de fin de mes (necesita datos reales con horario).
- Carry y diferencial de tasas en divisas (necesita datos de swaps del bróker).
- Cartera de momento entre varios activos (necesita varias series alineadas).
- Filtros de volatilidad sobre las fichas que sobrevivan (una ficha nueva por filtro, nunca un parche).
