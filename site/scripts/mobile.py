import subprocess, time, os
from playwright.sync_api import sync_playwright
os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/opt/pw-browsers'
srv = subprocess.Popen(['python3', '-m', 'http.server', '4173', '-d', 'dist'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        pg = ctx.new_page(); logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
        pg.goto('http://localhost:4173/'); pg.wait_for_timeout(6500)
        pg.screenshot(path='/tmp/m_hero.png')
        pg.evaluate("document.querySelector('.step:nth-child(4)').scrollIntoView({block:'center'})"); pg.wait_for_timeout(1500)
        pg.screenshot(path='/tmp/m_story.png')
        for i, s in enumerate(['#patterns .exhibit:nth-of-type(3)', '#days', '#drawer']):
            pg.evaluate(f"document.querySelector('{s}').scrollIntoView()"); pg.wait_for_timeout(700)
            pg.screenshot(path=f'/tmp/m_{i}.png')
        ow = pg.evaluate("document.documentElement.scrollWidth")
        print('scrollWidth', ow, 'viewport 390')
        print('\n'.join(logs) or 'no console errors')
        b.close()
finally:
    srv.terminate()
