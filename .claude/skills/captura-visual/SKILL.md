---
name: captura-visual
description: Saca capturas de la app o de un prototipo a 390, 320 y 1200 px, con el motor de Chrome y, si está, el de Safari, opcionalmente tocando la pantalla. Usalo después de cualquier cambio visual y antes de decir que quedó bien.
---

# Capturas

1. Levantá un servidor en la raíz del repo: `python3 -m http.server 8765` (en segundo plano).
2. Instalá Playwright si falta: `pip install playwright --break-system-packages` y `python3 -m playwright install chromium webkit` (si webkit no se instala, seguí solo con chromium).
3. Corré: `python3 .claude/skills/captura-visual/captura.py <ruta> [espera_ms] [x,y]`.
   - `<ruta>`: por ejemplo `/` o `/prototipo/`.
   - `x,y`: un toque opcional (en la pantalla de 390 px) y después otra captura.
   - Las imágenes quedan en `/tmp/capturas/`.
4. **Mirá cada imagen** antes de decir que algo quedó bien. Revisá: que nada se corte, el contraste, que no haya texto encimado, y que se vea igual en los dos motores.
5. Las escenas 3D en el servidor van lentas (no hay placa de video): usá esperas largas (30–60 s) para ver las animaciones terminadas. La fluidez real solo se juzga en el iPhone.
