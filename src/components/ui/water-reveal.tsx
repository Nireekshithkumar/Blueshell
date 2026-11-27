import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { useMotionSettings } from './motion-settings'

const droplets = [[-90,-24,8], [48,-42,9], [82,15,6], [-32,38,6], [36,32,12]]

export function WaterReveal() {
  const panel = useRef<HTMLDivElement>(null)
  const { enabled } = useMotionSettings()
  const [stage, setStage] = useState<'waiting' | 'playing' | 'done'>('waiting')
  const id = useId()
  useEffect(() => {
    if (!enabled || stage !== 'waiting') return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setStage('playing')
    }, { threshold: .55 })
    observer.observe(panel.current!)
    return () => observer.disconnect()
  }, [enabled, stage])
  useEffect(() => {
    if (stage === 'playing' && !enabled) setStage('done')
  }, [enabled, stage])

  return <div ref={panel} className="water-art">
    {enabled && stage === 'playing' && <svg className="water-reveal" aria-hidden="true"
      viewBox="-160 -100 320 200" preserveAspectRatio="xMidYMid slice">
      <defs>
        <filter id={id + '-merge'} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
        </filter>
        <mask id={id + '-opening'}>
          <rect x="-160" y="-100" width="320" height="200" fill="white" />
          <circle className="water-opening" r="1" fill="black" onAnimationEnd={() => setStage('done')} />
        </mask>
      </defs>
      <g mask={'url(#' + id + '-opening)'}>
        <rect x="-160" y="-100" width="320" height="200" fill="#10282f" />
        <g fill="#f7f7f2" filter={'url(#' + id + '-merge)'}>
          <circle r="13" />
          {droplets.map(([x,y,r]) => <circle key={x} r={r} className="water-drop"
            style={{ '--x': x + 'px', '--y': y + 'px' } as CSSProperties} />)}
        </g>
      </g>
    </svg>}
    <a className="water-credit" href="pearl-photo-credits.html" target="_blank" rel="noreferrer">Photo credits</a>
  </div>
}
