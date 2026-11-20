"""Indicadores técnicos. Todos son causales: el valor en la vela t usa solo datos hasta t.

Cada función devuelve una lista del mismo largo que la entrada, con None mientras calienta.
CATALOGO describe cada uno para la fase de estudio; Ctx los calcula una sola vez por serie.
"""
from __future__ import annotations

import math
from collections import deque


def _primero(x):
    for i, v in enumerate(x):
        if v is not None:
            return i
    return len(x)


def sma(x, n):
    out = [None] * len(x)
    f = _primero(x)
    s = 0.0
    for i in range(f, len(x)):
        s += x[i]
        if i - f >= n:
            s -= x[i - n]
        if i - f >= n - 1:
            out[i] = s / n
    return out


def ema(x, n):
    out = [None] * len(x)
    f = _primero(x)
    a = 2 / (n + 1)
    acc, s = None, 0.0
    for i in range(f, len(x)):
        if acc is None:
            s += x[i]
            if i - f == n - 1:
                acc = s / n
                out[i] = acc
        else:
            acc += a * (x[i] - acc)
            out[i] = acc
    return out


def rma(x, n):
    """Media de Wilder (la que usan RSI, ATR y ADX)."""
    out = [None] * len(x)
    f = _primero(x)
    acc, s = None, 0.0
    for i in range(f, len(x)):
        if acc is None:
            s += x[i]
            if i - f == n - 1:
                acc = s / n
                out[i] = acc
        else:
            acc = (acc * (n - 1) + x[i]) / n
            out[i] = acc
    return out


def desvio(x, n):
    """Desvío estándar móvil (poblacional)."""
    out = [None] * len(x)
    f = _primero(x)
    if f >= len(x):
        return out
    base = x[f]
    s = s2 = 0.0
    for i in range(f, len(x)):
        y = x[i] - base
        s += y; s2 += y * y
        if i - f >= n:
            z = x[i - n] - base
            s -= z; s2 -= z * z
        if i - f >= n - 1:
            out[i] = math.sqrt(max(0.0, s2 / n - (s / n) ** 2))
    return out


def maximo(x, n):
    out = [None] * len(x)
    dq = deque()
    for i, v in enumerate(x):
        while dq and x[dq[-1]] <= v:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - n:
            dq.popleft()
        if i >= n - 1:
            out[i] = x[dq[0]]
    return out


def minimo(x, n):
    out = [None] * len(x)
    dq = deque()
    for i, v in enumerate(x):
        while dq and x[dq[-1]] >= v:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - n:
            dq.popleft()
        if i >= n - 1:
            out[i] = x[dq[0]]
    return out


def rango_verdadero(h, l, c):
    tr = [h[0] - l[0]]
    for i in range(1, len(c)):
        tr.append(max(h[i] - l[i], abs(h[i] - c[i - 1]), abs(l[i] - c[i - 1])))
    return tr


def atr(h, l, c, n=14):
    return rma(rango_verdadero(h, l, c), n)


def rsi(c, n=14):
    g = [None] + [max(0.0, c[i] - c[i - 1]) for i in range(1, len(c))]
    p = [None] + [max(0.0, c[i - 1] - c[i]) for i in range(1, len(c))]
    mg, mp = rma(g, n), rma(p, n)
    out = [None] * len(c)
    for i in range(len(c)):
        if mg[i] is not None:
            out[i] = 100.0 if mp[i] == 0 else 100 - 100 / (1 + mg[i] / mp[i])
    return out


def adx(h, l, c, n=14):
    """Devuelve (ADX, +DI, -DI)."""
    pdm, mdm = [None], [None]
    for i in range(1, len(c)):
        up, dn = h[i] - h[i - 1], l[i - 1] - l[i]
        pdm.append(up if up > dn and up > 0 else 0.0)
        mdm.append(dn if dn > up and dn > 0 else 0.0)
    tr = [None] + rango_verdadero(h, l, c)[1:]
    a_tr, a_p, a_m = rma(tr, n), rma(pdm, n), rma(mdm, n)
    pdi, mdi, dx = [None] * len(c), [None] * len(c), [None] * len(c)
    for i in range(len(c)):
        if a_tr[i]:
            pdi[i] = 100 * a_p[i] / a_tr[i]
            mdi[i] = 100 * a_m[i] / a_tr[i]
            s = pdi[i] + mdi[i]
            dx[i] = 100 * abs(pdi[i] - mdi[i]) / s if s else 0.0
    return rma(dx, n), pdi, mdi


def macd(c, rapida=12, lenta=26, senal=9):
    """Devuelve (línea, señal, histograma)."""
    a, b = ema(c, rapida), ema(c, lenta)
    linea = [None if a[i] is None or b[i] is None else a[i] - b[i] for i in range(len(c))]
    sg = ema(linea, senal)
    hist = [None if sg[i] is None else linea[i] - sg[i] for i in range(len(c))]
    return linea, sg, hist


def bollinger(c, n=20, k=2.0):
    """Devuelve (media, superior, inferior)."""
    m, d = sma(c, n), desvio(c, n)
    up = [None if m[i] is None else m[i] + k * d[i] for i in range(len(c))]
    lo = [None if m[i] is None else m[i] - k * d[i] for i in range(len(c))]
    return m, up, lo


def keltner(h, l, c, n=20, k=1.5):
    """Devuelve (media, superior, inferior)."""
    m, a = ema(c, n), atr(h, l, c, n)
    up = [None if m[i] is None or a[i] is None else m[i] + k * a[i] for i in range(len(c))]
    lo = [None if m[i] is None or a[i] is None else m[i] - k * a[i] for i in range(len(c))]
    return m, up, lo


def donchian(h, l, n=20):
    """Devuelve (máximo de n velas, mínimo de n velas), incluyendo la vela actual."""
    return maximo(h, n), minimo(l, n)


def estocastico(h, l, c, n=14, d=3):
    """Devuelve (%K, %D)."""
    hh, ll = maximo(h, n), minimo(l, n)
    k = [None] * len(c)
    for i in range(len(c)):
        if hh[i] is not None:
            r = hh[i] - ll[i]
            k[i] = 50.0 if r == 0 else 100 * (c[i] - ll[i]) / r
    return k, sma(k, d)


def cci(h, l, c, n=20):
    tp = [(h[i] + l[i] + c[i]) / 3 for i in range(len(c))]
    m = sma(tp, n)
    out = [None] * len(c)
    for i in range(n - 1, len(c)):
        md = sum(abs(tp[j] - m[i]) for j in range(i - n + 1, i + 1)) / n
        out[i] = 0.0 if md == 0 else (tp[i] - m[i]) / (0.015 * md)
    return out


def williams_r(h, l, c, n=14):
    hh, ll = maximo(h, n), minimo(l, n)
    out = [None] * len(c)
    for i in range(len(c)):
        if hh[i] is not None:
            r = hh[i] - ll[i]
            out[i] = -50.0 if r == 0 else -100 * (hh[i] - c[i]) / r
    return out


def roc(c, n=10):
    return [None if i < n else 100 * (c[i] / c[i - n] - 1) for i in range(len(c))]


def zscore(c, n=20):
    m, d = sma(c, n), desvio(c, n)
    return [None if m[i] is None or not d[i] else (c[i] - m[i]) / d[i] for i in range(len(c))]


def eficiencia(c, n=20):
    """Ratio de eficiencia de Kaufman: 1 = se movió en línea recta, 0 = fue y vino."""
    out = [None] * len(c)
    ruido = 0.0
    paso = [0.0] + [abs(c[i] - c[i - 1]) for i in range(1, len(c))]
    for i in range(1, len(c)):
        ruido += paso[i]
        if i > n:
            ruido -= paso[i - n]
        if i >= n:
            out[i] = 0.0 if ruido == 0 else abs(c[i] - c[i - n]) / ruido
    return out


def supertrend(h, l, c, n=10, m=3.0):
    """Devuelve (línea, dirección +1/-1)."""
    a = atr(h, l, c, n)
    linea, dirc = [None] * len(c), [None] * len(c)
    fu = fl = None
    d = 1
    for i in range(len(c)):
        if a[i] is None:
            continue
        hl2 = (h[i] + l[i]) / 2
        bu, bl = hl2 + m * a[i], hl2 - m * a[i]
        if fu is None:
            fu, fl = bu, bl
        else:
            fu = bu if bu < fu or c[i - 1] > fu else fu
            fl = bl if bl > fl or c[i - 1] < fl else fl
        if d == 1 and c[i] < fl:
            d = -1
        elif d == -1 and c[i] > fu:
            d = 1
        linea[i] = fl if d == 1 else fu
        dirc[i] = d
    return linea, dirc


def volatilidad(c, n=24):
    """Desvío de los retornos logarítmicos de n velas, en porcentaje."""
    r = [None] + [100 * math.log(c[i] / c[i - 1]) for i in range(1, len(c))]
    return desvio(r, n)


def razon_varianza(c, q=4, n=240):
    """Razón de varianza de Lo-MacKinlay: >1 tendencia, <1 reversión, ≈1 azar."""
    r = [None] + [math.log(c[i] / c[i - 1]) for i in range(1, len(c))]
    rq = [None] * len(c)
    for i in range(q, len(c)):
        rq[i] = math.log(c[i] / c[i - q])
    d1, dq = desvio(r, n), desvio(rq, n)
    return [None if d1[i] is None or dq[i] is None or d1[i] == 0 else dq[i] ** 2 / (q * d1[i] ** 2) for i in range(len(c))]


def obv(c, v):
    out = [0.0]
    for i in range(1, len(c)):
        out.append(out[-1] + (v[i] if c[i] > c[i - 1] else -v[i] if c[i] < c[i - 1] else 0))
    return out


# ---------------------------------------------------------------- catálogo (fase de estudio)
CATALOGO = [
    # id, nombre, familia, qué mide, cómo se usa, cuidado, parámetros típicos
    ("sma", "Media móvil simple", "tendencia", "El precio promedio de las últimas n velas.",
     "Dirección de fondo y filtro: operar solo a favor de la media lenta.", "Llega tarde a los giros; en lateral da señales falsas.", "n = 20, 50, 200"),
    ("ema", "Media móvil exponencial", "tendencia", "Promedio que pesa más lo reciente.",
     "Cruces rápida/lenta y filtros de tendencia.", "Más rápida que la simple, también más nerviosa.", "n = 10 a 200"),
    ("macd", "MACD", "tendencia", "Distancia entre dos exponenciales y su propia media.",
     "Cruce de la línea con su señal; histograma como impulso.", "Es un cruce de medias disfrazado: no sumarlo a otro cruce.", "12/26/9"),
    ("adx", "ADX y direccionales", "tendencia", "Qué tan fuerte es la tendencia, sin importar el sentido.",
     "Filtro: seguir tendencia solo con ADX alto, revertir con ADX bajo.", "No dice dirección; los DI sí.", "n = 14, umbral 20–25"),
    ("supertrend", "Supertrend", "tendencia", "Un piso o techo que sigue al precio a k veces el ATR.",
     "Dirección y stop dinámico.", "En lateral se da vuelta seguido.", "n = 10, k = 3"),
    ("donchian", "Canal de Donchian", "ruptura", "Máximo y mínimo de las últimas n velas.",
     "Ruptura del máximo para entrar, del mínimo corto para salir.", "Muchas rupturas falsas; necesita stop y paciencia.", "entrada 20–55, salida 10–20"),
    ("rsi", "RSI", "momento", "Proporción de subas sobre bajas recientes, de 0 a 100.",
     "Extremos (<30, >70) para revertir; cruce de 50 como impulso.", "En tendencia fuerte queda en extremo mucho tiempo.", "n = 2, 7, 14"),
    ("estocastico", "Estocástico", "momento", "Dónde cerró el precio dentro del rango de n velas.",
     "Retrocesos dentro de una tendencia (comprar %K < 20 si la tendencia es alcista).", "Muy ruidoso solo.", "14/3"),
    ("roc", "Tasa de cambio", "momento", "Cuánto cambió el precio en n velas, en %.",
     "Momento de serie de tiempo: ir a favor del signo.", "Sensible al largo elegido.", "n = 24 a 336 velas"),
    ("cci", "CCI", "momento", "Distancia del precio típico a su media, en desvíos medios.",
     "Extremos ±100 para revertir o romper.", "Escala abierta; los umbrales cambian según el activo.", "n = 20"),
    ("williams_r", "Williams %R", "momento", "Como el estocástico, invertido de 0 a −100.",
     "Sobrecompra y sobreventa de corto plazo.", "Redundante con el estocástico: usar uno.", "n = 14"),
    ("atr", "ATR", "volatilidad", "El rango promedio de las velas, con huecos.",
     "Tamaño del stop y de la posición; filtro de volatilidad.", "No dice dirección.", "n = 14"),
    ("bollinger", "Bandas de Bollinger", "volatilidad", "Media ± k desvíos estándar.",
     "Volver a la media desde la banda, o romper tras una compresión.", "Las dos lecturas son opuestas: definir cuál antes.", "20, k = 2"),
    ("keltner", "Canal de Keltner", "volatilidad", "Exponencial ± k veces el ATR.",
     "Rupturas de volatilidad; con Bollinger detecta compresiones.", "Parecido a Bollinger, más suave.", "20, k = 1,5"),
    ("volatilidad", "Volatilidad realizada", "volatilidad", "Desvío de los retornos recientes.",
     "Filtrar regímenes demasiado quietos o demasiado agitados.", "Cambia con la sesión del día.", "n = 24"),
    ("zscore", "Puntaje z", "estadística", "Cuántos desvíos está el precio de su media.",
     "Reversión: comprar en z < −2, salir en 0.", "Supone que hay una media estable.", "n = 24 a 96"),
    ("eficiencia", "Eficiencia de Kaufman", "régimen", "Avance neto dividido el recorrido total, de 0 a 1.",
     "Decidir si el mercado está en tendencia o en lateral.", "Umbral depende del activo.", "n = 24 a 96"),
    ("razon_varianza", "Razón de varianza", "régimen", "Si los movimientos se acumulan (>1) o se deshacen (<1).",
     "Diagnóstico de régimen: elegir la familia de estrategia.", "Necesita ventanas largas.", "q = 4, n = 240"),
    ("obv", "Balance de volumen", "volumen", "Volumen acumulado con signo de la vela.",
     "Confirmar rupturas con volumen.", "En CFD y forex el volumen es de ticks, no real.", "—"),
]


class Ctx:
    """Calcula cada indicador una sola vez por serie y lo reutiliza entre variantes."""

    def __init__(self, serie):
        self.s = serie
        self._c = {}

    def __call__(self, nombre, *args):
        clave = (nombre,) + args
        if clave not in self._c:
            s = self.s
            f = {
                "sma": lambda n: sma(s.c, n), "ema": lambda n: ema(s.c, n),
                "atr": lambda n: atr(s.h, s.l, s.c, n), "rsi": lambda n: rsi(s.c, n),
                "adx": lambda n: adx(s.h, s.l, s.c, n), "macd": lambda a, b, g: macd(s.c, a, b, g),
                "bollinger": lambda n, k: bollinger(s.c, n, k), "keltner": lambda n, k: keltner(s.h, s.l, s.c, n, k),
                "donchian": lambda n: donchian(s.h, s.l, n), "estocastico": lambda n, d: estocastico(s.h, s.l, s.c, n, d),
                "cci": lambda n: cci(s.h, s.l, s.c, n), "williams_r": lambda n: williams_r(s.h, s.l, s.c, n),
                "roc": lambda n: roc(s.c, n), "zscore": lambda n: zscore(s.c, n),
                "eficiencia": lambda n: eficiencia(s.c, n), "supertrend": lambda n, m: supertrend(s.h, s.l, s.c, n, m),
                "volatilidad": lambda n: volatilidad(s.c, n), "razon_varianza": lambda q, n: razon_varianza(s.c, q, n),
                "obv": lambda: obv(s.c, s.v),
            }[nombre]
            self._c[clave] = f(*args)
        return self._c[clave]
