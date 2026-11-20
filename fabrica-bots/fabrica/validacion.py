"""La vara estadística y las pruebas de robustez (estación 5).

- Sharpe deflactado (Bailey y López de Prado, 2014) con N efectivo por agrupamiento.
- CSCV: probabilidad de sobreajuste (PBO) y probabilidad de pérdida fuera de muestra.
- Walk-forward anclado sobre la familia de variantes.
- Monte Carlo de operaciones, prueba de ruido, comparación contra azar y vecindario de parámetros.
"""
from __future__ import annotations

import itertools
import math
import random
from statistics import NormalDist

from .motor import caida_maxima, momentos, sharpe

_N = NormalDist()
EULER = 0.5772156649015329


# ---------------------------------------------------------------- vara
def sharpe_umbral(n_eff: float, var_sr: float) -> float:
    """SR₀: el Sharpe que se espera del mejor de N intentos sin ventaja."""
    if n_eff <= 1 or var_sr <= 0:
        return 0.0
    return math.sqrt(var_sr) * ((1 - EULER) * _N.inv_cdf(1 - 1 / n_eff) + EULER * _N.inv_cdf(1 - 1 / (n_eff * math.e)))


def sharpe_deflactado(retornos: list, n_eff: float, var_sr: float) -> dict:
    """DSR: probabilidad de que el Sharpe real supere SR₀. Sharpe sin anualizar."""
    t = len(retornos)
    m, sd, g3, g4 = momentos(retornos)
    sr = 0.0 if sd == 0 else m / sd
    sr0 = sharpe_umbral(n_eff, var_sr)
    den = 1 - g3 * sr + (g4 - 1) / 4 * sr * sr
    if t < 3 or den <= 0:
        return {"dsr": 0.0, "sr": sr, "sr0": sr0, "t": t}
    z = (sr - sr0) * math.sqrt(t - 1) / math.sqrt(den)
    return {"dsr": _N.cdf(z), "sr": sr, "sr0": sr0, "t": t, "asimetria": g3, "curtosis": g4}


def _normalizar(x):
    m, sd, _, _ = momentos(x)
    if sd == 0:
        return None
    return [(v - m) / sd for v in x]


def agrupar_pruebas(series: list, umbral: float = 0.5) -> dict:
    """N efectivo: agrupa pruebas cuyas series de retornos se parecen.

    Cada grupo cuenta como una prueba independiente. V es la varianza del Sharpe de la serie
    promedio de cada grupo. También devuelve la razón de participación N²/Σρ² como control."""
    zs = [(i, _normalizar(s)) for i, s in enumerate(series)]
    zs = [(i, z) for i, z in zs if z is not None]
    if not zs:
        return {"n_total": len(series), "n_validas": 0, "n_eff": 1, "var_sr": 0.0, "participacion": 1.0, "grupos": []}
    t = len(zs[0][1])
    grupos = []  # [lider_z, [indices]]
    for i, z in zs:
        for g in grupos:
            if sum(a * b for a, b in zip(z, g[0])) / t >= umbral:
                g[1].append(i)
                break
        else:
            grupos.append([z, [i]])
    reps = []
    for _, miembros in grupos:
        prom = [sum(series[j][k] for j in miembros) / len(miembros) for k in range(t)]
        reps.append(sharpe(prom))
    m = sum(reps) / len(reps)
    var = sum((r - m) ** 2 for r in reps) / (len(reps) - 1) if len(reps) > 1 else 0.0
    # razón de participación (con una muestra si son muchas)
    muestra = zs if len(zs) <= 150 else random.Random(0).sample(zs, 150)
    s2 = 0.0
    for a in range(len(muestra)):
        for b in range(len(muestra)):
            rho = 1.0 if a == b else sum(x * y for x, y in zip(muestra[a][1], muestra[b][1])) / t
            s2 += rho * rho
    pr = len(muestra) ** 2 / s2 * (len(zs) / len(muestra))
    return {"n_total": len(series), "n_validas": len(zs), "n_eff": len(grupos), "var_sr": var,
            "participacion": round(pr, 1), "grupos": [g[1] for g in grupos]}


# ---------------------------------------------------------------- CSCV
def cscv(matriz: list, bloques: int = 10) -> dict:
    """matriz[variante][día]. Devuelve PBO y la probabilidad de que la elegida pierda fuera."""
    nv = len(matriz)
    t = len(matriz[0]) if nv else 0
    if nv == 0 or t < bloques * 5:
        return {"pbo": None, "prob_perdida": None, "combinaciones": 0}
    tam = t // bloques
    est = []  # est[v][b] = (suma, suma2, n)
    for v in range(nv):
        fila = []
        for b in range(bloques):
            seg = matriz[v][b * tam:(b + 1) * tam] if b < bloques - 1 else matriz[v][b * tam:]
            fila.append((sum(seg), sum(x * x for x in seg), len(seg)))
        est.append(fila)

    def sr(v, bs):
        s = sum(est[v][b][0] for b in bs); s2 = sum(est[v][b][1] for b in bs); n = sum(est[v][b][2] for b in bs)
        m = s / n
        var = s2 / n - m * m
        return 0.0 if var <= 1e-18 else m / math.sqrt(var)

    lambdas, perdidas, combos = [], 0, 0
    for dentro in itertools.combinations(range(bloques), bloques // 2):
        fuera = [b for b in range(bloques) if b not in dentro]
        sr_in = [sr(v, dentro) for v in range(nv)]
        mejor = max(range(nv), key=sr_in.__getitem__)
        sr_out = [sr(v, fuera) for v in range(nv)]
        combos += 1
        if sr_out[mejor] <= 0:
            perdidas += 1
        if nv > 1:
            rango = sum(1 for v in range(nv) if sr_out[v] < sr_out[mejor]) + 1
            w = rango / (nv + 1)
            lambdas.append(math.log(w / (1 - w)))
    pbo = sum(1 for x in lambdas if x <= 0) / len(lambdas) if lambdas else None
    return {"pbo": pbo, "prob_perdida": perdidas / combos, "combinaciones": combos}


# ---------------------------------------------------------------- walk-forward
def walk_forward(matriz: list, pliegues: int = 5) -> dict:
    """Anclado: en cada pliegue elige la mejor variante con todo lo anterior y la mide en el siguiente."""
    nv = len(matriz)
    t = len(matriz[0])
    tam = t // (pliegues + 1)
    fuera, positivos, elegidas = [], 0, []
    for k in range(1, pliegues + 1):
        a, b = k * tam, (k + 1) * tam if k < pliegues else t
        mejor = max(range(nv), key=lambda v: sharpe(matriz[v][:a]))
        seg = matriz[mejor][a:b]
        elegidas.append(mejor)
        fuera.extend(seg)
        if sum(seg) > 0:
            positivos += 1
    sr_in = max(sharpe(matriz[v][:t]) for v in range(nv))
    sr_out = sharpe(fuera)
    return {"sharpe_fuera_anual": round(sr_out * math.sqrt(252), 2), "eficiencia": round(sr_out / sr_in, 2) if sr_in > 0 else 0.0,
            "pliegues_positivos": positivos, "pliegues": pliegues, "elegidas": elegidas}


# ---------------------------------------------------------------- Monte Carlo
def montecarlo(r_ops: list, f: float = 0.01, n: int = 1000, semilla: int = 0) -> dict:
    """Remuestrea las operaciones: qué pasa si el orden y la mezcla hubieran sido otros."""
    if len(r_ops) < 5:
        return {"neto_p5": None, "caida_p95": None}
    rnd = random.Random(semilla)
    netos, caidas = [], []
    for _ in range(n):
        m = [rnd.choice(r_ops) for _ in r_ops]
        netos.append(sum(m))
        caidas.append(caida_maxima(m, f))
    netos.sort(); caidas.sort()
    return {"neto_p5": round(netos[int(0.05 * n)], 2), "neto_p50": round(netos[n // 2], 2),
            "caida_p95": round(caidas[int(0.95 * n)], 2), "caida_p50": round(caidas[n // 2], 2)}


def banda_montecarlo(r_ops: list, n_ops: int, n: int = 500, semilla: int = 0) -> list:
    """Banda 5%–95% del neto acumulado operación a operación (para comparar la demo)."""
    rnd = random.Random(semilla)
    caminos = []
    for _ in range(n):
        acc, cam = 0.0, []
        for _ in range(n_ops):
            acc += rnd.choice(r_ops)
            cam.append(acc)
        caminos.append(cam)
    banda = []
    for k in range(n_ops):
        col = sorted(c[k] for c in caminos)
        banda.append((col[int(0.05 * n)], col[int(0.95 * n)]))
    return banda


# ---------------------------------------------------------------- ruido y azar
def serie_con_ruido(serie, fraccion: float, semilla: int):
    """Mueve cada vela entera un poco (fracción del rango típico) para ver si la ventaja depende del detalle."""
    rnd = random.Random(semilla)
    rangos = sorted(serie.h[i] - serie.l[i] for i in range(len(serie)))
    escala = rangos[len(rangos) // 2] * fraccion
    o, h, l, c = [], [], [], []
    for i in range(len(serie)):
        e = rnd.gauss(0, escala)
        o.append(serie.o[i] + e); h.append(serie.h[i] + e); l.append(serie.l[i] + e); c.append(serie.c[i] + e)
    return serie.con_precios(o, h, l, c, sufijo=f"+ruido{semilla}")


def posiciones_azar(n: int, prob: float, duracion: float, semilla: int) -> list:
    rnd = random.Random(semilla)
    pos, d, resto = [0] * n, 0, 0
    for i in range(n):
        if d == 0:
            if rnd.random() < prob:
                d = 1 if rnd.random() < 0.5 else -1
                resto = max(1, int(rnd.expovariate(1 / duracion)))
        else:
            resto -= 1
            if resto <= 0:
                d = 0
        pos[i] = d
    return pos


def vecinos(variantes: list, elegida: dict, grilla: dict) -> list:
    """Variantes que difieren de la elegida en un solo parámetro, un paso de la grilla."""
    out = []
    for v in variantes:
        dif = [k for k in grilla if v[k] != elegida[k]]
        if len(dif) == 1:
            k = dif[0]
            if abs(grilla[k].index(v[k]) - grilla[k].index(elegida[k])) == 1:
                out.append(v)
    return out


def percentil(valor, muestra):
    if not muestra:
        return None
    return 100 * sum(1 for x in muestra if x < valor) / len(muestra)
