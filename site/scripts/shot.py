import sys, subprocess, time, os
from playwright.sync_api import sync_playwright
os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/opt/pw-browsers'
# usage: shot.py out.png width height [scrollY|#id] [full]
out, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
where = sys.argv[4] if len(sys.argv) > 4 else '0'
full = len(sys.argv) > 5 and sys.argv[5] == 'full'
srv = subprocess.Popen(['python3', '-m', 'http.server', '4173', '-d', 'dist'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': w, 'height': h})
        logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
        pg.goto('http://localhost:4173/')
        pg.wait_for_timeout(1200)
        if not where.replace('.','',1).isdigit():
            sel, _, mode = where.partition('|')
            pg.evaluate("([s,m])=>document.querySelector(s).scrollIntoView({block: m==='c'?'center':'start'})", [sel, mode])
        else:
            pg.evaluate(f"window.scrollTo(0,{where})")
        pg.wait_for_timeout(6500 if where == '0' else 1800)
        pg.screenshot(path=out, full_page=full)
        print('\n'.join(logs) or 'no console errors')
        b.close()
finally:
    srv.terminate()
