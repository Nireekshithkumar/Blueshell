import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMotionSettings } from './motion-settings'

const slides = [
  { image: 'shell-5.webp', title: 'A world shaped by water.', alt: 'An open freshwater mussel holding a pearl' },
  { image: 'freshwater-photo-0.webp', title: 'Inside the shell.', alt: 'Cultivated pearls inside an open freshwater clam' },
  { image: 'freshwater-photo-1.webp', title: 'Shapes of nacre.', alt: 'Loose keshi pearls in varied shapes and sizes' },
  { image: 'freshwater-photo-2.webp', title: 'Freshwater keshi.', alt: 'Freshwater keshi pearls arranged in strands' },
  { image: 'freshwater-photo-3.webp', title: 'White Wedding.', alt: 'A necklace made from freshwater pearls of different shapes and sizes' },
  { image: 'freshwater-photo-4.webp', title: 'A strand of pearls.', alt: 'A necklace of round freshwater pearls' },
]
const strips = 16

export function PearlCurtain() {
  const { enabled } = useMotionSettings()
  const [current, setCurrent] = useState(0)
  const [incoming, setIncoming] = useState<number | null>(null)
  const root = useRef<HTMLElement>(null)
  const interacted = useRef(false)
  useEffect(() => {
    if (!enabled || interacted.current) return
    let timer: ReturnType<typeof setTimeout>
    const observer = new IntersectionObserver(([entry]) => {
      clearTimeout(timer)
      if (entry.isIntersecting) timer = setTimeout(() => {
        if (!interacted.current) { interacted.current = true; setIncoming(1) }
      }, 800)
    }, { threshold: .45 })
    observer.observe(root.current!)
    return () => { clearTimeout(timer); observer.disconnect() }
  }, [enabled])
  useEffect(() => {
    if (incoming === null) return
    const timer = setTimeout(() => { setCurrent(incoming); setIncoming(null) }, enabled ? 1100 : 0)
    return () => clearTimeout(timer)
  }, [incoming, enabled])
  function change(direction: number) {
    interacted.current = true
    if (incoming !== null) return
    const next = (current + direction + slides.length) % slides.length
    if (enabled) setIncoming(next)
    else setCurrent(next)
  }
  const styleFor = (i: number) => ({
    backgroundImage: 'url("assets/' + slides[i].image + '")',
    backgroundSize: i === 0 ? 'auto 80%' : 'cover',
  })
  return <section id="pearl-gallery" className="pearl-curtain" ref={root} aria-label="Freshwater pearl gallery">
    <div className="curtain-picture" role="img" aria-label={slides[current].alt} style={styleFor(current)} />
    {incoming !== null && Array.from({ length: strips }, (_, i) =>
      <div key={i} aria-hidden="true" className="curtain-strip" style={{
        ...styleFor(incoming), '--left': (i * 100 / strips) + '%',
        '--right': (100 - (i + 1) * 100 / strips) + '%', animationDelay: i * 30 + 'ms',
      } as CSSProperties} />)}
    <div className="curtain-footer">
      <div aria-live="polite"><span className="kicker">Beneath the surface</span><h2>{slides[current].title}</h2>{current > 0 && <a className="underline text-sm" href="pearl-photo-credits.html" target="_blank" rel="noreferrer">Photo credits</a>}</div>
      <div className="curtain-controls">{[-1, 1].map(d => <button key={d} type="button" disabled={incoming !== null}
        aria-label={d < 0 ? 'Previous pearl image' : 'Next pearl image'} onClick={() => change(d)}>
        {d < 0 ? <ChevronLeft /> : <ChevronRight />}
      </button>)}</div>
    </div>
  </section>
}
