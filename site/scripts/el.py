import sys, subprocess, time, os
from playwright.sync_api import sync_playwright
os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/opt/pw-browsers'
# usage: el.py out_prefix width selector [selector...]  -> screenshots each element (viewport-height slices)
prefix, w = sys.argv[1], int(sys.argv[2])
sels = sys.argv[3:]
srv = subprocess.Popen(['python3', '-m', 'http.server', '4173', '-d', 'dist'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': w, 'height': 900})
        logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
        pg.goto('http://localhost:4173/'); pg.wait_for_timeout(1000)
        for i, s in enumerate(sels):
            el = pg.locator(s).first
            el.scroll_into_view_if_needed(); pg.wait_for_timeout(500)
            el.screenshot(path=f'{prefix}{i}.png')
            print(s, el.bounding_box()['height'])
        print('\n'.join(logs) or 'no console errors')
        b.close()
finally:
    srv.terminate()
