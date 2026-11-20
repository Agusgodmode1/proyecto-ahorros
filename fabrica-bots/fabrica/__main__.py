"""Uso: python -m fabrica <comando>. Probá «python -m fabrica ayuda»."""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main(argv=None):
    ap = argparse.ArgumentParser(prog="python -m fabrica", description="Fábrica de bots de trading")
    ap.add_argument("--carpeta", default=os.path.join(AQUI, "salida"), help="dónde vive la base y la evidencia")
    ap.add_argument("--criterios", default=os.path.join(AQUI, "criterios.toml"))
    sub = ap.add_subparsers(dest="cmd")
    sub.add_parser("ayuda")
    sub.add_parser("estudiar", help="escribe el estudio de estrategias e indicadores en estudio/")
    c = sub.add_parser("calibrar", help="Fase 1: controles sintéticos")
    c.add_argument("--años", type=float, default=5)
    c.add_argument("--amplia", type=int, default=0, metavar="N", help="además repite en N mercados por tipo (falsos positivos y potencia)")
    c = sub.add_parser("ciclo", help="corre la línea completa sobre unos datos")
    g = c.add_mutually_exclusive_group(required=True)
    g.add_argument("--csv", help="velas exportadas de MT5 o CSV genérico")
    g.add_argument("--sintetica", help="azar, tendencia, reversion, reversion_corta, mixto")
    c.add_argument("--semilla", type=int, default=1)
    c.add_argument("--pip", type=float)
    c.add_argument("--estrategias", help="ids separados por coma (por defecto, todo el catálogo)")
    c.add_argument("--firma", help="abre el tramo reservado de las familias congeladas (si no, quedan esperando tu firma)")
    c = sub.add_parser("firmar", help="abre el tramo reservado de una familia congelada y corre E5")
    c.add_argument("familia")
    c.add_argument("--nombre", required=True)
    c = sub.add_parser("calidad", help="mide la calidad de un CSV")
    c.add_argument("csv")
    c = sub.add_parser("exportar", help="guarda una serie sintética como CSV")
    c.add_argument("tipo"); c.add_argument("destino"); c.add_argument("--semilla", type=int, default=1)
    sub.add_parser("estado", help="resumen de la torre")
    c = sub.add_parser("panel", help="genera el panel HTML")
    c.add_argument("--destino")
    c.add_argument("--solo-contenido", action="store_true", help="sin esqueleto HTML (para publicarlo como artefacto)")
    a = ap.parse_args(argv)

    if a.cmd in (None, "ayuda"):
        ap.print_help()
        return 0
    from .torre import Torre, cargar_criterios

    if a.cmd == "estudiar":
        from .estudio import escribir
        for r in escribir(os.path.join(AQUI, "estudio")):
            print("escrito", r)
        return 0
    if a.cmd == "calidad":
        from .datos import cargar_csv, calidad
        print(json.dumps(calidad(cargar_csv(a.csv)), indent=1, ensure_ascii=False))
        return 0
    if a.cmd == "exportar":
        from .datos import sintetica, guardar_csv
        guardar_csv(sintetica(a.tipo, semilla=a.semilla), a.destino)
        print("guardado", a.destino)
        return 0

    crit, h = cargar_criterios(a.criterios)
    torre = Torre(a.carpeta)
    t0 = time.time()
    if a.cmd == "calibrar":
        from .calibracion import calibrar
        res = calibrar(torre, crit, h, a.años)
        if a.amplia:
            from .calibracion import calibrar_amplio
            calibrar_amplio(torre, crit, h, a.amplia, a.años)
        ok = sum(1 for r in res if r[2])
        print(f"\nCalibración: {ok} de {len(res)} controles bien clasificados ({time.time() - t0:.0f} s).")
        print("La fábrica " + ("distingue: se puede pasar a datos reales." if ok == len(res) else "todavía NO distingue: revisá los criterios antes de seguir."))
        return 0 if ok == len(res) else 1
    if a.cmd == "ciclo":
        from .datos import cargar_csv, sintetica
        from .estrategias import CATALOGO, por_id
        from .linea import correr_ciclo
        serie = cargar_csv(a.csv, pip=a.pip) if a.csv else sintetica(a.sintetica, semilla=a.semilla)
        ests = [por_id(x.strip()) for x in a.estrategias.split(",")] if a.estrategias else CATALOGO
        cid = correr_ciclo(torre, serie, ests, crit, h, f"Ciclo sobre {serie.nombre}", a.firma)
        pend = torre.q("SELECT id, estrategia FROM familias WHERE ciclo=? AND estado='congelada'", cid)
        if pend:
            print("\nEsperan tu firma para abrir el tramo reservado:")
            for f in pend:
                print(f"  python -m fabrica firmar {f['id']} --nombre TU_NOMBRE    # {f['estrategia']}")
        print(f"({time.time() - t0:.0f} s)")
        return 0
    if a.cmd == "firmar":
        from .datos import desde_origen
        from .linea import robustez, analista, resumen_ciclo
        fam = torre.uno("SELECT * FROM familias WHERE id=?", a.familia)
        if fam is None:
            sys.exit(f"No existe {a.familia}")
        ciclo = torre.uno("SELECT * FROM ciclos WHERE id=?", fam["ciclo"])
        if ciclo["criterios_huella"] != h:
            sys.exit("Los criterios cambiaron desde que se corrió este ciclo. No se puede abrir el tramo reservado con otra vara: abrí un ciclo nuevo.")
        serie = desde_origen(json.loads(ciclo["datos_json"]))
        if serie.huella() != ciclo["datos_huella"]:
            sys.exit("Los datos cambiaron desde que se corrió este ciclo (la huella no coincide).")
        robustez(torre, ciclo["id"], a.familia, serie, json.loads(ciclo["criterios_json"]), a.nombre)
        torre.cerrar_ciclo(ciclo["id"], resumen_ciclo(torre, ciclo["id"]))
        return 0
    if a.cmd == "estado":
        for c in torre.q("SELECT * FROM ciclos ORDER BY id"):
            r = json.loads(c["resumen_json"] or "{}")
            print(c["id"], c["nombre"], "·", " → ".join(f"{k} {v}" for k, v in r.get("embudo", {}).items()))
        return 0
    if a.cmd == "panel":
        from .panel import generar
        destino = a.destino or os.path.join(a.carpeta, "panel.html")
        generar(torre, destino, completo=not a.solo_contenido)
        print("panel:", destino)
        return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
