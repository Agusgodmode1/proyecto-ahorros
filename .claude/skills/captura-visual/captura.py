"""Capturas de la app a varios anchos, en Chrome y (si está) Safari/WebKit.
Uso: python3 captura.py <ruta> [espera_ms] [x,y]"""
import asyncio, os, shutil, sys
from playwright.async_api import async_playwright

RUTA = sys.argv[1] if len(sys.argv) > 1 else '/'
ESPERA = int(sys.argv[2]) if len(sys.argv) > 2 else 4000
TOQUE = tuple(int(v) for v in sys.argv[3].split(',')) if len(sys.argv) > 3 else None
TAMANOS = [(390, 844), (320, 568), (1200, 800)]
SALIDA = '/tmp/capturas'
GL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']


async def capturar(motor, nombre):
    try:
        if nombre == 'chrome':
            ruta = shutil.which('google-chrome')
            nav = await motor.launch(executable_path=ruta, args=GL) if ruta else await motor.launch(args=GL)
        else:
            nav = await motor.launch()
    except Exception as e:
        print(f'{nombre}: no disponible ({str(e).splitlines()[0]})')
        return
    for w, h in TAMANOS:
        pag = await nav.new_page(viewport={'width': w, 'height': h}, device_scale_factor=2)
        errores = []
        pag.on('pageerror', lambda e: errores.append(str(e)))
        await pag.goto(f'http://localhost:8765{RUTA}')
        await pag.wait_for_timeout(ESPERA)
        base = f'{SALIDA}/{nombre}-{w}'
        await pag.screenshot(path=base + '.png')
        if TOQUE and w == 390:
            await pag.mouse.click(*TOQUE)
            await pag.wait_for_timeout(ESPERA)
            await pag.screenshot(path=base + '-toque.png')
        print(base, 'errores:', errores or 'ninguno')
        await pag.close()
    await nav.close()


async def main():
    os.makedirs(SALIDA, exist_ok=True)
    async with async_playwright() as p:
        await capturar(p.chromium, 'chrome')
        await capturar(p.webkit, 'safari')

asyncio.run(main())
