import { facts as F } from '../store'

export function Receipt({ children, className = '', torn = 'both', tag: Tag = 'div', ...rest }) {
  return (
    <div className={`rc ${className}`} {...rest}>
      <Tag className={`rc-paper torn-${torn}`}>{children}</Tag>
    </div>
  )
}

// The barcode is real data: one bar per month, thickness follows how many songs were played that month.
export function Barcode({ className = '' }) {
  const v = F.monthly.plays
  const max = Math.max(...v)
  let x = 0
  const bars = v.map((n, i) => {
    const w = 0.6 + (n / max) * 2.6
    const r = <rect key={i} x={x} y="0" width={w} height="40" />
    x += w + 0.9
    return r
  })
  return (
    <svg className={`barcode ${className}`} viewBox={`0 0 ${x} 40`} preserveAspectRatio="none" role="img" aria-label="A barcode whose bar thickness follows songs played each month, July 2013 to December 2024">
      {bars}
    </svg>
  )
}

export function SrcMark({ kind, size = 18 }) {
  const c = { s: 'var(--blue)', l: 'var(--ink)', c: 'var(--pink)' }[kind]
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="srcmark">
      <rect width="20" height="20" rx="4" fill={c} />
      {kind === 's' && <path d="M8 14.5V6l6-1.4v7.4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /> }
      {kind === 's' && <circle cx="6.8" cy="14.6" r="1.8" fill="#fff" />}
      {kind === 's' && <circle cx="12.8" cy="12.4" r="1.8" fill="#fff" />}
      {kind === 'l' && <text x="10" y="14.6" textAnchor="middle" fontSize="12" fontWeight="600" fill="#fff" fontFamily="IBM Plex Mono, monospace">₹</text>}
      {kind === 'c' && <rect x="3.5" y="5.5" width="13" height="9" rx="1.6" fill="none" stroke="#fff" strokeWidth="1.4" />}
      {kind === 'c' && <rect x="3.5" y="8" width="13" height="2" fill="#fff" />}
    </svg>
  )
}

export function Stamp({ children, className = '' }) {
  return <span className={`stamp ${className}`}>{children}</span>
}
