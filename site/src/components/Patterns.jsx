import { useMemo, useState } from 'react'
import { facts as F } from '../store'
import { useSize } from '../lib/hooks'
import { fmtN, fmtDay, dayFromISO, dayIdx, yearOf, pct, fmtINR, clamp } from '../lib/util'

function Exhibit({ title, text, children, wide }) {
  return (
    <article className={`exhibit ${wide ? 'wide' : ''}`}>
      <div className="ex-text">
        <h3>{title}</h3>
        {text}
      </div>
      <div className="ex-chart">{children}</div>
    </article>
  )
}

/* ------------------------------------------------------------------ rituals as barcodes */
function Rituals() {
  const [ref, { w }] = useSize()
  const [tip, setTip] = useState(null)
  const rows = useMemo(() => [...F.rituals].sort((a, b) => a.gap - b.gap), [])
  const d0 = dayFromISO('2015-01-01')
  const d1 = dayFromISO('2018-10-01')
  const labelW = w < 520 ? 112 : 176
  const noteW = w < 520 ? 0 : 92
  const x0 = labelW
  const x1 = Math.max(x0 + 60, w - noteW - 4)
  const X = (d) => x0 + ((d - d0) / (d1 - d0)) * (x1 - x0)
  const rowH = 32
  const top = 26
  const H = top + rows.length * rowH + 6
  const gapText = (g) => `${Math.round(g)} ${Math.round(g) === 1 ? 'day' : 'days'} apart`
  return (
    <div ref={ref} className="chart-box" style={{ position: 'relative' }}>
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label="Barcode strips, one per recurring payment in the ledger, showing each date it happened between 2015 and 2018.">
          {[2015, 2016, 2017, 2018].map((y) => (
            <g key={y}>
              <line x1={X(dayIdx(y, 0, 1))} x2={X(dayIdx(y, 0, 1))} y1={top - 6} y2={H - 4} className="grid" />
              <text x={X(dayIdx(y, 0, 1)) + 4} y={14} className="axis-t">{y}</text>
            </g>
          ))}
          {rows.map((r, i) => {
            const y = top + i * rowH
            return (
              <g key={r.label}>
                <text x={0} y={y + 19} className="row-l">{r.label}</text>
                <text x={labelW - 8} y={y + 19} textAnchor="end" className="row-n">{r.n}</text>
                {r.days.map((d) => (
                  <rect key={d} x={X(d) - 0.8} y={y + 4} width="1.7" height="22" className="tick" onPointerEnter={() => setTip({ x: X(d), y, label: r.label, d })} onPointerLeave={() => setTip(null)} />
                ))}
                {noteW > 0 && <text x={w - 2} y={y + 19} textAnchor="end" className="row-note">{gapText(r.gap)}</text>}
              </g>
            )
          })}
        </svg>
      )}
      {tip && <div className="tip-p" style={{ left: clamp(tip.x, 70, w - 70), top: tip.y - 30 }}>{tip.label}, {fmtDay(tip.d)}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ 24-hour clock */
const SRC = {
  songs: { name: 'Songs', color: 'var(--blue)', data: F.clock.songs, note: 'UTC, as the player logged it' },
  ledger: { name: 'Ledger', color: 'var(--ink)', data: F.clock.ledger, note: 'time written, timed lines only' },
  cards: { name: 'Card', color: 'var(--pink)', data: F.clock.cards, note: 'time of swipe' },
}
function Clock() {
  const [src, setSrc] = useState('songs')
  const s = SRC[src]
  const max = Math.max(...s.data)
  const tot = s.data.reduce((a, b) => a + b, 0)
  const cx = 170, cy = 170, r0 = 62, r1 = 150
  const wedge = (h, v) => {
    const a0 = ((h * 15 - 90 + 1) * Math.PI) / 180
    const a1 = (((h + 1) * 15 - 90 - 1) * Math.PI) / 180
    const r = r0 + (v / max) * (r1 - r0)
    const p = (a, rr) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]
    const [x0, y0] = p(a0, r0), [x1, y1] = p(a0, r), [x2, y2] = p(a1, r), [x3, y3] = p(a1, r0)
    return `M${x0},${y0} L${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2} L${x3},${y3} A${r0},${r0} 0 0 0 ${x0},${y0}Z`
  }
  const sum = (a, b) => s.data.slice(a, b + 1).reduce((x, y) => x + y, 0)
  const story = {
    songs: `${pct(sum(0, 7) / tot)} of all plays land between 00:00 and 07:59 UTC. Between 08:00 and 13:59 the player is nearly silent: ${pct(sum(8, 13) / tot)}. The clock has a shape.`,
    ledger: `${pct(sum(7, 21) / tot)} of the ${fmtN(tot)} timed ledger lines were written between 07:00 and 21:59. It is a daytime record, kept in short bursts around real errands.`,
    cards: `Every hour of the day gets between ${Math.min(...s.data)} and ${Math.max(...s.data)} swipes. The spread is ${F.clock_cv.cards} against ${F.clock_cv.songs} for songs, which is close to flat. The card has no habits.`,
  }[src]
  return (
    <div className="clock-wrap">
      <div className="seg" role="tablist" aria-label="Choose a source">
        {Object.entries(SRC).map(([k, v]) => (
          <button key={k} role="tab" aria-selected={src === k} className={src === k ? 'on' : ''} onClick={() => setSrc(k)}>{v.name}</button>
        ))}
      </div>
      <div className="clock-grid">
        <svg viewBox="0 0 340 340" className="clock" role="img" aria-label={`A 24-hour clock of ${s.name.toLowerCase()} activity`}>
          <circle cx={cx} cy={cy} r={r0 - 6} className="clock-core" />
          <circle cx={cx} cy={cy} r={r1} className="clock-core" />
          {[0, 6, 12, 18].map((h) => {
            const a = ((h * 15 - 90) * Math.PI) / 180
            return <text key={h} x={cx + Math.cos(a) * (r1 + 14)} y={cy + Math.sin(a) * (r1 + 14) + 4} textAnchor="middle" className="axis-t">{String(h).padStart(2, '0')}</text>
          })}
          {s.data.map((v, h) => <path key={h} d={wedge(h, v)} fill={s.color} className="wedge" style={{ transition: 'd .5s' }} />)}
          <text x={cx} y={cy - 2} textAnchor="middle" className="clock-c1">{s.name}</text>
          <text x={cx} y={cy + 16} textAnchor="middle" className="clock-c2">{fmtN(tot)}</text>
        </svg>
        <div className="clock-side">
          <p>{story}</p>
          <p className="fine">Hours are as recorded: {s.note}. The three sources do not share a time zone, so compare the shapes, not the hours.</p>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ taste bump chart */
function Taste() {
  const [ref, { w }] = useSize()
  const [sel, setSel] = useState('The Beatles')
  const yrs = F.bump.years
  const names = F.bump.order.slice(0, 14)
  const narrow = w < 560
  const padL = narrow ? 10 : 118
  const padR = narrow ? 10 : 118
  const X = (y) => padL + ((y - yrs[0]) / (yrs[yrs.length - 1] - yrs[0])) * (w - padL - padR)
  const Y = (r) => 40 + (r - 1) * 40
  const H = 40 + 6 * 40 + 34
  return (
    <div ref={ref} className="chart-box">
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label="Rank of the top seven artists each year, 2016 to 2024">
          {yrs.map((y) => (
            <g key={y}>
              <line x1={X(y)} x2={X(y)} y1={26} y2={H - 26} className="grid" />
              <text x={X(y)} y={16} textAnchor="middle" className="axis-t">{y}</text>
            </g>
          ))}
          {names.map((a) => {
            const pts = yrs.filter((y) => F.bump.artists[a][y]).map((y) => [y, F.bump.artists[a][y]])
            const on = a === sel
            const segs = []
            let cur = []
            yrs.forEach((y) => {
              const v = F.bump.artists[a][y]
              if (v) cur.push([X(y), Y(v[0])])
              else if (cur.length) { segs.push(cur); cur = [] }
            })
            if (cur.length) segs.push(cur)
            return (
              <g key={a} className={`bump ${on ? 'on' : ''}`} onPointerEnter={() => setSel(a)} onClick={() => setSel(a)} style={{ cursor: 'pointer' }}>
                {segs.map((s, i) => <polyline key={i} points={s.map((p) => p.join(',')).join(' ')} className="bump-line" />)}
                {pts.map(([y, v]) => <circle key={y} cx={X(y)} cy={Y(v[0])} r={on ? 6 : 3.5} className="bump-dot" />)}
                {!narrow && pts[0][0] === yrs[0] && <text x={X(yrs[0]) - 12} y={Y(pts[0][1][0]) + 4} textAnchor="end" className="bump-t">{a}</text>}
                {!narrow && pts[pts.length - 1][0] === yrs[yrs.length - 1] && <text x={X(yrs[yrs.length - 1]) + 12} y={Y(pts[pts.length - 1][1][0]) + 4} className="bump-t">{a}</text>}
                {on && pts.map(([y, v]) => <text key={'t' + y} x={X(y)} y={Y(v[0]) - 12} textAnchor="middle" className="bump-n">{fmtN(v[1])}</text>)}
                <polyline points={pts.map(([y, v]) => `${X(y)},${Y(v[0])}`).join(' ')} className="hit" />
              </g>
            )
          })}
        </svg>
      )}
      <div className="chips" role="group" aria-label="Pick an artist">
        {names.map((a) => <button key={a} className={a === sel ? 'chip on' : 'chip'} onClick={() => setSel(a)}>{a}</button>)}
      </div>
      <p className="fine">Each line is an artist’s rank among your top seven that year; numbers above the dots are plays. Selected: {sel}.</p>
    </div>
  )
}

/* ------------------------------------------------------------------ patience */
function Patience() {
  const [ref, { w }] = useSize()
  const ys = F.yearly.filter((y) => y.y >= 2015)
  const padL = 40, padR = 96, top = 20, H = 250
  const X = (y) => padL + ((y - 2015) / 9) * (w - padL - padR)
  const Y = (v) => top + (1 - v) * (H - top - 30)
  const line = (k) => ys.map((y) => `${X(y.y)},${Y(y[k])}`).join(' ')
  return (
    <div ref={ref} className="chart-box">
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label="Share of songs ended by pressing forward, and share played to the end, 2015 to 2024">
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}><line x1={padL} x2={w - padR} y1={Y(v)} y2={Y(v)} className="grid" /><text x={padL - 8} y={Y(v) + 4} textAnchor="end" className="axis-t">{Math.round(v * 100)}%</text></g>
          ))}
          {ys.map((y) => <text key={y.y} x={X(y.y)} y={H - 8} textAnchor="middle" className="axis-t">{y.y}</text>)}
          <polyline points={line('done')} className="l-blue" />
          <polyline points={line('fwd')} className="l-pink" />
          {ys.map((y) => <circle key={'a' + y.y} cx={X(y.y)} cy={Y(y.done)} r="3.5" className="d-blue" />)}
          {ys.map((y) => <circle key={'b' + y.y} cx={X(y.y)} cy={Y(y.fwd)} r="3.5" className="d-pink" />)}
          <text x={X(2024) + 10} y={Y(ys[ys.length - 1].done) + 4} className="bump-t" style={{ fill: 'var(--blue)' }}>played to the end</text>
          <text x={X(2024) + 10} y={Y(ys[ys.length - 1].fwd) + 4} className="bump-t" style={{ fill: 'var(--pink)' }}>cut short</text>
          <text x={X(2017)} y={Y(yrOf(2017).fwd) - 10} textAnchor="middle" className="bump-n">{pct(yrOf(2017).fwd)}</text>
          <text x={X(2024)} y={Y(yrOf(2024).fwd) - 10} textAnchor="middle" className="bump-n">{pct(yrOf(2024).fwd)}</text>
        </svg>
      )}
    </div>
  )
}
const yrOf = (y) => F.yearly.find((r) => r.y === y)

/* ------------------------------------------------------------------ routes (force layout, computed once) */
function layout(nodes, edges, W, H) {
  const pos = {}
  nodes.forEach((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2
    pos[n.id] = { x: W / 2 + Math.cos(a) * W * 0.3 + ((i * 37) % 11), y: H / 2 + Math.sin(a) * H * 0.3 + ((i * 53) % 7) }
  })
  const k = Math.sqrt((W * H) / nodes.length) * 0.62
  for (let it = 0; it < 420; it++) {
    const t = 1 - it / 420
    const f = {}
    nodes.forEach((n) => (f[n.id] = { x: 0, y: 0 }))
    nodes.forEach((a, i) => nodes.forEach((b, j) => {
      if (i >= j) return
      let dx = pos[a.id].x - pos[b.id].x, dy = pos[a.id].y - pos[b.id].y
      const d = Math.max(8, Math.hypot(dx, dy)); const rep = (k * k) / d
      dx /= d; dy /= d
      f[a.id].x += dx * rep; f[a.id].y += dy * rep; f[b.id].x -= dx * rep; f[b.id].y -= dy * rep
    }))
    edges.forEach((e) => {
      let dx = pos[e.a].x - pos[e.b].x, dy = pos[e.a].y - pos[e.b].y
      const d = Math.max(1, Math.hypot(dx, dy)); const att = ((d * d) / k) * (0.5 + Math.log(1 + e.n) * 0.35)
      dx /= d; dy /= d
      f[e.a].x -= dx * att; f[e.a].y -= dy * att; f[e.b].x += dx * att; f[e.b].y += dy * att
    })
    nodes.forEach((n) => {
      f[n.id].x += (W / 2 - pos[n.id].x) * 0.6; f[n.id].y += (H / 2 - pos[n.id].y) * 0.6
      const m = Math.hypot(f[n.id].x, f[n.id].y) || 1; const s = Math.min(m, 14 * t + 1) / m
      pos[n.id].x += f[n.id].x * s; pos[n.id].y += f[n.id].y * s
    })
  }
  const xs = nodes.map((n) => pos[n.id].x), ys = nodes.map((n) => pos[n.id].y)
  const [mx, Mx, my, My] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  nodes.forEach((n) => {
    pos[n.id].x = 70 + ((pos[n.id].x - mx) / (Mx - mx || 1)) * (W - 140)
    pos[n.id].y = 40 + ((pos[n.id].y - my) / (My - my || 1)) * (H - 80)
  })
  return pos
}
function Routes() {
  const [ref, { w }] = useSize()
  const [hov, setHov] = useState(null)
  const edges = useMemo(() => F.routes.edges.filter((e) => e.n >= 2), [])
  const nodes = useMemo(() => { const ids = new Set(edges.flatMap((e) => [e.a, e.b])); return F.routes.nodes.filter((n) => ids.has(n.id)) }, [edges])
  const H = w < 560 ? 380 : 440
  const pos = useMemo(() => (w ? layout(nodes, edges, w, H) : null), [nodes, edges, w, H])
  const maxN = Math.max(...edges.map((e) => e.n))
  const hovEdges = hov ? edges.filter((e) => e.a === hov || e.b === hov) : []
  return (
    <div ref={ref} className="chart-box">
      {pos && (
        <svg width={w} height={H} role="img" aria-label="A network of places named in the ledger's transport notes, with lines thicker where you travelled more often.">
          {edges.map((e) => {
            const on = hov && (e.a === hov || e.b === hov)
            return <line key={e.a + e.b} x1={pos[e.a].x} y1={pos[e.a].y} x2={pos[e.b].x} y2={pos[e.b].y} className={`route ${hov ? (on ? 'on' : 'off') : ''}`} strokeWidth={2 + (e.n / maxN) * 12} />
          })}
          {nodes.map((n) => {
            const r = 6 + Math.sqrt(n.n) * 1.9
            const home = n.id === 'Current Residence' || n.id === 'Permanent Residence'
            return (
              <g key={n.id} transform={`translate(${pos[n.id].x},${pos[n.id].y})`} onPointerEnter={() => setHov(n.id)} onPointerLeave={() => setHov(null)} onClick={() => setHov(n.id)} style={{ cursor: 'pointer' }} className={hov && hov !== n.id && !hovEdges.some((e) => e.a === n.id || e.b === n.id) ? 'node off' : 'node'}>
                <circle r={r} className={home ? 'node-c home' : 'node-c'} />
                <text y={r + 15} textAnchor="middle" className="node-t">{n.id}</text>
              </g>
            )
          })}
        </svg>
      )}
      <p className="fine route-read">
        {hov ? hovEdges.sort((a, b) => b.n - a.n).map((e) => `${e.a === hov ? e.b : e.a}: ${e.n} ${e.n === 1 ? 'trip' : 'trips'}, ${fmtINR(e.spend)}`).join('. ') + '.' : 'Hover or tap a place to see its trips and what they cost.'}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ section */
export default function Patterns() {
  const cr = F.routes.edges.find((e) => (e.a === 'Current Residence' && e.b === 'Place 0') || (e.b === 'Current Residence' && e.a === 'Place 0'))
  const long = F.routes.edges.find((e) => e.a === 'Place 1' && e.b === 'Place 2')
  const beat = F.bump.years.filter((y) => Object.entries(F.bump.artists).find(([, v]) => v[y] && v[y][0] === 1)?.[0] === 'The Beatles').length
  const lostYear = F.bump.years.find((y) => Object.entries(F.bump.artists).find(([, v]) => v[y] && v[y][0] === 1)?.[0] !== 'The Beatles')
  const lostTo = lostYear && Object.entries(F.bump.artists).find(([, v]) => v[lostYear] && v[lostYear][0] === 1)[0]
  const beatles = F.top_artists.find((a) => a.a === 'The Beatles')
  return (
    <section id="patterns" className="paper-sec">
      <div className="sec-head">
        <h2 className="h-l">Habits nobody wrote down</h2>
        <p className="sec-lede">Every recurring thing leaves a rhythm. Here is what the rhythm of each file gives away.</p>
      </div>

      <Exhibit
        title="The ledger was full of rituals"
        text={<><p>Milk every few days. Salary at the end of the month. A ₹10,000 transfer and a provident-fund deposit near the start of it, mutual-fund instalments in the first ten days. Each stripe is one payment; regular things print as a barcode and life happens in the gaps.</p><p className="fine">Then the card arrives, and the barcode disappears.</p></>}
      ><Rituals /></Exhibit>

      <Exhibit
        title="Night owl, then no clock at all"
        text={<><p>Music keeps a nocturnal shape. The ledger keeps office hours. The card keeps nothing: swipes are spread evenly across the day and night, which is the clearest sign that this record behaves differently from the other two.</p></>}
      ><Clock /></Exhibit>

      <Exhibit
        title={`The Beatles arrived in July 2016 and stayed`}
        text={<><p>{fmtN(beatles.n)} plays and {fmtN(beatles.hrs)} hours since {fmtDay(dayFromISO(beatles.first))}. They are number one in {beat} of the {F.bump.years.length} years{lostYear ? `; ${lostYear} belongs to ${lostTo}` : ''}. Below the chart are the songs that outlasted every mood: each one still being played eight or nine years after it first appeared.</p></>}
        wide
      >
        <Taste />
        <div className="comfort">
          <h4>Songs that lasted</h4>
          <ul>
            {F.comfort.map((c) => (
              <li key={c.name + c.artist}><span className="c-n">{c.name}</span><span className="c-a">{c.artist}</span><span className="c-m">{fmtN(c.n)} plays, {c.yrs} different years</span></li>
            ))}
          </ul>
        </div>
      </Exhibit>

      <Exhibit
        title="You stopped skipping"
        text={<><p>In 2017, {pct(yrOf(2017).fwd)} of songs ended because you pressed forward. By 2024 that was {pct(yrOf(2024).fwd)}, and {pct(yrOf(2024).done)} of songs played to the end. A listener who samples became a listener who stays.</p></>}
      ><Patience /></Exhibit>

      <Exhibit
        title="Where the ledger says you went"
        text={<><p>Place names in the ledger are anonymised, so this is a map of relationships, not geography. {cr && <>The home to Place 0 run appears {cr.n} times at about {fmtINR(Math.round(cr.spend / cr.n))} a ride, more than four times any other pair. </>}{long && <>A second cluster is the long way home: Place 1 to Place 2 costs about {fmtINR(Math.round(long.spend / long.n / 10) * 10)} a trip.</>}</p></>}
        wide
      ><Routes /></Exhibit>
    </section>
  )
}
