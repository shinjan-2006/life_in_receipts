import subprocess, time, os
from playwright.sync_api import sync_playwright
os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/opt/pw-browsers'
srv = subprocess.Popen(['python3', '-m', 'http.server', '4173', '-d', 'dist'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900}); logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
        pg.goto('http://localhost:4173/'); pg.wait_for_timeout(800)
        # drawer search
        pg.fill('.f-search input', 'kindle'); pg.wait_for_timeout(500)
        print('kindle ->', pg.inner_text('.res-sum'))
        pg.fill('.f-search input', 'ode to the mets'); pg.wait_for_timeout(500)
        print('mets ->', pg.inner_text('.res-sum'))
        pg.fill('.f-search input', '')
        pg.select_option('.f-sel select', 'c:travel'); pg.wait_for_timeout(500)
        print('card travel ->', pg.inner_text('.res-sum'))
        pg.click('.vlist .row button >> nth=0'); pg.wait_for_timeout(300)
        print('detail ->', pg.inner_text('.detail .dr-t').strip())
        pg.click('text=Reset everything'); pg.wait_for_timeout(300)
        # story button -> drawer preset (chapter 2)
        pg.evaluate("document.querySelector('.step:nth-child(3)').scrollIntoView({block:'center'})"); pg.wait_for_timeout(800)
        pg.click('.step:nth-child(3) >> text=Open these receipts'); pg.wait_for_timeout(1500)
        print('chapter preset ->', pg.inner_text('.res-sum'), '| scrollY', pg.evaluate('Math.round(scrollY)'))
        # story day button -> days
        pg.evaluate("document.querySelector('.step:nth-child(3)').scrollIntoView({block:'center'})"); pg.wait_for_timeout(800)
        pg.click('.step:nth-child(3) >> text=Read the wedding-gift day'); pg.wait_for_timeout(1500)
        print('day ->', pg.inner_text('.day-rc .dr-t').strip(), '|', pg.inner_text('.dr-sum').strip().replace('\n', ' '))
        # click a calendar day
        pg.click('.cal-d >> nth=40'); pg.wait_for_timeout(300)
        print('cal click ->', pg.inner_text('.day-rc .dr-t').strip())
        pg.click('text=Surprise me'); pg.wait_for_timeout(300)
        print('surprise ->', pg.inner_text('.day-rc .dr-t').strip())
        # lifts click
        pg.evaluate("document.querySelector('#rhymes').scrollIntoView()")
        pg.click('.lrow >> nth=17'); pg.wait_for_timeout(300)
        print('lift ->', pg.inner_text('.lift-read').strip()[:120])
        pg.click('.dot-hit >> nth=0'); pg.wait_for_timeout(1200)
        print('dot -> day', pg.inner_text('.day-rc .dr-t').strip())
        print('\n'.join(logs) or 'no console errors')
        b.close()
finally:
    srv.terminate()
