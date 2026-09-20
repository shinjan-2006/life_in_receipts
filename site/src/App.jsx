import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavCtx } from './lib/hooks'
import Hero from './components/Hero'
import Story from './components/Story'
import Patterns from './components/Patterns'
import Rhymes from './components/Rhymes'
import Days from './components/Days'
import Drawer from './components/Drawer'
import About from './components/About'

const LINKS = [
  ['story', 'Story'],
  ['patterns', 'Patterns'],
  ['rhymes', 'Rhymes'],
  ['days', 'Days'],
  ['drawer', 'Drawer'],
  ['data', 'Data'],
]

function scrollToId(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}

export default function App() {
  const [day, setDay] = useState(null) // selected day in the Days section
  const [preset, setPreset] = useState(null) // filter preset pushed into the Drawer
  const [spy, setSpy] = useState('')

  const openDay = useCallback((d) => { setDay({ d, n: Math.random() }); setTimeout(() => scrollToId('days'), 30) }, [])
  const openDrawer = useCallback((p) => { setPreset({ ...p, n: Math.random() }); setTimeout(() => scrollToId('drawer'), 30) }, [])
  const ctx = useMemo(() => ({ openDay, openDrawer }), [openDay, openDrawer])

  useEffect(() => {
    const ids = LINKS.map(([id]) => id)
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setSpy(e.target.id)),
      { rootMargin: '-40% 0px -55% 0px' }
    )
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])

  return (
    <NavCtx.Provider value={ctx}>
      <nav className="nav" aria-label="Sections">
        <a className="brand" href="#top" aria-label="Your Life, In Receipts, back to top">
          <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true"><path d="M7 3h18v26l-3-2.2L19 29l-3-2.2L13 29l-3-2.2L7 29z" fill="#f5f6f2" /><rect x="11" y="9" width="10" height="2.4" fill="#2332c6" /><rect x="11" y="14" width="10" height="2.4" fill="#2332c6" /><rect x="11" y="19" width="6" height="2.4" fill="#e8f24c" /></svg>
          <span>Life, in receipts</span>
        </a>
        <ul>
          {LINKS.map(([id, label]) => (
            <li key={id}><a href={`#${id}`} className={spy === id ? 'on' : ''}>{label}</a></li>
          ))}
        </ul>
      </nav>
      <main>
        <Hero />
        <Story />
        <Patterns />
        <Rhymes />
        <Days pick={day} />
        <Drawer preset={preset} />
        <About />
      </main>
    </NavCtx.Provider>
  )
}
