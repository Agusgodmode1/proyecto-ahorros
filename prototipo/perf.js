/* Cinemática única · medición (?perf3d=1): tiempo de cada cuadro, por momento. Las cuentas son puras. */
export function resumen(ms) {
  const a = ms.slice().sort((x, y) => x - y), n = a.length;
  if (!n) return { n: 0, mediana: 0, p95: 0, max: 0 };
  const en = q => a[Math.min(n - 1, Math.max(0, Math.ceil(q * n) - 1))];
  return { n, mediana: en(.5), p95: en(.95), max: a[n - 1] };
}
export const MOMENTOS = ['entrada', 'menu', 'elegir', 'tapa', 'abrir'];
export function crearMedidor() {
  const m = {};
  return {
    anotar(momento, ms) { (m[momento] || (m[momento] = [])).push(ms); },
    tabla() { return MOMENTOS.filter(k => m[k]).map(k => Object.assign({ momento: k }, resumen(m[k]))); }
  };
}
/* ¿el teléfono está limitando a 30 cuadros por segundo? (en el iPhone, el modo de bajo consumo lo hace):
   casi todos los cuadros duran lo mismo, unos 33 ms. Eso no es una escena pesada: una escena pesada da tiempos desparejos. */
export function tope30(ms) {
  if (!ms || ms.length < 20) return false;
  let n = 0; for (const v of ms) if (v >= 31 && v <= 36) n++;
  return n / ms.length >= .8;
}
/* objetivo de la spec: p95 de 20 ms o menos y ningún cuadro de más de 50 ms */
export const cumple = f => f.p95 <= 20 && f.max <= 50;
export function aparato(ua, ancho, alto, dpr, placa) {
  ua = String(ua || '');
  let n = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Macintosh/.test(ua) ? 'Mac' : 'Otro';
  const v = /OS (\d+)[_.](\d+)/.exec(ua); if (v && (n === 'iPhone' || n === 'iPad')) n += ' · iOS ' + v[1] + '.' + v[2];
  return n + ' · ' + ancho + '×' + alto + ' @' + (Math.round(dpr * 100) / 100) + 'x' + (placa ? ' · ' + placa : '');
}
export function mostrar(tabla, quien, nota) {
  let c = document.getElementById('perf3d'); if (c) c.remove();
  c = document.createElement('div'); c.id = 'perf3d';
  c.style.cssText = 'position:fixed;z-index:20;left:12px;right:12px;top:calc(60px + env(safe-area-inset-top));padding:14px 14px 12px;border-radius:12px;background:rgba(8,9,14,.94);border:1px solid #d9b76a66;color:#f3ead6;font:13px/1.5 ui-monospace,Menlo,monospace';
  const f = v => v.toFixed(1).padStart(6, ' ');
  c.innerHTML = '<b style="color:#d9b76a">Tiempo de cada cuadro (ms)</b><pre style="margin:8px 0;font:inherit;white-space:pre">' +
    'momento   mediana    p95    máx\n' + tabla.map(t => t.momento.padEnd(8, ' ') + f(t.mediana) + ' ' + f(t.p95) + ' ' + f(t.max) + '  ' + (cumple(t) ? 'bien' : 'ALTO')).join('\n') +
    '</pre><div style="opacity:.8">' + quien + '</div>' + (nota ? '<div style="opacity:.8">' + nota + '</div>' : '') + '<div style="opacity:.6;margin-top:6px">Objetivo: p95 ≤ 20 y máx ≤ 50. Tocá para cerrar.</div>';
  c.addEventListener('click', () => c.remove());
  document.body.appendChild(c);
}
