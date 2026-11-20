"""Datos de precios: series sintéticas de control, carga de CSV (MT5 o genérico) y control de calidad.

Una Serie guarda velas OHLC con precios bid. Las sintéticas tienen la respuesta correcta
conocida por construcción: sirven para calibrar la fábrica antes de usar datos reales.
"""
from __future__ import annotations

import csv
import datetime as dt
import hashlib
import math
import random
from dataclasses import dataclass, field


@dataclass
class Serie:
    nombre: str
    t: list  # segundos UTC
    o: list
    h: list
    l: list
    c: list
    v: list
    pip: float = 0.0001
    origen: dict = field(default_factory=dict)
    _dias: list | None = field(default=None, repr=False, compare=False)

    def __len__(self):
        return len(self.c)

    def tramo(self, a: int, b: int | None = None) -> "Serie":
        b = len(self) if b is None else b
        return Serie(self.nombre, self.t[a:b], self.o[a:b], self.h[a:b], self.l[a:b], self.c[a:b],
                     self.v[a:b], self.pip, dict(self.origen, tramo=[a, b]))

    def con_precios(self, o, h, l, c, sufijo="") -> "Serie":
        return Serie(self.nombre + sufijo, self.t, o, h, l, c, self.v, self.pip, dict(self.origen))

    def dias(self) -> list:
        """Fecha UTC (AAAA-MM-DD) de cada vela, para agrupar retornos diarios."""
        if self._dias is None:
            self._dias = [dt.datetime.fromtimestamp(x, dt.timezone.utc).strftime("%Y-%m-%d") for x in self.t]
        return self._dias

    def huella(self) -> str:
        m = hashlib.sha256()
        for i in range(len(self)):
            m.update(f"{self.t[i]},{self.o[i]:.6f},{self.h[i]:.6f},{self.l[i]:.6f},{self.c[i]:.6f};".encode())
        return m.hexdigest()[:12]

    def desde_hasta(self) -> tuple[str, str]:
        f = lambda x: dt.datetime.fromtimestamp(x, dt.timezone.utc).strftime("%Y-%m-%d")
        return f(self.t[0]), f(self.t[-1])


# ---------------------------------------------------------------- sintéticas
TIPOS = {
    "azar": "Camino aleatorio con volatilidad que se agrupa. No tiene ninguna ventaja explotable.",
    "tendencia": "Regímenes alcistas, bajistas y laterales que duran cientos de velas. Ventaja plantada para seguir tendencia.",
    "reversion_corta": "Cada vela tiende a deshacer un poco la anterior. Ventaja real pero más chica que los costos.",
    "reversion": "El precio vuelve hacia un ancla que se mueve lento. Ventaja plantada para reversión a la media.",
    "mixto": "Alterna tramos de tendencia y de reversión con ruido. Parecido a un mercado real.",
}


def sintetica(tipo: str = "azar", años: float = 5, semilla: int = 7, sigma_pips: float = 11.0,
              deriva: float = 0.07, largo_regimen: int = 400, phi: float = -0.12, kappa: float = 0.02,
              precio: float = 1.10, pip: float = 0.0001) -> Serie:
    """Velas H1 de lunes a viernes. `deriva` es la deriva por vela en desvíos (tendencia),
    `phi` la autocorrelación de una vela (reversion_corta), `kappa` la fuerza de vuelta al ancla."""
    if tipo not in TIPOS:
        raise ValueError(f"tipo desconocido: {tipo}. Opciones: {', '.join(TIPOS)}")
    rnd = random.Random(f"{tipo}-{semilla}")
    sig0 = sigma_pips * pip / precio  # desvío del retorno log por vela
    t0 = int(dt.datetime(2019, 1, 7, tzinfo=dt.timezone.utc).timestamp())
    n_obj = int(años * 260 * 24)
    T, O, H, L, C, V = [], [], [], [], [], []
    x = math.log(precio)
    ancla = x
    logsig = math.log(sig0)
    regimen, r_prev = 0, 0.0
    modo_mixto, resto_mixto = "tendencia", 0
    k = 0
    while len(C) < n_obj:
        ts = t0 + 3600 * k
        k += 1
        if dt.datetime.fromtimestamp(ts, dt.timezone.utc).weekday() >= 5:
            continue
        # volatilidad que se agrupa (log-AR(1))
        logsig = 0.985 * logsig + 0.015 * math.log(sig0) + 0.06 * rnd.gauss(0, 1)
        s = math.exp(logsig)
        modo = tipo
        if tipo == "mixto":
            if resto_mixto <= 0:
                modo_mixto = rnd.choice(["tendencia", "reversion", "azar"])
                resto_mixto = rnd.randint(800, 3000)
            resto_mixto -= 1
            modo = modo_mixto
        mu = 0.0
        if modo == "tendencia":
            if rnd.random() < 1 / largo_regimen:
                regimen = rnd.choice([-1, 0, 1])
            mu = regimen * deriva * s
        elif modo == "reversion":
            ancla += rnd.gauss(0, s * 0.15)
            mu = kappa * (ancla - x)
        elif modo == "reversion_corta":
            mu = phi * r_prev
        if modo != "reversion":
            ancla = x
        abre = x
        camino = [x]
        subs = [rnd.gauss(0, s / 2) for _ in range(4)]
        subs[0] += mu
        for e in subs:
            x += e
            camino.append(x)
        r_prev = x - abre
        mecha = abs(rnd.gauss(0, s * 0.15))
        T.append(ts)
        O.append(round(math.exp(abre), 5))
        H.append(round(math.exp(max(camino) + mecha), 5))
        L.append(round(math.exp(min(camino) - abs(rnd.gauss(0, s * 0.15))), 5))
        C.append(round(math.exp(x), 5))
        V.append(int(400 * s / sig0 * math.exp(rnd.gauss(0, 0.3))))
    # coherencia OHLC tras redondear
    for i in range(len(C)):
        H[i] = max(H[i], O[i], C[i])
        L[i] = min(L[i], O[i], C[i])
    return Serie(f"SINT-{tipo}-{semilla}", T, O, H, L, C, V, pip,
                 {"tipo": "sintetica", "sintetica": tipo, "semilla": semilla, "años": años,
                  "sigma_pips": sigma_pips, "deriva": deriva, "largo_regimen": largo_regimen,
                  "phi": phi, "kappa": kappa, "precio": precio, "pip": pip})


def desde_origen(origen: dict) -> Serie:
    """Reconstruye una serie a partir de su origen guardado en la torre."""
    if origen.get("tipo") == "sintetica":
        args = {k: origen[k] for k in ("años", "sigma_pips", "deriva", "largo_regimen", "phi", "kappa", "precio", "pip")}
        return sintetica(origen["sintetica"], semilla=origen["semilla"], **args)
    return cargar_csv(origen["ruta"], origen.get("nombre"), origen.get("pip"))


# ---------------------------------------------------------------- CSV
def _pip_probable(precio: float) -> float:
    if precio <= 0:
        return 0.0001
    return 10 ** (math.floor(math.log10(precio)) - 4)


def cargar_csv(ruta: str, nombre: str | None = None, pip: float | None = None) -> Serie:
    """Lee el CSV que exporta MT5 (<DATE> <TIME> <OPEN> ...) o uno genérico
    (time/date, open, high, low, close, volume). Detecta el separador solo."""
    with open(ruta, newline="", encoding="utf-8-sig") as f:
        muestra = f.read(4096)
        f.seek(0)
        sep = max(["\t", ",", ";"], key=muestra.count)
        filas = list(csv.reader(f, delimiter=sep))
    cab = [x.strip().strip("<>").lower() for x in filas[0]]

    def col(*nombres):
        for n in nombres:
            if n in cab:
                return cab.index(n)
        return None

    i_d, i_t = col("date", "fecha", "datetime", "time", "timestamp"), col("time", "hora")
    if i_t == i_d:
        i_t = None
    i_o, i_h, i_l, i_c = col("open"), col("high"), col("low"), col("close")
    i_v = col("tickvol", "volume", "vol", "tick_volume")
    if None in (i_d, i_o, i_h, i_l, i_c):
        raise ValueError(f"No encuentro las columnas de fecha y OHLC en {ruta}: {cab}")
    T, O, H, L, C, V = [], [], [], [], [], []
    for fila in filas[1:]:
        if not fila or len(fila) <= max(i_o, i_h, i_l, i_c):
            continue
        texto = fila[i_d].strip() + (" " + fila[i_t].strip() if i_t is not None else "")
        T.append(_fecha(texto))
        O.append(float(fila[i_o])); H.append(float(fila[i_h])); L.append(float(fila[i_l])); C.append(float(fila[i_c]))
        V.append(float(fila[i_v]) if i_v is not None and fila[i_v] else 0.0)
    orden = sorted(range(len(T)), key=T.__getitem__)
    s = Serie(nombre or ruta.rsplit("/", 1)[-1].rsplit(".", 1)[0],
              [T[i] for i in orden], [O[i] for i in orden], [H[i] for i in orden],
              [L[i] for i in orden], [C[i] for i in orden], [V[i] for i in orden],
              pip or _pip_probable(C[0]), {"tipo": "csv", "ruta": ruta, "nombre": nombre, "pip": pip})
    return s


def _fecha(texto: str) -> int:
    texto = texto.replace("T", " ").replace("Z", "").strip()
    if texto.isdigit():
        n = int(texto)
        return n // 1000 if n > 10**11 else n
    for fmt in ("%Y.%m.%d %H:%M:%S", "%Y.%m.%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M",
                "%Y.%m.%d", "%Y-%m-%d", "%d/%m/%Y %H:%M", "%d/%m/%Y"):
        try:
            return int(dt.datetime.strptime(texto, fmt).replace(tzinfo=dt.timezone.utc).timestamp())
        except ValueError:
            pass
    raise ValueError(f"Fecha que no entiendo: {texto!r}")


def guardar_csv(serie: Serie, ruta: str):
    with open(ruta, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["time", "open", "high", "low", "close", "volume"])
        for i in range(len(serie)):
            w.writerow([dt.datetime.fromtimestamp(serie.t[i], dt.timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                        serie.o[i], serie.h[i], serie.l[i], serie.c[i], serie.v[i]])


# ---------------------------------------------------------------- calidad
def calidad(serie: Serie) -> dict:
    """Mide si los datos sirven antes de mirar ningún resultado."""
    n = len(serie)
    if n < 3:
        return {"velas": n, "veredicto": "insuficiente", "problemas": ["menos de 3 velas"]}
    pasos = [serie.t[i] - serie.t[i - 1] for i in range(1, n)]
    paso = sorted(pasos)[len(pasos) // 2]
    duplicadas = sum(1 for p in pasos if p <= 0)
    huecos = sum(1 for p in pasos if p > 3 * paso and p < 48 * 3600 + 3 * paso) if paso < 86400 else 0
    planas = sum(1 for i in range(n) if serie.h[i] == serie.l[i])
    rets = [math.log(serie.c[i] / serie.c[i - 1]) for i in range(1, n) if serie.c[i - 1] > 0]
    m = sum(rets) / len(rets)
    sd = math.sqrt(sum((r - m) ** 2 for r in rets) / len(rets)) or 1e-12
    saltos = sum(1 for r in rets if abs(r - m) > 10 * sd)
    incoherentes = sum(1 for i in range(n) if not (serie.l[i] <= min(serie.o[i], serie.c[i]) <= max(serie.o[i], serie.c[i]) <= serie.h[i]))
    dias = len(set(serie.dias()))
    problemas = []
    if duplicadas: problemas.append(f"{duplicadas} velas duplicadas o desordenadas")
    if huecos > n * 0.01: problemas.append(f"{huecos} huecos en horario de mercado")
    if planas > n * 0.02: problemas.append(f"{planas} velas sin rango")
    if saltos > n * 0.001: problemas.append(f"{saltos} saltos de más de 10 desvíos")
    if incoherentes: problemas.append(f"{incoherentes} velas con OHLC incoherente")
    return {"velas": n, "dias": dias, "paso_min": paso // 60, "duplicadas": duplicadas, "huecos": huecos,
            "planas": planas, "saltos": saltos, "incoherentes": incoherentes,
            "veredicto": "buena" if not problemas else "revisar", "problemas": problemas}
