import { useMotionSettings } from './motion-settings'
import { useEffect, useRef } from 'react'

const title = 'BlueShells'

export function ParticleText() {
  const { enabled } = useMotionSettings()
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')
    const mask = document.createElement('canvas')
    const ink = mask.getContext('2d', { willReadFrequently: true })
    if (!ctx || !ink) return

    const media = matchMedia('(hover: hover) and (pointer: fine) and (any-pointer: coarse)')
    const motion = matchMedia('(hover: hover) and (pointer: fine)')
    let dots: { x: number; y: number; dx: number; dy: number }[] = []
    let pointer: { x: number; y: number } | null = null
    let frame = 0
    let visible = true
    let previous = 0
    let spacing = 4
    function draw(time: number) {
      frame = 0
      const blend = 1 - Math.exp(-Math.min(time - previous, 64) / 85)
      previous = time
      ctx!.clearRect(0, 0, canvas.width, canvas.height)
      ctx!.beginPath()
      let moving = false
      for (const dot of dots) {
        const x = pointer ? dot.x - pointer.x : 0
        const y = pointer ? dot.y - pointer.y : 0
        const distance = Math.hypot(x, y)
        const force = pointer ? 22 * Math.max(0, 1 - distance / 85) ** 2 / Math.max(1, distance) : 0
        dot.dx += (x * force - dot.dx) * blend
        dot.dy += (y * force - dot.dy) * blend
        moving ||= Math.abs(x * force - dot.dx) + Math.abs(y * force - dot.dy) > 0.03
        const radius = spacing * 0.43
        ctx!.moveTo(dot.x + dot.dx + radius, dot.y + dot.dy)
        ctx!.arc(dot.x + dot.dx, dot.y + dot.dy, radius, 0, 2 * Math.PI)
      }
      ctx!.fill()
      if (moving) schedule()
    }
    function schedule() {
      if (visible && dots.length && !frame) frame = requestAnimationFrame(draw)
    }
    function rebuild() {
      dots = []
      delete canvas.parentElement!.dataset.ready
      if (!enabled || !motion.matches || media.matches) return
      const { width, height } = canvas.getBoundingClientRect()
      if (!width || !height) return
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx!.fillStyle = getComputedStyle(canvas).color
      mask.width = Math.ceil(width)
      mask.height = Math.ceil(height)
      const style = getComputedStyle(canvas.parentElement!)
      ink!.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily
      ink!.letterSpacing = style.letterSpacing
      ink!.textAlign = 'center'
      const metrics = ink!.measureText(title)
      ink!.fillText(title, width / 2, (height + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2)
      const pixels = ink!.getImageData(0, 0, mask.width, mask.height).data
      spacing = Math.max(2, Math.round(parseFloat(style.fontSize) / 48))
      for (let y = 0; y < height; y += spacing) {
        for (let x = 0; x < width; x += spacing) {
          if (pixels[(y * mask.width + x) * 4 + 3] > 128) dots.push({ x, y, dx: 0, dy: 0 })
        }
      }
      if (dots.length) canvas.parentElement!.dataset.ready = 'true'
      schedule()
    }
    function move(event: PointerEvent) {
      if (!dots.length) return
      const rect = canvas.getBoundingClientRect()
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      schedule()
    }
    function leave() { pointer = null; schedule() }
    const hero = canvas.closest('section')!
    const resize = new ResizeObserver(rebuild)
    resize.observe(canvas)
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) schedule()
    })
    intersection.observe(canvas)
    hero.addEventListener('pointermove', move)
    hero.addEventListener('pointerleave', leave)
    window.addEventListener('resize', rebuild)
    motion.addEventListener('change', rebuild)
    media.addEventListener('change', rebuild)
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      intersection.disconnect()
      hero.removeEventListener('pointermove', move)
      hero.removeEventListener('pointerleave', leave)
      window.removeEventListener('resize', rebuild)
      motion.removeEventListener('change', rebuild)
      media.removeEventListener('change', rebuild)
    }
  }, [enabled])

  return <h1 className="hero-word particle-title"><span>{title}</span><canvas aria-hidden="true" ref={ref} /></h1>
}
