"""Genera el panel de la fábrica: una sola página HTML, sin dependencias, que se abre en cualquier navegador.

Todo sale de la base SQLite. Nada se escribe a mano.
"""
from __future__ import annotations

import csv
import datetime as dt
import html
import json
import os

from . import VERSION
from .estrategias import CATALOGO
from .indicadores import CATALOGO as INDICADORES
from .torre import MOTIVOS, Torre


def _curva(carpeta):
    if not carpeta or not os.path.exists(os.path.join(carpeta, "curva.csv")):
        return []
    with open(os.path.join(carpeta, "curva.csv")) as f:
        return [float(r["r_dia"]) for r in csv.DictReader(f)]


def _reducir(xs, n=220):
    if len(xs) <= n:
        return xs
    paso = len(xs) / n
    return [xs[int(i * paso)] for i in range(n)] + [xs[-1]]


def datos_panel(torre: Torre) -> dict:
    ciclos = []
    for c in torre.q("SELECT * FROM ciclos ORDER BY id"):
        if c["nombre"].startswith("Calibración amplia"):
            continue  # su resultado va resumido en la tabla de calibración
        cid = c["id"]
        res = json.loads(c["resumen_json"] or "{}")
        familias = []
        for f in torre.q("SELECT * FROM familias WHERE ciclo=? ORDER BY id", cid):
            ver = json.loads(f["veredicto_json"]) if f["veredicto_json"] else {}
            n_var = torre.uno("SELECT COUNT(*) FROM bots WHERE familia=?", f["id"])[0]
            n_e4 = torre.uno("SELECT COUNT(*) FROM bots WHERE familia=? AND estacion>=5", f["id"])[0]
            fila = {"id": f["id"], "estrategia": f["estrategia"], "estado": f["estado"], "variantes": n_var, "pasaron_e4": n_e4,
                    "firma": f["firma"]}
            if ver.get("pruebas"):
                fila.update({"dsr": round(ver["dsr"]["dsr"], 3), "n_eff": ver["grupos"]["n_eff"], "pf_fuera": ver["fuera"]["pf"],
                             "pf_entr": ver["entrenamiento"]["pf"], "bot": ver["bot"], "params": ver["params"], "pruebas": ver["pruebas"],
                             "ops_entr": ver["entrenamiento"]["operaciones"], "ops_fuera": ver["fuera"]["operaciones"],
                             "neto_entr": ver["entrenamiento"]["neto_r"], "neto_fuera": ver["fuera"]["neto_r"],
                             "caida": ver["entrenamiento"]["caida_max_pct"], "sharpe": ver["entrenamiento"]["sharpe_anual"],
                             "sr0": round(ver["dsr"]["sr0"], 4), "sr": round(ver["dsr"]["sr"], 4), "t": ver["dsr"]["t"],
                             "participacion": ver["grupos"]["participacion"], "aprobada": ver["aprobada"]})
                cor = torre.q("SELECT * FROM corridas WHERE familia=? AND estacion=5 ORDER BY id", f["id"])
                if len(cor) >= 2:
                    ent, fue = _curva(cor[0]["carpeta"]), _curva(cor[1]["carpeta"])
                    acc, cam = 0.0, []
                    for x in ent + fue:
                        acc += x
                        cam.append(round(acc, 2))
                    corte = len(ent) / max(1, len(cam))
                    fila["curva"] = _reducir(cam)
                    fila["corte"] = round(corte, 4)
                    fila["corridas"] = [cor[0]["id"], cor[1]["id"]]
                    man = json.loads(cor[0]["manifiesto_json"])
                    fila["manifiesto"] = {"datos": man.get("datos"), "criterios": man.get("criterios"), "costos": man.get("costos")}
            elif f["veredicto_json"]:
                fila["problemas"] = ver.get("problemas")
            familias.append(fila)
        bots = [dict(r) for r in torre.q(
            "SELECT b.id, b.estrategia, b.params_json, b.estacion, b.estado, b.motivo, b.detalle, c.metricas_json FROM bots b "
            "LEFT JOIN corridas c ON c.bot=b.id AND c.estacion=4 WHERE b.ciclo=? ORDER BY b.estacion DESC, b.id", cid)]
        for b in bots:
            m = json.loads(b.pop("metricas_json") or "{}")
            b.update({"pf": m.get("pf"), "ops": m.get("operaciones"), "sharpe": m.get("sharpe_anual"), "params": json.loads(b.pop("params_json"))})
        cal = json.loads(c["calidad_json"] or "{}")
        n_pruebas = torre.uno("SELECT COUNT(*) FROM pruebas WHERE ciclo=?", cid)[0]
        ciclos.append({"id": cid, "nombre": c["nombre"], "creado": c["creado"], "datos": json.loads(c["datos_json"]),
                       "huella_datos": c["datos_huella"], "huella_criterios": c["criterios_huella"], "calidad": cal,
                       "embudo": res.get("embudo", {}), "motivos": res.get("motivos", {}), "familias": familias,
                       "bots": bots[:80], "total_bots": len(bots), "pruebas": n_pruebas})
    cal = [dict(r) for r in torre.q("SELECT control, nombre, ciclo, esperado, obtenido, ok FROM calibracion ORDER BY id")]
    # quedarse con la última corrida de cada control
    ultimos = {}
    for r in cal:
        ultimos[r["control"]] = r
    eventos = [dict(r) for r in torre.q("SELECT t, ciclo, actor, texto FROM eventos ORDER BY id DESC LIMIT 40")]
    tareas = [dict(r) for r in torre.q("SELECT rol, texto, estado FROM tareas GROUP BY rol, texto ORDER BY MAX(id) DESC LIMIT 5")]
    # lo operativo no mezcla los controles de calibración (son sintéticos y ya se firmaron solos)
    reales = "(SELECT id FROM ciclos WHERE nombre NOT LIKE 'Control %' AND nombre NOT LIKE 'Calibración%')"
    espera = [dict(r) for r in torre.q(f"SELECT id, ciclo, estrategia FROM familias WHERE estado='congelada' AND ciclo IN {reales}")]
    listas = [dict(r) for r in torre.q(f"SELECT id, ciclo, estrategia, params_json FROM bots WHERE estacion=6 AND ciclo IN {reales}")]
    fallos = torre.uno(f"SELECT COUNT(*) FROM bots WHERE motivo='fallo_tecnico' AND ciclo IN {reales}")[0]
    return {"generado": dt.datetime.now().strftime("%d/%m/%Y %H:%M"), "version": VERSION, "ciclos": ciclos,
            "calibracion": list(ultimos.values()), "eventos": eventos, "tareas": tareas, "espera": espera, "listas": listas,
            "fallos": fallos, "motivos": MOTIVOS, "n_estrategias": len(CATALOGO), "n_indicadores": len(INDICADORES),
            "nombres": {e.id: e.nombre for e in CATALOGO} | {"C01": "Entradas al azar", "C02": "Contra la última vela", "C03": "Azar optimizado"}}


def generar(torre: Torre, destino: str, completo: bool = True):
    """completo=False deja solo el contenido (para publicarlo como artefacto, que agrega el esqueleto)."""
    datos = datos_panel(torre)
    pagina = PLANTILLA.replace("/*DATOS*/null", json.dumps(datos, ensure_ascii=False).replace("</", "<\\/"))
    if completo:
        pagina = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
                  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                  + pagina.replace("<div class=\"wrap\">", "</head>\n<body>\n<div class=\"wrap\">", 1) + "</body>\n</html>\n")
    with open(destino, "w") as f:
        f.write(pagina)
    return destino


PLANTILLA = r"""<title>Fábrica de bots</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
/* Planta industrial, igual que el diseño v3: hormigón claro, tinta grafito, amarillo de seguridad para el flujo,
   azul = Claude, gris = motor determinista, ocre = vos. Arriba lo operativo, debajo un ciclo por pestaña. */
:root{
  --bg:#f1f1ee; --surface:#ffffff; --ink:#1b1f22; --muted:#5f666b; --line:#d8d9d4;
  --flow:#a87400; --flow-soft:#fbf0d2; --claude:#2f62b5; --claude-soft:#e3ecf9;
  --motor:#5b6770; --motor-soft:#e8ebec; --you:#9c5b12; --you-soft:#f5e7d6;
  --ok:#1f7a4d; --ok-soft:#e1f1e8; --bad:#b4332b; --bad-soft:#f7e1df; --park:#6b4fa8; --park-soft:#ece6f7;
  --grid:rgba(27,31,34,.04);
  --f-display:"Bricolage Grotesque","Segoe UI",system-ui,sans-serif;
  --f-body:"IBM Plex Sans","Segoe UI",system-ui,sans-serif;
  --f-mono:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --bg:#121518; --surface:#1a1f23; --ink:#e7eaec; --muted:#9ba5ab; --line:#2d353b;
    --flow:#f2b632; --flow-soft:#3a2f12; --claude:#86afee; --claude-soft:#1c2c44;
    --motor:#a7b3ba; --motor-soft:#262e33; --you:#e2a560; --you-soft:#3a2a18;
    --ok:#5cc58f; --ok-soft:#173326; --bad:#ee7a70; --bad-soft:#3d1d1b; --park:#b9a2ec; --park-soft:#2b2340; --grid:rgba(231,234,236,.035);
    color-scheme:dark;
  }
}
:root[data-theme="dark"]{
  --bg:#121518; --surface:#1a1f23; --ink:#e7eaec; --muted:#9ba5ab; --line:#2d353b;
  --flow:#f2b632; --flow-soft:#3a2f12; --claude:#86afee; --claude-soft:#1c2c44;
  --motor:#a7b3ba; --motor-soft:#262e33; --you:#e2a560; --you-soft:#3a2a18;
  --ok:#5cc58f; --ok-soft:#173326; --bad:#ee7a70; --bad-soft:#3d1d1b; --park:#b9a2ec; --park-soft:#2b2340; --grid:rgba(231,234,236,.035);
  color-scheme:dark;
}
*{box-sizing:border-box}
body{margin:0;background-color:var(--bg);background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:28px 28px;color:var(--ink);font-family:var(--f-body);font-size:16px;line-height:1.5}
.wrap{max-width:1160px;margin:0 auto;padding-block:32px 72px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:44px}
h1,h2,h3,h4{font-family:var(--f-display);text-wrap:balance;margin:0;line-height:1.15}
h1{font-size:clamp(1.9rem,4.4vw,2.8rem)} h2{font-size:1.5rem} h3{font-size:1.1rem} h4{font-size:.98rem}
p{margin:0}
.mono{font-family:var(--f-mono);font-variant-numeric:tabular-nums}
.muted{color:var(--muted)}
.kicker{font-family:var(--f-mono);font-size:.76rem;letter-spacing:.06em;text-transform:uppercase;color:var(--flow)}
.sec{display:flex;flex-direction:column;gap:16px}
.sec-head{display:flex;flex-direction:column;gap:6px;max-width:72ch}
.card{background:var(--surface);border:1px solid var(--line);border-radius:12px}
.chip{display:inline-flex;align-items:center;gap:6px;font-family:var(--f-mono);font-size:.72rem;padding:2px 9px;border-radius:999px;background:var(--cs);color:var(--c);font-weight:500;white-space:nowrap}
.r-claude{--c:var(--claude);--cs:var(--claude-soft)} .r-motor{--c:var(--motor);--cs:var(--motor-soft)} .r-you{--c:var(--you);--cs:var(--you-soft)}
.r-ok{--c:var(--ok);--cs:var(--ok-soft)} .r-bad{--c:var(--bad);--cs:var(--bad-soft)} .r-flow{--c:var(--flow);--cs:var(--flow-soft)} .r-park{--c:var(--park);--cs:var(--park-soft)}
header{display:flex;flex-direction:column;gap:14px}
.lead{font-size:1.08rem;max-width:70ch}
.verdict{padding:16px 20px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;border-left:6px solid var(--c);background:var(--cs);border-radius:12px}
.verdict .big{font-family:var(--f-display);font-size:2.2rem;font-weight:700;color:var(--c);font-variant-numeric:tabular-nums}
.verdict p{max-width:60ch}
.now{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.now-col{padding:12px 14px;border-top:4px solid var(--c);display:flex;flex-direction:column;gap:8px;min-width:0}
.now-col h4{display:flex;justify-content:space-between;align-items:baseline}
.now-col h4 .mono{font-size:1.2rem;color:var(--c)}
.item{font-size:.86rem;display:flex;flex-direction:column;gap:2px;padding-top:6px;border-top:1px dashed var(--line);overflow-wrap:anywhere}
.item .mono{font-size:.74rem;color:var(--muted)}
.tbl-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:10px;background:var(--surface)}
table{border-collapse:collapse;width:100%;font-size:.86rem}
th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{font-family:var(--f-mono);font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:500;background:var(--bg);white-space:nowrap}
td.num,th.num{font-family:var(--f-mono);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
tr:last-child td{border-bottom:none}
.nowrap{white-space:nowrap}
.tabs{display:flex;gap:8px;flex-wrap:wrap}
.tab{font:inherit;font-size:.86rem;min-height:44px;padding:8px 14px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:10px;cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:2px}
.tab .mono{font-size:.7rem;color:var(--muted)}
.tab[aria-selected="true"]{border-color:var(--ink);box-shadow:inset 0 -3px 0 var(--flow)}
.tab:hover{border-color:var(--muted)}
.funnel{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}
@media (max-width:760px){.funnel{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (max-width:420px){.funnel{grid-template-columns:repeat(2,minmax(0,1fr))}}
.cnt{border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:2px;border-bottom:3px solid var(--c,var(--flow))}
.cnt .n{font-family:var(--f-mono);font-size:1.35rem;font-variant-numeric:tabular-nums}
.cnt .l{font-size:.76rem;color:var(--muted);line-height:1.25}
.grid2{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:16px}
@media (max-width:860px){.grid2{grid-template-columns:minmax(0,1fr)}}
.panel{padding:16px;display:flex;flex-direction:column;gap:10px;min-width:0}
.brow{display:grid;grid-template-columns:1fr 40px;gap:8px;align-items:end;font-size:.82rem}
.brow>span:last-child{font-family:var(--f-mono);text-align:right}
.bar{height:8px;border-radius:4px;background:var(--line);position:relative;overflow:hidden;margin-top:3px}
.bar i{position:absolute;inset:0 auto 0 0;background:var(--c);border-radius:4px}
.feed{display:flex;flex-direction:column;gap:8px;font-size:.84rem}
.feed div{display:grid;grid-template-columns:auto 1fr;gap:4px 10px}
.feed .who{font-family:var(--f-mono);font-size:.72rem;color:var(--claude);padding-top:2px}
.sheet{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface)}
.sheet-head{padding:14px 16px;background:var(--bg);border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:8px}
.manifest{display:flex;flex-wrap:wrap;gap:6px}
.manifest span{font-family:var(--f-mono);font-size:.72rem;padding:2px 8px;border:1px solid var(--line);border-radius:6px;background:var(--surface)}
.sheet-body{padding:16px;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:18px}
@media (max-width:860px){.sheet-body{grid-template-columns:minmax(0,1fr)}}
.mrow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
@media (max-width:480px){.mrow{grid-template-columns:repeat(2,minmax(0,1fr))}}
.fbox{border:1px solid var(--line);border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:1px}
.fbox .mono{font-size:1.15rem}
.fbox span:last-child{font-size:.76rem;color:var(--muted)}
.checks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:.88rem}
.checks li{display:grid;grid-template-columns:22px 1fr auto;gap:8px;align-items:baseline}
.checks .mk{font-family:var(--f-mono);font-weight:600}
.checks .ok .mk{color:var(--ok)} .checks .no .mk{color:var(--bad)} .checks .info .mk{color:var(--muted)}
.checks .v{font-family:var(--f-mono);font-size:.78rem;color:var(--muted);white-space:nowrap}
svg.eq{width:100%;height:auto;display:block}
svg.eq text{fill:var(--muted);font-family:var(--f-mono);font-size:11px}
.pick{display:flex;gap:6px;flex-wrap:wrap}
.pick button{font:inherit;font-size:.8rem;min-height:44px;padding:6px 12px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer}
.pick button[aria-pressed="true"]{border-color:var(--ink);background:var(--bg)}
.foot{font-size:.82rem;color:var(--muted);border-top:1px solid var(--line);padding-top:14px;display:flex;flex-direction:column;gap:4px}
:focus-visible{outline:2px solid var(--flow);outline-offset:2px}
@media (prefers-reduced-motion: reduce){*{transition:none!important}}
</style>

<div class="wrap">
<header>
  <span class="kicker" id="gen"></span>
  <h1>Fábrica de bots</h1>
  <p class="lead">Arriba lo que necesita tu atención. Debajo, cada ciclo: qué entró a la línea, dónde salió cada bot y por qué. Todo sale de la base de la torre.</p>
  <div id="verdict"></div>
</header>

<section class="sec" aria-labelledby="now-h">
  <div class="sec-head"><span class="kicker">Ahora</span><h2 id="now-h">Qué espera de vos</h2></div>
  <div class="now" id="now"></div>
</section>

<section class="sec" aria-labelledby="cal-h">
  <div class="sec-head"><span class="kicker">Fase 1 · calibración</span><h2 id="cal-h">¿La fábrica distingue?</h2>
  <p class="muted">A–F son casos con respuesta conocida: si alguno sale mal, ningún resultado sobre datos reales es confiable. G–I repiten el catálogo en muchos mercados y miden cuánto aprueba por azar y cuánto encuentra.</p></div>
  <div class="tbl-wrap"><table style="min-width:640px"><thead><tr><th></th><th>Control</th><th>Debería</th><th>Obtuvo</th></tr></thead><tbody id="cal"></tbody></table></div>
</section>

<section class="sec" aria-labelledby="cic-h">
  <div class="sec-head"><span class="kicker">La línea</span><h2 id="cic-h">Ciclos</h2>
  <p class="muted">Un ciclo es un conjunto de datos con las mismas reglas. Elegí uno.</p></div>
  <div class="tabs" role="tablist" id="tabs"></div>
  <div id="ciclo" style="display:flex;flex-direction:column;gap:16px"></div>
</section>

<section class="sec" aria-labelledby="feed-h">
  <div class="grid2">
    <div class="card panel"><h3 id="feed-h">Parte del Analista</h3><div class="feed" id="feed"></div></div>
    <div class="card panel"><h3>Cola para la próxima vuelta</h3><div class="feed" id="tareas"></div></div>
  </div>
</section>

<footer class="foot" id="foot"></footer>
</div>

<script>
const D=/*DATOS*/null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num=(x,d=2)=>x==null?"—":Number(x).toLocaleString("es-UY",{maximumFractionDigits:d,minimumFractionDigits:0});
const nom=id=>D.nombres[id]||id;
const estadoChip=e=>{
  const m={"aprobada":"r-ok","lista para demo":"r-ok","rechazada":"r-bad","cementerio":"r-bad","estacionada":"r-park","espera datos":"r-flow",
   "fallo técnico":"r-motor","congelada":"r-you","espera tu firma":"r-you","variante no elegida":"r-motor","sin sobrevivientes":"r-motor",
   "descartada en E1":"r-bad","holdout abierto":"r-claude","pasa a E5":"r-claude","en línea":"r-claude"};
  return `<span class="chip ${m[e]||"r-motor"}">${esc(e)}</span>`;
};
const params=p=>Object.entries(p||{}).map(([k,v])=>`${k} ${v}`).join(" · ");

$("gen").textContent=`Panel · generado ${D.generado} · fábrica ${D.version}`;
$("foot").innerHTML=`<span>Catálogo: ${D.n_estrategias} estrategias y ${D.n_indicadores} indicadores. Datos de calibración: series sintéticas generadas por la fábrica, ninguna cotización real.</span><span>Comandos: <span class="mono">python -m fabrica calibrar</span> · <span class="mono">ciclo --csv tus_velas.csv</span> · <span class="mono">firmar FAM-xxx --nombre …</span> · <span class="mono">panel</span></span>`;

// veredicto de calibración
const base=D.calibracion.filter(c=>c.control.length===1), medidas=D.calibracion.filter(c=>c.control.length>1);
const cal=base, okc=cal.filter(c=>c.ok).length;
$("verdict").innerHTML=cal.length?`<div class="verdict" style="--c:var(${okc===cal.length?"--ok":"--bad"});--cs:var(${okc===cal.length?"--ok-soft":"--bad-soft"})"><span class="big">${okc}/${cal.length}</span><p><b>${okc===cal.length?"La fábrica distingue.":"La fábrica todavía no distingue."}</b> ${okc===cal.length?"Aprueba la ventaja plantada y rechaza el azar, el sobreajuste y la ventaja que no paga los costos. Se puede pasar a datos reales.":"Revisá los criterios antes de usar datos reales."}</p></div>`:"";
$("cal").innerHTML=base.concat(medidas).map(c=>`<tr><td><span class="chip ${c.ok?"r-ok":c.control.length>1?"r-flow":"r-bad"}">${c.control.length>1?(c.ok?"medida":"potencia baja"):c.ok?"bien":"mal"}</span></td><td><b>${esc(c.control.split("·")[0])}</b> · ${esc(c.nombre)}</td><td class="muted">${esc(c.esperado)}</td><td>${esc(c.obtenido)}</td></tr>`).join("")||`<tr><td colspan="4" class="muted">Todavía no se calibró. Corré <span class="mono">python -m fabrica calibrar</span>.</td></tr>`;

// ahora
const col=(t,n,c,items,vacio)=>`<div class="card now-col" style="--c:${c}"><h4>${t}<span class="mono">${n}</span></h4>${items.length?items.join(""):`<div class="item muted">${vacio}</div>`}</div>`;
$("now").innerHTML=
 col("Tu firma",D.espera.length,"var(--you)",D.espera.map(f=>`<div class="item"><span class="mono">${f.id} · ${f.ciclo}</span><span>Abrir el tramo reservado de ${esc(nom(f.estrategia))}</span></div>`),"Nada espera tu firma.")+
 col("Listas para demo",D.listas.length,"var(--ok)",D.listas.slice(0,6).map(b=>`<div class="item"><span class="mono">${b.id} · ${b.ciclo}</span><span>${esc(nom(b.estrategia))} · ${esc(params(JSON.parse(b.params_json)))}</span></div>`),"Ningún bot aprobó la robustez todavía.")+
 col("Fallos técnicos",D.fallos,"var(--motor)",D.fallos?[`<div class="item"><span>Bots que no compilaron o miraban el futuro. Se reintentan; no cuentan como resultado.</span></div>`]:[],"Sin fallos técnicos.");

// ciclos
const MOT={"resultado_negativo":["--bad","resultado negativo"],"inviable_cuenta":["--park","inviable para la cuenta"],"datos_insuficientes":["--flow","datos insuficientes"],"fallo_tecnico":["--motor","fallo técnico"]};
function curva(f){
  const ys=f.curva, W=560,H=200,L=44,R=12,T=12,B=26;
  const mn=Math.min(0,...ys), mx=Math.max(0,...ys), sx=i=>L+(W-L-R)*i/(ys.length-1), sy=v=>T+(H-T-B)*(1-(v-mn)/((mx-mn)||1));
  const cx=L+(W-L-R)*f.corte;
  const d=ys.map((v,i)=>(i?"L":"M")+sx(i).toFixed(1)+","+sy(v).toFixed(1)).join("");
  const ticks=[mn,(mn+mx)/2,mx].map(v=>Math.round(v));
  return `<svg class="eq" viewBox="0 0 ${W} ${H}" role="img" aria-label="Curva acumulada en R">
   <rect x="${cx}" y="${T}" width="${W-R-cx}" height="${H-T-B}" fill="var(--flow-soft)"/>
   ${ticks.map(v=>`<line x1="${L}" x2="${W-R}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--line)"/><text x="${L-6}" y="${sy(v)+4}" text-anchor="end">${v}R</text>`).join("")}
   <line x1="${L}" x2="${W-R}" y1="${sy(0)}" y2="${sy(0)}" stroke="var(--muted)" stroke-dasharray="3 3"/>
   <path d="${d} L${sx(ys.length-1)},${sy(mn)} L${sx(0)},${sy(mn)} Z" fill="var(--claude)" opacity=".10"/>
   <path d="${d}" fill="none" stroke="var(--claude)" stroke-width="2"/>
   <circle cx="${sx(ys.length-1)}" cy="${sy(ys.at(-1))}" r="4" fill="var(--claude)"/>
   <text x="${L}" y="${H-8}">entrenamiento</text><text x="${Math.min(cx+6,W-R-90)}" y="${H-8}" fill="var(--flow)">tramo reservado</text>
  </svg>`;
}
function ficha(f,c){
  const pr=Object.entries(f.pruebas);
  return `<div class="sheet"><div class="sheet-head"><span class="kicker" style="color:var(--claude)">Ficha de robustez · ${f.corridas?f.corridas.join(" + "):""}</span>
   <h4>${esc(f.bot)} · ${esc(nom(f.estrategia))} · ${esc(params(f.params))} ${estadoChip(f.aprobada?"aprobada":"rechazada")}</h4>
   <div class="manifest"><span>datos ${esc(c.huella_datos)}</span><span>criterios ${esc(c.huella_criterios)}</span>${f.manifiesto?`<span>costos ${f.manifiesto.costos.spread}+${f.manifiesto.costos.comision}+2×${f.manifiesto.costos.deslizamiento} pips</span>`:""}<span>firma: ${esc(f.firma||"—")}</span></div></div>
   <div class="sheet-body"><div style="display:flex;flex-direction:column;gap:10px;min-width:0">
    <div class="mrow"><div class="fbox"><span class="mono">${num(f.pf_entr)}</span><span>PF entrenamiento</span></div><div class="fbox"><span class="mono">${num(f.pf_fuera)}</span><span>PF reservado</span></div>
    <div class="fbox"><span class="mono">${num(f.neto_entr,1)}R</span><span>neto entr. · ${f.ops_entr} op.</span></div><div class="fbox"><span class="mono">${num(f.neto_fuera,1)}R</span><span>neto reservado · ${f.ops_fuera} op.</span></div></div>
    ${f.curva?curva(f):""}
    <p class="muted" style="font-size:.82rem">Sharpe diario ${num(f.sr,3)} contra el umbral del azar ${num(f.sr0,3)} con N efectivo ${f.n_eff} (razón de participación ${num(f.participacion,1)}) y ${f.t} días.</p>
   </div><div style="display:flex;flex-direction:column;gap:8px;min-width:0"><h4>Batería de E5</h4><ul class="checks">
    ${pr.map(([k,v])=>`<li class="${v.informativo?"info":v.ok?"ok":"no"}"><span class="mk">${v.informativo?"i":v.ok?"✓":"✗"}</span><span>${esc(k)}</span><span class="v">${num(v.valor,3)} / ${num(v.umbral,3)}</span></li>`).join("")}
   </ul><p class="muted" style="font-size:.8rem">Valor obtenido / límite de criterios.toml. «i» es informativo y no decide.</p></div></div></div>`;
}
let sel=null;
function mostrar(i){
  const c=D.ciclos[i]; sel=i;
  document.querySelectorAll(".tab").forEach((b,k)=>b.setAttribute("aria-selected",String(k===i)));
  const emb=Object.entries(c.embudo), tot=Object.values(c.motivos).reduce((a,b)=>a+b,0)||1;
  const fams=c.familias, conE5=fams.filter(f=>f.pruebas);
  const pick=conE5.length?conE5.findIndex(f=>f.aprobada)>=0?conE5.findIndex(f=>f.aprobada):0:-1;
  $("ciclo").innerHTML=`
   <p class="muted">${esc(c.nombre)} · ${c.calidad.velas?.toLocaleString("es-UY")} velas, ${c.calidad.dias} días, datos ${esc(c.calidad.veredicto)} · ${c.pruebas} pruebas registradas</p>
   <div class="funnel">${emb.map(([k,v],j)=>`<div class="cnt" style="--c:${j<4?"var(--flow)":j<6?"var(--claude)":"var(--you)"}"><span class="n">${v}</span><span class="l">E${j+1} · ${esc(k)}</span></div>`).join("")}</div>
   <div class="grid2">
    <div class="tbl-wrap"><table style="min-width:560px"><thead><tr><th>Familia</th><th>Estrategia</th><th class="num">Var.</th><th class="num">Pasan E4</th><th class="num">DSR</th><th class="num">PF fuera</th><th>Estado</th></tr></thead><tbody>
     ${fams.map(f=>`<tr><td class="mono nowrap">${f.id}</td><td>${esc(nom(f.estrategia))}</td><td class="num">${f.variantes}</td><td class="num">${f.pasaron_e4}</td><td class="num">${num(f.dsr,3)}</td><td class="num">${num(f.pf_fuera)}</td><td>${estadoChip(f.estado)}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="card panel"><h4>Por qué salieron los bots</h4>${Object.keys(MOT).map(k=>{const v=c.motivos[k]||0;return `<div class="brow"><div><span>${MOT[k][1]}</span><div class="bar" style="--c:var(${MOT[k][0]})"><i style="width:${100*v/tot}%"></i></div></div><span>${v}</span></div>`}).join("")}
     <p class="muted" style="font-size:.8rem">«Inviable para la cuenta» no muere: queda estacionada hasta que cambie el capital o el bróker.</p></div>
   </div>
   ${conE5.length?`<div class="pick" role="group" aria-label="Familias que llegaron a E5">${conE5.map((f,j)=>`<button type="button" data-j="${j}" aria-pressed="${j===pick}">${f.id} · ${esc(nom(f.estrategia))}</button>`).join("")}</div><div id="ficha">${ficha(conE5[pick],c)}</div>`:`<p class="card panel muted">Ninguna familia de este ciclo llegó a robustez.</p>`}
   <details class="card panel"><summary style="cursor:pointer;min-height:24px"><b>Bots del ciclo</b> <span class="muted">(${c.total_bots}${c.total_bots>c.bots.length?`, se muestran ${c.bots.length}`:""})</span></summary>
    <div class="tbl-wrap" style="margin-top:10px"><table style="min-width:820px"><thead><tr><th>Bot</th><th>Estrategia</th><th>Parámetros</th><th class="num">Est.</th><th class="num">PF entr.</th><th class="num">Op.</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>
    ${c.bots.map(b=>`<tr><td class="mono nowrap">${b.id}</td><td>${esc(b.estrategia)}</td><td class="mono" style="font-size:.76rem">${esc(params(b.params))}</td><td class="num">E${b.estacion}</td><td class="num">${num(b.pf)}</td><td class="num">${b.ops??"—"}</td><td>${estadoChip(b.estado)}</td><td class="muted" style="font-size:.8rem;min-width:220px">${esc(b.detalle)}</td></tr>`).join("")}
    </tbody></table></div></details>`;
  document.querySelectorAll(".pick button").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll(".pick button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
    $("ficha").innerHTML=ficha(conE5[+b.dataset.j],c);
  }));
}
$("tabs").innerHTML=D.ciclos.map((c,i)=>`<button class="tab" role="tab" type="button" data-i="${i}" aria-selected="false"><span class="mono">${c.id}</span><span>${esc(c.nombre.replace(/^Control [A-Z] · /,""))}</span></button>`).join("");
$("tabs").addEventListener("click",e=>{const b=e.target.closest(".tab");if(b)mostrar(+b.dataset.i);});
if(D.ciclos.length)mostrar(0); else $("ciclo").innerHTML=`<p class="muted">Todavía no hay ciclos.</p>`;

$("feed").innerHTML=D.eventos.slice(0,12).map(e=>`<div><span class="who">${esc(e.actor)}</span><span>${esc(e.texto)} <span class="muted mono" style="font-size:.7rem">${esc(e.ciclo||"")}</span></span></div>`).join("")||`<span class="muted">Sin eventos.</span>`;
$("tareas").innerHTML=D.tareas.map(t=>`<div><span class="who">${esc(t.rol)}</span><span>${esc(t.texto)} ${estadoChip(t.estado)}</span></div>`).join("")||`<span class="muted">La cola está vacía.</span>`;
</script>
"""
