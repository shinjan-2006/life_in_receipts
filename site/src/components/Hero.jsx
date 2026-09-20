import { facts as F } from '../store'
import { fmtN } from '../lib/util'
import { Barcode } from './Bits'

const fmtStamp = (iso) => {
  const d = new Date(iso.replace(' ', 'T') + 'Z')
  return d.toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + iso.slice(11, 16)
}

export default function Hero() {
  const t = F.totals
  return (
    <header className="hero" id="top">
      <div className="hero-copy">
        <h1 className="hero-title">
          <span>Your life,</span>
          <span>in receipts.</span>
        </h1>
        <p className="hero-lede">
          {fmtN(t.songs)} songs, {fmtN(t.ledger)} lines from a handwritten household ledger and {fmtN(t.cards)} card swipes.
          None of them mean much alone. Laid on one timeline, they show a person changing, and a few things that never did.
        </p>
        <div className="hero-actions">
          <a className="btn btn-lemon" href="#story">Read the roll</a>
          <a className="btn btn-ghost" href="#days">Pull a thread</a>
          <a className="btn btn-ghost" href="#drawer">Search the drawer</a>
        </div>
      </div>

      <div className="printer" aria-label="A receipt summarising the whole dataset">
        <div className="printer-slot" aria-hidden="true" />
        <div className="printer-window">
          <div className="roll">
            <div className="roll-paper">
              <p className="roll-title">LIFE, ITEMISED</p>
              <p className="roll-sub">8 Jul 2013 to 15 Dec 2024</p>
              <hr />
              <dl className="roll-list">
                <div><dt>Songs played</dt><dd>{fmtN(t.songs)}</dd></div>
                <div><dt>Hours of music</dt><dd>{fmtN(t.hours)}</dd></div>
                <div><dt>Different songs</dt><dd>{fmtN(t.tracks)}</dd></div>
                <div><dt>Ledger lines</dt><dd>{fmtN(t.ledger)}</dd></div>
                <div><dt>Card swipes</dt><dd>{fmtN(t.cards)}</dd></div>
              </dl>
              <hr />
              <p className="roll-h">First receipt</p>
              <p className="roll-body">{fmtStamp(F.first_song.ts)}<br />“{F.first_song.name}”<br />{F.first_song.artist}, {Math.round(F.first_song.ms / 1000)} seconds</p>
              <hr />
              <p className="roll-h">Last receipt</p>
              <p className="roll-body">{fmtStamp(F.last_song.ts)}<br />“{F.last_song.name}”<br />{F.last_song.artist}</p>
              <hr />
              <p className="roll-total"><span>TOTAL</span><span>one life</span></p>
              <Barcode />
              <p className="roll-foot">Bar thickness follows songs played each month.</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
