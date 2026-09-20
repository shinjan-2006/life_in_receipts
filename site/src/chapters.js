import { facts as F, C } from './store'
import { fmtN, fmtINR, fmtLakh, fmtDay, dayFromISO, pct } from './lib/util'

const ch = F.chapters
const yr = (y) => F.yearly.find((r) => r.y === y)
const mIdx = (iso) => F.months.indexOf(iso)
const mv = (key, iso) => F.monthly[key][mIdx(iso)]
const castMax = Math.max(...F.yearly.filter((r) => r.y !== 2020).map((r) => r.plat['cast to device'] || 0))
const reading = F.reading.filter((r) => r.d >= ch[1].ad && r.d < ch[1].bd)
const readingAmt = reading.reduce((a, r) => a + r.amt, 0)
const salaryGrowth = Math.round((F.salary.last / F.salary.first - 1) * 100)
const sub = (label) => F.subs.find((s) => s.label === label)
const cardFirst = C.first
const cardLast = C.last

// Events shown on the strip. `d` is a day index; labels stay short.
export const EVENTS = [
  { d: dayFromISO('2013-07-08'), t: 'First song' },
  { d: dayFromISO('2015-01-01'), t: 'Ledger opens' },
  { d: dayFromISO('2015-07-29'), t: 'Audible begins' },
  { d: dayFromISO('2016-01-13'), t: 'Wedding gift ₹45,000' },
  { d: dayFromISO('2016-04-24'), t: 'Last Kindle Unlimited' },
  { d: dayFromISO('2016-06-01'), t: 'Music returns' },
  { d: dayFromISO('2016-07-18'), t: 'The Beatles arrive' },
  { d: dayFromISO('2016-10-07'), t: 'Netflix' },
  { d: dayFromISO('2017-06-27'), t: '₹2 lakh FD' },
  { d: dayFromISO('2017-09-06'), t: '1,816 songs in a day' },
  { d: dayFromISO('2017-10-10'), t: '₹1.5 lakh into shares' },
  { d: dayFromISO('2018-09-20'), t: 'Last ledger line' },
  { d: dayFromISO('2020-08-15'), t: '13.5 hours in a day' },
  { d: cardFirst, t: 'First card swipe' },
  { d: cardLast, t: 'Last card swipe' },
  { d: dayFromISO('2024-12-15'), t: 'Last song' },
]

export const INTRO = {
  title: 'Three exports, one life',
  body: `${fmtN(F.totals.songs)} songs, ${fmtN(F.totals.ledger)} lines written by hand in a household ledger, and ${fmtN(F.totals.cards)} card swipes. Read separately they are three spreadsheets. Laid on one timeline they look like a person changing. Scroll: the strip zooms into each chapter.`,
}

export const CHAPTERS = [
  {
    key: 'explorer', persona: 'The explorer', title: 'One song, then a notebook',
    a: ch[0].ad, b: ch[0].bd, range: 'Jul 2013 to Oct 2015',
    body: `The first receipt prints at 02:44 on 8 July 2013: three seconds of “${F.first_song.name}”, started by autoplay on a web player. Then almost nothing, just ${yr(2014).plays} plays in all of 2014. On 1 January 2015 a second record starts, by hand: a ₹400 biryani and a ₹20 shared jeep ride. By the autumn the music has caught up, and it is mostly new. ${fmtN(ch[0].uniq)} different songs across ${fmtN(ch[0].plays)} plays.`,
    lines: [
      ['Songs played', fmtN(ch[0].plays)],
      ['Different songs', fmtN(ch[0].uniq)],
      ['Ledger lines', fmtN(ch[0].ledger)],
      ['Most played', ch[0].top[0][0]],
    ],
    focus: { d0: ch[0].ad, d1: ch[0].bd },
  },
  {
    key: 'reader', persona: 'The reader', title: 'The quiet winter',
    a: ch[1].ad, b: ch[1].bd, range: 'Nov 2015 to May 2016',
    body: `From January to May 2016 the player logs ${F.book_winter.plays} plays: two on New Year’s weekend, two in late February, one on 23 May. Meanwhile the ledger pays for reading: Kindle Unlimited around the 22nd, Audible around the 26th. A ₹${fmtN(F.wedding_gift.amt)} wedding gift lands on 13 January. It could be coincidence. But ${F.book_winter.plays} songs in five months, after ${fmtN(F.book_winter.prev)} in the three months before, is a break neither file could show alone.`,
    lines: [
      ['Songs, Aug to Oct 2015', fmtN(F.book_winter.prev)],
      ['Songs, Jan to May 2016', String(F.book_winter.plays)],
      ['Reading subscriptions paid', `${reading.length} (${fmtINR(readingAmt)})`],
      ['Music returns', '1 Jun 2016'],
    ],
    focus: { d0: ch[1].ad, d1: ch[1].bd },
  },
  {
    key: 'subscriber', persona: 'The subscriber', title: 'Everything streams',
    a: ch[2].ad, b: ch[2].bd, range: 'Jun to Dec 2016',
    body: `On 1 June 2016 the music returns in one long Vampire Weekend evening. Seven weeks later, on 18 July, The Beatles arrive and never leave. Around them the ledger fills with screens: Hotstar in April, Amazon Prime in June, Netflix in October, Tata Sky in December. The ledger itself gets busier: ${mv('ledger', '2016-11')} lines in November and ${mv('ledger', '2016-12')} in December, against about ${Math.round((mv('ledger', '2016-04') + mv('ledger', '2016-05') + mv('ledger', '2016-06')) / 3)} in a spring month.`,
    lines: [
      ['Songs played', fmtN(ch[2].plays)],
      ['Hours listened', fmtN(ch[2].hours)],
      ['Beatles plays', fmtN(ch[2].top[0][1])],
      ['Screens added', 'Hotstar, Prime, Netflix, Tata Sky'],
    ],
    focus: { d0: ch[2].ad, d1: ch[2].bd },
  },
  {
    key: 'builder', persona: 'The builder', title: 'The year of everything',
    a: ch[3].ad, b: ch[3].bd, range: '2017',
    body: `Songs and ledger both peak at once. ${fmtN(ch[3].plays)} songs, ${fmtN(ch[3].ledger)} ledger lines, a course fee paid ${sub('Edtech Course').n} times. Money starts moving differently: ${fmtLakh(F.invest.by_year['2017'])} goes into investments in 2017 (fixed deposits, mutual funds, ₹1.5 lakh into shares on 10 October) against ${fmtLakh(F.invest.by_year['2016'])} the year before. On 6 September you play ${fmtN(F.busiest[0].n)} songs in a single day, with a median of under a second each. That is less listening than flipping through a library.`,
    lines: [
      ['Songs played', fmtN(ch[3].plays)],
      ['Ledger lines', fmtN(ch[3].ledger)],
      ['Invested', fmtLakh(F.invest.by_year['2017'])],
      ['Songs ended by the forward button', pct(yr(2017).fwd)],
    ],
    focus: { d0: ch[3].ad, d1: ch[3].bd },
  },
  {
    key: 'regular', persona: 'The regular', title: 'The last page',
    a: ch[4].ad, b: ch[4].bd, range: 'Jan to Sep 2018',
    body: `The ledger runs until 20 September 2018. Its final two lines: idli-medu vada for two (₹60) and a ₹30 train fare at 12:04. Salary has climbed from ${fmtINR(F.salary.first)} to ${fmtINR(F.salary.last)}, up ${salaryGrowth}% since February 2015. Netflix renews on the 19th. The music is calmer than 2017: about ${fmtN(ch[4].plays / 8.7)} plays a month instead of ${fmtN(ch[3].plays / 12)}, and more songs are played to the end (${pct(yr(2018).done)} against ${pct(yr(2017).done)}).`,
    lines: [
      ['Salary, Feb 2015', fmtINR(F.salary.first)],
      ['Salary, Aug 2018', fmtINR(F.salary.last)],
      ['Songs played to the end', pct(yr(2018).done)],
      ['Last ledger line', '20 Sep 2018'],
    ],
    focus: { d0: ch[4].ad, d1: ch[4].bd },
  },
  {
    key: 'long', persona: 'The long listener', title: 'The silent ledger',
    a: ch[5].ad, b: ch[5].bd, range: 'Sep 2018 to Mar 2022',
    body: `Then the handwriting stops. For three and a half years there are no purchases on record at all, and the music gets longer. ${fmtN(ch[5].plays)} plays, ${fmtN(ch[5].hours)} hours. 2020 and 2021 are the two longest-listening years of the whole record, ${fmtN(yr(2020).hours)} and ${fmtN(yr(2021).hours)} hours. In 2020, ${fmtN(yr(2020).plat['cast to device'])} plays go “to a device”, a speaker or a screen; no other year manages more than ${fmtN(castMax)}. On 15 August 2020 the player runs for 13.5 hours.`,
    lines: [
      ['Purchases on record', '0'],
      ['Songs played', fmtN(ch[5].plays)],
      ['Hours listened', fmtN(ch[5].hours)],
      ['Hours in 2020 and 2021', `${fmtN(yr(2020).hours)} and ${fmtN(yr(2021).hours)}`],
    ],
    focus: { d0: ch[5].ad, d1: ch[5].bd },
  },
  {
    key: 'swiper', persona: 'The swiper', title: 'Swipes',
    a: ch[6].ad, b: ch[6].bd, range: 'Apr 2022 to Dec 2024',
    body: `In April 2022 a different record begins: card swipes. The typical swipe is ${fmtINR(F.card_median)}; the typical ledger line was ${fmtINR(F.ledger_median)}. There are no habits here. Swipes land at every hour of the day about equally, with no milk and no salary day. Music thins out too: ${fmtN(yr(2022).plays)} plays in 2022, ${fmtN(yr(2024).plays)} in 2024, and far fewer songs cut short with the forward button (${pct(yr(2024).fwd)} against ${pct(yr(2017).fwd)}). Card months and music months no longer move together. The last swipe is on ${fmtDay(cardLast)}. The last song is “${F.last_song.name}” by ${F.last_song.artist}, 15 December 2024.`,
    lines: [
      ['Card swipes', fmtN(F.totals.cards)],
      ['Median swipe', fmtINR(F.card_median)],
      ['Median ledger line', fmtINR(F.ledger_median)],
      ['Songs in 2024', fmtN(yr(2024).plays)],
    ],
    focus: { d0: ch[6].ad, d1: ch[6].bd },
  },
]

export const OUTRO = {
  title: 'What the receipts add up to',
  body: `An explorer, a reader, a subscriber, a builder, a regular, a long listener, a swiper: seven people in twelve years, sharing one playlist. The Beatles never leave. What changes is everything around the music: how much gets written down, how long you stay, and whether anything is counted at all.`,
}
