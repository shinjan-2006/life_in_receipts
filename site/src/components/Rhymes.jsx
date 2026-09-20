import { useContext, useMemo, useState } from 'react'
import { facts as F } from '../store'
import { NavCtx, useSize } from '../lib/hooks'
import { fmtN, fmtDay, dayFromISO, dayIdx, pct } from '../lib/util'

const idxOf = (iso) => F.months.indexOf(iso)
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function Overlay({ from, to, keyB, labelB, colorB, rho, p, title, verdict }) {
  const [ref, { w }] = useSize()
  const a = idxOf(from), b = idxOf(to)
  const songs = F.monthly.plays.slice(a, b + 1)
  const other = F.monthly[keyB].slice(a, b + 1)
  const ms = F.months.slice(a, b + 1)
  const H = 210, padL = 8, padR = 8, top = 22, bot = 28
  const X = (i) => padL + (i / (songs.length - 1)) * (w - padL - padR)
  const norm = (arr) => { const m = Math.max(...arr); return arr.map((v) => v / m) }
  const Y = (v) => top + (1 - v) * (H - top - bot)
  const pts = (arr) => norm(arr).map((v, i) => `${X(i)},${Y(v)}`).join(' ')
  return (
    <div className="overlay">
      <h4>{title}</h4>
      <div ref={ref} className="chart-box">
        {w > 0 && (
          <svg width={w} height={H} role="img" aria-label={`Monthly songs played and monthly ${labelB}, each scaled to its own peak, ${from} to ${to}`}>
            <line x1={padL} x2={w - padR} y1={Y(0)} y2={Y(0)} className="grid" />
            <polyline points={pts(songs)} className="l-blue" />
            <polyline points={pts(other)} className={colorB === 'ink' ? 'l-ink' : 'l-pink'} />
            {ms.map((m, i) => (Number(m.slice(5)) % 6 === 1 ? <text key={m} x={X(i)} y={H - 8} textAnchor="middle" className="axis-t">{MON[Number(m.slice(5)) - 1]} {m.slice(2, 4)}</text> : null))}
            <text x={padL} y={14} className="bump-t" style={{ fill: 'var(--blue)' }}>songs a month</text>
            <text x={padL + 120} y={14} className="bump-t" style={{ fill: colorB === 'ink' ? 'var(--ink)' : 'var(--pink)' }}>{labelB} a month</text>
          </svg>
        )}
      </div>
      <p className="rho"><b>{rho > 0 ? '+' : '−'}{Math.abs(rho).toFixed(2)}</b> <span>{verdict}</span></p>
      <p className="fine">Spearman rank correlation over {ms.length} months (p = {p}). Each line is scaled to its own peak.</p>
    </div>
  )
}

function Lifts() {
  const { openDay } = useContext(NavCtx)
  const groups = F.lifts.groups
  const [selKey, setSelKey] = useState(() => (groups.find((g) => g.key === 'Medicine') || groups[0]).key)
  const sel = groups.find((g) => g.key === selKey) || groups[0]
  const [ref, { w }] = useSize()
  const [ref2, { w: w2 }] = useSize()
  const narrow = w < 560
  const labelW = narrow ? 128 : 190
  const rowH = 30
  const H = 34 + groups.length * rowH + 30
  const lo = Math.log(0.35), hi = Math.log(3)
  const X = (v) => labelW + ((Math.log(Math.max(0.35, Math.min(3, v))) - lo) / (hi - lo)) * (w - labelW - 46)
  const label = (g) => (g.kind === 'sub' && g.cat.toLowerCase() !== g.key.toLowerCase() ? `${g.label} (${g.cat.toLowerCase()})` : g.label)

  // dot plot
  const d0 = dayFromISO(F.lifts.window[0]), d1 = dayFromISO(F.lifts.window[1])
  const Hd = 250, pl = 56, pr = 8
  const Xd = (d) => pl + ((d - d0) / (d1 - d0)) * (w2 - pl - pr)
  const Yd = (r) => { const v = r <= 0 ? -3 : Math.max(-3, Math.min(3, Math.log2(r))); return 12 + ((3 - v) / 6) * (Hd - 44) }
  const all = useMemo(() => Object.entries(F.lifts.rel).map(([d, r]) => [Number(d), r]), [])
  const selSet = useMemo(() => new Set(sel.days), [sel])
  const fewer = sel.ratio < 1
  return (
    <div className="lifts">
      <div ref={ref} className="chart-box">
        {w > 0 && (
          <svg width={w} height={H} role="img" aria-label="For each kind of ledger line, how much more or less music was played on days that had one, compared with other days in the same month.">
            <text x={X(1)} y={14} textAnchor="middle" className="axis-t">a normal day</text>
            <text x={labelW} y={14} className="axis-t">quieter</text>
            <text x={w - 46} y={14} textAnchor="end" className="axis-t">louder</text>
            {[0.5, 2].map((v) => <g key={v}><line x1={X(v)} x2={X(v)} y1={22} y2={H - 26} className="grid" /><text x={X(v)} y={H - 8} textAnchor="middle" className="axis-t">{v === 0.5 ? 'half' : 'double'}</text></g>)}
            <line x1={X(1)} x2={X(1)} y1={22} y2={H - 26} className="axis-line" />
            {groups.map((g, i) => {
              const y = 34 + i * rowH
              const on = g.key === sel.key
              const c = g.ratio < 1 ? 'var(--blue)' : 'var(--pink)'
              return (
                <g key={g.key} className={`lrow ${on ? 'on' : ''}`} onClick={() => setSelKey(g.key)} style={{ cursor: 'pointer' }}>
                  <rect x="0" y={y - 3} width={w} height={rowH - 2} className="lrow-bg" />
                  <text x={0} y={y + 16} className="row-l">{label(g)}</text>
                  <line x1={X(g.lo)} x2={X(g.hi)} y1={y + 12} y2={y + 12} stroke={c} strokeWidth="2" opacity=".45" />
                  <rect x={Math.min(X(1), X(g.ratio))} y={y + 5} width={Math.abs(X(g.ratio) - X(1))} height="14" fill={c} />
                  <text x={w - 2} y={y + 16} textAnchor="end" className="row-n">{g.n}</text>
                </g>
              )
            })}
          </svg>
        )}
      </div>
      <p className="fine">Bars show songs played on days with that kind of line, against other days in the same month; whiskers are a 90% bootstrap range. The number on the right is how many days. Click a row.</p>

      <div className="lift-read">
        <p>
          On the <b>{sel.n} days</b> with a <b>{label(sel).toLowerCase()}</b> line you played <b>{pct(Math.abs(1 - sel.ratio))} {fewer ? 'fewer' : 'more'}</b> songs than on other days that month
          <span> (plausible range {pct(sel.lo)} to {pct(sel.hi)} of normal).</span>
        </p>
      </div>
      <div ref={ref2} className="chart-box">
        {w2 > 0 && (
          <svg width={w2} height={Hd} role="img" aria-label={`Every day between ${F.lifts.window[0]} and ${F.lifts.window[1]}, plotted by how many songs were played relative to that month's average; days with ${label(sel)} lines are highlighted.`}>
            {[[-3, 'no songs'], [-2, '¼'], [-1, '½'], [0, 'normal'], [1, '2×'], [2, '4×']].map(([v, t]) => (
              <g key={v}><line x1={pl} x2={w2 - pr} y1={Yd(2 ** v)} y2={Yd(2 ** v)} className={v === 0 ? 'axis-line' : 'grid'} />{v !== -3 && <text x={pl - 6} y={Yd(2 ** v) + 4} textAnchor="end" className="axis-t">{t}</text>}</g>
            ))}
            <line x1={pl} x2={w2 - pr} y1={Yd(0)} y2={Yd(0)} className="grid" />
            <text x={pl - 6} y={Yd(0) + 4} textAnchor="end" className="axis-t">0</text>
            {all.map(([d, r]) => !selSet.has(d) && <circle key={d} cx={Xd(d)} cy={Yd(r)} r="1.8" className="dot-bg" />)}
            {sel.days.map((d) => {
              const r = F.lifts.rel[d] ?? 0
              return <circle key={d} cx={Xd(d)} cy={Yd(r)} r="5" fill={fewer ? 'var(--blue)' : 'var(--pink)'} className="dot-hit" tabIndex={0} role="button" aria-label={`Open ${fmtDay(d)}`} onClick={() => openDay(d)} onKeyDown={(e) => e.key === 'Enter' && openDay(d)}><title>{fmtDay(d)}: open this day</title></circle>
            })}
            {[2016, 2017, 2018].map((y) => <text key={y} x={Xd(dayIdx(y, 0, 1))} y={Hd - 6} textAnchor="middle" className="axis-t">{y}</text>)}
          </svg>
        )}
      </div>
      <p className="fine">Each grey dot is a day, placed by how many songs it had relative to its month. Coloured dots are the days with {label(sel).toLowerCase()} lines; click one to open that day. {F.lifts.tested} kinds of line were tested and about {Math.round(F.lifts.tested * 0.1)} would look notable by luck alone, so read this as a lead, not a verdict.</p>
    </div>
  )
}

export default function Rhymes() {
  const m = F.monthly_corr
  return (
    <section id="rhymes" className="paper-sec alt">
      <div className="sec-head">
        <h2 className="h-l">Where money and music rhyme</h2>
        <p className="sec-lede">Songs and purchases sit in different files, so nothing in the data links them. The only shared thing is the calendar. These are the links you can honestly draw from it.</p>
      </div>

      <article className="exhibit stack">
        <div className="ex-text">
          <h3>They rose and fell together, then stopped</h3>
          <p>In the ledger years, months with more handwritten lines were also months with more songs: a moderate link. After the card takes over, that link disappears. Writing money down and playing music used to be the same kind of month.</p>
        </div>
        <div className="two">
          <Overlay from="2016-06" to="2018-08" keyB="ledger" labelB="ledger lines" colorB="ink" rho={m.ledger.rho} p={m.ledger.p} title="Ledger years" verdict="moved together" />
          <Overlay from="2022-05" to="2024-03" keyB="cards" labelB="card swipes" colorB="pink" rho={m.cards.rho} p={m.cards.p} title="Card years" verdict="no link at all" />
        </div>
      </article>

      <article className="exhibit stack">
        <div className="ex-text">
          <h3>Errand days are quiet days</h3>
          <p>Compare each day to the rest of its month. Days with a medicine, vegetable or salary line have noticeably less music. Days you invested have more. It reads like a person: music is what fills the gaps, and errands leave none.</p>
        </div>
        <Lifts />
      </article>
    </section>
  )
}
