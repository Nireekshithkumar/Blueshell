import { useMotionSettings } from './motion-settings'
import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowDown } from 'lucide-react'
import { frames } from '@/data/content'
import { ParticleText } from './particle-text'

gsap.registerPlugin(ScrollTrigger)

const chapters = [
  ['Freshwater pearl culture', 'Wonder, cultivated.'],
  ['Inside the mussel', 'A pearl takes shape.'],
  ['The farming story', 'It begins with water.'],
]

export function ShellHero() {
  const { enabled } = useMotionSettings()
  const root = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const hero = root.current!
    const images = Array.from(hero.querySelectorAll<HTMLImageElement>('.shell-stage img'))
    const captions = Array.from(hero.querySelectorAll<HTMLElement>('.shell-caption'))
    const media = gsap.matchMedia()
    let active = true

    function show(index: number, chapter: number) {
      images.forEach((image, i) => image.classList.toggle('selected', i === index))
      captions.forEach((caption, i) => { caption.hidden = i !== chapter })
    }
    Promise.allSettled(images.map(image => image.decode())).then(results => {
      if (!active) return
      const available = images.map((_, i) => i).filter(i => results[i].status === 'fulfilled')
      if (!available.length) return
      media.add({
        always: 'all',
        compact: '(max-width: 700px)',
      }, context => {
        const { compact } = context.conditions!
        if (!enabled) {
          show(available[available.length - 1], 0)
          return
        }
        show(available[0], 0)
        ScrollTrigger.create({
          trigger: hero, pin: true, start: 'top 66px',
          end: () => '+=' + Math.round(hero.clientHeight * (compact ? 1 : 1.8)),
          invalidateOnRefresh: true, refreshPriority: 1,
          onUpdate: ({ progress }) => {
            show(available[Math.round(progress * (available.length - 1))], progress < .34 ? 0 : progress < .78 ? 1 : 2)
          },
        })
      })
      ScrollTrigger.refresh()
    })
    return () => { active = false; media.revert() }
  }, [enabled])

  return <section ref={root} id="home" className="hero shell-hero">
    <ParticleText />
    <div className="shell-stage" role="img" aria-label="A freshwater mussel opens to reveal a pearl">
      {frames.map((src, i) => <img key={src} className={i === 0 ? 'selected' : ''} src={src} alt="" width="724" height="362" />)}
    </div>
    <div className="hero-foot">
      <div>{chapters.map(([label, title], i) => <div key={label} className="shell-caption" hidden={i !== 0}>
        <span className="kicker">{label}</span><p className="hero-tagline">{title}</p>
      </div>)}</div>
      <a href="#story" aria-label="Explore the farming story"><ArrowDown /></a>
    </div>
  </section>
}
