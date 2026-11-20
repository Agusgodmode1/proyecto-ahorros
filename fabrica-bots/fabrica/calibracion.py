"""Fase 1: calibrar la fábrica con controles cuya respuesta correcta se conoce por construcción.

Si la fábrica no clasifica bien estos casos, ningún resultado posterior es confiable.
"""
from __future__ import annotations

import json

from .datos import sintetica
from .estrategias import CATALOGO, CONTROLES, azar_optimizado
from .indicadores import Ctx
from .linea import correr_ciclo
from .motor import Costos, correr
from .torre import Torre

FIRMA = "calibración automática (controles sintéticos)"


def _familias(torre, cid):
    return torre.q("SELECT f.*, (SELECT COUNT(*) FROM bots b WHERE b.familia=f.id AND b.estacion>=5) AS e4 FROM familias f WHERE ciclo=?", cid)


def _aprobadas(torre, cid):
    return [f["estrategia"] for f in _familias(torre, cid) if f["estado"] == "aprobada"]


def calibrar(torre: Torre, crit: dict, huella_crit: str, años: float = 5, log=print) -> list:
    tend = sintetica("tendencia", años=años, semilla=11)
    resultados = []

    def anotar(ctrl, nombre, cid, esperado, obtenido, ok, detalle):
        torre.calibracion(ctrl, nombre, cid, esperado, obtenido, ok, detalle)
        resultados.append((ctrl, nombre, ok, obtenido))
        log(f"{'✔' if ok else '✘'} Control {ctrl} · {nombre}: {obtenido}")

    # A: ventaja plantada; el catálogo completo compite y la vara sube con cada prueba
    cid = correr_ciclo(torre, tend, CATALOGO, crit, huella_crit, "Control A · ventaja plantada (tendencia)", FIRMA, log)
    ap = _aprobadas(torre, cid)
    tendencia = {e.id for e in CATALOGO if e.familia in ("tendencia", "ruptura", "momento")}
    reversion = {e.id for e in CATALOGO if e.familia == "reversión"}
    ok = bool(set(ap) & tendencia) and not set(ap) & reversion
    anotar("A", "Ventaja plantada", cid, "aprueba al menos una familia de tendencia y ninguna de reversión",
           f"aprobadas: {', '.join(ap) or 'ninguna'}", ok, {"aprobadas": ap})

    # B: entradas al azar sobre los mismos datos con ventaja
    cid = correr_ciclo(torre, tend, [CONTROLES["azar"]], crit, huella_crit, "Control B · entradas al azar", FIRMA, log)
    ap = _aprobadas(torre, cid)
    anotar("B", "Entradas al azar", cid, "no aprueba", "aprobada" if ap else "rechazada", not ap, {})

    # C: 200 sorteos y quedarse con el mejor
    cid = correr_ciclo(torre, tend, [azar_optimizado(200)], crit, huella_crit, "Control C · azar optimizado (sobreajuste)", FIRMA, log)
    ap = _aprobadas(torre, cid)
    fam = _familias(torre, cid)[0]
    paso_e4 = fam["e4"] > 0
    ver = json.loads(fam["veredicto_json"]) if fam["veredicto_json"] else {}
    caida = [k for k, v in ver.get("pruebas", {}).items() if not v["ok"] and not v.get("informativo")]
    obtenido = ("rechazada" if not ap else "aprobada") + (f"; {fam['e4']} sorteos pasaron E4 y la cae en E5 por {', '.join(caida)}" if paso_e4 and caida else "")
    anotar("C", "Azar optimizado", cid, "no aprueba (si pasa E4, cae en E5)", obtenido, not ap, {"pasaron_e4": fam["e4"], "cae_por": caida})

    # D: ventaja real pero más chica que los costos
    rc = sintetica("reversion_corta", años=años, semilla=5)
    est = CONTROLES["una_vela"]
    cid = correr_ciclo(torre, rc, [est], crit, huella_crit, "Control D · ventaja menor que los costos", FIRMA, log)
    n_ent = int(len(rc) * (1 - crit["ciclo"]["fraccion_holdout"]))
    ent = rc.tramo(0, n_ent)
    pos, stop = est.senales(Ctx(ent), est.variantes()[0])
    sin = correr(ent, pos, stop, Costos(0, 0, 0)).metricas
    con = correr(ent, pos, stop, Costos(**crit["costos"])).metricas
    bot = torre.uno("SELECT * FROM bots WHERE ciclo=?", cid)
    ok = bot["estacion"] == 4 and bot["motivo"] == "resultado_negativo" and sin["pf"] > 1.05
    anotar("D", "Ventaja menor que los costos", cid, "sin costos gana; con costos cae en E4",
           f"sin costos PF {sin['pf']}, con costos PF {con['pf']}: {bot['estado']} en E{bot['estacion']}", ok,
           {"pf_sin_costos": sin["pf"], "pf_con_costos": con["pf"]})

    # E: mercado sin ventaja; nada del catálogo debería aprobar
    az = sintetica("azar", años=años, semilla=3)
    cid = correr_ciclo(torre, az, CATALOGO, crit, huella_crit, "Control E · mercado sin ventaja", FIRMA, log)
    ap = _aprobadas(torre, cid)
    e4 = sum(f["e4"] for f in _familias(torre, cid))
    anotar("E", "Mercado sin ventaja", cid, "ninguna aprobada",
           (f"aprobadas: {', '.join(ap)}" if ap else "ninguna aprobada") + f" ({e4} bots pasaron E4 por azar)", not ap, {"pasaron_e4": e4})

    # F: reproducible; la misma corrida da exactamente lo mismo
    a = correr(tend, *CATALOGO[0].senales(Ctx(tend), CATALOGO[0].variantes()[0]), Costos(**crit["costos"])).metricas
    b = correr(tend, *CATALOGO[0].senales(Ctx(tend), CATALOGO[0].variantes()[0]), Costos(**crit["costos"])).metricas
    anotar("F", "Reproducible", None, "idéntica", "idéntica" if a == b else "distinta", a == b, {})
    return resultados


def calibrar_amplio(torre: Torre, crit: dict, huella_crit: str, semillas: int = 6, años: float = 5, log=print) -> dict:
    """Repite el catálogo en muchos mercados: cuántas veces aprueba sin ventaja (falsos positivos)
    y cuántas encuentra la ventaja plantada (potencia)."""
    out = {}
    for tipo, esperado in (("azar", False), ("tendencia", True), ("reversion", True)):
        aciertos = 0
        for k in range(semillas):
            cid = correr_ciclo(torre, sintetica(tipo, años=años, semilla=100 + k), CATALOGO, crit, huella_crit,
                               f"Calibración amplia · {tipo} semilla {100 + k} · {años:g} años", FIRMA, log=None)
            ap = bool(_aprobadas(torre, cid))
            aciertos += ap == esperado
            log(f"  {tipo} {100 + k}: {'aprueba' if ap else 'no aprueba'}")
        out[tipo] = aciertos
        nombre = (f"Falsos positivos (sin ventaja, {años:g} años)" if tipo == "azar" else f"Potencia ({tipo} plantada, {años:g} años)")
        obtenido = f"{semillas - aciertos} de {semillas} aprobaron por azar" if tipo == "azar" else f"detectó {aciertos} de {semillas}"
        ok = aciertos == semillas if tipo == "azar" else aciertos >= semillas / 2
        torre.calibracion({"azar": "G", "tendencia": "H", "reversion": "I"}[tipo] + f"·{años:g}", nombre, None, "0 falsos positivos" if tipo == "azar" else "detecta la mitad o más",
                          obtenido, ok, {"semillas": semillas, "aciertos": aciertos})
        log(f"{'✔' if ok else '✘'} {nombre}: {obtenido}")
    return out
