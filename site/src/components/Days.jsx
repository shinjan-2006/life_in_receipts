import { useContext, useEffect, useMemo, useState } from 'react'
import { facts as F, S, L, C, DAYS, songsOn, hoursOn, monthAvg, song } from '../store'
import { NavCtx } from '../lib/hooks'
import { Receipt, SrcMark } from './Bits'
import { fmtN, fmtINR, fmtLong, fmtDay, dayIdx, yearOf, monthOf, dateOf, hhmm, mmss, cap } from '../lib/util'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const YEARS = Array.from({ length: 12 }, (_, i) => 2013 + i)
const RICH = (() => {
  const out = []
  for (let d = 0; d < DAYS; d++) if (songsOn(d) >= 20 && (L.start[d + 1] - L.start[d] >= 2 || C.start[d + 1] - C.start[d] >= 2)) out.push(d)
  return out
})()
const level = (n) => (n === 0 ? 0 : n < 10 ? 1 : n < 60 ? 2 : n < 150 ? 3 : 4)
const totalOn = (d) => songsOn(d) + (L.start[d + 1] - L.start[d]) + (C.start[d + 1] - C.start[d])

function Month({ y, m, sel, onSel }) {
  const first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7
  const n = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const cells = []
  for (let i = 0; i < first; i++) cells.push(<span key={'b' + i} className="cal-blank" />)
  for (let dd = 1; dd <= n; dd++) {
    const d = dayIdx(y, m, dd)
    const s = songsOn(d)
    const l = L.start[d + 1] - L.start[d]
    const c = C.start[d + 1] - C.start[d]
    cells.push(
      <button key={dd} className={`cal-d lv${level(s)} ${sel === d ? 'sel' : ''}`} onClick={() => onSel(d)} aria-label={`${fmtDay(d)}: ${s} songs, ${l} ledger lines, ${c} card swipes`} aria-pressed={sel === d} title={`${fmtDay(d)}: ${s} songs${l ? `, ${l} ledger` : ''}${c ? `, ${c} card` : ''}`}>
        <span className="cal-n">{dd}</span>
        {l > 0 && <i className="pip pl" />}
        {c > 0 && <i className="pip pc" />}
      </button>
    )
  }
  return (
    <div className="cal-m">
      <h4>{MONTHS[m]}</h4>
      <div className="cal-g">{cells}</div>
    </div>
  )
}

function Sessions({ d }) {
  const [open, setOpen] = useState({})
  const [all, setAll] = useState({})
  useEffect(() => { setOpen({}); setAll({}) }, [d])
  const sessions = useMemo(() => {
    const a = S.start[d], b = S.start[d + 1]
    const out = []
    let cur = null
    for (let i = a; i < b; i++) {
      const t = S.T[i] % 1440
      if (!cur || t - cur.end > 45) { cur = { start: t, end: t, idx: [], art: new Map() }; out.push(cur) }
      cur.end = t
      cur.idx.push(i)
      const ar = S.artists[S.tArt[S.TR[i]]]
      cur.art.set(ar, (cur.art.get(ar) || 0) + 1)
    }
    return out
  }, [d])
  if (!sessions.length) return null
  return (
    <ul className="sess">
      {sessions.map((s, k) => {
        const top = [...s.art.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a]) => a).join(', ')
        const shown = all[k] ? s.idx : s.idx.slice(0, 40)
        return (
          <li key={k}>
            <button className="sess-h" onClick={() => setOpen((o) => ({ ...o, [k]: !o[k] }))} aria-expanded={!!open[k]}>
              <span className="mono">{hhmm(s.start)} to {hhmm(s.end)}</span>
              <span className="sess-t">{fmtN(s.idx.length)} {s.idx.length === 1 ? 'song' : 'songs'}: {top}</span>
              <span className="sess-x" aria-hidden="true">{open[k] ? 'Hide' : 'Show'}</span>
            </button>
            {open[k] && (
              <ol className="sess-l">
                {shown.map((i) => { const r = song(i); return (
                  <li key={i}><span className="mono">{hhmm(r.min)}</span><span>{r.name}, <em>{r.artist}</em></span><span className="mono">{mmss(r.sec)}</span></li>
                ) })}
                {!all[k] && s.idx.length > 40 && <li><button className="link-btn" onClick={() => setAll((o) => ({ ...o, [k]: true }))}>Show all {fmtN(s.idx.length)}</button></li>}
              </ol>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function DayReceipt({ d, onPick }) {
  const { openDrawer } = useContext(NavCtx)
  const ns = songsOn(d)
  const lrows = L.rows.slice(L.start[d], L.start[d + 1])
  const crows = C.rows.slice(C.start[d], C.start[d + 1])
  const avg = monthAvg(d)
  const hrs = hoursOn(d)
  const out = lrows.filter((r) => r.typ !== 1).reduce((a, r) => a + r.amt, 0)
  const inc = lrows.filter((r) => r.typ === 1).reduce((a, r) => a + r.amt, 0)
  const card = crows.reduce((a, r) => a + (r.amt > 0 ? r.amt : 0), 0)
  const dt = dateOf(d)
  const others = YEARS.filter((y) => y !== yearOf(d)).map((y) => [y, dayIdx(y, monthOf(d), dt.getUTCDate())]).filter(([, dd]) => dd < DAYS && totalOn(dd) > 0)
  const empty = !ns && !lrows.length && !crows.length
  return (
    <Receipt className="day-rc">
      <p className="dr-k">Day receipt</p>
      <h3 className="dr-t">{fmtLong(d)}</h3>
      {empty ? (
        <p className="dr-empty">Nothing on record for this day in any of the three files. Silence is data too: pick a day with a dot in the calendar, or press “Surprise me”.</p>
      ) : (
        <>
          <p className="dr-sum">
            {ns > 0 && <span><SrcMark kind="s" /> {fmtN(ns)} songs, {hrs.toFixed(1)} hours</span>}
            {lrows.length > 0 && <span><SrcMark kind="l" /> {lrows.length} ledger {lrows.length === 1 ? 'line' : 'lines'}</span>}
            {crows.length > 0 && <span><SrcMark kind="c" /> {crows.length} card {crows.length === 1 ? 'swipe' : 'swipes'}</span>}
          </p>
          {ns > 0 && avg > 0 && (
            <p className="dr-echo">
              {ns >= avg ? `${(ns / avg).toFixed(1)}× a typical day` : `${Math.round((ns / avg) * 100)}% of a typical day`} this month for music (about {Math.round(avg)} songs).
              {lrows.length > 0 && ns < avg * 0.6 && ' A quiet day, with money on the page.'}
              {lrows.length > 0 && ns > avg * 1.6 && ' A loud day, with money on the page.'}
            </p>
          )}

          {ns > 0 && <><h4 className="dr-h">Songs</h4><Sessions d={d} /></>}

          {lrows.length > 0 && (
            <>
              <h4 className="dr-h">Ledger</h4>
              <ul className="dr-list">
                {lrows.map((r) => (
                  <li key={r.i}>
                    <span className="mono dr-time">{r.min >= 0 ? hhmm(r.min) : 'no time'}</span>
                    <span className="dr-what"><b>{r.sub || r.cat}</b>{r.note ? `, ${r.note}` : ''}<small>{r.sub ? r.cat : ''}{r.typ === 1 ? ' (income)' : r.typ === 2 ? ' (transfer)' : ''}</small></span>
                    <span className="mono dr-amt">{r.typ === 1 ? '+' : ''}{fmtINR(r.amt)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {crows.length > 0 && (
            <>
              <h4 className="dr-h">Card</h4>
              <ul className="dr-list">
                {crows.map((r) => (
                  <li key={r.i}>
                    <span className="mono dr-time">{hhmm(r.min)}</span>
                    <span className="dr-what"><b>{r.merchant || 'Unnamed merchant'}</b><small>{r.cat ? cap(r.cat.replaceAll('_', ' ')) : 'unlabelled'}{r.flag === 1 ? ', flagged by bank' : ''}</small></span>
                    <span className="mono dr-amt">{r.amt > 0 ? fmtINR(r.amt) : 'smudged'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <dl className="leaders dr-tot">
            {ns > 0 && <div><dt>Songs</dt><dd>{fmtN(ns)}</dd></div>}
            {lrows.length > 0 && <div><dt>Ledger out</dt><dd>{fmtINR(out)}</dd></div>}
            {inc > 0 && <div><dt>Ledger in</dt><dd>{fmtINR(inc)}</dd></div>}
            {card > 0 && <div><dt>Card</dt><dd>{fmtINR(card)}</dd></div>}
          </dl>
        </>
      )}
      <p className="fine">Song times are UTC as the player logged them; ledger and card times are as written.</p>
      {others.length > 0 && (
        <div className="dr-others">
          <span>Same date in other years</span>
          <div className="chips">{others.map(([y, dd]) => <button key={y} className="chip" onClick={() => onPick(dd)}>{y} ({fmtN(totalOn(dd))})</button>)}</div>
        </div>
      )}
      <div className="step-actions">
        <button className="btn btn-line" onClick={() => openDrawer({ d0: d, d1: d })}>Open this day in the drawer</button>
      </div>
    </Receipt>
  )
}

export default function Days({ pick }) {
  const [sel, setSel] = useState(F.notable.find((n) => n.label === 'The busiest day')?.d ?? 1709)
  const [year, setYear] = useState(yearOf(sel))
  useEffect(() => { if (pick) { setSel(pick.d); setYear(yearOf(pick.d)) } }, [pick])
  const choose = (d) => { setSel(d); setYear(yearOf(d)) }
  const surprise = () => choose(RICH[Math.floor(Math.random() * RICH.length)])
  const notable = [...F.notable].sort((a, b) => a.d - b.d)
  return (
    <section id="days" className="paper-sec">
      <div className="sec-head">
        <h2 className="h-l">Pull a thread</h2>
        <p className="sec-lede">Pick any day. Songs, ledger lines and card swipes that happened on it print on one receipt, so a quiet ledger day can sit next to a loud playlist.</p>
      </div>
      <div className="days-grid">
        <div className="cal">
          <div className="cal-bar">
            <div className="chips" role="group" aria-label="Year">
              {YEARS.map((y) => <button key={y} className={y === year ? 'chip on' : 'chip'} onClick={() => setYear(y)}>{y}</button>)}
            </div>
            <ul className="cal-key">
              <li><i className="lv1" /> few songs</li><li><i className="lv4" /> many</li>
              <li><i className="pip pl" /> ledger</li><li><i className="pip pc" /> card</li>
            </ul>
          </div>
          <div className="cal-months">
            {MONTHS.map((_, m) => <Month key={m} y={year} m={m} sel={sel} onSel={choose} />)}
          </div>
          <div className="cal-jump">
            <button className="btn btn-ink" onClick={surprise}>Surprise me</button>
            <div className="chips">
              {notable.map((n) => <button key={n.d} className="chip" onClick={() => choose(n.d)}>{n.label}</button>)}
            </div>
          </div>
        </div>
        <div className="day-col"><DayReceipt d={sel} onPick={choose} /></div>
      </div>
    </section>
  )
}
