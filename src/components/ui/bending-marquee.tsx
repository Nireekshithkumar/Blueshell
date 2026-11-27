import { useMotionSettings } from './motion-settings'
import { useEffect, useId, useRef } from 'react'
import gsap from 'gsap'

const phrase = 'Freshwater pearls  /  Living mussels  /  Water care  /  '
const period = 680

export function BendingMarquee() {
  const { enabled } = useMotionSettings()
  const id = useId()
  const ref = useRef<SVGTextPathElement>(null)
  useEffect(() => {
    const media = gsap.matchMedia()
    if (enabled) media.add('all', () => {
      gsap.fromTo(ref.current, { attr: { startOffset: 0 } }, {
        attr: { startOffset: -period }, duration: 23, ease: 'none', repeat: -1,
      })
    })
    return () => media.revert()
  }, [enabled])

  return <div className="farming-marquee">
    <span className="sr-only">Freshwater pearls, living mussels and water care.</span>
    <svg aria-hidden="true" viewBox="0 0 1200 96" preserveAspectRatio="xMidYMid slice">
      <defs><path id={id} d="M -800 50 q 250 -46 500 0 t 500 0 t 500 0 t 500 0 t 500 0 t 500 0" /></defs>
      <text xmlSpace="preserve"><textPath ref={ref} href={'#' + id} startOffset="0">
        {Array.from({ length: 6 }, (_, i) => <tspan key={i} textLength={period} lengthAdjust="spacingAndGlyphs">{phrase}</tspan>)}
      </textPath></text>
    </svg>
  </div>
}
