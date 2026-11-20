"""Fase de estudio: escribe el catálogo de estrategias e indicadores como Markdown legible.

Los .md se generan desde el código (una sola fuente de verdad): si cambia una ficha, se regenera.
"""
from __future__ import annotations

import os

from .estrategias import CATALOGO, CONTROLES, azar_optimizado
from .indicadores import CATALOGO as INDICADORES

FAMILIAS = {
    "tendencia": ("Seguir lo que ya se mueve", "Los precios con impulso siguen un tiempo en la misma dirección (gente que llega tarde, coberturas, flujos lentos).",
                  "Mercados con regímenes largos: divisas mayores en H4/D1, índices, materias primas.", "En laterales: muchas pérdidas chicas seguidas."),
    "ruptura": ("Entrar cuando se rompe un rango", "Romper un máximo de semanas revela un desequilibrio que tarda en absorberse.",
                "Después de períodos de compresión; activos con noticias.", "Rupturas falsas; necesita stop y paciencia."),
    "momento": ("Ir a favor del retorno reciente", "El retorno pasado predice levemente el futuro (efecto documentado en décadas de datos).",
                "Carteras de varios activos y horizontes de semanas.", "Giros bruscos (choques de momento)."),
    "reversión": ("Apostar a que el exceso se deshace", "Movimientos muy concentrados suelen deshacerse en parte (liquidez, sobrerreacción).",
                  "Laterales, pares que oscilan, horarios tranquilos.", "Tendencias fuertes: el precio sigue yéndose y el stop salta."),
    "volatilidad": ("Esperar la expansión", "La volatilidad se agrupa: tras un período quieto suele venir uno amplio.",
                    "Antes de noticias o aperturas de sesión.", "Expansiones que van y vuelven."),
    "régimen": ("Elegir la regla según el mercado", "Medir si el mercado va derecho o va y viene, y usar la regla que corresponde.",
                "Activos que alternan tendencia y lateral.", "El detector llega tarde al cambio de régimen."),
    "control": ("Casos de control", "No buscan ganar: tienen la respuesta conocida y sirven para calibrar la fábrica.", "—", "—"),
}


def _tabla(filas, cab):
    out = ["| " + " | ".join(cab) + " |", "|" + "---|" * len(cab)]
    for f in filas:
        out.append("| " + " | ".join(str(x).replace("|", "/") for x in f) + " |")
    return "\n".join(out)


def estrategias_md() -> str:
    partes = ["# Estudio de estrategias",
              "",
              "Generado desde `fabrica/estrategias.py`. Cada ficha es una **familia**: todas sus variantes de la grilla "
              "se prueban y **todas cuentan** para la vara estadística (N efectivo). Por eso las grillas son chicas a propósito.",
              "",
              "## Familias y por qué podrían funcionar", ""]
    usadas = sorted({e.familia for e in CATALOGO})
    partes.append(_tabla([(f, *FAMILIAS[f]) for f in usadas], ["Familia", "Idea", "Por qué existiría la ventaja", "Dónde suele funcionar", "Dónde falla"]))
    partes += ["", "## Las fichas del catálogo", ""]
    total = 0
    for e in CATALOGO:
        n = len(e.variantes())
        total += n
        grilla = "; ".join(f"{k} ∈ {v}" for k, v in e.grilla.items())
        partes += [f"### {e.id} · {e.nombre}", "",
                   f"- **Familia:** {e.familia}",
                   f"- **Lógica de mercado:** {e.logica}",
                   f"- **Indicadores:** {', '.join(e.indicadores)}",
                   f"- **Entrada:** {e.entrada}",
                   f"- **Salida:** {e.salida} Stop inicial a {e.stop_atr:g} ATR(14).",
                   f"- **Grilla:** {grilla} → {n} variantes",
                   *( [f"- **Referencia:** {e.referencia}"] if e.referencia else [] ),
                   ""]
    partes += [f"**Total:** {len(CATALOGO)} fichas, {total} bots por ciclo.", "",
               "## Controles de calibración", "",
               "No son estrategias para operar: tienen la respuesta correcta conocida y sirven para comprobar que la fábrica distingue.", ""]
    ctrl = list(CONTROLES.values()) + [azar_optimizado()]
    partes.append(_tabla([(e.id, e.nombre, e.logica) for e in ctrl], ["Id", "Control", "Qué prueba"]))
    partes += ["", "## Ideas para las próximas fichas (Investigador)", "",
               "- Sesiones: ruptura del rango asiático en la apertura de Londres (necesita velas con horario del bróker).",
               "- Estacionalidad intradía y de fin de mes (necesita datos reales con horario).",
               "- Carry y diferencial de tasas en divisas (necesita datos de swaps del bróker).",
               "- Cartera de momento entre varios activos (necesita varias series alineadas).",
               "- Filtros de volatilidad sobre las fichas que sobrevivan (una ficha nueva por filtro, nunca un parche).", ""]
    return "\n".join(partes)


def indicadores_md() -> str:
    partes = ["# Listado de indicadores", "",
              "Generado desde `fabrica/indicadores.py`. Todos son **causales**: el valor de la vela t usa solo datos hasta t "
              "(la estación E3 lo comprueba borrando el futuro y recalculando).", ""]
    por_fam = {}
    for ind in INDICADORES:
        por_fam.setdefault(ind[2], []).append(ind)
    for fam, lista in por_fam.items():
        partes += [f"## {fam.capitalize()}", ""]
        partes.append(_tabla([(f"`{i[0]}`", i[1], i[3], i[4], i[5], i[6]) for i in lista],
                             ["Código", "Indicador", "Qué mide", "Cómo se usa", "Cuidado", "Parámetros típicos"]))
        partes.append("")
    partes += ["## Reglas para usar indicadores", "",
               "1. Un indicador por pregunta: dirección, fuerza, volatilidad o régimen. Dos del mismo tipo no confirman nada.",
               "2. El stop y el tamaño salen del ATR, nunca de pips fijos.",
               "3. Cada filtro nuevo es una ficha nueva (una prueba más que cuenta), no un ajuste de la anterior.", ""]
    return "\n".join(partes)


def escribir(carpeta: str) -> list:
    os.makedirs(carpeta, exist_ok=True)
    rutas = []
    for nombre, texto in (("estrategias.md", estrategias_md()), ("indicadores.md", indicadores_md())):
        r = os.path.join(carpeta, nombre)
        with open(r, "w") as f:
            f.write(texto)
        rutas.append(r)
    return rutas
