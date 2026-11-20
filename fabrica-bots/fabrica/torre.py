"""La torre de control: SQLite como única fuente de verdad.

Guarda ciclos, familias, bots, corridas, todas las pruebas (con su serie de retornos),
eventos y calibraciones. Las carpetas de evidencia solo guardan archivos; si hay diferencia, manda la base.
"""
from __future__ import annotations

import csv
import datetime as dt
import hashlib
import json
import os
import sqlite3
import tomllib

MOTIVOS = {
    "fallo_tecnico": "fallo técnico",
    "datos_insuficientes": "datos insuficientes",
    "resultado_negativo": "resultado negativo",
    "inviable_cuenta": "inviable para la cuenta",
}

ESQUEMA = """
CREATE TABLE IF NOT EXISTS ciclos(id TEXT PRIMARY KEY, creado TEXT, nombre TEXT, datos_json TEXT, datos_huella TEXT,
  calidad_json TEXT, criterios_huella TEXT, criterios_json TEXT, estado TEXT, resumen_json TEXT);
CREATE TABLE IF NOT EXISTS familias(id TEXT PRIMARY KEY, ciclo TEXT, estrategia TEXT, estado TEXT,
  congelada_json TEXT, firma TEXT, holdout_abierto TEXT, veredicto_json TEXT);
CREATE TABLE IF NOT EXISTS bots(id TEXT PRIMARY KEY, ciclo TEXT, familia TEXT, estrategia TEXT, params_json TEXT,
  params_huella TEXT, estacion INTEGER, estado TEXT, motivo TEXT, detalle TEXT, actualizado TEXT);
CREATE TABLE IF NOT EXISTS corridas(id TEXT PRIMARY KEY, ciclo TEXT, bot TEXT, familia TEXT, estacion INTEGER,
  tramo TEXT, manifiesto_json TEXT, metricas_json TEXT, veredicto TEXT, carpeta TEXT, creado TEXT);
CREATE TABLE IF NOT EXISTS pruebas(id INTEGER PRIMARY KEY AUTOINCREMENT, ciclo TEXT, bot TEXT, familia TEXT,
  sharpe REAL, n_obs INTEGER, retornos_json TEXT);
CREATE TABLE IF NOT EXISTS eventos(id INTEGER PRIMARY KEY AUTOINCREMENT, t TEXT, ciclo TEXT, actor TEXT, texto TEXT);
CREATE TABLE IF NOT EXISTS calibracion(id INTEGER PRIMARY KEY AUTOINCREMENT, creado TEXT, control TEXT, nombre TEXT,
  ciclo TEXT, esperado TEXT, obtenido TEXT, ok INTEGER, detalle TEXT);
CREATE TABLE IF NOT EXISTS tareas(id INTEGER PRIMARY KEY AUTOINCREMENT, creada TEXT, rol TEXT, texto TEXT,
  estado TEXT, resultado TEXT);
"""


def ahora():
    return dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def huella(obj) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:10]


def cargar_criterios(ruta: str) -> tuple[dict, str]:
    with open(ruta, "rb") as f:
        crudo = f.read()
    return tomllib.loads(crudo.decode()), hashlib.sha256(crudo).hexdigest()[:10]


class Torre:
    def __init__(self, carpeta: str):
        os.makedirs(carpeta, exist_ok=True)
        self.carpeta = carpeta
        self.db = sqlite3.connect(os.path.join(carpeta, "fabrica.db"))
        self.db.row_factory = sqlite3.Row
        self.db.executescript(ESQUEMA)

    # -------------------------------------------------------- utilidades
    def _siguiente(self, tabla, prefijo, ancho=4):
        n = self.db.execute(f"SELECT COUNT(*) FROM {tabla}").fetchone()[0] + 1
        return f"{prefijo}-{n:0{ancho}d}"

    def q(self, sql, *args):
        return self.db.execute(sql, args).fetchall()

    def uno(self, sql, *args):
        return self.db.execute(sql, args).fetchone()

    def evento(self, ciclo, actor, texto):
        self.db.execute("INSERT INTO eventos(t,ciclo,actor,texto) VALUES(?,?,?,?)", (ahora(), ciclo, actor, texto))
        self.db.commit()

    # -------------------------------------------------------- ciclos
    def nuevo_ciclo(self, nombre, origen, huella_datos, calidad, criterios, huella_criterios):
        cid = self._siguiente("ciclos", "CIC", 3)
        self.db.execute("INSERT INTO ciclos VALUES(?,?,?,?,?,?,?,?,?,?)",
                        (cid, ahora(), nombre, json.dumps(origen), huella_datos, json.dumps(calidad),
                         huella_criterios, json.dumps(criterios), "en curso", "{}"))
        self.db.commit()
        return cid

    def cerrar_ciclo(self, cid, resumen):
        self.db.execute("UPDATE ciclos SET estado='cerrado', resumen_json=? WHERE id=?", (json.dumps(resumen), cid))
        self.db.commit()

    # -------------------------------------------------------- familias y bots
    def nueva_familia(self, ciclo, estrategia):
        fid = self._siguiente("familias", "FAM", 3)
        self.db.execute("INSERT INTO familias VALUES(?,?,?,?,?,?,?,?)", (fid, ciclo, estrategia, "abierta", None, None, None, None))
        self.db.commit()
        return fid

    def nuevo_bot(self, ciclo, familia, estrategia, params):
        bid = self._siguiente("bots", "E")
        self.db.execute("INSERT INTO bots VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                        (bid, ciclo, familia, estrategia, json.dumps(params), huella(params), 1, "en línea", None, None, ahora()))
        self.db.commit()
        return bid

    def mover(self, bot, estacion, estado="en línea", motivo=None, detalle=None):
        self.db.execute("UPDATE bots SET estacion=?, estado=?, motivo=?, detalle=?, actualizado=? WHERE id=?",
                        (estacion, estado, motivo, detalle, ahora(), bot))
        self.db.commit()

    def cerrar_bot(self, bot, estacion, motivo, detalle):
        destino = {"resultado_negativo": "cementerio", "inviable_cuenta": "estacionada",
                   "datos_insuficientes": "espera datos", "fallo_tecnico": "fallo técnico"}[motivo]
        self.mover(bot, estacion, destino, motivo, detalle)

    def congelar(self, familia, contenido):
        self.db.execute("UPDATE familias SET estado='congelada', congelada_json=? WHERE id=?", (json.dumps(contenido), familia))
        self.db.commit()

    def abrir_holdout(self, familia, firma):
        """El tramo reservado se abre una sola vez por familia, congelada y con firma."""
        f = self.uno("SELECT * FROM familias WHERE id=?", familia)
        if f is None:
            raise ValueError(f"No existe la familia {familia}")
        if f["estado"] != "congelada" or not f["congelada_json"]:
            raise PermissionError(f"{familia} no está congelada: no se puede abrir el tramo reservado")
        if f["holdout_abierto"]:
            raise PermissionError(f"El tramo reservado de {familia} ya se abrió el {f['holdout_abierto']}. Para confirmar un ajuste hacen falta datos nuevos.")
        if not firma or not firma.strip():
            raise PermissionError("Abrir el tramo reservado necesita tu firma")
        self.db.execute("UPDATE familias SET estado='holdout abierto', firma=?, holdout_abierto=? WHERE id=?", (firma, ahora(), familia))
        self.db.commit()

    def veredicto_familia(self, familia, veredicto):
        self.db.execute("UPDATE familias SET estado=?, veredicto_json=? WHERE id=?",
                        ("aprobada" if veredicto.get("aprobada") else "rechazada", json.dumps(veredicto), familia))
        self.db.commit()

    # -------------------------------------------------------- pruebas y corridas
    def registrar_prueba(self, ciclo, bot, familia, retornos):
        from .motor import sharpe
        self.db.execute("INSERT INTO pruebas(ciclo,bot,familia,sharpe,n_obs,retornos_json) VALUES(?,?,?,?,?,?)",
                        (ciclo, bot, familia, sharpe(retornos), len(retornos), json.dumps([round(x, 5) for x in retornos])))

    def pruebas(self, ciclo):
        return [(r["bot"], r["familia"], json.loads(r["retornos_json"])) for r in self.q("SELECT * FROM pruebas WHERE ciclo=? ORDER BY id", ciclo)]

    def nueva_corrida(self, ciclo, bot, familia, estacion, tramo, manifiesto, metricas, veredicto, resultado=None, guardar=True):
        rid = self._siguiente("corridas", "R")
        carpeta = None
        if guardar and resultado is not None:
            carpeta = os.path.join(self.carpeta, "corridas", rid)
            os.makedirs(carpeta, exist_ok=True)
            with open(os.path.join(carpeta, "manifiesto.json"), "w") as f:
                json.dump(dict(manifiesto, corrida=rid, bot=bot, estacion=estacion, tramo=tramo, metricas=metricas, veredicto=veredicto),
                          f, indent=1, ensure_ascii=False)
            with open(os.path.join(carpeta, "operaciones.csv"), "w", newline="") as f:
                w = csv.writer(f)
                w.writerow(["entrada_vela", "salida_vela", "lado", "entrada", "salida", "stop", "r", "costo_r", "motivo"])
                for op in resultado.operaciones:
                    w.writerow([op.entrada_i, op.salida_i, op.lado, round(op.entrada, 5), round(op.salida, 5), round(op.stop, 5),
                                round(op.r, 4), round(op.costo_r, 4), op.motivo])
            with open(os.path.join(carpeta, "curva.csv"), "w", newline="") as f:
                w = csv.writer(f)
                w.writerow(["dia", "r_dia", "r_acumulado"])
                acc = 0.0
                for d, r in resultado.diario:
                    acc += r
                    w.writerow([d, round(r, 4), round(acc, 4)])
            with open(os.path.join(carpeta, "descartes.csv"), "w", newline="") as f:
                w = csv.writer(f)
                w.writerow(["motivo", "cantidad"])
                for k, v in resultado.descartes.items():
                    w.writerow([k, v])
        self.db.execute("INSERT INTO corridas VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                        (rid, ciclo, bot, familia, estacion, tramo, json.dumps(manifiesto), json.dumps(metricas), veredicto, carpeta, ahora()))
        self.db.commit()
        return rid

    def calibracion(self, control, nombre, ciclo, esperado, obtenido, ok, detalle):
        self.db.execute("INSERT INTO calibracion(creado,control,nombre,ciclo,esperado,obtenido,ok,detalle) VALUES(?,?,?,?,?,?,?,?)",
                        (ahora(), control, nombre, ciclo, esperado, obtenido, int(ok), json.dumps(detalle, ensure_ascii=False)))
        self.db.commit()
