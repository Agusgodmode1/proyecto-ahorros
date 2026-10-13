/* Utilidades chicas compartidas (puro). */
export function num(v){var n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:0}
export function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
