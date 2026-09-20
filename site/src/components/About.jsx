import { facts as F } from '../store'
import { Receipt } from './Bits'
import { fmtN, pct } from '../lib/util'

export default function About() {
  const n = F.notes
  return (
    <section id="data" className="data-sec">
      <div className="data-in">
        <div className="data-copy">
          <h2 className="h-xl sm">How this was made</h2>
          <p>Everything on this page is computed in your browser from three static exports. There is no server and no network request after the page loads.</p>
          <p>The three files come from different worlds, so this story is a reading, not a fact. The songs and the ledger overlap from January 2015 to September 2018. The songs and the card swipes overlap from April 2022 to April 2024. The years in between have songs and nothing else.</p>
          <p>The rhymes are correlations and the chapter breaks were chosen where the music volume or the ledger changes character. They are leads, not proof.</p>
        </div>
        <Receipt className="data-rc">
          <p className="dr-k">Receipt of the receipts</p>
          <h3 className="dr-t sm">Cleaning notes</h3>
          <dl className="leaders">
            <div><dt>Song rows in file</dt><dd>{fmtN(n.songs_raw)}</dd></div>
            <div><dt>Exact duplicates removed</dt><dd>−{fmtN(n.songs_dupes)}</dd></div>
            <div><dt>Songs kept</dt><dd>{fmtN(n.songs)}</dd></div>
            <div><dt>Ledger lines (none removed)</dt><dd>{fmtN(n.ledger)}</dd></div>
            <div><dt>Card rows in file</dt><dd>{fmtN(n.cards_raw)}</dd></div>
            <div><dt>Exact duplicates removed</dt><dd>−{fmtN(n.cards_dupes)}</dd></div>
            <div><dt>Card swipes kept</dt><dd>{fmtN(n.cards)}</dd></div>
            <div><dt>Swipes with a smudged date</dt><dd>{fmtN(n.cards_undated)}</dd></div>
            <div><dt>Swipes with no category</dt><dd>{fmtN(n.cards_no_cat)}</dd></div>
            <div><dt>Swipes with no amount</dt><dd>{fmtN(n.cards_no_amt)}</dd></div>
          </dl>
          <ul className="notes">
            <li>The card file repeats each swipe about seven times. Only 1,500 are distinct, so every card figure here uses those. The json, tsv and xml versions hold the same rows.</li>
            <li>Song times are UTC. Ledger and card times are as written, and the ledger has a time on only some lines. Days are matched on calendar date, so a late-night song can land on the next day.</li>
            <li>{pct(n.cards_flagged / n.cards_flag_known)} of card swipes carry a bank flag, far more than any real card would. The flag is shown but not trusted, and the “fraud_” prefix on every merchant name was stripped.</li>
            <li>Card cities and states disagree with each other, so cards are not mapped. Ledger places are anonymised (Place 0, Place 4), so routes show relationships, not geography.</li>
            <li>Song “skips” use the forward-button ending, because the file’s own skipped flag reads “false” in most years.</li>
            <li>Card amounts are large next to the ledger’s, so totals are avoided and medians are used.</li>
          </ul>
          <p className="thanks">Thank you. Come again.</p>
        </Receipt>
      </div>
    </section>
  )
}
