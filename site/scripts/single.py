import os
from playwright.sync_api import sync_playwright
os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/opt/pw-browsers'
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 800}); logs = []; reqs = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.on('request', lambda r: reqs.append(r.url[:80]) if not r.url.startswith(('file:', 'data:', 'blob:')) else None)
    pg.goto('file:///home/claude/site/dist-single/index.html'); pg.wait_for_timeout(2500)
    print('title:', pg.title(), '| fonts ok:', pg.evaluate("document.fonts.check('800 40px \"Archivo Variable\"')"))
    print('external requests:', reqs or 'none'); print('\n'.join(logs) or 'no console errors')
    t = pg.evaluate("performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd"); print('DCL ms', round(t))
    b.close()
