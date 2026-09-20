// All the data work happens here, in the browser, from static JSON. No network, no server.
import spotify from './data/spotify.json'
import ledgerRaw from './data/ledger.json'
import cardsRaw from './data/cards.json'
import facts from './data/facts.json'
import { dayFromISO } from './lib/util'

export { facts }
export const DAYS = 4383 // 2013-01-01 .. 2024-12-31

function dec(b64, Ctor) {
  const bin = atob(b64)
  const u8 = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
  return new Ctor(u8.buffer)
}

// ---------------------------------------------------------------- songs
export const S = (() => {
  const n = spotify.n
  const T = dec(spotify.t, Uint32Array)
  const TR = dec(spotify.tr, Uint16Array)
  const SEC = dec(spotify.sec, Uint16Array)
  const FL = dec(spotify.f, Uint8Array)
  const D = new Uint16Array(n)
  for (let i = 0; i < n; i++) D[i] = (T[i] / 1440) | 0
  const start = new Uint32Array(DAYS + 2)
  for (let i = 0; i < n; i++) start[D[i] + 1]++
  for (let d = 0; d <= DAYS; d++) start[d + 1] += start[d]
  const artists = spotify.artists
  const albums = spotify.albums
  const tName = spotify.tracks.map((t) => t[0])
  const tArt = Uint16Array.from(spotify.tracks.map((t) => t[1]))
  const tAlb = Uint16Array.from(spotify.tracks.map((t) => t[2]))
  const tKey = spotify.tracks.map((t) => (t[0] + ' ' + artists[t[1]] + ' ' + albums[t[2]]).toLowerCase())
  return { n, T, TR, SEC, FL, D, start, artists, albums, tName, tArt, tAlb, tKey, plat: spotify.plat, reasons: spotify.reasons }
})()

export function song(i) {
  const tr = S.TR[i]
  const f = S.FL[i]
  return {
    kind: 's', i, d: S.D[i], min: S.T[i] % 1440, name: S.tName[tr], artist: S.artists[S.tArt[tr]], artistIx: S.tArt[tr], album: S.albums[S.tAlb[tr]],
    sec: S.SEC[i], plat: S.plat[f & 7], shuffle: !!(f & 8), reason: S.reasons[f >> 4],
  }
}

// ---------------------------------------------------------------- ledger
export const L = (() => {
  const rows = ledgerRaw.rows.map((r, i) => ({
    kind: 'l', i, d: r[0], min: r[1], mode: ledgerRaw.modes[r[2]], cat: ledgerRaw.cats[r[3]], sub: ledgerRaw.subs[r[4]] || '', note: r[5], amt: r[6], typ: r[7],
  }))
  const start = new Uint32Array(DAYS + 2)
  rows.forEach((r) => start[r.d + 1]++)
  for (let d = 0; d <= DAYS; d++) start[d + 1] += start[d]
  const cats = [...new Set(rows.map((r) => r.cat))].sort((a, b) => a.localeCompare(b))
  return { rows, start, cats, n: rows.length }
})()

// ---------------------------------------------------------------- cards
export const C = (() => {
  const rows = cardsRaw.rows.map((r, i) => ({
    kind: 'c', i, d: r[0], min: r[1], merchant: r[2] >= 0 ? cardsRaw.merchants[r[2]] : '', cat: r[3] >= 0 ? cardsRaw.cats[r[3]] : '', amt: r[4], flag: r[5], id: r[6],
  }))
  const dated = rows.filter((r) => r.d >= 0).length
  const start = new Uint32Array(DAYS + 2)
  for (let i = 0; i < dated; i++) start[rows[i].d + 1]++
  for (let d = 0; d <= DAYS; d++) start[d + 1] += start[d]
  const first = rows[0].d
  const last = rows[dated - 1].d
  return { rows, start, dated, n: rows.length, first, last, cats: cardsRaw.cats }
})()

// ---------------------------------------------------------------- daily aggregates (prefix sums for zoomable charts)
function prefix(fn) {
  const p = new Float64Array(DAYS + 2)
  for (let d = 0; d <= DAYS; d++) p[d + 1] = p[d] + fn(d)
  return p
}
const secPerDay = new Float64Array(DAYS + 1)
for (let i = 0; i < S.n; i++) secPerDay[S.D[i]] += S.SEC[i]
export const P = {
  songs: prefix((d) => S.start[d + 1] - S.start[d]),
  ledger: prefix((d) => L.start[d + 1] - L.start[d]),
  cards: prefix((d) => C.start[d + 1] - C.start[d]),
}
export const songsOn = (d) => S.start[d + 1] - S.start[d]
export const hoursOn = (d) => secPerDay[d] / 3600
export const monthAvg = (d) => {
  // average plays per day of the calendar month containing day d
  const dt = new Date(Date.UTC(2013, 0, 1 + d))
  const a = dayFromISO(`${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-01`)
  const b = dayFromISO(new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 1)).toISOString())
  return (P.songs[b] - P.songs[a]) / (b - a)
}

export const SPAN = { first: (S.D[0]), last: S.D[S.n - 1] }
export const rangeOf = (start, d0, d1) => [start[Math.max(0, d0)], start[Math.min(DAYS, d1) + 1]]
