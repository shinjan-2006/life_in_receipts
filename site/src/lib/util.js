export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const lerp = (a, b, t) => a + (b - a) * t
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const nf = new Intl.NumberFormat('en-IN')
const nus = new Intl.NumberFormat('en-US')
export const fmtN = (n) => nus.format(Math.round(n))
export const fmtINR = (n) => {
  const r = Math.round(n * 100) / 100
  return '₹' + (Number.isInteger(r) ? nf.format(r) : r.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
}
export const fmtLakh = (n) => (n >= 1e5 ? '₹' + (n / 1e5).toFixed(1).replace(/\.0$/, '') + ' lakh' : fmtINR(n))
export const pct = (v, d = 0) => (v * 100).toFixed(d) + '%'

export const BASE = Date.UTC(2013, 0, 1)
export const DAY_MS = 86400000
export const dateOf = (d) => new Date(BASE + d * DAY_MS)
export const fmtDay = (d, o = {}) =>
  dateOf(d).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric', ...o })
export const fmtLong = (d) =>
  dateOf(d).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
export const fmtMon = (d) => dateOf(d).toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'short', year: 'numeric' })
export const dayFromISO = (s) => Math.round((Date.parse(s.slice(0, 10) + 'T00:00:00Z') - BASE) / DAY_MS)
export const isoOfDay = (d) => dateOf(d).toISOString().slice(0, 10)
export const yearOf = (d) => dateOf(d).getUTCFullYear()
export const monthOf = (d) => dateOf(d).getUTCMonth()
export const dayIdx = (y, m, dd = 1) => Math.round((Date.UTC(y, m, dd) - BASE) / DAY_MS)
export const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
export const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
export const dur = (s) => (s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${(s / 3600).toFixed(1)}h`)
export const lin = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0)
export const plural = (n, a, b) => (n === 1 ? a : b || a + 's')
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)
