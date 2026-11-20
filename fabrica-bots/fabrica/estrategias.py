"""Catálogo de estrategias (estación 1: ideas) y generador de bots (estación 2: ensamblado).

Cada estrategia es una ficha con su lógica de mercado en una frase, sus indicadores y una
grilla chica de parámetros. Cada combinación de la grilla es un bot. Toda la familia de
variantes cuenta como pruebas para la vara estadística.

Una estrategia devuelve, para cada vela t, la posición deseada al cierre (+1, 0, −1) y la
distancia del stop. El motor la ejecuta en la apertura de t+1: nunca mira el futuro.
"""
from __future__ import annotations

import itertools
import random
from dataclasses import dataclass, field


@dataclass
class Estrategia:
    id: str
    nombre: str
    familia: str          # tendencia, ruptura, reversión, momento, volatilidad, régimen, control
    logica: str           # por qué debería existir la ventaja, en una frase
    indicadores: list
    grilla: dict
    regla: callable
    stop_atr: float = 3.0
    control: bool = False
    entrada: str = ""
    salida: str = ""
    referencia: str = ""

    def variantes(self) -> list[dict]:
        claves = list(self.grilla)
        return [dict(zip(claves, combo)) for combo in itertools.product(*(self.grilla[k] for k in claves))]

    def senales(self, ctx, p: dict) -> tuple[list, list]:
        pos = self.regla(ctx, p)
        a = ctx("atr", 14)
        stop = [None if x is None else x * self.stop_atr for x in a]
        return pos, stop


def _signo(x):
    return 1 if x > 0 else -1 if x < 0 else 0


# ---------------------------------------------------------------- reglas
def r_cruce(ctx, p):
    f, s = ctx("ema", p["rapida"]), ctx("ema", p["lenta"])
    return [0 if s[i] is None else (1 if f[i] > s[i] else -1) for i in range(len(f))]


def r_donchian(ctx, p):
    c = ctx.s.c
    hh, _ = ctx("donchian", p["entrada"])
    _, ll = ctx("donchian", p["salida"])
    hh2, _ = ctx("donchian", p["salida"])
    _, ll2 = ctx("donchian", p["entrada"])
    pos, d = [0] * len(c), 0
    for i in range(1, len(c)):
        if hh[i - 1] is None:
            continue
        if d == 0:
            d = 1 if c[i] > hh[i - 1] else -1 if c[i] < ll2[i - 1] else 0
        elif d == 1 and c[i] < ll[i - 1]:
            d = 0
        elif d == -1 and c[i] > hh2[i - 1]:
            d = 0
        pos[i] = d
    return pos


def r_momento(ctx, p):
    r = ctx("roc", p["largo"])
    fuerza = ctx("adx", 14)[0]
    out = []
    for i in range(len(r)):
        if r[i] is None or fuerza[i] is None or fuerza[i] < p["adx_min"]:
            out.append(0)
        else:
            out.append(_signo(r[i]))
    return out


def r_macd(ctx, p):
    linea, sg, _ = ctx("macd", p["rapida"], p["lenta"], p["senal"])
    filtro = ctx("ema", 200)
    c = ctx.s.c
    out = []
    for i in range(len(c)):
        if sg[i] is None or (p["filtro"] and filtro[i] is None):
            out.append(0)
            continue
        d = 1 if linea[i] > sg[i] else -1
        if p["filtro"] and _signo(c[i] - filtro[i]) != d:
            d = 0
        out.append(d)
    return out


def r_supertrend(ctx, p):
    _, d = ctx("supertrend", p["n"], p["k"])
    return [0 if x is None else x for x in d]


def r_rsi(ctx, p):
    r = ctx("rsi", p["n"])
    bajo, alto = p["bajo"], 100 - p["bajo"]
    pos, d = [0] * len(r), 0
    for i in range(len(r)):
        if r[i] is None:
            continue
        if d == 0:
            d = 1 if r[i] < bajo else -1 if r[i] > alto else 0
        elif d == 1 and r[i] > 50 or d == -1 and r[i] < 50:
            d = 0
        pos[i] = d
    return pos


def r_bollinger(ctx, p):
    m, up, lo = ctx("bollinger", p["n"], p["k"])
    c = ctx.s.c
    pos, d = [0] * len(c), 0
    for i in range(len(c)):
        if m[i] is None:
            continue
        if d == 0:
            d = 1 if c[i] < lo[i] else -1 if c[i] > up[i] else 0
        elif d == 1 and c[i] > m[i] or d == -1 and c[i] < m[i]:
            d = 0
        pos[i] = d
    return pos


def r_zscore(ctx, p):
    z = ctx("zscore", p["n"])
    pos, d = [0] * len(z), 0
    for i in range(len(z)):
        if z[i] is None:
            continue
        if d == 0:
            d = 1 if z[i] < -p["entrada"] else -1 if z[i] > p["entrada"] else 0
        elif d == 1 and z[i] > 0 or d == -1 and z[i] < 0:
            d = 0
        pos[i] = d
    return pos


def r_retroceso(ctx, p):
    k, _ = ctx("estocastico", p["n"], 3)
    tend = ctx("ema", p["tendencia"])
    c = ctx.s.c
    pos, d = [0] * len(c), 0
    for i in range(1, len(c)):
        if tend[i] is None or k[i - 1] is None:
            continue
        arriba = c[i] > tend[i]
        if d == 0:
            if arriba and k[i - 1] < 20 <= k[i]:
                d = 1
            elif not arriba and k[i - 1] > 80 >= k[i]:
                d = -1
        elif d == 1 and (k[i] > 80 or not arriba) or d == -1 and (k[i] < 20 or arriba):
            d = 0
        pos[i] = d
    return pos


def r_compresion(ctx, p):
    m, bu, bl = ctx("bollinger", p["n"], 2.0)
    _, ku, kl = ctx("keltner", p["n"], p["keltner"])
    c = ctx.s.c
    pos, d, ultima = [0] * len(c), 0, -999
    for i in range(len(c)):
        if m[i] is None or ku[i] is None:
            continue
        if bu[i] < ku[i] and bl[i] > kl[i]:
            ultima = i
        if d == 0 and i - ultima <= 5:
            d = 1 if c[i] > bu[i] else -1 if c[i] < bl[i] else 0
        elif d == 1 and c[i] < m[i] or d == -1 and c[i] > m[i]:
            d = 0
        pos[i] = d
    return pos


def r_keltner(ctx, p):
    m, up, lo = ctx("keltner", p["n"], p["k"])
    c = ctx.s.c
    pos, d = [0] * len(c), 0
    for i in range(len(c)):
        if up[i] is None:
            continue
        if d == 0:
            d = 1 if c[i] > up[i] else -1 if c[i] < lo[i] else 0
        elif d == 1 and c[i] < m[i] or d == -1 and c[i] > m[i]:
            d = 0
        pos[i] = d
    return pos


def r_regimen(ctx, p):
    er = ctx("eficiencia", p["n"])
    lenta = ctx("ema", 50)
    z = ctx("zscore", 48)
    c = ctx.s.c
    out = []
    for i in range(len(c)):
        if er[i] is None or lenta[i] is None or z[i] is None:
            out.append(0)
        elif er[i] >= p["umbral"]:
            out.append(1 if c[i] > lenta[i] else -1)
        else:
            out.append(1 if z[i] < -1.5 else -1 if z[i] > 1.5 else 0)
    return out


def r_azar(ctx, p):
    """Control: entra al azar y sostiene unas velas. No puede tener ventaja."""
    rnd = random.Random(p["semilla"])
    n = len(ctx.s)
    pos, d, resto = [0] * n, 0, 0
    for i in range(n):
        u, lado = rnd.random(), rnd.random()
        if d == 0 and u < 1 / 60:
            d, resto = (1 if lado < 0.5 else -1), 48
        elif d != 0:
            resto -= 1
            if resto <= 0:
                d = 0
        pos[i] = d
    return pos


def r_una_vela(ctx, p):
    """Control: va contra la última vela. Gana antes de costos en datos con reversión corta."""
    c = ctx.s.c
    return [0] + [-_signo(c[i] - c[i - 1]) for i in range(1, len(c))]


# ---------------------------------------------------------------- catálogo
CATALOGO = [
    Estrategia("T01", "Cruce de medias exponenciales", "tendencia",
               "Los precios con impulso tienden a seguir en la misma dirección un tiempo; la media rápida sobre la lenta lo detecta.",
               ["ema", "atr"], {"rapida": [10, 20, 40], "lenta": [100, 200, 400]}, r_cruce, 4.0,
               entrada="Comprado si la exponencial rápida está arriba de la lenta, vendido si está abajo.",
               salida="Al cruzarse al revés o en el stop de 4 ATR.", referencia="Seguimiento de tendencia clásico (Covel, Hurst/Ooi/Pedersen)."),
    Estrategia("T02", "Ruptura de Donchian", "ruptura",
               "Romper el máximo de varias semanas indica un desequilibrio que suele continuar.",
               ["donchian", "atr"], {"entrada": [55, 120, 240], "salida": [20, 60]}, r_donchian, 4.0,
               entrada="Cierre arriba del máximo de n velas (o abajo del mínimo).", salida="Ruptura del canal corto en contra o stop.",
               referencia="Reglas tipo Tortugas (Faith)."),
    Estrategia("T03", "Momento de serie de tiempo", "momento",
               "El retorno pasado de un activo predice levemente el futuro en horizontes de días a meses.",
               ["roc", "adx", "atr"], {"largo": [48, 120, 240, 480], "adx_min": [0, 20]}, r_momento, 4.0,
               entrada="A favor del signo de la tasa de cambio, si el ADX supera el mínimo.", salida="Cuando cambia el signo o el ADX cae.",
               referencia="Moskowitz, Ooi y Pedersen (2012)."),
    Estrategia("T04", "MACD con filtro de tendencia", "tendencia",
               "El cruce del MACD capta aceleraciones; el filtro de la media de 200 evita ir contra el fondo.",
               ["macd", "ema", "atr"], {"rapida": [12, 48], "lenta": [26, 104], "senal": [9], "filtro": [0, 1]}, r_macd, 4.0,
               entrada="Línea MACD sobre su señal (y precio sobre la media de 200 si hay filtro).", salida="Cruce al revés o stop."),
    Estrategia("T05", "Supertrend", "tendencia",
               "Un piso móvil a k ATR deja correr las tendencias y corta cuando el precio lo rompe.",
               ["supertrend", "atr"], {"n": [10, 30], "k": [3.0, 5.0, 8.0]}, r_supertrend, 4.0,
               entrada="En la dirección del Supertrend.", salida="Cuando se da vuelta o stop."),
    Estrategia("R01", "RSI en extremos", "reversión",
               "Tras una racha de subas o bajas muy concentrada, parte del movimiento se deshace.",
               ["rsi", "atr"], {"n": [7, 14], "bajo": [20, 30]}, r_rsi, 2.0,
               entrada="Compra con RSI bajo el umbral, vende sobre 100 − umbral.", salida="Cuando el RSI cruza 50 o stop.",
               referencia="Connors y Alvarez, reversión de corto plazo."),
    Estrategia("R02", "Vuelta desde la banda de Bollinger", "reversión",
               "Los cierres fuera de dos desvíos son poco frecuentes y tienden a volver a la media.",
               ["bollinger", "atr"], {"n": [20, 50], "k": [2.0, 2.5]}, r_bollinger, 2.0,
               entrada="Cierre bajo la banda inferior (o sobre la superior).", salida="Al tocar la media o stop."),
    Estrategia("R03", "Puntaje z contra la media", "reversión",
               "Si el precio oscila alrededor de un valor justo, alejarse varios desvíos es una oportunidad de vuelta.",
               ["zscore", "atr"], {"n": [24, 48, 96], "entrada": [1.5, 2.0]}, r_zscore, 2.0,
               entrada="z menor que −umbral compra, mayor que +umbral vende.", salida="Cuando z vuelve a 0 o stop."),
    Estrategia("R04", "Retroceso en tendencia", "momento",
               "Dentro de una tendencia los retrocesos cortos se compran: se entra a favor con mejor precio.",
               ["estocastico", "ema", "atr"], {"n": [14, 28], "tendencia": [100, 200]}, r_retroceso, 3.0,
               entrada="Tendencia alcista y el estocástico sale de sobreventa (y al revés).", salida="Estocástico en el otro extremo, fin de la tendencia o stop."),
    Estrategia("V01", "Ruptura tras compresión", "volatilidad",
               "La volatilidad se alterna: después de un período quieto suele venir uno amplio.",
               ["bollinger", "keltner", "atr"], {"n": [20, 40], "keltner": [1.5, 2.0]}, r_compresion, 3.0,
               entrada="Bollinger dentro de Keltner en las últimas 5 velas y cierre fuera de la banda.", salida="Vuelta a la media o stop.",
               referencia="«Squeeze» de Carter."),
    Estrategia("V02", "Ruptura del canal de Keltner", "volatilidad",
               "Un cierre a varios ATR de la media marca una expansión que tiende a seguir.",
               ["keltner", "atr"], {"n": [20, 50], "k": [1.5, 2.5]}, r_keltner, 3.0,
               entrada="Cierre arriba de la banda superior (o abajo de la inferior).", salida="Vuelta a la media o stop."),
    Estrategia("G01", "Cambio de régimen por eficiencia", "régimen",
               "Cuando el mercado avanza derecho conviene seguirlo; cuando va y viene, conviene revertir.",
               ["eficiencia", "ema", "zscore", "atr"], {"n": [24, 96], "umbral": [0.3, 0.5]}, r_regimen, 3.0,
               entrada="Eficiencia alta: a favor de la media de 50. Baja: puntaje z de 48 en ±1,5.", salida="Cuando cambia la condición o stop."),
]

CONTROLES = {
    "azar": Estrategia("C01", "Entradas al azar", "control",
                       "Ninguna: entra por sorteo. Sirve para ver si la fábrica rechaza lo que no tiene ventaja.",
                       ["atr"], {"semilla": [1]}, r_azar, 3.0, control=True,
                       entrada="Sorteo con probabilidad 1/60 por vela.", salida="48 velas después o stop."),
    "una_vela": Estrategia("C02", "Contra la última vela", "control",
                           "Va contra la vela anterior. Solo gana antes de costos si hay reversión de una vela.",
                           ["atr"], {"modo": [1]}, r_una_vela, 2.0, control=True,
                           entrada="Contra el signo de la última vela.", salida="En la vela siguiente si cambia el signo, o stop."),
}


def azar_optimizado(n: int = 200) -> Estrategia:
    """Control C: n semillas al azar y quedarse con la mejor. Sobreajuste puro."""
    e = CONTROLES["azar"]
    return Estrategia("C03", "Azar optimizado", "control",
                      f"Ninguna: se prueban {n} sorteos y se elige el mejor en entrenamiento. Debe caer en robustez.",
                      ["atr"], {"semilla": list(range(1, n + 1))}, r_azar, 3.0, control=True,
                      entrada=e.entrada, salida=e.salida)


def por_id(eid: str) -> Estrategia:
    for e in CATALOGO + list(CONTROLES.values()):
        if e.id == eid:
            return e
    if eid == "C03":
        return azar_optimizado()
    raise KeyError(eid)
