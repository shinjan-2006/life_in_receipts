import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CHAPTERS, INTRO, OUTRO } from '../chapters'
import { DAYS } from '../store'
import { NavCtx, useSize, useTween, useReducedMotion } from '../lib/hooks'
import { dayFromISO, fmtDay, clamp } from '../lib/util'
import { Receipt, Stamp } from './Bits'
import Lanes from './Lanes'

const OVERVIEW = [150, DAYS]
const FEATURED = [
  [dayFromISO('2013-07-08'), 'the first song'],
  [dayFromISO('2016-01-13'), 'the wedding-gift day'],
  [dayFromISO('2016-06-01'), 'the day music came back'],
  [dayFromISO('2017-09-06'), 'the 1,816-song day'],
  [dayFromISO('2018-09-20'), 'the last ledger day'],
  [dayFromISO('2020-08-15'), 'the 13.5-hour day'],
  [dayFromISO('2024-12-15'), 'the last song'],
]

function domainFor(active) {
  if (active < 0 || active >= CHAPTERS.length) return OVERVIEW
  const c = CHAPTERS[active]
  const pad = Math.max(24, (c.b - c.a) * 0.05)
  return [clamp(c.a - pad, 0, DAYS), clamp(c.b + pad, 0, DAYS)]
}

export default function Story() {
  const { openDrawer, openDay } = useContext(NavCtx)
  const [active, setActive] = useState(-1)
  const refs = useRef([])
  const [boxRef, size] = useSize()
  const reduced = useReducedMotion()
  const dom = useTween(useMemo(() => domainFor(active), [active]), 850, reduced)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const mobile = window.innerWidth < 900
      const vh = window.innerHeight
      const line = mobile ? vh * 0.72 : vh * 0.5
      let best = -2
      let bestDist = Infinity
      refs.current.forEach((el, i) => {
        if (!el) return
        const r = el.getBoundingClientRect()
        if (r.bottom < 0 || r.top > vh) return
        const c = (r.top + r.bottom) / 2
        const d = Math.abs(c - line)
        if (d < bestDist) { bestDist = d; best = i - 1 }
      })
      if (best !== -2) setActive(best)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(update) }
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    update()
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [])

  const cur = active >= 0 && active < CHAPTERS.length ? CHAPTERS[active] : null
  const compact = size.w < 560

  return (
    <section id="story" className="story" aria-labelledby="story-h">
      <div className="story-head">
        <h2 id="story-h" className="h-xl">Seven chapters hiding in the receipts</h2>
      </div>
      <div className="story-grid">
        <div className="story-steps">
          <div className="step" ref={(el) => (refs.current[0] = el)} data-on={active === -1}>
            <Receipt className="step-card">
              <h3 className="step-title">{INTRO.title}</h3>
              <p className="step-body">{INTRO.body}</p>
              <ul className="legend">
                <li><i style={{ background: 'var(--mist)' }} /> Songs, from the music player</li>
                <li><i style={{ background: 'var(--lemon)' }} /> Ledger lines, written by hand</li>
                <li><i style={{ background: 'var(--pink-l)' }} /> Card swipes</li>
              </ul>
              <p className="step-note">Hover or tap the strip for exact counts. Small ticks under the axis mark moments worth a second look.</p>
            </Receipt>
          </div>

          {CHAPTERS.map((c, i) => (
            <div className="step" key={c.key} ref={(el) => (refs.current[i + 1] = el)} data-on={active === i}>
              <Receipt className="step-card">
                <Stamp>{c.persona}</Stamp>
                <p className="step-meta"><span>Chapter {i + 1} of {CHAPTERS.length}</span><span>{c.range}</span></p>
                <h3 className="step-title">{c.title}</h3>
                <p className="step-body">{c.body}</p>
                <dl className="leaders">
                  {c.lines.map(([k, v]) => (
                    <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                  ))}
                </dl>
                <div className="step-actions">
                  <button className="btn btn-ink" onClick={() => openDrawer({ d0: c.a, d1: c.b - 1 })}>Open these receipts</button>
                  <button className="btn btn-line" onClick={() => openDay(FEATURED[i][0])}>Read {FEATURED[i][1]}</button>
                </div>
              </Receipt>
            </div>
          ))}

          <div className="step" ref={(el) => (refs.current[CHAPTERS.length + 1] = el)} data-on={active === CHAPTERS.length}>
            <Receipt className="step-card">
              <h3 className="step-title">{OUTRO.title}</h3>
              <p className="step-body">{OUTRO.body}</p>
              <div className="step-actions">
                <a className="btn btn-ink" href="#patterns">See the patterns</a>
                <a className="btn btn-line" href="#days">Pull a thread</a>
              </div>
            </Receipt>
          </div>
        </div>

        <div className="story-stage">
          <div className="stage-in">
            <div className="stage-chip">
              {cur ? (
                <>
                  <span className="chip-k">Chapter {active + 1} of {CHAPTERS.length}</span>
                  <span className="chip-t">{cur.title}</span>
                  <span className="chip-r">{fmtDay(Math.max(cur.a, 188), { day: undefined })} to {fmtDay(cur.b - 1, { day: undefined })}</span>
                </>
              ) : (
                <>
                  <span className="chip-k">The whole record</span>
                  <span className="chip-t">Twelve years, three lanes</span>
                  <span className="chip-r">Jul 2013 to Dec 2024</span>
                </>
              )}
            </div>
            <div className="stage-lanes" ref={boxRef}>
              <Lanes dom={dom} focus={cur ? cur.focus : null} width={size.w} height={size.h} compact={compact} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
