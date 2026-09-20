import { useEffect, useLayoutEffect, useRef, useState, createContext } from 'react'

export const NavCtx = createContext({ openDrawer: () => {}, openDay: () => {} })

export function useSize() {
  const ref = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setSize({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size]
}

export function useReducedMotion() {
  const [r, setR] = useState(false)
  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    setR(q.matches)
    const f = () => setR(q.matches)
    q.addEventListener?.('change', f)
    return () => q.removeEventListener?.('change', f)
  }, [])
  return r
}

// Smoothly tween a numeric array toward a target. Returns the live value.
export function useTween(target, ms = 700, disabled = false) {
  const [val, setVal] = useState(target)
  const cur = useRef(target)
  const raf = useRef(0)
  useEffect(() => {
    if (disabled) { cur.current = target; setVal(target); return }
    const from = cur.current.slice()
    const t0 = performance.now()
    cancelAnimationFrame(raf.current)
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms)
      const e = ease(t)
      const next = target.map((v, i) => from[i] + (v - from[i]) * e)
      cur.current = next
      setVal(next)
      if (t < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.join(','), disabled])
  return val
}

export function useInView(opts) {
  const ref = useRef(null)
  const [inView, setIn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setIn(e.isIntersecting), opts || { threshold: 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, inView]
}
