"""La línea de producción: estaciones E1 a E5 (E6 y E7 quedan preparadas para la demo).

E1 Ideas → E2 Ensamblado → E3 Control técnico → E4 Rentabilidad → E5 Robustez → E6 Demo → E7 Candidatas.
Cada bot que sale de la línea queda con uno de los cuatro motivos de cierre.
"""
from __future__ import annotations

import json
import math

from . import validacion as V
from .datos import calidad
from .estrategias import por_id
from .indicadores import Ctx, CATALOGO as CAT_IND
from .motor import Costos, correr, sharpe
from .torre import Torre, huella

IND_VALIDOS = {i[0] for i in CAT_IND}


def _log(log, texto):
    if log:
        log(texto)


def revisar_ficha(e, crit, vistas) -> list:
    """E1: la ficha tiene que explicarse sola y no repetir otra."""
    problemas = []
    if not e.logica or len(e.logica) > crit["E1"]["largo_max_logica"]:
        problemas.append("la lógica no entra en una frase")
    if not set(e.indicadores) <= IND_VALIDOS:
        problemas.append("usa indicadores fuera del catálogo: " + ", ".join(sorted(set(e.indicadores) - IND_VALIDOS)))
    if not e.variantes():
        problemas.append("grilla vacía")
    clave = (e.familia, tuple(sorted(e.indicadores)), json.dumps(e.grilla, sort_keys=True))
    if e.id in vistas or clave in vistas:
        problemas.append("duplica una ficha que ya está en la línea")
    vistas.add(e.id); vistas.add(clave)
    return problemas


def correr_ciclo(torre: Torre, serie, estrategias, crit: dict, huella_crit: str, nombre: str,
                 firma: str | None = None, log=print) -> str:
    cal = calidad(serie)
    cid = torre.nuevo_ciclo(nombre, serie.origen, serie.huella(), cal, crit, huella_crit)
    costos = Costos(**crit["costos"])
    f = crit["ciclo"]["riesgo_por_operacion"]
    n_ent = int(len(serie) * (1 - crit["ciclo"]["fraccion_holdout"]))
    ent = serie.tramo(0, n_ent)
    _log(log, f"[{cid}] {nombre}: {len(serie)} velas ({cal['dias']} días), datos {cal['veredicto']}. Entrenamiento {n_ent} velas; el resto queda reservado.")
    torre.evento(cid, "torre", f"Ciclo abierto con {len(estrategias)} fichas sobre {serie.nombre}. Tramo reservado: último {int(100 * crit['ciclo']['fraccion_holdout'])}%.")
    datos_cortos = cal["dias"] < crit["ciclo"]["dias_min"]

    ctx = Ctx(ent)
    puntos = [int(n_ent * (0.35 + 0.6 * k / max(1, crit["E3"]["puntos_truncado"] - 1))) for k in range(crit["E3"]["puntos_truncado"])]
    ctx_trunc = {t: Ctx(ent.tramo(0, t + 1)) for t in puntos}
    vistas = set()
    por_familia = {}

    for e in estrategias:
        fid = torre.nueva_familia(cid, e.id)
        problemas = revisar_ficha(e, crit, vistas)
        if problemas:
            torre.db.execute("UPDATE familias SET estado='descartada en E1', veredicto_json=? WHERE id=?",
                             (json.dumps({"problemas": problemas}), fid))
            torre.evento(cid, "Investigador", f"{e.id} descartada en E1: {'; '.join(problemas)}.")
            continue
        por_familia[fid] = (e, [])
        for p in e.variantes():
            bid = torre.nuevo_bot(cid, fid, e.id, p)
            if datos_cortos:
                torre.cerrar_bot(bid, 1, "datos_insuficientes", f"hay {cal['dias']} días; se piden {crit['ciclo']['dias_min']}")
                continue
            # ---------------- E2 ensamblado
            torre.mover(bid, 2)
            try:
                pos, stop = e.senales(ctx, p)
                if len(pos) != n_ent or len(stop) != n_ent or not set(pos) <= {-1, 0, 1}:
                    raise ValueError("salida con forma incorrecta")
            except Exception as ex:  # noqa: BLE001 — cualquier error de la estrategia es fallo técnico
                torre.cerrar_bot(bid, 2, "fallo_tecnico", f"no se pudo ensamblar: {ex}")
                continue
            # ---------------- E3 control técnico
            torre.mover(bid, 3)
            falla = None
            for t in puntos:
                pt, st = e.senales(ctx_trunc[t], p)
                if pt[t] != pos[t] or (st[t] is None) != (stop[t] is None) or (st[t] is not None and abs(st[t] - stop[t]) > 1e-12):
                    falla = f"la señal de la vela {t} cambia si se borran los datos posteriores: mira el futuro"
                    break
            if falla is None and any(pos[i] != 0 and stop[i] is None for i in range(n_ent // 2, n_ent)):
                falla = "hay posiciones sin stop después del calentamiento"
            if falla:
                torre.cerrar_bot(bid, 3, "fallo_tecnico", falla)
                torre.evento(cid, "Auditor", f"{bid} ({e.id}) vuelve a ensamblado: {falla}.")
                continue
            # ---------------- E4 rentabilidad
            torre.mover(bid, 4)
            res = correr(ent, pos, stop, costos, riesgo_por_op=f)
            diario = [r for _, r in res.diario]
            torre.registrar_prueba(cid, bid, fid, diario)
            m = res.metricas
            c4 = crit["E4"]
            ventaja = {"pf": [m["pf"], c4["pf_min"], m["pf"] >= c4["pf_min"]],
                       "costo_medio_r": [m["costo_medio_r"], c4["costo_max_r"], m["costo_medio_r"] <= c4["costo_max_r"]]}
            viable = {"caida_max_pct": [m["caida_max_pct"], c4["caida_max_pct"], m["caida_max_pct"] <= c4["caida_max_pct"]],
                      "racha_perdedora": [m["racha_perdedora"], c4["racha_max"], m["racha_perdedora"] <= c4["racha_max"]]}
            manif = {"estrategia": e.id, "params": p, "datos": serie.huella(), "tramo": [0, n_ent], "costos": crit["costos"],
                     "criterios": huella_crit, "codigo": huella([e.id, e.grilla, e.stop_atr])}
            if m["operaciones"] < c4["operaciones_min"]:
                ver, mot, det = "datos insuficientes", "datos_insuficientes", f"{m['operaciones']} operaciones; se piden {c4['operaciones_min']}"
            elif not all(v[2] for v in ventaja.values()):
                malos = [k for k, v in ventaja.items() if not v[2]]
                ver, mot = "sin ventaja", "resultado_negativo"
                det = "; ".join(f"{k} {ventaja[k][0]} (límite {ventaja[k][1]})" for k in malos)
                if "costo_medio_r" in malos or (m["pf_bruto"] >= c4["pf_min"] > m["pf"]):
                    det += f" · antes de costos PF {m['pf_bruto']}: los costos se comen la ventaja"
            elif not all(v[2] for v in viable.values()):
                ver, mot = "ventaja sin viabilidad", "inviable_cuenta"
                det = "; ".join(f"{k} {v[0]} (límite {v[1]})" for k, v in viable.items() if not v[2])
            else:
                ver, mot, det = "pasa a E5", None, f"PF {m['pf']} con {m['operaciones']} operaciones"
            torre.nueva_corrida(cid, bid, fid, 4, "entrenamiento", manif, dict(m, ventaja=ventaja, viable=viable), ver, res, guardar=mot is None)
            if mot:
                torre.cerrar_bot(bid, 4, mot, det)
            else:
                torre.mover(bid, 5, "pasa a E5", None, det)
                por_familia[fid][1].append((bid, p, m))
    torre.db.commit()

    # ---------------- E5: congelar familias con sobrevivientes
    vivos = {fid: v for fid, v in por_familia.items() if v[1]}
    for fid, (e, _) in por_familia.items():
        if fid not in vivos:
            torre.db.execute("UPDATE familias SET estado='sin sobrevivientes' WHERE id=?", (fid,))
    torre.db.commit()
    for fid, (e, sobrevivientes) in vivos.items():
        bid, p, m = max(sobrevivientes, key=lambda x: x[2]["sharpe_diario"])
        congelada = {"estrategia": e.id, "variantes": e.variantes(), "elegida": p, "bot": bid,
                     "sobrevivientes": [s[0] for s in sobrevivientes], "protocolo": crit["E5"],
                     "criterios": huella_crit, "datos": serie.huella(), "n_entrenamiento": n_ent}
        torre.congelar(fid, congelada)
        for s in sobrevivientes:
            if s[0] != bid:
                torre.mover(s[0], 5, "variante no elegida", None, f"la familia eligió {bid}")
        torre.mover(bid, 5, "espera tu firma", None, "familia congelada; falta abrir el tramo reservado")
        torre.evento(cid, "torre", f"{fid} ({e.nombre}) congelada con {len(e.variantes())} variantes; elegida {bid} {p}.")
        if firma:
            robustez(torre, cid, fid, serie, crit, firma, log)
    analista(torre, cid)
    resumen = resumen_ciclo(torre, cid)
    torre.cerrar_ciclo(cid, resumen)
    _log(log, f"[{cid}] " + " · ".join(f"{k} {v}" for k, v in resumen["embudo"].items()))
    return cid


def robustez(torre: Torre, cid: str, fid: str, serie, crit: dict, firma: str, log=print) -> dict:
    """E5: abre el tramo reservado (una vez, con firma) y corre la batería de robustez."""
    torre.abrir_holdout(fid, firma)
    fam = torre.uno("SELECT * FROM familias WHERE id=?", fid)
    cong = json.loads(fam["congelada_json"])
    e = por_id(cong["estrategia"])
    if cong["estrategia"] == "C03":
        from .estrategias import azar_optimizado
        e = azar_optimizado(len(cong["variantes"]))
    p, bid, n_ent = cong["elegida"], cong["bot"], cong["n_entrenamiento"]
    c5 = cong["protocolo"]
    costos = Costos(**crit["costos"])
    f = crit["ciclo"]["riesgo_por_operacion"]
    ent = serie.tramo(0, n_ent)
    ctx = Ctx(ent)
    pos, stop = e.senales(ctx, p)
    res = correr(ent, pos, stop, costos, riesgo_por_op=f)
    diario = [r for _, r in res.diario]
    m = res.metricas

    todas = torre.pruebas(cid)
    grupos = V.agrupar_pruebas([r for _, _, r in todas], c5["umbral_familia"])
    var_nula = 1 / max(1, len(diario) - 1)  # varianza del Sharpe estimado si la ventaja real fuera 0
    modo = c5.get("varianza_sr", "nula")
    var = {"nula": var_nula, "transversal": grupos["var_sr"], "mayor": max(var_nula, grupos["var_sr"])}[modo]
    dsr = V.sharpe_deflactado(diario, grupos["n_eff"], var)
    dsr["varianza"] = {"modo": modo, "nula": var_nula, "transversal": grupos["var_sr"]}
    dsr["dsr_transversal"] = V.sharpe_deflactado(diario, grupos["n_eff"], grupos["var_sr"])["dsr"]
    matriz = [r for _, fam_id, r in todas if fam_id == fid]
    cs = V.cscv(matriz)
    wf = V.walk_forward(matriz, c5["wf_pliegues"])
    # vecindario de parámetros
    netos = {}
    for b in torre.q("SELECT b.params_json, c.metricas_json FROM bots b JOIN corridas c ON c.bot=b.id AND c.estacion=4 WHERE b.familia=?", fid):
        netos[b["params_json"]] = json.loads(b["metricas_json"])["neto_r"]
    vec = V.vecinos(cong["variantes"], p, e.grilla)
    vec_ok = [netos.get(json.dumps(v), -1) > 0 for v in vec]
    mc = V.montecarlo(res.r(), f)
    # ruido
    ok_ruido = 0
    for k in range(c5["ruido_replicas"]):
        s2 = V.serie_con_ruido(ent, c5["ruido_fraccion"], 100 + k)
        p2, st2 = e.senales(Ctx(s2), p)
        if correr(s2, p2, st2, costos, riesgo_por_op=f).metricas["pf"] > 1:
            ok_ruido += 1
    # contra el azar
    libre = max(1, res.velas - res.expuesto)
    prob = min(0.5, m["operaciones"] / libre)
    azar = [correr(ent, V.posiciones_azar(n_ent, prob, max(1.0, m["duracion_media"]), 5000 + k), stop, costos, riesgo_por_op=f).metricas["neto_r"]
            for k in range(c5["azar_replicas"])]
    pct = V.percentil(m["neto_r"], azar)
    # tramo reservado
    ctx_total = Ctx(serie)
    pt, stt = e.senales(ctx_total, p)
    hold = correr(serie, pt, stt, costos, desde=n_ent, riesgo_por_op=f)
    mh = hold.metricas

    def chk(valor, umbral, ok):
        return {"valor": valor, "umbral": umbral, "ok": ok}

    pruebas = {
        "Sharpe deflactado": chk(round(dsr["dsr"], 3), c5["dsr_min"], dsr["dsr"] >= c5["dsr_min"]),
        "PF fuera de muestra": chk(mh["pf"], c5["pf_fuera_min"], mh["pf"] >= c5["pf_fuera_min"] and mh["operaciones"] >= c5["operaciones_fuera_min"]),
        "Walk-forward": chk(wf["eficiencia"], c5["wf_eficiencia_min"], wf["eficiencia"] >= c5["wf_eficiencia_min"]),
        "Pérdida fuera (CSCV)": chk(round(cs["prob_perdida"], 3) if cs["prob_perdida"] is not None else None, c5["prob_perdida_max"],
                                     cs["prob_perdida"] is not None and cs["prob_perdida"] <= c5["prob_perdida_max"]),
        "Monte Carlo peor 5%": chk(mc["neto_p5"], c5["mc_neto_p5_min"], mc["neto_p5"] is not None and mc["neto_p5"] > c5["mc_neto_p5_min"]),
        "Ruido": chk(round(ok_ruido / c5["ruido_replicas"], 2), c5["ruido_aprobadas_min"], ok_ruido / c5["ruido_replicas"] >= c5["ruido_aprobadas_min"]),
        "Contra el azar": chk(round(pct, 1), c5["azar_percentil_min"], pct >= c5["azar_percentil_min"]),
    }
    if vec:
        pruebas["Vecindario"] = chk(round(sum(vec_ok) / len(vec_ok), 2), c5["vecindario_min"], sum(vec_ok) / len(vec_ok) >= c5["vecindario_min"])
    if cs["pbo"] is not None:
        pruebas["PBO (informativo)"] = {"valor": round(cs["pbo"], 3), "umbral": c5["pbo_max"], "ok": cs["pbo"] <= c5["pbo_max"], "informativo": True}
    decisivas = {k: v for k, v in pruebas.items() if not v.get("informativo")}
    aprobada = all(v["ok"] for v in decisivas.values())
    veredicto = {"aprobada": aprobada, "bot": bid, "params": p, "pruebas": pruebas, "dsr": dsr, "grupos": {k: grupos[k] for k in ("n_total", "n_validas", "n_eff", "var_sr", "participacion")},
                 "walk_forward": wf, "cscv": cs, "montecarlo": mc, "fuera": mh, "entrenamiento": m, "firma": firma}
    manif = {"estrategia": e.id, "params": p, "datos": serie.huella(), "criterios": cong["criterios"], "costos": crit["costos"]}
    torre.nueva_corrida(cid, bid, fid, 5, "entrenamiento (batería)", manif, dict(m, dsr=dsr["dsr"], n_eff=grupos["n_eff"]),
                        "robusta" if aprobada else "frágil", res)
    torre.nueva_corrida(cid, bid, fid, 5, "reservado", dict(manif, tramo=[n_ent, len(serie)]), mh,
                        "pasa" if pruebas["PF fuera de muestra"]["ok"] else "no pasa", hold)
    torre.veredicto_familia(fid, veredicto)
    if aprobada:
        torre.mover(bid, 6, "lista para demo", None, "pasó toda la batería de robustez")
        torre.evento(cid, "Analista", f"{bid} ({e.nombre}) aprobó E5: DSR {dsr['dsr']:.2f} con N efectivo {grupos['n_eff']}, PF fuera {mh['pf']}.")
    else:
        malas = [k for k, v in decisivas.items() if not v["ok"]]
        torre.cerrar_bot(bid, 5, "resultado_negativo", "falló: " + ", ".join(malas))
        torre.evento(cid, "Analista", f"{bid} ({e.nombre}) cae en E5 por {', '.join(malas)}.")
    _log(log, f"   {fid} {e.id} {'APROBADA' if aprobada else 'rechazada'} · DSR {dsr['dsr']:.3f} (N efectivo {grupos['n_eff']}) · PF fuera {mh['pf']}")
    return veredicto


def analista(torre: Torre, cid: str):
    """Escribe la lección del ciclo y encola tareas para la próxima vuelta."""
    filas = torre.q("SELECT f.estrategia, b.estado, b.motivo FROM bots b JOIN familias f ON f.id=b.familia WHERE b.ciclo=?", cid)
    por_est = {}
    for r in filas:
        d = por_est.setdefault(r["estrategia"], {"total": 0, "vivos": 0, "costos": 0})
        d["total"] += 1
        if r["estado"] in ("pasa a E5", "espera tu firma", "variante no elegida", "lista para demo"):
            d["vivos"] += 1
    for r in torre.q("SELECT b.detalle, f.estrategia FROM bots b JOIN familias f ON f.id=b.familia WHERE b.ciclo=? AND b.detalle LIKE '%costos%'", cid):
        por_est[r["estrategia"]]["costos"] += 1
    buenas = [k for k, v in por_est.items() if v["vivos"]]
    costosas = [k for k, v in por_est.items() if v["costos"] >= max(1, v["total"] // 2)]
    if buenas:
        torre.evento(cid, "Analista", f"Sobreviven a E4: {', '.join(buenas)}. Las demás familias no muestran ventaja en estos datos.")
        torre.db.execute("INSERT INTO tareas(creada,rol,texto,estado) VALUES(datetime('now'),?,?,?)",
                         ("Investigador", f"Buscar ideas nuevas con la misma lógica de mercado que {', '.join(buenas)}, en otras temporalidades.", "pendiente"))
    else:
        torre.evento(cid, "Analista", "Ninguna familia mostró ventaja en entrenamiento. No se sigue ajustando sobre estos datos.")
    if costosas:
        torre.evento(cid, "Analista", f"En {', '.join(costosas)} los costos se comen la ventaja: priorizar horizontes más largos.")
    torre.db.commit()


ORDEN_EMBUDO = ["Ideas", "Ensamblados", "Conciliados", "Con ventaja", "Robustas", "En demo", "Candidatas"]


def resumen_ciclo(torre: Torre, cid: str) -> dict:
    fichas = torre.uno("SELECT COUNT(*) FROM familias WHERE ciclo=?", cid)[0]
    bots = torre.q("SELECT estacion, motivo FROM bots WHERE ciclo=?", cid)
    llegaron = lambda k: sum(1 for b in bots if b["estacion"] >= k)
    motivos = {}
    for b in bots:
        if b["motivo"]:
            motivos[b["motivo"]] = motivos.get(b["motivo"], 0) + 1
    return {"embudo": {"Ideas": fichas, "Ensamblados": llegaron(3), "Conciliados": llegaron(4),
                       "Con ventaja": llegaron(5), "Robustas": llegaron(6), "En demo": 0, "Candidatas": 0},
            "motivos": motivos, "bots": len(bots)}
