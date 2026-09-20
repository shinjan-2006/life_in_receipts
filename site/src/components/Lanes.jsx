import { useMemo, useState } from 'react'
import { P, DAYS } from '../store'
import { fmtDay, fmtN, dayIdx, yearOf, monthOf, dateOf, clamp } from '../lib/util'
import { EVENTS } from '../chapters'

const LANES = [
  { key: 'songs', label: 'Songs a day', pref: P.songs, color: 'var(--mist)' },
  { key: 'ledger', label: 'Ledger lines a day', pref: P.ledger, color: 'var(--lemon)' },
  { key: 'cards', label: 'Card swipes a day', pref: P.cards, color: 'var(--pink-l)' },
]
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function makeTicks(a, b) {
  const span = b - a
  const out = []
  if (span > 1400) {
    for (let y = yearOf(a); y <= yearOf(b) + 1; y++) {
      const d = dayIdx(y, 0, 1)
      if (d >= a && d <= b) out.push({ d, label: String(y), major: true })
    }
  } else if (span > 150) {
    const step = span > 420 ? 3 : 1
    for (let y = yearOf(a); y <= yearOf(b) + 1; y++)
      for (let m = 0; m < 12; m += step) {
        const d = dayIdx(y, m, 1)
        if (d >= a && d <= b) out.push({ d, label: m === 0 ? String(y) : MON[m], major: m === 0 })
      }
  } else {
    for (let d = a - (a % 14) + 14; d <= b; d += 14) out.push({ d, label: `${dateOf(d).getUTCDate()} ${MON[monthOf(d)]}`, major: false })
  }
  return out
}

export default function Lanes({ dom, focus, width: W, height: H, compact }) {
  const [hover, setHover] = useState(null)
  const mL = 10
  const mR = 10
  const top = 4
  const axisH = 22
  const evH = compact ? 44 : 58
  const laneGap = compact ? 8 : 14
  const laneH = Math.max(40, (H - top - axisH - evH - laneGap * 2) / 3)
  const [a, b] = dom
  const x = (d) => mL + ((d - a) / (b - a)) * (W - mL - mR)
  const invX = (px) => a + ((px - mL) / (W - mL - mR)) * (b - a)

  const model = useMemo(() => {
    if (!W) return null
    const N = clamp(Math.round(W / 8), 36, 110)
    const step = Math.max(1, Math.round((b - a) / N))
    const start = Math.floor(a / step) * step
    const lanes = LANES.map((ln) => {
      const bins = []
      let max = 0
      let total = 0
      for (let d = start; d < b; d += step) {
        const lo = Math.max(0, d)
        const hi = Math.min(DAYS, d + step)
        if (hi <= lo) continue
        const sum = ln.pref[hi] - ln.pref[lo]
        const v = sum / (hi - lo)
        if (d + step > a) {
          max = Math.max(max, v)
          total += sum
        }
        bins.push({ d0: d, d1: d + step, v, sum })
      }
      return { ...ln, bins, max: max || 1, total }
    })
    return { lanes, step }
  }, [a, b, W])

  if (!W || !model) return null
  const ticks = makeTicks(a, b)
  const axisY = top + laneH * 3 + laneGap * 2 + 4

  // event labels: greedy stagger so text never overlaps
  const evs = EVENTS.filter((e) => e.d >= a && e.d <= b).map((e) => ({ ...e, x: x(e.d) }))
  const lastRight = [-1e9, -1e9, -1e9]
  const levels = compact ? 2 : 3
  evs.forEach((e) => {
    const w = e.t.length * 6.1
    let left = e.x - 3
    if (left + w > W - 4) left = W - 4 - w
    e.left = left
    e.level = -1
    for (let l = 0; l < levels; l++) {
      if (lastRight[l] < left - 6) { e.level = l; lastRight[l] = left + w; break }
    }
  })

  const onMove = (ev) => {
    const r = ev.currentTarget.getBoundingClientRect()
    const px = ev.clientX - r.left
    const d = Math.round(invX(px))
    const bin = model.lanes[0].bins.find((bn) => d >= bn.d0 && d < bn.d1)
    if (!bin) return setHover(null)
    setHover({ px, bin })
  }

  const fShade = focus && [x(clamp(focus.d0, a, b)), x(clamp(focus.d1, a, b))]

  return (
    <div className="lanes" style={{ width: W, height: H }}>
      <svg width={W} height={H} role="img" aria-label="Three lanes on one timeline: songs played per day, handwritten ledger lines per day, and card swipes per day, from 2013 to 2024.">
        {model.lanes.map((ln, i) => {
          const y0 = top + i * (laneH + laneGap)
          const empty = ln.total === 0
          const yv = (v) => y0 + laneH - (v / (ln.max * 1.06)) * (laneH - 16)
          return (
            <g key={ln.key}>
              <line x1={mL} x2={W - mR} y1={y0 + laneH} y2={y0 + laneH} className={empty ? 'ln-base dashed' : 'ln-base'} />
              {empty && <text x={W / 2} y={y0 + laneH / 2 + 4} textAnchor="middle" className="ln-empty">nothing on record in this stretch</text>}
              {ln.bins.map((bn) => {
                if (bn.sum === 0) return null
                const bx = x(bn.d0)
                const bw = Math.max(1, x(bn.d1) - bx - (compact ? 0.6 : 1))
                if (bx + bw < mL || bx > W - mR) return null
                const h = Math.max(1.5, y0 + laneH - yv(bn.v))
                return <rect key={bn.d0} x={bx} y={y0 + laneH - h} width={bw} height={h} fill={ln.color} />
              })}
            </g>
          )
        })}
        {fShade && (
          <g className="veil" pointerEvents="none">
            <rect x={mL} y={top} width={Math.max(0, fShade[0] - mL)} height={laneH * 3 + laneGap * 2} />
            <rect x={fShade[1]} y={top} width={Math.max(0, W - mR - fShade[1])} height={laneH * 3 + laneGap * 2} />
          </g>
        )}
        {model.lanes.map((ln, i) => {
          const y0 = top + i * (laneH + laneGap)
          return (
            <g key={ln.key + 'l'} pointerEvents="none">
              <text x={mL} y={y0 + 10} className="ln-label">{ln.label}</text>
              {ln.total > 0 && <text x={W - mR} y={y0 + 10} textAnchor="end" className="ln-max">{ln.max >= 10 ? fmtN(ln.max) : ln.max.toFixed(1)} at most</text>}
            </g>
          )
        })}
        <line x1={mL} x2={W - mR} y1={axisY} y2={axisY} className="ax" />
        {ticks.map((t) => (
          <g key={t.d}>
            <line x1={x(t.d)} x2={x(t.d)} y1={axisY} y2={axisY + (t.major ? 7 : 4)} className="ax" />
            <text x={x(t.d)} y={axisY + 18} textAnchor="middle" className={t.major ? 'ax-t major' : 'ax-t'}>{t.label}</text>
          </g>
        ))}
        {evs.map((e) => (
          <g key={e.d}>
            <line x1={e.x} x2={e.x} y1={top} y2={axisY} className="ev-line" />
            {e.level >= 0 && (
              <text x={e.left} y={axisY + 36 + e.level * 13} className="ev-t">{e.t}</text>
            )}
            <circle cx={e.x} cy={axisY} r="3" className="ev-dot" />
          </g>
        ))}
        {hover && <line x1={hover.px} x2={hover.px} y1={top} y2={axisY} className="hover-line" />}
        <rect x="0" y="0" width={W} height={axisY} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} onPointerDown={onMove} style={{ touchAction: 'pan-y' }} />
      </svg>
      {hover && (
        <div className="tip" style={{ left: clamp(hover.px, 90, W - 90), top: 6 }}>
          <b>{fmtDay(hover.bin.d0)}{hover.bin.d1 - hover.bin.d0 > 1 ? ' to ' + fmtDay(hover.bin.d1 - 1, { year: hover.bin.d1 - hover.bin.d0 > 200 ? 'numeric' : undefined }) : ''}</b>
          {model.lanes.map((ln) => {
            const bn = ln.bins.find((q) => q.d0 === hover.bin.d0)
            return <span key={ln.key}>{ln.key === 'songs' ? 'songs' : ln.key === 'ledger' ? 'ledger lines' : 'card swipes'}: {fmtN(bn ? bn.sum : 0)}</span>
          })}
        </div>
      )}
    </div>
  )
}
