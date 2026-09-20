import { useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { S, L, C, DAYS, song } from '../store'
import { NavCtx } from '../lib/hooks'
import { Receipt, SrcMark } from './Bits'
import { fmtN, fmtINR, fmtDay, isoOfDay, dayFromISO, hhmm, mmss, cap, clamp } from '../lib/util'

const REASON = {
  trackdone: 'played to the end', fwdbtn: 'cut short with forward', endplay: 'stopped', logout: 'logged out', backbtn: 'went back', 'unexpected-exit-while-paused': 'app closed while paused',
  unknown: 'unknown ending', remote: 'ended remotely', 'unexpected-exit': 'app closed', clickrow: 'picked another song', nextbtn: 'pressed next', appload: 'app reopened', popup: 'interrupted', reload: 'reloaded', trackerror: 'track error',
}
const FIRST = 188
const LAST = 4366
const lkey = (r) => r._k || (r._k = `${r.sub} ${r.cat} ${r.note} ${r.mode} ${r.amt}`.toLowerCase())
const ckey = (r) => r._k || (r._k = `${r.merchant} ${r.cat.replaceAll('_', ' ')} ${r.amt}`.toLowerCase())

function run(f) {
  const tokens = f.q.toLowerCase().split(/\s+/).filter(Boolean)
  const d0 = clamp(f.d0, 0, DAYS - 1), d1 = clamp(f.d1, 0, DAYS - 1)
  const fullRange = d0 <= 0 && d1 >= DAYS - 1
  const catSrc = f.cat ? f.cat[0] : null
  const catVal = f.cat ? f.cat.slice(2) : null
  const sI = [], lI = [], cI = []
  if (f.s && !catSrc) {
    const a = S.start[d0], b = S.start[d1 + 1]
    let ok = null
    if (tokens.length || f.artist != null) {
      ok = new Uint8Array(S.tName.length)
      for (let t = 0; t < ok.length; t++) if ((f.artist == null || S.tArt[t] === f.artist) && tokens.every((k) => S.tKey[t].includes(k))) ok[t] = 1
    }
    for (let i = a; i < b; i++) {
      if (ok && !ok[S.TR[i]]) continue
      if (f.full && S.SEC[i] < 30) continue
      sI.push(i)
    }
  }
  if (f.l && f.artist == null && (!catSrc || catSrc === 'l')) {
    for (let i = L.start[d0]; i < L.start[d1 + 1]; i++) {
      const r = L.rows[i]
      if (catVal && r.cat !== catVal) continue
      if (tokens.length && !tokens.every((k) => lkey(r).includes(k))) continue
      lI.push(i)
    }
  }
  if (f.c && f.artist == null && (!catSrc || catSrc === 'c')) {
    const end = fullRange ? C.n : C.start[d1 + 1]
    for (let i = C.start[d0]; i < end; i++) {
      const r = C.rows[i]
      if (catVal && r.cat !== catVal) continue
      if (tokens.length && !tokens.every((k) => ckey(r).includes(k))) continue
      cI.push(i)
    }
  }
  const kS = (i) => S.T[i]
  const kL = (i) => { const r = L.rows[i]; return r.d * 1440 + Math.max(0, r.min) }
  const kC = (i) => { const r = C.rows[i]; return r.d >= 0 ? r.d * 1440 + r.min : -1 }
  const n = sI.length + lI.length + cI.length
  const src = new Uint8Array(n), idx = new Int32Array(n)
  let a = 0, b = 0, c = 0
  for (let o = 0; o < n; o++) {
    const ka = a < sI.length ? kS(sI[a]) : Infinity, kb = b < lI.length ? kL(lI[b]) : Infinity, kc = c < cI.length ? kC(cI[c]) : Infinity
    if (ka <= kb && ka <= kc) { src[o] = 0; idx[o] = sI[a++] } else if (kb <= kc) { src[o] = 1; idx[o] = lI[b++] } else { src[o] = 2; idx[o] = cI[c++] }
  }
  if (f.desc) { src.reverse(); idx.reverse() }
  return { src, idx, n, counts: [sI.length, lI.length, cI.length] }
}

function Row({ src, idx, on, onClick, style }) {
  let d, time, main, sub, right, kind
  if (src === 0) {
    const r = song(idx); kind = 's'; d = r.d; time = hhmm(r.min); main = r.name; sub = r.artist; right = mmss(r.sec)
  } else if (src === 1) {
    const r = L.rows[idx]; kind = 'l'; d = r.d; time = r.min >= 0 ? hhmm(r.min) : ''; main = r.sub || r.cat; sub = [r.sub ? r.cat : '', r.note].filter(Boolean).join(', '); right = (r.typ === 1 ? '+' : '') + fmtINR(r.amt)
  } else {
    const r = C.rows[idx]; kind = 'c'; d = r.d; time = r.d >= 0 ? hhmm(r.min) : ''; main = r.merchant || 'Unnamed merchant'; sub = r.cat ? cap(r.cat.replaceAll('_', ' ')) : 'unlabelled'; right = r.amt > 0 ? fmtINR(r.amt) : 'smudged'
  }
  return (
    <li className={`row ${on ? 'on' : ''}`} style={style}>
      <button onClick={onClick} aria-pressed={on}>
        <SrcMark kind={kind} />
        <span className="row-when mono">{d >= 0 ? fmtDay(d) : 'no date'}{time ? ' ' + time : ''}</span>
        <span className="row-main"><b>{main}</b><small>{sub}</small></span>
        <span className="row-right mono">{right}</span>
      </button>
    </li>
  )
}

function Detail({ item, onFilter, onDay, onClose }) {
  if (!item) return (
    <Receipt className="detail"><p className="dr-k">Receipt</p><p className="dr-empty">Pick any row to see the whole receipt and the threads leading out of it.</p></Receipt>
  )
  const { src, idx } = item
  let title, fields, actions, kind, d
  if (src === 0) {
    const r = song(idx); kind = 's'; d = r.d; title = r.name
    fields = [['Artist', r.artist], ['Album', r.album || 'unknown'], ['Played', `${mmss(r.sec)} at ${hhmm(r.min)} UTC`], ['Ended', REASON[r.reason] || r.reason], ['Device', r.plat], ['Shuffle', r.shuffle ? 'on' : 'off']]
    actions = [['More by ' + r.artist, () => onFilter({ artist: r.artistIx, q: '', cat: '', s: true, l: false, c: false })]]
  } else if (src === 1) {
    const r = L.rows[idx]; kind = 'l'; d = r.d; title = r.sub || r.cat
    fields = [['Category', r.cat], ['Note', r.note || 'none'], ['Paid by', r.mode], ['Type', ['Expense', 'Income', 'Transfer out'][r.typ]], ['Amount', fmtINR(r.amt)], ['Time', r.min >= 0 ? hhmm(r.min) : 'date only']]
    actions = [['More in ' + r.cat, () => onFilter({ cat: 'l:' + r.cat, artist: null, q: '', s: false, l: true, c: false })]]
  } else {
    const r = C.rows[idx]; kind = 'c'; d = r.d; title = r.merchant || 'Unnamed merchant'
    fields = [['Category', r.cat ? cap(r.cat.replaceAll('_', ' ')) : 'unlabelled'], ['Amount', r.amt > 0 ? fmtINR(r.amt) : 'smudged'], ['Time', r.d >= 0 ? hhmm(r.min) : 'smudged'], ['Bank flag', r.flag === 1 ? 'flagged' : r.flag === 0 ? 'clear' : 'unreadable'], ['Receipt no.', r.id || 'unreadable']]
    actions = r.cat ? [['More in ' + cap(r.cat.replaceAll('_', ' ')), () => onFilter({ cat: 'c:' + r.cat, artist: null, q: '', s: false, l: false, c: true })]] : []
  }
  return (
    <Receipt className="detail">
      <p className="dr-k"><SrcMark kind={kind} size={16} /> {d >= 0 ? fmtDay(d) : 'Date smudged'}</p>
      <h3 className="dr-t sm">{title}</h3>
      <dl className="leaders">{fields.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <div className="step-actions">
        {d >= 0 && <button className="btn btn-ink" onClick={() => onDay(d)}>Everything on this day</button>}
        {actions.map(([t, fn]) => <button key={t} className="btn btn-line" onClick={fn}>{t}</button>)}
        <button className="btn btn-line" onClick={onClose}>Close</button>
      </div>
    </Receipt>
  )
}

const DEFAULT = { q: '', s: true, l: true, c: true, d0: 0, d1: DAYS - 1, cat: '', artist: null, full: false, desc: false }

export default function Drawer({ preset }) {
  const { openDay } = useContext(NavCtx)
  const [f, setF] = useState(DEFAULT)
  const [sel, setSel] = useState(null)
  const [scroll, setScroll] = useState(0)
  const box = useRef(null)
  const set = (p) => { setF((o) => ({ ...o, ...p })); setSel(null); if (box.current) box.current.scrollTop = 0 }
  useEffect(() => { if (preset) { const { n, ...p } = preset; setF({ ...DEFAULT, ...p }); setSel(null); if (box.current) box.current.scrollTop = 0 } }, [preset])
  const fd = useDeferredValue(f)
  const res = useMemo(() => run(fd), [fd])
  const mobile = typeof window !== 'undefined' && window.innerWidth < 700
  const rowH = mobile ? 78 : 60
  const H = mobile ? 460 : 600
  const start = Math.max(0, Math.floor(scroll / rowH) - 6)
  const end = Math.min(res.n, start + Math.ceil(H / rowH) + 12)
  const rows = []
  for (let o = start; o < end; o++) rows.push(<Row key={o} src={res.src[o]} idx={res.idx[o]} on={sel && sel.o === o} onClick={() => setSel({ o, src: res.src[o], idx: res.idx[o] })} style={{ position: 'absolute', top: o * rowH, height: rowH, left: 0, right: 0 }} />)
  const ledgerCats = L.cats
  const cardCats = C.cats
  const rangeLabel = f.d0 <= 0 && f.d1 >= DAYS - 1 ? '' : `${fmtDay(Math.max(f.d0, FIRST))} to ${fmtDay(Math.min(f.d1, LAST))}`
  const active = f.q || f.cat || f.artist != null || f.full || rangeLabel || !(f.s && f.l && f.c)

  return (
    <section id="drawer" className="paper-sec alt">
      <div className="sec-head">
        <h2 className="h-l">Search the drawer</h2>
        <p className="sec-lede">Every receipt in all three files, {fmtN(S.n + L.n + C.n)} of them, in one searchable stack. Try “Kindle”, “Medicine”, “Ode to the Mets” or “travel”.</p>
      </div>
      <div className="drawer-grid">
        <div className="drawer-main">
          <div className="filters">
            <label className="f-search">
              <span className="sr">Search receipts</span>
              <input type="search" placeholder="Search songs, artists, notes, merchants" value={f.q} onChange={(e) => set({ q: e.target.value })} />
            </label>
            <div className="f-row">
              <div className="seg" role="group" aria-label="Sources">
                {[['s', 'Songs'], ['l', 'Ledger'], ['c', 'Card']].map(([k, n]) => (
                  <button key={k} className={f[k] ? 'on' : ''} aria-pressed={f[k]} onClick={() => set({ [k]: !f[k] })}>{n}</button>
                ))}
              </div>
              <label className="f-sel"><span>From</span><input type="date" min={isoOfDay(FIRST)} max={isoOfDay(LAST)} value={isoOfDay(clamp(f.d0, FIRST, LAST))} onChange={(e) => e.target.value && set({ d0: dayFromISO(e.target.value) })} /></label>
              <label className="f-sel"><span>To</span><input type="date" min={isoOfDay(FIRST)} max={isoOfDay(LAST)} value={isoOfDay(clamp(f.d1, FIRST, LAST))} onChange={(e) => e.target.value && set({ d1: dayFromISO(e.target.value) })} /></label>
              <label className="f-sel"><span>Category</span>
                <select value={f.cat} onChange={(e) => set({ cat: e.target.value })}>
                  <option value="">Any</option>
                  <optgroup label="Ledger">{ledgerCats.map((c) => <option key={c} value={'l:' + c}>{c}</option>)}</optgroup>
                  <optgroup label="Card">{cardCats.map((c) => <option key={c} value={'c:' + c}>{cap(c.replaceAll('_', ' '))}</option>)}</optgroup>
                </select>
              </label>
            </div>
            <div className="f-row">
              <label className="f-chk"><input type="checkbox" checked={f.full} onChange={(e) => set({ full: e.target.checked })} /> Songs played 30 seconds or more</label>
              <label className="f-chk"><input type="checkbox" checked={f.desc} onChange={(e) => set({ desc: e.target.checked })} /> Newest first</label>
              {f.artist != null && <button className="chip on" onClick={() => set({ artist: null })}>Artist: {S.artists[f.artist]} (clear)</button>}
              {active && <button className="link-btn" onClick={() => { setF(DEFAULT); setSel(null) }}>Reset everything</button>}
            </div>
          </div>
          <p className="res-sum" aria-live="polite">
            <b>{fmtN(res.n)}</b> {res.n === 1 ? 'receipt' : 'receipts'}{res.n > 0 && <>: {fmtN(res.counts[0])} {res.counts[0] === 1 ? 'song' : 'songs'}, {fmtN(res.counts[1])} ledger {res.counts[1] === 1 ? 'line' : 'lines'}, {fmtN(res.counts[2])} card {res.counts[2] === 1 ? 'swipe' : 'swipes'}</>}{rangeLabel && <>, {rangeLabel}</>}
          </p>
          <div className="vlist" ref={box} style={{ height: H }} onScroll={(e) => setScroll(e.currentTarget.scrollTop)} tabIndex={0} role="region" aria-label="Receipt results">
            {res.n === 0 ? <p className="dr-empty pad">No receipts match. Loosen a filter, or reset everything.</p> : (
              <ul style={{ position: 'relative', height: res.n * rowH }}>{rows}</ul>
            )}
          </div>
        </div>
        <div className="drawer-side">
          <Detail item={sel} onFilter={(p) => set(p)} onDay={openDay} onClose={() => setSel(null)} />
        </div>
      </div>
    </section>
  )
}
