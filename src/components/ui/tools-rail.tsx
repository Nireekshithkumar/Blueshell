import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMotionSettings } from './motion-settings'

const photos = ['ps12', 'ps15', 'ps18', 'ps17', 'ps20', 'ps21']

export function ToolsRail({ items, offset }: { items: string[][]; offset: number }) {
  const { enabled } = useMotionSettings()
  const [active, setActive] = useState(0)
  const position = (active + 0.5) / items.length

  return <div className="tools-rail">
    <div className="tools-rail-track" aria-hidden="true">
      <motion.div className="tools-rail-fill"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: position }}
        viewport={{ once: true }}
        transition={{ duration: enabled ? .7 : 0, ease: 'easeInOut' }}
      />
      <motion.i initial={{ left: '0%' }} whileInView={{ left: position * 100 + '%' }}
        viewport={{ once: true }} transition={{ duration: enabled ? .7 : 0, ease: 'easeInOut' }} />
    </div>
    <div className="tool-grid">
      {items.map(([name, description], i) => <article key={name} className="tool-card"
        onPointerEnter={() => setActive(i)}>
        <div className="tool-image"><img src={`assets/${photos[offset + i]}.jpeg`} alt="" /></div>
        <span className="kicker">0{offset + i + 1}</span>
        <h3><button type="button" onFocus={() => setActive(i)} onClick={() => setActive(i)}
          aria-pressed={active === i}>{name}</button></h3>
        <p>{description}</p>
      </article>)}
    </div>
  </div>
}
