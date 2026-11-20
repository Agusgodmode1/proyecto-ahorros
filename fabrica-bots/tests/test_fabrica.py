"""Pruebas de la fábrica. Correr con: python -m unittest discover -s tests"""
import json
import math
import os
import random
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fabrica import indicadores as I
from fabrica import validacion as V
from fabrica.datos import Serie, cargar_csv, calidad, guardar_csv, sintetica
from fabrica.estrategias import CATALOGO, CONTROLES
from fabrica.indicadores import Ctx
from fabrica.motor import Costos, correr
from fabrica.torre import Torre, cargar_criterios

AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def serie_manual(precios, pip=0.0001):
    """Velas planas día a día: o = cierre anterior, h/l = ±1 pip del rango o–c."""
    t0 = 1_700_000_000
    o, h, l, c = [], [], [], []
    prev = precios[0]
    for p in precios:
        o.append(prev); c.append(p)
        h.append(max(prev, p) + pip); l.append(min(prev, p) - pip)
        prev = p
    return Serie("manual", [t0 + 86400 * i for i in range(len(precios))], o, h, l, c, [1] * len(precios), pip)


class TestDatos(unittest.TestCase):
    def test_sintetica_reproducible(self):
        a, b = sintetica("tendencia", años=0.3, semilla=4), sintetica("tendencia", años=0.3, semilla=4)
        self.assertEqual(a.huella(), b.huella())
        self.assertNotEqual(a.huella(), sintetica("tendencia", años=0.3, semilla=5).huella())

    def test_ohlc_coherente_y_calidad(self):
        s = sintetica("mixto", años=0.5, semilla=2)
        self.assertTrue(all(s.l[i] <= min(s.o[i], s.c[i]) and max(s.o[i], s.c[i]) <= s.h[i] for i in range(len(s))))
        self.assertEqual(calidad(s)["veredicto"], "buena")

    def test_csv_mt5_y_generico(self):
        d = tempfile.mkdtemp()
        mt5 = os.path.join(d, "EURUSD_H1.csv")
        with open(mt5, "w") as f:
            f.write("<DATE>\t<TIME>\t<OPEN>\t<HIGH>\t<LOW>\t<CLOSE>\t<TICKVOL>\t<VOL>\t<SPREAD>\n")
            f.write("2024.01.02\t01:00:00\t1.10010\t1.10050\t1.09990\t1.10030\t120\t0\t8\n")
            f.write("2024.01.02\t00:00:00\t1.10000\t1.10020\t1.09980\t1.10010\t100\t0\t8\n")
        s = cargar_csv(mt5)
        self.assertEqual(len(s), 2)
        self.assertLess(s.t[0], s.t[1])  # ordena por fecha
        self.assertAlmostEqual(s.pip, 0.0001)
        gen = os.path.join(d, "x.csv")
        guardar_csv(sintetica("azar", años=0.05), gen)
        self.assertGreater(len(cargar_csv(gen)), 100)


class TestIndicadores(unittest.TestCase):
    def test_valores_conocidos(self):
        x = [1, 2, 3, 4, 5, 6]
        self.assertEqual(I.sma(x, 3)[2:], [2, 3, 4, 5])
        self.assertEqual(I.maximo(x, 3)[-1], 6)
        self.assertEqual(I.minimo(x, 3)[-1], 4)
        self.assertAlmostEqual(I.rsi([1, 2, 3, 4, 5, 6, 7], 3)[-1], 100.0)
        self.assertAlmostEqual(I.eficiencia([1, 2, 3, 4, 5], 4)[-1], 1.0)

    def test_rangos(self):
        s = sintetica("azar", años=0.3, semilla=1)
        r = [v for v in I.rsi(s.c, 14) if v is not None]
        self.assertTrue(all(0 <= v <= 100 for v in r))
        k, _ = I.estocastico(s.h, s.l, s.c, 14, 3)
        self.assertTrue(all(0 <= v <= 100 for v in k if v is not None))
        er = [v for v in I.eficiencia(s.c, 20) if v is not None]
        self.assertTrue(all(0 <= v <= 1 for v in er))

    def test_causales(self):
        """Ningún indicador cambia su valor pasado si se borra el futuro."""
        s = sintetica("mixto", años=0.4, semilla=3)
        t = len(s) - 300
        completo, corto = Ctx(s), Ctx(s.tramo(0, t + 1))
        llamadas = [("sma", 20), ("ema", 20), ("atr", 14), ("rsi", 14), ("adx", 14), ("macd", 12, 26, 9), ("bollinger", 20, 2.0),
                    ("keltner", 20, 1.5), ("donchian", 20), ("estocastico", 14, 3), ("cci", 20), ("williams_r", 14), ("roc", 10),
                    ("zscore", 20), ("eficiencia", 20), ("supertrend", 10, 3.0), ("volatilidad", 24), ("razon_varianza", 4, 240), ("obv",)]
        self.assertEqual(len(llamadas), len(I.CATALOGO))
        for ll in llamadas:
            a, b = completo(*ll), corto(*ll)
            a = a if isinstance(a, tuple) else (a,)
            b = b if isinstance(b, tuple) else (b,)
            for xa, xb in zip(a, b):
                self.assertEqual(xa[t], xb[t], ll)


class TestMotor(unittest.TestCase):
    def test_operacion_exacta(self):
        """Compra al abrir la vela siguiente, paga spread y deslizamiento, sale por señal."""
        s = serie_manual([1.1000, 1.1000, 1.1010, 1.1020, 1.1030, 1.1030])
        pos = [1, 1, 1, 0, 0, 0]
        stop = [0.0050] * 6
        r = correr(s, pos, stop, Costos(1.0, 0.0, 0.0))
        self.assertEqual(len(r.operaciones), 1)
        op = r.operaciones[0]
        self.assertEqual(op.entrada_i, 1)  # decidido al cierre de 0, ejecutado en la apertura de 1
        self.assertAlmostEqual(op.entrada, 1.1000 + 0.0001)
        self.assertEqual(op.salida_i, 4)
        self.assertAlmostEqual(op.salida, 1.1020)  # apertura de 4 = cierre de 3
        self.assertAlmostEqual(op.r, (1.1020 - 1.1001) / 0.0050)
        self.assertAlmostEqual(sum(x for _, x in r.diario), op.r)

    def test_stop_y_bloqueo(self):
        s = serie_manual([1.1000, 1.1000, 1.0950, 1.0900, 1.0900, 1.0900])
        pos = [1] * 6
        r = correr(s, pos, [0.0020] * 6, Costos(0, 0, 0))
        self.assertEqual(len(r.operaciones), 1)  # no vuelve a entrar en el mismo sentido
        self.assertEqual(r.operaciones[0].motivo, "stop")
        self.assertAlmostEqual(r.operaciones[0].r, -1.0, places=6)

    def test_mtm_suma_igual_a_operaciones(self):
        s = sintetica("tendencia", años=0.5, semilla=8)
        e = CATALOGO[0]
        pos, stop = e.senales(Ctx(s), e.variantes()[0])
        r = correr(s, pos, stop, Costos())
        self.assertAlmostEqual(sum(x for _, x in r.diario), sum(r.r()), places=6)
        self.assertGreater(len(r.operaciones), 5)

    def test_costos_restan(self):
        s = sintetica("reversion_corta", años=0.5, semilla=5)
        e = CONTROLES["una_vela"]
        pos, stop = e.senales(Ctx(s), e.variantes()[0])
        sin = correr(s, pos, stop, Costos(0, 0, 0)).metricas
        con = correr(s, pos, stop, Costos()).metricas
        self.assertGreater(sin["pf"], 1.05)
        self.assertLess(con["neto_r"], sin["neto_r"])


class TestVara(unittest.TestCase):
    def test_umbral_crece_con_pruebas(self):
        a, b = V.sharpe_umbral(10, 0.001), V.sharpe_umbral(1000, 0.001)
        self.assertGreater(b, a)
        self.assertEqual(V.sharpe_umbral(1, 0.001), 0.0)

    def test_dsr_baja_con_mas_pruebas(self):
        rnd = random.Random(1)
        r = [rnd.gauss(0.05, 1) for _ in range(800)]
        self.assertGreater(V.sharpe_deflactado(r, 2, 1 / 800)["dsr"], V.sharpe_deflactado(r, 500, 1 / 800)["dsr"])

    def test_n_efectivo(self):
        rnd = random.Random(2)
        base = [rnd.gauss(0, 1) for _ in range(300)]
        clones = [[x + rnd.gauss(0, 0.05) for x in base] for _ in range(20)]
        indep = [[rnd.gauss(0, 1) for _ in range(300)] for _ in range(20)]
        self.assertEqual(V.agrupar_pruebas(clones)["n_eff"], 1)
        self.assertGreaterEqual(V.agrupar_pruebas(indep)["n_eff"], 18)

    def test_pbo_en_ruido(self):
        rnd = random.Random(3)
        m = [[rnd.gauss(0, 1) for _ in range(600)] for _ in range(16)]
        pbo = V.cscv(m)["pbo"]
        self.assertGreater(pbo, 0.25)
        self.assertLess(pbo, 0.75)

    def test_vecinos(self):
        g = {"a": [1, 2, 3], "b": [10, 20]}
        vs = [{"a": x, "b": y} for x in g["a"] for y in g["b"]]
        self.assertEqual(len(V.vecinos(vs, {"a": 2, "b": 10}, g)), 3)


class TestTorreYLinea(unittest.TestCase):
    def test_holdout_una_sola_vez_y_con_firma(self):
        t = Torre(tempfile.mkdtemp())
        fid = t.nueva_familia("CIC-001", "T01")
        with self.assertRaises(PermissionError):
            t.abrir_holdout(fid, "Agus")  # no está congelada
        t.congelar(fid, {"variantes": []})
        with self.assertRaises(PermissionError):
            t.abrir_holdout(fid, "")  # sin firma
        t.abrir_holdout(fid, "Agus")
        with self.assertRaises(PermissionError):
            t.abrir_holdout(fid, "Agus")  # segunda vez

    def test_ciclo_chico_de_punta_a_punta(self):
        from fabrica.linea import correr_ciclo
        crit, h = cargar_criterios(os.path.join(AQUI, "criterios.toml"))
        crit = json.loads(json.dumps(crit))
        crit["ciclo"]["dias_min"] = 100
        crit["E5"]["azar_replicas"] = 20
        crit["E5"]["ruido_replicas"] = 3
        t = Torre(tempfile.mkdtemp())
        s = sintetica("tendencia", años=1.5, semilla=11)
        cid = correr_ciclo(t, s, [CATALOGO[0], CONTROLES["azar"]], crit, h, "prueba", firma=None, log=None)
        bots = t.q("SELECT * FROM bots WHERE ciclo=?", cid)
        self.assertEqual(len(bots), 10)
        self.assertTrue(all(b["estacion"] >= 4 for b in bots))  # nadie falló el control técnico
        self.assertTrue(all(b["motivo"] in (None, "resultado_negativo", "inviable_cuenta", "datos_insuficientes") for b in bots))
        self.assertEqual(t.uno("SELECT COUNT(*) FROM pruebas WHERE ciclo=?", cid)[0], 10)  # cada prueba cuenta
        congeladas = t.q("SELECT * FROM familias WHERE ciclo=? AND estado='congelada'", cid)
        self.assertTrue(all(json.loads(f["congelada_json"])["variantes"] for f in congeladas))
        self.assertIsNone(t.uno("SELECT holdout_abierto FROM familias WHERE ciclo=? LIMIT 1", cid)[0])

    def test_e3_atrapa_estrategia_que_mira_el_futuro(self):
        from fabrica.estrategias import Estrategia
        from fabrica.linea import correr_ciclo
        tramposa = Estrategia("X01", "Mira el futuro", "tendencia", "Compra si el cierre de mañana es mayor.", ["atr"], {"n": [1]},
                              lambda ctx, p: [1 if i + 1 < len(ctx.s) and ctx.s.c[i + 1] > ctx.s.c[i] else -1 for i in range(len(ctx.s))])
        crit, h = cargar_criterios(os.path.join(AQUI, "criterios.toml"))
        crit = json.loads(json.dumps(crit)); crit["ciclo"]["dias_min"] = 50
        t = Torre(tempfile.mkdtemp())
        cid = correr_ciclo(t, sintetica("azar", años=0.5), [tramposa], crit, h, "trampa", log=None)
        b = t.uno("SELECT * FROM bots WHERE ciclo=?", cid)
        self.assertEqual((b["estacion"], b["motivo"]), (3, "fallo_tecnico"))
        self.assertIn("mira el futuro", b["detalle"])


if __name__ == "__main__":
    unittest.main()
