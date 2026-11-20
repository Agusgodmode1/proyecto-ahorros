"""Motor de backtest determinista, vela a vela.

Reglas fijas (no dependen de la estrategia):
- La decisión se toma al cierre de la vela t y se ejecuta en la apertura de t+1.
- Precios bid; la compra paga el spread. Deslizamiento en cada ejecución y comisión por operación.
- El stop se revisa dentro de cada vela con el máximo y el mínimo. Si hay hueco, se llena peor.
- Tras un stop no se vuelve a entrar en el mismo sentido hasta que la señal cambie.
- Todo resultado está en R: 1R es la distancia del stop al entrar (lo que se arriesga).
"""
from __future__ import annotations

import math
from dataclasses import dataclass, asdict


@dataclass
class Costos:
    spread: float = 1.0       # pips
    comision: float = 0.7     # pips por operación (ida y vuelta)
    deslizamiento: float = 0.2  # pips por ejecución

    def total_pips(self):
        return self.spread + self.comision + 2 * self.deslizamiento


@dataclass
class Operacion:
    entrada_i: int
    salida_i: int
    lado: int
    entrada: float
    salida: float
    stop: float
    riesgo: float      # distancia del stop en precio
    r: float           # resultado neto en R
    costo_r: float     # cuánto de R se fue en costos
    motivo: str        # señal, stop, fin


@dataclass
class Resultado:
    operaciones: list
    senales: int
    descartes: dict
    diario: list       # [(día, R del día)]
    velas: int
    expuesto: int
    metricas: dict

    def r(self):
        return [o.r for o in self.operaciones]


def correr(serie, pos, stop, costos: Costos, desde: int = 0, hasta: int | None = None,
           riesgo_por_op: float = 0.01) -> Resultado:
    hasta = len(serie) if hasta is None else hasta
    o, h, l, c = serie.o, serie.h, serie.l, serie.c
    pip = serie.pip
    spread, slip, com = costos.spread * pip, costos.deslizamiento * pip, costos.comision * pip
    ops, descartes = [], {}
    senales = 0
    lado, entrada, sl, riesgo, ent_i, ref, costo_ent = 0, 0.0, 0.0, 0.0, 0, 0.0, 0.0
    bloqueo, previo = 0, 0
    mtm = [0.0] * (hasta - desde)
    expuesto = 0

    def cerrar(i, precio, motivo):
        nonlocal lado
        k = i - desde
        mtm[k] += (precio - ref) * lado / riesgo - com / riesgo
        bruto = (precio - entrada) * lado / riesgo
        neto = bruto - com / riesgo
        costo = costo_ent + com / riesgo + slip / riesgo
        ops.append(Operacion(ent_i, i, lado, entrada, precio, sl, riesgo, neto, costo, motivo))
        lado = 0

    for i in range(desde, hasta):
        k = i - desde
        deseo = pos[i - 1] if i > desde else 0
        if deseo != previo:
            senales += 1
            previo = deseo
        if bloqueo:
            if deseo == bloqueo:
                deseo = 0
            else:
                bloqueo = 0
        # 1) apertura: ejecutar lo decidido al cierre anterior
        if deseo != lado:
            if lado == 1:
                cerrar(i, o[i] - slip, "señal")
            elif lado == -1:
                cerrar(i, o[i] + spread + slip, "señal")
            if deseo != 0:
                d = stop[i - 1]
                if d is None or d <= 0:
                    descartes["calentamiento o stop inválido"] = descartes.get("calentamiento o stop inválido", 0) + 1
                else:
                    lado, ent_i, riesgo = deseo, i, d
                    if lado == 1:
                        entrada = o[i] + spread + slip
                        sl = entrada - d
                        ref = o[i]
                    else:
                        entrada = o[i] - slip
                        sl = entrada + d
                        ref = o[i] + spread
                    mtm[k] += (ref - entrada) * lado / riesgo
                    costo_ent = (spread + slip) / riesgo
        # 2) dentro de la vela: stop
        if lado == 1 and l[i] <= sl:
            cerrar(i, min(o[i], sl) - slip, "stop")
            bloqueo = 1
        elif lado == -1 and h[i] + spread >= sl:
            cerrar(i, max(o[i] + spread, sl) + slip, "stop")
            bloqueo = -1
        # 3) cierre: valuar lo abierto
        if lado != 0:
            expuesto += 1
            marca = c[i] if lado == 1 else c[i] + spread
            mtm[k] += (marca - ref) * lado / riesgo
            ref = marca
    if lado != 0:
        ref_fin = ref
        cerrar(hasta - 1, ref_fin, "fin")
    dias = serie.dias()
    diario, dia_act, acc = [], None, 0.0
    for k, v in enumerate(mtm):
        d = dias[desde + k]
        if d != dia_act:
            if dia_act is not None:
                diario.append((dia_act, acc))
            dia_act, acc = d, 0.0
        acc += v
    if dia_act is not None:
        diario.append((dia_act, acc))
    res = Resultado(ops, senales, descartes, diario, hasta - desde, expuesto, {})
    res.metricas = metricas(res, riesgo_por_op)
    return res


def momentos(x):
    n = len(x)
    if n < 2:
        return 0.0, 0.0, 0.0, 3.0
    m = sum(x) / n
    var = sum((v - m) ** 2 for v in x) / n
    if var <= 0:
        return m, 0.0, 0.0, 3.0
    sd = math.sqrt(var)
    asim = sum(((v - m) / sd) ** 3 for v in x) / n
    curt = sum(((v - m) / sd) ** 4 for v in x) / n
    return m, sd, asim, curt


def sharpe(x):
    m, sd, _, _ = momentos(x)
    return 0.0 if sd == 0 else m / sd


def caida_maxima(diario_r, f):
    """Caída máxima en % con interés compuesto, arriesgando f por cada R."""
    eq = pico = 1.0
    dd = 0.0
    for r in diario_r:
        eq *= max(1e-9, 1 + f * r)
        pico = max(pico, eq)
        dd = max(dd, 1 - eq / pico)
    return 100 * dd


def metricas(res: Resultado, f: float = 0.01) -> dict:
    r = res.r()
    n = len(r)
    gan = sum(x for x in r if x > 0)
    per = -sum(x for x in r if x < 0)
    pf = (gan / per if per > 0 else (99.0 if gan > 0 else 0.0))
    bruto = [op.r + op.costo_r for op in res.operaciones]
    gb, pb = sum(x for x in bruto if x > 0), -sum(x for x in bruto if x < 0)
    pf_bruto = (gb / pb if pb > 0 else (99.0 if gb > 0 else 0.0))
    diario = [x for _, x in res.diario]
    m, sd, asim, curt = momentos(diario)
    racha = mx = 0
    for x in r:
        racha = racha + 1 if x <= 0 else 0
        mx = max(mx, racha)
    dias = max(1, len(diario))
    duracion = sum(op.salida_i - op.entrada_i + 1 for op in res.operaciones)
    return {
        "operaciones": n,
        "pf": round(min(pf, 99.0), 3),
        "pf_bruto": round(min(pf_bruto, 99.0), 3),
        "neto_r": round(sum(r), 2),
        "bruto_r": round(sum(bruto), 2),
        "acierto": round(100 * sum(1 for x in r if x > 0) / n, 1) if n else 0.0,
        "expectativa_r": round(sum(r) / n, 3) if n else 0.0,
        "caida_max_pct": round(caida_maxima(diario, f), 2),
        "sharpe_diario": round(m / sd, 4) if sd else 0.0,
        "sharpe_anual": round(m / sd * math.sqrt(252), 2) if sd else 0.0,
        "asimetria": round(asim, 3),
        "curtosis": round(curt, 3),
        "costo_medio_r": round(sum(op.costo_r for op in res.operaciones) / n, 3) if n else 0.0,
        "racha_perdedora": mx,
        "exposicion_pct": round(100 * res.expuesto / max(1, res.velas), 1),
        "ops_por_mes": round(n / (dias / 21), 2),
        "duracion_media": round(duracion / n, 1) if n else 0.0,
        "dias": len(diario),
        "senales": res.senales,
        "retorno_pct": round(100 * (math.prod(max(1e-9, 1 + f * x) for x in r) - 1), 2),
    }


def costos_dict(c: Costos):
    return asdict(c)
