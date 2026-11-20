# Listado de indicadores

Generado desde `fabrica/indicadores.py`. Todos son **causales**: el valor de la vela t usa solo datos hasta t (la estación E3 lo comprueba borrando el futuro y recalculando).

## Tendencia

| Código | Indicador | Qué mide | Cómo se usa | Cuidado | Parámetros típicos |
|---|---|---|---|---|---|
| `sma` | Media móvil simple | El precio promedio de las últimas n velas. | Dirección de fondo y filtro: operar solo a favor de la media lenta. | Llega tarde a los giros; en lateral da señales falsas. | n = 20, 50, 200 |
| `ema` | Media móvil exponencial | Promedio que pesa más lo reciente. | Cruces rápida/lenta y filtros de tendencia. | Más rápida que la simple, también más nerviosa. | n = 10 a 200 |
| `macd` | MACD | Distancia entre dos exponenciales y su propia media. | Cruce de la línea con su señal; histograma como impulso. | Es un cruce de medias disfrazado: no sumarlo a otro cruce. | 12/26/9 |
| `adx` | ADX y direccionales | Qué tan fuerte es la tendencia, sin importar el sentido. | Filtro: seguir tendencia solo con ADX alto, revertir con ADX bajo. | No dice dirección; los DI sí. | n = 14, umbral 20–25 |
| `supertrend` | Supertrend | Un piso o techo que sigue al precio a k veces el ATR. | Dirección y stop dinámico. | En lateral se da vuelta seguido. | n = 10, k = 3 |

## Ruptura

| Código | Indicador | Qué mide | Cómo se usa | Cuidado | Parámetros típicos |
|---|---|---|---|---|---|
| `donchian` | Canal de Donchian | Máximo y mínimo de las últimas n velas. | Ruptura del máximo para entrar, del mínimo corto para salir. | Muchas rupturas falsas; necesita stop y paciencia. | entrada 20–55, salida 10–20 |

## Momento

| Código | Indicador | Qué mide | Cómo se usa | Cuidado | Parámetros típicos |
|---|---|---|---|---|---|
| `rsi` | RSI | Proporción de subas sobre bajas recientes, de 0 a 100. | Extremos (<30, >70) para revertir; cruce de 50 como impulso. | En tendencia fuerte queda en extremo mucho tiempo. | n = 2, 7, 14 |
| `estocastico` | Estocástico | Dónde cerró el precio dentro del rango de n velas. | Retrocesos dentro de una tendencia (comprar %K < 20 si la tendencia es alcista). | Muy ruidoso solo. | 14/3 |
| `roc` | Tasa de cambio | Cuánto cambió el precio en n velas, en %. | Momento de serie de tiempo: ir a favor del signo. | Sensible al largo elegido. | n = 24 a 336 velas |
| `cci` | CCI | Distancia del precio típico a su media, en desvíos medios. | Extremos ±100 para revertir o romper. | Escala abierta; los umbrales cambian según el activo. | n = 20 |
| `williams_r` | Williams %R | Como el estocástico, invertido de 0 a −100. | Sobrecompra y sobreventa de corto plazo. | Redundante con el estocástico: usar uno. | n = 14 |

## Volatilidad

| Código | Indicador | Qué mide | Cómo se usa | Cuidado | Parámetros típicos |
|---|---|---|---|---|---|
| `atr` | ATR | El rango promedio de las velas, con huecos. | Tamaño del stop y de la posición; filtro de volatilidad. | No dice dirección. | n = 14 |
| `bollinger` | Bandas de Bollinger | Media ± k desvíos estándar. | Volver a la media desde la banda, o romper tras una compresión. | Las dos lecturas son opuestas: definir cuál antes. | 20, k = 2 |
| `keltner` | Canal de Keltner | Exponencial ± k veces el ATR. | Rupturas de volatilidad; con Bollinger detecta compresiones. | Parecido a Bollinger, más suave. | 20, k = 1,5 |
| `volatilidad` | Volatilidad realizada | Desvío de los retornos recientes. | Filtrar regímenes demasiado quietos o demasiado agitados. | Cambia con la sesión del día. | n = 24 |

## Estadística

| Código | Indicador | Qué mide | Cómo se usa | Cuidado | Parámetros típicos |
|---|---|---|---|---|---|
| `zscore` | Puntaje z | Cuántos desvíos está el precio de su media. | Reversión: comprar en z < −2, salir en 0. | Supone que hay una media estable. | n = 24 a 96 |

## Régimen

| Código | Indicador | Qué mide | Cómo se usa | Cuidado | Parámetros típicos |
|---|---|---|---|---|---|
| `eficiencia` | Eficiencia de Kaufman | Avance neto dividido el recorrido total, de 0 a 1. | Decidir si el mercado está en tendencia o en lateral. | Umbral depende del activo. | n = 24 a 96 |
| `razon_varianza` | Razón de varianza | Si los movimientos se acumulan (>1) o se deshacen (<1). | Diagnóstico de régimen: elegir la familia de estrategia. | Necesita ventanas largas. | q = 4, n = 240 |

## Volumen

| Código | Indicador | Qué mide | Cómo se usa | Cuidado | Parámetros típicos |
|---|---|---|---|---|---|
| `obv` | Balance de volumen | Volumen acumulado con signo de la vela. | Confirmar rupturas con volumen. | En CFD y forex el volumen es de ticks, no real. | — |

## Reglas para usar indicadores

1. Un indicador por pregunta: dirección, fuerza, volatilidad o régimen. Dos del mismo tipo no confirman nada.
2. El stop y el tamaño salen del ATR, nunca de pips fijos.
3. Cada filtro nuevo es una ficha nueva (una prueba más que cuenta), no un ajuste de la anterior.
