import { useMotionSettings } from './motion-settings'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion, useScroll, useTransform } from 'framer-motion'

gsap.registerPlugin(ScrollTrigger)

function reveal(elements: Element[], trigger: Element) {
  gsap.from(elements, {
    opacity: .35, y: 18, duration: .65, stagger: .07, ease: 'power2.out',
    clearProps: 'transform,opacity', scrollTrigger: { trigger, start: 'top 94%', once: true },
  })
}

export function TextBlockAnimation({ children }: { children: ReactNode }) {
  const { enabled } = useMotionSettings()
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const wrapper = ref.current!
    const intro = wrapper.nextElementSibling
    const media = gsap.matchMedia()
    if (enabled) media.add('all', () => {
      reveal(intro?.matches('p') ? [wrapper, intro] : [wrapper], wrapper)
    })
    return () => media.revert()
  }, [enabled])
  return <div ref={ref}>{children}</div>
}

export function ContainerTextScroll({ children, titleComponent }: { children: ReactNode; titleComponent: ReactNode }) {
  const { enabled } = useMotionSettings()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const scale = useTransform(scrollYProgress, [0, 1], [.96, 1])
  const reduced = !enabled
  return <div ref={ref} className="tilt-stage"><motion.div className="tilt-card" style={reduced ? {} : { scale }}>
    {children}<div className="tilt-title">{titleComponent}</div>
  </motion.div></div>
}

export { PearlCurtain as PearlPortal } from './pearl-curtain'

export function FlowArt({ children }: { children: ReactNode }) {
  const { enabled } = useMotionSettings()
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const media = gsap.matchMedia()
    if (enabled) media.add('all', () => {
      for (const grid of ref.current!.querySelectorAll('.features,.plans,.team-grid,.tool-grid')) {
        reveal(Array.from(grid.children), grid)
      }
    })
    return () => media.revert()
  }, [enabled])
  return <div ref={ref}>{children}</div>
}
